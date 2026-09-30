/**
 * AuthService - accounts (docs/ONLINE_SPEC.md sections 6 and 7).
 *
 * Email + password or a Google popup, and one public profile per account: `players/{uid}`
 * (commander name, Town Hall, trophies, W/L/D) plus a `usernames/{nameLower}` claim that makes
 * names unique. The Firestore rules only accept a profile whose name is claimed by the same uid
 * in the same batch (getAfter), so the claim and the profile are always written together.
 *
 * The profile is followed live (onSnapshot), so trophies change on screen the moment a battle
 * settles, and there is no read-then-write race between sign-up and the auth listener.
 *
 * Every rejection is an Error whose `message` is human text a screen can show as-is (see
 * friendlyError); the Firebase code stays on `error.code`.
 */

/** Firebase / Firestore error codes -> text a player can act on. */
const MESSAGES = {
  'auth/email-already-in-use': 'An account already uses this email. Sign in instead.',
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Choose a password of at least 6 characters.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-login-credentials': 'Wrong email or password.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection to the server. Check your network and try again.',
  'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
  'auth/cancelled-popup-request': 'Another sign-in window is already open.',
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for this game (Firebase console > Authentication).',
  'auth/unauthorized-domain': 'This site is not an authorised domain for sign-in (Firebase console > Authentication > Settings).',
  'auth/account-exists-with-different-credential': 'This email already has an account with another sign-in method.',
  'auth/requires-recent-login': 'Please sign in again first.',
  'auth/internal-error': 'The sign-in server had a problem. Try again.',
  'permission-denied': 'The server refused this change.',
  'unavailable': 'The server cannot be reached right now. Your game keeps working offline.',
  'deadline-exceeded': 'The server took too long to answer. Try again.',
  'not-found': 'That no longer exists.',
  'already-exists': 'That already exists.',
  'resource-exhausted': 'Too many requests. Wait a moment and try again.',
  'failed-precondition': 'That is not possible right now.',
  'aborted': 'Someone else changed this at the same moment. Try again.',
  'unauthenticated': 'Sign in first.',
  'name-taken': 'That commander name is taken. Pick another.',
  'bad-name': 'Commander names are 3-20 letters, digits, spaces, _ or -.',
  'no-profile': 'Pick a commander name first.',
  'not-configured': 'Online play is not set up in this build. See docs/ONLINE.md.'
};

/**
 * An Error with a readable message for any thrown value (Firebase errors carry `code`).
 * `fallback` is used when the code is unknown.
 */
export function friendlyError(e, fallback = 'Something went wrong. Try again.') {
  if (e && e.friendly) return e;
  const code = (e && e.code) || '';
  const bare = String(code).replace(/^firestore\//, '');
  let message = MESSAGES[code] || MESSAGES[bare];
  if (!message) message = (e && e.message && !/^Firebase:|\(auth\/|FirebaseError/.test(e.message)) ? e.message : fallback;
  const err = new Error(message);
  err.code = code || 'unknown';
  err.friendly = true;
  err.cause = e;
  return err;
}

/** A thrown error with our own code (mapped through MESSAGES). */
export function codedError(code, message) {
  const err = new Error(message || MESSAGES[code] || code);
  err.code = code;
  err.friendly = true;
  return err;
}

const NAME_RE = /^[A-Za-z0-9_ -]{3,20}$/;

/**
 * Commander name rules (spec section 6): 3..20 of [A-Za-z0-9_ -] after trimming; runs of spaces
 * collapse to one (the rules only forbid edge spaces, but "a  b" and "a b" would look identical).
 * Returns { ok, name, nameLower, message? }.
 */
export function cleanCommanderName(raw) {
  const name = String(raw == null ? '' : raw).trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(name)) return { ok: false, name, nameLower: name.toLowerCase(), message: MESSAGES['bad-name'] };
  return { ok: true, name, nameLower: name.toLowerCase() };
}

/** A name built from a Google display name / email, cut to the rules (may still be taken). */
function nameFromIdentity(user) {
  const base = String((user && (user.displayName || (user.email || '').split('@')[0])) || 'Commander')
    .replace(/[^A-Za-z0-9_ -]/g, '').trim().replace(/\s+/g, ' ').slice(0, 16).trim();
  return base.length >= 3 ? base : ('Commander' + base).slice(0, 16);
}

const tsMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : (typeof v === 'number' ? v : null));

