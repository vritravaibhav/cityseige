/**
 * smoke.mjs - drives the real game in Chrome and asserts the progression rework works.
 *
 *   PW_CORE=/path/to/node_modules/playwright-core node tools/e2e/smoke.mjs [shotsDir]
 *
 * Needs the Vite dev server on http://localhost:3000 (npm run dev) and Google Chrome.
 * playwright-core is NOT a project dependency; point PW_CORE at any install of it.
 */
import path from 'path';
const PW = process.env.PW_CORE;
if (!PW) { console.error('Set PW_CORE to a playwright-core install directory.'); process.exit(2); }
const { chromium } = await import(path.join(PW, 'index.mjs'));
const SHOTS = process.argv[2] || null;
const URL = process.env.GAME_URL || 'http://localhost:3000/';

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });

let fails = 0;
const check = (ok, name, detail) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`); };
const shot = async n => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png` }); };
const boot = async () => { await page.reload(); await page.waitForFunction(() => window.citySiege && citySiege.buildingManager, null, { timeout: 15000 }); await page.waitForTimeout(1500); };
/** Click `selector` and answer the confirm() it may raise. Returns the dialog's text, or null if none came up. */
const clickAnswering = async (selector, accept = true) => {
  let text = null;
  const onDialog = d => { text = d.message(); return accept ? d.accept() : d.dismiss(); };
  page.once('dialog', onDialog);
  await page.click(selector);
  page.off('dialog', onDialog);
  return text;
};

// ---------------------------------------------------------------- fresh start
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await boot();
const fresh = await page.evaluate(() => {
  const bm = citySiege.buildingManager;
  return { th: bm.getTownHallLevel(), n: bm.buildings.length, mint: bm.countOf('cash_mint'), saved: !!localStorage.getItem('city_siege_city'),
    gems: document.querySelector('#res-gems')?.textContent, labour: document.querySelector('#builder-count')?.textContent, gemBank: citySiege.economyManager.gems };
});
const startGems = await page.evaluate(async () => (await import('/src/data/progression.js')).STARTING_GEMS);
check(fresh.th === 1, 'fresh city is Town Hall 1', fresh.th);
check(fresh.gemBank === startGems && startGems < 39, `a new player starts with progression.STARTING_GEMS (${startGems}), not enough to skip the first seven Town Hall timers (39)`, fresh.gemBank);
check(fresh.mint === 0, 'starter city has no TH2 Cash Mint');
check(fresh.saved, 'city is saved on first run');
check(/\d/.test(fresh.gems || ''), 'gems shown in HUD', fresh.gems);
await shot('smoke-1-fresh');

// ---------------------------------------------------------------- shop limits
const shop = await page.evaluate(() => {
  const ui = citySiege.uiManager; ui.shopCategory = 'all'; ui.renderShopCatalog();
  return [...document.querySelectorAll('.blueprint-card')].map(c => ({ t: c.querySelector('.blueprint-title')?.textContent.trim(), btn: c.querySelector('.btn-buy-to-inv')?.textContent.trim() }));
});
check(!shop.some(c => /Main Gate/.test(c.t)), 'Main Gate is not sold');
check(/TOWN HALL 2/.test(shop.find(c => c.t === 'Cash Mint')?.btn || ''), 'Cash Mint locked at TH1', shop.find(c => c.t === 'Cash Mint')?.btn);
check(/LIMIT/.test(shop.find(c => c.t === 'Police Station')?.btn || ''), 'Police Station at its TH1 limit', shop.find(c => c.t === 'Police Station')?.btn);
const cap = await page.evaluate(() => {
  const bm = citySiege.buildingManager, eco = citySiege.economyManager; eco.cash = eco.iron = eco.wood = 1e7;
  let n = 0; while (bm.canBuy('roadblock').ok && n < 100) { eco.deduct(bm.catalog.roadblock.cost); eco.addToInventory('roadblock', 1); n++; }
  return { owned: bm.ownedTotal('roadblock'), limit: bm.limitOf('roadblock') };
});
check(cap.owned === cap.limit, 'roadblock purchases stop exactly at the limit', cap);

// ---------------------------------------------------------------- persistence + offline timers
const up = await page.evaluate(() => { const bm = citySiege.buildingManager; const t = bm.buildings.find(b => b.type === 'town_hall'); const r = bm.upgradeBuilding(t); citySiege.saveCityNow(); return r; });
check(up.ok, 'Town Hall upgrade starts', up.reason);
await boot();
const mid = await page.evaluate(() => { const t = citySiege.buildingManager.buildings.find(b => b.type === 'town_hall'); return { lvl: t.level, busy: !!t.isUnderConstruction }; });
check(mid.lvl === 1 && mid.busy, 'upgrade survives a reload', mid);
await ctx.addInitScript(() => {
  if (sessionStorage.getItem('__rewound')) return;
  const raw = localStorage.getItem('city_siege_city'); if (!raw) return;
  const b = JSON.parse(raw); (b.tasks || []).forEach(t => t.endsAt = Date.now() - 3600e3);
  localStorage.setItem('city_siege_city', JSON.stringify(b)); sessionStorage.setItem('__rewound', '1');
});
await boot();
check(await page.evaluate(() => citySiege.buildingManager.getTownHallLevel()) === 2, 'job finishes while the game is closed');

// ---------------------------------------------------------------- gem-priced finish + TH preview
const gem = await page.evaluate(() => {
  const bm = citySiege.buildingManager, e = citySiege.economyManager; e.cash = e.iron = e.wood = 1e7;
  const t = bm.buildings.find(b => b.type === 'town_hall'); bm.upgradeBuilding(t);
  const cost = bm.gemCostToFinish(t), before = e.gems; const r = bm.finishWithGems(t);
  return { cost, ok: r.ok, spent: before - e.gems, th: bm.getTownHallLevel() };
});
check(gem.ok && gem.spent === gem.cost && gem.cost > 0 && gem.th === 3, 'Finish Now charges gems', gem);
await page.evaluate(() => { const t = citySiege.buildingManager.buildings.find(b => b.type === 'town_hall'); citySiege.uiManager.showBuildingInspector(t); });
await page.waitForTimeout(300);
check(/Town Hall 4:/.test(await page.evaluate(() => document.body.innerText)), 'inspector previews the next Town Hall');
await shot('smoke-2-th-preview');

// ---------------------------------------------------------------- TH12 showcase city + raid
const NEW = ['spring_trap','swat_armory','solar_array','landmine','oil_refinery','missile_silo','tech_lab','freeze_trap','drone_hangar','fusion_reactor','plasma_mortar','vortex_trap','emp_disrupter','crypto_vault','orbital_relay','doomsday_turret','antimatter_collider','quantum_citadel'];
const placed = await page.evaluate((NEW) => {
  const bm = citySiege.buildingManager;
  bm.removeBuilding(bm.buildings.find(b => b.type === 'town_hall'));
  bm.addBuilding('town_hall', 3, 3, 12, { skipCapCheck: true });
  const spots = [[-10,-4],[-10,1],[-10,6],[-6,-10],[-5,-6],[-5,11],[-1,-11],[1,-6],[6,-10],[6,-5],[10,-5],[11,4],[9,9],[4,12],[-6,-1],[-1,7],[6,2],[-2,-2]];
  const failed = NEW.filter((t, i) => !bm.addBuilding(t, spots[i][0], spots[i][1], 6, { skipCapCheck: true }));
  citySiege.saveCityNow(); return failed;
}, NEW);
check(placed.length === 0, 'all 18 new buildings place and render', placed);
await page.waitForTimeout(800);
await shot('smoke-3-th12-city');
await boot();
check(await page.evaluate(() => citySiege.buildingManager.getTownHallLevel()) === 12, 'TH12 city survives a reload');

await page.evaluate(() => citySiege.attackManager.startRecon());
await page.waitForTimeout(1200);
await page.evaluate(() => citySiege.attackManager.triggerCinematicBreach(citySiege.buildingManager.getMainGates()[0]));
await page.waitForFunction(() => citySiege.attackManager.state === 'COMBAT', null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
const raid = await page.evaluate(() => {
  const am = citySiege.attackManager, kinds = {}, tt = {};
  am.police.policeUnits.forEach(u => kinds[u.kind] = (kinds[u.kind] || 0) + 1);
  am.turrets.turrets.forEach(t => tt[t.type] = (tt[t.type] || 0) + 1);
  const mine = citySiege.buildingManager.buildings.find(b => b.type === 'landmine');
  return { state: am.state, kinds, tt, traps: am.traps ? am.traps.traps.length : 0, mineHidden: mine ? mine.mesh.visible === false : null, emp: (am.empFields || []).length };
});
check(raid.state === 'COMBAT', 'raid reaches combat', raid.state);
check(raid.kinds.cruiser > 0 && raid.kinds.swat > 0 && raid.kinds.drone > 0, 'cruisers, SWAT and drones all deploy', raid.kinds);
check(raid.tt.missile_silo && raid.tt.plasma_mortar && raid.tt.doomsday_turret, 'new turret types fire', raid.tt);
check(raid.traps === 4, 'four drive-over traps armed', raid.traps);
check(raid.mineHidden === true, 'landmine hidden during the raid');
check(raid.emp === 1, 'EMP field active');
await shot('smoke-4-raid');

// ---------------------------------------------------------------- end the raid cleanly
await page.evaluate(() => citySiege.attackManager.endAttack('retreat'));
await page.waitForTimeout(1800);
await page.evaluate(() => citySiege.attackManager.returnToBuilder());
await page.waitForTimeout(800);
const after = await page.evaluate(() => {
  const bm = citySiege.buildingManager, mine = bm.buildings.find(b => b.type === 'landmine');
  return { destroyed: bm.buildings.filter(b => b.isDestroyed).length, mineVisible: mine ? mine.mesh.visible : null, silenced: citySiege.attackManager.vehicle.isSilenced };
});
check(after.destroyed === 0 && after.mineVisible === true && after.silenced === false, 'city fully restored after the raid', after);

// ================================================================ scenario cities
// Each scenario clears the map, keeps the three fixed gates, and places only what it tests.
const buildCity = (th, list, roads = []) => page.evaluate(({ th, list, roads }) => {
  const bm = citySiege.buildingManager;
  const gates = bm.getMainGates().map(g => ({ name: g.name, gx: g.gx, gz: g.gz, rot: g.mesh.rotation.y }));
  bm.clearAll();
  gates.forEach(g => bm.addMainGate(g.name, g.gx, g.gz, g.rot));
  bm.addBuilding('town_hall', 3, 3, th, { skipCapCheck: true });
  roads.forEach(([gx, gz]) => bm.roadNetwork.addRoad(gx, gz));
  const failed = list.filter(([t, gx, gz, L]) => !bm.addBuilding(t, gx, gz, L || 1, { skipCapCheck: true }));
  citySiege.saveCityNow();
  return failed.map(f => f[0]);
}, { th, list, roads });
const startRaid = async () => {
  await page.evaluate(() => citySiege.attackManager.startRecon());
  await page.waitForTimeout(600);
  await page.evaluate(() => citySiege.attackManager.triggerCinematicBreach(citySiege.buildingManager.getMainGates()[0]));
  await page.waitForFunction(() => citySiege.attackManager.state === 'COMBAT', null, { timeout: 15000 });
  await page.waitForTimeout(300);
};
const endRaid = async () => {
  await page.evaluate(() => citySiege.attackManager.endAttack('retreat'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  await page.waitForTimeout(400);
};
/** Put the buggy somewhere with every status effect cleared. */
const place = (x, z, heading, extra = {}) => page.evaluate(({ x, z, heading, extra }) => {
  const v = citySiege.attackManager.vehicle;
  v.position.set(x, 0, z); v.heading = heading; v.speed = 0; v.verticalY = 0; v.velocityY = 0; v.isAirborne = false;
  v.pullTimer = 0; v.slowTimer = 0; v.slowFactor = 1; v.stunTimer = 0;
  v.inputs.forward = false;
  Object.assign(v, extra);
}, { x, z, heading, extra });

// ---------------------------------------------------------------- TH7: drones are not starved
{
  const spawners = [['police_station', -10, -4], ['police_station', -10, 1], ['police_station', -10, 6], ['police_station', -6, -10], ['police_station', -5, 11],
    ['swat_armory', 6, -10], ['swat_armory', 10, -5], ['swat_armory', 11, 4], ['drone_hangar', -1, -11]];
  await buildCity(7, spawners);
  await startRaid();
  const units = await page.evaluate(() => {
    const k = {}; citySiege.attackManager.police.policeUnits.forEach(u => k[u.kind] = (k[u.kind] || 0) + 1);
    return { k, cap: citySiege.attackManager.police.maxPolice };
  });
  check(units.k.drone === 2 && units.k.cruiser === 5 && units.k.swat === 3, 'TH7 full spawner set: 5 cruisers, 3 SWAT and both hangar drones deploy', units);
  await endRaid();
}

// ---------------------------------------------------------------- offline production
{
  await buildCity(1, [['lumber_mill', -8, -8, 1]]);
  const cap = await page.evaluate(() => {
    const m = citySiege.buildingManager.buildings.find(b => b.type === 'lumber_mill'); m.stored = 0;
    citySiege.saveCityNow(); sessionStorage.setItem('__rewindProd', 'armed'); return m.maxCapacity;
  });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('__rewindProd') !== 'armed') return;
    const b = JSON.parse(localStorage.getItem('city_siege_city'));
    b.savedAt = Date.now() - 3600e3;          // closed an hour ago
    localStorage.setItem('city_siege_city', JSON.stringify(b)); sessionStorage.setItem('__rewindProd', 'done');
  });
  await boot();
  const off = await page.evaluate(() => {
    const m = citySiege.buildingManager.buildings.find(b => b.type === 'lumber_mill');
    return { stored: Math.floor(m.stored), rate: m.produceRate, cap: m.maxCapacity, toast: document.getElementById('ui-toast')?.textContent || '' };
  });
  check(off.stored >= Math.floor(off.rate * 3590) && off.stored <= off.cap, 'producers earn while the game is closed (1h away)', off);
  check(cap >= off.rate * 7200, 'a producer holds at least 2 hours of output', { cap, rate: off.rate });
  check(/Away 1h/.test(off.toast), 'boot toast reports the offline haul', off.toast);
}

// ---------------------------------------------------------------- Big Storage capacity
{
  await buildCity(3, [['big_storage', -8, 8, 1], ['roadblock', 8, -8], ['roadblock', 8, -6], ['roadblock', 8, -4], ['roadblock', 8, -2], ['roadblock', 8, 0], ['roadblock', 8, 2], ['spike_trap', 8, 4]]);
  const st = await page.evaluate(() => {
    const bm = citySiege.buildingManager;
    const before = bm.storageUsed();
    const rb = bm.buildings.filter(b => b.type === 'roadblock');
    const ok = rb.map(b => bm.stowBuilding(b));
    const spike = bm.buildings.find(b => b.type === 'spike_trap');
    const full = bm.canStow(spike);
    const refused = bm.stowBuilding(spike) === false && bm.buildings.includes(spike);
    return { before, ok, cap: bm.storageCapacity(), used: bm.storageUsed(), full: full.reason, refused };
  });
  check(st.cap === 6 && st.ok.every(Boolean) && st.used === st.before + 6 && st.full === 'STORAGE_FULL' && st.refused,
    'L1 depot holds exactly 6 stowed buildings; the 7th is refused', st);
}

// ---------------------------------------------------------------- garage ladder to Vehicle Lab 12
{
  await buildCity(12, [['vehicle_lab', -8, 8, 6], ['tech_lab', -8, -8, 3], ['weapons_lab', 8, -8, 4]]);
  const gar = await page.evaluate(() => {
    const g = citySiege.garageManager, e = citySiege.economyManager; e.cash = e.iron = e.wood = 1e9;
    g.state.tracks.armor = 0; g._commit();
    let bought = 0; while (g.buyTrack('armor').ok) bought++;
    const refuse = g.canBuyTrack('armor');
    const vs = g.computeVehicleStats();
    const lab = citySiege.buildingManager.buildings.find(b => b.type === 'vehicle_lab');
    lab.level = 12;
    let more = 0; while (g.buyTrack('armor').ok) more++;
    const vs12 = g.computeVehicleStats();
    const inv = g.getCardTier('invisibility', 5);
    return { cap6: 7, bought, refuse, hp6: vs.maxHp, shield6: vs.maxShield, more, hp12: vs12.maxHp, shield12: vs12.maxShield, cannon: vs.cannonDamage,
      invUptime: +(inv.duration / inv.cooldown).toFixed(3), research: g.getResearchSummary() };
  });
  check(gar.bought === 7 && gar.refuse.reason === 'lab' && gar.refuse.needLab === 7, 'Vehicle Lab 6 opens armor to L7 and gates L8 on Lab 7', gar);
  check(gar.more === 5 && gar.hp12 === 500 + 150 * 12 && gar.shield12 > gar.shield6, 'Vehicle Lab 12 opens armor L12 and more shield', { hp12: gar.hp12, shield6: gar.shield6, shield12: gar.shield12 });
  check(gar.research.cooldownCutPct > 0 && gar.research.cannonPct > 0 && gar.cannon > 14, 'Tech Lab and Weapons Lab levels pay off in the garage', gar.research);
  const { CARD_UPTIME_CAP } = await import('../../src/data/progression.js');
  check(gar.invUptime <= CARD_UPTIME_CAP.invisibility, `Invisibility uptime capped at ${Math.round(100 * CARD_UPTIME_CAP.invisibility)}%`, gar.invUptime);
  await page.evaluate(() => { citySiege.uiManager.openGarage('lab'); });
  await page.waitForTimeout(400);
  const labUi = await page.evaluate(() => ({
    rows: document.querySelectorAll('#garage-view .garage-lab-table tr').length,
    text: document.getElementById('garage-tab-body').innerText,
    note: document.getElementById('garage-side-note').innerText,
    research: document.getElementById('garage-research-panel')?.innerText || ''
  }));
  check(labUi.rows === 12 && /Lab L12/.test(labUi.text) && /Tech Lab/.test(labUi.text) && !/Future tracks/.test(labUi.text) && !/\d{4,}s\)/.test(labUi.text),
    'garage Lab tab lists all 12 lab levels, the research labs and readable timers', { rows: labUi.rows, note: labUi.note });
  // A card at its uptime cap gains less or nothing from the Tech Lab: the summary must not
  // promise every card the full cut.
  const capNames = { invisibility: 'Invisibility', jump: 'Big Jump', nitro: 'Nitro Surge' };
  check(new RegExp(`recharge up to ${gar.research.cooldownCutPct}% faster`).test(labUi.research) && !/Every ability card recharges/.test(labUi.research) &&
    Object.entries(CARD_UPTIME_CAP).every(([id, cap]) => labUi.research.includes(`${capNames[id]} ${Math.round(cap * 100)}%`)),
    'the research panel says cards recharge UP TO the Tech Lab cut and names the uptime caps that stop it', labUi.research);
  await shot('smoke-5-garage-lab');
  await page.evaluate(() => { citySiege.uiManager.garageTab = 'tuning'; citySiege.uiManager.renderGarage(); });
  await page.waitForTimeout(200);
  const pips = await page.evaluate(() => [...document.querySelectorAll('.garage-track-card .garage-pips')].map(p => p.children.length));
  check(pips.length === 5 && pips.every(n => n === 12), 'every tuning track shows 12 levels', pips);
  await shot('smoke-6-garage-tuning');
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 0; g._commit(); });
}

// ---------------------------------------------------------------- live combat mechanics
{
  const roads = []; for (let gx = -12; gx <= 6; gx++) roads.push([gx, -3]);
  const failed = await buildCity(12, [
    ['vortex_trap', 8, -8, 1], ['landmine', -8, -8, 1], ['emp_disrupter', 9, 9, 1],
    ['laser_obelisk', -12, 6, 1], ['crypto_vault', -2, 12, 1], ['doomsday_turret', 12, 2, 1]
  ], roads);
  check(failed.length === 0, 'combat test city placed', failed);
  await page.evaluate(() => {
    const g = citySiege.garageManager;
    g.state.cards.invisibility = { unlocked: true, level: 1 }; g.state.loadout = ['invisibility', 'nitro', 'missiles']; g._commit();
    const vault = citySiege.buildingManager.buildings.find(b => b.type === 'crypto_vault');
    vault.stored = 5000;
  });
  const tap = await page.evaluate(() => {
    const bm = citySiege.buildingManager, v = bm.buildings.find(b => b.type === 'crypto_vault');
    return { collect: bm.collectBuilding(v), stored: v.stored, bubble: !!v.bubbleMesh };
  });
  check(tap.collect === null && tap.stored >= 5000 && !tap.bubble, 'Crypto Vault cannot be tapped (no bubble, no collect)', tap);
  await startRaid();

  // EMP: a cloak switched on outside the field cuts out on entry.
  await place(-60, -60, 0, { isInvulnerable: true });
  const emp1 = await page.evaluate(() => ({ ok: citySiege.attackManager.cards.activateCard('invisibility'), inv: citySiege.attackManager.vehicle.isInvisible }));
  await place(49.5, 36, 0, { isInvulnerable: true });
  await page.waitForTimeout(300);
  const emp2 = await page.evaluate(() => {
    const v = citySiege.attackManager.vehicle, c = citySiege.attackManager.cards;
    return { silenced: v.isSilenced, inv: v.isInvisible, nitroOk: c.activateCard('nitro'), nitro: v.isNitro };
  });
  check(emp1.ok && emp1.inv && emp2.silenced && !emp2.inv && !emp2.nitroOk && !emp2.nitro, 'EMP field cuts a running cloak and blocks nitro', { emp1, emp2 });

  // Roads: the buggy is faster on asphalt than off it. (Waits on game state, not wall time:
  // below 10 fps the clamped frame delta makes game time run slower than the clock.)
  const topSpeed = async (x, z, reach) => {
    await place(x, z, Math.PI / 2, { isInvulnerable: true });
    await page.evaluate(() => { citySiege.attackManager.vehicle.inputs.forward = true; });
    await page.waitForFunction((reach) => citySiege.attackManager.vehicle.speed >= reach, reach, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    return page.evaluate(() => { const v = citySiege.attackManager.vehicle; v.inputs.forward = false; return { speed: +v.speed.toFixed(1), onRoad: v.onRoad }; });
  };
  const onRoad = await topSpeed(-66, -16.5, 29.5);
  const offRoad = await topSpeed(-66, 40, 22);
  check(onRoad.onRoad && !offRoad.onRoad && onRoad.speed >= 29.5 && offRoad.speed <= onRoad.speed * 0.8,
    'roads are faster than open ground (off-road top speed is 75%)', { onRoad, offRoad });

  // Vortex: full throttle from the centre cannot leave the well until it lets go.
  const vx = 44, vz = -44;
  await place(vx, vz, 0, { isInvulnerable: true });
  await page.evaluate(() => { citySiege.attackManager.vehicle.inputs.forward = true; });
  const trace = [];
  let released = null;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(250);
    const s = await page.evaluate(({ vx, vz }) => {
      const v = citySiege.attackManager.vehicle;
      return { d: +Math.hypot(v.position.x - vx, v.position.z - vz).toFixed(1), left: +v.pullTimer.toFixed(2) };
    }, { vx, vz });
    trace.push(s);
    if (released === null && trace.some(t => t.left > 0) && s.left === 0) released = i;
    if (released !== null && i >= released + 6) break;
  }
  await page.evaluate(() => { citySiege.attackManager.vehicle.inputs.forward = false; });
  const vortex = await page.evaluate(() => { const t = citySiege.attackManager.traps.traps.find(x => x.kind === 'pull'); return { radius: +t.radius.toFixed(1), hold: +t.holdSeconds.toFixed(1) }; });
  const held = trace.filter(t => t.left > 0.05);
  check(held.length > 0 && held.every(t => t.d <= vortex.radius + 0.5) && released !== null && trace[trace.length - 1].d > vortex.radius + 2,
    `vortex holds a full-throttle buggy for ${vortex.hold}s, then lets go`, { ...vortex, trace: trace.map(t => t.d) });

  // Buried landmine: not on the radar, not hit by the autocannon or missiles.
  await place(-44, -60, 0, { isInvulnerable: true });   // 16m short of the mine, facing it
  const mine0 = await page.evaluate(() => { const m = citySiege.buildingManager.buildings.find(b => b.type === 'landmine'); return { hp: m.hp, visible: m.mesh.visible }; });
  await page.evaluate(() => citySiege.attackManager.cards.activateCard('missiles'));
  await page.waitForTimeout(1200);
  const mine1 = await page.evaluate(() => {
    const ui = citySiege.uiManager, v = citySiege.attackManager.vehicle, m = citySiege.buildingManager.buildings.find(b => b.type === 'landmine');
    const dots = []; const ctx2 = ui.radarCtx; const arc = ctx2.arc.bind(ctx2);
    ctx2.arc = (x, y, r, a, b) => { if (r === 2.5) dots.push([x, y]); return arc(x, y, r, a, b); };
    ui.drawRadar(v.position, v.heading, [], [], [m], null);
    ctx2.arc = arc;
    return { hp: m.hp, destroyed: m.isDestroyed, visible: m.mesh.visible, radarDots: dots.length };
  });
  check(!mine0.visible && mine1.hp === mine0.hp && !mine1.destroyed && !mine1.visible && mine1.radarDots === 0,
    'buried landmine stays hidden: no radar dot, cannon and missiles pass over it', { mine0, mine1 });

  // Laser Obelisk: instant beam, half of each hit ignores the shield.
  const laser = await page.evaluate(() => {
    const am = citySiege.attackManager, v = am.vehicle, t = am.turrets.turrets.find(x => x.type === 'laser_obelisk');
    v.isInvulnerable = false; v.damageImmunityTimer = 0; v.hp = v.maxHp; v.shield = v.maxShield;
    const before = { hp: v.hp, shield: v.shield };
    am.turrets.fireBeam(t, v);
    return { beam: t.beam, pierce: t.pierce, dmg: t.damage, before, after: { hp: v.hp, shield: v.shield } };
  });
  check(laser.beam && laser.after.hp < laser.before.hp && laser.after.shield > 0 && laser.before.hp - laser.after.hp === Math.round(laser.dmg * laser.pierce),
    'laser beam burns through the shield into the hull', laser);

  // Crypto Vault: destroying it pays everything sealed inside, then it is empty.
  const vault = await page.evaluate(() => {
    const am = citySiege.attackManager, bm = citySiege.buildingManager, v = bm.buildings.find(b => b.type === 'crypto_vault');
    const before = am.destruction.getStats().looted.cash; const inside = Math.floor(v.stored);
    am.destruction.damageBuilding(v, 1e9, bm.buildings, am.police);
    return { inside, gained: am.destruction.getStats().looted.cash - before };
  });
  check(vault.gained >= vault.inside && vault.inside >= 5000, 'destroying the Crypto Vault adds its contents to the raid loot', vault);

  // Doomsday Turret: two level-1 shells wreck an untuned buggy (500 hull + 200 shield).
  const doom = await page.evaluate(() => {
    const am = citySiege.attackManager, v = am.vehicle, t = am.turrets.turrets.find(x => x.type === 'doomsday_turret');
    v.isInvulnerable = false; v.hp = 500; v.maxHp = 500; v.shield = 200; v.maxShield = 200;
    v.damageImmunityTimer = 0; v.takeDamage(t.damage); const one = { hp: v.hp, crashed: v.isCrashed };
    v.damageImmunityTimer = 0; v.takeDamage(t.damage);
    return { dmg: t.damage, one, two: { hp: v.hp, crashed: v.isCrashed } };
  });
  check(!doom.one.crashed && doom.two.crashed, 'two Doomsday shells wreck an untuned buggy', doom);
  await shot('smoke-7-combat-mechanics');

  const cashBefore = await page.evaluate(() => citySiege.economyManager.cash);
  await endRaid();
  const paid = await page.evaluate((cashBefore) => {
    const v = citySiege.buildingManager.buildings.find(b => b.type === 'crypto_vault');
    return { cashGain: Math.round(citySiege.economyManager.cash - cashBefore), vaultStored: Math.floor(v.stored) };
  }, cashBefore);
  check(paid.cashGain >= vault.inside && paid.vaultStored < 50, 'vault loot is banked and the vault is left empty', paid);
}

