/**
 * test-firestore-rules.mjs - proves firestore.rules allow exactly the writes docs/ONLINE_SPEC.md
 * section 6 describes, and deny everything around them.
 *
 *   node tools/online/test-firestore-rules.mjs
 *
 * Needs the Firestore emulator on 127.0.0.1:8085 (`npm run emulators`, or FIRESTORE_EMULATOR_HOST).
 * Uses its own project id `demo-cs-rules` (RULES_PROJECT_ID to override), so wiping its data
 * never touches another suite's. Every battle phase is reached by seeding documents with
 * timestamps relative to now (rules disabled), then writing as a player through the rules -
 * request.time is the emulator's real clock, the same one the game sees.
 *
 * Prints one PASS/FAIL line per assertion and a total; exits 1 on any failure.
 * RULES_FILE=<path> runs the same assertions against another rules file (mutation checks).
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, orderBy, limit, getDocs,
  serverTimestamp, Timestamp, runTransaction, writeBatch, setLogLevel,
} from 'firebase/firestore';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RULES_PATH = process.env.RULES_FILE ? path.resolve(process.env.RULES_FILE) : path.join(ROOT, 'firestore.rules');
const RULES = readFileSync(RULES_PATH, 'utf8');
const PROJECT_ID = process.env.RULES_PROJECT_ID || 'demo-cs-rules';
const [EMU_HOST, EMU_PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085').split(':');

// The SDK logs every denied write as a warning; the assertions below already say what happened.
setLogLevel('silent');

// ---------------------------------------------------------------- tiny harness
let passes = 0;
let fails = 0;
const failures = [];
const report = (ok, name, detail) => {
  if (ok) passes++; else { fails++; failures.push(name + (detail ? '  ' + detail : '')); }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? '  ' + detail : ''}`);
};
const check = (ok, name, detail) => report(!!ok, name, detail === undefined ? '' : (typeof detail === 'string' ? detail : JSON.stringify(detail)));
/** The write/read must be ALLOWED. `fn` returns the SDK promise. */
async function allow(name, fn) {
  try { await assertSucceeds(fn()); report(true, 'allow  ' + name); }
  catch (e) { report(false, 'allow  ' + name, String(e && e.message || e).split('\n')[0]); }
}
/** The write/read must be DENIED with PERMISSION_DENIED (any other error is a failure). */
async function deny(name, fn) {
  try { await assertFails(fn()); report(true, 'deny   ' + name); }
  catch (e) { report(false, 'deny   ' + name, String(e && e.message || e).split('\n')[0]); }
}
const section = t => console.log(`\n== ${t}`);

// ---------------------------------------------------------------- environment
const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { host: EMU_HOST, port: Number(EMU_PORT), rules: RULES },
});
const A = 'alice';   // challenger
const B = 'bob';     // opponent
const E = 'eve';     // outsider
const dbA = env.authenticatedContext(A).firestore();
const dbB = env.authenticatedContext(B).firestore();
const dbE = env.authenticatedContext(E).firestore();
const dbAnon = env.unauthenticatedContext().firestore();

const T = ms => Timestamp.fromMillis(ms);
const now = () => Date.now();
const SEC = 1000;

async function seed(p, data) {
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), p), data); });
}
async function raw(p) {
  let out = null;
  await env.withSecurityRulesDisabled(async ctx => {
    const s = await getDoc(doc(ctx.firestore(), p));
    out = s.exists() ? s.data() : null;
  });
  return out;
}

// ---------------------------------------------------------------- fixtures
const NAMES = { [A]: 'Alice', [B]: 'Bobby', [E]: 'Evelyn' };
function profile(uid, over = {}) {
  return {
    uid, name: NAMES[uid], nameLower: NAMES[uid].toLowerCase(), townHall: 3,
    trophies: 0, wins: 0, losses: 0, draws: 0,
    createdAt: T(now() - 86400 * SEC), lastSeen: T(now() - 60 * SEC), ...over,
  };
}
function layoutFor(uid) {
  return {
    v: 1, savedAt: 1700000000000,
    buildings: [
      { id: 'gate_north_gate', t: 'main_gate', gx: 0, gz: -15, l: 1, st: 0, rot: 0, gate: 'North Gate' },
      { id: `b_${uid}_th`, t: 'town_hall', gx: 0, gz: 0, l: 3, st: 0, rot: 0 },
      { id: `b_${uid}_ps`, t: 'police_station', gx: 4, gz: 4, l: 2, st: 0, rot: 0 },
    ],
    tasks: [{ i: 2, id: `b_${uid}_ps`, t: 'police_station', gx: 4, gz: 4, to: 2, endsAt: 1700000100000, total: 60 }],
    roads: ['1,2', '1,3', '2,3'],
  };
}
function holdings() {
  return { inventory: { road: 4, cannon_tower: 1 }, stowedCounts: {}, stowedLevels: {}, stowedSealed: {}, bankCredits: {} };
}
function cityFor(uid, over = {}) {
  return {
    uid, name: NAMES[uid] || uid, townHall: 3, rev: 1, updatedAt: T(now()), updatedBy: 'game', writerId: 'seed',
    layout: layoutFor(uid), holdings: holdings(), ...over,
  };
}
function snapOf(uid, over = {}) {
  const c = cityFor(uid);
  return { layout: c.layout, townHall: c.townHall, name: c.name, rev: c.rev, lockedAt: T(now()), ...over };
}

let battleSeq = 0;
const newId = () => `battle${++battleSeq}`;
function battle(over = {}) {
  return {
    mode: 'instant', theme: 'day', status: 'pending',
    challenger: A, opponent: B, players: [A, B],
    names: { [A]: 'Alice', [B]: 'Bobby' }, townHalls: { [A]: 3, [B]: 3 }, message: 'gl hf',
    createdAt: T(now() - 5 * SEC), designSeconds: 120,
    ready: {}, snapshots: {}, attempts: {}, results: {}, settled: {}, ...over,
  };
}
/** An accepted battle whose startAt is `startOffsetSec` from now (negative = already started). */
function acceptedBattle(startOffsetSec, over = {}) {
  const mode = over.mode || 'instant';
  const startMs = now() + startOffsetSec * SEC;
  const fight = mode === 'scheduled' ? 3600 : 900;
  return battle({
    status: 'accepted', acceptedAt: T(now() - 60 * SEC),
    startAt: T(startMs), fightEndsAt: T(startMs + fight * SEC), ...over,
  });
}
/** Scheduled battles carry no design window. */
const noDesign = o => { const c = { ...o }; delete c.designSeconds; return c; };
const bothSnaps = () => ({ [A]: snapOf(A), [B]: snapOf(B) });
const attemptAt = (msAgo = 30 * SEC) => ({ startedAt: T(now() - msAgo) });
const starsFor = p => (p >= 95 ? 3 : p >= 60 ? 2 : p >= 25 ? 1 : 0);
/** A result exactly as AttackManager.endAttack reports it (percentage from getStats). */
function result(destroyed, total, over = {}) {
  const percentage = total > 0 ? Math.min(100, Math.round((destroyed / total) * 100)) : 0;
  return {
    stars: starsFor(percentage), percentage, destroyed, total,
    outcome: percentage >= 100 ? 'victory' : 'retreat', durationSec: 180,
    loot: { cash: 1200, iron: 300, wood: 150 }, finishedAt: serverTimestamp(), ...over,
  };
}
const seededResult = (destroyed, total, over = {}) => result(destroyed, total, { finishedAt: T(now() - 10 * SEC), ...over });

async function seedBattle(data) { const id = newId(); await seed(`battles/${id}`, data); return id; }
const bref = (db, id) => doc(db, 'battles', id);
/**
 * A challenge exactly as BattleService.createChallenge sends it: one batch that also stamps
 * players/{uid}.lastChallengeAt (the rules' cooldown) and names the battle in lastChallengeId.
 * The profile is re-seeded first (no stamp) unless `keepCooldown`, so a deny below fails for the
 * reason it names, not the cooldown.
 */
async function challenge(db, uid, data, { id = newId(), keepCooldown = false } = {}) {
  if (!keepCooldown) await seed(`players/${uid}`, profile(uid));
  const b = writeBatch(db);
  b.set(doc(db, 'battles', id), data);
  b.update(doc(db, 'players', uid), { lastChallengeAt: serverTimestamp(), lastChallengeId: id });
  return b.commit();
}

async function resetWorld() {
  await env.clearFirestore();
  for (const uid of [A, B, E]) {
    await seed(`players/${uid}`, profile(uid));
    await seed(`usernames/${NAMES[uid].toLowerCase()}`, { uid });
  }
  await seed(`cities/${A}`, cityFor(A));
  await seed(`cities/${B}`, cityFor(B));
}

// ---------------------------------------------------------------- BATTLE constants mirror
let BR = null;
section('battle constants in firestore.rules == src/shared/battleRules.js');
{
  const block = RULES.split('// ===== BATTLE CONSTANTS')[1]?.split('// ===== END BATTLE CONSTANTS')[0] || '';
  const parsed = {};
  for (const m of block.matchAll(/^\s*function (\w+)\(\) \{ return (.+?); \}\s*$/gm)) parsed[m[1]] = JSON.parse(m[2]);
  check(Object.keys(parsed).length >= 14, 'rules constants block parses', Object.keys(parsed));
  const brPath = path.join(ROOT, 'src/shared/battleRules.js');
  if (!existsSync(brPath)) {
    check(false, 'src/shared/battleRules.js exists (needed to cross-check constants and the winner)');
  } else {
    BR = await import(pathToFileURL(brPath).href);
    for (const [name, value] of Object.entries(parsed)) {
      check(JSON.stringify(BR.BATTLE[name]) === JSON.stringify(value), `rules ${name} == BATTLE.${name}`, { rules: value, js: BR.BATTLE[name] });
    }
    check([0, 10, 24, 25, 59, 60, 94, 95, 100].every(p => BR.starsFor(p) === starsFor(p)), 'battleRules.starsFor uses the rules thresholds 25/60/95');
  }
}

// Spec caps must hold a maxed-out Town Hall 12 city (else a legit push would be refused).
section('city size caps fit a maxed Town Hall 12 city');
{
  const P = await import(pathToFileURL(path.join(ROOT, 'src/data/progression.js')).href);
  let buildings = 3; // the three main gates
  for (const t of P.BUILDING_TYPES) if (t !== 'road' && t !== 'main_gate') buildings += P.limitFor(t, P.MAX_TOWN_HALL_LEVEL) || 0;
  check(buildings + 60 <= 400, `TH12 building limits (${buildings}) + 60 starter trees fit the 400-building cap`);
  check(P.limitFor('road', P.MAX_TOWN_HALL_LEVEL) <= 450, `TH12 road limit (${P.limitFor('road', P.MAX_TOWN_HALL_LEVEL)}) fits the 450-road cap`);
}