export class AuthService {
  /**
   * @param {object} fb        loadFirebase() result
   * @param {object} opts
   * @param {() => number} opts.townHall  current Town Hall level (for a new profile)
   */
  constructor(fb, { townHall = () => 1 } = {}) {
    this.fb = fb;
    this.townHall = townHall;
    this.user = null;
    this.profile = null;
    this.needsProfile = false;     // signed in, but no players/{uid} yet (pick a name)
    this.ready = false;            // the first auth state has arrived
    this._listeners = new Set();
    this._stopProfile = null;
    this._stopAuth = null;
    this._claiming = false;        // signUp is between creating the account and claiming its name
  }

  /** Begin following the auth state (restored from the browser's IndexedDB on reload). */
  start() {
    const { auth, authSdk } = this.fb;
    this._stopAuth = authSdk.onAuthStateChanged(auth, (user) => this._onUser(user));
  }

  stop() {
    if (this._stopAuth) this._stopAuth();
    if (this._stopProfile) this._stopProfile();
    this._stopAuth = this._stopProfile = null;
  }

  /** cb({ user, profile, needsProfile, ready }) now and on every change. Returns an unsubscribe. */
  onAuth(cb) {
    this._listeners.add(cb);
    if (this.ready) cb(this.state());
    return () => this._listeners.delete(cb);
  }

  state() {
    const u = this.user;
    return {
      ready: this.ready,
      user: u ? { uid: u.uid, email: u.email || null, displayName: u.displayName || null,
        providers: (u.providerData || []).map(p => p.providerId) } : null,
      profile: this.profile,
      needsProfile: this.needsProfile
    };
  }

  _emit() {
    const s = this.state();
    for (const cb of this._listeners) {
      try { cb(s); } catch (e) { console.error('[auth] listener failed', e); }
    }
  }

  _onUser(user) {
    if (this._stopProfile) { this._stopProfile(); this._stopProfile = null; }
    this.user = user || null;
    this.profile = null;
    this.needsProfile = false;
    if (!user) {
      this.ready = true;
      this._emit();
      return;
    }
    const { db, fsSdk } = this.fb;
    const uid = user.uid;
    this._stopProfile = fsSdk.onSnapshot(fsSdk.doc(db, 'players', uid), (snap) => {
      if (!this.user || this.user.uid !== uid) return;
      // A brand-new email account reports "no profile" for the moment signUp is still writing
      // its claim; the next snapshot carries the profile.
      this.profile = snap.exists() ? this._profileFrom(snap.data({ serverTimestamps: 'estimate' })) : null;
      // Not while signUp is still claiming the name (the UI would flash the name form).
      this.needsProfile = !snap.exists() && !this._claiming;
      this.ready = true;
      this._emit();
    }, (err) => {
      console.warn('[auth] profile listener failed', err);
      this.ready = true;
      this._emit();
    });
  }

  _profileFrom(d) {
    return {
      uid: d.uid,
      name: d.name,
      nameLower: d.nameLower,
      townHall: d.townHall | 0,
      trophies: d.trophies | 0,
      wins: d.wins | 0,
      losses: d.losses | 0,
      draws: d.draws | 0,
      createdAtMs: tsMs(d.createdAt),
      lastSeenMs: tsMs(d.lastSeen)
    };
  }

  /**
   * New account: email + password + commander name. Names can only be looked up once signed in
   * (the rules), so the account is created first and the name claimed right after; if the name
   * is taken the fresh account is deleted again, so a failed sign-up leaves nothing behind.
   */
  async signUp({ email, password, name } = {}) {
    const clean = cleanCommanderName(name);
    if (!clean.ok) throw codedError('bad-name');
    const { auth, authSdk } = this.fb;
    let cred;
    this._claiming = true;
    try {
      try {
        cred = await authSdk.createUserWithEmailAndPassword(auth, String(email || '').trim(), String(password || ''));
      } catch (e) {
        throw friendlyError(e);
      }
      try {
        await this.claimName(clean.name);
      } catch (e) {
        // Do not leave a nameless account behind for a sign-up the player saw fail.
        try { await cred.user.delete(); } catch (_) { /* keep it: the name form will appear */ }
        throw friendlyError(e);
      }
    } finally {
      this._claiming = false;
      if (this.user && !this.profile) { this.needsProfile = true; this._emit(); }
    }
    try { await authSdk.updateProfile(cred.user, { displayName: clean.name }); } catch (_) { /* cosmetic */ }
    return this.state();
  }

