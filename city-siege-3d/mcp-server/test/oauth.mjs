#!/usr/bin/env node
/**
 * OAuth suite for the hosted MCP server (src/oauth.js): the flow ChatGPT and other OAuth MCP
 * clients use to connect by signing in to City Siege instead of pasting a token.
 *
 *   node test/oauth.mjs            (from mcp-server/, or `npm run test:oauth` in city-siege-3d)
 *
 * Needs the Firestore emulator on FIRESTORE_EMULATOR_HOST (default 127.0.0.1:8085). Uses its own
 * project `demo-cs-oauth` (MCP_OAUTH_TEST_PROJECT_ID to override) and wipes only that. It spawns
 * the real server (`--http` with PUBLIC_URL + GAME_URL) and plays every party itself: the client
 * (raw HTTP, and the official MCP SDK client's own OAuth implementation - the reference for what a
 * spec-following client such as ChatGPT does), the browser (reading Location headers) and the
 * player (the game's CONNECT screen writes oauthApprovals/{id}; here the admin SDK does, the
 * rules for that write are in tools/online/test-firestore-rules.mjs, and the real screen is
 * driven in tools/online/e2e-oauth.mjs).
 *
 * Prints PASS/FAIL per check and a total; exits 1 on any failure.
 */
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..');
const ENTRY = path.join(SERVER_DIR, 'src', 'index.js');
const FIXTURE = JSON.parse(readFileSync(path.resolve(SERVER_DIR, '../tools/online/fixtures/default-city.cloud.json'), 'utf8'));
const PROJECT = process.env.MCP_OAUTH_TEST_PROJECT_ID || 'demo-cs-oauth';
const EMU = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8085';
const PORT = Number(process.env.MCP_OAUTH_TEST_PORT || 8841);
const META_PORT = PORT + 1;
const PUBLIC = `http://127.0.0.1:${PORT}`;
const MCP = PUBLIC + '/mcp';
const GAME = 'http://game.test/play/';
const CHATGPT_CB = 'https://chatgpt.com/connector_platform_oauth_redirect';
process.env.FIRESTORE_EMULATOR_HOST = EMU;

const { initializeApp } = await import('firebase-admin/app');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { UnauthorizedError } = await import('@modelcontextprotocol/sdk/client/auth.js');

