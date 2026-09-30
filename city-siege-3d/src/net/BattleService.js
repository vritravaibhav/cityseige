import {
  BATTLE, battlePhase, respondDeadline, decideWinner, trophyDelta, validateChallenge, starsFor, toMillis,
  isNightAt, BATTLE_OUTCOMES, resolveDue, awaitingResult, recordFieldFor, raidEndsBy, nextChangeAt
} from '../shared/battleRules.js';
import { friendlyError, codedError } from './AuthService.js';

/**
 * BattleService - challenges and battles between two players (docs/ONLINE_SPEC.md 5, 6, 7.3).
 *
 * A battle is one Firestore document both players can read. Each transition (accept, ready,
 * lock the cities, attempt, result, resolve, settle) is a small write that the security rules
 * check key by key against the SERVER clock, so the client never needs to be trusted about
 * timing - only about how well it raided (documented trust model, see firestore.rules).
 *
 * While signed in the service runs by itself: on every battles snapshot, every 5 s and right after
 * every moment the clock alone changes a battle (battleRules.nextChangeAt: a phase boundary, the
 * attack cutoff, a raid's clock running out - so no stale ATTACK button waits for a snapshot) it
 *   - locks MY city (after pushing my last edits) as soon as a battle enters its fight window,
 *     and the opponent's only if their own game has not locked it LOCK_GRACE later,
 *   - resolves battles whose verdict is fixed (battleRules.resolveDue),
 *   - settles finished battles for this player (trophies + W/L/D, once),
 *   - re-sends a result that could not be sent (tab closed, network down),
 *   - reports incoming challenges, acceptances, fight starts and results as events.
 *
 * Every rejection is a friendly Error (see AuthService.friendlyError).
 */

const TICK_MS = 5000;
const RESULTS_QUEUE_KEY = 'city_siege_battle_results';
// battleId -> { uid, beat, dead? }: a battle raid running in THIS browser, from the breach until
// its result is queued. Its page beats every tick; pagehide marks it dead (reload, closed tab).
// Other tabs read it to tell "raiding in another tab" from "raid lost with its page".
const RAIDS_KEY = 'city_siege_battle_raids';
const RAID_STALE_MS = 90 * 1000;    // no beat for this long: that page is gone (hidden tabs tick 1/min)
const EDGE_MARGIN_MS = 250;         // recompute just after a clock boundary, not a hair before it
const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const OPPONENT_DELAY_MS = 3000;
const HISTORY_LIMIT = 30;
// The live query covers every battle that can still need this client (a scheduled battle is
// created at most 7 days before its start, then 1 h of fight + the result grace), with no
// limit, so older battles or a flood of new challenges can never push a live one out of view.
const LIVE_WINDOW_MS = (BATTLE.SCHEDULED_MAX_LEAD_SECONDS + 86400) * 1000;

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

const ms = (v) => toMillis(v);

function readQueue() {
  try {
    const q = JSON.parse(localStorage.getItem(RESULTS_QUEUE_KEY) || '{}');
    return q && typeof q === 'object' ? q : {};
  } catch (e) {
    return {};
  }
}

function writeQueue(q) {
  try {
    if (Object.keys(q).length) localStorage.setItem(RESULTS_QUEUE_KEY, JSON.stringify(q));
    else localStorage.removeItem(RESULTS_QUEUE_KEY);
  } catch (e) { /* ignore */ }
}

function readRaids() {
  try {
    const r = JSON.parse(localStorage.getItem(RAIDS_KEY) || '{}');
    return r && typeof r === 'object' ? r : {};
  } catch (e) {
    return {};
  }
}

function writeRaids(r) {
  try {
    const now = Date.now();
    for (const k of Object.keys(r)) if (!(r[k] && now - Number(r[k].beat) < 86400 * 1000)) delete r[k];
    if (Object.keys(r).length) localStorage.setItem(RAIDS_KEY, JSON.stringify(r));
    else localStorage.removeItem(RAIDS_KEY);
  } catch (e) { /* ignore */ }
}

/**
 * A raid's stats in exactly the shape the rules accept (spec 6 "result"): stars must equal
 * starsFor(percentage), the percentage must match destroyed/total, 'victory' only at 100%.
 */
export function sanitizeResult(stats = {}) {
  const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v)) || 0));
  const total = int(stats.total, 0, 1000);
  const destroyed = int(stats.destroyed, 0, total);
  let percentage = Number(stats.percentage);
  const exact = total > 0 ? (destroyed * 100) / total : 0;
  if (!Number.isFinite(percentage) || Math.abs(percentage - exact) > 0.5) {
    percentage = total > 0 ? Math.min(100, Math.round(exact)) : 0;   // DestructionEngine.getStats
  }
  percentage = Math.max(0, Math.min(100, percentage));
  let outcome = BATTLE_OUTCOMES.includes(stats.outcome) ? stats.outcome : 'retreat';
  if (outcome === 'victory' && percentage !== 100) outcome = 'retreat';
  const dur = Number(stats.durationSec);
  const looted = stats.loot || stats.looted || {};
  const res = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return {
    stars: starsFor(percentage),
    percentage,
    destroyed,
    total,
    outcome,
    durationSec: Number.isFinite(dur) ? Math.max(0, Math.min(BATTLE.RAID_TIME_LIMIT_SECONDS + 60, dur)) : BATTLE.RAID_TIME_LIMIT_SECONDS,
    loot: { cash: res(looted.cash), iron: res(looted.iron), wood: res(looted.wood) }
  };
}