  async signIn({ email, password } = {}) {
    const { auth, authSdk } = this.fb;
    try {
      await authSdk.signInWithEmailAndPassword(auth, String(email || '').trim(), String(password || ''));
    } catch (e) {
      throw friendlyError(e);
    }
    return this.state();
  }

  /**
   * Google popup. A first-time Google player gets a commander name made from their Google name
   * (with a number appended if it is taken); they can rename later with claimName().
   */
  async signInWithGoogle() {
    const { auth, authSdk, db, fsSdk } = this.fb;
    let cred;
    try {
      cred = await authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider());
    } catch (e) {
      throw friendlyError(e);
    }
    const snap = await fsSdk.getDoc(fsSdk.doc(db, 'players', cred.user.uid)).catch(() => null);
    if (snap && !snap.exists()) {
      const base = nameFromIdentity(cred.user);
      for (let i = 0; i < 6; i++) {
        const candidate = i === 0 ? base : `${base.slice(0, 16)}${Math.floor(100 + Math.random() * 900)}`;
        try {
          await this.claimName(candidate);
          break;
        } catch (e) {
          if (e.code !== 'name-taken' && e.code !== 'bad-name') { console.warn('[auth] could not create profile', e); break; }
        }
      }
    }
    return this.state();
  }

  async signOut() {
    const { auth, authSdk } = this.fb;
    try {
      await authSdk.signOut(auth);
    } catch (e) {
      throw friendlyError(e);
    }
  }

  async sendPasswordReset(email) {
    const { auth, authSdk } = this.fb;
    try {
      await authSdk.sendPasswordResetEmail(auth, String(email || '').trim());
    } catch (e) {
      throw friendlyError(e);
    }
  }

  /**
   * Create the profile (or rename it): one batch writes the usernames claim, the profile and -
   * on a rename - releases the old claim. The rules' getAfter sees the claim in the same batch.
   */
  async claimName(rawName) {
    const clean = cleanCommanderName(rawName);
    if (!clean.ok) throw codedError('bad-name');
    const user = this.fb.auth.currentUser;
    if (!user) throw codedError('unauthenticated');
    const { db, fsSdk } = this.fb;
    const { doc, getDoc, writeBatch, serverTimestamp } = fsSdk;
    const uid = user.uid;
    const claimRef = doc(db, 'usernames', clean.nameLower);
    const profRef = doc(db, 'players', uid);
    let claim, prof;
    try {
      [claim, prof] = await Promise.all([getDoc(claimRef), getDoc(profRef)]);
    } catch (e) {
      throw friendlyError(e);
    }
    if (claim.exists() && claim.data().uid !== uid) throw codedError('name-taken');

    const batch = writeBatch(db);
    if (!claim.exists()) batch.set(claimRef, { uid });
    if (!prof.exists()) {
      batch.set(profRef, {
        uid,
        name: clean.name,
        nameLower: clean.nameLower,
        townHall: Math.max(1, Math.min(12, Math.round(Number(this.townHall()) || 1))),
        trophies: 0, wins: 0, losses: 0, draws: 0,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      });
    } else {
      const old = prof.data();
      if (old.name === clean.name) return this.state();
      batch.update(profRef, { name: clean.name, nameLower: clean.nameLower });
      if (old.nameLower && old.nameLower !== clean.nameLower) batch.delete(doc(db, 'usernames', old.nameLower));
    }
    try {
      await batch.commit();
    } catch (e) {
      // Someone claimed the name between our read and the commit: the claim became an update,
      // which the rules deny.
      if (e && e.code === 'permission-denied') throw codedError('name-taken');
      throw friendlyError(e);
    }
    return this.state();
  }
}