// ================================================================ combat balance (live)
/** A city whose buildings are dropped on the first free spot of a 3-tile lattice. */
const buildSpread = (th, list) => page.evaluate(({ th, list }) => {
  const bm = citySiege.buildingManager;
  const gates = bm.getMainGates().map(g => ({ name: g.name, gx: g.gx, gz: g.gz, rot: g.mesh.rotation.y }));
  bm.clearAll();
  gates.forEach(g => bm.addMainGate(g.name, g.gx, g.gz, g.rot));
  bm.addBuilding('town_hall', 3, 3, th, { skipCapCheck: true });
  const spots = [];
  for (let gz = -12; gz <= 12; gz += 3) for (let gx = -12; gx <= 12; gx += 3) {
    if (Math.hypot(gx, gz) <= 11 && Math.hypot(gx - 3, gz - 3) > 3) spots.push([gx, gz]);
  }
  const failed = [];
  list.forEach(([t, L]) => {
    while (spots.length) { const [gx, gz] = spots.shift(); if (bm.addBuilding(t, gx, gz, L || 1, { skipCapCheck: true })) return; }
    failed.push(t);
  });
  citySiege.saveCityNow();
  return failed;
}, { th, list });
const times = (n, entry) => Array.from({ length: n }, () => entry);
const policeKinds = () => page.evaluate(() => {
  const k = {}; citySiege.attackManager.police.policeUnits.forEach(u => k[u.kind] = (k[u.kind] || 0) + 1);
  return { k, cap: citySiege.attackManager.police.maxPolice, total: citySiege.attackManager.police.policeUnits.length };
});

// ---------------------------------------------------------------- gem bounty follows the city at stake
{
  /** Raze every counted structure and let the REAL game loop declare the victory. */
  const winRaid = async () => {
    await startRaid();
    const r = await page.evaluate(async () => {
      const am = citySiege.attackManager, bm = citySiege.buildingManager, e = citySiege.economyManager;
      am.vehicle.isInvulnerable = true;
      const before = e.gems;
      bm.buildings.filter(b => am.destruction.countsTowardDestruction(b)).forEach(b => am.destruction.destroyBuilding(b, bm.buildings, am.police));
      for (let i = 0; i < 50 && am.state === 'COMBAT'; i++) await new Promise(res => setTimeout(res, 100));
      return { state: am.state, outcome: am.attackStats.outcome, total: am.attackStats.total, gems: am.attackStats.gems, gained: e.gems - before };
    });
    await page.waitForTimeout(1500);
    r.modal = await page.evaluate(() => document.getElementById('result-gems')?.innerText.replace(/\s+/g, ' ').trim() || '');
    return r;
  };
  await buildCity(12, []);                          // everything stowed: a lone Town Hall
  const lone = await winRaid();
  await shot('smoke-8-lone-th-no-gems');
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  // The modal names Town Hall 12's full-bounty size, read from the ladder rather than hard-coded.
  const minTargets12 = await page.evaluate(async () => (await import('/src/data/progression.js')).townHallRow(12).raidMinTargets);
  check(lone.outcome === 'victory' && lone.total === 1 && lone.gems === 0 && lone.gained === 0 && /\+0/.test(lone.modal) && new RegExp(`${minTargets12}\\+`).test(lone.modal),
    'razing a stowed-away city (lone TH12) wins but pays no gems', { ...lone, minTargets12 });

  // The defense half of the bounty asks for every kind of raid defense the Town Hall allows (guns,
  // pursuit bases, traps and auras), each at progression.RAID_KIND_SHARE of its build limit.
  const kinds3 = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js');
    return P.raidThreatKindsAt(3).map(t => ({ t, need: Math.ceil(P.RAID_KIND_SHARE * P.limitFor(t, 3)) }));
  });
  const need3 = Object.fromEntries(kinds3.map(k => [k.t, k.need]));

  // 25 structures (TH3's raidMinTargets) but not one gun, station, trap or aura: nothing was at stake.
  const bare = [...times(10, ['roadblock']), ...times(4, ['spike_trap']), ...times(3, ['lumber_mill']), ...times(3, ['iron_foundry']),
    ...times(3, ['builder_hut']), ['cash_mint']];
  let failed = await buildSpread(3, bare);
  const undefended = await winRaid();
  await shot('smoke-8b-undefended-no-gems');
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  check(failed.length === 0 && undefended.outcome === 'victory' && undefended.total === 25 && undefended.gems === 0 && undefended.gained === 0 &&
    new RegExp(`all ${kinds3.length} kinds of defense`).test(undefended.modal) && /0 of 6 kinds/.test(undefended.modal),
    `a 25-structure TH3 city with every defense stowed pays no gems, and the modal names the ${kinds3.length} kinds it needs`, { failed, ...undefended, kinds3 });

  // The same 25 structures (the Town Hall is one) with every TH3 kind of defense at its share
  // (police, snipers, SWAT and Solar Arrays in place of 7 economy slots, plus spring traps and
  // landmines, which are not counted structures) pays the full bounty.
  const guarded = (L, skip = []) => [...times(10, ['roadblock']), ...times(4, ['spike_trap']), ...times(2, ['lumber_mill']), ['iron_foundry'],
    ...kinds3.filter(k => !skip.includes(k.t)).flatMap(k => times(k.need, [k.t, L]))];
  check(kinds3.map(k => k.t).sort().join() === 'landmine,police_station,sniper_tower,solar_array,spring_trap,swat_armory' &&
    ['police_station', 'sniper_tower', 'swat_armory', 'solar_array'].reduce((s, t) => s + need3[t], 0) === 7,
    'Town Hall 3 counts guns, stations, SWAT, traps and Solar Arrays as defense, 7 of them counted structures', kinds3);
  failed = await buildSpread(3, guarded(3));
  const full = await winRaid();
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  check(failed.length === 0 && full.outcome === 'victory' && full.total === 25 && full.gems === 4 && full.gained === 4,
    'a full TH3 city with every kind of defense at level 3 pays the full 4-gem bounty', { failed, ...full });

  // Every kind counts, and the COMPLETENESS PREMIUM makes a whole kind cost far more than its
  // share of the average (progression.RAID_COVER_SHARE): the same city with its traps stowed
  // keeps four kinds of six and is paid 1 gem of 4, not the 2 a flat per-kind weight paid.
  failed = await buildSpread(3, guarded(3, ['spring_trap', 'landmine']));
  const noTraps = await winRaid();
  await shot('smoke-8c-traps-stowed-fewer-gems');
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  check(failed.length === 0 && noTraps.outcome === 'victory' && noTraps.total === 25 && noTraps.gems === 1 && noTraps.gained === 1 &&
    /Spring Launch Trap/.test(noTraps.modal) && /Buried Landmine/.test(noTraps.modal) && /6 kinds on the ground/.test(noTraps.modal) &&
    /defense strength 4\.0 of 6/.test(noTraps.modal),
    'the same city with its spring traps and landmines stowed pays 1 of 4 gems, names what was missing and does not call its score a count of kinds', { failed, ...noTraps });

  // ONE kind stowed, the rest untouched: the premium has to make that a losing trade even for a
  // raider who would then never lose again (progression.RAID_FULL_WIN_RATE). Flat 1/kinds paid
  // 3 of 4 here, and at Town Hall 12 it paid 23 of 25 for a raid the bot then won 72 times in 72.
  failed = await buildSpread(3, guarded(3, ['swat_armory']));
  const noSwat = await winRaid();
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  const fullWin3 = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js');
    return P.townHallRow(3).raidGems * P.RAID_FULL_WIN_RATE;
  });
  check(failed.length === 0 && noSwat.outcome === 'victory' && noSwat.gems === 1 && noSwat.gained === 1 && noSwat.gems < fullWin3 &&
    /SWAT Armory/.test(noSwat.modal) && /5 of 6 kinds on the ground/.test(noSwat.modal),
    `one kind of six stowed pays ${noSwat.gems} of 4 gems, under the ${fullWin3} a full city is worth even if stowing won every raid`,
    { failed, ...noSwat, fullWin3 });

  failed = await buildSpread(3, guarded(1));
  const weak = await winRaid();
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  check(failed.length === 0 && weak.outcome === 'victory' && weak.gems === 1 && weak.gained === 1,
    'the same city with never-upgraded (level-1) defenses pays 1 gem of 4', { failed, ...weak });
}

// ---------------------------------------------------------------- police cap shared fairly between spawner types
{
  const failed = await buildSpread(7, [...times(8, ['police_station']), ...times(5, ['swat_armory']), ...times(2, ['drone_hangar'])]);
  await startRaid();
  const u = await policeKinds();
  await endRaid();
  check(failed.length === 0 && u.total === u.cap && u.k.cruiser >= 3 && u.k.swat >= 3 && u.k.drone >= 2,
    'an over-built TH7 city fills the police cap with every spawner type, not in build order', u);
}

// ---------------------------------------------------------------- SWAT out-runs a stock buggy and keeps pace with a tuned one
{
  await buildCity(3, [['swat_armory', -8, -8, 1]]);
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.speed = 0; g._commit(); });
  await startRaid();
  const s1 = await page.evaluate(() => { const am = citySiege.attackManager; return { buggy: am.vehicle.maxForwardSpeed, swat: am.police.policeUnits.filter(u => u.kind === 'swat').map(u => +u.maxSpeed.toFixed(2)) }; });
  await endRaid();
  check(s1.swat.length === 1 && s1.swat.every(v => v > s1.buggy), 'a level-1 SWAT unit is faster than a stock buggy', s1);

  await buildCity(12, [['swat_armory', -8, -8, 12], ['swat_armory', 8, -8, 12], ['swat_armory', -8, 8, 12], ['vehicle_lab', 8, 8, 12]]);
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.speed = 12; g._commit(); });
  await startRaid();
  const s12 = await page.evaluate(() => { const am = citySiege.attackManager; return { buggy: am.vehicle.maxForwardSpeed, swat: am.police.policeUnits.filter(u => u.kind === 'swat').map(u => +u.maxSpeed.toFixed(2)) }; });
  await endRaid();
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.speed = 0; g._commit(); });
  check(s12.swat.length === 3 && s12.buggy === 48 && s12.swat.every(v => v >= s12.buggy - 1) && Math.max(...s12.swat) > s12.buggy,
    'level-12 SWAT keeps pace with a TH12-tuned buggy (Top Speed 12)', s12);
}

// ---------------------------------------------------------------- landmine at the city's level vs a buggy tuned to match
{
  // Worst case: an L12 mine against a TH12-tuned buggy (the old +35%/level curve dealt 2910 to a 2800 EHP buggy).
  const failed = await buildCity(12, [['landmine', -8, 8, 12], ['vehicle_lab', 8, -8, 12]]);
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 12; g._commit(); });
  await startRaid();
  const pre = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), v = citySiege.attackManager.vehicle;
    return { hp: v.hp, shield: v.shield, ehp: P.raiderMaxEhpAt(12), mine: P.trapStatsFor('landmine', 12).damage };
  });
  await place(-44, 30, 0, { isInvulnerable: false, damageImmunityTimer: 0 });   // 14m short of the mine, facing it
  await page.evaluate(() => { citySiege.attackManager.vehicle.inputs.forward = true; });
  await page.waitForFunction(() => citySiege.buildingManager.buildings.find(b => b.type === 'landmine').trapSpent, null, { timeout: 10000 }).catch(() => {});
  const post = await page.evaluate(() => {
    const v = citySiege.attackManager.vehicle; v.inputs.forward = false;
    return { hp: Math.round(v.hp), shield: Math.round(v.shield), crashed: v.isCrashed, spent: !!citySiege.buildingManager.buildings.find(b => b.type === 'landmine').trapSpent };
  });
  await endRaid();
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 0; g._commit(); });
  const lost = (pre.hp + pre.shield) - (post.hp + post.shield);
  check(failed.length === 0 && post.spent && !post.crashed && pre.hp + pre.shield === pre.ehp && lost === pre.mine && lost <= 0.65 * pre.ehp,
    'driving over an L12 landmine costs a TH12-tuned buggy at most 65% of its armor, never all of it', { failed, pre, post, lost });
}

// ---------------------------------------------------------------- a mine on the breach route: buried from recon on, lands inside the breach grace
{
  // Nothing is zeroed: the raider picks the North Gate and holds throttle straight in, like a real
  // raid. The 3s breach grace is still running when the mine fires (it used to soak it for 0 damage).
  const failed = await buildCity(3, [['landmine', 0, -11, 1]]);
  const mineVisible = () => page.evaluate(() => citySiege.buildingManager.buildings.find(b => b.type === 'landmine').mesh.visible);
  const builder = await mineVisible();
  await page.evaluate(() => citySiege.attackManager.startRecon());
  await page.waitForTimeout(300);
  const recon = await mineVisible();
  await page.evaluate(() => citySiege.attackManager.abortRecon());
  const aborted = await mineVisible();
  await page.evaluate(() => citySiege.attackManager.startRecon());
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const am = citySiege.attackManager, traps = am.traps, orig = traps._trigger;
    traps._trigger = function (trap, player) {
      const loot0 = am.destruction.getStats().looted, pre = { imm: player.damageImmunityTimer, ehp: player.hp + player.shield };
      orig.call(this, trap, player);
      const loot1 = am.destruction.getStats().looted;
      window.__mine = { kind: trap.kind, dmg: trap.damage, immAtTrigger: +pre.imm.toFixed(2), immAfter: +player.damageImmunityTimer.toFixed(2),
        lost: Math.round(pre.ehp - (player.hp + player.shield)), loot: loot1.cash + loot1.iron + loot1.wood - (loot0.cash + loot0.iron + loot0.wood) };
      traps._trigger = orig;
    };
    am.triggerCinematicBreach(citySiege.buildingManager.getMainGates().find(g => g.gz === -15));
  });
  const swoop = await mineVisible();
  await page.waitForFunction(() => citySiege.attackManager.state === 'COMBAT', null, { timeout: 15000 });
  await page.evaluate(() => { citySiege.attackManager.vehicle.inputs.forward = true; });
  await page.waitForFunction(() => window.__mine, null, { timeout: 10000 }).catch(() => {});
  const m = await page.evaluate(() => { citySiege.attackManager.vehicle.inputs.forward = false; return window.__mine || null; });
  await endRaid();
  check(failed.length === 0 && builder && !recon && aborted && !swoop,
    'a landmine is buried on the recon map and during the breach swoop, and shows again if recon is aborted', { builder, recon, aborted, swoop });
  check(!!m && m.kind === 'damage' && m.immAtTrigger > 0.35 && m.dmg > 0 && m.lost === m.dmg && m.immAfter >= m.immAtTrigger && m.loot === 0,
    'a landmine the raider hits inside the breach grace deals its full damage, keeps the grace, and pays no loot', m);
}

// ---------------------------------------------------------------- chain reactions at every level
{
  // Each pair sits 2 tiles (11m) apart and far from every other pair. Blast damage alone only
  // set off a level-1 twin: L5 pumps left the second at 658/1280, a refinery never went.
  const failed = await buildCity(12, [
    ['petrol_pump', -10, -8, 5], ['petrol_pump', -8, -8, 5],
    ['petrol_pump', 8, -10, 1], ['oil_refinery', 10, -10, 1], ['quantum_citadel', 6, -6, 12],
    ['oil_refinery', -10, 8, 4], ['oil_refinery', -8, 8, 4],
    ['fusion_reactor', 8, 10, 12], ['antimatter_collider', 10, 10, 12],
    ['lumber_mill', -12, -6, 12]
  ]);
  await startRaid();
  await place(0, -100, Math.PI, { isInvulnerable: true });   // outside the wall, facing away
  const chain = await page.evaluate(() => {
    const am = citySiege.attackManager, bm = citySiege.buildingManager;
    const at = (gx, gz) => bm.buildings.find(b => b.gx === gx && b.gz === gz);
    const pairs = [[[-10, -8], [-8, -8]], [[8, -10], [10, -10]], [[-10, 8], [-8, 8]], [[8, 10], [10, 10]]];
    const out = pairs.map(([a, b]) => {
      const x = at(...a), y = at(...b);
      const othersUp = pairs.flat().filter(p => p !== a && p !== b).map(p => at(...p)).filter(o => o !== x && o !== y && !o.isDestroyed).length;
      am.destruction.damageBuilding(x, 1e9, bm.buildings, am.police);   // the raider razes the first one
      const stillUp = pairs.flat().map(p => at(...p)).filter(o => o !== x && o !== y && !o.isDestroyed).length;
      return { pair: `${x.type} L${x.level} -> ${y.type} L${y.level} (${y.maxHp} HP)`, first: x.isDestroyed, second: y.isDestroyed, othersUntouched: stillUp === othersUp };
    });
    const mill = at(-12, -6);
    return { out, mill: { hp: Math.round(mill.hp), maxHp: mill.maxHp, destroyed: mill.isDestroyed } };
  });
  await endRaid();
  check(failed.length === 0 && chain.out.every(p => p.first && p.second && p.othersUntouched),
    'an explosive sets off every other explosive in its blast at any level (L5 pumps, pump -> refinery under an L12 Citadel, L4 refineries, L12 reactor -> collider)', chain.out);
  check(!chain.mill.destroyed && chain.mill.hp < chain.mill.maxHp, 'a non-explosive in the blast only takes its damage', chain.mill);
}

// ---------------------------------------------------------------- trees are decoration: the buggy mows them down, rounds fly past
{
  const failed = await buildCity(3, [['tree', -1, -11, 1], ['tree', 0, -11, 1], ['tree', 1, -11, 1], ['tree', -8, -11, 1], ['lumber_mill', -8, -8, 1]]);
  await startRaid();
  // One autocannon volley at a mill with a tree standing in the line of fire.
  await place(-44, -80, 0, { isInvulnerable: true });
  const shots = await page.evaluate(() => {
    const am = citySiege.attackManager, v = am.vehicle, bm = citySiege.buildingManager;
    const mill = bm.buildings.find(b => b.type === 'lumber_mill'), tree = bm.buildings.find(b => b.type === 'tree' && b.gx === -8);
    const hp0 = mill.hp;
    v.projectiles.forEach(p => v.projectilesGroup.remove(p.mesh)); v.projectiles = [];
    v.fireCannons();                                             // one volley: two shells
    for (let i = 0; i < 60; i++) v.updateProjectiles(1 / 60, bm.buildings, am.police, am.destruction);
    return { millLost: Math.round(hp0 - mill.hp), perShell: v.cannonDamage, treeHp: tree.hp, treeMax: tree.maxHp };
  });
  // Full throttle into a row of three trees 5.5m apart (their old 3.2m hit circles overlapped into a wall).
  await place(0, -78, 0, { isInvulnerable: true });
  await page.evaluate(() => {
    const l = citySiege.attackManager.destruction.getStats().looted; window.__loot0 = l.cash + l.iron + l.wood;
    citySiege.attackManager.vehicle.inputs.forward = true;
  });
  await page.waitForFunction(() => citySiege.attackManager.vehicle.position.z > -50, null, { timeout: 8000 }).catch(() => {});
  const drive = await page.evaluate(() => {
    const v = citySiege.attackManager.vehicle; v.inputs.forward = false;
    const t = citySiege.buildingManager.buildings.find(b => b.type === 'tree' && b.gx === 0);
    const l = citySiege.attackManager.destruction.getStats().looted;
    return { z: +v.position.z.toFixed(1), flattened: t.isDestroyed, visible: t.mesh.visible, rubble: !!t.rubbleMesh, loot: l.cash + l.iron + l.wood - window.__loot0 };
  });
  await endRaid();
  const standing = await page.evaluate(() => citySiege.buildingManager.buildings.filter(b => b.type === 'tree').every(b => !b.isDestroyed && b.mesh.visible));
  check(failed.length === 0 && shots.millLost === 2 * shots.perShell && shots.treeHp === shots.treeMax,
    'autocannon rounds fly past a tree and hit the building behind it', shots);
  check(drive.z > -50 && drive.flattened && !drive.visible && !drive.rubble && drive.loot === 0 && standing,
    'the buggy flattens a row of trees instead of stopping (no rubble, no loot) and they stand again after the raid', { drive, standing });
}

