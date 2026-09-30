#!/usr/bin/env node
/**
 * End-to-end tests for the City Siege MCP server against the Firestore emulator.
 *
 *   node mcp-server/test/run.mjs          (from city-siege-3d/, or `npm test` in mcp-server/)
 *
 * Needs the Firestore emulator on FIRESTORE_EMULATOR_HOST (default 127.0.0.1:8085). Uses its own
 * project id `demo-cs-mcp` (MCP_TEST_PROJECT_ID to override), so wiping its data never touches
 * another suite's; the HTTP server listens on MCP_TEST_PORT (default 8787).
 *
 * What it does: seeds players' cities from the real-game fixtures (tools/online/fixtures), access
 * tokens (sha256 ids, like the game writes them) and battles in every phase, then spawns the
 * server over stdio with the MCP SDK Client and over Streamable HTTP, calls every tool, and after
 * each call reads Firestore back to prove what was (or was not) written. Also cross-checks with
 * firestore.rules (via @firebase/rules-unit-testing, if installed) that the game's next push is
 * still allowed after an MCP write.
 *
 * Prints PASS/FAIL per assertion and a total; exits 1 on any failure.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..');
const GAME = path.resolve(SERVER_DIR, '..');
const ENTRY = path.join(SERVER_DIR, 'src', 'index.js');
const PROJECT = process.env.MCP_TEST_PROJECT_ID || 'demo-cs-mcp';
const EMU = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
const PORT = Number(process.env.MCP_TEST_PORT) || 8787;
process.env.FIRESTORE_EMULATOR_HOST = EMU;

const { initializeApp } = await import('firebase-admin/app');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
const R = await import('../../src/shared/cityRules.js');
const P = await import('../../src/data/progression.js');

// ---------------------------------------------------------------- tiny harness
let passes = 0;
let fails = 0;
const failures = [];
const check = (ok, name, detail) => {
  if (ok) passes++;
  else { fails++; failures.push(name + (detail !== undefined ? '  :: ' + short(detail) : '')); }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== undefined ? '  :: ' + short(detail) : ''}`);
  return !!ok;
};
const short = (d) => { const s = typeof d === 'string' ? d : JSON.stringify(d); return s && s.length > 600 ? s.slice(0, 600) + '...' : s; };
const section = (t) => console.log(`\n== ${t}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function canon(v) {
  if (v instanceof Timestamp) return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])]));
  return v;
}
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const clone = (v) => JSON.parse(JSON.stringify(v));
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const mkToken = (seed) => 'csk_' + createHash('sha256').update('city-siege-test:' + seed).digest('base64url').slice(0, 43);
const txt = (r) => (r && r.content && r.content[0] && r.content[0].text) || '';

// ---------------------------------------------------------------- emulator + admin
const [EMU_HOST, EMU_PORT] = EMU.split(':');
{
  const res = await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' }).catch(e => e);
  if (!(res && res.ok)) {
    console.error(`Cannot reach the Firestore emulator at ${EMU} (${res && res.message ? res.message : res && res.status}). Start it with \`npm run emulators\`.`);
    process.exit(1);
  }
}
const RULES = fs.readFileSync(path.join(GAME, 'firestore.rules'), 'utf8');
await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}:securityRules`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: RULES }] } })
});
const adminApp = initializeApp({ projectId: PROJECT }, 'mcp-test-admin');
const db = getFirestore(adminApp);

// Optional client-side cross-check through firestore.rules (dev dependency of the game).
let rulesEnv = null;
let fsClient = null;
let rut = null;
try {
  rut = await import('@firebase/rules-unit-testing');
  fsClient = await import('firebase/firestore');
  fsClient.setLogLevel('silent');
  rulesEnv = await rut.initializeTestEnvironment({ projectId: PROJECT, firestore: { host: EMU_HOST, port: Number(EMU_PORT), rules: RULES } });
} catch (e) {
  console.log(`(rules cross-check skipped: ${e.message.split('\n')[0]})`);
}

// ---------------------------------------------------------------- seed
const FIX = (n) => JSON.parse(fs.readFileSync(path.join(GAME, 'tools/online/fixtures', n + '.cloud.json'), 'utf8'));
const TH5 = FIX('th5-city');
const DEF = FIX('default-city');
const NOW = Date.now();
const T = (ms) => Timestamp.fromMillis(ms);
const MIN = 60 * 1000;

const cities = {};
function cityFrom(uid, name, fx, patch) {
  const c = clone(fx);
  if (patch) patch(c);
  cities[uid] = c;
  return { uid, name, townHall: c.townHall, rev: 1, updatedAt: T(NOW - 5 * MIN), updatedBy: 'game', writerId: 'seed-session', layout: c.layout, holdings: c.holdings };
}
// Frank hits the refusals a normal city cannot: a locked type, a type at its limit, full storage, no road tiles.
const th5Model = R.createModel(TH5.layout, TH5.holdings);
const atLimitType = ['sniper_tower', 'builder_hut', 'vehicle_lab'].find(t => {
  const n = TH5.layout.buildings.filter(b => b.t === t).length;
  return n > 0 && n >= P.limitFor(t, 5);
});
const th5Storage = R.summarize(th5Model).storage;
const frankFill = th5Storage.capacity - th5Storage.used;

const seedCities = {
  alice: cityFrom('alice', 'Alice', TH5),
  bob: cityFrom('bob', 'Bob', DEF, c => { c.holdings.inventory.sniper_tower = 1; }),
  carol: cityFrom('carol', 'Carol', TH5),
  frank: cityFrom('frank', 'Frank', TH5, c => {
    c.holdings.inventory.laser_obelisk = 1;
    c.holdings.inventory[atLimitType] = 1;
    c.holdings.inventory.landmine = (c.holdings.inventory.landmine || 0) + frankFill;
    c.holdings.stowedCounts.landmine = frankFill;
    c.holdings.inventory.road = 0;
  }),
  gina: cityFrom('gina', 'Gina', DEF, c => { c.holdings.inventory.road = 60; }),
  hank: cityFrom('hank', 'Hank', DEF),
  erin: cityFrom('erin', 'Erin', DEF),
  ivy: cityFrom('ivy', 'Ivy', TH5),
  // The game's last push was 3 h ago and the player had just collected the Lumber Mill (st 0).
  pat: cityFrom('pat', 'Pat', TH5, c => {
    c.layout.savedAt = NOW - 3 * 3600e3;
    c.layout.tasks = [];
    c.layout.buildings.find(b => b.id === 'bmumqoxbxiekjscmz').st = 0;
  }),
  tom: cityFrom('tom', 'Tom', TH5),
  quinn: cityFrom('quinn', 'Quinn', DEF)
};
const TOK = {
  A1: mkToken('alice-1'), A2: mkToken('alice-2'), A3: mkToken('alice-3'), AREV: mkToken('alice-revoked'), ASCOPE: mkToken('alice-scope'),
  B1: mkToken('bob-1'), D1: mkToken('dave-1'), E1: mkToken('erin-1'), F1: mkToken('frank-1'), G1: mkToken('gina-1'),
  H1: mkToken('hank-1'), I1: mkToken('ivy-1'), UNKNOWN: mkToken('nobody'),
  P1: mkToken('pat-1'), T1: mkToken('tom-1'), Q1: mkToken('quinn-1')
};
const tokenDocs = {
  A1: { uid: 'alice', label: 'claude code' }, A2: { uid: 'alice', label: 'failures' }, A3: { uid: 'alice', label: 'revoke me' },
  AREV: { uid: 'alice', label: 'old laptop', revoked: true }, ASCOPE: { uid: 'alice', label: 'weird', scope: 'admin' },
  B1: { uid: 'bob', label: 'http' }, D1: { uid: 'dave', label: 'no city' }, E1: { uid: 'erin', label: 'rate' },
  F1: { uid: 'frank', label: 'f' }, G1: { uid: 'gina', label: 'g' }, H1: { uid: 'hank', label: 'h' }, I1: { uid: 'ivy', label: 'i' },
  P1: { uid: 'pat', label: 'p' }, T1: { uid: 'tom', label: 't' }, Q1: { uid: 'quinn', label: 'q' }
};
const baseBattle = (id, a, b, extra) => ({
  mode: 'instant', theme: 'day', status: 'accepted', challenger: a, opponent: b, players: [a, b],
  names: { [a]: seedCities[a] ? seedCities[a].name : a, [b]: seedCities[b] ? seedCities[b].name : b },
  townHalls: { [a]: 5, [b]: 5 }, message: '', createdAt: T(NOW - 3 * MIN), designSeconds: 120,
  acceptedAt: T(NOW - 2 * MIN), ready: {}, snapshots: {}, attempts: {}, results: {}, settled: {}, ...extra
});
const MARKER = { layout: { v: 1, savedAt: 1, buildings: [], tasks: [], roads: [] }, townHall: 5, name: 'Alice', rev: 0, lockedAt: T(NOW - 2 * MIN) };
const battles = {
  bDesign: baseBattle('bDesign', 'alice', 'bob', { startAt: T(NOW + 9 * MIN), fightEndsAt: T(NOW + 24 * MIN) }),
  bFight: baseBattle('bFight', 'carol', 'alice', { startAt: T(NOW - MIN), fightEndsAt: T(NOW + 14 * MIN) }),
  bFightLocked: baseBattle('bFightLocked', 'alice', 'frank', { startAt: T(NOW - 2 * MIN), fightEndsAt: T(NOW + 13 * MIN), snapshots: { alice: MARKER } }),
  bResolving: baseBattle('bResolving', 'alice', 'gina', { mode: 'scheduled', theme: 'night', createdAt: T(NOW - 86400e3), startAt: T(NOW - 120 * MIN), fightEndsAt: T(NOW - 60 * MIN) }),
  bFinished: baseBattle('bFinished', 'alice', 'hank', { status: 'finished', createdAt: T(NOW - 2 * 86400e3), startAt: T(NOW - 2 * 86400e3 + 5 * MIN), fightEndsAt: T(NOW - 2 * 86400e3 + 20 * MIN), winner: 'alice', results: { alice: { stars: 2, percentage: 70, durationSec: 300, outcome: 'retreat' }, hank: { stars: 1, percentage: 30, durationSec: 200, outcome: 'busted' } } }),
  bOther: baseBattle('bOther', 'bob', 'carol', { startAt: T(NOW - MIN), fightEndsAt: T(NOW + 14 * MIN) }),
  bPending: { ...baseBattle('bPending', 'erin', 'alice', { status: 'pending', designSeconds: 300 }), acceptedAt: undefined, createdAt: T(NOW - MIN) }
};
delete battles.bPending.acceptedAt;
{
  const batch = db.batch();
  for (const [uid, doc] of Object.entries(seedCities)) batch.set(db.collection('cities').doc(uid), doc);
  for (const [k, t] of Object.entries(tokenDocs)) {
    batch.set(db.collection('mcpTokens').doc(sha(TOK[k])), { uid: t.uid, label: t.label, createdAt: T(NOW - 60 * MIN), revoked: !!t.revoked, scope: t.scope || 'design' });
  }
  for (const [id, b] of Object.entries(battles)) batch.set(db.collection('battles').doc(id), b);
  await batch.commit();
}

// ---------------------------------------------------------------- Firestore readers
const cityDoc = async (uid) => (await db.collection('cities').doc(uid).get()).data();
const battleDoc = async (id) => (await db.collection('battles').doc(id).get()).data();
const histDocs = async (uid) => (await db.collection('cities').doc(uid).collection('history').get()).docs.map(d => ({ id: d.id, ...d.data() }));
const tokenDoc = async (k) => (await db.collection('mcpTokens').doc(sha(TOK[k])).get()).data();
async function stateOf(uid) {
  const c = await cityDoc(uid);
  const h = await histDocs(uid);
  return { city: c ? canon(c) : null, hist: h.map(x => x.id).sort() };
}
const unchanged = async (uid, before) => same(before, await stateOf(uid));

// ---------------------------------------------------------------- server processes
const children = [];
function stdioClient(token, extraEnv = {}) {
  const env = { FIRESTORE_EMULATOR_HOST: EMU, FIREBASE_PROJECT_ID: PROJECT, ...extraEnv };
  if (token !== null && token !== undefined) env.CITY_SIEGE_TOKEN = token;
  const transport = new StdioClientTransport({ command: process.execPath, args: [ENTRY], env, stderr: 'pipe', cwd: SERVER_DIR });
  const log = [];
  transport.stderr && transport.stderr.on('data', d => log.push(String(d)));
  const client = new Client({ name: 'city-siege-test', version: '1.0.0' });
  return { client, transport, log, connect: () => client.connect(transport) };
}
let httpProc = null;
let httpLog = '';
async function startHttp() {
  httpProc = spawn(process.execPath, [ENTRY, '--http', '--port', String(PORT)], {
    cwd: SERVER_DIR, env: { ...process.env, FIRESTORE_EMULATOR_HOST: EMU, FIREBASE_PROJECT_ID: PROJECT }, stdio: ['ignore', 'pipe', 'pipe']
  });
  children.push(httpProc);
  httpProc.stderr.on('data', d => { httpLog += d; });
  httpProc.stdout.on('data', d => { httpLog += d; });
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/healthz`);
      if (r.ok) return r.json();
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('HTTP server did not start: ' + httpLog);
}
async function httpClient(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${PORT}/mcp`), { requestInit: { headers } });
  const client = new Client({ name: 'city-siege-test-http', version: '1.0.0' });
  await client.connect(transport);
  return client;
}
process.on('exit', () => { for (const c of children) { try { c.kill('SIGKILL'); } catch { /* gone */ } } });

