import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns';
import net from 'node:net';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * OAuth 2.1 for the hosted MCP server, so an MCP client that cannot take a pasted token -
 * ChatGPT above all - can connect with "Sign in with City Siege" instead.
 *
 * The flow (every step the MCP authorization spec and OpenAI's connector docs ask for):
 *   1. The client calls POST /mcp with no token and gets 401 +
 *      WWW-Authenticate: Bearer resource_metadata="<PUBLIC_URL>/.well-known/oauth-protected-resource".
 *   2. It reads that (RFC 9728) and this server's authorization-server metadata (RFC 8414).
 *   3. It identifies itself: a Client ID Metadata Document (client_id is an https URL, e.g.
 *      https://chatgpt.com/oauth/client.json - fetched here with an SSRF guard) or Dynamic Client
 *      Registration (RFC 7591, POST /oauth/register).
 *   4. The browser goes to GET /oauth/authorize (PKCE S256 required). The request is checked and
 *      parked in oauthRequests/{id}, and the browser is sent on to THE GAME: <GAME_URL>?oauth_request=<id>.
 *   5. The game shows its CONNECT screen: the player signs in there (their normal City Siege
 *      account) and presses ALLOW, which writes oauthApprovals/{id} = { uid } through the security
 *      rules - so who approved is proven by Firebase Auth, and no credential ever passes through a
 *      URL or this server. The game then navigates to the request's finishUrl.
 *   6. GET /oauth/finish reads the approval, spends the request and redirects back to the client
 *      with a one-time code, its state and iss (RFC 9207 - lets ChatGPT use its stable redirect URI).
 *   7. POST /oauth/token swaps code + code_verifier for an access token (1 h) and a refresh token
 *      (60 days, rotated on every use).
 *
 * A connection (grant) is ONE doc in mcpTokens/{grantId}, kind 'oauth' - the same collection as
 * the pasted tokens, so it shows in the game's token list with its app's name and the player can
 * revoke it there. The doc keeps only SHA-256 hashes of the current access and refresh secrets;
 * tokens are 'cso_<grantId>.<secret>' (access) and 'csr_<grantId>.<secret>' (refresh), so the
 * token auth (auth.js) finds the grant by id and compares the hash in constant time.
 *
 * Access tokens are bound to this server: the grant records the resource (<PUBLIC_URL>/mcp) the
 * client asked for, and a token is only good here. Everything the server keeps lives in Firestore
 * (oauthClients, oauthRequests, oauthCodes, mcpTokens), so any number of instances can serve.
 */

export const OAUTH_SCOPE = 'city.design';
export const ACCESS_PREFIX = 'cso_';
export const REFRESH_PREFIX = 'csr_';
export const ACCESS_TTL_S = 3600;
export const REFRESH_TTL_S = 60 * 86400;
const REQUEST_TTL_S = 600;
const CODE_TTL_S = 300;
// A refresh whose answer got lost may be retried with the old refresh token for this long.
const REFRESH_GRACE_S = 120;
const CIMD_CACHE_MS = 3600e3;
const CIMD_MAX_BYTES = 32 * 1024;
const MAX_REDIRECT_URIS = 10;
export const GRANT_TOKEN_RE = /^(cso|csr)_([0-9a-f]{64})\.([A-Za-z0-9_-]{43})$/;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sha256hex = (s) => createHash('sha256').update(String(s), 'utf8').digest('hex');
const pkceS256 = (verifier) => createHash('sha256').update(String(verifier), 'ascii').digest('base64url');
const clip = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

/** Constant-time compare of two hex hashes. */
export function sameHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/** Parse 'cso_<grant>.<secret>' / 'csr_<grant>.<secret>': { kind, grantId, secretHash } or null. */
export function parseGrantToken(token) {
  const m = GRANT_TOKEN_RE.exec(String(token || ''));
  if (!m) return null;
  return { kind: m[1] === 'cso' ? 'access' : 'refresh', grantId: m[2], secretHash: sha256hex(m[3]) };
}

/** Private, loopback, link-local, CGNAT, multicast... - anything a metadata fetch must not reach. */
export function isPublicAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (mapped) return isPublicAddress(mapped[1]);
    if (s === '::' || s === '::1') return false;
    if (/^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s)) return false;
    return true;
  }
  return false;
}

