#!/usr/bin/env node
/**
 * Browser regression suite for the cloud sync (src/net/CloudSync.js + src/net/cityMerge.js) against
 * the Firebase emulators with the real firestore.rules, the real game in Chrome and the real MCP
 * server store (mcp-server/src/store.js, called in-process with firebase-admin - the same writes the
 * AI designer's tools make).
 *
 *   GAME_URL=http://localhost:3121/ SYNC_PROJECT=demo-fx-sync PW_CORE=<playwright-core dir> \
 *     node tools/online/e2e-sync.mjs [shotsDir]
 *
 * The Vite server must run in emulator mode with VITE_FIREBASE_PROJECT_ID = SYNC_PROJECT (default
 * demo-cs-sync); the suite checks that. It wipes only SYNC_PROJECT's documents and deletes only its
 * own auth users (emails ending E2E_EMAIL_SUFFIX, default @e2e-sync.test) from the auth emulator's
 * default project. SYNC_ONLY=K,L (scenario letters) runs only those scenarios after A.
 *
 * What it proves (docs/ONLINE_SPEC.md section 13, sync fixes):
 *   A  a shop purchase and an upgrade made 200 ms before an AI edit both survive (real timing);
 *   B  the same with the network down (the rebase through the listener): purchase, job and a
 *      collect survive, an AI move wins over a local move, drawn roads return to the inventory,
 *      nothing is minted, the bank equals the cloud bank;
 *   C  the same through the push-conflict path;
 *   D  a stream of edits reaches the cloud within the max wait (no starving debounce);
 *   E  a second collect is pushed, and a later AI edit does not refill it;
 *   F  two tabs: each applies the other's push, neither overwrites it;
 *   G  two devices: the bank follows live and merges (no free upgrade, no lost income);
 *   H  an AI stow with stored output: paid once, recorded in saves.credited, and the AI can still
 *      undo it (the game does not push just to clear the credit);
 *   I  a guest city replaced at sign-in is offered back in ACCOUNT and restored to the account;
 *   J  an account whose bank doc is missing starts from the starter bank, not the previous account's.
 * Review round 2:
 *   K  a bank write whose reply is lost is applied once: the SDK's re-run adopts it, and a push that
 *      gave up with its write in doubt is settled after a reload (saves.writers tokens);
 *   L  a city push whose reply is lost with an AI edit on top: the purchase is not rebased in twice
 *      (open tab and reload; cities.writers tokens);
 *   M  more than 100 AI stow credits made while the game is closed: each paid exactly once;
 *   N  offline: the same mill stowed here and by the AI is paid once; a mill collected + spent then
 *      stowed by the AI mints nothing; a job gem-finished + stowed and a Landmine placed + upgraded
 *      here keep their levels through an AI edit;
 *   O  a device clock behind the MCP server's: offline changes survive a reopen;
 *   P  a building placed while the AI edits is kept; on the tile the AI filled it goes back to the
 *      inventory and the toast says so.
 */
import path from 'node:path';
import fs from 'node:fs';
import {
  GAME_ROOT, sleep, makeReporter, emulatorHosts, loadRules, deleteAuthUsers, adminFirestore,
  newPlayer, recordErrors, installToastRecorder, toastsOf, reopenGame
} from './lib/e2e.mjs';

const URL = process.env.GAME_URL || 'http://localhost:3101/';
const PROJECT = process.env.SYNC_PROJECT || 'demo-cs-sync';
const AUTH_PROJECT = 'demo-city-siege';
const SUFFIX = process.env.E2E_EMAIL_SUFFIX || '@e2e-sync.test';   // own auth users only (a shared pool)
const SHOTS = process.argv[2] || null;        // screenshots only when a directory is given
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const PW_CORE = process.env.PW_CORE;
if (!PW_CORE) { console.error('PW_CORE=<playwright-core dir> is required'); process.exit(2); }
const { chromium } = await import(path.join(PW_CORE, 'index.mjs'));

const hosts = emulatorHosts();
const R = makeReporter();
const errors = [];
const RUN = Date.now().toString(36).slice(-5);
const { db } = adminFirestore(PROJECT, hosts);
const { CityStore } = await import(path.join(GAME_ROOT, 'mcp-server/src/store.js'));
const store = new CityStore(db);
const FIX = (n) => JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'tools/online/fixtures', n + '.cloud.json'), 'utf8'));

// ------------------------------------------------------------------------------ helpers

