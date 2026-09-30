import { serializeCity, restoreCity, saveCity, readCitySave, CITY_SAVE_KEY } from '../builder/CityPersistence.js';
import { EconomyManager } from '../builder/EconomyManager.js';
import { GarageManager } from '../builder/GarageManager.js';
import { BUILDING_DEFS, storedAfter, produceRateFor } from '../data/progression.js';
import {
  toCloudLayout, fromCloudLayout, holdingsFromEconomy, applyHoldingsToEconomy, normalizeHoldings,
  townHallLevelOf, isValidBuildingId
} from '../shared/cityRules.js';
import { rebaseCity, rebaseKeptSomething, mergeBank, planCredits } from './cityMerge.js';
import { friendlyError, codedError } from './AuthService.js';

/**
 * CloudSync - the player's city, holdings, bank and garage <-> Firestore (docs/ONLINE_SPEC.md 7.1).
 *
 * The game stays offline-first: it boots from localStorage exactly as before, and this layer
 * LINKS that local save to the signed-in account afterwards:
 *   - no cloud city yet: the local city is uploaded (a guest's progress becomes the account's);
 *     if the local save belongs to ANOTHER account it is backed up to `<key>.bak.<uid>` and the
 *     game restarts on a fresh default city for the new account.
 *   - a cloud city exists: local wins only when it is provably ahead (same account, nobody else
 *     wrote since our last sync, and saved later); otherwise the cloud city is applied - with
 *     this device's unsynced changes rebased onto it (below). A guest city replaced this way is
 *     kept on the device and can be restored from ACCOUNT.
 *
 * While linked, every local city save (main.js saveCityNow, the single funnel) schedules a push:
 * a transaction that only writes when the cloud revision is still the one this page last synced.
 * The push is debounced 1.5 s but never held back more than 3 s by a stream of edits, and a
 * change that moved value (a purchase, an upgrade's cost, a collect, a gem finish) is pushed at
 * once. A newer cloud revision means someone else (the MCP designer, another device or tab)
 * changed the city. Remote changes arrive live through onSnapshot and are applied as soon as the
 * game is not busy (no raid, no arena, no building in the hand, no preset modal).
 *
 * Rebase (spec 13): when the newer cloud city arrives while this device has changes it has not
 * pushed, those changes are not thrown away (the bank already paid for them). cityMerge.rebaseCity
 * takes the remote DESIGN (which buildings stand where, the roads) and overlays this device's GAME
 * state - levels, build jobs, what producers still hold, shop purchases - then the result is
 * pushed on top of the remote revision. `base` (the cloud doc this page last synced, also kept in
 * localStorage for a reload / an offline session) is what "changed here" is measured against.
 *
 * Echo suppression: applying a remote city re-saves it locally, which reaches the push funnel.
 * Pushing that back would be pointless AND would overwrite `updatedBy:'mcp'`, which the MCP
 * server's undo relies on. So a push only writes when the city differs from what is known to
 * be in the cloud - its structure (buildings, jobs, roads, holdings), or a producer holding LESS
 * than the cloud copy implies by now (its stored value at the cloud's savedAt plus production
 * since: output was collected). Output merely growing is not a reason to write.
 *
 * The bank + garage (saves/{uid}) is written in a transaction too: when another device wrote it
 * since this page's last sync, the result is theirs plus this device's changes (cityMerge.mergeBank)
 * instead of last-writer-wins, and it is followed live. MCP stow credits (spec 3.4) are paid by
 * that transaction, which records their ids in `saves.credited` - once per account, whichever
 * device gets there first - so no push is needed just to clear them from the city (a push by the
 * game would end the AI designer's undo chain).
 */

export const CLOUD_META_KEY = 'city_siege_cloud';
/** The cloud city (layout + holdings + rev) this browser last synced: the rebase base. */
export const CLOUD_BASE_KEY = 'city_siege_cloud_base';
/** City pushes whose reply this browser never got (they may have landed): see _settleCityDoubts. */
export const CLOUD_DOUBT_KEY = 'city_siege_cloud_doubt';
/** A guest city replaced by an account's city at sign-in (the save itself is in `<key>.bak.guest`). */
export const GUEST_BACKUP_KEY = 'city_siege_guest_backup';
/** The three local saves that belong to one account. */
export const LOCAL_SAVE_KEYS = [CITY_SAVE_KEY, EconomyManager.SAVE_KEY, GarageManager.KEY];

const PUSH_DEBOUNCE_MS = 1500;
const PUSH_MAX_WAIT_MS = 3000;
const BANK_DEBOUNCE_MS = 3000;
const BANK_MAX_WAIT_MS = 8000;
const BUSY_RETRY_MS = 500;
const PRESENCE_MS = 60000;
const CREDIT_MEMORY = 100;
// Every game write of cities/{uid} and saves/{uid} appends its token ('<sessionId>.<n>') to the
// doc's `writers` (the latest WRITER_MEMORY kept; the MCP server's updates leave the field alone):
// that is how a write whose reply was lost is recognised once the doc is read again.
const WRITER_MEMORY = 8;
const CITY_DOUBT_MEMORY = 4;
const RETRY_BACKOFF_MS = [3000, 8000, 20000, 45000, 90000];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => (v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)));

// ------------------------------------------------------------------ local meta

export function readCloudMeta() {
  try {
    const raw = localStorage.getItem(CLOUD_META_KEY);
    const m = raw ? JSON.parse(raw) : null;
    if (m && typeof m === 'object') {
      return {
        uid: typeof m.uid === 'string' ? m.uid : '',
        syncedRev: Number.isInteger(m.syncedRev) ? m.syncedRev : 0,
        creditedIds: Array.isArray(m.creditedIds) ? m.creditedIds.filter(x => typeof x === 'string') : [],
        linkedAt: Number(m.linkedAt) || 0,
        bankHash: typeof m.bankHash === 'string' ? m.bankHash : '',
        bankBase: isObj(m.bankBase) && isObj(m.bankBase.bank) ? m.bankBase : null,
        pendingCredits: isObj(m.pendingCredits) ? m.pendingCredits : {},
        bankDoubt: isObj(m.bankDoubt) && typeof m.bankDoubt.token === 'string' && isObj(m.bankDoubt.merged) &&
          isObj(m.bankDoubt.local0) ? m.bankDoubt : null,
        fresh: !!m.fresh
      };
    }
  } catch (e) { /* unreadable meta = never linked */ }
  return { uid: '', syncedRev: 0, creditedIds: [], linkedAt: 0, bankHash: '', bankBase: null, pendingCredits: {}, bankDoubt: null, fresh: false };
}

function writeCloudMeta(m) {
  try {
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify({
      uid: m.uid || '',
      syncedRev: m.syncedRev || 0,
      creditedIds: (m.creditedIds || []).slice(-CREDIT_MEMORY),
      linkedAt: m.linkedAt || 0,
      bankHash: m.bankHash || '',
      ...(m.bankBase ? { bankBase: m.bankBase } : {}),
      ...(m.pendingCredits && Object.keys(m.pendingCredits).length ? { pendingCredits: m.pendingCredits } : {}),
      ...(m.bankDoubt ? { bankDoubt: m.bankDoubt } : {}),
      ...(m.fresh ? { fresh: true } : {})
    }));
  } catch (e) { /* storage blocked: we simply re-link next time */ }
}

function readCloudBase(uid, rev) {
  try {
    const b = JSON.parse(localStorage.getItem(CLOUD_BASE_KEY) || 'null');
    if (isObj(b) && b.uid === uid && b.rev === rev && isObj(b.layout) && isObj(b.holdings)) {
      return { rev: b.rev, layout: b.layout, holdings: b.holdings };
    }
  } catch (e) { /* no usable base: a newer cloud city then simply wins, as before */ }
  return null;
}

function writeCloudBase(uid, base) {
  try {
    localStorage.setItem(CLOUD_BASE_KEY, JSON.stringify({ uid, rev: base.rev, layout: base.layout, holdings: base.holdings }));
  } catch (e) { /* quota: the in-memory base still serves this page */ }
}

function readCloudDoubts(uid) {
  try {
    const d = JSON.parse(localStorage.getItem(CLOUD_DOUBT_KEY) || 'null');
    if (isObj(d) && d.uid === uid && Array.isArray(d.list)) {
      return d.list.filter(x => isObj(x) && typeof x.token === 'string' && Number.isInteger(x.rev) && isObj(x.layout) && isObj(x.holdings));
    }
  } catch (e) { /* none: a lost reply is then only recognised by this page */ }
  return [];
}

