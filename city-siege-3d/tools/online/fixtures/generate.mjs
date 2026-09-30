#!/usr/bin/env node
/**
 * Regenerates the cloud-encoded city fixtures from the REAL game (not by hand):
 *
 *   default-city.cloud.json  the starter city exactly as a first run seeds it
 *                            (initDefaultCity + the first-run economy), serialized by
 *                            CityPersistence.serializeCity and encoded by cityRules.toCloudLayout.
 *   th5-city.cloud.json      a Town Hall 5 city grown from that starter city through the game's
 *                            own APIs: shop purchases (canBuy -> deduct -> addToInventory),
 *                            placement through GridSystem.handleTileAction ('place_inventory' /
 *                            'draw_road'), upgradeBuilding + finishConstructionInstantly, stowing
 *                            with stowBuilding, two hours of production, and one upgrade left
 *                            running.
 *
 * Each file is { townHall, layout, holdings } - what cities/{uid} stores (spec 3.2 / 3.3).
 * Rerunning this regenerates every id and timestamp in both files: tests read ids from the files and
 * never hard-code them. Times are absolute; shift by Date.now() - layout.savedAt to keep the job running.
 *
 *   PW_CORE=<playwright-core dir> GAME_URL=http://localhost:3106/ node tools/online/fixtures/generate.mjs
 *
 * Needs a Vite dev server in OFFLINE mode (no Firebase config) at GAME_URL.
 */
import fs from 'node:fs';
import path from 'node:path';

const PW = process.env.PW_CORE;
if (!PW) { console.error('Set PW_CORE to a playwright-core directory.'); process.exit(2); }
const { chromium } = await import(path.join(PW, 'index.mjs'));
const GAME_URL = process.env.GAME_URL || 'http://localhost:3106/';
const OUT = new globalThis.URL('.', import.meta.url).pathname;

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const boot = async () => {
  await page.reload();
  await page.waitForFunction(() => window.citySiege && window.citySiege.buildingManager, null, { timeout: 20000 });
  await page.waitForTimeout(800);
};
await page.goto(GAME_URL);
await page.evaluate(() => localStorage.clear());
await boot();

// ---- 1. The starter city, as a first run leaves it.
const def = await page.evaluate(async () => {
  const R = await import('/src/shared/cityRules.js');
  const CP = await import('/src/builder/CityPersistence.js');
  const G = window.citySiege;
  G.animate = () => {};                                   // freeze the loop: nothing ticks under us
  const blob = CP.serializeCity(G.buildingManager);
  const layout = R.toCloudLayout(blob);
  return { townHall: R.townHallLevelOf(layout.buildings), layout, holdings: R.holdingsFromEconomy(G.economyManager) };
});

