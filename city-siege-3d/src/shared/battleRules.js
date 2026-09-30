/**
 * battleRules - the timing, phases and scoring of a PvP battle, as plain functions of a battle
 * document and a clock.
 *
 * Three places must agree on every one of these answers - the game (BattleService / the BATTLES
 * screen), the MCP server (get_battles, the snapshot-before-edit lock) and the Firestore rules
 * (which re-implement decideWinner and the windows) - so the numbers live here once. Pure: no
 * imports, no clock at module scope; every function takes the time it should judge by.
 *
 * Timestamps in a battle document may be a number (ms), a Date, a Firestore Timestamp (client
 * or admin SDK), or its JSON form {seconds, nanoseconds}; toMillis reads them all.
 */

export const BATTLE = Object.freeze({
  INSTANT_DESIGN_OPTIONS: Object.freeze([0, 120, 300, 600]),   // seconds of design time after acceptance
  INSTANT_DEFAULT_DESIGN: 300,
  INSTANT_RESPOND_SECONDS: 600,                  // an instant challenge expires after 10 min
  INSTANT_FIGHT_SECONDS: 900,                    // fight window after lock
  SCHEDULED_MIN_LEAD_SECONDS: 600,               // scheduled start at least 10 min out
  SCHEDULED_MAX_LEAD_SECONDS: 7 * 86400,
  SCHEDULED_FIGHT_SECONDS: 3600,
  SCHEDULED_ACCEPT_BEFORE_SECONDS: 60,           // must be accepted >= 1 min before start
  RESULT_GRACE_SECONDS: 660,                     // raid time limit + 60s
  RAID_TIME_LIMIT_SECONDS: 600,                  // battle raids end with outcome 'timeout'
  MAX_OPEN_BATTLES: 5,                           // design+fight + challenges SENT, per player (client-enforced)
  TROPHY_WIN: 30, TROPHY_LOSS: -20, TROPHY_DRAW: 5,
  NIGHT_START_HOUR: 19, NIGHT_END_HOUR: 6,
  MESSAGE_MAX: 140,
  TIME_SLACK_SECONDS: 120,                       // client clock tolerance accepted by the rules
  CHALLENGE_COOLDOWN_SECONDS: 10,                // one new challenge per player per 10 s (rules-enforced)
  LOCK_GRACE_SECONDS: 15,                        // each owner locks their own city; the other may only after this
  ATTACK_CUTOFF_SECONDS: 30                      // no new raid (recon) in the last 30 s of the fight window
});

export const BATTLE_MODES = Object.freeze(['instant', 'scheduled']);
export const BATTLE_THEMES = Object.freeze(['day', 'night']);
export const BATTLE_OUTCOMES = Object.freeze(['victory', 'retreat', 'busted', 'crash', 'timeout']);

/** ms since the epoch from any timestamp shape a battle document can hold, or null. */
export function toMillis(ts) {
  if (ts === null || ts === undefined) return null;
  if (typeof ts === 'number') return Number.isFinite(ts) ? ts : null;
  if (ts instanceof Date) {
    const t = ts.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof ts === 'object') {
    if (typeof ts.toMillis === 'function') {
      const t = Number(ts.toMillis());
      return Number.isFinite(t) ? t : null;
    }
    // {seconds, nanoseconds} (Timestamp JSON) or the admin SDK's serialised {_seconds, _nanoseconds}.
    const s = ts.seconds !== undefined ? ts.seconds : ts._seconds;
    const n = ts.nanoseconds !== undefined ? ts.nanoseconds : (ts._nanoseconds || 0);
    if (s !== undefined && Number.isFinite(Number(s))) {
      return Number(s) * 1000 + Math.floor((Number(n) || 0) / 1e6);
    }
  }
  return null;
}

/** The two participants, challenger first. */
function playersOf(b) {
  if (b && Array.isArray(b.players) && b.players.length === 2) return b.players;
  return [b && b.challenger, b && b.opponent];
}