// ---------------------------------------------------------------- a fresh trap on the breach road goes off: rounds fly over it
{
  // The autocannon fires on its own along the buggy's heading. While traps were shootable, a
  // level-1 Spring / Freeze / Vortex on the gate road was shot apart 10-19m out (and paid loot)
  // and never went off. Nothing is zeroed: breach at the North Gate and hold W down the road,
  // with the Weapons Lab at the Town Hall's level.
  const road = [...Array(31)].map((_, i) => [0, i - 15]);
  for (const [type, th, wl, kind] of [['spring_trap', 2, 0, 'launch'], ['freeze_trap', 5, 5, 'freeze'], ['vortex_trap', 8, 8, 'pull']]) {
    const failed = await buildCity(th, [[type, 0, -3, 1], ['lumber_mill', 8, -3, 1], ...(wl ? [['weapons_lab', -8, 8, wl]] : [])], road);
    await page.evaluate(() => citySiege.attackManager.startRecon());
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const am = citySiege.attackManager, traps = am.traps, orig = traps._trigger;
      window.__trap = null;
      traps._trigger = function (trap, player) {
        orig.call(this, trap, player);
        const b = trap.building;
        window.__trap = { kind: trap.kind, dist: +Math.hypot(player.position.x - b.mesh.position.x, player.position.z - b.mesh.position.z).toFixed(1),
          hp: Math.round(b.hp), maxHp: b.maxHp, razed: b.isDestroyed, airborne: player.isAirborne, slowed: player.slowTimer > 0, pulled: player.pullTimer > 0 };
        traps._trigger = orig;
      };
      am.triggerCinematicBreach(citySiege.buildingManager.getMainGates().find(g => g.gz === -15));
    });
    await page.waitForFunction(() => citySiege.attackManager.state === 'COMBAT', null, { timeout: 15000 });
    await page.evaluate(() => { const v = citySiege.attackManager.vehicle; v.isInvulnerable = true; v.inputs.forward = true; });
    await page.waitForFunction(() => window.__trap, null, { timeout: 12000 }).catch(() => {});
    const fired = await page.evaluate(() => { citySiege.attackManager.vehicle.inputs.forward = false; return window.__trap; });
    if (kind === 'freeze') await shot('smoke-trap-freeze-fires');
    // One autocannon volley from 30m behind the trap, through it, at a mill on the far side.
    const volley = await page.evaluate((type) => {
      const am = citySiege.attackManager, v = am.vehicle, bm = citySiege.buildingManager;
      const trap = bm.buildings.find(b => b.type === type), mill = bm.buildings.find(b => b.type === 'lumber_mill');
      const t = trap.mesh.position, m = mill.mesh.position, d = Math.hypot(m.x - t.x, m.z - t.z);
      const ux = (m.x - t.x) / d, uz = (m.z - t.z) / d;
      v.position.set(t.x - ux * 30, 0, t.z - uz * 30); v.heading = Math.atan2(ux, uz); v.speed = 0;
      v.projectiles.forEach(p => v.projectilesGroup.remove(p.mesh)); v.projectiles = [];
      const trapHp0 = trap.hp, millHp0 = mill.hp;
      v.fireCannons();                                             // one volley: two shells
      for (let i = 0; i < 60; i++) v.updateProjectiles(1 / 60, bm.buildings, am.police, am.destruction);
      return { trapLost: Math.round(trapHp0 - trap.hp), millLost: Math.round(millHp0 - mill.hp), perShell: v.cannonDamage,
        shootable: am.destruction.isShootable(trap), trapRazed: trap.isDestroyed };
    }, type);
    await endRaid();
    const effect = { launch: 'airborne', freeze: 'slowed', pull: 'pulled' }[kind];
    check(failed.length === 0 && !!fired && fired.kind === kind && fired[effect] && fired.hp === fired.maxHp && !fired.razed,
      `a level-1 ${type} on the North Gate road goes off under a raider who breaches there and holds W (Town Hall ${th}, Weapons Lab ${wl}), untouched by the autocannon`, { failed, fired });
    check(volley.trapLost === 0 && !volley.trapRazed && !volley.shootable && volley.millLost === 2 * volley.perShell,
      `autocannon rounds fly over a ${type} and hit the building behind it`, volley);
  }
}

// ---------------------------------------------------------------- auras: live, best-of (no stacking), gate guns included
{
  const failed = await buildCity(10, [['sniper_tower', -8, -8, 1], ['solar_array', -10, -4, 3], ['solar_array', -5, -4, 3], ['orbital_relay', 8, 8, 10]]);
  await startRaid();
  await page.evaluate(() => { citySiege.attackManager.vehicle.isInvulnerable = true; });
  const read = () => page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager;
    const r = (t) => ({ range: +t.range.toFixed(2), damage: t.damage, interval: +t.fireInterval.toFixed(3), buffed: t.buffed });
    const sn = P.turretStatsFor('sniper_tower', 1);
    return {
      sniper: r(am.turrets.turrets.find(t => t.type === 'sniper_tower')),
      gate: r(am.turrets.turrets.find(t => t.type === 'gate')),
      want: {
        relay: P.auraBonusFor('orbital_relay', 10), solar: P.auraBonusFor('solar_array', 3),
        sniper: { range: sn.range, damage: sn.damage, interval: sn.fireInterval }, gate: P.GATE_TURRET
      }
    };
  });
  const raze = (type, n = 1) => page.evaluate(({ type, n }) => {
    const am = citySiege.attackManager, bm = citySiege.buildingManager;
    bm.buildings.filter(b => b.type === type && !b.isDestroyed).slice(0, n).forEach(b => am.destruction.destroyBuilding(b, bm.buildings, am.police));
  }, { type, n });
  const a = await read();
  const W = a.want, near = (x, y) => Math.abs(x - y) < 0.01;
  check(failed.length === 0 &&
    near(a.sniper.range, W.sniper.range * (1 + W.relay)) && near(a.sniper.damage, W.sniper.damage * (1 + W.relay)) &&
    near(a.sniper.interval, +(W.sniper.interval / (1 + W.solar)).toFixed(3)) &&
    near(a.gate.range, W.gate.range * (1 + W.relay)) && near(a.gate.damage, W.gate.damage * (1 + W.relay)) && a.gate.buffed,
    'relay buffs every gun incl. gate guns; two solar arrays count once (stacks:false)', a);
  await raze('orbital_relay');
  await page.waitForTimeout(400);
  const b = await read();
  check(near(b.sniper.range, W.sniper.range) && b.sniper.damage === W.sniper.damage && near(b.sniper.interval, a.sniper.interval) &&
    near(b.gate.range, W.gate.range) && b.gate.damage === W.gate.damage && !b.gate.buffed,
    'razing the relay mid-raid ends its buff; the arrays still standing keep theirs', { sniper: b.sniper, gate: b.gate });
  await raze('solar_array');
  await page.waitForTimeout(300);
  const c = await read();
  await raze('solar_array');
  await page.waitForTimeout(300);
  const d = await read();
  check(near(c.sniper.interval, a.sniper.interval) && near(d.sniper.interval, W.sniper.interval) && !d.sniper.buffed,
    'one array down leaves the other covering; both down, the sniper is back to base rate', { one: c.sniper, both: d.sniper });
  await endRaid();
}

// ---------------------------------------------------------------- rounds reach the whole range; mortar bursts where it aims
{
  /** Park the buggy at (x, z), record each hit it takes until `n` land (or ~t seconds pass). */
  const hitsAt = (type, x, z, n, t) => page.evaluate(async ({ type, x, z, n, t }) => {
    const am = citySiege.attackManager, v = am.vehicle, tur = am.turrets.turrets.find(q => q.type === type);
    v.position.set(x, 0, z); v.speed = 0; v.inputs.forward = false;
    v.isInvulnerable = false; v.damageImmunityTimer = 0; v.maxHp = v.hp = 1e6; v.shield = 0;
    const hits = []; let apex = 0;
    v.takeDamage = function (amt, o) { hits.push(Math.round(amt)); return Object.getPrototypeOf(this).takeDamage.call(this, amt, o); };
    tur.cooldown = 0;
    for (let i = 0; i < t * 20 && hits.length < n; i++) {
      await new Promise(res => setTimeout(res, 50));
      am.turrets.projectiles.forEach(p => { if (p.type === type) apex = Math.max(apex, p.mesh.position.y); });
    }
    delete v.takeDamage;
    return { dist: +Math.hypot(x - tur.pos.x, z - tur.pos.z).toFixed(1), range: +tur.range.toFixed(1), dmg: tur.damage, muzzle: +tur.pos.y.toFixed(1), apex: +apex.toFixed(1), hits };
  }, { type, x, z, n, t });

  await buildCity(12, [['sniper_tower', -10, 0, 12]]);
  await startRaid();
  const sn = await hitsAt('sniper_tower', 40, 10, 2, 8);        // ~95m out, >40m from every gate gun
  await endRaid();
  check(sn.dist > 90 && sn.dist < sn.range && sn.hits.length >= 1 && sn.hits.every(h => h === sn.dmg),
    'an L12 sniper hits a parked buggy 95m away (rounds live for the whole range)', sn);

  await buildCity(8, [['plasma_mortar', -8, -8, 1]]);
  await startRaid();
  const mo = await hitsAt('plasma_mortar', -14, -44, 2, 10);    // 30m from the mortar, outside its dead zone
  await endRaid();
  check(mo.hits.length >= 1 && mo.hits.every(h => h >= Math.round(0.9 * mo.dmg)) && mo.apex > mo.muzzle + 4,
    'plasma mortar lobs a high arc and bursts on a parked buggy for full damage', mo);
}

// ================================================================ city and saves
/** Point the builder camera straight at world (x, z). */
const aimBuilderAt = (x, z, zoom = 30) => page.evaluate(({ x, z, zoom }) => {
  const sm = citySiege.sceneManager;
  sm.setZoom(zoom); sm.builderTarget.set(x, 0, z);
  sm.builderCamera.position.set(x + 70, 80, z + 70); sm.builderCamera.lookAt(sm.builderTarget);
}, { x, z, zoom });
/** Place one `type` from the inventory through the Design screen's real placement path. */
const placeFromInventory = (type, gx, gz) => page.evaluate(({ type, gx, gz }) => {
  const bm = citySiege.buildingManager, g = citySiege.gridSystem;
  const n = bm.buildings.filter(b => b.type === type && b.gx === gx && b.gz === gz).length;
  g.setMode('place_inventory', type);
  g.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
  return bm.buildings.filter(b => b.type === type && b.gx === gx && b.gz === gz).length === n + 1;
}, { type, gx, gz });

// ---------------------------------------------------------------- Antimatter Collider pays all three resources
{
  await buildCity(11, [['antimatter_collider', -6, -6, 1]]);
  await page.evaluate(() => { citySiege.uiManager.setScreen('HOME'); citySiege.buildingManager.buildings.find(b => b.type === 'antimatter_collider').stored = 600; });
  await aimBuilderAt(-33, -33);
  await page.waitForFunction(() => !!citySiege.buildingManager.buildings.find(b => b.type === 'antimatter_collider').bubbleMesh, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  const at = await page.evaluate(() => {
    const c = citySiege.buildingManager.buildings.find(b => b.type === 'antimatter_collider'), e = citySiege.economyManager;
    window.__bank = { cash: e.cash, iron: e.iron, wood: e.wood };
    const p = c.bubbleMesh.position.clone().project(citySiege.sceneManager.builderCamera);
    return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
  });
  await page.mouse.click(at.x, at.y);                       // a real tap on the collect bubble
  await page.waitForTimeout(150);
  const col = await page.evaluate(() => {
    const e = citySiege.economyManager, b = window.__bank, c = citySiege.buildingManager.buildings.find(x => x.type === 'antimatter_collider');
    const toast = [...document.querySelectorAll('.floating-reward')].map(x => x.textContent).pop() || '';
    return { d: { cash: Math.round(e.cash - b.cash), iron: Math.round(e.iron - b.iron), wood: Math.round(e.wood - b.wood) }, left: Math.floor(c.stored), toast };
  });
  await shot('smoke-9-collider-harvest');
  check(col.d.cash >= 600 && col.d.iron === col.d.cash && col.d.wood === col.d.cash && col.left < 12 && /💰/.test(col.toast) && /⚙️/.test(col.toast) && /🪵/.test(col.toast),
    'tapping the Antimatter Collider banks cash, iron AND wood (and says so)', col);
}

// ---------------------------------------------------------------- roadblocks chain into a closed wall
{
  await buildCity(12, []);
  await page.evaluate(() => { const e = citySiege.economyManager; e.addToInventory('roadblock', 10); e.addToInventory('spike_trap', 1); citySiege.uiManager.setScreen('DESIGN'); });
  const straight = [[-2, 6], [-1, 6], [0, 6], [1, 6], [2, 6]], diagonal = [[5, 1], [6, 2], [7, 3], [8, 4]];
  const placedOk = [];
  for (const [gx, gz] of [...straight, ...diagonal]) placedOk.push(await placeFromInventory('roadblock', gx, gz));
  placedOk.push(await placeFromInventory('spike_trap', 3, 6));          // a mixed joint on the end of the wall
  const stacked = await placeFromInventory('roadblock', 0, 6);          // the same tile is still refused
  const links = await page.evaluate(() => citySiege.buildingManager.buildings
    .filter(b => b.type === 'roadblock' || b.type === 'spike_trap').map(b => b.mesh.children.filter(c => c.userData.isBarrierLink).length));
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));
  await aimBuilderAt(14, 20, 32);
  await page.waitForTimeout(300);
  await shot('smoke-10-barrier-walls');
  check(placedOk.every(Boolean) && !stacked && links.every(n => n >= 1),
    'roadblocks and spike traps place on adjacent (and diagonal) tiles and join into walls', { placedOk, stacked, links });

  await startRaid();
  /** Full throttle from (x, z) along `heading`; side(x, z) > 0 is the near side of the wall. */
  const ram = async (x, z, heading, n, c) => {
    await place(x, z, heading, { isInvulnerable: true });
    await page.evaluate(() => {
      citySiege.buildingManager.buildings.forEach(b => { if (b.type === 'roadblock' || b.type === 'spike_trap') b.hp = b.maxHp; });
      citySiege.attackManager.vehicle.inputs.forward = true;
    });
    let minSide = Infinity;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(100);
      const s = await page.evaluate(({ n, c }) => { const p = citySiege.attackManager.vehicle.position; return n[0] * p.x + n[1] * p.z - c; }, { n, c });
      minSide = Math.min(minSide, s);
    }
    return page.evaluate((minSide) => {
      const v = citySiege.attackManager.vehicle; v.inputs.forward = false;
      const rammed = citySiege.buildingManager.buildings.filter(b => (b.type === 'roadblock' || b.type === 'spike_trap') && b.hp < b.maxHp).length;
      return { minSide: +minSide.toFixed(2), rammed, end: [+v.position.x.toFixed(1), +v.position.z.toFixed(1)] };
    }, minSide);
  };
  const joint = await ram(2.75, 8, 0, [0, -1], -33);                                        // roadblock | roadblock
  const mixed = await ram(13.75, 8, 0, [0, -1], -33);                                       // roadblock | spike trap
  const diag = await ram(42.25, -3.75, -Math.PI / 4, [Math.SQRT1_2, -Math.SQRT1_2], 22 * Math.SQRT1_2);  // diagonal joint
  await endRaid();
  check([joint, mixed, diag].every(r => r.minSide > 2 && r.minSide < 4 && r.rammed >= 1),
    'a buggy rammed at full throttle into a straight, mixed or diagonal joint stays on its side of the wall', { joint, mixed, diag });
}

// ---------------------------------------------------------------- a layout preset keeps paid-for jobs (real UI clicks)
{
  await buildCity(3, [['lumber_mill', -8, -8, 2], ['lumber_mill', 8, 8, 1], ['builder_hut', 4, -4, 1], ['builder_hut', -4, 4, 1]]);
  await page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager, ui = citySiege.uiManager;
    e.cash = e.iron = e.wood = 1e6;
    const low = bm.buildings.find(b => b.type === 'lumber_mill' && b.level === 1);
    bm.upgradeBuilding(low);                                  // Citadel has one mill slot: this lower mill goes to storage
    ui.setScreen('HOME');
    ui.showBuildingInspector(bm.buildings.find(b => b.type === 'town_hall'));
  });
  await page.click('#btn-upgrade-building');
  const before = await page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager, th = bm.buildings.find(b => b.type === 'town_hall');
    const low = bm.buildings.find(b => b.type === 'lumber_mill' && b.level === 1), high = bm.buildings.find(b => b.type === 'lumber_mill' && b.level === 2);
    high.stored = 500; low.stored = 0;
    citySiege.uiManager.hideBuildingInspector();
    return { bank: { cash: e.cash, iron: e.iron, wood: e.wood }, thEnds: th.buildTask && th.buildTask.endsAt, thTo: th.buildTask && th.buildTask.targetLevel,
      refund: bm.getUpgradeCost(low), inv: e.getInventoryCount('lumber_mill'), jobs: bm.activeBuildTasks.length };
  });
  await page.click('#btn-open-design');
  await page.click('#btn-open-presets');
  // The mill without a slot and its running job are spelled out before anything moves.
  const warned = await clickAnswering('button[data-preset="citadel"]');
  await page.waitForTimeout(200);
  check(/\b1 of your 5 buildings have no slot/.test(warned || '') && /1 running upgrade is cancelled and refunded/.test(warned || ''),
    'a preset that sends a building to storage and cancels its upgrade asks first, and says so', warned);
  const readPreset = () => page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager, th = bm.buildings.find(b => b.type === 'town_hall');
    const mill = bm.buildings.find(b => b.type === 'lumber_mill');
    return { bank: { cash: e.cash, iron: e.iron, wood: e.wood }, thLevel: th.level, thBusy: !!th.isUnderConstruction, thEnds: th.buildTask && th.buildTask.endsAt,
      thTo: th.buildTask && th.buildTask.targetLevel, mill: mill && { level: mill.level, stored: Math.floor(mill.stored) }, inv: e.getInventoryCount('lumber_mill'),
      jobs: bm.activeBuildTasks.map(t => t.building.type), toast: document.getElementById('ui-toast')?.textContent || '' };
  });
  const after = await readPreset();
  const d = { cash: Math.round(after.bank.cash - before.bank.cash), iron: Math.round(after.bank.iron - before.bank.iron), wood: Math.round(after.bank.wood - before.bank.wood) };
  check(before.jobs === 2 && after.thBusy && after.thEnds === before.thEnds && after.thTo === before.thTo && after.jobs.length === 1,
    'applying a preset mid-upgrade keeps the Town Hall job and its deadline', { before: { thEnds: before.thEnds, jobs: before.jobs }, after });
  check(d.cash === before.refund.cash && d.iron === before.refund.iron && d.wood >= before.refund.wood && d.wood < before.refund.wood + 100 &&
    after.inv === before.inv + 1 && after.mill.level === 2 && after.mill.stored >= 500 && /upgrade moved/.test(after.toast) && /refunded/.test(after.toast),
    'a building the preset sends to storage is refunded its running upgrade; the placed one keeps its stored output', { d, refund: before.refund, mill: after.mill, toast: after.toast });
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));
  await boot();
  const reloaded = await readPreset();
  check(reloaded.thBusy && reloaded.thEnds === before.thEnds && reloaded.inv === after.inv, 'the kept job survives a reload', { thBusy: reloaded.thBusy, thEnds: reloaded.thEnds });
}

// ---------------------------------------------------------------- saved jobs find their own building; relocate rules
{
  await buildCity(2, [['tree', -10, -3, 1], ['builder_hut', 4, -4, 1]]);
  await page.evaluate(() => { const e = citySiege.economyManager; e.cash = e.iron = e.wood = 1e6; e.addToInventory('lumber_mill', 1); citySiege.uiManager.setScreen('DESIGN'); });
  const onTree = await placeFromInventory('lumber_mill', -10, -3);         // trees never block placement
  const up = await page.evaluate(() => {
    const bm = citySiege.buildingManager, mill = bm.buildings.find(b => b.type === 'lumber_mill');
    const r = bm.upgradeBuilding(mill); citySiege.uiManager.setScreen('HOME'); citySiege.saveCityNow(); return r.ok;
  });
  await boot();
  const tile = await page.evaluate(() => citySiege.buildingManager.buildings.filter(b => b.gx === -10 && b.gz === -3).map(b => ({ t: b.type, busy: !!b.isUnderConstruction, level: b.level })));
  check(onTree && up && tile.length === 2 && tile.find(b => b.t === 'lumber_mill').busy && !tile.find(b => b.t === 'tree').busy,
    'a job saved on a tile shared with a tree resumes on its own building after a reload', tile);

  const rel = await page.evaluate(() => {
    const bm = citySiege.buildingManager, g = citySiege.gridSystem, ui = citySiege.uiManager;
    const mill = bm.buildings.find(b => b.type === 'lumber_mill'), hut = bm.buildings.find(b => b.type === 'builder_hut');
    const gate = bm.getMainGates()[0];
    ui.setScreen('DESIGN');
    const offered = b => { ui.showBuildingInspector(b); const o = !!document.getElementById('btn-relocate-building'); ui.hideBuildingInspector(); return o; };
    const offer = { busyMill: offered(mill), gate: offered(gate), idleHut: offered(hut) };
    g.setMode('relocate', hut);
    g.handleTileAction(mill.gx, mill.gz, null, { clientX: 0, clientY: 0 });   // onto the mill: refused
    const refused = hut.gx === 4 && hut.gz === -4 && g.mode === 'relocate';
    g.handleTileAction(-4, 6, null, { clientX: 0, clientY: 0 });              // a free tile: moved
    const moved = hut.gx === -4 && hut.gz === 6 && g.mode === 'design_select';
    g.setMode('relocate', mill);                                              // forced: a busy building stays put
    g.handleTileAction(6, -8, null, { clientX: 0, clientY: 0 });
    const busyStayed = mill.gx === -10 && mill.gz === -3 &&
      Math.abs(mill.constructionMesh.position.x - mill.mesh.position.x) < 0.01 && Math.abs(mill.constructionMesh.position.z - mill.mesh.position.z) < 0.01;
    ui.setScreen('HOME');
    return { offer, refused, moved, busyStayed };
  });
  check(!rel.offer.busyMill && !rel.offer.gate && rel.offer.idleHut && rel.refused && rel.moved && rel.busyStayed,
    'Pick Up & Move is not offered for gates or mid-upgrade buildings and never drops onto another building', rel);
}

// ---------------------------------------------------------------- raid state is not saved: a landmine comes back armed
{
  await buildCity(6, [['landmine', -8, 8, 1]]);
  const blob = await page.evaluate(() => {
    citySiege.buildingManager.buildings.find(b => b.type === 'landmine').trapSpent = true;   // tripped mid-raid
    citySiege.saveCityNow();
    const raw = JSON.parse(localStorage.getItem('city_siege_city'));
    const mine = raw.buildings.find(b => b.t === 'landmine');
    const saved = { ...mine };
    mine.spent = 1; localStorage.setItem('city_siege_city', JSON.stringify(raw));           // an older save that did store it
    Storage.prototype.setItem = () => {};                                                    // ...and no graceful save on the way out
    return saved;
  });
  await boot();
  const armed = await page.evaluate(() => citySiege.buildingManager.buildings.find(b => b.type === 'landmine').trapSpent !== true);
  check(!('spent' in blob) && armed, 'a landmine spent mid-raid is not saved as spent, and old saves that did are re-armed', { blob, armed });
}

