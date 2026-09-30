/**
 * ConnectUI - the CONNECT screen: where a player lets an AI app (ChatGPT, or any MCP client that
 * signs in with OAuth) design their city.
 *
 * The app starts it: its "Connect" button sends the browser to the MCP server, which parks the
 * request and redirects here as <game>?oauth_request=<id> (mcp-server/src/oauth.js). This screen
 * then
 *   - makes sure the player is signed in (the normal ACCOUNT screen, and back here after),
 *   - shows which app asks, where it will send them back to, and what it may and may not do,
 *   - on ALLOW writes oauthApprovals/{id} = { uid } (firestore.rules check who) and navigates to
 *     the request's finishUrl - the server then hands the app its one-time code;
 *   - on DENY navigates to finishUrl&deny=1, which tells the app "access_denied".
 * No token or password passes through here: the app gets its tokens from the server.
 *
 * The id survives a reload (sessionStorage), so a Google sign-in popup or an accidental refresh
 * does not lose the request. It is a full screen like SHOP / GARAGE / ACCOUNT, drawn over
 * whatever the game shows, and never uses native dialogs.
 */

const KEY = 'city_siege_oauth_request';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function readPendingId() {
  let id = null;
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('oauth_request');
    if (fromUrl) {
      id = fromUrl;
      try { sessionStorage.setItem(KEY, id); } catch (e) { /* storage blocked: the URL copy still works */ }
      // Out of the address bar: a reload or a shared link must not reopen an old request.
      url.searchParams.delete('oauth_request');
      window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
    } else {
      id = sessionStorage.getItem(KEY);
    }
  } catch (e) { /* no URL / storage: nothing pending */ }
  return /^[A-Za-z0-9_-]{32}$/.test(String(id || '')) ? id : null;
}