const email = (who) => `${who}.${RUN}${SUFFIX}`;
const nameOf = (who) => ('Sy' + who + RUN).slice(0, 20);
async function signUp(pl, who) {
  const r = await pl.page.evaluate(([em, nm]) => citySiege.online.signUp({ email: em, password: 'secret123', name: nm }).then(() => 'ok', e => e.code + ' ' + e.message), [email(who), nameOf(who)]);
  if (r !== 'ok') throw new Error('signUp failed ' + r);
  await pl.page.waitForFunction(() => citySiege.online.sync.linked && citySiege.online.sync.status === 'synced' && citySiege.online.profile, null, { timeout: 25000 });
  pl.uid = await pl.page.evaluate(() => citySiege.online.user.uid);
  return pl.uid;
}
async function signIn(pl, who) {
  const r = await pl.page.evaluate((em) => citySiege.online.signIn({ email: em, password: 'secret123' }).then(() => 'ok', e => e.code + ' ' + e.message), email(who));
  if (r !== 'ok') throw new Error('signIn failed ' + r);
  await pl.page.waitForFunction(() => citySiege.online.sync.linked, null, { timeout: 25000 });
  pl.uid = await pl.page.evaluate(() => citySiege.online.user.uid);
  return pl.uid;
}
async function until(pl, fn, arg, timeout = 15000) {
  try { await pl.page.waitForFunction(fn, arg, { timeout, polling: 100 }); return true; } catch (e) { return false; }
}
async function untilNode(fn, timeout = 15000, every = 200) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(every);
  }
}
const cityDoc = async (uid) => (await db.doc('cities/' + uid).get()).data();
const saveDoc = async (uid) => (await db.doc('saves/' + uid).get()).data();
const mcp = async (uid, ops) => {
  const r = await store.applyDesign(uid, { ops, writerId: 'mcp:e2esync' });
  if (!r.ok) throw new Error('mcp edit failed: ' + JSON.stringify(r.results && r.results[r.failedAt]));
  return r.rev;
};
/** Everything the city owns per type (inventory + placed; road = inventory + tiles), local or cloud. */
function ownedOf(layout, holdings) {
  const out = {};
  const inv = (holdings && holdings.inventory) || {};
  for (const [t, n] of Object.entries(inv)) out[t] = (out[t] || 0) + (Number(n) || 0);
  for (const b of layout.buildings || []) if (!b.gate && b.t !== 'main_gate') out[b.t] = (out[b.t] || 0) + 1;
  out.road = (out.road || 0) + (layout.roads || []).length;
  return out;
}
const local = (pl) => pl.page.evaluate(() => {
  const G = citySiege, e = G.economyManager, bm = G.buildingManager, cs = G.online.cloudSync;
  const layout = cs ? cs._localLayout(Date.now()) : null;
  return {
    cash: Math.round(e.cash), iron: Math.round(e.iron), wood: Math.round(e.wood), gems: e.gems,
    inv: { ...e.inventory }, roads: bm.roadNetwork.roads.size, buildings: bm.buildings.length,
    th: (bm.buildings.find(b => b.type === 'town_hall') || {}).level,
    jobs: bm.activeBuildTasks.map(t => ({ id: t.building.id, t: t.building.type, to: t.targetLevel, endsAt: Math.round(t.endsAt) })),
    layout, holdings: { inventory: { ...e.inventory } },
    syncedRev: cs ? cs.syncedRev : 0, status: G.online.sync.status, pending: !!(cs && cs.pendingRemote)
  };
});
const bankOf = (s) => ({ cash: Math.round(s.cash), iron: Math.round(s.iron), wood: Math.round(s.wood), gems: Math.round(s.gems) });
const sameBank = (a, b) => a.cash === Math.round(b.cash) && a.iron === Math.round(b.iron) && a.wood === Math.round(b.wood) && a.gems === Math.round(b.gems);
const shot = (pl, name) => (SHOTS ? pl.page.screenshot({ path: path.join(SHOTS, name + '.png') }).catch(() => {}) : Promise.resolve());
async function setBank(pl, bank) {
  await pl.page.evaluate((b) => { const e = citySiege.economyManager; Object.assign(e, b); e.save(); }, bank);
}
async function waitSettled(pl, uid, minRev, timeout = 15000) {
  return until(pl, ([min]) => {
    const cs = citySiege.online.cloudSync;
    return cs.syncedRev >= min && !cs.pendingRemote && !cs.pushing && !cs._pushTimer && !cs._dirtySince && citySiege.online.sync.status === 'synced';
  }, [minRev], timeout);
}

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// ------------------------------------------------------------------------------ setup
R.section('setup');
const rulesStatus = await loadRules(PROJECT, hosts, fs.readFileSync(path.join(GAME_ROOT, 'firestore.rules'), 'utf8'));
R.check(rulesStatus === 200, `firestore.rules loaded into ${PROJECT}`, rulesStatus);
await fetch(`http://${hosts.firestore}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
R.note(`old ${SUFFIX} auth users removed: ${await deleteAuthUsers(AUTH_PROJECT, hosts, { suffix: SUFFIX })}`);

/** One scenario: a crash fails it and the suite goes on with the next one. SYNC_ONLY=K,L runs only those (A always runs). */
const ONLY = (process.env.SYNC_ONLY || '').split(',').map(x => x.trim()).filter(Boolean);
async function scenario(title, fn) {
  if (ONLY.length && !ONLY.includes(title.split(' ')[0])) return;
  R.section(title);
  try { await fn(); } catch (e) { R.check(false, 'scenario crashed: ' + ((e && e.stack) || e).toString().split('\n').slice(0, 3).join(' | ')); }
}

let A = null;
try {
  // ============================================================================ A
  R.section('A  purchase + upgrade 200 ms before an AI edit (real timing)');
  A = await newPlayer(browser, URL, 'A', errors);
  const projectOk = await A.page.evaluate((p) => citySiege.online.config.projectId === p, PROJECT);
  R.check(projectOk, `the page talks to Firestore project ${PROJECT}`);
  if (!projectOk) throw new Error('Vite must run with VITE_FIREBASE_PROJECT_ID=' + PROJECT);
  await setBank(A, { cash: 20000, iron: 20000, wood: 20000, gems: 500 });
  await signUp(A, 'a');
  await sleep(2500);
  {
    const before = await local(A);
    const acted = await A.page.evaluate(() => {
      const G = citySiege, ui = G.uiManager, bm = G.buildingManager;
      ui.setScreen('SHOP');
      const card = [...document.querySelectorAll('.blueprint-card')].find(c => /Roadblock/.test((c.querySelector('.blueprint-title') || {}).textContent || ''));
      card.querySelector('.btn-buy-to-inv').click();
      ui.setScreen('HOME');
      const th = bm.buildings.find(b => b.type === 'town_hall');
      ui.showBuildingInspector(th);
      document.getElementById('btn-upgrade-building').click();
      ui.hideBuildingInspector();
      return { roadblock: G.economyManager.inventory.roadblock, thJob: !!th.isUnderConstruction };
    });
    await sleep(200);
    const tree = (await cityDoc(A.uid)).layout.buildings.find(b => b.t === 'tree');
    const aiRev = await mcp(A.uid, [{ op: 'remove_tree', id: tree.id }]);
    await waitSettled(A, A.uid, aiRev, 12000);
    await sleep(3500);   // bank push
    const after = await local(A);
    const cloud = await cityDoc(A.uid);
    const bank = (await saveDoc(A.uid)).bank;
    R.check(acted.roadblock === before.inv.roadblock + 1 && acted.thJob, 'the purchase and the upgrade happened', acted);
    R.check(after.inv.roadblock === before.inv.roadblock + 1 && cloud.holdings.inventory.roadblock === after.inv.roadblock,
      'the Roadblock is in the inventory, here and in the cloud', { local: after.inv.roadblock, cloud: cloud.holdings.inventory.roadblock });
    R.check(after.jobs.some(j => j.t === 'town_hall') && cloud.layout.tasks.some(t => t.t === 'town_hall'), 'the Town Hall job runs, here and in the cloud', { local: after.jobs, cloud: cloud.layout.tasks });
    R.check(!cloud.layout.buildings.some(b => b.id === tree.id) && !after.layout.buildings.some(b => b.id === tree.id), 'the AI edit (tree cleared) is in both');
    R.check(sameBank(bankOf(after), bank), 'bank here == cloud bank', { local: bankOf(after), cloud: bank });
  }

  // ============================================================================ B
  await scenario('B  offline: purchase, upgrade, collect, move, roads - then an AI edit - then back online', async () => {
    const pl = A;
    await sleep(1500);
    const c0 = await cityDoc(pl.uid);
    const st0 = await local(pl);
    const ps = c0.layout.buildings.find(b => b.t === 'police_station');
    await pl.ctx.setOffline(true);
    const acted = await pl.page.evaluate((psId) => {
      const G = citySiege, bm = G.buildingManager, e = G.economyManager, ui = G.uiManager;
      const out = {};
      // SHOP purchase (roadblock limit may be hit: buy a tree then)
      const pick = bm.canBuy('spike_trap').ok ? 'spike_trap' : 'tree';
      const def = bm.catalog[pick];
      if (e.deduct(def.cost)) { e.addToInventory(pick, def.packCount || 1); out.bought = pick; }
      // gem-finish the Town Hall job started in A (a level only this device knows about)
      const th = bm.buildings.find(b => b.type === 'town_hall');
      out.gemFinish = bm.finishWithGems(th).ok;
      out.th = th.id;
      // collect every tappable producer
      out.collected = 0;
      for (const b of bm.buildings) if (b.produceType && !b.raidOnly && b.stored >= 1) { bm.collectBuilding(b); out.collected++; }
      // move the police station one tile (as the drag does)
      const p = bm.buildings.find(b => b.id === psId);
      out.moved = bm.moveBuilding(p, p.gx + 1, p.gz).ok;
      // draw two roads
      ui.setScreen('DESIGN'); G.gridSystem.setMode('draw_road');
      out.drew = 0;
      out.tiles = [];
      for (let gx = -9; gx <= 9 && out.drew < 2; gx++) for (let gz = 6; gz <= 9 && out.drew < 2; gz++) {
        if (Math.hypot(gx, gz) > 10 || bm.roadNetwork.hasRoad(gx, gz)) continue;
        const n = bm.roadNetwork.roads.size; G.gridSystem.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
        if (bm.roadNetwork.roads.size > n) { out.drew++; out.tiles.push(gx + ',' + gz); }
      }
      G.gridSystem.setMode('design_select'); ui.setScreen('HOME');
      return out;
    }, ps.id);
    await sleep(200);
    const aiRev = await mcp(pl.uid, [{ op: 'move', id: ps.id, gx: ps.gx - 2, gz: ps.gz - 2 }, { op: 'remove_tree', id: c0.layout.buildings.find(b => b.t === 'tree').id }]);
    const aiDoc = await cityDoc(pl.uid);
    await sleep(2500);
    await pl.ctx.setOffline(false);
    const merged = await untilNode(async () => { const d = await cityDoc(pl.uid); return d.rev > aiRev && d.updatedBy === 'game' ? d : null; }, 20000);
    await waitSettled(pl, pl.uid, aiRev + 1, 12000);
    await sleep(4000);
    const after = await local(pl);
    const bank = (await saveDoc(pl.uid)).bank;
    await shot(pl, 'B-after-reconnect');
    R.check(acted.gemFinish && acted.moved && acted.drew === 2 && acted.collected > 0 && !!acted.bought, 'offline actions happened', acted);
    R.check(!!merged, 'a merged version was pushed on top of the AI version', merged && { rev: merged.rev, by: merged.updatedBy });
    const cps = (merged || aiDoc).layout.buildings.find(b => b.id === ps.id);
    const lps = after.layout.buildings.find(b => b.id === ps.id);
    R.check(cps.gx === ps.gx - 2 && cps.gz === ps.gz - 2 && lps.gx === ps.gx - 2, 'the AI move wins over the local move (cloud + here)', { cloud: [cps.gx, cps.gz], local: [lps.gx, lps.gz] });
    const mth = merged && merged.layout.buildings.find(b => b.id === acted.th);
    R.check(mth && mth.l === 2 && !merged.layout.tasks.some(t => t.id === acted.th) && after.th === 2,
      'the gem-finished Town Hall is level 2 with no job (the gems spent offline stand)', { cloud: mth && mth.l, local: after.th });
    R.check(merged && (merged.holdings.inventory[acted.bought] || 0) === (aiDoc.holdings.inventory[acted.bought] || 0) + 1, `the ${acted.bought} bought offline survives`,
      { ai: aiDoc.holdings.inventory[acted.bought], merged: merged && merged.holdings.inventory[acted.bought] });
    R.check(merged && acted.tiles.every(k => merged.layout.roads.includes(k)) && aiDoc.layout.roads.every(k => merged.layout.roads.includes(k)) &&
      merged.layout.roads.length === aiDoc.layout.roads.length + 2 && merged.holdings.inventory.road === aiDoc.holdings.inventory.road - 2,
      'the 2 roads drawn offline stand on top of the AI version (their tiles came out of the inventory)',
      { roads: merged && merged.layout.roads.length, ai: aiDoc.layout.roads.length, inv: merged && merged.holdings.inventory.road, aiInv: aiDoc.holdings.inventory.road });
    const pumpsLocal = after.layout.buildings.filter(b => b.t === 'petrol_pump').map(b => b.st);
    R.check(pumpsLocal.every(s => s < 200), 'collected producers stay (nearly) empty - the collect is not paid twice', pumpsLocal);
    const oa = ownedOf(aiDoc.layout, aiDoc.holdings), om = ownedOf(merged.layout, merged.holdings);
    const minted = Object.keys({ ...oa, ...om }).filter(t => (om[t] || 0) !== (oa[t] || 0) + (t === acted.bought ? 1 : 0));
    R.check(minted.length === 0, 'nothing minted: owned per type = AI version + the purchase', minted.map(t => [t, oa[t], om[t]]));
    R.check(sameBank(bankOf(after), bank), 'bank here == cloud bank', { local: bankOf(after), cloud: bank });
    const toasts = await toastsOf(pl);
    R.check(toasts.some(t => /AI designer/.test(t) && /kept/.test(t)), 'the toast says the AI changed the city and our changes were kept', toasts.slice(-3));
  });

  // ============================================================================ C
  await scenario('C  the push-conflict path (listener detached, AI edit first, then a purchase + upgrade)', async () => {
    const pl = A;
    await sleep(1500);
    const c0 = await cityDoc(pl.uid);
    await pl.page.evaluate(() => { const cs = citySiege.online.cloudSync; cs._unsubCity(); cs._unsubCity = null; });
    const aiRev = await mcp(pl.uid, [{ op: 'remove_tree', id: c0.layout.buildings.find(b => b.t === 'tree').id }]);
    const acted = await pl.page.evaluate(() => {
      const G = citySiege, bm = G.buildingManager, e = G.economyManager;
      const t = bm.canBuy('tree').ok ? 'tree' : 'road';
      const def = bm.catalog[t];
      const bought = e.deduct(def.cost) ? (e.addToInventory(t, def.packCount || 1), t) : null;
      const pump = bm.buildings.find(b => b.type === 'petrol_pump' && !b.isUnderConstruction);
      return { bought, n: def.packCount || 1, upgrade: bm.upgradeBuilding(pump).ok, pump: pump.id };
    });
    const merged = await untilNode(async () => { const d = await cityDoc(pl.uid); return d.rev > aiRev ? d : null; }, 15000);
    await pl.page.evaluate(() => { const cs = citySiege.online.cloudSync; cs._subscribe(cs._gen); });
    // c0 is the city just before the AI edit (the AI version = c0 minus one tree).
    R.check(!!merged && merged.updatedBy === 'game', 'the push hit the newer AI version, rebased and pushed', merged && { rev: merged.rev, by: merged.updatedBy });
    R.check(merged && merged.layout.tasks.some(t => t.id === acted.pump), 'the pump upgrade survives');
    R.check(merged && (merged.holdings.inventory[acted.bought] || 0) === (c0.holdings.inventory[acted.bought] || 0) + acted.n,
      `the ${acted.bought} purchase survives`, { before: c0.holdings.inventory[acted.bought], merged: merged && merged.holdings.inventory[acted.bought] });
    R.check(merged && merged.layout.buildings.length === c0.layout.buildings.length - 1, 'the AI edit is in it (one tree fewer)');
  });

  // ============================================================================ D
  await scenario('D  a stream of edits reaches the cloud within the max wait', async () => {
    const pl = A;
    await waitSettled(pl, pl.uid, 0, 10000);
    await sleep(1500);
    const rev0 = (await cityDoc(pl.uid)).rev;
    await pl.page.evaluate(() => { const e = citySiege.economyManager; e.inventory.road = (e.inventory.road || 0) + 20; e.save(); });
    await sleep(2500);
    const start = Date.now();
    const revs = [];
    const poll = setInterval(async () => { try { revs.push([Date.now() - start, (await cityDoc(pl.uid)).rev]); } catch (e) { /* ignore */ } }, 250);
    const tiles = await pl.page.evaluate(() => {
      const bm = citySiege.buildingManager; const out = [];
      for (let gx = -10; gx <= 10 && out.length < 9; gx++) for (let gz = -10; gz <= 10 && out.length < 9; gz++) {
        if (Math.hypot(gx, gz) <= 10 && !bm.roadNetwork.hasRoad(gx, gz) && !bm.isFootprintBlocked(1, gx, gz)) out.push([gx, gz]);
      }
      citySiege.uiManager.setScreen('DESIGN'); citySiege.gridSystem.setMode('draw_road');
      return out;
    });
    for (const [gx, gz] of tiles) {
      await pl.page.evaluate(([gx, gz]) => citySiege.gridSystem.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 }), [gx, gz]);
      await sleep(700);
    }
    clearInterval(poll);
    await pl.page.evaluate(() => { citySiege.gridSystem.setMode('design_select'); citySiege.uiManager.setScreen('HOME'); });
    const during = revs.filter(([t]) => t <= tiles.length * 700);
    const first = during.find(([, r]) => r > rev0);
    const distinct = new Set(during.map(([, r]) => r)).size;
    R.check(!!first && first[0] <= 3900, `the first push landed ${first ? first[0] : '-'} ms after the first tile (<= 3.9 s) while drawing`, revs.slice(0, 12));
    R.check(distinct >= 3, `${distinct - 1} pushes during ${tiles.length} tiles drawn over ${(tiles.length * 0.7).toFixed(1)} s`, [...new Set(during.map(([, r]) => r))]);
  });

  // ============================================================================ E
  await scenario('E  a second collect is pushed; a later AI edit does not refill it', async () => {
    const pl = A;
    await waitSettled(pl, pl.uid, 0, 10000);
    const tapAll = () => pl.page.evaluate(() => {
      const bm = citySiege.buildingManager, e = citySiege.economyManager;
      const c0 = e.cash + e.iron + e.wood; let n = 0;
      for (const b of bm.buildings) if (b.produceType && !b.raidOnly && b.stored >= 1) { bm.collectBuilding(b); n++; }
      return { n, gained: Math.round(e.cash + e.iron + e.wood - c0) };
    });
    await tapAll();
    await sleep(3000);
    const rev1 = (await cityDoc(pl.uid)).rev;
    await sleep(15000);
    const tap2 = await tapAll();
    const pushed = await untilNode(async () => ((await cityDoc(pl.uid)).rev > rev1 ? true : null), 3000);
    R.check(tap2.gained > 0 && !!pushed, `the second collect (+${tap2.gained}) reached the cloud within 3 s`, { rev1 });
    await sleep(8000);
    const tree = (await cityDoc(pl.uid)).layout.buildings.find(b => b.t === 'tree');
    const aiRev = await mcp(pl.uid, [{ op: 'remove_tree', id: tree.id }]);
    await waitSettled(pl, pl.uid, aiRev, 10000);
    const tap3 = await tapAll();
    // ~9 s of production since tap 2 (15 s of it would be 2x). The reviewer saw the whole tap-2 haul again.
    R.check(tap3.gained < tap2.gained, `after the AI edit a tap pays only what was made since (+${tap3.gained} < +${tap2.gained})`);
  });

  // ============================================================================ F
  await scenario('F  two tabs of one account', async () => {
    const T2page = await A.ctx.newPage();
    recordErrors(T2page, 'A2', errors);
    await T2page.goto(URL);
    const T2 = { ctx: A.ctx, page: T2page, tag: 'A2' };
    await until(T2, () => window.citySiege && citySiege.online && citySiege.online.sync.linked, null, 25000);
    await sleep(2500);
    const free = await A.page.evaluate(() => {
      const bm = citySiege.buildingManager; const out = [];
      for (let gx = -9; gx <= 9 && out.length < 4; gx += 3) for (let gz = -9; gz <= 9 && out.length < 4; gz++) {
        if (Math.hypot(gx, gz) <= 10 && !bm.roadNetwork.hasRoad(gx, gz) && !bm.isFootprintBlocked(1, gx, gz)) { out.push([gx, gz]); break; }
      }
      return out;
    });
    const [R1, R2, R3, R4] = free;
    const draw = (pl, [gx, gz]) => pl.page.evaluate(([gx, gz]) => {
      const G = citySiege; G.uiManager.setScreen('DESIGN'); G.gridSystem.setMode('draw_road');
      G.gridSystem.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
      G.gridSystem.setMode('design_select'); G.uiManager.setScreen('HOME');
      return G.buildingManager.roadNetwork.hasRoad(gx, gz);
    }, [gx, gz]);
    const has = (pl, [gx, gz]) => pl.page.evaluate(([gx, gz]) => citySiege.buildingManager.roadNetwork.hasRoad(gx, gz), [gx, gz]);
    await draw(T2, R2);
    const tab1Got = await until(A, ([gx, gz]) => citySiege.buildingManager.roadNetwork.hasRoad(gx, gz), R2, 10000);
    R.check(tab1Got, 'tab 1 applies the road tab 2 drew');
    await draw(A, R1);
    await sleep(5000);
    const roads = (await cityDoc(A.uid)).layout.roads;
    R.check(roads.includes(R1.join(',')) && roads.includes(R2.join(',')), 'the cloud has both tabs\' roads', { R1, R2 });
    R.check(await has(T2, R1), 'tab 2 applies the road tab 1 drew');
    // The same with tab 1's listener late (it has not seen tab 2's push when it pushes itself):
    // one shared "synced revision" let tab 1's push pass the check and overwrite tab 2's road.
    await A.page.evaluate(() => { const cs = citySiege.online.cloudSync; cs._unsubCity(); cs._unsubCity = null; });
    await draw(T2, R4);
    await untilNode(async () => ((await cityDoc(A.uid)).layout.roads.includes(R4.join(',')) ? true : null), 8000);
    await sleep(500);
    await draw(A, R3);
    await sleep(5000);
    await A.page.evaluate(() => { const cs = citySiege.online.cloudSync; cs._subscribe(cs._gen); });
    const roads2 = (await cityDoc(A.uid)).layout.roads;
    R.check(roads2.includes(R3.join(',')) && roads2.includes(R4.join(',')), 'tab 1 pushing without having seen tab 2\'s push does not overwrite it', { R3, R4 });
    await sleep(2000);
    R.check(await has(T2, R3) && await has(A, R4), 'both tabs end up with both roads');
    await T2page.close();
  });

  // ============================================================================ G
  await scenario('G  two devices: the bank follows live and merges', async () => {
    const B = await newPlayer(browser, URL, 'B', errors);
    const G = await newPlayer(browser, URL, 'G', errors);
    await signUp(B, 'dev');
    await sleep(2500);
    await signIn(G, 'dev');
    await sleep(3500);
    const b0 = await local(B);
    const up = await B.page.evaluate(() => {
      const bm = citySiege.buildingManager, e = citySiege.economyManager;
      const th = bm.buildings.find(x => x.type === 'town_hall');
      const c0 = { cash: e.cash, iron: e.iron, wood: e.wood };
      const r = bm.upgradeBuilding(th);
      return { ok: r.ok, paid: { cash: Math.round(c0.cash - e.cash), iron: Math.round(c0.iron - e.iron), wood: Math.round(c0.wood - e.wood) } };
    });
    const gSees = await until(G, ([cash]) => Math.round(citySiege.economyManager.cash) === cash, [b0.cash - up.paid.cash], 12000);
    R.check(up.ok && gSees, 'device 2 shows the spend of device 1 live (no reload)', up);
    const tap = await G.page.evaluate(() => {
      const bm = citySiege.buildingManager;
      const p = bm.buildings.filter(b => b.produceType && !b.raidOnly && b.stored >= 1).sort((a, b) => b.stored - a.stored)[0];
      return bm.collectBuilding(p).payout;
    });
    await sleep(5000);
    const want = { cash: b0.cash - up.paid.cash + tap.cash, iron: b0.iron - up.paid.iron + tap.iron, wood: b0.wood - up.paid.wood + tap.wood };
    const bank = (await saveDoc(B.uid)).bank;
    R.check(Math.round(bank.cash) === want.cash && Math.round(bank.iron) === want.iron && Math.round(bank.wood) === want.wood,
      'cloud bank = spend on device 1 + income on device 2', { bank, want });
    await B.page.reload();
    await until(B, () => window.citySiege && citySiege.online && citySiege.online.sync.linked, null, 25000);
    await sleep(3000);
    const b1 = await local(B);
    R.check(b1.cash === want.cash && b1.iron === want.iron && b1.wood === want.wood && b1.jobs.some(j => j.t === 'town_hall'),
      'device 1 after a reload: paid upgrade (job running) + device 2 income', { local: bankOf(b1), want });
    await B.ctx.close();
    await G.ctx.close();
  });

  // ============================================================================ H
  await scenario('H  an AI stow with stored output: paid once, and the AI can still undo it', async () => {
    const H = await newPlayer(browser, URL, 'H', errors);
    await signUp(H, 'stow');
    await sleep(2500);
    const cur = await cityDoc(H.uid);
    const fx = FIX('th5-city');
    fx.layout.savedAt = Date.now() - 3 * 3600 * 1000;
    fx.layout.tasks = [];
    await db.doc('cities/' + H.uid).set({ ...cur, townHall: 5, rev: cur.rev + 1, updatedBy: 'game', writerId: 'other-device', layout: fx.layout, holdings: fx.holdings });
    await until(H, () => citySiege.buildingManager.getTownHallLevel() === 5, null, 15000);
    await waitSettled(H, H.uid, cur.rev + 1, 10000);
    await sleep(4000);
    const mill = await H.page.evaluate(() => {
      const b = citySiege.buildingManager.buildings.find(x => x.type === 'lumber_mill' && x.stored > 50);
      return b && { id: b.id, stored: Math.floor(b.stored) };
    });
    const wood0 = Math.round((await saveDoc(H.uid)).bank.wood);
    const stowRev = await mcp(H.uid, [{ op: 'stow', id: mill.id }]);
    const credit = Object.entries((await cityDoc(H.uid)).holdings.bankCredits || {})[0];
    await until(H, (id) => !citySiege.buildingManager.buildings.some(b => b.id === id), mill.id, 10000);
    await sleep(6000);
    const after = await cityDoc(H.uid);
    const save = await saveDoc(H.uid);
    R.check(!!credit, 'the stow carried a bank credit', credit);
    R.check(after.rev === stowRev && after.updatedBy === 'mcp', 'the game did not push over the AI version just to clear the credit', { rev: after.rev, stowRev, by: after.updatedBy });
    R.check(Math.round(save.bank.wood) === wood0 + credit[1].wood && (save.credited || []).includes(credit[0]),
      `the cloud bank got the credit once (+${credit[1].wood} wood) and records it in saves.credited`, { wood0, wood: save.bank.wood, credited: save.credited });
    const undo = await store.undo(H.uid, { writerId: 'mcp:e2esync' }).then(r => r, e => ({ error: e.code || e.message }));
    R.check(undo && undo.ok, 'undo_last_change works after the game applied (and paid) the stow', undo && (undo.error || undo.summary));
    await until(H, (id) => citySiege.buildingManager.buildings.some(b => b.id === id), mill.id, 10000);
    await sleep(5000);
    const bankAfterUndo = Math.round((await saveDoc(H.uid)).bank.wood);
    const millBack = await H.page.evaluate((id) => { const b = citySiege.buildingManager.buildings.find(x => x.id === id); return b && Math.floor(b.stored); }, mill.id);
    R.check(bankAfterUndo === wood0 + credit[1].wood && millBack !== null && millBack < 50, 'after the undo the mill is back (empty) and the credit was not paid again', { bankAfterUndo, millBack });
    // A second device signing in later must not be paid the same credit again.
    const H2 = await newPlayer(browser, URL, 'H2', errors);
    await signIn(H2, 'stow');
    await sleep(5000);
    R.check(Math.round((await saveDoc(H.uid)).bank.wood) === wood0 + credit[1].wood, 'a second device signing in is not paid the credit again');
    await shot(H, 'H-after-undo');
    await H.ctx.close();
    await H2.ctx.close();
  });

  // ============================================================================ I
  await scenario('I  a guest city replaced at sign-in is offered back and restored', async () => {
    const phone = await newPlayer(browser, URL, 'phone', errors);
    await signUp(phone, 'guest');
    await sleep(2500);
    await phone.ctx.close();
    const pc = await newPlayer(browser, URL, 'pc', errors);
    await pc.page.evaluate(() => {
      const G = citySiege, bm = G.buildingManager, e = G.economyManager;
      e.cash = 9000; e.iron = 9000; e.wood = 9000; e.save();
      const th = bm.buildings.find(b => b.type === 'town_hall');
      bm.upgradeBuilding(th); bm.finishConstructionInstantly(th);
      e.cash = 8150; e.save();
      G.saveCityNow();
    });
    await signIn(pc, 'guest');
    await sleep(3500);
    const s1 = await local(pc);
    const toasts = await toastsOf(pc);
    R.check(s1.th === 1, 'signing in loaded the account city (TH1)', s1.th);
    R.check(toasts.some(t => /guest/.test(t) && /Restore/.test(t)), 'the sign-in toast says the guest city is kept', toasts.slice(-2));
    await pc.page.evaluate(() => citySiege.uiManager.setScreen('ACCOUNT'));
    await sleep(600);
    const card = await pc.page.evaluate(() => { const c = document.querySelector('.guest-backup-card'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
    R.check(!!card && /Town Hall 2/.test(card) && /8,150/.test(card), 'ACCOUNT shows the kept guest city (TH2, 8,150 cash)', card);
    await shot(pc, 'I-account-guest-card');
    await pc.page.click('[data-action="restore-guest"]');
    const back = await until(pc, () => citySiege.buildingManager.getTownHallLevel() === 2, null, 10000);
    await sleep(5000);
    const cloud = await cityDoc(pc.uid);
    const s2 = await local(pc);
    R.check(back && s2.cash === 8150, 'the guest city is back (TH2, 8150 cash)', { th: s2.th, cash: s2.cash });
    R.check((cloud.layout.buildings.find(b => b.t === 'town_hall') || {}).l === 2 && Math.round((await saveDoc(pc.uid)).bank.cash) === 8150,
      'and is now the account\'s city and bank in the cloud');
    R.check(!(await pc.page.evaluate(() => !!document.querySelector('.guest-backup-card'))), 'the card is gone after the restore');
    await shot(pc, 'I-after-restore');
    await pc.ctx.close();
  });

  // ============================================================================ J
  await scenario('J  an account with no bank doc does not inherit the previous account\'s bank', async () => {
    const pc = await newPlayer(browser, URL, 'J', errors);
    await signUp(pc, 'jc');
    const cUid = pc.uid;
    await sleep(2500);
    await pc.page.evaluate(() => citySiege.online.signOut());
    await sleep(1000);
    await db.doc('saves/' + cUid).delete();         // C's first bank push never landed
    // Account D plays on this browser (a fresh city after the account switch) and earns a rich bank.
    await signUp(pc, 'jd');
    await until(pc, () => window.citySiege && citySiege.online && citySiege.online.sync.linked && citySiege.online.sync.status === 'synced', null, 25000);
    await sleep(2500);
    await pc.page.evaluate(() => { const e = citySiege.economyManager; e.cash = 4705; e.save(); });
    await sleep(4500);
    await pc.page.evaluate(() => citySiege.online.signOut());
    await sleep(1000);
    await signIn(pc, 'jc');
    await sleep(4000);
    const s = await local(pc);
    const save = await saveDoc(cUid);
    R.check(s.cash === 1500 && s.iron === 800 && s.wood === 1000, 'C starts from the starter bank, not D\'s 4705', bankOf(s));
    R.check(save && Math.round(save.bank.cash) === 1500, 'and saves/C is written with the starter bank', save && save.bank);
    await pc.ctx.close();
  });

  // ============================================================================ review round 2
  /** Another device pushed the TH5 fixture 3 h ago (full stores); wait until this page has it. */
  async function th5City(pl, { keepJob = false } = {}) {
    const cur = await cityDoc(pl.uid);
    const fx = FIX('th5-city');
    fx.layout.savedAt = Date.now() - 3 * 3600 * 1000;
    if (keepJob) for (const t of fx.layout.tasks) t.endsAt = Date.now() + 3600 * 1000; else fx.layout.tasks = [];
    await db.doc('cities/' + pl.uid).set({ ...cur, townHall: 5, rev: cur.rev + 1, updatedBy: 'game', writerId: 'other-device', layout: fx.layout, holdings: fx.holdings });
    await until(pl, () => citySiege.buildingManager.getTownHallLevel() === 5, null, 15000);
    await sleep(4500);
    await waitSettled(pl, pl.uid, cur.rev + 1, 20000);
  }
  const collectPump = (pl) => pl.page.evaluate(() => {
    const bm = citySiege.buildingManager;
    const b = bm.buildings.find(x => x.type === 'petrol_pump' && x.stored >= 1);
    return b ? bm.collectBuilding(b).payout.cash : 0;
  });
  const bankIdle = (pl) => until(pl, () => { const cs = citySiege.online.cloudSync; return !cs._bankPushing && !cs._bankTimer && !cs.pushing && !cs._pushTimer && !cs._dirtySince; }, null, 30000);
  const buyRoadblock = (pl) => pl.page.evaluate(() => {
    const ui = citySiege.uiManager;
    ui.setScreen('SHOP');
    const card = [...document.querySelectorAll('.blueprint-card')].find(c => /Roadblock/.test((c.querySelector('.blueprint-title') || {}).textContent || ''));
    card.querySelector('.btn-buy-to-inv').click();
    ui.setScreen('HOME');
    return citySiege.economyManager.inventory.roadblock;
  });

  await scenario('K  a bank write whose reply is lost is not applied twice (SDK retry; a push that gives up, then a reload)', async () => {
    for (const how of ['retry', 'reload']) {
      const pl = await newPlayer(browser, URL, 'K' + how, errors);
      await signUp(pl, 'k' + how);
      await sleep(9000);                                   // the pumps fill a little
      await bankIdle(pl);
      const bank0 = (await saveDoc(pl.uid)).bank;
      let armed = true;
      await pl.page.route(/documents:commit/, async (route) => {
        if (!armed || !/documents\/saves\//.test(route.request().postData() || '')) return route.fallback();
        const resp = await route.fetch();                  // the write lands in the cloud...
        if (resp.status() !== 200) return route.fulfill({ response: resp });
        armed = false;
        if (how === 'reload') await pl.ctx.setOffline(true);   // ...and every retry fails
        await route.abort(how === 'reload' ? 'internetdisconnected' : 'connectionreset');   // ...the reply never comes
      });
      const tap1 = await collectPump(pl);
      await bankIdle(pl);
      await pl.page.evaluate(() => citySiege.online.cloudSync.pushBank());
      await until(pl, () => !citySiege.online.cloudSync._bankPushing, null, 90000);
      let tap2 = 0;
      if (how === 'reload') {
        const doubt = await pl.page.evaluate(() => !!JSON.parse(localStorage.getItem('city_siege_cloud')).bankDoubt);
        R.check(doubt, 'reload: the push gave up and its write is kept in doubt (meta.bankDoubt)');
        await pl.ctx.setOffline(false);
        await reopenGame(pl, URL, errors);
        await until(pl, () => citySiege.online.sync.linked, null, 30000);
        await sleep(3000);
        tap2 = await collectPump(pl);
      }
      await sleep(10000);
      await bankIdle(pl);
      const cloud = Math.round((await saveDoc(pl.uid)).bank.cash);
      const want = Math.round(bank0.cash + tap1 + tap2);
      const s = await local(pl);
      R.check(cloud === want && s.cash === want, `${how}: collects of ${tap1}${tap2 ? ' + ' + tap2 : ''} banked once (cloud and device ${want})`, { cloud, device: s.cash, want });
      await pl.ctx.close();
    }
  });

  await scenario('L  a city push whose reply is lost, then an AI edit on top: the purchase is not rebased in twice', async () => {
    for (const how of ['open', 'reload']) {
      const pl = await newPlayer(browser, URL, 'L' + how, errors);
      await setBank(pl, { cash: 20000, iron: 20000, wood: 20000, gems: 500 });
      await signUp(pl, 'l' + how);
      await sleep(2500);
      await waitSettled(pl, pl.uid, 1);
      const inv0 = (await local(pl)).inv.roadblock;
      let aiRev = null;
      let aiTree = null;
      await pl.page.route(/documents:commit/, async (route) => {
        if (aiRev !== null || !/documents\/cities\//.test(route.request().postData() || '')) return route.fallback();
        const resp = await route.fetch();                  // the push lands...
        if (resp.status() !== 200) return route.fulfill({ response: resp });
        await pl.ctx.setOffline(true);                     // ...the device drops off...
        aiTree = (await cityDoc(pl.uid)).layout.buildings.find(b => b.t === 'tree').id;
        aiRev = await mcp(pl.uid, [{ op: 'remove_tree', id: aiTree }]);   // ...the AI edits on top
        await route.abort('internetdisconnected');
        if (how === 'open') { await sleep(4000); await pl.ctx.setOffline(false); }
      });
      const bought = await buyRoadblock(pl);
      await untilNode(async () => aiRev !== null, 10000);
      if (how === 'reload') {
        await sleep(1500);
        await reopenGame(pl, URL, errors, async () => { await pl.ctx.setOffline(false); });
        await until(pl, () => citySiege.online.sync.linked, null, 30000);
      }
      await sleep(8000);
      await waitSettled(pl, pl.uid, aiRev || 0, 20000);
      const s = await local(pl);
      const cloud = await cityDoc(pl.uid);
      R.check(bought === inv0 + 1 && s.inv.roadblock === bought && cloud.holdings.inventory.roadblock === bought,
        `${how}: one Roadblock bought = one more in the inventory (device and cloud)`, { inv0, bought, device: s.inv.roadblock, cloud: cloud.holdings.inventory.roadblock });
      R.check(!!aiTree && !cloud.layout.buildings.some(b => b.id === aiTree) && cloud.rev >= aiRev, `${how}: the AI edit is in the cloud city`, { rev: cloud.rev, aiRev });
      await pl.ctx.close();
    }
  });

  await scenario('M  more than 100 AI stow credits made while the game is closed: each paid exactly once', async () => {
    const pl = await newPlayer(browser, URL, 'M', errors);
    await signUp(pl, 'm');
    await sleep(2500);
    await th5City(pl);
    const bank0 = (await saveDoc(pl.uid)).bank;
    const PROD = new Set(['petrol_pump', 'lumber_mill', 'iron_foundry', 'cash_mint', 'oil_refinery', 'solar_array']);
    const ever = new Map();
    await reopenGame(pl, URL, errors, async () => {
      for (let round = 0; round < 15; round++) {
        const doc = await cityDoc(pl.uid);
        const prods = doc.layout.buildings.filter(b => PROD.has(b.t));
        await mcp(pl.uid, prods.map(b => ({ op: 'stow', id: b.id })));
        for (const [id, c] of Object.entries((await cityDoc(pl.uid)).holdings.bankCredits || {})) if (!ever.has(id)) ever.set(id, c);
        await mcp(pl.uid, prods.map(b => ({ op: 'place', type: b.t, gx: b.gx, gz: b.gz })));
        await sleep(1200);                                 // placed empty: let them make a little output to stow
      }
    });
    await until(pl, () => citySiege.online.sync.linked, null, 30000);
    await sleep(9000);
    const tap = await pl.page.evaluate(() => { const bm = citySiege.buildingManager; const b = bm.buildings.find(x => x.type === 'lumber_mill' && x.stored >= 1); return b ? bm.collectBuilding(b).payout.wood : 0; });
    await sleep(12000);
    await bankIdle(pl);
    const save = await saveDoc(pl.uid);
    const sum = [...ever.values()].reduce((a, c) => ({ cash: a.cash + c.cash, iron: a.iron + c.iron, wood: a.wood + c.wood }), { cash: 0, iron: 0, wood: 0 });
    const gained = { cash: Math.round(save.bank.cash - bank0.cash), iron: Math.round(save.bank.iron - bank0.iron), wood: Math.round(save.bank.wood - bank0.wood - tap) };
    R.check(ever.size > 100, `the AI made ${ever.size} stow credits`);
    R.check(Math.abs(gained.cash - sum.cash) <= 1 && Math.abs(gained.iron - sum.iron) <= 1 && Math.abs(gained.wood - sum.wood) <= 1,
      'the bank gained exactly the sum of the credits (each paid once)', { gained, credits: sum });
    R.check((save.credited || []).length <= 100, 'saves.credited stays within the rules\' 100', (save.credited || []).length);
    await pl.ctx.close();
  });

  await scenario('N  offline stows / placements / collects meeting an AI edit: nothing paid twice, no level lost', async () => {
    const reconnect = async (pl, minRev) => { await sleep(1500); await pl.ctx.setOffline(false); await sleep(9000); await waitSettled(pl, pl.uid, minRev, 20000); await sleep(4000); };
    {
      // The same full Lumber Mill stowed here (banks 25,200) and by the AI (a 25,200 credit).
      const pl = await newPlayer(browser, URL, 'Na', errors);
      await setBank(pl, { cash: 50000, iron: 50000, wood: 50000, gems: 500 });
      await signUp(pl, 'na');
      await sleep(2000);
      await th5City(pl);
      const bank0 = (await saveDoc(pl.uid)).bank;
      const mill = (await cityDoc(pl.uid)).layout.buildings.find(b => b.t === 'lumber_mill' && b.l === 1);
      await pl.ctx.setOffline(true);
      const held = await pl.page.evaluate((id) => { const bm = citySiege.buildingManager; const b = bm.buildings.find(x => x.id === id); const h = Math.floor(b.stored); bm.stowBuilding(b); return h; }, mill.id);
      const aiRev = await mcp(pl.uid, [{ op: 'stow', id: mill.id }]);
      await reconnect(pl, aiRev);
      const gained = Math.round((await saveDoc(pl.uid)).bank.wood - bank0.wood);
      R.check(Math.abs(gained - held) <= 1, `a: one mill store of ${held} wood is banked once (gained ${gained})`);
      await pl.ctx.close();
    }
    {
      // Collected here and the wood spent on a Town Hall upgrade; then the AI stows that mill.
      const pl = await newPlayer(browser, URL, 'Nd', errors);
      await setBank(pl, { cash: 50000, iron: 50000, wood: 0, gems: 500 });
      await signUp(pl, 'nd');
      await sleep(2000);
      await th5City(pl);
      const mill = (await cityDoc(pl.uid)).layout.buildings.find(b => b.t === 'lumber_mill' && b.l === 1);
      await pl.ctx.setOffline(true);
      const here = await pl.page.evaluate((id) => {
        const bm = citySiege.buildingManager, e = citySiege.economyManager;
        bm.collectBuilding(bm.buildings.find(x => x.id === id));
        bm.upgradeBuilding(bm.buildings.find(x => x.type === 'town_hall'));
        return Math.round(e.wood);
      }, mill.id);
      const aiRev = await mcp(pl.uid, [{ op: 'stow', id: mill.id }]);
      await reconnect(pl, aiRev);
      const wood = Math.round((await saveDoc(pl.uid)).bank.wood);
      R.check(Math.abs(wood - here) <= 1, `d: collected, spent, then stowed by the AI: wood stays ${here} (got ${wood})`);
      await pl.ctx.close();
    }
    {
      // A running job gem-finished here (L3 -> L4) and the building stowed; a Landmine placed and
      // upgraded here; the AI clears a tree meanwhile.
      const pl = await newPlayer(browser, URL, 'Nb', errors);
      await setBank(pl, { cash: 50000, iron: 50000, wood: 50000, gems: 500 });
      await signUp(pl, 'nb');
      await sleep(2000);
      await th5City(pl, { keepJob: true });
      const c0 = await cityDoc(pl.uid);
      const job = c0.layout.tasks[0];
      await pl.ctx.setOffline(true);
      const here = await pl.page.evaluate(async (id) => {
        const G = citySiege, bm = G.buildingManager;
        const b = bm.buildings.find(x => x.id === id);
        bm.finishWithGems(b);
        const level = b.level;
        bm.stowBuilding(b);
        G.uiManager.setScreen('DESIGN');
        G.gridSystem.selectedBuildingType = 'landmine'; G.gridSystem.setMode('place_inventory'); G.gridSystem.selectedBuildingType = 'landmine';
        let mine = null;
        const n0 = bm.buildings.length;
        for (let gx = -8; gx <= 8 && !mine; gx++) for (let gz = -8; gz <= 8 && !mine; gz++) {
          if (Math.hypot(gx, gz) > 9) continue;
          G.gridSystem.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
          if (bm.buildings.length > n0) mine = bm.buildings[bm.buildings.length - 1];
        }
        G.gridSystem.setMode('design_select'); G.uiManager.setScreen('HOME');
        bm.upgradeBuilding(mine);
        bm.finishWithGems(mine);
        return { type: b.type, level, mine: { id: mine.id, level: mine.level } };
      }, job.id);
      const tree = c0.layout.buildings.find(b => b.t === 'tree');
      const aiRev = await mcp(pl.uid, [{ op: 'remove_tree', id: tree.id }]);
      await reconnect(pl, aiRev);
      const c1 = await cityDoc(pl.uid);
      R.check((c1.holdings.stowedLevels[here.type] || []).includes(here.level) && !c1.layout.buildings.some(b => b.id === job.id),
        `b: the ${here.type} gem-finished to L${here.level} and stowed here is in storage at L${here.level}`, c1.holdings.stowedLevels[here.type]);
      const mine = c1.layout.buildings.find(b => b.id === here.mine.id);
      R.check(!!mine && mine.l === here.mine.level, `c: the Landmine placed + upgraded here stands at L${here.mine.level}`, mine);
      await pl.ctx.close();
    }
  });

  await scenario('O  a device clock behind the MCP server: offline changes survive a reopen', async () => {
    const pl = await newPlayer(browser, URL, 'O', errors);
    await setBank(pl, { cash: 20000, iron: 20000, wood: 20000, gems: 500 });
    await signUp(pl, 'o');
    await sleep(2500);
    const aheadStore = new CityStore(db, { now: () => Date.now() + 10 * 60 * 1000 });    // server clock 10 min ahead
    const tree = (await cityDoc(pl.uid)).layout.buildings.find(b => b.t === 'tree');
    const ai = await aheadStore.applyDesign(pl.uid, { ops: [{ op: 'remove_tree', id: tree.id }], writerId: 'mcp:e2esync' });
    await waitSettled(pl, pl.uid, ai.rev, 15000);
    await sleep(3500);
    await pl.ctx.setOffline(true);
    const bought = await buyRoadblock(pl);
    const th = await pl.page.evaluate(() => { const bm = citySiege.buildingManager; const t = bm.buildings.find(b => b.type === 'town_hall'); bm.upgradeBuilding(t); return !!t.isUnderConstruction; });
    await sleep(1500);
    await reopenGame(pl, URL, errors, async () => { await pl.ctx.setOffline(false); });
    await until(pl, () => citySiege.online.sync.linked, null, 30000);
    await sleep(6000);
    const s = await local(pl);
    const cloud = await cityDoc(pl.uid);
    R.check(th && s.inv.roadblock === bought && s.jobs.some(j => j.t === 'town_hall'), 'the Roadblock and the Town Hall job made offline are still here', { inv: s.inv.roadblock, bought, jobs: s.jobs });
    R.check(cloud.holdings.inventory.roadblock === bought && cloud.layout.tasks.some(t => t.t === 'town_hall'), 'and reached the cloud', { rev: cloud.rev, by: cloud.updatedBy });
    await pl.ctx.close();
  });

  await scenario('P  a building placed while the AI edits: kept; on the tile the AI filled: back in the inventory, with a toast', async () => {
    for (const variant of ['kept', 'taken']) {
      const pl = await newPlayer(browser, URL, 'P' + variant, errors);
      await signUp(pl, 'p' + variant);
      await sleep(2500);
      await waitSettled(pl, pl.uid, 1);
      const c0 = await cityDoc(pl.uid);
      const Rules = await import(path.join(GAME_ROOT, 'src/shared/cityRules.js'));
      const m0 = Rules.createModel(c0.layout, c0.holdings);
      const tile = c0.layout.roads.map(k => k.split(',').map(Number))
        .find(([gx, gz]) => Math.hypot(gx, gz) < 6 && Rules.checkPlace(m0, 'roadblock', gx, gz).ok && Rules.checkPlace(m0, 'spike_trap', gx, gz).ok);
      const placed = await pl.page.evaluate(([gx, gz]) => {
        const G = citySiege, bm = G.buildingManager;
        G.uiManager.setScreen('DESIGN');
        G.gridSystem.selectedBuildingType = 'roadblock'; G.gridSystem.setMode('place_inventory'); G.gridSystem.selectedBuildingType = 'roadblock';
        const n0 = bm.buildings.length;
        G.gridSystem.handleTileAction(gx, gz, null, { clientX: 0, clientY: 0 });
        G.gridSystem.setMode('design_select');
        const b = bm.buildings.length > n0 ? bm.buildings[bm.buildings.length - 1] : null;
        return b && { id: b.id, inv: G.economyManager.inventory.roadblock };
      }, tile);
      let op;
      if (variant === 'kept') {
        const f = c0.layout.buildings.find(b => b.t === 'iron_foundry');
        let to = null;
        for (let gx = -8; gx <= 8 && !to; gx++) for (let gz = -8; gz <= 8 && !to; gz++) {
          if (Math.abs(gx - tile[0]) > 3 && Rules.applyOp(Rules.createModel(c0.layout, c0.holdings), { op: 'move', id: f.id, gx, gz }, { nowMs: Date.now() }).ok) to = [gx, gz];
        }
        op = { op: 'move', id: f.id, gx: to[0], gz: to[1] };
      } else {
        op = { op: 'place', type: 'spike_trap', gx: tile[0], gz: tile[1] };
      }
      const aiRev = await mcp(pl.uid, [op]);
      await sleep(6000);
      await waitSettled(pl, pl.uid, aiRev, 15000);
      const onMap = await pl.page.evaluate((id) => !!citySiege.buildingManager.buildings.find(b => b.id === id), placed.id);
      const cloud = await cityDoc(pl.uid);
      const toasts = await toastsOf(pl);
      if (variant === 'kept') {
        R.check(onMap && cloud.layout.buildings.some(b => b.id === placed.id), 'kept: the Roadblock placed 0.1 s before the AI move stands (device and cloud)');
      } else {
        const inv = (await local(pl)).inv.roadblock;
        R.check(!onMap && inv === placed.inv + 1, 'taken: the Roadblock is back in the inventory', { onMap, inv, before: placed.inv });
        R.check(toasts.some(t => /back in your inventory/.test(t)), 'and the toast says so', toasts.slice(-2));
        await pl.page.evaluate(() => citySiege.uiManager.setScreen('DESIGN'));
        await sleep(500);
        await shot(pl, 'P-placement-back-in-inventory');
      }
      await pl.ctx.close();
    }
  });
} catch (e) {
  R.check(false, 'suite crashed: ' + (e && e.stack || e));
}

// ------------------------------------------------------------------------------ errors + cleanup
const noise = (x) => /favicon|ERR_INTERNET_DISCONNECTED|net::ERR_|WebChannelConnection|Could not reach Cloud Firestore|client is offline|status of 404/.test(x.text || x.url || '');
const real = errors.filter(x => !(x.kind === 'http' && /127\.0\.0\.1:(8085|9099)|favicon/.test(x.url)) && !noise(x));
R.check(real.length === 0, 'no page errors', real.slice(0, 6));
await browser.close();
R.note(`auth users removed: ${await deleteAuthUsers(AUTH_PROJECT, hosts, { suffix: SUFFIX })}`);
console.log(`\n${R.passes} PASS, ${R.fails} FAIL`);
process.exit(R.fails ? 1 : 0);
