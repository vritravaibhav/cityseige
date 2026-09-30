#!/usr/bin/env node
/**
 * Unit tests for the pure online rules: src/shared/cityRules.js, src/shared/battleRules.js,
 * the id handling in src/builder/CityPersistence.js and BattleService's views (fake clock and
 * Firestore). Plain Node (>= 20), no emulator, no browser.
 *
 *   node tools/online/test-shared.mjs            (exit 1 on any failure)
 *
 * The browser half - cityRules' verdicts against the REAL game's GridSystem, and ids surviving a
 * reload - is tools/online/parity-check.mjs.
 */
import fs from 'node:fs';
import * as P from '../../src/data/progression.js';
import * as R from '../../src/shared/cityRules.js';
import * as B from '../../src/shared/battleRules.js';

const ROOT = new URL('../../', import.meta.url).pathname;
const FIX = (name) => JSON.parse(fs.readFileSync(ROOT + 'tools/online/fixtures/' + name, 'utf8'));
const DEFAULT = FIX('default-city.cloud.json');
const TH5 = FIX('th5-city.cloud.json');

let pass = 0;
let failCount = 0;
const failures = [];
let section = '';
const sectionCounts = [];
const check = (ok, name, detail) => {
  if (ok) { pass++; sectionCounts[sectionCounts.length - 1].pass++; return true; }
  failCount++;
  sectionCounts[sectionCounts.length - 1].fail++;
  const line = `FAIL [${section}] ${name}` + (detail !== undefined ? ' :: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '');
  failures.push(line);
  console.log(line);
  return false;
};
const begin = (name) => { section = name; sectionCounts.push({ name, pass: 0, fail: 0 }); };
const deq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])]));
  return v;
}
const clone = (v) => JSON.parse(JSON.stringify(v));
// Deterministic PRNG so every run makes the same ids and random cases.
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NOW = 1_800_000_000_000;
const ctx = (seed = 1) => ({ nowMs: NOW, rand: mulberry(seed) });
const model = (fx) => R.createModel(fx.layout, fx.holdings);
const byId = (m, id) => m.layout.buildings.find(b => b.id === id);
const ofType = (m, t) => m.layout.buildings.filter(b => b.t === t);
const withTH = (fx, level) => {
  const f = clone(fx);
  f.layout.buildings.find(b => b.t === 'town_hall').l = level;
  return f;
};
const free = (m, type, from = [[-9, -12], [9, 12]]) => {
  // First tile (row-major) that checkPlace accepts ignoring inventory/limits and is not a road.
  const roads = new Set(m.layout.roads);
  for (let gz = from[0][1]; gz <= from[1][1]; gz++) {
    for (let gx = from[0][0]; gx <= from[1][0]; gx++) {
      if (roads.has(gx + ',' + gz)) continue;
      if (R.checkPlace(m, type, gx, gz, { inventory: false, limits: false }).ok) return [gx, gz];
    }
  }
  return null;
};
const reasonOf = (r) => (r && r.ok === false ? r.reason : 'OK');

// ============================================================ constants and helpers
begin('constants');
{
  const BM = await import('../../src/builder/BuildingManager.js');
  check(BM.MAIN_GATES === R.MAIN_GATES, 'BuildingManager re-exports the very same MAIN_GATES');
  check(deq(R.MAIN_GATES, [
    { name: 'North Gate', gx: 0, gz: -15, rot: 0 },
    { name: 'East Gate', gx: 15, gz: 0, rot: Math.PI / 2 },
    { name: 'South Gate', gx: 0, gz: 15, rot: Math.PI }
  ]), 'MAIN_GATES values unchanged');
  check(deq(R.ROT_STEPS, [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]), 'ROT_STEPS');
  const codes = ['UNKNOWN_TYPE', 'NOT_PLACEABLE', 'NOT_IN_INVENTORY', 'LOCKED', 'AT_LIMIT', 'OUTSIDE_RADIUS', 'BLOCKED',
    'NOT_FOUND', 'IMMOVABLE', 'UNDER_CONSTRUCTION', 'NOT_STOWABLE', 'NO_DEPOT', 'STORAGE_FULL', 'NOT_A_TREE',
    'NO_ROAD_INVENTORY', 'ROAD_LIMIT', 'BAD_ARGS'];
  check(deq(Object.keys(R.REASON).sort(), codes.slice().sort()) && codes.every(c => R.REASON[c] === c), 'REASON has exactly the 17 spec codes');
  for (const t of P.BUILDING_TYPES) check(R.footprintOf(t) === Math.max(1, P.BUILDING_DEFS[t].footprint || 1), 'footprintOf ' + t);
  check(R.footprintOf('nope') === 1, 'footprintOf unknown = 1');
  check(R.townHallLevelOf([{ t: 'tree', l: 4 }, { t: 'town_hall', l: 7 }, { t: 'town_hall', l: 2 }]) === 7, 'townHallLevelOf: first town hall');
  check(R.townHallLevelOf([{ type: 'town_hall', level: 9 }]) === 9, 'townHallLevelOf: live buildings');
  check(R.townHallLevelOf([]) === 1 && R.townHallLevelOf(null) === 1, 'townHallLevelOf: none -> 1');
  check(R.townHallLevelOf([{ t: 'town_hall', l: 40 }]) === 12, 'townHallLevelOf clamps');
  check(R.gateIdFor('North Gate') === 'gate_north_gate' && R.gateIdFor('South Gate') === 'gate_south_gate', 'gateIdFor matches addMainGate');
  check(R.fixedGateAt(15, 0).name === 'East Gate' && R.fixedGateAt(-15, 0) === null, 'fixedGateAt');
  // The source text of the modules: pure means no three / DOM / firebase / clock at module scope.
  for (const f of ['src/shared/cityRules.js', 'src/shared/battleRules.js']) {
    const src = fs.readFileSync(ROOT + f, 'utf8');
    const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map(m => m[1]);
    check(imports.every(i => i === '../data/progression.js'), f + ' imports only progression.js', imports);
    check(!/\b(window|document|localStorage|sessionStorage|navigator)\s*[.[]|import\.meta|\bDate\.now\(\)\s*[;,)]?\s*$/m.test(
      src.split('\n').filter(l => /^(const|let|var|export const) /.test(l)).join('\n')), f + ': no browser globals or clock at module scope');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    check(!/\b(window|document|localStorage|sessionStorage)\s*[.[]/.test(code), f + ' never touches window/document/storage');
  }
}

// ============================================================ ids
begin('ids');
{
  const ids = new Set();
  for (let k = 0; k < 20000; k++) ids.add(R.newBuildingId(NOW));
  check(ids.size === 20000, '20000 ids in the same millisecond are unique', ids.size);
  const all = [...ids];
  check(all.every(id => /^b[0-9a-z]+$/.test(id) && id.length <= 20 && R.isValidBuildingId(id)), 'ids are b + base36, <= 20 chars, valid');
  check(R.newBuildingId(NOW, () => 0.5) === R.newBuildingId(NOW, () => 0.5), 'deterministic with a fixed rand');
  check(R.newBuildingId(NOW, () => 0) !== R.newBuildingId(NOW + 1, () => 0), 'time part differs by the ms');
  for (const r of [0, 0.999999999, 1, -1, NaN]) {
    const id = R.newBuildingId(NOW, () => r);
    check(R.isValidBuildingId(id) && id.length <= 20, 'rand edge ' + r + ' -> ' + id);
  }
  check(R.isValidBuildingId(R.newBuildingId(undefined)), 'no time still gives a valid id');
  check(!R.isValidBuildingId('') && !R.isValidBuildingId('a b') && !R.isValidBuildingId('x'.repeat(41)) && !R.isValidBuildingId(5)
    && R.isValidBuildingId('x'.repeat(40)) && R.isValidBuildingId('gate_north_gate') && R.isValidBuildingId('A-b_9'), 'isValidBuildingId');
  // Many places in one applyOps with a CONSTANT rand still get distinct ids.
  const f = withTH(DEFAULT, 12);
  const m = R.createModel(f.layout, { ...f.holdings, inventory: { tree: 30 } });
  const ops = [];
  for (let gx = -8; gx <= -2; gx++) ops.push({ op: 'place', type: 'tree', gx, gz: -12 });
  const r = R.applyOps(m, ops, { nowMs: NOW, rand: () => 0.25 });
  const placed = r.results.map(x => x.id);
  check(r.ok && new Set(placed).size === ops.length, 'constant rand: every placed id distinct', placed);
  check(new Set(m.layout.buildings.map(b => b.id)).size === m.layout.buildings.length, 'no id collides with an existing one');
}

// ============================================================ cloud encoding
begin('cloud encoding');
{
  for (const [name, fx] of [['default', DEFAULT], ['th5', TH5]]) {
    const local = R.fromCloudLayout(fx.layout);
    check(local.roads.every(p => Array.isArray(p) && p.length === 2 && Number.isInteger(p[0])), name + ': local roads are [gx,gz] pairs');
    const cloud = R.toCloudLayout(local, ctx());
    check(deq(cloud, fx.layout), name + ': cloud -> local -> cloud is the identity');
    check(JSON.stringify(cloud) === JSON.stringify(fx.layout), name + ': ... byte for byte (key order kept)');
    const back = R.fromCloudLayout(cloud);
    check(JSON.stringify(back) === JSON.stringify(local), name + ': local -> cloud -> local is the identity');
    // Firestore: no array directly inside an array, no undefined anywhere.
    let nested = false, undef = false;
    const walk = (v, inArray) => {
      if (v === undefined) undef = true;
      if (Array.isArray(v)) { if (inArray) nested = true; v.forEach(x => walk(x, true)); }
      else if (v && typeof v === 'object') Object.values(v).forEach(x => walk(x, false));
    };
    walk(cloud, false);
    check(!nested && !undef, name + ': cloud layout has no nested arrays and no undefined');
    check(cloud.buildings.every(b => R.isValidBuildingId(b.id)) && new Set(cloud.buildings.map(b => b.id)).size === cloud.buildings.length, name + ': every cloud building has a unique valid id');
    check(cloud.buildings.filter(b => b.gate).map(b => b.id).sort().join() === 'gate_east_gate,gate_north_gate,gate_south_gate', name + ': gates carry their fixed ids');
    check(cloud.roads.every(s => /^-?\d+,-?\d+$/.test(s)), name + ': roads are "gx,gz" strings');
  }
  // A blob as serializeCity wrote it BEFORE ids existed (and with gate:undefined like the live serializer).
  const old = R.fromCloudLayout(TH5.layout);
  old.buildings.forEach(b => { delete b.id; b.gate = b.gate || undefined; b.junk = 7; });
  old.tasks.forEach(t => delete t.id);
  const c1 = R.toCloudLayout(old, ctx(3));
  check(c1.buildings.every(b => R.isValidBuildingId(b.id)), 'old save: ids generated');
  check(c1.buildings.every(b => !('junk' in b) && !('gate' in b && b.gate === undefined)), 'unknown fields and undefined dropped');
  check(c1.tasks.length === 1 && c1.tasks[0].id === c1.buildings[c1.tasks[0].i].id && c1.buildings[c1.tasks[0].i].t === 'tesla_coil', 'old save: task gets its building id');
  const c1b = R.toCloudLayout(old, ctx(3));
  check(deq(c1, c1b), 'id generation is deterministic for a fixed ctx');
  // Duplicates, a building claiming a gate id, a gate with a wrong id, a malformed id.
  const dup = R.fromCloudLayout(DEFAULT.layout);
  const firstId = dup.buildings[0].id;
  dup.buildings[4].id = firstId;
  dup.buildings[5].id = 'gate_north_gate';
  dup.buildings[1].id = 'whatever';
  dup.buildings[6].id = 'bad id!';
  const c2 = R.toCloudLayout(dup, ctx(4));
  check(c2.buildings[0].id === firstId && c2.buildings[4].id !== firstId, 'duplicate id: the first keeps it, the second is regenerated');
  check(c2.buildings[5].id !== 'gate_north_gate' && c2.buildings[1].id === 'gate_north_gate', 'a gate id is only ever a gate\'s');
  check(c2.buildings[6].id !== 'bad id!' && R.isValidBuildingId(c2.buildings[6].id), 'malformed id replaced');
  check(new Set(c2.buildings.map(b => b.id)).size === c2.buildings.length, 'all unique after repair');
  // A task whose index is stale but whose id is right is re-pointed by id.
  const moved = R.fromCloudLayout(TH5.layout);
  const tId = moved.tasks[0].id;
  moved.tasks[0].i = 0;
  const c3 = R.toCloudLayout(moved, ctx());
  check(c3.tasks[0].id === tId && c3.buildings[c3.tasks[0].i].id === tId, 'task matched by id first (stale index corrected)');
  // A non-object building entry is dropped and later task indices follow.
  const holey = R.fromCloudLayout(TH5.layout);
  holey.buildings.splice(1, 0, null, 'x');
  holey.tasks[0].i += 2;
  delete holey.tasks[0].id;
  const c4 = R.toCloudLayout(holey, ctx());
  check(c4.buildings.length === TH5.layout.buildings.length && c4.tasks[0].i === TH5.layout.tasks[0].i && c4.tasks[0].id === TH5.layout.tasks[0].id,
    'junk building entries dropped, task index remapped');
  // Roads: duplicates and junk.
  const c5 = R.toCloudLayout({ v: 1, savedAt: 5, buildings: [], tasks: [], roads: [[1, 2], [1, 2], [3], ['a', 1], [-4, -5], null] }, ctx());
  check(deq(c5.roads, ['1,2', '-4,-5']), 'roads deduplicated, malformed skipped', c5.roads);
  check(R.toCloudLayout({ buildings: [] }, { nowMs: 77, rand: () => 0 }).savedAt === 77, 'missing savedAt -> nowMs');
  const f5 = R.fromCloudLayout({ v: 1, savedAt: 1, buildings: [], tasks: [], roads: ['3,-4', ' -1 , 2 ', 'x,1', '1', [5, 6]] });
  check(deq(f5.roads, [[3, -4], [-1, 2], [5, 6]]), 'fromCloudLayout parses "gx,gz" (and pairs), drops junk', f5.roads);
}

// ============================================================ holdings
begin('holdings');
{
  check(deq(R.emptyHoldings(), { inventory: {}, stowedCounts: {}, stowedLevels: {}, stowedSealed: {}, bankCredits: {} }), 'emptyHoldings');
  for (const [name, fx] of [['default', DEFAULT], ['th5', TH5]]) {
    check(JSON.stringify(R.normalizeHoldings(fx.holdings)) === JSON.stringify(fx.holdings), name + ': normalizeHoldings is the identity on valid holdings');
  }
  const dirty = {
    inventory: { road: '7', sniper_tower: 2.4, nope: 5, tree: -3, cash_mint: 3, crypto_vault: 2, landmine: 'x' },
    stowedLevels: { sniper_tower: [1, 13, 3, 5, 4], cash_mint: [2], nope: [5] },
    stowedCounts: { sniper_tower: 1, cash_mint: 9, crypto_vault: 2 },
    stowedSealed: { crypto_vault: [50, 9e9, -4, 7], cash_mint: [100] },
    bankCredits: { cA: { cash: 5.7, iron: -2, wood: 'x', reason: 'stow x', at: 3 }, 'bad id': { cash: 1 } }
  };
  const n = R.normalizeHoldings(dirty);
  check(deq(n.inventory, { road: 7, sniper_tower: 2, tree: 0, cash_mint: 3, crypto_vault: 2, landmine: 0 }), 'inventory cleaned like EconomyManager.load', n.inventory);
  check(deq(n.stowedLevels, { sniper_tower: [5, 4], cash_mint: [2] }), 'levels: 2..12, highest first, at most the count held', n.stowedLevels);
  check(deq(n.stowedCounts, { sniper_tower: 2, cash_mint: 3, crypto_vault: 2 }), 'counts: >= known levels, <= inventory', n.stowedCounts);
  check(deq(n.stowedSealed, { crypto_vault: [P.produceCapacityFor('crypto_vault', 12), 50] }), 'sealed: raid-only types, capped, largest first, <= count', n.stowedSealed);
  check(deq(n.bankCredits, { cA: { cash: 5, iron: 0, wood: 0, reason: 'stow x', at: 3 } }), 'bank credits cleaned', n.bankCredits);
  // EconomyManager.load itself agrees with normalizeHoldings on the same dirty blob.
  const { EconomyManager } = await import('../../src/builder/EconomyManager.js');
  const store = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: {
    getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k)
  } });
  store.set('city_siege_eco', JSON.stringify({ v: 2, cash: 1, iron: 1, wood: 1, gems: 1, ...dirty }));
  const eco = new EconomyManager();
  const fromEco = R.holdingsFromEconomy(eco);
  check(deq(fromEco.inventory, n.inventory) && deq(fromEco.stowedLevels, n.stowedLevels) && deq(fromEco.stowedCounts, n.stowedCounts) &&
    deq(fromEco.stowedSealed, n.stowedSealed), 'normalizeHoldings == EconomyManager.load cleaning', { eco: fromEco, rules: n });
  check(deq(fromEco.bankCredits, {}), 'holdingsFromEconomy: bankCredits start empty');
  // apply -> read back is the identity, with no save() and no callbacks.
  let saves = 0, cbs = 0;
  eco.save = () => { saves++; };
  eco.onInventoryUpdate = () => { cbs++; };
  R.applyHoldingsToEconomy(eco, TH5.holdings);
  const again = R.holdingsFromEconomy(eco);
  check(deq({ ...again, bankCredits: {} }, { ...TH5.holdings, bankCredits: {} }), 'applyHoldingsToEconomy -> holdingsFromEconomy round trip');
  check(saves === 0 && cbs === 0, 'applyHoldingsToEconomy never saves or fires callbacks');
  eco.inventory.road = 999;
  check(TH5.holdings.inventory.road !== 999, 'applied holdings are copies');
  // The real economy then places from storage exactly like the rules (peekStowedLevel / takeStowed).
  check(eco.peekStowedLevel('cash_mint') === 3 && deq(eco.takeStowed('cash_mint'), { fromStorage: true, level: 3, sealed: 0 }), 'real takeStowed on applied holdings');
}

