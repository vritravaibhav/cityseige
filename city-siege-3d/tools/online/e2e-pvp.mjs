/**
 * e2e-pvp.mjs - the whole online game, end to end, in two real Chrome players (ONLINE_SPEC 11).
 *
 *   GAME_URL=http://localhost:3105/ PW_CORE=/path/to/node_modules/playwright-core \
 *   FIREBASE_PROJECT_ID=demo-cs-e2e node tools/online/e2e-pvp.mjs [shotsDir]
 *
 * Needs: the Firebase Emulator Suite (auth 127.0.0.1:9099, firestore 127.0.0.1:8085 - override
 * with FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST), a Vite dev server in emulator mode
 * for the SAME project id (`VITE_FIREBASE_PROJECT_ID=demo-cs-e2e npx vite --mode emulator --port 3105`),
 * Google Chrome, and mcp-server/node_modules (npm ci in mcp-server/). playwright-core is not a
 * project dependency: point PW_CORE at any install of it.
 *
 * At start it wipes ITS project's Firestore data and its own Auth users (emails ending in
 * E2E_EMAIL_SUFFIX, default `@e2e-pvp.test`: give a second run at the same time its own suffix), and
 * loads the real firestore.rules. Then, through the game's real screens wherever a screen exists:
 *   1. A (Alice) and B (Bob) sign up in the ACCOUNT screen; each guest city is the first-link upload.
 *   2. A challenges B from BATTLES (instant, 2 min design); B accepts from the badge + BATTLES.
 *   3. A generates an MCP token in ACCOUNT -> AI Designer; the test reads it from the reveal box and
 *      starts the real MCP server over stdio with the env from the stdio snippet on that screen.
 *   4. The MCP client calls get_city, place_building, move_building, add_roads, apply_design(dry_run)
 *      and a refused call; A's open Design screen shows every saved change live (building state,
 *      screenshot, "AI designer" toast) and nothing for the dry run / refusal.
 *   5. A drags a building with the mouse; the push is rev+1 and MCP get_city sees it.
 *   6. Both press READY; both cities lock (snapshots == the city docs). B then edits its city.
 *   7. A's ATTACK loads B's LOCKED snapshot in the arena (B's later edit is absent), A picks a gate on
 *      the recon map, the real engine razes the city (scripted like smoke's winRaid), the result is
 *      sent; B raids A the same way and exits at ~40 %.
 *   8. The battle resolves (winner == battleRules.decideWinner) and settles: both UIs, History,
 *      trophies and W/L. A's city is identical before/after the raid and A's localStorage never held
 *      B's city (every write inspected + all keys sampled every 100 ms).
 *   9. A second challenge with design time "None": nobody presses READY, both cities lock by themselves.
 *      A starts that raid; an MCP edit saved during recon is held back (home city and arena untouched)
 *      and applied once ABORT RECON brings A home - and the abort burnt no attempt.
 *  10. A revokes the token in ACCOUNT; the MCP server refuses it (running process and a fresh one).
 *  11. A reloads: still signed in, same city, no echo write.
 *  12. The network drops mid-raid (battle 2): the modal says "⚠ Result not sent (retrying)" - never
 *      "sent" - and the result stays queued; B gets it through by staying on the page, A by closing
 *      the tab while offline and opening the game again. Battle 2 resolves and settles.
 *  13. No page/console errors or failed requests outside the emulator origins (emulator responses
 *      >= 400, and the SDK's failed requests inside the deliberate offline windows, are allowlisted).
 * Exit code 1 on any FAIL, 2 on missing setup. Takes about a minute.
 */
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  GAME_ROOT, sleep, makeReporter, emulatorHosts, wipeProject, loadRules, deleteAuthUsers, adminFirestore, startMcp,
  newPlayer, reopenGame, toastsOf, textOf, screenOf, waitFor, canvasAt, tilePoint, buildingPoint, mouseDrag,
  homeCityCanon, installStorageWatch, addStorageNeedles, storageWatch
} from './lib/e2e.mjs';

const PW = process.env.PW_CORE;
if (!PW) { console.error('Set PW_CORE to a playwright-core install directory.'); process.exit(2); }
const URL = process.env.GAME_URL || 'http://localhost:3105/';
const PROJECT = process.env.FIREBASE_PROJECT_ID || 'demo-cs-e2e';
// Browser sign-ups land in the Auth emulator's default project (ONLINE_SPEC 13, client (a)).
const AUTH_PROJECT = process.env.AUTH_EMULATOR_PROJECT || 'demo-city-siege';
const SHOTS = process.argv[2] || null;
const HOSTS = emulatorHosts();
// Own auth users only (the auth pool is shared, see above); a second run at the same time needs its own suffix.
const EMAIL_SUFFIX = process.env.E2E_EMAIL_SUFFIX || '@e2e-pvp.test';
const RUN = Date.now().toString(36);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const { chromium } = await import(path.join(PW, 'index.mjs'));
const cityRules = await import(path.join(GAME_ROOT, 'src/shared/cityRules.js'));
const battleRules = await import(path.join(GAME_ROOT, 'src/shared/battleRules.js'));
const P = await import(path.join(GAME_ROOT, 'src/data/progression.js'));

const R = makeReporter();
const { check } = R;
const t0 = Date.now();
const elapsed = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';