// ---------------------------------------------------------------- Clear Roads writes the city save in the same tick
{
  const roads = []; for (let gx = -5; gx <= 5; gx++) roads.push([gx, -6]);
  // A gate spoke past the Town Hall 3 build radius (12.1 tiles): the player cannot draw it again.
  const spoke = [[0, 13], [0, 14]];
  await buildCity(3, [], [...roads, ...spoke]);
  await page.evaluate(() => citySiege.uiManager.setScreen('DESIGN'));
  const inv0 = await page.evaluate(() => citySiege.economyManager.getInventoryCount('road'));
  let asked = '';
  const accept = dlg => { asked = dlg.message(); dlg.accept(); };
  page.on('dialog', accept);
  await page.click('#btn-clear-roads-design');
  page.off('dialog', accept);
  const cr = await page.evaluate(() => {
    const city = JSON.parse(localStorage.getItem('city_siege_city')), eco = JSON.parse(localStorage.getItem('city_siege_eco'));
    const rn = citySiege.buildingManager.roadNetwork;
    return { cityRoads: city.roads.length, live: rn.roads.size, ecoRoads: eco.inventory.road,
      kept: [...rn.roads.values()].map(r => [r.gx, r.gz, !!r.mesh]), toast: document.getElementById('ui-toast')?.textContent || '' };
  });
  // Drawing past the radius says why nothing happened (it used to only turn the cursor red).
  const refused = await page.evaluate(() => {
    const g = citySiege.gridSystem; g.setMode('draw_road');
    const t = document.getElementById('ui-toast'); if (t) t.textContent = '';
    citySiege.uiManager._outsideToastAt = -1e9;
    g.handleTileAction(0, 15, null, null);
    const out = { added: citySiege.buildingManager.roadNetwork.hasRoad(0, 15), toast: t?.textContent || '' };
    g.setMode('design_select');
    return out;
  });
  await shot('smoke-8-clear-roads-keeps-gate-spoke');
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));
  check(cr.cityRoads === spoke.length && cr.live === spoke.length && cr.ecoRoads === inv0 + roads.length,
    'Clear Roads saves the emptied map at once (no window where the roads are both placed and refunded)', { ...cr, inv0 });
  check(JSON.stringify(cr.kept.map(k => k.slice(0, 2)).sort()) === JSON.stringify(spoke) && cr.kept.every(k => k[2]) &&
    /Gate roads beyond the build area stay/.test(asked) && /2 gate road tiles beyond your build area stay/.test(cr.toast) &&
    !refused.added && /outside your build area/.test(refused.toast),
    'Clear Roads keeps the gate roads past the build radius (they could not be redrawn) and says so; a draw out there says why it failed', { kept: cr.kept, asked, toast: cr.toast, refused });
}

// ================================================================ garage and progression fixes
// ---------------------------------------------------------------- holding Space cannot keep the buggy in the air
{
  /**
   * Hold Space like OS key repeat (a keydown every 33ms) for `secs` of GAME time with the buggy
   * pinned in place, and return the share of whole jump cycles (first to last take-off) it
   * spent airborne. Airborne dodges ground fire, rams, traps and busts.
   */
  const holdSpace = (secs) => page.evaluate(async (secs) => {
    const v = citySiege.attackManager.vehicle;
    const px = v.position.x, pz = v.position.z;
    const log = { t: 0, takeoffs: [], frames: [], wasAir: false };
    v.update = function (dt, ...rest) {
      const r = Object.getPrototypeOf(this).update.call(this, dt, ...rest);
      this.position.x = px; this.position.z = pz;
      if (this.isAirborne && !log.wasAir) log.takeoffs.push(log.t);
      log.wasAir = this.isAirborne;
      log.frames.push([log.t, dt, this.isAirborne]);
      log.t += dt;
      return r;
    };
    const key = setInterval(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true })), 33);
    while (log.t < secs) await new Promise(res => setTimeout(res, 100));
    clearInterval(key);
    delete v.update;
    const t0 = log.takeoffs[0], t1 = log.takeoffs[log.takeoffs.length - 1];
    const air = log.frames.filter(([t, , a]) => a && t >= t0 && t < t1).reduce((s, [, dt]) => s + dt, 0);
    const jump = citySiege.attackManager.cards.cards.find(c => c.id === 'jump');
    return { takeoffs: log.takeoffs.length, share: +(air / (t1 - t0)).toFixed(3), cycle: +((t1 - t0) / (log.takeoffs.length - 1)).toFixed(2),
      jumpCooldown: jump.cooldown, jumpAirtime: jump.airtime, inDeck: citySiege.attackManager.cards.deck.some(c => c.id === 'jump') };
  }, secs);
  const theory = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js');
    return { hop: +P.hopAirShare().toFixed(3), hopCap: P.RAIDER_BASE.hop.maxAirShare, jumpCap: P.CARD_UPTIME_CAP.jump };
  });

  // No Big Jump card in the deck: Space only ever gives the small hop.
  await buildCity(12, []);
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.loadout = ['missiles', 'nitro']; g._commit(); });
  await startRaid();
  await place(-60, 50, 0, { isInvulnerable: true });
  const hop = await holdSpace(14);
  await endRaid();
  check(!hop.inDeck && hop.takeoffs >= 3 && hop.share <= theory.hopCap && Math.abs(hop.share - theory.hop) < 0.03,
    `holding Space (hop only) keeps the buggy airborne ${Math.round(hop.share * 100)}% of the time, not 97%`, { ...hop, theory });

  // Fully tuned Big Jump: card L5, Tech Lab 12, Jump track 12 (1.15s cooldown vs 2.4s hang time).
  await buildCity(12, [['tech_lab', -8, -8, 12]]);
  await page.evaluate(() => {
    const g = citySiege.garageManager;
    g.state.cards.jump = { unlocked: true, level: 5 }; g.state.tracks.jump = 12; g.state.loadout = ['jump', 'missiles', 'nitro']; g._commit();
  });
  await startRaid();
  await place(-60, 50, 0, { isInvulnerable: true });
  const big = await holdSpace(16);
  await endRaid();
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.cards.jump = { unlocked: true, level: 1 }; g.state.tracks.jump = 0; g._commit(); });
  check(big.inDeck && big.takeoffs >= 3 && big.jumpAirtime > big.jumpCooldown && big.share <= theory.jumpCap + 0.01,
    `holding Space with a maxed Big Jump keeps the buggy airborne ${Math.round(big.share * 100)}% of the time (cap ${theory.jumpCap * 100}%)`, big);
}

// ---------------------------------------------------------------- aura-boosted Doomsday: two shells, never one
{
  const failed = await buildCity(12, [['doomsday_turret', -8, -8, 12], ['fusion_reactor', -5, -8, 12], ['orbital_relay', -8, -5, 12], ['vehicle_lab', 8, 8, 12]]);
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 12; g._commit(); });
  await startRaid();
  const doom = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, v = am.vehicle;
    const t = am.turrets.turrets.find(x => x.type === 'doomsday_turret');
    v.isInvulnerable = false; v.isAirborne = false;
    const pre = { hp: v.hp, shield: v.shield, ehp: P.raiderMaxEhpAt(12) };
    v.damageImmunityTimer = 0; v.takeDamage(t.damage); const one = { hp: Math.round(v.hp), crashed: v.isCrashed };
    v.damageImmunityTimer = 0; v.takeDamage(t.damage); const two = { hp: Math.round(v.hp), crashed: v.isCrashed };
    return { base: t.base.damage, dmg: t.damage, cap: P.AURA_DAMAGE_CAP, pre, one, two };
  });
  await endRaid();
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 0; g._commit(); });
  check(failed.length === 0 && Math.abs(doom.dmg - doom.base * (1 + doom.cap)) < 0.01 && doom.pre.hp + doom.pre.shield === doom.pre.ehp &&
    !doom.one.crashed && doom.two.crashed,
    `an L12 Doomsday boosted by an L12 reactor AND relay (+${Math.round(doom.cap * 100)}% cap) needs two shells for a TH12-tuned buggy`, doom);
}

// ---------------------------------------------------------------- Weapons Lab: the autocannon bonus hits pursuit units too
{
  await buildCity(12, [['weapons_lab', -8, -8, 12], ['swat_armory', 8, -8, 1]]);
  await startRaid();
  const wl = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, v = am.vehicle, pm = am.police;
    const cop = pm.policeUnits.find(u => u.kind === 'swat');
    v.isInvulnerable = true; v.speed = 0; v.inputs.forward = false; v.position.set(0, 0, -40); v.heading = 0; v.mesh.position.copy(v.position);
    cop.position.set(0, 0, -30); cop.speed = 0; cop.maxSpeed = 0; cop.acceleration = 0;
    const hp0 = cop.hp;
    v.projectiles.forEach(p => v.projectilesGroup.remove(p.mesh)); v.projectiles = [];
    v.fireCannons();                                             // one volley: two shells
    for (let i = 0; i < 30; i++) v.updateProjectiles(1 / 60, [], pm, am.destruction);
    const want = P.vehicleStatsFor({}, { weaponsLabLevel: 12 });
    return { perShell: (hp0 - cop.hp) / 2, want: want.cannonVsUnits, stock: P.RAIDER_BASE.cannonVsUnits, vsBuildings: v.cannonDamage };
  });
  await endRaid();
  // The gain in the label is read from the ladder (it said +144% long after cannonPerLevel moved).
  check(wl.perShell === wl.want && wl.want > wl.stock,
    `a Weapons Lab 12 autocannon shell hits a SWAT unit for +${Math.round((wl.want / wl.stock - 1) * 100)}% too (${wl.want}), not the stock ${wl.stock}`, wl);
}

// ---------------------------------------------------------------- keys and HUD between and after raids
{
  // Space on the home screen, before any raid this session, does not launch the hidden buggy.
  await boot();
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  const home = await page.evaluate(() => { const v = citySiege.attackManager.vehicle; return { air: v.isAirborne, y: +v.verticalY.toFixed(2), vy: +v.velocityY.toFixed(2), visible: v.mesh.visible }; });
  check(!home.air && home.y === 0 && home.vy === 0 && !home.visible, 'Space on the home screen before the first raid does not jump the hidden buggy', home);

  // A HUD card clicked with the mouse does not keep focus, so Enter does not fire it again.
  await buildCity(12, [['swat_armory', 8, -8, 1], ['drone_hangar', -8, 8, 1]]);
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.loadout = ['nitro', 'missiles', 'jump']; g._commit(); });
  await startRaid();
  await page.evaluate(() => { citySiege.attackManager.vehicle.isInvulnerable = true; });
  await page.click('#card-nitro');
  const clicked = await page.evaluate(() => {
    const cs = citySiege.attackManager.cards, v = citySiege.attackManager.vehicle, n = cs.cards.find(c => c.id === 'nitro');
    const out = { fired: v.isNitro, focus: document.activeElement && document.activeElement.id, tabIndex: document.getElementById('card-nitro').tabIndex };
    v.setNitro(false); n.activeTimer = 0; n.currentCooldown = 0;   // ready again: only a re-fire could turn it back on
    return out;
  });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const enter = await page.evaluate(() => ({ nitro: citySiege.attackManager.vehicle.isNitro, cd: citySiege.attackManager.cards.cards.find(c => c.id === 'nitro').currentCooldown }));
  check(clicked.fired && clicked.focus !== 'card-nitro' && clicked.tabIndex === -1 && !enter.nitro && enter.cd === 0,
    'a mouse-clicked HUD card fires once and keeps no focus: Enter does not fire it again', { clicked, enter });
  const hudLabel = await page.evaluate(() => document.getElementById('cops-wrecked').parentElement.textContent.trim());

  // Wreck every pursuit unit (a SWAT truck and two drones - no cruiser at all), then retreat:
  // the result screen counts them as pursuit units, and the card keys and Space are dead on it.
  await page.evaluate(() => { const pm = citySiege.attackManager.police; [...pm.policeUnits].forEach(u => pm.destroyUnit(u)); });
  const wrecked = await page.evaluate(() => citySiege.attackManager.police.totalWrecked);
  await page.evaluate(() => citySiege.attackManager.endAttack('retreat'));
  await page.waitForTimeout(1500);
  for (const k of ['1', '2', '3', '4', '5', 'Space', 'KeyJ']) await page.keyboard.press(k);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const am = citySiege.attackManager, cs = am.cards, v = am.vehicle;
    const metric = [...document.querySelectorAll('#result-content .result-metric')].map(m => m.innerText.replace(/\s+/g, ' ').trim()).find(t => /Wrecked/i.test(t)) || '';
    return { state: am.state, missiles: cs.activeMissiles.length, bombs: cs.droppedBombs.length, nitro: v.isNitro, invisible: v.isInvisible, air: v.isAirborne,
      cooldowns: cs.cards.map(c => c.currentCooldown).filter(x => x > 0).length, attached: !!cs.playerRef, metric };
  });
  await shot('smoke-9-result-pursuit-wrecked');
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  await page.waitForTimeout(300);
  check(after.state === 'RESULT' && after.missiles === 0 && after.bombs === 0 && !after.nitro && !after.invisible && !after.air && after.cooldowns === 0 && !after.attached,
    'on the raid result screen the card keys and Space do nothing (no rockets behind the modal, no cooldowns)', after);
  check(wrecked === 3 && /Pursuit Units Wrecked/i.test(after.metric) && new RegExp(`${wrecked}`).test(after.metric) && !/Cruiser/i.test(after.metric) && /Pursuit Units Wrecked/.test(hudLabel),
    'the result screen and the HUD count wrecked SWAT and drones as pursuit units, not police cruisers', { wrecked, metric: after.metric, hudLabel });

  // The building panel's Stored figure keeps up with a producer while the panel is open.
  const stored = await page.evaluate(async () => {
    const bm = citySiege.buildingManager, ui = citySiege.uiManager;
    const mill = bm.buildings.find(b => b.type === 'lumber_mill') || bm.addBuilding('lumber_mill', -4, 8, 1, { skipCapCheck: true });
    mill.stored = 0;
    ui.showBuildingInspector(mill);
    const shown0 = document.getElementById('inspector-stored')?.textContent;
    await new Promise(r => setTimeout(r, 2500));
    return { shown0, shown: document.getElementById('inspector-stored')?.textContent, stored: Math.floor(mill.stored) };
  });
  await page.evaluate(() => citySiege.uiManager.hideBuildingInspector());
  check(stored.shown0 === '0' && stored.stored > 0 && Number(stored.shown.replace(/,/g, '')) >= stored.stored - 2,
    'an open building panel\'s Stored figure follows the producer as it fills', stored);
}

// ---------------------------------------------------------------- one Tech Lab per city (only the best one is ever read)
{
  await buildCity(11, [['tech_lab', -8, -8, 6]]);
  const tl = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), bm = citySiege.buildingManager;
    const ui = citySiege.uiManager; ui.shopCategory = 'all'; ui.renderShopCatalog();
    const card = [...document.querySelectorAll('.blueprint-card')].find(c => c.querySelector('.blueprint-title')?.textContent.trim() === 'Tech Lab');
    const raised = [8, 11].flatMap(th => P.unlocksAt(th).raisedLimits.filter(r => r.type === 'tech_lab'));
    return { limit: bm.limitOf('tech_lab'), canBuy: bm.canBuy('tech_lab'), btn: card && card.querySelector('.btn-buy-to-inv')?.textContent.trim(), raised };
  });
  check(tl.limit === 1 && !tl.canBuy.ok && /LIMIT/.test(tl.btn || '') && tl.raised.length === 0,
    'a TH11 city with one Tech Lab cannot buy a useless second one (the ladder no longer sells 2nd/3rd labs)', tl);
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));
}

// ---------------------------------------------------------------- a preset closes the inspector; stale buildings are refused
{
  await buildCity(6, [['big_storage', -8, 0, 1], ['lumber_mill', -8, -8, 6], ['builder_hut', 4, -4, 1], ['builder_hut', -4, 4, 1]]);
  const millsOwned = () => page.evaluate(() => ({ onMap: citySiege.buildingManager.buildings.filter(b => b.type === 'lumber_mill').map(b => b.level),
    total: citySiege.buildingManager.ownedTotal('lumber_mill') }));
  const owned0 = await millsOwned();
  await page.evaluate(() => {
    const e = citySiege.economyManager; e.cash = e.iron = e.wood = 1e6; e.gems = 500;
    citySiege.uiManager.setScreen('DESIGN');
    window.__staleMill = citySiege.buildingManager.buildings.find(b => b.type === 'lumber_mill');
    window.__staleMill.stored = 500;                                  // moves to the rebuilt mill
    citySiege.gridSystem.onSelectBuilding(window.__staleMill);      // = tapping the mill on the map
  });
  const open0 = await page.isVisible('#btn-stow-building');
  await page.click('#btn-open-presets');
  await clickAnswering('button[data-preset="citadel"]');   // the depot has no slot: confirm it goes to storage
  await page.waitForTimeout(250);
  const inspectorOpen = await page.isVisible('#inspector-modal');
  const stale = await page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager, g = citySiege.gridSystem, old = window.__staleMill;
    const bank = () => ({ cash: e.cash, iron: e.iron, wood: e.wood, gems: e.gems });
    const count = () => ({ onMap: bm.buildings.filter(b => b.type === 'lumber_mill').map(b => b.level), inv: e.getInventoryCount('lumber_mill') });
    const before = { bank: bank(), mills: count(), jobs: bm.activeBuildTasks.length };
    const r = {
      inCity: bm.isInCity(old),
      stow: bm.stowBuilding(old), canStow: bm.canStow(old).reason,
      upgrade: bm.upgradeBuilding(old).reason, finish: bm.finishWithGems(old).reason,
      move: bm.moveBuilding(old, -2, -12).reason, collect: bm.collectBuilding(old)
    };
    // A Pick Up & Move started before the preset is dropped with it.
    const live = bm.buildings.find(b => b.type === 'lumber_mill');
    g.setMode('relocate', live);
    const after = { bank: bank(), mills: count(), jobs: bm.activeBuildTasks.length };
    return { r, before, after, mode: g.mode };
  });
  await page.click('#btn-open-presets');
  await clickAnswering('button[data-preset="metropolis"]');
  await page.waitForTimeout(250);
  const relocate = await page.evaluate(() => ({ mode: citySiege.gridSystem.mode, carrying: !!citySiege.gridSystem.relocatingBuilding }));
  const owned1 = await millsOwned();
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));
  await boot();
  const reloaded = await millsOwned();
  const S = stale.r;
  check(open0 && !inspectorOpen, 'applying a preset closes the building inspector', { open0, inspectorOpen });
  check(!S.inCity && S.stow === false && S.canStow === 'NOT_IN_CITY' && S.upgrade === 'NOT_IN_CITY' && S.finish === 'NOT_IN_CITY' && S.move === 'NOT_IN_CITY' && S.collect === null &&
    JSON.stringify(stale.before) === JSON.stringify(stale.after),
    'stow / upgrade / finish / move / collect on a building a preset replaced are refused and change nothing', stale);
  check(relocate.mode === 'design_select' && !relocate.carrying, 'a preset drops a Pick Up & Move in progress', relocate);
  check(owned1.total === owned0.total && reloaded.total === owned0.total && JSON.stringify(reloaded.onMap) === JSON.stringify(owned1.onMap),
    'two presets and a reload later the player owns exactly the mills they had (no free duplicate)', { owned0, owned1, reloaded });
}

// ================================================================ city and saves: storage, crash windows, damaged saves
// ---------------------------------------------------------------- stowing by hand banks output; a vault's sealed cash rides along
{
  await buildCity(9, [['big_storage', -8, 0, 3], ['cash_mint', -8, -8, 2], ['lumber_mill', 8, 8, 6], ['crypto_vault', 8, -8, 3]]);
  const stowVia = async (type, stored) => {
    const bank0 = await page.evaluate(({ type, stored }) => {
      const bm = citySiege.buildingManager, e = citySiege.economyManager, b = bm.buildings.find(x => x.type === type);
      // Hold the production clock still until the stow has happened: page.click takes ~200 ms
      // of frames, and a level-6 mill makes ~2 wood in that time, so the bank read 20002 (and
      // the vault sealed 30001) about one run in three. With the clock held the stow must bank
      // exactly what was stored - no more, no less.
      bm.advanceProduction = () => 0;
      b.stored = stored;
      citySiege.gridSystem.onSelectBuilding(b);                          // = tapping it on the Design screen
      return { cash: e.cash, iron: e.iron, wood: e.wood, note: document.getElementById('inspector-modal')?.innerText || '' };
    }, { type, stored });
    try {
      await page.click('#btn-stow-building');                            // the inspector's real button
    } finally {
      // Production resumes from now: the held stretch is not credited afterwards either.
      await page.evaluate(() => { const bm = citySiege.buildingManager; delete bm.advanceProduction; bm._lastProduceAt = Date.now(); });
    }
    return page.evaluate(({ type, bank0 }) => {
      const bm = citySiege.buildingManager, e = citySiege.economyManager;
      return { d: { cash: Math.round(e.cash - bank0.cash), iron: Math.round(e.iron - bank0.iron), wood: Math.round(e.wood - bank0.wood) },
        onMap: bm.buildings.some(b => b.type === type), inv: e.getInventoryCount(type), note: bank0.note,
        toast: document.getElementById('ui-toast')?.textContent || '' };
    }, { type, bank0 });
  };
  await page.evaluate(() => citySiege.uiManager.setScreen('DESIGN'));
  const mint = await stowVia('cash_mint', 1000);
  const mill = await stowVia('lumber_mill', 20000);
  const vault = await stowVia('crypto_vault', 30000);
  check(mint.d.cash === 1000 && !mint.onMap && /Banked 💰1,000/.test(mint.toast) && mill.d.wood === 20000 && !mill.onMap && /banked when you put it away/.test(mill.note),
    'Move to Big Storage banks a producer\'s stored output (and says so)', { mint, mill: { d: mill.d, toast: mill.toast } });
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));
  await boot();
  const back = await page.evaluate(() => {
    citySiege.uiManager.setScreen('DESIGN');
    return { sealed: JSON.stringify(citySiege.economyManager.stowedSealed) };
  });
  const placedVault = await placeFromInventory('crypto_vault', 8, -8);
  const placedMint = await placeFromInventory('cash_mint', -8, -8);
  const out = await page.evaluate(() => {
    const bm = citySiege.buildingManager, v = bm.buildings.find(b => b.type === 'crypto_vault'), m = bm.buildings.find(b => b.type === 'cash_mint');
    citySiege.uiManager.setScreen('HOME');
    return { vault: { level: v.level, stored: Math.floor(v.stored) }, mint: { level: m.level, stored: Math.floor(m.stored) }, left: JSON.stringify(citySiege.economyManager.stowedSealed) };
  });
  check(vault.d.cash === 0 && /stays sealed/.test(vault.toast) && /keeps the cash sealed/.test(vault.note) && back.sealed === '{"crypto_vault":[30000]}' &&
    placedVault && out.vault.level === 3 && out.vault.stored >= 30000 && out.vault.stored < 30100 && out.left === '{}',
    'a stowed Crypto Vault keeps its sealed cash through a reload and gets it back when placed again', { vault: { d: vault.d, toast: vault.toast }, back, out });
  check(placedMint && out.mint.level === 2 && out.mint.stored < 50, 'a banked producer comes back out of storage empty at its level (output is not paid twice)', out.mint);
}

// ---------------------------------------------------------------- a crash right after collect / upgrade loses nothing and pays nothing twice
{
  await buildCity(3, [['lumber_mill', -8, -8, 2], ['builder_hut', 4, -4, 1], ['builder_hut', -4, 4, 1]]);
  /** Storage dies 300 ms after the action: no debounce, no pagehide save gets through. */
  const crashAfter = () => page.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); Storage.prototype.setItem = () => {}; });
  const c1 = await page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager, m = bm.buildings.find(b => b.type === 'lumber_mill');
    m.stored = 5000; citySiege.saveCityNow();
    const w0 = e.wood; bm.collectBuilding(m);
    return { gained: e.wood - w0, wood: e.wood };
  });
  await crashAfter();
  await boot();
  const c2 = await page.evaluate(() => ({ stored: Math.floor(citySiege.buildingManager.buildings.find(b => b.type === 'lumber_mill').stored), wood: citySiege.economyManager.wood }));
  check(c1.gained === 5000 && c2.wood === c1.wood && c2.stored < 100, 'a crash just after a collect neither loses the haul nor leaves it in the mill to collect again', { c1, c2 });

  await page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager, ui = citySiege.uiManager;
    e.cash = e.iron = e.wood = 1e6; e.save();
    ui.setScreen('HOME');
    ui.showBuildingInspector(bm.buildings.find(b => b.type === 'lumber_mill'));
  });
  await page.click('#btn-upgrade-building');
  const u1 = await page.evaluate(() => ({ spent: 1e6 - citySiege.economyManager.cash, to: citySiege.buildingManager.activeBuildTasks.map(t => t.targetLevel) }));
  await crashAfter();
  await boot();
  const u2 = await page.evaluate(() => ({ spent: 1e6 - citySiege.economyManager.cash, to: citySiege.buildingManager.activeBuildTasks.map(t => t.targetLevel) }));
  check(u1.spent > 0 && JSON.stringify(u1.to) === '[3]' && u2.spent === u1.spent && JSON.stringify(u2.to) === '[3]',
    'a crash just after paying for an upgrade keeps the job it paid for', { u1, u2 });
}