export class BattleService {
  /**
   * @param {object} deps
   * @param {object} deps.fb          loadFirebase() result
   * @param {object} deps.controller  OnlineController (serverNow, profile, townHall, cloudSync, events)
   */
  constructor({ fb, controller }) {
    this.fb = fb;
    this.controller = controller;
    this.uid = null;
    this.raw = new Map();         // id -> battle data (Firestore values)
    this.list = [];               // views, newest first
    this._listeners = new Set();
    this._unsub = null;
    this._live = new Map();       // id -> data from the live (last 8 days, no limit) query
    this._history = new Map();    // id -> data from the history (newest 30) query
    this._tick = null;
    this._seen = null;            // id -> { phase, status, theirResult, ... } for notifications
    this._busy = new Map();       // `${kind}:${id}` -> promise (one automatic write at a time)
    this._lastTry = new Map();    // `${kind}:${id}` -> ms of the last automatic attempt
    this._dueSince = new Map();   // `${kind}:${id}` -> ms it was first seen due (opponent waits)
    this._recheck = null;
    this._edge = null;            // timer for the next clock boundary (nextChangeAt)
    this._raidingHere = new Set(); // battle ids whose raid this page runs (breach -> result queued)
    // A reload or a closed tab ends this page's raid for good: say so to the other tabs at once.
    this._onPageHide = () => this._raidMark([...this._raidingHere], { dead: true });
    this._onPageShow = (e) => { if (e && e.persisted) this._raidBeat(); };
    // Another tab of this browser started, beat, queued or lost a raid: redraw if a card changes.
    this._onStorage = (e) => {
      if (!this.uid || (e.key !== RAIDS_KEY && e.key !== RESULTS_QUEUE_KEY && e.key !== null)) return;
      const now = this._now();
      const stale = this.list.some(v => {
        const b = v.iAttempted && !v.myResult ? this.raw.get(v.id) : null;
        if (!b) return false;
        const n = this.view(b, now);
        return n.myRaid !== v.myRaid || n.resultPending !== v.resultPending;
      });
      if (stale) this._refresh();
    };
  }

  get db() { return this.fb.db; }
  get fs() { return this.fb.fsSdk; }
  _ref(id) { return this.fs.doc(this.db, 'battles', id); }
  _now() { return this.controller.serverNow(); }

  // ---------------------------------------------------------------- lifecycle

