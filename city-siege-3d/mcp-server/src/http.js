import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createCityServer } from './tools.js';
import { AuthError, TOKEN_PREFIX } from './auth.js';

/**
 * Streamable HTTP transport, stateless (spec section 10): every POST /mcp gets a fresh MCP
 * server bound to that request's bearer token, so one hosted instance serves every player and
 * no session state has to survive between requests. GET /healthz is for load balancers.
 *
 * A request with no "Authorization: Bearer ..." header is refused at the HTTP level (401): there
 * is nobody to act for. A header with a bad or revoked token is let through, and every tool call
 * then answers with the readable "Access denied" result - an MCP client shows that to the model
 * (and so to the player), where a bare 401 would only surface as "failed to connect".
 *
 * With OAuth on (PUBLIC_URL set, oauth.js) the server is also an OAuth 2.1 authorization server
 * for clients such as ChatGPT: a request with no token gets 401 + a WWW-Authenticate challenge
 * naming the protected-resource metadata, and an OAuth access token that is expired, rotated or
 * revoked gets 401 error="invalid_token", so the client refreshes or signs in again instead of
 * showing tool errors. Pasted game tokens (csk_...) keep the readable "Access denied" answers.
 *
 * The caller's address is the `source` the auth layer throttles unrecognised tokens by (auth.js).
 * Behind a reverse proxy / load balancer every request comes from the proxy, so set TRUST_PROXY=1:
 * the address is then the last X-Forwarded-For entry (the one the proxy itself appended). Without
 * it every caller shares the proxy's address, so the first request carrying X-Forwarded-For logs
 * a warning once.
 */

const MAX_BODY = 1024 * 1024;
// A body over MAX_BODY is still read (and dropped) so the client gets the 413 answer instead of a
// connection reset; past this much the socket is cut after all.
const MAX_DRAIN = 16 * MAX_BODY;

function sendJson(res, status, body, headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

const rpcError = (code, message) => ({ jsonrpc: '2.0', error: { code, message }, id: null });

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_DRAIN) {
        req.destroy();
        return;
      }
      if (size > MAX_BODY) tooBig = true;
      if (tooBig) {
        chunks.length = 0;
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (tooBig) {
        reject(Object.assign(new Error('Request body over 1 MB. Split a big apply_design into several calls (at most 2000 road ' +
          'tiles + path waypoints in one).'), { status: 413 }));
      } else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
    req.on('close', () => reject(Object.assign(new Error('request aborted'), { status: 400 })));
  });
}

/** Who is calling: the socket's address, or behind a trusted proxy the last X-Forwarded-For hop. */
export function clientAddress(req, trustProxy = false) {
  if (trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    const hops = typeof xff === 'string' ? xff.split(',').map(x => x.trim()).filter(Boolean) : [];
    if (hops.length) return hops[hops.length - 1];
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

/** The bearer token of a request, or null. */
export function bearerOf(req) {
  const h = req.headers.authorization;
  const m = typeof h === 'string' ? /^Bearer\s+(\S+)\s*$/i.exec(h) : null;
  return m ? m[1] : null;
}

// A pasted game token (it keeps the readable in-chat "Access denied" answers).
const PASTED_TOKEN_RE = new RegExp('^' + TOKEN_PREFIX + '[A-Za-z0-9_-]{43}$');

export function startHttpServer({ port, host, deps, info = {}, log = () => {}, trustProxy = false, oauth = null }) {
  let warnedProxy = false;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    try {
      if (url.pathname === '/healthz') {
        sendJson(res, 200, { ok: true, name: 'city-siege-mcp', version: deps.version, oauth: !!oauth, ...info });
        return;
      }
      if (oauth && await oauth.handle(req, res, url)) return;
      if (url.pathname !== '/mcp') {
        sendJson(res, 404, { error: 'Not found. The MCP endpoint is POST /mcp.' });
        return;
      }
      if (req.method !== 'POST') {
        // Stateless server: no standalone SSE stream (GET) and no sessions to end (DELETE).
        sendJson(res, 405, rpcError(-32000, 'Method not allowed: this stateless MCP server only takes POST /mcp.'), { Allow: 'POST' });
        return;
      }
      const token = bearerOf(req);
      if (!token) {
        sendJson(res, 401, rpcError(-32001, 'Missing "Authorization: Bearer <token>" header. ' + (oauth
          ? 'Connect with OAuth (your MCP client signs you in to City Siege), or generate'
          : 'Generate') + ' a City Siege access token in the game (ACCOUNT -> AI Designer (MCP)) and add it as a header in ' +
          'your MCP client config.'), oauth ? { 'WWW-Authenticate': oauth.challenge() } : {});
        return;
      }
      if (oauth && !PASTED_TOKEN_RE.test(token)) {
        // An OAuth token is checked here, at the HTTP level: a 401 is what makes the client refresh it.
        try {
          await deps.auth.authenticate(token, { source: clientAddress(req, trustProxy) });
        } catch (e) {
          if (!(e instanceof AuthError)) throw e;
          if (e.code === 'AUTH_THROTTLED') {
            sendJson(res, 429, rpcError(-32001, e.message), { 'Retry-After': String(e.retryAfterSec || 60) });
          } else {
            sendJson(res, 401, rpcError(-32001, e.message),
              { 'WWW-Authenticate': oauth.challenge({ error: 'invalid_token', description: e.message }) });
          }
          return;
        }
      }
      let body;
      try {
        const raw = await readBody(req);
        body = raw ? JSON.parse(raw) : undefined;
      } catch (e) {
        // Connection: close - the rest of an oversized body is not worth another read.
        sendJson(res, e.status || 400, rpcError(-32700, e.status ? e.message : 'Parse error: the body is not valid JSON.'),
          e.status === 413 ? { Connection: 'close' } : {});
        return;
      }
      if (!trustProxy && !warnedProxy && req.headers['x-forwarded-for']) {
        warnedProxy = true;
        log('requests carry X-Forwarded-For but TRUST_PROXY is not set: every caller counts as the proxy\'s address for ' +
          'unknown-token throttling (20 lookups a minute shared by all). Set TRUST_PROXY=1 behind a reverse proxy or Cloud Run.');
      }
      const mcp = createCityServer({ ...deps, token, source: clientAddress(req, trustProxy) });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on('close', () => {
        transport.close().catch(() => {});
        mcp.close().catch(() => {});
      });
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (e) {
      log('HTTP request failed: ' + (e.stack || e));
      sendJson(res, 500, rpcError(-32603, 'Internal server error.'));
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}