// ============================================================ model
begin('model');
{
  const src = clone(TH5);
  const m = R.createModel(src.layout, src.holdings);
  m.layout.buildings[0].gx = 99;
  m.holdings.inventory.road = -5;
  check(deq(src, TH5), 'createModel deep-clones its inputs');
  const out = R.modelToCloud(m);
  out.layout.buildings[0].gx = 42;
  check(m.layout.buildings[0].gx === 99, 'modelToCloud returns copies');
  const fresh = model(TH5);
  check(deq(R.modelToCloud(fresh), { layout: TH5.layout, holdings: TH5.holdings }), 'createModel -> modelToCloud is the identity on a fixture');
  const fromLocal = R.createModel(R.fromCloudLayout(DEFAULT.layout), DEFAULT.holdings);
  check(deq(fromLocal.layout, DEFAULT.layout), 'createModel accepts a local blob too');
  const noIds = R.fromCloudLayout(DEFAULT.layout);
  noIds.buildings.forEach(b => { if (!b.gate) delete b.id; });
  const mi = R.createModel(noIds, null);
  check(mi.layout.buildings.every(b => R.isValidBuildingId(b.id)) && deq(mi.holdings, R.emptyHoldings()), 'createModel fills missing ids and holdings');
}

// ============================================================ place
begin('place');
{
  const m = model(DEFAULT);          // Town Hall 1, radius 11.5
  const hall = ofType(m, 'town_hall')[0];
  const before = clone(m);
  const r0 = R.applyOp(m, { op: 'place', type: 'sniper', gx: 1, gz: 1 }, ctx());
  check(reasonOf(r0) === 'UNKNOWN_TYPE' && /sniper_tower/.test(r0.message), 'UNKNOWN_TYPE suggests the right id', r0.message);
  check(reasonOf(R.applyOp(m, { op: 'place', type: 'road', gx: 1, gz: 1 }, ctx())) === 'NOT_PLACEABLE', 'road -> NOT_PLACEABLE');
  check(reasonOf(R.applyOp(m, { op: 'place', type: 'main_gate', gx: 1, gz: 1 }, ctx())) === 'NOT_PLACEABLE', 'main_gate -> NOT_PLACEABLE');
  for (const bad of [{ gx: 1.5, gz: 1 }, { gx: '3', gz: 1 }, { gx: 1 }, { gx: 1, gz: 1, rot: 45 }, { gx: 1, gz: 1, rot: '90' }, { gx: 500, gz: 0 }]) {
    check(reasonOf(R.applyOp(m, { op: 'place', type: 'lumber_mill', ...bad }, ctx())) === 'BAD_ARGS', 'BAD_ARGS ' + JSON.stringify(bad));
  }
  check(reasonOf(R.applyOp(m, { op: 'place', gx: 1, gz: 1 }, ctx())) === 'BAD_ARGS', 'BAD_ARGS: no type');
  const out = R.applyOp(m, { op: 'place', type: 'lumber_mill', gx: 12, gz: 0 }, ctx());
  check(reasonOf(out) === 'OUTSIDE_RADIUS' && /11\.5/.test(out.message) && /Free tiles nearby: \(/.test(out.message), 'OUTSIDE_RADIUS names the radius and suggests tiles', out.message);
  const sugg = [...out.message.split('Free tiles nearby:')[1].matchAll(/\((-?\d+),(-?\d+)\)/g)].map(x => [Number(x[1]), Number(x[2])]);
  check(sugg.length === 3 && sugg.every(([x, z]) => R.checkPlace(m, 'lumber_mill', x, z).ok), 'every suggested tile really is free', sugg);
  const ni = R.applyOp(m, { op: 'place', type: 'police_station', gx: -9, gz: 4 }, ctx());
  check(reasonOf(ni) === 'NOT_IN_INVENTORY' && /lumber_mill x1/.test(ni.message), 'NOT_IN_INVENTORY lists what is held', ni.message);
  const nil = R.applyOp(m, { op: 'place', type: 'sniper_tower', gx: -9, gz: 4 }, ctx());
  check(reasonOf(nil) === 'NOT_IN_INVENTORY' && /unlocks only at Town Hall 2/.test(nil.message), 'NOT_IN_INVENTORY also says when the type is locked', nil.message);
  const nal = R.applyOp(m, { op: 'place', type: 'petrol_pump', gx: -9, gz: 4 }, ctx());
  check(reasonOf(nal) === 'NOT_IN_INVENTORY' && /2 of 2 placed/.test(nal.message), '... or at its limit', nal.message);
  m.holdings.inventory.sniper_tower = 1;
  const lk = R.applyOp(m, { op: 'place', type: 'sniper_tower', gx: -9, gz: 4 }, ctx());
  check(reasonOf(lk) === 'LOCKED' && lk.requiredTH === 2, 'LOCKED with the Town Hall it needs', lk);
  m.holdings.inventory.petrol_pump = 1;
  const al = R.applyOp(m, { op: 'place', type: 'petrol_pump', gx: -9, gz: 4 }, ctx());
  check(reasonOf(al) === 'AT_LIMIT' && al.have === 2 && al.limit === 2, 'AT_LIMIT with have/limit', al);
  const bl = R.applyOp(m, { op: 'place', type: 'lumber_mill', gx: 3, gz: 4 }, ctx());
  check(reasonOf(bl) === 'BLOCKED' && bl.message.includes(hall.id) && bl.message.includes('Town Hall') && /Free tiles nearby/.test(bl.message), 'BLOCKED names the blocker and its id', bl.message);
  delete m.holdings.inventory.sniper_tower; delete m.holdings.inventory.petrol_pump;
  check(deq(m, before), 'failed places change nothing');
  // Success: fresh unit.
  const spot = free(m, 'lumber_mill');
  const ok = R.applyOp(m, { op: 'place', type: 'lumber_mill', gx: spot[0], gz: spot[1] }, ctx());
  const nb = byId(m, ok.id);
  check(ok.ok && nb && nb.l === 1 && nb.st === Math.min(16, P.produceCapacityFor('lumber_mill', 1)) && nb.rot === 0 && !ok.fromStorage, 'fresh lumber mill: level 1, seed output, rot 0', ok);
  check(m.layout.buildings[m.layout.buildings.length - 1] === nb, 'appended at the end (like BuildingManager.buildings.push)');
  check(m.holdings.inventory.lumber_mill === 0 && 'lumber_mill' in m.holdings.inventory, 'inventory decremented, zero entry kept');
  check(reasonOf(R.applyOp(m, { op: 'place', type: 'lumber_mill', gx: -9, gz: 5 }, ctx())) === 'NOT_IN_INVENTORY', 'the last unit is gone');
  // Roads and trees never block; a tree is blocked by a building.
  m.holdings.inventory.roadblock = 5; m.holdings.inventory.tree = 5;
  check(R.applyOp(m, { op: 'place', type: 'roadblock', gx: 0, gz: 3 }, ctx()).ok, 'a building on a road tile is fine');
  const [tree, tree2] = ofType(m, 'tree').filter(t => Math.hypot(t.gx, t.gz) <= 11.5);
  check(R.applyOp(m, { op: 'place', type: 'roadblock', gx: tree.gx, gz: tree.gz }, ctx()).ok, 'a building on a tree tile is fine');
  check(reasonOf(R.applyOp(m, { op: 'place', type: 'tree', gx: 3, gz: 3 }, ctx())) === 'BLOCKED', 'a tree cannot go on a building');
  check(reasonOf(R.applyOp(m, { op: 'place', type: 'tree', gx: tree.gx, gz: tree.gz }, ctx())) === 'BLOCKED', '... not even one standing on a tree tile');
  check(R.applyOp(m, { op: 'place', type: 'tree', gx: tree2.gx, gz: tree2.gz }, ctx()).ok, 'a tree may share a tree tile');
  check(R.applyOp(m, { op: 'place', type: 'roadblock', gx: 1, gz: 3 }, ctx()).ok, 'a 1x1 right next to a 1x1 (barrier chains)');
  check(reasonOf(R.applyOp(m, { op: 'place', type: 'roadblock', gx: 1, gz: 3 }, ctx())) === 'BLOCKED', 'two 1x1 on one tile clash');
}
{
  // Footprint arithmetic on an empty-ish Town Hall 12 model (radius 14.8).
  const f = withTH(DEFAULT, 12);
  const m = R.createModel({ ...f.layout, buildings: f.layout.buildings.filter(b => b.t === 'town_hall' || b.gate), roads: [] },
    { inventory: { police_station: 5, roadblock: 9, quantum_citadel: 1, tree: 3 } });
  const put = (type, gx, gz) => R.applyOp(m, { op: 'place', type, gx, gz }, ctx());
  check(put('police_station', -6, -6).ok, '2x2 anchor');
  check(reasonOf(put('police_station', -5, -5)) === 'BLOCKED', '2x2 vs 2x2 at (1,1) clash');
  check(reasonOf(put('police_station', -6, -5)) === 'BLOCKED', '2x2 vs 2x2 at (0,1) clash');
  check(put('police_station', -4, -5).ok, '2x2 vs 2x2 at (2,1) fits (reach 2)');
  check(reasonOf(put('roadblock', -5, -7)) === 'BLOCKED', '1x1 vs 2x2 at (1,1) clash (reach 1.5)');
  check(put('roadblock', -8, -7).ok, '1x1 vs 2x2 at (2,1) fits');
  // 3x3 (Quantum Citadel) against a 2x2 at (6,-6)... use a fresh police station at (6,-8).
  check(put('police_station', 6, -8).ok, '2x2 anchor for the 3x3 cases');
  check(reasonOf(put('quantum_citadel', 8, -6)) === 'BLOCKED', '3x3 vs 2x2 at (2,2): clash (reach 2.5)');
  const c = R.createModel({ ...f.layout, buildings: f.layout.buildings.filter(b => b.t === 'town_hall' || b.gate), roads: [] },
    { inventory: { quantum_citadel: 1, roadblock: 5 } });
  const cput = (type, gx, gz) => R.applyOp(c, { op: 'place', type, gx, gz }, ctx());
  check(reasonOf(cput('quantum_citadel', 0, -13)) === 'BLOCKED', '3x3 vs the 3x3 North Gate at distance 2: clash (reach 3)');
  check(cput('quantum_citadel', 0, -12).ok, '3x3 vs 3x3 gate at distance 3: fits');
  check(reasonOf(cput('roadblock', 1, -11)) === 'BLOCKED' && cput('roadblock', 2, -12).ok, '1x1 vs 3x3: |d| < 2 clash, 2 fits');
  // Gates are 3x3 obstacles for 1x1s too.
  check(reasonOf(put('roadblock', 1, -14)) === 'BLOCKED', '1x1 at (1,-14) is blocked by the North Gate');
  check(put('roadblock', 2, -14).ok, '1x1 at (2,-14) clears the gate (hypot 14.14 <= 14.8)');
  check(reasonOf(put('roadblock', 14, 1)) === 'BLOCKED' && reasonOf(put('roadblock', 1, 14)) === 'BLOCKED', 'East and South Gates block their neighbours');
}
{
  // Radius boundary: exactly the game's Math.hypot(gx,gz) > radius.
  for (const th of [1, 5, 12]) {
    const f = withTH(DEFAULT, th);
    const m = R.createModel({ ...f.layout, buildings: f.layout.buildings.filter(b => b.t === 'town_hall' || b.gate), roads: [] }, { inventory: { roadblock: 999 } });
    const rad = P.cityRadiusFor(th);
    let agree = 0, total = 0;
    for (let gx = -15; gx <= 15; gx++) {
      for (let gz = -15; gz <= 15; gz++) {
        const r = R.checkPlace(m, 'roadblock', gx, gz, { limits: false });
        const outside = Math.hypot(gx, gz) > rad;
        total++;
        if ((reasonOf(r) === 'OUTSIDE_RADIUS') === outside) agree++;
      }
    }
    check(agree === total, `TH${th}: OUTSIDE_RADIUS exactly when hypot > ${rad}`, `${agree}/${total}`);
  }
}
{
  // From storage: level from the stowed list, output 0 for a tapped producer, the lists popped.
  const m = model(TH5);
  const ok = R.applyOp(m, { op: 'place', type: 'cash_mint', gx: 0, gz: 0 }, ctx());
  check(ok.ok && ok.fromStorage && ok.level === 3 && ok.st === 0, 'stowed level-3 mint comes back at level 3 holding 0', ok);
  check(!('cash_mint' in m.holdings.stowedCounts) && !('cash_mint' in m.holdings.stowedLevels) && m.holdings.inventory.cash_mint === 0, 'storage lists popped and deleted at zero');
  const f = model(TH5);
  const sp = R.applyOp(f, { op: 'place', type: 'spike_trap', gx: 0, gz: 1 }, ctx());
  check(sp.ok && sp.fromStorage && sp.level === 1, 'stowed level-1 spike trap is from storage at level 1');
  f.holdings.inventory.landmine = 2;
  const lm = R.applyOp(f, { op: 'place', type: 'landmine', gx: 0, gz: 2 }, ctx());
  check(lm.ok && !lm.fromStorage && lm.level === 1, 'fresh landmine is not from storage');
  // Vaults: sealed cash goes back in, highest level with the largest amount.
  const f9 = withTH(DEFAULT, 12);   // Town Hall 12: three Crypto Vaults allowed
  const v = R.createModel({ ...f9.layout, buildings: f9.layout.buildings.filter(b => b.t === 'town_hall' || b.gate), roads: [] },
    { inventory: { crypto_vault: 3, petrol_pump: 1 }, stowedCounts: { crypto_vault: 2 }, stowedLevels: { crypto_vault: [4] }, stowedSealed: { crypto_vault: [999999, 300] } });
  const v1 = R.applyOp(v, { op: 'place', type: 'crypto_vault', gx: -6, gz: -6 }, ctx());
  check(v1.ok && v1.level === 4 && v1.st === Math.min(P.produceCapacityFor('crypto_vault', 4), 999999), 'vault 1: level 4, sealed capped at its capacity', v1);
  const v2 = R.applyOp(v, { op: 'place', type: 'crypto_vault', gx: -3, gz: -6 }, ctx());
  check(v2.ok && v2.level === 1 && v2.st === 300 && v2.fromStorage, 'vault 2: level 1, 300 sealed', v2);
  const v3 = R.applyOp(v, { op: 'place', type: 'crypto_vault', gx: 0, gz: -6 }, ctx());
  check(v3.ok && !v3.fromStorage && v3.st === (P.BUILDING_DEFS.crypto_vault.produce.seed || 0), 'vault 3: fresh, seed', v3);
  const pp = R.applyOp(v, { op: 'place', type: 'petrol_pump', gx: 3, gz: -6 }, ctx());
  check(pp.ok && pp.st === P.BUILDING_DEFS.petrol_pump.produce.seed, 'fresh petrol pump gets its seed', pp);
  // Rotation.
  const rm = R.createModel({ ...f9.layout, buildings: f9.layout.buildings.filter(b => b.t === 'town_hall' || b.gate), roads: [] },
    { inventory: { police_station: 5, roadblock: 2 } });
  for (const [deg, rad, gx] of [[90, Math.PI / 2, -9], [270, 3 * Math.PI / 2, -6], [360, 0, -3], [-90, 3 * Math.PI / 2, 0], [180, Math.PI, 3]]) {
    const r = R.applyOp(rm, { op: 'place', type: 'police_station', gx, gz: 6, rot: deg }, ctx());
    check(r.ok && byId(rm, r.id).rot === rad, `rot ${deg} -> ${rad.toFixed(3)} rad`);
  }
  const rb = R.applyOp(rm, { op: 'place', type: 'roadblock', gx: 6, gz: 9, rot: 90 }, ctx());
  check(rb.ok && byId(rm, rb.id).rot === 0 && /rot ignored/.test(rb.message), 'barrier rot ignored (with a note)', rb.message);
}

// ============================================================ move
begin('move');
{
  const m = model(TH5);
  const task = m.layout.tasks[0];
  const hall = ofType(m, 'town_hall')[0];
  const snap = clone(m);
  const nf = R.applyOp(m, { op: 'move', id: 'bnope', gx: 0, gz: 0 }, ctx());
  check(reasonOf(nf) === 'NOT_FOUND' && /list_buildings/.test(nf.message), 'NOT_FOUND points at list_buildings');
  const nt = R.applyOp(m, { op: 'move', id: 'sniper_tower', gx: 0, gz: 0 }, ctx());
  check(reasonOf(nt) === 'NOT_FOUND' && /is a building TYPE/.test(nt.message), 'a type name instead of an id is explained', nt.message);
  check(reasonOf(R.applyOp(m, { op: 'move', gx: 0, gz: 0 }, ctx())) === 'BAD_ARGS', 'BAD_ARGS: no id');
  check(reasonOf(R.applyOp(m, { op: 'move', id: hall.id, gx: 0.5, gz: 0 }, ctx())) === 'BAD_ARGS', 'BAD_ARGS: fractional');
  check(reasonOf(R.applyOp(m, { op: 'move', id: hall.id, gx: 0, gz: 0, rot: 30 }, ctx())) === 'BAD_ARGS', 'BAD_ARGS: rot 30');
  check(reasonOf(R.applyOp(m, { op: 'move', id: 'gate_east_gate', gx: 0, gz: 0 }, ctx())) === 'IMMOVABLE', 'IMMOVABLE gate');
  const uc = R.applyOp(m, { op: 'move', id: task.id, gx: 0, gz: 0 }, { nowMs: task.endsAt - 90e3 });
  check(reasonOf(uc) === 'UNDER_CONSTRUCTION' && /level 4/.test(uc.message) && /1m 30s/.test(uc.message), 'UNDER_CONSTRUCTION with target level and time left', uc.message);
  const ucLate = R.applyOp(m, { op: 'move', id: task.id, gx: 0, gz: 0 }, { nowMs: task.endsAt + 5e3 });
  check(reasonOf(ucLate) === 'UNDER_CONSTRUCTION' && /next time the game is opened/.test(ucLate.message), 'an overdue job still blocks (it completes on restore)');
  check(reasonOf(R.applyOp(m, { op: 'move', id: hall.id, gx: 13, gz: 0 }, ctx())) === 'OUTSIDE_RADIUS', 'OUTSIDE_RADIUS');
  const other = ofType(m, 'police_station')[0];
  const bl = R.applyOp(m, { op: 'move', id: hall.id, gx: other.gx + 1, gz: other.gz }, ctx());
  check(reasonOf(bl) === 'BLOCKED' && bl.message.includes(other.id), 'BLOCKED by another building', bl.message);
  check(deq(m, snap), 'failed moves change nothing');
  const same = R.applyOp(m, { op: 'move', id: hall.id, gx: hall.gx, gz: hall.gz }, ctx());
  check(same.ok, 'moving onto its own tile is fine (ignores itself)');
  // Some 2x2 can shift one tile over its own old footprint (it ignores itself).
  let nudged = null;
  for (const b of m.layout.buildings.filter(x => R.footprintOf(x.t) === 2 && !x.gate && x.id !== task.id)) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const tx = b.gx + dx, tz = b.gz + dz;
      if (!R.checkPlace(m, b.t, tx, tz, { ignoreId: b.id, inventory: false, limits: false }).ok) continue;
      if (R.checkPlace(m, b.t, tx, tz, { inventory: false, limits: false }).ok) continue;   // only blocked by itself
      const r = R.applyOp(m, { op: 'move', id: b.id, gx: tx, gz: tz }, ctx());
      nudged = r.ok && byId(m, b.id).gx === tx && byId(m, b.id).gz === tz ? b.id : 'failed';
      break;
    }
    if (nudged) break;
  }
  check(nudged && nudged !== 'failed', 'a 2x2 can shift one tile over its own old footprint', nudged);
  const th = byId(m, hall.id);
  const where = free(m, 'town_hall');
  const mv = R.applyOp(m, { op: 'move', id: hall.id, gx: where[0], gz: where[1], rot: 90 }, ctx());
  check(mv.ok && th.gx === where[0] && th.gz === where[1] && th.rot === Math.PI / 2, 'the Town Hall may move (and turn)', mv);
  const mv2 = R.applyOp(m, { op: 'move', id: hall.id, gx: where[0], gz: where[1] }, ctx());
  check(mv2.ok && th.rot === Math.PI / 2, 'no rot keeps the current facing');
  check(m.layout.tasks[0].i === snap.layout.tasks[0].i && m.layout.tasks[0].id === task.id, 'moves leave jobs alone');
  // Trees: one outside the radius may be brought in; a tree cannot land on a building.
  const outTree = ofType(m, 'tree').find(t => Math.hypot(t.gx, t.gz) > P.cityRadiusFor(5));
  const tIn = free(m, 'tree');
  check(R.applyOp(m, { op: 'move', id: outTree.id, gx: tIn[0], gz: tIn[1] }, ctx()).ok, 'a tree outside the radius can be moved in');
  check(reasonOf(R.applyOp(m, { op: 'move', id: outTree.id, gx: th.gx, gz: th.gz }, ctx())) === 'BLOCKED', 'a tree cannot be moved onto a building');
  const rbk = ofType(m, 'roadblock')[0];
  const r2 = R.applyOp(m, { op: 'move', id: rbk.id, gx: rbk.gx, gz: rbk.gz, rot: 90 }, ctx());
  check(r2.ok && byId(m, rbk.id).rot === snap.layout.buildings.find(b => b.id === rbk.id).rot, 'barrier rot ignored on move');
}