// ---------------------------------------------------------------- labour: every Labour Hut staffs one slot, up to the Town Hall's cap
{
  await buildCity(3, [['lumber_mill', -8, -8, 1]]);
  const lab = await page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager;
    e.cash = e.iron = e.wood = 1e6;
    const n = [bm.totalBuilders];
    const refused = bm.upgradeBuilding(bm.buildings.find(b => b.type === 'lumber_mill')).reason;
    [[4, -4], [-4, 4], [4, 8], [-4, -8]].forEach(([gx, gz]) => { bm.addBuilding('builder_hut', gx, gz, 1, { skipCapCheck: true }); n.push(bm.totalBuilders); });
    return { n, cap: bm.builderCap, refused };
  });
  check(JSON.stringify(lab.n) === JSON.stringify([0, 1, 2, 3, 3]) && lab.cap === 3 && lab.refused === 'NO_FREE_BUILDERS',
    'the first Labour Hut adds the first labour slot; huts past the Town Hall cap add none', lab);
}

// ---------------------------------------------------------------- stowing a busy Labour Hut reads as an overdraft, not "0 free"
{
  // Stowing a hut (or parking one with a layout template) while its job runs is allowed on
  // purpose - the job runs on its own deadline and finishes - but it leaves more jobs running
  // than the city has slots. The HUD used to call that "0 / 2 Labour Free" in red with three
  // construction hammers visibly working.
  const failed = await buildCity(3, [['lumber_mill', -8, -8, 1], ['iron_foundry', -8, -4, 1], ['petrol_pump', -8, 0, 1],
    ['cash_mint', 0, -8, 1], ['big_storage', 8, 0, 1], ['builder_hut', 4, -4], ['builder_hut', -4, 4], ['builder_hut', 4, 8]]);
  const over = await page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager, ui = citySiege.uiManager;
    e.cash = e.iron = e.wood = 1e7;
    ['lumber_mill', 'iron_foundry', 'petrol_pump'].forEach(t => bm.upgradeBuilding(bm.buildings.find(b => b.type === t)));
    const before = { total: bm.totalBuilders, busy: bm.busyBuilders, free: bm.freeBuilders };
    const stowed = bm.stowBuilding(bm.buildings.find(b => b.type === 'builder_hut'));
    ui.updateBuilderHUD();
    const hud = document.getElementById('builder-count').textContent;
    const after = { total: bm.totalBuilders, busy: bm.busyBuilders, free: bm.freeBuilders };
    const refused = bm.upgradeBuilding(bm.buildings.find(b => b.type === 'cash_mint')).reason;
    return { before, stowed, hud, after, refused };
  });
  check(failed.length === 0 && over.before.busy === 3 && over.before.total === 3 && over.stowed === true &&
    over.after.total === 2 && over.after.busy === 3 && over.after.free === 0 && /^3 working \/ 2 Labour/.test(over.hud) &&
    over.refused === 'NO_FREE_BUILDERS',
    'stowing a Labour Hut mid-job says "3 working / 2 Labour" instead of "0 / 2 Labour Free", and nothing new can start', over);
}

// ---------------------------------------------------------------- an unreadable eco save is parked in .bak before anything overwrites it
{
  const good = await page.evaluate(() => { citySiege.economyManager.save(); return localStorage.getItem('city_siege_eco'); });
  const corrupt = '{"cash": 99999, "iron": 5';
  await page.evaluate(corrupt => { localStorage.removeItem('city_siege_eco.bak'); localStorage.setItem('city_siege_eco', corrupt); Storage.prototype.setItem = () => {}; }, corrupt);
  await boot();
  const e1 = await page.evaluate(() => ({ bak: localStorage.getItem('city_siege_eco.bak'), cash: citySiege.economyManager.cash }));
  await page.evaluate(() => {
    const bm = citySiege.buildingManager, m = bm.buildings.find(b => b.produceType && !b.raidOnly);
    m.stored = 100; bm.collectBuilding(m);                                // the first write after boot
  });
  const e2 = await page.evaluate(() => ({ bak: localStorage.getItem('city_siege_eco.bak'), eco: (localStorage.getItem('city_siege_eco') || '').slice(0, 12) }));
  check(e1.bak === corrupt && e2.bak === corrupt && e2.eco.startsWith('{"v":'), 'an unreadable eco save survives the first save as city_siege_eco.bak', { e1, e2 });
  // A blocked READ is a different failure: there is no save and no .bak, so the log must say
  // storage is unavailable rather than name a backup it never wrote.
  const logged = [];
  const onConsole = (m) => { if (m.type() === 'error') logged.push(m.text()); };
  page.on('console', onConsole);
  const blocked = await page.evaluate(() => {
    window.__realGet = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) { if (k === 'city_siege_eco') throw new Error('blocked site data'); return window.__realGet.call(this, k); };
    localStorage.removeItem('city_siege_eco.bak');
    try { citySiege.economyManager.load(); } finally { Storage.prototype.getItem = window.__realGet; }
    return { bak: localStorage.getItem('city_siege_eco.bak') };
  });
  await page.waitForTimeout(200);
  page.off('console', onConsole);
  check(blocked.bak === null && logged.some(t => /localStorage is unavailable/.test(t) && /will not be saved/.test(t)) &&
    !logged.some(t => /was kept at city_siege_eco\.bak/.test(t)),
    'with storage blocked the economy says storage is unavailable, not that it kept a .bak it never wrote', { ...blocked, logged });
  // Put the real bank back for anything after this.
  await page.evaluate(good => { localStorage.removeItem('city_siege_eco.bak'); localStorage.setItem('city_siege_eco', good); Storage.prototype.setItem = () => {}; }, good);
  await boot();
}

// ---------------------------------------------------------------- a damaged city save cannot upgrade a gate or lose the gates / Town Hall
{
  await buildCity(3, [['lumber_mill', -8, -8, 1]]);
  const gi = await page.evaluate(() => {
    localStorage.removeItem('city_siege_city.bak');
    const raw = JSON.parse(localStorage.getItem('city_siege_city'));
    const i = raw.buildings.findIndex(b => b.gate);
    raw.tasks = [{ i, to: 2, endsAt: 1 }];                                 // no type: must not match the gate at that index
    localStorage.setItem('city_siege_city', JSON.stringify(raw));
    Storage.prototype.setItem = () => {};
    return i;
  });
  await boot();
  const gates = await page.evaluate(() => citySiege.buildingManager.getMainGates().map(g => ({ n: g.name, l: g.level || 1, busy: !!g.isUnderConstruction })));
  check(gi >= 0 && gates.length === 3 && gates.every(g => g.l === 1 && !g.busy), 'a saved job with no type cannot upgrade a Main Gate', { gi, gates });

  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('city_siege_city'));
    raw.buildings = [{ t: 'tree', gx: -10, gz: -3, l: 1, st: 0, rot: 0 }]; raw.tasks = [];
    localStorage.setItem('city_siege_city', JSON.stringify(raw));
    Storage.prototype.setItem = () => {};
  });
  await boot();
  const core = await page.evaluate(() => {
    const bm = citySiege.buildingManager;
    return { gates: bm.getMainGates().map(g => `${g.name}@${g.gx},${g.gz}`), halls: bm.buildings.filter(b => b.type === 'town_hall').map(b => b.level),
      toast: document.getElementById('ui-toast')?.textContent || '', saved: JSON.parse(localStorage.getItem('city_siege_city')).buildings.filter(b => b.gate || b.t === 'town_hall').length,
      bak: (JSON.parse(localStorage.getItem('city_siege_city.bak') || '{}').buildings || []).map(b => b.t) };
  });
  check(JSON.stringify(core.gates) === JSON.stringify(['North Gate@0,-15', 'East Gate@15,0', 'South Gate@0,15']) && JSON.stringify(core.halls) === '[1]' &&
    /missing North Gate, East Gate, South Gate, Town Hall - rebuilt/.test(core.toast) && core.saved === 4 && JSON.stringify(core.bak) === '["tree"]',
    'a city save with no gates or Town Hall is re-seeded with the 3 fixed gates and a Town Hall, saved at once, the damaged blob kept in .bak', core);
}

// ================================================================ turret balance, Drop Bomb, card and life prices
// ---------------------------------------------------------------- gunfire ignores the contact buffer; a second ram does not; a cruiser still busts
{
  await buildCity(3, [['lumber_mill', -8, -8, 1]]);
  await startRaid();
  const imm = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), v = citySiege.attackManager.vehicle;
    v.isInvulnerable = false; v.isAirborne = false; v.damageImmunityTimer = 0; v.contactImmunityTimer = 0;
    v.maxHp = v.hp = 1e6; v.shield = 0;
    const lost = () => 1e6 - v.hp;
    v.takeDamage(25, { contact: true });      // a ram into a spike trap
    const ram1 = lost();
    v.takeDamage(25, { contact: true });      // still grinding it this frame: buffered
    const ram2 = lost();
    v.takeDamage(300);                        // the turret shell right behind the ram: lands
    v.takeDamage(20);                         // and the tesla spark right after it: lands
    const rounds = lost();
    v.takeDamageUnconditional(40);            // a drone strafe: lands
    const strafe = lost();
    const buffer = +v.contactImmunityTimer.toFixed(2);
    // Hit feedback is throttled, damage never is: ten sparks in one frame flash once, and the
    // siege shell right after them still gets its own flash.
    const flash = v.onDamaged; let flashes = 0; v.onDamaged = () => { flashes++; };
    v.hitFeedbackTimer = 0; v.hitFeedbackAmount = 0;
    const hpBurst = v.hp;
    for (let i = 0; i < 10; i++) v.takeDamage(20);
    v.takeDamage(3000);
    const burst = { lost: Math.round(hpBurst - v.hp), flashes };
    v.onDamaged = flash;
    v.bust();                                 // a cruiser touching it inside that window
    return { ram1, ram2, rounds, strafe, buffer, want: P.RAIDER_BASE.contactImmunity, burst, busted: !!(v.isBusted && v.isCrashed) };
  });
  await endRaid();
  check(imm.ram1 === 25 && imm.ram2 === 25 && imm.rounds === 345 && imm.strafe === 385 && imm.buffer === imm.want && imm.busted,
    'rounds, sparks and strafes all land inside the contact buffer; a second ram in it does not; a cruiser contact still busts', imm);
  check(imm.burst.lost === 3200 && imm.burst.flashes === 2,
    'eleven hits in one frame all deal their damage; the hit flash / crash sound plays once for the sparks and again for the bigger shell', imm.burst);
}

// ---------------------------------------------------------------- live TH12 kill box: every shell lands, and it deals what the band model says
{
  // Every turret Town Hall 12 allows, at level 12, ringed 16-30 m around a parking spot (tile -7,0)
  // far from every gate gun, under two Solar Arrays, a Fusion Reactor and an Orbital Relay.
  const at = (dx, dz) => [-7 + dx, dz];
  const lim = await page.evaluate(async () => { const P = await import('/src/data/progression.js'); return Object.fromEntries(['sniper_tower', 'tesla_coil', 'missile_silo', 'laser_obelisk', 'plasma_mortar', 'doomsday_turret'].map(t => [t, P.limitFor(t, 12)])); });
  const gunSpots = [[3, 0], [-3, 0], [-2, 2], [2, -2], [5, 2], [5, -2], [-5, 2], [-5, -2], [2, 5], [-2, -5], [-2, 5], [2, -5], [5, 0], [-5, 0]];
  const guns = Object.entries(lim).flatMap(([t, n]) => Array.from({ length: n }, () => t));
  // Teslas (shortest reach) closest in; the rest in order.
  guns.sort((a, b) => (b === 'tesla_coil') - (a === 'tesla_coil'));
  const list = guns.map((t, i) => [t, ...at(...gunSpots[i]), 12]);
  list.push(['solar_array', ...at(0, 3), 12], ['solar_array', ...at(0, -3), 12], ['fusion_reactor', ...at(2, 2), 12], ['orbital_relay', ...at(-2, -2), 12], ['vehicle_lab', 8, -8, 12]);
  const failed = await buildCity(12, list);
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 12; g._commit(); });
  await startRaid();
  const box = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, v = am.vehicle, ts = am.turrets;
    const px = -7 * 5.5, pz = 0;
    v.position.set(px, 0, pz); v.mesh.position.set(px, 0, pz); v.heading = Math.PI / 2; v.speed = 0; v.inputs.forward = false;
    const ehp = v.hp + v.shield;
    v.isInvulnerable = false; v.isAirborne = false; v.damageImmunityTimer = 0;
    v.contactImmunityTimer = 1e9;           // a contact buffer running the whole time: gunfire must ignore it
    v.maxHp = v.hp = 1e7; v.shield = 0; v.fireCooldown = 1e9;   // immortal, and its own gun holds fire
    const guns = ts.turrets.filter(t => t.type !== 'gate');
    const want = P.turretAuraMultipliers([{ type: 'solar_array', level: 12 }, { type: 'fusion_reactor', level: 12 }, { type: 'orbital_relay', level: 12 }]);
    const layout = guns.map(t => {
      const d = Math.hypot(t.pos.x - px, t.pos.z - pz), s = P.turretStatsFor(t.type, 12);
      return { t: t.type, d: +d.toFixed(1), inBand: d <= t.range && d >= (t.minRange || 0), buffed: Math.abs(t.damage - s.damage * want.damage) < 1e-6 && Math.abs(t.fireInterval - s.fireInterval / want.rate) < 1e-6 };
    });
    const gatesInRange = ts.turrets.filter(t => t.type === 'gate' && t.pos.distanceTo(v.position) <= t.range).length;
    // Count what every gun fires and what lands (each type's L12 boosted damage is distinct).
    // Rounds already in the air were fired at the gate before counting began (the guns start on
    // a random reload, and an L12 silo reaches the gate): a homing one followed the buggy here
    // and landed uncounted-as-fired in about one raid in six. Drop them so both counts cover
    // exactly the same shots.
    while (ts.projectiles.length) ts.removeProjectile(0);
    const fired = {}, landed = {}, byDamage = {};
    guns.forEach(t => { byDamage[t.damage] = t.type; });
    const fb = ts.fireBullet.bind(ts), fbeam = ts.fireBeam.bind(ts), td = v.takeDamage.bind(v);
    ts.fireBullet = (a, b, c, type, tur) => { fired[type] = (fired[type] || 0) + 1; return fb(a, b, c, type, tur); };
    ts.fireBeam = (tur, pl) => { fired[tur.type] = (fired[tur.type] || 0) + 1; return fbeam(tur, pl); };
    let total = 0, doomHit = 0;
    v.takeDamage = (amt, o) => { const k = byDamage[amt] || 'other'; landed[k] = (landed[k] || 0) + 1; total += amt; if (k === 'doomsday_turret') doomHit += amt; return td(amt, o); };
    const doom = guns.find(t => t.type === 'doomsday_turret'); doom.cooldown = 0.5;   // one siege shell inside the window
    let gameT = 0; const tu = ts.update.bind(ts); ts.update = (dt, pl) => { gameT += dt; return tu(dt, pl); };
    const W = 12;
    while (gameT < W) await new Promise(r => setTimeout(r, 50));
    const window = { total, doomHit, gameT };
    ts.turrets.forEach(t => { t.cooldown = 1e9; });              // cease fire, let every round in the air arrive
    for (let i = 0; i < 100 && ts.projectiles.length; i++) await new Promise(r => setTimeout(r, 50));
    ts.fireBullet = fb; ts.fireBeam = fbeam; v.takeDamage = td; ts.update = tu;
    const nonDoomModel = guns.filter(t => t.type !== 'doomsday_turret').reduce((s, t) => s + t.damage / t.fireInterval, 0);
    const doomAvg = doom.damage / doom.fireInterval;
    const liveNonDoom = (window.total - window.doomHit) / window.gameT;
    return { ehp, ehpWant: P.raiderMaxEhpAt(12), layout, gatesInRange, fired, landed, inFlight: ts.projectiles.length,
      doomShell: window.doomHit, doomDamage: doom.damage, liveNonDoom: Math.round(liveNonDoom), modelNonDoom: Math.round(nonDoomModel),
      modelKill: +P.parkedKillSecondsAt(12, 0).toFixed(2), liveKill: +(P.raiderMaxEhpAt(12) / (liveNonDoom + doomAvg)).toFixed(2), band: P.KILL_BAND };
  });
  await endRaid();
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 0; g._commit(); });
  await shot('smoke-11-th12-kill-box');
  const allLanded = Object.keys(box.fired).every(k => box.fired[k] === box.landed[k]) && !box.landed.other && box.inFlight === 0;
  check(failed.length === 0 && box.layout.every(g => g.inBand && g.buffed) && box.gatesInRange === 0 && box.ehp === box.ehpWant,
    'TH12 kill box laid out: every allowed gun at L12 reaches the parked buggy under every aura, no gate gun does; the buggy is TH12-tuned', { failed, layout: box.layout, gatesInRange: box.gatesInRange, ehp: box.ehp });
  check(allLanded && box.fired.tesla_coil >= 20 && box.fired.doomsday_turret === 1 && box.doomShell === box.doomDamage,
    'every shell the TH12 kill box fires at a parked buggy lands - the Doomsday shell too, among Tesla sparks, with a contact buffer running', { fired: box.fired, landed: box.landed });
  check(box.liveNonDoom <= box.modelNonDoom * 1.02 && box.liveNonDoom >= box.modelNonDoom * 0.75 && box.liveKill >= box.band.min && box.modelKill >= box.band.min,
    `live TH12 kill box: ${box.liveNonDoom} DPS vs ${box.modelNonDoom} modelled (no reload jitter); a parked TH12-tuned buggy lasts ${box.liveKill}s live, ${box.modelKill}s modelled (band ${box.band.min}-${box.band.max}s)`,
    { liveNonDoom: box.liveNonDoom, modelNonDoom: box.modelNonDoom, liveKill: box.liveKill, modelKill: box.modelKill });
}

// ---------------------------------------------------------------- the Drop Bomb falls off against buildings like every other blast
{
  // Three L12 mills: one under the bomb, one 11 m out, one 23 m out (beyond a level-5 bomb's 17 m).
  const failed = await buildCity(12, [['lumber_mill', -8, 0, 12], ['lumber_mill', -6, 0, 12], ['lumber_mill', -5, -3, 12]]);
  await page.evaluate(() => {
    const g = citySiege.garageManager;
    g.state.cards.bomb = { unlocked: true, level: 5 }; g.state.loadout = ['bomb', 'nitro', 'missiles']; g._commit();
  });
  await startRaid();
  const bomb = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, bm = citySiege.buildingManager, cs = am.cards;
    am.vehicle.isInvulnerable = true;
    const mills = bm.buildings.filter(b => b.type === 'lumber_mill');
    const hp0 = mills.map(m => m.hp);
    const card = cs.cards.find(c => c.id === 'bomb');
    cs._spawnBomb(card);
    const b = cs.droppedBombs[cs.droppedBombs.length - 1];
    b.pos.set(mills[0].mesh.position.x, 0.4, mills[0].mesh.position.z);   // drop it on the first mill
    for (let i = 0; i < 100 && cs.droppedBombs.includes(b); i++) await new Promise(r => setTimeout(r, 50));
    const blast = { radius: b.radius, damage: b.damage };
    return mills.map((m, i) => {
      const d = Math.hypot(m.mesh.position.x - b.pos.x, m.mesh.position.z - b.pos.z);
      return { d: +d.toFixed(1), lost: Math.round(hp0[i] - m.hp), want: P.blastDamageAt(blast, d) };
    }).concat([{ radius: b.radius, damage: b.damage, tier: P.cardStatsFor('bomb', 5) }]);
  });
  await endRaid();
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.loadout = ['jump', 'missiles', 'nitro']; g._commit(); });
  const [under, near, far, meta] = bomb;
  check(failed.length === 0 && meta.radius === meta.tier.blastRadius && meta.damage === meta.tier.blastDamage &&
    under.lost === meta.damage && near.lost === near.want && near.lost < meta.damage && far.d > meta.radius && far.lost === 0,
    `a level-5 Drop Bomb (${meta.radius} m, ${meta.damage}) hits the building under it in full, one ${near.d} m out for ${near.lost} (blastDamageAt), none beyond its radius`, bomb);
}

// ---------------------------------------------------------------- card levels and spare lives are priced by progression and grow with the Town Hall
{
  await buildCity(5, [['vehicle_lab', -8, 8, 5], ['tech_lab', 8, -8, 2]]);
  const price = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), g = citySiege.garageManager, e = citySiege.economyManager, ui = citySiege.uiManager;
    g.state.cards.jump = { unlocked: true, level: 3 }; g._commit();
    e.cash = e.iron = e.wood = 1e7; e.vehicleLives = 0; e.save();
    const cost4 = g.getCardCost('jump');
    ui.openGarage('cards');
    await new Promise(r => setTimeout(r, 200));
    const cardText = document.querySelector('#garage-view .garage-card.card-jump')?.innerText || '';
    const before = { cash: e.cash, iron: e.iron, wood: e.wood };
    const r = g.buyCard('jump');
    const paid = { cash: before.cash - e.cash, iron: before.iron - e.iron, wood: before.wood - e.wood };
    ui.garageTab = 'lab'; ui.renderGarage();
    await new Promise(r => setTimeout(r, 100));
    const lifeBtn = document.getElementById('btn-garage-buy-life')?.innerText || '';
    const b2 = e.cash; const lr = e.buyVehicleLife(citySiege.buildingManager.getTownHallLevel());
    const lifePaid = b2 - e.cash;
    ui.setScreen('HOME');
    return { cost4, want4: P.cardLevelCostFor(4), flat4: { cash: 2200 }, cardText, bought: r.ok && r.level === 4, paid,
      life5: P.spareLifeCostFor(5), life12: P.spareLifeCostFor(12), life1: P.spareLifeCostFor(1), lifeBtn, lifeOk: lr.ok, lifePaid };
  });
  const n = (v) => v.toLocaleString('en-US');
  check(JSON.stringify(price.cost4) === JSON.stringify(price.want4) && price.bought && JSON.stringify(price.paid) === JSON.stringify(price.want4) &&
    price.cardText.includes(n(price.want4.cash)) && price.want4.cash > 3 * price.flat4.cash,
    `card level 4 costs progression.cardLevelCostFor(4) = ${n(price.want4.cash)} cash (a Town Hall 5 price, was a flat 2,200), shown in the garage and charged`, { cost4: price.cost4, paid: price.paid });
  check(price.lifeOk && price.lifePaid === price.life5.cash && price.lifeBtn.includes(n(price.life5.cash)) && price.life12.cash > 100 * price.life1.cash,
    `a spare life costs ${n(price.life5.cash)} cash at Town Hall 5 and ${n(price.life12.cash)} at Town Hall 12 (was a flat 400)`, { lifeBtn: price.lifeBtn, lifePaid: price.lifePaid });
  await page.evaluate(() => { const g = citySiege.garageManager, e = citySiege.economyManager; g.state.cards.jump = { unlocked: true, level: 1 }; g._commit(); e.vehicleLives = 0; e.save(); });
}

// ---------------------------------------------------------------- a drone's strafe hits as hard as its hangar's level, and lands inside the contact buffer
{
  await buildCity(12, [['drone_hangar', -8, -8, 12]]);
  await startRaid();
  const drone = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, v = am.vehicle;
    const d = am.police.policeUnits.find(u => u.kind === 'drone');
    v.isInvulnerable = false; v.damageImmunityTimer = 0; v.contactImmunityTimer = 5; v.maxHp = v.hp = 1e6; v.shield = 0;
    v.isAirborne = true; v.verticalY = 4;                     // mid-jump: only a drone can reach it
    d.position.set(v.position.x, 0, v.position.z); d.ramCooldown = 0;
    const hp0 = v.hp;
    for (let i = 0; i < 40 && v.hp === hp0; i++) await new Promise(r => setTimeout(r, 25));
    return { unitStrafe: d.strafeDamage, want12: P.pursuitUnitFor('drone_hangar', 12).strafeDamage, want1: P.pursuitUnitFor('drone_hangar', 1).strafeDamage, lost: Math.round(hp0 - v.hp) };
  });
  await endRaid();
  check(drone.unitStrafe === drone.want12 && drone.want12 > drone.want1 && drone.lost === drone.want12,
    `a level-12 hangar's drone strafes for ${drone.want12} (level 1: ${drone.want1}), and hits an airborne buggy inside the contact buffer`, drone);
}