// ================================================================ players + usernames
section('players/{uid}');
await resetWorld();
await deny('signed-out read of a profile', () => getDoc(doc(dbAnon, 'players', A)));
await allow('signed-in read of another profile', () => getDoc(doc(dbE, 'players', A)));
await allow('prefix search on nameLower', () => getDocs(query(collection(dbE, 'players'), where('nameLower', '>=', 'al'), where('nameLower', '<=', 'al'), limit(10))));
{
  const fresh = (uid, name, over = {}) => ({
    uid, name, nameLower: name.toLowerCase(), townHall: 1, trophies: 0, wins: 0, losses: 0, draws: 0,
    createdAt: serverTimestamp(), lastSeen: serverTimestamp(), ...over,
  });
  const dbN = env.authenticatedContext('newbie').firestore();
  const claimAndCreate = (db, uid, name, over = {}) => {
    const b = writeBatch(db);
    b.set(doc(db, 'usernames', name.toLowerCase()), { uid });
    b.set(doc(db, 'players', uid), fresh(uid, name, over));
    return b.commit();
  };
  await deny('create profile without claiming the username', () => setDoc(doc(dbN, 'players', 'newbie'), fresh('newbie', 'Newbie')));
  await deny('create profile with a name another player owns', () => setDoc(doc(dbN, 'players', 'newbie'), fresh('newbie', 'Alice')));
  await deny('create profile with 50 starting trophies', () => claimAndCreate(dbN, 'newbie', 'Newbie', { trophies: 50 }));
  await deny('create profile with a pre-loaded win', () => claimAndCreate(dbN, 'newbie', 'Newbie', { wins: 1 }));
  await deny('create profile with Town Hall 13', () => claimAndCreate(dbN, 'newbie', 'Newbie', { townHall: 13 }));
  await deny('create profile with nameLower not matching name', () => {
    const b = writeBatch(dbN);
    b.set(doc(dbN, 'usernames', 'newbie'), { uid: 'newbie' });
    b.set(doc(dbN, 'players', 'newbie'), fresh('newbie', 'Newbie', { nameLower: 'newbie2' }));
    return b.commit();
  });
  await deny('create profile with a 2-char name', () => claimAndCreate(dbN, 'newbie', 'Ab'));
  await deny('create profile with "!" in the name', () => claimAndCreate(dbN, 'newbie', 'Bad!Name'));
  await deny('create profile with an unknown key', () => claimAndCreate(dbN, 'newbie', 'Newbie', { admin: true }));
  await deny('create a profile for another uid', () => setDoc(doc(dbE, 'players', 'newbie'), fresh('newbie', 'Evelyn')));
  await allow('claim username + create profile in one batch', () => claimAndCreate(dbN, 'newbie', 'Newbie'));
}
await allow('presence update (lastSeen + townHall)', () => updateDoc(doc(dbA, 'players', A), { lastSeen: serverTimestamp(), townHall: 4 }));
await deny('update another player\'s profile', () => updateDoc(doc(dbE, 'players', A), { lastSeen: serverTimestamp() }));
await deny('change own uid field', () => updateDoc(doc(dbA, 'players', A), { uid: E }));
await deny('change createdAt', () => updateDoc(doc(dbA, 'players', A), { createdAt: serverTimestamp() }));
await deny('set trophies without a W/L/D tick', () => updateDoc(doc(dbA, 'players', A), { trophies: 500 }));
{
  // A W/L/D tick is the settle of ONE finished battle, in the same batch as its settled flag
  // (players.lastSettled names it). Without that, anyone could mint wins from the console.
  const fin = (winner) => seedBattle({ ...acceptedBattle(-2000), status: 'finished', winner, resolvedAt: T(now() - 5 * SEC) });
  const settleBatch = (id, prof, change, battleOver = {}) => {
    const b = writeBatch(dbA);
    if (prof) b.update(doc(dbA, 'players', A), prof);
    b.update(bref(dbA, id), { [`settled.${A}`]: true, [`trophyChange.${A}`]: change, ...battleOver });
    return b.commit();
  };
  await deny('self-award a win with no battle (wins+1, trophies+30) - the trophy-minting hole', () => updateDoc(doc(dbA, 'players', A), { wins: 1, trophies: 30 }));
  let won = await fin(A);
  await deny('self-award a win naming a won battle it does not settle', () => updateDoc(doc(dbA, 'players', A), { wins: 1, trophies: 30, lastSettled: won }));
  await deny('settle a win with +31 trophies', () => settleBatch(won, { wins: 1, trophies: 31, lastSettled: won }, 31));
  await deny('two wins in one settle', () => settleBatch(won, { wins: 2, trophies: 60, lastSettled: won }, 60));
  await deny('win and draw ticked together', () => settleBatch(won, { wins: 1, draws: 1, trophies: 35, lastSettled: won }, 35));
  await deny('settle a won battle as a draw', () => settleBatch(won, { draws: 1, trophies: 5, lastSettled: won }, 5));
  await deny('settle naming ANOTHER battle in lastSettled', async () => { const other = await fin(A); return settleBatch(won, { wins: 1, trophies: 30, lastSettled: other }, 30); });
  await deny('settle with a trophyChange that is not what moved', () => settleBatch(won, { wins: 1, trophies: 30, lastSettled: won }, 25));
  await allow('settle a win: wins+1, trophies+30, lastSettled, settled + trophyChange 30 in one batch', () => settleBatch(won, { wins: 1, trophies: 30, lastSettled: won }, 30));
  await deny('settle the same won battle again (a second +30)', () => settleBatch(won, { wins: 2, trophies: 60, lastSettled: won }, 30));
  await deny('re-tick the same battle without its flag (wins+1 naming a settled battle)', () => updateDoc(doc(dbA, 'players', A), { wins: 2, trophies: 60, lastSettled: won }));
  const drew = await fin('draw');
  await allow('settle a draw: draws+1, trophies+5', () => settleBatch(drew, { draws: 1, trophies: 35, lastSettled: drew }, 5));
  let lost = await fin(B);
  await deny('settle a lost battle as a win', () => settleBatch(lost, { wins: 2, trophies: 65, lastSettled: lost }, 30));
  await deny('loser skips the -20: settled flag without the players tick', () => settleBatch(lost, null, 0));
  await deny('loss that drops 25 trophies', () => settleBatch(lost, { losses: 1, trophies: 10, lastSettled: lost }, -25));
  await allow('settle a loss: losses+1, trophies-20 (35 -> 15), trophyChange -20', () => settleBatch(lost, { losses: 1, trophies: 15, lastSettled: lost }, -20));
  lost = await fin(B);
  await deny('loss at 15 trophies recorded as trophyChange -20 (only -15 moved)', () => settleBatch(lost, { losses: 2, trophies: 0, lastSettled: lost }, -20));
  await allow('loss floors trophies at 0 (15 -> 0), trophyChange -15', () => settleBatch(lost, { losses: 2, trophies: 0, lastSettled: lost }, -15));
  lost = await fin(B);
  await deny('negative trophies', () => settleBatch(lost, { losses: 3, trophies: -20, lastSettled: lost }, -20));
  await allow('loss at 0 trophies: losses+1, trophies stay 0, trophyChange 0', () => settleBatch(lost, { losses: 3, trophies: 0, lastSettled: lost }, 0));
  const voided = await fin('void');
  await deny('void battle: a draw tick is refused', () => settleBatch(voided, { draws: 2, trophies: 5, lastSettled: voided }, 5));
  await deny('void battle: a loss tick is refused', () => settleBatch(voided, { losses: 4, trophies: 0, lastSettled: voided }, 0));
  await deny('void battle: trophyChange must be 0', () => settleBatch(voided, null, 5));
  await allow('void battle settles with NO players write (settled + trophyChange 0)', () => settleBatch(voided, null, 0));
  await deny('lastSettled moved without a tick', () => updateDoc(doc(dbA, 'players', A), { lastSettled: voided }));
  await deny('decrease the win counter', () => updateDoc(doc(dbA, 'players', A), { wins: 0 }));
  const pa = await raw(`players/${A}`);
  check(pa && pa.wins === 1 && pa.draws === 1 && pa.losses === 3 && pa.trophies === 0, 'A after the settles: 1W 1D 3L, 0 trophies', pa && { w: pa.wins, d: pa.draws, l: pa.losses, t: pa.trophies });
  await deny('lastChallengeAt set to a client time (it must be the server time)', () => updateDoc(doc(dbA, 'players', A), { lastChallengeAt: T(now() - 3600 * SEC) }));
  // (An old stamp first: the emulator's request.time has millisecond steps, so a write in the same
  // millisecond as the stamp would read it as "now".)
  await seed(`players/${A}`, { ...(await raw(`players/${A}`)), lastChallengeAt: T(now() - 60 * SEC) });
  await deny('lastChallengeId moved without a new stamp', () => updateDoc(doc(dbA, 'players', A), { lastChallengeId: 'battleX' }));
  await deny('lastChallengeId that is not a battle id', () => updateDoc(doc(dbA, 'players', A), { lastChallengeAt: serverTimestamp(), lastChallengeId: '<b>x</b>' }));
  await allow('lastChallengeAt = serverTimestamp()', () => updateDoc(doc(dbA, 'players', A), { lastChallengeAt: serverTimestamp() }));
  await allow('lastChallengeId with a new stamp', () => updateDoc(doc(dbA, 'players', A), { lastChallengeAt: serverTimestamp(), lastChallengeId: 'battleX' }));
  await seed(`players/${A}`, profile(A));
}
await deny('rename to a name nobody claimed', () => updateDoc(doc(dbA, 'players', A), { name: 'Alicia', nameLower: 'alicia' }));
await deny('rename to Bobby (owned by bob)', () => updateDoc(doc(dbA, 'players', A), { name: 'Bobby', nameLower: 'bobby' }));
await allow('rename with a new claim in the same batch', () => {
  const b = writeBatch(dbA);
  b.set(doc(dbA, 'usernames', 'alicia'), { uid: A });
  b.update(doc(dbA, 'players', A), { name: 'Alicia', nameLower: 'alicia' });
  b.delete(doc(dbA, 'usernames', 'alice'));
  return b.commit();
});
await deny('delete own profile', () => deleteDoc(doc(dbA, 'players', A)));

section('usernames/{nameLower}');
await resetWorld();
await allow('signed-in availability check (get)', () => getDoc(doc(dbE, 'usernames', 'alice')));
await deny('signed-out get', () => getDoc(doc(dbAnon, 'usernames', 'alice')));
await deny('list usernames', () => getDocs(collection(dbE, 'usernames')));
await allow('claim a free name', () => setDoc(doc(dbE, 'usernames', 'eve the great'), { uid: E }));
await deny('claim a free name for someone else', () => setDoc(doc(dbE, 'usernames', 'framed'), { uid: A }));
await deny('claim a taken name (becomes an update)', () => setDoc(doc(dbE, 'usernames', 'alice'), { uid: E }));
await deny('claim an upper-case id', () => setDoc(doc(dbE, 'usernames', 'Evie'), { uid: E }));
await deny('claim a 21-char id', () => setDoc(doc(dbE, 'usernames', 'abcdefghijklmnopqrstu'), { uid: E }));
await deny('claim an id with a trailing space', () => setDoc(doc(dbE, 'usernames', 'evie '), { uid: E }));
await deny('claim with an extra field', () => setDoc(doc(dbE, 'usernames', 'evie'), { uid: E, name: 'Evie' }));
await deny('delete someone else\'s claim', () => deleteDoc(doc(dbE, 'usernames', 'alice')));
await deny('release the claim your profile still uses (would allow a second Alice)', () => deleteDoc(doc(dbA, 'usernames', 'alice')));
await allow('delete own claim', () => deleteDoc(doc(dbE, 'usernames', 'eve the great')));
{
  // Username race: two players claim the same free name at the same moment through the
  // client's transaction (read -> must be absent -> create claim + profile). One wins.
  const dbX = env.authenticatedContext('racer_x').firestore();
  const dbY = env.authenticatedContext('racer_y').firestore();
  const claim = (db, uid) => runTransaction(db, async tx => {
    const ref = doc(db, 'usernames', 'hotname');
    if ((await tx.get(ref)).exists()) throw Object.assign(new Error('taken'), { code: 'already-exists' });
    tx.set(ref, { uid });
    tx.set(doc(db, 'players', uid), {
      uid, name: 'HotName', nameLower: 'hotname', townHall: 1, trophies: 0, wins: 0, losses: 0, draws: 0, createdAt: serverTimestamp(),
    });
  });
  const settled = await Promise.allSettled([claim(dbX, 'racer_x'), claim(dbY, 'racer_y')]);
  const winners = settled.filter(s => s.status === 'fulfilled').length;
  const owner = (await raw('usernames/hotname'))?.uid;
  check(winners === 1, 'username race: exactly one of two simultaneous claims succeeds', settled.map(s => s.status + (s.reason ? ':' + s.reason.code : '')));
  const loser = owner === 'racer_x' ? 'racer_y' : 'racer_x';
  check(!!owner && !(await raw(`players/${loser}`)), 'username race: the loser got no profile with that name', { owner });
  // Plain racing creates without a transaction: still one winner.
  const s2 = await Promise.allSettled([
    setDoc(doc(dbX, 'usernames', 'coldname'), { uid: 'racer_x' }),
    setDoc(doc(dbY, 'usernames', 'coldname'), { uid: 'racer_y' }),
  ]);
  check(s2.filter(s => s.status === 'fulfilled').length === 1, 'username race: exactly one of two blind creates succeeds', s2.map(s => s.status));
}

