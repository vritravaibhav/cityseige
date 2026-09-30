#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initFirestore } from './firebase.js';
import { TokenAuth } from './auth.js';
import { RateLimiter } from './rateLimit.js';
import { CityStore } from './store.js';
import { createCityServer } from './tools.js';
import { startHttpServer } from './http.js';

/**
 * City Siege MCP server - lets an AI assistant DESIGN a player's city (and nothing else).
 *
 *   node src/index.js            stdio (default): one player, token from CITY_SIEGE_TOKEN
 *   node src/index.js --http     Streamable HTTP on PORT (default 8787), path /mcp, token per
 *                                request from "Authorization: Bearer <token>"; GET /healthz
 *
 * Environment: CITY_SIEGE_TOKEN, FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS |
 * FIREBASE_SERVICE_ACCOUNT_JSON, FIRESTORE_EMULATOR_HOST, PORT, HOST, TRUST_PROXY. See ../README.md.
 *
 * stdout belongs to the MCP protocol in stdio mode, so every log line goes to stderr.
 */

const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const log = (msg) => process.stderr.write(`[city-siege-mcp] ${msg}\n`);

const HELP = `City Siege MCP server ${PKG.version} - design-only access to your City Siege city.

Usage:
  city-siege-mcp                 stdio transport (for Claude Code / Claude Desktop "command" configs)
  city-siege-mcp --http          Streamable HTTP transport on http://HOST:PORT/mcp
  city-siege-mcp --help

Options:
  --http            serve HTTP instead of stdio
  --port <n>        HTTP port (default: $PORT or 8787)
  --host <addr>     HTTP bind address (default: $HOST or 127.0.0.1; use 0.0.0.0 in a container)

Environment:
  CITY_SIEGE_TOKEN                 stdio: your access token (game: ACCOUNT -> AI Designer (MCP))
  FIREBASE_PROJECT_ID              Firebase project (default: the key's project, else demo-city-siege)
  GOOGLE_APPLICATION_CREDENTIALS   path to a service-account key file, or
  FIREBASE_SERVICE_ACCOUNT_JSON    the service-account key JSON itself
  FIRESTORE_EMULATOR_HOST          dev: use the Firestore emulator (e.g. 127.0.0.1:8085)
  PORT, HOST                       HTTP listen address
  TRUST_PROXY=1                    HTTP behind a reverse proxy: caller address from X-Forwarded-For
`;

function parseArgs(argv) {
  const out = { http: false, port: null, host: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--http') out.http = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--port') out.port = Number(argv[++i]);
    else if (a.startsWith('--port=')) out.port = Number(a.slice(7));
    else if (a === '--host') out.host = argv[++i];
    else if (a.startsWith('--host=')) out.host = a.slice(7);
    else throw new Error(`Unknown argument "${a}". Try --help.`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  const { db, projectId, mode } = initFirestore(process.env);
  // Token checks are cached 30 s (spec); tests shorten it to watch a revoke bite.
  const envCache = (process.env.MCP_AUTH_CACHE_MS || '').trim();
  const cacheMs = envCache && Number(envCache) >= 0 ? Number(envCache) : 30000;
  const auth = new TokenAuth(db, { cacheMs, log });
  const deps = { auth, store: new CityStore(db), limiter: new RateLimiter(), version: PKG.version, log };

  let closing = false;
  const shutdown = async (code = 0) => {
    if (closing) return;
    closing = true;
    // Usage counts accumulate between the once-a-minute writes; do not lose them on exit.
    await Promise.race([auth.flushAll(), new Promise(r => setTimeout(r, 2000))]);
    process.exit(code);
  };
  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  if (args.http) {
    const port = Number.isFinite(args.port) && args.port > 0 ? args.port : Number(process.env.PORT) || 8787;
    const host = args.host || process.env.HOST || '127.0.0.1';
    // Behind a reverse proxy the socket address is the proxy's: TRUST_PROXY=1 reads X-Forwarded-For.
    const trustProxy = /^(1|true|yes)$/i.test(String(process.env.TRUST_PROXY || '').trim());
    await startHttpServer({ port, host, deps, info: { transport: 'http', project: projectId }, log, trustProxy });
    log(`HTTP transport on http://${host}:${port}/mcp (health: /healthz) - project ${projectId}, ${mode}`);
    return;
  }

  if (!process.env.CITY_SIEGE_TOKEN) {
    log('CITY_SIEGE_TOKEN is not set: every tool will answer "Access denied" until it is. ' +
      'Generate a token in the game (ACCOUNT -> AI Designer (MCP)).');
  }
  const server = createCityServer({ ...deps, token: process.env.CITY_SIEGE_TOKEN || '' });
  const transport = new StdioServerTransport();
  // The client closing stdin is the end of the session (Firestore's sockets would keep us alive).
  process.stdin.on('end', () => shutdown(0));
  process.stdin.on('close', () => shutdown(0));
  transport.onclose = () => shutdown(0);
  await server.connect(transport);
  log(`stdio transport ready - project ${projectId}, ${mode}`);
}

main().catch((e) => {
  log('fatal: ' + (e && e.message ? e.message : e));
  process.exit(1);
});
