import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { RateLimiter } from './rateLimit.js';
import { parseGrantToken, sameHash } from './oauth.js';

/**
 * Personal access tokens (spec section 10, "Auth").
 *
 * The game generates a token `csk_<43 base64url chars>` and stores only its SHA-256 as the id of
 * `mcpTokens/{hash}` (src/net/McpTokens.js); the raw token lives only in the player's MCP client
 * config. So the server hashes whatever it is handed and looks that id up: a token is good while
 * its doc exists, is not revoked and has scope 'design'.
 *
 * Lookups are cached (30 s by default) because an AI makes bursts of calls; the price is that a
 * revoke takes up to that long to bite, which the README says. Usage (lastUsedAt, uses) is
 * written at most once a minute per token - the count accumulates in between and is flushed
 * with the next write or when the process exits.
 *
 * Looking up a token nobody has costs a Firestore read, and the per-token rate limit cannot
 * apply before the token is known, so unrecognised tokens are throttled on their own, counted
 * BEFORE the read (so parallel requests cannot slip past) and given back when the token turns out
 * to exist:
 *  - MISS_LIMITS.source lookups a minute per caller (sourceKey: the HTTP client address, an IPv6
 *    address by its /64 since one host or phone gets a whole /64; 'stdio' for a stdio process);
 *  - MISS_LIMITS.global a minute per process: a COST cap far above normal traffic, not a lockout;
 *  - past the global cap a quiet caller (at most QUIET_LOOKUPS lookups this minute, this one
 *    included) still gets its lookup from a separate lane of MISS_LIMITS.quiet a minute. A flood
 *    from many addresses therefore does not refuse a player whose token this process has not seen
 *    yet - which is every player after a restart, a scale-out or a deploy, and any new token.
 * Worst case under attack: (global + quiet) reads a minute per process. A token that has resolved
 * in this process is never throttled (`known`: per process, empty after every restart). Parallel
 * calls with one token share one read. Malformed tokens (not csk_ + 43 base64url characters)
 * never reach Firestore at all. A refusal never tells the caller their token is wrong: it was not
 * checked.
 */

export const TOKEN_PREFIX = 'csk_';
// The game's tokens are 'csk_' + base64url(32 random bytes) = 43 characters (McpTokens.newRawToken).
const TOKEN_RE = /^csk_[A-Za-z0-9_-]{43}$/;
export const MISS_LIMITS = Object.freeze({ source: 20, global: 1000, quiet: 500 });
// A caller with at most this many unknown-token lookups in the minute counts as quiet (see above).
export const QUIET_LOOKUPS = 3;
const WHERE = 'in the game: ACCOUNT -> AI Designer (MCP)';
const NOT_CHECKED = 'Your token was not checked, so it may well be fine: retry in';

/**
 * The throttling key of a caller address: IPv4 (also IPv4-mapped IPv6, with or without a port) as
 * is, IPv6 by its /64 prefix - one host gets a whole /64, so rotating inside it must not buy a fresh
 * budget. Anything that is not an address ('stdio', 'unknown') is its own key.
 */
export function sourceKey(addr) {
  let s = String(addr || 'unknown').trim().toLowerCase();
  const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(s);
  if (bracket) s = bracket[1];
  s = s.replace(/%.*$/, '');   // zone id
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/.exec(s);
  if (v4) return v4[1];
  if (!/^[0-9a-f:.]+$/.test(s) || !s.includes(':')) return s;
  const halves = s.split('::');
  if (halves.length > 2) return s;
  const groups = (part) => (part ? part.split(':') : []).flatMap(g => (g.includes('.') ? ['0', '0'] : [g]));
  const head = groups(halves[0]);
  const tail = halves.length === 2 ? groups(halves[1]) : [];
  const full = halves.length === 2 ? [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), ...tail] : head;
  if (full.length !== 8 || !full.every(g => /^[0-9a-f]{1,4}$/.test(g))) return s;
  return full.slice(0, 4).map(g => parseInt(g, 16).toString(16)).join(':') + '::/64';
}

/** A problem with the caller's token: the message goes to the AI verbatim. */
export class AuthError extends Error {
  constructor(message, code, retryAfterSec = 0) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    if (retryAfterSec) this.retryAfterSec = retryAfterSec;
  }
}

/** SHA-256 hex of a raw token: the id of its mcpTokens doc (the game hashes the same way). */
export function hashToken(token) {
  return createHash('sha256').update(String(token), 'utf8').digest('hex');
}

/**
 * A token as pasted by a human: surrounding whitespace and quotes, or a whole
 * "Bearer csk_..." header value, are forgiven.
 */
export function cleanToken(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
}