function writeCloudDoubts(uid, list) {
  try {
    if (list.length) localStorage.setItem(CLOUD_DOUBT_KEY, JSON.stringify({ uid, list }));
    else localStorage.removeItem(CLOUD_DOUBT_KEY);
  } catch (e) { /* quota: the in-memory list still serves this page */ }
}

// ------------------------------------------------------------------ fingerprints

/** JSON with sorted object keys (Firestore hands maps back in its own key order). */
function stableStringify(v) {
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined)
      .map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
  }
  return JSON.stringify(v === undefined ? null : v);
}

/** FNV-1a, 32 bit: a cheap change detector for the bank + garage blob (not security). */
function hashOf(v) {
  const s = stableStringify(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16) + ':' + s.length;
}

/** The bank + garage part of a bank shape (what the player owns). */
const bankHashOf = (shape) => hashOf({ bank: shape.bank, garage: shape.garage || null });
/** The whole saves/ doc as far as sync cares (which credits it has paid included). */
const saveHashOf = (shape) => hashOf({ bank: shape.bank, garage: shape.garage || null, credited: shape.credited || [] });

/** Holdings in one canonical form: cleaned like EconomyManager.load, zero counts dropped. */
function canonHoldings(h) {
  const n = normalizeHoldings(h);
  const nz = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => (Array.isArray(v) ? v.length : v)));
  return { inventory: nz(n.inventory), stowedCounts: nz(n.stowedCounts), stowedLevels: nz(n.stowedLevels), stowedSealed: nz(n.stowedSealed) };
}

// Spike traps / roadblocks face along their wall links, whatever rotation a save carries
// (restoreCity ignores it), so their rotation is not part of the city's identity.
const isChainBarrierType = (t) => !!(BUILDING_DEFS[t] && BUILDING_DEFS[t].barrier && BUILDING_DEFS[t].barrier.rammable);

/**
 * What a push compares: `struct` (everything a design edit, upgrade or purchase changes) and `st`
 * (producer output per building id, compared separately - only a DROP needs a push; `kind` and
 * `savedAt` let that check allow for the production since the cloud copy was saved).
 */
function fingerprint(layout, holdings) {
  const L = layout || {};
  const buildings = Array.isArray(L.buildings) ? L.buildings : [];
  const st = {};
  const kind = {};
  const b = buildings.map(x => {
    st[x.id] = Number(x.st) || 0;
    kind[x.id] = [x.t, Math.max(1, Math.round(Number(x.l)) || 1)];
    const rot = isChainBarrierType(x.t) ? 0 : Math.round((Number(x.rot) || 0) * 1000) / 1000;
    return [x.id, x.t, x.gx, x.gz, x.l, rot, x.gate || ''];
  });
  const tasks = (Array.isArray(L.tasks) ? L.tasks : []).map(t => [t.id, t.t, t.to, t.endsAt]);
  const roads = (Array.isArray(L.roads) ? L.roads : []).map(r => (Array.isArray(r) ? r.join(',') : String(r))).sort();
  return { struct: stableStringify([b, tasks, roads, canonHoldings(holdings)]), st, kind, savedAt: Number(L.savedAt) || 0 };
}

const isNetworkError = (e) => {
  const c = String((e && e.code) || '');
  return c === 'unavailable' || c === 'deadline-exceeded' || c === 'auth/network-request-failed' ||
    (typeof navigator !== 'undefined' && navigator.onLine === false);
};

/** The `writers` of a cities/ or saves/ doc: the tokens of its latest game writes, oldest first. */
const writersOf = (d) => (d && Array.isArray(d.writers) ? d.writers.filter(w => typeof w === 'string') : []);

