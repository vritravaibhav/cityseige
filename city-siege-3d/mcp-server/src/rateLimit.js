/**
 * Per-token rate limits (spec section 10): 30 mutating calls and 120 read calls per rolling
 * minute. The limits keep a runaway agent loop from hammering Firestore (and the player's open
 * game, which re-renders the city on every change); a normal design session stays far below them.
 *
 * In memory, per process: good for one stdio server per player and for a single HTTP instance.
 * Several HTTP replicas would each allow the full rate - the README says so.
 */

export const LIMITS = Object.freeze({ write: 30, read: 120 });
const WINDOW_MS = 60 * 1000;

export class RateLimiter {
  constructor({ limits = LIMITS, windowMs = WINDOW_MS, now = () => Date.now() } = {}) {
    this.limits = limits;
    this.windowMs = windowMs;
    this.now = now;
    this.hits = new Map();   // `${kind}:${key}` -> timestamps (ms), oldest first
  }

  /**
   * Take one call of `kind` ('write' | 'read') for `key` (the token hash). Returns
   * { ok: true } or { ok: false, limit, retryAfterSec } without counting the refused call.
   */
  take(key, kind) {
    const t = this.now();
    const k = kind + ':' + key;
    const list = (this.hits.get(k) || []).filter(at => t - at < this.windowMs);
    const limit = this.limits[kind] || this.limits.read;
    if (list.length >= limit) {
      this.hits.set(k, list);
      return { ok: false, limit, retryAfterSec: Math.max(1, Math.ceil((list[0] + this.windowMs - t) / 1000)) };
    }
    list.push(t);
    this.hits.set(k, list);
    if (this.hits.size > 10000) this._prune(t);
    return { ok: true };
  }

  /** How many calls of `kind` for `key` the rolling window holds now. */
  count(key, kind) {
    const t = this.now();
    return (this.hits.get(kind + ':' + key) || []).filter(at => t - at < this.windowMs).length;
  }

  /** Give back the newest call taken for `key` (one that turned out not to count). */
  refund(key, kind) {
    const list = this.hits.get(kind + ':' + key);
    if (list && list.length) list.pop();
  }

  _prune(t) {
    for (const [k, list] of this.hits) {
      if (!list.length || t - list[list.length - 1] >= this.windowMs) this.hits.delete(k);
    }
  }
}