// ---------------------------------------------------------------- trees and Labour Huts have no levels; a hut job saved before that is refunded
{
  await buildCity(3, [['tree', -10, -3, 1], ['builder_hut', 4, -4, 1], ['builder_hut', -4, 4, 1]]);
  const fixed = await page.evaluate(() => {
    const bm = citySiege.buildingManager, ui = citySiege.uiManager, e = citySiege.economyManager;
    e.cash = e.iron = e.wood = 1e6;
    const hut = bm.buildings.find(b => b.type === 'builder_hut'), tree = bm.buildings.find(b => b.type === 'tree');
    const r = { hut: bm.upgradeBuilding(hut).reason, tree: bm.upgradeBuilding(tree).reason };
    ui.showBuildingInspector(hut);
    const insp = { note: !!document.getElementById('inspector-fixed-note'), upgradeBtn: !!document.getElementById('btn-upgrade-building') };
    ui.hideBuildingInspector();
    return { r, insp };
  });
  check(fixed.r.hut === 'NOT_UPGRADEABLE' && fixed.r.tree === 'NOT_UPGRADEABLE' && fixed.insp.note && !fixed.insp.upgradeBtn,
    'a Labour Hut or tree cannot be upgraded, and the inspector offers no upgrade', fixed);
  // A save from before huts lost their levels, with a hut upgrade still running.
  const legacy = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js');
    citySiege.saveCityNow();
    const raw = JSON.parse(localStorage.getItem('city_siege_city'));
    const i = raw.buildings.findIndex(b => b.t === 'builder_hut');
    raw.tasks = [{ i, t: 'builder_hut', gx: raw.buildings[i].gx, gz: raw.buildings[i].gz, to: 2, endsAt: Date.now() + 3600e3, total: 3600 }];
    localStorage.setItem('city_siege_city', JSON.stringify(raw));
    const eco = JSON.parse(localStorage.getItem('city_siege_eco')); eco.cash = 1000; eco.iron = 1000; eco.wood = 1000;
    localStorage.setItem('city_siege_eco', JSON.stringify(eco));
    Storage.prototype.setItem = () => {};
    return P.costForLevel('builder_hut', 2);
  });
  await boot();
  const after = await page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager;
    return { huts: bm.buildings.filter(b => b.type === 'builder_hut').map(b => ({ l: b.level, busy: !!b.isUnderConstruction })),
      bank: { cash: e.cash, iron: e.iron, wood: e.wood }, toast: document.getElementById('ui-toast')?.textContent || '' };
  });
  check(after.huts.every(h => h.l === 1 && !h.busy) && after.bank.cash === 1000 + legacy.cash && after.bank.iron === 1000 + legacy.iron && after.bank.wood === 1000 + legacy.wood &&
    /refunded/.test(after.toast), 'a saved Labour Hut upgrade from before huts lost their levels is refunded, not run or silently dropped', { legacy, after });
  // The refund is written to the economy save at once, so the city save must lose the job at
  // once too: a tab that dies before its next city save used to boot the job and pay it again.
  const disk = await page.evaluate(() => ({ tasks: (JSON.parse(localStorage.getItem('city_siege_city')).tasks || []).length,
    ecoCash: JSON.parse(localStorage.getItem('city_siege_eco')).cash }));
  await page.evaluate(() => { Storage.prototype.setItem = () => {}; });   // the tab dies: nothing is saved on the way out
  await boot();
  const again = await page.evaluate(() => ({ cash: citySiege.economyManager.cash, toast: document.getElementById('ui-toast')?.textContent || '' }));
  check(disk.tasks === 0 && disk.ecoCash === after.bank.cash && again.cash === after.bank.cash && !/upgrades? w(as|ere) refunded/.test(again.toast),
    'the refunded hut job leaves the city save at boot: a crash straight after does not pay it twice', { disk, again, was: after.bank.cash });
}

// ---------------------------------------------------------------- every SWAT unit keeps pace with a buggy tuned to the same Town Hall
{
  await buildCity(6, [['swat_armory', -8, -8, 6], ['swat_armory', 8, -8, 6], ['swat_armory', -8, 8, 6], ['vehicle_lab', 8, 8, 6]]);
  await page.evaluate(async () => { const P = await import('/src/data/progression.js'), g = citySiege.garageManager; g.state.tracks.speed = P.trackCapFor(6); g._commit(); });
  const rolls = [];
  let buggy = 0;
  for (let k = 0; k < 3; k++) {
    await startRaid();
    const s = await page.evaluate(() => { const am = citySiege.attackManager; return { buggy: am.vehicle.maxForwardSpeed, swat: am.police.policeUnits.filter(u => u.kind === 'swat').map(u => +u.maxSpeed.toFixed(2)) }; });
    buggy = s.buggy; rolls.push(...s.swat);
    await endRaid();
  }
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.speed = 0; g._commit(); });
  check(rolls.length === 9 && rolls.every(v => v >= buggy - 1e-6), `all 9 level-6 SWAT rolls are at least as fast as a TH6-tuned buggy (${buggy.toFixed(1)} m/s)`, { buggy, rolls });
}

// ---------------------------------------------------------------- a stack of landmines goes off one at a time
{
  // Three L6 mines on adjacent tiles in a row along the drive line. Every one of them used to go
  // off in the same frame (960 x 2 already wrecked a TH6-tuned buggy); now the first fires and the
  // other two hold, buried and armed, for MINE_STACK_WINDOW - by which time the buggy is past them.
  // (The spent mine used to leave rubble that pinned a buggy driving straight down the row.)
  const failed = await buildCity(6, [['landmine', -8, 6, 6], ['landmine', -8, 7, 6], ['landmine', -8, 8, 6], ['vehicle_lab', 8, -8, 6]]);
  await page.evaluate(async () => { const P = await import('/src/data/progression.js'), g = citySiege.garageManager; g.state.tracks.armor = P.trackCapFor(6); g._commit(); });
  await startRaid();
  await place(-44, -8, 0, { isInvulnerable: false, damageImmunityTimer: 0 });   // a 30 m run-up to the first mine's reach
  const stack = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, v = am.vehicle, traps = am.traps;
    const mines = citySiege.buildingManager.buildings.filter(b => b.type === 'landmine');
    const pre = { ehp: v.hp + v.shield, want: P.raiderMaxEhpAt(6), mine: P.trapStatsFor('landmine', 6).damage, window: P.MINE_STACK_WINDOW };
    let gameT = 0; const blasts = [];
    const tu = traps.update.bind(traps), tr = traps._trigger.bind(traps);
    traps.update = (dt, pl) => { gameT += dt; return tu(dt, pl); };
    traps._trigger = (trap, pl) => { blasts.push(+gameT.toFixed(2)); return tr(trap, pl); };
    v.inputs.forward = true;
    while (v.position.z < 70 && !v.isCrashed && gameT < 10) await new Promise(r => setTimeout(r, 30));
    v.inputs.forward = false;
    traps.update = tu; traps._trigger = tr;
    return { ...pre, blasts, crashed: v.isCrashed, lost: Math.round(pre.ehp - (v.hp + v.shield)), z: +v.position.z.toFixed(1),
      armed: mines.filter(m => !m.trapSpent).length, buried: mines.filter(m => !m.trapSpent && !m.mesh.visible).length, rubble: mines.filter(m => m.rubbleMesh).length };
  });
  await endRaid();
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 0; g._commit(); });
  check(failed.length === 0 && stack.ehp === stack.want && !stack.crashed && stack.z >= 70 && stack.blasts.length === 1 && stack.lost === stack.mine && stack.armed === 2 && stack.buried === 2 && stack.rubble === 0,
    `three L6 landmines on adjacent tiles cost a TH6-tuned buggy driving over them one blast (${stack.mine}), not three; the other two stay buried and armed, and the spent one leaves no rubble to pin the buggy`, stack);
}

// ---------------------------------------------------------------- a Missile Silo's rounds find a buggy that never stops
{
  // An L5 silo at (-33, 0). Its missiles used to lose speed on every turn, and a buggy holding W+A
  // in its own turning circle took 1 hit in 13. Now every round keeps homing.speed and steers to
  // meet the buggy - circling, or crossing the silo's field of fire at full speed.
  const failed = await buildCity(5, [['missile_silo', -6, 0, 5]]);
  await startRaid();
  const fly = (mode) => page.evaluate(async (mode) => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, v = am.vehicle, ts = am.turrets;
    const silo = ts.turrets.find(t => t.type === 'missile_silo'), H = P.BUILDING_DEFS.missile_silo.turret.homing;
    if (mode === 'circle') { v.position.set(2, 0, 0); v.heading = 0; v.speed = 0; }
    else { v.position.set(0, 0, -45); v.heading = 0; v.speed = v.maxForwardSpeed * 0.75; }
    v.verticalY = 0; v.velocityY = 0; v.isAirborne = false; v.isInvulnerable = false; v.damageImmunityTimer = 0;
    v.maxHp = v.hp = 1e7; v.shield = 0; v.fireCooldown = 1e9;   // immortal, and its own gun holds fire
    v.inputs.forward = true; v.inputs.left = mode === 'circle';
    // Hits are counted by ROUND ID, not by matching the damage amount: any other hit worth
    // exactly silo.damage used to be counted as a missile, and this check once read 3 hits from
    // 2 missiles. `sameAmount` keeps the old tally so a mismatch shows up in the failure blob.
    let gameT = 0, fired = 0, sameAmount = 0, bled = 0, minD = 1e9, maxD = 0, topSpeed = 0;
    const landed = new Set();
    const tu = ts.update.bind(ts), fb = ts.fireBullet.bind(ts), td = v.takeDamage;
    ts.update = (dt, pl) => { gameT += dt; return tu(dt, pl); };
    ts.fireBullet = (a, b, c, type, tur) => { if (type === 'missile_silo') fired++; return fb(a, b, c, type, tur); };
    v.takeDamage = function (amt, o) {
      if (o && o.type === 'missile_silo' && o.round !== undefined) landed.add(o.round);
      if (amt === silo.damage) sameAmount++;
      return td.call(this, amt, o);
    };
    const volley = mode === 'circle' ? 20 : 3.5;
    silo.cooldown = 0;
    let forced = mode !== 'pass';
    while (gameT < volley + 3 && (gameT < volley || ts.projectiles.some(p => p.type === 'missile_silo'))) {
      if (gameT >= volley) silo.cooldown = 1e9;                     // cease fire; let the last ones arrive
      if (!forced && gameT >= 1.6) { silo.cooldown = 0; forced = true; }   // a second missile mid-pass
      ts.projectiles.forEach(p => { if (p.type === 'missile_silo' && Math.abs(p.velocity.length() - H.speed) > 1e-6) bled++; });
      const d = Math.hypot(v.position.x - silo.pos.x, v.position.z - silo.pos.z);
      minD = Math.min(minD, d); maxD = Math.max(maxD, d); topSpeed = Math.max(topSpeed, Math.abs(v.speed));
      await new Promise(r => setTimeout(r, 30));
    }
    v.inputs.forward = v.inputs.left = false;
    ts.update = tu; ts.fireBullet = fb; delete v.takeDamage;
    return { fired, hits: landed.size, sameAmount, inFlight: ts.projectiles.filter(p => p.type === 'missile_silo').length, bled, speed: H.speed,
      buggySpeed: +topSpeed.toFixed(1), fromSilo: [+minD.toFixed(1), +maxD.toFixed(1)], range: +silo.range.toFixed(1) };
  }, mode);
  const circle = await fly('circle');
  const pass = await fly('pass');
  await endRaid();
  check(failed.length === 0 && circle.fired >= 5 && circle.inFlight === 0 && circle.hits >= Math.ceil(0.85 * circle.fired) && !circle.bled && circle.buggySpeed >= 20,
    `an L5 Missile Silo hits a buggy driving its own turning circle (${circle.hits}/${circle.fired}; it was 1/13), and no missile loses speed`, circle);
  check(pass.fired === 2 && pass.inFlight === 0 && pass.hits === 2 && !pass.bled,
    'an L5 Missile Silo hits a buggy crossing its field of fire at full speed with both missiles', pass);
}

// ---------------------------------------------------------------- a Solar Array's speed-up reaches the real cadence
{
  // Four L12 Tesla Coils ringed 37 m round a parked buggy; an L12 Solar Array covers two of them.
  // The reload jitter used to be a flat 0.4 s the aura did not scale, so the covered pair fired
  // ~30% faster, not the promised 48%. Measured from shot times, not the interval field.
  const failed = await buildCity(12, [['tesla_coil', -13, -3, 12], ['tesla_coil', -13, 3, 12], ['solar_array', -13, 0, 12],
    ['tesla_coil', -1, -3, 12], ['tesla_coil', -1, 3, 12]]);
  await startRaid();
  const cad = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, v = am.vehicle, ts = am.turrets;
    v.position.set(-7 * 5.5, 0, 0); v.speed = 0; v.inputs.forward = false; v.isAirborne = false;
    v.isInvulnerable = false; v.damageImmunityTimer = 0; v.maxHp = v.hp = 1e7; v.shield = 0; v.fireCooldown = 1e9;
    const guns = ts.turrets.filter(t => t.type === 'tesla_coil');
    const shots = new Map(guns.map(t => [t, []]));
    let gameT = 0;
    const tu = ts.update.bind(ts), fb = ts.fireBullet.bind(ts);
    ts.update = (dt, pl) => { gameT += dt; return tu(dt, pl); };
    ts.fireBullet = (a, b, c, type, tur) => { if (shots.has(tur)) shots.get(tur).push(gameT); return fb(a, b, c, type, tur); };
    while (gameT < 18) await new Promise(r => setTimeout(r, 50));
    ts.update = tu; ts.fireBullet = fb;
    const group = (buffed) => {
      const g = guns.filter(t => t.buffed === buffed), iv = [];
      g.forEach(t => { const s = shots.get(t); for (let i = 1; i < s.length; i++) iv.push(s[i] - s[i - 1]); });
      return { guns: g.length, shots: iv.length, nominal: +g[0].fireInterval.toFixed(3), measured: +(iv.reduce((a, b) => a + b, 0) / iv.length).toFixed(3) };
    };
    return { covered: group(true), bare: group(false), promised: +(1 + P.auraBonusFor('solar_array', 12)).toFixed(2), jitter: P.TURRET_RELOAD_JITTER };
  });
  await endRaid();
  const real = cad.bare.measured / cad.covered.measured;
  const inBand = (g) => g.measured >= g.nominal * 0.99 && g.measured <= g.nominal * (1 + cad.jitter) * 1.01;
  check(failed.length === 0 && cad.covered.guns === 2 && cad.bare.guns === 2 && cad.covered.shots >= 40 && Math.abs(real - cad.promised) <= 0.04 && inBand(cad.covered) && inBand(cad.bare),
    `an L12 Solar Array really speeds its Tesla Coils up by +${Math.round((real - 1) * 100)}% (promised +${Math.round((cad.promised - 1) * 100)}%), counted from shots fired`, { ...cad, real: +real.toFixed(3) });
}

// ---------------------------------------------------------------- autocannon shells do not outlive the raid
{
  await buildCity(3, []);
  await startRaid();
  const fired = await page.evaluate(() => { const v = citySiege.attackManager.vehicle; v.fireCannons(); v.fireCannons(); return v.projectiles.length; });
  await endRaid();
  const left = await page.evaluate(() => { const v = citySiege.attackManager.vehicle; return { shells: v.projectiles.length, meshes: v.projectilesGroup.children.length }; });
  await startRaid();
  const next = await page.evaluate(() => citySiege.attackManager.vehicle.projectiles.length);
  await endRaid();
  check(fired === 4 && left.shells === 0 && left.meshes === 0 && next === 0,
    'autocannon shells in flight when a raid ends are cleared, not left frozen over the city to land in the next raid', { fired, left, next });
}

// ================================================================ nitro cap, missiles vs police roadblocks, card tooltips, chain loot, mine crater
// ---------------------------------------------------------------- a maxed Nitro Surge tapped the moment it recharges burns at most half the raid
{
  // Town Hall 5, Tech Lab 2, nitro and cloak at card level 5 - the reviewer's probe. The level-5
  // burn (7.5 s) used to outlast its 4.7 s recharge, so tapping on every recharge kept the buggy
  // on nitro for 100% of the raid. Counted in game time over whole burn cycles.
  const failed = await buildCity(5, [['tech_lab', -8, -8, 2], ['vehicle_lab', 8, -8, 5]]);
  await page.evaluate(() => {
    const g = citySiege.garageManager;
    g.state.cards.nitro = { unlocked: true, level: 5 }; g.state.cards.invisibility = { unlocked: true, level: 5 };
    g.state.loadout = ['nitro', 'invisibility', 'missiles']; g._commit();
  });
  await startRaid();
  await place(-60, 50, 0, { isInvulnerable: true });
  const tips = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager;
    const want = (id) => P.cardStatsFor(id, 5, { techLevel: citySiege.garageManager.getTechLabLevel() });
    const tip = (id) => document.getElementById(`card-${id}`)?.title || '';
    return { nitro: tip('nitro'), inv: tip('invisibility'), missiles: tip('missiles'), wantNitro: want('nitro'), wantInv: want('invisibility'),
      playsNitro: (({ cooldown, duration }) => ({ cooldown, duration }))(am.cards.cards.find(c => c.id === 'nitro')), missileDmg: am.cards.cards.find(c => c.id === 'missiles').damage };
  });
  check(tips.nitro.includes(`for ${tips.wantNitro.duration}s`) && tips.inv.includes(`for ${tips.wantInv.duration}s`) && tips.missiles.includes(`${tips.missileDmg} dmg`) &&
    !/3\.5 seconds|for 5s\b/.test(tips.nitro + tips.inv),
    `raid deck tooltips show the level-5 burn (${tips.wantNitro.duration}s) and cloak (${tips.wantInv.duration}s), not the level-1 3.5 s / 5 s`, { nitro: tips.nitro, inv: tips.inv });
  const burn = await page.evaluate(async (secs) => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, v = am.vehicle, cs = am.cards;
    const px = v.position.x, pz = v.position.z;
    const log = { t: 0, taps: [], on: [] };
    v.update = function (dt, ...rest) {
      const r = Object.getPrototypeOf(this).update.call(this, dt, ...rest);
      this.position.x = px; this.position.z = pz;
      if (cs.canUse('nitro') && cs.activateCard('nitro')) log.taps.push(log.t);   // tap on every recharge
      log.on.push([log.t, dt, this.isNitro]);
      log.t += dt;
      return r;
    };
    while (log.t < secs) await new Promise(res => setTimeout(res, 100));
    delete v.update;
    const t0 = log.taps[0], t1 = log.taps[log.taps.length - 1];
    const on = log.on.filter(([t, , n]) => n && t >= t0 && t < t1).reduce((s, [, dt]) => s + dt, 0);
    return { taps: log.taps.length, share: +(on / (t1 - t0)).toFixed(3), cycle: +((t1 - t0) / (log.taps.length - 1)).toFixed(2), cap: P.CARD_UPTIME_CAP.nitro };
  }, 2 * tips.wantNitro.cooldown + 1);
  await endRaid();
  await page.evaluate(() => {
    const g = citySiege.garageManager;
    g.state.cards.nitro = { unlocked: true, level: 1 }; g.state.cards.invisibility = { unlocked: false, level: 0 }; g.state.loadout = ['jump', 'missiles', 'nitro']; g._commit();
  });
  check(failed.length === 0 && JSON.stringify(tips.playsNitro) === JSON.stringify({ cooldown: tips.wantNitro.cooldown, duration: tips.wantNitro.duration }) &&
    burn.taps >= 3 && burn.share <= burn.cap + 0.02 && burn.share >= burn.cap - 0.05,
    `a level-5 nitro (Tech Lab 2) tapped on every recharge burns ${Math.round(burn.share * 100)}% of the raid (cap ${burn.cap * 100}%), not 100%`, { ...burn, plays: tips.playsNitro });
}

// ---------------------------------------------------------------- Twin Missiles blast the roadblocks cruisers drop
{
  // The copy promises "rockets that blast roadblocks & cruisers"; the missiles used to fly
  // straight through the blocks PoliceManager drops in a chase (only built ones were hit).
  await buildCity(3, []);
  await startRaid();
  const rb = await page.evaluate(async () => {
    const am = citySiege.attackManager, v = am.vehicle, pm = am.police, cs = am.cards;
    v.isInvulnerable = true; v.speed = 0; v.inputs.forward = false; v.fireCooldown = 1e9;   // its autocannon holds fire
    v.position.set(-40, 0, -40); v.heading = 0; v.mesh.position.copy(v.position);
    const card = cs.cards.find(c => c.id === 'missiles');
    const volley = async (hp) => {
      pm.dropRoadblock(-40, -25, Math.PI / 2);                  // 15 m ahead of the buggy
      const block = pm.roadblocks[pm.roadblocks.length - 1];
      if (hp) block.hp = hp;
      const hp0 = block.hp;
      cs._fireMissiles(card);
      for (let i = 0; i < 60 && cs.activeMissiles.length; i++) await new Promise(r => setTimeout(r, 50));
      return { hp0, hp: block.hp, destroyed: block.isDestroyed, inList: pm.roadblocks.includes(block), onMap: !!block.mesh.parent };
    };
    const police = await volley(0);          // a stock 600 HP police block
    const tough = await volley(5000);        // to read each rocket's damage off
    pm.roadblocks.slice().forEach(b => pm.breakRoadblock(b));
    return { police, tough, damage: card.damage };
  });
  await endRaid();
  check(rb.police.destroyed && !rb.police.inList && !rb.police.onMap && rb.tough.hp === rb.tough.hp0 - 2 * rb.damage,
    `a Twin Missiles volley breaks a ${rb.police.hp0} HP police roadblock (each rocket lands ${rb.damage}), not flying through it`, rb);
}

// ---------------------------------------------------------------- an explosive set off by another pays a share of its loot
{
  const failed = await buildCity(12, [['petrol_pump', -10, -8, 5], ['petrol_pump', -8, -8, 5]]);
  await startRaid();
  await place(0, -100, Math.PI, { isInvulnerable: true });   // outside the wall, facing away
  const chainLoot = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, bm = citySiege.buildingManager;
    const [a, b] = bm.buildings.filter(x => x.type === 'petrol_pump');
    const before = { ...am.destruction.lootedResources };
    am.destruction.damageBuilding(a, 1e9, bm.buildings, am.police);   // the raider razes one; its blast sets off the other
    const got = Object.fromEntries(Object.keys(before).map(k => [k, am.destruction.lootedResources[k] - before[k]]));
    const full = P.lootFor('petrol_pump', 5), chained = P.lootFor('petrol_pump', 5, { chained: true });
    return { both: a.isDestroyed && b.isDestroyed, got, want: { cash: full.cash + chained.cash, iron: full.iron + chained.iron, wood: full.wood + chained.wood }, full, share: P.CHAIN_LOOT_SHARE };
  });
  await endRaid();
  check(failed.length === 0 && chainLoot.both && JSON.stringify(chainLoot.got) === JSON.stringify(chainLoot.want) && chainLoot.got.cash < 2 * chainLoot.full.cash,
    `razing one L5 pump pays its full loot, and the pump its blast sets off only ${chainLoot.share * 100}% of its own`, chainLoot);
}