// ============================================================ stow
begin('stow');
{
  const m = model(TH5);
  const task = m.layout.tasks[0];
  const snap = clone(m);
  check(reasonOf(R.applyOp(m, { op: 'stow', id: 'bnope' }, ctx())) === 'NOT_FOUND', 'NOT_FOUND');
  check(reasonOf(R.applyOp(m, { op: 'stow' }, ctx())) === 'BAD_ARGS', 'BAD_ARGS');
  check(reasonOf(R.applyOp(m, { op: 'stow', id: 'gate_south_gate' }, ctx())) === 'NOT_STOWABLE', 'NOT_STOWABLE gate');
  check(reasonOf(R.applyOp(m, { op: 'stow', id: ofType(m, 'town_hall')[0].id }, ctx())) === 'NOT_STOWABLE', 'NOT_STOWABLE town hall');
  const tr = R.applyOp(m, { op: 'stow', id: ofType(m, 'tree')[0].id }, ctx());
  check(reasonOf(tr) === 'NOT_STOWABLE' && /remove_tree/.test(tr.message), 'NOT_STOWABLE tree -> use remove_tree');
  check(reasonOf(R.applyOp(m, { op: 'stow', id: task.id }, ctx())) === 'UNDER_CONSTRUCTION', 'UNDER_CONSTRUCTION (MCP rule)');
  const depot = ofType(m, 'big_storage')[0];
  const nd = R.applyOp(m, { op: 'stow', id: depot.id }, ctx());
  check(reasonOf(nd) === 'NO_DEPOT' && /cannot store itself/.test(nd.message), 'the only depot cannot stow itself', nd.message);
  check(deq(m, snap), 'failed stows change nothing');
  const dm = model(DEFAULT);
  check(reasonOf(R.applyOp(dm, { op: 'stow', id: ofType(dm, 'petrol_pump')[0].id }, ctx())) === 'NO_DEPOT', 'NO_DEPOT without a depot');
  // Effects: a level-3 lumber mill full of wood.
  const mill = ofType(m, 'lumber_mill').find(b => b.l === 3);
  const taskIdx = m.layout.tasks[0].i;
  const millIdx = m.layout.buildings.indexOf(mill);
  const inv0 = m.holdings.inventory.lumber_mill || 0;
  const r = R.applyOp(m, { op: 'stow', id: mill.id }, ctx(9));
  const credit = Object.entries(m.holdings.bankCredits);
  check(r.ok && credit.length === 1 && credit[0][1].wood === Math.floor(mill.st) && credit[0][1].cash === 0 && credit[0][1].iron === 0 &&
    credit[0][1].reason === 'stow lumber_mill' && credit[0][1].at === NOW && /^c[0-9a-z]+$/.test(credit[0][0]), 'producer output becomes a bank credit', credit);
  check(deq(m.holdings.stowedLevels.lumber_mill, [3]) && m.holdings.stowedCounts.lumber_mill === 1 && m.holdings.inventory.lumber_mill === inv0 + 1, 'level stored, counted, inventory +1');
  check(!byId(m, mill.id), 'building removed');
  check(millIdx < taskIdx && m.layout.tasks[0].i === taskIdx - 1 && m.layout.tasks[0].id === task.id &&
    m.layout.buildings[m.layout.tasks[0].i].id === task.id, 'job index shifted down, id unchanged', { millIdx, taskIdx, now: m.layout.tasks[0] });
  check(r.storage.used === 4 && r.storage.capacity === 12, 'storage 4/12 after', r.storage);
  // A building after the job's index leaves the index alone.
  const later = m.layout.buildings.findIndex((b, i) => i > m.layout.tasks[0].i && b.t === 'roadblock');
  const ti = m.layout.tasks[0].i;
  check(R.applyOp(m, { op: 'stow', id: m.layout.buildings[later].id }, ctx()).ok && m.layout.tasks[0].i === ti, 'stowing after the job keeps its index');
  // No credit for an empty producer or a non-producer.
  const nCred = Object.keys(m.holdings.bankCredits).length;
  const lab = ofType(m, 'vehicle_lab')[0];
  check(R.applyOp(m, { op: 'stow', id: lab.id }, ctx()).ok && Object.keys(m.holdings.bankCredits).length === nCred && deq(m.holdings.stowedLevels.vehicle_lab, [3]), 'no credit for a lab; level 3 kept');
  // Round trip: place it back at its level.
  const back = R.applyOp(m, { op: 'place', type: 'vehicle_lab', gx: lab.gx, gz: lab.gz }, ctx());
  check(back.ok && back.level === 3 && back.fromStorage, 'stow -> place brings the level back');
  // Fill storage to STORAGE_FULL.
  let n = 0, full = null;
  for (const b of [...m.layout.buildings]) {
    if (['town_hall', 'tree', 'big_storage', 'main_gate', 'tesla_coil'].includes(b.t)) continue;
    const x = R.applyOp(m, { op: 'stow', id: b.id }, ctx());
    if (!x.ok) { full = x; break; }
    n++;
  }
  check(full && full.reason === 'STORAGE_FULL' && full.used === 12 && full.capacity === 12 && /12 of 12/.test(full.message), 'STORAGE_FULL at 12/12', full);
  check(R.summarize(m).storage.used === 12, 'summary agrees: 12 stowed');
}
{
  // Two depots: stowing one counts only the other's slots.
  const f = withTH(TH5, 6);    // Town Hall 6 allows 2 depots
  const m = R.createModel(f.layout, { ...f.holdings, inventory: { ...f.holdings.inventory, big_storage: 1 } });
  const spot = free(m, 'big_storage');
  const d2 = R.applyOp(m, { op: 'place', type: 'big_storage', gx: spot[0], gz: spot[1] }, ctx());
  check(d2.ok, 'second depot placed (Town Hall 6)');
  const d1 = ofType(m, 'big_storage').find(b => b.id !== d2.id);   // level 2: 12 slots; d2 level 1: 6 slots
  // used is 3: stowing d1 leaves 6 slots for 3 used + d1 itself -> ok.
  const s1 = R.applyOp(m, { op: 'stow', id: d1.id }, ctx());
  check(s1.ok && s1.storage.used === 4 && s1.storage.capacity === 6, 'stow a depot while another stands: 4/6', s1.storage);
  // Fill to 6/6, then the remaining depot cannot go (0 other slots) - NO_DEPOT.
  for (const b of [...m.layout.buildings]) {
    if (R.summarize(m).storage.used >= 6) break;
    if (['town_hall', 'tree', 'big_storage', 'main_gate', 'tesla_coil'].includes(b.t)) continue;
    R.applyOp(m, { op: 'stow', id: b.id }, ctx());
  }
  check(R.summarize(m).storage.used === 6, 'filled to 6/6');
  check(reasonOf(R.applyOp(m, { op: 'stow', id: d2.id }, ctx())) === 'NO_DEPOT', 'the last depot cannot stow itself');
  // Edge: used 5 of 12 with two depots (6 + 6): stowing one leaves 6 >= 5+1 -> ok, then full.
  const g = withTH(DEFAULT, 6);
  const q = R.createModel({ ...g.layout, roads: [] }, { inventory: { big_storage: 2, roadblock: 5 }, stowedCounts: { roadblock: 5 } });
  const a = R.applyOp(q, { op: 'place', type: 'big_storage', gx: -8, gz: 2 }, ctx());
  const b = R.applyOp(q, { op: 'place', type: 'big_storage', gx: -8, gz: -1 }, ctx());
  check(a.ok && b.ok, 'two level-1 depots');
  const sa = R.applyOp(q, { op: 'stow', id: a.id }, ctx());
  check(sa.ok && sa.storage.used === 6 && sa.storage.capacity === 6, '5 used + the depot = 6 of the other\'s 6', sa);
  check(reasonOf(R.applyOp(q, { op: 'stow', id: ofType(q, 'police_station')[0].id }, ctx())) === 'STORAGE_FULL', 'then STORAGE_FULL');
}
{
  // Vaults seal their cash; the Antimatter Collider pays all three.
  const f = withTH(DEFAULT, 12);
  const m = R.createModel({ ...f.layout, buildings: f.layout.buildings.filter(b => b.t === 'town_hall' || b.gate), roads: [] },
    { inventory: { big_storage: 1, crypto_vault: 2, antimatter_collider: 1 }, stowedCounts: { crypto_vault: 1 }, stowedSealed: { crypto_vault: [40] } });
  R.applyOp(m, { op: 'place', type: 'big_storage', gx: -9, gz: 0 }, ctx());
  const v = R.applyOp(m, { op: 'place', type: 'crypto_vault', gx: -6, gz: 0 }, ctx());   // from storage: 40 sealed
  const v2 = R.applyOp(m, { op: 'place', type: 'crypto_vault', gx: -3, gz: -3 }, ctx());
  byId(m, v2.id).st = 1234.9;
  const ac = R.applyOp(m, { op: 'place', type: 'antimatter_collider', gx: 3, gz: -3 }, ctx());
  byId(m, ac.id).st = 500.7;
  const s1 = R.applyOp(m, { op: 'stow', id: v2.id }, ctx());
  check(s1.ok && s1.sealed === 1234 && !s1.credit && deq(m.holdings.stowedSealed.crypto_vault, [1234]), 'vault: floor(st) sealed, no bank credit', s1);
  const s0 = R.applyOp(m, { op: 'stow', id: v.id }, ctx());
  check(s0.ok && deq(m.holdings.stowedSealed.crypto_vault, [1234, 40]), 'sealed list stays largest first');
  const s2 = R.applyOp(m, { op: 'stow', id: ac.id }, ctx());
  check(s2.ok && s2.credit && s2.credit.cash === 500 && s2.credit.iron === 500 && s2.credit.wood === 500, "'all' producer credits cash, iron and wood", s2.credit);
  check(deq({ cash: s2.credit.cash, iron: s2.credit.iron, wood: s2.credit.wood }, P.producePayout('all', 500)), 'credit == producePayout');
}