// ================================================================ cities
section('cities/{uid}');
await resetWorld();
{
  const clientCity = (uid, over = {}) => ({ ...cityFor(uid), updatedAt: serverTimestamp(), writerId: 'sess-abc', ...over });
  await deny('signed-out read of a city', () => getDoc(doc(dbAnon, 'cities', A)));
  await allow('opponent scouts a city (read)', () => getDoc(doc(dbB, 'cities', A)));
  await allow('create own city with rev 1', () => setDoc(doc(dbE, 'cities', E), clientCity(E)));
  const crPath = path.join(ROOT, 'src/shared/cityRules.js');
  if (existsSync(crPath)) {
    // The exact layout CloudSync uploads: cityRules.toCloudLayout of a local save blob.
    const CR = await import(pathToFileURL(crPath).href);
    const local = {
      v: 1, savedAt: 1700000000000,
      buildings: [
        { t: 'main_gate', gx: 0, gz: -15, l: 1, st: 0, rot: 0, gate: 'North Gate' },
        { t: 'town_hall', gx: 0, gz: 0, l: 2, st: 0, rot: 0 },
        { id: 'bkeepme', t: 'cannon_tower', gx: 4, gz: 3, l: 1, st: 0, rot: Math.PI / 2 },
        { t: 'tree', gx: 13, gz: 9, l: 1, st: 0, rot: 0 },
      ],
      tasks: [{ i: 2, t: 'cannon_tower', gx: 4, gz: 3, to: 2, endsAt: 1700000500000, total: 120 }],
      roads: [[1, 2], [1, 3], [-2, 5]],
    };
    const layout = CR.toCloudLayout(local, { nowMs: 1700000000000, rand: () => 0.5 });
    const dbC = env.authenticatedContext('carol').firestore();
    await allow('create a city whose layout is cityRules.toCloudLayout(local save)', () => setDoc(doc(dbC, 'cities', 'carol'), clientCity('carol', { layout, holdings: CR.emptyHoldings() })));
  } else {
    check(false, 'src/shared/cityRules.js exists (cloud layout round trip)');
  }
  // Real cities exported from the game (tools/online/fixtures): the rules must take them as-is.
  for (const name of ['default-city', 'th5-city']) {
    const f = path.join(ROOT, 'tools/online/fixtures', `${name}.cloud.json`);
    if (!existsSync(f)) { check(false, `fixture ${name}.cloud.json exists`); continue; }
    const fx = JSON.parse(readFileSync(f, 'utf8'));
    const uid = 'fx_' + name.replace(/\W/g, '_');
    const dbF = env.authenticatedContext(uid).firestore();
    await allow(`create a city from the real ${name} fixture (TH${fx.townHall}, ${fx.layout.buildings.length} buildings, ${fx.layout.roads.length} roads)`,
      () => setDoc(doc(dbF, 'cities', uid), clientCity(uid, { townHall: fx.townHall, layout: fx.layout, holdings: fx.holdings })));
  }
  await deny('create another player\'s city', () => setDoc(doc(dbE, 'cities', 'someone'), clientCity('someone')));
  await deny('create with rev 2', () => setDoc(doc(dbE, 'cities', 'eve2'), clientCity('eve2', { rev: 2 })));
  await deny('create with uid field != doc id', () => setDoc(doc(env.authenticatedContext('eve3').firestore(), 'cities', 'eve3'), clientCity('eve3', { uid: A })));
  await deny('client create signed as updatedBy mcp', () => setDoc(doc(env.authenticatedContext('eve4').firestore(), 'cities', 'eve4'), clientCity('eve4', { updatedBy: 'mcp' })));
  const next = (over = {}) => ({ rev: 2, updatedAt: serverTimestamp(), updatedBy: 'game', writerId: 'sess-abc', layout: layoutFor(A), holdings: holdings(), lastChange: { by: 'game', summary: '', at: serverTimestamp() }, ...over });
  await deny('update skipping a rev (1 -> 3)', () => updateDoc(doc(dbA, 'cities', A), next({ rev: 3 })));
  await deny('update without bumping rev', () => updateDoc(doc(dbA, 'cities', A), next({ rev: 1 })));
  await deny('update another player\'s city', () => updateDoc(doc(dbE, 'cities', A), next()));
  await deny('update with 401 buildings', () => updateDoc(doc(dbA, 'cities', A), next({ layout: { ...layoutFor(A), buildings: Array.from({ length: 401 }, (_, i) => ({ id: 'b' + i, t: 'tree', gx: 0, gz: 0, l: 1, st: 0, rot: 0 })) } })));
  await deny('update with 451 roads', () => updateDoc(doc(dbA, 'cities', A), next({ layout: { ...layoutFor(A), roads: Array.from({ length: 451 }, (_, i) => `${i},0`) } })));
  await deny('update with layout v 2', () => updateDoc(doc(dbA, 'cities', A), next({ layout: { ...layoutFor(A), v: 2 } })));
  await deny('update with an unknown layout key', () => updateDoc(doc(dbA, 'cities', A), next({ layout: { ...layoutFor(A), cheat: 1 } })));
  await deny('update with an unknown top-level key', () => updateDoc(doc(dbA, 'cities', A), next({ bank: { cash: 1e9 } })));
  await deny('update with an unknown holdings key', () => updateDoc(doc(dbA, 'cities', A), next({ holdings: { ...holdings(), gems: 999 } })));
  await deny('update changing the uid field', () => updateDoc(doc(dbA, 'cities', A), next({ uid: E })));
  await deny('client update signed lastChange.by mcp', () => updateDoc(doc(dbA, 'cities', A), next({ lastChange: { by: 'mcp', summary: 'x' } })));
  await deny('update with Town Hall 13', () => updateDoc(doc(dbA, 'cities', A), next({ townHall: 13 })));
  await allow('update with 400 buildings and 450 roads (the caps)', () => updateDoc(doc(dbA, 'cities', A), next({ layout: { ...layoutFor(A), buildings: Array.from({ length: 400 }, (_, i) => ({ id: 'b' + i, t: 'tree', gx: 0, gz: 0, l: 1, st: 0, rot: 0 })), roads: Array.from({ length: 450 }, (_, i) => `${i},0`) } })));
  await allow('CloudSync push: transaction read rev -> write rev+1', () => runTransaction(dbA, async tx => {
    const ref = doc(dbA, 'cities', A);
    const cur = (await tx.get(ref)).data();
    tx.update(ref, next({ rev: cur.rev + 1 }));
  }));
  // `writers`: the tokens of the latest game writes (a push whose reply was lost is recognised by them).
  {
    const r0 = (await raw(`cities/${A}`)).rev;
    await allow('push carrying 8 writer tokens', () => updateDoc(doc(dbA, 'cities', A), next({ rev: r0 + 1, writers: Array.from({ length: 8 }, (_, i) => 'gsess.' + i) })));
    await deny('push carrying 9 writer tokens', () => updateDoc(doc(dbA, 'cities', A), next({ rev: r0 + 2, writers: Array.from({ length: 9 }, (_, i) => 'gsess.' + i) })));
    await deny('writers that is not a list', () => updateDoc(doc(dbA, 'cities', A), next({ rev: r0 + 2, writers: { a: 1 } })));
  }
  // The MCP server (Admin SDK) writes rev+1 as 'mcp'; the game then pushes on top of it.
  const cur = await raw(`cities/${A}`);
  await seed(`cities/${A}`, { ...cur, rev: cur.rev + 1, updatedBy: 'mcp', writerId: 'mcp:abcd1234', lastChange: { by: 'mcp', summary: 'moved cannon', at: T(now()) } });
  await allow('game push after an MCP edit (updatedBy mcp -> game)', () => updateDoc(doc(dbA, 'cities', A), next({ rev: cur.rev + 2 })));
  await deny('game push that leaves updatedBy as mcp', async () => {
    await seed(`cities/${A}`, { ...cur, rev: 10, updatedBy: 'mcp', writerId: 'mcp:abcd1234' });
    return updateDoc(doc(dbA, 'cities', A), { rev: 11, layout: layoutFor(A) });
  });
  await deny('delete own city', () => deleteDoc(doc(dbA, 'cities', A)));
  await seed(`cities/${A}/history/1`, { ...cityFor(A), rev: 1 });
  await allow('owner reads undo history', () => getDocs(collection(dbA, 'cities', A, 'history')));
  await deny('opponent reads undo history', () => getDoc(doc(dbB, 'cities', A, 'history', '1')));
  await deny('owner writes undo history (MCP only)', () => setDoc(doc(dbA, 'cities', A, 'history', '2'), cityFor(A)));
}