/** Seconds a battle of `mode` stays in the fight phase once the cities lock. */
export function fightWindowSeconds(mode) {
  return mode === 'scheduled' ? BATTLE.SCHEDULED_FIGHT_SECONDS : BATTLE.INSTANT_FIGHT_SECONDS;
}

/**
 * When a pending challenge stops being answerable (ms): an instant one 10 minutes after it was
 * sent, a scheduled one a minute before its start. null while the time is not known yet (a
 * pending serverTimestamp in a local snapshot).
 */
export function respondDeadline(b) {
  if (!b) return null;
  if (b.mode === 'scheduled') {
    const start = toMillis(b.startAt);
    return start === null ? null : start - BATTLE.SCHEDULED_ACCEPT_BEFORE_SECONDS * 1000;
  }
  const created = toMillis(b.createdAt);
  return created === null ? null : created + BATTLE.INSTANT_RESPOND_SECONDS * 1000;
}

/** The end of the fight window (ms): fightEndsAt, else startAt + the mode's window. */
function fightEndsAtOf(b) {
  const end = toMillis(b.fightEndsAt);
  if (end !== null) return end;
  const start = toMillis(b.startAt);
  return start === null ? null : start + fightWindowSeconds(b.mode) * 1000;
}

function hasResult(b, uid) {
  return !!(b && b.results && uid && b.results[uid] && typeof b.results[uid] === 'object');
}

/**
 * Where a battle stands at `nowMs`:
 *   pending -> expired (nobody answered in time) | declined | cancelled
 *   accepted: design (before startAt) -> fight (startAt..fightEndsAt) -> resolving (after
 *             fightEndsAt, or as soon as both results are in, until someone writes the winner)
 *   finished.
 */
export function battlePhase(b, nowMs) {
  if (!b) return 'expired';
  const now = Number(nowMs);
  switch (b.status) {
    case 'pending': {
      const deadline = respondDeadline(b);
      return deadline !== null && now >= deadline ? 'expired' : 'pending';
    }
    case 'declined': return 'declined';
    case 'cancelled': return 'cancelled';
    case 'finished': return 'finished';
    case 'accepted': {
      const [a, o] = playersOf(b);
      if (hasResult(b, a) && hasResult(b, o)) return 'resolving';
      const start = toMillis(b.startAt);
      if (start === null || now < start) return 'design';
      const end = fightEndsAtOf(b);
      return end !== null && now >= end ? 'resolving' : 'fight';
    }
    default:
      return 'expired';   // an unknown status is inert: nothing can be done with it
  }
}

/**
 * A player's score: results[uid], or - if they never finished a raid - no stars, 0% and an
 * infinitely slow time, so any attempt beats no attempt only through the time tie-break.
 */
export function scoreOf(b, uid) {
  if (hasResult(b, uid)) {
    const r = b.results[uid];
    const d = Number(r.durationSec);
    return {
      ...r,
      stars: Number(r.stars) || 0,
      percentage: Number(r.percentage) || 0,
      durationSec: Number.isFinite(d) ? d : Infinity,
      missing: false
    };
  }
  return { stars: 0, percentage: 0, durationSec: Infinity, missing: true };
}

/**
 * The winner's uid, 'draw', or 'void': more stars, then higher destruction %, then the faster
 * raid. A battle where NEITHER player has a result is 'void' - nobody raided, so nobody gains
 * or loses anything (a no-show "draw" paid +5 to both and could be farmed).
 */
export function decideWinner(b) {
  const [a, o] = playersOf(b);
  const A = scoreOf(b, a);
  const O = scoreOf(b, o);
  if (A.missing && O.missing) return 'void';
  if (A.stars !== O.stars) return A.stars > O.stars ? a : o;
  if (A.percentage !== O.percentage) return A.percentage > O.percentage ? a : o;
  if (A.durationSec !== O.durationSec) return A.durationSec < O.durationSec ? a : o;
  return 'draw';
}

/**
 * Trophies `uid` gains (or loses) from a battle: the recorded winner, else decideWinner. This is
 * the nominal step; settle floors a loss at 0 trophies and records what it really applied in
 * `trophyChange[uid]`. A void battle moves nothing.
 */
