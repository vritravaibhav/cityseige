/**
 * Shared helpers for the online browser suites (tools/online/e2e-pvp.mjs): PASS/FAIL reporting,
 * Firebase Emulator housekeeping, a firebase-admin handle, an MCP stdio client, and page helpers
 * that drive the real game (toasts, projected clicks and drags on the 3D map).
 *
 * Everything here is test code: it never runs inside the game, and whatever it installs in a page
 * (the toast recorder, the storage sampler) lives on `window.__e2e` of the page it was put in.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const GAME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MCP_DIR = path.join(GAME_ROOT, 'mcp-server');
const MCP_NM = path.join(MCP_DIR, 'node_modules');

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------------------------ reporting

/** check(ok, name, detail?) prints PASS/FAIL like smoke.mjs and counts both. */
export function makeReporter() {
  const r = { passes: 0, fails: 0, lines: [], failed: [] };
  r.check = (ok, name, detail) => {
    if (ok) r.passes++; else { r.fails++; r.failed.push(name); }
    const d = detail === undefined ? '' : '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail));
    const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : d.slice(0, 900)}`;
    r.lines.push(line);
    console.log(line);
    return !!ok;
  };
  r.note = (msg) => { r.lines.push('      ' + msg); console.log('      ' + msg); };
  r.section = (title) => { const l = `\n== ${title}`; r.lines.push(l); console.log(l); };
  return r;
}

// ------------------------------------------------------------------------------------ emulators

export function emulatorHosts(env = process.env) {
  return {
    firestore: env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085',
    auth: env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
  };
}

/** Wipe ONE project's Firestore documents and its Auth accounts (never another suite's). */
export async function wipeProject(projectId, hosts) {
  const d = await fetch(`http://${hosts.firestore}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: 'DELETE' });
  const a = await fetch(`http://${hosts.auth}/emulator/v1/projects/${projectId}/accounts`, { method: 'DELETE' });
  return { firestore: d.status, auth: a.status };
}

/** Load security rules into one emulator project. */
export async function loadRules(projectId, hosts, rulesText) {
  const r = await fetch(`http://${hosts.firestore}/emulator/v1/projects/${projectId}:securityRules`, {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: rulesText }] } })
  });
  return r.status;
}

/**
 * Browser sign-ups land in the Auth emulator's DEFAULT project whatever the page's project id is
 * (ONLINE_SPEC 13, client (a)), which every browser suite shares. So this suite deletes only its
 * own users: the ones whose email ends with `suffix`, plus any uid it was given.
 */
export async function deleteAuthUsers(authProject, hosts, { suffix = null, uids = [] } = {}) {
  const base = `http://${hosts.auth}/identitytoolkit.googleapis.com/v1/projects/${authProject}`;
  const headers = { authorization: 'Bearer owner', 'content-type': 'application/json' };
  const ids = new Set(uids.filter(Boolean));
  if (suffix) {
    const q = await fetch(`${base}/accounts:query`, { method: 'POST', headers, body: JSON.stringify({ returnUserInfo: true }) });
    const j = await q.json().catch(() => ({}));
    for (const u of j.userInfo || []) if (u.email && u.email.endsWith(suffix)) ids.add(u.localId);
  }
  let n = 0;
  for (const localId of ids) {
    const r = await fetch(`${base}/accounts:delete`, { method: 'POST', headers, body: JSON.stringify({ localId }) });
    if (r.ok) n++;
  }
  return n;
}

/** firebase-admin Firestore against the emulator (the MCP server's own copy of the SDK). */
export function adminFirestore(projectId, hosts) {
  process.env.FIRESTORE_EMULATOR_HOST = hosts.firestore;
  const require = createRequire(path.join(MCP_DIR, 'package.json'));
  const { initializeApp, getApps } = require('firebase-admin/app');
  const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
  const name = 'e2e-' + projectId;
  const app = getApps().find(a => a.name === name) || initializeApp({ projectId }, name);
  return { db: getFirestore(app), FieldValue, Timestamp };
}

// ------------------------------------------------------------------------------------ MCP client

/**
 * Spawn the real MCP server over stdio (mcp-server/src/index.js) with a player's token, and connect
 * the SDK Client to it - exactly what Claude Code / Claude Desktop do with the stdio config.
 */
export async function startMcp({ token, projectId, hosts, cacheMs = null, name = 'e2e-pvp' }) {
  const { Client } = await import(path.join(MCP_NM, '@modelcontextprotocol/sdk/dist/esm/client/index.js'));
  const { StdioClientTransport } = await import(path.join(MCP_NM, '@modelcontextprotocol/sdk/dist/esm/client/stdio.js'));
  const env = { PATH: process.env.PATH, CITY_SIEGE_TOKEN: token, FIRESTORE_EMULATOR_HOST: hosts.firestore, FIREBASE_PROJECT_ID: projectId };
  if (cacheMs !== null) env.MCP_AUTH_CACHE_MS = String(cacheMs);
  const stderr = [];
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(MCP_DIR, 'src/index.js')], env, stderr: 'pipe' });
  const client = new Client({ name, version: '1.0.0' });
  await client.connect(transport);
  if (transport.stderr) transport.stderr.on('data', (d) => stderr.push(String(d)));
  const call = async (tool, args = {}) => {
    const r = await client.callTool({ name: tool, arguments: args });
    r.text = (r.content || []).map(c => c.text || '').join('\n');
    return r;
  };
  return { client, call, stderr, close: () => client.close().catch(() => {}) };
}

