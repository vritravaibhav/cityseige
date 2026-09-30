#!/usr/bin/env node
/**
 * e2e-oauth.mjs - "Connect ChatGPT" end to end, through the real game's CONNECT screen in Chrome.
 *
 *   GAME_URL=http://localhost:3176/ PW_CORE=/path/to/node_modules/playwright-core \
 *   FIREBASE_PROJECT_ID=demo-cs-oauth-e2e node tools/online/e2e-oauth.mjs [shotsDir]
 *
 * Needs the Firebase emulators, a Vite dev server in emulator mode for the SAME project id
 * (`VITE_FIREBASE_PROJECT_ID=demo-cs-oauth-e2e npx vite --mode emulator --port 3176`), Chrome and
 * mcp-server/node_modules. It starts the real MCP server over HTTP with OAuth on (PUBLIC_URL +
 * GAME_URL) and a stand-in for ChatGPT: a client that registers itself (DCR), sends the browser to
 * /oauth/authorize with PKCE, and receives the code on its own callback URL. Then:
 *   1. the player signs up in ACCOUNT;
 *   2. "Connect" in the app: the browser lands on the game's CONNECT screen, which names the app and
 *      where it returns to; ALLOW sends the browser back to the app with code + state + iss;
 *   3. the app swaps the code for tokens, and its MCP calls edit the player's city - live in the open
 *      game (Design screen, "AI designer" toast);
 *   4. ACCOUNT -> AI Designer lists the connection ("🔗 ChatGPT · signed in"); Revoke there makes the
 *      server refuse the token (401);
 *   5. DENY sends the app error=access_denied; a signed-out browser is sent through the ACCOUNT
 *      sign-in and comes back to CONNECT; an expired request shows "This link has expired".
 * Screenshots of every step (desktop + phone). Exits 1 on any failure.
 */
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  GAME_ROOT, sleep, makeReporter, emulatorHosts, wipeProject, loadRules, deleteAuthUsers, adminFirestore,
  newPlayer, recordErrors, installToastRecorder, toastsOf, textOf, waitFor, readText
} from './lib/e2e.mjs';

const PW = process.env.PW_CORE;
if (!PW) { console.error('Set PW_CORE to a playwright-core install.'); process.exit(2); }
const GAME_URL = process.env.GAME_URL || 'http://localhost:3176/';
const PROJECT = process.env.FIREBASE_PROJECT_ID || 'demo-cs-oauth-e2e';
const SUFFIX = process.env.E2E_EMAIL_SUFFIX || '@e2e-oauth.test';
const SHOTS = process.argv[2] || null;
const MCP_PORT = Number(process.env.OAUTH_E2E_MCP_PORT || 8861);
const CB_PORT = MCP_PORT + 1;
const PUBLIC = `http://127.0.0.1:${MCP_PORT}`;
const MCP_URL = PUBLIC + '/mcp';
const CALLBACK = `http://127.0.0.1:${CB_PORT}/callback`;
const hosts = emulatorHosts();
const R = makeReporter();
const { check } = R;
const errors = [];
const RUN = Date.now().toString(36);

const { chromium } = await import(path.join(PW, 'index.mjs'));
const { db, Timestamp } = adminFirestore(PROJECT, hosts);
const MCP_NM = path.join(GAME_ROOT, 'mcp-server', 'node_modules');
const { Client } = await import(path.join(MCP_NM, '@modelcontextprotocol/sdk/dist/esm/client/index.js'));
const { StreamableHTTPClientTransport } = await import(path.join(MCP_NM, '@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js'));

const shot = async (pl, name) => { if (SHOTS) await pl.page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };
const b64url = (b) => Buffer.from(b).toString('base64url');
const pkce = () => { const verifier = b64url(randomBytes(32)); return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }; };
const qp = (u, k) => { try { return new URL(u).searchParams.get(k); } catch { return null; } };

