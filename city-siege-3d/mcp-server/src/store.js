import { FieldValue, FieldPath, Timestamp } from 'firebase-admin/firestore';
import { createModel, modelToCloud, applyOps, townHallLevelOf, advanceProduction, carryOutputForUndo } from '../../src/shared/cityRules.js';
import { battlePhase, toMillis } from '../../src/shared/battleRules.js';
import { BUILDING_DEFS } from '../../src/data/progression.js';

/**
 * CityStore - every Firestore read and write the MCP server makes on a player's city
 * (spec section 10, "Every mutation = one Firestore transaction on cities/{uid}").
 *
 * One edit, one transaction:
 *   read cities/{uid}, the player's recent battles and the history index
 *   -> apply the ops to a working model with cityRules (all-or-nothing; a refusal writes nothing)
 *   -> lock the player's city for every battle already in fight/resolving that has no snapshot of
 *      it yet (the PRE-edit city: that is what the opponent is entitled to raid)
 *   -> archive the old version as history/{oldRev} (latest 20 kept, for undo_last_change)
 *   -> write the city with rev + 1, updatedBy 'mcp', writerId 'mcp:<hash8>' and a lastChange
 *      summary.
 * The production clock moves WITH the output: before any op, every producer's `st` is advanced
 * from `layout.savedAt` to now (cityRules.advanceProduction) and the write stamps savedAt = now.
 * With a frozen savedAt (the first version of this server) a stow credited only the output held at
 * the game's last push - hours of visible output lost - and the game, which restores a remote city
 * by crediting (now - savedAt) to every producer, handed a building the AI had just placed all
 * the hours before it existed. Moving both together credits every second exactly once.
 * The game sees rev move past its syncedRev from a writer that is not itself and applies the city
 * live (CloudSync, spec 7.1); its next push then carries rev + 1 again.
 *
 * Writes for one player are queued in this process (parallel tool calls would otherwise contend
 * for the same city document in separate transactions: seconds each on the emulator, some failing).
 */

export const HISTORY_KEEP = 20;
const SUMMARY_MAX = 200;
// Battles that can still need a lock were created at most 7 days (the longest scheduled lead)
// plus the 1 h fight window ago; a day of slack. The bound keeps the transaction's read set small
// and uses the players+createdAt index the game's battle list already needs.
const LOCK_LOOKBACK_MS = 8 * 86400 * 1000;

/** A refusal the AI should read and act on (no stack trace, no "internal error"). */
export class UserError extends Error {
  constructor(message, code = 'REFUSED', extra = {}) {
    super(message);
    this.name = 'UserError';
    this.code = code;
    this.extra = extra;
  }
}

export const NO_CITY_MESSAGE = 'Your city is not in the cloud yet. Open City Siege, sign in once (ACCOUNT -> Profile) and ' +
  'keep the game open for a few seconds so it uploads your city, then try again.';

const nameOf = (type) => (BUILDING_DEFS[type] && BUILDING_DEFS[type].name) || type;
const tile = (x, z) => `(${x},${z})`;
const revOf = (doc) => (Number.isInteger(doc && doc.rev) ? doc.rev : 0);