// ------------------------------------------------------------------------------------ pages

/**
 * A fresh player: its own browser context (own localStorage + Firebase session), the game loaded
 * with an empty localStorage, and a test-side recorder of every text the single #ui-toast shows.
 */
export async function newPlayer(browser, url, tag, errors, viewport = { width: 1280, height: 800 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  recordErrors(page, tag, errors);
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.citySiege && citySiege.buildingManager && citySiege.online && citySiege.onlineUI && citySiege.online.authReady,
    null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await installToastRecorder(page);
  return { ctx, page, tag };
}

/** Page errors, console errors and HTTP >= 400 responses of one page, tagged with its player. */
export function recordErrors(page, tag, errors) {
  page.on('pageerror', e => errors.push({ tag, kind: 'pageerror', text: e.message }));
  page.on('console', m => { if (m.type() === 'error') errors.push({ tag, kind: 'console', text: m.text().slice(0, 400), url: (m.location() || {}).url || '' }); });
  page.on('response', r => { if (r.status() >= 400) errors.push({ tag, kind: 'http', status: r.status(), url: r.url() }); });
}

/**
 * The player closes the tab and opens the game again in the same browser profile (same
 * localStorage and Firebase session); `whileClosed` runs in between. Replaces `pl.page`.
 */
export async function reopenGame(pl, url, errors, whileClosed = null) {
  // runBeforeUnload: the game's pagehide/beforeunload saves run as in a real tab close; close()
  // then returns before the page is gone, so wait for it.
  const closed = new Promise(r => pl.page.once('close', r));
  await pl.page.close({ runBeforeUnload: true });
  await closed;
  if (whileClosed) await whileClosed();
  pl.page = await pl.ctx.newPage();
  recordErrors(pl.page, pl.tag, errors);
  await pl.page.goto(url);
  await pl.page.waitForFunction(() => window.citySiege && citySiege.buildingManager && citySiege.online && citySiege.online.profile,
    null, { timeout: 30000 });
  await installToastRecorder(pl.page);
  return pl;
}

export async function installToastRecorder(page) {
  await page.evaluate(() => {
    window.__e2e = window.__e2e || {};
    window.__e2e.toasts = [];
    const t = document.getElementById('ui-toast');
    new MutationObserver(() => {
      if (!t.classList.contains('hidden') && t.textContent) window.__e2e.toasts.push(t.textContent);
    }).observe(t, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
}

export const toastsOf = (pl) => pl.page.evaluate(() => [...new Set((window.__e2e && window.__e2e.toasts) || [])]);
export const textOf = (pl, sel) => pl.page.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
export const screenOf = (pl) => pl.page.evaluate(() => citySiege.uiManager.currentScreen);

/** waitForFunction that returns false (and logs) on timeout instead of throwing. */
export async function waitFor(pl, fn, arg, timeout = 15000, label = 'condition') {
  try {
    await pl.page.waitForFunction(fn, arg, { timeout, polling: 100 });
    return true;
  } catch (e) {
    console.log(`      (timed out after ${timeout} ms waiting for: ${label})`);
    return false;
  }
}

/**
 * Screen point of a world position through a camera ('builder' = the grid's camera, 'active' = the
 * scene's active one). THREE is reached through an instance the game already made (the grid's
 * raycaster), so the page needs no extra import. Returns null when it is behind the camera.
 */
export async function projectToScreen(pl, { x, y = 0, z }, which = 'builder') {
  return pl.page.evaluate(({ x, y, z, which }) => {
    const G = citySiege;
    const cam = which === 'active' ? G.sceneManager.activeCamera : G.gridSystem.camera;
    cam.updateMatrixWorld();
    const V = G.gridSystem.raycaster.ray.origin.constructor;
    const v = new V(x, y, z).project(cam);
    if (v.z > 1) return null;
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  }, { x, y, z, which });
}

/** Is the game canvas (not a HUD element) the thing under this screen point? */
export async function canvasAt(pl, pt) {
  return pl.page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return !!el && el.tagName === 'CANVAS' && !el.closest('#ui-container');
  }, pt);
}

/**
 * Screen point for a map tile that the game itself resolves to exactly that tile (same raycast the
 * GridSystem uses on pointer events), or null if the tile is off screen / under the HUD.
 */
export async function tilePoint(pl, gx, gz) {
  const ts = await pl.page.evaluate(() => citySiege.gridSystem.tileSize);
  const pt = await projectToScreen(pl, { x: gx * ts, y: 0, z: gz * ts });
  if (!pt) return null;
  const vp = pl.page.viewportSize();
  if (pt.x < 8 || pt.y < 8 || pt.x > vp.width - 8 || pt.y > vp.height - 8) return null;
  if (!(await canvasAt(pl, pt))) return null;
  const hit = await pl.page.evaluate(({ x, y }) => {
    const g = citySiege.gridSystem;
    const w = g.getWorldIntersection({ clientX: x, clientY: y });
    return w ? g.worldToGrid(w) : null;
  }, pt);
  return hit && hit.gx === gx && hit.gz === gz ? pt : null;
}

/**
 * Screen point that picks up `buildingId` with the GridSystem's own raycast (the building's mesh,
 * not something standing in front of it), or null.
 */
export async function buildingPoint(pl, buildingId) {
  const cands = await pl.page.evaluate((id) => {
    const G = citySiege;
    const b = G.buildingManager.buildings.find(x => x.id === id);
    if (!b || !b.mesh) return [];
    const cam = G.gridSystem.camera;
    cam.updateMatrixWorld();
    b.mesh.updateMatrixWorld(true);
    const V = G.gridSystem.raycaster.ray.origin.constructor;
    const p = b.mesh.position;
    const out = [];
    for (const h of [0.5, 1, 1.5, 2.5, 3.5]) {
      const v = new V(p.x, p.y + h, p.z).project(cam);
      if (v.z <= 1) out.push({ x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight });
    }
    return out;
  }, buildingId);
  for (const pt of cands) {
    if (!(await canvasAt(pl, pt))) continue;
    const hitId = await pl.page.evaluate(({ x, y }) => {
      const hit = citySiege.gridSystem.findBuildingFromRaycast({ clientX: x, clientY: y });
      return hit ? hit.id : null;
    }, pt);
    if (hitId === buildingId) return pt;
  }
  return null;
}

/** A real mouse press-drag-release on the page (pointer events with intermediate moves). */
export async function mouseDrag(pl, from, to, steps = 14) {
  const m = pl.page.mouse;
  await m.move(from.x, from.y);
  await m.down();
  await pl.page.waitForTimeout(60);
  for (let i = 1; i <= steps; i++) {
    await m.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
    await pl.page.waitForTimeout(16);
  }
  await pl.page.waitForTimeout(60);
  await m.up();
}

/**
 * The home city as the game would save it, minus the two fields that are clocks rather than design
 * (`savedAt`, and each building's stored output `st`, which grows every frame).
 */
export async function homeCityCanon(pl) {
  return pl.page.evaluate(async () => {
    const G = citySiege;
    const { serializeCity } = await import('/src/builder/CityPersistence.js');
    const strip = (blob) => blob && JSON.stringify({
      buildings: blob.buildings.map(b => { const { st, ...rest } = b; return rest; }),
      tasks: blob.tasks, roads: blob.roads
    });
    const raw = localStorage.getItem('city_siege_city');
    return {
      live: strip(serializeCity(G.buildingManager, Date.now())),
      saved: strip(raw ? JSON.parse(raw) : null),
      buildings: G.buildingManager.buildings.length,
      roads: G.buildingManager.roadNetwork.roads.size
    };
  });
}

/**
 * Watch a page's localStorage for any of `needles` (the opponent's building ids): every setItem is
 * inspected on the spot, and all keys are scanned every `everyMs`. Test instrumentation only.
 */
export async function installStorageWatch(pl, needles, everyMs = 100) {
  await pl.page.evaluate(({ needles, everyMs }) => {
    const w = window.__e2e = window.__e2e || {};
    w.watch = { needles: [...needles], samples: 0, writes: 0, hits: [] };
    const hit = (where, value) => {
      if (typeof value !== 'string') return;
      for (const n of w.watch.needles) if (value.includes(n)) { w.watch.hits.push({ where, needle: n, at: Date.now() }); return; }
    };
    if (!w.realSetItem) {
      w.realSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (this === window.localStorage && w.watch) { w.watch.writes++; hit('setItem ' + k, String(v)); }
        return w.realSetItem.call(this, k, v);
      };
    }
    clearInterval(w.watchTimer);
    w.watchTimer = setInterval(() => {
      w.watch.samples++;
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); hit('sample ' + k, localStorage.getItem(k)); }
    }, everyMs);
  }, { needles, everyMs });
}

export const addStorageNeedles = (pl, needles) => pl.page.evaluate((n) => { window.__e2e.watch.needles.push(...n); }, needles);
export const storageWatch = (pl) => pl.page.evaluate(() => ({ ...window.__e2e.watch, needles: window.__e2e.watch.needles.length }));

export function readText(file) {
  return fs.readFileSync(file, 'utf8');
}