// ---------------------------------------------------------------- one chain reaction is one explosion, and what its blasts raze pays a share
{
  // A reactor and the collider it sets off, 22 m apart on the gate-free west side; a mill 24.6 m
  // from both and a Labour Hut 15.6 m from both. Summed, the two blasts (1366 + 2743) razed the
  // 3173 HP mill; one chain now lands only the harder blast on it, with blastDamageAt falloff.
  const failed = await buildCity(12, [['fusion_reactor', -12, -2, 12], ['antimatter_collider', -8, -2, 12], ['lumber_mill', -10, 2, 12], ['builder_hut', -10, -4, 1]]);
  await startRaid();
  await place(0, -100, Math.PI, { isInvulnerable: true });   // outside the wall, facing away
  const one = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, bm = citySiege.buildingManager, de = am.destruction;
    const [reactor, collider, mill, hut] = ['fusion_reactor', 'antimatter_collider', 'lumber_mill', 'builder_hut'].map(t => bm.buildings.find(b => b.type === t));
    const before = { ...de.lootedResources }, stats0 = de.getStats();
    de.damageBuilding(reactor, 1e9, bm.buildings, am.police);   // the raider razes the reactor
    const d = (b) => b.mesh.position.distanceTo(mill.mesh.position);
    const blasts = [P.blastDamageAt(P.blastFor('fusion_reactor', 12), d(reactor)), P.blastDamageAt(P.blastFor('antimatter_collider', 12), d(collider))];
    const got = Object.fromEntries(Object.keys(before).map(k => [k, de.lootedResources[k] - before[k]]));
    const L = (t, lvl, chained) => P.lootFor(t, lvl, { chained });
    const want = Object.fromEntries(Object.keys(before).map(k => [k, L('fusion_reactor', 12, false)[k] + L('antimatter_collider', 12, true)[k] + L('builder_hut', 1, true)[k]]));
    return { collider: collider.isDestroyed, hut: hut.isDestroyed, mill: { lost: Math.round(mill.maxHp - mill.hp), maxHp: mill.maxHp, destroyed: mill.isDestroyed },
      blasts, razed: de.getStats().destroyed - stats0.destroyed, got, want, share: P.CHAIN_LOOT_SHARE };
  });
  await endRaid();
  check(failed.length === 0 && one.collider && !one.mill.destroyed && one.mill.lost === Math.max(...one.blasts) && one.blasts[0] + one.blasts[1] >= one.mill.maxHp && one.razed === 3,
    `a mill caught by both blasts of a reactor -> collider chain takes the harder one (${Math.max(...one.blasts)} of its ${one.mill.maxHp} HP), not both (${one.blasts[0] + one.blasts[1]}, which razed it)`, one.mill);
  check(one.hut && JSON.stringify(one.got) === JSON.stringify(one.want),
    `the reactor the raider razed pays in full; the collider it set off and the hut its blast razed pay ${one.share * 100}% of theirs`, { got: one.got, want: one.want });
}

// ---------------------------------------------------------------- one reactor shot open in a full Town Hall 12 city is a payoff, not the raid
{
  // The reviewer's full-city layout (every counted type at its Town Hall 12 limit and level,
  // defensive core in the middle, rings mixed): 726 autocannon shells into the reactor nearest the
  // centre razed 110 of 148 structures and banked 170,143 / 108,160 / 121,680 on a retreat.
  const failed = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), bm = citySiege.buildingManager, th = 12;
    const gates = bm.getMainGates().map(g => ({ name: g.name, gx: g.gx, gz: g.gz, rot: g.mesh.rotation.y }));
    bm.clearAll();
    gates.forEach(g => bm.addMainGate(g.name, g.gx, g.gz, g.rot));
    const R = P.cityRadiusFor(th) - 1.2, big = [], small = [];
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
      if (Math.hypot(2 * i, 2 * j) <= R) big.push([2 * i, 2 * j]);
      if (Math.hypot(2 * i + 1, 2 * j + 1) <= R) small.push([2 * i + 1, 2 * j + 1]);
    }
    const byDist = (a, b) => Math.hypot(...a) - Math.hypot(...b);
    big.sort(byDist); small.sort(byDist);
    const order = ['town_hall', 'quantum_citadel', 'emp_disrupter', 'orbital_relay', 'fusion_reactor', 'doomsday_turret', 'laser_obelisk', 'plasma_mortar', 'missile_silo',
      'tesla_coil', 'sniper_tower', 'solar_array', 'police_station', 'swat_armory', 'drone_hangar', 'vehicle_lab', 'weapons_lab', 'tech_lab', 'crypto_vault', 'big_storage',
      'antimatter_collider', 'oil_refinery', 'petrol_pump', 'cash_mint', 'iron_foundry', 'lumber_mill', 'builder_hut'];
    const lvl = (t) => (P.BUILDING_DEFS[t].upgradeable === false ? 1 : th);
    const left = Object.fromEntries(order.map(t => [t, P.limitFor(t, th)])), queue = [];
    for (let more = true; more;) { more = false; for (const t of order) if (left[t] > 0) { queue.push(t); left[t]--; more = true; } }
    const bad = [];
    queue.forEach(t => { const s = big.shift(); if (!s || !bm.addBuilding(t, s[0], s[1], lvl(t), { skipCapCheck: true })) bad.push(t); });
    for (const t of ['landmine', 'freeze_trap', 'vortex_trap', 'spring_trap', 'spike_trap', 'roadblock']) {
      for (let k = 0; k < P.limitFor(t, th); k++) { const s = small.shift(); if (!s || !bm.addBuilding(t, s[0], s[1], lvl(t), { skipCapCheck: true })) bad.push(t); }
    }
    citySiege.saveCityNow();
    return bad;
  });
  await startRaid();
  await place(0, -100, Math.PI, { isInvulnerable: true });
  const full = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js'), am = citySiege.attackManager, bm = citySiege.buildingManager, de = am.destruction, e = citySiege.economyManager;
    const fx = de.spawnExplosion; de.spawnExplosion = () => {};   // visuals only: 18 fireballs at once choke a software renderer
    const counted = bm.buildings.filter(b => de.countsTowardDestruction(b));
    const reactor = counted.filter(b => b.type === 'fusion_reactor').sort((a, b) => a.mesh.position.length() - b.mesh.position.length())[0];
    let shells = 0;
    while (!reactor.isDestroyed && shells < 5000) { de.damageBuilding(reactor, am.vehicle.cannonDamage, bm.buildings, am.police); shells++; }   // the raider's own autocannon
    de.spawnExplosion = fx;
    const s = de.getStats();
    const other = counted.filter(b => b.isDestroyed && !P.BUILDING_DEFS[b.type].blast).length;
    const rate = { cash: 0, iron: 0, wood: 0 };   // the whole city's production per minute
    for (const t of P.BUILDING_TYPES) {
      const pr = P.BUILDING_DEFS[t].produce;
      if (pr && !pr.raidOnly) for (const [k, share] of Object.entries(P.PRODUCE_SPLIT[pr.type])) rate[k] += 60 * P.limitFor(t, 12) * P.produceRateFor(t, 12) * share;
    }
    const minutes = Math.max(...Object.keys(rate).map(k => s.looted[k] / rate[k]));
    const bank0 = { cash: e.cash, iron: e.iron, wood: e.wood };
    am.endAttack('retreat');   // loot is banked on a retreat
    const banked = Object.fromEntries(Object.keys(bank0).map(k => [k, Math.round(e[k] - bank0[k])]));
    return { shells, destroyed: s.destroyed, total: s.total, pct: s.percentage, stars: s.stars, other, otherMax: Math.floor(P.CHAIN_RAZE_MAX * s.total),
      looted: s.looted, banked, minutes: +minutes.toFixed(2), maxMinutes: P.CHAIN_LOOT_MAX_MINUTES };
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => citySiege.attackManager.returnToBuilder());
  await page.waitForTimeout(400);
  check(failed.length === 0 && full.total >= 140 && full.stars === 0 && full.other <= full.otherMax && full.minutes <= full.maxMinutes &&
    JSON.stringify(full.banked) === JSON.stringify(full.looted),
    `${full.shells} autocannon shells into a full Town Hall 12 city's central reactor raze ${full.destroyed}/${full.total} (${full.pct}%, no star; ${full.other} besides explosives, max ${full.otherMax}) and bank ${full.minutes} min of its production (max ${full.maxMinutes})`,
    { ...full, failed });
}

// ---------------------------------------------------------------- a spent landmine leaves a crater (no rubble), gone after the raid
{
  const failed = await buildCity(6, [['landmine', -8, 6, 6], ['vehicle_lab', 8, -8, 6]]);
  await page.evaluate(async () => { const P = await import('/src/data/progression.js'), g = citySiege.garageManager; g.state.tracks.armor = P.trackCapFor(6); g._commit(); });
  await startRaid();
  await place(-44, -8, 0, { isInvulnerable: false, damageImmunityTimer: 0 });
  const crater = await page.evaluate(async () => {
    const am = citySiege.attackManager, v = am.vehicle, mine = citySiege.buildingManager.buildings.find(b => b.type === 'landmine');
    v.inputs.forward = true;
    for (let i = 0; i < 200 && !mine.trapSpent && !v.isCrashed; i++) await new Promise(r => setTimeout(r, 30));
    v.inputs.forward = false;
    const c = mine.craterMesh;
    return { spent: !!mine.trapSpent, crater: !!(c && c.parent && c.userData.isCrater), at: c ? [+(c.position.x - mine.mesh.position.x).toFixed(2), +(c.position.z - mine.mesh.position.z).toFixed(2)] : null,
      flat: c ? Math.max(...c.children.map(m => m.position.y)) < 0.1 : null, rubble: !!mine.rubbleMesh, mineVisible: mine.mesh.visible };
  });
  await page.waitForTimeout(600);   // let the blast smoke clear
  await shot('smoke-12-mine-crater');
  await endRaid();
  const after = await page.evaluate(() => { const m = citySiege.buildingManager.buildings.find(b => b.type === 'landmine'); return { crater: !!m.craterMesh, visible: m.mesh.visible }; });
  await page.evaluate(() => { const g = citySiege.garageManager; g.state.tracks.armor = 0; g._commit(); });
  check(failed.length === 0 && crater.spent && crater.crater && JSON.stringify(crater.at) === '[0,0]' && crater.flat && !crater.rubble && !crater.mineVisible && !after.crater && after.visible,
    'a spent landmine leaves a flat crater where it was (no rubble); after the raid the crater is gone and the mine is back', { crater, after });
}

// ---------------------------------------------------------------- final-review fixes (round 5)
{
  // A brand-new city fits its own Town Hall 1 limits: no day-one 'LIMIT REACHED (140 / 130)'.
  // Silence the outgoing page's save-on-exit, or it writes its city straight back over the clear.
  await page.evaluate(() => { localStorage.clear(); Storage.prototype.setItem = () => {}; });
  await boot();
  const start = await page.evaluate(() => {
    const bm = citySiege.buildingManager;
    return ['road', 'spike_trap', 'lumber_mill', 'roadblock', 'tree'].map(t => ({ t, owned: bm.ownedTotal(t), limit: bm.limitOf(t) }));
  });
  check(start.every(x => x.owned <= x.limit) && start.find(x => x.t === 'road').limit === 130, 'a brand-new city starts within every Town Hall 1 limit', start);

  // Drawing a road at the Town Hall road cap says why instead of failing silently.
  const roadCap = await page.evaluate(async () => {
    const bm = citySiege.buildingManager, g = citySiege.gridSystem || citySiege.uiManager.grid, eco = citySiege.economyManager;
    g.setMode('draw_road');
    const free = [];
    for (let x = -11; x <= 11; x++) for (let z = -11; z <= 11; z++) {
      if (Math.hypot(x, z) > bm.buildRadius || bm.roadNetwork.hasRoad(x, z)) continue;
      if (bm.buildings.some(b => Math.abs(b.gx - x) <= 1 && Math.abs(b.gz - z) <= 1)) continue;
      free.push([x, z]);
    }
    let i = 0;
    while (bm.canPlace('road').ok && i < free.length) { const [x, z] = free[i++]; g.handleTileAction(x, z, { x: x * 5.5, y: 0, z: z * 5.5 }); }
    eco.addToInventory('road', 5);
    const [x, z] = free[i++];
    g.handleTileAction(x, z, { x: x * 5.5, y: 0, z: z * 5.5 });
    const toast = document.getElementById('ui-toast');
    const r = { placed: bm.countOf('road'), limit: bm.limitOf('road'), toast: toast ? toast.textContent : '', shown: toast ? !toast.classList.contains('hidden') : false };
    g.setMode('home');
    return r;
  });
  check(roadCap.placed === roadCap.limit && roadCap.shown && /Road limit reached/.test(roadCap.toast), 'drawing past the road cap shows a toast explaining the limit', roadCap);

  // A job that finishes while its inspector is open frees the labourer immediately.
  const freed = await buildCity(3, [['builder_hut', -4, 4], ['builder_hut', 4, -4], ['lumber_mill', -8, -8], ['iron_foundry', -8, 8]]);
  const insp = await page.evaluate(async () => {
    const bm = citySiege.buildingManager, eco = citySiege.economyManager, ui = citySiege.uiManager;
    eco.cash = eco.iron = eco.wood = 1e7;
    const mill = bm.buildings.find(b => b.type === 'lumber_mill'), fnd = bm.buildings.find(b => b.type === 'iron_foundry');
    bm.upgradeBuilding(mill); bm.upgradeBuilding(fnd);
    ui.showBuildingInspector(mill);
    mill.buildTask.endsAt = Date.now() - 1000;          // finishes on the next frame, no user input
    await new Promise(r => setTimeout(r, 1200));
    const btn = document.getElementById('btn-upgrade-building');
    return { level: mill.level, free: bm.freeBuilders, btn: btn ? btn.textContent.trim() : null, disabled: btn ? btn.disabled : null };
  });
  check(freed.length === 0 && insp.level === 2 && insp.free === 1 && insp.btn && !/BUSY/.test(insp.btn) && insp.disabled === false,
    'the inspector re-renders with a free labourer the moment a job finishes', insp);

  // A level-1 Fusion Reactor really adds damage to a low-damage Tesla Coil (it used to round away).
  const auraFail = await buildCity(10, [['tesla_coil', -6, 2, 1], ['fusion_reactor', -6, -2, 1]]);
  await startRaid();
  const aura = await page.evaluate(() => {
    const t = citySiege.attackManager.turrets.turrets.find(x => x.type === 'tesla_coil');
    return { base: t.base.damage, live: t.damage };
  });
  await endRaid();
  check(auraFail.length === 0 && aura.live > aura.base && Math.abs(aura.live / aura.base - 1.02) < 0.001,
    'a level-1 Fusion Reactor adds its promised +2% even to a 16-damage Tesla shot', aura);
}

// ---------------------------------------------------------------- final-review fixes (round 6): garage and progression
{
  // The combat HUD's ARMOR readout is whole numbers, like the bar over the buggy. Relay-boosted
  // laser pierce is fractional: the HUD used to read '457.15999999999997 / 500' and wrap.
  const hudFail = await buildCity(10, [['orbital_relay', -10, -10, 1], ['laser_obelisk', 0, 0, 1]]);
  await startRaid();
  const hud = await page.evaluate(async () => {
    const am = citySiege.attackManager, v = am.vehicle;
    am.police.policeUnits.slice().forEach(u => am.police.destroyUnit(u)); am.police.respawnQueue = []; am.police.stations = [];
    v.position.set(20, 0, 0); v.speed = 0; v.damageImmunityTimer = 0;
    const seen = []; let fractional = 0;
    for (let i = 0; i < 30 && !v.isCrashed; i++) {
      await new Promise(r => setTimeout(r, 250));
      if (v.hp % 1 !== 0) fractional++;
      seen.push(document.getElementById('hud-hp-text').textContent);
      if (fractional >= 3) break;
    }
    return { fractional, seen: [...new Set(seen)] };
  });
  await endRaid();
  check(hudFail.length === 0 && hud.fractional >= 3 && hud.seen.every(t => /^\d+ \/ \d+$/.test(t)) && hud.seen.some(t => { const [a, b] = t.split(' / ').map(Number); return a < b; }),
    'the combat HUD armor readout stays whole numbers while fractional aura / pierce damage lands', hud);

  // A NITRO pickup on the road is a free use of the card: it leaves the card recharging (it used
  // to zero the cooldown, so pickup + card kept nitro up 100%), and another waits meanwhile.
  // (Raids do not scatter pickups at the moment - AttackManager stopped calling
  // spawnInWorldCards - so the test lays them out itself to exercise that code.)
  const pickFail = await buildCity(3, [['lumber_mill', -8, -8]]);
  await startRaid();
  const pick = await page.evaluate(async () => {
    const P = await import('/src/data/progression.js');
    const cs = citySiege.cardSystem, v = citySiege.attackManager.vehicle, bm = citySiege.buildingManager;
    cs.spawnInWorldCards(bm.roadNetwork, bm.buildings);
    const nc = cs.cards.find(c => c.id === 'nitro');
    const [a, b] = cs.inWorldCards.filter(c => c.type === 'nitro');
    cs.inWorldCards.forEach(c => c.mesh.position.set(300, 1.3, 300));   // everything else out of reach
    nc.currentCooldown = 0; nc.activeTimer = 0;
    a.mesh.position.set(v.position.x, 1.3, v.position.z);
    await new Promise(r => setTimeout(r, 250));
    const took = { taken: !a.active, burn: nc.activeTimer, recharge: nc.currentCooldown, nitro: v.isNitro };
    b.mesh.position.set(v.position.x, 1.3, v.position.z);
    await new Promise(r => setTimeout(r, 300));
    const waiting = { taken: !b.active, scale: b.mesh.scale.x };
    const cardFired = cs.activateCard('nitro');
    cs.clearInWorldCards();
    return { took, waiting, cardFired, lockout: P.pickupLockoutFor('nitro'), burn: P.IN_WORLD_PICKUP.nitroBurn, inDeck: cs.deck.includes(nc) };
  });
  await endRaid();
  check(pickFail.length === 0 && pick.took.taken && pick.took.nitro && pick.took.burn > pick.burn - 0.5 && pick.took.recharge > pick.lockout - 0.5 &&
    !pick.waiting.taken && pick.waiting.scale < 1 && pick.inDeck && !pick.cardFired && pick.burn / pick.lockout <= 0.5,
    'a NITRO pickup leaves the card recharging and the next pickup waits, so nitro stays within its 50% cap', pick);

  // The building panel follows the labour pool and the bank while it is open.
  const panelFail = await buildCity(3, [['builder_hut', -4, 4], ['builder_hut', 4, -4], ['lumber_mill', -8, -8], ['iron_foundry', -8, 8], ['petrol_pump', 8, -3]]);
  const readBtn = () => page.evaluate(() => { const b = document.getElementById('btn-upgrade-building'); return b ? { text: b.textContent.trim(), disabled: b.disabled } : null; });
  await page.evaluate(() => {
    const bm = citySiege.buildingManager, eco = citySiege.economyManager, ui = citySiege.uiManager;
    eco.cash = eco.iron = eco.wood = 1e7; eco.inventory.builder_hut = 0; eco.save();
    ui.setScreen('HOME');
    const mill = bm.buildings.find(b => b.type === 'lumber_mill'), fnd = bm.buildings.find(b => b.type === 'iron_foundry');
    bm.upgradeBuilding(mill); bm.upgradeBuilding(fnd);
    mill.buildTask.endsAt = Date.now() + 2000;
    ui.showBuildingInspector(bm.buildings.find(b => b.type === 'petrol_pump'));
  });
  const busy = await readBtn();
  // A hut appearing in the inventory raises no event at all: the panel's 400ms check catches it.
  await page.evaluate(() => { citySiege.economyManager.inventory.builder_hut = 1; });
  await page.waitForTimeout(700);
  const hutAdvice = await readBtn();
  await page.waitForFunction(() => citySiege.buildingManager.buildings.find(b => b.type === 'lumber_mill').level === 2, null, { timeout: 6000 });
  const freed = await readBtn();
  await page.click('#btn-upgrade-building');
  const pumpStarted = await page.evaluate(() => !!citySiege.buildingManager.buildings.find(b => b.type === 'petrol_pump').isUnderConstruction);
  check(panelFail.length === 0 && busy && busy.disabled && /ALL LABOURS BUSY \(HIRE IN SHOP\)/.test(busy.text) && /PLACE A HUT FROM INVENTORY/.test(hutAdvice && hutAdvice.text),
    'with every labourer busy the panel says what helps: hire in the shop, or place the hut already in the inventory', { busy, hutAdvice });
  check(freed && !freed.disabled && /Upgrade to Tier 2/.test(freed.text) && pumpStarted,
    "another building's job finishing enables the open panel's Upgrade button, and the click starts the job", { freed, pumpStarted });

  // Placing that hut from the inventory (Design Map) frees a labourer for the panel on show.
  const placed = await page.evaluate(() => {
    const bm = citySiege.buildingManager, ui = citySiege.uiManager, g = citySiege.gridSystem;
    ui.setScreen('DESIGN');
    const mill = bm.buildings.find(b => b.type === 'lumber_mill');
    ui.showBuildingInspector(mill);
    const b0 = document.getElementById('btn-upgrade-building');
    const before = { text: b0.textContent.trim(), disabled: b0.disabled };
    g.setMode('place_inventory', 'builder_hut');
    g.handleTileAction(2, -9, { x: 2 * 5.5, y: 0, z: -9 * 5.5 });
    const b1 = document.getElementById('btn-upgrade-building');
    return { before, after: { text: b1.textContent.trim(), disabled: b1.disabled }, huts: bm.countOf('builder_hut') };
  });
  check(placed.huts === 3 && placed.before.disabled && !placed.after.disabled && /Upgrade to Tier 3/.test(placed.after.text),
    'placing a Labour Hut from the inventory re-enables the open panel at once', placed);

  // Collecting a producer while the panel is open makes an upgrade it now affords clickable.
  const collect = await page.evaluate(() => {
    const bm = citySiege.buildingManager, eco = citySiege.economyManager;
    const mill = bm.buildings.find(b => b.type === 'lumber_mill'), c = bm.getUpgradeCost(mill);
    eco.cash = c.cash + 1000; eco.iron = c.iron + 1000; eco.wood = c.wood - 50; eco.save(); eco.onUpdate(eco.getResources());
    const b0 = document.getElementById('btn-upgrade-building');
    const before = { text: b0.textContent.trim(), disabled: b0.disabled };
    mill.stored = 400;
    const got = bm.collectBuilding(mill);
    const b1 = document.getElementById('btn-upgrade-building');
    return { before, after: { text: b1.textContent.trim(), disabled: b1.disabled }, wood: got && got.payout.wood };
  });
  check(collect.before.disabled && /NEED MORE RESOURCES/.test(collect.before.text) && collect.wood >= 50 && !collect.after.disabled && /Upgrade to Tier 3/.test(collect.after.text),
    'collecting a producer while the panel is open enables the upgrade it now affords', collect);

  // At the Town Hall's labour cap the panel no longer sends the player to a shop that says LIMIT REACHED.
  await page.click('#btn-upgrade-building');
  const atCap = await page.evaluate(() => {
    const bm = citySiege.buildingManager, ui = citySiege.uiManager;
    ui.showBuildingInspector(bm.buildings.find(b => b.type === 'town_hall'));
    const b = document.getElementById('btn-upgrade-building');
    return { text: b && b.textContent.trim(), free: bm.freeBuilders, total: bm.totalBuilders, cap: bm.builderCap, shop: bm.canBuy('builder_hut').reason };
  });
  check(atCap.free === 0 && atCap.total === atCap.cap && atCap.shop === 'AT_LIMIT' && /WAIT OR FINISH ONE WITH GEMS/.test(atCap.text || '') && !/SHOP/.test(atCap.text || ''),
    'at the labour cap the busy panel says wait or finish with gems, not hire in the shop', atCap);

  // Leaving for the shop closes the panel for good: it used to pop back open by itself when the
  // building's job finished after the round trip.
  await page.evaluate(() => {
    const bm = citySiege.buildingManager, ui = citySiege.uiManager, eco = citySiege.economyManager;
    eco.cash = eco.iron = eco.wood = 1e7;
    bm.activeBuildTasks.slice().forEach(t => bm.finishConstructionInstantly(t.building));
    ui.setScreen('HOME');
    const th = bm.buildings.find(b => b.type === 'town_hall'); bm.upgradeBuilding(th); th.buildTask.endsAt = Date.now() + 1500;
    ui.showBuildingInspector(th);
    document.getElementById('btn-open-shop').click();
    document.getElementById('btn-close-shop').click();
  });
  await page.waitForFunction(() => citySiege.buildingManager.getTownHallLevel() === 4, null, { timeout: 6000 });
  await page.waitForTimeout(300);
  const popped = await page.isVisible('#inspector-modal');
  check(!popped, 'after a trip to the shop the panel stays closed when that building finishes', { popped });

  // The open shop re-renders when the Town Hall finishes: header and newly unlocked blueprints.
  const silo = () => page.evaluate(() => {
    const c = [...document.querySelectorAll('.blueprint-card')].find(c => c.querySelector('.blueprint-title')?.textContent.trim() === 'Missile Silo');
    return { th: document.getElementById('shop-th-level').textContent, btn: c && c.querySelector('.btn-buy-to-inv').textContent.trim() };
  });
  await page.evaluate(() => {
    const bm = citySiege.buildingManager, ui = citySiege.uiManager;
    const th = bm.buildings.find(b => b.type === 'town_hall'); bm.upgradeBuilding(th); th.buildTask.endsAt = Date.now() + 1500;
    ui.shopCategory = 'all';
    document.getElementById('btn-open-shop').click();
  });
  const shop4 = await silo();
  await page.waitForFunction(() => citySiege.buildingManager.getTownHallLevel() === 5, null, { timeout: 6000 });
  await page.waitForTimeout(200);
  const shop5 = await silo();
  await page.click('#btn-close-shop');
  check(shop4.th === '4' && /TOWN HALL 5/.test(shop4.btn || '') && shop5.th === '5' && !/TOWN HALL/.test(shop5.btn || ''),
    'the open shop shows the new Town Hall level and its unlocks the moment the upgrade finishes', { shop4, shop5 });

  // Quick Templates: a dry run on each card, a confirm that spells out the loss, and an undo.
  const tplFail = await buildCity(8, [['sniper_tower', -10, -4, 5], ['tesla_coil', -10, 3, 4], ['missile_silo', 10, -7, 3], ['big_storage', -5, -10, 2],
    ['lumber_mill', -8, -8, 6], ['builder_hut', 4, -4], ['builder_hut', -4, 4], ['swat_armory', 9, 9, 2]],
    [[0, -14], [0, -13], [0, -12], [1, -12], [2, -12]]);
  await page.evaluate(() => {
    const bm = citySiege.buildingManager, eco = citySiege.economyManager;
    eco.cash = eco.iron = eco.wood = 1e7; eco.save();
    bm.upgradeBuilding(bm.buildings.find(b => b.type === 'sniper_tower'));
    citySiege.uiManager.setScreen('DESIGN');
  });
  const citySnap = () => page.evaluate(() => {
    const bm = citySiege.buildingManager, e = citySiege.economyManager;
    return JSON.stringify({
      layout: bm.buildings.map(b => `${b.type}@${b.gx},${b.gz}L${b.level}`).sort(),
      jobs: bm.activeBuildTasks.map(t => `${t.building.type}>${t.targetLevel}@${t.endsAt}`).sort(),
      // Sorted entries: EconomyManager.load() rebuilds these objects, so their key order is not state.
      bank: [e.cash, e.iron, e.wood], inv: Object.entries(e.inventory).sort(), stowed: Object.entries(e.stowedCounts).sort(), levels: Object.entries(e.stowedLevels).sort(),
      roads: [...bm.roadNetwork.roads.keys()].sort(), depots: bm.storageCapacity()
    });
  });
  const t0 = await citySnap();
  await page.click('#btn-open-presets');
  const fit = await page.evaluate(() => document.querySelector('.preset-fit[data-fit-for="citadel"]').textContent);
  const cancelled = await clickAnswering('button[data-preset="citadel"]', false);
  const afterCancel = await citySnap();
  const modalOpen = await page.isVisible('#redesign-modal');
  check(tplFail.length === 0 && /Keeps 4 of your 9 buildings/.test(fit) && /5 to storage \(3 turrets\)/.test(fit) && /1 upgrade cancelled/.test(fit),
    'each template card shows what it would keep for this city before anything is clicked', fit);
  check(/5 of your 9 buildings have no slot/.test(cancelled || '') && /including 3 turrets and 1 other defense building/.test(cancelled || '') &&
    /Storage will read \d+ \/ 0/.test(cancelled || '') && /1 running upgrade is cancelled and refunded/.test(cancelled || '') && afterCancel === t0 && modalOpen,
    'a lossy template asks first (defenses, storage, cancelled upgrades), and saying no changes nothing', { cancelled, same: afterCancel === t0, modalOpen });
  await clickAnswering('button[data-preset="citadel"]');
  await page.waitForTimeout(200);
  const applied = await page.evaluate(() => ({ turrets: citySiege.buildingManager.buildings.filter(b => ['sniper_tower', 'tesla_coil', 'missile_silo'].includes(b.type)).length }));
  const undoShown = await page.isVisible('#btn-undo-preset');
  await page.click('#btn-undo-preset');
  await page.waitForTimeout(200);
  const undone = await citySnap();
  const undoAfter = await page.isVisible('#btn-undo-preset');
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));
  await boot();
  const reloaded = await citySnap();
  check(applied.turrets === 0 && undoShown && undone === t0 && !undoAfter && reloaded === t0,
    'Undo Template puts back every building, road, running upgrade (same deadline), the bank and storage - and it is saved', { applied, undoShown, same: undone === t0, undoAfter, reloadedSame: reloaded === t0 });

  // The undo is only offered while nothing else has changed (it would roll that back too).
  await page.evaluate(() => citySiege.uiManager.setScreen('DESIGN'));
  await page.click('#btn-open-presets');
  await clickAnswering('button[data-preset="citadel"]');
  await page.waitForTimeout(200);
  const offered = await page.isVisible('#btn-undo-preset');
  await page.evaluate(() => { const bm = citySiege.buildingManager; const m = bm.buildings.find(b => b.type === 'lumber_mill'); m.stored = 500; bm.collectBuilding(m); });
  await page.waitForTimeout(700);
  const expired = await page.evaluate(() => ({ shown: !document.getElementById('btn-undo-preset').classList.contains('hidden'), can: citySiege.buildingManager.canUndoPreset().reason }));
  check(offered && !expired.shown && expired.can === 'NOTHING_TO_UNDO', 'Undo Template goes away as soon as anything else changes (here: a collect)', { offered, expired });
  await page.evaluate(() => citySiege.uiManager.setScreen('HOME'));

  // The home Attack button applies the garage's rule: no raid with an empty ability deck.
  const deck = await page.evaluate(() => {
    const g = citySiege.garageManager, ui = citySiege.uiManager;
    const had = g.getLoadout();
    had.forEach(id => g.toggleEquip(id));
    ui.setScreen('HOME');
    document.getElementById('btn-attack-city').click();
    const r = { empty: g.getLoadout().length === 0, state: citySiege.attackManager.state, screen: ui.currentScreen, tab: ui.garageTab, toast: document.getElementById('ui-toast').textContent };
    had.forEach(id => g.toggleEquip(id));
    ui.setScreen('HOME');
    return { ...r, had, back: g.getLoadout() };
  });
  check(deck.empty && deck.state === 'IDLE' && deck.screen === 'GARAGE' && deck.tab === 'cards' && /Equip at least one card/.test(deck.toast) && deck.back.join() === deck.had.join(),
    'the home Attack button refuses an empty deck and opens the Cards tab, like the garage button', deck);
}

