#!/usr/bin/env node
/**
 * Unit tests for src/net/cityMerge.js - what CloudSync does when the cloud city moved on (an AI
 * designer edit, another device) while this device still had changes it had not pushed.
 * Plain Node (>= 20), no emulator, no browser.
 *
 *   node tools/online/test-sync-merge.mjs            (exit 1 on any failure)
 *
 * The REMOTE side of every case is made the way the MCP server makes it: cityRules.applyOps on
 * the base city (the cloud doc this device last synced), with layout.savedAt left alone. The
 * LOCAL side is the base plus what the game does (a shop purchase, an upgrade, a gem finish, a
 * collect, a move, a stow, a road). The browser half (the real game + emulator + the real MCP
 * store) is tools/online/e2e-sync.mjs.
 */
import fs from 'node:fs';
import * as P from '../../src/data/progression.js';
import * as R from '../../src/shared/cityRules.js';
import { rebaseCity, mergeBank, rebaseKeptSomething, planCredits } from '../../src/net/cityMerge.js';

const ROOT = new URL('../../', import.meta.url).pathname;
const FIX = (name) => JSON.parse(fs.readFileSync(ROOT + 'tools/online/fixtures/' + name, 'utf8'));

let pass = 0;
const failures = [];
let section = '';
const check = (ok, name, detail) => {
  if (ok) { pass++; return true; }
  const line = `FAIL [${section}] ${name}` + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '');
  failures.push(line);
  console.log(line);
  return false;
};
const begin = (name) => { section = name; };
const clone = (v) => JSON.parse(JSON.stringify(v));
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
const BASE_AGE_MS = 10_000;     // the base was pushed 10 s ago

/** A base city: the fixture as the game pushed it 10 s before NOW (jobs shifted to stay running). */
function baseOf(fx) {
  const b = clone(fx);
  const shift = (NOW - BASE_AGE_MS) - b.layout.savedAt;
  b.layout.savedAt = NOW - BASE_AGE_MS;
  for (const t of b.layout.tasks) t.endsAt += shift;
  b.rev = 5;
  return b;
}

/** The live city at NOW with no changes: producers grew for 10 s, nothing else moved. */
function localOf(base) {
  const l = clone({ layout: base.layout, holdings: base.holdings });
  l.layout.savedAt = NOW;
  for (const b of l.layout.buildings) {
    const def = P.BUILDING_DEFS[b.t];
    if (def && def.produce) b.st = Math.round(P.storedAfter(b.t, b.l, b.st, BASE_AGE_MS / 1000));
  }
  return l;
}

/**
 * The AI designer's edit, exactly as the MCP server (mcp-server/src/store.js) writes it 200 ms
 * before NOW: production brought up to the write (cityRules.advanceProduction stamps savedAt),
 * the ops applied, rev + 1. `frozen: true` is the first server version, which left savedAt alone.
 */
function mcp(base, ops, seed = 7, { frozen = false } = {}) {
  const m = R.createModel(base.layout, base.holdings);
  if (!frozen) R.advanceProduction(m, NOW - 200);
  const res = R.applyOps(m, ops, { nowMs: NOW - 200, rand: mulberry(seed) });
  if (!res.ok) throw new Error('mcp ops failed: ' + JSON.stringify(res.results[res.failedAt]));
  const out = R.modelToCloud(m);
  if (frozen) out.layout.savedAt = base.layout.savedAt;
  return { ...out, rev: base.rev + 1, updatedBy: 'mcp' };
}

// ---- the game's own actions on a local city (cloud encoding)
const find = (c, id) => c.layout.buildings.find(b => b.id === id);
const ofType = (c, t) => c.layout.buildings.filter(b => b.t === t);
const localBuy = (c, t, n = 1) => { c.holdings.inventory[t] = (c.holdings.inventory[t] || 0) + n; };
function localUpgrade(c, id) {
  const i = c.layout.buildings.findIndex(b => b.id === id);
  const b = c.layout.buildings[i];
  const total = P.buildSecondsFor(b.t, b.l + 1);
  c.layout.tasks.push({ i, id, t: b.t, gx: b.gx, gz: b.gz, to: b.l + 1, endsAt: NOW + total * 1000, total });
}
function localGemFinish(c, id) {
  c.layout.tasks = c.layout.tasks.filter(t => t.id !== id);
  find(c, id).l += 1;
}
const localCollect = (c, id) => { find(c, id).st = 0; };
function localStow(c, id) {
  const i = c.layout.buildings.findIndex(b => b.id === id);
  const b = c.layout.buildings[i];
  c.layout.buildings.splice(i, 1);
  c.layout.tasks = c.layout.tasks.filter(t => t.id !== id).map(t => ({ ...t, i: t.i > i ? t.i - 1 : t.i }));
  c.holdings.inventory[b.t] = (c.holdings.inventory[b.t] || 0) + 1;
  c.holdings.stowedCounts[b.t] = (c.holdings.stowedCounts[b.t] || 0) + 1;
  if (b.l > 1) (c.holdings.stowedLevels[b.t] = c.holdings.stowedLevels[b.t] || []).push(b.l);
}
function localDrawRoad(c, gx, gz) {
  if (c.layout.roads.includes(`${gx},${gz}`)) return false;   // the game skips a paved tile
  c.layout.roads.push(`${gx},${gz}`);
  c.holdings.inventory.road -= 1;
  return true;
}
const localMove = (c, id, gx, gz) => { const b = find(c, id); b.gx = gx; b.gz = gz; };
function localPlaceFresh(c, t, gx, gz, id) {
  c.holdings.inventory[t] -= 1;
  c.layout.buildings.push({ id, t, gx, gz, l: 1, st: 0, rot: 0 });
}

