#!/usr/bin/env node
/**
 * Parity check: cityRules (the pure rules the MCP server edits cities with) against the REAL game.
 *
 * For thousands of random edits it asks cityRules for a verdict, then performs the same edit in
 * the running game the way a player does it in the Design screen - GridSystem.handleTileAction in
 * 'place_inventory' / 'relocate' / 'draw_road' / 'erase_road' mode, and the inspector's stow button
 * (canStow -> stowBuilding) - and compares: did it happen, and if not, the same refusal (the game's
 * alert text / crash sound / callbacks tell them apart). When both succeed the results are compared
 * too (level, stored output, facing, inventory, storage lists, bank). Every probe is undone and the
 * city is checked against its baseline before the next one.
 *
 * Cities: the starter city (Town Hall 1), the Town Hall 5 fixture, and that fixture at Town Hall 9
 * and 12 (bigger radius, the 3x3 Quantum Citadel unlocked), plus a road phase at each road limit.
 * Finally it proves building ids survive a save + page reload, and that cityRules.advanceProduction (what the MCP
 * server runs before every write) credits exactly what the game's restoreCity credits for the same time away.
 *
 *   PW_CORE=<playwright-core dir> GAME_URL=http://localhost:3106/ node tools/online/parity-check.mjs [shotsDir]
 *
 * Needs a Vite dev server in OFFLINE mode at GAME_URL. Exit 1 on any disagreement.
 */
import fs from 'node:fs';
import path from 'node:path';