// ============================================================ remove_tree
begin('remove_tree');
{
  const m = model(DEFAULT);
  check(reasonOf(R.applyOp(m, { op: 'remove_tree', id: 'bnope' }, ctx())) === 'NOT_FOUND', 'NOT_FOUND');
  check(reasonOf(R.applyOp(m, { op: 'remove_tree' }, ctx())) === 'BAD_ARGS', 'BAD_ARGS');
  const nt = R.applyOp(m, { op: 'remove_tree', id: ofType(m, 'police_station')[0].id }, ctx());
  check(reasonOf(nt) === 'NOT_A_TREE' && /Police Station/.test(nt.message), 'NOT_A_TREE');
  check(reasonOf(R.applyOp(m, { op: 'remove_tree', id: 'gate_north_gate' }, ctx())) === 'NOT_A_TREE', 'a gate is not a tree');
  const far = ofType(m, 'tree').find(t => Math.hypot(t.gx, t.gz) > 15);
  const inv0 = m.holdings.inventory.tree;
  const r = R.applyOp(m, { op: 'remove_tree', id: far.id }, ctx());
  check(r.ok && !byId(m, far.id) && m.holdings.inventory.tree === inv0, 'a tree beyond the wall is cleared with no refund');
  const t5 = model(TH5);
  const tIdx = t5.layout.tasks[0].i;
  const early = t5.layout.buildings.findIndex((b, i) => i < tIdx && b.t === 'tree');
  check(early >= 0 && R.applyOp(t5, { op: 'remove_tree', id: t5.layout.buildings[early].id }, ctx()).ok &&
    t5.layout.tasks[0].i === tIdx - 1 && t5.layout.buildings[tIdx - 1].id === t5.layout.tasks[0].id, 'job index follows a removed tree');
}

// ============================================================ roads
begin('add_roads');
{
  check(deq(R.expandPath([[0, 0], [3, 0]]), [[0, 0], [1, 0], [2, 0], [3, 0]]), 'straight path inclusive');
  check(deq(R.expandPath([[2, 2], [0, 4]]), [[2, 2], [1, 2], [0, 2], [0, 3], [0, 4]]), 'L path: gx first, then gz');
  check(deq(R.expandPath([[0, 0], [0, -2], [1, -2]]), [[0, 0], [0, -1], [0, -2], [1, -2]]), 'multi-waypoint path');
  check(deq(R.expandPath([[5, 5]]), [[5, 5]]), 'single waypoint');
  check(R.expandPath([[0, 0.5]]) === null && R.expandPath([]) === null && R.expandPath('x') === null, 'bad paths -> null');
  const m = model(DEFAULT);       // 105 roads, 25 in inventory, limit 130
  const snap = clone(m);
  for (const [why, op] of [
    ['both tiles and path', { op: 'add_roads', tiles: [[1, 1]], path: [[1, 1]] }],
    ['neither', { op: 'add_roads' }],
    ['empty tiles', { op: 'add_roads', tiles: [] }],
    ['fractional tile', { op: 'add_roads', tiles: [[1, 1.5]] }],
    ['malformed tile', { op: 'add_roads', tiles: [5] }],
    ['bad path', { op: 'add_roads', path: [[0, 0], ['a', 1]] }],
    ['huge path', { op: 'add_roads', path: [[-99, -99], [99, 99], [-99, -99], [99, 99]] }]
  ]) check(reasonOf(R.applyOp(m, op, ctx())) === 'BAD_ARGS', 'BAD_ARGS: ' + why);
  const out = R.applyOp(m, { op: 'add_roads', tiles: [[1, 1], [2, 1], [12, 0]] }, ctx());
  check(reasonOf(out) === 'OUTSIDE_RADIUS' && /\(12,0\)/.test(out.message), 'OUTSIDE_RADIUS fails the whole op');
  check(deq(m, snap), '... and nothing was drawn');
  const ok = R.applyOp(m, { op: 'add_roads', tiles: [[1, 1], [0, 1], [1, 1], [2, 1]] }, ctx());
  check(ok.ok && ok.added === 2 && deq(ok.skipped, [[0, 1], [1, 1]]) && m.holdings.inventory.road === 23 && m.layout.roads.length === 107,
    'draws new tiles, skips paved ones (also a repeat in the same op)', ok);
  check(m.layout.roads.slice(-2).join(' ') === '1,1 2,1', 'new tiles appended as "gx,gz"');
  const allPaved = R.applyOp(R.createModel(DEFAULT.layout, { inventory: { road: 0 } }), { op: 'add_roads', tiles: [[0, 0], [0, 1]] }, ctx());
  check(allPaved.ok && allPaved.added === 0 && allPaved.skipped.length === 2, 'only paved tiles with an empty inventory: ok, nothing drawn');
  const lowInv = R.createModel(DEFAULT.layout, { inventory: { road: 2 } });
  const s2 = clone(lowInv);
  const ni = R.applyOp(lowInv, { op: 'add_roads', path: [[1, 2], [4, 2]] }, ctx());
  check(reasonOf(ni) === 'NO_ROAD_INVENTORY' && /\(3,2\)/.test(ni.message) && deq(lowInv, s2), 'NO_ROAD_INVENTORY at the 3rd tile, nothing drawn', ni.message);
  // Fill to the Town Hall 1 limit (130) and one more.
  const lim = R.createModel(DEFAULT.layout, { inventory: { road: 100 } });
  const fillTiles = [];
  const inside = [];
  for (let gz = -9; gz <= 9; gz++) for (let gx = -9; gx <= 9; gx++) {
    if (Math.hypot(gx, gz) <= 11.5 && !lim.layout.roads.includes(gx + ',' + gz)) inside.push([gx, gz]);
  }
  fillTiles.push(...inside.slice(0, 25));
  check(R.applyOp(lim, { op: 'add_roads', tiles: fillTiles }, ctx()).ok && lim.layout.roads.length === 130, 'filled to 130/130');
  const rl = R.applyOp(lim, { op: 'add_roads', tiles: [inside[25]] }, ctx());
  check(reasonOf(rl) === 'ROAD_LIMIT' && rl.limit === 130 && /130 of 130/.test(rl.message), 'ROAD_LIMIT at the Town Hall 1 budget', rl.message);
  const path = R.applyOp(model(DEFAULT), { op: 'add_roads', path: [[1, 9], [3, 9], [3, 10]] }, ctx());
  check(path.ok && path.added === 4 && deq(path.addedTiles, [[1, 9], [2, 9], [3, 9], [3, 10]]), 'path draws its expansion', path);
}
begin('remove_roads');
{
  const m = model(DEFAULT);
  const snap = clone(m);
  check(reasonOf(R.applyOp(m, { op: 'remove_roads', tiles: [[0, 1], [0, 12]] }, ctx())) === 'OUTSIDE_RADIUS' && deq(m, snap), 'OUTSIDE_RADIUS fails the whole op');
  check(reasonOf(R.applyOp(m, { op: 'remove_roads', tiles: 'x' }, ctx())) === 'BAD_ARGS', 'BAD_ARGS');
  const r = R.applyOp(m, { op: 'remove_roads', tiles: [[0, 1], [0, 2], [5, 5], [0, 1]] }, ctx());
  check(r.ok && r.removed === 2 && deq(r.skipped, [[5, 5], [0, 1]]) && m.holdings.inventory.road === 27 && m.layout.roads.length === 103 &&
    !m.layout.roads.includes('0,1'), 'erases, refunds 1 per tile, skips bare tiles', r);
  const p = R.applyOp(m, { op: 'remove_roads', path: [[1, 0], [4, 0]] }, ctx());
  check(p.ok && p.removed === 4 && m.holdings.inventory.road === 31, 'path accepted too');
  const empty = R.createModel(DEFAULT.layout, {});
  check(R.applyOp(empty, { op: 'remove_roads', tiles: [[0, 3]] }, ctx()).ok && empty.holdings.inventory.road === 1, 'refund creates the road entry');
}

// ============================================================ applyOps
begin('applyOps');
{
  const m = model(TH5);
  const snap = clone(m);
  const mill = ofType(m, 'lumber_mill')[0];
  const r = R.applyOps(m, [
    { op: 'add_roads', tiles: [[1, 1]] },
    { op: 'stow', id: mill.id },
    { op: 'place', type: 'sniper_tower', gx: 0, gz: 0 }      // none in the inventory
  ], ctx());
  check(!r.ok && r.failedAt === 2 && r.results.length === 3 && r.results[0].ok && r.results[1].ok && r.results[2].reason === 'NOT_IN_INVENTORY', 'third op fails', r.failedAt);
  check(/rolled back/.test(r.results[2].message) && /^op 2 \(place\)/.test(r.results[2].message), 'failure message says what was rolled back', r.results[2].message);
  check(deq(m, snap), 'all-or-nothing: the model is untouched');
  const ok = R.applyOps(m, [{ op: 'add_roads', tiles: [[1, 1]] }, { op: 'stow', id: mill.id }, { op: 'place', type: 'lumber_mill', gx: mill.gx, gz: mill.gz }], ctx());
  check(ok.ok && ok.results.length === 3 && ok.results[2].level === mill.l && ok.results[2].id !== mill.id, 'all succeed: applied (stow + place back = same level, new id)');
  check(m.layout.roads.includes('1,1') && !byId(m, mill.id), 'model reflects every op');
  check(!R.applyOps(m, [], ctx()).ok && R.applyOps(m, [], ctx()).results[0].reason === 'BAD_ARGS', 'empty ops -> BAD_ARGS');
  check(reasonOf(R.applyOp(m, { op: 'demolish', id: mill.id }, ctx())) === 'BAD_ARGS' && reasonOf(R.applyOp(m, null, ctx())) === 'BAD_ARGS', 'unknown op / not an object -> BAD_ARGS');
  // Every REASON code is produced by at least one op in this file.
}

// ============================================================ reading
begin('summarize / catalog / describe');
{
  const s = R.summarize(model(DEFAULT));
  check(s.townHall === 1 && s.cityRadius === 11.5 && s.roads.placed === 105 && s.roads.limit === 130 && s.roads.inInventory === 25, 'default: TH1, radius, roads');
  check(s.counts.tree === 10 && s.counts.main_gate === 3 && s.limits.petrol_pump.placed === 2 && s.limits.petrol_pump.limit === 2, 'default: counts and limits');
  check(s.storage.used === 0 && s.storage.capacity === 0 && s.underConstruction.length === 0, 'default: no storage, no jobs');
  const t = R.summarize(model(TH5));
  check(t.townHall === 5 && t.storage.used === 3 && t.storage.capacity === 12 && t.underConstruction.length === 1 && t.underConstruction[0].type === 'tesla_coil' && t.underConstruction[0].toLevel === 4, 'th5 summary', t.storage);
  const cat = R.catalogFor(model(DEFAULT));
  const types = cat.map(c => c.type);
  check(Array.isArray(cat) && types.includes('police_station') && types.includes('road') && !types.includes('sniper_tower') && !types.includes('main_gate'), 'catalog: unlocked types only');
  const mill = cat.find(c => c.type === 'lumber_mill');
  check(mill.canPlaceNow && mill.placed === 1 && mill.limit === 2 && mill.inInventory === 1 && mill.footprint === 2 && mill.letter === 'E', 'catalog entry for lumber_mill', mill);
  check(cat.find(c => c.type === 'petrol_pump').canPlaceNow === false && /limit/.test(cat.find(c => c.type === 'petrol_pump').why), 'at-limit type explained');
  check(/add_roads/.test(cat.find(c => c.type === 'road').note), 'road entry points at add_roads');
  const cat5 = R.catalogFor(model(TH5));
  check(cat5.some(c => c.type === 'missile_silo') && cat5.find(c => c.type === 'cash_mint').stowedLevels[0] === 3, 'TH5 catalog shows stowed levels');
  const d = R.describeBuildings(model(TH5));
  const tes = d.find(x => x.id === TH5.layout.tasks[0].id);
  check(tes.upgradingTo === 4 && tes.level === 3 && d.find(x => x.id === 'gate_north_gate').fixed === true, 'describeBuildings flags jobs and gates');
  check(d.filter(x => x.stored !== undefined).every(x => Number.isInteger(x.stored)), 'producers report stored output');
}