/** Firestore Timestamps -> ms, recursively, so a model built from a doc is plain JSON. */
function plain(v) {
  if (v instanceof Timestamp) return v.toMillis();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

/** The model a city document describes (layout + holdings), normalised by cityRules. */
export function modelOf(doc) {
  return createModel(plain(doc.layout), plain(doc.holdings));
}

/** modelOf with every producer's output brought up to `nowMs` (what the open game shows now). */
export function modelAt(doc, nowMs) {
  const model = modelOf(doc);
  advanceProduction(model, nowMs);
  return model;
}

// The emulator (and, rarely, production) can close a contended transaction under the SDK: the
// attempt wrote nothing, so it is safe to run once more.
const isClosedTxn = (e) => !!e && /Transaction is invalid or closed/i.test(String(e.message || e.details || ''));

/**
 * The lastChange line the game shows as a toast ("AI designer: placed Sniper Tower at (3,4)").
 * One op of a kind is named; several are counted. <= 200 chars (the rules' limit on it).
 */
export function summarizeChange(results) {
  const parts = [];
  const of = (op) => results.filter(r => r && r.ok && r.op === op);
  const places = of('place');
  if (places.length === 1) parts.push(`placed ${nameOf(places[0].type)} at ${tile(places[0].gx, places[0].gz)}`);
  else if (places.length) parts.push(`placed ${places.length} buildings (${countNames(places)})`);
  const moves = of('move');
  if (moves.length === 1) parts.push(`moved ${nameOf(moves[0].type)} to ${tile(moves[0].to.gx, moves[0].to.gz)}`);
  else if (moves.length) parts.push(`moved ${moves.length} buildings`);
  const stows = of('stow');
  if (stows.length === 1) parts.push(`stowed ${nameOf(stows[0].type)}`);
  else if (stows.length) parts.push(`stowed ${stows.length} buildings (${countNames(stows)})`);
  const trees = of('remove_tree');
  if (trees.length) parts.push(trees.length === 1 ? 'cleared a tree' : `cleared ${trees.length} trees`);
  const drawn = of('add_roads').reduce((s, r) => s + (r.added || 0), 0);
  if (drawn) parts.push(`drew ${drawn} road tile${drawn === 1 ? '' : 's'}`);
  const erased = of('remove_roads').reduce((s, r) => s + (r.removed || 0), 0);
  if (erased) parts.push(`erased ${erased} road tile${erased === 1 ? '' : 's'}`);
  return clip(parts.join('; ') || 'no visible change');
}

function countNames(list) {
  const n = {};
  for (const r of list) n[r.type] = (n[r.type] || 0) + 1;
  return Object.entries(n).map(([t, k]) => (k > 1 ? `${k} ${nameOf(t)}` : nameOf(t))).join(', ');
}

function clip(s) {
  return s.length <= SUMMARY_MAX ? s : s.slice(0, SUMMARY_MAX - 3) + '...';
}

export class CityStore {
  constructor(db, { now = () => Date.now(), rand = Math.random, historyKeep = HISTORY_KEEP } = {}) {
    this.db = db;
    this.now = now;
    this.rand = rand;
    this.historyKeep = historyKeep;
    this._queues = new Map();   // uid -> tail of that player's queued writes
  }

  /** Run `fn` after every earlier queued write of `uid` has settled (in this process). */
  _serial(uid, fn) {
    const prev = this._queues.get(uid) || Promise.resolve();
    const run = prev.then(() => fn());
    const tail = run.catch(() => {});
    this._queues.set(uid, tail);
    tail.then(() => { if (this._queues.get(uid) === tail) this._queues.delete(uid); });
    return run;
  }

  /** db.runTransaction, run once more if the emulator closed a contended transaction under it. */
  async _txn(fn) {
    try {
      return await this.db.runTransaction(fn);
    } catch (e) {
      if (!isClosedTxn(e)) throw e;
      return this.db.runTransaction(fn);
    }
  }

  cityRef(uid) {
    return this.db.collection('cities').doc(uid);
  }

  historyCol(uid) {
    return this.cityRef(uid).collection('history');
  }

  /** The city document (plain data) or a UserError telling the player to sync once. */
  async readCity(uid) {
    const snap = await this.cityRef(uid).get();
    if (!snap.exists) throw new UserError(NO_CITY_MESSAGE, 'NO_CITY');
    return snap.data();
  }

  /**
   * The ids of the stow credits the game has already paid (saves/{uid}.credited, spec 3.4). Paid
   * credits stay in the city until the game's next real push, so "pending" must leave them out.
   * Read with a field mask: this is the server's only read of saves/, and it never sees the bank.
   */
  async paidCredits(uid) {
    const [snap] = await this.db.getAll(this.db.collection('saves').doc(uid), { fieldMask: ['credited'] });
    const list = snap && snap.exists ? snap.get('credited') : null;
    return new Set(Array.isArray(list) ? list.filter(id => typeof id === 'string') : []);
  }

  /** The player's most recent battles (newest first), as {id, ...data}. Read-only. */
  async listBattles(uid, limit = 30) {
    const snap = await this.db.collection('battles')
      .where('players', 'array-contains', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  _lockQuery(uid, nowMs) {
    return this.db.collection('battles')
      .where('players', 'array-contains', uid)
      .where('createdAt', '>=', Timestamp.fromMillis(nowMs - LOCK_LOOKBACK_MS))
      .orderBy('createdAt', 'desc');
  }

  /** Battles that an edit made now would have to lock first: accepted, fight/resolving, no snapshot of `uid`. */
  static needsLock(b, uid, nowMs) {
    if (!b || b.status !== 'accepted') return false;
    const phase = battlePhase(b, nowMs);
    if (phase !== 'fight' && phase !== 'resolving') return false;
    return !(b.snapshots && b.snapshots[uid]);
  }

  static lockInfo(id, b, uid, nowMs) {
    const opp = (Array.isArray(b.players) ? b.players : [b.challenger, b.opponent]).find(p => p !== uid) || null;
    return {
      battleId: id,
      opponentUid: opp,
      opponentName: (b.names && opp && b.names[opp]) || 'your opponent',
      phase: battlePhase(b, nowMs),
      fightEndsAt: toMillis(b.fightEndsAt)
    };
  }

  /** Which battles a write made now would lock (for dry runs; not transactional). */
  async previewLocks(uid, nowMs = this.now()) {
    const snap = await this._lockQuery(uid, nowMs).get();
    return snap.docs.filter(d => CityStore.needsLock(d.data(), uid, nowMs)).map(d => CityStore.lockInfo(d.id, d.data(), uid, nowMs));
  }

  /**
   * Apply design ops. dryRun: validate against the current city and report, writing nothing.
   * Resolves to { ok, results, failedAt?, rev, previousRev?, locked[], summary, model, noChange? }.
   * A rule refusal is { ok:false } (nothing written); a missing city throws UserError.
   */
  async applyDesign(uid, { ops, writerId, dryRun = false }) {
    if (dryRun) {
      const nowMs = this.now();
      const doc = await this.readCity(uid);
      const model = modelAt(doc, nowMs);
      const res = applyOps(model, ops, { nowMs, rand: this.rand });
      const locked = res.ok ? await this.previewLocks(uid, nowMs) : [];
      return { ...res, dryRun: true, rev: revOf(doc), locked, summary: res.ok ? summarizeChange(res.results) : '', model };
    }
    return this._serial(uid, () => this._txn(async (tx) => {
      const nowMs = this.now();
      const citySnap = await tx.get(this.cityRef(uid));
      if (!citySnap.exists) throw new UserError(NO_CITY_MESSAGE, 'NO_CITY');
      const doc = citySnap.data();
      const battles = await tx.get(this._lockQuery(uid, nowMs));
      const history = await tx.get(this.historyCol(uid).orderBy('rev', 'desc'));
      const paid = await this._paidCreditsTx(tx, uid);

      // Output up to now first (see the class comment): a stow credits it, a place starts at now.
      const model = modelAt(doc, nowMs);
      const before = JSON.stringify(modelToCloud(model));
      const res = applyOps(model, ops, { nowMs, rand: this.rand });
      if (!res.ok) return { ...res, rev: revOf(doc), locked: [], model };
      // e.g. add_roads over tiles that are all paved already: nothing to save, no new version.
      if (JSON.stringify(modelToCloud(model)) === before) {
        return { ...res, rev: revOf(doc), locked: [], summary: 'no visible change', model, noChange: true };
      }

      const summary = summarizeChange(res.results);
      const locked = this._lockBattles(tx, uid, doc, battles, nowMs);
      this._archive(tx, uid, doc, history, { kind: 'edit', summary, writerId, undoTo: revOf(doc) });
      const rev = this._writeCity(tx, uid, doc, model, { writerId, summary, paid });
      return { ...res, rev, previousRev: revOf(doc), locked, summary, model };
    }));
  }

  /**
   * Undo the latest AI change: restore the version it replaced. Works only while the current
   * version was written by MCP (never reverts the player's own work in the game). Undos chain:
   * each history doc records which version an undo of its successor restores (`undoTo`), so a
   * second undo steps further back instead of redoing the first.
   */
  async undo(uid, { writerId }) {
    return this._serial(uid, () => this._txn(async (tx) => {
      const nowMs = this.now();
      const citySnap = await tx.get(this.cityRef(uid));
      if (!citySnap.exists) throw new UserError(NO_CITY_MESSAGE, 'NO_CITY');
      const doc = citySnap.data();
      const rev = revOf(doc);
      if (doc.updatedBy !== 'mcp') {
        throw new UserError(`Nothing to undo: the current version of the city (rev ${rev}) was saved by the game, not by the AI ` +
          'designer. undo_last_change only reverts AI changes made since the game last saved the city.', 'NOTHING_TO_UNDO');
      }
      const col = this.historyCol(uid);
      const headSnap = await tx.get(col.doc(String(rev - 1)));
      const head = headSnap.exists ? headSnap.data() : null;
      if (!head || !head.replacedBy || head.replacedBy.rev !== rev) {
        throw new UserError(`Cannot undo: the version before rev ${rev} is no longer in the history (only the latest ` +
          `${this.historyKeep} versions are kept).`, 'NO_HISTORY');
      }
      if (!Number.isInteger(head.undoTo)) {
        throw new UserError('Nothing left to undo: every AI designer change since the game last saved the city has already been ' +
          'undone.', 'NOTHING_TO_UNDO');
      }
      const targetRev = head.undoTo;
      const targetSnap = targetRev === rev - 1 ? headSnap : await tx.get(col.doc(String(targetRev)));
      if (!targetSnap.exists) {
        throw new UserError(`Cannot undo: version ${targetRev} is no longer in the history (only the latest ${this.historyKeep} ` +
          'versions are kept).', 'NO_HISTORY');
      }
      const target = targetSnap.data();
      // Where an undo of the restored version would go: its own predecessor, if MCP wrote it.
      const parentSnap = await tx.get(col.doc(String(targetRev - 1)));
      const parent = parentSnap.exists ? parentSnap.data() : null;
      const nextUndoTo = parent && parent.replacedBy && parent.replacedBy.rev === targetRev && Number.isInteger(parent.undoTo)
        ? parent.undoTo : null;
      const battles = await tx.get(this._lockQuery(uid, nowMs));
      const history = await tx.get(col.orderBy('rev', 'desc'));
      const paid = await this._paidCreditsTx(tx, uid);

      const cur = modelAt(doc, nowMs);
      const restored = modelOf(target);
      // Undo restores the DESIGN, never money (cityRules.carryOutputForUndo). Every bank credit the
      // current version carries is kept (the game may have paid it already). Stored output (`st`)
      // is production state, not design: a building standing now keeps its current output
      // (advanced to now, with the clock stamped now); a producer that comes back after an AI stow
      // had its output credited then, so it returns empty (restoring the old `st` would let
      // stow -> undo mint it twice); and a producer the undo takes off the map is settled like a
      // stow - its output is credited (a vault's cash stays sealed in it), not thrown away.
      const carried = carryOutputForUndo(cur, restored, { nowMs, rand: this.rand });
      const reverted = (target.replacedBy && target.replacedBy.summary) || 'the last AI change';
      // The game shows this as a toast ("AI designer: undid: placed ..."), so no rev jargon here.
      const summary = clip(`undid: ${reverted}`);
      const locked = this._lockBattles(tx, uid, doc, battles, nowMs);
      this._archive(tx, uid, doc, history, { kind: 'undo', summary, writerId, undoTo: nextUndoTo });
      const newRev = this._writeCity(tx, uid, doc, restored, { writerId, summary, paid });
      return { ok: true, rev: newRev, previousRev: rev, restoredRev: targetRev, reverted, summary, locked, model: restored, moreToUndo: nextUndoTo !== null, carried };
    }));
  }

  /**
   * The battle lock: for every battle in fight/resolving that has no snapshot of this player,
   * write the city AS IT IS NOW (before this edit) - the same {layout, townHall, name, rev,
   * lockedAt} a client's ensureSnapshots writes, and the same value its rules demand.
   */
  _lockBattles(tx, uid, doc, battles, nowMs) {
    const locked = [];
    for (const d of battles.docs) {
      const b = d.data();
      if (!Array.isArray(b.players) || !b.players.includes(uid) || !CityStore.needsLock(b, uid, nowMs)) continue;
      const own = typeof doc.name === 'string' && doc.name.trim() ? doc.name.trim().slice(0, 40)
        : ((b.names && typeof b.names[uid] === 'string' && b.names[uid].slice(0, 40)) || 'Player');
      tx.update(d.ref, new FieldPath('snapshots', uid), {
        layout: doc.layout,
        townHall: Number.isInteger(doc.townHall) ? doc.townHall : townHallLevelOf(doc.layout && doc.layout.buildings),
        name: own,
        rev: revOf(doc),
        lockedAt: FieldValue.serverTimestamp()
      });
      locked.push(CityStore.lockInfo(d.id, b, uid, nowMs));
    }
    return locked;
  }

  /** history/{oldRev} = the version being replaced; keep only the newest `historyKeep`. */
  _archive(tx, uid, doc, history, { kind, summary, writerId, undoTo }) {
    const oldRev = revOf(doc);
    tx.set(this.historyCol(uid).doc(String(oldRev)), {
      uid,
      rev: oldRev,
      name: typeof doc.name === 'string' ? doc.name : '',
      townHall: doc.townHall === undefined ? null : doc.townHall,
      layout: doc.layout || null,
      holdings: doc.holdings || null,
      updatedBy: doc.updatedBy || null,
      writerId: doc.writerId || null,
      updatedAt: doc.updatedAt || null,
      lastChange: doc.lastChange || null,
      archivedAt: FieldValue.serverTimestamp(),
      replacedBy: { rev: oldRev + 1, kind, summary, writerId },
      undoTo: Number.isInteger(undoTo) ? undoTo : null
    });
    const older = history.docs.filter(d => d.id !== String(oldRev));
    for (const d of older.slice(Math.max(0, this.historyKeep - 1))) tx.delete(d.ref);
  }

  /** The city write itself. Returns the new rev. */
  /** paidCredits() inside a transaction: read before any write, so a bank push racing us retries it. */
  async _paidCreditsTx(tx, uid) {
    const [snap] = await tx.getAll(this.db.collection('saves').doc(uid), { fieldMask: ['credited'] });
    const list = snap && snap.exists ? snap.get('credited') : null;
    return new Set(Array.isArray(list) ? list.filter(id => typeof id === 'string') : []);
  }

  _writeCity(tx, uid, doc, model, { writerId, summary, paid = null }) {
    // layout.savedAt is the model's: advanced to now together with every producer's `st`.
    const out = modelToCloud(model);
    // Credits the game has already paid (saves.credited) are dropped here. Left in the city they
    // piled up with every AI stow until the game pushed just to clear them, which ended the AI's
    // undo chain; and saves.credited only remembers the latest 100 ids.
    if (paid && paid.size && out.holdings && out.holdings.bankCredits) {
      for (const id of Object.keys(out.holdings.bankCredits)) {
        if (paid.has(id)) delete out.holdings.bankCredits[id];
      }
    }
    const rev = revOf(doc) + 1;
    tx.update(this.cityRef(uid), {
      layout: out.layout,
      holdings: out.holdings,
      townHall: townHallLevelOf(out.layout.buildings),
      rev,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'mcp',
      writerId,
      lastChange: { by: 'mcp', summary, at: FieldValue.serverTimestamp() }
    });
    return rev;
  }
}