const PW = process.env.PW_CORE;
if (!PW) { console.error('Set PW_CORE to a playwright-core directory.'); process.exit(2); }
const { chromium } = await import(path.join(PW, 'index.mjs'));
const GAME_URL = process.env.GAME_URL || 'http://localhost:3106/';
const SHOTS = process.argv[2] || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ROOT = new globalThis.URL('../../', import.meta.url).pathname;
const TH5 = JSON.parse(fs.readFileSync(ROOT + 'tools/online/fixtures/th5-city.cloud.json', 'utf8'));

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
const boot = async () => {
  await page.reload();
  await page.waitForFunction(() => window.citySiege && window.citySiege.buildingManager, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
};
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
await page.goto(GAME_URL);
await page.evaluate(() => localStorage.clear());
await boot();

/**
 * Runs in the page. Sets a city up (state), then runs the probes. Self-contained: Playwright
 * serialises this function's source.
 */
async function runState({ state, counts, seed, fixture }) {
  const R = await import('/src/shared/cityRules.js');
  const CP = await import('/src/builder/CityPersistence.js');
  const P = await import('/src/data/progression.js');
  const G = window.citySiege;
  const bm = G.buildingManager, eco = G.economyManager, grid = G.gridSystem, roads = bm.roadNetwork;

  // Freeze the world: no frame loop (jobs, production), no autosave timers writing mid-probe.
  G.animate = () => {};
  G.saveCityNow = () => {};
  G.queueCitySave = () => {};
  bm.onCityChanged = null;
  roads.onChange = null;

  // What the game says, captured without native dialogs.
  const signal = { alerts: [], crashes: 0, outside: 0, outOfRoads: 0, roadLimit: 0 };
  window.alert = (m) => { signal.alerts.push(String(m)); };
  const realCrash = grid.sound.playCrash.bind(grid.sound);
  grid.sound.playCrash = (...a) => { signal.crashes++; return realCrash(...a); };
  grid.onOutsideCity = () => { signal.outside++; };
  grid.onOutOfRoads = () => { signal.outOfRoads++; };
  grid.onRoadLimitReached = () => { signal.roadLimit++; };
  const resetSignal = () => { signal.alerts = []; signal.crashes = 0; signal.outside = 0; signal.outOfRoads = 0; signal.roadLimit = 0; };

  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ri = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = (list) => list[Math.floor(rand() * list.length)];

  // ---- set the city up
  const T0 = Date.now();
  if (fixture) {
    // The fixture's clock moved to now, so its upgrade is still running.
    const blob = R.fromCloudLayout(fixture.layout);
    const shift = T0 - blob.savedAt;
    blob.savedAt = T0;
    blob.tasks.forEach(t => { t.endsAt += shift; });
    if (state.th) blob.buildings.find(b => b.t === 'town_hall').l = state.th;
    CP.restoreCity(bm, blob, T0);
    R.applyHoldingsToEconomy(eco, fixture.holdings);
    eco.save();
  }
  bm.advanceProduction(T0);
  // serializeCity rounds `st`; keep the live output whole so a stow banks exactly what the layout says.
  bm.buildings.forEach(b => { if (b.produceType) b.stored = Math.round(b.stored); });
  eco.cash = 1e6; eco.iron = 1e6; eco.wood = 1e6;
  const th = bm.getTownHallLevel();

  const serial = () => CP.serializeCity(bm, T0);
  const modelNow = () => R.createModel(R.toCloudLayout(serial(), { nowMs: T0, rand: () => 0.5 }), R.holdingsFromEconomy(eco));
  const canonical = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v));
  const sig = () => {
    const s = serial();
    return canonical({
      b: s.buildings.map(b => [b.id, b.t, b.gx, b.gz, b.l, b.st]),
      r: s.roads.map(r => r.join(',')).sort(),
      t: s.tasks.map(t => [t.id, t.i, t.to]),
      h: R.holdingsFromEconomy(eco), bank: [eco.cash, eco.iron, eco.wood]
    });
  };
  const holdKeys = (h) => canonical({ inventory: h.inventory, stowedCounts: h.stowedCounts, stowedLevels: h.stowedLevels, stowedSealed: h.stowedSealed });
  let baseBlob = serial();
  let baseHold = eco.snapshotHoldings();
  let baseSig = sig();
  const restoreAll = () => {
    CP.restoreCity(bm, baseBlob, T0);
    bm.buildings.forEach(b => { if (b.produceType) b.stored = Math.round(b.stored); });
    eco.restoreHoldings(baseHold);
  };
  const rebase = () => { baseBlob = serial(); baseHold = eco.snapshotHoldings(); baseSig = sig(); };

  const stats = {};
  const bump = (kind, key) => { stats[kind] = stats[kind] || { probes: 0, verdictAgree: 0, reasonAgree: 0, effectsAgree: 0, effectsCompared: 0, documented: 0, undoFailures: 0, reasons: {} }; stats[kind][key]++; };
  const mismatches = [];
  const miss = (kind, detail) => { if (mismatches.length < 40) mismatches.push({ state: state.name, kind, ...detail }); };
  const finish = (kind) => {
    if (sig() !== baseSig) {
      bump(kind, 'undoFailures');
      miss(kind, { undo: true });
      restoreAll();
    }
  };

  const TYPES = P.BUILDING_TYPES.filter(t => t !== 'road' && t !== 'main_gate');
  const unlocked = TYPES.filter(t => P.isUnlockedAt(t, th));
  const radius = P.cityRadiusFor(th);
  const nearOrAnywhere = () => {
    if (rand() < 0.4 && bm.buildings.length) {
      const b = pick(bm.buildings);
      return [b.gx + ri(-3, 3), b.gz + ri(-3, 3)];
    }
    return [ri(-16, 16), ri(-16, 16)];
  };

  // ---------------------------------------------------------------- place
  for (let n = 0; n < counts.place; n++) {
    const r0 = rand();
    const type = r0 < 0.72 ? pick(unlocked) : r0 < 0.92 ? pick(TYPES) : r0 < 0.96 ? 'road' : 'main_gate';
    const [gx, gz] = nearOrAnywhere();
    // Holdings for this probe: usually some units (fresh and/or stowed at random levels), sometimes none.
    if (rand() < 0.86) {
      const inv = ri(1, 3);
      eco.inventory[type] = inv;
      const stowed = rand() < 0.4 ? ri(0, inv) : 0;
      if (stowed) {
        eco.stowedCounts[type] = stowed;
        const levels = Array.from({ length: ri(0, stowed) }, () => ri(2, 12)).sort((x, y) => y - x);
        if (levels.length) eco.stowedLevels[type] = levels; else delete eco.stowedLevels[type];
        const def = P.BUILDING_DEFS[type];
        if (def.produce && def.produce.raidOnly) {
          const sealed = Array.from({ length: ri(0, stowed) }, () => ri(1, 200000)).sort((x, y) => y - x);
          if (sealed.length) eco.stowedSealed[type] = sealed; else delete eco.stowedSealed[type];
        }
      } else {
        delete eco.stowedCounts[type]; delete eco.stowedLevels[type]; delete eco.stowedSealed[type];
      }
    } else {
      eco.inventory[type] = 0;
      delete eco.stowedCounts[type]; delete eco.stowedLevels[type]; delete eco.stowedSealed[type];
    }
    const m = modelNow();
    const rules = R.applyOp(m, { op: 'place', type, gx, gz }, { nowMs: T0, rand });
    resetSignal();
    const n0 = bm.buildings.length;
    grid.setMode('place_inventory', type);
    grid.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
    grid.setMode('design_select');
    const placed = bm.buildings.length === n0 + 1;
    const al = signal.alerts.join(' | ');
    const game = placed ? 'OK'
      : /no more of this item/.test(al) ? 'NOT_IN_INVENTORY'
      : /unlocks at Town Hall/.test(al) ? 'LOCKED'
      : /you already have/.test(al) ? 'AT_LIMIT'
      : al ? 'ALERT:' + al
      : signal.crashes ? 'BLOCKED'
      : 'OUTSIDE_RADIUS';
    const want = rules.ok ? 'OK' : rules.reason;
    bump('place', 'probes');
    stats.place.reasons[want] = (stats.place.reasons[want] || 0) + 1;
    const fpKey = R.footprintOf(type) + 'x' + R.footprintOf(type) + (placed ? ' placed' : ' refused');
    stats.place.footprints = stats.place.footprints || {};
    stats.place.footprints[fpKey] = (stats.place.footprints[fpKey] || 0) + 1;
    const verdictOk = rules.ok === placed;
    if (verdictOk) bump('place', 'verdictAgree');
    // NOT_PLACEABLE (road / main_gate) is refused by cityRules up front; the game refuses those
    // further down (no mesh / at the gate limit), so only the verdict is comparable there.
    const reasonOk = want === 'NOT_PLACEABLE' ? !placed : want === game;
    if (reasonOk) bump('place', 'reasonAgree');
    if (!verdictOk || !reasonOk) miss('place', { type, gx, gz, rules: want, game, msg: rules.message });
    if (placed && rules.ok) {
      bump('place', 'effectsCompared');
      const b = bm.buildings[bm.buildings.length - 1];
      const nb = m.layout.buildings[m.layout.buildings.length - 1];
      // A new building faces rot 0 in the layout; the game's mesh must too (barriers turn to their links).
      const faceOk = P.BUILDING_DEFS[type].barrier ? true : Math.abs((b.mesh ? b.mesh.rotation.y : 0) - nb.rot) < 1e-9;
      const same = b.level === nb.l && Math.round(b.stored || 0) === nb.st && faceOk && holdKeys(R.holdingsFromEconomy(eco)) === holdKeys(m.holdings);
      if (same) bump('place', 'effectsAgree');
      else miss('place', { effects: true, type, game: { l: b.level, st: b.stored, rot: b.mesh && b.mesh.rotation.y, h: R.holdingsFromEconomy(eco) }, rules: { l: nb.l, st: nb.st, rot: nb.rot, h: m.holdings } });
      bm.removeBuilding(b);
    }
    eco.restoreHoldings(baseHold);
    finish('place');
  }

  // ---------------------------------------------------------------- move
  for (let n = 0; n < counts.move; n++) {
    const b = rand() < 0.08 ? pick(bm.buildings.filter(x => x.isMainGate || x.isUnderConstruction)) || pick(bm.buildings) : pick(bm.buildings);
    const [gx, gz] = rand() < 0.5 ? [b.gx + ri(-3, 3), b.gz + ri(-3, 3)] : nearOrAnywhere();
    const m = modelNow();
    const rules = R.applyOp(m, { op: 'move', id: b.id, gx, gz }, { nowMs: T0, rand });
    const from = { gx: b.gx, gz: b.gz };
    resetSignal();
    let moved = false;
    const realMove = bm.moveBuilding.bind(bm);
    bm.moveBuilding = (x, tx, tz) => { const r = realMove(x, tx, tz); if (x === b && r.ok) moved = true; return r; };
    grid.setMode('relocate', b);
    grid.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
    const modeAfter = grid.mode;
    grid.setMode('design_select');
    bm.moveBuilding = realMove;
    const outside = Math.hypot(gx, gz) > radius;
    // The game checks the radius before anything else; cityRules names a gate / a running job first.
    const game = moved ? 'OK' : outside ? 'OUTSIDE_RADIUS' : signal.crashes && modeAfter === 'design_select' ? 'NOT_DRAGGABLE' : signal.crashes ? 'BLOCKED' : 'NOTHING';
    const want = rules.ok ? 'OK' : rules.reason;
    const expected = want === 'OK' ? 'OK' : (want === 'IMMOVABLE' || want === 'UNDER_CONSTRUCTION') ? (outside ? 'OUTSIDE_RADIUS' : 'NOT_DRAGGABLE') : want;
    bump('move', 'probes');
    stats.move.reasons[want] = (stats.move.reasons[want] || 0) + 1;
    if (rules.ok === moved) bump('move', 'verdictAgree');
    if (expected === game) bump('move', 'reasonAgree');
    if (rules.ok !== moved || expected !== game) miss('move', { id: b.id, type: b.type, from, gx, gz, rules: want, game, msg: rules.message });
    if (moved && rules.ok) {
      bump('move', 'effectsCompared');
      const nb = m.layout.buildings.find(x => x.id === b.id);
      if (nb.gx === b.gx && nb.gz === b.gz) bump('move', 'effectsAgree');
      else miss('move', { effects: true, id: b.id });
      realMove(b, from.gx, from.gz);
    }
    finish('move');
  }

  // ---------------------------------------------------------------- roads
  const roadProbes = (count, tag) => {
    for (let n = 0; n < count; n++) {
      const erase = rand() < 0.45;
      let gx, gz;
      if (rand() < 0.35 && roads.roads.size) { const r = pick([...roads.roads.values()]); gx = r.gx + (rand() < 0.5 ? 0 : ri(-1, 1)); gz = r.gz + (rand() < 0.5 ? 0 : ri(-1, 1)); }
      else { gx = ri(-16, 16); gz = ri(-16, 16); }
      eco.inventory.road = rand() < 0.12 ? 0 : ri(1, 40);
      const m = modelNow();
      const op = erase ? { op: 'remove_roads', tiles: [[gx, gz]] } : { op: 'add_roads', tiles: [[gx, gz]] };
      const rules = R.applyOp(m, op, { nowMs: T0, rand });
      resetSignal();
      const had = roads.hasRoad(gx, gz);
      const size0 = roads.roads.size;
      grid.setMode(erase ? 'erase_road' : 'draw_road');
      grid.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
      grid.setMode('design_select');
      const changed = roads.roads.size !== size0;
      const game = changed ? 'CHANGED' : signal.outside ? 'OUTSIDE_RADIUS' : signal.outOfRoads ? 'NO_ROAD_INVENTORY' : signal.roadLimit ? 'ROAD_LIMIT' : 'NOTHING';
      const want = !rules.ok ? rules.reason : (rules.added || rules.removed) ? 'CHANGED' : 'NOTHING';
      const kind = erase ? 'erase_road' : 'draw_road';
      bump(kind, 'probes');
      stats[kind].reasons[want + (tag ? '@' + tag : '')] = (stats[kind].reasons[want + (tag ? '@' + tag : '')] || 0) + 1;
      if ((want === 'CHANGED') === changed) bump(kind, 'verdictAgree');
      if (want === game) bump(kind, 'reasonAgree');
      if ((want === 'CHANGED') !== changed || want !== game) miss(kind, { gx, gz, tag, rules: want, game, msg: rules.message });
      if (changed) {
        bump(kind, 'effectsCompared');
        if ((eco.inventory.road || 0) === (m.holdings.inventory.road || 0) && roads.hasRoad(gx, gz) === m.layout.roads.includes(gx + ',' + gz)) bump(kind, 'effectsAgree');
        else miss(kind, { effects: true, gx, gz, game: eco.inventory.road, rules: m.holdings.inventory.road });
        if (had) roads.addRoad(gx, gz); else roads.removeRoad(gx, gz);
      }
      eco.restoreHoldings(baseHold);
      finish(kind);
    }
  };
  roadProbes(counts.road, '');
  // At the road budget: pave free tiles until roads == limit, probe, then take them up again.
  {
    const limit = P.limitFor('road', th);
    const extra = [];
    for (let r = 0; r <= 15 && roads.roads.size < limit; r++) {
      for (let gx = -r; gx <= r && roads.roads.size < limit; gx++) {
        for (let gz = -r; gz <= r && roads.roads.size < limit; gz++) {
          if (Math.max(Math.abs(gx), Math.abs(gz)) !== r || Math.hypot(gx, gz) > radius || roads.hasRoad(gx, gz)) continue;
          roads.addRoad(gx, gz);
          extra.push([gx, gz]);
        }
      }
    }
    rebase();
    roadProbes(counts.roadAtLimit, 'limit');
    extra.forEach(([gx, gz]) => roads.removeRoad(gx, gz));
    rebase();
  }

  // ---------------------------------------------------------------- stow (the inspector button)
  for (let n = 0; n < counts.stow; n++) {
    const b = pick(bm.buildings);
    // Sometimes fill storage up to (or near) its capacity with stowed roadblocks.
    if (rand() < 0.3 && bm.storageCapacity() > 0) {
      const room = bm.storageCapacity() - eco.getStowedTotal();
      const k = Math.max(0, room - ri(0, 1));
      eco.inventory.roadblock = (eco.inventory.roadblock || 0) + k;
      eco.stowedCounts.roadblock = (eco.stowedCounts.roadblock || 0) + k;
    }
    const m = modelNow();
    const rules = R.applyOp(m, { op: 'stow', id: b.id }, { nowMs: T0, rand });
    const want = rules.ok ? 'OK' : rules.reason;
    // UIManager.showBuildingInspector: the button exists for non-gate, non-hall, non-tree buildings
    // when canStow(b).ok; clicking it runs stowBuilding.
    const stowable = !b.isMainGate && b.type !== 'town_hall' && b.type !== 'tree';
    const gate = bm.canStow(b);
    const bank0 = { cash: eco.cash, iron: eco.iron, wood: eco.wood };
    const job = !!b.isUnderConstruction;
    const isDepot = P.storageSlotsFor(b.type, b.level) > 0;
    const did = stowable && gate.ok ? bm.stowBuilding(b) : false;
    const game = did ? 'OK' : !stowable ? 'NOT_STOWABLE' : gate.reason;
    bump('stow', 'probes');
    stats.stow.reasons[want] = (stats.stow.reasons[want] || 0) + 1;
    // The two rules the MCP adds on purpose (spec section 4 / 13): no stow under construction, and
    // a depot cannot store itself. Everything else must agree exactly.
    // (A depot's own slots are what the game counted and cityRules does not: any other answer the
    // game gives for a depot cityRules refuses that way is that rule.)
    const documented = (want === 'UNDER_CONSTRUCTION' && job) || (isDepot && (want === 'NO_DEPOT' || want === 'STORAGE_FULL') && game !== want);
    if (documented) bump('stow', 'documented');
    else {
      if (rules.ok === did) bump('stow', 'verdictAgree');
      if (want === game) bump('stow', 'reasonAgree');
      if (rules.ok !== did || want !== game) miss('stow', { id: b.id, type: b.type, rules: want, game, msg: rules.message });
    }
    if (did && rules.ok) {
      bump('stow', 'effectsCompared');
      const credit = rules.credit || { cash: 0, iron: 0, wood: 0 };
      const bankOk = ['cash', 'iron', 'wood'].every(k => Math.round(eco[k] - bank0[k]) === (credit[k] || 0));
      const holdOk = holdKeys(R.holdingsFromEconomy(eco)) === holdKeys(m.holdings);
      const tasksOk = canonical(serial().tasks.map(t => [t.id, t.i])) === canonical(m.layout.tasks.map(t => [t.id, t.i]));
      if (bankOk && holdOk && tasksOk) bump('stow', 'effectsAgree');
      else miss('stow', { effects: true, id: b.id, type: b.type, bankOk, holdOk, tasksOk, bank: [eco.cash - bank0.cash, eco.iron - bank0.iron, eco.wood - bank0.wood], credit });
    }
    if (did || sig() !== baseSig) restoreAll();
    eco.restoreHoldings(baseHold);
    finish('stow');
  }

  // ---------------------------------------------------------------- clear decoration
  const treeIds = bm.buildings.filter(x => x.type === 'tree').slice(0, counts.trees).map(x => x.id);
  for (const tid of treeIds) {
    const t = bm.buildings.find(x => x.id === tid);      // restoreAll rebuilds the objects, ids stay
    const m = modelNow();
    const rules = R.applyOp(m, { op: 'remove_tree', id: t.id }, { nowMs: T0, rand });
    const inv0 = eco.inventory.tree || 0;
    bm.removeBuilding(t);                    // the inspector's "Clear Decoration"
    bump('remove_tree', 'probes');
    if (rules.ok) bump('remove_tree', 'verdictAgree');
    if (rules.ok) bump('remove_tree', 'reasonAgree');
    bump('remove_tree', 'effectsCompared');
    if (!bm.buildings.includes(t) && !m.layout.buildings.some(x => x.id === t.id) && (eco.inventory.tree || 0) === inv0 && (m.holdings.inventory.tree || 0) === inv0) bump('remove_tree', 'effectsAgree');
    restoreAll();
    finish('remove_tree');
  }

  return { state: state.name, th, radius, buildings: bm.buildings.length, roads: roads.roads.size, stats, mismatches };
}