export class TokenAuth {
  /**
   * @param {FirebaseFirestore.Firestore} db
   * @param {{cacheMs?: number, usageEveryMs?: number, missLimits?: {source: number, global: number},
   *   now?: () => number, log?: (msg: string) => void}} opts
   */
  constructor(db, { cacheMs = 30000, usageEveryMs = 60000, missLimits = MISS_LIMITS, now = () => Date.now(), log = () => {}, resource = null } = {}) {
    this.db = db;
    // OAuth access tokens are only good for the resource they were issued for (<PUBLIC_URL>/mcp).
    this.resource = resource;
    this.cacheMs = cacheMs;
    // An unknown token is re-checked sooner: the player may have just created it.
    this.missCacheMs = Math.min(cacheMs, 5000);
    this.usageEveryMs = usageEveryMs;
    this.now = now;
    this.log = log;
    this.cache = new Map();   // hash -> { at, data|null }
    this.usage = new Map();   // hash -> { pending, lastWriteAt }
    this.known = new Set();   // hashes that resolved to a token doc in THIS process: never throttled
    this.inflight = new Map();   // hash -> the lookup under way (parallel calls share it)
    this.misses = new RateLimiter({
      limits: { source: missLimits.source, global: missLimits.global, quiet: missLimits.quiet ?? MISS_LIMITS.quiet },
      now
    });
  }

  /**
   * Who does this raw token belong to? Resolves to { uid, hash, label, writerId } or throws an
   * AuthError whose message tells the player exactly what to fix.
   */
  async authenticate(rawToken, { source = 'stdio' } = {}) {
    const token = cleanToken(rawToken);
    if (!token) {
      throw new AuthError('No City Siege access token was given. Generate one ' + WHERE + ', then set it as ' +
        'CITY_SIEGE_TOKEN (stdio) or send it as "Authorization: Bearer <token>" (HTTP) in your MCP client config.', 'MISSING_TOKEN');
    }
    const grant = parseGrantToken(token);
    if (grant) return this._authenticateGrant(grant, source);
    if (!TOKEN_RE.test(token)) {
      throw new AuthError(`That access token does not look like a City Siege token (they start with "${TOKEN_PREFIX}" and are ` +
        '47 characters long). Copy it again from ' + WHERE.replace('in the game: ', 'the game\'s ') + ' - it is shown only once, so ' +
        'generate a new one if it is lost.', 'MALFORMED_TOKEN');
    }
    const hash = hashToken(token);
    const data = await this._lookup(hash, sourceKey(source));
    if (!data) {
      throw new AuthError('Unknown access token: no City Siege account has this token (it may have been deleted, or copied ' +
        'incompletely). Generate a new one ' + WHERE + ' and update your MCP client config.', 'UNKNOWN_TOKEN');
    }
    if (data.revoked === true) {
      throw new AuthError(`This access token${data.label ? ` ("${data.label}")` : ''} was revoked in the game. Generate a new one ` +
        WHERE + ' and update your MCP client config.', 'REVOKED_TOKEN');
    }
    if (data.scope !== 'design') {
      throw new AuthError(`This access token has scope "${data.scope}", but the City Siege MCP server only accepts design ` +
        'tokens. Generate a new one ' + WHERE + '.', 'BAD_SCOPE');
    }
    if (typeof data.uid !== 'string' || !data.uid) {
      throw new AuthError('This access token is not linked to a player. Generate a new one ' + WHERE + '.', 'UNKNOWN_TOKEN');
    }
    return { uid: data.uid, hash, label: data.label || '', writerId: 'mcp:' + hash.slice(0, 8) };
  }

  /**
   * An OAuth access token ('cso_<grantId>.<secret>', oauth.js): the grant doc is found by id and
   * its current access-secret hash compared in constant time. A refresh rotates the secret, so a
   * cached doc that does not match (or looks expired) is read once more before refusing.
   */
  async _authenticateGrant(grant, source) {
    const again = 'Reconnect the app to City Siege (it signs you in again).';
    if (grant.kind !== 'access') {
      throw new AuthError('That is a refresh token; send the access token as the Bearer token. ' + again, 'INVALID_TOKEN');
    }
    const check = (g) => {
      if (!g || g.kind !== 'oauth') return 'UNKNOWN_TOKEN';
      if (g.revoked === true) return 'REVOKED_TOKEN';
      if (!sameHash(grant.secretHash, g.accessHash)) return 'INVALID_TOKEN';
      if (!g.accessExpiresAt || g.accessExpiresAt.toMillis() <= this.now()) return 'EXPIRED_TOKEN';
      return null;
    };
    let data = await this._lookup(grant.grantId, sourceKey(source));
    let why = check(data);
    if (why === 'INVALID_TOKEN' || why === 'EXPIRED_TOKEN') {
      data = await this._read(grant.grantId, sourceKey(source), null, this.now());
      why = check(data);
    }
    const text = {
      UNKNOWN_TOKEN: 'This connection to City Siege no longer exists (it was deleted in the game). ' + again,
      REVOKED_TOKEN: `This connection${data && data.label ? ` ("${data.label}")` : ''} was revoked in City Siege. ` + again,
      INVALID_TOKEN: 'This access token is not valid any more (a newer one was issued). Refresh it, or ' + again.toLowerCase(),
      EXPIRED_TOKEN: 'This access token expired. Refresh it, or ' + again.toLowerCase()
    };
    if (why) throw new AuthError(text[why], why);
    if (this.resource && data.resource && data.resource !== this.resource) {
      throw new AuthError(`This token was issued for ${data.resource}, not this server (${this.resource}). ` + again, 'WRONG_RESOURCE');
    }
    if (data.scope !== 'design' || typeof data.uid !== 'string' || !data.uid) {
      throw new AuthError('This connection is not linked to a player. ' + again, 'UNKNOWN_TOKEN');
    }
    return { uid: data.uid, hash: grant.grantId, label: data.label || '', writerId: 'mcp:' + grant.grantId.slice(0, 8), oauth: true };
  }