export class ConnectUI {
  /** @param {{ game, ui, online, onlineUI }} deps */
  constructor({ game, ui, online, onlineUI }) {
    this.game = game;
    this.ui = ui;
    this.online = online;
    this.onlineUI = onlineUI;
    this.view = document.getElementById('connect-view');
    this.main = document.getElementById('connect-main');
    this.pendingId = readPendingId();
    this.request = undefined;       // undefined = not loaded, null = gone, object = the request
    this.loadingFor = null;
    this.state = 'idle';            // 'idle' | 'approving' | 'leaving' | 'error'
    this.error = '';
    this.awaitSignIn = false;

    if (this.main) {
      this.main.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el || el.disabled) return;
        e.preventDefault();
        this._action(el.dataset.action);
      });
    }
    online.on('auth', () => this._onAuth());
    online.on('profile', () => this._onAuth());
    // The request expires after 10 minutes: keep the countdown honest.
    setInterval(() => { if (this.isOpen() && this.request) this._renderCountdown(); }, 1000);

    if (this.pendingId) this.show();
  }

  isOpen() {
    return !!(this.view && !this.view.classList.contains('hidden'));
  }

  show() {
    if (!this.view) return;
    this.ui.hideBuildingInspector();
    this.view.classList.remove('hidden');
    this.render();
  }

  hide() {
    if (this.view) this.view.classList.add('hidden');
  }

  _forget() {
    this.pendingId = null;
    this.request = undefined;
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  _onAuth() {
    const o = this.online;
    if (this.awaitSignIn && o.user && o.profile && this.pendingId) {
      // Back from the ACCOUNT screen, signed in: finish what the player came for.
      this.awaitSignIn = false;
      this.ui.setScreen('HOME');
      this.show();
      return;
    }
    if (!o.user) this.request = undefined;   // another account must read the request again
    if (this.isOpen()) this.render();
  }

  async _load() {
    const id = this.pendingId;
    if (!id || this.loadingFor === id) return;
    this.loadingFor = id;
    try {
      this.request = await this.online.getOAuthRequest(id);
    } catch (e) {
      this.request = null;
      this.error = (e && e.message) || 'Could not read the connection request.';
    }
    this.loadingFor = null;
    if (this.isOpen()) this.render();
  }

  async _action(action) {
    if (this.ui.sound && this.ui.sound.playClick) this.ui.sound.playClick();
    if (action === 'sign-in') {
      this.awaitSignIn = true;
      this.hide();
      this.onlineUI.openAccount('profile');
      this.ui.showToast('Sign in to finish connecting your AI app - you will come back here.', 4200);
    } else if (action === 'switch-account') {
      this.awaitSignIn = true;
      try { await this.online.signOut(); } catch (e) { /* the profile screen shows its own errors */ }
      this.hide();
      this.onlineUI.openAccount('profile');
    } else if (action === 'allow') {
      if (this.state === 'approving' || this.state === 'leaving') return;
      this.state = 'approving';
      this.error = '';
      this.render();
      try {
        const next = await this.online.approveOAuthRequest(this.pendingId);
        // Your city is saved before the page leaves for the app (pagehide saves too).
        if (this.game.saveCityNow) this.game.saveCityNow();
        this.state = 'leaving';
        this._forget();
        this.render();
        window.location.assign(next);
      } catch (e) {
        this.state = 'error';
        this.error = (e && e.message) || 'Could not approve the connection.';
        this.render();
      }
    } else if (action === 'deny') {
      const req = this.request;
      this._forget();
      this.state = 'leaving';
      this.render();
      if (req && req.finishUrl) window.location.assign(req.finishUrl + '&deny=1');
      else this.hide();
    } else if (action === 'close') {
      this._forget();
      this.state = 'idle';
      this.hide();
    }
  }

  // ------------------------------------------------------------------------------- rendering

  _card(inner, extra = '') {
    return `<div class="blueprint-card online-card connect-card ${extra}">${inner}</div>`;
  }

  _renderCountdown() {
    const el = document.getElementById('connect-expires');
    if (!el || !this.request) return;
    const left = this.request.expiresAtMs - Date.now();
    el.textContent = left > 0 ? `This request expires in ${mmss(left)}.` : 'This request has expired. Start again from your AI app.';
    if (left <= 0) {
      const allow = this.main.querySelector('[data-action="allow"]');
      if (allow) allow.disabled = true;
    }
  }

  render() {
    if (!this.main) return;
    const o = this.online;
    let body;
    if (!this.pendingId && this.state !== 'leaving') {
      body = this._card(`<div class="online-card-title">Nothing to connect</div>
        <p class="online-dim">Start the connection from your AI app (for example ChatGPT: Settings → Apps &amp; Connectors → your City Siege connector → Connect).</p>
        <button class="btn-secondary online-wide" data-action="close">← BACK TO CITY</button>`);
    } else if (this.state === 'leaving') {
      body = this._card(`<div class="online-card-title">↪️ Taking you back to your app…</div>
        <p class="online-dim">If nothing happens, go back to your AI app and try connecting again.</p>`);
    } else if (!o.configured) {
      body = this._card(`<div class="online-card-title">Online play is off in this build</div>
        <p class="online-dim">This copy of the game has no Firebase project configured, so it cannot approve connections. Open the online version of City Siege instead.</p>
        <button class="btn-secondary online-wide" data-action="close">← BACK TO CITY</button>`);
    } else if (!o.authReady) {
      body = this._card('<div class="online-card-title">Checking your sign-in…</div>');
    } else if (!o.user || !o.profile) {
      body = this._card(`<div class="connect-app-icon">🤖</div>
        <div class="online-card-title">An AI app wants to design your city</div>
        <p class="online-dim">Sign in to your City Siege account first. You will come straight back here to approve or refuse.</p>
        <button class="btn-primary online-wide" data-action="sign-in">👤 SIGN IN TO CONTINUE</button>
        <button class="btn-secondary online-wide" data-action="close">Not now</button>`);
    } else if (this.request === undefined) {
      this._load();
      body = this._card('<div class="online-card-title">Loading the connection request…</div>');
    } else if (!this.request || this.request.expiresAtMs <= Date.now()) {
      body = this._card(`<div class="online-card-title">This link has expired</div>
        <p class="online-dim">${esc(this.error || 'The connection request was already used, cancelled, or is older than 10 minutes.')} Start again from your AI app.</p>
        <button class="btn-secondary online-wide" data-action="close">← BACK TO CITY</button>`);
    } else {
      const r = this.request;
      const p = o.profile;
      const busy = this.state === 'approving';
      body = this._card(`
        <div class="connect-app-icon">🤖</div>
        <div class="online-card-title connect-title"><b>${esc(r.clientName)}</b> wants to design your city</div>
        <p class="online-dim">After you allow it, you go back to <b>${esc(r.redirectHost || 'the app')}</b> and can ask it to lay out your city.</p>
        <div class="connect-account">
          <span>Signed in as <b>${esc(p.name)}</b>${o.user.email ? ` · ${esc(o.user.email)}` : ''} · 🏛️ TH ${esc(p.townHall || 1)}</span>
          <button class="btn-secondary token-btn" data-action="switch-account">Not you?</button>
        </div>
        <div class="connect-perms">
          <div class="connect-perm-col"><div class="connect-perm-head is-can">It can</div>
            <ul><li>See your city: buildings, roads, inventory, battle deadlines</li>
            <li>Place, move and stow buildings; clear trees</li>
            <li>Draw and erase roads</li></ul></div>
          <div class="connect-perm-col"><div class="connect-perm-head is-cannot">It can never</div>
            <ul><li>Attack, or start or accept battles</li>
            <li>Buy, upgrade or collect</li>
            <li>Spend or touch your bank, gems or garage</li></ul></div>
        </div>
        <p class="online-dim connect-note">Every change follows the same rules as dragging in the Design Map, and shows up live in your game. Revoke it any time: ACCOUNT → AI Designer.</p>
        ${this.error ? `<div class="blueprint-lock">⚠️ ${esc(this.error)}</div>` : ''}
        <div class="connect-actions">
          <button class="btn-secondary" data-action="deny" ${busy ? 'disabled' : ''}>DENY</button>
          <button class="btn-primary online-violet" data-action="allow" ${busy ? 'disabled' : ''}>${busy ? 'CONNECTING…' : '✓ ALLOW'}</button>
        </div>
        <div id="connect-expires" class="online-dim connect-expires"></div>`, 'connect-consent');
    }
    this.main.innerHTML = `<div class="connect-wrap">${body}</div>`;
    this._renderCountdown();
  }
}