const STATES = [
  { state: { name: 'starter city (TH1)' }, counts: { place: 600, move: 150, road: 110, roadAtLimit: 40, stow: 40, trees: 3 }, seed: 11, fixture: null },
  { state: { name: 'th5 fixture' }, counts: { place: 700, move: 200, road: 130, roadAtLimit: 40, stow: 120, trees: 3 }, seed: 22, fixture: TH5 },
  { state: { name: 'th5 fixture at TH9', th: 9 }, counts: { place: 400, move: 100, road: 60, roadAtLimit: 30, stow: 60, trees: 2 }, seed: 33, fixture: TH5 },
  { state: { name: 'th5 fixture at TH12', th: 12 }, counts: { place: 500, move: 100, road: 60, roadAtLimit: 30, stow: 60, trees: 2 }, seed: 44, fixture: TH5 }
];

const totals = {};
const allMismatches = [];
for (const s of STATES) {
  await page.evaluate(() => localStorage.clear());
  await boot();
  const t0 = Date.now();
  const res = await page.evaluate(runState, s);
  console.log(`\n== ${res.state}: Town Hall ${res.th}, radius ${res.radius}, ${res.buildings} buildings, ${res.roads} roads (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  for (const [kind, st] of Object.entries(res.stats)) {
    const agreeable = st.probes - st.documented;
    console.log(`  ${kind.padEnd(12)} ${String(st.probes).padStart(4)} probes  verdict ${st.verdictAgree}/${agreeable}  reason ${st.reasonAgree}/${agreeable}  effects ${st.effectsAgree}/${st.effectsCompared}` +
      (st.documented ? `  (+${st.documented} documented MCP-only refusals)` : '') + (st.undoFailures ? `  UNDO FAILURES ${st.undoFailures}` : '') +
      `  ${JSON.stringify(st.reasons)}` + (st.footprints ? `\n               footprints ${JSON.stringify(st.footprints)}` : ''));
    const T = totals[kind] = totals[kind] || { probes: 0, verdictAgree: 0, reasonAgree: 0, effectsAgree: 0, effectsCompared: 0, documented: 0, undoFailures: 0 };
    for (const k of Object.keys(T)) T[k] += st[k];
  }
  allMismatches.push(...res.mismatches);
  if (s.fixture && !s.state.th) {
    await page.evaluate(() => window.citySiege.uiManager.setScreen('DESIGN'));
    await page.waitForTimeout(300);
    await shot('parity-th5-design');
  }
}

// ---------------------------------------------------------------- ids survive a save + reload
await page.evaluate(() => localStorage.clear());
await boot();
const beforeReload = await page.evaluate(async (fixture) => {
  const R = await import('/src/shared/cityRules.js');
  const CP = await import('/src/builder/CityPersistence.js');
  const G = window.citySiege;
  const bm = G.buildingManager, eco = G.economyManager, grid = G.gridSystem;
  const blob = R.fromCloudLayout(fixture.layout);
  const now = Date.now();
  const shift = now - blob.savedAt + 3600e3;          // the job runs for another hour
  blob.savedAt = now;
  blob.tasks.forEach(t => { t.endsAt += shift; });
  CP.restoreCity(bm, blob, now);
  R.applyHoldingsToEconomy(eco, fixture.holdings);
  eco.save();
  // One building placed the player's way, so a fresh id is in the save too.
  eco.addToInventory('landmine', 1);
  const n0 = bm.buildings.length;
  for (let gz = 1; gz <= 10 && bm.buildings.length === n0; gz++) {
    grid.setMode('place_inventory', 'landmine');
    grid.handleTileAction(0, gz, null, { clientX: 0, clientY: 0 });
  }
  grid.setMode('design_select');
  if (bm.buildings.length !== n0 + 1) throw new Error('could not place the landmine');
  G.saveCityNow();
  const saved = JSON.parse(localStorage.getItem('city_siege_city'));
  return {
    ids: bm.buildings.map(b => `${b.id}|${b.type}|${b.gx},${b.gz}`),
    fixtureIds: fixture.layout.buildings.map(b => b.id),
    placed: bm.buildings[bm.buildings.length - 1].id,
    job: bm.activeBuildTasks.map(t => t.building.id),
    savedIds: saved.buildings.map(b => b.id),
    savedTaskIds: saved.tasks.map(t => t.id)
  };
}, TH5);
await boot();
const afterReload = await page.evaluate(() => {
  const bm = window.citySiege.buildingManager;
  return { ids: bm.buildings.map(b => `${b.id}|${b.type}|${b.gx},${b.gz}`), job: bm.activeBuildTasks.map(t => t.building.id) };
});
await page.evaluate(() => window.citySiege.uiManager.setScreen('DESIGN'));
await page.waitForTimeout(400);
await shot('ids-after-reload-design');
const idChecks = [
  ['every fixture id restored into the live game', beforeReload.fixtureIds.every((id, i) => beforeReload.ids[i].startsWith(id + '|'))],
  ['the save writes an id for every building and the job', beforeReload.savedIds.length === beforeReload.ids.length && beforeReload.savedIds.every(Boolean) && beforeReload.savedTaskIds.length === 1],
  ['a building placed in the game gets a newBuildingId id', /^b[0-9a-z]{8,19}$/.test(beforeReload.placed)],
  ['after a page reload every building has the same id, type and tile', JSON.stringify(afterReload.ids) === JSON.stringify(beforeReload.ids)],
  ['the running job is still on the same building after reload', afterReload.job.length === 1 && afterReload.job[0] === beforeReload.job[0]]
];
console.log('\n== ids across save + reload');
for (const [name, ok] of idChecks) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
console.log(`  (${afterReload.ids.length} buildings, job on ${afterReload.job[0]}, placed ${beforeReload.placed})`);

// ---------------------------------------------------------------- production clock
// The MCP server advances every producer's output to now before it writes and stamps savedAt = now
// (cityRules.advanceProduction). That must be exactly what the game's own restoreCity credits for
// the same time away, or a remote apply would hand out (or take away) output.
await boot();
const AWAYS = [0, 7, 95, 3600, 3 * 3600, 30 * 3600];
const clockProbes = await page.evaluate(async ({ fixture, aways }) => {
  const R = await import('/src/shared/cityRules.js');
  const CP = await import('/src/builder/CityPersistence.js');
  const P = await import('/src/data/progression.js');
  const G = window.citySiege;
  G.animate = () => {};
  G.saveCityNow = () => {};
  G.queueCitySave = () => {};
  const bm = G.buildingManager;
  bm.onCityChanged = null;
  const out = [];
  aways.forEach((away, n) => {
    const now = Date.now();
    const layout = JSON.parse(JSON.stringify(fixture.layout));
    layout.savedAt = now - away * 1000;
    layout.tasks = [];
    let k = n;
    for (const b of layout.buildings) {
      if (P.BUILDING_DEFS[b.t] && P.BUILDING_DEFS[b.t].produce) b.st = [0, 1234.6, 5e6, 17][k++ % 4];
    }
    const model = R.createModel(layout, fixture.holdings);
    R.advanceProduction(model, now);
    CP.restoreCity(bm, R.fromCloudLayout(layout), now);
    for (const b of model.layout.buildings) {
      if (!P.BUILDING_DEFS[b.t] || !P.BUILDING_DEFS[b.t].produce) continue;
      const live = bm.buildings.find(x => x.id === b.id);
      out.push({ away, id: b.id, type: b.t, rules: b.st, game: live ? Math.floor(live.stored) : null, savedAt: model.layout.savedAt === now });
    }
  });
  return out;
}, { fixture: TH5, aways: AWAYS });
const clockBad = clockProbes.filter(p => p.rules !== p.game || !p.savedAt);
console.log('\n== production clock (cityRules.advanceProduction vs the game\'s restoreCity)');
console.log(`  ${clockBad.length ? 'FAIL' : 'PASS'}  ${clockProbes.length} producer probes over ${AWAYS.length} times away (0 s .. 30 h): ` +
  `${clockProbes.length - clockBad.length} agree to the unit, savedAt stamped now` + (clockBad.length ? ' :: ' + JSON.stringify(clockBad.slice(0, 5)) : ''));

// ---------------------------------------------------------------- verdict
console.log('\n== totals');
let bad = 0;
for (const [kind, T] of Object.entries(totals)) {
  const agreeable = T.probes - T.documented;
  const ok = T.verdictAgree === agreeable && T.reasonAgree === agreeable && T.effectsAgree === T.effectsCompared && !T.undoFailures;
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${kind.padEnd(12)} ${T.probes} probes: verdicts ${T.verdictAgree}/${agreeable} agree, reasons ${T.reasonAgree}/${agreeable}, results ${T.effectsAgree}/${T.effectsCompared}` +
    (T.documented ? `, ${T.documented} documented MCP-only refusals` : '') + (T.undoFailures ? `, ${T.undoFailures} undo failures` : ''));
}
if (allMismatches.length) {
  console.log('\nMismatches (first ' + allMismatches.length + '):');
  for (const m of allMismatches) console.log('  ' + JSON.stringify(m).slice(0, 600));
}
const idBad = idChecks.filter(([, ok]) => !ok).length;
if (pageErrors.length) console.log('\npage errors:', pageErrors);
const failed = bad + idBad + (clockBad.length ? 1 : 0) + (pageErrors.length ? 1 : 0);
console.log(`\nparity-check: ${failed ? 'FAIL' : 'PASS'} (${Object.values(totals).reduce((s, T) => s + T.probes, 0)} probes, ${idChecks.length - idBad}/${idChecks.length} id checks, ` +
  `${clockProbes.length - clockBad.length}/${clockProbes.length} production-clock probes)`);
await browser.close();
process.exit(failed ? 1 : 0);