const EXPECTED_TOOLS = ['add_roads', 'apply_design', 'get_battles', 'get_catalog', 'get_city', 'get_rules', 'list_buildings',
  'move_building', 'place_building', 'remove_roads', 'remove_tree', 'stow_building', 'undo_last_change', 'validate_design'];
const WRITE_TOOLS = ['place_building', 'move_building', 'stow_building', 'remove_tree', 'add_roads', 'remove_roads', 'apply_design', 'undo_last_change'];

/** Find a free tile for `type` in `model` (not on a road), scanning from `from`. */
function freeTile(model, type, avoid = [], from = [-11, -11], to = [11, 11]) {
  const roads = new Set(model.layout.roads);
  const bad = new Set(avoid.map(([x, z]) => x + ',' + z));
  for (let gz = from[1]; gz <= to[1]; gz++) {
    for (let gx = from[0]; gx <= to[0]; gx++) {
      if (roads.has(gx + ',' + gz) || bad.has(gx + ',' + gz)) continue;
      if (R.checkPlace(model, type, gx, gz, { inventory: false, limits: false }).ok) return [gx, gz];
    }
  }
  return null;
}

let exitCode = 0;
try {
  // ============================================================ stdio A1: listing, prompts, reads
  section('stdio: tool list and prompts');
  const s1 = stdioClient(TOK.A1);
  await s1.connect();
  let a1Calls = 0;
  const call1 = async (name, args = {}) => { a1Calls++; return s1.client.callTool({ name, arguments: args }); };

  const { tools } = await s1.client.listTools();
  const names = tools.map(t => t.name).sort();
  check(same(names, EXPECTED_TOOLS), 'listTools has exactly the 14 design tools', names);
  check(!names.some(n => /attack|shop|buy|upgrade|collect|gem|bank|spend|speed/.test(n)), 'no attack / shop / upgrade / collect / bank / gem tool', names);
  check(tools.every(t => /\bgx\b/.test(t.description) && /\bgz\b/.test(t.description) && t.description.includes('get_city')),
    'every description states the grid (gx east, gz south) and says to call get_city first');
  check(tools.every(t => t.description.includes('N (0,-15), E (15,0), S (0,15)')), 'every description names the gate tiles');
  check(tools.every(t => t.annotations && t.annotations.readOnlyHint === !WRITE_TOOLS.includes(t.name)), 'readOnlyHint true exactly on the read tools');
  check(!JSON.stringify(tools.map(t => t.inputSchema)).includes('$ref'), 'input schemas are self-contained (no $ref)');
  const applySchema = tools.find(t => t.name === 'apply_design').inputSchema;
  check(applySchema.properties.ops.items.anyOf.length === 6 && applySchema.properties.dry_run, 'apply_design schema: 6 op shapes + dry_run');
  const { prompts } = await s1.client.listPrompts();
  check(same(prompts.map(p => p.name).sort(), ['fortify_for_battle', 'tidy_city']), 'listPrompts: fortify_for_battle and tidy_city', prompts.map(p => p.name));
  const pf = await s1.client.getPrompt({ name: 'fortify_for_battle', arguments: { battle_id: 'bDesign', focus: 'protect the Town Hall' } });
  const pfText = pf.messages[0].content.text;
  check(/get_battles/.test(pfText) && /apply_design/.test(pfText) && /dry_run/.test(pfText) && pfText.includes('bDesign') && pfText.includes('protect the Town Hall'),
    'fortify_for_battle prompt: battle id, focus, get_battles -> apply_design dry run');
  const pt = await s1.client.getPrompt({ name: 'tidy_city', arguments: {} });
  check(/validate_design/.test(pt.messages[0].content.text) && /undo_last_change/.test(pt.messages[0].content.text), 'tidy_city prompt text');

  section('stdio: read tools (alice, TH5 fixture)');
  const before0 = await stateOf('alice');
  let r = await call1('get_city');
  let t = txt(r);
  check(!r.isError && t.includes('Town Hall 5') && t.includes('build radius 12.7'), 'get_city: Town Hall and radius', t.slice(0, 200));
  check(t.includes('<- gx') && t.includes('^ gz') && t.includes('Legend:'), 'get_city: ASCII map with axes and legend');
  check(t.includes('bmumqowj6gngaw258 town_hall (3,3) L5'), 'get_city: building ids with tile and level');
  check(/vs Bob .*DESIGN phase - the city locks in (8m|9m)/.test(t), 'get_city: design battle vs Bob with its lock countdown', t.split('\n').filter(l => l.includes('vs Bob')));
  check(/vs Carol .*FIGHT phase/.test(t) && /vs Gina .*FIGHT OVER/.test(t) && /vs Erin .*PENDING - Erin challenged/.test(t), 'get_city: fight / resolving / pending battles listed');
  check(!t.includes('vs Hank'), 'get_city: finished battles are not listed as active');
  check(t.includes('landmine x2') && t.includes('cash_mint x1 (1 from storage, levels 3)'), 'get_city: inventory incl. stowed levels');
  check(t.includes('ROADS: 116/210') && t.includes('STORAGE: 3/12') && t.includes('UNDER CONSTRUCTION') && t.includes('bmumqoxbpr9y8kzmg'), 'get_city: roads, storage, the running upgrade');
  check(r.structuredContent && r.structuredContent.rev === 1 && r.structuredContent.summary.townHall === 5 && r.structuredContent.battles.length === 5,
    'get_city structuredContent: rev, summary, 5 active battles', r.structuredContent && { rev: r.structuredContent.rev, n: r.structuredContent.battles.length });
  r = await call1('get_city', { ids: false });
  check(!r.isError && !txt(r).includes('Buildings (id type'), 'get_city ids:false omits the building list');
  r = await call1('list_buildings');
  check(!r.isError && r.structuredContent.count === 52 && txt(r).includes('bmumqoxbpr9y8kzmg  tesla_coil  (-2,8)  L3  2x2  [upgrading to L4'), 'list_buildings: 52 rows with upgrade state', txt(r).slice(0, 200));
  r = await call1('list_buildings', { type: 'sniper_tower' });
  check(r.structuredContent.count === 3 && r.structuredContent.buildings.every(b => b.type === 'sniper_tower'), 'list_buildings type filter');
  r = await call1('get_catalog');
  const cat = r.structuredContent && r.structuredContent.catalog;
  check(!r.isError && cat.some(c => c.type === 'landmine' && c.canPlaceNow && c.inInventory === 2) && !cat.some(c => c.type === 'laser_obelisk'),
    'get_catalog: placeable landmines, TH6 types absent');
  check(txt(r).includes('landmine - Buried Landmine') && txt(r).includes('CAN PLACE NOW'), 'get_catalog text');
  r = await s1.client.callTool({ name: 'get_rules' });   // no "arguments" at all
  a1Calls++;
  t = txt(r);
  check(!r.isError && t.includes('hypot(gx, gz)') && t.includes('TH12 14.8') && t.includes('TH12 400') && t.includes('CANNOT DO'), 'get_rules (called without arguments): radius + road tables, limits of MCP');
  r = await call1('validate_design');
  t = txt(r);
  check(!r.isError && t.includes('LAYOUT: no errors, no warnings') && t.includes('RAID DEFENSE at Town Hall 5') && t.includes('Gaps:') && t.includes('landmine x2'),
    'validate_design: audit + defense report + unused inventory', t.slice(0, 300));
  check(r.structuredContent.defense.gemBounty >= 1 && Array.isArray(r.structuredContent.audit.errors), 'validate_design structuredContent');
  r = await call1('get_battles');
  t = txt(r);
  check(!r.isError && r.structuredContent.battles.length === 5 && t.includes('1 finished/closed not shown'), 'get_battles: 5 active, finished hidden', t.slice(0, 300));
  const vFight = r.structuredContent.battles.find(b => b.id === 'bFight');
  const vLocked = r.structuredContent.battles.find(b => b.id === 'bFightLocked');
  check(vFight.phase === 'fight' && vFight.yourCityLocked === false && vFight.fightEndsInSec > 700, 'get_battles: fight phase, not locked yet', vFight);
  check(vLocked.yourCityLocked === true && vLocked.yourLockedRev === 0, 'get_battles: already-locked battle shows its rev');
  r = await call1('get_battles', { include_finished: true });
  const fin = r.structuredContent.battles.find(b => b.id === 'bFinished');
  check(fin && fin.phase === 'finished' && fin.winner === 'you' && txt(r).includes('the player won'), 'get_battles include_finished: result + winner');
  check(await unchanged('alice', before0), 'read tools wrote nothing (rev, history unchanged)');

  // ============================================================ stdio A2: every refusal, nothing written
  section('stdio: refusals are isError, actionable, and write nothing');
  const s2 = stdioClient(TOK.A2);
  await s2.connect();
  const m0 = R.createModel(TH5.layout, TH5.holdings);
  const [fx, fz] = freeTile(m0, 'landmine');
  const refusals = [
    ['place_building', { type: 'snipr_tower', gx: fx, gz: fz }, 'UNKNOWN_TYPE', /Did you mean "sniper_tower"/],
    ['place_building', { type: 'main_gate', gx: fx, gz: fz }, 'NOT_PLACEABLE', /always exactly three/],
    ['place_building', { type: 'road', gx: fx, gz: fz }, 'NOT_PLACEABLE', /add_roads/],
    ['place_building', { type: 'sniper_tower', gx: fx, gz: fz }, 'NOT_IN_INVENTORY', /Shop.*landmine x2/],
    ['place_building', { type: 'landmine', gx: 13, gz: 0 }, 'OUTSIDE_RADIUS', /hypot\(13,0\) = 13\.00.*Free tiles nearby/],
    ['place_building', { type: 'landmine', gx: 3, gz: 3 }, 'BLOCKED', /blocked by Town Hall bmumqowj6gngaw258 at \(3,3\).*Free tiles nearby: \(-?\d+,-?\d+\)/],
    ['move_building', { id: 'nope123', gx: fx, gz: fz }, 'NOT_FOUND', /list_buildings/],
    ['move_building', { id: 'bmumqowj7l7ow4cf1', gx: fx, gz: fz }, 'NOT_FOUND', /No building with id "bmumqowj7l7ow4cf1"/],
    ['move_building', { id: 'gate_north_gate', gx: fx, gz: fz }, 'IMMOVABLE', /fixed feature/],
    ['move_building', { id: 'bmumqoxbpr9y8kzmg', gx: fx, gz: fz }, 'UNDER_CONSTRUCTION', /being upgraded to level 4/],
    ['move_building', { id: 'bmumqoxbmookjzgrj', gx: fx, gz: fz, rot: 45 }, 'BAD_ARGS', /rot must be 0, 90, 180 or 270/],
    ['stow_building', { id: 'bmumqowj6gngaw258' }, 'NOT_STOWABLE', /Town Hall can never be stowed/],
    ['stow_building', { id: 'bmumqowj8ivs0xchr' }, 'NOT_STOWABLE', /remove_tree/],
    ['stow_building', { id: 'bmumqoxbpr9y8kzmg' }, 'UNDER_CONSTRUCTION', /cannot be stowed/],
    ['remove_tree', { id: 'bmumqowj6gngaw258' }, 'NOT_A_TREE', /not a tree/],
    ['add_roads', { tiles: [[fx, fz]], path: [[fx, fz], [fx + 1, fz]] }, 'BAD_ARGS', /exactly one of "tiles"/],
    ['add_roads', { path: [[10, 0], [13, 0]] }, 'OUTSIDE_RADIUS', /Road tile \(13,0\) is outside.*Nothing was drawn/],
    ['remove_roads', { tiles: [[0, -14]] }, 'OUTSIDE_RADIUS', /outside the buildable area/]
  ];
  const stRef = await stateOf('alice');
  for (const [tool, args, code, re] of refusals) {
    const res = await s2.client.callTool({ name: tool, arguments: args });
    const m = txt(res);
    check(res.isError === true && m.startsWith(`Refused (${code}): `) && re.test(m) && /Nothing was changed\.$/.test(m) && !/^op 0/.test(m.slice(`Refused (${code}): `.length)),
      `${tool} ${JSON.stringify(args)} -> ${code}`, m);
    check(res.structuredContent && res.structuredContent.reason === code, `  structuredContent.reason = ${code}`);
  }
  check(await unchanged('alice', stRef), `after ${refusals.length} refusals alice's city and history are byte-identical`);
  const sm = R.createModel(TH5.layout, TH5.holdings);
  const sniper = 'bmumqoxbmookjzgrj';
  let res = await s2.client.callTool({ name: 'apply_design', arguments: { ops: [
    { op: 'place', type: 'landmine', gx: fx, gz: fz },
    { op: 'move', id: sniper, gx: 3, gz: 3 }
  ] } });
  check(res.isError && /Refused \(BLOCKED\): op 1 \(move\) failed: .*The 1 op before it were rolled back too\. Nothing was changed\./.test(txt(res)) && res.structuredContent.failedAt === 1,
    'apply_design all-or-nothing: op 1 refused -> op 0 rolled back', txt(res));
  res = await s2.client.callTool({ name: 'apply_design', arguments: { dry_run: true, ops: [{ op: 'place', type: 'landmine', gx: fx, gz: fz }, { op: 'move', id: sniper, gx: 3, gz: 3 }] } });
  check(res.isError && txt(res).startsWith('Dry run refused (BLOCKED)') && txt(res).includes('nothing would be saved'), 'apply_design dry_run refusal', txt(res));
  res = await s2.client.callTool({ name: 'place_building', arguments: { type: 'landmine', gx: 'abc', gz: 1 } });
  check(res.isError && /Input validation error/.test(txt(res)), 'zod: non-integer coordinate is rejected before any work', txt(res));
  res = await s2.client.callTool({ name: 'apply_design', arguments: { ops: [{ op: 'attack', id: 'x' }] } });
  check(res.isError && /Input validation error/.test(txt(res)), 'zod: an "attack" op does not exist', txt(res));
  res = await s2.client.callTool({ name: 'buy_building', arguments: { type: 'sniper_tower' } });
  check(res.isError && /not found/.test(txt(res)), 'no such tool: buy_building', txt(res));
  res = await s2.client.callTool({ name: 'get_city', arguments: { uid: 'bob' } });
  check(!res.isError && res.structuredContent.uid === 'alice' && txt(res).startsWith('Alice\'s city'), 'an extra "uid: bob" argument is ignored: still alice\'s city');
  check(await unchanged('alice', stRef), 'still nothing written after the all-or-nothing and schema refusals');
  const bFight0 = await battleDoc('bFight');
  check(!bFight0.snapshots.alice, 'refused edits did not lock the fight battle either');
  await s2.client.close();

  // ============================================================ stdio A1: every design tool, Firestore verified
  section('stdio: dry run writes nothing (and would lock the started battles)');
  const pre = await stateOf('alice');
  const [lx, lz] = freeTile(m0, 'landmine');
  r = await call1('apply_design', { dry_run: true, ops: [{ op: 'place', type: 'landmine', gx: lx, gz: lz }, { op: 'add_roads', tiles: [[lx, lz]] }] });
  t = txt(r);
  check(!r.isError && t.startsWith('Dry run - nothing was saved (the city is still rev 1). All 2 ops would succeed:') && t.includes('Map after these ops'),
    'dry_run: success text with the preview map', t.slice(0, 200));
  check(/would first lock the city .*vs Carol, Gina/.test(t) && r.structuredContent.saved === false && r.structuredContent.locked.length === 2, 'dry_run: reports the two battles a save would lock', r.structuredContent.locked);
  check(await unchanged('alice', pre), 'dry_run: city + history untouched');
  check(!(await battleDoc('bFight')).snapshots.alice && !(await battleDoc('bResolving')).snapshots.alice, 'dry_run: no snapshot written');

  const writer = 'mcp:' + sha(TOK.A1).slice(0, 8);
  /**
   * The production clock moves with the output (store.js): savedAt = the write's time, and every
   * producer standing before and after holds floor(storedAfter(its st, the time between)).
   */
  function clockMoved(label, prevDoc, c) {
    const secs = (c.layout.savedAt - prevDoc.layout.savedAt) / 1000;
    check(Number.isFinite(c.layout.savedAt) && c.layout.savedAt >= prevDoc.layout.savedAt && Math.abs(Date.now() - c.layout.savedAt) < 60000,
      `${label}: layout.savedAt moved to the write time`, { was: prevDoc.layout.savedAt, now: c.layout.savedAt });
    const before = new Map(prevDoc.layout.buildings.map(b => [b.id, b]));
    const bad = c.layout.buildings.filter(b => {
      const d = P.BUILDING_DEFS[b.t];
      const o = before.get(b.id);
      if (!d || !d.produce || !o || o.l !== b.l) return false;
      return b.st !== Math.floor(P.storedAfter(b.t, b.l, o.st, secs));
    });
    check(!bad.length, `${label}: every standing producer advanced by exactly the ${Math.round(secs)} s since the last save`, bad.map(b => [b.id, b.st]));
  }
  /** After each write: rev, writer, savedAt, lastChange, history doc of the previous version. */
  async function verifyWrite(label, prevDoc, expectRev) {
    const c = await cityDoc('alice');
    check(c.rev === expectRev && c.updatedBy === 'mcp' && c.writerId === writer, `${label}: rev ${expectRev}, updatedBy mcp, writerId ${writer}`, { rev: c.rev, by: c.updatedBy, w: c.writerId });
    clockMoved(label, prevDoc, c);
    check(c.lastChange && c.lastChange.by === 'mcp' && c.lastChange.summary.length > 0 && c.lastChange.summary.length <= 200 && c.lastChange.at instanceof Timestamp,
      `${label}: lastChange {by:'mcp', summary:"${c.lastChange && c.lastChange.summary}"}`);
    check(c.updatedAt instanceof Timestamp && c.townHall === 5 && same(Object.keys(c).sort(), ['lastChange', 'layout', 'holdings', 'name', 'rev', 'townHall', 'uid', 'updatedAt', 'updatedBy', 'writerId'].sort()),
      `${label}: only the rule-approved keys`, Object.keys(c));
    const h = (await db.collection('cities').doc('alice').collection('history').doc(String(expectRev - 1)).get()).data();
    check(h && h.rev === expectRev - 1 && h.replacedBy.rev === expectRev && same(h.layout, prevDoc.layout) && same(h.holdings, prevDoc.holdings),
      `${label}: history/${expectRev - 1} holds the previous version`);
    const audit = R.auditLayout(R.createModel(c.layout, c.holdings));
    check(!audit.errors.length && !audit.warnings.length, `${label}: saved city audits clean`, audit);
    return c;
  }

  section('stdio: place_building (+ snapshot-before-edit)');
  let prev = await cityDoc('alice');
  r = await call1('place_building', { type: 'landmine', gx: lx, gz: lz });
  t = txt(r);
  check(!r.isError && t.startsWith('Done - saved as rev 2.') && t.includes(`Placed Buried Landmine`) && t.includes(`at (${lx},${lz}), level 1`), 'place_building result text', t);
  check(/Locked first: the battle\(s\) vs Carol, Gina had already started, so the city as it was at rev 1/.test(t), 'place_building says which battles it locked first', t);
  let c = await verifyWrite('place', prev, 2);
  const placed = c.layout.buildings.find(b => b.t === 'landmine' && b.gx === lx && b.gz === lz);
  check(placed && placed.id === r.structuredContent.results[0].id && R.isValidBuildingId(placed.id) && c.holdings.inventory.landmine === 1, 'place: landmine on the tile with the returned id, inventory 2 -> 1');
  const snapF = (await battleDoc('bFight')).snapshots;
  check(snapF.alice && same(snapF.alice.layout, prev.layout) && snapF.alice.rev === 1 && snapF.alice.townHall === 5 && snapF.alice.name === 'Alice' && snapF.alice.lockedAt instanceof Timestamp,
    'snapshot-before-edit: fight battle got alice\'s PRE-edit city {layout, townHall, name, rev:1, lockedAt}', snapF.alice && { rev: snapF.alice.rev, keys: Object.keys(snapF.alice) });
  check(same(Object.keys(snapF.alice).sort(), ['layout', 'lockedAt', 'name', 'rev', 'townHall']), 'snapshot has exactly the rule-approved keys');
  check(!snapF.carol, 'snapshot-before-edit: the opponent\'s (carol) snapshot is not written by alice\'s edit');
  check((await battleDoc('bResolving')).snapshots.alice && (await battleDoc('bResolving')).snapshots.alice.rev === 1, 'snapshot-before-edit: resolving battle locked too');
  check(!(await battleDoc('bDesign')).snapshots.alice, 'design-phase battle is NOT locked (edits still count for it)');
  check(same((await battleDoc('bFightLocked')).snapshots.alice, MARKER), 'an existing snapshot is never overwritten');
  for (const id of ['bFinished', 'bOther', 'bPending']) check(same(await battleDoc(id), battles[id]), `${id} untouched`);

  section('stdio: move_building');
  prev = c;
  const [mx, mz] = freeTile(R.createModel(prev.layout, prev.holdings), 'sniper_tower', [], [-11, 4], [11, 11]);
  r = await call1('move_building', { id: sniper, gx: mx, gz: mz, rot: 90 });
  check(!r.isError && txt(r).includes(`Moved Sniper Watchtower ${sniper} from (3,-8) to (${mx},${mz})`) && !txt(r).includes('Locked first'), 'move_building result (no second lock)', txt(r));
  c = await verifyWrite('move', prev, 3);
  const mv = c.layout.buildings.find(b => b.id === sniper);
  check(mv.gx === mx && mv.gz === mz && Math.abs(mv.rot - Math.PI / 2) < 1e-9 && mv.l === 4, 'move: new tile, rot 90deg, level kept');
  check((await battleDoc('bFight')).snapshots.alice.rev === 1, 'the fight snapshot still holds rev 1 after later edits');

  section('stdio: stow_building (bank credit)');
  prev = c;
  const producer = prev.layout.buildings.find(b => {
    const d = P.BUILDING_DEFS[b.t];
    return d && d.produce && !d.produce.raidOnly && b.st > 0 && !prev.layout.tasks.some(k => k.id === b.id);
  });
  r = await call1('stow_building', { id: producer.id });
  t = txt(r);
  check(!r.isError && t.includes(`Stowed`) && t.includes(`${producer.id} (level ${producer.l})`) && t.includes('credited to the bank when the game next syncs'), 'stow_building result', t);
  c = await verifyWrite('stow', prev, 4);
  const credits = Object.entries(c.holdings.bankCredits);
  // The output it held at the last save PLUS what it made since: up to the stow itself.
  const madeTo = Math.floor(P.storedAfter(producer.t, producer.l, producer.st, (c.layout.savedAt - prev.layout.savedAt) / 1000));
  const pay = P.producePayout(P.BUILDING_DEFS[producer.t].produce.type, madeTo);
  check(!c.layout.buildings.some(b => b.id === producer.id) && credits.length === 1 && credits[0][1].reason === 'stow ' + producer.t &&
    credits[0][1].cash === pay.cash && credits[0][1].iron === pay.iron && credits[0][1].wood === pay.wood,
    `stow: ${producer.t} gone, bankCredits {${credits[0] && credits[0][0]}: ${JSON.stringify(pay)}}`, credits);
  check(c.holdings.stowedCounts[producer.t] === (prev.holdings.stowedCounts[producer.t] || 0) + 1 &&
    c.holdings.inventory[producer.t] === (prev.holdings.inventory[producer.t] || 0) + 1, 'stow: stowedCounts +1, inventory +1');
  const task = c.layout.tasks[0];
  check(task && task.id === 'bmumqoxbpr9y8kzmg' && c.layout.buildings[task.i].id === task.id, 'stow: the running upgrade job still points at its building (index re-pointed)', task);

  section('stdio: remove_tree');
  prev = c;
  const tree = prev.layout.buildings.find(b => b.t === 'tree');
  r = await call1('remove_tree', { id: tree.id });
  check(!r.isError && txt(r).includes(`Cleared tree ${tree.id}`), 'remove_tree result', txt(r));
  c = await verifyWrite('remove_tree', prev, 5);
  check(!c.layout.buildings.some(b => b.id === tree.id) && c.layout.buildings.length === prev.layout.buildings.length - 1 && same(c.holdings, prev.holdings), 'remove_tree: tree gone, holdings unchanged (no refund)');

  section('stdio: add_roads / remove_roads');
  prev = c;
  const roadsPrev = new Set(prev.layout.roads);
  // A path from a free tile three tiles east, ending on an already-paved tile (skipped, not an error).
  let rp = null;
  for (let gz = -10; gz <= 10 && !rp; gz++) for (let gx = -10; gx <= 7 && !rp; gx++) {
    const run = [0, 1, 2].map(k => (gx + k) + ',' + gz);
    if (run.every(k => !roadsPrev.has(k)) && roadsPrev.has((gx + 3) + ',' + gz) && Math.hypot(gx + 3, gz) <= 12.7 && Math.hypot(gx, gz) <= 12.7) rp = [gx, gz];
  }
  r = await call1('add_roads', { path: [[rp[0], rp[1]], [rp[0] + 3, rp[1]]] });
  check(!r.isError && txt(r).includes('Drew 3 road tiles, skipped 1 already paved'), 'add_roads path: 3 drawn, 1 skipped', txt(r));
  c = await verifyWrite('add_roads', prev, 6);
  check(c.layout.roads.length === prev.layout.roads.length + 3 && c.holdings.inventory.road === prev.holdings.inventory.road - 3 &&
    [0, 1, 2].every(k => c.layout.roads.includes((rp[0] + k) + ',' + rp[1])), 'add_roads: 3 "gx,gz" strings added, 3 road tiles used');
  prev = c;
  r = await call1('remove_roads', { tiles: [[rp[0], rp[1]], [rp[0] + 1, rp[1]], [lx, lz]] });
  check(!r.isError && txt(r).includes('Erased 2 road tiles (back in the inventory), skipped 1 with no road.'), 'remove_roads: 2 erased, 1 skipped', txt(r));
  c = await verifyWrite('remove_roads', prev, 7);
  check(c.layout.roads.length === prev.layout.roads.length - 2 && c.holdings.inventory.road === prev.holdings.inventory.road + 2 &&
    !c.layout.roads.includes(rp[0] + ',' + rp[1]), 'remove_roads: tiles gone, refunded to the inventory');
  r = await call1('add_roads', { tiles: [[rp[0] + 2, rp[1]]] });
  check(!r.isError && txt(r).startsWith('Nothing to save - the city already looks like that (still rev 7)'), 'add_roads on an already-paved tile: no new version', txt(r));
  check((await cityDoc('alice')).rev === 7 && (await histDocs('alice')).length === 6, 'no-op edit wrote nothing');

  section('stdio: apply_design (several ops, one version)');
  prev = await cityDoc('alice');
  const pm = R.createModel(prev.layout, prev.holdings);
  const [ax, az] = freeTile(pm, 'landmine', [], [-11, -11], [11, -2]);
  const treeB = prev.layout.buildings.filter(b => b.t === 'tree')[0];
  const ops = [
    { op: 'place', type: 'landmine', gx: ax, gz: az },
    { op: 'remove_tree', id: treeB.id },
    { op: 'add_roads', tiles: [[rp[0], rp[1]]] }
  ];
  r = await call1('apply_design', { ops });
  t = txt(r);
  check(!r.isError && t.startsWith('Done - saved as rev 8.') && t.split('\n').filter(l => l.startsWith('- ')).length === 3, 'apply_design: 3 op lines, one rev', t);
  c = await verifyWrite('apply_design', prev, 8);
  check(c.layout.buildings.some(b => b.t === 'landmine' && b.gx === ax && b.gz === az) && !c.layout.buildings.some(b => b.id === treeB.id) &&
    c.layout.roads.includes(rp[0] + ',' + rp[1]) && c.holdings.inventory.landmine === 0, 'apply_design: all three changes in the one version');
  check(/placed Buried Landmine at .*; cleared a tree; drew 1 road tile/.test(c.lastChange.summary), 'apply_design: lastChange summary names each change', c.lastChange.summary);
  check((await histDocs('alice')).length === 7, '7 edits -> 7 history docs');

  // ============================================================ undo
  section('stdio: undo_last_change');
  const hist = Object.fromEntries((await histDocs('alice')).map(h => [h.rev, h]));
  // The design of a layout: everything but the production clock and producers' output.
  const design = (layout) => {
    const l = clone(layout);
    delete l.savedAt;
    for (const b of l.buildings) delete b.st;
    return l;
  };
  const expectState = (cdoc, h, label) => {
    // What cityRules makes of that history version; money (bankCredits) and output are never rolled back.
    const want = R.modelToCloud(R.createModel(h.layout, h.holdings));
    const got = clone(cdoc.holdings);
    delete got.bankCredits;
    delete want.holdings.bankCredits;
    return check(same(design(cdoc.layout), design(want.layout)) && same(got, want.holdings), label);
  };
  const undoSteps = [[9, 7], [10, 6], [11, 5], [12, 4]];
  for (const [newRev, back] of undoSteps) {
    const pre = await cityDoc('alice');
    r = await call1('undo_last_change');
    c = await cityDoc('alice');
    check(!r.isError && txt(r).startsWith(`Undone - saved as rev ${newRev}: the city is back to how it was at rev ${back}`) && txt(r).includes('Call undo_last_change again'),
      `undo -> rev ${newRev} restores rev ${back}`, txt(r));
    expectState(c, hist[back], `undo -> rev ${newRev}: layout + holdings equal history/${back}`);
    check(c.updatedBy === 'mcp' && c.lastChange.summary === 'undid: ' + hist[back].replacedBy.summary, `undo -> rev ${newRev}: lastChange "${c.lastChange.summary}"`);
    clockMoved(`undo -> rev ${newRev}`, pre, c);
  }
  r = await call1('undo_last_change');   // back over the stow: the producer returns EMPTY, the credit stays
  c = await cityDoc('alice');
  const back3 = c.layout.buildings.find(b => b.id === producer.id);
  check(!r.isError && c.rev === 13 && back3 && back3.st === 0 && back3.gx === producer.gx && back3.l === producer.l, 'undo over the stow: producer back on its tile, level kept, output 0 (it was credited)', back3);
  check(Object.keys(c.holdings.bankCredits).length === 1 && same(c.holdings.bankCredits, (await histDocs('alice')).find(h => h.rev === 12).holdings.bankCredits),
    'undo over the stow: the bank credit stays (already promised to the game)');
  check((c.holdings.stowedCounts[producer.t] || 0) === (hist[3].holdings.stowedCounts[producer.t] || 0) &&
    c.holdings.inventory[producer.t] === hist[3].holdings.inventory[producer.t], 'undo over the stow: storage count and inventory back');
  r = await call1('undo_last_change');
  r = await call1('undo_last_change');   // -> rev 15 = the seed city
  c = await cityDoc('alice');
  const seedCloud = R.modelToCloud(R.createModel(TH5.layout, TH5.holdings));
  const hNow = clone(c.holdings); delete hNow.bankCredits;
  const hSeed = clone(seedCloud.holdings); delete hSeed.bankCredits;
  check(!r.isError && c.rev === 15 && same(design(c.layout), design(seedCloud.layout)) && same(hNow, hSeed),
    'seven undos bring back the seeded city\'s design exactly (output and the clock move on)', { rev: c.rev, txt: txt(r).slice(0, 160) });
  const backP = c.layout.buildings.find(b => b.id === producer.id);
  check(backP.st < producer.st || producer.st === 0, 'the stowed-and-credited producer did not get its old output back', { now: backP.st, seed: producer.st });
  check(txt(r).includes('nothing further to undo'), 'the last possible undo says so');
  const bstate = await stateOf('alice');
  r = await call1('undo_last_change');
  check(r.isError && txt(r).startsWith('Refused (NOTHING_TO_UNDO): Nothing left to undo') && await unchanged('alice', bstate), 'an eighth undo is refused and writes nothing', txt(r));

  section('stdio: undo never reverts the game\'s own save; rules still accept the game\'s push');
  r = await call1('place_building', { type: 'landmine', gx: lx, gz: lz });
  check(!r.isError && (await cityDoc('alice')).rev === 16, 'one more AI edit (rev 16)');
  if (rulesEnv) {
    const { doc: fdoc, updateDoc, getDoc, serverTimestamp } = fsClient;
    const aliceDb = rulesEnv.authenticatedContext('alice').firestore();
    const bobDb = rulesEnv.authenticatedContext('bob').firestore();
    const cur = await cityDoc('alice');
    let pushed = null;
    try {
      await updateDoc(fdoc(aliceDb, 'cities', 'alice'), { rev: cur.rev + 1, updatedAt: serverTimestamp(), updatedBy: 'game', writerId: 'session-test', layout: cur.layout, holdings: { ...cur.holdings, bankCredits: {} }, lastChange: { by: 'game', summary: '', at: serverTimestamp() } });
      pushed = true;
    } catch (e) { pushed = e.message; }
    check(pushed === true, 'firestore.rules: the game\'s next push (rev+1, updatedBy game) is allowed on an MCP-written city', pushed);
    let histRead = null;
    try { histRead = (await getDoc(fdoc(aliceDb, 'cities', 'alice', 'history', '15'))).exists(); } catch (e) { histRead = e.message; }
    check(histRead === true, 'firestore.rules: the owner can read the history the MCP server writes', histRead);
    let bobRead = null;
    try { await rut.assertFails(getDoc(fdoc(bobDb, 'cities', 'alice', 'history', '15'))); bobRead = 'denied'; } catch (e) { bobRead = 'allowed: ' + e.message; }
    check(bobRead === 'denied', 'firestore.rules: another player cannot read alice\'s history', bobRead);
  } else {
    await db.collection('cities').doc('alice').update({ rev: 17, updatedBy: 'game', writerId: 'session-test', lastChange: { by: 'game', summary: '', at: Timestamp.now() } });
  }
  const afterGame = await stateOf('alice');
  r = await call1('undo_last_change');
  check(r.isError && txt(r).includes('Nothing to undo: the current version of the city (rev 17) was saved by the game') && await unchanged('alice', afterGame),
    'undo after a game save is refused and writes nothing', txt(r));
  r = await call1('get_city');
  check(!r.isError && r.structuredContent.rev === 17 && txt(r).includes('Cloud version rev 17, last saved by the game.'), 'get_city sees the game\'s rev 17', txt(r).slice(0, 220));

  // usage counters: flushed on exit
  await s1.client.close();
  await sleep(300);
  const a1 = await tokenDoc('A1');
  check(a1.lastUsedAt instanceof Timestamp && a1.uses === a1Calls, `token usage: lastUsedAt set, uses == ${a1Calls} calls (flushed on exit)`, { uses: a1.uses, calls: a1Calls });
  check(Object.keys(a1).every(k => ['uid', 'label', 'createdAt', 'revoked', 'scope', 'lastUsedAt', 'uses'].includes(k)), 'token doc: only lastUsedAt/uses added');

  // ============================================================ auth failures over stdio
  section('stdio: missing / malformed / unknown / revoked / wrong-scope tokens');
  const aliceBefore = await stateOf('alice');
  const authCases = [
    [null, 'MISSING_TOKEN', /No City Siege access token was given.*CITY_SIEGE_TOKEN/],
    ['hello', 'MALFORMED_TOKEN', /does not look like a City Siege token/],
    [TOK.UNKNOWN, 'UNKNOWN_TOKEN', /Unknown access token.*ACCOUNT -> AI Designer \(MCP\)/],
    [TOK.AREV, 'REVOKED_TOKEN', /\("old laptop"\) was revoked in the game/],
    [TOK.ASCOPE, 'BAD_SCOPE', /scope "admin"/]
  ];
  for (const [tok, code, re] of authCases) {
    const s = stdioClient(tok);
    await s.connect();
    const lt = await s.client.listTools();
    const g = await s.client.callTool({ name: 'get_city', arguments: {} });
    const p = await s.client.callTool({ name: 'place_building', arguments: { type: 'landmine', gx: 0, gz: 0 } });
    check(lt.tools.length === 14 && g.isError && txt(g).startsWith(`Access denied (${code}): `) && re.test(txt(g)) && p.isError && txt(p).startsWith(`Access denied (${code})`),
      `token ${tok === null ? '(none)' : tok.slice(0, 8) + '...'} -> ${code}`, txt(g));
    if (tok === null) check(s.log.join('').includes('CITY_SIEGE_TOKEN is not set'), 'missing token is also logged on stderr at startup');
    await s.client.close();
  }
  check(await unchanged('alice', aliceBefore), 'bad tokens changed nothing');
  check((await tokenDoc('AREV')).uses === undefined && (await tokenDoc('ASCOPE')).uses === undefined, 'refused tokens get no usage recorded');

  section('stdio: token cache (30 s default) and revocation');
  const s3 = stdioClient(TOK.A3, { MCP_AUTH_CACHE_MS: '1500' });
  await s3.connect();
  r = await s3.client.callTool({ name: 'get_rules', arguments: {} });
  check(!r.isError, 'A3 works');
  await db.collection('mcpTokens').doc(sha(TOK.A3)).update({ revoked: true });
  r = await s3.client.callTool({ name: 'get_rules', arguments: {} });
  check(!r.isError, 'revoked a moment ago: still served from the auth cache');
  await sleep(1700);
  r = await s3.client.callTool({ name: 'get_city', arguments: {} });
  check(r.isError && txt(r).startsWith('Access denied (REVOKED_TOKEN)') && txt(r).includes('"revoke me"'), 'after the cache expires the revoked token is refused', txt(r));
  await s3.client.close();


  // ============================================================ production clock (review: stow lost output, place got backdated output)
  section('stdio: the production clock moves with every write (stow credits output up to now; a placed producer starts empty NOW)');
  {
    const sp = stdioClient(TOK.P1);
    await sp.connect();
    const callP = (name, args = {}) => sp.client.callTool({ name, arguments: args });
    const seed = seedCities.pat;
    const MILL = 'bmumqoxbxiekjscmz';
    const mill = seed.layout.buildings.find(b => b.id === MILL);
    // The game would show this now (restoreCity credits the 3 h since savedAt).
    const shown = Math.floor(P.storedAfter('lumber_mill', mill.l, 0, (Date.now() - seed.layout.savedAt) / 1000));
    let rr = await callP('apply_design', { dry_run: true, ops: [{ op: 'stow', id: MILL }] });
    check(!rr.isError && rr.structuredContent.results[0].credit && rr.structuredContent.results[0].credit.wood >= shown - 10,
      `dry run: stowing the mill would credit the ${shown} wood the game shows, not the 0 of the last push`, rr.structuredContent.results[0].credit);
    rr = await callP('stow_building', { id: MILL });
    const c1 = await cityDoc('pat');
    const cr = Object.values(c1.holdings.bankCredits)[0];
    const want = P.producePayout('wood', Math.floor(P.storedAfter('lumber_mill', mill.l, 0, (c1.layout.savedAt - seed.layout.savedAt) / 1000)));
    check(!rr.isError && cr && cr.wood === want.wood && cr.wood >= shown && new RegExp(`Its stored output \\(${want.wood} wood\\)`).test(txt(rr)),
      `stow: bank credit = the ${want.wood} wood made in the 3 h since the game's last push (was 0 before the fix)`, { credit: cr, text: txt(rr).split('\n')[1] });
    check(Math.abs(Date.now() - c1.layout.savedAt) < 60000, 'stow: savedAt stamped with the write time', c1.layout.savedAt);
    const foundry0 = seed.layout.buildings.find(b => b.t === 'iron_foundry');
    const standing = c1.layout.buildings.find(b => b.id === foundry0.id);
    check(standing.st === Math.floor(P.storedAfter('iron_foundry', foundry0.l, foundry0.st, (c1.layout.savedAt - seed.layout.savedAt) / 1000)),
      'stow: the other producers carry their output up to the write (st and savedAt moved together)', standing.st);

    const pm = R.createModel(c1.layout, c1.holdings);
    const [px, pz] = freeTile(pm, 'iron_foundry', [], [-11, 4], [11, 11]);
    rr = await callP('place_building', { type: 'iron_foundry', gx: px, gz: pz });
    const c2 = await cityDoc('pat');
    const nf = c2.layout.buildings.find(b => b.id === (rr.structuredContent && rr.structuredContent.results[0].id));
    // What the open game gives it on the live apply: restoreCity(cloud, Date.now()) credits (now - savedAt).
    const gameShows = nf ? Math.floor(P.storedAfter('iron_foundry', nf.l, nf.st, (Date.now() - c2.layout.savedAt) / 1000)) : null;
    check(!rr.isError && nf && nf.l === 2 && nf.st === 0 && gameShows !== null && gameShows < 200,
      `place from storage: st 0 at savedAt = now, so the game's restore credits seconds (${gameShows} iron), not the 3 h before it existed (32400 before the fix)`,
      { st: nf && nf.st, gameShows, savedAtAgeMs: Date.now() - c2.layout.savedAt });
    await sleep(1100);
    rr = await callP('stow_building', { id: nf.id });
    const c3 = await cityDoc('pat');
    const cr2 = Object.values(c3.holdings.bankCredits).find(x => x.reason === 'stow iron_foundry');
    const maxMade = P.produceRateFor('iron_foundry', 2) * (c3.layout.savedAt - c2.layout.savedAt) / 1000;
    check(!rr.isError && cr2 && cr2.iron <= Math.ceil(maxMade) && cr2.iron > 0,
      `stow -> place -> stow mints nothing twice: the second stow credits only the ${cr2 && cr2.iron} iron made while it stood (<= ${maxMade.toFixed(1)})`, cr2);
    r = await callP('undo_last_change');
    const c4 = await cityDoc('pat');
    const back = c4.layout.buildings.find(b => b.id === nf.id);
    check(!r.isError && back && back.st === 0 && Math.abs(Date.now() - c4.layout.savedAt) < 60000,
      'undo over that stow: the foundry returns empty at savedAt = now (its output was credited)', back);
    rr = await callP('list_buildings', { type: 'iron_foundry' });
    const liveRow = rr.structuredContent.buildings.find(b => b.id === foundry0.id);
    check(liveRow && liveRow.stored >= standing.st, 'list_buildings reports output as of now (what the open game shows)', liveRow);
    // Review round 2: the next undo takes that foundry off the map (it reverts its placement). 3 h later it
    // is full, and that output must be credited as a stow credits it, not thrown away with the building.
    await db.collection('cities').doc('pat').update({ 'layout.savedAt': c4.layout.savedAt - 3 * 3600e3 });
    const made = Math.floor(P.storedAfter('iron_foundry', 2, 0, 3 * 3600 + (Date.now() - c4.layout.savedAt) / 1000));
    const creditsBefore = Object.keys(c4.holdings.bankCredits).length;
    r = await callP('undo_last_change');
    const c5 = await cityDoc('pat');
    const newCredits = Object.entries(c5.holdings.bankCredits).filter(([id]) => !(id in c4.holdings.bankCredits));
    const uc = newCredits[0] && newCredits[0][1];
    check(!r.isError && !c5.layout.buildings.some(b => b.id === nf.id) && newCredits.length === 1 && uc.reason === 'stow iron_foundry' &&
      uc.iron >= made - 5 && uc.iron <= P.produceCapacityFor('iron_foundry', 2) && Object.keys(c5.holdings.bankCredits).length === creditsBefore + 1,
    `undo of a placement: the ${made} iron the foundry made meanwhile is credited (was lost before the fix), older credits kept`, { newCredits, made });
    check(new RegExp(`credited to the bank when the game next syncs.*Iron Foundry ${nf.id} ${uc && uc.iron} iron`).test(txt(r)) &&
      r.structuredContent.credits.length === 1 && c5.holdings.stowedCounts.iron_foundry === (c2.holdings.stowedCounts.iron_foundry || 0) + 1,
    'the undo reply names the credit, and the foundry is back in storage', txt(r));
    // Review round 2: paid credits stay in the city until the game's next real push; get_city must not call them pending.
    const allCredits = Object.keys(c5.holdings.bankCredits);
    await db.collection('saves').doc('pat').set({ bank: { cash: 1, iron: 2, wood: 3, gems: 0, vehicleLives: 0 }, credited: [allCredits[0]] });
    rr = await callP('get_city', { ids: false });
    const pend = (txt(rr).match(/PENDING BANK CREDITS: (\d+)/) || [])[1];
    check(allCredits.length === 3 && pend === '2' && rr.structuredContent.summary.pendingBankCredits === 2 && !/"cash":1\b|bank: \{/.test(JSON.stringify(rr.structuredContent)),
      'get_city: a credit already in saves.credited is not pending (2 of 3), and nothing of the bank is shown', { allCredits, line: txt(rr).split('\n').find(l => /PENDING/.test(l)) });
    await db.collection('saves').doc('pat').set({ credited: allCredits }, { merge: true });
    rr = await callP('get_city', { ids: false });
    check(!/PENDING BANK CREDITS/.test(txt(rr)) && rr.structuredContent.summary.pendingBankCredits === 0, 'get_city: all paid -> no PENDING line', txt(rr).split('\n').find(l => /PENDING/.test(l)));
    // Paid credits are dropped by the next AI write, and an undo does not bring them back (left in the
    // city they piled up until the game pushed just to clear them, ending the AI's undo chain).
    await db.collection('saves').doc('pat').set({ credited: allCredits.slice(0, 2) }, { merge: true });
    const cBefore = await cityDoc('pat');
    const tile = cBefore.layout.roads.find(k => { const [x, z] = k.split(',').map(Number); return Math.hypot(x, z) <= 8; });
    r = await callP('remove_roads', { tiles: [tile.split(',').map(Number)] });
    const c6 = await cityDoc('pat');
    check(!r.isError && same(Object.keys(c6.holdings.bankCredits), [allCredits[2]]),
      'an AI write drops the credits saves.credited already holds (2 paid dropped, the unpaid one kept)', Object.keys(c6.holdings.bankCredits));
    r = await callP('undo_last_change');
    const c7 = await cityDoc('pat');
    check(!r.isError && c7.layout.roads.includes(tile) && same(Object.keys(c7.holdings.bankCredits), [allCredits[2]]),
      'undo restores the road but not the paid credits', Object.keys(c7.holdings.bankCredits));
    await db.collection('saves').doc('pat').delete();
    await sp.client.close();
  }

  // ============================================================ roads / reach / coverage (review: the AI could not tell on-road from off-road, nor ranges)
  section('stdio: road tiles, trap/barrier road placement, reach and coverage reach the AI');
  {
    const st = stdioClient(TOK.T1);
    await st.connect();
    const callT = (name, args = {}) => st.client.callTool({ name, arguments: args });
    const tm = R.createModel(seedCities.tom.layout, seedCities.tom.holdings);
    const roadSet = new Set(tm.layout.roads);
    let rr = await callT('get_city', { ids: false });
    let tt = txt(rr);
    check(!rr.isError && tt.includes('ROAD TILES (116, by row') && tt.includes('gz 0: gx -15..15') && tt.includes('gz -7: gx 0, 7') &&
      rr.structuredContent.roadTiles.length === 116 && rr.structuredContent.roadTiles.every(([x, z]) => roadSet.has(x + ',' + z)),
      'get_city: every road tile, as row runs in the text and [gx,gz] pairs in structuredContent', tt.split('ROAD TILES')[1] && tt.split('ROAD TILES')[1].slice(0, 120));
    check(tt.includes("a letter hides a road under it"), 'get_city map legend says a letter hides the road under it');
    rr = await callT('get_catalog');
    tt = txt(rr);
    const lineOf = (t) => tt.split('\n').find(l => l.startsWith(t + ' - ')) || '';
    check(/Reach: range 11\.6 tiles\./.test(lineOf('sniper_tower')) && /Advice: Out-ranges every other defense/.test(lineOf('sniper_tower')),
      'get_catalog: sniper range 11.6 tiles + the game\'s "place it deep in the base" advice', lineOf('sniper_tower').slice(-240));
    check(/Reach: range 4 tiles\./.test(lineOf('tesla_coil')) && /Reach: trigger radius 0\.8 tiles\. Works only on or right next to a road/.test(lineOf('spring_trap')) &&
      /Blocks only its own tile: put it ON a road tile/.test(lineOf('spike_trap')) && /Reach: aura 5\.5 tiles/.test(lineOf('solar_array')),
      'get_catalog: tesla 4 tiles, spring trap 0.8 tiles (on a road), barrier on a road, solar aura 5.5 tiles');
    check(rr.structuredContent.catalog.find(c => c.type === 'missile_silo').reach === 'range 10 tiles', 'get_catalog structuredContent carries reach');
    rr = await callT('get_rules');
    check(/REACH \(level 1, in tiles/.test(txt(rr)) && /sniper_tower 11\.6 tiles \(TH2\)/.test(txt(rr)) && /spring_trap 0\.8 tiles/.test(txt(rr)), 'get_rules: REACH section from progression data');
    rr = await callT('list_buildings');
    tt = txt(rr);
    const spring = rr.structuredContent.buildings.find(b => b.id === 'bmumqoxbxvkgtdp75');
    const snip = rr.structuredContent.buildings.find(b => b.id === 'bmumqoxbmookjzgrj');
    check(spring.onRoad === true && spring.reachesRoad === true && spring.reach.tiles === 0.8 && tt.includes('bmumqoxbxvkgtdp75  spring_trap  (0,-8)  L1  1x1  [trigger radius 0.8 tiles]  [on road]'),
      'list_buildings: a trap row says on road + its trigger radius', spring);
    check(snip.reach.kind === 'turret' && snip.reach.tiles === 15.8 && tt.includes('bmumqoxbmookjzgrj  sniper_tower  (3,-8)  L4  2x2  [range 15.8 tiles]'),
      'list_buildings: a level-4 sniper reaches 15.8 tiles (12% per level)', snip.reach);

    // Traps: on a road / next to one / nowhere near one; a barrier off the road.
    const nearest = (x, z) => Math.min(...[...roadSet].map(k => { const [a, b] = k.split(',').map(Number); return Math.hypot(a - x, b - z); }));
    const free1 = (pred) => { for (let gz = -11; gz <= 11; gz++) for (let gx = -11; gx <= 11; gx++) if (pred(gx, gz) && R.checkPlace(tm, 'landmine', gx, gz, { inventory: false, limits: false }).ok) return [gx, gz]; return null; };
    const onT = free1((x, z) => roadSet.has(x + ',' + z));
    const nextT = free1((x, z) => !roadSet.has(x + ',' + z) && nearest(x, z) === 1);
    const farT = free1((x, z) => !roadSet.has(x + ',' + z) && nearest(x, z) >= 2);
    rr = await callT('apply_design', { dry_run: true, ops: [
      { op: 'place', type: 'landmine', gx: onT[0], gz: onT[1] },
      { op: 'place', type: 'landmine', gx: nextT[0], gz: nextT[1] },
      { op: 'place', type: 'spike_trap', gx: farT[0], gz: farT[1] }
    ] });
    const ls = txt(rr).split('\n').filter(l => l.startsWith('- '));
    const res = rr.structuredContent.results;
    check(!rr.isError && ls[0].endsWith('Road: on a road tile.') && res[0].onRoad === true,
      `place landmine ON the road ${JSON.stringify(onT)}: "Road: on a road tile."`, ls[0]);
    check(/Road: not on a road tile, but its 1\.5-tile trigger radius reaches the road \(nearest road tile \(-?\d+,-?\d+\), 1 tile away\)\.$/.test(ls[1]) &&
      res[1].onRoad === false && res[1].reachesRoad === true, `place landmine NEXT to the road ${JSON.stringify(nextT)}: reaches it`, ls[1]);
    check(/Road: OFF-ROAD: no road on \(-?\d+,-?\d+\) \(nearest road tile .*a barrier blocks only its own tile/.test(ls[2]) && res[2].onRoad === false,
      `place spike trap OFF the road ${JSON.stringify(farT)}: says OFF-ROAD`, ls[2]);
    const farTrap = free1((x, z) => !roadSet.has(x + ',' + z) && nearest(x, z) >= 2);
    rr = await callT('apply_design', { dry_run: true, ops: [{ op: 'move', id: 'bmumqoxbxvkgtdp75', gx: farTrap[0], gz: farTrap[1] }] });
    check(/Road: OFF-ROAD: its 0\.8-tile trigger radius reaches no road .*will not set it off\.$/.test(txt(rr).split('\n').find(l => l.startsWith('- '))) &&
      rr.structuredContent.results[0].reachesRoad === false, 'move a spring trap off the road: OFF-ROAD, raiders will not set it off', txt(rr).split('\n')[1]);
    // Judged after all ops: a trap placed, then the road drawn under it in the same call, is on the road.
    rr = await callT('apply_design', { dry_run: true, ops: [{ op: 'place', type: 'landmine', gx: farT[0], gz: farT[1] }, { op: 'add_roads', tiles: [farT] }] });
    check(txt(rr).split('\n')[1].endsWith('Road: on a road tile.'), 'the road note is judged on the city after every op (road drawn under it later in the call)', txt(rr).split('\n')[1]);

    rr = await callT('validate_design');
    tt = txt(rr);
    check(/COVERAGE - turrets whose range/.test(tt) && tt.includes('- South Gate (0,15): NO turret reaches it.') &&
      /- North Gate \(0,-15\): 2 turrets - Sniper Watchtower bmumqoxbmookjzgrj \(3,-8\) L4 \[7\.6\/15\.8\]/.test(tt) &&
      tt.includes('ROAD PLACEMENT: 13 of 13 traps and barriers are on a road') && /moving buildings never changes them/.test(tt),
      'validate_design: COVERAGE per gate + Town Hall, ROAD PLACEMENT, and that the score ignores placement', tt.split('COVERAGE')[1] && tt.split('COVERAGE')[1].slice(0, 400));
    const score0 = rr.structuredContent.defense.score;
    // Move a sniper to cover the uncovered South Gate, and put a spike trap off the road: both show.
    const sniperS = 'bmumqoxbnj2p4suve';
    let sTile = null;
    for (let gz = 11; gz >= 4 && !sTile; gz--) for (let gx = -6; gx <= 6 && !sTile; gx++) {
      if (!roadSet.has(gx + ',' + gz) && Math.hypot(gx, gz - 15) * 5.5 <= P.turretStatsFor('sniper_tower', 2).range &&
        R.checkPlace(tm, 'sniper_tower', gx, gz, { ignoreId: sniperS, inventory: false, limits: false }).ok) sTile = [gx, gz];
    }
    rr = await callT('apply_design', { ops: [{ op: 'move', id: sniperS, gx: sTile[0], gz: sTile[1] }, { op: 'place', type: 'spike_trap', gx: farT[0], gz: farT[1] }] });
    check(!rr.isError, 'real apply_design: sniper toward the South Gate + an off-road spike trap', txt(rr).slice(0, 200));
    rr = await callT('validate_design');
    tt = txt(rr);
    const south = rr.structuredContent.coverage.find(p => p.name === 'South Gate');
    check(south.turrets.some(x => x.id === sniperS) && new RegExp(`- South Gate \\(0,15\\): 1 turret - Sniper Watchtower ${sniperS}`).test(tt) &&
      rr.structuredContent.defense.score === score0,
      'after the move COVERAGE shows the South Gate covered, while the score is unchanged (it ignores placement)', { south, score: rr.structuredContent.defense.score, score0 });
    check(tt.includes('ROAD PLACEMENT: 13 of 14 traps and barriers are on a road') && new RegExp(`- Spike Trap \\S+ at \\(${farT[0]},${farT[1]}\\): OFF-ROAD`).test(tt) &&
      rr.structuredContent.offRoad.length === 1, 'validate_design lists the off-road spike trap', tt.split('ROAD PLACEMENT')[1] && tt.split('ROAD PLACEMENT')[1].slice(0, 300));
    const pf2 = await st.client.getPrompt({ name: 'fortify_for_battle', arguments: {} });
    const pft = pf2.messages[0].content.text;
    check(/COVERAGE/.test(pft) && /ROAD TILES/.test(pft) && /do not present an unchanged score/.test(pft) && !/the new defense score and gem bounty/.test(pft),
      'fortify_for_battle: asks for coverage and on-road checks, not an unchanged score as a result');
    await st.client.close();
  }

  // ============================================================ parallel edits (review: contended transactions, seconds each, some INTERNAL)
  section('stdio: parallel edits from one client are queued, not fighting over one transaction');
  {
    const sq = stdioClient(TOK.Q1);
    await sq.connect();
    await sq.client.callTool({ name: 'get_rules', arguments: {} });   // warm the token cache
    const qm = R.createModel(seedCities.quinn.layout, seedCities.quinn.holdings);
    const qRoads = new Set(qm.layout.roads);
    const tiles6 = [];
    for (let gz = -9; gz <= 9 && tiles6.length < 6; gz++) for (let gx = -9; gx <= 9 && tiles6.length < 6; gx++) if (!qRoads.has(gx + ',' + gz) && Math.hypot(gx, gz) <= 11) tiles6.push([gx, gz]);
    const t0 = Date.now();
    const par6 = await Promise.all(tiles6.map(tl => sq.client.callTool({ name: 'add_roads', arguments: { tiles: [tl] } })));
    const wall = Date.now() - t0;
    const q = await cityDoc('quinn');
    check(par6.every(x => !x.isError) && q.rev === 7 && same(par6.map(x => x.structuredContent.rev).sort((a, b) => a - b), [2, 3, 4, 5, 6, 7]) &&
      tiles6.every(([x, z]) => q.layout.roads.includes(x + ',' + z)) && (await histDocs('quinn')).length === 6,
      '6 parallel add_roads over stdio: all saved, revs 2..7, 6 history docs', { errs: par6.filter(x => x.isError).map(txt), rev: q.rev });
    check(wall < 2500, `6 parallel edits took ${wall} ms in total (queued; contended transactions took 2-12 s each before)`, wall);
    await sq.client.close();
  }

  // ============================================================ pre-auth throttle, in process (review: unlimited Firestore reads for junk tokens)
  section('auth: unrecognised tokens are throttled BEFORE their Firestore lookup');
  {
    const { TokenAuth, AuthError: AE } = await import('../src/auth.js');
    let reads = 0;
    const realHash = sha(TOK.A1);
    const fakeDb = { collection: () => ({ doc: (h) => ({ get: async () => { reads++; await sleep(2); return h === realHash ? { exists: true, data: () => ({ uid: 'alice', scope: 'design', revoked: false, label: 'x' }) } : { exists: false, data: () => undefined }; } }) }) };
    const ta = new TokenAuth(fakeDb, { missLimits: { source: 20, global: 50 } });
    const junk = (i) => mkToken('junk-' + i);
    const codes = await Promise.all(Array.from({ length: 60 }, (_, i) => ta.authenticate(junk(i), { source: '203.0.113.7' }).then(() => 'OK', e => e.code)));
    const count = (arr, c) => arr.filter(x => x === c).length;
    check(reads === 20 && count(codes, 'UNKNOWN_TOKEN') === 20 && count(codes, 'AUTH_THROTTLED') === 40,
      '60 parallel junk tokens from one address: 20 Firestore reads, 40 refused before any read', { reads, unknown: count(codes, 'UNKNOWN_TOKEN'), throttled: count(codes, 'AUTH_THROTTLED') });
    let thr = null;
    try { await ta.authenticate(junk(99), { source: '203.0.113.7' }); } catch (e) { thr = e; }
    check(thr instanceof AE && thr.code === 'AUTH_THROTTLED' && thr.retryAfterSec > 0 && /retry in \d+ s/i.test(thr.message), 'the refusal says when to retry', thr && thr.message);
    const fresh = await ta.authenticate(TOK.A1, { source: '203.0.113.7' }).then(w => w.uid, e => e.code);
    check(fresh === 'AUTH_THROTTLED' && reads === 20, 'a token this server has never seen is not looked up from the throttled address either (until the minute passes)', { fresh, reads });
    const ok = await ta.authenticate(TOK.A1, { source: '198.51.100.9' }).then(w => w.uid, e => e.code);
    check(ok === 'alice' && reads === 21, 'from another address it is looked up, and a token that exists gives its budget back', { ok, reads });
    const ok2 = await ta.authenticate(TOK.A1, { source: '203.0.113.7' }).then(w => w.uid, e => e.code);
    check(ok2 === 'alice' && reads === 21, 'once it has resolved, it works from the throttled address too', { ok2, reads });
    const codes2 = await Promise.all(Array.from({ length: 40 }, (_, i) => ta.authenticate(junk(100 + i), { source: '198.51.100.9' }).then(() => 'OK', e => e.code)));
    check(reads === 41 && count(codes2, 'UNKNOWN_TOKEN') === 20 && count(codes2, 'AUTH_THROTTLED') === 20,
      'a second address gets its own 20 lookups a minute', { reads, u: count(codes2, 'UNKNOWN_TOKEN'), t: count(codes2, 'AUTH_THROTTLED') });
    const codes3 = await Promise.all(Array.from({ length: 40 }, (_, i) => ta.authenticate(junk(200 + i), { source: '192.0.2.44' }).then(() => 'OK', e => e.code)));
    check(reads === 51 && count(codes3, 'UNKNOWN_TOKEN') === 10 && count(codes3, 'AUTH_THROTTLED') === 30,
      'the process-wide cap (50 a minute here) stops a third address after 10', { reads, u: count(codes3, 'UNKNOWN_TOKEN'), t: count(codes3, 'AUTH_THROTTLED') });
    ta.cache.clear();
    const again = await ta.authenticate(TOK.A1, { source: '192.0.2.1' }).then(w => w.uid, e => e.code);
    check(again === 'alice' && reads === 52, 'a token that resolved once is never throttled, even with every budget spent (cache expired: one read)', { again, reads });
    const before = reads;
    const mal = await ta.authenticate('csk_' + 'A'.repeat(21), { source: 'x' }).then(() => 'OK', e => e.code);
    check(mal === 'MALFORMED_TOKEN' && reads === before, 'a token that is not csk_ + 43 characters is refused without a lookup', mal);
    // Review round 2: the process cap must not lock out a player whose token this process has never seen
    // (every player after a restart, and any new token), and a throttled caller is never told the token is wrong.
    check(!/cop(y|ied)/i.test(thr.message) && /not checked/.test(thr.message) && /someone else/.test(thr.message),
      'the per-address refusal says the token was NOT checked (no "copy it again")', thr.message);
    const { sourceKey } = await import('../src/auth.js');
    check(sourceKey('2001:db8:1:2::5') === '2001:db8:1:2::/64' && sourceKey('[2001:DB8:1:2:ffff:0:0:1]:443') === '2001:db8:1:2::/64' &&
      sourceKey('::ffff:203.0.113.7') === '203.0.113.7' && sourceKey('203.0.113.7:5555') === '203.0.113.7' && sourceKey('stdio') === 'stdio',
    'sourceKey: IPv6 by its /64, IPv4 (also mapped / with a port) as is, anything else unchanged');
    const realHashes = new Map([TOK.A1, TOK.B1].map(t => [sha(t), t]));
    let reads2 = 0;
    const fakeDb2 = { collection: () => ({ doc: (h) => ({ get: async () => { reads2++; await sleep(2); return realHashes.has(h) ? { exists: true, data: () => ({ uid: 'alice', scope: 'design', revoked: false, label: 'x' }) } : { exists: false, data: () => undefined }; } }) }) };
    const tb = new TokenAuth(fakeDb2, { missLimits: { source: 20, global: 40, quiet: 5 } });
    await Promise.all(Array.from({ length: 40 }, (_, i) => tb.authenticate(junk(300 + i), { source: `198.18.0.${1 + (i % 4)}` }).catch(() => {})));
    check(reads2 === 40, 'setup: the process-wide cap (40 here) is spent by four addresses, 10 each', reads2);
    const newcomer = await tb.authenticate(TOK.A1, { source: '198.18.7.7' }).then(w => w.uid, e => e.code);
    check(newcomer === 'alice' && reads2 === 41, 'over the process cap, a quiet caller with a token this process never saw still gets its lookup', { newcomer, reads2 });
    const busy = await tb.authenticate(junk(400), { source: '198.18.0.1' }).then(() => 'OK', e => e);
    check(busy.code === 'AUTH_THROTTLED' && /too many unrecognised ones/.test(busy.message) && /not checked/.test(busy.message) &&
      !/cop(y|ied)/i.test(busy.message) && reads2 === 41,
    'a flooding address (10 this minute) gets no quiet-lane lookup, and the refusal does not blame the token', busy.message);
    const quiet = await Promise.all(Array.from({ length: 6 }, (_, i) => tb.authenticate(junk(500 + i), { source: `198.18.9.${i}` }).then(() => 'OK', e => e.code)));
    check(count(quiet, 'UNKNOWN_TOKEN') === 5 && count(quiet, 'AUTH_THROTTLED') === 1 && reads2 === 46,
      'the quiet lane has its own process-wide cap (5 here): worst case is global + quiet reads a minute', { quiet, reads2 });
    const tp = new TokenAuth(fakeDb2);
    const par = await Promise.all(Array.from({ length: 6 }, () => tp.authenticate(TOK.B1, { source: '198.18.8.8' }).then(w => w.uid, e => e.code)));
    check(par.every(x => x === 'alice') && reads2 === 47, 'six parallel first calls with one new token: one read, all accepted', { par, reads2 });
    const v6 = new TokenAuth(fakeDb2, { missLimits: { source: 20, global: 1000, quiet: 500 } });
    const at = reads2;
    const v6codes = await Promise.all(Array.from({ length: 30 }, (_, i) => v6.authenticate(junk(600 + i), { source: `2001:db8:77:1::${(i + 1).toString(16)}` }).then(() => 'OK', e => e.code)));
    check(reads2 - at === 20 && count(v6codes, 'AUTH_THROTTLED') === 10, 'rotating addresses inside one IPv6 /64 shares one 20-a-minute budget', { reads: reads2 - at, v6codes });
  }

  // ============================================================ HTTP transport
  section('HTTP transport');
  const health = await startHttp();
  check(health.ok === true && health.transport === 'http' && health.project === PROJECT, 'GET /healthz', health);
  let resp = await fetch(`http://127.0.0.1:${PORT}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
  let body = await resp.json();
  check(resp.status === 401 && /Missing "Authorization: Bearer <token>" header.*ACCOUNT -> AI Designer/.test(body.error.message), 'POST /mcp without a token -> 401 with instructions', body);
  resp = await fetch(`http://127.0.0.1:${PORT}/mcp`);
  check(resp.status === 405, 'GET /mcp -> 405 (stateless server)');
  let connErr = null;
  try { await httpClient(null); } catch (e) { connErr = { code: e.code, message: e.message }; }
  check(connErr && connErr.code === 401 && /Missing \\"Authorization: Bearer <token>\\" header/.test(connErr.message), 'SDK client without a token fails to connect: HTTP 401 + the instructions', connErr);
  const hBad = await httpClient(TOK.UNKNOWN);
  r = await hBad.callTool({ name: 'get_city', arguments: {} });
  check(r.isError && txt(r).startsWith('Access denied (UNKNOWN_TOKEN)'), 'HTTP with an unknown token: readable Access denied per tool call', txt(r));
  await hBad.close();

  const bobBefore = await cityDoc('bob');
  const aliceBeforeHttp = await stateOf('alice');
  const hb = await httpClient(TOK.B1);
  const ht = await hb.listTools();
  check(same(ht.tools.map(x => x.name).sort(), EXPECTED_TOOLS), 'HTTP listTools: the same 14 tools');
  r = await hb.callTool({ name: 'get_city', arguments: {} });
  check(!r.isError && txt(r).startsWith('Bob\'s city - Town Hall 1') && r.structuredContent.uid === 'bob', 'HTTP get_city: bob\'s own city');
  check(/vs Alice .*DESIGN phase/.test(txt(r)) && /vs Carol .*FIGHT phase/.test(txt(r)), 'HTTP get_city: bob\'s battles');
  const bm = R.createModel(bobBefore.layout, bobBefore.holdings);
  r = await hb.callTool({ name: 'place_building', arguments: { type: 'sniper_tower', gx: 0, gz: 0 } });
  check(r.isError && txt(r).startsWith('Refused (LOCKED): Sniper Watchtower unlocks at Town Hall 2'), 'HTTP: LOCKED (bob is Town Hall 1)', txt(r));
  const [bx, bz] = freeTile(bm, 'lumber_mill');
  r = await hb.callTool({ name: 'place_building', arguments: { type: 'lumber_mill', gx: bx, gz: bz } });
  check(!r.isError && txt(r).startsWith('Done - saved as rev 2'), 'HTTP place_building saves (rev 2)', txt(r));
  const bobAfter = await cityDoc('bob');
  check(bobAfter.rev === 2 && bobAfter.writerId === 'mcp:' + sha(TOK.B1).slice(0, 8) && bobAfter.layout.buildings.some(b => b.t === 'lumber_mill' && b.gx === bx && b.gz === bz),
    'HTTP write landed in cities/bob with bob\'s token writer id');
  check(bobAfter.layout.savedAt > bobBefore.layout.savedAt && Math.abs(Date.now() - bobAfter.layout.savedAt) < 60000, 'HTTP write: savedAt moved to the write time');
  const bOther = await battleDoc('bOther');
  check(bOther.snapshots.bob && bOther.snapshots.bob.rev === 1 && !bOther.snapshots.carol, 'HTTP write locked bob\'s fight battle vs Carol first (bob only)');
  check(!(await battleDoc('bDesign')).snapshots.bob, 'HTTP write: bob\'s design-phase battle not locked');
  check(await unchanged('alice', aliceBeforeHttp), 'bob\'s edit did not touch alice\'s city');
  await hb.close();

  section('HTTP: the other refusals (frank, gina) and a missing city (dave)');
  const frankBefore = await stateOf('frank');
  const hf = await httpClient(TOK.F1);
  const fm = R.createModel(cities.frank.layout, cities.frank.holdings);
  const [ffx, ffz] = freeTile(fm, 'laser_obelisk');
  r = await hf.callTool({ name: 'place_building', arguments: { type: 'laser_obelisk', gx: ffx, gz: ffz } });
  check(r.isError && /^Refused \(LOCKED\): Laser Obelisk unlocks at Town Hall 6; this city is Town Hall 5/.test(txt(r)), 'LOCKED (TH6 type at TH5)', txt(r));
  r = await hf.callTool({ name: 'place_building', arguments: { type: atLimitType, gx: ffx, gz: ffz } });
  check(r.isError && txt(r).startsWith('Refused (AT_LIMIT)') && /already placed \(the Town Hall 5 limit\)/.test(txt(r)), `AT_LIMIT (${atLimitType})`, txt(r));
  r = await hf.callTool({ name: 'stow_building', arguments: { id: 'bmumqowj74is3id5f' } });
  check(r.isError && txt(r).startsWith(`Refused (STORAGE_FULL): Big Storage is full: ${th5Storage.capacity} of ${th5Storage.capacity}`), 'STORAGE_FULL', txt(r));
  r = await hf.callTool({ name: 'add_roads', arguments: { tiles: [[ffx, ffz]] } });
  check(r.isError && txt(r).startsWith('Refused (NO_ROAD_INVENTORY)') && txt(r).includes('Nothing was drawn'), 'NO_ROAD_INVENTORY', txt(r));
  check(await unchanged('frank', frankBefore), 'frank: nothing written');
  await hf.close();
  const ginaBefore = await stateOf('gina');
  const hg = await httpClient(TOK.G1);
  r = await hg.callTool({ name: 'stow_building', arguments: { id: 'bmumqowj71jyxor8n' } });
  check(r.isError && txt(r).startsWith('Refused (NO_DEPOT): Stowing needs a Big Storage Depot'), 'NO_DEPOT', txt(r));
  const gm = R.createModel(cities.gina.layout, cities.gina.holdings);
  const gRoads = new Set(gm.layout.roads);
  const freeRoad = [];
  for (let gz = -11; gz <= 11 && freeRoad.length < 30; gz++) for (let gx = -11; gx <= 11 && freeRoad.length < 30; gx++) {
    if (!gRoads.has(gx + ',' + gz) && Math.hypot(gx, gz) <= 11.5) freeRoad.push([gx, gz]);
  }
  r = await hg.callTool({ name: 'add_roads', arguments: { tiles: freeRoad } });
  check(r.isError && /^Refused \(ROAD_LIMIT\): Road limit reached at .*130 of 130 tiles \(the Town Hall 1 limit\)\. Nothing was drawn/.test(txt(r)), 'ROAD_LIMIT (all-or-nothing: 25 fit, the 26th does not)', txt(r));
  r = await hg.callTool({ name: 'undo_last_change', arguments: {} });
  check(r.isError && txt(r).startsWith('Refused (NOTHING_TO_UNDO): Nothing to undo: the current version of the city (rev 1) was saved by the game'), 'undo on a game-saved city', txt(r));
  check(await unchanged('gina', ginaBefore), 'gina: nothing written');
  await hg.close();
  const hd = await httpClient(TOK.D1);
  r = await hd.callTool({ name: 'get_city', arguments: {} });
  check(r.isError && txt(r).startsWith('Refused (NO_CITY): Your city is not in the cloud yet. Open City Siege, sign in once'), 'no city yet -> "open the game and sign in once"', txt(r));
  r = await hd.callTool({ name: 'apply_design', arguments: { ops: [{ op: 'add_roads', tiles: [[1, 1]] }] } });
  check(r.isError && txt(r).includes('(NO_CITY)') && !(await cityDoc('dave')), 'edits without a city are refused and create nothing');
  await hd.close();

  section('HTTP: concurrent edits serialise (transactions)');
  const hi = await httpClient(TOK.I1);
  const im = R.createModel(cities.ivy.layout, cities.ivy.holdings);
  const iRoads = new Set(im.layout.roads);
  const freeI = [];
  for (let gz = -9; gz <= 9 && freeI.length < 3; gz++) for (let gx = -9; gx <= 9 && freeI.length < 3; gx++) if (!iRoads.has(gx + ',' + gz) && Math.hypot(gx, gz) <= 12.7) freeI.push([gx, gz]);
  const par = await Promise.all(freeI.map(tl => hi.callTool({ name: 'add_roads', arguments: { tiles: [tl] } })));
  const ivy = await cityDoc('ivy');
  check(par.every(x => !x.isError) && ivy.rev === 4 && freeI.every(([x, z]) => ivy.layout.roads.includes(x + ',' + z)) &&
    ivy.holdings.inventory.road === cities.ivy.holdings.inventory.road - 3 && (await histDocs('ivy')).length === 3,
    '3 parallel edits -> rev 4, all 3 roads, inventory -3, 3 history docs', { rev: ivy.rev, errs: par.filter(x => x.isError).map(txt) });
  check(same(par.map(x => x.structuredContent.rev).sort(), [2, 3, 4]), 'each parallel edit got its own rev', par.map(x => x.structuredContent.rev));
  await hi.close();

  section('history keeps the latest 20 versions');
  const hh = await httpClient(TOK.H1);
  const hm = R.createModel(cities.hank.layout, cities.hank.holdings);
  const hRoads = new Set(hm.layout.roads);
  let hTile = null;
  for (let gz = -9; gz <= 9 && !hTile; gz++) for (let gx = -9; gx <= 9 && !hTile; gx++) if (!hRoads.has(gx + ',' + gz) && Math.hypot(gx, gz) <= 11.5) hTile = [gx, gz];
  let hOk = 0;
  for (let k = 0; k < 22; k++) {
    const x = await hh.callTool({ name: k % 2 ? 'remove_roads' : 'add_roads', arguments: { tiles: [hTile] } });
    if (!x.isError) hOk++;
  }
  const hankDoc = await cityDoc('hank');
  const hankHist = (await histDocs('hank')).map(h => h.rev).sort((a, b) => a - b);
  check(hOk === 22 && hankDoc.rev === 23, '22 edits -> rev 23', { hOk, rev: hankDoc.rev });
  check(hankHist.length === 20 && hankHist[0] === 3 && hankHist[19] === 22, 'history holds exactly revs 3..22 (oldest pruned)', hankHist);
  r = await hh.callTool({ name: 'undo_last_change', arguments: {} });
  check(!r.isError && (await cityDoc('hank')).rev === 24 && (await histDocs('hank')).length === 20, 'undo still works and history stays at 20');
  await hh.close();

  section('rate limit (30 writes / 120 reads per minute per token, shared across stateless HTTP requests)');
  const he = await httpClient(TOK.E1);
  const erinBefore = await stateOf('erin');
  let writesOk = 0;
  for (let k = 0; k < 30; k++) {
    const x = await he.callTool({ name: 'stow_building', arguments: { id: 'gate_north_gate' } });
    if (x.isError && txt(x).startsWith('Refused (NOT_STOWABLE)')) writesOk++;
  }
  r = await he.callTool({ name: 'stow_building', arguments: { id: 'gate_north_gate' } });
  check(writesOk === 30 && r.isError && /^Rate limit reached \(RATE_LIMITED\): at most 30 design changes per minute per access token\. Retry in \d+ s\./.test(txt(r)) && r.structuredContent.retryAfterSec > 0,
    'the 31st write in a minute is rate limited with a retry hint', { writesOk, t: txt(r) });
  r = await he.callTool({ name: 'apply_design', arguments: { dry_run: true, ops: [{ op: 'add_roads', tiles: [[1, 1]] }] } });
  check(!r.isError || !/RATE_LIMITED/.test(txt(r)), 'a dry run is a read: still allowed', txt(r).slice(0, 120));
  let readsOk = 1;
  r = await he.callTool({ name: 'get_rules', arguments: {} });
  if (!r.isError) readsOk++;
  for (let k = 0; k < 118; k++) {
    const x = await he.callTool({ name: 'get_rules', arguments: {} });
    if (!x.isError) readsOk++;
  }
  r = await he.callTool({ name: 'get_city', arguments: {} });
  check(readsOk === 120 && r.isError && /^Rate limit reached \(RATE_LIMITED\): at most 120 read calls per minute/.test(txt(r)), 'the 121st read is rate limited', { readsOk, t: txt(r) });
  check(await unchanged('erin', erinBefore), 'rate-limited calls wrote nothing');
  const e1 = await tokenDoc('E1');
  check(e1.uses >= 1 && e1.lastUsedAt instanceof Timestamp, 'HTTP usage recorded on the token (first use written at once)', { uses: e1.uses });
  await he.close();


  section('HTTP: an oversized body gets a readable 413, and apply_design caps its tiles');
  {
    const big = { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'apply_design', arguments: { ops: Array.from({ length: 200 }, () => ({ op: 'add_roads', tiles: Array.from({ length: 1000 }, (_, k) => [k % 20 - 10, Math.floor(k / 20) - 10]) })) } } };
    const raw = JSON.stringify(big);
    let st413 = null;
    try {
      const rsp = await fetch(`http://127.0.0.1:${PORT}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${TOK.B1}` }, body: raw });
      st413 = { status: rsp.status, body: await rsp.json() };
    } catch (e) { st413 = { error: e.message + ' ' + (e.cause && e.cause.code) }; }
    check(st413.status === 413 && /Request body over 1 MB.*Split a big apply_design/.test(st413.body.error.message),
      `a ${(raw.length / 1e6).toFixed(2)} MB schema-valid apply_design gets HTTP 413 with a readable message (was a connection reset)`, st413);
    const hc = await httpClient(TOK.B1);
    const bobRev = (await cityDoc('bob')).rev;
    r = await hc.callTool({ name: 'apply_design', arguments: { ops: Array.from({ length: 3 }, () => ({ op: 'add_roads', tiles: Array.from({ length: 1000 }, () => [1, 1]) })) } });
    check(r.isError && /^Refused \(BAD_ARGS\): one apply_design call takes at most 2000 road tiles \+ path waypoints in total; this one has 3000/.test(txt(r)) &&
      (await cityDoc('bob')).rev === bobRev, 'apply_design over 2000 tiles in one call: BAD_ARGS, nothing written', txt(r));
    r = await hc.callTool({ name: 'get_city', arguments: {} });
    check(!r.isError, 'the server still answers after the 413');
    await hc.close();
  }

  section('HTTP: a flood of made-up tokens is throttled before Firestore (and real tokens keep working)');
  {
    const flood = await Promise.all(Array.from({ length: 60 }, (_, i) => fetch(`http://127.0.0.1:${PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${mkToken('flood-' + i)}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: i, method: 'tools/call', params: { name: 'get_city', arguments: {} } })
    }).then(x => x.text())));
    const unknownN = flood.filter(x => /UNKNOWN_TOKEN/.test(x)).length;
    const throttledN = flood.filter(x => /AUTH_THROTTLED/.test(x)).length;
    check(unknownN <= 20 && unknownN + throttledN === 60 && throttledN >= 40,
      `60 tool calls with made-up tokens: ${unknownN} looked up, ${throttledN} refused before Firestore (was 60 looked up, 0 refused)`, { unknownN, throttledN, sample: flood.find(x => /AUTH_THROTTLED/.test(x)) });
    const hb2 = await httpClient(TOK.B1);
    r = await hb2.callTool({ name: 'get_city', arguments: {} });
    check(!r.isError && r.structuredContent.uid === 'bob', 'a real token already in use still works from the flooded address');
    await hb2.close();
  }

  section('isolation: nobody else\'s city changed');
  check(same(await cityDoc('carol'), seedCities.carol), 'carol\'s city (never given a token) is byte-identical to the seed');
  const bobFinal = await cityDoc('bob');
  check(bobFinal.rev === 2 && (await histDocs('bob')).length === 1, 'bob changed only by his own token (1 edit)');
  const bOtherFinal = await battleDoc('bOther');
  check(!bOtherFinal.snapshots.carol && same(bOtherFinal.snapshots.bob.layout, seedCities.bob.layout), 'bob vs carol battle: only bob\'s own pre-edit snapshot');
} catch (e) {
  exitCode = 1;
  check(false, 'test run crashed: ' + (e && e.stack ? e.stack : e));
} finally {
  if (httpProc) {
    httpProc.kill('SIGTERM');
    await sleep(200);
  }
  if (rulesEnv) await rulesEnv.cleanup().catch(() => {});
}

console.log(`\n${passes} passed, ${fails} failed`);
if (fails) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  - ' + f);
}
process.exit(fails || exitCode ? 1 : 0);