// ================================================================ saves
section('saves/{uid}');
await resetWorld();
{
  const save = (over = {}) => ({ bank: { cash: 5000, iron: 200, wood: 300, gems: 12, vehicleLives: 1 }, garage: { owned: ['buggy'], loadout: ['emp'] }, updatedAt: serverTimestamp(), ...over });
  await allow('owner writes own save', () => setDoc(doc(dbA, 'saves', A), save()));
  await allow('owner merges a bank update', () => setDoc(doc(dbA, 'saves', A), { bank: { cash: 6000, iron: 200, wood: 300, gems: 12, vehicleLives: 1 }, updatedAt: serverTimestamp() }, { merge: true }));
  await allow('owner reads own save', () => getDoc(doc(dbA, 'saves', A)));
  await deny('opponent reads the save', () => getDoc(doc(dbB, 'saves', A)));
  await deny('opponent writes the save', () => setDoc(doc(dbB, 'saves', A), save()));
  await deny('negative cash', () => setDoc(doc(dbA, 'saves', A), save({ bank: { cash: -1, iron: 0, wood: 0, gems: 0, vehicleLives: 0 } })));
  await deny('unknown bank key', () => setDoc(doc(dbA, 'saves', A), save({ bank: { cash: 1, gold: 5 } })));
  await deny('unknown top-level key', () => setDoc(doc(dbA, 'saves', A), save({ trophies: 9999 })));
  await deny('string gems', () => setDoc(doc(dbA, 'saves', A), save({ bank: { gems: '9' } })));
  // The paid-credits ledger CloudSync writes with the bank (a stow credit is paid once per account).
  await allow('bank with the credited ledger', () => setDoc(doc(dbA, 'saves', A), save({ credited: ['cabc123', 'cdef456'] })));
  await allow('update that changes only the ledger + bank', () => setDoc(doc(dbA, 'saves', A), save({ credited: ['cabc123', 'cdef456', 'cxyz789'] })));
  await deny('credited that is not a list', () => setDoc(doc(dbA, 'saves', A), save({ credited: { cabc123: true } })));
  await deny('credited longer than 100', () => setDoc(doc(dbA, 'saves', A), save({ credited: Array.from({ length: 101 }, (_, i) => 'c' + i) })));
  await allow('bank write carrying its writer tokens (8)', () => setDoc(doc(dbA, 'saves', A), save({ writers: Array.from({ length: 8 }, (_, i) => 'gsess.' + i) })));
  await deny('bank write with 9 writer tokens', () => setDoc(doc(dbA, 'saves', A), save({ writers: Array.from({ length: 9 }, (_, i) => 'gsess.' + i) })));
  await deny('bank writers that is not a list', () => setDoc(doc(dbA, 'saves', A), save({ writers: 'gsess.1' })));
  await allow('owner deletes own save', () => deleteDoc(doc(dbA, 'saves', A)));
}

// ================================================================ mcpTokens
section('mcpTokens/{sha256hex}');
await resetWorld();
{
  const H1 = 'a'.repeat(64);
  const H2 = '0123456789abcdef'.repeat(4);
  const tok = (over = {}) => ({ uid: A, label: 'Claude Code', createdAt: serverTimestamp(), revoked: false, scope: 'design', ...over });
  await allow('create a token doc (hash id)', () => setDoc(doc(dbA, 'mcpTokens', H1), tok()));
  await deny('create with a non-hex id', () => setDoc(doc(dbA, 'mcpTokens', 'z'.repeat(64)), tok()));
  await deny('create with an upper-case hex id', () => setDoc(doc(dbA, 'mcpTokens', 'A'.repeat(64)), tok()));
  await deny('create with a 63-char id', () => setDoc(doc(dbA, 'mcpTokens', 'a'.repeat(63)), tok()));
  await deny('create a token for another uid', () => setDoc(doc(dbE, 'mcpTokens', H2), tok()));
  await deny('create without the revoked field', () => setDoc(doc(dbA, 'mcpTokens', H2), { uid: A, label: 'x', createdAt: serverTimestamp(), scope: 'design' }));
  await deny('create with revoked true', () => setDoc(doc(dbA, 'mcpTokens', H2), tok({ revoked: true })));
  await deny('create with scope admin', () => setDoc(doc(dbA, 'mcpTokens', H2), tok({ scope: 'admin' })));
  await deny('create with a 41-char label', () => setDoc(doc(dbA, 'mcpTokens', H2), tok({ label: 'x'.repeat(41) })));
  await deny('create with usage fields (server-only)', () => setDoc(doc(dbA, 'mcpTokens', H2), tok({ uses: 0 })));
  await deny('take over someone\'s token hash (update)', () => setDoc(doc(dbE, 'mcpTokens', H1), tok({ uid: E })));
  await allow('owner gets own token', () => getDoc(doc(dbA, 'mcpTokens', H1)));
  await deny('another player gets the token', () => getDoc(doc(dbE, 'mcpTokens', H1)));
  await allow('owner lists own tokens (where uid == me)', () => getDocs(query(collection(dbA, 'mcpTokens'), where('uid', '==', A))));
  await allow('owner lists own tokens newest first', () => getDocs(query(collection(dbA, 'mcpTokens'), where('uid', '==', A), orderBy('createdAt', 'desc'))));
  await deny('list all tokens', () => getDocs(collection(dbA, 'mcpTokens')));
  await deny('list another player\'s tokens', () => getDocs(query(collection(dbE, 'mcpTokens'), where('uid', '==', A))));
  await allow('owner relabels', () => updateDoc(doc(dbA, 'mcpTokens', H1), { label: 'Desktop' }));
  await deny('owner changes scope', () => updateDoc(doc(dbA, 'mcpTokens', H1), { scope: 'admin' }));
  await deny('owner fakes usage counters', () => updateDoc(doc(dbA, 'mcpTokens', H1), { uses: 5 }));
  await deny('owner reassigns uid', () => updateDoc(doc(dbA, 'mcpTokens', H1), { uid: E }));
  await deny('another player revokes it', () => updateDoc(doc(dbE, 'mcpTokens', H1), { revoked: true }));
  await allow('owner revokes', () => updateDoc(doc(dbA, 'mcpTokens', H1), { revoked: true }));
  await deny('owner un-revokes', () => updateDoc(doc(dbA, 'mcpTokens', H1), { revoked: false }));
  await deny('another player deletes it', () => deleteDoc(doc(dbE, 'mcpTokens', H1)));
  await allow('owner deletes it', () => deleteDoc(doc(dbA, 'mcpTokens', H1)));
}

// ================================================================ battles: create
section('battles: create');
await resetWorld();
{
  const UID = new Map([[dbA, A], [dbB, B], [dbE, E]]);
  const create = (db, over = {}) => challenge(db, UID.get(db), battle({ createdAt: serverTimestamp(), ...over }));
  const sched = (startMs, over = {}) => ({
    mode: 'scheduled', theme: 'night', startAt: T(startMs), fightEndsAt: T(startMs + 3600 * SEC), ...over,
  });
  await allow('instant challenge (design 120 s)', () => create(dbA));
  await allow('instant challenge with an auto-id and 0 s design', () => challenge(dbA, A, battle({ createdAt: serverTimestamp(), designSeconds: 0 }), { id: doc(collection(dbA, 'battles')).id }));
  await allow('instant challenge without a message', () => { const b = battle({ createdAt: serverTimestamp() }); delete b.message; return challenge(dbA, A, b); });
  await allow('scheduled challenge tonight (+1 h)', () => challenge(dbA, A, noDesign(battle({ createdAt: serverTimestamp(), ...sched(now() + 3600 * SEC) }))));
  await allow('scheduled challenge at the minimum lead (+10 min)', () => challenge(dbA, A, noDesign(battle({ createdAt: serverTimestamp(), ...sched(now() + 600 * SEC) }))));
  await deny('scheduled start only 5 min out', () => challenge(dbA, A, noDesign(battle({ createdAt: serverTimestamp(), ...sched(now() + 300 * SEC) }))));
  await deny('scheduled start 8 days out', () => challenge(dbA, A, noDesign(battle({ createdAt: serverTimestamp(), ...sched(now() + 8 * 86400 * SEC) }))));
  await deny('scheduled with a 2 h fight window', () => challenge(dbA, A, noDesign(battle({ createdAt: serverTimestamp(), ...sched(now() + 3600 * SEC, { fightEndsAt: T(now() + 3 * 3600 * SEC) }) }))));
  await deny('scheduled without fightEndsAt', () => { const b = noDesign(battle({ createdAt: serverTimestamp(), ...sched(now() + 3600 * SEC) })); delete b.fightEndsAt; return challenge(dbA, A, b); });
  await deny('instant carrying a startAt', () => create(dbA, { startAt: T(now() + 120 * SEC), fightEndsAt: T(now() + 1020 * SEC) }));
  await deny('instant with a 60 s design window (not an option)', () => create(dbA, { designSeconds: 60 }));
  await deny('challenge written as someone else', () => create(dbE));
  await deny('challenge yourself', () => create(dbA, { opponent: A, players: [A, A], names: { [A]: 'Alice' }, townHalls: { [A]: 3 } }));
  await deny('players in the wrong order', () => create(dbA, { players: [B, A] }));
  await deny('players with a third member', () => create(dbA, { players: [A, B, E] }));
  await deny('status accepted at create', () => create(dbA, { status: 'accepted' }));
  await deny('unknown mode', () => create(dbA, { mode: 'blitz' }));
  await deny('unknown theme', () => create(dbA, { theme: 'dusk' }));
  await deny('141-char message', () => create(dbA, { message: 'x'.repeat(141) }));
  await deny('pre-filled results', () => create(dbA, { results: { [A]: seededResult(10, 10) } }));
  await deny('pre-filled ready', () => create(dbA, { ready: { [A]: true } }));
  await deny('pre-set winner', () => create(dbA, { winner: A }));
  await deny('backdated createdAt (dodges the respond deadline)', () => challenge(dbA, A, battle({ createdAt: T(now() - 3600 * SEC) })));
  await deny('names map with a third uid', () => create(dbA, { names: { [A]: 'Alice', [B]: 'Bobby', [E]: 'Evelyn' } }));
  await deny('Town Hall 0 on the card', () => create(dbA, { townHalls: { [A]: 0, [B]: 3 } }));
  await deny('opponent with no player profile', () => create(dbA, { opponent: 'ghost', players: [A, 'ghost'], names: { [A]: 'Alice' }, townHalls: { [A]: 3 } }));
  // The id ends up in the BATTLES screen's markup: plain characters only (stored-XSS review finding).
  const xssId = 'zz"><img src=x onerror="window.top.xssPwned=1">';
  await deny('battle id carrying HTML markup', () => challenge(dbA, A, battle({ createdAt: serverTimestamp() }), { id: xssId }));
  await deny('battle id with a space', () => challenge(dbA, A, battle({ createdAt: serverTimestamp() }), { id: 'a b' }));
  await deny('battle id of 65 characters', () => challenge(dbA, A, battle({ createdAt: serverTimestamp() }), { id: 'x'.repeat(65) }));
  await allow('battle id of 64 [A-Za-z0-9_-] characters', () => challenge(dbA, A, battle({ createdAt: serverTimestamp() }), { id: 'Ab0_-'.repeat(12) + 'abcd' }));
  // One challenge per CHALLENGE_COOLDOWN (flooding a player pushed their real battles out of view).
  await seed(`players/${A}`, profile(A));
  await deny('challenge without the lastChallengeAt stamp in the same batch', () => setDoc(doc(dbA, 'battles', newId()), battle({ createdAt: serverTimestamp() })));
  await deny('challenge stamped with a client time', () => {
    const b = writeBatch(dbA);
    const id = newId();
    b.set(doc(dbA, 'battles', id), battle({ createdAt: serverTimestamp() }));
    b.update(doc(dbA, 'players', A), { lastChallengeAt: T(now() - 3600 * SEC), lastChallengeId: id });
    return b.commit();
  });
  // Round-2 review: the cooldown held per BATCH - one batch of 499 creates shared one stamp.
  // Each case starts from a profile with no stamp, so a deny is the binding's, not the cooldown's.
  const batchOf = async (n, stampId = null, stamp = { lastChallengeAt: serverTimestamp() }) => {
    await seed(`players/${A}`, profile(A));
    const b = writeBatch(dbA);
    const ids = Array.from({ length: n }, () => newId());
    ids.forEach(id => b.set(doc(dbA, 'battles', id), battle({ createdAt: serverTimestamp() })));
    b.update(doc(dbA, 'players', A), { ...stamp, ...(stampId === null ? {} : { lastChallengeId: stampId === 'first' ? ids[0] : stampId }) });
    return b.commit();
  };
  await deny('stamp without lastChallengeId (one stamp, no battle named)', () => batchOf(1));
  await deny('stamp naming ANOTHER battle id', () => batchOf(1, 'someOtherBattle'));
  await deny('TWO challenges and one stamp in a single batch (the batched flood)', () => batchOf(2, 'first'));
  await deny('ten challenges and one stamp in a single batch', () => batchOf(10, 'first'));
  check((await raw(`players/${A}`))?.lastChallengeAt === undefined, 'nothing from the refused batch landed (no stamp on the profile)');
  await allow('one challenge + one stamp naming it (as createChallenge writes it)', () => batchOf(1, 'first'));
  await seed(`players/${A}`, profile(A));
  await allow('first challenge (no earlier stamp)', () => challenge(dbA, A, battle({ createdAt: serverTimestamp() }), { keepCooldown: true }));
  await deny('a second challenge right after it (inside the cooldown)', () => challenge(dbA, A, battle({ createdAt: serverTimestamp() }), { keepCooldown: true }));
  await seed(`players/${A}`, profile(A, { lastChallengeAt: T(now() - 5 * SEC) }));
  await deny('a challenge 5 s after the last one', () => challenge(dbA, A, battle({ createdAt: serverTimestamp() }), { keepCooldown: true }));
  await seed(`players/${A}`, profile(A, { lastChallengeAt: T(now() - 11 * SEC) }));
  await allow('a challenge 11 s after the last one', () => challenge(dbA, A, battle({ createdAt: serverTimestamp() }), { keepCooldown: true }));
  await seed(`players/${A}`, profile(A));
}