// ---- 2. A Town Hall 5 city built with the game's own APIs.
const th5 = await page.evaluate(async () => {
  const R = await import('/src/shared/cityRules.js');
  const CP = await import('/src/builder/CityPersistence.js');
  const G = window.citySiege;
  const bm = G.buildingManager, eco = G.economyManager, grid = G.gridSystem;
  const log = [];
  window.alert = (m) => log.push('alert: ' + m);          // GridSystem still uses alert() on refusals
  eco.cash = 5e7; eco.iron = 5e7; eco.wood = 5e7; eco.save();

  const upgradeTo = (b, level) => {
    while ((b.level || 1) < level) {
      const r = bm.upgradeBuilding(b);
      if (!r.ok) throw new Error(`upgrade ${b.type} -> ${(b.level || 1) + 1}: ${r.reason}`);
      bm.finishConstructionInstantly(b);
    }
  };
  // The shop's BUY button (UIManager.renderShopCatalog): canBuy -> deduct -> addToInventory.
  const buy = (type, n = 1) => {
    for (let k = 0; k < n; k++) {
      const gate = bm.canBuy(type);
      if (!gate.ok) throw new Error(`buy ${type}: ${gate.reason} ${gate.have}/${gate.limit}`);
      if (!eco.deduct(bm.catalog[type].cost)) throw new Error('buy ' + type + ': cannot afford');
      eco.addToInventory(type, bm.catalog[type].packCount || 1);
    }
  };
  // The Design screen: arm 'place_inventory', tap the tile.
  const place = (type, gx, gz) => {
    const before = bm.buildings.length;
    grid.setMode('place_inventory', type);
    grid.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
    grid.setMode('design_select');
    if (bm.buildings.length !== before + 1) throw new Error(`place ${type} at ${gx},${gz} refused`);
    return bm.buildings[bm.buildings.length - 1];
  };
  const road = (tiles) => {
    grid.setMode('draw_road');
    for (const [gx, gz] of tiles) grid.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
    grid.setMode('design_select');
  };
  const onRoad = (gx, gz) => bm.roadNetwork.hasRoad(gx, gz);
  const radius = () => bm.buildRadius;
  // Nearest legal tile to an anchor (spiral), off the roads for buildings, ON a road for barriers.
  const spot = (type, ax, az, wantRoad = false) => {
    const fp = bm.footprintOf(type);
    for (let r = 0; r <= 12; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const gx = ax + dx, gz = az + dz;
          if (Math.hypot(gx, gz) > radius() - 0.2) continue;
          if (bm.isFootprintBlocked(fp, gx, gz)) continue;
          const span = fp >= 2 ? 1 : 0;
          let touches = false;
          for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) if (onRoad(gx + i, gz + j)) touches = true;
          if (wantRoad ? !onRoad(gx, gz) : touches) continue;
          return [gx, gz];
        }
      }
    }
    throw new Error('no spot for ' + type + ' near ' + ax + ',' + az);
  };
  const buyPlace = (type, ax, az, wantRoad = false) => { buy(type); return place(type, ...spot(type, ax, az, wantRoad)); };

  // Town Hall 1 -> 5.
  const hall = bm.buildings.find(b => b.type === 'town_hall');
  upgradeTo(hall, 5);
  log.push('TH ' + bm.getTownHallLevel() + ' radius ' + bm.buildRadius);

  // Roads: packs from the shop, a spur drawn tile by tile, the rest kept in the inventory.
  buy('road', 4);
  road([[1, -10], [2, -10], [3, -10], [4, -10], [5, -10], [6, -10], [7, -10], [7, -9], [7, -8], [7, -7], [7, -6]]);

  // Labour: two more huts (Town Hall 5 allows four builders).
  buyPlace('builder_hut', 9, -6); buyPlace('builder_hut', -9, 6);

  // Storage first, so things can be stowed later.
  const depot = buyPlace('big_storage', -3, -9);
  upgradeTo(depot, 2);

  // Research.
  const vlab = buyPlace('vehicle_lab', 9, 8); upgradeTo(vlab, 3);
  const wlab = buyPlace('weapons_lab', -9, 10); upgradeTo(wlab, 2);
  buyPlace('tech_lab', 3, 9);

  // Turrets around the core.
  const snipers = [buyPlace('sniper_tower', 3, -8), buyPlace('sniper_tower', -8, -2), buyPlace('sniper_tower', 9, 2)];
  upgradeTo(snipers[0], 4); upgradeTo(snipers[1], 3); upgradeTo(snipers[2], 2);
  const teslas = [buyPlace('tesla_coil', -3, 8), buyPlace('tesla_coil', 3, -3)];
  upgradeTo(teslas[0], 3); upgradeTo(teslas[1], 2);
  const silo = buyPlace('missile_silo', -3, -3); upgradeTo(silo, 4);

  // Spawners.
  const police2 = buyPlace('police_station', 4, 8); upgradeTo(police2, 2);
  buyPlace('swat_armory', 9, -1);

  // Economy.
  const mint = buyPlace('cash_mint', -9, -10); upgradeTo(mint, 3);
  const mint2 = buyPlace('cash_mint', 11, -4);
  const refinery = buyPlace('oil_refinery', -11, 1); upgradeTo(refinery, 2);
  buyPlace('solar_array', 1, -9);
  upgradeTo(bm.buildings.find(b => b.type === 'lumber_mill'), 3);
  upgradeTo(bm.buildings.find(b => b.type === 'iron_foundry'), 2);
  // The starter lumber mill in the inventory goes down too.
  place('lumber_mill', ...spot('lumber_mill', -10, -6));

  // Traps and barriers on the roads.
  buy('spring_trap', 2); place('spring_trap', ...spot('spring_trap', 0, -8, true)); place('spring_trap', ...spot('spring_trap', 8, 0, true));
  buy('landmine', 3); place('landmine', ...spot('landmine', 0, 8, true)); place('landmine', ...spot('landmine', -8, 0, true)); place('landmine', ...spot('landmine', 6, 3, true));
  buy('freeze_trap', 1); place('freeze_trap', ...spot('freeze_trap', 0, -4, true));
  // Two starter roadblocks from the inventory plus two bought, chained along the west road.
  buy('roadblock', 2);
  for (let k = 0; k < 4; k++) place('roadblock', ...spot('roadblock', -9, 0, true));
  place('spike_trap', ...spot('spike_trap', 0, 9, true));
  const spike2 = bm.buildings.filter(b => b.type === 'spike_trap').slice(-1)[0];


  // Producers collect two hours of output (the wall clock the game credits with).
  bm.advanceProduction(Date.now() + 2 * 3600e3);

  // Storage: a level-3 mint (its output is banked), a level-2 foundry, a spike trap.
  const stow = (b) => { if (!bm.stowBuilding(b)) throw new Error('stow ' + b.type + ' refused: ' + JSON.stringify(bm.canStow(b))); };
  const bank0 = eco.cash;
  stow(mint);
  log.push('stow mint banked cash ' + Math.round(eco.cash - bank0));
  stow(bm.buildings.find(b => b.type === 'iron_foundry' && b.level === 2));
  stow(spike2);

  // Fresh inventory besides the stowed units: two landmines, two trees.
  buy('landmine', 2); buy('tree', 2);

  // One upgrade left running (Tesla Coil 3 -> 4).
  const job = bm.upgradeBuilding(teslas[0]);
  if (!job.ok) throw new Error('job: ' + job.reason);
  log.push('job ' + teslas[0].id + ' ends in ' + job.duration + 's');

  G.saveCityNow();
  const blob = CP.serializeCity(bm);
  const layout = R.toCloudLayout(blob);
  const holdings = R.holdingsFromEconomy(eco);
  const model = R.createModel(layout, holdings);
  return { fixture: { townHall: R.townHallLevelOf(layout.buildings), layout, holdings }, audit: R.auditLayout(model), log, map: R.renderAsciiMap(model) };
});

fs.writeFileSync(path.join(OUT, 'default-city.cloud.json'), JSON.stringify(def, null, 1) + '\n');
fs.writeFileSync(path.join(OUT, 'th5-city.cloud.json'), JSON.stringify(th5.fixture, null, 1) + '\n');
console.log(th5.log.join('\n'));
console.log(th5.map);
console.log('audit th5:', JSON.stringify(th5.audit));
console.log('default: buildings', def.layout.buildings.length, 'roads', def.layout.roads.length, 'TH', def.townHall);
console.log('th5: buildings', th5.fixture.layout.buildings.length, 'roads', th5.fixture.layout.roads.length, 'tasks', th5.fixture.layout.tasks.length,
  'stowed', JSON.stringify(th5.fixture.holdings.stowedCounts));
if (errors.length) { console.error('page errors:', errors); process.exitCode = 1; }
await browser.close();