export function trophyDelta(b, uid) {
  const [a, o] = playersOf(b);
  if (!uid || (uid !== a && uid !== o)) return 0;
  const winner = b && b.winner ? b.winner : decideWinner(b);
  if (winner === 'void') return 0;
  if (winner === 'draw') return BATTLE.TROPHY_DRAW;
  return winner === uid ? BATTLE.TROPHY_WIN : BATTLE.TROPHY_LOSS;
}

/** The W/L/D counter a finished battle ticks for `uid`: 'wins' | 'losses' | 'draws' | null (void). */
export function recordFieldFor(winner, uid) {
  if (winner === 'void' || !winner) return null;
  if (winner === 'draw') return 'draws';
  return winner === uid ? 'wins' : 'losses';
}

/**
 * May the winner of an accepted battle be written at `nowMs`? When both results are in; when
 * the fight window is over and every raid that was started has its result (nobody can attempt
 * any more, so nothing else can arrive); or when the result grace period is over. The rules'
 * resolveOk is the same test on the server clock.
 */
export function resolveDue(b, nowMs) {
  if (!b || b.status !== 'accepted') return false;
  const [a, o] = playersOf(b);
  if (hasResult(b, a) && hasResult(b, o)) return true;
  const end = fightEndsAtOf(b);
  if (end === null) return false;
  const now = Number(nowMs);
  if (now >= end + BATTLE.RESULT_GRACE_SECONDS * 1000) return true;
  return now >= end && !awaitingResult(b);
}

/** Has a player started a raid (attempt) whose result has not arrived yet? */
export function awaitingResult(b) {
  const attempts = (b && b.attempts) || {};
  return Object.keys(attempts).some(u => attempts[u] && !hasResult(b, u));
}

/**
 * When `uid`'s started raid is surely over (ms): the attempt time plus the raid clock and a
 * minute (the same margin as the result grace). null without an attempt. A raid still without a
 * result after that was interrupted - or its result waits on the raider's device to be re-sent.
 */
export function raidEndsBy(b, uid) {
  const a = b && b.attempts && uid ? b.attempts[uid] : null;
  const start = a ? toMillis(a.startedAt) : null;
  return start === null ? null : start + (BATTLE.RAID_TIME_LIMIT_SECONDS + 60) * 1000;
}

/**
 * The next moment after `nowMs` at which the clock alone changes what a battle shows or allows
 * (ms), or null: the respond deadline; the lock at startAt and the other city's lock after
 * LOCK_GRACE; the attack cutoff; the end of the fight window; the end of the result grace; a
 * started raid's raidEndsBy. The game recomputes its views right then, so the BATTLES screen
 * never waits for an unrelated Firestore change to drop an ATTACK button.
 */
export function nextChangeAt(b, nowMs) {
  if (!b) return null;
  const now = Number(nowMs);
  const times = [];
  if (b.status === 'pending') {
    times.push(respondDeadline(b));
  } else if (b.status === 'accepted') {
    const start = toMillis(b.startAt);
    const end = fightEndsAtOf(b);
    if (start !== null) times.push(start, start + BATTLE.LOCK_GRACE_SECONDS * 1000);
    if (end !== null) times.push(end - BATTLE.ATTACK_CUTOFF_SECONDS * 1000, end, end + BATTLE.RESULT_GRACE_SECONDS * 1000);
    for (const u of Object.keys(b.attempts || {})) if (!hasResult(b, u)) times.push(raidEndsBy(b, u));
  }
  const next = times.filter(t => t !== null && Number.isFinite(t) && t > now);
  return next.length ? Math.min(...next) : null;
}

/** Is it night at `date` (local time)? 19:00 up to 06:00. Takes a Date or ms. */
export function isNightAt(date) {
  const d = date instanceof Date ? date : new Date(Number(date));
  const h = d.getHours();
  return h >= BATTLE.NIGHT_START_HOUR || h < BATTLE.NIGHT_END_HOUR;
}

/**
 * The quick picks of the scheduled-challenge form: tonight 21:00, tonight 23:00, tomorrow
 * 21:00 (local time). A pick less than SCHEDULED_MIN_LEAD_SECONDS away (or already past) is
 * returned with available:false and a reason, so the form can grey it out.
 */