// ================================================================ battles: read / list
section('battles: read + list');
{
  const id = await seedBattle(battle());
  await allow('participant gets the battle', () => getDoc(bref(dbB, id)));
  await deny('outsider gets the battle', () => getDoc(bref(dbE, id)));
  await deny('signed-out get', () => getDoc(bref(dbAnon, id)));
  await allow('list with players array-contains me, createdAt desc, limit 30', () => getDocs(query(collection(dbA, 'battles'), where('players', 'array-contains', A), orderBy('createdAt', 'desc'), limit(30))));
  await allow('live list: players array-contains me, createdAt >= 8 days ago, no limit (BattleService.listen)', () => getDocs(query(collection(dbA, 'battles'), where('players', 'array-contains', A), where('createdAt', '>=', T(now() - 8 * 86400 * SEC)), orderBy('createdAt', 'desc'))));
  await deny('list without array-contains', () => getDocs(query(collection(dbA, 'battles'), orderBy('createdAt', 'desc'), limit(30))));
  await deny('list another player\'s battles (array-contains bob, signed in as eve)', () => getDocs(query(collection(dbE, 'battles'), where('players', 'array-contains', B))));
  await deny('list by challenger == alice (not a players filter)', () => getDocs(query(collection(dbA, 'battles'), where('challenger', '==', A))));
  await deny('delete a battle', () => deleteDoc(bref(dbA, id)));
}

// ================================================================ battles: accept / decline / cancel
section('battles: accept, decline, cancel');
{
  const acceptInstant = (db, id, designSeconds = 120, over = {}) => updateDoc(bref(db, id), {
    status: 'accepted', acceptedAt: serverTimestamp(),
    startAt: T(now() + designSeconds * SEC), fightEndsAt: T(now() + (designSeconds + 900) * SEC), ...over,
  });
  let id = await seedBattle(battle());
  await deny('challenger accepts own challenge', () => acceptInstant(dbA, id));
  await deny('outsider accepts', () => acceptInstant(dbE, id));
  await deny('accept with startAt 10 min past the design window', () => acceptInstant(dbB, id, 120, { startAt: T(now() + 720 * SEC), fightEndsAt: T(now() + 1620 * SEC) }));
  await deny('accept with startAt already in the past', () => acceptInstant(dbB, id, 120, { startAt: T(now() - 300 * SEC), fightEndsAt: T(now() + 600 * SEC) }));
  await deny('accept with a 30 min fight window', () => acceptInstant(dbB, id, 120, { fightEndsAt: T(now() + 1920 * SEC) }));
  await deny('accept with a client-chosen acceptedAt', () => acceptInstant(dbB, id, 120, { acceptedAt: T(now() - 60 * SEC) }));
  await deny('accept that also writes a result', () => acceptInstant(dbB, id, 120, { [`results.${B}`]: seededResult(10, 10) }));
  await deny('accept that renames the challenger', () => acceptInstant(dbB, id, 120, { [`names.${A}`]: 'Loser' }));
  await deny('accept without startAt (instant)', () => updateDoc(bref(dbB, id), { status: 'accepted', acceptedAt: serverTimestamp() }));
  await allow('opponent accepts (startAt = now + design, fightEndsAt = +900 s, own name/TH on the card)', () => acceptInstant(dbB, id, 120, { [`names.${B}`]: 'Bobby', [`townHalls.${B}`]: 4 }));
  await deny('accept again once accepted', () => acceptInstant(dbB, id));
  id = await seedBattle(battle({ designSeconds: 0 }));
  await allow('accept a 0 s design challenge (startAt ~ now)', () => acceptInstant(dbB, id, 0));
  id = await seedBattle(battle({ createdAt: T(now() - 11 * 60 * SEC) }));
  await deny('accept an instant challenge after its 10 min respond deadline', () => acceptInstant(dbB, id));
  await allow('decline still allowed on an expired pending challenge', () => updateDoc(bref(dbB, id), { status: 'declined' }));

  const schedStart = now() + 3600 * SEC;
  id = await seedBattle(noDesign(battle({ mode: 'scheduled', theme: 'night', startAt: T(schedStart), fightEndsAt: T(schedStart + 3600 * SEC) })));
  await deny('scheduled accept that moves startAt', () => updateDoc(bref(dbB, id), { status: 'accepted', acceptedAt: serverTimestamp(), startAt: T(schedStart - 1800 * SEC), fightEndsAt: T(schedStart + 1800 * SEC) }));
  await allow('opponent accepts a scheduled battle', () => updateDoc(bref(dbB, id), { status: 'accepted', acceptedAt: serverTimestamp() }));
  const lateStart = now() + 30 * SEC;
  id = await seedBattle(battle({ mode: 'scheduled', startAt: T(lateStart), fightEndsAt: T(lateStart + 3600 * SEC), designSeconds: 0 }));
  await deny('scheduled accept inside the last minute before start', () => updateDoc(bref(dbB, id), { status: 'accepted', acceptedAt: serverTimestamp() }));

  id = await seedBattle(battle());
  await deny('challenger declines', () => updateDoc(bref(dbA, id), { status: 'declined' }));
  await deny('decline with an extra key', () => updateDoc(bref(dbB, id), { status: 'declined', message: 'lol' }));
  await deny('opponent cancels', () => updateDoc(bref(dbB, id), { status: 'cancelled' }));
  await deny('outsider cancels', () => updateDoc(bref(dbE, id), { status: 'cancelled' }));
  await deny('challenger jumps straight to finished', () => updateDoc(bref(dbA, id), { status: 'finished', winner: A, resolvedAt: serverTimestamp() }));
  await allow('challenger cancels a pending challenge', () => updateDoc(bref(dbA, id), { status: 'cancelled' }));
  await deny('re-open a cancelled challenge', () => updateDoc(bref(dbB, id), { status: 'accepted', acceptedAt: serverTimestamp(), startAt: T(now() + 120 * SEC), fightEndsAt: T(now() + 1020 * SEC) }));
  id = await seedBattle(battle());
  await allow('opponent declines', () => updateDoc(bref(dbB, id), { status: 'declined' }));
  id = await seedBattle(acceptedBattle(100));
  await deny('cancel an accepted battle', () => updateDoc(bref(dbA, id), { status: 'cancelled' }));
}

// ================================================================ battles: ready
section('battles: ready (instant design phase)');
{
  let id = await seedBattle(acceptedBattle(200));
  const old = await raw(`battles/${id}`);
  await deny('mark the OTHER player ready', () => updateDoc(bref(dbA, id), { [`ready.${B}`]: true }));
  await deny('mark BOTH players ready in one write', () => updateDoc(bref(dbA, id), { [`ready.${A}`]: true, [`ready.${B}`]: true, startAt: T(now()), fightEndsAt: T(now() + 900 * SEC) }));
  await deny('ready:false is not a ready', () => updateDoc(bref(dbA, id), { [`ready.${A}`]: false }));
  await deny('pull startAt forward while only one is ready', () => updateDoc(bref(dbA, id), { [`ready.${A}`]: true, startAt: T(now()), fightEndsAt: T(now() + 900 * SEC) }));
  await allow('alice ready', () => updateDoc(bref(dbA, id), { [`ready.${A}`]: true }));
  await deny('alice ready twice (no change)', () => updateDoc(bref(dbA, id), { [`ready.${A}`]: true }));
  await deny('bob ready + startAt pushed LATER', () => updateDoc(bref(dbB, id), { [`ready.${B}`]: true, startAt: T(old.startAt.toMillis() + 60 * SEC), fightEndsAt: T(old.startAt.toMillis() + 960 * SEC) }));
  await deny('bob ready + startAt pulled with a long fight window', () => updateDoc(bref(dbB, id), { [`ready.${B}`]: true, startAt: T(now()), fightEndsAt: T(now() + 3600 * SEC) }));
  await deny('bob ready + startAt 5 min in the past', () => updateDoc(bref(dbB, id), { [`ready.${B}`]: true, startAt: T(now() - 300 * SEC), fightEndsAt: T(now() + 600 * SEC) }));
  await allow('bob ready: both ready -> startAt pulled to now in the same transaction', () => runTransaction(dbB, async tx => {
    const snap = await tx.get(bref(dbB, id));
    const b = snap.data();
    const both = !!b.ready[A];
    const t = now();
    tx.update(bref(dbB, id), both ? { [`ready.${B}`]: true, startAt: T(t), fightEndsAt: T(t + 900 * SEC) } : { [`ready.${B}`]: true });
  }));
  {
    // startAt 30 s away: "now + 100 s" is inside the clock slack but LATER than the agreed start.
    const id2 = await seedBattle(acceptedBattle(30, { ready: { [A]: true } }));
    await deny('both ready but startAt moved later (still within clock slack)', () => updateDoc(bref(dbB, id2), { [`ready.${B}`]: true, startAt: T(now() + 100 * SEC), fightEndsAt: T(now() + 1000 * SEC) }));
    await allow('both ready, startAt pulled to now', () => updateDoc(bref(dbB, id2), { [`ready.${B}`]: true, startAt: T(now()), fightEndsAt: T(now() + 900 * SEC) }));
  }
  await deny('ready after startAt (fight phase)', async () => {
    const id2 = await seedBattle(acceptedBattle(-30));
    return updateDoc(bref(dbA, id2), { [`ready.${A}`]: true });
  });
  await deny('ready on a scheduled battle', async () => {
    const id2 = await seedBattle(acceptedBattle(1800, { mode: 'scheduled' }));
    return updateDoc(bref(dbA, id2), { [`ready.${A}`]: true });
  });
  await deny('ready on a pending battle', async () => {
    const id2 = await seedBattle(battle());
    return updateDoc(bref(dbA, id2), { [`ready.${A}`]: true });
  });
  await deny('outsider ready', async () => {
    const id2 = await seedBattle(acceptedBattle(200));
    return updateDoc(bref(dbE, id2), { [`ready.${E}`]: true });
  });
}