/** Everything of type t the city owns: in the inventory plus placed (road: tiles). */
function owned(c, t) {
  const inv = (c.holdings.inventory || {})[t] || 0;
  if (t === 'road') return inv + c.layout.roads.length;
  return inv + c.layout.buildings.filter(b => b.t === t && !b.gate).length;
}
const TYPES = Object.keys(P.BUILDING_DEFS).filter(t => t !== 'main_gate');
/** No type is owned more after the merge than remote + what was bought here. */
function noMint(merged, remote, purchases) {
  const bad = [];
  for (const t of TYPES) {
    const want = owned(remote, t) + (purchases[t] || 0);
    if (owned(merged, t) !== want) bad.push({ t, merged: owned(merged, t), remote: owned(remote, t), bought: purchases[t] || 0 });
  }
  return bad;
}
/** The merged layout must be one the game restores exactly (every job on its building, level + 1). */
function jobsConsistent(layout) {
  return layout.tasks.every(t => {
    const b = layout.buildings[t.i];
    return b && b.id === t.id && b.t === t.t && b.gx === t.gx && b.gz === t.gz && t.to === b.l + 1;
  });
}
const tree = (c, n = 0) => ofType(c, 'tree')[n];

const DEFAULT = baseOf(FIX('default-city.cloud.json'));
const TH5 = baseOf(FIX('th5-city.cloud.json'));