  /** The token doc (cached), or null when it does not exist. */
  async _lookup(hash, source) {
    const hit = this.cache.get(hash);
    const t = this.now();
    if (hit && t - hit.at < (hit.data ? this.cacheMs : this.missCacheMs)) return hit.data;
    // Parallel calls with one token (an AI client's first burst) share one read and one budget unit.
    const pending = this.inflight.get(hash);
    if (pending) return pending;
    // A hash not seen to exist in this process: take a lookup from the miss budgets first (see the class comment).
    const lane = this.known.has(hash) ? null : this._takeMiss(source);
    const read = this._read(hash, source, lane, t);
    this.inflight.set(hash, read);
    try {
      return await read;
    } finally {
      if (this.inflight.get(hash) === read) this.inflight.delete(hash);
    }
  }

  async _read(hash, source, lane, t) {
    let data;
    try {
      const snap = await this.db.collection('mcpTokens').doc(hash).get();
      data = snap.exists ? snap.data() : null;
    } catch (e) {
      if (lane) this._refundMiss(source, lane);
      throw e;
    }
    if (data) {
      if (lane) this._refundMiss(source, lane);
      this.known.add(hash);
      if (this.known.size > 5000) this.known.delete(this.known.values().next().value);
    } else {
      this.known.delete(hash);   // deleted since: throttled like any unknown token from now on
    }
    this.cache.set(hash, { at: t, data });
    if (this.cache.size > 5000) this.cache.delete(this.cache.keys().next().value);
    return data;
  }

  /** Take one unknown-token lookup for `source`; returns the process lane it came from, or throws AUTH_THROTTLED. */
  _takeMiss(source) {
    const mine = this.misses.take(source, 'source');
    if (!mine.ok) {
      throw new AuthError(`This server is not checking new access tokens from your network address for the next ` +
        `${mine.retryAfterSec} s: more than ${mine.limit} unrecognised tokens came from that address in the last minute (they may ` +
        `be someone else's on the same network or proxy). ${NOT_CHECKED} ${mine.retryAfterSec} s. Tokens this server has already ` +
        'accepted keep working.', 'AUTH_THROTTLED', mine.retryAfterSec);
    }
    const all = this.misses.take('*', 'global');
    if (all.ok) return 'global';
    // Over the process-wide cost cap: a quiet caller still gets its lookup (see the class comment).
    if (this.misses.count(source, 'source') <= QUIET_LOOKUPS && this.misses.take('*', 'quiet').ok) return 'quiet';
    this.misses.refund(source, 'source');
    throw new AuthError(`This server is not checking new access tokens for the next ${all.retryAfterSec} s: it received too many ` +
      `unrecognised ones in the last minute. ${NOT_CHECKED} ${all.retryAfterSec} s. Tokens this server has already accepted keep ` +
      'working.', 'AUTH_THROTTLED', all.retryAfterSec);
  }

  _refundMiss(source, lane) {
    this.misses.refund(source, 'source');
    this.misses.refund('*', lane);
  }

  /**
   * Count one call on a token. The first use in this process writes at once (so the game's
   * token list shows "last used" right away); later ones at most every usageEveryMs.
   */
  noteUse(hash) {
    const u = this.usage.get(hash) || { pending: 0, lastWriteAt: -Infinity };
    u.pending++;
    this.usage.set(hash, u);
    if (this.now() - u.lastWriteAt >= this.usageEveryMs) this._flush(hash).catch(() => {});
  }

  async _flush(hash) {
    const u = this.usage.get(hash);
    if (!u || !u.pending) return;
    const n = u.pending;
    u.pending = 0;
    u.lastWriteAt = this.now();
    try {
      await this.db.collection('mcpTokens').doc(hash).update({
        lastUsedAt: FieldValue.serverTimestamp(),
        uses: FieldValue.increment(n)
      });
    } catch (e) {
      // A token deleted a moment ago has no doc to update; the next call is refused anyway.
      this.log(`usage update for token ${hash.slice(0, 8)} failed: ${e.message}`);
    }
  }

  /** Write every pending usage count (on shutdown). */
  async flushAll() {
    await Promise.all([...this.usage.keys()].map(h => this._flush(h)));
  }
}