// ================================================================ battles: snapshot
section('battles: snapshot (city lock)');
await resetWorld();
{
  const snapTx = (db, id, uid, tamper) => runTransaction(db, async tx => {
    const c = (await tx.get(doc(db, 'cities', uid))).data();
    const s = { layout: c.layout, townHall: c.townHall, name: c.name, rev: c.rev, lockedAt: serverTimestamp() };
    tx.update(bref(db, id), { [`snapshots.${uid}`]: tamper ? tamper(s) : s });
  });
  let id = await seedBattle(acceptedBattle(120));
  await deny('snapshot before startAt (design phase)', () => snapTx(dbA, id, A));
  id = await seedBattle(acceptedBattle(-5));
  await allow('own snapshot at startAt (layout == live city)', () => snapTx(dbA, id, A));
  await deny('overwrite an existing snapshot', () => snapTx(dbA, id, A));
  await deny('the OTHER player\'s city 5 s after startAt (inside LOCK_GRACE: its owner may still be saving)', () => snapTx(dbA, id, B));
  id = await seedBattle(acceptedBattle(-20));
  await allow('opponent locks the OTHER player\'s city after LOCK_GRACE (integrity by equality)', () => snapTx(dbA, id, B));
  id = await seedBattle(acceptedBattle(-20));
  await deny('tampered snapshot: a defense removed', () => snapTx(dbB, id, A, s => ({ ...s, layout: { ...s.layout, buildings: s.layout.buildings.slice(0, 2) } })));
  await deny('tampered snapshot: roads changed', () => snapTx(dbB, id, A, s => ({ ...s, layout: { ...s.layout, roads: [] } })));
  await deny('snapshot with a stale rev', () => snapTx(dbA, id, A, s => ({ ...s, rev: s.rev - 1 })));
  await deny('snapshot with a wrong Town Hall', () => snapTx(dbA, id, A, s => ({ ...s, townHall: 1 })));
  await deny('snapshot with lockedAt an hour ago', () => snapTx(dbA, id, A, s => ({ ...s, lockedAt: T(now() - 3600 * SEC) })));
  await deny('snapshot with an extra key', () => snapTx(dbA, id, A, s => ({ ...s, easy: true })));
  await deny('snapshot of an outsider\'s city', () => runTransaction(dbA, async tx => {
    tx.update(bref(dbA, id), { [`snapshots.${E}`]: snapOf(E) });
  }));
  await deny('outsider takes a snapshot', () => snapTx(dbE, id, A));
  await deny('both snapshots in one write inside LOCK_GRACE', async () => {
    const id2 = await seedBattle(acceptedBattle(-5));
    return runTransaction(dbA, async tx => {
      const ca = (await tx.get(doc(dbA, 'cities', A))).data();
      const cb = (await tx.get(doc(dbA, 'cities', B))).data();
      const s = c => ({ layout: c.layout, townHall: c.townHall, name: c.name, rev: c.rev, lockedAt: serverTimestamp() });
      tx.update(bref(dbA, id2), { [`snapshots.${A}`]: s(ca), [`snapshots.${B}`]: s(cb) });
    });
  });
  await allow('both snapshots in one write after LOCK_GRACE (e.g. a lock sweep)', () => runTransaction(dbA, async tx => {
    const ca = (await tx.get(doc(dbA, 'cities', A))).data();
    const cb = (await tx.get(doc(dbA, 'cities', B))).data();
    const s = c => ({ layout: c.layout, townHall: c.townHall, name: c.name, rev: c.rev, lockedAt: serverTimestamp() });
    tx.update(bref(dbA, id), { [`snapshots.${A}`]: s(ca), [`snapshots.${B}`]: s(cb) });
  }));
  // A maxed-out city (400 buildings, 450 roads) must still lock: the layout equality is one
  // deep compare, well inside the rules engine's limits.
  const big = {
    ...layoutFor(A),
    buildings: Array.from({ length: 400 }, (_, i) => ({ id: 'b' + i.toString(36), t: i % 7 ? 'cannon_tower' : 'tree', gx: (i % 29) - 14, gz: Math.floor(i / 29) - 7, l: 1 + (i % 12), st: i % 5, rot: 0 })),
    roads: Array.from({ length: 450 }, (_, i) => `${(i % 30) - 15},${Math.floor(i / 30) - 7}`),
  };
  await seed(`cities/${A}`, cityFor(A, { rev: 7, layout: big }));
  id = await seedBattle(acceptedBattle(-20));
  await allow('lock a maxed city (400 buildings, 450 roads)', () => snapTx(dbB, id, A));
  await deny('tampered maxed city (one building level changed)', async () => {
    const id2 = await seedBattle(acceptedBattle(-20));
    return snapTx(dbB, id2, A, s => { const l = structuredClone(s.layout); l.buildings[399].l = 1; l.buildings[398].l = 1; return { ...s, layout: l }; });
  });
  const th5 = path.join(ROOT, 'tools/online/fixtures/th5-city.cloud.json');
  if (existsSync(th5)) {
    const fx = JSON.parse(readFileSync(th5, 'utf8'));
    await allow('push the real TH5 fixture city (rev 7 -> 8)', () => updateDoc(doc(dbA, 'cities', A), { rev: 8, townHall: fx.townHall, layout: fx.layout, holdings: fx.holdings, updatedAt: serverTimestamp(), updatedBy: 'game', writerId: 'sessA' }));
    id = await seedBattle(acceptedBattle(-20));
    await allow('lock the real TH5 fixture city', () => snapTx(dbB, id, A));
  }
  await seed(`cities/${A}`, cityFor(A));
  id = await seedBattle(battle());
  await deny('snapshot on a pending battle', () => snapTx(dbA, id, A));
  id = await seedBattle({ ...acceptedBattle(-2000), status: 'finished', winner: 'draw', resolvedAt: T(now()) });
  await deny('snapshot on a finished battle', () => snapTx(dbA, id, A));
}

// ================================================================ battles: attempt
section('battles: attempt');
{
  const attempt = (db, uid, id, over) => updateDoc(bref(db, id), { [`attempts.${uid}`]: over || { startedAt: serverTimestamp() } });
  let id = await seedBattle(acceptedBattle(-30, { snapshots: { [A]: snapOf(A) } }));
  await deny('attempt before both cities are locked', () => attempt(dbA, A, id));
  id = await seedBattle(acceptedBattle(-30, { snapshots: bothSnaps() }));
  await deny('attempt for the other player', () => attempt(dbA, B, id));
  await deny('attempt with a client startedAt', () => attempt(dbA, A, id, { startedAt: T(now() - 5 * SEC) }));
  await deny('attempt with an extra key', () => attempt(dbA, A, id, { startedAt: serverTimestamp(), lives: 99 }));
  await deny('outsider attempt', () => attempt(dbE, E, id));
  await allow('alice begins her attempt in the fight window', () => attempt(dbA, A, id));
  await deny('second attempt (retry after a bad raid)', () => attempt(dbA, A, id));
  await allow('bob begins his attempt', () => attempt(dbB, B, id));
  id = await seedBattle(acceptedBattle(60, { snapshots: bothSnaps() }));
  await deny('attempt before startAt', () => attempt(dbA, A, id));
  id = await seedBattle(acceptedBattle(-901, { snapshots: bothSnaps() }));
  await deny('attempt after fightEndsAt', () => attempt(dbA, A, id));
  id = await seedBattle({ ...acceptedBattle(-30, { snapshots: bothSnaps() }), status: 'finished', winner: 'draw' });
  await deny('attempt on a finished battle', () => attempt(dbA, A, id));
}

// ================================================================ battles: result
section('battles: result');
{
  const fight = (offset = -300, over = {}) => seedBattle(acceptedBattle(offset, { snapshots: bothSnaps(), attempts: { [A]: attemptAt(), [B]: attemptAt() }, ...over }));
  const submit = (db, uid, id, r) => updateDoc(bref(db, id), { [`results.${uid}`]: r });
  let id = await fight();
  await deny('stars do not match the percentage (70% claiming 3 stars)', () => submit(dbA, A, id, { ...result(7, 10), stars: 3 }));
  await deny('percentage does not match destroyed/total (3/10 claiming 90%)', () => submit(dbA, A, id, { ...result(3, 10), percentage: 90, stars: 2 }));
  await deny('percentage 101', () => submit(dbA, A, id, { ...result(10, 10), percentage: 101 }));
  await deny('destroyed > total', () => submit(dbA, A, id, result(11, 10)));
  await deny('duration 700 s (over the raid limit + 60)', () => submit(dbA, A, id, result(5, 10, { durationSec: 700 })));
  await deny('negative duration', () => submit(dbA, A, id, result(5, 10, { durationSec: -1 })));
  await deny('unknown outcome', () => submit(dbA, A, id, result(5, 10, { outcome: 'hacked' })));
  await deny('victory at 50%', () => submit(dbA, A, id, result(5, 10, { outcome: 'victory' })));
  await deny('negative loot', () => submit(dbA, A, id, result(5, 10, { loot: { cash: -5, iron: 0, wood: 0 } })));
  await deny('loot with gems', () => submit(dbA, A, id, result(5, 10, { loot: { cash: 1, iron: 0, wood: 0, gems: 50 } })));
  await deny('client-chosen finishedAt', () => submit(dbA, A, id, result(5, 10, { finishedAt: T(now() - 2 * SEC) })));
  await deny('extra result key', () => submit(dbA, A, id, result(5, 10, { bonus: 1 })));
  await deny('result written for the opponent', () => submit(dbA, B, id, result(0, 10)));
  await deny('result that also flips status', () => updateDoc(bref(dbA, id), { [`results.${A}`]: result(5, 10), status: 'finished' }));
  await allow('valid result (7/10 -> 70%, 2 stars, retreat)', () => submit(dbA, A, id, result(7, 10)));
  await deny('second result (double submit)', () => submit(dbA, A, id, result(10, 10)));
  await allow('rounded percentage accepted (199/200 -> 100%, victory)', () => submit(dbB, B, id, result(199, 200)));
  id = await fight(-300, { attempts: { [B]: attemptAt() } });
  await deny('result without an attempt', () => submit(dbA, A, id, result(7, 10)));
  for (const [d, t, outcome] of [[1, 8, 'busted'], [1, 40, 'crash'], [0, 0, 'timeout'], [1, 3, 'retreat'], [2, 3, 'timeout']]) {
    const idN = await fight();
    await allow(`JS-rounded percentage ${d}/${t} -> ${result(d, t).percentage}% (${outcome}) accepted`, () => submit(dbA, A, idN, result(d, t, { outcome })));
  }
  id = await fight(-900 - 600);   // fightEndsAt 600 s ago: still inside the 660 s grace
  await allow('result inside the grace period after fightEndsAt', () => submit(dbA, A, id, result(4, 10)));
  id = await fight(-900 - 700);   // 700 s after fightEndsAt: too late
  await deny('result after fightEndsAt + grace', () => submit(dbA, A, id, result(4, 10)));
  id = await fight(-300, { status: 'finished', winner: 'draw' });
  await deny('result on a finished battle', () => submit(dbA, A, id, result(4, 10)));
}