export function schedulePresets(nowDate) {
  const now = nowDate instanceof Date ? new Date(nowDate.getTime()) : new Date(Number(nowDate));
  const at = (dayOffset, hour) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0, 0);
    return d.getTime();
  };
  const picks = [
    { id: 'tonight21', label: 'Tonight 21:00', startAt: at(0, 21) },
    { id: 'tonight23', label: 'Tonight 23:00', startAt: at(0, 23) },
    { id: 'tomorrow21', label: 'Tomorrow 21:00', startAt: at(1, 21) }
  ];
  const minAt = now.getTime() + BATTLE.SCHEDULED_MIN_LEAD_SECONDS * 1000;
  return picks.map(p => {
    const available = p.startAt >= minAt;
    return {
      ...p,
      night: isNightAt(p.startAt),
      available,
      ...(available ? {} : { reason: p.startAt <= now.getTime() ? 'already past' : 'less than 10 minutes away' })
    };
  });
}

/**
 * Check a new challenge before it is sent: { opponentUid, mode, designSeconds (instant),
 * startAtMs (scheduled), theme?, message?, challengerUid? }. Strict on the client side - the
 * Firestore rules accept TIME_SLACK_SECONDS of clock skew on top. Returns { ok, errors[] }.
 */
export function validateChallenge(input, nowMs) {
  const errors = [];
  const c = input && typeof input === 'object' ? input : {};
  const now = Number(nowMs);
  if (typeof c.opponentUid !== 'string' || !c.opponentUid.trim()) errors.push('Choose an opponent.');
  else if (c.challengerUid && c.opponentUid === c.challengerUid) errors.push('You cannot challenge yourself.');
  if (!BATTLE_MODES.includes(c.mode)) errors.push('Mode must be instant or scheduled.');
  if (c.theme !== undefined && c.theme !== null && !BATTLE_THEMES.includes(c.theme)) errors.push('Theme must be day or night.');
  if (c.mode === 'instant') {
    if (!BATTLE.INSTANT_DESIGN_OPTIONS.includes(Number(c.designSeconds)) || c.designSeconds === null || c.designSeconds === '') {
      errors.push('Design time must be one of ' + BATTLE.INSTANT_DESIGN_OPTIONS.map(s => s / 60 + ' min').join(', ') + '.');
    }
    if (c.startAtMs !== undefined && c.startAtMs !== null) errors.push('An instant battle has no start time: it starts after the design window once accepted.');
  } else if (c.mode === 'scheduled') {
    const start = Number(c.startAtMs);
    if (c.startAtMs === undefined || c.startAtMs === null || !Number.isFinite(start)) {
      errors.push('Pick a start time.');
    } else if (!Number.isFinite(now)) {
      errors.push('No clock to check the start time against.');
    } else if (start < now + BATTLE.SCHEDULED_MIN_LEAD_SECONDS * 1000) {
      errors.push('A scheduled battle must start at least ' + BATTLE.SCHEDULED_MIN_LEAD_SECONDS / 60 + ' minutes from now.');
    } else if (start > now + BATTLE.SCHEDULED_MAX_LEAD_SECONDS * 1000) {
      errors.push('A scheduled battle must start within ' + BATTLE.SCHEDULED_MAX_LEAD_SECONDS / 86400 + ' days.');
    }
  }
  if (c.message !== undefined && c.message !== null) {
    if (typeof c.message !== 'string') errors.push('The message must be text.');
    else if (c.message.length > BATTLE.MESSAGE_MAX) errors.push('The message is ' + c.message.length + ' characters; the limit is ' + BATTLE.MESSAGE_MAX + '.');
  }
  return { ok: errors.length === 0, errors };
}

/** Raid stars for a destruction %: the thresholds of DestructionEngine.getStats (25 / 60 / 95). */
export function starsFor(percentage) {
  const p = Number(percentage) || 0;
  if (p >= 95) return 3;
  if (p >= 60) return 2;
  if (p >= 25) return 1;
  return 0;
}