let passes = 0;
let fails = 0;
const failures = [];
function check(ok, name, detail) {
  if (ok) passes++; else { fails++; failures.push(name); }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : ''}`);
}
const section = (t) => console.log(`\n== ${t}`);

const db = getFirestore(initializeApp({ projectId: PROJECT }, 'oauth-test'));
await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
const cityOf = async (uid) => (await db.collection('cities').doc(uid).get()).data();
const seedCity = (uid, name) => db.collection('cities').doc(uid).set({
  uid, name, townHall: FIXTURE.townHall, rev: 1, updatedAt: Timestamp.now(), updatedBy: 'game', writerId: 'seed',
  layout: { ...FIXTURE.layout, savedAt: Date.now() }, holdings: FIXTURE.holdings
});
await seedCity('olivia', 'Olivia');
await seedCity('oscar', 'Oscar');

// ----------------------------------------------------------------------- helpers
const b64url = (b) => Buffer.from(b).toString('base64url');
const pkce = () => {
  const verifier = b64url(randomBytes(32));
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
};
const get = (url) => fetch(url, { redirect: 'manual' });
const postForm = (url, params) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
const postJson = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const loc = (r) => r.headers.get('location') || '';
const qp = (url, k) => { try { return new URL(url).searchParams.get(k); } catch { return null; } };

/** Browser + player: follow authorize to the game, approve as `uid`, finish. Returns the client callback URL. */
async function approveAs(authorizeUrl, uid) {
  const a = await get(authorizeUrl);
  const toGame = loc(a);
  const reqId = qp(toGame, 'oauth_request');
  if (a.status !== 302 || !toGame.startsWith(GAME) || !reqId) return { error: `authorize ${a.status} -> ${toGame || await a.text()}` };
  const r = (await db.collection('oauthRequests').doc(reqId).get()).data();
  await db.collection('oauthApprovals').doc(reqId).set({ uid, approvedAt: Timestamp.now() });
  const f = await get(r.finishUrl);
  return { reqId, request: r, callback: loc(f), status: f.status };
}

function authorizeUrl({ clientId, redirectUri = CHATGPT_CB, challenge, state = 'st-' + b64url(randomBytes(6)), extra = {} }) {
  const u = new URL(PUBLIC + '/oauth/authorize');
  const p = { response_type: 'code', client_id: clientId, redirect_uri: redirectUri, code_challenge: challenge,
    code_challenge_method: 'S256', state, scope: 'city.design', resource: MCP, ...extra };
  for (const [k, v] of Object.entries(p)) if (v !== null) u.searchParams.set(k, v);
  return u.toString();
}

async function mcpClient(token) {
  const client = new Client({ name: 'oauth-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP), { requestInit: { headers: { Authorization: 'Bearer ' + token } } }));
  return client;
}
const rawMcp = (token) => fetch(MCP, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })
});

// ----------------------------------------------------------------------- a Client ID Metadata Document host
const META_URL = `http://127.0.0.1:${META_PORT}/client.json`;
const META_CB = 'http://localhost:6274/oauth/callback';
const metaServer = http.createServer((req, res) => {
  if (req.url === '/client.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ client_id: META_URL, client_name: 'Metadata Client', redirect_uris: [META_CB], token_endpoint_auth_method: 'none' }));
  } else if (req.url === '/wrong.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ client_id: 'https://someone.else/client.json', redirect_uris: [META_CB] }));
  } else { res.writeHead(404); res.end(); }
});
await new Promise(r => metaServer.listen(META_PORT, '127.0.0.1', r));

// The SDK client only sends an https metadata URL (as ChatGPT does), so the SDK run gets one: a
// throwaway self-signed certificate that only the spawned server trusts (NODE_EXTRA_CA_CERTS).
const TLS_PORT = PORT + 2;
const TLS_META_URL = `https://localhost:${TLS_PORT}/client.json`;
let tlsServer = null;
let tlsCa = null;
try {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cs-oauth-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost', '-keyout', path.join(dir, 'key.pem'), '-out', path.join(dir, 'cert.pem')], { stdio: 'ignore' });
  tlsCa = path.join(dir, 'cert.pem');
  tlsServer = https.createServer({ key: readFileSync(path.join(dir, 'key.pem')), cert: readFileSync(tlsCa) }, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ client_id: TLS_META_URL, client_name: 'SDK Metadata Client', redirect_uris: [META_CB], token_endpoint_auth_method: 'none' }));
  });
  await new Promise(r => tlsServer.listen(TLS_PORT, '127.0.0.1', r));
} catch (e) {
  console.log('(no openssl: the SDK metadata-document run is skipped) ' + e.message);
}

// ----------------------------------------------------------------------- the server
const serverLog = [];
const proc = spawn(process.execPath, [ENTRY, '--http', '--port', String(PORT)], {
  cwd: SERVER_DIR,
  env: { ...process.env, FIRESTORE_EMULATOR_HOST: EMU, FIREBASE_PROJECT_ID: PROJECT, PUBLIC_URL: PUBLIC, GAME_URL: GAME,
    MCP_AUTH_CACHE_MS: '0', OAUTH_ALLOW_PRIVATE_METADATA: '1', ...(tlsCa ? { NODE_EXTRA_CA_CERTS: tlsCa } : {}) },
  stdio: ['ignore', 'pipe', 'pipe']
});
proc.stderr.on('data', d => serverLog.push(String(d)));
for (let i = 0; i < 100; i++) {
  try { if ((await fetch(PUBLIC + '/healthz')).ok) break; } catch { /* starting */ }
  await new Promise(r => setTimeout(r, 100));
}

