import { friendlyError, codedError } from './AuthService.js';

/**
 * McpTokens - personal access tokens for the AI designer (docs/ONLINE_SPEC.md 7.4 and 10).
 *
 * A token is `csk_` + 32 random bytes (base64url). Only its SHA-256 is stored, as the id of
 * `mcpTokens/{sha256hex}`; the raw token is handed to the player ONCE (to paste into an MCP
 * client) and never written anywhere by the game. The MCP server hashes what it is given and
 * looks the document up, so a leaked database never leaks a usable token, and revoking is one
 * field on one document. Tokens are design-only (scope 'design'): the server has no tool that
 * attacks, buys, upgrades or touches the bank.
 */

function base64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const hex = (bytes) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

// SHA-256 for pages served from a non-secure origin (http://<LAN-IP>, where crypto.subtle is
// missing). Same bytes out as crypto.subtle.digest; used only as a fallback.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function sha256Fallback(data) {
  const l = data.length;
  const withPad = ((l + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(withPad);
  m.set(data);
  m[l] = 0x80;
  const bits = l * 8;
  const dv = new DataView(m.buffer);
  dv.setUint32(withPad - 8, Math.floor(bits / 0x100000000));
  dv.setUint32(withPad - 4, bits >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < withPad; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  H.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}

/** SHA-256 of a string as 64 lowercase hex characters (what the MCP server computes too). */
export async function sha256Hex(text) {
  const data = new TextEncoder().encode(String(text));
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (subtle && typeof subtle.digest === 'function') {
    return hex(new Uint8Array(await subtle.digest('SHA-256', data)));
  }
  return hex(sha256Fallback(data));
}

/** A new raw token: 'csk_' + base64url(32 random bytes). */
export function newRawToken() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return 'csk_' + base64url(bytes);
}

const tsMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : null));

export class McpTokens {
  /**
   * @param {object} deps
   * @param {object} deps.fb          loadFirebase() result
   * @param {object} deps.controller  OnlineController (events)
   */
  constructor({ fb, controller }) {
    this.fb = fb;
    this.controller = controller;
    this.uid = null;
    this.tokens = [];
    this._unsub = null;
  }

  _col() { return this.fb.fsSdk.collection(this.fb.db, 'mcpTokens'); }
  _query() {
    const { query, where, orderBy } = this.fb.fsSdk;
    return query(this._col(), where('uid', '==', this.uid), orderBy('createdAt', 'desc'));
  }

  _row(d) {
    const x = d.data({ serverTimestamps: 'estimate' });
    return {
      hash: d.id,
      label: x.label || '',
      createdAtMs: tsMs(x.createdAt),
      lastUsedAtMs: tsMs(x.lastUsedAt),
      uses: Number(x.uses) || 0,
      revoked: !!x.revoked,
      scope: x.scope || 'design'
    };
  }

  /** Follow my tokens live (so "last used" updates while the ACCOUNT screen is open). */
  start(uid) {
    this.stop();
    this.uid = uid;
    this._unsub = this.fb.fsSdk.onSnapshot(this._query(), (snap) => {
      if (this.uid !== uid) return;
      this.tokens = snap.docs.map(d => this._row(d));
      this.controller._emit('tokens', this.tokens);
    }, (err) => {
      console.warn('[mcp tokens] listener failed', err);
    });
  }

  stop() {
    if (this._unsub) this._unsub();
    this._unsub = null;
    this.uid = null;
    this.tokens = [];
  }

  /**
   * Create a token. Resolves to { token, hash, label } - `token` is the only copy there will
   * ever be: show it once, never store it.
   */
  async generate(label) {
    if (!this.uid) throw codedError('unauthenticated');
    const clean = String(label == null ? '' : label).trim().slice(0, 40) || 'AI designer';
    const token = newRawToken();
    const hash = await sha256Hex(token);
    const { doc, setDoc, serverTimestamp } = this.fb.fsSdk;
    try {
      await setDoc(doc(this.fb.db, 'mcpTokens', hash), {
        uid: this.uid, label: clean, createdAt: serverTimestamp(), revoked: false, scope: 'design'
      });
    } catch (e) {
      throw friendlyError(e, 'Could not create the token.');
    }
    return { token, hash, label: clean };
  }

  /** My tokens, newest first: [{ hash, label, createdAtMs, lastUsedAtMs, uses, revoked, scope }]. */
  async list() {
    if (!this.uid) throw codedError('unauthenticated');
    try {
      const snap = await this.fb.fsSdk.getDocs(this._query());
      this.tokens = snap.docs.map(d => this._row(d));
      return this.tokens;
    } catch (e) {
      throw friendlyError(e, 'Could not load your tokens.');
    }
  }

  /** Revoke: the MCP server refuses the token from its next call (its cache lasts 30 s). */
  async revoke(hash) {
    if (!this.uid) throw codedError('unauthenticated');
    const { doc, updateDoc } = this.fb.fsSdk;
    try {
      await updateDoc(doc(this.fb.db, 'mcpTokens', String(hash)), { revoked: true });
    } catch (e) {
      throw friendlyError(e, 'Could not revoke the token.');
    }
  }

  /** Delete a token document entirely (revoked or not). */
  async remove(hash) {
    if (!this.uid) throw codedError('unauthenticated');
    const { doc, deleteDoc } = this.fb.fsSdk;
    try {
      await deleteDoc(doc(this.fb.db, 'mcpTokens', String(hash)));
    } catch (e) {
      throw friendlyError(e, 'Could not delete the token.');
    }
  }
}