// ================================================================ battles: resolve
section('battles: resolve (winner computed in the rules)');
{
  const done = (resA, resB, offset = -400, over = {}) => {
    const results = {};
    if (resA) results[A] = resA;
    if (resB) results[B] = resB;
    return seedBattle(acceptedBattle(offset, { snapshots: bothSnaps(), attempts: { [A]: attemptAt(), [B]: attemptAt() }, results, ...over }));
  };
  const resolve = (db, id, winner, over = {}) => updateDoc(bref(db, id), { status: 'finished', winner, resolvedAt: serverTimestamp(), ...over });
  let id = await done(seededResult(7, 10), seededResult(3, 10));
  await deny('loser crowns themselves', () => resolve(dbB, id, B));
  await deny('call it a draw when it is not', () => resolve(dbB, id, 'draw'));
  await deny('outsider resolves', () => resolve(dbE, id, A));
  await deny('resolve with a client resolvedAt', () => resolve(dbB, id, A, { resolvedAt: T(now() - 2 * SEC) }));
  await deny('resolve that rewrites a result', () => resolve(dbB, id, A, { [`results.${B}`]: seededResult(10, 10) }));
  await deny('resolve without a winner', () => updateDoc(bref(dbB, id), { status: 'finished', resolvedAt: serverTimestamp() }));
  await allow('stars decide (2 stars beats 1) - loser resolves honestly', () => resolve(dbB, id, A));
  await deny('resolve an already finished battle', () => resolve(dbA, id, A));
  id = await done(seededResult(7, 10), seededResult(13, 20));   // 70% vs 65%, both 2 stars
  await deny('same stars: lower percentage cannot win', () => resolve(dbA, id, B));
  await allow('same stars: higher percentage wins', () => resolve(dbA, id, A));
  id = await done(seededResult(5, 10, { durationSec: 300 }), seededResult(10, 20, { durationSec: 200 }));
  await deny('same stars + %: slower raid cannot win', () => resolve(dbA, id, A));
  await allow('same stars + %: lower durationSec wins', () => resolve(dbA, id, B));
  id = await done(seededResult(5, 10, { durationSec: 200 }), seededResult(10, 20, { durationSec: 200 }));
  await deny('dead heat: nobody wins', () => resolve(dbA, id, A));
  await allow('dead heat -> draw', () => resolve(dbA, id, 'draw'));
  id = await done(seededResult(7, 10), null, -300);
  await deny('one result, fight still running: too early to resolve', () => resolve(dbA, id, A));
  id = await done(seededResult(7, 10), null, -900 - 600);
  await deny('one result, inside the grace period: too early', () => resolve(dbA, id, A));
  id = await done(seededResult(0, 10, { durationSec: 30 }), null, -900 - 700);
  await deny('missing result is 0 stars / 0% / infinite time: no-show cannot win', () => resolve(dbB, id, B));
  await deny('0% raid vs no-show is not a draw (time breaks the tie)', () => resolve(dbB, id, 'draw'));
  await allow('after fightEndsAt + grace, the 0% raider beats the no-show', () => resolve(dbB, id, A));
  id = await done(null, null, -900 - 700);
  await deny('nobody has a result: a draw is refused (it would pay +5 each)', () => resolve(dbA, id, 'draw'));
  await deny('nobody has a result: nobody wins either', () => resolve(dbA, id, A));
  await allow('nobody has a result (both attempted, none arrived): void after the grace period', () => resolve(dbA, id, 'void'));
  id = await done(null, null, -900 - 700, { mode: 'scheduled', fightEndsAt: T(now() - 700 * SEC), startAt: T(now() - 4300 * SEC) });
  await allow('scheduled battle resolves after its own fightEndsAt + grace', () => resolve(dbB, id, 'void'));
  // The verdict is fixed as soon as the fight window is over and no started raid owes a result.
  id = await done(null, null, -900 - 5, { attempts: {} });
  await deny('nobody attempted, fight over: void, not a draw', () => resolve(dbA, id, 'draw'));
  await allow('nobody attempted: void right at fightEndsAt (no 11-minute wait)', () => resolve(dbA, id, 'void'));
  id = await done(null, null, -300, { attempts: {} });
  await deny('nobody attempted yet, fight still running: too early', () => resolve(dbA, id, 'void'));
  id = await done(seededResult(3, 10), null, -900 - 20, { attempts: { [A]: attemptAt() } });
  await deny('A has a result, B never attempted, fight over: B cannot win', () => resolve(dbB, id, B));
  await allow('A has a result, B never attempted, fight over: A wins at once (nothing else can arrive)', () => resolve(dbB, id, A));
  id = await done(seededResult(3, 10), null, -900 - 20);
  await deny('A has a result, B attempted without one, fight over 20 s: B\'s result may still come', () => resolve(dbA, id, A));
  id = await done(seededResult(7, 10), seededResult(3, 10), -300, { status: 'pending' });
  await deny('resolve a battle that was never accepted', () => resolve(dbA, id, A));
}

// ================================================================ battles: settle
section('battles: settle');
{
  await seed(`players/${A}`, profile(A));
  await seed(`players/${B}`, profile(B));
  const fin = over => seedBattle({ ...acceptedBattle(-1000), status: 'finished', winner: A, resolvedAt: T(now() - 5 * SEC), ...over });
  // settled.<me> + trophyChange.<me>, with the players record step in the same batch.
  const settleWith = (db, uid, id, prof, battleUpd) => {
    const b = writeBatch(db);
    if (prof) b.update(doc(db, 'players', uid), prof);
    b.update(bref(db, id), battleUpd);
    return b.commit();
  };
  const winA = (id, over = {}) => settleWith(dbA, A, id, { wins: 1, trophies: 30, lastSettled: id }, { [`settled.${A}`]: true, [`trophyChange.${A}`]: 30, ...over });
  let id = await fin();
  await deny('settle the opponent\'s key', () => settleWith(dbA, A, id, null, { [`settled.${B}`]: true, [`trophyChange.${B}`]: -20 }));
  await deny('settle with false', () => winA(id, { [`settled.${A}`]: false }));
  await deny('settle that changes the winner', () => settleWith(dbB, B, id, { wins: 1, trophies: 30, lastSettled: id }, { [`settled.${B}`]: true, [`trophyChange.${B}`]: 30, winner: B }));
  await deny('outsider settles', () => settleWith(dbE, E, id, null, { [`settled.${E}`]: true, [`trophyChange.${E}`]: 0 }));
  await deny('settle without trophyChange', () => settleWith(dbA, A, id, { wins: 1, trophies: 30, lastSettled: id }, { [`settled.${A}`]: true }));
  await deny('settle with the opponent\'s trophyChange too', () => winA(id, { [`trophyChange.${B}`]: 0 }));
  await deny('winner sets only the flag (no record step)', () => settleWith(dbA, A, id, null, { [`settled.${A}`]: true, [`trophyChange.${A}`]: 30 }));
  await allow('winner settles own key (+30, wins+1, lastSettled, trophyChange 30 - one batch)', () => winA(id));
  await deny('settle twice', () => winA(id));
  await deny('loser settles the flag and 0 without the loss (skips the -20)', () => settleWith(dbB, B, id, null, { [`settled.${B}`]: true, [`trophyChange.${B}`]: 0 }));
  await allow('loser at 0 trophies settles: losses+1, trophies stay 0, trophyChange 0', () => settleWith(dbB, B, id, { losses: 1, trophies: 0, lastSettled: id }, { [`settled.${B}`]: true, [`trophyChange.${B}`]: 0 }));
  const done = await raw(`battles/${id}`);
  check(done && done.settled[A] === true && done.settled[B] === true && done.trophyChange[A] === 30 && done.trophyChange[B] === 0, 'battle records what each settle moved (A +30, B 0 at the floor)', done && done.trophyChange);
  id = await seedBattle(acceptedBattle(-100));
  await deny('settle an unfinished battle', () => settleWith(dbA, A, id, null, { [`settled.${A}`]: true, [`trophyChange.${A}`]: 0 }));
  id = await fin({ winner: 'void' });
  await allow('void battle: A settles with only the flag and trophyChange 0', () => settleWith(dbA, A, id, null, { [`settled.${A}`]: true, [`trophyChange.${A}`]: 0 }));
  await allow('void battle: B the same', () => settleWith(dbB, B, id, null, { [`settled.${B}`]: true, [`trophyChange.${B}`]: 0 }));
  const pa = await raw(`players/${A}`); const pb = await raw(`players/${B}`);
  check(pa.trophies === 30 && pa.wins === 1 && pa.draws === 0 && pb.trophies === 0 && pb.losses === 1 && pb.draws === 0,
    'void settle changed no counter and no trophies', { A: [pa.trophies, pa.wins, pa.draws], B: [pb.trophies, pb.losses, pb.draws] });
}