// ============================================================ ascii map
begin('renderAsciiMap');
{
  const m = model(DEFAULT);
  const txt = R.renderAsciiMap(m);
  const lines = txt.split('\n');
  const rowLines = lines.filter(l => /^ *(-?\d+)? +[- ][#.=A-Za-z]{31}$/.test(l));
  check(rowLines.length === 31, '31 grid rows of 31 tiles', rowLines.length);
  const grid = rowLines.map(l => l.slice(-31));
  const at = (gx, gz) => grid[gz + 15][gx + 15];
  check(at(0, -15) === 'G' && at(15, 0) === 'G' && at(0, 15) === 'G', 'gates G on their tiles');
  check(at(-1, -15) === 'g' && at(1, -14) === 'g' && at(14, 1) === 'g', 'gate footprint drawn lowercase');
  check(at(3, 3) === 'H' && at(2, 2) === 'h' && at(4, 4) === 'h', 'Town Hall H with its footprint');
  check(at(0, 5) === '=' && at(-6, 3) === '=', 'roads =');
  check(at(0, 11) === 'B' && at(0, -11) === 'B', 'barriers on the road show B');
  check(at(-15, -15) === '#' && at(5, 13) === '#' && at(0, 13) === '=', '# outside the radius (a road out there still shows =)');
  check(at(-9, 4) === '.', '. on a free buildable tile');
  check(at(-10, -3) === 'Y' && at(-4, -3) === 'P' && at(-8, -8) === 'E' && at(4, -4) === 'S', 'tree Y, police P, mill E, hut S');
  check(/^ +-15 +-10 +-5 +0 +5 +10 +15/.test(lines[1]) && lines[2].split('|').length === 8, 'column labels every 5 with ticks');
  check(rowLines[0].trim().startsWith('-15') && rowLines[5].trim().startsWith('-10') && rowLines[15].trim().startsWith('0') && rowLines[1].slice(0, 5).trim() === '', 'row labels every 5');
  check(/H Town Hall: town_hall/.test(txt) && /G Main Gate: main_gate/.test(txt) && /Y tree/.test(txt), 'legend lists letter -> types');
  check(!/Buildings \(id/.test(txt), 'no id list by default');
  const withIds = R.renderAsciiMap(m, { ids: true, legend: false });
  check(m.layout.buildings.every(b => withIds.includes(`${b.id} ${b.t} (${b.gx},${b.gz}) L${b.l}`)) && !/Legend/.test(withIds), 'ids:true lists every building, legend:false drops the legend');
  const t5 = R.renderAsciiMap(model(TH5), { ids: true });
  check(t5.includes('[upgrading to L4]') && /T turret: .*sniper_tower/.test(t5), 'TH5 map: job flag and turret letter');
  // A building halo covers a tree; a centre is never hidden.
  const hm = R.createModel({ ...DEFAULT.layout, roads: [], buildings: [...DEFAULT.layout.buildings, { id: 'tX', t: 'tree', gx: -5, gz: -3, l: 1, st: 0, rot: 0 }] }, {});
  const hg = R.renderAsciiMap(hm).split('\n').filter(l => /^ *(-?\d+)? +[- ][#.=A-Za-z]{31}$/.test(l)).map(l => l.slice(-31));
  check(hg[-3 + 15][-5 + 15] === 'p' && hg[-3 + 15][-4 + 15] === 'P', 'a footprint covers a tree tile; the centre stays uppercase');
}

// ============================================================ audit + defense
begin('auditLayout');
{
  for (const [name, fx] of [['default', DEFAULT], ['th5', TH5]]) {
    const a = R.auditLayout(model(fx));
    check(a.errors.length === 0 && a.warnings.length === 0, name + ' fixture audits clean', a);
  }
  const bare = R.auditLayout(TH5.layout);
  check(bare.errors.length === 0 && bare.warnings.length === 0, 'a bare cloud layout (a battle snapshot) audits as a model', bare);
  check(R.auditLayout(R.fromCloudLayout(DEFAULT.layout)).errors.length === 0, 'a local blob audits too');
  check(R.auditLayout(null).errors.some(e => /No Town Hall/.test(e)), 'nothing at all -> errors, no throw');
  const broken = (mut) => { const m = model(TH5); mut(m); return R.auditLayout(m); };
  const has = (a, key, re) => a[key].some(x => re.test(x));
  check(has(broken(m => { m.layout.buildings = m.layout.buildings.filter(b => b.t !== 'town_hall'); }), 'errors', /No Town Hall/), 'no Town Hall -> error');
  check(has(broken(m => { m.layout.buildings.push({ id: 'b2', t: 'town_hall', gx: -12, gz: 0, l: 1, st: 0, rot: 0 }); }), 'errors', /2 Town Halls/), 'two Town Halls -> error');
  check(has(broken(m => { m.layout.buildings = m.layout.buildings.filter(b => b.id !== 'gate_east_gate'); }), 'errors', /East Gate .* missing/), 'missing gate -> error');
  check(has(broken(m => { m.layout.buildings.find(b => b.id === 'gate_east_gate').gx = 14; }), 'errors', /not on a gate tile/), 'gate off its tile -> error');
  check(has(broken(m => { m.layout.buildings[5].id = m.layout.buildings[4].id; }), 'errors', /Duplicate building id/), 'duplicate id -> error');
  check(has(broken(m => { m.layout.buildings[5].t = 'moat'; }), 'errors', /unknown building type/), 'unknown type -> error');
  check(has(broken(m => { m.layout.buildings[5].gx = 1.5; }), 'errors', /whole tile/), 'fractional tile -> error');
  check(has(broken(m => { m.layout.buildings[5].l = 13; }), 'errors', /level 13/), 'level 13 -> error');
  check(has(broken(m => { m.layout.tasks[0].id = 'bnone'; m.layout.tasks[0].t = 'town_hall'; m.layout.tasks[0].i = 999; }), 'errors', /matches no building/), 'orphan job -> error');
  check(has(broken(m => { for (let k = 0; k < 400; k++) m.layout.buildings.push({ id: 'bb' + k, t: 'tree', gx: -14, gz: 0, l: 1, st: 0, rot: 0 }); }), 'errors', /at most 400/), '> 400 buildings -> error');
  check(has(broken(m => { for (let k = 0; k < 460; k++) m.layout.roads.push('x' + k); }), 'errors', /at most 450/), '> 450 roads -> error');
  const ov = broken(m => { const b = ofType(m, 'police_station')[0]; m.layout.buildings.push({ id: 'bov', t: 'roadblock', gx: b.gx, gz: b.gz + 1, l: 1, st: 0, rot: 0 }); });
  check(has(ov, 'warnings', /bov .* overlaps|overlaps .*bov/) && ov.errors.length === 0, 'overlap -> warning only');
  check(has(broken(m => { for (let k = 0; k < 5; k++) m.layout.buildings.push({ id: 'bm' + k, t: 'missile_silo', gx: -12 + 2 * k, gz: 1, l: 1, st: 0, rot: 0 }); }), 'warnings', /over the Town Hall 5 limit/), 'over a limit -> warning');
  check(has(broken(m => { ofType(m, 'police_station')[0].gx = 12; ofType(m, 'police_station')[0].gz = 5; }), 'warnings', /outside the Town Hall 5 build radius/), 'structure outside radius -> warning');
  check(has(broken(m => { m.holdings.stowedCounts.roadblock = 40; m.holdings.inventory.roadblock = 40; }), 'warnings', /Storage holds 43/), 'storage over capacity -> warning');
}
begin('defenseReport');
{
  for (const [name, fx] of [['default', DEFAULT], ['th5', TH5]]) {
    const m = model(fx);
    const rep = R.defenseReport(m);
    const th = fx.townHall;
    const want = P.raidDefenseFor(m.layout.buildings.filter(b => !b.gate).map(b => ({ type: b.t, level: b.l })), th);
    check(rep.score === want.score && rep.total === want.total && deq(rep.kinds, want.kinds), name + ': numbers are progression.raidDefenseFor');
    const counted = m.layout.buildings.filter(b => !b.gate && b.t !== 'tree' && P.BUILDING_DEFS[b.t].role !== 'trap').length;
    check(rep.countedTargets === counted && rep.gemBounty === P.raidGemsFor(th, counted, want.score), name + ': gem bounty = raidGemsFor', rep.gemBounty);
    check(rep.gaps.length === want.kinds.filter(k => k.cover < 1).length && rep.gaps.every(g => /% covered/.test(g)), name + ': one readable gap per uncovered kind', rep.gaps);
  }
}

// ============================================================ production clock (MCP writes move st and savedAt together)
begin('advanceProduction');
{
  const H = 3600;
  const m = model(TH5);
  const t0 = m.layout.savedAt;
  const before = clone(m.layout.buildings);
  const secs = R.advanceProduction(m, t0 + H * 1000);
  check(secs === H && m.layout.savedAt === t0 + H * 1000, 'credits the seconds since savedAt and moves savedAt to now', { secs, savedAt: m.layout.savedAt - t0 });
  const prod = m.layout.buildings.filter(b => P.BUILDING_DEFS[b.t] && P.BUILDING_DEFS[b.t].produce);
  check(prod.length > 3 && prod.every(b => {
    const o = before.find(x => x.id === b.id);
    return b.st === Math.floor(P.storedAfter(b.t, b.l, Math.min(o.st, P.produceCapacityFor(b.t, b.l)), H));
  }), 'every producer: floor(storedAfter(st, 1 h)), capped at capacity (restoreCity\'s away credit)');
  check(m.layout.buildings.filter(b => !prod.includes(b)).every(b => deq(b, before.find(x => x.id === b.id))), 'nothing else changes');
  const tesla = byId(m, TH5.layout.tasks[0].id);
  check(deq(tesla, before.find(x => x.id === tesla.id)), 'a building under construction that produces nothing is untouched');
  // A producer being upgraded keeps producing (BuildingManager.advanceProduction).
  const up = model(TH5);
  const mill = ofType(up, 'lumber_mill')[0];
  mill.st = 0;
  up.layout.tasks = [{ i: up.layout.buildings.indexOf(mill), id: mill.id, t: mill.t, gx: mill.gx, gz: mill.gz, to: mill.l + 1, endsAt: t0 + 9e9, total: 100 }];
  R.advanceProduction(up, t0 + 10000);
  check(mill.st === Math.floor(P.produceRateFor('lumber_mill', mill.l) * 10), 'a producer being upgraded keeps producing', mill.st);
  const back = model(TH5);
  check(R.advanceProduction(back, t0 - 60000) === 0 && back.layout.savedAt === t0 && deq(back.layout, model(TH5).layout), 'never backwards: a clock behind savedAt credits nothing and keeps it');
  const odd = model(TH5);
  const oddMill = ofType(odd, 'lumber_mill')[0];
  oddMill.st = 5e6;
  ofType(odd, 'iron_foundry')[0].st = 12.7;
  R.advanceProduction(odd, t0);
  check(oddMill.st === P.produceCapacityFor('lumber_mill', oddMill.l) && ofType(odd, 'iron_foundry')[0].st === 12 && odd.layout.savedAt === t0,
    'no time away still normalises st as restoreCity reads it (capped, whole)', [oddMill.st, ofType(odd, 'iron_foundry')[0].st]);
  const noClock = R.createModel({ ...TH5.layout, savedAt: undefined }, TH5.holdings);
  noClock.layout.savedAt = NaN;
  check(R.advanceProduction(noClock, t0) === 0 && noClock.layout.savedAt === t0, 'no clock at all: stamps now, credits nothing');
  // Stow after the advance credits the output up to now; stow -> place -> stow does not mint twice.
  const s1 = model(TH5);
  const mill1 = ofType(s1, 'lumber_mill').find(b => b.l === 1);
  mill1.st = 0;
  R.advanceProduction(s1, t0 + H * 1000);
  const want = Math.floor(P.storedAfter('lumber_mill', 1, 0, H));
  let r = R.applyOp(s1, { op: 'stow', id: mill1.id }, ctx());
  check(r.ok && r.credit && r.credit.wood === P.producePayout('wood', want).wood && want > 0, 'stow after the advance credits the hour it made', r.credit);
  R.advanceProduction(s1, t0 + H * 1000 + 5000);
  let free = null;
  for (let gz = -10; gz <= 10 && !free; gz++) for (let gx = -10; gx <= 10 && !free; gx++) if (R.checkPlace(s1, 'lumber_mill', gx, gz).ok) free = [gx, gz];
  r = R.applyOp(s1, { op: 'place', type: 'lumber_mill', gx: free[0], gz: free[1] }, ctx());
  check(r.ok && r.st === 0, 'placed back from storage it starts empty at the new clock', r);
  R.advanceProduction(s1, t0 + H * 1000 + 15000);
  r = R.applyOp(s1, { op: 'stow', id: r.id }, ctx(2));
  check(r.ok && r.credit && r.credit.wood === P.producePayout('wood', Math.floor(P.produceRateFor('lumber_mill', 1) * 10)).wood,
    'stowed again 10 s later it credits only those 10 s (no double mint)', r.credit);
}

// ============================================================ undo settles output (review round 2: an undone placement lost its output)
begin('carryOutputForUndo');
{
  const H = 3600e3;
  const t0 = TH5.layout.savedAt;
  const credits = (m) => Object.values(m.holdings.bankCredits).reduce((s, c) => ({ cash: s.cash + c.cash, iron: s.iron + c.iron, wood: s.wood + c.wood }), { cash: 0, iron: 0, wood: 0 });
  // The MCP flow: the model before the change (history), the change, time passes, undo restores the old design.
  const before = model(TH5);
  R.advanceProduction(before, t0);
  const cur = R.createModel(before.layout, before.holdings);
  const spot = free(cur, 'iron_foundry');
  const pl = R.applyOp(cur, { op: 'place', type: 'iron_foundry', gx: spot[0], gz: spot[1] }, ctx());
  check(pl.ok && pl.fromStorage && pl.level === 2 && pl.st === 0, 'setup: the L2 foundry placed from storage, empty');
  R.advanceProduction(cur, t0 + 3 * H);
  const made = byId(cur, pl.id).st;
  const restored = R.createModel(before.layout, before.holdings);
  const out = R.carryOutputForUndo(cur, restored, { nowMs: t0 + 3 * H, rand: mulberry(5) });
  const [cid, credit] = Object.entries(restored.holdings.bankCredits)[0] || [];
  check(made === Math.floor(P.storedAfter('iron_foundry', 2, 0, 3 * 3600)) && made > 0 && !byId(restored, pl.id) &&
    deq(credit, { ...P.producePayout('iron', made), reason: 'stow iron_foundry', at: t0 + 3 * H }) && /^c/.test(cid),
  `a producer the undo takes off the map is credited like a stow (${made} iron), not lost`, { made, credit });
  check(out.credits.length === 1 && out.credits[0].id === cid && out.credits[0].buildingId === pl.id && out.credits[0].iron === made,
    'the result names the credit and the building', out);
  check(deq(restored.holdings.stowedCounts, before.holdings.stowedCounts) && deq(restored.holdings.stowedLevels, before.holdings.stowedLevels) &&
    restored.layout.savedAt === t0 + 3 * H, 'the design (storage, levels) is the old version\'s; the clock is now');
  const keep = ofType(cur, 'lumber_mill')[0];
  check(byId(restored, keep.id).st === keep.st && keep.st > byId(before, keep.id).st, 'a building standing in both keeps its current output');
  // stow -> undo: the stow's credit stays, the producer comes back empty, nothing new is credited.
  const s0 = R.createModel(cur.layout, cur.holdings);
  const sc = R.createModel(s0.layout, s0.holdings);
  const stow = R.applyOp(sc, { op: 'stow', id: keep.id }, ctx(7));
  const s1 = R.createModel(s0.layout, s0.holdings);
  const out2 = R.carryOutputForUndo(sc, s1, { nowMs: t0 + 3 * H, rand: mulberry(8) });
  check(stow.ok && stow.credit && byId(s1, keep.id).st === 0 && out2.credits.length === 0 &&
    deq(credits(s1), credits(sc)), 'stow -> undo: the stow credit is kept once, the producer returns empty', { out2, st: byId(s1, keep.id).st });
  // Vaults: sealed cash follows the unit and is never lost or minted.
  const f = withTH(DEFAULT, 12);
  const base = R.createModel({ ...f.layout, buildings: f.layout.buildings.filter(b => b.t === 'town_hall' || b.gate), roads: [], savedAt: t0 },
    { inventory: { big_storage: 1, crypto_vault: 3 }, stowedCounts: { crypto_vault: 2 }, stowedSealed: { crypto_vault: [5000, 700] } });
  R.applyOp(base, { op: 'place', type: 'big_storage', gx: -9, gz: 0 }, ctx());
  const vc = R.createModel(base.layout, base.holdings);
  const v1 = R.applyOp(vc, { op: 'place', type: 'crypto_vault', gx: -6, gz: 0 }, ctx(2));       // from storage: 5000 sealed
  const v3 = R.applyOp(vc, { op: 'place', type: 'crypto_vault', gx: -3, gz: -3 }, ctx(3));     // from storage: 700
  const v2 = R.applyOp(vc, { op: 'place', type: 'crypto_vault', gx: 3, gz: -3 }, ctx(4));      // fresh: 0
  check(v1.st === 5000 && v3.st === 700 && !v2.fromStorage, 'setup: two vaults from storage (5000, 700), one fresh');
  R.advanceProduction(vc, t0 + H);
  const gain = Math.floor(P.storedAfter('crypto_vault', 1, 0, 3600));
  const vr = R.createModel(base.layout, base.holdings);
  const out3 = R.carryOutputForUndo(vc, vr, { nowMs: t0 + H, rand: mulberry(9) });
  const sealedNow = (m) => (m.holdings.stowedSealed.crypto_vault || []).reduce((a, b) => a + b, 0);
  check(deq(vr.holdings.stowedSealed.crypto_vault, [5000 + gain, 700 + gain, gain]) && out3.sealed.length === 3 && !Object.keys(vr.holdings.bankCredits).length,
    'undoing three vault placements: each keeps its cash plus the hour it made sealed inside, no bank credit', vr.holdings.stowedSealed);
  check(vr.holdings.stowedCounts.crypto_vault === 3 && out3.restowed === 1 && R.normalizeHoldings(vr.holdings).stowedSealed.crypto_vault.length === 3,
    'the fresh vault goes into Big Storage (not the plain inventory) so its cash survives normalisation', { counts: vr.holdings.stowedCounts, out3 });
  // stow -> undo for a vault, an hour after the version it undoes to (whose st is an hour old, as history keeps
  // it): it comes back with the cash its stow sealed, and no vault cash appears or vanishes.
  const vaultCash = (m) => sealedNow(m) + ofType(m, 'crypto_vault').reduce((a, b) => a + b.st, 0);
  const vs = R.createModel(vc.layout, vc.holdings);
  R.advanceProduction(vs, t0 + 2 * H);
  const stowV = R.applyOp(vs, { op: 'stow', id: v1.id }, ctx(11));
  const vb = R.createModel(vc.layout, vc.holdings);
  R.carryOutputForUndo(vs, vb, { nowMs: t0 + 2 * H, rand: mulberry(12) });
  check(stowV.ok && stowV.sealed > byId(vc, v1.id).st && byId(vb, v1.id).st === stowV.sealed && vaultCash(vb) === vaultCash(vs) &&
    (vb.holdings.stowedCounts.crypto_vault || 0) === (vc.holdings.stowedCounts.crypto_vault || 0),
  'vault stow -> undo: it stands again with the cash its stow sealed (not the older version\'s st), storage as before',
  { st: byId(vb, v1.id).st, sealedByStow: stowV.sealed, older: byId(vc, v1.id).st, cash: [vaultCash(vb), vaultCash(vs)] });
}

// ============================================================ reach, roads and coverage (placement feedback for the AI)
begin('reach / roads / coverage');
{
  const T = P.TILE_METRES;
  check(deq(R.reachOf('sniper_tower', 1), { kind: 'turret', tiles: 11.6, metres: 64 }) && R.reachOf('sniper_tower', 4).tiles === Math.round(P.turretStatsFor('sniper_tower', 4).range / T * 10) / 10,
    'turret reach = turretStatsFor range / TILE_METRES, per level', R.reachOf('sniper_tower', 4));
  check(R.reachOf('plasma_mortar', 1).minTiles === Math.round(14 / T * 10) / 10 && /blind inside/.test(R.reachText('plasma_mortar', 1)), 'mortar dead zone');
  check(deq(R.reachOf('spring_trap', 1), { kind: 'trap', tiles: 0.8, metres: 4.5 }) && R.reachText('landmine', 1) === 'trigger radius 1.5 tiles', 'trap trigger radius');
  check(R.reachOf('solar_array', 1).tiles === 5.5 && R.reachOf('orbital_relay', 1).global === true && R.reachText('orbital_relay') === 'aura city-wide', 'auras (the relay is city-wide)');
  check(R.reachOf('lumber_mill') === null && R.reachOf('roadblock') === null && R.reachText('police_station') === '', 'no reach for producers, barriers, spawners');
  const m = model(TH5);
  const runs = R.roadRuns(m);
  const n = runs.reduce((k, r) => k + r.runs.reduce((a, [x, y]) => a + y - x + 1, 0), 0);
  check(n === m.layout.roads.length && runs.every((r, i) => !i || r.gz > runs[i - 1].gz), 'roadRuns covers every road tile once, rows north to south', n);
  check(R.roadRunsText(m).split('\n').includes('gz 0: gx -15..15') && R.roadRunsText(m).split('\n').includes('gz -7: gx 0, 7'), 'roadRunsText: "gz 0: gx -15..15", "gz -7: gx 0, 7"');
  const rows = R.describeBuildings(m);
  const pieces = rows.filter(r => r.onRoad !== undefined);
  check(pieces.length === 13 && pieces.every(r => ['trap', 'barrier'].includes(r.role) && r.onRoad === true), 'describeBuildings: every trap and barrier gets onRoad (all 13 on roads in the fixture)');
  check(rows.filter(r => r.role === 'trap').every(r => r.reachesRoad === true && r.reach.kind === 'trap') && rows.find(r => r.type === 'sniper_tower').reach.kind === 'turret' &&
    !rows.find(r => r.id === 'gate_north_gate').reach, 'traps reach the road; turrets carry reach; gates none');
  const add = (t, gx, gz) => { const b = { id: 'bt' + t + gx + '_' + gz, t, gx, gz, l: 1, st: 0, rot: 0 }; m.layout.buildings.push(b); return b; };
  const spring = add('spring_trap', -3, -8);      // nearest road (-3,-6): 2 tiles
  const mineNext = add('landmine', 1, -8);        // next to (0,-8): 1 tile, radius 1.45 tiles
  const springNext = add('spring_trap', -1, -9);  // next to (0,-9): 1 tile, radius 0.82 tiles
  const block = add('roadblock', -3, -9);
  const st = (b) => R.roadStatusOf(m, b);
  check(deq(st(spring), { onRoad: false, nearestRoad: { gx: -3, gz: -6, tiles: 2 }, reachesRoad: false }), 'off-road spring trap: nearest road 2 tiles, does not reach it', st(spring));
  check(st(mineNext).reachesRoad === true && st(springNext).reachesRoad === false, 'one tile off: a landmine (1.5 tiles) reaches the road, a spring trap (0.8) does not');
  check(st(block).onRoad === false && !('reachesRoad' in st(block)) && R.roadStatusOf(m, byId(m, 'bmumqowj72zx2aesf')) === null, 'barrier: onRoad only; other roles: null');
  check(/^OFF-ROAD: its 0\.8-tile trigger radius reaches no road \(nearest road tile \(-3,-6\), 2 tiles away\)/.test(R.roadNoteFor(m, spring)) &&
    /^not on a road tile, but its 1\.5-tile trigger radius reaches the road \(nearest road tile \(0,-8\), 1 tile away\)$/.test(R.roadNoteFor(m, mineNext)) &&
    /^OFF-ROAD: no road on \(-3,-9\)/.test(R.roadNoteFor(m, block)) && R.roadNoteFor(m, byId(m, 'bmumqoxbxvkgtdp75')) === 'on a road tile' &&
    R.roadNoteFor(m, byId(m, 'bmumqowj72zx2aesf')) === '', 'roadNoteFor phrases each case');
  const noRoads = R.createModel({ ...TH5.layout, roads: [] }, TH5.holdings);
  check(/the city has no roads/.test(R.roadNoteFor(noRoads, byId(noRoads, 'bmumqoxbxvkgtdp75'))), 'a city with no roads says so');
  const cov = R.coverageReport(model(TH5));
  check(deq(cov.map(p => p.name), ['North Gate', 'East Gate', 'South Gate', 'Town Hall']), 'coverage: the three gates and the Town Hall');
  const north = cov[0];
  check(north.turrets.length === 2 && north.turrets[0].id === 'bmumqoxbmookjzgrj' && north.turrets[0].distTiles === 7.6 && north.turrets[0].rangeTiles === 15.8 &&
    cov[2].turrets.length === 0, 'North Gate: sniper 7.6/15.8 + silo; South Gate: none (fixture)', north.turrets);
  const mv = model(TH5);
  byId(mv, 'bmumqoxbnj2p4suve').gx = 0; byId(mv, 'bmumqoxbnj2p4suve').gz = 8;
  check(R.coverageReport(mv)[2].turrets.some(t => t.id === 'bmumqoxbnj2p4suve') && R.defenseReport(mv).score === R.defenseReport(model(TH5)).score,
    'moving a sniper changes coverage but not the (placement-blind) defense score');
  const mortar = model(TH5);
  mortar.layout.buildings.push({ id: 'bmortar', t: 'plasma_mortar', gx: 0, gz: 13, l: 1, st: 0, rot: 0 });
  check(!R.coverageReport(mortar)[2].turrets.some(t => t.id === 'bmortar') && R.coverageReport(mortar)[3].turrets.some(t => t.id === 'bmortar'),
    'a mortar does not cover a gate inside its dead zone, but covers the Town Hall 10+ tiles away');
  check(/a letter hides a road under it/.test(R.renderAsciiMap(model(DEFAULT))), 'the map legend says a letter hides the road under it');
}

// ============================================================ CityPersistence ids (with a stand-in BuildingManager)
begin('CityPersistence');
{
  const CP = await import('../../src/builder/CityPersistence.js');
  const fakeBM = () => {
    const bm = {
      buildings: [], activeBuildTasks: [], economy: null,
      catalog: Object.fromEntries(Object.entries(P.BUILDING_DEFS).map(([t, d]) => [t, { ...d }])),
      roadNetwork: { roads: new Map(), addRoad(gx, gz) { const k = gx + ',' + gz; if (this.roads.has(k)) return false; this.roads.set(k, { gx, gz }); return true; }, clear() { this.roads.clear(); } },
      clearAll() { this.buildings = []; this.activeBuildTasks = []; this.roadNetwork.clear(); },
      fixedGateAt: (gx, gz) => R.fixedGateAt(gx, gz),
      getMainGates() { return this.buildings.filter(b => b.isMainGate); },
      addMainGate(name, gx, gz, rot) { const b = { id: R.gateIdFor(name), type: 'main_gate', name, level: 1, gx, gz, hp: 800, maxHp: 800, mesh: { rotation: { y: rot } }, isMainGate: true }; this.buildings.push(b); return b; },
      addBuilding(type, gx, gz, level = 1) {
        const d = P.BUILDING_DEFS[type];
        if (!d || P.hpForLevel(type, level) === null) return null;
        const b = { id: R.newBuildingId(Date.now()), type, name: d.name, gx, gz, level, maxHp: P.hpForLevel(type, level), hp: 1, mesh: { rotation: { y: 0 } } };
        if (d.produce) { b.produceType = d.produce.type; b.raidOnly = !!d.produce.raidOnly; b.maxCapacity = P.produceCapacityFor(type, level); b.stored = Math.min(d.produce.seed || 0, b.maxCapacity); }
        this.buildings.push(b);
        return b;
      },
      completeConstruction(task) { task.building.level = task.targetLevel; },
      resumeBuildTask(b, targetLevel, remaining, total, endsAt) { const t = { building: b, targetLevel, remaining, total, endsAt }; this.activeBuildTasks.push(t); b.isUnderConstruction = true; b.buildTask = t; return t; },
      ensureCityCore() { return []; },
      getUpgradeCost() { return { cash: 0, iron: 0, wood: 0 }; },
      advanceProduction() {}
    };
    return bm;
  };
  const blob = R.fromCloudLayout(TH5.layout);
  const bm = fakeBM();
  const rep = CP.restoreCity(bm, blob, blob.savedAt);
  check(rep.buildings === blob.buildings.length && bm.buildings.every((b, i) => b.id === blob.buildings[i].id), 'restoreCity keeps every saved id (gates included)');
  check(rep.tasksResumed === 1 && bm.activeBuildTasks[0].building.id === blob.tasks[0].id, 'the job resumes on its building');
  const again = CP.serializeCity(bm, blob.savedAt);
  check(again.buildings.every((b, i) => b.id === blob.buildings[i].id) && again.tasks.length === 1 && again.tasks[0].id === blob.tasks[0].id && again.tasks[0].i === blob.tasks[0].i,
    'serializeCity writes the ids back (buildings and job)');
  check(Object.keys(again.buildings[0])[0] === 'id' && Object.keys(again.tasks[0]).slice(0, 2).join() === 'i,id', 'id is written first');
  // Duplicate / malformed / gate-claiming ids.
  const dirty = clone(blob);
  dirty.buildings[5].id = dirty.buildings[4].id;
  dirty.buildings[6].id = 'no spaces allowed';
  dirty.buildings[7].id = 'gate_east_gate';
  dirty.buildings[1].id = 'gate_whatever';
  const bm2 = fakeBM();
  CP.restoreCity(bm2, dirty, dirty.savedAt);
  const ids2 = bm2.buildings.map(b => b.id);
  check(ids2[4] === blob.buildings[4].id && ids2[5] !== ids2[4], 'a duplicate saved id is kept once');
  check(ids2[6] !== 'no spaces allowed' && R.isValidBuildingId(ids2[6]), 'a malformed saved id is not restored');
  check(ids2[7] !== 'gate_east_gate' && ids2.filter(x => x === 'gate_east_gate').length === 1, 'nothing but the gate gets a gate id');
  check(bm2.buildings.filter(b => b.isMainGate).map(b => b.id).sort().join() === 'gate_east_gate,gate_north_gate,gate_south_gate', 'gates always keep their fixed ids');
  // Job matching: id first, index as the fallback.
  const shifted = clone(blob);
  const tIdx = shifted.tasks[0].i;
  const [moved] = shifted.buildings.splice(tIdx, 1);
  shifted.buildings.unshift(moved);                  // the job's building is now at index 0; its i is stale
  const bm3 = fakeBM();
  CP.restoreCity(bm3, shifted, shifted.savedAt);
  check(bm3.activeBuildTasks.length === 1 && bm3.activeBuildTasks[0].building.id === moved.id, 'job matched by id although its index is stale');
  const legacy = clone(blob);
  delete legacy.tasks[0].id;
  legacy.buildings.forEach(b => delete b.id);
  const bm4 = fakeBM();
  CP.restoreCity(bm4, legacy, legacy.savedAt);
  check(bm4.activeBuildTasks.length === 1 && bm4.activeBuildTasks[0].building.type === 'tesla_coil' && bm4.buildings.indexOf(bm4.activeBuildTasks[0].building) === tIdx, 'old saves: job matched by index');
  const toGate = clone(blob);
  toGate.tasks[0].id = 'gate_north_gate';
  toGate.tasks[0].t = 'main_gate';
  const bm5 = fakeBM();
  CP.restoreCity(bm5, toGate, toGate.savedAt);
  check(bm5.activeBuildTasks.length === 0, 'a job naming a gate is never resumed');
  const unknownId = clone(blob);
  unknownId.tasks[0].id = 'bgone';
  const bm6 = fakeBM();
  CP.restoreCity(bm6, unknownId, unknownId.savedAt);
  check(bm6.activeBuildTasks.length === 1 && bm6.activeBuildTasks[0].building.type === 'tesla_coil', 'an id that matches nothing falls back to the index');
  // Foreign-city guard.
  const writes = [];
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { setItem: (k, v) => writes.push(k), getItem: () => null, removeItem() {} } });
  const arena = fakeBM();
  arena.isForeignCity = true;
  check(CP.saveCity(arena) === false && writes.length === 0, 'saveCity refuses a foreign (arena) city and writes nothing');
  check(CP.saveCity(bm) === true && writes.length === 1, 'saveCity still saves the home city');
}

// ============================================================ battleRules
begin('battleRules');
{
  const T = 1_800_000_000_000;
  check(B.toMillis(5) === 5 && B.toMillis(new Date(T)) === T && B.toMillis({ toMillis: () => T }) === T, 'toMillis: number, Date, Timestamp');
  check(B.toMillis({ seconds: 1800000000, nanoseconds: 999999999 }) === T + 999 && B.toMillis({ _seconds: 1800000000, _nanoseconds: 5e6 }) === T + 5, 'toMillis: {seconds,nanoseconds} and admin JSON');
  check([null, undefined, NaN, 'x', {}, new Date('nope'), Infinity].every(v => B.toMillis(v) === null), 'toMillis: junk -> null');
  check(B.fightWindowSeconds('instant') === 900 && B.fightWindowSeconds('scheduled') === 3600, 'fight windows');
  const inst = { mode: 'instant', status: 'pending', challenger: 'a', opponent: 'o', players: ['a', 'o'], createdAt: T, designSeconds: 120 };
  const sch = { mode: 'scheduled', status: 'pending', challenger: 'a', opponent: 'o', players: ['a', 'o'], createdAt: T, startAt: T + 3600e3, fightEndsAt: T + 7200e3 };
  check(B.respondDeadline(inst) === T + 600e3 && B.respondDeadline(sch) === T + 3600e3 - 60e3, 'respondDeadline');
  check(B.respondDeadline({ mode: 'instant' }) === null && B.battlePhase({ mode: 'instant', status: 'pending' }, T) === 'pending', 'unknown createdAt: still pending');
  check(B.battlePhase(inst, T + 600e3 - 1) === 'pending' && B.battlePhase(inst, T + 600e3) === 'expired', 'instant pending -> expired at the deadline');
  check(B.battlePhase(sch, T + 3540e3 - 1) === 'pending' && B.battlePhase(sch, T + 3540e3) === 'expired', 'scheduled pending -> expired a minute before start');
  check(B.battlePhase({ ...inst, status: 'declined' }, T) === 'declined' && B.battlePhase({ ...inst, status: 'cancelled' }, T) === 'cancelled' &&
    B.battlePhase({ ...inst, status: 'finished' }, T) === 'finished', 'declined / cancelled / finished');
  const acc = { ...inst, status: 'accepted', startAt: T + 120e3, fightEndsAt: T + 120e3 + 900e3 };
  check(B.battlePhase(acc, T + 120e3 - 1) === 'design' && B.battlePhase(acc, T + 120e3) === 'fight', 'design -> fight at startAt');
  check(B.battlePhase(acc, T + 1020e3 - 1) === 'fight' && B.battlePhase(acc, T + 1020e3) === 'resolving', 'fight -> resolving at fightEndsAt');
  check(B.battlePhase({ ...acc, results: { a: { stars: 1 } } }, T + 200e3) === 'fight', 'one result: still fight');
  check(B.battlePhase({ ...acc, results: { a: { stars: 1 }, o: { stars: 0 } } }, T + 200e3) === 'resolving', 'both results: resolving at once');
  check(B.battlePhase({ ...acc, results: { a: { stars: 1 }, o: { stars: 0 } } }, T) === 'resolving', '... even before the fight window');
  check(B.battlePhase({ ...acc, fightEndsAt: undefined }, T + 120e3 + 900e3) === 'resolving' &&
    B.battlePhase({ ...acc, mode: 'scheduled', fightEndsAt: undefined }, T + 120e3 + 900e3) === 'fight', 'missing fightEndsAt: startAt + the mode window');
  check(B.battlePhase({ ...acc, startAt: null }, T + 9e9) === 'design', 'accepted with no startAt yet: design');
  check(B.battlePhase({ status: 'weird' }, T) === 'expired' && B.battlePhase(null, T) === 'expired', 'unknown status -> expired');
  check(B.battlePhase({ ...acc, startAt: { seconds: (T + 120e3) / 1000, nanoseconds: 0 }, fightEndsAt: { toMillis: () => T + 1020e3 } }, T + 500e3) === 'fight', 'Timestamp shapes accepted');
  // Scores and winner.
  const res = (a, o) => ({ ...acc, results: { ...(a ? { a } : {}), ...(o ? { o } : {}) } });
  const r = (stars, percentage, durationSec) => ({ stars, percentage, durationSec, destroyed: 1, total: 2, outcome: 'retreat' });
  check(deq(B.scoreOf(res(null, null), 'a'), { stars: 0, percentage: 0, durationSec: Infinity, missing: true }), 'scoreOf missing');
  check(B.scoreOf(res(r(2, 70, 100)), 'a').stars === 2 && B.scoreOf(res(r(2, 70, 100)), 'a').missing === false, 'scoreOf present');
  check(B.decideWinner(res(r(2, 60, 500), r(1, 99, 10))) === 'a', 'more stars wins');
  check(B.decideWinner(res(r(1, 40, 10), r(1, 55, 500))) === 'o', 'equal stars: higher % wins');
  check(B.decideWinner(res(r(1, 40, 300), r(1, 40, 200))) === 'o', 'equal stars and %: faster wins');
  check(B.decideWinner(res(r(1, 40, 200), r(1, 40, 200))) === 'draw', 'all equal: draw');
  check(B.decideWinner(res(r(0, 0, 600), null)) === 'a', 'an attempt beats no attempt (time tie-break)');
  check(B.decideWinner(res(null, null)) === 'void', 'nobody has a result: void (not a draw)');
  check(B.decideWinner({ ...res(null, null), attempts: { a: { startedAt: T }, o: { startedAt: T } } }) === 'void', 'both attempted, neither result: still void');
  check(B.decideWinner(res(null, r(0, 10, 50))) === 'o', 'missing vs 10%: the raider wins');
  check(B.decideWinner({ challenger: 'x', opponent: 'y', results: { y: r(3, 100, 90) } }) === 'y', 'players from challenger/opponent when no players array');
  check(B.trophyDelta(res(r(2, 60, 1), r(1, 1, 1)), 'a') === 30 && B.trophyDelta(res(r(2, 60, 1), r(1, 1, 1)), 'o') === -20, 'trophies: +30 / -20');
  check(B.trophyDelta(res(r(1, 40, 200), r(1, 40, 200)), 'a') === 5 && B.trophyDelta(res(r(1, 40, 200), r(1, 40, 200)), 'o') === 5, 'draw: +5 each');
  check(B.trophyDelta(res(null, null), 'a') === 0 && B.trophyDelta(res(null, null), 'o') === 0 &&
    B.trophyDelta({ ...res(null, null), winner: 'void' }, 'a') === 0, 'void: 0 trophies each');
  check(B.recordFieldFor('a', 'a') === 'wins' && B.recordFieldFor('a', 'o') === 'losses' && B.recordFieldFor('draw', 'o') === 'draws' &&
    B.recordFieldFor('void', 'a') === null && B.recordFieldFor(null, 'a') === null, 'recordFieldFor: win / loss / draw / void (no counter)');
  // When may the winner be written (mirrors the rules' resolveOk)?
  const att = (...u) => Object.fromEntries(u.map(k => [k, { startedAt: T }]));
  const END = T + 1020e3;
  check(!B.resolveDue({ ...res(r(1, 40, 1), null), attempts: att('a') }, END - 1), 'resolveDue: one result, fight still running -> no');
  check(B.resolveDue({ ...res(r(1, 40, 1), null), attempts: att('a') }, END), 'resolveDue: fight over, the other never attempted -> yes (nothing can arrive)');
  check(!B.resolveDue({ ...res(r(1, 40, 1), null), attempts: att('a', 'o') }, END + 659e3) && B.resolveDue({ ...res(r(1, 40, 1), null), attempts: att('a', 'o') }, END + 660e3),
    'resolveDue: the other attempted without a result -> only after the grace');
  check(B.resolveDue({ ...res(null, null), attempts: {} }, END) && !B.resolveDue({ ...res(null, null), attempts: {} }, END - 1), 'resolveDue: nobody attempted -> at fightEndsAt (void)');
  check(B.resolveDue(res(r(1, 1, 1), r(2, 70, 1)), T + 200e3), 'resolveDue: both results -> at once');
  check(!B.resolveDue({ ...res(null, null), status: 'finished' }, END + 9e9) && !B.resolveDue({ ...res(null, null), status: 'pending' }, END + 9e9), 'resolveDue: only accepted battles');
  check(B.awaitingResult({ ...res(r(1, 1, 1), null), attempts: att('a', 'o') }) && !B.awaitingResult({ ...res(r(1, 1, 1), null), attempts: att('a') }), 'awaitingResult');
  // raidEndsBy / nextChangeAt: the moments the clock alone changes a battle (round-2 review: the
  // attack cutoff never reached a screen that had no Firestore change to redraw it).
  check(B.raidEndsBy({ ...acc, attempts: att('a') }, 'a') === T + 660e3 && B.raidEndsBy(acc, 'a') === null && B.raidEndsBy({ ...acc, attempts: att('a') }, 'o') === null,
    'raidEndsBy: attempt + raid clock + 60 s, null without an attempt');
  check(B.nextChangeAt(inst, T) === T + 600e3 && B.nextChangeAt(inst, T + 600e3) === null, 'nextChangeAt pending: the respond deadline, then nothing');
  const S = T + 120e3;                                  // acc: startAt S, fightEndsAt S + 900 s
  const steps = [];
  for (let t = T, k = 0; t !== null && k < 10; k++) { t = B.nextChangeAt(acc, t); if (t !== null) steps.push(t - S); }
  check(deq(steps, [0, 15e3, 870e3, 900e3, 1560e3]), 'nextChangeAt accepted: lock, other lock, attack cutoff, fight end, result grace end', steps);
  check(B.nextChangeAt(acc, S + 869e3) === S + 870e3 && B.battlePhase(acc, S + 870e3) === 'fight', 'the attack cutoff is a boundary inside the fight phase');
  const raiding = { ...acc, attempts: { a: { startedAt: S + 100e3 } } };
  check(B.nextChangeAt(raiding, S + 700e3) === S + 760e3 && B.nextChangeAt({ ...raiding, results: { a: r(1, 30, 50) } }, S + 700e3) === S + 870e3,
    'nextChangeAt: a started raid without a result ends its clock (raidEndsBy); with a result it does not count');
  check(B.nextChangeAt({ ...acc, status: 'finished' }, T) === null && B.nextChangeAt({ ...acc, status: 'declined' }, T) === null && B.nextChangeAt(null, T) === null,
    'nextChangeAt: finished / declined / null -> null');
  check(B.trophyDelta(res(null, null), 'zed') === 0 && B.trophyDelta(res(null, null), undefined) === 0, 'non-participant: 0');
  check(B.trophyDelta({ ...res(r(3, 100, 1), null), winner: 'o' }, 'o') === 30, 'the recorded winner is what counts');
  check(B.BATTLE.TROPHY_WIN === 30 && B.BATTLE.TROPHY_LOSS === -20 && B.BATTLE.TROPHY_DRAW === 5 && B.BATTLE.RESULT_GRACE_SECONDS === 660 &&
    deq(B.BATTLE.INSTANT_DESIGN_OPTIONS, [0, 120, 300, 600]) && B.BATTLE.MESSAGE_MAX === 140, 'BATTLE constants per spec');
  check(B.BATTLE.CHALLENGE_COOLDOWN_SECONDS === 10 && B.BATTLE.LOCK_GRACE_SECONDS === 15 && B.BATTLE.ATTACK_CUTOFF_SECONDS === 30 &&
    B.BATTLE.LOCK_GRACE_SECONDS < B.BATTLE.INSTANT_FIGHT_SECONDS, 'BATTLE constants added by the review fixes (spec 13)');
  // Night.
  const day = (h, m = 0) => new Date(2026, 8, 29, h, m, 0, 0);
  check(!B.isNightAt(day(18, 59)) && B.isNightAt(day(19)) && B.isNightAt(day(5, 59)) && !B.isNightAt(day(6)) && B.isNightAt(day(23).getTime()), 'isNightAt boundaries');
  // Presets.
  const pn = B.schedulePresets(day(12));
  check(pn.map(p => p.id).join() === 'tonight21,tonight23,tomorrow21' && pn.every(p => p.available && p.night), 'noon: all three available, night');
  check(pn[0].startAt === day(21).getTime() && pn[1].startAt === day(23).getTime() && pn[2].startAt === new Date(2026, 8, 30, 21).getTime(), 'preset times are local 21:00 / 23:00 / tomorrow 21:00');
  check(pn[0].label === 'Tonight 21:00' && pn[2].label === 'Tomorrow 21:00', 'labels');
  const late = B.schedulePresets(day(20, 55));
  check(!late[0].available && /10 minutes/.test(late[0].reason) && late[1].available && late[2].available, '20:55: tonight 21:00 is too close');
  const edge = B.schedulePresets(day(20, 50));
  check(edge[0].available, '20:50: exactly 10 minutes lead is allowed');
  const night = B.schedulePresets(day(23, 30));
  check(!night[0].available && !night[1].available && /past/.test(night[1].reason) && night[2].available, '23:30: only tomorrow');
  // validateChallenge.
  const now = T;
  const vi = { opponentUid: 'o', challengerUid: 'a', mode: 'instant', designSeconds: 300, theme: 'day', message: 'hi' };
  check(B.validateChallenge(vi, now).ok, 'valid instant');
  const vs = { opponentUid: 'o', mode: 'scheduled', startAtMs: now + 600e3, theme: 'night' };
  check(B.validateChallenge(vs, now).ok, 'valid scheduled at exactly the minimum lead');
  const bad = (patch, base = vi) => B.validateChallenge({ ...base, ...patch }, now);
  check(!bad({ opponentUid: '' }).ok && !bad({ opponentUid: 'a' }).ok && !bad({ mode: 'blitz' }).ok && !bad({ theme: 'dusk' }).ok, 'opponent / self / mode / theme errors');
  check(!bad({ designSeconds: 45 }).ok && !bad({ designSeconds: undefined }).ok && !bad({ designSeconds: null }).ok && bad({ designSeconds: 0 }).ok, 'design time must be 0/120/300/600');
  check(!bad({ startAtMs: now + 1e6 }).ok, 'instant with a start time -> error');
  check(!bad({ startAtMs: now + 600e3 - 1 }, vs).ok && !bad({ startAtMs: now + 7 * 86400e3 + 1 }, vs).ok && bad({ startAtMs: now + 7 * 86400e3 }, vs).ok && !bad({ startAtMs: undefined }, vs).ok,
    'scheduled lead window [10 min, 7 days]');
  check(!bad({ message: 'x'.repeat(141) }).ok && bad({ message: 'x'.repeat(140) }).ok && !bad({ message: 5 }).ok, 'message <= 140 chars');
  check(bad({ theme: undefined, message: undefined }).ok, 'theme and message optional');
  check(Array.isArray(bad({ mode: 'blitz', opponentUid: '' }).errors) && bad({ mode: 'blitz', opponentUid: '' }).errors.length === 2, 'every problem listed');
  // Stars: the same thresholds as DestructionEngine.getStats, checked against the real engine.
  const THREE = await import('three');
  const { DestructionEngine } = await import('../../src/combat/DestructionEngine.js');
  const quiet = new Proxy({}, { get: () => () => {} });
  const de = new DestructionEngine(new THREE.Scene(), quiet, null);
  let same = 0, n = 0;
  for (let total = 1; total <= 145; total++) {
    for (let destroyed = 0; destroyed <= total; destroyed++) {
      de.totalBuildingsCount = total;
      de.destroyedBuildingsCount = destroyed;
      const s = de.getStats();
      n++;
      if (B.starsFor(s.percentage) === s.stars) same++;
    }
  }
  check(same === n, `starsFor(percentage) == DestructionEngine.getStats().stars for all ${n} (destroyed,total) pairs`, `${same}/${n}`);
  check(B.starsFor(24.99) === 0 && B.starsFor(25) === 1 && B.starsFor(59) === 1 && B.starsFor(60) === 2 && B.starsFor(94) === 2 && B.starsFor(95) === 3 && B.starsFor(100) === 3, 'starsFor thresholds 25/60/95');
}

// ============================================================ BattleService views (clock + raid location)
// Round-2 review: the ATTACK button outlived the 30 s cutoff (views were recomputed only on a
// snapshot or a phase change), another tab's live raid read "Raid interrupted (page closed)", and
// the "cities are locked" toast came before the cities were. BattleService with a fake clock, a fake
// Firestore and an in-memory localStorage.
begin('BattleService views');
{
  const store = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: {
    getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) } });
  const { BattleService } = await import('../../src/net/BattleService.js');
  const T0 = 1_800_000_000_000;
  let NOW = T0;
  const events = [];
  const writes = [];
  const fsFake = {
    doc: (db, ...p) => p.join('/'),
    serverTimestamp: () => 'SERVER_TS',
    updateDoc: async (ref, upd) => { writes.push([ref, upd]); },
    getDocFromServer: async (ref) => ({ exists: () => true, id: ref.split('/')[1], data: () => ({ status: 'accepted', fightEndsAt: NOW + 600e3, attempts: { a: { startedAt: NOW - 60e3 } }, results: { a: { stars: 1 } } }) })
  };
  const controller = { serverNow: () => NOW, _battleEvent: (e) => events.push(e), _onBattles() {}, _clearError() {}, _error() {}, profile: { name: 'Al' } };
  const svc = new BattleService({ fb: { db: {}, fsSdk: fsFake }, controller });
  svc.uid = 'a';
  const snap = { layout: {}, townHall: 1, name: 'x', rev: 1, lockedAt: T0 };
  const END = T0 + 100e3;
  const fightB = (over = {}) => ({ id: 'F', mode: 'instant', status: 'accepted', challenger: 'a', opponent: 'o', players: ['a', 'o'], names: { a: 'Al', o: 'Oz' },
    createdAt: T0 - 1000e3, startAt: END - 900e3, fightEndsAt: END, snapshots: { a: snap, o: snap }, attempts: {}, results: {}, ready: {}, settled: {}, ...over });
  // Capture the timer _refresh arms (the clock boundary) instead of waiting for it.
  const realSetTimeout = globalThis.setTimeout;
  const refreshAt = (now, raw) => {
    NOW = now;
    let armed = null;
    globalThis.setTimeout = (fn, ms) => { armed = { fn, ms }; return 0; };
    try { svc.raw = new Map(raw.map(b => [b.id, b])); svc._refresh(); } finally { globalThis.setTimeout = realSetTimeout; }
    return armed;
  };
  let armed = refreshAt(END - 45e3, [fightB()]);
  check(svc.list[0].canAttack && svc.list[0].needsAction, '45 s left: canAttack, needsAction');
  check(armed && armed.ms === 15e3 + 250, 'the next refresh is armed for the attack cutoff (+250 ms), not the next snapshot', armed && armed.ms);
  // The timer fires: the cached list (what BATTLES, the badge and the banner render) drops ATTACK.
  NOW = END - 30e3 + 250;
  globalThis.setTimeout = (fn, ms) => { armed = { fn, ms }; return 0; };
  try { svc._refresh(); } finally { globalThis.setTimeout = realSetTimeout; }
  check(!svc.list[0].canAttack && svc.list[0].attackClosed && !svc.list[0].needsAction, 'after the cutoff timer: canAttack false, attackClosed, not needsAction');
  check(armed && armed.ms === 30e3 - 250 + 250, 'then the fight end is the next boundary', armed && armed.ms);
  armed = refreshAt(T0, [fightB({ startAt: T0 + 30 * 86400e3, fightEndsAt: T0 + 30 * 86400e3 + 900e3 })]);
  check(armed && armed.ms === 86400e3 + 250, 'a start 30 days away arms at most a day ahead (no setTimeout overflow)', armed && armed.ms);
  // Where my started raid is (attempt, no result, nothing queued).
  const withAttempt = (agoMs) => fightB({ fightEndsAt: T0 + 3600e3, attempts: { a: { startedAt: T0 - agoMs } } });
  const myRaid = (b) => svc.view(b, T0).myRaid;
  const RAIDS = 'city_siege_battle_raids';
  store.delete(RAIDS);
  check(myRaid(withAttempt(60e3)) === 'away', 'no trace in this browser, clock still running: away (another device)');
  check(myRaid(withAttempt(661e3)) === 'over', 'no trace here, attempt + 11 min passed: over');
  store.set(RAIDS, JSON.stringify({ F: { uid: 'a', beat: Date.now() } }));
  check(myRaid(withAttempt(60e3)) === 'tab', 'a fresh beat from another tab: tab (was "Raid interrupted")');
  store.set(RAIDS, JSON.stringify({ F: { uid: 'a', beat: Date.now(), dead: true } }));
  check(myRaid(withAttempt(60e3)) === 'lost', 'that tab closed or reloaded (dead): lost');
  store.set(RAIDS, JSON.stringify({ F: { uid: 'a', beat: Date.now() - 91e3 } }));
  check(myRaid(withAttempt(60e3)) === 'lost', 'no beat for 91 s (a crashed tab): lost');
  store.set(RAIDS, JSON.stringify({ F: { uid: 'someoneElse', beat: Date.now() } }));
  check(myRaid(withAttempt(60e3)) === 'away', 'another account\'s mark in this browser is not mine');
  store.set('city_siege_battle_results', JSON.stringify({ F: { uid: 'a', stats: {} } }));
  const q = svc.view(withAttempt(60e3), T0);
  check(q.resultPending && q.myRaid === null, 'a queued result wins: resultPending, no raid state');
  store.delete('city_siege_battle_results');
  store.delete(RAIDS);
  const theirs = (agoMs) => svc.view(fightB({ fightEndsAt: T0 + 3600e3, attempts: { o: { startedAt: T0 - agoMs } } }), T0);
  check(!theirs(60e3).theirRaidOver && !theirs(60e3).raidsOver && theirs(661e3).theirRaidOver && theirs(661e3).raidsOver, 'theirRaidOver / raidsOver after attempt + 11 min');
  // This page raids: startAttempt marks it, submitResult (queue first) unmarks it.
  await svc.startAttempt('F');
  check(JSON.parse(store.get(RAIDS)).F.uid === 'a' && svc.view(withAttempt(60e3), T0).myRaid === 'here', 'startAttempt: this page runs it (here) and tells other tabs (beat)');
  svc._onPageHide();
  check(JSON.parse(store.get(RAIDS)).F.dead === true, 'pagehide marks this page\'s raid dead for the other tabs');
  await svc.submitResult('F', { percentage: 10, destroyed: 1, total: 10, outcome: 'retreat', durationSec: 30 });
  check(!store.has(RAIDS) && !svc._raidingHere.has('F'), 'the raid ends (result queued/sent): no mark left');
  // "is live" once both cities are locked, not at the phase change.
  events.length = 0;
  svc._seen = null;
  const S = T0 + 10e3;
  const startB = (snaps) => fightB({ id: 'L', mode: 'scheduled', startAt: S, fightEndsAt: S + 3600e3, snapshots: snaps });
  refreshAt(S - 1000, [startB({})]);
  refreshAt(S + 300, [startB({ a: snap })]);
  check(!events.some(e => e.type === 'started'), 'fight phase with only my city locked: no "cities are locked" toast');
  refreshAt(S + 15500, [startB({ a: snap, o: snap })]);
  refreshAt(S + 16000, [startB({ a: snap, o: snap })]);
  check(events.filter(e => e.type === 'started').length === 1, 'both locked: exactly one "started" toast', events.map(e => e.type));
  svc.stop();
}