// ---------------------------------------------------------------------------- the stand-in "ChatGPT"
const callbacks = [];
const cbServer = http.createServer((req, res) => {
  const u = new URL(req.url, CALLBACK);
  callbacks.push(u.toString());
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><body style="font-family:sans-serif;background:#10131a;color:#eee;padding:40px">
    <h2>${u.searchParams.get('code') ? '✅ ChatGPT stand-in: connected' : '❌ ChatGPT stand-in: ' + (u.searchParams.get('error') || 'no code')}</h2>
    <p>state=${u.searchParams.get('state')} iss=${u.searchParams.get('iss')}</p></body>`);
});
await new Promise(r => cbServer.listen(CB_PORT, '127.0.0.1', r));

const mcpLog = [];
const mcpProc = spawn(process.execPath, [path.join(GAME_ROOT, 'mcp-server/src/index.js'), '--http', '--port', String(MCP_PORT)], {
  env: { ...process.env, FIRESTORE_EMULATOR_HOST: hosts.firestore, FIREBASE_PROJECT_ID: PROJECT, PUBLIC_URL: PUBLIC, GAME_URL, MCP_AUTH_CACHE_MS: '0' },
  stdio: ['ignore', 'pipe', 'pipe']
});
mcpProc.stderr.on('data', d => mcpLog.push(String(d)));

let browser;
let exitCode = 0;
try {
  R.section('setup');
  await wipeProject(PROJECT, hosts);
  await deleteAuthUsers('demo-city-siege', hosts, { suffix: SUFFIX });
  check(await loadRules(PROJECT, hosts, readText(path.join(GAME_ROOT, 'firestore.rules'))) === 200, 'real firestore.rules loaded');
  for (let i = 0; i < 100; i++) { try { if ((await fetch(PUBLIC + '/healthz')).ok) break; } catch { /* starting */ } await sleep(100); }
  check((await (await fetch(PUBLIC + '/healthz')).json()).oauth === true, 'MCP server up with OAuth on');
  const reg = await (await fetch(PUBLIC + '/oauth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_name: 'ChatGPT', redirect_uris: [CALLBACK] }) })).json();
  check(/^csc_/.test(reg.client_id || ''), 'the stand-in app registered itself (DCR)', reg);
  const authorizeUrl = (challenge, state) => {
    const u = new URL(PUBLIC + '/oauth/authorize');
    for (const [k, v] of Object.entries({ response_type: 'code', client_id: reg.client_id, redirect_uri: CALLBACK, code_challenge: challenge,
      code_challenge_method: 'S256', state, scope: 'city.design', resource: MCP_URL })) u.searchParams.set(k, v);
    return u.toString();
  };
  const exchange = async (code, verifier) => (await fetch(PUBLIC + '/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, client_id: reg.client_id, redirect_uri: CALLBACK, resource: MCP_URL }) })).json();

  browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  R.section('1. the player signs up');
  const A = await newPlayer(browser, GAME_URL, 'A', errors);
  const email = `olga.${RUN}${SUFFIX}`;
  await A.page.click('#btn-account');
  await A.page.waitForSelector('form[data-form="sign-up"]', { timeout: 5000 });
  await A.page.fill('[data-field="signUp.name"]', 'Olga');
  await A.page.fill('[data-field="signUp.email"]', email);
  await A.page.fill('[data-field="signUp.password"]', 'olga-pass-1');
  await A.page.click('form[data-form="sign-up"] button[type="submit"]');
  await waitFor(A, () => { const o = citySiege.online; return o.profile && o.sync.status === 'synced' && o.sync.rev >= 1; }, null, 25000, 'signed up + synced');
  const uid = await A.page.evaluate(() => citySiege.online.user.uid);
  check(!!uid && !!(await db.doc('cities/' + uid).get()).exists, 'signed up; the city is in Firestore', uid);

  R.section('2. "Connect" in the app -> the CONNECT screen -> ALLOW');
  const p1 = pkce();
  await A.page.goto(authorizeUrl(p1.challenge, 'state-allow'));
  await A.page.waitForFunction(() => window.citySiege && citySiege.connectUI && citySiege.connectUI.isOpen() &&
    !!document.querySelector('#connect-main [data-action="allow"]'), null, { timeout: 30000 });
  await installToastRecorder(A.page);
  const consent = await textOf(A, '#connect-main');
  check(/ChatGPT wants to design your city/.test(consent) && /127\.0\.0\.1:8862/.test(consent) && /Signed in as Olga/.test(consent) &&
    /It can never/i.test(consent) && /expires in \d+:\d\d/.test(consent),
  'CONNECT names the app, where it returns to, the signed-in player, what it can/can\'t do and the countdown', consent);
  check(!(await A.page.evaluate(() => location.search)).includes('oauth_request'), 'the request id is taken out of the address bar');
  await shot(A, '01-connect-consent');
  await A.page.click('#connect-main [data-action="allow"]');
  await A.page.waitForURL((u) => u.toString().startsWith(CALLBACK), { timeout: 20000 });
  const cb1 = A.page.url();
  check(!!qp(cb1, 'code') && qp(cb1, 'state') === 'state-allow' && qp(cb1, 'iss') === PUBLIC, 'ALLOW -> back to the app with code, state and iss', cb1);
  await shot(A, '02-back-in-app');
  const tok = await exchange(qp(cb1, 'code'), p1.verifier);
  check(/^cso_/.test(tok.access_token || '') && /^csr_/.test(tok.refresh_token || ''), 'the app swaps the code for access + refresh tokens', tok);

  R.section('3. the app designs the city - live in the open game');
  await A.page.goto(GAME_URL);
  await A.page.waitForFunction(() => window.citySiege && citySiege.online && citySiege.online.profile && citySiege.online.sync.linked, null, { timeout: 30000 });
  await installToastRecorder(A.page);
  await A.page.click('#btn-open-design');
  await sleep(600);
  const client = new Client({ name: 'chatgpt-standin', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL), { requestInit: { headers: { Authorization: 'Bearer ' + tok.access_token } } }));
  const call = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); r.text = (r.content || []).map(c => c.text || '').join('\n'); return r; };
  let r = await call('get_city', { ids: true });
  check(!r.isError && /Town Hall 1/.test(r.text), 'get_city with the OAuth token reads Olga\'s city', r.text.slice(0, 160));
  const beforeRoads = await A.page.evaluate(() => citySiege.buildingManager.roadNetwork.roads.size);
  r = await call('add_roads', { path: [[2, 8], [5, 8]] });
  check(!r.isError, 'add_roads through the OAuth connection', r.text.slice(0, 200));
  await waitFor(A, (n) => citySiege.buildingManager.roadNetwork.roads.size >= n + 4, beforeRoads, 8000, 'roads applied live');
  r = await call('place_building', { type: 'tree', gx: 7, gz: 9 });
  await waitFor(A, () => citySiege.buildingManager.buildings.some(b => b.type === 'tree' && b.gx === 7 && b.gz === 9), null, 8000, 'tree applied live');
  const toasts = await toastsOf(A);
  check(toasts.some(t => /AI designer/.test(t)), 'the open game shows the "AI designer" toast', toasts);
  await shot(A, '03-design-live-from-chatgpt');
  const cd = (await db.doc('cities/' + uid).get()).data();
  check(cd.updatedBy === 'mcp' && cd.writerId === 'mcp:' + tok.access_token.slice(4, 12), 'the city doc names this connection as the writer', { by: cd.updatedBy, w: cd.writerId });
  await client.close();

  R.section('4. the connection in ACCOUNT -> AI Designer; Revoke kills it');
  await A.page.click('#btn-exit-design').catch(() => {});
  await A.page.click('#btn-account');
  await A.page.click('#account-view .account-tab-btn[data-tab="mcp"]');
  await waitFor(A, () => /ChatGPT/.test((document.getElementById('mcp-token-list') || {}).innerText || ''), null, 10000, 'connection listed');
  const list = await textOf(A, '#mcp-token-list');
  check(/🔗 ChatGPT/.test(list) && /signed in · 127\.0\.0\.1:8862/.test(list), 'the list shows "🔗 ChatGPT · signed in · <app host>"', list);
  const chatgptCard = await textOf(A, '#account-main');
  check(/ChatGPT \(and other apps that sign in\)/.test(chatgptCard) && /Developer mode/.test(chatgptCard), 'the AI Designer tab explains how to add the connector in ChatGPT');
  await A.page.locator('#mcp-token-list').scrollIntoViewIfNeeded();
  await shot(A, '04-account-connected-app');
  const grantId = tok.access_token.slice(4, 68);
  await A.page.click(`[data-token-row="${grantId}"] [data-action="revoke-token"]`);
  await A.page.click(`[data-token-row="${grantId}"] [data-action="confirm-revoke"]`);
  await waitFor(A, (g) => /REVOKED/.test((document.querySelector(`[data-token-row="${g}"]`) || {}).innerText || ''), grantId, 8000, 'revoked in UI');
  const rv = await fetch(MCP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: 'Bearer ' + tok.access_token },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } }) });
  check(rv.status === 401 && /error="invalid_token"/.test(rv.headers.get('www-authenticate') || ''), 'after Revoke in the game the server answers 401 invalid_token', rv.status);
  await shot(A, '05-account-revoked');

  R.section('5. DENY, signed-out, expired');
  const p2 = pkce();
  await A.page.goto(authorizeUrl(p2.challenge, 'state-deny'));
  await A.page.waitForFunction(() => window.citySiege && citySiege.connectUI && !!document.querySelector('#connect-main [data-action="deny"]'), null, { timeout: 30000 });
  await A.page.click('#connect-main [data-action="deny"]');
  await A.page.waitForURL((u) => u.toString().startsWith(CALLBACK), { timeout: 20000 });
  check(qp(A.page.url(), 'error') === 'access_denied' && qp(A.page.url(), 'state') === 'state-deny', 'DENY -> the app gets error=access_denied', A.page.url());

  const B = await newPlayer(browser, GAME_URL, 'B', errors);   // same player, fresh browser: signed out
  const p3 = pkce();
  await B.page.goto(authorizeUrl(p3.challenge, 'state-signin'));
  await B.page.waitForFunction(() => window.citySiege && citySiege.connectUI && !!document.querySelector('#connect-main [data-action="sign-in"]'), null, { timeout: 30000 });
  check(/An AI app wants to design your city/.test(await textOf(B, '#connect-main')), 'signed out: CONNECT asks to sign in first');
  await shot(B, '06-connect-signed-out');
  await B.page.click('#connect-main [data-action="sign-in"]');
  await B.page.waitForSelector('form[data-form="sign-in"]', { timeout: 8000 });
  await B.page.fill('[data-field="signIn.email"]', email);
  await B.page.fill('[data-field="signIn.password"]', 'olga-pass-1');
  await B.page.click('form[data-form="sign-in"] button[type="submit"]');
  await B.page.waitForFunction(() => citySiege.connectUI.isOpen() && !!document.querySelector('#connect-main [data-action="allow"]'), null, { timeout: 30000 });
  check(/Signed in as Olga/.test(await textOf(B, '#connect-main')), 'after signing in the player is back on CONNECT');
  await shot(B, '07-connect-after-sign-in');
  await B.page.click('#connect-main [data-action="allow"]');
  await B.page.waitForURL((u) => u.toString().startsWith(CALLBACK), { timeout: 20000 });
  const tok3 = await exchange(qp(B.page.url(), 'code'), p3.verifier);
  const g3 = tok3.access_token ? (await db.doc('mcpTokens/' + tok3.access_token.slice(4, 68)).get()).data() : null;
  check(g3 && g3.uid === uid && g3.kind === 'oauth', 'that connection belongs to the same player', g3);

  const p4 = pkce();
  const a4 = await fetch(authorizeUrl(p4.challenge, 'state-old'), { redirect: 'manual' });
  const req4 = qp(a4.headers.get('location'), 'oauth_request');
  await db.doc('oauthRequests/' + req4).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
  await B.page.goto(GAME_URL + '?oauth_request=' + req4);
  await B.page.waitForFunction(() => window.citySiege && citySiege.connectUI && /expired/.test((document.getElementById('connect-main') || {}).innerText || ''), null, { timeout: 30000 });
  check(true, 'an expired request shows "This link has expired"');
  await shot(B, '08-connect-expired');

  R.section('6. phone layout');
  const M = await newPlayer(browser, GAME_URL, 'M', errors, { width: 390, height: 844 });
  await M.page.click('#btn-account');
  await M.page.waitForSelector('form[data-form="sign-in"]', { timeout: 5000 });
  await M.page.fill('[data-field="signIn.email"]', email);
  await M.page.fill('[data-field="signIn.password"]', 'olga-pass-1');
  await M.page.click('form[data-form="sign-in"] button[type="submit"]');
  await waitFor(M, () => !!citySiege.online.profile, null, 20000, 'phone signed in');
  const p5 = pkce();
  await M.page.goto(authorizeUrl(p5.challenge, 'state-phone'));
  await M.page.waitForFunction(() => window.citySiege && citySiege.connectUI && !!document.querySelector('#connect-main [data-action="allow"]'), null, { timeout: 30000 });
  const fits = await M.page.evaluate(() => {
    const b = document.querySelector('#connect-main [data-action="allow"]').getBoundingClientRect();
    // The CONNECT screen itself (the home top bar under it overflows on phones, which is older).
    const v = document.getElementById('connect-view');
    return { right: b.right, width: innerWidth, overflow: v.scrollWidth > v.clientWidth };
  });
  check(fits.right <= fits.width && !fits.overflow, 'phone (390x844): CONNECT fits the screen, ALLOW is reachable', fits);
  await shot(M, '09-connect-phone');
  await M.page.locator('#connect-main [data-action="allow"]').scrollIntoViewIfNeeded();
  await shot(M, '10-connect-phone-actions');

  R.section('7. errors');
  const allowed = (e) => (e.kind === 'http' && /127\.0\.0\.1:(9099|8085)/.test(e.url)) || /favicon/.test(e.url || e.text || '') ||
    (e.kind === 'console' && /127\.0\.0\.1:(9099|8085)|Failed to load resource: the server responded with a status of 40[01]/.test(e.text + (e.url || '')));
  const bad = errors.filter(e => !allowed(e));
  check(bad.length === 0, 'no page errors or failed requests outside the emulators', bad.slice(0, 8));
} catch (e) {
  check(false, 'suite crashed: ' + (e.stack || e));
} finally {
  if (browser) await browser.close().catch(() => {});
  mcpProc.kill('SIGTERM');
  cbServer.close();
  await deleteAuthUsers('demo-city-siege', hosts, { suffix: SUFFIX }).catch(() => 0);
}
console.log(`\n${R.passes} PASS, ${R.fails} FAIL`);
if (R.fails) {
  exitCode = 1;
  console.log('MCP server log (tail):\n' + mcpLog.join('').split('\n').slice(-15).join('\n'));
} else console.log('E2E OAUTH SUITE PASSES');
process.exit(exitCode);