// ------------------------------------------------------------------------------------ setup
const wiped = await wipeProject(PROJECT, HOSTS);
const oldUsers = await deleteAuthUsers(AUTH_PROJECT, HOSTS, { suffix: EMAIL_SUFFIX });
const rulesText = fs.readFileSync(path.join(GAME_ROOT, 'firestore.rules'), 'utf8');
const rulesStatus = await loadRules(PROJECT, HOSTS, rulesText);
if (wiped.firestore !== 200 || rulesStatus !== 200) {
  console.error(`Emulator not reachable (firestore wipe ${wiped.firestore}, rules ${rulesStatus}) at ${HOSTS.firestore}.`);
  process.exit(2);
}
check(true, `project ${PROJECT}: data wiped, ${oldUsers} leftover e2e user(s) deleted, real firestore.rules loaded (${rulesText.length} chars)`);
const { db, Timestamp } = adminFirestore(PROJECT, HOSTS);
const cityDoc = async (uid) => (await db.doc('cities/' + uid).get()).data();
const battleDoc = async (id) => (await db.doc('battles/' + id).get()).data();

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const createdUids = [];
let n = 0;
const shot = async (pl, name) => {
  if (!SHOTS) return;
  await pl.page.waitForTimeout(250);
  await pl.page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, '0')}-${pl.tag}-${name}.png` });
};
let mcp = null;
let mcp2 = null;
const offline = [];   // deliberate offline windows: { tag, from, to } as indices into `errors`

/** Canonical building rows of a layout / BuildingManager, for set equality. */
const rowsOfLayout = (layout) => layout.buildings.map(b => `${b.id}|${b.t}|${b.gx},${b.gz}|L${b.l}`).sort();
const liveRows = (pl, which = 'home') => pl.page.evaluate((which) => {
  const am = citySiege.attackManager;
  const bm = which === 'arena' ? am.buildings : citySiege.buildingManager;
  return bm.buildings.map(b => `${b.id}|${b.type}|${b.gx},${b.gz}|L${b.level}`).sort();
}, which);
const liveRoads = (pl, which = 'home') => pl.page.evaluate((which) => {
  const bm = which === 'arena' ? citySiege.attackManager.buildings : citySiege.buildingManager;
  return [...bm.roadNetwork.roads.keys()].map(String).sort();
}, which);
const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const diffList = (a, b) => ({ onlyA: a.filter(x => !b.includes(x)).slice(0, 6), onlyB: b.filter(x => !a.includes(x)).slice(0, 6) });

/**
 * Free tiles for `type` in a cloud city (cityRules = the game's own rules), nearest to `near` first.
 * The game lets a building stand on a road; these picks keep the whole footprint off the roads so
 * the screenshots show a sensible city.
 */
function freeTiles(doc, type, { near = [0, 0], ignoreId = null, inventory = true, minFrom = null, radius = null } = {}) {
  const model = cityRules.createModel(doc.layout, doc.holdings);
  const roads = new Set(doc.layout.roads);
  const half = Math.floor(Math.max(1, (P.BUILDING_DEFS[type] || {}).footprint || 1) / 2);
  const onRoad = (gx, gz) => {
    for (let dz = -half; dz <= half; dz++) for (let dx = -half; dx <= half; dx++) if (roads.has(`${gx + dx},${gz + dz}`)) return true;
    return false;
  };
  const out = [];
  for (let gz = -11; gz <= 11; gz++) {
    for (let gx = -11; gx <= 11; gx++) {
      if (onRoad(gx, gz)) continue;
      if (radius !== null && Math.hypot(gx, gz) > radius) continue;
      if (minFrom && Math.max(Math.abs(gx - minFrom[0]), Math.abs(gz - minFrom[1])) < 3) continue;
      const opts = inventory ? {} : { inventory: false, limits: false };
      if (ignoreId) opts.ignoreId = ignoreId;
      if (cityRules.checkPlace(model, type, gx, gz, opts).ok) out.push([gx, gz, Math.hypot(gx - near[0], gz - near[1])]);
    }
  }
  return out.sort((a, b) => a[2] - b[2]).map(([gx, gz]) => [gx, gz]);
}

/** Pick a gate on the recon map with a real click (the recon view's own raycast), like a player. */
async function clickAGate(pl) {
  const pts = await pl.page.evaluate(() => {
    const am = citySiege.attackManager;
    const cam = citySiege.sceneManager.activeCamera;
    cam.updateMatrixWorld();
    const V = citySiege.gridSystem.raycaster.ray.origin.constructor;
    const out = [];
    for (const g of am.buildings.getMainGates()) {
      if (!g.mesh) continue;
      for (const h of [2, 4, 1, 6]) {
        const v = new V(g.mesh.position.x, g.mesh.position.y + h, g.mesh.position.z).project(cam);
        if (v.z <= 1) out.push({ id: g.id, x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight });
      }
    }
    return out;
  });
  for (const pt of pts) {
    if (pt.x < 10 || pt.y < 10 || pt.x > 1270 || pt.y > 790) continue;
    if (!(await canvasAt(pl, pt))) continue;
    await pl.page.mouse.click(pt.x, pt.y);
    const ok = await waitFor(pl, () => citySiege.attackManager.state !== 'RECON', null, 2500, 'breach after the gate click');
    if (ok) return pt.id;
  }
  return null;
}

/** Raze `share` of the arena's counted buildings through the real DestructionEngine (smoke's winRaid). */
const razeArena = (pl, share) => pl.page.evaluate(async (share) => {
  const am = citySiege.attackManager, bm = am.buildings;
  am.vehicle.isInvulnerable = true;
  const targets = bm.buildings.filter(b => am.destruction.countsTowardDestruction(b));
  const n = share >= 1 ? targets.length : Math.ceil(targets.length * share);
  targets.slice(0, n).forEach(b => am.destruction.destroyBuilding(b, bm.buildings, am.police));
  if (share >= 1) for (let i = 0; i < 60 && am.state === 'COMBAT'; i++) await new Promise(r => setTimeout(r, 100));
  return { targets: targets.length, razed: n, state: am.state };
}, share);

try {
  // ============================================================================================
  R.section('1. Two players sign up through the ACCOUNT screen; the guest city is the first-link upload');
  const A = await newPlayer(browser, URL, 'A', errors);
  const B = await newPlayer(browser, URL, 'B', errors);
  const cfg = await A.page.evaluate(() => ({ configured: citySiege.online.configured, ...citySiege.online.config }));
  if (!cfg.configured || cfg.projectId !== PROJECT) {
    check(false, `the game at ${URL} must run in emulator mode for project ${PROJECT}`, cfg);
    throw new Error(`start Vite with VITE_FIREBASE_PROJECT_ID=${PROJECT} npx vite --mode emulator`);
  }
  check(true, `game at ${URL} runs online against the emulators, project ${cfg.projectId}`);
  check(await textOf(A, '#account-pill-label') === '👤 Sign in', 'signed out: the top-bar pill says "👤 Sign in"');
  await shot(A, 'home-signed-out');

  const signUp = async (pl, name, email, password) => {
    const guest = await pl.page.evaluate(() => ({
      ids: citySiege.buildingManager.buildings.map(b => b.id).sort(),
      roads: [...citySiege.buildingManager.roadNetwork.roads.keys()].map(String).sort(),
      inv: { ...citySiege.economyManager.inventory }
    }));
    await pl.page.click('#btn-account');
    await pl.page.waitForSelector('form[data-form="sign-up"]', { timeout: 5000 });
    await pl.page.fill('[data-field="signUp.name"]', name);
    await pl.page.fill('[data-field="signUp.email"]', email);
    await pl.page.fill('[data-field="signUp.password"]', password);
    await shot(pl, 'account-sign-up-form');
    await pl.page.click('form[data-form="sign-up"] button[type="submit"]');
    await waitFor(pl, (n) => { const o = citySiege.online; return o.profile && o.profile.name === n && o.sync.status === 'synced' && o.sync.rev >= 1; }, name, 25000, `${name} signed up + synced`);
    const uid = await pl.page.evaluate(() => citySiege.online.user && citySiege.online.user.uid);
    createdUids.push(uid);
    await waitFor(pl, () => !!document.querySelector('#account-main .profile-card'), null, 5000, 'profile card');
    await shot(pl, 'account-profile');
    return { uid, guest };
  };
  const { uid: uidA, guest: guestA } = await signUp(A, 'Alice', `alice.${RUN}${EMAIL_SUFFIX}`, 'alice-pass-1');
  const { uid: uidB, guest: guestB } = await signUp(B, 'Bob', `bob.${RUN}${EMAIL_SUFFIX}`, 'bob-pass-12');
  check(!!uidA && !!uidB && uidA !== uidB, 'A and B signed up with their own accounts', { uidA, uidB });
  for (const [who, uid, guest, pl] of [['A', uidA, guestA, A], ['B', uidB, guestB, B]]) {
    const d = await cityDoc(uid);
    const ok = d && sameList(d.layout.buildings.map(b => b.id).sort(), guest.ids) && sameList([...d.layout.roads].sort(), guest.roads) &&
      JSON.stringify(Object.entries(d.holdings.inventory).sort()) === JSON.stringify(Object.entries(guest.inv).sort());
    check(ok, `${who}: cities/${who} is the guest city (${guest.ids.length} building ids, ${guest.roads.length} roads, inventory) uploaded on first link, rev ${d && d.rev}`,
      d && { ids: diffList(d.layout.buildings.map(b => b.id).sort(), guest.ids), roads: d.layout.roads.length });
    const prof = (await db.doc('players/' + uid).get()).data();
    check(prof && prof.name === (who === 'A' ? 'Alice' : 'Bob') && prof.trophies === 0, `${who}: players/${who} profile written (name, 0 trophies)`);
    check(await textOf(pl, '#account-pill-label') === `${who === 'A' ? 'Alice' : 'Bob'} · 🏆0`, `${who}: pill reads "${who === 'A' ? 'Alice' : 'Bob'} · 🏆0"`, await textOf(pl, '#account-pill-label'));
  }
  // B's building ids are the needle for "A's localStorage never holds B's city" (gates share fixed ids).
  const bIds = (await cityDoc(uidB)).layout.buildings.map(b => b.id).filter(id => !id.startsWith('gate_'));
  const aIds = (await cityDoc(uidA)).layout.buildings.map(b => b.id);
  check(bIds.length >= 20 && !bIds.some(id => aIds.includes(id)), `B's ${bIds.length} non-gate building ids are unique to B's city (none in A's)`);
  await installStorageWatch(A, bIds, 100);
  await B.page.click('#btn-close-account');

  // ============================================================================================
  R.section('2. A challenges B (instant, 2 min design) from BATTLES; B accepts from the badge + BATTLES screen');
  await A.page.click('#btn-account-to-battles');
  await A.page.click('#battles-view .battles-tab-btn[data-tab="challenge"]');
  await A.page.fill('[data-field="ch.query"]', 'Bo');
  await waitFor(A, () => [...document.querySelectorAll('#battles-player-list .player-row')].some(r => /Bob/.test(r.innerText)), null, 10000, 'Bob in the search');
  await shot(A, 'battles-challenge-search');
  await A.page.click('#battles-player-list .player-row:has-text("Bob") [data-action="pick-player"]');
  await A.page.waitForSelector('form[data-form="challenge"]', { timeout: 5000 });
  await A.page.click('.ch-chip[data-seconds="120"]');
  await A.page.fill('[data-field="ch.message"]', 'e2e: bring your best turrets');
  await shot(A, 'battles-challenge-form');
  await A.page.click('.ch-send');
  await waitFor(A, () => (citySiege.online.battles || []).some(v => v.phase === 'pending'), null, 15000, 'battle created');
  const battleId = await A.page.evaluate(() => citySiege.online.battles.find(v => v.phase === 'pending').id);
  // The page shows the battle from its own pending write (latency compensation) a moment before the
  // server has it: wait for the server copy instead of reading it once.
  let bd = null;
  for (let i = 0; i < 50 && !bd; i++) { bd = await battleDoc(battleId); if (!bd) await sleep(100); }
  check(bd && bd.mode === 'instant' && bd.designSeconds === 120 && bd.challenger === uidA && bd.opponent === uidB && bd.status === 'pending',
    `battles/${battleId}: instant, 120 s design, Alice -> Bob, pending`, bd && { mode: bd.mode, designSeconds: bd.designSeconds, status: bd.status });
  await waitFor(A, () => !!document.querySelector('#battles-main .battle-card.phase-pending'), null, 5000, 'pending card');
  await shot(A, 'battles-pending');

  await waitFor(B, () => !document.getElementById('battles-dock-badge').classList.contains('hidden'), null, 15000, 'B badge');
  check(await textOf(B, '#battles-dock-badge') === '1' && (await toastsOf(B)).some(t => /Alice challenged you/.test(t)),
    'B: BATTLES badge "1" and toast "Alice challenged you…"', { badge: await textOf(B, '#battles-dock-badge'), toasts: await toastsOf(B) });
  await shot(B, 'home-incoming-badge');
  await B.page.click('#btn-open-battles');
  await B.page.waitForSelector('#battles-main [data-action="accept"]', { timeout: 8000 });
  await shot(B, 'battles-incoming');
  await B.page.click('#battles-main [data-action="accept"]');
  await waitFor(B, (id) => (citySiege.online.battle(id) || {}).phase === 'design', battleId, 15000, 'B design phase');
  await waitFor(A, (id) => (citySiege.online.battle(id) || {}).phase === 'design', battleId, 15000, 'A design phase');
  const acceptedAt = Date.now();
  bd = await battleDoc(battleId);
  const designLeft = (bd.startAt.toMillis() - Date.now()) / 1000;
  check(bd.status === 'accepted' && bd.fightEndsAt.toMillis() - bd.startAt.toMillis() === 900e3 && designLeft > 100 && designLeft <= 121,
    `accepted: startAt = accept + 120 s (${designLeft.toFixed(0)} s left), fight window 900 s`, { status: bd.status });
  check((await toastsOf(A)).some(t => /Bob accepted/.test(t)), 'A: toast "Bob accepted your challenge"', await toastsOf(A));
  await waitFor(A, () => !!document.querySelector('#battles-main .battle-card.phase-design'), null, 5000, 'A design card');
  await shot(A, 'battles-design-phase');

  // ============================================================================================
  R.section('3. A generates an MCP token in ACCOUNT -> AI Designer; the MCP server runs with it (stdio)');
  await A.page.click('#btn-close-battles');
  await A.page.click('#btn-account');
  await A.page.click('#account-view .account-tab-btn[data-tab="mcp"]');
  await A.page.waitForSelector('form[data-form="gen-token"]', { timeout: 5000 });
  await A.page.fill('[data-field="tokenLabel.label"]', 'e2e Claude Code');
  await A.page.click('form[data-form="gen-token"] button[type="submit"]');
  await A.page.waitForSelector('#copy-src-token', { timeout: 10000 });
  const token = await textOf(A, '#copy-src-token');
  const hash = crypto.createHash('sha256').update(token || '').digest('hex');
  const tdoc = (await db.doc('mcpTokens/' + hash).get()).data();
  check(/^csk_[A-Za-z0-9_-]{43}$/.test(token || '') && tdoc && tdoc.uid === uidA && tdoc.revoked === false && tdoc.scope === 'design' && !JSON.stringify(tdoc).includes(token),
    'token revealed once (csk_ + 43 chars); mcpTokens/{sha256(token)} belongs to A and never stores the raw token');
  const stdioSnippet = await textOf(A, '#copy-src-cfg-stdio');
  await A.page.evaluate(() => { document.querySelector('#account-view .shop-main').scrollTop = 0; });
  await shot(A, 'account-mcp-token-reveal');
  // Run the server with exactly the env the stdio snippet on this screen tells the player to use.
  const snippetEnv = Object.fromEntries([...(stdioSnippet || '').matchAll(/-e (\w+)=(\S+)/g)].map(m => [m[1], m[2]]));
  check(snippetEnv.CITY_SIEGE_TOKEN === token && snippetEnv.FIREBASE_PROJECT_ID === PROJECT && snippetEnv.FIRESTORE_EMULATOR_HOST === HOSTS.firestore,
    'the Claude Code stdio snippet carries the token, the project id and the emulator host', snippetEnv);
  // A short token cache so the revoke at the end bites this same process too.
  mcp = await startMcp({ token: snippetEnv.CITY_SIEGE_TOKEN, projectId: snippetEnv.FIREBASE_PROJECT_ID, hosts: { firestore: snippetEnv.FIRESTORE_EMULATOR_HOST }, cacheMs: 1500 });
  const tools = (await mcp.client.listTools()).tools.map(t => t.name).sort();
  check(tools.length === 14 && !tools.some(t => /attack|shop|buy|upgrade|collect|bank|gem/.test(t)),
    `MCP server lists 14 design-only tools (${tools.join(', ')})`);
  await A.page.click('[data-action="hide-token"]');
  await A.page.click('#btn-close-account');

  // ============================================================================================
  R.section('4. MCP edits appear live in A\'s open Design screen');
  await A.page.click('#btn-open-battles');
  await A.page.waitForSelector('#battles-main [data-action="design"]', { timeout: 5000 });
  await A.page.click('#battles-main [data-action="design"]');
  await waitFor(A, () => citySiege.uiManager.currentScreen === 'DESIGN' && !document.getElementById('battle-design-banner').classList.contains('hidden'), null, 5000, 'A design + banner');
  check(/Battle vs Bob locks in \d:\d\d/.test(await textOf(A, '#battle-banner-text') || ''), 'A: Design screen banner "Battle vs Bob locks in m:ss"', await textOf(A, '#battle-banner-text'));
  await shot(A, 'design-before-mcp');

  const gameState = () => A.page.evaluate(() => ({
    rev: citySiege.online.sync.rev,
    inv: { ...citySiege.economyManager.inventory },
    roads: citySiege.buildingManager.roadNetwork.roads.size,
    saved: localStorage.getItem('city_siege_city') || ''
  }));
  const toastCount = async () => (await A.page.evaluate(() => window.__e2e.toasts.length));
  const newToasts = async (from) => (await A.page.evaluate((f) => window.__e2e.toasts.slice(f), from));

  // get_city
  let r = await mcp.call('get_city');
  let docA = await cityDoc(uidA);
  const gs0 = await gameState();
  const liveCount = await A.page.evaluate(() => citySiege.buildingManager.buildings.length);
  const sc = r.structuredContent || {};
  check(!r.isError && sc.uid === uidA && sc.rev === docA.rev && sc.rev === gs0.rev && sc.summary.buildings === liveCount && sc.summary.roads.placed === gs0.roads &&
    (sc.battles || []).some(v => v.phase === 'design') && /Bob/.test(r.text) && /MAP/.test(r.text),
  `get_city: A's city (${liveCount} buildings, ${gs0.roads} roads, rev ${sc.rev}) with the design-phase battle vs Bob and the map`, { isError: r.isError, rev: sc.rev, gameRev: gs0.rev, text: r.text.slice(0, 300) });

  // place_building
  const millTile = freeTiles(docA, 'lumber_mill', { near: [-2, -6] })[0];
  let tc = await toastCount();
  let tCall = Date.now();
  r = await mcp.call('place_building', { type: 'lumber_mill', gx: millTile[0], gz: millTile[1] });
  const tRet = Date.now();
  const millId = r.structuredContent && r.structuredContent.results && r.structuredContent.results[0].id;
  check(!r.isError && !!millId && r.structuredContent.rev === docA.rev + 1, `place_building lumber_mill at (${millTile}) saved as rev ${docA.rev + 1}`, r.text.slice(0, 300));
  await waitFor(A, ([id, gx, gz]) => citySiege.buildingManager.buildings.some(b => b.id === id && b.gx === gx && b.gz === gz), [millId, ...millTile], 10000, 'mill live');
  const lagPlace = Date.now() - tRet;
  await A.page.waitForTimeout(300);
  let gs = await gameState();
  let tn = await newToasts(tc);
  check(gs.rev === docA.rev + 1 && gs.inv.lumber_mill === gs0.inv.lumber_mill - 1 && gs.saved.includes(millId),
    `A's game shows the new Lumber Mill ${millId} live (${lagPlace} ms after the call returned), inventory ${gs0.inv.lumber_mill} -> ${gs.inv.lumber_mill}, re-saved locally`, { rev: gs.rev, inv: gs.inv.lumber_mill });
  check(tn.some(t => /AI designer/.test(t) && /Lumber Mill/.test(t)), 'A: toast "🤖 AI designer: … Lumber Mill …"', tn);
  check(!(await A.page.$('.inv-card[data-type="lumber_mill"]')), 'A: the Lumber Mill card left the design inventory drawer');
  await shot(A, 'design-mcp-placed-lumber-mill');

  // move_building
  docA = await cityDoc(uidA);
  check(docA.updatedBy === 'mcp' && docA.writerId === 'mcp:' + hash.slice(0, 8) && docA.lastChange && docA.lastChange.by === 'mcp',
    `cities/A: updatedBy mcp, writerId mcp:${hash.slice(0, 8)}, lastChange by mcp (the game did not echo it back)`, { by: docA.updatedBy, writer: docA.writerId });
  const pump = docA.layout.buildings.find(b => b.t === 'petrol_pump');
  const pumpTile = freeTiles(docA, 'petrol_pump', { near: [pump.gx, pump.gz], ignoreId: pump.id, inventory: false, minFrom: [pump.gx, pump.gz] })[0];
  tc = await toastCount();
  r = await mcp.call('move_building', { id: pump.id, gx: pumpTile[0], gz: pumpTile[1] });
  check(!r.isError && r.structuredContent.rev === docA.rev + 1, `move_building petrol_pump ${pump.id} (${pump.gx},${pump.gz}) -> (${pumpTile})`, r.text.slice(0, 300));
  const okMove = await waitFor(A, ([id, gx, gz]) => citySiege.buildingManager.buildings.some(b => b.id === id && b.gx === gx && b.gz === gz), [pump.id, ...pumpTile], 10000, 'pump moved live');
  await A.page.waitForTimeout(300);
  tn = await newToasts(tc);
  check(okMove && tn.some(t => /AI designer/.test(t) && /Petrol Pump/.test(t)), 'A\'s game moved the Petrol Pump live, toast names it', tn);
  await shot(A, 'design-mcp-moved-petrol-pump');

  // add_roads
  docA = await cityDoc(uidA);
  const roadSet = new Set(docA.layout.roads);
  let roadPath = null;
  for (let gz = -3; gz <= 8 && !roadPath; gz++) {
    for (let gx = -8; gx <= 4 && !roadPath; gx++) {
      if ([0, 1, 2, 3].every(k => !roadSet.has(`${gx + k},${gz}`) && Math.hypot(gx + k, gz) <= 11)) roadPath = [[gx, gz], [gx + 3, gz]];
    }
  }
  tc = await toastCount();
  const gsR = await gameState();
  r = await mcp.call('add_roads', { path: roadPath });
  check(!r.isError && r.structuredContent.rev === docA.rev + 1, `add_roads path ${JSON.stringify(roadPath)} (4 tiles)`, r.text.slice(0, 300));
  const okRoads = await waitFor(A, (n) => citySiege.buildingManager.roadNetwork.roads.size === n, gsR.roads + 4, 10000, 'roads live');
  await A.page.waitForTimeout(300);
  gs = await gameState();
  tn = await newToasts(tc);
  check(okRoads && gs.inv.road === gsR.inv.road - 4 && tn.some(t => /AI designer/.test(t) && /road/i.test(t)),
    `A's game drew the 4 road tiles live (${gsR.roads} -> ${gs.roads}), road inventory ${gsR.inv.road} -> ${gs.inv.road}, toast`, tn);
  await shot(A, 'design-mcp-added-roads');

  // apply_design dry run: nothing saved, nothing changes in the game
  docA = await cityDoc(uidA);
  const rbTile = freeTiles(docA, 'roadblock', { near: [0, -8] })[0];
  const rowsBeforeDry = await liveRows(A);
  tc = await toastCount();
  r = await mcp.call('apply_design', { dry_run: true, ops: [{ op: 'place', type: 'roadblock', gx: rbTile[0], gz: rbTile[1] }, { op: 'add_roads', tiles: [[rbTile[0], rbTile[1] + 1]] }] });
  await sleep(2000);
  const docDry = await cityDoc(uidA);
  check(!r.isError && r.structuredContent.dryRun === true && r.structuredContent.saved === false && /Dry run/.test(r.text) && docDry.rev === docA.rev,
    `apply_design dry_run: would succeed, saved nothing (still rev ${docDry.rev})`, r.text.slice(0, 200));
  check(sameList(await liveRows(A), rowsBeforeDry) && (await newToasts(tc)).every(t => !/AI designer/.test(t)), 'A\'s game did not change and showed no AI toast for the dry run');
  await shot(A, 'design-after-dry-run');

  // a rule-violating call: a roadblock on the Town Hall's tile
  const th = docDry.layout.buildings.find(b => b.t === 'town_hall');
  r = await mcp.call('place_building', { type: 'roadblock', gx: th.gx, gz: th.gz });
  const r2 = await mcp.call('place_building', { type: 'roadblock', gx: 14, gz: 14 });
  await sleep(1200);
  const docBad = await cityDoc(uidA);
  check(r.isError && r.structuredContent.reason === 'BLOCKED' && /Town Hall/.test(r.text) && /Free tiles nearby/.test(r.text),
    `place_building on the Town Hall (${th.gx},${th.gz}) is refused: BLOCKED, names the Town Hall, suggests free tiles`, r.text.slice(0, 300));
  check(r2.isError && r2.structuredContent.reason === 'OUTSIDE_RADIUS', 'place_building at (14,14) is refused: OUTSIDE_RADIUS', r2.text.slice(0, 200));
  check(docBad.rev === docA.rev && sameList(await liveRows(A), rowsBeforeDry), 'refused calls wrote nothing: cloud rev and A\'s game unchanged');

  // ============================================================================================
  R.section('5. A drags a building with the mouse; the push is rev+1 and MCP get_city sees it');
  const revBeforeDrag = docBad.rev;
  // Candidates: 1x1-2x2 buildings A can drag, and free drop tiles on screen that the game accepts.
  const draggables = await A.page.evaluate(() => citySiege.buildingManager.buildings
    .filter(b => citySiege.gridSystem.isDraggableBuilding(b) && b.type !== 'tree' && b.type !== 'town_hall')
    .map(b => ({ id: b.id, t: b.type, gx: b.gx, gz: b.gz })));
  let drag = null;
  for (const b of draggables) {
    const from = await buildingPoint(A, b.id);
    if (!from) continue;
    for (const [gx, gz] of freeTiles(docBad, b.t, { near: [b.gx, b.gz], ignoreId: b.id, inventory: false, minFrom: [b.gx, b.gz], radius: 10 }).slice(0, 25)) {
      const okGame = await A.page.evaluate(([id, gx, gz]) => { const g = citySiege.gridSystem; const bb = citySiege.buildingManager.buildings.find(x => x.id === id); return g.isValidDropTile(bb, gx, gz); }, [b.id, gx, gz]);
      if (!okGame) continue;
      const to = await tilePoint(A, gx, gz);
      if (to) { drag = { ...b, to: [gx, gz], from, pt: to }; break; }
    }
    if (drag) break;
  }
  check(!!drag, 'found a building and a free drop tile on screen for a mouse drag', draggables.length);
  if (drag) {
    await mouseDrag(A, drag.from, drag.pt);
    const moved = await waitFor(A, ([id, gx, gz]) => citySiege.buildingManager.buildings.some(b => b.id === id && b.gx === gx && b.gz === gz), [drag.id, ...drag.to], 5000, 'drop');
    check(moved, `mouse drag moved ${drag.t} ${drag.id} (${drag.gx},${drag.gz}) -> (${drag.to})`);
    await shot(A, 'design-after-mouse-drag');
    let pushed = null;
    for (let i = 0; i < 60; i++) { const d = await cityDoc(uidA); if (d.rev > revBeforeDrag) { pushed = d; break; } await sleep(200); }
    const pb = pushed && pushed.layout.buildings.find(x => x.id === drag.id);
    check(pushed && pushed.rev === revBeforeDrag + 1 && pushed.updatedBy === 'game' && pb && pb.gx === drag.to[0] && pb.gz === drag.to[1],
      `the drag was pushed as rev ${revBeforeDrag + 1} (updatedBy game) with the new tile`, pushed && { rev: pushed.rev, by: pushed.updatedBy, pb });
    r = await mcp.call('get_city');
    const lb = await mcp.call('list_buildings', { type: drag.t });
    const row = ((lb.structuredContent || {}).buildings || []).find(x => x.id === drag.id);
    check(!r.isError && r.structuredContent.rev === revBeforeDrag + 1 && /last saved by the game/.test(r.text) && row && row.gx === drag.to[0] && row.gz === drag.to[1],
      `MCP get_city sees rev ${revBeforeDrag + 1} "last saved by the game", list_buildings has ${drag.id} at (${drag.to})`, { rev: r.structuredContent && r.structuredContent.rev, row });
  }
  R.note(`design phase used ${((Date.now() - acceptedAt) / 1000).toFixed(0)} s of 120 s so far`);

  // ============================================================================================
  R.section('6. Both press READY; both cities lock; B edits its city after the lock');
  const stillDesign = await A.page.evaluate((id) => (citySiege.online.battle(id) || {}).phase, battleId);
  check(stillDesign === 'design', `still in the design phase before READY (${((Date.now() - acceptedAt) / 1000).toFixed(0)} s after accept)`, stillDesign);
  await A.page.click('#btn-banner-battles');
  await A.page.waitForSelector('#battles-main [data-action="ready"]', { timeout: 5000 });
  await A.page.click('#battles-main [data-action="ready"]');
  await waitFor(A, (id) => (citySiege.online.battle(id) || {}).iAmReady, battleId, 10000, 'A ready');
  await shot(A, 'battles-ready-waiting');
  await B.page.waitForSelector('#battles-main [data-action="ready"]', { timeout: 5000 });
  await B.page.click('#battles-main [data-action="ready"]');
  for (const pl of [A, B]) await waitFor(pl, (id) => { const v = citySiege.online.battle(id); return v && v.phase === 'fight' && v.bothLocked; }, battleId, 25000, `${pl.tag} fight + locked`);
  bd = await battleDoc(battleId);
  const lockedA = await cityDoc(uidA), lockedB = await cityDoc(uidB);
  check(bd.ready[uidA] && bd.ready[uidB] && bd.startAt.toMillis() <= Date.now() && bd.startAt.toMillis() < acceptedAt + 120e3,
    'both READY: startAt pulled forward to now, the fight is live before the 2 min ran out');
  for (const [who, uid, city] of [['A', uidA, lockedA], ['B', uidB, lockedB]]) {
    const s = bd.snapshots[uid];
    check(s && JSON.stringify(s.layout) === JSON.stringify(city.layout) && s.rev === city.rev && s.townHall === city.townHall,
      `snapshots.${who} == cities/${who} (layout byte-equal, rev ${city.rev}, TH ${city.townHall})`, s && { snapRev: s.rev, cityRev: city.rev });
  }
  check(bd.snapshots[uidA].layout.buildings.some(b => b.id === millId) && (!drag || bd.snapshots[uidA].layout.buildings.some(b => b.id === drag.id && b.gx === drag.to[0] && b.gz === drag.to[1])),
    'A\'s locked city holds the AI-placed Lumber Mill and the mouse-dragged building');
  await waitFor(A, () => !!document.querySelector('#battles-main [data-action="attack"]'), null, 8000, 'A attack button');
  await shot(A, 'battles-fight-live');

  // B changes its live city AFTER the lock, through the Design screen (inventory card + tile click).
  const snapBJson = JSON.stringify(bd.snapshots[uidB]);
  await B.page.click('#btn-close-battles');
  await B.page.click('#btn-open-design');
  await B.page.waitForTimeout(1500);   // the Design camera settles before tiles are projected
  const docB0 = await cityDoc(uidB);
  let bTile = null, bPt = null;
  for (const [gx, gz] of freeTiles(docB0, 'roadblock', { near: [2, -7] }).slice(0, 40)) {
    const pt = await tilePoint(B, gx, gz);
    if (pt) { bTile = [gx, gz]; bPt = pt; break; }
  }
  if (!bPt) throw new Error('no free roadblock tile on B\'s screen');
  await B.page.click('.inv-card[data-type="roadblock"]');
  await B.page.mouse.click(bPt.x, bPt.y);
  const bNewId = await B.page.evaluate(([gx, gz]) => {
    const b = citySiege.buildingManager.buildings.find(x => x.type === 'roadblock' && x.gx === gx && x.gz === gz);
    return b ? b.id : null;
  }, bTile);
  await B.page.evaluate(() => citySiege.gridSystem.setMode('design_select'));
  check(!!bNewId, `B placed a Roadblock at (${bTile}) after the lock with the inventory card + a map click`);
  await addStorageNeedles(A, [bNewId].filter(Boolean));
  let docB1 = null;
  for (let i = 0; i < 60; i++) { const d = await cityDoc(uidB); if (d.rev > docB0.rev) { docB1 = d; break; } await sleep(200); }
  bd = await battleDoc(battleId);
  check(docB1 && docB1.layout.buildings.some(b => b.id === bNewId) && JSON.stringify(bd.snapshots[uidB]) === snapBJson && !bd.snapshots[uidB].layout.buildings.some(b => b.id === bNewId),
    `B's edit reached cities/B (rev ${docB1 && docB1.rev}) but NOT B's locked snapshot (still rev ${bd.snapshots[uidB].rev})`);
  await shot(B, 'design-edit-after-lock');

  // ============================================================================================
  R.section('7a. A attacks: B\'s LOCKED snapshot in the arena, a gate picked on the recon map, the city razed');
  if (await screenOf(A) !== 'BATTLES') await A.page.click('#btn-open-battles');
  await A.page.waitForSelector('#battles-main [data-action="attack"]', { timeout: 8000 });
  const homeA0 = await homeCityCanon(A);
  const cloudA0 = await cityDoc(uidA);
  const rawA0 = await A.page.evaluate(() => localStorage.getItem('city_siege_city'));
  const watch0 = await storageWatch(A);
  await A.page.click('#battles-main [data-action="attack"]');
  await A.page.click('#battles-main [data-action="attack"]', { timeout: 800 }).catch(() => {});   // a double click starts nothing twice
  const inRecon = await waitFor(A, () => citySiege.attackManager.state === 'RECON', null, 20000, 'A recon');
  const snapB = bd.snapshots[uidB];
  const arenaRows = await liveRows(A, 'arena');
  const arenaRoads = await liveRoads(A, 'arena');
  const arenaInfo = await A.page.evaluate(() => ({
    arena: citySiege.attackManager.buildings !== citySiege.buildingManager,
    homeHidden: citySiege.buildingManager.buildingGroup.visible === false,
    hud: document.getElementById('battle-raid-hud').innerText.replace(/\s+/g, ' ').trim()
  }));
  check(inRecon && arenaInfo.arena && arenaInfo.homeHidden && /BATTLE vs Bob/i.test(arenaInfo.hud), 'ATTACK opens recon of the arena (home city hidden), HUD "BATTLE vs Bob"', arenaInfo);
  check(sameList(arenaRows, rowsOfLayout(snapB.layout)) && sameList(arenaRoads, [...snapB.layout.roads].sort()),
    `the arena is exactly B's LOCKED snapshot (${arenaRows.length} buildings, ${arenaRoads.length} roads)`, diffList(arenaRows, rowsOfLayout(snapB.layout)));
  check(!arenaRows.some(x => x.startsWith(bNewId + '|')) && !arenaRows.some(x => x.includes(`|roadblock|${bTile[0]},${bTile[1]}|`)),
    `B's post-lock Roadblock ${bNewId} at (${bTile}) is NOT in A's arena`);
  check(!sameList(arenaRows, rowsOfLayout(docB1.layout)), 'the arena differs from B\'s live city (which has the post-lock edit)');
  await A.page.waitForTimeout(700);
  await shot(A, 'raid-recon-bobs-locked-city');
  const gateA = await clickAGate(A);
  check(!!gateA, `A picked ${gateA} with a click on the recon map (breach started)`);
  if (!gateA) await A.page.evaluate(() => { const am = citySiege.attackManager; am.triggerCinematicBreach(am.buildings.getMainGates()[0]); });
  await waitFor(A, () => citySiege.attackManager.state === 'COMBAT', null, 15000, 'A combat');
  await waitFor(A, (id) => (citySiege.online.battle(id) || {}).iAttempted, battleId, 10000, 'A attempt');
  bd = await battleDoc(battleId);
  check(!!(bd.attempts && bd.attempts[uidA]), 'the breach burnt A\'s one attempt (attempts.A written)');
  await A.page.waitForTimeout(900);
  await shot(A, 'raid-combat-A');
  const rzA = await razeArena(A, 1);
  await waitFor(A, () => !document.getElementById('result-modal').classList.contains('hidden'), null, 10000, 'A result modal');
  const sentA = await waitFor(A, () => /Result sent ✓/.test(document.getElementById('result-battle-status')?.textContent || ''), null, 15000, 'A result sent');
  const modalA = await textOf(A, '#result-content');
  check(rzA.state !== 'COMBAT' && sentA && /BATTLE vs Bob/i.test(modalA) && /100% DESTRUCTION/.test(modalA) && /RETURN TO CITY/.test(modalA),
    `the real engine razed all ${rzA.targets} counted buildings -> victory modal "BATTLE vs Bob", 100%, "Result sent ✓", RETURN TO CITY`, modalA);
  bd = await battleDoc(battleId);
  const resA = bd.results && bd.results[uidA];
  check(resA && resA.stars === 3 && resA.percentage === 100 && resA.outcome === 'victory' && resA.total === rzA.targets,
    'battles/…/results.A = 3★ 100% victory', resA);
  await shot(A, 'raid-result-A-victory');
  await A.page.click('#btn-collect-loot');
  await waitFor(A, () => citySiege.uiManager.currentScreen === 'BATTLES' && citySiege.attackManager.state === 'IDLE', null, 8000, 'A back to BATTLES');
  await A.page.waitForTimeout(3500);   // longer than the push debounce: any city write would have landed
  const homeA1 = await homeCityCanon(A);
  const cloudA1 = await cityDoc(uidA);
  const rawA1 = await A.page.evaluate(() => localStorage.getItem('city_siege_city'));
  check(homeA1.live === homeA0.live && homeA1.saved === homeA0.saved && homeA0.live === homeA0.saved,
    `A's own city is identical before/after the raid: live serialization and the local save (${homeA1.buildings} buildings, ${homeA1.roads} roads; only savedAt and producer output tick)`,
    { live: homeA1.live === homeA0.live, saved: homeA1.saved === homeA0.saved });
  check(cloudA1.rev === cloudA0.rev && JSON.stringify(cloudA1.layout) === JSON.stringify(cloudA0.layout) && JSON.stringify(cloudA1.holdings) === JSON.stringify(cloudA0.holdings),
    `cities/A is byte-identical before/after the raid (rev ${cloudA1.rev}: the raid pushed nothing)`, { rev0: cloudA0.rev, rev1: cloudA1.rev });
  check(rawA0 && rawA1 && JSON.parse(rawA1).buildings.length === JSON.parse(rawA0).buildings.length, 'A\'s local save still holds A\'s city');
  const watch1 = await storageWatch(A);
  check(watch1.hits.length === 0 && watch1.samples - watch0.samples > 50 && watch1.samples > 200,
    `A's localStorage never contained any of B's ${watch1.needles} building ids (${watch1.samples} full-storage samples, ${watch1.writes} writes inspected, ${watch1.samples - watch0.samples} samples during the raid)`, watch1.hits.slice(0, 3));
  await waitFor(A, () => !!document.querySelector('#battles-main .battle-done-line'), null, 8000, 'A done line');
  check(await A.page.evaluate((id) => citySiege.online.battle(id).canAttack === false, battleId) && !(await A.page.$('#battles-main [data-action="attack"]')),
    'A: no ATTACK button any more (one attempt per battle)');
  await shot(A, 'battles-after-raid-A');

  // ============================================================================================
  R.section('7b. B attacks A\'s locked city and exits at ~40 %');
  await B.page.click('#btn-banner-battles').catch(async () => { await B.page.click('#btn-open-battles'); });
  await waitFor(B, () => citySiege.uiManager.currentScreen === 'BATTLES', null, 5000, 'B battles');
  await B.page.waitForSelector('#battles-main [data-action="attack"]', { timeout: 10000 });
  check((await toastsOf(B)).some(t => /Alice attacked your city/.test(t)), 'B: toast "Alice attacked your city: 3★ 100%"', await toastsOf(B));
  const homeB0 = await homeCityCanon(B);
  await B.page.click('#battles-main [data-action="attack"]');
  await waitFor(B, () => citySiege.attackManager.state === 'RECON', null, 20000, 'B recon');
  const arenaB = await liveRows(B, 'arena');
  check(sameList(arenaB, rowsOfLayout(bd.snapshots[uidA].layout)) && arenaB.some(x => x.startsWith(millId + '|')),
    `B's arena is A's locked snapshot (${arenaB.length} buildings, with the AI's Lumber Mill)`, diffList(arenaB, rowsOfLayout(bd.snapshots[uidA].layout)));
  await B.page.waitForTimeout(700);
  await shot(B, 'raid-recon-alices-locked-city');
  const gateB = await clickAGate(B);
  check(!!gateB, `B picked ${gateB} with a click on the recon map`);
  if (!gateB) await B.page.evaluate(() => { const am = citySiege.attackManager; am.triggerCinematicBreach(am.buildings.getMainGates()[0]); });
  await waitFor(B, () => citySiege.attackManager.state === 'COMBAT', null, 15000, 'B combat');
  await waitFor(B, (id) => (citySiege.online.battle(id) || {}).iAttempted, battleId, 10000, 'B attempt');
  const rzB = await razeArena(B, 0.4);
  await B.page.waitForTimeout(900);
  await shot(B, 'raid-combat-B');
  await B.page.click('#btn-retreat');
  await waitFor(B, () => /Result sent ✓/.test(document.getElementById('result-battle-status')?.textContent || ''), null, 15000, 'B result sent');
  const modalB = await textOf(B, '#result-content');
  check(/BATTLE vs Alice/i.test(modalB) && /Result sent ✓/.test(modalB), `B: EXIT RAID after razing ${rzB.razed}/${rzB.targets} -> battle modal "BATTLE vs Alice", "Result sent ✓"`, modalB);
  await shot(B, 'raid-result-B-retreat');
  await B.page.click('#btn-collect-loot');
  await waitFor(B, () => citySiege.uiManager.currentScreen === 'BATTLES' && citySiege.attackManager.state === 'IDLE', null, 8000, 'B back');
  const homeB1 = await homeCityCanon(B);
  check(homeB1.live === homeB0.live, 'B\'s own city is unchanged by B\'s raid too');

  // ============================================================================================
  R.section('8. Resolve + settle: winner, trophies, W/L and History on both sides');
  for (const pl of [A, B]) await waitFor(pl, (id) => { const v = citySiege.online.battle(id); return v && v.phase === 'finished' && v.settled; }, battleId, 30000, `${pl.tag} settled`);
  await waitFor(A, () => citySiege.online.profile && citySiege.online.profile.trophies === 30, null, 10000, 'A trophies');
  bd = await battleDoc(battleId);
  const resB = bd.results && bd.results[uidB];
  const expectedWinner = battleRules.decideWinner(bd);
  check(bd.status === 'finished' && bd.winner === uidA && expectedWinner === uidA && bd.settled[uidA] && bd.settled[uidB],
    `resolved: winner = Alice (= battleRules.decideWinner: ${resA.stars}★ ${resA.percentage}% vs ${resB && resB.stars}★ ${resB && resB.percentage}%), settled by both`,
    { status: bd.status, winner: bd.winner, expectedWinner, resB });
  const pa = (await db.doc('players/' + uidA).get()).data(), pb = (await db.doc('players/' + uidB).get()).data();
  check(pa.trophies === 30 && pa.wins === 1 && pa.losses === 0 && pb.trophies === 0 && pb.losses === 1 && pb.wins === 0,
    'players: Alice 30 🏆 1W, Bob 0 🏆 (−20 floored at 0) 1L', { a: [pa.trophies, pa.wins, pa.losses], b: [pb.trophies, pb.wins, pb.losses] });
  // Bob had 0 trophies: the loss takes nothing (floor), and that is what he is told (spec 13, battles fixer).
  check((await toastsOf(A)).some(t => /Victory \(\+30 trophies\)/.test(t)) && (await toastsOf(B)).some(t => /Defeat \(no trophies to lose\)/.test(t)),
    'toasts: A "Victory (+30 trophies)", B "Defeat (no trophies to lose)"');
  await A.page.click('#battles-view .battles-tab-btn[data-tab="history"]');
  await B.page.click('#battles-view .battles-tab-btn[data-tab="history"]');
  await waitFor(A, () => !!document.querySelector('#battles-main .history-row'), null, 5000, 'A history');
  await waitFor(B, () => !!document.querySelector('#battles-main .history-row'), null, 5000, 'B history');
  const histA = await textOf(A, '#battles-main .history-row');
  const histB = await textOf(B, '#battles-main .history-row');
  check(/VICTORY/.test(histA) && /\+30/.test(histA) && /Bob/.test(histA) && /100%/.test(histA), 'A: History row VICTORY vs Bob, 100%, +30', histA);
  check(/DEFEAT/.test(histB) && /±0/.test(histB) && /already at 0/.test(histB) && !/-20|−20/.test(histB) && /Alice/.test(histB), 'B: History row DEFEAT vs Alice, ±0 (already at 0 - no "-20" that never happened)', histB);
  check(await textOf(A, '#account-pill-label') === 'Alice · 🏆30' && await textOf(A, '#battles-record') === '1W · 0L · 0D' && await textOf(B, '#battles-record') === '0W · 1L · 0D',
    'pill "Alice · 🏆30"; W/L/D: A 1W · 0L · 0D, B 0W · 1L · 0D', [await textOf(A, '#account-pill-label'), await textOf(A, '#battles-record'), await textOf(B, '#battles-record')]);
  await shot(A, 'battles-history-victory');
  await shot(B, 'battles-history-defeat');

  // ============================================================================================
  R.section('9. Design time "None": the fight starts at accept and both cities lock on their own (no READY)');
  await A.page.click('#btn-battles-new');
  await waitFor(A, () => !!document.querySelector('#battles-player-list .player-row'), null, 10000, 'players');
  await A.page.click('#battles-player-list .player-row:has-text("Bob") [data-action="pick-player"]');
  await A.page.waitForSelector('form[data-form="challenge"]', { timeout: 5000 });
  await A.page.click('.ch-chip[data-seconds="0"]');
  const nBattles = await A.page.evaluate(() => citySiege.online.battles.length);
  await A.page.click('.ch-send');
  await waitFor(A, (n0) => citySiege.online.battles.length > n0, nBattles, 15000, 'second battle');
  const b2 = await A.page.evaluate(() => citySiege.online.battles[0].id);
  await B.page.click('#battles-view .battles-tab-btn[data-tab="active"]');
  await B.page.waitForSelector(`.battle-card[data-battle="${b2}"] [data-action="accept"]`, { timeout: 15000 });
  await B.page.click(`.battle-card[data-battle="${b2}"] [data-action="accept"]`);
  for (const pl of [A, B]) await waitFor(pl, (id) => { const v = citySiege.online.battle(id); return v && v.phase === 'fight' && v.bothLocked; }, b2, 20000, `${pl.tag} auto-locked`);
  const bd2 = await battleDoc(b2);
  const c2A = await cityDoc(uidA), c2B = await cityDoc(uidB);
  check(bd2.designSeconds === 0 && Object.keys(bd2.ready || {}).length === 0 && bd2.startAt.toMillis() <= Date.now() &&
    JSON.stringify(bd2.snapshots[uidA].layout) === JSON.stringify(c2A.layout) && JSON.stringify(bd2.snapshots[uidB].layout) === JSON.stringify(c2B.layout),
  'no READY pressed: at the start time both cities locked by themselves, each snapshot == its city doc (incl. B\'s post-lock Roadblock of battle 1)',
  { ready: bd2.ready, snaps: Object.keys(bd2.snapshots || {}).length });
  await waitFor(A, (id) => !!document.querySelector(`.battle-card[data-battle="${id}"] [data-action="attack"]`), b2, 8000, 'attack on battle 2');
  await shot(A, 'battles-second-battle-auto-locked');

  // An AI edit that lands while A is in the raid waits until A is home; ABORT RECON burns no attempt.
  await A.page.click(`.battle-card[data-battle="${b2}"] [data-action="attack"]`);
  await waitFor(A, () => citySiege.attackManager.state === 'RECON', null, 20000, 'A recon battle 2');
  const arena2 = await liveRows(A, 'arena');
  const docMid = await cityDoc(uidA);
  const rbMid = freeTiles(docMid, 'roadblock', { near: [-3, 7] })[0];
  r = await mcp.call('place_building', { type: 'roadblock', gx: rbMid[0], gz: rbMid[1] });
  const rbMidId = r.structuredContent && r.structuredContent.results && r.structuredContent.results[0].id;
  await sleep(2500);
  const mid = await A.page.evaluate((id) => ({
    home: citySiege.buildingManager.buildings.some(b => b.id === id),
    state: citySiege.attackManager.state,
    pending: !!citySiege.online.cloudSync.pendingRemote,
    sync: citySiege.online.sync.status + ': ' + citySiege.online.sync.detail
  }), rbMidId);
  check(!r.isError && !mid.home && mid.state === 'RECON' && mid.pending && sameList(await liveRows(A, 'arena'), arena2),
    `an MCP edit saved mid-raid (rev ${r.structuredContent && r.structuredContent.rev}) is held back: home city and arena untouched while A is in recon`, mid);
  await shot(A, 'raid-recon-with-ai-edit-waiting');
  await A.page.click('#btn-abort-recon');
  await waitFor(A, () => citySiege.attackManager.state === 'IDLE' && citySiege.attackManager.buildings === citySiege.buildingManager, null, 8000, 'A home after abort');
  const applied = await waitFor(A, (id) => citySiege.buildingManager.buildings.some(b => b.id === id), rbMidId, 8000, 'held edit applied');
  await A.page.waitForTimeout(400);
  const abortTo = await A.page.evaluate(() => [...new Set(window.__e2e.toasts)].slice(-4));
  const bd2b = await battleDoc(b2);
  check(applied && abortTo.some(t => /AI designer/.test(t) && /Roadblock/.test(t)) && !(bd2b.attempts && bd2b.attempts[uidA]) &&
    await A.page.evaluate((id) => citySiege.online.battle(id).canAttack, b2),
  'ABORT RECON: back home the held AI edit is applied (Roadblock + toast), and no attempt was burnt (ATTACK still offered)', { applied, abortTo, attempts: bd2b.attempts });
  await waitFor(A, () => citySiege.uiManager.currentScreen === 'BATTLES', null, 5000, 'BATTLES after abort');
  await shot(A, 'battles-after-abort-ai-edit-applied');

  // ============================================================================================
  R.section('10. A revokes the token in ACCOUNT; the MCP server refuses it');
  const revBeforeRevoke = (await cityDoc(uidA)).rev;
  await A.page.click('#btn-close-battles');
  await A.page.click('#btn-account');
  await A.page.click('#account-view .account-tab-btn[data-tab="mcp"]');
  await A.page.waitForSelector(`[data-token-row="${hash}"] [data-action="revoke-token"]`, { timeout: 8000 });
  await A.page.click(`[data-token-row="${hash}"] [data-action="revoke-token"]`);
  await A.page.click(`[data-token-row="${hash}"] [data-action="confirm-revoke"]`);
  await waitFor(A, (h) => /REVOKED/.test(document.querySelector(`[data-token-row="${h}"]`)?.innerText || ''), hash, 8000, 'revoked row');
  // The row shows REVOKED from the page's own pending write; the server copy can lag a moment behind.
  let revokedDoc = false;
  for (let i = 0; i < 50 && !revokedDoc; i++) { revokedDoc = (await db.doc('mcpTokens/' + hash).get()).data().revoked === true; if (!revokedDoc) await sleep(100); }
  check(revokedDoc, 'Revoke -> YES, REVOKE: mcpTokens doc revoked:true');
  await A.page.evaluate(() => document.querySelector('#mcp-token-list')?.scrollIntoView({ block: 'center' }));
  await shot(A, 'account-mcp-token-revoked');
  await sleep(2000);   // longer than this process's 1.5 s token cache
  r = await mcp.call('place_building', { type: 'roadblock', gx: rbTile[0], gz: rbTile[1] });
  check(r.isError && /Access denied/.test(r.text) && /REVOKED_TOKEN/.test(r.text), 'the running MCP server refuses the revoked token (REVOKED_TOKEN)', r.text.slice(0, 200));
  mcp2 = await startMcp({ token, projectId: PROJECT, hosts: HOSTS });
  r = await mcp2.call('get_city');
  check(r.isError && /REVOKED_TOKEN/.test(r.text), 'a freshly started MCP server refuses it too', r.text.slice(0, 200));
  check((await cityDoc(uidA)).rev === revBeforeRevoke, 'nothing was written with the revoked token');

  // ============================================================================================
  R.section('11. A reloads: still signed in, same city, no echo write, the battles are still there');
  const before = await homeCityCanon(A);
  await A.page.reload();
  await A.page.waitForFunction(() => window.citySiege && citySiege.online && citySiege.online.profile && citySiege.online.sync.status === 'synced', null, { timeout: 30000 });
  await A.page.waitForTimeout(3500);
  const after = await homeCityCanon(A);
  const cA = await cityDoc(uidA);
  const view = await A.page.evaluate((id) => { const v = citySiege.online.battle(id); return v && { phase: v.phase, iWon: v.iWon, settled: v.settled }; }, battleId);
  check(after.live === before.live && cA.rev === revBeforeRevoke && await textOf(A, '#account-pill-label') === 'Alice · 🏆30' && view && view.phase === 'finished' && view.iWon,
    `after a reload A is signed in (pill "Alice · 🏆30"), the city is unchanged, cities/A still rev ${cA.rev} (no echo push), battle 1 still a finished win`, { rev: cA.rev, view });
  await shot(A, 'home-after-reload');

  // ============================================================================================
  R.section('12. The network drops mid-raid (battle 2): never "sent" before it is; B stays, A closes the tab');
  /** ATTACK battle 2 -> gate -> breach, then the network goes; raze `share`; the raid ends. */
  const offlineRaid = async (pl, share) => {
    if (await screenOf(pl) !== 'BATTLES') await pl.page.click('#btn-open-battles');
    await pl.page.click('#battles-view .battles-tab-btn[data-tab="active"]');
    await pl.page.waitForSelector(`.battle-card[data-battle="${b2}"] [data-action="attack"]`, { timeout: 10000 });
    await pl.page.click(`.battle-card[data-battle="${b2}"] [data-action="attack"]`);
    await waitFor(pl, () => citySiege.attackManager.state === 'RECON', null, 20000, `${pl.tag} recon b2`);
    await pl.page.waitForTimeout(700);
    if (!(await clickAGate(pl))) await pl.page.evaluate(() => { const am = citySiege.attackManager; am.triggerCinematicBreach(am.buildings.getMainGates()[0]); });
    await waitFor(pl, () => citySiege.attackManager.state === 'COMBAT', null, 15000, `${pl.tag} combat b2`);
    await waitFor(pl, (id) => (citySiege.online.battle(id) || {}).iAttempted, b2, 10000, `${pl.tag} attempt b2`);
    offline.push({ tag: pl.tag, from: errors.length, to: Infinity });
    await pl.ctx.setOffline(true);
    await razeArena(pl, share);
    if (share < 1) await pl.page.click('#btn-retreat');
    await waitFor(pl, () => !document.getElementById('result-modal').classList.contains('hidden'), null, 10000, `${pl.tag} modal b2`);
    const seen = [];
    for (let i = 0; i < 40; i++) {   // the delivery line settles within a few seconds (up to the SDK's offline detection)
      seen.push((await textOf(pl, '#result-battle-status')) || '');
      if (i >= 4 && /not sent/i.test(seen.at(-1))) break;
      await pl.page.waitForTimeout(500);
    }
    return [...new Set(seen)].filter(Boolean);
  };
  const queued = (pl) => pl.page.evaluate((id) => (localStorage.getItem('city_siege_battle_results') || '').includes(id), b2);
  const resultOf = async (uid) => ((await battleDoc(b2)).results || {})[uid] || null;

  // B: stays on the result screen until the network is back.
  const seenB = await offlineRaid(B, 0.4);
  check(seenB.some(t => /Result not sent \(retrying\)/.test(t)) && !seenB.some(t => /Result sent ✓/.test(t)) && await queued(B) && !(await resultOf(uidB)),
    `B offline: the modal says "⚠ Result not sent (retrying)" (never "sent"), the result stays queued in localStorage, the server has nothing`, seenB);
  await shot(B, 'raid-result-offline-not-sent');
  await B.ctx.setOffline(false);
  offline.at(-1).to = errors.length;
  const tBack = Date.now();
  const flipped = await waitFor(B, () => /Result sent ✓/.test(document.getElementById('result-battle-status')?.textContent || ''), null, 45000, 'B flips to sent');
  const rB2 = await resultOf(uidB);
  check(flipped && rB2 && rB2.outcome === 'retreat' && !(await queued(B)),
    `B back online: the same modal flips to "Result sent ✓" (${((Date.now() - tBack) / 1000).toFixed(1)} s), the result is on the server, the queue entry is gone`, rB2);
  await shot(B, 'raid-result-back-online-sent');
  await B.page.click('#btn-collect-loot');

  // A: razes the city, the network is gone, A closes the tab - the queued result is the only copy.
  const seenA = await offlineRaid(A, 1);
  check(seenA.some(t => /Result not sent \(retrying\)/.test(t)) && !seenA.some(t => /Result sent ✓/.test(t)) && await queued(A),
    'A offline after razing Bob\'s city: "⚠ Result not sent (retrying)" and queued', seenA);
  await reopenGame(A, URL, errors, async () => {
    check(!(await resultOf(uidA)), 'A closed the tab while offline: no result from A on the server');
    await A.ctx.setOffline(false);
    offline.at(-1).to = errors.length;
  });
  const tOpen = Date.now();
  let rA2 = null;
  for (let i = 0; i < 120 && !rA2; i++) { rA2 = await resultOf(uidA); if (!rA2) await sleep(250); }
  // The admin read can see the result before A's own write acknowledgement arrives, and A drops
  // the queue entry only after that acknowledgement: give it a moment instead of racing it.
  let queuedA = true;
  for (let i = 0; i < 20 && rA2 && (queuedA = await queued(A)); i++) await sleep(150);
  check(rA2 && rA2.stars === 3 && rA2.outcome === 'victory' && !queuedA,
    `A reopens the game online: the queued result reached the server ${((Date.now() - tOpen) / 1000).toFixed(1)} s after load, queue emptied`, rA2);
  let fin2 = null;
  for (let i = 0; i < 120; i++) { fin2 = await battleDoc(b2); if (fin2.status === 'finished' && fin2.settled && fin2.settled[uidA] && fin2.settled[uidB]) break; await sleep(250); }
  const pa2 = (await db.doc('players/' + uidA).get()).data(), pb2 = (await db.doc('players/' + uidB).get()).data();
  check(fin2.status === 'finished' && fin2.winner === uidA && fin2.winner === battleRules.decideWinner(fin2) && pa2.trophies === 60 && pa2.wins === 2 && pb2.losses === 2 && pb2.trophies === 0,
    'battle 2 resolves (Alice wins again) and settles: Alice 60 🏆 2W, Bob 0 🏆 2L', { status: fin2.status, a: [pa2.trophies, pa2.wins], b: [pb2.trophies, pb2.losses] });
  await A.page.click('#btn-open-battles');
  await A.page.click('#battles-view .battles-tab-btn[data-tab="history"]');
  await waitFor(A, () => document.querySelectorAll('#battles-main .history-row.is-win').length >= 2, null, 8000, 'two wins in history');
  await shot(A, 'battles-history-two-wins');

  // ============================================================================================
  R.section('13. Console and network');
  const EMU = [HOSTS.firestore, HOSTS.auth, ...[HOSTS.firestore, HOSTS.auth].map(h => h.replace('127.0.0.1', 'localhost'))];
  const isEmu = (u) => EMU.some(h => (u || '').includes('//' + h + '/'));
  // While a player is deliberately offline (section 12) the SDK's failed requests are expected.
  const inOffline = (e, i) => offline.some(w => w.tag === e.tag && i >= w.from && i < w.to) && e.kind !== 'pageerror' &&
    (/ERR_INTERNET_DISCONNECTED|@firebase\/firestore/.test(e.text || '') || isEmu(e.url));
  const offlineLines = errors.filter(inOffline);
  if (offlineLines.length) R.note(`${offlineLines.length} console line(s) during the deliberate offline windows (ERR_INTERNET_DISCONNECTED / emulator)`);
  const allowed = errors.filter((e, i) => inOffline(e, i) || (e.kind === 'http' && (isEmu(e.url) || /favicon/.test(e.url))) ||
    (e.kind === 'console' && /Failed to load resource/.test(e.text) && (isEmu(e.url) || /favicon/.test(e.url))));
  const bad = errors.filter(e => !allowed.includes(e));
  if (allowed.length) R.note(`${allowed.length} allowlisted emulator/favicon line(s): ${[...new Set(allowed.map(e => `${e.tag} ${e.kind} ${e.status || ''} ${(e.url || '').replace(/\?.*/, '').slice(0, 90)}`))].slice(0, 6).join(' | ')}`);
  check(bad.length === 0, 'no page errors, console errors or failed requests outside the emulator origins', bad.slice(0, 8));
} catch (e) {
  check(false, 'script crashed: ' + (e && e.stack || e));
} finally {
  if (mcp) await mcp.close();
  if (mcp2) await mcp2.close();
  await browser.close().catch(() => {});
  const removed = await deleteAuthUsers(AUTH_PROJECT, HOSTS, { suffix: EMAIL_SUFFIX, uids: createdUids }).catch(() => 0);
  console.log(`\n(${removed} e2e auth user(s) deleted; Firestore data left in ${PROJECT} for inspection; ${elapsed()})`);
  console.log(`${R.passes} PASS, ${R.fails} FAIL`);
  if (R.fails) console.log('FAILED: ' + R.failed.join(' || '));
  else console.log('E2E PVP SUITE PASSES');
  process.exit(R.fails ? 1 : 0);
}