// ============================================================ every REASON code exercised
begin('coverage');
{
  // Re-run one op per code and confirm each code is produced (a guard against dead codes).
  const seen = new Set();
  const m = model(DEFAULT);
  const t5 = model(TH5);
  const push = (r) => { if (r && r.ok === false) seen.add(r.reason); };
  push(R.applyOp(m, { op: 'place', type: 'nope', gx: 0, gz: 0 }, ctx()));
  push(R.applyOp(m, { op: 'place', type: 'road', gx: 0, gz: 0 }, ctx()));
  push(R.applyOp(m, { op: 'place', type: 'police_station', gx: -9, gz: 4 }, ctx()));
  push(R.applyOp(R.createModel(DEFAULT.layout, { inventory: { sniper_tower: 1 } }), { op: 'place', type: 'sniper_tower', gx: -9, gz: 4 }, ctx()));
  push(R.applyOp(R.createModel(DEFAULT.layout, { inventory: { petrol_pump: 1 } }), { op: 'place', type: 'petrol_pump', gx: -9, gz: 4 }, ctx()));
  push(R.applyOp(m, { op: 'place', type: 'lumber_mill', gx: 14, gz: 0 }, ctx()));
  push(R.applyOp(m, { op: 'place', type: 'lumber_mill', gx: 3, gz: 3 }, ctx()));
  push(R.applyOp(m, { op: 'move', id: 'bx', gx: 0, gz: 0 }, ctx()));
  push(R.applyOp(m, { op: 'move', id: 'gate_north_gate', gx: 0, gz: 0 }, ctx()));
  push(R.applyOp(t5, { op: 'move', id: t5.layout.tasks[0].id, gx: 0, gz: 0 }, ctx()));
  push(R.applyOp(m, { op: 'stow', id: 'gate_north_gate' }, ctx()));
  push(R.applyOp(m, { op: 'stow', id: ofType(m, 'police_station')[0].id }, ctx()));
  const full = model(TH5);
  full.holdings.stowedCounts.roadblock = 9; full.holdings.inventory.roadblock = 9;
  push(R.applyOp(full, { op: 'stow', id: ofType(full, 'police_station')[0].id }, ctx()));
  push(R.applyOp(m, { op: 'remove_tree', id: 'gate_north_gate' }, ctx()));
  push(R.applyOp(R.createModel(DEFAULT.layout, {}), { op: 'add_roads', tiles: [[1, 1]] }, ctx()));
  const lim = R.createModel({ ...DEFAULT.layout, roads: Array.from({ length: 130 }, (_, k) => `${-20 - k},0`) }, { inventory: { road: 5 } });
  push(R.applyOp(lim, { op: 'add_roads', tiles: [[1, 1]] }, ctx()));
  push(R.applyOp(m, { op: 'add_roads' }, ctx()));
  const missing = Object.values(R.REASON).filter(c => !seen.has(c));
  check(missing.length === 0, 'all 17 REASON codes are reachable', missing);
}

// ============================================================ report
console.log('');
for (const s of sectionCounts) console.log(`${s.fail ? 'FAIL' : 'PASS'}  ${s.name.padEnd(34)} ${s.pass} passed${s.fail ? ', ' + s.fail + ' FAILED' : ''}`);
console.log(`\ntest-shared: ${pass} passed, ${failCount} failed`);
if (failCount) process.exit(1);