// ================================================================ full client flow (spec 7.3 / 7.4)
section('client flow: instant battle end to end, exactly as BattleService writes it');
await resetWorld();
{
  let id = null;
  await allow('A: createChallenge (auto-id, createdAt serverTimestamp, design 120 s, lastChallengeAt stamp in one batch)', async () => {
    id = doc(collection(dbA, 'battles')).id;
    await challenge(dbA, A, {
      mode: 'instant', theme: 'night', status: 'pending', challenger: A, opponent: B, players: [A, B],
      names: { [A]: 'Alice', [B]: 'Bobby' }, townHalls: { [A]: 3, [B]: 3 }, message: 'tonight we ride',
      createdAt: serverTimestamp(), designSeconds: 120, ready: {}, snapshots: {}, attempts: {}, results: {}, settled: {},
    }, { id, keepCooldown: true });
  });
  await allow('B: listen() query sees it', () => getDocs(query(collection(dbB, 'battles'), where('players', 'array-contains', B), orderBy('createdAt', 'desc'), limit(30))));
  await allow('B: accept (transaction)', () => runTransaction(dbB, async tx => {
    const b = (await tx.get(bref(dbB, id))).data();
    const start = now() + b.designSeconds * SEC;
    tx.update(bref(dbB, id), { status: 'accepted', acceptedAt: serverTimestamp(), startAt: T(start), fightEndsAt: T(start + 900 * SEC) });
  }));
  await deny('A: attack during design (no snapshots, before startAt)', () => updateDoc(bref(dbA, id), { [`attempts.${A}`]: { startedAt: serverTimestamp() } }));
  await allow('A: city push during design (rev 1 -> 2)', () => updateDoc(doc(dbA, 'cities', A), { rev: 2, updatedAt: serverTimestamp(), updatedBy: 'game', writerId: 'sessA', layout: { ...layoutFor(A), roads: ['1,2', '1,3', '2,3', '2,4'] }, lastChange: { by: 'game', summary: '', at: serverTimestamp() } }));
  await allow('A: setReady', () => updateDoc(bref(dbA, id), { [`ready.${A}`]: true }));
  await allow('B: setReady pulls startAt to now (both ready)', () => runTransaction(dbB, async tx => {
    const b = (await tx.get(bref(dbB, id))).data();
    const t = now();
    tx.update(bref(dbB, id), b.ready[A] ? { [`ready.${B}`]: true, startAt: T(t), fightEndsAt: T(t + 900 * SEC) } : { [`ready.${B}`]: true });
  }));
  await new Promise(r => setTimeout(r, 1200)); // let request.time pass the pulled startAt
  const ensure = (db, uid) => runTransaction(db, async tx => {
    const b = (await tx.get(bref(db, id))).data();
    const c = (await tx.get(doc(db, 'cities', uid))).data();
    if (b.snapshots[uid]) return;
    tx.update(bref(db, id), { [`snapshots.${uid}`]: { layout: c.layout, townHall: c.townHall, name: c.name, rev: c.rev, lockedAt: serverTimestamp() } });
  });
  await allow('A: ensureSnapshots locks A (own city, at startAt)', () => ensure(dbA, A));
  await deny('A: ensureSnapshots may NOT lock B yet (inside LOCK_GRACE)', () => ensure(dbA, B));
  await allow('B: ensureSnapshots locks B (own city)', () => ensure(dbB, B));
  const lockedA = (await raw(`battles/${id}`))?.snapshots?.[A];
  check(lockedA && lockedA.rev === 2 && lockedA.layout.roads.length === 4, 'the lock captured A\'s rev-2 city (the design-phase push)', lockedA && { rev: lockedA.rev, roads: lockedA.layout.roads.length });
  await allow('A: city push AFTER the lock (home city keeps saving)', () => updateDoc(doc(dbA, 'cities', A), { rev: 3, updatedAt: serverTimestamp(), updatedBy: 'game', writerId: 'sessA', layout: layoutFor(A) }));
  check((await raw(`battles/${id}`))?.snapshots?.[A]?.rev === 2, 'the snapshot is frozen - a later push does not change it');
  await allow('A: beginAttempt at the breach', () => updateDoc(bref(dbA, id), { [`attempts.${A}`]: { startedAt: serverTimestamp() } }));
  await allow('A: submitResult (9/10 -> 90%, 2 stars, 240 s)', () => updateDoc(bref(dbA, id), { [`results.${A}`]: result(9, 10, { durationSec: 240 }) }));
  await allow('B: beginAttempt', () => updateDoc(bref(dbB, id), { [`attempts.${B}`]: { startedAt: serverTimestamp() } }));
  await allow('B: submitResult (10/10 -> 100%, 3 stars, victory)', () => updateDoc(bref(dbB, id), { [`results.${B}`]: result(10, 10, { durationSec: 400 }) }));
  const before = await raw(`battles/${id}`);
  const expected = BR ? BR.decideWinner(before) : B;
  check(expected === B, 'battleRules.decideWinner picks B (3 stars beats 2)', expected);
  await allow('A: resolveIfDue as soon as both results exist (winner B)', () => runTransaction(dbA, async tx => {
    const b = (await tx.get(bref(dbA, id))).data();
    tx.update(bref(dbA, id), { status: 'finished', winner: BR ? BR.decideWinner(b) : B, resolvedAt: serverTimestamp() });
  }));
  const settleTx = (db, uid) => runTransaction(db, async tx => {
    const bRef = bref(db, id);
    const pRef = doc(db, 'players', uid);
    const b = (await tx.get(bRef)).data();
    const p = (await tx.get(pRef)).data();
    const delta = BR ? BR.trophyDelta(b, uid) : (b.winner === uid ? 30 : b.winner === 'draw' ? 5 : -20);
    const won = b.winner === uid; const drew = b.winner === 'draw';
    const after = Math.max(0, p.trophies + delta);
    tx.update(pRef, {
      trophies: after, lastSettled: id,
      wins: p.wins + (won ? 1 : 0), losses: p.losses + (!won && !drew ? 1 : 0), draws: p.draws + (drew ? 1 : 0),
    });
    tx.update(bRef, { [`settled.${uid}`]: true, [`trophyChange.${uid}`]: after - p.trophies });
  });
  await allow('B: settle (+30 trophies, wins+1) in one transaction', () => settleTx(dbB, B));
  await allow('A: settle (loss floors at 0 trophies, losses+1)', () => settleTx(dbA, A));
  await deny('A: settle again', () => settleTx(dbA, A));
  const pa = await raw(`players/${A}`) || {}; const pb = await raw(`players/${B}`) || {};
  check(pb.trophies === 30 && pb.wins === 1 && pa.trophies === 0 && pa.losses === 1, 'final records: B 30 trophies 1 win, A 0 trophies 1 loss', { A: pa.trophies, B: pb.trophies });
  await deny('E: cannot read the finished battle', () => getDoc(bref(dbE, id)));
}

section('client flow: scheduled night battle');
{
  const start = now() + 2 * 3600 * SEC;
  let id = null;
  await allow('A: schedule for +2 h, night theme', async () => {
    id = doc(collection(dbA, 'battles')).id;
    await challenge(dbA, A, {
      mode: 'scheduled', theme: 'night', status: 'pending', challenger: A, opponent: B, players: [A, B],
      names: { [A]: 'Alice', [B]: 'Bobby' }, townHalls: { [A]: 3, [B]: 3 }, message: '',
      createdAt: serverTimestamp(), startAt: T(start), fightEndsAt: T(start + 3600 * SEC),
      ready: {}, snapshots: {}, attempts: {}, results: {}, settled: {},
    }, { id });
  });
  await allow('B: accept (status + acceptedAt only)', () => updateDoc(bref(dbB, id), { status: 'accepted', acceptedAt: serverTimestamp() }));
  await deny('B: ready is instant-only', () => updateDoc(bref(dbB, id), { [`ready.${B}`]: true }));
  await deny('B: lock before 21:00', () => runTransaction(dbB, async tx => {
    const c = (await tx.get(doc(dbB, 'cities', B))).data();
    tx.update(bref(dbB, id), { [`snapshots.${B}`]: { layout: c.layout, townHall: c.townHall, name: c.name, rev: c.rev, lockedAt: serverTimestamp() } });
  }));
  // Fast-forward: the clock reaches startAt (move the battle, not the clock).
  const b = await raw(`battles/${id}`) || battle({ mode: 'scheduled', status: 'accepted' });
  await seed(`battles/${id || newId()}`, { ...b, startAt: T(now() - 60 * SEC), fightEndsAt: T(now() + 3540 * SEC) });
  await allow('B: lock after 21:00', () => runTransaction(dbB, async tx => {
    const c = (await tx.get(doc(dbB, 'cities', B))).data();
    tx.update(bref(dbB, id), { [`snapshots.${B}`]: { layout: c.layout, townHall: c.townHall, name: c.name, rev: c.rev, lockedAt: serverTimestamp() } });
  }));
}

// ================================================================ winner cross-check vs battleRules.decideWinner
section('rules winner == battleRules.decideWinner (randomised)');
if (!BR) {
  check(false, 'battleRules.js missing - winner cross-check skipped');
} else {
  // mulberry32: deterministic, so a failure reproduces. Few distinct scores -> many ties, so
  // every tie-break rung (stars, %, time, no-show, draw) gets exercised.
  let seedN = 0x5eed;
  const rnd = n => {
    seedN = (seedN + 0x6D2B79F5) | 0;
    let t = Math.imul(seedN ^ (seedN >>> 15), 1 | seedN);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) % n);
  };
  const cases = [];
  for (let i = 0; i < 24; i++) {
    const mk = () => {
      if (rnd(5) === 0) return null;                        // no-show
      const [destroyed, total] = [[0, 10], [3, 10], [6, 20], [7, 10], [14, 20], [10, 10], [0, 0]][rnd(7)];
      return seededResult(destroyed, total, { durationSec: [45.5, 120, 200, 600][rnd(4)] });
    };
    cases.push([mk(), mk()]);
  }
  cases.push([seededResult(10, 10, { durationSec: 200 }), seededResult(20, 20, { durationSec: 200 })]);
  cases.push([null, null]);
  for (const [ra, rb] of cases) {
    const results = {};
    if (ra) results[A] = ra;
    if (rb) results[B] = rb;
    const data = acceptedBattle(-900 - 700, { snapshots: bothSnaps(), attempts: { [A]: attemptAt(), [B]: attemptAt() }, results });
    const expected = BR.decideWinner(data);
    const wrong = [A, B, 'draw'].filter(w => w !== expected)[rnd(2)];
    const label = `${ra ? ra.stars + '*/' + ra.percentage + '%/' + ra.durationSec + 's' : 'none'} vs ${rb ? rb.stars + '*/' + rb.percentage + '%/' + rb.durationSec + 's' : 'none'}`;
    const id = await seedBattle(data);
    await deny(`winner ${wrong} for ${label}`, () => updateDoc(bref(dbA, id), { status: 'finished', winner: wrong, resolvedAt: serverTimestamp() }));
    await allow(`winner ${expected} for ${label}`, () => updateDoc(bref(dbA, id), { status: 'finished', winner: expected, resolvedAt: serverTimestamp() }));
  }
  // trophyDelta is what settle adds; the rules must accept exactly that step (bound to the battle).
  for (const [winner, uid, startT] of [[A, A, 0], [A, B, 10], [A, B, 50], ['draw', A, 7], ['void', B, 12]]) {
    await seed(`players/${uid}`, profile(uid, { trophies: startT }));
    const fb = { ...acceptedBattle(-2000), status: 'finished', winner };
    const id = await seedBattle(fb);
    const delta = BR.trophyDelta(fb, uid);
    const field = BR.recordFieldFor(winner, uid);
    const after = Math.max(0, startT + delta);
    const db = uid === A ? dbA : dbB;
    await allow(`settle step: ${uid} ${field || 'void'} from ${startT} trophies -> ${after}`, () => {
      const b = writeBatch(db);
      if (field) b.update(doc(db, 'players', uid), { trophies: after, [field]: 1, lastSettled: id });
      b.update(bref(db, id), { [`settled.${uid}`]: true, [`trophyChange.${uid}`]: after - startT });
      return b.commit();
    });
  }
}

// ---------------------------------------------------------------- Shadow Duel (shared project)
// City Siege shares shadow-duel-dark-2026's one free database with Shadow Duel, so firestore.rules
// carries Shadow Duel's rules too. These pin their behaviour: a City Siege rules edit must never
// open or close anything for the other game.
section('Shadow Duel rules kept intact (shared (default) database)');
{
  await seed(`entitlements/${A}`, { dark: true });
  await seed(`entitlements/${B}`, { dark: false });
  await allow('SD: read own entitlement', () => getDoc(doc(dbA, 'entitlements', A)));
  await deny('SD: read another player\'s entitlement', () => getDoc(doc(dbE, 'entitlements', A)));
  await deny('SD: grant yourself the Dark entitlement', () => setDoc(doc(dbE, 'entitlements', E), { dark: true }));
  await allow('SD: write own profile (name, char, updatedAt)', () => setDoc(doc(dbA, 'profiles', A), { name: 'Al', char: 'ninja', updatedAt: serverTimestamp() }));
  await deny('SD: profile with an extra key', () => setDoc(doc(dbA, 'profiles', A), { name: 'Al', char: 'ninja', admin: true }));
  await deny('SD: write another player\'s profile', () => setDoc(doc(dbE, 'profiles', A), { name: 'x', char: 'y' }));
  await allow('SD: signed-in read of a profile', () => getDoc(doc(dbE, 'profiles', A)));
  await deny('SD: signed-out read of a profile', () => getDoc(doc(dbAnon, 'profiles', A)));
  await allow('SD: entitled player hosts a room', () => setDoc(doc(dbA, 'rooms', 'R1'), { hostUid: A, guestUid: null }));
  await deny('SD: unentitled player hosts a room', () => setDoc(doc(dbB, 'rooms', 'R2'), { hostUid: B, guestUid: null }));
  await deny('SD: unentitled player reads a room', () => getDoc(doc(dbB, 'rooms', 'R1')));
  await allow('SD: host posts a caller candidate', () => addDoc(collection(dbA, 'rooms', 'R1', 'callerCandidates'), { c: 1 }));
  await deny('SD: host posts a callee candidate', () => addDoc(collection(dbA, 'rooms', 'R1', 'calleeCandidates'), { c: 1 }));
}

// ---------------------------------------------------------------- done
await env.clearFirestore();
await env.cleanup();
console.log(`\n${passes} passed, ${fails} failed (${passes + fails} assertions)`);
if (fails) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
process.exit(0);