const nonNeg = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export class CloudSync {
  /**
   * @param {object} deps
   * @param {object} deps.fb          loadFirebase() result
   * @param {object} deps.game        the GameApp (window.citySiege)
   * @param {object} deps.controller  OnlineController (status/toast/city-replaced callbacks, serverNow)
   */
  constructor({ fb, game, controller }) {
    this.fb = fb;
    this.game = game;
    this.controller = controller;
    // writerId of every write from this page load: our own writes coming back through the
    // listener are recognised by it and never re-applied.
    this.sessionId = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

    this.uid = null;
    this.name = '';
    this.linked = false;          // local save and cloud agree on who owns it; pushes allowed
    this.applying = false;        // a remote city is being restored (never push from inside)
    this.resetting = false;       // account switch: local saves are being wiped, reload follows
    this.pushing = false;
    this.pushAgain = false;
    this.pendingRemote = null;    // { city, bank, reason } waiting for the game to be idle
    // What THIS PAGE knows to be in the cloud. Two tabs of one account are two writers, so this
    // lives in memory; the localStorage meta/base are only where the last page load left off.
    this.syncedRev = 0;
    this.base = null;             // { rev, layout, holdings } of that revision (the rebase base)
    this.lastSynced = null;       // fingerprint of `base`
    this.bankBase = null;         // saves/{uid} as this page last synced it ({bank, garage, credited})
    this.pendingCredits = new Map();   // MCP stow credits seen but not yet paid: id -> {cash, iron, wood, reason, at}
    // Writes whose reply never came (a dropped connection): they may have landed. City pushes:
    // [{ token, rev, layout, holdings }]; the bank: { token, merged, local0 }. Settled by the next
    // read of that doc, whose `writers` says whether they did.
    this._writeSeq = 0;
    this._cityDoubts = [];
    this._bankDoubt = null;
    this._cityPushForced = false; // push the city even if unchanged (to drop paid stow credits from it)
    this.status = 'offline';
    this.statusDetail = 'Not signed in';
    this.lastSyncedAt = null;
    this.cloudRev = 0;

    this._gen = 0;                // link generation: a sign-out invalidates in-flight steps
    this._pushTimer = null;
    this._dirtySince = 0;         // first unpushed save since the last push started (max wait)
    this._soonQueued = false;
    this._bankTimer = null;
    this._bankDirtySince = 0;
    this._bankPushing = false;
    this._bankAgain = false;
    this._bankInFlight = null;    // the writer token of the running bank transaction
    this._bankPromise = null;
    this._pendingBankSnap = null; // a saves/ snapshot from another writer, waiting to be applied
    this._bankSeenAt = 0;         // updatedAt (ms) of the newest saves/ state this page has merged
    this._bankApplyTimer = null;
    this._busyTimer = null;
    this._retryTimer = null;
    this._bankRetry = null;
    this._retryStep = 0;
    this._presenceTimer = null;
    this._unsubCity = null;
    this._unsubSave = null;
    this._clockMeasured = false;

    this._onVisibility = () => {
      if (!this.linked) return;
      if (document.visibilityState === 'hidden') {
        // The tab may never run again (mobile task switch): send what is waiting now.
        if (this._pushTimer || this._dirtySince) this.pushNow('hidden');
        if (this._bankTimer) this.pushBank();
      } else {
        this._presence(this._gen);
      }
    };
    document.addEventListener('visibilitychange', this._onVisibility);
    this._onOnline = () => { if (this.uid && !this.linked) this._retryLinkNow(); else if (this.linked) { this.schedulePush(); this.scheduleBankPush(); } };
    window.addEventListener('online', this._onOnline);
  }

  // ---------------------------------------------------------------- refs

  /** A token for one write of this page ('<sessionId>.<n>'), recorded in the doc's `writers`. */
  _nextToken() { return `${this.sessionId}.${++this._writeSeq}`; }

  _cityRef(uid = this.uid) { return this.fb.fsSdk.doc(this.fb.db, 'cities', uid); }
  _saveRef(uid = this.uid) { return this.fb.fsSdk.doc(this.fb.db, 'saves', uid); }
  _playerRef(uid = this.uid) { return this.fb.fsSdk.doc(this.fb.db, 'players', uid); }

  _setStatus(status, detail = '') {
    this.status = status;
    this.statusDetail = detail;
    this.controller._onSyncStatus(this.syncState());
  }

  /** { status: 'offline'|'syncing'|'synced'|'error', detail, rev, lastSyncedAt, pendingRemote } */
  syncState() {
    return {
      status: this.status,
      detail: this.statusDetail,
      rev: this.syncedRev,
      lastSyncedAt: this.lastSyncedAt,
      pendingRemote: !!this.pendingRemote,
      linked: this.linked
    };
  }

  // ---------------------------------------------------------------- link / unlink

  /** Link the local save to this account (spec 7.1 "Link on sign-in"). Never throws. */
  async link(user, profile) {
    const gen = ++this._gen;
    this.uid = user.uid;
    this.name = (profile && profile.name) || '';
    this.linked = false;
    this.pendingRemote = null;
    this.lastSynced = null;
    this._setStatus('syncing', 'Linking your city to your account...');
    try {
      await this._link(gen);
      this._retryStep = 0;
    } catch (e) {
      if (gen !== this._gen) return;
      const err = friendlyError(e, 'Could not reach your cloud save.');
      console.warn('[cloud] link failed', e);
      this._setStatus(isNetworkError(e) ? 'offline' : 'error', err.message);
      this.controller._error('sync', err);
      this._scheduleRetryLink(gen);
    }
  }

  _scheduleRetryLink(gen) {
    clearTimeout(this._retryTimer);
    const wait = RETRY_BACKOFF_MS[Math.min(this._retryStep++, RETRY_BACKOFF_MS.length - 1)];
    this._retryTimer = setTimeout(() => {
      if (gen === this._gen && this.uid && !this.linked) this._retryLinkNow();
    }, wait);
  }

  _retryLinkNow() {
    const user = this.fb.auth.currentUser;
    if (user && user.uid === this.uid) this.link(user, { name: this.name });
  }

  async _link(gen) {
    const { getDoc } = this.fb.fsSdk;
    const meta = readCloudMeta();
    const sameAccount = meta.uid === this.uid;
    // Where the last page load of this account left off (only a hint: the docs below decide).
    this.syncedRev = sameAccount ? meta.syncedRev : 0;
    this.base = sameAccount ? readCloudBase(this.uid, meta.syncedRev) : null;
    this.lastSynced = this.base ? fingerprint(this.base.layout, this.base.holdings) : null;
    this.bankBase = sameAccount ? meta.bankBase : null;
    this.pendingCredits = new Map(sameAccount ? Object.entries(meta.pendingCredits) : []);
    this._bankDoubt = sameAccount ? meta.bankDoubt : null;
    this._cityDoubts = sameAccount ? readCloudDoubts(this.uid) : [];
    const [citySnap, saveSnap] = await Promise.all([getDoc(this._cityRef()), getDoc(this._saveRef())]);
    if (gen !== this._gen) return;
    const save = saveSnap.exists()
      ? { ...this._bankShape(saveSnap.data()), fromCache: !!(saveSnap.metadata && saveSnap.metadata.fromCache) } : null;
    this._bankSeenAt = save ? save.updatedAtMs : 0;

    if (!citySnap.exists()) {
      if (meta.uid && meta.uid !== this.uid) {
        // This device's save belongs to another account: keep it, start this one fresh.
        this._resetForAccount(meta.uid);
        return;
      }
      const raced = await this._firstUpload(gen);
      if (gen !== this._gen) return;
      if (raced) this._adoptCloud(meta, raced, save, gen);
    } else {
      const cloud = citySnap.data();
      // A push of the last page load whose reply never came may be what the cloud holds (or what
      // it was built on): then that version is the base.
      this._settleCityDoubts(cloud);
      const local = readCitySave();
      // Nobody wrote since this device last synced (the revision is the same), so whatever differs
      // here is this device's own progress. This used to also need the local save to be newer than
      // the cloud's savedAt, but the MCP server stamps that with its own clock: a device whose
      // clock was behind lost its unsent changes (their cost stayed spent).
      const localAhead = sameAccount && this.syncedRev === cloud.rev && !!local;
      const cloudFp = fingerprint(cloud.layout, cloud.holdings);
      const sameCity = sameAccount &&
        fingerprint(this._localLayout(Date.now()), this._localHoldings()).struct === cloudFp.struct;
      if (sameCity || localAhead) {
        // sameCity: a plain reload (the tab closed before its last save-on-exit, say) - the local
        // city IS the cloud city, so "cloud wins" would rebuild the same city: adopt the revision.
        // localAhead: progress made here since our last push (offline, or a push the tab never
        // finished) on top of the very revision still in the cloud: push it.
        this._setBase(cloud);
        this._queueCredits(cloud.holdings, save);
        this.applying = true;
        let bankChanged = false;
        try { bankChanged = this._linkBank(save, true); } finally { this.applying = false; }
        if (bankChanged) this._afterEconomyReplaced(true);
        this._finishLink();
        await this.pushNow('link');          // only writes if something changed (or was collected)
        await this.pushBank();
      } else {
        this._adoptCloud(meta, cloud, save, gen);
      }
    }
    if (gen !== this._gen) return;
    this._subscribe(gen);
    this._subscribeBank(gen);
    this._startPresence(gen);
  }

  /**
   * Cloud wins: remember whose save this is now and apply the cloud city (possibly deferred). For
   * the same account, unsynced local changes are rebased onto it in _applyRemote.
   */
  _adoptCloud(meta, cloud, save, gen) {
    const sameAccount = meta.uid === this.uid;
    if (!sameAccount) {
      this._backupLocal(meta.uid || 'guest');
      if (!meta.uid) this._noteGuestBackup(cloud);
    }
    writeCloudMeta({
      uid: this.uid,
      syncedRev: this.syncedRev,
      creditedIds: sameAccount ? meta.creditedIds : [],
      linkedAt: Date.now(),
      bankHash: sameAccount ? meta.bankHash : '',
      bankBase: sameAccount ? meta.bankBase : null,
      pendingCredits: Object.fromEntries(this.pendingCredits)
    });
    this.pendingRemote = { city: cloud, bank: { save, sameAccount }, reason: 'link', gen };
    this._tryApplyPending();
  }

  /**
   * First link of this account: upload the local city + holdings, then the bank + garage.
   * Returns null, or the cloud city if another device created it in the meantime.
   */
  async _firstUpload(gen) {
    const { runTransaction } = this.fb.fsSdk;
    const now = Date.now();
    const layout = this._localLayout(now);
    const holdings = this._localHoldings();
    const token = this._nextToken();
    const res = await runTransaction(this.fb.db, async (tx) => {
      const s = await tx.get(this._cityRef());
      if (s.exists()) return { exists: s.data() };
      tx.set(this._cityRef(), this._cityDoc({ rev: 1, layout, holdings, summary: 'First upload from this device', writers: [token] }));
      return { rev: 1 };
    });
    if (gen !== this._gen) return null;
    if (res.exists) return res.exists;
    const meta = readCloudMeta();
    writeCloudMeta({ ...meta, uid: this.uid, syncedRev: 1, creditedIds: meta.uid === this.uid ? meta.creditedIds : [], linkedAt: now, bankHash: '', bankBase: null, fresh: false });
    this.bankBase = null;
    this._setBase({ rev: 1, layout, holdings });
    this.lastSyncedAt = Date.now();
    this._finishLink();
    await this.pushBank(true);
    this._setStatus('synced', 'City uploaded to your account');
    this.controller._emit('linked', { uid: this.uid, how: 'uploaded', rev: 1 });
    return null;
  }

  /**
   * The bank + garage at link, decided locally (the push that follows merges again if needed).
   * Same account: the cloud blob plus what changed here since this device's last bank sync
   * (both devices' spends and incomes survive); a device with no record of its last sync takes
   * the cloud's unless the cloud's is provably its own. Another account (or a guest save): that
   * save's bank must not become this account's - the cloud's is taken, or a starter bank when the
   * account has none (its first bank push never landed). Call while `applying`; returns whether
   * the live bank changed (the caller then saves / refreshes).
   */
  _linkBank(save, sameAccount) {
    const garage = this.game.garageManager;
    const local = this._localBank();
    let next = null;
    if (!sameAccount) {
      next = save
        ? { bank: save.bank, garage: save.garage || (garage ? garage._defaults() : null) }
        : { bank: EconomyManager.starterBank(), garage: garage ? garage._defaults() : null };
    } else if (save) {
      const doubt = this._bankDoubt;
      if (doubt && save.writers.includes(doubt.token)) {
        // This device's last bank write landed although its reply never came: this device's
        // changes are measured from that write, not from the sync before it (counted twice).
        next = mergeBank(doubt.local0, local, save);
      } else if (this.bankBase) {
        if (saveHashOf(save) !== saveHashOf(this.bankBase)) next = mergeBank(this.bankBase, local, save);
      } else if (!(readCloudMeta().bankHash && readCloudMeta().bankHash === bankHashOf(save))) {
        next = { bank: save.bank, garage: save.garage || local.garage };
      }
    }
    if (save) {
      this._rememberPaid(save.credited);
      // Settled: it landed (merged above) or, read from the server, it did not.
      if (!save.fromCache || (this._bankDoubt && save.writers.includes(this._bankDoubt.token))) this._setBankDoubt(null);
    }
    this._setBankBase(save);
    if (!next || bankHashOf(next) === bankHashOf(local)) return false;
    this._setBank(next);
    return true;
  }

  _finishLink() {
    this.linked = true;
    this._setStatus('synced', 'Your city is saved to your account');
  }

  /** Signed out (or switching account): stop everything; the local save stays as it is. */
  unlink() {
    this._gen++;
    if (this._unsubCity) this._unsubCity();
    if (this._unsubSave) this._unsubSave();
    this._unsubCity = this._unsubSave = null;
    clearTimeout(this._pushTimer); clearTimeout(this._bankTimer); clearTimeout(this._busyTimer);
    clearTimeout(this._retryTimer); clearTimeout(this._bankRetry); clearInterval(this._presenceTimer);
    clearTimeout(this._bankApplyTimer);
    this._pushTimer = this._bankTimer = this._busyTimer = this._retryTimer = this._bankRetry = this._presenceTimer = null;
    this._bankApplyTimer = null;
    this._dirtySince = this._bankDirtySince = 0;
    this._pendingBankSnap = null;
    this._bankSeenAt = 0;
    this.linked = false;
    this.uid = null;
    this.pendingRemote = null;
    this.lastSynced = null;
    this.base = null;
    this.bankBase = null;
    this.syncedRev = 0;
    this.pendingCredits = new Map();
    this._cityDoubts = [];
    this._bankDoubt = null;
    this._cityPushForced = false;
    this._clockMeasured = false;
    this._setStatus('offline', 'Not signed in - playing offline');
  }

  _backupLocal(label) {
    const tag = String(label || 'guest').replace(/[^A-Za-z0-9_-]/g, '_');
    for (const key of LOCAL_SAVE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) localStorage.setItem(`${key}.bak.${tag}`, raw);
      } catch (e) { /* quota: the cloud copy of that account still exists */ }
    }
  }

  /**
   * Spec 7.1 step 2: the local save is another account's and this account has no city yet.
   * Back it up, wipe the three keys and reload on a fresh default city; the link after the
   * reload uploads it. Persistence is suspended first so the unload handlers cannot write the
   * old city straight back.
   */
  _resetForAccount(oldUid) {
    this.resetting = true;
    this._backupLocal(oldUid);
    if (this.game.suspendPersistence) this.game.suspendPersistence();
    for (const key of LOCAL_SAVE_KEYS) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
    writeCloudMeta({ uid: this.uid, syncedRev: 0, creditedIds: [], linkedAt: Date.now(), fresh: true });
    this._setStatus('syncing', 'New account: starting a fresh city...');
    this.controller._emit('account-switch', { from: oldUid, to: this.uid, backupSuffix: `.bak.${oldUid}` });
    this.controller._toast('🔁 New account on this device: your previous city is backed up. Starting fresh...', 4000);
    setTimeout(() => window.location.reload(), 600);
  }

  // ---------------------------------------------------------------- guest city backup

  /**
   * A guest city about to be replaced by the account's city: note it, so ACCOUNT can offer it
   * back (the save itself is in `<key>.bak.guest`). Nothing to offer when it IS the account's city.
   */
  _noteGuestBackup(cloud) {
    try {
      const layout = this._localLayout(Date.now());
      if (fingerprint(layout, this._localHoldings()).struct === fingerprint(cloud.layout, cloud.holdings).struct) return;
      const eco = this.game.economyManager;
      localStorage.setItem(GUEST_BACKUP_KEY, JSON.stringify({
        uid: this.uid,
        at: Date.now(),
        townHall: townHallLevelOf(layout.buildings),
        buildings: layout.buildings.filter(b => !b.gate && b.t !== 'tree').length,
        roads: layout.roads.length,
        cash: Math.floor(eco.cash), iron: Math.floor(eco.iron), wood: Math.floor(eco.wood), gems: Math.floor(eco.gems)
      }));
    } catch (e) { /* the .bak.guest save is still there */ }
  }

  /** The guest city this device kept when this account's city replaced it, or null. */
  guestBackup() {
    try {
      const info = JSON.parse(localStorage.getItem(GUEST_BACKUP_KEY) || 'null');
      if (!isObj(info) || !this.uid || info.uid !== this.uid) return null;
      if (!localStorage.getItem(`${CITY_SAVE_KEY}.bak.guest`)) return null;
      return { ...info };
    } catch (e) {
      return null;
    }
  }

  /** Stop offering the guest city (its save stays in `<key>.bak.guest`). */
  dismissGuestBackup() {
    try { localStorage.removeItem(GUEST_BACKUP_KEY); } catch (e) { /* ignore */ }
  }

  /**
   * Make the kept guest city this account's city: the city, holdings, bank and garage come back
   * from `<key>.bak.guest` and are pushed as the account's next version. The account's current
   * city is kept on this device under `<key>.bak.<uid>` first.
   */
  async restoreGuestBackup() {
    const info = this.guestBackup();
    if (!info || !this.linked) throw codedError('failed-precondition', 'There is no guest city on this device to restore.');
    const busy = this.busyReason();
    if (busy) throw codedError('failed-precondition', 'Finish what you are doing first, then restore the guest city.');
    const raw = (key) => { try { return localStorage.getItem(`${key}.bak.guest`); } catch (e) { return null; } };
    let blob = null;
    try { blob = JSON.parse(raw(CITY_SAVE_KEY)); } catch (e) { blob = null; }
    if (!isObj(blob) || !Array.isArray(blob.buildings) || !blob.buildings.length) {
      throw codedError('failed-precondition', 'The guest city on this device cannot be read.');
    }
    const ecoRaw = raw(EconomyManager.SAVE_KEY);
    const garageRaw = raw(GarageManager.KEY);
    const game = this.game;
    const bm = game.buildingManager;
    const eco = game.economyManager;
    const garage = game.garageManager;
    this._backupLocal(this.uid);
    const now = Date.now();
    this.applying = true;
    try {
      // A parked city produced nothing while it was parked: its clock starts again now.
      restoreCity(bm, { ...blob, savedAt: now }, now);
      if (ecoRaw) { localStorage.setItem(EconomyManager.SAVE_KEY, ecoRaw); eco.load(); }
      if (garage && garageRaw) { localStorage.setItem(GarageManager.KEY, garageRaw); garage.load(); }
      eco.save();
      if (garage) garage.save();
      saveCity(bm);
    } finally {
      this.applying = false;
    }
    this.dismissGuestBackup();
    this._afterEconomyReplaced(true, { save: false });
    if (bm.onBuildersChanged) bm.onBuildersChanged();
    this.controller._onCityReplaced({ by: 'game', summary: '', reason: 'restore', rev: this.syncedRev, credited: { count: 0 } });
    const city = await this.pushNow('restore');
    await this.pushBank(true);
    return city;
  }

  // ---------------------------------------------------------------- local -> cloud

  /** The live city as a cloud layout. Ids generated for the cloud are put back on the buildings. */
  _localLayout(now) {
    const bm = this.game.buildingManager;
    const layout = toCloudLayout(serializeCity(bm, now), { nowMs: now });
    let changed = false;
    bm.buildings.forEach((b, i) => {
      const c = layout.buildings[i];
      if (c && c.id && b.id !== c.id) { b.id = c.id; changed = true; }
    });
    if (changed) saveCity(bm);   // the local save must carry the same ids as the cloud
    return layout;
  }

  /**
   * The live holdings. bankCredits = the stow credits this device has seen but not paid yet: they
   * stay in the cloud city until a bank push pays them (then the next push drops them).
   */
  _localHoldings() {
    const h = holdingsFromEconomy(this.game.economyManager);
    h.bankCredits = Object.fromEntries([...this.pendingCredits].map(([id, c]) => [id, { ...c }]));
    return h;
  }

  _cityDoc({ rev, layout, holdings, summary = '', writers = [] }) {
    const { serverTimestamp } = this.fb.fsSdk;
    return {
      uid: this.uid,
      name: String(this.name || 'Commander').slice(0, 40),
      townHall: townHallLevelOf(layout.buildings),
      rev,
      updatedAt: serverTimestamp(),
      updatedBy: 'game',
      writerId: this.sessionId,
      writers: writers.slice(-WRITER_MEMORY),
      layout,
      holdings,
      lastChange: { by: 'game', summary: String(summary).slice(0, 200), at: serverTimestamp() }
    };
  }

  /**
   * `city` (a cities/{uid} doc just read) settles the pushes whose reply never came: one whose
   * token is in its `writers` landed - that version is what this device last synced, so it becomes
   * the base (a remote edit on top of it rebased against the older base would add this device's
   * changes a second time); one whose revision the doc has reached without its token did not.
   */
  _settleCityDoubts(city) {
    if (!this._cityDoubts.length || !city) return;
    const writers = writersOf(city);
    const rev = Number(city.rev) || 0;
    const landed = this._cityDoubts.filter(d => writers.includes(d.token) && d.rev <= rev).pop();
    if (landed && landed.rev > (this.base ? this.base.rev : this.syncedRev)) this._setBase(landed);
    this._cityDoubts = this._cityDoubts.filter(d => d.rev > rev && !writers.includes(d.token));
    writeCloudDoubts(this.uid, this._cityDoubts);
  }

  /** The cloud city this page is now in sync with (pushed or applied). */
  _setBase(city) {
    const rev = Number(city.rev) || 0;
    this.base = { rev, layout: clone(city.layout), holdings: clone(city.holdings) };
    this.lastSynced = fingerprint(this.base.layout, this.base.holdings);
    this.syncedRev = rev;
    this.cloudRev = Math.max(this.cloudRev, rev);
    const m = readCloudMeta();
    m.uid = this.uid;
    m.syncedRev = rev;
    delete m.fresh;
    writeCloudMeta(m);
    writeCloudBase(this.uid, this.base);
  }

  _canPush() {
    return this.linked && !!this.uid && !this.applying && !this.resetting &&
      !(this.game && this.game.persistenceSuspended) && !!this.fb.auth.currentUser;
  }

  /**
   * Called by main.js saveCityNow after every local city save. Debounced, but a stream of edits
   * (a road drawn tile by tile) cannot hold the push back for more than PUSH_MAX_WAIT_MS: the
   * debounce used to restart on every save, so nothing reached the cloud for a whole editing
   * session and one remote edit in it replaced all of it.
   */
  schedulePush() {
    if (!this._canPush()) return;
    const now = Date.now();
    if (!this._dirtySince) this._dirtySince = now;
    const wait = Math.max(0, Math.min(PUSH_DEBOUNCE_MS, this._dirtySince + PUSH_MAX_WAIT_MS - now));
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => { this._pushTimer = null; this.pushNow('edit'); }, wait);
  }

  /**
   * Push as soon as the current action has finished mutating the city (a microtask): for changes
   * that moved value between the bank and the city - a purchase, an upgrade's cost, a collect, a
   * gem finish - which a remote edit landing in the debounce window would otherwise race.
   */
  pushSoon(reason = 'economy') {
    if (!this._canPush() || this._soonQueued) return;
    this._soonQueued = true;
    queueMicrotask(() => {
      this._soonQueued = false;
      this.pushNow(reason);
    });
  }

  /**
   * Push the city now. Resolves to { ok, rev } | { skipped, reason } | { conflict, rev } | { error }.
   * Never throws.
   */
  async pushNow(reason = 'edit') {
    clearTimeout(this._pushTimer);
    this._pushTimer = null;
    if (!this._canPush()) return { skipped: true, reason: 'not-linked' };
    if (this.pushing) {
      this.pushAgain = true;    // pushed right after the one in flight
      return this._pushPromise;
    }
    this._dirtySince = 0;
    const now = Date.now();
    const layout = this._localLayout(now);
    const holdings = this._localHoldings();
    const fp = fingerprint(layout, holdings);
    if (!this._cityPushForced && !this._needsPush(fp, now)) {
      if (this.status !== 'synced' && !this.pendingRemote) this._setStatus('synced', 'Your city is saved to your account');
      return { skipped: true, reason: 'unchanged' };
    }
    this.pushing = true;
    this._setStatus('syncing', 'Saving your city...');
    const baseRev = this.syncedRev;
    const gen = this._gen;
    const { runTransaction } = this.fb.fsSdk;
    // In doubt until the reply comes (kept across a reload: the tab may close first).
    const token = this._nextToken();
    this._cityDoubts = [...this._cityDoubts, { token, rev: baseRev + 1, layout: clone(layout), holdings: clone(holdings) }]
      .slice(-CITY_DOUBT_MEMORY);
    writeCloudDoubts(this.uid, this._cityDoubts);
    this._pushPromise = (async () => {
      try {
        const res = await runTransaction(this.fb.db, async (tx) => {
          const snap = await tx.get(this._cityRef());
          if (!snap.exists()) {
            tx.set(this._cityRef(), this._cityDoc({ rev: 1, layout, holdings, writers: [token] }));
            return { rev: 1 };
          }
          const cur = snap.data();
          if (cur.rev !== baseRev) return { conflict: cur };
          tx.set(this._cityRef(), this._cityDoc({ rev: cur.rev + 1, layout, holdings, writers: [...writersOf(cur), token] }));
          return { rev: cur.rev + 1 };
        });
        if (gen !== this._gen) return { skipped: true, reason: 'signed-out' };
        if (res.conflict) {
          const cur = res.conflict;
          // This push (an attempt whose reply was lost, retried by the SDK) or an earlier one of
          // this page may be in `cur` or under it: that version is then the base.
          this._settleCityDoubts(cur);
          if (cur.writerId === this.sessionId && cur.rev > this.syncedRev) {
            // Our own earlier push landed although its reply never arrived (a dropped
            // connection): that version is what this page last synced. Push on top of it.
            this._setBase(cur);
            this.pushAgain = true;
          } else if (cur.rev > this.syncedRev) {
            // Someone else (the AI designer, another device or tab) saved a newer version. It is
            // applied with this device's unsynced changes rebased onto it, then pushed (spec 13).
            if (!this.pendingRemote || this.pendingRemote.city.rev < cur.rev) {
              const keep = this.pendingRemote && this.pendingRemote.reason === 'link' ? this.pendingRemote : null;
              this.pendingRemote = { city: cur, bank: keep ? keep.bank : null, reason: keep ? 'link' : 'conflict', gen };
            }
            this._tryApplyPending();
          } else {
            this.pushAgain = true;   // we already applied that revision meanwhile: push on top of it
          }
          return { conflict: true, rev: cur.rev };
        }
        this._cityDoubts = this._cityDoubts.filter(d => d.token !== token && d.rev > res.rev);
        writeCloudDoubts(this.uid, this._cityDoubts);
        this._cityPushForced = false;
        this._setBase({ rev: res.rev, layout, holdings });
        this.lastSyncedAt = Date.now();
        this._retryStep = 0;
        if (!this.pendingRemote) this._setStatus('synced', 'Your city is saved to your account');
        this.controller._emit('pushed', { rev: res.rev, reason });
        return { ok: true, rev: res.rev };
      } catch (e) {
        if (gen !== this._gen) return { error: e };
        const err = friendlyError(e, 'Could not save your city to the cloud.');
        console.warn('[cloud] push failed', e);
        this._setStatus(isNetworkError(e) ? 'offline' : 'error', err.message + ' It stays saved on this device.');
        if (!isNetworkError(e)) this.controller._error('sync', err);
        clearTimeout(this._retryTimer);
        const wait = RETRY_BACKOFF_MS[Math.min(this._retryStep++, RETRY_BACKOFF_MS.length - 1)];
        this._retryTimer = setTimeout(() => { if (gen === this._gen) this.schedulePush(); }, wait);
        return { error: err };
      } finally {
        this.pushing = false;
        if (this.pushAgain && gen === this._gen) {
          this.pushAgain = false;
          queueMicrotask(() => { if (gen === this._gen) this.pushNow('again'); });
        }
      }
    })();
    return this._pushPromise;
  }

  /**
   * Does the live city (fingerprint `fp`, taken at `now`) hold anything the cloud does not know?
   * Its structure differs, or a producer holds less than the cloud copy implies by now: its `st`
   * at the cloud's savedAt plus what it made since (capped at capacity). Comparing raw numbers
   * missed every collect after the first one (0 < 0 is false), and a later restore from the cloud
   * paid that output out again.
   */
  _needsPush(fp, now = Date.now()) {
    const last = this.lastSynced;
    if (!last) return true;
    if (fp.struct !== last.struct) return true;
    const secs = Math.max(0, (now - last.savedAt) / 1000);
    for (const id of Object.keys(fp.st)) {
      if (!(id in last.st)) continue;
      const [type, level] = last.kind[id] || [];
      const def = BUILDING_DEFS[type];
      if (!def || !def.produce) {
        if (fp.st[id] < last.st[id]) return true;
        continue;
      }
      // Two units + one second of production absorb rounding and the gap between the clocks.
      const expected = storedAfter(type, level, last.st[id], secs);
      if (fp.st[id] + 2 + produceRateFor(type, level) < expected) return true;   // collected
    }
    return false;
  }

  /** Push whatever is waiting right now (city and bank). Resolves when both are done. */
  async flush() {
    const city = this.pushNow('flush');
    const bank = this.pushBank();
    const [c] = await Promise.all([city, bank]);
    if (this._pushPromise && this.pushing) await this._pushPromise;
    return c;
  }

  // ---------------------------------------------------------------- bank + garage

  _bankShape(save) {
    const b = (save && save.bank) || {};
    return {
      bank: {
        cash: nonNeg(b.cash), iron: nonNeg(b.iron), wood: nonNeg(b.wood), gems: nonNeg(b.gems),
        vehicleLives: Math.max(0, Math.round(Number(b.vehicleLives)) || 0)
      },
      garage: save && save.garage && typeof save.garage === 'object' ? save.garage : null,
      credited: Array.isArray(save && save.credited)
        ? save.credited.filter(id => isValidBuildingId(id)).slice(-CREDIT_MEMORY) : [],
      // Not part of any hash: which game writes made this state (see WRITER_MEMORY).
      writers: writersOf(save),
      // Not part of any hash: orders snapshots (a server timestamp; 0 when unknown).
      updatedAtMs: save && save.updatedAt && typeof save.updatedAt.toMillis === 'function' ? save.updatedAt.toMillis() : 0
    };
  }

  _localBank() {
    const eco = this.game.economyManager;
    const garage = this.game.garageManager;
    return this._bankShape({
      bank: { cash: eco.cash, iron: eco.iron, wood: eco.wood, gems: eco.gems, vehicleLives: eco.vehicleLives },
      garage: garage ? JSON.parse(JSON.stringify(garage.state)) : null
    });
  }

  /** Put a bank shape into the live economy + garage (no save, no callbacks). */
  _setBank(shape) {
    const eco = this.game.economyManager;
    const garage = this.game.garageManager;
    const s = this._bankShape(shape);
    eco.cash = s.bank.cash;
    eco.iron = s.bank.iron;
    eco.wood = s.bank.wood;
    eco.gems = s.bank.gems;
    eco.vehicleLives = Math.min(EconomyManager.MAX_SPARE_LIVES, s.bank.vehicleLives);
    if (garage && s.garage && stableStringify(s.garage) !== stableStringify(garage.state)) {
      garage.state = garage._sanitize(s.garage);
      garage.save();
    }
  }

  /** saves/{uid} as this page now knows it (null = there is none). */
  _setBankBase(shape) {
    this.bankBase = shape ? { bank: { ...shape.bank }, garage: clone(shape.garage) || null, credited: (shape.credited || []).slice() } : null;
    const m = readCloudMeta();
    m.bankBase = this.bankBase;
    m.bankHash = this.bankBase ? bankHashOf(this.bankBase) : '';
    m.pendingCredits = Object.fromEntries(this.pendingCredits);
    writeCloudMeta(m);
  }

  /** A bank write whose reply never came (or null): kept in meta, so a reload settles it too. */
  _setBankDoubt(d) {
    if (!d && !this._bankDoubt) return;
    this._bankDoubt = d || null;
    const m = readCloudMeta();
    m.bankDoubt = this._bankDoubt;
    writeCloudMeta(m);
  }

  /**
   * `cur` (saves/{uid} as just read) settles the bank write whose reply never came: if its token is
   * in `writers` it landed - it becomes what this page last synced, exactly as if the reply had
   * come (the live bank keeps what changed here since). `definite`: the read came from the server,
   * so a missing token means it did not land. Without this, the next merge took our own landed
   * write for another device's change and applied this device's changes a second time.
   */
  _settleBankDoubt(cur, definite = true) {
    const d = this._bankDoubt;
    if (!d) return;
    if (cur && cur.writers.includes(d.token)) {
      this._setBankDoubt(null);
      this._bankSynced(d.merged, d.local0);
    } else if (definite) {
      this._setBankDoubt(null);
    }
  }

  /** Credits the cloud bank has paid (by any device) are no longer pending here. */
  _rememberPaid(ids) {
    if (!Array.isArray(ids) || !ids.length) return;
    const m = readCloudMeta();
    for (const id of ids) {
      if (this.pendingCredits.delete(id) || !m.creditedIds.includes(id)) m.creditedIds.push(id);
    }
    m.creditedIds = [...new Set(m.creditedIds)];
    m.pendingCredits = Object.fromEntries(this.pendingCredits);
    writeCloudMeta(m);
  }

  /** Called after every economy save / garage commit (debounced 3 s, never more than 8 s late). */
  scheduleBankPush() {
    if (!this._canPush()) return;
    const now = Date.now();
    if (!this._bankDirtySince) this._bankDirtySince = now;
    const wait = Math.max(0, Math.min(BANK_DEBOUNCE_MS, this._bankDirtySince + BANK_MAX_WAIT_MS - now));
    clearTimeout(this._bankTimer);
    this._bankTimer = setTimeout(() => { this._bankTimer = null; this.pushBank(); }, wait);
  }

  /**
   * Write the bank + garage (and pay pending stow credits) in one transaction. If saves/{uid} is
   * still what this page last synced, the local bank is written; if another device wrote it since,
   * the result is theirs plus this device's changes since that sync (it used to be a blind set, so
   * one tap on a stale device wiped the other device's spend or earnings). Never throws.
   *
   * Idempotent: the write carries a token in `writers`. When a commit lands but its reply is lost,
   * the SDK runs the transaction again; that run finds its own token and adopts the doc instead of
   * merging it as another device's change (which applied every collect / spend twice). A push that
   * failed after writing leaves the write in doubt (_bankDoubt) until a read settles it.
   *
   * Stow credits: a pending credit is paid only while the cloud city still carries it (the
   * transaction reads cities/{uid} too) and saves.credited does not list it; `credited` keeps every
   * paid id the city still carries, so a credit can never be forgotten and paid again, and when it
   * has no room left the rest wait for a city push that drops the paid ones (a credit leaves the
   * city only once paid).
   */
  async pushBank(force = false) {
    clearTimeout(this._bankTimer);
    this._bankTimer = null;
    this._bankDirtySince = 0;
    if (!this._canPush()) return { skipped: true };
    if (this._bankPushing) {
      this._bankAgain = true;
      return this._bankPromise;
    }
    if (!force && !this._bankDoubt && !this.pendingCredits.size && this.bankBase &&
        bankHashOf(this._localBank()) === bankHashOf(this.bankBase)) {
      return { skipped: true, reason: 'unchanged' };
    }
    const { runTransaction, serverTimestamp, getDocFromServer } = this.fb.fsSdk;
    const gen = this._gen;
    this._bankPushing = true;
    this._bankPromise = (async () => {
      let wrote = null;             // what the last attempt wrote: in doubt if the push then fails
      try {
        // Our last write's reply never came: did it land? (The merge below is measured from it.)
        if (this._bankDoubt) {
          const snap = await getDocFromServer(this._saveRef());
          if (gen !== this._gen) return { skipped: true };
          this._settleBankDoubt(snap.exists() ? this._bankShape(snap.data()) : null, true);
        }
        const local0 = this._localBank();
        const token = this._nextToken();
        this._bankInFlight = token;
        let out = null;
        await runTransaction(this.fb.db, async (tx) => {
          const snap = await tx.get(this._saveRef());
          const citySnap = await tx.get(this._cityRef());
          const cur = snap.exists() ? this._bankShape(snap.data()) : null;
          if (cur && cur.writers.includes(token)) {
            // An earlier attempt of this very transaction committed (its reply was lost): done.
            out = { merged: cur, paidIds: [], dropIds: [], blocked: false, curAt: cur.updatedAtMs };
            return;
          }
          const base = this.bankBase;
          const merged = !cur || !base || saveHashOf(cur) === saveHashOf(base)
            ? { bank: { ...local0.bank }, garage: clone(local0.garage) }
            : mergeBank(base, local0, cur);
          const plan = planCredits({
            pending: [...this.pendingCredits],
            paid: cur ? cur.credited : [],
            inCity: Object.keys(normalizeHoldings(citySnap.exists() ? citySnap.data().holdings : null).bankCredits),
            cap: CREDIT_MEMORY
          });
          for (const [, c] of plan.pay) {
            merged.bank.cash += nonNeg(c.cash);
            merged.bank.iron += nonNeg(c.iron);
            merged.bank.wood += nonNeg(c.wood);
          }
          merged.credited = plan.credited;
          const data = { bank: merged.bank, updatedAt: serverTimestamp(), writers: [...(cur ? cur.writers : []), token].slice(-WRITER_MEMORY) };
          if (merged.garage) data.garage = merged.garage;
          if (merged.credited.length) data.credited = merged.credited;
          tx.set(this._saveRef(), data);
          wrote = { token, merged: { bank: { ...merged.bank }, garage: clone(merged.garage) || null, credited: merged.credited.slice() }, local0 };
          out = { merged, paidIds: plan.pay.map(([id]) => id), dropIds: plan.drop, blocked: plan.blocked, curAt: cur ? cur.updatedAtMs : 0 };
        });
        if (gen !== this._gen) return { skipped: true };
        // Every saves/ state up to the one this transaction read is inside `merged` now.
        this._bankSeenAt = Math.max(this._bankSeenAt, out.curAt);
        for (const id of [...out.paidIds, ...out.dropIds]) this.pendingCredits.delete(id);
        this._bankSynced(out.merged, local0);
        if (out.blocked) {
          // `credited` is full of paid credits the city still carries (the AI designer keeps them
          // and nothing here changed): push the city, which keeps only the unpaid ones.
          this._cityPushForced = true;
          this.pushNow('credits');
        }
        return { ok: true, credited: out.paidIds.length };
      } catch (e) {
        if (gen !== this._gen) return { error: friendlyError(e) };
        if (wrote) this._setBankDoubt(wrote);
        console.warn('[cloud] bank push failed', e);
        clearTimeout(this._bankRetry);
        this._bankRetry = setTimeout(() => this.scheduleBankPush(), 15000);
        return { error: friendlyError(e) };
      } finally {
        this._bankPushing = false;
        this._bankInFlight = null;
        if (gen === this._gen) {
          if (this._bankAgain) {
            this._bankAgain = false;
            this.scheduleBankPush();
          }
          if (this._pendingBankSnap) this._tryApplyBank();
        }
      }
    })();
    return this._bankPromise;
  }

  /**
   * A bank transaction committed `merged`. The live bank becomes that plus whatever changed here
   * while the transaction ran (a collect in those milliseconds must not be lost).
   */
  _bankSynced(merged, local0) {
    const now = this._localBank();
    const next = mergeBank(local0, now, merged);
    this._rememberPaid(merged.credited);
    this._setBankBase(merged);
    if (bankHashOf(next) !== bankHashOf(now)) {
      this.applying = true;
      try { this._setBank(next); } finally { this.applying = false; }
      this._afterEconomyReplaced(stableStringify(next.garage) !== stableStringify(now.garage));
    }
    if (bankHashOf(next) !== bankHashOf(this.bankBase)) this.scheduleBankPush();
  }

  /** Follow saves/{uid}: another device's bank change reaches this one live. */
  _subscribeBank(gen) {
    if (this._unsubSave) this._unsubSave();
    const { onSnapshot } = this.fb.fsSdk;
    this._unsubSave = onSnapshot(this._saveRef(), (snap) => {
      if (gen !== this._gen || !snap.exists() || snap.metadata.hasPendingWrites) return;
      this._pendingBankSnap = this._bankShape(snap.data());
      this._tryApplyBank();
    }, (err) => {
      if (gen !== this._gen) return;
      console.warn('[cloud] bank listener failed', err);
    });
  }

  _tryApplyBank() {
    clearTimeout(this._bankApplyTimer);
    this._bankApplyTimer = null;
    const cur = this._pendingBankSnap;
    if (!cur || !this.linked) return;
    // Our own running transaction's write landing: that transaction applies it.
    if (this._bankInFlight && cur.writers[cur.writers.length - 1] === this._bankInFlight) {
      this._pendingBankSnap = null;
      return;
    }
    // Our last write whose reply never came, seen in the cloud (maybe with others on top).
    const doubtLanded = !!this._bankDoubt && cur.writers.includes(this._bankDoubt.token);
    const h = saveHashOf(cur);
    // What we know already, or a state older than one a bank push has already merged (snapshots
    // can arrive after the transaction that read past them).
    if (!doubtLanded && ((this.bankBase && h === saveHashOf(this.bankBase)) ||
        (cur.updatedAtMs && cur.updatedAtMs <= this._bankSeenAt))) {
      this._pendingBankSnap = null;
      return;
    }
    // A running bank push merges it anyway; a raid or a city being applied finishes first.
    if (this._bankPushing) return;
    if (this.applying || this.resetting || this.busyReason()) {
      this._bankApplyTimer = setTimeout(() => this._tryApplyBank(), BUSY_RETRY_MS);
      return;
    }
    this._pendingBankSnap = null;
    this._bankSeenAt = Math.max(this._bankSeenAt, cur.updatedAtMs);
    if (doubtLanded) this._settleBankDoubt(cur);
    const local = this._localBank();
    const next = this.bankBase ? mergeBank(this.bankBase, local, cur) : { bank: cur.bank, garage: cur.garage || local.garage };
    this._rememberPaid(cur.credited);
    this._setBankBase(cur);
    if (bankHashOf(next) !== bankHashOf(local)) {
      this.applying = true;
      try { this._setBank(next); } finally { this.applying = false; }
      this._afterEconomyReplaced(stableStringify(next.garage) !== stableStringify(local.garage));
    }
    // This device's own changes since its last sync still have to reach the cloud.
    if (bankHashOf(next) !== bankHashOf(cur)) this.scheduleBankPush();
  }

  _afterEconomyReplaced(garageToo, { save = true } = {}) {
    const eco = this.game.economyManager;
    if (save) {
      // Saved while `applying`: the save hooks must not schedule pushes of what the cloud has.
      const was = this.applying;
      this.applying = true;
      try { eco.save(); } finally { this.applying = was; }
    }
    if (eco.onUpdate) eco.onUpdate(eco.getResources());
    if (eco.onInventoryUpdate) eco.onInventoryUpdate(eco.inventory);
    const garage = this.game.garageManager;
    if (garageToo && garage && garage.onChange) garage.onChange(garage.state);
  }

  /**
   * MCP stow credits (spec 3.4) not paid yet become pending; the next bank push pays them in the
   * same transaction that records their ids in saves/{uid}.credited, so each is paid once per
   * account however many devices see it. Returns the new ones' totals (for the toast).
   * `holdback` (a rebase's creditHoldback: id -> amount) is output this device had already banked:
   * taken off that credit here, so it is never paid twice - and never taken from the live bank,
   * where it may have been spent already. A credit held back entirely is still queued, to be
   * recorded as paid.
   */
  _queueCredits(holdings, save, holdback = null) {
    const out = { count: 0, cash: 0, iron: 0, wood: 0, reasons: [] };
    const credits = normalizeHoldings(holdings).bankCredits;
    const meta = readCloudMeta();
    const paid = new Set([
      ...meta.creditedIds,
      ...((save && save.credited) || []),
      ...((this.bankBase && this.bankBase.credited) || [])
    ]);
    let queued = 0;
    // A credit the city no longer carries was paid (a game push drops only credits its device knows
    // are paid; the MCP server never drops one): never pay it, nor write it back into the city.
    for (const id of [...this.pendingCredits.keys()]) {
      if (!(id in credits)) { this.pendingCredits.delete(id); queued++; }
    }
    for (const [id, c0] of Object.entries(credits)) {
      if (paid.has(id) || this.pendingCredits.has(id)) continue;
      const hold = holdback && holdback[id];
      const c = hold ? {
        ...c0,
        cash: Math.max(0, c0.cash - nonNeg(hold.cash)),
        iron: Math.max(0, c0.iron - nonNeg(hold.iron)),
        wood: Math.max(0, c0.wood - nonNeg(hold.wood))
      } : c0;
      this.pendingCredits.set(id, c);
      queued++;
      if (!(c.cash + c.iron + c.wood > 0)) continue;
      out.count++;
      out.cash += Math.floor(nonNeg(c.cash));
      out.iron += Math.floor(nonNeg(c.iron));
      out.wood += Math.floor(nonNeg(c.wood));
      if (c.reason) out.reasons.push(String(c.reason));
    }
    if (queued) {
      meta.pendingCredits = Object.fromEntries(this.pendingCredits);
      writeCloudMeta(meta);
    }
    return out;
  }

  // ---------------------------------------------------------------- cloud -> local

  _subscribe(gen) {
    if (this._unsubCity) this._unsubCity();
    const { onSnapshot } = this.fb.fsSdk;
    this._unsubCity = onSnapshot(this._cityRef(), (snap) => {
      if (gen !== this._gen || !snap.exists() || snap.metadata.hasPendingWrites) return;
      const d = snap.data();
      this.cloudRev = Math.max(this.cloudRev, Number(d.rev) || 0);
      if (d.writerId === this.sessionId) {
        // Our own push. One whose reply was lost (a dropped connection) is still ours: in sync.
        this._settleCityDoubts(d);
        if (d.rev > this.syncedRev && !this.pushing) this._setBase(d);
        return;
      }
      if (!(d.rev > this.syncedRev)) return;                          // nothing new for this page
      if (this.pendingRemote && this.pendingRemote.city && this.pendingRemote.city.rev >= d.rev) return;
      const keep = this.pendingRemote && this.pendingRemote.reason === 'link' ? this.pendingRemote : null;
      this.pendingRemote = { city: d, bank: keep ? keep.bank : null, reason: keep ? 'link' : 'remote', gen };
      this._tryApplyPending();
    }, (err) => {
      if (gen !== this._gen) return;
      console.warn('[cloud] city listener failed', err);
      this._setStatus(isNetworkError(err) ? 'offline' : 'error', friendlyError(err).message);
    });
  }

  /**
   * Why a remote city cannot be applied right now (null = it can): a raid (practice or
   * battle), the PvP arena, a building in the player's hand, or the template modal.
   */
  busyReason() {
    const g = this.game;
    const am = g.attackManager;
    if (am && am.state && am.state !== 'IDLE') return 'raid';
    if (am && am.buildings && am.buildings !== g.buildingManager) return 'arena';
    const arena = g.arenaCity || (am && am.arena);
    if (arena) {
      const flag = (k) => (typeof arena[k] === 'function' ? arena[k]() : arena[k]);
      if (flag('active') || flag('isActive') || flag('loaded') || flag('isLoaded')) return 'arena';
    }
    if (g.gridSystem && g.gridSystem.dragBuilding) return 'drag';
    const modal = g.uiManager && g.uiManager.redesignModal;
    if (modal && !modal.classList.contains('hidden')) return 'preset';
    if (g.persistenceSuspended) return 'suspended';
    return null;
  }

  _tryApplyPending() {
    clearTimeout(this._busyTimer);
    this._busyTimer = null;
    const p = this.pendingRemote;
    if (!p || this.applying || this.resetting) return;
    if (p.gen !== undefined && p.gen !== this._gen) { this.pendingRemote = null; return; }
    const busy = this.busyReason();
    if (busy) {
      if (this.status !== 'syncing') this._setStatus('syncing', 'A cloud change is waiting until you finish (' + busy + ')');
      this._busyTimer = setTimeout(() => this._tryApplyPending(), BUSY_RETRY_MS);
      return;
    }
    this.pendingRemote = null;
    this._applyRemote(p);
  }

  /**
   * Spec 7.1 "Remote apply", in its order - with this device's unsynced changes rebased onto the
   * remote city when there are any (cityMerge.rebaseCity), after which the result is pushed.
   */
  _applyRemote({ city, bank, reason }) {
    const game = this.game;
    const bm = game.buildingManager;
    const eco = game.economyManager;
    const now = Date.now();
    let credited = { count: 0 };
    let rebase = null;
    let ok = false;
    // A push of ours whose reply never came may be under this version: then it is the base.
    this._settleCityDoubts(city);
    if (this.base && Number(city.rev) > this.base.rev) {
      const layout = this._localLayout(now);
      const holdings = this._localHoldings();
      if (this._needsPush(fingerprint(layout, holdings), now)) {
        try {
          rebase = rebaseCity({ base: this.base, local: { layout, holdings }, remote: city, nowMs: now });
        } catch (e) {
          console.error('[cloud] could not rebase local changes; the cloud city wins', e);
          rebase = null;
        }
      }
    }
    const target = rebase || city;
    this.applying = true;
    try {
      restoreCity(bm, fromCloudLayout(target.layout), now);
      applyHoldingsToEconomy(eco, target.holdings);
      if (bank) this._linkBank(bank.save, bank.sameAccount);         // bank + garage (link only)
      if (rebase) {
        // A job started here on a building the remote removed: refunded, as the game refunds a
        // stowed job. Output of a building placed here that no longer fits: banked, as a stow
        // banks it. (Output already banked here that a remote stow credit pays again is held back
        // from that credit in _queueCredits, not taken from this bank.)
        const r = rebase.report;
        eco.cash += r.refund.cash + r.bankedOutput.cash;
        eco.iron += r.refund.iron + r.bankedOutput.iron;
        eco.wood += r.refund.wood + r.bankedOutput.wood;
      }
      credited = this._queueCredits(city.holdings, bank ? bank.save : null, rebase ? rebase.report.creditHoldback : null);
      eco.save();
      if (eco.onUpdate) eco.onUpdate(eco.getResources());
      if (eco.onInventoryUpdate) eco.onInventoryUpdate(eco.inventory);
      if (bank && game.garageManager && game.garageManager.onChange) game.garageManager.onChange(game.garageManager.state);
      if (bm.onBuildersChanged) bm.onBuildersChanged();
      saveCity(bm);
      this._setBase(city);
      this.lastSyncedAt = Date.now();
      ok = true;
    } catch (e) {
      console.error('[cloud] could not apply the cloud city', e);
      this.controller._error('sync', friendlyError(e, 'Could not apply the cloud city.'));
    } finally {
      this.applying = false;
    }
    if (!ok) {
      this._setStatus('error', 'Could not apply the cloud city');
      return;
    }
    if (!this.linked) {
      this._finishLink();
      this.controller._emit('linked', { uid: this.uid, how: 'downloaded', rev: city.rev });
    } else {
      this._setStatus('synced', 'Your city is saved to your account');
    }
    // The economy saves above ran while applying (no push from inside): send the bank now if it
    // differs from the cloud's, or if stow credits are waiting to be paid.
    if (this.pendingCredits.size) this.pushBank();
    else this.scheduleBankPush();
    this.controller._onCityReplaced({
      by: city.updatedBy === 'mcp' ? 'mcp' : 'game',
      summary: (city.lastChange && city.lastChange.summary) || '',
      reason,
      rev: city.rev,
      credited,
      rebase: rebase ? { ...rebase.report, kept: rebaseKeptSomething(rebase.report) } : null
    });
    // The rebased city differs from the remote one by exactly this device's changes: push them.
    // (No push merely because credits were applied - that would end the AI designer's undo.)
    if (rebase) this.pushNow('rebase');
  }

  // ---------------------------------------------------------------- presence

  _startPresence(gen) {
    clearInterval(this._presenceTimer);
    this._presenceTimer = setInterval(() => this._presence(gen), PRESENCE_MS);
    this._presence(gen);
  }

  /**
   * players/{uid}.lastSeen + townHall (never trophies: the rules only let those move in settle
   * steps). The first write of a session also measures the server clock offset, which battle
   * timing (startAt, fight windows) is judged by.
   */
  async _presence(gen) {
    if (gen !== this._gen || !this.uid || document.visibilityState === 'hidden') return;
    const { updateDoc, getDocFromServer, serverTimestamp } = this.fb.fsSdk;
    const ref = this._playerRef();
    const th = this.game.buildingManager.getTownHallLevel ? this.game.buildingManager.getTownHallLevel() : 1;
    const t0 = Date.now();
    try {
      await updateDoc(ref, { lastSeen: serverTimestamp(), townHall: Math.max(1, Math.min(12, Math.round(th) || 1)) });
      if (this._clockMeasured || gen !== this._gen) return;
      const t1 = Date.now();
      const snap = await getDocFromServer(ref);
      const seen = snap.exists() && snap.data().lastSeen;
      if (seen && typeof seen.toMillis === 'function') {
        this._clockMeasured = true;
        this.controller._setClockOffset(seen.toMillis() - (t0 + t1) / 2);
      }
    } catch (e) {
      // Presence is best effort (a profile being created, a flaky network).
      if (e && e.code !== 'not-found') console.debug('[cloud] presence skipped', e && e.code);
    }
  }
}