class OAuthError extends Error {
  constructor(error, description, status = 400) {
    super(description);
    this.error = error;
    this.status = status;
  }
}

function sendJson(res, status, body, headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** A small self-contained page for the cases where there is nowhere safe to redirect to. */
function sendPage(res, status, title, message, link = null) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(title)} - City Siege</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f19;color:#e8f1f8;
font-family:'Segoe UI',system-ui,-apple-system,sans-serif;padding:16px}main{max-width:480px;background:rgba(18,24,38,.92);
border:1px solid rgba(0,229,255,.3);border-radius:14px;padding:28px}h1{font-size:20px;margin:0 0 10px}p{color:#b0bec5;line-height:1.5}
a{color:#00e5ff}</style></head><body><main><h1>${escHtml(title)}</h1><p>${escHtml(message)}</p>
${link ? `<p><a href="${escHtml(link.href)}">${escHtml(link.text)}</a></p>` : ''}</main></body></html>`);
}

/** Read a small request body (forms and JSON only; OAuth bodies are tiny). */
function readSmallBody(req, max = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(new OAuthError('invalid_request', 'Request body too large.', 413)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readParams(req) {
  const raw = await readSmallBody(req);
  const type = String(req.headers['content-type'] || '').toLowerCase();
  if (type.includes('application/json')) {
    try {
      const j = raw ? JSON.parse(raw) : {};
      return j && typeof j === 'object' && !Array.isArray(j) ? j : {};
    } catch {
      throw new OAuthError('invalid_request', 'The body is not valid JSON.');
    }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

/** client_secret_basic credentials, if the client sent any (public clients do not). */
function basicClientId(req) {
  const h = req.headers.authorization;
  const m = typeof h === 'string' ? /^Basic\s+(\S+)$/i.exec(h) : null;
  if (!m) return null;
  try {
    const [id] = Buffer.from(m[1], 'base64').toString('utf8').split(':');
    return decodeURIComponent(id || '');
  } catch {
    return null;
  }
}

function isLoopbackHost(host) {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1';
}

export class OAuthServer {
  /**
   * @param {object} opts
   * @param {FirebaseFirestore.Firestore} opts.db
   * @param {string} opts.publicUrl   the server's public origin, e.g. https://mcp.example.com (issuer)
   * @param {string} opts.gameUrl     where the game runs; its CONNECT screen approves requests
   * @param {string[]} [opts.redirectHosts] optional allowlist of redirect URI hosts
   * @param {boolean} [opts.allowPrivateMetadata] tests only: let CIMD fetch http / private addresses
   */
  constructor({ db, publicUrl, gameUrl, redirectHosts = null, allowPrivateMetadata = false, now = () => Date.now(), log = () => {} }) {
    this.db = db;
    this.issuer = String(publicUrl).replace(/\/+$/, '');
    this.resource = this.issuer + '/mcp';
    this.gameUrl = String(gameUrl);
    this.redirectHosts = redirectHosts && redirectHosts.length ? redirectHosts.map(h => h.toLowerCase()) : null;
    this.allowPrivateMetadata = allowPrivateMetadata;
    this.now = now;
    this.log = log;
    this.cimdCache = new Map();   // url -> { at, client }
  }

  // ------------------------------------------------------------------------------ metadata

  get resourceMetadataUrl() {
    return this.issuer + '/.well-known/oauth-protected-resource';
  }

  protectedResourceMetadata() {
    return {
      resource: this.resource,
      authorization_servers: [this.issuer],
      scopes_supported: [OAUTH_SCOPE],
      bearer_methods_supported: ['header'],
      resource_name: 'City Siege AI designer'
    };
  }

  authorizationServerMetadata() {
    return {
      issuer: this.issuer,
      authorization_endpoint: this.issuer + '/oauth/authorize',
      token_endpoint: this.issuer + '/oauth/token',
      registration_endpoint: this.issuer + '/oauth/register',
      revocation_endpoint: this.issuer + '/oauth/revoke',
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'],
      scopes_supported: [OAUTH_SCOPE, 'offline_access'],
      authorization_response_iss_parameter_supported: true,
      client_id_metadata_document_supported: true
    };
  }

  /** The WWW-Authenticate value of a 401 from /mcp. */
  challenge({ error = null, description = null } = {}) {
    const parts = [`resource_metadata="${this.resourceMetadataUrl}"`, `scope="${OAUTH_SCOPE}"`];
    if (error) parts.push(`error="${error}"`);
    if (description) parts.push(`error_description="${String(description).replace(/["\\\r\n]/g, ' ').slice(0, 300)}"`);
    return 'Bearer ' + parts.join(', ');
  }

  // ------------------------------------------------------------------------------ routing

  /** Handle an OAuth route. Resolves true when the request was one of ours. */
  async handle(req, res, url) {
    const p = url.pathname;
    const cors = { 'Access-Control-Allow-Origin': '*' };
    const isOurs = p.startsWith('/.well-known/oauth-') || p.startsWith('/oauth/');
    if (!isOurs) return false;
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version', 'Access-Control-Max-Age': '86400' });
      res.end();
      return true;
    }
    try {
      if (p === '/.well-known/oauth-protected-resource' || p === '/.well-known/oauth-protected-resource/mcp') {
        sendJson(res, 200, this.protectedResourceMetadata(), { ...cors, 'Cache-Control': 'public, max-age=300' });
      } else if (p === '/.well-known/oauth-authorization-server') {
        sendJson(res, 200, this.authorizationServerMetadata(), { ...cors, 'Cache-Control': 'public, max-age=300' });
      } else if (p === '/oauth/register' && req.method === 'POST') {
        await this.register(req, res, cors);
      } else if (p === '/oauth/authorize' && req.method === 'GET') {
        await this.authorize(res, url);
      } else if (p === '/oauth/finish' && req.method === 'GET') {
        await this.finish(res, url);
      } else if (p === '/oauth/token' && req.method === 'POST') {
        await this.token(req, res, cors);
      } else if (p === '/oauth/revoke' && req.method === 'POST') {
        await this.revoke(req, res, cors);
      } else {
        sendJson(res, 404, { error: 'not_found' }, cors);
      }
    } catch (e) {
      if (e instanceof OAuthError) {
        sendJson(res, e.status, { error: e.error, error_description: e.message }, cors);
      } else {
        this.log('OAuth request failed: ' + (e.stack || e));
        sendJson(res, 500, { error: 'server_error', error_description: 'Internal error.' }, cors);
      }
    }
    return true;
  }

  // ------------------------------------------------------------------------------ clients

  _checkRedirectUri(uri) {
    let u;
    try {
      u = new URL(uri);
    } catch {
      return 'is not an absolute URL';
    }
    if (u.hash) return 'must not have a fragment';
    if (u.username || u.password) return 'must not carry credentials';
    if (u.protocol === 'http:' && !isLoopbackHost(u.hostname)) return 'must be https (http only for localhost)';
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'must be https';
    if (this.redirectHosts && !this.redirectHosts.includes(u.hostname.toLowerCase())) {
      return `is not on this server's redirect allowlist (${this.redirectHosts.join(', ')})`;
    }
    return null;
  }

  /** RFC 7591 Dynamic Client Registration. Every client is public: PKCE instead of a secret. */
  async register(req, res, cors) {
    const body = await readParams(req);
    const uris = body.redirect_uris;
    if (!Array.isArray(uris) || !uris.length || uris.length > MAX_REDIRECT_URIS || !uris.every(u => typeof u === 'string' && u.length <= 2000)) {
      throw new OAuthError('invalid_redirect_uri', `redirect_uris must be a list of 1-${MAX_REDIRECT_URIS} URLs.`);
    }
    for (const u of uris) {
      const why = this._checkRedirectUri(u);
      if (why) throw new OAuthError('invalid_redirect_uri', `redirect_uri ${u} ${why}.`);
    }
    const grantTypes = Array.isArray(body.grant_types) ? body.grant_types : ['authorization_code', 'refresh_token'];
    if (!grantTypes.includes('authorization_code')) {
      throw new OAuthError('invalid_client_metadata', 'grant_types must include authorization_code.');
    }
    const clientId = 'csc_' + b64url(randomBytes(18));
    const name = clip(body.client_name, 60) || 'AI assistant';
    const issuedAt = Math.floor(this.now() / 1000);
    await this.db.collection('oauthClients').doc(clientId).set({
      clientName: name,
      redirectUris: uris,
      clientUri: typeof body.client_uri === 'string' ? clip(body.client_uri, 300) : null,
      createdAt: FieldValue.serverTimestamp()
    });
    sendJson(res, 201, {
      client_id: clientId,
      client_id_issued_at: issuedAt,
      client_name: name,
      redirect_uris: uris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    }, cors);
  }

  /** { clientId, name, redirectUris, kind } for a registered id or a metadata-document URL; null if unknown. */
  async getClient(clientId) {
    if (typeof clientId !== 'string' || !clientId || clientId.length > 2000) return null;
    if (/^https?:\/\//i.test(clientId)) return this._metadataClient(clientId);
    if (!/^csc_[A-Za-z0-9_-]{24}$/.test(clientId)) return null;
    const snap = await this.db.collection('oauthClients').doc(clientId).get();
    if (!snap.exists) return null;
    const d = snap.data();
    return { clientId, name: d.clientName || 'AI assistant', redirectUris: Array.isArray(d.redirectUris) ? d.redirectUris : [], kind: 'dcr' };
  }

  /** A Client ID Metadata Document: fetched over https from a public address, cached for an hour. */
  async _metadataClient(url) {
    const hit = this.cimdCache.get(url);
    if (hit && this.now() - hit.at < CIMD_CACHE_MS) return hit.client;
    let u;
    try {
      u = new URL(url);
    } catch {
      return null;
    }
    if (u.protocol !== 'https:' && !(this.allowPrivateMetadata && u.protocol === 'http:')) return null;
    if (u.username || u.password || u.hash) return null;
    let doc;
    try {
      doc = JSON.parse(await this._fetchSmall(u));
    } catch (e) {
      this.log(`client metadata ${url} could not be read: ${e.message}`);
      return null;
    }
    if (!doc || doc.client_id !== url || !Array.isArray(doc.redirect_uris) || !doc.redirect_uris.length ||
      !doc.redirect_uris.every(r => typeof r === 'string' && !this._checkRedirectUri(r))) {
      this.log(`client metadata ${url} is not a valid client document`);
      return null;
    }
    const client = { clientId: url, name: clip(doc.client_name, 60) || u.hostname, redirectUris: doc.redirect_uris.slice(0, MAX_REDIRECT_URIS), kind: 'cimd' };
    this.cimdCache.set(url, { at: this.now(), client });
    if (this.cimdCache.size > 500) this.cimdCache.delete(this.cimdCache.keys().next().value);
    return client;
  }

  /**
   * GET a small document. The DNS answer is checked inside the socket's own lookup, so a name
   * cannot resolve to a public address for a check and a private one for the connection.
   */
  _fetchSmall(u) {
    const lib = u.protocol === 'https:' ? https : http;
    const allowPrivate = this.allowPrivateMetadata;
    const lookup = (host, opts, cb) => {
      dns.lookup(host, { ...opts, all: true }, (err, addrs) => {
        if (err) return cb(err);
        const list = Array.isArray(addrs) ? addrs : [{ address: addrs, family: opts.family || 4 }];
        const bad = list.find(a => !isPublicAddress(a.address));
        if (bad && !allowPrivate) return cb(new Error(`${host} resolves to a non-public address`));
        if (opts.all) return cb(null, list);
        return cb(null, list[0].address, list[0].family);
      });
    };
    return new Promise((resolve, reject) => {
      const req = lib.get(u, { lookup, timeout: 5000, headers: { Accept: 'application/json', 'User-Agent': 'city-siege-mcp' } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error('HTTP ' + res.statusCode));
          return;
        }
        let size = 0;
        const chunks = [];
        res.on('data', (c) => {
          size += c.length;
          if (size > CIMD_MAX_BYTES) { req.destroy(new Error('document too large')); return; }
          chunks.push(c);
        });
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      });
      req.on('timeout', () => req.destroy(new Error('timed out')));
      req.on('error', reject);
    });
  }

  // ------------------------------------------------------------------------------ authorize

  _redirectBack(res, redirectUri, params) {
    const u = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
    u.searchParams.set('iss', this.issuer);
    res.writeHead(302, { Location: u.toString(), 'Cache-Control': 'no-store' });
    res.end();
  }

  _resourceOk(resource) {
    if (resource === undefined || resource === null || resource === '') return true;
    return [this.resource, this.issuer, this.issuer + '/', this.resource + '/'].includes(String(resource));
  }

  async authorize(res, url) {
    const q = url.searchParams;
    const clientId = q.get('client_id');
    const client = await this.getClient(clientId);
    if (!client) {
      sendPage(res, 400, 'Unknown app', 'This connection request comes from an app this server does not know (unknown client_id). ' +
        'Start the connection again from your AI app.');
      return;
    }
    let redirectUri = q.get('redirect_uri');
    if (!redirectUri && client.redirectUris.length === 1) redirectUri = client.redirectUris[0];
    if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
      sendPage(res, 400, 'Wrong return address', `The app asked to come back to a web address it has not registered (${redirectUri || 'none'}). ` +
        'Start the connection again from your AI app.');
      return;
    }
    const state = q.get('state') || '';
    const fail = (error, description) => this._redirectBack(res, redirectUri, { error, error_description: description, state });
    if (q.get('response_type') !== 'code') return fail('unsupported_response_type', 'Only response_type=code is supported.');
    const challenge = q.get('code_challenge');
    if (!challenge || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge) || q.get('code_challenge_method') !== 'S256') {
      return fail('invalid_request', 'PKCE is required: code_challenge with code_challenge_method=S256.');
    }
    if (!this._resourceOk(q.get('resource'))) return fail('invalid_target', `This server only issues tokens for ${this.resource}.`);
    if (state.length > 1000) return fail('invalid_request', 'state is too long.');

    const reqId = b64url(randomBytes(24));
    const nowMs = this.now();
    const redirectHost = new URL(redirectUri).host;
    await this.db.collection('oauthRequests').doc(reqId).set({
      clientId: client.clientId,
      clientName: client.name,
      redirectUri,
      redirectHost,
      state,
      codeChallenge: challenge,
      scope: OAUTH_SCOPE,
      resource: this.resource,
      finishUrl: `${this.issuer}/oauth/finish?req=${reqId}`,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(nowMs + REQUEST_TTL_S * 1000)
    });
    const game = new URL(this.gameUrl);
    game.searchParams.set('oauth_request', reqId);
    res.writeHead(302, { Location: game.toString(), 'Cache-Control': 'no-store' });
    res.end();
  }

  /** The game's CONNECT screen sends the browser here after ALLOW (or with deny=1 after DENY). */
  async finish(res, url) {
    const reqId = url.searchParams.get('req') || '';
    if (!/^[A-Za-z0-9_-]{32}$/.test(reqId)) {
      sendPage(res, 400, 'Invalid link', 'This connection link is broken. Start the connection again from your AI app.');
      return;
    }
    const reqRef = this.db.collection('oauthRequests').doc(reqId);
    const apprRef = this.db.collection('oauthApprovals').doc(reqId);
    const outcome = await this.db.runTransaction(async (tx) => {
      const [rs, as] = await Promise.all([tx.get(reqRef), tx.get(apprRef)]);
      if (!rs.exists) return { kind: 'gone' };
      const r = rs.data();
      const expired = !r.expiresAt || r.expiresAt.toMillis() < this.now();
      if (expired || url.searchParams.get('deny') === '1') {
        tx.delete(reqRef);
        if (as.exists) tx.delete(apprRef);
        return { kind: expired ? 'expired' : 'denied', r };
      }
      const a = as.exists ? as.data() : null;
      if (!a || typeof a.uid !== 'string' || !a.uid) return { kind: 'pending' };
      const code = b64url(randomBytes(32));
      tx.set(this.db.collection('oauthCodes').doc(sha256hex(code)), {
        uid: a.uid,
        clientId: r.clientId,
        clientName: r.clientName,
        redirectUri: r.redirectUri,
        redirectHost: r.redirectHost,
        codeChallenge: r.codeChallenge,
        scope: r.scope,
        resource: r.resource,
        expiresAt: Timestamp.fromMillis(this.now() + CODE_TTL_S * 1000)
      });
      tx.delete(reqRef);
      tx.delete(apprRef);
      return { kind: 'code', r, code };
    });
    if (outcome.kind === 'gone') {
      sendPage(res, 410, 'Link already used', 'This connection request was already finished or cancelled. If your AI app is not connected, start again from it.');
    } else if (outcome.kind === 'pending') {
      const back = new URL(this.gameUrl);
      back.searchParams.set('oauth_request', reqId);
      sendPage(res, 409, 'Not approved yet', 'Approve the connection in City Siege first.', { href: back.toString(), text: 'Back to City Siege' });
    } else if (outcome.kind === 'expired') {
      this._redirectBack(res, outcome.r.redirectUri, { error: 'access_denied', error_description: 'The request expired (10 minutes). Try connecting again.', state: outcome.r.state });
    } else if (outcome.kind === 'denied') {
      this._redirectBack(res, outcome.r.redirectUri, { error: 'access_denied', error_description: 'The player declined the connection.', state: outcome.r.state });
    } else {
      this._redirectBack(res, outcome.r.redirectUri, { code: outcome.code, state: outcome.r.state });
    }
  }

  // ------------------------------------------------------------------------------ tokens

  _newSecret() {
    const secret = b64url(randomBytes(32));
    return { secret, hash: sha256hex(secret) };
  }

  _tokenResponse(grantId, access, refresh) {
    return {
      access_token: `${ACCESS_PREFIX}${grantId}.${access.secret}`,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_S,
      refresh_token: `${REFRESH_PREFIX}${grantId}.${refresh.secret}`,
      scope: OAUTH_SCOPE
    };
  }

  async token(req, res, cors) {
    const body = await readParams(req);
    const clientId = body.client_id || basicClientId(req);
    if (!clientId) throw new OAuthError('invalid_client', 'client_id is required.', 401);
    if (!this._resourceOk(body.resource)) throw new OAuthError('invalid_target', `This server only issues tokens for ${this.resource}.`);
    if (body.grant_type === 'authorization_code') {
      sendJson(res, 200, await this._exchangeCode(body, clientId), cors);
    } else if (body.grant_type === 'refresh_token') {
      sendJson(res, 200, await this._refresh(body, clientId), cors);
    } else {
      throw new OAuthError('unsupported_grant_type', 'grant_type must be authorization_code or refresh_token.');
    }
  }

  async _exchangeCode(body, clientId) {
    const code = String(body.code || '');
    const verifier = String(body.code_verifier || '');
    if (!code || !verifier) throw new OAuthError('invalid_request', 'code and code_verifier are required.');
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new OAuthError('invalid_grant', 'code_verifier is malformed.');
    const codeRef = this.db.collection('oauthCodes').doc(sha256hex(code));
    const grantId = randomBytes(32).toString('hex');
    const access = this._newSecret();
    const refresh = this._newSecret();
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(codeRef);
      if (!snap.exists) throw new OAuthError('invalid_grant', 'The authorization code is invalid or was already used.');
      const c = snap.data();
      tx.delete(codeRef);   // one use, even when the checks below fail
      if (!c.expiresAt || c.expiresAt.toMillis() < this.now()) throw new OAuthError('invalid_grant', 'The authorization code expired.');
      if (c.clientId !== clientId) throw new OAuthError('invalid_grant', 'The code was issued to another client.');
      if (body.redirect_uri && body.redirect_uri !== c.redirectUri) throw new OAuthError('invalid_grant', 'redirect_uri does not match.');
      if (!sameHash(pkceS256(verifier), c.codeChallenge)) throw new OAuthError('invalid_grant', 'PKCE verification failed.');
      const nowMs = this.now();
      tx.set(this.db.collection('mcpTokens').doc(grantId), {
        uid: c.uid,
        label: clip(c.clientName, 40) || 'AI assistant',
        scope: 'design',
        kind: 'oauth',
        clientId: c.clientId,
        clientName: c.clientName,
        redirectHost: c.redirectHost,
        resource: c.resource,
        createdAt: FieldValue.serverTimestamp(),
        revoked: false,
        accessHash: access.hash,
        accessExpiresAt: Timestamp.fromMillis(nowMs + ACCESS_TTL_S * 1000),
        refreshHash: refresh.hash,
        refreshExpiresAt: Timestamp.fromMillis(nowMs + REFRESH_TTL_S * 1000),
        prevRefreshHash: null,
        rotatedAt: Timestamp.fromMillis(nowMs)
      });
    }).catch((e) => {
      // A failed check must still spend the code: redo the delete outside the aborted transaction.
      if (e instanceof OAuthError) return codeRef.delete().then(() => { throw e; }, () => { throw e; });
      throw e;
    });
    return this._tokenResponse(grantId, access, refresh);
  }

  async _refresh(body, clientId) {
    const parsed = parseGrantToken(body.refresh_token);
    if (!parsed || parsed.kind !== 'refresh') throw new OAuthError('invalid_grant', 'The refresh token is invalid.');
    const ref = this.db.collection('mcpTokens').doc(parsed.grantId);
    const access = this._newSecret();
    const refresh = this._newSecret();
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const g = snap.exists ? snap.data() : null;
      if (!g || g.kind !== 'oauth') throw new OAuthError('invalid_grant', 'The refresh token is invalid.');
      if (g.revoked === true) throw new OAuthError('invalid_grant', 'This connection was revoked in City Siege. Connect again.');
      if (g.clientId !== clientId) throw new OAuthError('invalid_grant', 'The refresh token was issued to another client.');
      const nowMs = this.now();
      if (!g.refreshExpiresAt || g.refreshExpiresAt.toMillis() < nowMs) throw new OAuthError('invalid_grant', 'The refresh token expired. Connect again.');
      const current = sameHash(parsed.secretHash, g.refreshHash);
      const retried = !current && g.prevRefreshHash && sameHash(parsed.secretHash, g.prevRefreshHash) &&
        g.rotatedAt && nowMs - g.rotatedAt.toMillis() < REFRESH_GRACE_S * 1000;
      if (!current && !retried) throw new OAuthError('invalid_grant', 'The refresh token was already used.');
      tx.update(ref, {
        accessHash: access.hash,
        accessExpiresAt: Timestamp.fromMillis(nowMs + ACCESS_TTL_S * 1000),
        refreshHash: refresh.hash,
        refreshExpiresAt: Timestamp.fromMillis(nowMs + REFRESH_TTL_S * 1000),
        // After a retry the previous token stays the one a lost answer may still be retried with.
        prevRefreshHash: current ? g.refreshHash : g.prevRefreshHash,
        rotatedAt: Timestamp.fromMillis(nowMs)
      });
    });
    return this._tokenResponse(parsed.grantId, access, refresh);
  }

  /** RFC 7009: revoke the whole connection an access or refresh token belongs to. Always 200. */
  async revoke(req, res, cors) {
    const body = await readParams(req);
    const parsed = parseGrantToken(body.token);
    if (parsed) {
      const ref = this.db.collection('mcpTokens').doc(parsed.grantId);
      const snap = await ref.get();
      const g = snap.exists ? snap.data() : null;
      if (g && g.kind === 'oauth' && (sameHash(parsed.secretHash, g.accessHash) || sameHash(parsed.secretHash, g.refreshHash))) {
        await ref.update({ revoked: true });
      }
    }
    sendJson(res, 200, {}, cors);
  }
}