  start(uid) {
    this.stop();
    this.uid = uid;
    this._seen = null;
    this.listen((list) => this.controller._onBattles(list));
    this._tick = setInterval(() => this._auto(), TICK_MS);
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this._onPageHide);
      window.addEventListener('pageshow', this._onPageShow);
      window.addEventListener('storage', this._onStorage);
    }
  }

  stop() {
    if (this._unsub) this._unsub();
    this._unsub = null;
    clearInterval(this._tick);
    this._tick = null;
    this.uid = null;
    this.raw.clear();
    this._live.clear();
    this._history.clear();
    this.list = [];
    this._seen = null;
    this._busy.clear();
    this._lastTry.clear();
    this._dueSince.clear();
    clearTimeout(this._recheck);
    clearTimeout(this._edge);
    this._edge = null;
    this._raidingHere.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this._onPageHide);
      window.removeEventListener('pageshow', this._onPageShow);
      window.removeEventListener('storage', this._onStorage);
    }
  }

  /**
   * Follow my battles (players array-contains me): every battle created in the last 8 days (no
   * limit - lock, resolve, settle and the Active tab run on these) plus the newest 30 for
   * History. cb(listOfViews) now and on every change (including phase changes that happen by
   * the clock, via the 5 s tick).
   */
  listen(cb) {
    this._listeners.add(cb);
    if (!this._unsub && this.uid) {
      const { collection, query, where, orderBy, limit, onSnapshot, Timestamp } = this.fs;
      const uid = this.uid;
      const mine = where('players', 'array-contains', uid);
      const since = Timestamp.fromMillis(this._now() - LIVE_WINDOW_MS);
      // The first list (the baseline for "new challenge" toasts) waits for both halves.
      const loaded = new Set();
      const follow = (key, q, into) => onSnapshot(q, (snap) => {
        if (uid !== this.uid) return;
        into.clear();
        snap.forEach(d => into.set(d.id, { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
        loaded.add(key);
        this.raw = new Map([...this._history, ...this._live]);
        this.controller._clearError?.('battles');   // loading works (again): drop a stale banner
        if (loaded.size < 2) return;
        this._refresh();
        this._auto();
      }, (err) => {
        loaded.add(key);
        console.warn('[battles] listener failed', err);
        this.controller._error('battles', friendlyError(err, 'Could not load your battles.'));
      });
      const battles = collection(this.db, 'battles');
      const unsubs = [
        follow('live', query(battles, mine, where('createdAt', '>=', since), orderBy('createdAt', 'desc')), this._live),
        follow('history', query(battles, mine, orderBy('createdAt', 'desc'), limit(HISTORY_LIMIT)), this._history)
      ];
      this._unsub = () => unsubs.forEach(u => u());
    }
    return () => this._listeners.delete(cb);
  }

  /** Recompute phases/countdowns, emit the list and any notifications. */
  _refresh() {
    const now = this._now();
    this.list = [...this.raw.values()]
      .sort((a, b) => (ms(b.createdAt) || 0) - (ms(a.createdAt) || 0))
      .map(b => this.view(b, now));
    this._notify(this.list);
    for (const cb of this._listeners) {
      try { cb(this.list); } catch (e) { console.error('[battles] listener failed', e); }
    }
    this._scheduleEdge(now);
  }

  /**
   * The views are a function of the clock too (canAttack drops at the attack cutoff, a phase ends,
   * a raid's clock runs out): recompute them just after the next such moment instead of waiting
   * for a Firestore change that may never come. One timer, re-armed by every refresh.
   */
  _scheduleEdge(now) {
    clearTimeout(this._edge);
    this._edge = null;
    if (!this.uid) return;
    let next = null;
    for (const b of this.raw.values()) {
      const t = nextChangeAt(b, now);
      if (t !== null && (next === null || t < next)) next = t;
    }
    let delay = next === null ? null : next - now;
    // A raid another tab of this browser runs turns 'lost' when that tab's beat stops.
    const raids = this.list.some(v => v.myRaid === 'tab') ? readRaids() : {};
    for (const v of this.list) {
      if (v.myRaid !== 'tab' || !raids[v.id]) continue;
      const d = Number(raids[v.id].beat) + RAID_STALE_MS - Date.now();
      if (delay === null || d < delay) delay = d;
    }
    if (delay === null) return;
    // At most a day ahead: a far-off time must not overflow setTimeout (which then fires at once).
    const wait = Math.min(Math.max(0, delay), 86400 * 1000) + EDGE_MARGIN_MS;
    this._edge = setTimeout(() => {
      this._edge = null;
      if (!this.uid) return;
      this._refresh();
      this._auto();
    }, wait);
  }

  /**
   * A battle as the UI needs it: plain numbers (ms) instead of Timestamps, my/their side, the
   * phase at `now`, what I can do, and the next deadline to count down to.
   */
  view(b, now = this._now()) {
    const me = this.uid;
    const players = Array.isArray(b.players) ? b.players : [b.challenger, b.opponent];
    const them = players[0] === me ? players[1] : players[0];
    const phase = battlePhase(b, now);
    const startAtMs = ms(b.startAt);
    const fightEndsAtMs = ms(b.fightEndsAt);
    const respondByMs = respondDeadline(b);
    const resultGraceEndsAtMs = fightEndsAtMs !== null ? fightEndsAtMs + BATTLE.RESULT_GRACE_SECONDS * 1000 : null;
    const results = b.results || {};
    const snapshots = b.snapshots || {};
    const attempts = b.attempts || {};
    const ready = b.ready || {};
    const iAmChallenger = b.challenger === me;
    // Results as plain data (finishedAt as ms), the rest of the view has no Timestamps either.
    const plain = (r) => (r ? {
      stars: r.stars, percentage: r.percentage, destroyed: r.destroyed, total: r.total, outcome: r.outcome,
      durationSec: r.durationSec, loot: r.loot || { cash: 0, iron: 0, wood: 0 }, finishedAtMs: ms(r.finishedAt)
    } : null);
    const myResult = plain(results[me]);
    const theirResult = plain(results[them]);
    const bothLocked = !!(snapshots[me] && snapshots[them]);
    const resultPending = !!attempts[me] && !myResult && !!readQueue()[b.id];
    const raidOverAt = (u) => { const t = raidEndsBy(b, u); return t !== null && now >= t; };
    // Where my started raid is while it owes a result and nothing is queued: 'here' (this page
    // runs it), 'tab' (another tab of this browser does - its beat is fresh), 'lost' (this browser
    // ran it and that page is gone: reloaded, closed or crashed - it counts as no raid), 'away' (no
    // trace in this browser: another device, while its clock can still run), 'over' (no trace here
    // and its clock has run out).
    let myRaid = null;
    if (attempts[me] && !myResult && !resultPending) {
      const mark = this._raidingHere.has(b.id) ? null : readRaids()[b.id];
      if (this._raidingHere.has(b.id)) myRaid = 'here';
      else if (mark && mark.uid === me) myRaid = !mark.dead && Date.now() - Number(mark.beat) < RAID_STALE_MS ? 'tab' : 'lost';
      else myRaid = raidOverAt(me) ? 'over' : 'away';
    }
    const theirRaidOver = !!attempts[them] && !theirResult && raidOverAt(them);
    // What settle really moved (a loss at 0 trophies moves 0); until then the nominal step.
    const applied = b.trophyChange && Number.isInteger(b.trophyChange[me]) ? b.trophyChange[me] : null;
    // The last seconds of the fight window are too short to scout and pick a gate: no new raid.
    const attackClosed = phase === 'fight' && fightEndsAtMs !== null && fightEndsAtMs - now < BATTLE.ATTACK_CUTOFF_SECONDS * 1000;
    const v = {
      id: b.id,
      mode: b.mode,
      theme: b.theme,
      status: b.status,
      phase,
      message: b.message || '',
      me,
      opponentUid: them,
      opponentName: (b.names && b.names[them]) || (snapshots[them] && snapshots[them].name) || 'Opponent',
      myName: (b.names && b.names[me]) || '',
      opponentTownHall: (b.townHalls && b.townHalls[them]) || (snapshots[them] && snapshots[them].townHall) || null,
      myTownHall: (b.townHalls && b.townHalls[me]) || null,
      iAmChallenger,
      designSeconds: b.designSeconds ?? null,
      createdAtMs: ms(b.createdAt),
      acceptedAtMs: ms(b.acceptedAt),
      respondByMs,
      startAtMs,
      fightEndsAtMs,
      resultGraceEndsAtMs,
      iAmReady: !!ready[me],
      theyAreReady: !!ready[them],
      myCityLocked: !!snapshots[me],
      theirCityLocked: !!snapshots[them],
      bothLocked,
      iAttempted: !!attempts[me],
      theyAttempted: !!attempts[them],
      myAttemptStartedAtMs: attempts[me] ? ms(attempts[me].startedAt) : null,
      theirAttemptStartedAtMs: attempts[them] ? ms(attempts[them].startedAt) : null,
      myRaid,
      // Their raid's clock has run out with no result: interrupted (or its result waits on their device).
      theirRaidOver,
      // Every started raid without a result is past its clock: only a queued result can still come.
      raidsOver: Object.keys(attempts).every(u => !!results[u] || raidOverAt(u)),
      myResult,
      theirResult,
      winner: b.winner || null,
      iWon: b.winner ? b.winner === me : null,
      isDraw: b.winner === 'draw',
      isVoid: b.winner === 'void',
      trophyDelta: b.status === 'finished' ? (applied !== null ? applied : trophyDelta(b, me)) : null,
      trophyDeltaNominal: b.status === 'finished' ? trophyDelta(b, me) : null,
      settled: !!(b.settled && b.settled[me]),
      canAccept: phase === 'pending' && !iAmChallenger,
      canDecline: phase === 'pending' && !iAmChallenger,
      canCancel: phase === 'pending' && iAmChallenger,
      canReady: phase === 'design' && b.mode === 'instant' && !ready[me],
      canDesign: phase === 'design',
      canAttack: phase === 'fight' && !attempts[me] && !myResult && !attackClosed,
      attackClosed: attackClosed && !attempts[me] && !myResult,
      resultPending,
      awaitingResult: awaitingResult(b),
      countdownTo: null,
      countdownLabel: ''
    };
    if (phase === 'pending') { v.countdownTo = respondByMs; v.countdownLabel = iAmChallenger ? 'Expires in' : 'Answer within'; }
    else if (phase === 'design') { v.countdownTo = startAtMs; v.countdownLabel = 'Cities lock in'; }
    else if (phase === 'fight') { v.countdownTo = fightEndsAtMs; v.countdownLabel = 'Fight ends in'; }
    else if (phase === 'resolving' && b.status === 'accepted' && v.awaitingResult) { v.countdownTo = resultGraceEndsAtMs; v.countdownLabel = 'Results close in'; }
    v.needsAction = v.canAccept || v.canAttack || (v.canReady && phase === 'design');
    return v;
  }

  /** The current view of one battle (from the live list), or null. */
  get(id) {
    const b = this.raw.get(id);
    return b ? this.view(b) : null;
  }

  // ---------------------------------------------------------------- notifications

  _notify(list) {
    const first = this._seen === null;
    const seen = new Map();
    for (const v of list) {
      const prev = this._seen && this._seen.get(v.id);
      // "Live" = the raid can really begin: fight phase AND both cities locked (at startAt only my
      // own city locks at once; an offline opponent's is locked by this game LOCK_GRACE later).
      const live = v.phase === 'fight' && v.bothLocked;
      seen.set(v.id, { phase: v.phase, status: v.status, theirResult: !!v.theirResult, winner: v.winner, settled: v.settled, live });
      if (first) continue;
      const emit = (type, message) => this.controller._battleEvent({ type, battle: v, message });
      if (!prev) {
        if (!v.iAmChallenger && v.phase === 'pending') {
          emit('incoming', `⚔️ ${v.opponentName} challenged you to a${v.mode === 'scheduled' ? ' scheduled' : 'n instant'} battle!`);
        }
        continue;
      }
      if (prev.status === 'pending' && v.status === 'accepted' && v.iAmChallenger) {
        emit('accepted', `✅ ${v.opponentName} accepted your challenge.`);
      }
      if (prev.status === 'pending' && v.status === 'declined' && v.iAmChallenger) {
        emit('declined', `✋ ${v.opponentName} declined your challenge.`);
      }
      if (prev.status === 'pending' && v.status === 'cancelled' && !v.iAmChallenger) {
        emit('cancelled', `${v.opponentName} withdrew the challenge.`);
      }
      if (!prev.live && live) {
        emit('started', `🔒 Battle vs ${v.opponentName} is live: cities are locked - attack from BATTLES!`);
      }
      if (!prev.theirResult && v.theirResult) {
        emit('opponent-result', `🏁 ${v.opponentName} attacked your city: ${v.theirResult.stars}★ ${Math.round(v.theirResult.percentage)}%.`);
      }
      // Announced once MY side is settled, with the trophies it really moved (a loss at 0
      // trophies takes nothing, and a void battle moves nothing).
      if (!prev.settled && v.settled && v.status === 'finished') {
        const d = v.trophyDelta || 0;
        if (v.isVoid) {
          emit('finished', `Battle vs ${v.opponentName}: void - nobody attacked, no trophies.`);
        } else {
          const verdict = v.isDraw ? 'Draw' : (v.iWon ? 'Victory' : 'Defeat');
          const moved = d === 0 && (v.trophyDeltaNominal || 0) < 0 ? 'no trophies to lose' : `${d >= 0 ? '+' : ''}${d} trophies`;
          emit('finished', `🏆 Battle vs ${v.opponentName}: ${verdict} (${moved}).`);
        }
      }
    }
    this._seen = seen;
  }

  // ---------------------------------------------------------------- automatic behaviour

  /** Run `fn` for (kind, id) at most once at a time and not more than every `minGapMs`. */
  _once(kind, id, minGapMs, fn) {
    const key = kind + ':' + id;
    if (this._busy.has(key)) return this._busy.get(key);
    const last = this._lastTry.get(key) || 0;
    if (Date.now() - last < minGapMs) return null;
    this._lastTry.set(key, Date.now());
    const p = Promise.resolve().then(fn).catch((e) => {
      // Denials here are usually timing (a clock a little ahead of the server's): the next
      // tick tries again. Anything else is worth a console line, never a crash.
      if (!e || (e.code !== 'permission-denied' && e.code !== 'aborted')) console.warn(`[battles] ${kind} ${id} failed`, e);
    }).finally(() => this._busy.delete(key));
    this._busy.set(key, p);
    return p;
  }

  _auto() {
    if (!this.uid) return;
    this._raidBeat();
    const now = this._now();
    let phaseChanged = false;
    const due = new Set();
    for (const b of this.raw.values()) {
      const phase = battlePhase(b, now);
      const players = b.players || [];
      // Both clients see the same moment arrive together; if both wrote at once, one transaction
      // would fail its precondition and retry (harmless, but a failed request in every console).
      // So the challenger goes first and the opponent only steps in if it is still undone ~3 s
      // later (the challenger may be offline).
      const turn = (kind, fn) => {
        const key = kind + ':' + b.id;
        due.add(key);
        if (!this._dueSince.has(key)) this._dueSince.set(key, Date.now());
        if (b.challenger !== this.uid && Date.now() - this._dueSince.get(key) < OPPONENT_DELAY_MS) {
          clearTimeout(this._recheck);
          this._recheck = setTimeout(() => this._auto(), OPPONENT_DELAY_MS + 100);
          return;
        }
        this._once(kind, b.id, 4000, fn);
      };
      // My city locks as the fight starts; the opponent's only if their own game has not locked
      // it LOCK_GRACE later (they may be offline) - never a copy of a city they are still saving.
      if (b.status === 'accepted' && phase === 'fight' && players.some(u => this._lockDue(b, u, now))) {
        turn('lock', () => this.ensureSnapshots(b.id));
      }
      if (b.status === 'accepted' && resolveDue(b, now)) {
        turn('resolve', () => this.resolveIfDue(b.id));
      }
      if (b.status === 'finished' && !(b.settled && b.settled[this.uid])) {
        turn('settle', () => this.settle(b.id));
      }
      const prev = this._seen && this._seen.get(b.id);
      if (prev && prev.phase !== phase) phaseChanged = true;
    }
    for (const key of [...this._dueSince.keys()]) if (!due.has(key)) this._dueSince.delete(key);
    const queue = readQueue();
    for (const [id, item] of Object.entries(queue)) {
      if (item.uid !== this.uid) continue;
      this._once('result', id, 10000, async () => {
        const r = await this.submitResult(id, item.stats, { fromQueue: true });
        if (r.ok) this.controller._onResultDelivered(id, r);
      });
    }
    if (phaseChanged) this._refresh();
  }

  // ---------------------------------------------------------------- reads

  /**
   * The battle doc. `server: true` reads past the local cache: offline, getDoc answers from the
   * cache, and the cache already shows our own writes that have not reached the server yet
   * (latency compensation) - a result read back that way is not a delivered result.
   */
  async _fresh(id, { server = false } = {}) {
    const get = server ? this.fs.getDocFromServer : this.fs.getDoc;
    const snap = await get(this._ref(id));
    if (!snap.exists()) throw codedError('not-found', 'That battle no longer exists.');
    return { id: snap.id, ...snap.data() };
  }

  _idOf(battleOrId) {
    return typeof battleOrId === 'string' ? battleOrId : (battleOrId && battleOrId.id);
  }

  _requireMe() {
    if (!this.uid) throw codedError('unauthenticated');
    const profile = this.controller.profile;
    if (!profile) throw codedError('no-profile');
    return profile;
  }

  /**
   * My commitments: accepted battles in design or fight, plus the challenges I SENT that are
   * still pending. A challenge sent TO me is only an offer - it never blocks accepting it (or
   * another one), or sending my own.
   */
  _openCount(excludeId = null) {
    const now = this._now();
    let n = 0;
    for (const b of this.raw.values()) {
      if (b.id === excludeId) continue;
      const phase = battlePhase(b, now);
      if (phase === 'design' || phase === 'fight' || (phase === 'pending' && b.challenger === this.uid)) n++;
    }
    return n;
  }

  /** Is `u`'s city due to be locked by THIS client (own city at startAt, the other's after the grace)? */
  _lockDue(b, u, now = this._now()) {
    if (!u || (b.snapshots && b.snapshots[u])) return false;
    if (u === this.uid) return true;
    const start = ms(b.startAt);
    return start !== null && now >= start + BATTLE.LOCK_GRACE_SECONDS * 1000;
  }

  /** Beat for every raid this page runs (RAIDS_KEY), so other tabs know it is alive. */
  _raidBeat() {
    if (this._raidingHere.size) this._raidMark([...this._raidingHere]);
  }

  /** Write (beat), mark dead or remove this browser's raid entries for `ids`. */
  _raidMark(ids, { dead = false, remove = false } = {}) {
    if (!ids.length) return;
    const r = readRaids();
    for (const id of ids) {
      if (remove) delete r[id];
      else if (dead) { if (r[id]) r[id].dead = true; }
      else r[id] = { uid: this.uid, beat: Date.now() };
    }
    writeRaids(r);
  }

  /** How many open battles I have (see _openCount) - the challenge form shows the cap with it. */
  openCount() {
    return this._openCount();
  }

  // ---------------------------------------------------------------- challenge lifecycle

  /**
   * Send a challenge. { opponentUid, mode:'instant'|'scheduled', designSeconds (instant),
   * startAtMs (scheduled), theme?:'day'|'night' (default: night for a scheduled battle at night
   * hours, else day), message? }. Resolves to the new battle id.
   */
  async createChallenge({ opponentUid, mode = 'instant', designSeconds, startAtMs, theme, message } = {}) {
    const profile = this._requireMe();
    const me = this.uid;
    const now = this._now();
    const input = {
      opponentUid, mode, challengerUid: me, theme: theme || undefined,
      designSeconds: mode === 'instant' ? (designSeconds ?? BATTLE.INSTANT_DEFAULT_DESIGN) : undefined,
      startAtMs: mode === 'scheduled' ? startAtMs : undefined,
      message: message ? String(message).trim() : undefined
    };
    const check = validateChallenge(input, now);
    if (!check.ok) throw codedError('bad-challenge', check.errors.join(' '));
    if (this._openCount() >= BATTLE.MAX_OPEN_BATTLES) {
      throw codedError('too-many', `You already have ${BATTLE.MAX_OPEN_BATTLES} open battles. Finish or cancel one first.`);
    }
    const { doc, collection, getDoc, writeBatch, serverTimestamp, Timestamp } = this.fs;
    const myRef = doc(this.db, 'players', me);
    let opp, mine;
    try {
      [opp, mine] = await Promise.all([getDoc(doc(this.db, 'players', opponentUid)), getDoc(myRef)]);
    } catch (e) {
      throw friendlyError(e);
    }
    if (!opp.exists()) throw codedError('not-found', 'That player does not exist.');
    // The rules allow one challenge per CHALLENGE_COOLDOWN (players.lastChallengeAt).
    const last = mine.exists() ? ms(mine.data().lastChallengeAt) : null;
    const wait = last === null ? 0 : Math.ceil((last + BATTLE.CHALLENGE_COOLDOWN_SECONDS * 1000 - now) / 1000);
    if (wait > 0) throw codedError('too-soon', `You just sent a challenge. Wait ${wait} s before sending another.`);
    const o = opp.data();
    const myTH = this.controller.townHall();
    const data = {
      mode,
      theme: theme || (mode === 'scheduled' && isNightAt(startAtMs) ? 'night' : 'day'),
      status: 'pending',
      challenger: me,
      opponent: opponentUid,
      players: [me, opponentUid],
      names: { [me]: profile.name, [opponentUid]: String(o.name || 'Opponent').slice(0, 40) },
      townHalls: { [me]: myTH, [opponentUid]: Math.max(1, Math.min(12, o.townHall | 0 || 1)) },
      createdAt: serverTimestamp(),
      ready: {}, snapshots: {}, attempts: {}, results: {}, settled: {}
    };
    if (input.message) data.message = input.message.slice(0, BATTLE.MESSAGE_MAX);
    if (mode === 'instant') {
      data.designSeconds = Number(input.designSeconds);
    } else {
      const start = Math.round(Number(startAtMs));
      data.startAt = Timestamp.fromMillis(start);
      data.fightEndsAt = Timestamp.fromMillis(start + BATTLE.SCHEDULED_FIGHT_SECONDS * 1000);
    }
    const ref = doc(collection(this.db, 'battles'));
    try {
      // One batch: the rules check the challenge against the lastChallengeAt it stamps, and the
      // stamp names this battle (lastChallengeId), so one stamp pays for exactly one challenge.
      const batch = writeBatch(this.db);
      batch.set(ref, data);
      batch.update(myRef, { lastChallengeAt: serverTimestamp(), lastChallengeId: ref.id });
      await batch.commit();
    } catch (e) {
      throw friendlyError(e, 'Could not send the challenge.');
    }
    return ref.id;
  }

  async accept(battleOrId) {
    const profile = this._requireMe();
    const id = this._idOf(battleOrId);
    const me = this.uid;
    const { runTransaction, serverTimestamp, Timestamp } = this.fs;
    if (this._openCount(id) >= BATTLE.MAX_OPEN_BATTLES) {
      throw codedError('too-many', `You already have ${BATTLE.MAX_OPEN_BATTLES} open battles. Finish one first.`);
    }
    try {
      await runTransaction(this.db, async (tx) => {
        const snap = await tx.get(this._ref(id));
        if (!snap.exists()) throw codedError('not-found', 'That battle no longer exists.');
        const b = snap.data();
        const phase = battlePhase(b, this._now());
        if (b.opponent !== me) throw codedError('failed-precondition', 'Only the challenged player can accept.');
        if (phase !== 'pending') throw codedError('failed-precondition', phase === 'expired' ? 'This challenge has expired.' : `This challenge is already ${phase}.`);
        const upd = {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          [`names.${me}`]: profile.name,
          [`townHalls.${me}`]: this.controller.townHall()
        };
        if (b.mode === 'instant') {
          // The design window starts now (server time): startAt = now + designSeconds.
          const start = Math.round(this._now() + (Number(b.designSeconds) || 0) * 1000);
          upd.startAt = Timestamp.fromMillis(start);
          upd.fightEndsAt = Timestamp.fromMillis(start + BATTLE.INSTANT_FIGHT_SECONDS * 1000);
        }
        tx.update(this._ref(id), upd);
      });
    } catch (e) {
      throw friendlyError(e, 'Could not accept the challenge.');
    }
  }

  async decline(battleOrId) {
    return this._setStatus(battleOrId, 'declined', 'opponent', 'Only the challenged player can decline.');
  }

  async cancel(battleOrId) {
    return this._setStatus(battleOrId, 'cancelled', 'challenger', 'Only the challenger can cancel.');
  }

  async _setStatus(battleOrId, status, who, notYours) {
    this._requireMe();
    const id = this._idOf(battleOrId);
    const b = this.raw.get(id) || await this._fresh(id).catch((e) => { throw friendlyError(e); });
    if (b[who] !== this.uid) throw codedError('failed-precondition', notYours);
    if (battlePhase(b, this._now()) !== 'pending') throw codedError('failed-precondition', 'This challenge is no longer pending.');
    try {
      await this.fs.updateDoc(this._ref(id), { status });
    } catch (e) {
      throw friendlyError(e);
    }
  }

  /**
   * Instant battles: "I'm done designing". When the other player is ready too, the same write
   * pulls the start forward to now, so both cities lock and the fight begins.
   */
  async setReady(battleOrId) {
    this._requireMe();
    const id = this._idOf(battleOrId);
    const me = this.uid;
    const { runTransaction, Timestamp } = this.fs;
    // What I designed is what gets locked: send a waiting city push first.
    if (this.controller.cloudSync) await this.controller.cloudSync.flush();
    let startsNow = false;
    try {
      await runTransaction(this.db, async (tx) => {
        const snap = await tx.get(this._ref(id));
        if (!snap.exists()) throw codedError('not-found', 'That battle no longer exists.');
        const b = snap.data();
        if (b.mode !== 'instant') throw codedError('failed-precondition', 'Only instant battles have a Ready button.');
        if (battlePhase(b, this._now()) !== 'design') throw codedError('failed-precondition', 'The design phase is over.');
        if (!b.players.includes(me)) throw codedError('permission-denied');
        const other = b.players[0] === me ? b.players[1] : b.players[0];
        const upd = { [`ready.${me}`]: true };
        if (b.ready && b.ready[other]) {
          const start = Math.min(Math.round(this._now()), ms(b.startAt));
          upd.startAt = Timestamp.fromMillis(start);
          upd.fightEndsAt = Timestamp.fromMillis(start + BATTLE.INSTANT_FIGHT_SECONDS * 1000);
          startsNow = true;
        }
        tx.update(this._ref(id), upd);
      });
    } catch (e) {
      throw friendlyError(e, 'Could not mark you ready.');
    }
    if (startsNow) setTimeout(() => this._auto(), 300);
    return { startsNow };
  }

  // ---------------------------------------------------------------- lock, attack, result

  /**
   * Lock the cities of a battle whose start time has passed: copy each due player's live
   * cities/{uid} (layout, townHall, rev) into snapshots.<uid> in one transaction (the rules
   * demand byte equality with the city doc, which is the integrity proof). My OWN city locks at
   * once, after my waiting push is flushed, so the lock holds what I designed. The opponent's
   * only LOCK_GRACE after startAt, if their own game has not locked it by then: at startAt
   * their last edits may still be on their device, and a copy of their cloud city would miss
   * them (the rules refuse an earlier lock of the other player's city too).
   */
  async ensureSnapshots(battleOrId) {
    if (!this.uid) return null;
    const id = this._idOf(battleOrId);
    const me = this.uid;
    const known = this.raw.get(id) || (typeof battleOrId === 'object' ? battleOrId : null);
    if (known && (known.status !== 'accepted' || this._now() < ms(known.startAt))) return known;
    if (known && known.players && !known.players.some(u => this._lockDue(known, u))) return known;
    if (known && known.players && known.players.includes(me) && this._lockDue(known, me) &&
      this.controller.cloudSync) {
      await this.controller.cloudSync.flush();
    }
    const { runTransaction, doc, serverTimestamp } = this.fs;
    return runTransaction(this.db, async (tx) => {
      const snap = await tx.get(this._ref(id));
      if (!snap.exists()) return null;
      const b = snap.data();
      if (b.status !== 'accepted' || this._now() < ms(b.startAt)) return { id, ...b };
      const need = (b.players || []).filter(u => this._lockDue(b, u));
      if (!need.length) return { id, ...b };
      const cities = await Promise.all(need.map(u => tx.get(doc(this.db, 'cities', u))));
      const upd = {};
      need.forEach((u, i) => {
        const c = cities[i];
        if (!c.exists()) return;          // never linked: nothing to lock (their side stays empty)
        const d = c.data();
        // Same fallback chain as the MCP server's lock (city name, battle name, 'Player').
        const name = String(d.name || (b.names && b.names[u]) || 'Player').slice(0, 40) || 'Player';
        upd[`snapshots.${u}`] = { layout: d.layout, townHall: d.townHall, name, rev: d.rev, lockedAt: serverTimestamp() };
      });
      if (Object.keys(upd).length) tx.update(this._ref(id), upd);
      return { id, ...b };
    });
  }

  /**
   * Get ready to raid: make sure both cities are locked, then hand back the opponent's locked
   * city. Does NOT burn the attempt - startAttempt() does that at the breach (spec 8).
   * Resolves to { battle (view), snapshot, opponentUid, opponentName, theme }.
   */
  async beginAttempt(battleOrId) {
    this._requireMe();
    const id = this._idOf(battleOrId);
    const me = this.uid;
    const lock = async () => {
      try {
        await this.ensureSnapshots(id);
      } catch (e) {
        if (!e || e.code !== 'permission-denied') throw friendlyError(e);
      }
    };
    const fresh = () => this._fresh(id).catch((e) => { throw friendlyError(e); });
    const check = (b) => {
      const phase = battlePhase(b, this._now());
      if (phase === 'design' || phase === 'pending') throw codedError('failed-precondition', 'The fight has not started yet.');
      if (phase !== 'fight') throw codedError('failed-precondition', 'The fight window of this battle is over.');
      if (b.attempts && b.attempts[me]) throw codedError('failed-precondition', 'You already used your attack in this battle.');
      const left = ms(b.fightEndsAt) - this._now();
      if (left < BATTLE.ATTACK_CUTOFF_SECONDS * 1000) {
        throw codedError('failed-precondition', `Too late: the fight window closes in ${Math.max(0, Math.ceil(left / 1000))} s - not enough time to scout and pick a gate.`);
      }
    };
    await lock();
    let b = await fresh();
    check(b);
    const them = b.players[0] === me ? b.players[1] : b.players[0];
    // Their own game locks their city (with their last edits) right after the start; give it
    // until LOCK_GRACE, then lock their cloud city ourselves (they may be offline).
    const graceEnd = ms(b.startAt) + BATTLE.LOCK_GRACE_SECONDS * 1000;
    while (!(b.snapshots && b.snapshots[them]) && this._now() < graceEnd && this.uid === me) {
      await new Promise(r => setTimeout(r, Math.max(100, Math.min(1000, graceEnd - this._now()))));
      const live = this.raw.get(id);
      b = live && live.snapshots && live.snapshots[them] ? { ...live } : b;
    }
    if (!(b.snapshots && b.snapshots[them])) {
      await lock();
      b = await fresh();
      check(b);
    }
    const snapshot = b.snapshots && b.snapshots[them];
    if (!snapshot) throw codedError('failed-precondition', 'Your opponent\'s city is not locked yet. Try again in a few seconds.');
    const view = this.view(b);
    return { battle: view, snapshot, opponentUid: them, opponentName: view.opponentName, theme: b.theme || 'day' };
  }

  /**
   * The breach: burn this player's one attempt (attempts.<me>.startedAt = server time). From here
   * until its result is queued this page runs the raid, and says so to its other tabs (beat).
   */
  async startAttempt(battleOrId) {
    this._requireMe();
    const id = this._idOf(battleOrId);
    this._raidingHere.add(id);
    this._raidBeat();
    return this._writeAttempt(id);
  }

  async _writeAttempt(id) {
    const me = this.uid;
    const { updateDoc, serverTimestamp } = this.fs;
    try {
      await updateDoc(this._ref(id), { [`attempts.${me}`]: { startedAt: serverTimestamp() } });
      return { ok: true };
    } catch (e) {
      // Idempotent: a second call after the first landed is fine.
      const b = await this._fresh(id).catch(() => null);
      if (b && b.attempts && b.attempts[me]) return { ok: true, already: true };
      throw friendlyError(e, 'Could not start your attack.');
    }
  }

  /**
   * Send my raid result (idempotent). It is queued in localStorage first, so a closed tab or a
   * dropped network still delivers it later (retried every tick until the rules' grace ends).
   * Resolves to { ok:true } | { ok:true, already:true } | { ok:false, queued:true, error }.
   */
  async submitResult(battleOrId, stats, { fromQueue = false } = {}) {
    const id = this._idOf(battleOrId);
    const me = this.uid;
    if (!me) return { ok: false, queued: false, error: codedError('unauthenticated') };
    const result = sanitizeResult(stats);
    const q = readQueue();
    if (!fromQueue) {
      q[id] = { uid: me, stats: result, at: Date.now() };
      writeQueue(q);
      // The raid is over; the queue entry is its record from now on.
      this._raidingHere.delete(id);
      this._raidMark([id], { remove: true });
    }
    const drop = () => { const q2 = readQueue(); delete q2[id]; writeQueue(q2); };
    try {
      // From the server only: offline, the cache would show this very result (still unsent) and
      // the queue entry - the only copy that survives a closed tab - would be dropped as "sent".
      const b = await this._fresh(id, { server: true });
      if (b.results && b.results[me]) { drop(); return { ok: true, already: true }; }
      const graceEnd = ms(b.fightEndsAt) + BATTLE.RESULT_GRACE_SECONDS * 1000;
      if (b.status !== 'accepted' || this._now() > graceEnd + BATTLE.TIME_SLACK_SECONDS * 1000) {
        drop();
        return { ok: false, queued: false, closed: true, error: codedError('failed-precondition', 'The battle closed before the result could be sent.') };
      }
      // No attempt on the server and the fight window is over: the breach came too late (or
      // its write never got through in time), and a result without an attempt is refused.
      if (!(b.attempts && b.attempts[me]) && this._now() >= ms(b.fightEndsAt)) {
        drop();
        return { ok: false, queued: false, closed: true, error: codedError('failed-precondition', 'Your raid started after the fight window closed - it does not count.') };
      }
      if (!(b.attempts && b.attempts[me])) await this._writeAttempt(id);
      await this.fs.updateDoc(this._ref(id), { [`results.${me}`]: { ...result, finishedAt: this.fs.serverTimestamp() } });
      drop();
      return { ok: true };
    } catch (e) {
      const err = friendlyError(e, 'Could not send your result. It will be retried.');
      return { ok: false, queued: true, error: err };
    }
  }

  /**
   * Write the winner once it is fixed (battleRules.resolveDue): both results in, or the fight
   * window over with no raid still owing a result, or the result grace period over. Nobody
   * with a result -> 'void'.
   */
  async resolveIfDue(battleOrId) {
    const id = this._idOf(battleOrId);
    const { runTransaction, serverTimestamp } = this.fs;
    return runTransaction(this.db, async (tx) => {
      const snap = await tx.get(this._ref(id));
      if (!snap.exists()) return null;
      const b = snap.data();
      if (!resolveDue(b, this._now())) return null;
      const winner = decideWinner(b);
      tx.update(this._ref(id), { status: 'finished', winner, resolvedAt: serverTimestamp() });
      return winner;
    });
  }

  /**
   * My side of a finished battle, one transaction, exactly once: trophies (+30 win, +5 draw,
   * -20 loss floored at 0), one W/L/D tick and lastSettled = this battle on players/{me}, and
   * settled.<me> = true + trophyChange.<me> = what the trophies really moved on the battle (the
   * rules tie the two writes together). A void battle (nobody raided) moves nothing: only the
   * battle's settled flag and a trophyChange of 0.
   */
  async settle(battleOrId) {
    const id = this._idOf(battleOrId);
    const me = this.uid;
    if (!me) return null;
    const { runTransaction, doc } = this.fs;
    return runTransaction(this.db, async (tx) => {
      const bref = this._ref(id);
      const pref = doc(this.db, 'players', me);
      const [bs, ps] = await Promise.all([tx.get(bref), tx.get(pref)]);
      if (!bs.exists() || !ps.exists()) return null;
      const b = bs.data();
      if (b.status !== 'finished' || own(b.settled, me)) return null;
      const p = ps.data();
      const winner = b.winner || decideWinner(b);
      const field = recordFieldFor(winner, me);
      if (!field) {
        tx.update(bref, { [`settled.${me}`]: true, [`trophyChange.${me}`]: 0 });
        return { delta: 0, field: null };
      }
      const before = p.trophies | 0;
      const after = Math.max(0, before + trophyDelta(b, me));
      tx.update(pref, { trophies: after, [field]: (p[field] | 0) + 1, lastSettled: id });
      tx.update(bref, { [`settled.${me}`]: true, [`trophyChange.${me}`]: after - before });
      return { delta: after - before, field };
    });
  }

  // ---------------------------------------------------------------- players

  _playerRow(d) {
    const seen = ms(d.lastSeen);
    return {
      uid: d.uid,
      name: d.name,
      townHall: d.townHall | 0,
      trophies: d.trophies | 0,
      wins: d.wins | 0,
      losses: d.losses | 0,
      draws: d.draws | 0,
      lastSeenMs: seen,
      online: seen !== null && this._now() - seen < ONLINE_WINDOW_MS
    };
  }

  /** Players whose commander name starts with `prefix` (case-insensitive), me excluded. */
  async searchPlayers(prefix) {
    const p = String(prefix || '').trim().toLowerCase();
    if (!p) return this.recentPlayers();
    const { collection, query, where, orderBy, limit, getDocs } = this.fs;
    try {
      const snap = await getDocs(query(collection(this.db, 'players'),
        where('nameLower', '>=', p), where('nameLower', '<=', p + ''), orderBy('nameLower'), limit(12)));
      return snap.docs.map(d => this._playerRow(d.data())).filter(r => r.uid !== this.uid);
    } catch (e) {
      throw friendlyError(e, 'Could not search players.');
    }
  }

  /** Recent opponents first, then the players seen most recently. */
  async recentPlayers() {
    const { collection, query, orderBy, limit, getDocs, getDoc, doc } = this.fs;
    const rows = [];
    const have = new Set([this.uid]);
    try {
      const oppIds = [];
      for (const v of this.list) {
        if (v.opponentUid && !have.has(v.opponentUid) && !oppIds.includes(v.opponentUid)) oppIds.push(v.opponentUid);
      }
      const opps = await Promise.all(oppIds.slice(0, 8).map(u => getDoc(doc(this.db, 'players', u)).catch(() => null)));
      for (const s of opps) {
        if (s && s.exists()) { rows.push({ ...this._playerRow(s.data()), recentOpponent: true }); have.add(s.id); }
      }
      const snap = await getDocs(query(collection(this.db, 'players'), orderBy('lastSeen', 'desc'), limit(20)));
      for (const d of snap.docs) {
        if (!have.has(d.id)) { rows.push(this._playerRow(d.data())); have.add(d.id); }
      }
      return rows;
    } catch (e) {
      throw friendlyError(e, 'Could not load players.');
    }
  }
}