try {
  section('discovery');
  const hz = await (await fetch(PUBLIC + '/healthz')).json();
  check(hz.oauth === true, '/healthz reports OAuth on', hz);
  let r = await rawMcp(null);
  const www = r.headers.get('www-authenticate') || '';
  check(r.status === 401 && www.includes(`resource_metadata="${PUBLIC}/.well-known/oauth-protected-resource"`) && www.includes('scope="city.design"'),
    'POST /mcp with no token: 401 + WWW-Authenticate naming the resource metadata', { status: r.status, www });
  const prm = await (await fetch(PUBLIC + '/.well-known/oauth-protected-resource')).json();
  check(prm.resource === MCP && prm.authorization_servers[0] === PUBLIC && prm.scopes_supported.includes('city.design'),
    'protected-resource metadata (RFC 9728): resource = <PUBLIC_URL>/mcp, authorization server = PUBLIC_URL', prm);
  const prm2 = await fetch(PUBLIC + '/.well-known/oauth-protected-resource/mcp');
  check(prm2.ok && (await prm2.json()).resource === MCP, 'path-suffixed metadata URL /.well-known/oauth-protected-resource/mcp works too');
  const asm = await (await fetch(PUBLIC + '/.well-known/oauth-authorization-server')).json();
  check(asm.issuer === PUBLIC && asm.code_challenge_methods_supported.includes('S256') && asm.authorization_response_iss_parameter_supported === true &&
    asm.client_id_metadata_document_supported === true && asm.registration_endpoint === PUBLIC + '/oauth/register' &&
    asm.token_endpoint_auth_methods_supported.includes('none'),
  'authorization-server metadata (RFC 8414): S256, iss parameter, CIMD and DCR, public clients', asm);
  const pre = await fetch(PUBLIC + '/oauth/token', { method: 'OPTIONS' });
  check(pre.status === 204 && pre.headers.get('access-control-allow-origin') === '*', 'CORS preflight on the OAuth endpoints (browser-based MCP clients)');

  section('dynamic client registration (RFC 7591)');
  r = await postJson(PUBLIC + '/oauth/register', { client_name: 'ChatGPT', redirect_uris: [CHATGPT_CB], grant_types: ['authorization_code', 'refresh_token'] });
  const reg = await r.json();
  check(r.status === 201 && /^csc_/.test(reg.client_id) && reg.token_endpoint_auth_method === 'none' && reg.redirect_uris[0] === CHATGPT_CB,
    'register ChatGPT: 201, public client', reg);
  const CID = reg.client_id;
  r = await postJson(PUBLIC + '/oauth/register', { client_name: 'Evil', redirect_uris: ['http://evil.example/cb'] });
  check(r.status === 400 && (await r.json()).error === 'invalid_redirect_uri', 'register an http:// (non-localhost) redirect: refused');
  r = await postJson(PUBLIC + '/oauth/register', { redirect_uris: [] });
  check(r.status === 400, 'register with no redirect URI: refused');

  section('authorize: request checks');
  const p1 = pkce();
  r = await get(authorizeUrl({ clientId: 'csc_' + 'x'.repeat(24), challenge: p1.challenge }));
  check(r.status === 400 && /Unknown app/.test(await r.text()), 'unknown client_id: an error page, no redirect');
  r = await get(authorizeUrl({ clientId: CID, challenge: p1.challenge, redirectUri: 'https://chatgpt.com/other' }));
  check(r.status === 400 && /Wrong return address/.test(await r.text()), 'unregistered redirect_uri: an error page, no redirect');
  r = await get(authorizeUrl({ clientId: CID, challenge: null, state: 'nopkce' }));
  check(r.status === 302 && qp(loc(r), 'error') === 'invalid_request' && qp(loc(r), 'state') === 'nopkce' && qp(loc(r), 'iss') === PUBLIC,
    'no PKCE: redirected back with error=invalid_request, the state and iss', loc(r));
  r = await get(authorizeUrl({ clientId: CID, challenge: p1.challenge, extra: { resource: 'https://other.example/mcp' } }));
  check(r.status === 302 && qp(loc(r), 'error') === 'invalid_target', 'a token for another resource: error=invalid_target', loc(r));
  r = await get(authorizeUrl({ clientId: CID, challenge: p1.challenge, extra: { response_type: 'token' } }));
  check(qp(loc(r), 'error') === 'unsupported_response_type', 'implicit flow (response_type=token): refused');

  section('authorize -> game CONNECT screen -> finish');
  const state1 = 'state-one';
  r = await get(authorizeUrl({ clientId: CID, challenge: p1.challenge, state: state1 }));
  const toGame = loc(r);
  const req1 = qp(toGame, 'oauth_request');
  check(r.status === 302 && toGame.startsWith(GAME) && /^[A-Za-z0-9_-]{32}$/.test(req1 || ''), 'authorize sends the browser to GAME_URL?oauth_request=<id>', toGame);
  const rq = (await db.collection('oauthRequests').doc(req1).get()).data();
  check(rq && rq.clientName === 'ChatGPT' && rq.redirectHost === 'chatgpt.com' && rq.finishUrl === `${PUBLIC}/oauth/finish?req=${req1}` &&
    rq.expiresAt.toMillis() > Date.now() + 500e3, 'the parked request carries what the CONNECT screen shows (app name, return host, finish URL, 10 min)', rq);
  r = await get(rq.finishUrl);
  check(r.status === 409 && /Not approved yet/.test(await r.text()), 'finish before ALLOW: "not approved yet" page, nothing issued');
  await db.collection('oauthApprovals').doc(req1).set({ uid: 'olivia', approvedAt: Timestamp.now() });
  r = await get(rq.finishUrl);
  const cb1 = loc(r);
  const code1 = qp(cb1, 'code');
  check(r.status === 302 && cb1.startsWith(CHATGPT_CB + '?') && code1 && qp(cb1, 'state') === state1 && qp(cb1, 'iss') === PUBLIC,
    'finish after ALLOW: back to ChatGPT with code, state and iss (RFC 9207)', cb1);
  r = await get(rq.finishUrl);
  check(r.status === 410, 'the request is spent: a second finish gets "already used"');
  const gone = await db.collection('oauthRequests').doc(req1).get();
  check(!gone.exists && !(await db.collection('oauthApprovals').doc(req1).get()).exists, 'request and approval are deleted');

  section('token endpoint');
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'authorization_code', code: code1, code_verifier: pkce().verifier, client_id: CID, redirect_uri: CHATGPT_CB, resource: MCP });
  let body = await r.json();
  check(r.status === 400 && body.error === 'invalid_grant' && /PKCE/.test(body.error_description), 'wrong code_verifier: invalid_grant (PKCE)', body);
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'authorization_code', code: code1, code_verifier: p1.verifier, client_id: CID, redirect_uri: CHATGPT_CB });
  check(r.status === 400 && (await r.json()).error === 'invalid_grant', 'a code is spent by a failed attempt too (no guessing the verifier)');

  const p2 = pkce();
  const flow2 = await approveAs(authorizeUrl({ clientId: CID, challenge: p2.challenge }), 'olivia');
  const code2 = qp(flow2.callback, 'code');
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'authorization_code', code: code2, code_verifier: p2.verifier, client_id: 'csc_' + 'y'.repeat(24), redirect_uri: CHATGPT_CB });
  check(r.status === 400 && (await r.json()).error === 'invalid_grant', 'a code redeemed by another client_id: invalid_grant');
  const p3 = pkce();
  const flow3 = await approveAs(authorizeUrl({ clientId: CID, challenge: p3.challenge }), 'olivia');
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'authorization_code', code: qp(flow3.callback, 'code'), code_verifier: p3.verifier, client_id: CID, redirect_uri: CHATGPT_CB, resource: MCP });
  const tok = await r.json();
  check(r.status === 200 && /^cso_[0-9a-f]{64}\.[A-Za-z0-9_-]{43}$/.test(tok.access_token) && /^csr_/.test(tok.refresh_token) &&
    tok.token_type === 'Bearer' && tok.expires_in === 3600 && r.headers.get('cache-control') === 'no-store',
  'code + right verifier: access token (1 h) + refresh token, Cache-Control: no-store', tok);
  const grantId = tok.access_token.slice(4, 68);
  const g = (await db.collection('mcpTokens').doc(grantId).get()).data();
  check(g && g.kind === 'oauth' && g.uid === 'olivia' && g.label === 'ChatGPT' && g.scope === 'design' && g.revoked === false &&
    g.resource === MCP && !JSON.stringify(g).includes(tok.access_token.split('.')[1]),
  'the connection is one mcpTokens doc (kind oauth, label = app name): the game lists it; only hashes are stored', g);

  section('MCP calls with the access token');
  let client = await mcpClient(tok.access_token);
  const tools = (await client.listTools()).tools.map(t => t.name);
  check(tools.includes('get_city') && tools.includes('apply_design') && !tools.some(t => /attack|buy|upgrade|collect/.test(t)), 'tools/list: the 14 design-only tools', tools);
  let res = await client.callTool({ name: 'get_city', arguments: { ids: false } });
  check(!res.isError && /Town Hall 1/.test(res.content[0].text), 'get_city works on the approving player\'s city', res.content[0].text.slice(0, 120));
  res = await client.callTool({ name: 'add_roads', arguments: { tiles: [[3, 7], [3, 8]] } });
  const c1 = await cityOf('olivia');
  check(!res.isError && c1.rev === 2 && c1.updatedBy === 'mcp' && c1.writerId === 'mcp:' + grantId.slice(0, 8) && c1.layout.roads.includes('3,7'),
    'an edit lands in olivia\'s city (rev 2, updatedBy mcp, writer = this connection)', { rev: c1.rev, by: c1.updatedBy, w: c1.writerId, err: res.isError && res.content[0].text });
  check((await cityOf('oscar')).rev === 1, 'oscar\'s city is untouched');
  await client.close();

  section('refresh (rotation)');
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'refresh_token', refresh_token: tok.refresh_token, client_id: CID, resource: MCP });
  const tok2 = await r.json();
  check(r.status === 200 && tok2.access_token !== tok.access_token && tok2.refresh_token !== tok.refresh_token && tok2.access_token.slice(4, 68) === grantId,
    'refresh: a new access + refresh token for the same connection', tok2);
  r = await rawMcp(tok.access_token);
  check(r.status === 401 && /error="invalid_token"/.test(r.headers.get('www-authenticate') || ''),
    'the replaced access token gets 401 invalid_token (the client refreshes, it does not show tool errors)', { status: r.status, www: r.headers.get('www-authenticate') });
  r = await rawMcp(tok2.access_token);
  check(r.status === 200, 'the new access token works');
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'refresh_token', refresh_token: tok.refresh_token, client_id: CID });
  const tok3 = await r.json();
  check(r.status === 200 && tok3.access_token, 'the previous refresh token still works for 2 minutes (a lost refresh answer can be retried)', tok3);
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'refresh_token', refresh_token: tok.refresh_token, client_id: 'csc_' + 'z'.repeat(24) });
  check(r.status === 400 && (await r.json()).error === 'invalid_grant', 'refresh with another client_id: invalid_grant');
  // Two rotations later the first refresh token is neither current nor previous.
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'refresh_token', refresh_token: tok3.refresh_token, client_id: CID });
  const tok4 = await r.json();
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'refresh_token', refresh_token: tok.refresh_token, client_id: CID });
  check(r.status === 400 && (await r.json()).error === 'invalid_grant', 'an old refresh token (two rotations back) is refused');
  r = await rawMcp(tok4.access_token);
  check(r.status === 200, 'the latest access token works');

  section('expiry, revoke, resource binding');
  await db.collection('mcpTokens').doc(grantId).update({ accessExpiresAt: Timestamp.fromMillis(Date.now() - 1000) });
  r = await rawMcp(tok4.access_token);
  check(r.status === 401 && /expired/i.test((await r.json()).error.message), 'an expired access token: 401 invalid_token ("expired")');
  await db.collection('mcpTokens').doc(grantId).update({ accessExpiresAt: Timestamp.fromMillis(Date.now() + 3600e3), revoked: true });
  r = await rawMcp(tok4.access_token);
  check(r.status === 401 && /revoked in City Siege/.test((await r.json()).error.message), 'revoked in the game (the token list\'s Revoke): 401, "revoked in City Siege"');
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'refresh_token', refresh_token: tok4.refresh_token, client_id: CID });
  check(r.status === 400 && /revoked/.test((await r.json()).error_description), 'a revoked connection cannot be refreshed');
  // RFC 7009 revocation endpoint on a fresh connection.
  const p5 = pkce();
  const f5 = await approveAs(authorizeUrl({ clientId: CID, challenge: p5.challenge }), 'oscar');
  const t5 = await (await postForm(PUBLIC + '/oauth/token', { grant_type: 'authorization_code', code: qp(f5.callback, 'code'), code_verifier: p5.verifier, client_id: CID })).json();
  r = await rawMcp(t5.access_token);
  check(r.status === 200, 'oscar\'s own connection works');
  r = await postForm(PUBLIC + '/oauth/revoke', { token: t5.refresh_token, client_id: CID });
  check(r.status === 200, 'POST /oauth/revoke answers 200');
  r = await rawMcp(t5.access_token);
  check(r.status === 401, 'after /oauth/revoke the connection is dead');
  // A connection issued for another resource (another deployment) is refused here.
  const p6 = pkce();
  const f6 = await approveAs(authorizeUrl({ clientId: CID, challenge: p6.challenge }), 'olivia');
  const t6 = await (await postForm(PUBLIC + '/oauth/token', { grant_type: 'authorization_code', code: qp(f6.callback, 'code'), code_verifier: p6.verifier, client_id: CID })).json();
  await db.collection('mcpTokens').doc(t6.access_token.slice(4, 68)).update({ resource: 'https://other-deploy.example/mcp' });
  r = await rawMcp(t6.access_token);
  check(r.status === 401 && /issued for https:\/\/other-deploy/.test((await r.json()).error.message), 'a token bound to another resource: 401');
  r = await rawMcp('cso_' + 'a'.repeat(64) + '.' + 'b'.repeat(43));
  check(r.status === 401, 'a made-up OAuth-shaped token: 401');
  r = await rawMcp('garbage-token');
  check(r.status === 401 && /error="invalid_token"/.test(r.headers.get('www-authenticate') || ''), 'any other unknown token: 401 invalid_token');

  section('Client ID Metadata Document (how ChatGPT identifies itself)');
  const p7 = pkce();
  const f7 = await approveAs(authorizeUrl({ clientId: META_URL, challenge: p7.challenge, redirectUri: META_CB }), 'olivia');
  check(f7.status === 302 && f7.callback.startsWith(META_CB) && f7.request.clientName === 'Metadata Client', 'a metadata-document client_id: fetched, its name shown, redirect accepted', f7);
  r = await postForm(PUBLIC + '/oauth/token', { grant_type: 'authorization_code', code: qp(f7.callback, 'code'), code_verifier: p7.verifier, client_id: META_URL });
  check(r.status === 200 && (await r.json()).access_token, 'token exchange with the URL client_id');
  r = await get(authorizeUrl({ clientId: `http://127.0.0.1:${META_PORT}/wrong.json`, challenge: pkce().challenge, redirectUri: META_CB }));
  check(r.status === 400, 'a metadata document whose client_id is not its own URL: refused');

  section('pasted game tokens keep working');
  const raw = 'csk_' + b64url(randomBytes(32));
  await db.collection('mcpTokens').doc(createHash('sha256').update(raw).digest('hex')).set({ uid: 'oscar', label: 'Claude Code', scope: 'design', revoked: false, createdAt: Timestamp.now() });
  client = await mcpClient(raw);
  res = await client.callTool({ name: 'get_city', arguments: { ids: false } });
  check(!res.isError, 'a csk_ token from the game still works over HTTP with OAuth on');
  await client.close();
  const badPasted = 'csk_' + b64url(randomBytes(32));
  client = await mcpClient(badPasted);
  res = await client.callTool({ name: 'get_city', arguments: {} });
  check(res.isError && /Unknown access token/.test(res.content[0].text), 'an unknown csk_ token still gets the readable in-chat "Access denied" answer');
  await client.close();

  section('the official MCP SDK client does the whole OAuth dance itself');
  for (const mode of tlsServer ? ['dcr', 'cimd'] : ['dcr']) {
    const store = { tokens: undefined, info: undefined, verifier: undefined, authUrl: undefined };
    const provider = {
      get redirectUrl() { return META_CB; },
      clientMetadataUrl: mode === 'cimd' ? TLS_META_URL : undefined,
      get clientMetadata() { return { client_name: 'SDK Client', redirect_uris: [META_CB], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none' }; },
      clientInformation: () => store.info,
      saveClientInformation: (i) => { store.info = i; },
      tokens: () => store.tokens,
      saveTokens: (t) => { store.tokens = t; },
      redirectToAuthorization: (u) => { store.authUrl = u.toString(); },
      saveCodeVerifier: (v) => { store.verifier = v; },
      codeVerifier: () => store.verifier
    };
    let transport = new StreamableHTTPClientTransport(new URL(MCP), { authProvider: provider });
    let c = new Client({ name: 'sdk-oauth', version: '1.0.0' });
    let unauthorized = false;
    try {
      await c.connect(transport);
    } catch (e) {
      unauthorized = e instanceof UnauthorizedError || /Unauthorized/i.test(String(e && e.message));
    }
    check(unauthorized && store.authUrl && store.authUrl.startsWith(PUBLIC + '/oauth/authorize') && qp(store.authUrl, 'resource') === MCP &&
      qp(store.authUrl, 'code_challenge_method') === 'S256',
    `SDK (${mode}): 401 -> discovery -> ${mode === 'dcr' ? 'registration' : 'metadata document'} -> a PKCE authorize URL with resource`, store.authUrl);
    if (mode === 'dcr') check(store.info && /^csc_/.test(store.info.client_id), 'SDK (dcr): registered itself', store.info);
    else check(store.info && store.info.client_id === TLS_META_URL, 'SDK (cimd): used its metadata URL as client_id, no registration', store.info);
    const flow = await approveAs(store.authUrl, 'olivia');
    const code = qp(flow.callback, 'code');
    check(!!code && qp(flow.callback, 'iss') === PUBLIC, `SDK (${mode}): the player approves, the callback carries code + iss`, flow.callback);
    await transport.finishAuth(code);
    check(store.tokens && /^cso_/.test(store.tokens.access_token), `SDK (${mode}): finishAuth swapped the code for tokens`, store.tokens);
    transport = new StreamableHTTPClientTransport(new URL(MCP), { authProvider: provider });
    c = new Client({ name: 'sdk-oauth', version: '1.0.0' });
    await c.connect(transport);
    const t = await c.listTools();
    check(t.tools.length === 14, `SDK (${mode}): connected with its token, 14 tools`, t.tools.length);
    await c.close();
  }
} catch (e) {
  check(false, 'suite crashed: ' + (e.stack || e));
} finally {
  proc.kill('SIGTERM');
  metaServer.close();
  if (tlsServer) tlsServer.close();
}

await fetch(`http://${EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
console.log(`\n${passes} passed, ${fails} failed`);
if (fails) {
  console.log('\nFailures:\n' + failures.map(f => '  - ' + f).join('\n'));
  console.log('\nServer log (tail):\n' + serverLog.join('').split('\n').slice(-20).join('\n'));
  process.exit(1);
}
process.exit(0);