// ---------------------------------------------------------------- raids do not leak GPU memory
{
  // Rubble slabs, mine craters, gate beacons (and their name-banner textures), pursuit units,
  // police roadblocks, bombs and rockets were built fresh every raid and only ever taken out of
  // the scene: +120 geometries and +3 textures a raid at Town Hall 6.
  const failed = await buildCity(6, [['sniper_tower', -9, 3, 4], ['tesla_coil', 9, 8, 4], ['laser_obelisk', -3, -9, 4], ['swat_armory', 3, -9, 4],
    ['police_station', -9, -3, 4], ['landmine', 0, 8, 4], ['freeze_trap', 0, -8, 4], ['lumber_mill', 8, -8, 4], ['builder_hut', -8, 8, 1]]);
  const raid = async () => {
    await startRaid();
    await place(-40, -40, 0, { isInvulnerable: true });
    await page.evaluate(() => {
      const am = citySiege.attackManager, bm = citySiege.buildingManager, cs = am.cards;
      cs._fireMissiles(); cs._spawnBomb();
      am.police.dropRoadblock(-40, -25, Math.PI / 2);
    });
    await page.waitForTimeout(2500);   // the pursuit deploys, the bomb goes off, the rockets fly out
    const razed = await page.evaluate(() => {
      const am = citySiege.attackManager, bm = citySiege.buildingManager;
      bm.buildings.filter(b => !b.isMainGate && b.type !== 'town_hall').forEach(b => am.destruction.destroyBuilding(b, bm.buildings, am.police));
      return { rubble: bm.buildings.filter(b => b.rubbleMesh).length, craters: bm.buildings.filter(b => b.craterMesh).length, police: am.police.policeUnits.length };
    });
    await page.waitForTimeout(300);
    await endRaid();
    const mem = await page.evaluate(() => { const m = citySiege.sceneManager.renderer.info.memory; return { geo: m.geometries, tex: m.textures }; });
    return { ...mem, ...razed };
  };
  const first = await raid();
  await raid();
  const third = await raid();
  check(failed.length === 0 && first.rubble >= 7 && first.craters === 1 && first.police > 0 && third.geo === first.geo && third.tex === first.tex,
    `three identical raids (rubble, a crater, gate beacons, ${first.police} pursuit unit${first.police === 1 ? '' : 's'}, a police roadblock, a bomb and rockets) leave GPU memory where the first left it`, { first, third });
}

// ---------------------------------------------------------------- final-review fixes (round 7): city and saves
{
  // Production made while the tab sat hidden survives closing that tab. Browsers stop rAF in a
  // hidden tab, so b.stored froze at the hide; the close-time save then stamped that stale
  // amount 'now' and the reopened city was never credited the hidden stretch. Own context: the
  // tab is really closed, and the rewind init scripts above stay out of it.
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errors.push('hidden-tab page: ' + e.message));
  await p2.goto(URL);
  await p2.waitForFunction(() => window.citySiege && citySiege.buildingManager, null, { timeout: 15000 });
  await p2.waitForTimeout(1000);
  const start = await p2.evaluate(() => {
    const m = citySiege.buildingManager.buildings.find(b => b.type === 'lumber_mill');
    m.stored = 0; citySiege.saveCityNow();
    return { t0: Date.now(), rate: m.produceRate, cap: m.maxCapacity, gx: m.gx, gz: m.gz };
  });
  await p2.evaluate(() => {                         // hide it the way a browser does
    window.requestAnimationFrame = () => 0;
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  });
  await p2.waitForTimeout(8000);
  const closed = new Promise(r => p2.once('close', r));
  await p2.close({ runBeforeUnload: true });
  await closed;
  const p3 = await ctx2.newPage();
  p3.on('pageerror', e => errors.push('reopened page: ' + e.message));
  await p3.goto(URL);
  await p3.waitForFunction(() => window.citySiege && citySiege.buildingManager, null, { timeout: 15000 });
  const back = await p3.evaluate(({ gx, gz }) => {
    const m = citySiege.buildingManager.buildings.find(b => b.type === 'lumber_mill' && b.gx === gx && b.gz === gz);
    return { stored: m ? +m.stored.toFixed(1) : null, now: Date.now() };
  }, start);
  await ctx2.close();
  const want = Math.min(start.cap, start.rate * (back.now - start.t0) / 1000);
  check(back.stored !== null && Math.abs(back.stored - want) <= start.rate * 0.5 + 1,
    'a producer keeps what it made while its tab sat hidden (8s) after that tab is closed', { ...start, ...back, want: +want.toFixed(1) });

  // A fresh city for the rest. Silence the outgoing page's save-on-exit.
  await page.evaluate(() => { localStorage.clear(); Storage.prototype.setItem = () => {}; });
  await boot();

  // The inspector panel is not click-through. Hide a building behind the panel's text, then
  // press-drag and click on that text: it used to pick the building up and move it, pan the
  // camera, or switch the panel to the building behind it.
  const hid = await page.evaluate(() => {
    const bm = citySiege.buildingManager, ui = citySiege.uiManager, g = citySiege.gridSystem;
    ui.setScreen('DESIGN');
    g.onSelectBuilding(bm.buildings.find(b => b.type === 'town_hall'));
    const panel = document.getElementById('inspector-modal').getBoundingClientRect();
    for (let y = panel.top + 12; y < panel.bottom - 12; y += 12) for (let x = panel.left + 12; x < panel.right - 12; x += 12) {
      const el = document.elementFromPoint(x, y);
      if (!el || !el.closest('#inspector-modal') || el.closest('button')) continue;
      const w = g.getWorldIntersection({ clientX: x, clientY: y });
      if (!w) continue;
      const { gx, gz } = g.worldToGrid(w);
      if (Math.hypot(gx, gz) > bm.buildRadius - 1.5 || bm.isFootprintBlocked(bm.footprintOf('sniper_tower'), gx, gz) || bm.roadNetwork.hasRoad(gx, gz)) continue;
      const b = bm.addBuilding('sniper_tower', gx, gz, 1, { skipCapCheck: true });
      if (!b) continue;
      b.mesh.updateMatrixWorld(true);
      if (g.findBuildingFromRaycast({ clientX: x, clientY: y }) !== b) { bm.removeBuilding(b); continue; }
      window.__behindPanel = b;
      return { x, y, gx, gz };
    }
    return null;
  });
  const panelState = () => page.evaluate(() => {
    const bm = citySiege.buildingManager, c = citySiege.sceneManager.activeCamera.position, b = window.__behindPanel;
    return { at: b ? [b.gx, b.gz] : null, cam: [c.x, c.y, c.z].map(v => +v.toFixed(2)), inspecting: citySiege.uiManager.currentInspectedBuilding?.type || null, roads: bm.roadNetwork.roads.size };
  });
  const panel0 = await panelState();
  if (hid) {
    await page.mouse.move(hid.x, hid.y);
    await page.mouse.down();
    await page.mouse.move(hid.x - 260, hid.y + 140, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  const panelDrag = await panelState();
  if (hid) await page.mouse.click(hid.x, hid.y);
  await page.waitForTimeout(150);
  const panelClick = await panelState();
  check(hid && JSON.stringify(panelDrag) === JSON.stringify(panel0) && JSON.stringify(panelClick) === JSON.stringify(panel0),
    'a press-drag or click on the inspector panel never reaches the building or map behind it', { hid, panel0, panelDrag, panelClick });

  // Arming a map tool closes the inspector (all but a Labour Hut placement, which the busy
  // panel itself asks for - see 'placing a Labour Hut from the inventory re-enables...').
  const tools = [];
  for (const sel of ['#btn-design-road', '#btn-design-erase', '.inv-card[data-type="roadblock"]']) {
    await page.evaluate(() => {
      citySiege.economyManager.addToInventory('roadblock', 1); citySiege.uiManager.renderDesignInventory();
      citySiege.gridSystem.setMode('design_select');
      citySiege.gridSystem.onSelectBuilding(citySiege.buildingManager.buildings.find(b => b.type === 'town_hall'));
    });
    const open = await page.isVisible('#inspector-modal');
    await page.click(sel);
    tools.push({ sel, open, mode: await page.evaluate(() => citySiege.gridSystem.mode), after: await page.isVisible('#inspector-modal') });
  }
  check(tools.every(t => t.open && !t.after), 'choosing the road, erase or place tool closes the building inspector', tools);

  // With the Labour Hut place tool armed the panel stays up - and a click on it places nothing.
  await page.evaluate(() => {
    const bm = citySiege.buildingManager;                 // free a slot under the TH1 hut limit
    bm.removeBuilding(bm.buildings.find(b => b.type === 'builder_hut'));
    citySiege.economyManager.addToInventory('builder_hut', 1); citySiege.uiManager.renderDesignInventory();
    citySiege.gridSystem.setMode('design_select');
    citySiege.gridSystem.onSelectBuilding(citySiege.buildingManager.buildings.find(b => b.type === 'town_hall'));
  });
  await page.click('.inv-card[data-type="builder_hut"]');
  const hutTool = { open: await page.isVisible('#inspector-modal'), mode: await page.evaluate(() => citySiege.gridSystem.mode) };
  // A spot on the panel's text over a tile where the hut WOULD land if the press got through.
  const hutSpot = await page.evaluate(() => {
    const bm = citySiege.buildingManager, g = citySiege.gridSystem;
    const panel = document.getElementById('inspector-modal').getBoundingClientRect();
    for (let y = panel.top + 12; y < panel.bottom - 12; y += 12) for (let x = panel.left + 12; x < panel.right - 12; x += 12) {
      const el = document.elementFromPoint(x, y);
      if (!el || !el.closest('#inspector-modal') || el.closest('button')) continue;
      const w = g.getWorldIntersection({ clientX: x, clientY: y });
      if (!w) continue;
      const { gx, gz } = g.worldToGrid(w);
      if (Math.hypot(gx, gz) <= bm.buildRadius - 1 && !bm.isFootprintBlocked(bm.footprintOf('builder_hut'), gx, gz) && bm.canPlace('builder_hut').ok) return { x, y, gx, gz };
    }
    return null;
  });
  const huts0 = await page.evaluate(() => [citySiege.buildingManager.countOf('builder_hut'), citySiege.economyManager.getInventoryCount('builder_hut')]);
  if (hutSpot) await page.mouse.click(hutSpot.x, hutSpot.y);
  await page.waitForTimeout(150);
  const huts1 = await page.evaluate(() => [citySiege.buildingManager.countOf('builder_hut'), citySiege.economyManager.getInventoryCount('builder_hut')]);
  check(hutSpot && hutTool.open && hutTool.mode === 'place_inventory' && JSON.stringify(huts1) === JSON.stringify(huts0),
    'with the Labour Hut place tool armed the panel stays open, and a click on it places nothing behind it', { hutTool, hutSpot, huts0, huts1 });

  // The full-width top bar only catches the pointer on its pills: the gap between them is map.
  await page.evaluate(() => { citySiege.gridSystem.setMode('design_select'); citySiege.uiManager.setScreen('HOME'); });
  const gap = await page.evaluate(() => {
    const bar = document.querySelector('.builder-top-bar').getBoundingClientRect(), y = bar.top + bar.height / 2;
    for (let x = bar.left; x < bar.right; x += 4) if (document.elementFromPoint(x, y)?.tagName === 'CANVAS') return { x, y };
    return null;
  });
  let reached = false;
  if (gap) {
    await page.mouse.move(gap.x, gap.y);
    await page.mouse.down();
    reached = await page.evaluate(() => citySiege.gridSystem.isPointerDown);
    await page.mouse.up();
  }
  check(gap && reached, 'a press in the gap between the top bar\'s pills still reaches the map', { gap, reached });

  // Presets fit a Town Hall 1 city; the starter city has no overlapping footprints; trees stay put.
  await page.evaluate(() => { localStorage.clear(); Storage.prototype.setItem = () => {}; });
  await boot();
  const layouts = await page.evaluate(async () => {
    const { cityRadiusFor, PERIMETER_WALL_TILES } = await import('/src/data/progression.js');
    const bm = citySiege.buildingManager, g = citySiege.gridSystem, R1 = cityRadiusFor(1), WALL = PERIMETER_WALL_TILES;
    const bad = [];
    for (const name of ['citadel', 'metropolis', 'valley']) {
      const L = bm._presetLayout(name), roads = new Set(L.roads.map(([x, z]) => x + ',' + z));
      for (const k of roads) { const [x, z] = k.split(',').map(Number); if (Math.hypot(x, z) > WALL) bad.push(`${name}: road ${k} past the wall`); }
      const slots = [['town_hall', ...L.townHall], ...L.slots];
      slots.forEach(([t, x, z], i) => {
        const fp = bm.footprintOf(t);
        if (Math.hypot(x, z) > R1) bad.push(`${name}: ${t} ${x},${z} outside the TH1 radius`);
        if (fp > 1) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (roads.has((x + dx) + ',' + (z + dz))) bad.push(`${name}: ${t} ${x},${z} on its road`);
        slots.forEach(([t2, x2, z2], j) => {
          const reach = (fp + bm.footprintOf(t2)) / 2;
          if (j > i && Math.abs(x - x2) < reach && Math.abs(z - z2) < reach) bad.push(`${name}: ${t} ${x},${z} overlaps ${t2} ${x2},${z2}`);
        });
      });
    }
    const stuck = bm.buildings.filter(b => !b.isMainGate && b.type !== 'tree' && !g.isValidDropTile(b, b.gx, b.gz)).map(b => `${b.type}@${b.gx},${b.gz}`);
    const citadel = bm.previewPreset('citadel');
    const trees0 = bm.buildings.filter(b => b.type === 'tree').map(b => b.gx + ',' + b.gz);
    const r = bm.applyPreset('metropolis');
    const metro = {
      ok: r.ok, stowed: r.stowed,
      outside: bm.buildings.filter(b => !b.isMainGate && b.type !== 'tree' && Math.hypot(b.gx, b.gz) > bm.buildRadius).map(b => `${b.type}@${b.gx},${b.gz}`),
      pastWall: [...bm.roadNetwork.roads.values()].filter(t => Math.hypot(t.gx, t.gz) > WALL).length,
      treesKept: bm.buildings.filter(b => b.type === 'tree' && trees0.includes(b.gx + ',' + b.gz)).length, trees: trees0.length
    };
    bm.undoPreset();
    return { bad, stuck, citadel: { kept: citadel.kept, owned: citadel.owned, stowed: citadel.stowed }, metro };
  });
  check(layouts.bad.length === 0, 'every preset fits a Town Hall 1 city: slots inside the radius, off their roads and each other, no road past the wall', layouts.bad);
  check(layouts.stuck.length === 0, 'every starter building can be dropped back on its own tile (no overlapping footprints)', layouts.stuck);
  check(layouts.citadel.stowed === 0 && layouts.citadel.kept === layouts.citadel.owned && layouts.metro.ok && layouts.metro.outside.length === 0 &&
    layouts.metro.pastWall === 0 && layouts.metro.treesKept === layouts.metro.trees,
    'presets keep trees on their tiles (Citadel on the starter city stows nothing) and Metropolis at TH1 puts nothing outside the radius', layouts);

  // Discarded building, bubble, hammer and road meshes give their GPU memory back.
  const gpu = await page.evaluate(async () => {
    const bm = citySiege.buildingManager, info = citySiege.sceneManager.renderer.info.memory;
    const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const snap = () => ({ geo: info.geometries, tex: info.textures });
    const cycle = async () => { bm.applyPreset('metropolis'); await frames(); bm.undoPreset(); await frames(); };
    await cycle();
    const first = snap();
    for (let i = 0; i < 4; i++) await cycle();
    const fifth = snap();
    const mill = bm.buildings.find(b => b.type === 'lumber_mill');
    for (let i = 0; i < 3; i++) { mill.stored = 500; await frames(); bm.collectBuilding(mill); await frames(); }
    const collected = snap();
    for (let i = 0; i < 10; i++) { bm.roadNetwork.addRoad(9, 9); await frames(); bm.roadNetwork.removeRoad(9, 9); await frames(); }
    return { first, fifth, collected, roads: snap() };
  });
  check(gpu.fifth.geo === gpu.first.geo && gpu.fifth.tex === gpu.first.tex && gpu.collected.tex <= gpu.first.tex && gpu.roads.geo === gpu.first.geo,
    'five preset apply + undo cycles, three collects and ten road redraws leave GPU memory where it was', gpu);
  await shot('smoke-5-after-preset-cycles');

  // A bank from before the city was saved, with no city blob: its bigger starter stock is
  // trimmed to the Town Hall 1 limits and refunded at the shop price.
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('city_siege_eco', JSON.stringify({ v: 2, cash: 1500, iron: 800, wood: 1000, gems: 50,
      inventory: { road: 35, lumber_mill: 1, spike_trap: 2, roadblock: 2, tree: 3 } }));
    Storage.prototype.setItem = () => {};
  });
  await boot();
  const legacy = await page.evaluate(async () => {
    const { BUILDING_DEFS: D } = await import('/src/data/progression.js');
    const bm = citySiege.buildingManager, e = citySiege.economyManager;
    // 10 road tiles (two packs of 5) and 1 spike trap back at the shop price.
    const cash = 1500 + Math.floor(D.road.cost.cash * 10 / D.road.packCount) + D.spike_trap.cost.cash;
    return { road: [bm.ownedTotal('road'), bm.limitOf('road')], spike: [bm.ownedTotal('spike_trap'), bm.limitOf('spike_trap')],
      bank: { cash: e.cash, iron: e.iron, wood: e.wood }, want: cash, toast: document.getElementById('ui-toast')?.textContent || '' };
  });
  check(legacy.road[0] === legacy.road[1] && legacy.spike[0] === legacy.spike[1] && legacy.bank.cash === legacy.want &&
    /10 road tiles/.test(legacy.toast) && /1 x Spike Trap/.test(legacy.toast),
    'an old save\'s starter stock over the TH1 limits (140 / 130 roads, 3 / 2 spike traps) is trimmed and refunded', legacy);
}

check(errors.length === 0, 'no page errors', errors);
await browser.close();
console.log(fails ? `\n${fails} FAILED` : '\nSMOKE SUITE PASSES');
process.exit(fails ? 1 : 0);