// =====================================================================================
begin('purchase + upgrade survive an AI edit');
{
  const base = DEFAULT;
  const local = localOf(base);
  const th = ofType(local, 'town_hall')[0];
  localBuy(local, 'roadblock');                 // SHOP: Roadblock, 200 ms before the AI write
  localUpgrade(local, th.id);                   // Town Hall upgrade started
  const remote = mcp(base, [{ op: 'remove_tree', id: tree(base).id }]);
  const { layout, holdings, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  check(!layout.buildings.some(b => b.id === tree(base).id), 'the AI edit (tree cleared) is in the result');
  check(holdings.inventory.roadblock === base.holdings.inventory.roadblock + 1, 'the Roadblock bought here is in the inventory',
    { base: base.holdings.inventory.roadblock, merged: holdings.inventory.roadblock });
  const job = layout.tasks.find(t => t.id === th.id);
  check(!!job && job.to === 2 && job.endsAt === local.layout.tasks[0].endsAt, 'the Town Hall job is still running (same deadline)', layout.tasks);
  check(jobsConsistent(layout), 'every job points at its building (index, id, tile, level + 1)', layout.tasks);
  check(report.purchases.roadblock === 1 && report.keptJobs === 1, 'report: 1 purchase, 1 kept job', report);
  check(rebaseKeptSomething(report), 'rebaseKeptSomething is true');
  check(layout.savedAt === NOW, 'the merged layout is stamped now');
  check(noMint({ layout, holdings }, remote, report.purchases).length === 0, 'nothing minted', noMint({ layout, holdings }, remote, report.purchases));
}

begin('gem finish + collect survive; the collect is not paid twice');
{
  const base = DEFAULT;
  const local = localOf(base);
  const th = ofType(local, 'town_hall')[0];
  const pump = ofType(local, 'petrol_pump')[0];
  // A job in base (pushed before), gem-finished here; the pump collected here.
  const base2 = clone(base);
  localUpgrade(base2, th.id);
  const local2 = localOf(base2);
  localGemFinish(local2, th.id);
  find(base2, pump.id).st = 900;
  find(local2, pump.id).st = 0;
  localCollect(local2, pump.id);
  const remote = mcp(base2, [{ op: 'remove_tree', id: tree(base2).id }]);
  const { layout } = rebaseCity({ base: base2, local: local2, remote, nowMs: NOW });
  const mth = find({ layout }, th.id);
  check(mth.l === 2 && !layout.tasks.some(t => t.id === th.id), 'Town Hall is level 2 with no job (gems spent here stand)', { l: mth.l, tasks: layout.tasks });
  check(find({ layout }, pump.id).st === 0, 'the collected pump stays empty (the remote copy said 900 + growth)', find({ layout }, pump.id).st);
}

begin('an AI move wins over a local move');
{
  const base = DEFAULT;
  const local = localOf(base);
  const ps = ofType(base, 'police_station')[0];
  find(local, ps.id).gx = ps.gx + 1;            // moved here (in the debounce window)
  const remote = mcp(base, [{ op: 'move', id: ps.id, gx: -6, gz: -8 }]);
  const { layout, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  const m = find({ layout }, ps.id);
  check(m.gx === -6 && m.gz === -8, 'the Police Station is where the AI put it', { gx: m.gx, gz: m.gz });
  check(!rebaseKeptSomething(report), 'a pure design edit here keeps nothing (remote design wins)', report);
}

begin('a local placement / stow goes back to the inventory; local roads are replayed (no loss, no mint)');
{
  const base = DEFAULT;
  const local = localOf(base);
  localPlaceFresh(local, 'lumber_mill', -9, 9, 'bLOCALMILL1');
  const free = [];
  for (let gx = 4; gx <= 9 && free.length < 2; gx++) for (let gz = 4; gz <= 8 && free.length < 2; gz++) if (!base.layout.roads.includes(`${gx},${gz}`)) free.push([gx, gz]);
  const drawn = free.filter(([gx, gz]) => localDrawRoad(local, gx, gz));
  const ps = ofType(local, 'petrol_pump')[1];
  localStow(local, ps.id);
  const remote = mcp(base, [{ op: 'add_roads', tiles: [[-6, 6], [-6, 7], [-6, 8]] }]);
  const { layout, holdings, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  check(!layout.buildings.some(b => b.id === 'bLOCALMILL1'), 'the mill placed here is not on the map');
  check(holdings.inventory.lumber_mill === remote.holdings.inventory.lumber_mill, 'its unit is still in the inventory', holdings.inventory);
  check(drawn.length === 2 && drawn.every(([gx, gz]) => layout.roads.includes(`${gx},${gz}`)) && remote.layout.roads.every(r => layout.roads.includes(r)),
    'roads = the remote roads + the 2 drawn here (replayed)', { roads: layout.roads.length, remote: remote.layout.roads.length });
  check(holdings.inventory.road === remote.holdings.inventory.road - 2 && report.replayedRoads === 2, 'the 2 replayed tiles came out of the road inventory',
    { inv: holdings.inventory.road, remote: remote.holdings.inventory.road, report: report.replayedRoads });
  check(!!find({ layout }, ps.id) && find({ layout }, ps.id).st === 0, 'the pump stowed here stands again, empty (its output was banked by the stow)');
  check((holdings.inventory.petrol_pump || 0) === (remote.holdings.inventory.petrol_pump || 0), 'and is not also in the inventory');
  check(Object.keys(report.purchases).length === 0, 'no purchases detected', report.purchases);
  check(noMint({ layout, holdings }, remote, {}).length === 0, 'nothing minted', noMint({ layout, holdings }, remote, {}));
}

begin('road packs bought + drawn here: the tiles return as inventory, the purchase stays');
{
  const base = DEFAULT;
  const local = localOf(base);
  localBuy(local, 'road', 10);
  let drew = 0;
  for (let i = 0; i < 6; i++) if (localDrawRoad(local, 7, i - 3)) drew++;
  const remote = mcp(base, [{ op: 'remove_tree', id: tree(base).id }]);
  const { layout, holdings, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  check(report.purchases.road === 10, 'purchase delta is 10 road tiles', report.purchases);
  check(drew > 0 && holdings.inventory.road === base.holdings.inventory.road + 10 - drew && layout.roads.length === base.layout.roads.length + drew,
    `25 + 10 - ${drew} in the inventory, 105 + ${drew} tiles on the map`, { inv: holdings.inventory.road, tiles: layout.roads.length });
}

begin('local moves the AI left alone are replayed; one onto a tile the AI filled is dropped');
{
  const base = DEFAULT;
  const local = localOf(base);
  const [f1, f2] = ofType(base, 'iron_foundry');
  // Tiles a foundry can move to in the base city (probed with the rules themselves).
  const canMove = (city, id, gx, gz) => R.applyOp(R.createModel(city.layout, city.holdings), { op: 'move', id, gx, gz }, { nowMs: NOW }).ok;
  const spots = [];
  for (let gx = -9; gx <= 9 && spots.length < 2; gx += 3) for (let gz = -9; gz <= 9 && spots.length < 2; gz += 3) {
    if (spots.some(([x, z]) => Math.abs(x - gx) < 3 && Math.abs(z - gz) < 3)) continue;
    if (canMove(base, f1.id, gx, gz) && canMove(base, f2.id, gx, gz) && R.checkPlace(R.createModel(base.layout, base.holdings), 'roadblock', gx, gz).ok) spots.push([gx, gz]);
  }
  const [s1, s2] = spots;
  localMove(local, f1.id, ...s1);          // free before and after
  localMove(local, f2.id, ...s2);          // the AI puts a Roadblock there first
  const remote = mcp(base, [{ op: 'place', type: 'roadblock', gx: s2[0], gz: s2[1] }]);
  const { layout, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  const a = find({ layout }, f1.id);
  const b = find({ layout }, f2.id);
  check(a.gx === s1[0] && a.gz === s1[1], 'the move to a free tile stands', [a.gx, a.gz]);
  check(b.gx === f2.gx && b.gz === f2.gz, 'the move onto the AI\'s new roadblock is dropped (stays where it was)', [b.gx, b.gz]);
  check(report.replayedMoves === 1 && report.droppedDesign === 1, 'report: 1 replayed, 1 dropped', report);
  check(jobsConsistent(layout), 'jobs consistent');
}

begin('a job started here on a building the AI stowed is refunded');
{
  // TH5 has depots (stow needs storage). The AI stows a Sniper Tower the game started upgrading.
  const base = TH5;
  const local = localOf(base);
  const busy = new Set(base.layout.tasks.map(t => t.id));
  const tower = base.layout.buildings.find(b => P.BUILDING_DEFS[b.t] && P.BUILDING_DEFS[b.t].role === 'turret' && !busy.has(b.id) && b.l < 5);
  localUpgrade(local, tower.id);
  const remote = mcp(base, [{ op: 'stow', id: tower.id }]);
  const { layout, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  const cost = P.costForLevel(tower.t, tower.l + 1);
  check(!layout.buildings.some(b => b.id === tower.id), 'the stowed tower is not on the map');
  check(report.droppedJobs.length === 1 && report.refund.cash === cost.cash && report.refund.iron === cost.iron && report.refund.wood === cost.wood,
    'the job is dropped and its cost refunded', { report, cost });
  check(jobsConsistent(layout), 'the remaining jobs are consistent', layout.tasks);
  const kept = base.layout.tasks[0];
  check(layout.tasks.some(t => t.id === kept.id && t.endsAt === kept.endsAt), 'the job that was already in the cloud keeps running');
}

begin('a building the AI stowed keeps the level it reached here');
{
  const base = TH5;
  const busy = new Set(base.layout.tasks.map(t => t.id));
  const tower = base.layout.buildings.find(b => P.BUILDING_DEFS[b.t] && P.BUILDING_DEFS[b.t].role === 'turret' && !busy.has(b.id) && b.l < 5);
  const base2 = clone(base);
  localUpgrade(base2, tower.id);            // the job was in the cloud...
  const local = localOf(base2);
  localGemFinish(local, tower.id);          // ...and gem-finished here
  const remote = mcp(base, [{ op: 'stow', id: tower.id }]);   // the AI read the city before that job (it may not stow a busy one)
  remote.layout.tasks = remote.layout.tasks.filter(t => t.id !== tower.id);
  const { holdings, report } = rebaseCity({ base: base2, local, remote, nowMs: NOW });
  check((holdings.stowedLevels[tower.t] || []).includes(tower.l + 1), 'storage has it at level ' + (tower.l + 1), holdings.stowedLevels[tower.t]);
  check(report.stowedLevels === 1, 'report.stowedLevels', report);
}

begin('a stow credit for output already collected here is reported as surplus');
{
  const base = TH5;
  const busy = new Set(base.layout.tasks.map(t => t.id));
  const prod = base.layout.buildings.find(b => P.BUILDING_DEFS[b.t].produce && !P.BUILDING_DEFS[b.t].produce.raidOnly && !busy.has(b.id));
  const base2 = clone(base);
  find(base2, prod.id).st = 400;
  const local = localOf(base2);
  localCollect(local, prod.id);             // collected here: bank + 400 (+ growth)
  for (const frozen of [false, true]) {
    const remote = mcp(base2, [{ op: 'stow', id: prod.id }], 7, { frozen });  // credit = payout(400 + growth to the stow)
    const credit = Object.values(remote.holdings.bankCredits)[0];
    const { report } = rebaseCity({ base: base2, local, remote, nowMs: NOW });
    check(!!credit && report.surplusCredit.cash === credit.cash && report.surplusCredit.iron === credit.iron && report.surplusCredit.wood === credit.wood,
      `surplus = the whole credit (all of it was collected here)${frozen ? ' - frozen-savedAt server' : ''}`, { credit, surplus: report.surplusCredit });
  }
  // Collected here, but the remote stow came from ANOTHER DEVICE (it banked the output itself: no credit).
  const other = clone(base2);
  other.rev = base2.rev + 1;
  const k = other.layout.buildings.findIndex(b => b.id === prod.id);
  other.layout.buildings.splice(k, 1);
  other.layout.tasks = other.layout.tasks.map(t => ({ ...t, i: t.i > k ? t.i - 1 : t.i }));
  other.holdings.inventory[prod.t] = (other.holdings.inventory[prod.t] || 0) + 1;
  other.holdings.stowedCounts[prod.t] = (other.holdings.stowedCounts[prod.t] || 0) + 1;
  const r2 = rebaseCity({ base: base2, local, remote: other, nowMs: NOW }).report;
  check(r2.surplusCredit.cash + r2.surplusCredit.iron + r2.surplusCredit.wood === 0, 'no surplus without a stow credit (a device stow)', r2.surplusCredit);
}

begin('another device changed game state: its changes stand where this one did nothing');
{
  const base = TH5;
  const busy = new Set(base.layout.tasks.map(t => t.id));
  const free = base.layout.buildings.filter(b => !b.gate && b.t !== 'tree' && b.t !== 'town_hall' && !busy.has(b.id) && P.BUILDING_DEFS[b.t].upgradeable !== false && b.l < 5);
  const [a, b] = free;
  const remote = clone(base);
  remote.rev = base.rev + 1;
  remote.updatedBy = 'game';
  find(remote, a.id).l += 1;                 // the other device gem-finished `a`
  const local = localOf(base);
  localUpgrade(local, b.id);                 // this one started `b`
  const { layout } = rebaseCity({ base, local, remote, nowMs: NOW });
  check(find({ layout }, a.id).l === a.l + 1, "the other device's level-up stands");
  check(layout.tasks.some(t => t.id === b.id), "this device's job stands");
  check(jobsConsistent(layout), 'jobs consistent');
}

begin('randomised: never mints, jobs always consistent');
{
  const rand = mulberry(42);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  let cases = 0;
  const bad = [];
  for (let n = 0; n < 300; n++) {
    const base = n % 2 ? TH5 : DEFAULT;
    const local = localOf(base);
    const busy = new Set(local.layout.tasks.map(t => t.id));
    const bought = {};
    // A few game actions here.
    for (let k = 0; k < 4; k++) {
      const r = rand();
      const cands = local.layout.buildings.filter(b => !b.gate && b.t !== 'tree');
      if (r < 0.25) { const t = pick(['roadblock', 'spike_trap', 'tree', 'road']); localBuy(local, t, t === 'road' ? 5 : 1); bought[t] = (bought[t] || 0) + (t === 'road' ? 5 : 1); }
      else if (r < 0.45) { const b = pick(cands.filter(x => !busy.has(x.id) && P.BUILDING_DEFS[x.t].upgradeable !== false && x.l < 5)); if (b) { localUpgrade(local, b.id); busy.add(b.id); } }
      else if (r < 0.6) { const b = pick(cands.filter(x => P.BUILDING_DEFS[x.t].produce)); if (b) localCollect(local, b.id); }
      else if (r < 0.7) { const b = pick(cands.filter(x => !busy.has(x.id) && x.t !== 'town_hall')); if (b) localStow(local, b.id); }
      else if (r < 0.85 && (local.holdings.inventory.road || 0) > 0) { const gx = Math.floor(rand() * 10) - 5; const gz = Math.floor(rand() * 10) - 5; if (!local.layout.roads.includes(`${gx},${gz}`)) localDrawRoad(local, gx, gz); }
      else { const b = pick(cands.filter(x => !busy.has(x.id))); if (b) { b.gx += 1; } }
    }
    // An AI edit on the base.
    const trees = ofType(base, 'tree');
    let remote;
    try {
      remote = mcp(base, rand() < 0.5 ? [{ op: 'remove_tree', id: pick(trees).id }] : [{ op: 'add_roads', tiles: [[Math.floor(rand() * 6) - 8, 9]] }], n);
    } catch (e) { continue; }
    const { layout, holdings, report } = rebaseCity({ base, local, remote, nowMs: NOW });
    cases++;
    const mint = noMint({ layout, holdings }, remote, report.purchases);
    if (mint.length) bad.push({ n, mint });
    if (!jobsConsistent(layout)) bad.push({ n, jobs: layout.tasks });
    for (const [t, q] of Object.entries(bought)) if ((report.purchases[t] || 0) < q) bad.push({ n, lostPurchase: t, bought: q, kept: report.purchases[t] || 0 });
  }
  check(cases >= 250 && bad.length === 0, `${cases} random cases: no minting, no lost purchase, consistent jobs`, bad.slice(0, 3));
}

// =====================================================================================
// Round 2 review: stows / placements / credits made on both sides, levels paid here, the ledger.

/** Place `type` here the way the game does (a unit out of the inventory, stowed ones first). */
function localPlace(c, type, gx, gz) {
  const r = R.applyOp({ layout: c.layout, holdings: c.holdings }, { op: 'place', type, gx, gz }, { nowMs: NOW, rand: mulberry(3) });
  return r.ok ? find(c, r.id) : null;
}
/** A free tile for `type` in city `c` (probed with the rules themselves), or null. */
function freeTile(c, type, not = []) {
  for (let gx = -9; gx <= 9; gx++) for (let gz = -9; gz <= 9; gz++) {
    if (not.some(([x, z]) => Math.abs(x - gx) < 2 && Math.abs(z - gz) < 2)) continue;
    if (R.checkPlace(R.createModel(c.layout, c.holdings), type, gx, gz).ok) return [gx, gz];
  }
  return null;
}
/** The AI designer's edit written at `atMs` (its own clock), like mcp() but at any time. */
function mcpAt(base, ops, atMs, seed = 9) {
  const m = R.createModel(base.layout, base.holdings);
  R.advanceProduction(m, atMs);
  const res = R.applyOps(m, ops, { nowMs: atMs, rand: mulberry(seed) });
  if (!res.ok) throw new Error('mcp ops failed: ' + JSON.stringify(res.results[res.failedAt]));
  return { ...R.modelToCloud(m), rev: base.rev + 1, updatedBy: 'mcp' };
}
/** Upgrade levels of `type` the city owns: (level - 1) on the map and in storage, plus running jobs. */
function levelsOf(c, type) {
  let n = 0;
  for (const b of c.layout.buildings) if (b.t === type && !b.gate) n += (b.l || 1) - 1;
  n += c.layout.tasks.filter(t => (find(c, t.id) || {}).t === type).length;
  for (const v of (c.holdings.stowedLevels || {})[type] || []) n += v - 1;
  return n;
}

begin('the same producer stowed here and by the AI: its credit is held back entirely (paid once)');
{
  const base = clone(TH5);
  const busy = new Set(base.layout.tasks.map(t => t.id));
  const mill = base.layout.buildings.find(b => b.t === 'lumber_mill' && !busy.has(b.id));
  find(base, mill.id).st = 20000;
  const local = localOf(base);
  const banked = find(local, mill.id).st;            // the stow here banks what the mill holds
  localStow(local, mill.id);
  const remote = mcp(base, [{ op: 'stow', id: mill.id }]);
  const [cid, credit] = Object.entries(remote.holdings.bankCredits)[0];
  const { layout, holdings, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  check(!!report.creditHoldback[cid] && report.creditHoldback[cid].wood === credit.wood,
    'the AI credit is held back in full', { credit, hold: report.creditHoldback, banked });
  check(!find({ layout }, mill.id) && owned({ layout, holdings }, 'lumber_mill') === owned(remote, 'lumber_mill'), 'one mill, in storage');
  // A mill the AI stowed but this device only looked at: its credit is paid in full.
  const other = base.layout.buildings.find(b => b.t === 'lumber_mill' && b.id !== mill.id);
  const r2 = mcp(base, [{ op: 'stow', id: other.id }]);
  const l2 = localOf(base);
  localStow(l2, mill.id);
  const rep2 = rebaseCity({ base, local: l2, remote: r2, nowMs: NOW }).report;
  check(Object.keys(rep2.creditHoldback).length === 0, 'a credit for a different mill is not touched', rep2.creditHoldback);
}

begin('collected here, stowed by the AI later: only what was collected is held back');
{
  const base = clone(TH5);
  const busy = new Set(base.layout.tasks.map(t => t.id));
  const mill = base.layout.buildings.find(b => b.t === 'lumber_mill' && !busy.has(b.id));
  const rate = P.produceRateFor('lumber_mill', mill.l);
  find(base, mill.id).st = 400;                      // base saved at NOW - 10 s
  // Collected here at NOW - 8 s (400 + 2 s of output); 8 s of output since.
  const local = localOf(base);
  const collected = Math.floor(400 + 2 * rate);
  find(local, mill.id).st = Math.floor(8 * rate);
  // The AI stowed it at NOW - 5 s: its credit priced 400 + 5 s of output.
  const remote = mcpAt(base, [{ op: 'stow', id: mill.id }], NOW - 5000);
  const [cid, credit] = Object.entries(remote.holdings.bankCredits)[0];
  const { report } = rebaseCity({ base, local, remote, nowMs: NOW });
  const hold = (report.creditHoldback[cid] || {}).wood || 0;
  check(Math.abs(hold - collected) <= 2, `held back = what was collected here (${collected}); the 3 s made after the collect are still paid`,
    { credit: credit.wood, hold, collected });
  // Not collected here (the mill is full on both sides): nothing is held back.
  const full = clone(base);
  find(full, mill.id).st = P.produceCapacityFor('lumber_mill', mill.l);
  const lf = localOf(full);
  const rf = mcpAt(full, [{ op: 'stow', id: mill.id }], NOW - 5000);
  const rep = rebaseCity({ base: full, local: lf, remote: rf, nowMs: NOW }).report;
  check(Object.keys(rep.creditHoldback).length === 0, 'a full mill nobody collected: nothing held back', rep.creditHoldback);
}

begin('gem-finished + stowed here while the AI edited: the stow stands, storage keeps the level');
{
  const base = TH5;
  const job = base.layout.tasks[0];                  // Tesla Coil 3 -> 4, in the cloud already
  const local = localOf(base);
  localGemFinish(local, job.id);
  localStow(local, job.id);
  const remote = mcp(base, [{ op: 'remove_tree', id: tree(base).id }]);
  const { layout, holdings, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  check(!find({ layout }, job.id), 'the coil is not back on the map (the stow here is replayed)');
  check((holdings.stowedLevels[job.t] || []).includes(job.to), `storage holds it at level ${job.to}`, holdings.stowedLevels[job.t]);
  check(!layout.tasks.some(t => t.id === job.id) && report.droppedJobs.length === 0, 'no job, nothing refunded (the gems finished it)');
  check(report.replayedStows === 1 && rebaseKeptSomething(report), 'report: 1 stow replayed, something kept', report);
  check(levelsOf({ layout, holdings }, job.t) === levelsOf(remote, job.t) + (levelsOf(local, job.t) - levelsOf(base, job.t)), 'no level lost or minted');
}

begin('placed + upgraded here while the AI edited: it stands again with its id, level and job');
{
  const base = TH5;
  const local = localOf(base);
  const [gx, gz] = freeTile(base, 'landmine');
  const mine = localPlace(local, 'landmine', gx, gz);
  mine.l = 2;                                        // upgraded here (paid), finished
  localUpgrade(local, mine.id);                      // and the next upgrade running
  const remote = mcp(base, [{ op: 'remove_tree', id: tree(base).id }]);
  const { layout, holdings, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  const m = find({ layout }, mine.id);
  check(!!m && m.gx === gx && m.gz === gz && m.l === 2, 'the landmine stands where it was placed, level 2, same id', m);
  const job = layout.tasks.find(t => t.id === mine.id);
  check(!!job && job.to === 3 && jobsConsistent(layout), 'its upgrade to 3 keeps running', layout.tasks);
  check(holdings.inventory.landmine === remote.holdings.inventory.landmine - 1, 'its unit came out of the inventory once');
  check(report.replayedPlacements === 1 && report.returnedToInventory === 0 && report.droppedJobs.length === 0, 'report', report);
}

begin('placed here on the tile the AI filled: back in the inventory with its levels, and reported');
{
  const base = DEFAULT;
  const local = localOf(base);
  const tile = freeTile(base, 'roadblock');
  const rb = localPlace(local, 'roadblock', ...tile);
  rb.l = 2;                                          // upgraded here
  const remote = mcp(base, [{ op: 'place', type: 'spike_trap', gx: tile[0], gz: tile[1] }]);   // trees never block
  const { layout, holdings, report } = rebaseCity({ base, local, remote, nowMs: NOW });
  check(!find({ layout }, rb.id), 'the roadblock is not on the map (its tile is taken)');
  check(owned({ layout, holdings }, 'roadblock') === owned(remote, 'roadblock'), 'its unit is in the inventory', holdings.inventory);
  check((holdings.stowedLevels.roadblock || []).includes(2), 'with the level paid here (in storage)', holdings);
  check(report.returnedToInventory === 1 && !rebaseKeptSomething(report), 'reported on its own (the toast says: back in your inventory, place it again)', report);
  const nh = R.normalizeHoldings(holdings);
  check(JSON.stringify(nh.stowedLevels) === JSON.stringify(holdings.stowedLevels) && nh.stowedCounts.roadblock === holdings.stowedCounts.roadblock,
    'holdings are valid as the game loads them', { nh: nh.stowedCounts, h: holdings.stowedCounts });
}

begin('stow credits ledger (planCredits): each credit paid once, more than 100 in the city');
{
  const CAP = 100;
  let city = new Map();                              // the cloud city's bankCredits
  let credited = [];                                 // saves.credited
  const pending = new Map();                         // this device
  const timesPaid = new Map();
  let seq = 0;
  let pushes = 0;
  let blockedPushes = 0;
  const newId = () => 'c' + (1790000000000 + (seq++) * 1000).toString(36) + 'aaaaaaaa';
  const aiRound = (n) => { for (let k = 0; k < n; k++) city.set(newId(), { cash: 10, iron: 0, wood: 0 }); };
  // The game applies the city: every credit not known as paid is queued (as _queueCredits does).
  const apply = () => { for (const [id, c] of city) if (!credited.includes(id) && !pending.has(id)) pending.set(id, c); };
  const bankPush = () => {
    const plan = planCredits({ pending: [...pending], paid: credited, inCity: [...city.keys()], cap: CAP });
    for (const [id] of plan.pay) timesPaid.set(id, (timesPaid.get(id) || 0) + 1);
    credited = plan.credited;
    for (const id of [...plan.pay.map(([id]) => id), ...plan.drop]) pending.delete(id);
    if (credited.length > CAP) throw new Error('credited over the cap');
    pushes++;
    if (plan.blocked) {                              // CloudSync pushes the city: only unpaid credits stay
      blockedPushes++;
      city = new Map([...pending].filter(([id]) => city.has(id)));
    }
    return plan;
  };
  // Open game: 20 AI rounds of 8 stows; the game applies each and its bank push runs.
  for (let r = 0; r < 20; r++) { aiRound(8); apply(); bankPush(); }
  // Closed game: 16 rounds with nobody applying, then one reopen.
  for (let r = 0; r < 16; r++) aiRound(8);
  apply();
  for (let k = 0; k < 4 && pending.size; k++) bankPush();
  const all = seq;
  const twice = [...timesPaid.values()].filter(n => n > 1).length;
  check(timesPaid.size === all && twice === 0, `all ${all} credits paid exactly once`, { paid: timesPaid.size, twice, pending: pending.size });
  check(blockedPushes > 0, 'the cap was reached and the city push cleared it', { blockedPushes, pushes });
  // Paid ids leave the city only through that push; re-applying the city never re-queues them.
  apply();
  const again = planCredits({ pending: [...pending], paid: credited, inCity: [...city.keys()], cap: CAP });
  check(again.pay.length === 0, 'a later apply + push pays nothing again', again.pay.length);
  // A credit the city no longer carries is dropped, never paid.
  const p2 = planCredits({ pending: [['cgone', { cash: 5 }]], paid: [], inCity: [], cap: CAP });
  check(p2.pay.length === 0 && p2.drop.includes('cgone'), 'a credit gone from the city is dropped unpaid');
}

begin('randomised with full accounting: units, paid levels and producer output never minted or lost');
{
  // The reviewer's property test (round 2), zero elapsed time so production cannot hide anything.
  // Local ops are the GAME's (stow banks output and files levels, placement takes stowed units
  // first), remote ops the real MCP path (advanceProduction + applyOps on the base).
  const isGateB = (b) => !!(b.gate || b.t === 'main_gate');
  const prodOf = (t) => (P.BUILDING_DEFS[t] && P.BUILDING_DEFS[t].produce) || null;
  const Z = () => ({ cash: 0, iron: 0, wood: 0 });
  const vadd = (a, b, k = 1) => ({ cash: a.cash + k * b.cash, iron: a.iron + k * b.iron, wood: a.wood + k * b.wood });
  const tot = (v) => v.cash + v.iron + v.wood;
  const mapValue = (layout) => layout.buildings.reduce((v, b) => {
    const p = prodOf(b.t);
    return p && !p.raidOnly && !isGateB(b) ? vadd(v, P.producePayout(p.type, Math.floor(b.st || 0))) : v;
  }, Z());
  const LU = (c) => {
    let n = c.layout.tasks.length;
    for (const b of c.layout.buildings) if (!isGateB(b)) n += Math.max(1, b.l || 1) - 1;
    for (const list of Object.values(c.holdings.stowedLevels || {})) for (const l of list) n += l - 1;
    return n;
  };
  const slots = (c) => c.layout.buildings.reduce((s, b) => s + P.storageSlotsFor(b.t, b.l || 1), 0);
  const used = (c) => Object.values(c.holdings.stowedCounts || {}).reduce((s, n) => s + n, 0);
  const at0 = (fx) => { const b = baseOf(fx); b.layout.savedAt = NOW; for (const x of b.layout.buildings) if (prodOf(x.t)) x.st = Math.floor(P.produceCapacityFor(x.t, x.l) / 3); return b; };
  const FIXES = [at0(FIX('default-city.cloud.json')), at0(FIX('th5-city.cloud.json'))];
  const rand = mulberry(20260930);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const ctx = { nowMs: NOW, rand };
  const bad = { U: [], L: [], V: [], J: [], crash: [] };
  let cases = 0;
  for (let n = 0; n < 3000; n++) {
    const base = FIXES[n % 2];
    const c = clone({ layout: base.layout, holdings: base.holdings });
    const led = { bought: {}, out: Z(), seed: Z(), log: [] };
    const bs = () => c.layout.buildings.filter(b => !isGateB(b));
    const tIdx = (id) => c.layout.tasks.findIndex(t => t.id === id);
    const acts = [
      () => { const t = pick(['roadblock', 'spike_trap', 'road', 'lumber_mill', 'petrol_pump', 'landmine']); const k = t === 'road' ? 5 : 1; c.holdings.inventory[t] = (c.holdings.inventory[t] || 0) + k; led.bought[t] = (led.bought[t] || 0) + k; return 'buy ' + t; },
      () => { const ts = Object.keys(c.holdings.inventory).filter(t => c.holdings.inventory[t] > 0 && t !== 'road'); if (!ts.length) return null; const t = pick(ts);
        for (let k = 0; k < 40; k++) { const r = R.applyOp(c, { op: 'place', type: t, gx: Math.floor(rand() * 21) - 10, gz: Math.floor(rand() * 21) - 10 }, ctx); if (r.ok) { if (prodOf(t) && !prodOf(t).raidOnly) led.seed = vadd(led.seed, P.producePayout(prodOf(t).type, r.st)); return 'place ' + t; } } return null; },
      () => { if (used(c) >= slots(c)) return null; const cs = bs().filter(b => b.t !== 'town_hall' && !P.storageSlotsFor(b.t, b.l || 1)); if (!cs.length) return null; const b = pick(cs);
        const i = c.layout.buildings.indexOf(b); if (tIdx(b.id) >= 0) { c.layout.tasks.splice(tIdx(b.id), 1); led.refund = (led.refund || 0) + 1; }
        const p = prodOf(b.t); const held = Math.floor(b.st || 0);
        if (p && !p.raidOnly && held > 0) led.out = vadd(led.out, P.producePayout(p.type, held));
        const h = c.holdings; h.stowedCounts[b.t] = (h.stowedCounts[b.t] || 0) + 1;
        if ((b.l || 1) > 1) { (h.stowedLevels[b.t] = h.stowedLevels[b.t] || []).push(b.l); h.stowedLevels[b.t].sort((x, y) => y - x); }
        if (p && p.raidOnly && held > 0) { (h.stowedSealed[b.t] = h.stowedSealed[b.t] || []).push(held); h.stowedSealed[b.t].sort((x, y) => y - x); }
        h.inventory[b.t] = (h.inventory[b.t] || 0) + 1; c.layout.buildings.splice(i, 1);
        c.layout.tasks = c.layout.tasks.map(t => ({ ...t, i: t.i > i ? t.i - 1 : t.i })); return 'stow ' + b.t + ' ' + b.id; },
      () => { const cs = bs().filter(b => P.BUILDING_DEFS[b.t].upgradeable !== false && b.t !== 'tree' && tIdx(b.id) < 0 && (b.l || 1) < 12); if (!cs.length) return null; const b = pick(cs); localUpgrade(c, b.id); return 'upgrade ' + b.id; },
      () => { if (!c.layout.tasks.length) return null; const t = pick(c.layout.tasks); const b = find(c, t.id); c.layout.tasks = c.layout.tasks.filter(x => x !== t); b.l = t.to; if (prodOf(b.t)) b.st = Math.min(b.st || 0, P.produceCapacityFor(b.t, b.l)); return 'gem ' + b.id; },
      () => { const cs = bs().filter(b => prodOf(b.t) && !prodOf(b.t).raidOnly && (b.st || 0) > 0); if (!cs.length) return null; const b = pick(cs); led.out = vadd(led.out, P.producePayout(prodOf(b.t).type, Math.floor(b.st))); b.st = 0; return 'collect ' + b.id; },
      () => { for (let k = 0; k < 20; k++) { const r = R.applyOp(c, { op: 'add_roads', tiles: [[Math.floor(rand() * 21) - 10, Math.floor(rand() * 21) - 10]] }, ctx); if (r.ok && r.added) return 'draw'; } return null; },
      () => { const cs = bs().filter(b => tIdx(b.id) < 0); if (!cs.length) return null; const b = pick(cs); for (let k = 0; k < 30; k++) { const r = R.applyOp(c, { op: 'move', id: b.id, gx: Math.floor(rand() * 21) - 10, gz: Math.floor(rand() * 21) - 10 }, ctx); if (r.ok) return 'move ' + b.id; } return null; }
    ];
    const nl = 1 + Math.floor(rand() * 6);
    for (let k = 0; k < nl; k++) for (let t = 0; t < 5; t++) { const r = pick(acts)(); if (r) { led.log.push(r); break; } }
    // The AI edit: 1-3 random ops on the base.
    const m = R.createModel(base.layout, base.holdings);
    R.advanceProduction(m, NOW);
    for (let k = 0, nr = 1 + Math.floor(rand() * 3); k < nr; k++) {
      for (let t = 0; t < 30; t++) {
        const kind = pick(['remove_tree', 'stow', 'stow', 'place', 'move', 'add_roads', 'remove_roads']);
        const mb = m.layout.buildings.filter(b => !isGateB(b));
        let op = null;
        if (kind === 'remove_tree') { const x = mb.filter(b => b.t === 'tree'); if (x.length) op = { op: kind, id: pick(x).id }; }
        else if (kind === 'stow') { const x = mb.filter(b => b.t !== 'tree' && b.t !== 'town_hall'); if (x.length) op = { op: kind, id: pick(x).id }; }
        else if (kind === 'place') { const x = Object.keys(m.holdings.inventory).filter(q => m.holdings.inventory[q] > 0 && q !== 'road'); if (x.length) op = { op: kind, type: pick(x), gx: Math.floor(rand() * 21) - 10, gz: Math.floor(rand() * 21) - 10 }; }
        else if (kind === 'move') op = { op: kind, id: pick(mb).id, gx: Math.floor(rand() * 21) - 10, gz: Math.floor(rand() * 21) - 10 };
        else if (kind === 'add_roads') op = { op: kind, tiles: [[Math.floor(rand() * 21) - 10, Math.floor(rand() * 21) - 10]] };
        else if (m.layout.roads.length) op = { op: kind, tiles: [pick(m.layout.roads).split(',').map(Number)] };
        if (op && R.applyOp(m, op, ctx).ok) break;
      }
    }
    const remote = { ...R.modelToCloud(m), rev: base.rev + 1 };
    let res;
    try { res = rebaseCity({ base, local: c, remote, nowMs: NOW }); } catch (e) { bad.crash.push({ n, e: String(e.stack || e).slice(0, 200) }); continue; }
    cases++;
    const merged = { layout: res.layout, holdings: R.normalizeHoldings(res.holdings) };
    const rep = res.report;
    for (const t of TYPES) {
      const want = owned(remote, t) + (led.bought[t] || 0);
      if (owned(merged, t) !== want) bad.U.push({ n, t, got: owned(merged, t), want, log: led.log });
    }
    const wantL = LU(remote) + (LU(c) - LU(base)) - rep.droppedJobs.length;
    if (LU(merged) !== wantL) bad.L.push({ n, got: LU(merged), want: wantL, log: led.log });
    let credits = Z();
    for (const [id, cr] of Object.entries(R.normalizeHoldings(remote.holdings).bankCredits)) if (!(id in (base.holdings.bankCredits || {}))) credits = vadd(credits, cr);
    let rseed = Z();
    const baseIds = new Set(base.layout.buildings.map(b => b.id));
    for (const b of remote.layout.buildings) { const p = prodOf(b.t); if (p && !p.raidOnly && !baseIds.has(b.id)) rseed = vadd(rseed, P.producePayout(p.type, b.st || 0)); }
    // Output: on the merged map + banked here + credits paid (less what is held back) + output
    // banked for placements that went back == the base map + seeds of new buildings.
    const got = vadd(vadd(vadd(mapValue(merged.layout), led.out), vadd(credits, rep.surplusCredit, -1)), rep.bankedOutput);
    const want = vadd(vadd(mapValue(base.layout), led.seed), rseed);
    if (Math.abs(tot(got) - tot(want)) > 3) bad.V.push({ n, got, want, log: led.log });
    if (!jobsConsistent(merged.layout)) bad.J.push({ n, tasks: merged.layout.tasks });
  }
  check(cases >= 2900, `${cases} cases ran without a crash`, bad.crash.slice(0, 2));
  check(bad.U.length === 0, 'units: owned = remote + bought here', bad.U.slice(0, 2));
  check(bad.L.length === 0, 'paid levels: remote + paid here - refunded jobs', bad.L.slice(0, 2));
  check(bad.V.length === 0, 'producer output: nothing paid twice, nothing lost', bad.V.slice(0, 2));
  check(bad.J.length === 0, 'every job consistent', bad.J.slice(0, 2));
}

// =====================================================================================
begin('mergeBank: both devices\' changes survive');
{
  const g0 = { v: 2, tracks: { speed: 1, accel: 0 }, cards: { bomb: { unlocked: false, level: 0 } }, loadout: ['jump'] };
  const base = { bank: { cash: 1500, iron: 800, wood: 1000, gems: 15, vehicleLives: 0 }, garage: g0 };
  const local = { bank: { cash: 1588, iron: 800, wood: 1000, gems: 15, vehicleLives: 0 }, garage: g0 };            // collected 88
  const remote = { bank: { cash: 650, iron: 375, wood: 320, gems: 15, vehicleLives: 0 }, garage: g0 };            // paid 850/425/680
  const m = mergeBank(base, local, remote);
  check(m.bank.cash === 738 && m.bank.iron === 375 && m.bank.wood === 320, 'remote spend + local income', m.bank);
  const gl = { ...clone(g0), tracks: { speed: 2, accel: 0 } };
  const gr = { ...clone(g0), cards: { bomb: { unlocked: true, level: 1 } } };
  const mg = mergeBank({ ...base, garage: g0 }, { ...local, garage: gl }, { ...remote, garage: gr }).garage;
  check(mg.tracks.speed === 2 && mg.cards.bomb.unlocked === true && mg.cards.bomb.level === 1, 'garage: both purchases kept', mg);
  const same = mergeBank(base, { ...local, garage: g0 }, { ...remote, garage: gr }).garage;
  check(same.cards.bomb.unlocked === true, 'garage unchanged here: the remote one is taken');
  const neg = mergeBank(base, { ...local, bank: { ...local.bank, cash: 100 } }, { ...remote, bank: { ...remote.bank, cash: 100 } });
  check(neg.bank.cash === 0, 'never below zero', neg.bank);
}

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
