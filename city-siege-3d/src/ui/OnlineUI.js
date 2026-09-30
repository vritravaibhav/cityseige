import { BATTLE, validateChallenge, isNightAt } from '../shared/battleRules.js';

/**
 * OnlineUI - every screen of the online layer (docs/ONLINE_SPEC.md section 9):
 *   - the top bar's account pill with the cloud-save dot, and the BATTLES dock button's badge,
 *   - ACCOUNT (full screen): Profile (sign in / sign up / Google / profile card) and AI Designer
 *     (MCP tokens, ready-to-paste client configs, example prompts),
 *   - BATTLES (full screen): Active battles with live countdowns and the right action per phase,
 *     Challenge (player search + the challenge form) and History,
 *   - the Design Map banner while a battle is in its design or fight phase,
 *   - the ATTACK button's battle raid (OnlineController.attackBattle -> AttackManager.startBattleRaid).
 *
 * It only talks to `game.online` (OnlineController) and UIManager, and it follows the garage's
 * full-screen pattern: static shells in index.html, scoped tab listeners, ONE delegated
 * [data-action] click listener per screen, every render is an innerHTML rewrite (so listeners
 * never leak), and countdowns tick on UIManager's existing 400 ms interval (tick()).
 *
 * Anything another player typed (commander names, challenge messages, token labels) is escaped
 * before it reaches innerHTML. No native alert/confirm/prompt anywhere: confirmations are inline.
 */

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'
}[c]));

const pad2 = (n) => String(n).padStart(2, '0');

/** "4:05" under an hour, "3h 12m" under a day, "2d 4h" after that. */
function fmtCountdown(msLeft) {
  if (msLeft === null || msLeft === undefined || !Number.isFinite(msLeft)) return '--:--';
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${pad2(Math.floor((s % 3600) / 60))}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

/** Raid time as m:ss (battle tie-breaker). */
function fmtRaidTime(sec) {
  const t = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(t / 60)}:${pad2(t % 60)}`;
}

const hhmm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** "Today 21:00" / "Tomorrow 21:00" / "Sat 3 Oct 21:00" in the player's local time. */
function fmtWhen(ms, nowMs = Date.now()) {
  if (!Number.isFinite(ms)) return '-';
  const d = new Date(ms);
  const today = new Date(nowMs);
  const dayDiff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) -
    new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  if (dayDiff === 0) return `Today ${hhmm(d)}`;
  if (dayDiff === 1) return `Tomorrow ${hhmm(d)}`;
  if (dayDiff === -1) return `Yesterday ${hhmm(d)}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} ${hhmm(d)}`;
}

/** "just now" / "5 min ago" / "3 h ago" / "2 d ago". */
function fmtAgo(ms, nowMs = Date.now()) {
  if (!Number.isFinite(ms)) return 'never';
  const s = Math.max(0, Math.round((nowMs - ms) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

/** datetime-local value (local time, minutes) for a ms timestamp. */
function toLocalInput(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${hhmm(d)}`;
}

const starsHtml = (n) => {
  const k = Math.max(0, Math.min(3, Number(n) || 0));
  return `<span class="battle-stars">${'<span class="star-on">★</span>'.repeat(k)}${'<span class="star-off">★</span>'.repeat(3 - k)}</span>`;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OUTCOME_WORD = {
  victory: 'razed it', retreat: 'retreated', busted: 'busted', crash: 'buggy wrecked', timeout: 'time ran out'
};

const PHASE_CHIP = {
  pending: ['⏳ PENDING', 'chip-pending'],
  design: ['🛠️ DESIGN PHASE', 'chip-design'],
  fight: ['⚔️ FIGHT IS LIVE', 'chip-fight'],
  resolving: ['🏁 SCORING', 'chip-resolving'],
  finished: ['✅ FINISHED', 'chip-finished'],
  expired: ['⌛ EXPIRED', 'chip-muted'],
  declined: ['✋ DECLINED', 'chip-muted'],
  cancelled: ['🚫 CANCELLED', 'chip-muted']
};

const ACTIVE_PHASES = new Set(['pending', 'design', 'fight', 'resolving']);

export class OnlineUI {
  /**
   * @param {object} deps
   * @param {object} deps.game    GameApp (window.citySiege)
   * @param {object} deps.ui      UIManager
   * @param {object} deps.online  OnlineController
   */
  constructor({ game, ui, online }) {
    this.game = game;
    this.ui = ui;
    this.online = online;
    this.sound = ui.sound;

    this.accountTab = 'profile';        // 'profile' | 'mcp'
    this.battlesTab = 'active';         // 'active' | 'challenge' | 'history'
    this.accountReturnScreen = 'HOME';
    this.battlesReturnScreen = 'HOME';

    // Form drafts live here, so a re-render never loses what the player typed.
    this.forms = {
      signIn: { email: '', password: '' },
      signUp: { name: '', email: '', password: '' },
      claim: { name: '' },
      tokenLabel: { label: '' }
    };
    this.fieldErrors = {};              // 'signUp.email' -> message
    this.formErrors = {};               // 'signIn' -> message (server answer)
    this.formNotes = {};                // 'signIn' -> info line (password reset sent)
    this.busy = new Set();              // action keys in flight (buttons disabled)
    this.reveal = null;                 // { token, hash, label } - the ONE time a token is shown
    this.confirmRevoke = null;          // { hash, until } inline "are you sure" instead of confirm()
    this._copyTexts = {};               // copy key -> text (never a token in a DOM attribute)
    this._attackingId = null;           // a battle raid being prepared or played (double-click guard)
    this._accountKey = '';
    this._searchTimer = null;
    this._searchSeq = 0;

    this.ch = this._freshChallenge();

    ui.onlineUI = this;
    this._bind();
    this._subscribe();
    this.refreshChrome();
  }

  _freshChallenge() {
    return {
      query: '', players: null, loading: false, error: '',
      target: null, mode: 'instant', designSeconds: BATTLE.INSTANT_DEFAULT_DESIGN,
      presetId: null, customAt: '', night: false, themeTouched: false,
      message: '', errors: [], sending: false
    };
  }

  // =================================================================================== wiring

  _bind() {
    const on = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { this._click(); fn(e); });
    };
    on('btn-account', () => this.openAccount());
    on('btn-open-battles', () => this.openBattles());
    on('btn-close-account', () => this.ui.setScreen(this.accountReturnScreen || 'HOME'));
    on('btn-close-battles', () => this.ui.setScreen(this.battlesReturnScreen || 'HOME'));
    on('btn-account-to-battles', () => this.openBattles());
    on('btn-battles-new', () => this._openChallengeTab());
    on('btn-banner-battles', () => this.openBattles());

    // Tabs are scoped to their own screen: the shop and the garage use .shop-tab-btn too.
    document.querySelectorAll('#account-view .account-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        this._click();
        this.accountTab = tab.getAttribute('data-tab') || 'profile';
        this.renderAccount();
      });
    });
    document.querySelectorAll('#battles-view .battles-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        this._click();
        const next = tab.getAttribute('data-tab') || 'active';
        if (next === 'challenge') { this._openChallengeTab(); return; }
        this.battlesTab = next;
        this.renderBattles();
      });
    });

    // One delegated handler per screen for clicks, form submits and typing.
    for (const [id, handler] of [['account-main', (a, el) => this._accountAction(a, el)],
      ['account-side-note', (a, el) => this._accountAction(a, el)],
      ['battles-main', (a, el) => this._battlesAction(a, el)],
      ['battles-side-note', (a, el) => this._battlesAction(a, el)]]) {
      const root = document.getElementById(id);
      if (!root) continue;
      root.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el || el.disabled || !root.contains(el)) return;
        e.preventDefault();
        handler(el.dataset.action, el);
      });
      root.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target.closest('form[data-form]');
        if (form) handler('submit-' + form.dataset.form, form);
      });
      root.addEventListener('input', (e) => this._onInput(e));
      root.addEventListener('change', (e) => this._onChange(e));
    }

    // Typing in a form must not pan the city behind the screen (arrow keys) or steer the buggy.
    for (const id of ['account-view', 'battles-view']) {
      const view = document.getElementById(id);
      if (!view) continue;
      const stop = (e) => { if (e.target.closest('input, textarea, select')) e.stopPropagation(); };
      view.addEventListener('keydown', stop);
      view.addEventListener('keyup', stop);
    }
  }

  _subscribe() {
    const o = this.online;
    o.on('auth', () => { this.refreshChrome(); this._rerenderAccountIfChanged(); this._rerenderBattlesIfOpen(); });
    o.on('profile', () => { this.refreshChrome(); this._rerenderAccountLive(); this._renderBattlesTopbar(); });
    o.on('sync', () => { this.refreshChrome(); this._rerenderAccountLive(); });
    o.on('battles', () => { this.refreshChrome(); this._rerenderBattlesIfOpen(); });
    o.on('tokens', () => { if (this._isOpen('ACCOUNT') && this.accountTab === 'mcp') this._renderTokenList(); });
    o.on('error', () => { this._rerenderAccountLive(); });
    o.on('battle-result-sent', () => this._rerenderBattlesIfOpen());
  }

  _hideToast() {
    const toast = document.getElementById('ui-toast');
    if (!toast) return;
    clearTimeout(this.ui._toastTimer);
    toast.classList.remove('toast-show');
    toast.classList.add('hidden');
  }

  _click() {
    if (this.sound && this.sound.playClick) this.sound.playClick();
  }

  _isOpen(screen) {
    return this.ui.currentScreen === screen;
  }

  /** UIManager.setScreen calls this after switching: render the screen that just opened. */
  onScreen(screen) {
    if (screen === 'ACCOUNT') this.renderAccount();
    else if (screen === 'BATTLES') this.renderBattles();
    this._updateBanner();
  }

  openAccount(tab) {
    const cur = this.ui.currentScreen;
    if (cur !== 'ACCOUNT') this.accountReturnScreen = (cur === 'DESIGN' || cur === 'BATTLES') ? cur : 'HOME';
    if (tab) this.accountTab = tab;
    this.ui.hideBuildingInspector();
    this.ui.setScreen('ACCOUNT');
  }

  openBattles(tab) {
    const cur = this.ui.currentScreen;
    if (cur !== 'BATTLES') this.battlesReturnScreen = (cur === 'DESIGN') ? 'DESIGN' : 'HOME';
    if (tab) this.battlesTab = tab;
    this.ui.hideBuildingInspector();
    this.ui.setScreen('BATTLES');
  }

  // =================================================================================== chrome

  _syncState() {
    const o = this.online;
    if (!o.configured) return { status: 'offline', label: 'Offline build', detail: 'Online play is not configured in this build.' };
    if (!o.user) return { status: 'offline', label: 'Not signed in', detail: 'Playing offline: your city is saved in this browser.' };
    const s = o.sync || {};
    const label = { synced: 'Saved to cloud', syncing: 'Syncing…', offline: 'Offline', error: 'Sync problem' }[s.status] || 'Offline';
    return { status: s.status || 'offline', label, detail: s.detail || '' };
  }

  /** Account pill, cloud dot, dock badge, banner: cheap, called on every online event. */
  refreshChrome() {
    const o = this.online;
    const label = document.getElementById('account-pill-label');
    const dot = document.getElementById('account-cloud-dot');
    const pill = document.getElementById('btn-account');
    const sync = this._syncState();
    if (label) {
      let text = '👤 Sign in';
      if (o.configured && !o.authReady) text = '👤 Connecting…';
      else if (o.user && o.profile) text = `${o.profile.name} · 🏆${(o.profile.trophies || 0).toLocaleString()}`;
      else if (o.user && o.needsProfile) text = '👤 Pick a name';
      else if (o.user) text = '👤 Signing in…';
      label.textContent = text;   // textContent: the name is player input
    }
    if (dot) dot.className = `cloud-dot is-${sync.status}`;
    if (pill) pill.title = `${sync.label}${sync.detail ? ' - ' + sync.detail : ''}`;

    const badge = document.getElementById('battles-dock-badge');
    const n = this._needsActionCount();
    if (badge) {
      badge.textContent = String(n);
      badge.classList.toggle('hidden', n === 0);
    }
    const tabCount = document.getElementById('battles-tab-count');
    if (tabCount) {
      tabCount.textContent = String(n);
      tabCount.classList.toggle('hidden', n === 0);
    }
    this._updateBanner();
  }

  _needsActionCount() {
    return (this.online.battles || []).filter(v => v.needsAction).length;
  }

  // =================================================================================== tick

  /** UIManager's 400 ms interval: countdowns, the banner, an expired inline confirmation. */
  tick() {
    const now = this.online.serverNow ? this.online.serverNow() : Date.now();
    if (this._isOpen('BATTLES')) {
      document.querySelectorAll('#battles-main [data-countdown]').forEach(el => {
        const to = Number(el.dataset.countdown);
        const left = to - now;
        el.textContent = left > 0 ? fmtCountdown(left) : (el.dataset.zero || '0:00');
        el.classList.toggle('is-urgent', left > 0 && left <= 60000);
      });
      const sum = document.getElementById('ch-summary');
      if (sum && this.battlesTab === 'challenge' && this.ch.target) sum.innerHTML = this._challengeSummary();
    }
    if (this.confirmRevoke && Date.now() > this.confirmRevoke.until) {
      this.confirmRevoke = null;
      if (this._isOpen('ACCOUNT') && this.accountTab === 'mcp') this._renderTokenList();
    }
    this._updateBanner(now);
  }

  // =================================================================================== design banner

  /**
   * "🛡️ Battle vs <name> locks in mm:ss" over the Design Map while a battle is in its design
   * phase (the soonest lock wins), "⚔️ ... is live" while one can be attacked.
   */
  _updateBanner(now = this.online.serverNow ? this.online.serverNow() : Date.now()) {
    const banner = document.getElementById('battle-design-banner');
    const text = document.getElementById('battle-banner-text');
    if (!banner || !text) return;
    const list = this.online.battles || [];
    const designing = list.filter(v => v.phase === 'design' && Number.isFinite(v.startAtMs))
      .sort((a, b) => a.startAtMs - b.startAtMs);
    const live = list.filter(v => v.phase === 'fight' && v.canAttack);
    let msg = '';
    let mode = '';
    if (designing.length) {
      const v = designing[0];
      const left = v.startAtMs - now;
      const more = designing.length > 1 ? ` (+${designing.length - 1} more)` : '';
      msg = `🛡️ Battle vs ${v.opponentName} ${left > 0 ? `locks in ${fmtCountdown(left)}` : 'is locking now'}${more} — design here or ask your AI designer (MCP)`;
      mode = 'design';
    } else if (live.length) {
      const v = live[0];
      msg = `⚔️ Battle vs ${v.opponentName} is live — attack from BATTLES${live.length > 1 ? ` (+${live.length - 1} more)` : ''}`;
      mode = 'fight';
    }
    const show = !!msg && this.ui.currentScreen === 'DESIGN';
    banner.classList.toggle('hidden', !show);
    if (!show) return;
    if (text.textContent !== msg) text.textContent = msg;   // textContent: a player's name
    banner.classList.toggle('is-fight', mode === 'fight');
    const urgent = mode === 'design' && designing[0].startAtMs - now <= 60000;
    banner.classList.toggle('is-urgent', urgent);
  }

  // =================================================================================== ACCOUNT

  _accountViewKey() {
    const o = this.online;
    return [o.configured, o.authReady, !!o.user, o.needsProfile, o.profile ? o.profile.uid : ''].join('|');
  }

  _rerenderAccountIfChanged() {
    const key = this._accountViewKey();
    if (key === this._accountKey) { this._rerenderAccountLive(); return; }
    if (this._isOpen('ACCOUNT')) this.renderAccount();
  }

  /** Sync / profile changes: only views WITHOUT text fields re-render (typing is never cut off). */
  _rerenderAccountLive() {
    this._renderAccountChrome();
    if (!this._isOpen('ACCOUNT')) return;
    const o = this.online;
    if (this.accountTab === 'profile' && o.user && o.profile) this._renderAccountMain();
  }

  _rerenderBattlesIfOpen() {
    if (!this._isOpen('BATTLES')) return;
    // The challenge form holds typed text: it re-renders on its own actions only (unless the
    // player just signed out, when the whole tab turns into the sign-in prompt).
    const o = this.online;
    if (this.battlesTab === 'challenge' && o.user && o.profile && document.querySelector('#battles-main .online-card')) {
      this._renderBattlesChrome();
      return;
    }
    this.renderBattles();
  }

  renderAccount() {
    this._accountKey = this._accountViewKey();
    document.querySelectorAll('#account-view .account-tab-btn').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === this.accountTab);
    });
    this._renderAccountChrome();
    this._renderAccountMain();
  }

  _renderAccountChrome() {
    const badge = document.getElementById('account-sync-badge');
    const sync = this._syncState();
    if (badge) badge.innerHTML = `<span class="cloud-dot is-${sync.status}"></span><span>${esc(sync.label)}</span>`;
    const note = document.getElementById('account-side-note');
    if (note) {
      const o = this.online;
      note.innerHTML = `
        <span class="shop-th-badge">☁️ Cloud save</span>
        ${o.configured
          ? `<div class="account-note-status"><span class="cloud-dot is-${sync.status}"></span><b>${esc(sync.label)}</b></div>
             ${sync.detail ? `<div>${esc(sync.detail)}</div>` : ''}
             <div class="account-note-more">Your city saves in this browser first, then to your account in the background.</div>`
          : 'This build plays offline: your city, bank and garage are saved in this browser only.'}`;
    }
  }

  _renderAccountMain() {
    const main = document.getElementById('account-main');
    if (!main) return;
    this._copyTexts = {};
    main.innerHTML = this.accountTab === 'mcp' ? this._renderMcpTab() : this._renderProfileTab();
    if (this.accountTab === 'mcp') this._renderTokenList();
    // Passwords go back as a property, never into the markup (a re-render after a refused
    // sign-in keeps what was typed).
    main.querySelectorAll('input[type="password"][data-field]').forEach(input => {
      const [form, name] = input.dataset.field.split('.');
      if (this.forms[form] && this.forms[form][name]) input.value = this.forms[form][name];
    });
  }

  _field(form, name, label, type, opts = {}) {
    const key = `${form}.${name}`;
    const err = this.fieldErrors[key];
    const value = (this.forms[form] || {})[name] || '';
    return `
      <label class="online-field ${err ? 'has-error' : ''}">
        <span class="online-field-label">${label}</span>
        <input class="online-input" type="${type}" data-field="${key}" value="${type === 'password' ? '' : esc(value)}"
          ${opts.autocomplete ? `autocomplete="${opts.autocomplete}"` : ''} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}
          ${opts.maxlength ? `maxlength="${opts.maxlength}"` : ''} spellcheck="false">
        <span class="online-field-error" data-error-for="${key}">${esc(err || '')}</span>
      </label>`;
  }

  _formError(form) {
    const err = this.formErrors[form];
    const note = this.formNotes[form];
    return `${err ? `<div class="online-form-error">⚠️ ${esc(err)}</div>` : ''}${note ? `<div class="online-form-note">${esc(note)}</div>` : ''}`;
  }

  _renderProfileTab() {
    const o = this.online;
    if (!o.configured) return this._renderNotConfigured();
    if (!o.authReady) {
      return `<div class="online-stack"><div class="blueprint-card online-card online-center"><div class="online-spinner"></div>
        <div class="online-card-title">Connecting to your account…</div>
        <p class="online-dim">Your city is already loaded from this browser; the cloud link happens in the background.</p></div></div>`;
    }
    if (!o.user) return this._renderSignedOut();
    if (!o.profile && o.needsProfile) return this._renderClaimName();
    if (!o.profile) {
      return `<div class="online-stack"><div class="blueprint-card online-card online-center"><div class="online-spinner"></div>
        <div class="online-card-title">Setting up your commander…</div></div></div>`;
    }
    return this._renderProfileCard();
  }

  _renderNotConfigured() {
    return `
      <div class="online-stack">
        <div class="blueprint-card online-card">
          <div class="blueprint-header">
            <div class="blueprint-icon">🔌</div>
            <div><div class="blueprint-title">Online play is off in this build</div>
              <span class="online-chip chip-muted">OFFLINE BUILD</span></div>
          </div>
          <p class="online-p">Everything works offline: your city, bank and garage are saved in this browser. Turn online play on to get a cloud save, <b>battles</b> against other players and the <b>AI designer</b> (MCP).</p>
          <div class="blueprint-helps"><span class="helps-label">HOW TO TURN IT ON</span>
            <span><b>Try it locally</b> (no Firebase account): run <code>npm run emulators</code>, then <code>npm run dev:emu</code> and open that address.</span>
            <span><b>Real project:</b> create a Firebase project (Authentication: Email/Password + Google, Firestore), copy <code>.env.example</code> to <code>.env.local</code>, fill in the <code>VITE_FIREBASE_*</code> values and deploy <code>firestore.rules</code>.</span>
          </div>
          <p class="online-dim">Full guide: <code>docs/ONLINE.md</code> in the game folder (setup, architecture and the battle rules in <code>docs/BATTLES.md</code>).</p>
        </div>
      </div>`;
  }

  _renderSignedOut() {
    const b = (k) => this.busy.has(k);
    const anyBusy = b('sign-in') || b('sign-up') || b('google');
    return `
      <div class="online-intro">
        <div class="online-intro-title">Take your city online</div>
        <div class="online-dim">Sign in to save your city to the cloud, battle other commanders and let an AI design with you. A new account takes the city you have now; signing in to an existing account loads its city (this one is kept as a backup in this browser).</div>
      </div>
      <div class="online-auth-grid">
        <form class="blueprint-card online-card" data-form="sign-in" novalidate>
          <div class="online-card-title">🔑 Sign in</div>
          ${this._field('signIn', 'email', 'Email', 'email', { autocomplete: 'email', placeholder: 'you@example.com' })}
          ${this._field('signIn', 'password', 'Password', 'password', { autocomplete: 'current-password' })}
          ${this._formError('signIn')}
          <button type="submit" class="btn-primary online-wide" ${anyBusy ? 'disabled' : ''}>${b('sign-in') ? 'SIGNING IN…' : 'SIGN IN'}</button>
          <button type="button" class="online-link" data-action="reset-password" ${anyBusy ? 'disabled' : ''}>Forgot your password?</button>
        </form>
        <form class="blueprint-card online-card" data-form="sign-up" novalidate>
          <div class="online-card-title">🛡️ Create account</div>
          ${this._field('signUp', 'name', 'Commander name', 'text', { autocomplete: 'username', placeholder: '3-20 letters, digits, _ -', maxlength: 20 })}
          ${this._field('signUp', 'email', 'Email', 'email', { autocomplete: 'email', placeholder: 'you@example.com' })}
          ${this._field('signUp', 'password', 'Password (6+ characters)', 'password', { autocomplete: 'new-password' })}
          ${this._formError('signUp')}
          <button type="submit" class="btn-primary online-wide" ${anyBusy ? 'disabled' : ''}>${b('sign-up') ? 'CREATING…' : 'CREATE ACCOUNT'}</button>
        </form>
      </div>
      <div class="online-or"><span>or</span></div>
      <div class="online-google-row">
        <button type="button" class="btn-google" data-action="google" ${anyBusy ? 'disabled' : ''}>
          <span class="google-g">G</span> ${b('google') ? 'OPENING GOOGLE…' : 'Continue with Google'}
        </button>
        ${this._formError('google')}
      </div>`;
  }

  _renderClaimName() {
    const o = this.online;
    return `
      <div class="online-stack">
        <form class="blueprint-card online-card" data-form="claim" novalidate>
          <div class="online-card-title">🎖️ Pick your commander name</div>
          <p class="online-dim">Signed in as ${esc((o.user && o.user.email) || 'your account')}. Your name is how rivals find and challenge you.</p>
          ${this._field('claim', 'name', 'Commander name', 'text', { autocomplete: 'username', placeholder: '3-20 letters, digits, _ -', maxlength: 20 })}
          ${this._formError('claim')}
          <button type="submit" class="btn-primary online-wide" ${this.busy.has('claim') ? 'disabled' : ''}>${this.busy.has('claim') ? 'SAVING…' : 'SAVE NAME'}</button>
          <button type="button" class="online-link" data-action="sign-out">Sign out</button>
        </form>
      </div>`;
  }

  _renderProfileCard() {
    const o = this.online;
    const p = o.profile;
    const sync = this._syncState();
    const s = o.sync || {};
    const games = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
    const rate = games ? Math.round((p.wins / games) * 100) + '%' : '-';
    const th = this.online.townHall ? this.online.townHall() : p.townHall;
    const initial = esc((p.name || '?').trim().charAt(0).toUpperCase());
    const open = (o.battles || []).filter(v => ACTIVE_PHASES.has(v.phase)).length;
    const err = o.lastError && (o.lastError.scope === 'init' || o.lastError.scope === 'sync') && sync.status === 'error' ? o.lastError.message : '';
    return `
      <div class="online-stack">
        <div class="blueprint-card online-card profile-card">
          <div class="profile-head">
            <div class="profile-avatar">${initial}</div>
            <div class="profile-id">
              <div class="profile-name">${esc(p.name)}</div>
              <div class="online-dim">${esc((o.user && o.user.email) || '')}${o.user && o.user.providers && o.user.providers.includes('google.com') ? ' · Google' : ''}</div>
              <div class="profile-chips">
                <span class="online-chip chip-th">🏛️ Town Hall ${th}</span>
                <span class="online-chip chip-trophy">🏆 ${(p.trophies || 0).toLocaleString()} trophies</span>
              </div>
            </div>
          </div>
          <div class="profile-stats">
            <div class="profile-stat"><span class="label">Wins</span><span class="val is-win">${p.wins || 0}</span></div>
            <div class="profile-stat"><span class="label">Losses</span><span class="val is-loss">${p.losses || 0}</span></div>
            <div class="profile-stat"><span class="label">Draws</span><span class="val">${p.draws || 0}</span></div>
            <div class="profile-stat"><span class="label">Win rate</span><span class="val">${rate}</span></div>
          </div>
          <div class="profile-sync">
            <div class="profile-sync-row"><span class="cloud-dot is-${sync.status}"></span><b>Cloud save: ${esc(sync.label)}</b></div>
            <div class="online-dim">${esc(sync.detail || '')}${s.rev ? ` · version ${s.rev}` : ''}${s.lastSyncedAt ? ` · last saved ${fmtAgo(Number(s.lastSyncedAt))}` : ''}</div>
            ${err ? `<div class="online-form-error">⚠️ ${esc(err)}</div>` : ''}
          </div>
          <div class="garage-btn-row online-btn-row">
            <button class="btn-secondary" data-action="sync-now" ${this.busy.has('sync') ? 'disabled' : ''}>${this.busy.has('sync') ? 'SAVING…' : '☁️ SAVE NOW'}</button>
            <button class="btn-secondary" data-action="goto-battles">🏆 BATTLES${open ? ` (${open})` : ''}</button>
            <button class="btn-danger-soft online-signout" data-action="sign-out" ${this.busy.has('sign-out') ? 'disabled' : ''}>${this.busy.has('sign-out') ? 'SIGNING OUT…' : 'SIGN OUT'}</button>
          </div>
        </div>
        ${this._renderGuestBackupCard()}
        <div class="blueprint-card online-card">
          <div class="online-card-title">🤖 Design with AI</div>
          <p class="online-dim">Connect Claude (or any MCP client) to your city and ask it to lay out defenses. It can only move things around - never attack, buy, upgrade or spend.</p>
          <button class="btn-primary online-wide online-violet" data-action="goto-mcp">SET UP THE AI DESIGNER →</button>
        </div>
      </div>`;
  }

  /** The city played here as a guest before signing in replaced it (CloudSync kept it). */
  _renderGuestBackupCard() {
    const g = this.online.guestBackup ? this.online.guestBackup() : null;
    if (!g) return '';
    const busy = this.busy.has('restore-guest');
    const money = [`💰${(g.cash || 0).toLocaleString()}`, `⚙️${(g.iron || 0).toLocaleString()}`, `🪵${(g.wood || 0).toLocaleString()}`].join(' ');
    return `
        <div class="blueprint-card online-card guest-backup-card">
          <div class="online-card-title">🗂️ Your guest city is kept on this device</div>
          <p class="online-dim">Signing in loaded your account's city. The city you played here before signing in (Town Hall ${esc(String(g.townHall || 1))}, ${esc(String(g.buildings || 0))} buildings, ${esc(money)}) was not lost.
          Restoring it makes it your account's city; the city you have now is kept on this device instead.</p>
          <div class="garage-btn-row online-btn-row">
            <button class="btn-primary" data-action="restore-guest" ${busy ? 'disabled' : ''}>${busy ? 'RESTORING…' : '↩️ RESTORE GUEST CITY'}</button>
            <button class="btn-secondary" data-action="dismiss-guest" ${busy ? 'disabled' : ''}>KEEP MY ACCOUNT'S CITY</button>
          </div>
        </div>`;
  }

  // ----------------------------------------------------------------------------- AI designer tab

  _renderMcpTab() {
    const o = this.online;
    const intro = `
      <div class="blueprint-card online-card mcp-intro">
        <div class="blueprint-header">
          <div class="blueprint-icon">🤖</div>
          <div><div class="blueprint-title">AI Designer (MCP)</div><span class="online-chip chip-violet">DESIGN-ONLY ACCESS</span></div>
        </div>
        <p class="online-p">MCP (Model Context Protocol) lets an AI assistant such as <b>Claude Code</b> or <b>Claude Desktop</b> use tools. Give it a personal access token and it can read your city and change its <b>layout</b>: place, move and stow buildings, clear trees, draw and erase roads. Every edit is checked against the same rules as dragging in the game, and your open game shows it live.</p>
        <div class="mcp-cannot"><b>It can never</b> attack, buy, upgrade, collect, spend or touch your bank. Battles and everything else stay manual.</div>
      </div>`;
    if (!o.configured) {
      return `<div class="online-stack">${intro}
        <div class="blueprint-card online-card online-center">
          <div class="battles-lock-icon">🔌</div>
          <div class="online-card-title">Needs online play</div>
          <p class="online-dim">Tokens belong to an account, and this build plays offline. The Profile tab explains how to turn online play on (<code>docs/ONLINE.md</code>, AI setup in <code>docs/MCP.md</code>).</p>
          <button class="btn-secondary" data-action="goto-profile">👤 HOW TO TURN IT ON</button>
        </div></div>`;
    }
    if (!o.user || !o.profile) {
      return `<div class="online-stack">${intro}
        <div class="blueprint-card online-card online-center">
          <div class="online-card-title">Sign in to create a token</div>
          <p class="online-dim">Tokens belong to your account: the AI edits the city saved there.</p>
          <button class="btn-primary" data-action="goto-profile">👤 SIGN IN / CREATE ACCOUNT</button>
        </div></div>`;
    }
    const busy = this.busy.has('gen-token');
    const cfg = o.mcpConfig(this.reveal ? this.reveal.token : undefined);
    const gen = `
      <form class="blueprint-card online-card" data-form="gen-token" novalidate>
        <div class="online-card-title">🔑 Generate an access token</div>
        <p class="online-dim">Name it after the app you will paste it into, so you know which one to revoke.</p>
        <div class="mcp-gen-row">
          ${this._field('tokenLabel', 'label', 'Token label', 'text', { maxlength: 40, placeholder: 'e.g. Claude Code on my laptop' })}
          <button type="submit" class="btn-primary online-violet" ${busy ? 'disabled' : ''}>${busy ? 'GENERATING…' : 'GENERATE TOKEN'}</button>
        </div>
        ${this._formError('gen-token')}
      </form>`;
    const reveal = this.reveal ? this._renderReveal(cfg) : '';
    const configs = this._renderConfigs(cfg, !!this.reveal);
    const prompts = `
      <div class="blueprint-card online-card">
        <div class="online-card-title">💬 Things to ask your AI designer</div>
        <div class="mcp-prompts">
          ${cfg.examplePrompts.map((p, i) => {
            this._copyTexts['prompt' + i] = p;
            return `<div class="mcp-prompt"><span id="copy-src-prompt${i}" class="online-selectable">“${esc(p)}”</span>
              <button class="btn-secondary mcp-copy-btn" data-action="copy" data-copy="prompt${i}">COPY</button></div>`;
          }).join('')}
        </div>
      </div>`;
    const list = `
      <div class="blueprint-card online-card">
        <div class="online-card-title">🗝️ Your tokens</div>
        <div id="mcp-token-list"></div>
      </div>`;
    return `<div class="online-stack online-stack-wide">${intro}${reveal || gen}${configs}${list}${prompts}</div>`;
  }

  _renderReveal(cfg) {
    this._copyTexts.token = this.reveal.token;
    return `
      <div class="blueprint-card online-card mcp-reveal">
        <div class="online-card-title">✅ Token created: “${esc(this.reveal.label)}”</div>
        <div class="mcp-token-box">
          <code id="copy-src-token" class="online-selectable mcp-token">${esc(this.reveal.token)}</code>
          <button class="btn-primary online-violet" data-action="copy" data-copy="token">📋 COPY</button>
        </div>
        <div class="blueprint-lock">⚠️ This is the ONLY time the token is shown - the game never stores it. Keep it like a password; if it leaks, revoke it below. The commands below already contain it.</div>
        <button class="btn-secondary online-wide" data-action="hide-token">I'VE SAVED IT - HIDE TOKEN</button>
      </div>`;
  }

  _renderConfigs(cfg, withToken) {
    const blocks = [
      ['http', 'Claude Code - hosted server (HTTP, recommended)', 'Run in a terminal:', cfg.claudeCodeHttp],
      ['desktop', 'Claude Desktop - hosted server (claude_desktop_config.json)', 'Add to the config file (Settings > Developer), then restart Claude Desktop. Needs Node.js (npx runs the mcp-remote bridge):', cfg.claudeDesktopHttp],
      ['stdio', 'Claude Code - local server (stdio, for the project owner)', 'Needs this repo and Firebase admin credentials on your machine:', cfg.claudeCodeStdio],
      ['desktop-stdio', 'Claude Desktop - local server (stdio, for the project owner)', 'Needs this repo and Firebase admin credentials on your machine:', cfg.claudeDesktop]
    ];
    return `
      <div class="blueprint-card online-card">
        <div class="online-card-title">🔌 Connect your MCP client</div>
        <p class="online-dim">${withToken ? 'Your new token is filled in below.' : 'Generate a token above: it replaces <code>&lt;YOUR_TOKEN&gt;</code> in these snippets.'} Then ask your AI to call <code>get_city</code> first. Server: <code>${esc(cfg.serverUrl)}</code></p>
        ${blocks.map(([key, title, hint, text]) => {
          this._copyTexts['cfg-' + key] = text;
          return `
          <div class="mcp-config">
            <div class="mcp-config-head"><b>${esc(title)}</b><button class="btn-secondary mcp-copy-btn" data-action="copy" data-copy="cfg-${key}">COPY</button></div>
            <div class="online-dim mcp-config-hint">${esc(hint)}</div>
            <pre id="copy-src-cfg-${key}" class="mcp-pre online-selectable">${esc(text)}</pre>
          </div>`;
        }).join('')}
      </div>`;
  }

  _renderTokenList() {
    const box = document.getElementById('mcp-token-list');
    if (!box) return;
    const tokens = this.online.tokens || [];
    if (!tokens.length) {
      box.innerHTML = '<div class="online-empty-line">No tokens yet. Generate one above to connect an AI.</div>';
      return;
    }
    const now = Date.now();
    box.innerHTML = `
      <div class="token-row token-head"><span>Label</span><span>Created</span><span>Last used</span><span>Uses</span><span></span></div>
      ${tokens.map(t => {
        const confirming = this.confirmRevoke && this.confirmRevoke.hash === t.hash;
        const busy = this.busy.has('revoke:' + t.hash) || this.busy.has('delete:' + t.hash);
        let actions;
        if (t.revoked) {
          actions = `<span class="online-chip chip-muted">REVOKED</span>
            <button class="btn-secondary token-btn" data-action="delete-token" data-hash="${esc(t.hash)}" ${busy ? 'disabled' : ''}>Delete</button>`;
        } else if (confirming) {
          actions = `<button class="btn-danger token-btn" data-action="confirm-revoke" data-hash="${esc(t.hash)}" ${busy ? 'disabled' : ''}>${busy ? 'REVOKING…' : 'YES, REVOKE'}</button>
            <button class="btn-secondary token-btn" data-action="keep-token">Keep</button>`;
        } else {
          actions = `<span class="online-chip chip-ok">ACTIVE</span>
            <button class="btn-danger-soft token-btn" data-action="revoke-token" data-hash="${esc(t.hash)}">Revoke</button>`;
        }
        return `<div class="token-row ${t.revoked ? 'is-revoked' : ''}" data-token-row="${esc(t.hash)}">
          <span class="token-label">${esc(t.label || 'AI designer')}<small>${esc(t.hash.slice(0, 8))}…</small></span>
          <span><small class="token-k">Created</small>${Number.isFinite(t.createdAtMs) ? fmtWhen(t.createdAtMs, now) : '-'}</span>
          <span><small class="token-k">Last used</small>${t.lastUsedAtMs ? fmtAgo(t.lastUsedAtMs, now) : 'never'}</span>
          <span><small class="token-k">Uses</small>${t.uses || 0}</span>
          <span class="token-actions">${actions}</span>
        </div>`;
      }).join('')}`;
  }

  // ----------------------------------------------------------------------------- account actions

  _setBusy(key, on) {
    if (on) this.busy.add(key); else this.busy.delete(key);
  }

  /** Inline validation (no network): returns true when the form may be sent. */
  _validate(form) {
    const f = this.forms[form];
    const errs = {};
    if (form === 'signIn' || form === 'signUp') {
      const email = String(f.email || '').trim();
      if (!email) errs.email = 'Enter your email address.';
      else if (!EMAIL_RE.test(email)) errs.email = 'That email address does not look right.';
      if (!f.password) errs.password = 'Enter your password.';
      else if (form === 'signUp' && f.password.length < 6) errs.password = 'Use at least 6 characters.';
    }
    if (form === 'signUp' || form === 'claim') {
      const v = this.online.validateName(f.name);
      if (!String(f.name || '').trim()) errs.name = 'Pick a commander name.';
      else if (!v.ok) errs.name = v.message;
    }
    for (const k of Object.keys(this.fieldErrors)) if (k.startsWith(form + '.')) delete this.fieldErrors[k];
    for (const [k, m] of Object.entries(errs)) this.fieldErrors[`${form}.${k}`] = m;
    return Object.keys(errs).length === 0;
  }

  async _run(key, fn, { form, rerender = () => this._isOpen('ACCOUNT') && this._renderAccountMain() } = {}) {
    if (this.busy.has(key)) return undefined;
    this._setBusy(key, true);
    if (form) { delete this.formErrors[form]; delete this.formNotes[form]; }
    rerender();
    try {
      return await fn();
    } catch (e) {
      if (form) this.formErrors[form] = (e && e.message) || 'Something went wrong. Try again.';
      else this.ui.showToast(`⚠️ ${(e && e.message) || 'Something went wrong.'}`, 4200);
      if (this.sound && this.sound.playCrash) this.sound.playCrash(0.3);
      return undefined;
    } finally {
      this._setBusy(key, false);
      rerender();
    }
  }

  _accountAction(action, el) {
    const o = this.online;
    switch (action) {
      case 'submit-sign-in': {
        this._click();
        if (!this._validate('signIn')) { delete this.formErrors.signIn; this._renderAccountMain(); this._focusFirstError(); return; }
        const { email, password } = this.forms.signIn;
        this._run('sign-in', async () => {
          await o.signIn({ email, password });
          this.forms.signIn.password = '';
          this.ui.showToast('👋 Signed in - linking your city…', 3000);
        }, { form: 'signIn' });
        return;
      }
      case 'submit-sign-up': {
        this._click();
        if (!this._validate('signUp')) { delete this.formErrors.signUp; this._renderAccountMain(); this._focusFirstError(); return; }
        const { name, email, password } = this.forms.signUp;
        this._run('sign-up', async () => {
          await o.signUp({ name, email, password });
          this.forms.signUp.password = '';
          this.ui.showToast(`🛡️ Welcome, Commander ${o.validateName(name).name}! Your city is now saved to your account.`, 4200);
        }, { form: 'signUp' });
        return;
      }
      case 'submit-claim': {
        this._click();
        if (!this._validate('claim')) { delete this.formErrors.claim; this._renderAccountMain(); this._focusFirstError(); return; }
        this._run('claim', () => o.claimName(this.forms.claim.name), { form: 'claim' });
        return;
      }
      case 'google':
        this._click();
        this._run('google', () => o.signInWithGoogle(), { form: 'google' });
        return;
      case 'reset-password': {
        this._click();
        const email = String(this.forms.signIn.email || '').trim();
        delete this.formNotes.signIn;
        if (!EMAIL_RE.test(email)) {
          this.fieldErrors['signIn.email'] = 'Type your email above first, then press "Forgot your password?".';
          this._renderAccountMain();
          return;
        }
        this._run('reset', async () => {
          await o.sendPasswordReset(email);
          this.formNotes.signIn = `📧 Password reset email sent to ${email}.`;
        }, { form: 'signIn' });
        return;
      }
      case 'sign-out':
        this._click();
        this._run('sign-out', async () => {
          await o.signOut();
          this.reveal = null;
          this.ui.showToast('👋 Signed out. Your city stays saved in this browser.', 3600);
        });
        return;
      case 'sync-now':
        this._click();
        this._run('sync', async () => {
          const r = await o.syncNow();
          this.ui.showToast(r && r.conflict ? '☁️ A newer version was in the cloud: your changes were merged into it.' : '☁️ Your city is saved to your account.', 3000);
        });
        return;
      case 'restore-guest':
        this._click();
        this._run('restore-guest', () => o.restoreGuestCity());
        return;
      case 'dismiss-guest':
        this._click();
        o.dismissGuestBackup();
        this._renderAccountMain();
        return;
      case 'goto-battles':
        this._click();
        this.openBattles();
        return;
      case 'goto-mcp':
      case 'goto-profile':
        this._click();
        this.accountTab = action === 'goto-mcp' ? 'mcp' : 'profile';
        this.renderAccount();
        return;
      case 'submit-gen-token': {
        this._click();
        const label = String(this.forms.tokenLabel.label || '').trim() || 'AI designer';
        this._run('gen-token', async () => {
          const r = await o.generateToken(label);
          this.reveal = { token: r.token, hash: r.hash, label: r.label };
          this.ui.showToast('🔑 Token created - copy it now, it is shown only once.', 3600);
        }, { form: 'gen-token' });
        return;
      }
      case 'hide-token':
        this._click();
        this.reveal = null;
        this.forms.tokenLabel.label = '';
        this._renderAccountMain();
        return;
      case 'copy':
        this._copy(el.dataset.copy);
        return;
      case 'revoke-token':
        this._click();
        this.confirmRevoke = { hash: el.dataset.hash, until: Date.now() + 5000 };
        this._renderTokenList();
        return;
      case 'keep-token':
        this._click();
        this.confirmRevoke = null;
        this._renderTokenList();
        return;
      case 'confirm-revoke': {
        const hash = el.dataset.hash;
        this._click();
        this._run('revoke:' + hash, async () => {
          await o.revokeToken(hash);
          this.confirmRevoke = null;
          if (this.reveal && this.reveal.hash === hash) this.reveal = null;
          this.ui.showToast('🔒 Token revoked: the AI designer using it is locked out within 30 s.', 3600);
        }, { rerender: () => this._isOpen('ACCOUNT') && this.accountTab === 'mcp' && this._renderAccountMain() });
        return;
      }
      case 'delete-token': {
        const hash = el.dataset.hash;
        this._click();
        this._run('delete:' + hash, () => o.deleteToken(hash),
          { rerender: () => this._isOpen('ACCOUNT') && this.accountTab === 'mcp' && this._renderTokenList() });
        return;
      }
      default:
    }
  }

  _focusFirstError() {
    const el = document.querySelector('#account-main .online-field.has-error input');
    if (el) el.focus();
  }

  /** Copy to the clipboard; without clipboard access, select the text so Ctrl/⌘+C works. */
  async _copy(key) {
    const text = this._copyTexts[key];
    if (!text) return;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (e) { ok = false; }
    if (ok) {
      this.sound.playUpgrade && this.sound.playUpgrade();
      this.ui.showToast('📋 Copied to the clipboard.', 2200);
      const btn = document.querySelector(`[data-action="copy"][data-copy="${key}"]`);
      if (btn) {
        const was = btn.textContent;
        btn.textContent = 'COPIED ✓';
        setTimeout(() => { if (btn.isConnected) btn.textContent = was; }, 1600);
      }
      return;
    }
    const src = document.getElementById('copy-src-' + key);
    if (src) {
      const range = document.createRange();
      range.selectNodeContents(src);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    this.ui.showToast('📋 Selected - press Ctrl+C (⌘C on a Mac) to copy.', 3600);
  }

  // ----------------------------------------------------------------------------- typing

  _onInput(e) {
    const el = e.target;
    const key = el && el.dataset && el.dataset.field;
    if (!key) return;
    if (el.type === 'checkbox') return;          // the night toggle is read on 'change'
    const [form, name] = key.split('.');
    if (form === 'ch') {
      this.ch[name] = el.value;
      if (name === 'query') this._scheduleSearch();
      if (name === 'message') {
        const counter = document.getElementById('ch-message-count');
        if (counter) {
          counter.textContent = `${el.value.length} / ${BATTLE.MESSAGE_MAX}`;
          counter.classList.toggle('is-over', el.value.length > BATTLE.MESSAGE_MAX);
        }
      }
      return;
    }
    if (!this.forms[form]) return;
    this.forms[form][name] = el.value;
    // Typing fixes the field: clear its error line in place (no re-render, the caret stays).
    if (this.fieldErrors[key]) {
      delete this.fieldErrors[key];
      const label = el.closest('.online-field');
      if (label) label.classList.remove('has-error');
      const line = document.querySelector(`[data-error-for="${key}"]`);
      if (line) line.textContent = '';
    }
  }

  _onChange(e) {
    const el = e.target;
    const key = el && el.dataset && el.dataset.field;
    if (!key) return;
    if (key === 'ch.customAt') {
      this.ch.customAt = el.value;
      this.ch.presetId = el.value ? null : this.ch.presetId;
      this._autoNight();
      this.ch.errors = [];
      this._renderChallengeForm();
    } else if (key === 'ch.night') {
      this.ch.night = !!el.checked;
      this.ch.themeTouched = true;
      this._renderChallengeForm();
    } else if (key === 'signUp.name' || key === 'claim.name') {
      // Inline name check as soon as the field is left (no network).
      const [form] = key.split('.');
      const v = this.online.validateName(el.value);
      if (el.value.trim() && !v.ok) {
        this.fieldErrors[key] = v.message;
        const label = el.closest('.online-field');
        if (label) label.classList.add('has-error');
        const line = document.querySelector(`[data-error-for="${key}"]`);
        if (line) line.textContent = v.message;
      } else if (form) {
        delete this.fieldErrors[key];
      }
    }
  }

  // =================================================================================== BATTLES

  renderBattles() {
    document.querySelectorAll('#battles-view .battles-tab-btn').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === this.battlesTab);
    });
    this._renderBattlesChrome();
    const main = document.getElementById('battles-main');
    if (!main) return;
    const o = this.online;
    let html;
    if (!o.configured) html = this._renderBattlesLocked('offline');
    else if (!o.authReady) html = this._renderBattlesLocked('connecting');
    else if (!o.user || !o.profile) html = this._renderBattlesLocked('signed-out');
    else if (this.battlesTab === 'challenge') html = this._renderChallengeTab();
    else if (this.battlesTab === 'history') html = this._renderHistoryTab();
    else html = this._renderActiveTab();
    main.innerHTML = html;
    if (this.battlesTab === 'challenge' && o.user && o.profile && this.ch.players === null && !this.ch.loading && !this.ch.target) {
      this._loadPlayers();
    }
    this.tick();
  }

  _renderBattlesChrome() {
    this._renderBattlesTopbar();
    this.refreshChrome();
    const note = document.getElementById('battles-side-note');
    if (note) {
      note.innerHTML = `
        <span class="shop-th-badge">⚔️ How battles work</span>
        Both players design until the start time, then both cities lock. Each gets <b>one raid</b> on the other's locked city (${BATTLE.RAID_TIME_LIMIT_SECONDS / 60} min clock).
        Winner: more ⭐, then more destruction %, then the faster raid.
        <div class="battles-note-trophies">🏆 Win +${BATTLE.TROPHY_WIN} · Draw +${BATTLE.TROPHY_DRAW} · Loss ${BATTLE.TROPHY_LOSS}</div>
        Nobody raids: the battle is void (no trophies either way).
        Loot is paid like a practice raid; nobody's bank is raided.`;
    }
    const newBtn = document.getElementById('btn-battles-new');
    if (newBtn) newBtn.disabled = !(this.online.user && this.online.profile);
  }

  _renderBattlesTopbar() {
    const p = this.online.profile;
    const tr = document.getElementById('battles-trophies');
    if (tr) tr.textContent = p ? (p.trophies || 0).toLocaleString() : '-';
    const rec = document.getElementById('battles-record');
    if (rec) rec.textContent = p ? `${p.wins || 0}W · ${p.losses || 0}L · ${p.draws || 0}D` : (this.online.configured ? 'Not signed in' : 'Offline build');
  }

  _renderBattlesLocked(why) {
    if (why === 'connecting') {
      return `<div class="online-stack"><div class="blueprint-card online-card online-center"><div class="online-spinner"></div>
        <div class="online-card-title">Connecting…</div></div></div>`;
    }
    const offline = why === 'offline';
    return `
      <div class="online-stack">
        <div class="blueprint-card online-card online-center battles-locked">
          <div class="battles-lock-icon">🔒</div>
          <div class="online-card-title">${offline ? 'Battles need online play' : 'Sign in to battle'}</div>
          <p class="online-dim">${offline
            ? 'This build plays offline, so there is nobody to challenge yet. Online play adds accounts, a cloud save and battles - see <code>docs/ONLINE.md</code>. Practice raids on your own city still work from ATTACK CITY.'
            : 'Battles are between commanders with an account: sign in (or create one in a few seconds) and your city comes with you.'}</p>
          <div class="battles-lock-steps">
            <span>🎯 Challenge a rival</span><span>🛠️ Both design</span><span>🔒 Cities lock</span><span>⚔️ Raid each other</span><span>🏆 Stars decide</span>
          </div>
          <button class="btn-primary" data-action="goto-account">${offline ? '👤 HOW TO TURN IT ON' : '👤 SIGN IN / CREATE ACCOUNT'}</button>
        </div>
      </div>`;
  }

  // ----------------------------------------------------------------------------- active

  _renderActiveTab() {
    const list = (this.online.battles || []).filter(v => ACTIVE_PHASES.has(v.phase));
    const rank = (v) => (v.canAttack ? 0 : v.canAccept ? 1 : v.phase === 'fight' ? 2 : v.phase === 'design' ? 3 : v.phase === 'pending' ? 4 : 5);
    list.sort((a, b) => rank(a) - rank(b) || (b.createdAtMs || 0) - (a.createdAtMs || 0));
    const err = this.online.lastError && this.online.lastError.scope === 'battles' ? this.online.lastError.message : '';
    if (!list.length) {
      return `
        ${err ? `<div class="online-form-error">⚠️ ${esc(err)}</div>` : ''}
        <div class="online-stack"><div class="blueprint-card online-card online-center">
          <div class="battles-lock-icon">⚔️</div>
          <div class="online-card-title">No active battles</div>
          <p class="online-dim">Challenge a rival now (instant) or book a fight for tonight (scheduled, played at night).</p>
          <button class="btn-primary btn-attack-glow" data-action="goto-challenge">🎯 CHALLENGE SOMEONE</button>
        </div></div>`;
    }
    return `${err ? `<div class="online-form-error">⚠️ ${esc(err)}</div>` : ''}
      <div class="blueprint-items-grid battles-grid">${list.map(v => this._battleCard(v)).join('')}</div>`;
  }

  _chips(v) {
    const [label, cls] = PHASE_CHIP[v.phase] || [v.phase, 'chip-muted'];
    return `<div class="battle-chips">
      <span class="online-chip ${cls}">${label}</span>
      <span class="online-chip">${v.mode === 'scheduled' ? '📅 Scheduled' : '⚡ Instant'}</span>
      <span class="online-chip ${v.theme === 'night' ? 'chip-night' : 'chip-day'}">${v.theme === 'night' ? '🌙 Night' : '☀️ Day'}</span>
      ${v.opponentTownHall ? `<span class="online-chip chip-th">🏛️ TH ${v.opponentTownHall}</span>` : ''}
    </div>`;
  }

  _countdown(label, to, zero) {
    if (!Number.isFinite(to)) return '';
    return `<div class="battle-countdown"><span class="cd-label">${label}</span>
      <span class="cd-val" data-countdown="${to}" data-zero="${esc(zero || '0:00')}">--:--</span></div>`;
  }

  _scoreLine(r, none) {
    if (!r) return `<span class="online-dim">${none}</span>`;
    return `${starsHtml(r.stars)} <b>${Math.round(r.percentage)}%</b> <span class="online-dim">in ${fmtRaidTime(r.durationSec)} · ${esc(OUTCOME_WORD[r.outcome] || r.outcome)}</span>`;
  }

  /**
   * My raid that has started (attempt) but has no result yet (view.myRaid): running on this page,
   * in another tab or on another device - or lost with its page (reload, closed tab: no raid).
   */
  _myRaidText(v) {
    if (v.resultPending) return '⏳ result waiting to be sent (retrying)';
    if (this._attackingId === v.id || v.myRaid === 'here') return '⏳ raid in progress…';
    if (v.myRaid === 'tab') return '⏳ raid in progress in another tab';
    if (v.myRaid === 'away') return '⏳ raid in progress on another device';
    if (v.myRaid === 'lost') return '<span class="is-bad">✗ Raid interrupted (page closed) - counts as no raid</span>';
    return '<span class="is-bad">✗ Raid interrupted (no result)</span>';
  }

  /** The opponent's raid without a result: `none` (never started), running, or past its clock. */
  _theirRaidText(v, none) {
    if (!v.theyAttempted) return none;
    return v.theirRaidOver ? 'raid interrupted (no result)' : 'raiding now…';
  }

  _battleCard(v) {
    const name = esc(v.opponentName);
    const vid = esc(v.id);   // the doc id comes from the challenger's client: never raw markup
    const now = this.online.serverNow();
    const busy = (k) => this.busy.has(`${k}:${v.id}`);
    const lines = [];
    let countdown = '';
    let actions = '';
    const when = Number.isFinite(v.startAtMs) ? fmtWhen(v.startAtMs, now) : '';

    if (v.phase === 'pending') {
      if (v.mode === 'scheduled') lines.push(['Starts', `${when} · fight window ${BATTLE.SCHEDULED_FIGHT_SECONDS / 3600} h`]);
      else lines.push(['Design time', `${Math.round((v.designSeconds || 0) / 60)} min after accepting · fight window ${BATTLE.INSTANT_FIGHT_SECONDS / 60} min`]);
      if (v.iAmChallenger) {
        countdown = this._countdown('Expires in', v.respondByMs, 'expired');
        lines.push(['Status', `Waiting for ${name} to answer`]);
        actions = `<button class="btn-secondary" data-action="cancel" data-id="${vid}" ${busy('cancel') ? 'disabled' : ''}>${busy('cancel') ? 'CANCELLING…' : 'CANCEL CHALLENGE'}</button>`;
      } else {
        countdown = this._countdown('Answer within', v.respondByMs, 'expired');
        actions = `<div class="garage-btn-row">
          <button class="btn-primary battle-accept" data-action="accept" data-id="${vid}" ${busy('accept') ? 'disabled' : ''}>${busy('accept') ? 'ACCEPTING…' : '✅ ACCEPT'}</button>
          <button class="btn-secondary" data-action="decline" data-id="${vid}" ${busy('decline') ? 'disabled' : ''}>${busy('decline') ? '…' : '✋ DECLINE'}</button></div>`;
      }
    } else if (v.phase === 'design') {
      countdown = this._countdown('Cities lock in', v.startAtMs, 'locking…');
      if (v.mode === 'instant') {
        lines.push(['You', v.iAmReady ? '<span class="is-ok">✓ Ready</span>' : 'designing…']);
        lines.push([name, v.theyAreReady ? '<span class="is-ok">✓ Ready</span>' : 'designing…']);
      } else {
        lines.push(['Starts', when]);
      }
      lines.push(['Tip', 'Design by hand, or let your AI designer (MCP) do it - what stands at the lock is what gets raided.']);
      const ready = v.mode !== 'instant' ? ''
        : v.canReady
          ? `<button class="btn-primary" data-action="ready" data-id="${vid}" ${busy('ready') ? 'disabled' : ''}>${busy('ready') ? 'SAVING…' : '✓ I\'M READY'}</button>`
          : `<button class="btn-secondary" disabled title="Waiting for ${name}">✓ YOU'RE READY</button>`;
      actions = `<div class="garage-btn-row"><button class="btn-secondary battle-design-btn" data-action="design">🗺️ DESIGN MY CITY</button>${ready}</div>`;
    } else if (v.phase === 'fight') {
      countdown = this._countdown('Fight ends in', v.fightEndsAtMs, 'closing…');
      const attacking = this._attackingId === v.id || busy('attack');
      const mine = v.myResult ? this._scoreLine(v.myResult)
        : v.iAttempted ? this._myRaidText(v)
          : v.attackClosed ? 'not used - too late to start one' : 'not used yet';
      lines.push(['Your raid', mine]);
      lines.push([`${name}'s raid`, this._scoreLine(v.theirResult, this._theirRaidText(v, 'not yet'))]);
      // At the start only each player's own game locks its city; an offline player's city is
      // locked by the other game LOCK_GRACE later - ATTACK waits for it meanwhile.
      lines.push(['Cities', v.bothLocked ? '🔒 both locked'
        : v.myCityLocked ? `🔒 yours · waiting for ${name}'s city to lock (up to ${BATTLE.LOCK_GRACE_SECONDS} s)` : 'locking…']);
      if (v.canAttack) {
        actions = `<button class="btn-primary btn-attack-glow battle-attack-btn" data-action="attack" data-id="${vid}" ${attacking ? 'disabled' : ''}>
          ${attacking ? '⏳ PREPARING RAID…' : `⚔️ ATTACK <span class="battle-attack-name">${name}</span>`}</button>`;
      } else if (v.myResult) {
        actions = `<div class="battle-done-line">✓ Your score is in. ${v.theirResult ? '' : `Waiting for ${name}.`}</div>`;
      } else if (v.attackClosed) {
        actions = `<div class="battle-done-line">⌛ Too late to start a raid: the fight window closes in under ${BATTLE.ATTACK_CUTOFF_SECONDS} s.</div>`;
      }
    } else if (v.phase === 'resolving') {
      // Only while a started raid still owes its result; otherwise the verdict is fixed.
      countdown = v.awaitingResult ? this._countdown('Results close in', v.resultGraceEndsAtMs, 'deciding…') : '';
      lines.push(['Your raid', v.myResult || !v.iAttempted ? this._scoreLine(v.myResult, 'no raid') : this._myRaidText(v)]);
      lines.push([`${name}'s raid`, this._scoreLine(v.theirResult, this._theirRaidText(v, 'no raid'))]);
      // Every started raid is past its clock: the verdict only waits in case a finished raid's
      // result is still queued on the raider's device (it may be sent until the countdown ends).
      actions = `<div class="battle-done-line">🏁 ${!v.awaitingResult ? 'Deciding the winner…'
        : v.raidsOver ? 'The winner is decided when the results close - in case a result is still on its way.'
          : 'The winner is decided when the raid in progress ends.'}</div>`;
    }

    const msg = v.message ? `<div class="battle-message">“${esc(v.message)}”<small> - ${v.iAmChallenger ? 'you' : name}</small></div>` : '';
    return `
      <div class="blueprint-card battle-card phase-${v.phase} ${v.needsAction ? 'needs-action' : ''}" data-battle="${vid}">
        <div>
          <div class="blueprint-header">
            <div class="battle-avatar">${esc((v.opponentName || '?').trim().charAt(0).toUpperCase())}</div>
            <div class="battle-head-text">
              <div class="blueprint-title">${v.iAmChallenger ? 'You challenged' : 'Challenged by'} <span class="battle-opp">${name}</span></div>
              ${this._chips(v)}
            </div>
          </div>
          ${msg}
          ${countdown}
          <div class="battle-lines">${lines.map(([k, val]) => `<div class="battle-line"><span>${k}</span><span>${val}</span></div>`).join('')}</div>
        </div>
        <div class="battle-actions">${actions}</div>
      </div>`;
  }

  // ----------------------------------------------------------------------------- history

  _renderHistoryTab() {
    // Newest first by the date each row shows (a finished battle: its start; the rest: when sent),
    // so a scheduled battle played after later-created instant ones is not listed below them.
    const shown = (v) => (v.phase === 'finished' ? (v.startAtMs || v.createdAtMs) : v.createdAtMs) || 0;
    const list = (this.online.battles || []).filter(v => !ACTIVE_PHASES.has(v.phase)).sort((a, b) => shown(b) - shown(a));
    if (!list.length) {
      return `<div class="online-stack"><div class="blueprint-card online-card online-center">
        <div class="battles-lock-icon">📜</div><div class="online-card-title">No finished battles yet</div>
        <p class="online-dim">Your wins, losses and trophy changes appear here.</p></div></div>`;
    }
    const now = this.online.serverNow();
    return `<div class="history-list">${list.map(v => {
      const name = esc(v.opponentName);
      const date = fmtWhen(v.startAtMs || v.createdAtMs, now);
      if (v.phase !== 'finished') {
        const why = v.phase === 'declined' ? (v.iAmChallenger ? `${name} declined` : 'You declined')
          : v.phase === 'cancelled' ? (v.iAmChallenger ? 'You cancelled' : `${name} withdrew it`)
            : 'Nobody answered in time';
        return `<div class="history-row is-muted">
          <div class="history-verdict chip-muted">${(PHASE_CHIP[v.phase] || [v.phase])[0]}</div>
          <div class="history-main"><div class="history-title">vs <span class="battle-opp">${name}</span></div>
            <div class="online-dim">${why} · ${v.mode === 'scheduled' ? '📅 Scheduled' : '⚡ Instant'} · ${esc(fmtWhen(v.createdAtMs, now))}</div></div>
          <div class="history-trophies online-dim">no trophies</div>
        </div>`;
      }
      if (v.isVoid) {
        return `<div class="history-row is-muted">
          <div class="history-verdict chip-muted">VOID</div>
          <div class="history-main"><div class="history-title">vs <span class="battle-opp">${name}</span> <span class="online-dim">· ${date} · ${v.mode === 'scheduled' ? '📅' : '⚡'} ${v.theme === 'night' ? '🌙' : '☀️'}</span></div>
            <div class="online-dim">Void - nobody attacked</div></div>
          <div class="history-trophies online-dim">no trophies</div>
        </div>`;
      }
      const verdict = v.isDraw ? ['🤝 DRAW', 'is-draw'] : v.iWon ? ['🏆 VICTORY', 'is-win'] : ['💀 DEFEAT', 'is-loss'];
      const d = v.trophyDelta || 0;
      // A loss at 0 trophies takes nothing (the floor): say so instead of a "-20" that never happened.
      const floored = v.settled && d === 0 && (v.trophyDeltaNominal || 0) < 0;
      return `<div class="history-row ${verdict[1]}">
        <div class="history-verdict ${verdict[1]}">${verdict[0]}</div>
        <div class="history-main">
          <div class="history-title">vs <span class="battle-opp">${name}</span> <span class="online-dim">· ${date} · ${v.mode === 'scheduled' ? '📅' : '⚡'} ${v.theme === 'night' ? '🌙' : '☀️'}</span></div>
          <div class="history-scores">
            <div class="history-score"><span class="history-who">You</span>${this._scoreLine(v.myResult, 'no raid')}</div>
            <div class="history-score"><span class="history-who">${name}</span>${this._scoreLine(v.theirResult, 'no raid')}</div>
          </div>
        </div>
        <div class="history-trophies ${floored ? 'online-dim' : d >= 0 ? 'is-up' : 'is-down'}">${floored ? '±0' : `${d >= 0 ? '+' : ''}${d}`} 🏆${floored ? '<small>already at 0</small>' : v.settled ? '' : '<small>adding…</small>'}</div>
      </div>`;
    }).join('')}</div>`;
  }

  // ----------------------------------------------------------------------------- challenge

  _renderChallengeTab() {
    if (this.ch.target) return `<div id="ch-form-host">${this._challengeFormHtml()}</div>`;
    return `
      <div class="online-stack online-stack-wide">
        <div class="blueprint-card online-card">
          <div class="online-card-title">🎯 Find a rival</div>
          <label class="online-field">
            <span class="online-field-label">Search commander names</span>
            <input class="online-input" type="search" data-field="ch.query" value="${esc(this.ch.query)}" placeholder="Type the start of a name…" spellcheck="false" autocomplete="off">
          </label>
          <div id="battles-player-list">${this._playerListHtml()}</div>
        </div>
      </div>`;
  }

  _playerListHtml() {
    const c = this.ch;
    if (c.loading) return '<div class="online-empty-line"><span class="online-spinner is-small"></span> Looking…</div>';
    if (c.error) return `<div class="online-form-error">⚠️ ${esc(c.error)}</div>`;
    if (!c.players) return '';
    if (!c.players.length) {
      return `<div class="online-empty-line">${c.query.trim() ? `Nobody's name starts with “${esc(c.query.trim())}”.` : 'No other commanders yet. Invite a friend to create an account!'}</div>`;
    }
    const heading = c.query.trim() ? 'Search results' : 'Recent rivals and players online lately';
    return `<div class="online-list-head">${heading}</div>
      <div class="player-list">${c.players.map(p => `
        <div class="player-row">
          <div class="battle-avatar">${esc((p.name || '?').charAt(0).toUpperCase())}</div>
          <div class="player-info">
            <div class="player-name">${esc(p.name)} <span class="online-dot ${p.online ? 'is-on' : ''}" title="${p.online ? 'Online now' : 'Offline'}"></span>
              ${p.recentOpponent ? '<span class="online-chip chip-violet">RECENT RIVAL</span>' : ''}</div>
            <div class="online-dim">🏛️ TH ${p.townHall || 1} · 🏆 ${(p.trophies || 0).toLocaleString()} · ${p.wins || 0}W ${p.losses || 0}L ${p.draws || 0}D${p.online ? '' : ` · seen ${fmtAgo(p.lastSeenMs)}`}</div>
          </div>
          <button class="btn-primary btn-attack-glow player-challenge-btn" data-action="pick-player" data-uid="${esc(p.uid)}">⚔️ CHALLENGE</button>
        </div>`).join('')}</div>`;
  }

  /**
   * Every way into the Challenge tab (tab, NEW CHALLENGE, the empty state's button) lands on a
   * fresh player list - who is online now, recent rivals first - unless a form is half filled.
   */
  _openChallengeTab() {
    this.battlesTab = 'challenge';
    if (!this.ch.target) {
      this.ch.players = null;
      this.ch.query = '';
      this.ch.error = '';
    }
    this.renderBattles();
  }

  _renderPlayerList() {
    const box = document.getElementById('battles-player-list');
    if (box) box.innerHTML = this._playerListHtml();
  }

  _scheduleSearch() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this._loadPlayers(), 280);
  }

  async _loadPlayers() {
    const seq = ++this._searchSeq;
    const q = this.ch.query.trim();
    this.ch.loading = true;
    this.ch.error = '';
    this._renderPlayerList();
    try {
      const rows = q ? await this.online.searchPlayers(q) : await this.online.recentPlayers();
      if (seq !== this._searchSeq) return;
      this.ch.players = rows || [];
    } catch (e) {
      if (seq !== this._searchSeq) return;
      this.ch.players = [];
      this.ch.error = (e && e.message) || 'Could not load players.';
    }
    this.ch.loading = false;
    this._renderPlayerList();
  }

  /** The chosen start (ms) of the form's battle, or null. */
  _chosenStart() {
    const c = this.ch;
    if (c.mode === 'instant') return this.online.serverNow() + c.designSeconds * 1000;
    if (c.presetId) {
      const p = this.online.schedulePresets().find(x => x.id === c.presetId);
      return p && p.available ? p.startAt : null;
    }
    if (c.customAt) {
      const t = new Date(c.customAt).getTime();
      return Number.isFinite(t) ? t : null;
    }
    return null;
  }

  /** Night theme follows the start time until the player flips the toggle themselves. */
  _autoNight() {
    if (this.ch.themeTouched) return;
    const start = this._chosenStart();
    this.ch.night = start !== null ? isNightAt(start) : false;
  }

  _challengeInput() {
    const c = this.ch;
    const input = {
      opponentUid: c.target ? c.target.uid : '',
      challengerUid: this.online.user ? this.online.user.uid : undefined,
      mode: c.mode,
      theme: c.night ? 'night' : 'day',
      message: c.message.trim() ? c.message.trim() : undefined
    };
    if (c.mode === 'instant') input.designSeconds = c.designSeconds;
    else input.startAtMs = this._chosenStart();
    return input;
  }

  _challengeSummary() {
    const c = this.ch;
    const now = this.online.serverNow();
    const name = esc(c.target ? c.target.name : '');
    if (c.mode === 'instant') {
      const d = c.designSeconds;
      return `⚡ When ${name} accepts (within ${BATTLE.INSTANT_RESPOND_SECONDS / 60} min), you both get <b>${d ? `${d / 60} min` : 'no time'}</b> to design${d ? '' : ' - the cities lock at once'}. Then a <b>${BATTLE.INSTANT_FIGHT_SECONDS / 60} min</b> fight window, one ${BATTLE.RAID_TIME_LIMIT_SECONDS / 60}-min raid each · ${c.night ? '🌙 night' : '☀️ day'} theme.`;
    }
    const start = this._chosenStart();
    if (start === null) return '📅 Pick a start time.';
    return `📅 Starts <b>${esc(fmtWhen(start, now))}</b> (in ${fmtCountdown(start - now)}). ${name} must accept at least a minute before. You both design until then; the fight window is <b>${BATTLE.SCHEDULED_FIGHT_SECONDS / 3600} h</b> · ${c.night ? '🌙 night' : '☀️ day'} theme.`;
  }

  _renderChallengeForm() {
    const host = document.getElementById('ch-form-host');
    if (host) host.innerHTML = this._challengeFormHtml();
  }

  _challengeFormHtml() {
    const c = this.ch;
    const t = c.target;
    const now = this.online.serverNow();
    const presets = this.online.schedulePresets();
    const minAt = toLocalInput(now + (BATTLE.SCHEDULED_MIN_LEAD_SECONDS + 60) * 1000);
    const maxAt = toLocalInput(now + BATTLE.SCHEDULED_MAX_LEAD_SECONDS * 1000 - 60000);
    // Commitments only (BattleService._openCount): design/fight + challenges I sent.
    const openCount = (this.online.battles || []).filter(v => v.phase === 'design' || v.phase === 'fight' || (v.phase === 'pending' && v.iAmChallenger)).length;
    const atCap = openCount >= BATTLE.MAX_OPEN_BATTLES;
    const modeBtn = (m, icon, title, sub) => `
      <button type="button" class="ch-mode ${c.mode === m ? 'active' : ''}" data-action="ch-mode" data-mode="${m}">
        <span class="ch-mode-icon">${icon}</span><span class="ch-mode-title">${title}</span><span class="ch-mode-sub">${sub}</span></button>`;
    const designChips = BATTLE.INSTANT_DESIGN_OPTIONS.map(s => `
      <button type="button" class="ch-chip ${c.designSeconds === s ? 'active' : ''}" data-action="ch-design" data-seconds="${s}">${s ? `${s / 60} min` : 'None'}</button>`).join('');
    const presetChips = presets.map(p => `
      <button type="button" class="ch-chip ${c.presetId === p.id ? 'active' : ''}" data-action="ch-preset" data-preset="${p.id}" ${p.available ? '' : `disabled title="${esc(p.reason || 'not available')}"`}>
        ${p.night ? '🌙' : '☀️'} ${esc(p.label)}${p.available ? '' : `<small>${esc(p.reason || '')}</small>`}</button>`).join('');
    const errors = c.errors.length ? `<div class="online-form-error">⚠️ ${c.errors.map(esc).join(' ')}</div>` : '';
    return `
      <div class="online-stack online-stack-wide">
        <form class="blueprint-card online-card ch-form" data-form="challenge" novalidate>
          <div class="ch-target">
            <button type="button" class="btn-secondary ch-back" data-action="ch-back">← Players</button>
            <div class="battle-avatar">${esc((t.name || '?').charAt(0).toUpperCase())}</div>
            <div class="player-info">
              <div class="player-name">Challenge <span class="battle-opp">${esc(t.name)}</span></div>
              <div class="online-dim">🏛️ TH ${t.townHall || 1} · 🏆 ${(t.trophies || 0).toLocaleString()} · ${t.wins || 0}W ${t.losses || 0}L ${t.draws || 0}D</div>
            </div>
          </div>

          <div class="ch-section-label">WHEN</div>
          <div class="ch-modes">
            ${modeBtn('instant', '⚡', 'INSTANT', 'Fight as soon as they accept')}
            ${modeBtn('scheduled', '📅', 'SCHEDULED', 'Book a time, e.g. tonight 21:00')}
          </div>

          ${c.mode === 'instant' ? `
            <div class="ch-section-label">DESIGN TIME AFTER THEY ACCEPT</div>
            <div class="ch-chips">${designChips}</div>
            <div class="online-dim ch-hint">Both press READY to start early.</div>` : `
            <div class="ch-section-label">START TIME</div>
            <div class="ch-chips">${presetChips}</div>
            <label class="online-field ch-custom">
              <span class="online-field-label">…or pick any time (10 min to 7 days ahead)</span>
              <input class="online-input" type="datetime-local" data-field="ch.customAt" value="${esc(c.presetId ? '' : c.customAt)}" min="${minAt}" max="${maxAt}">
            </label>`}

          <label class="ch-toggle">
            <input type="checkbox" data-field="ch.night" ${c.night ? 'checked' : ''}>
            <span class="ch-switch"></span>
            <span><b>🌙 Night theme</b> <span class="online-dim">- the raids are played at night (${c.themeTouched ? 'your choice' : 'auto: on for 19:00-06:00'})</span></span>
          </label>

          <label class="online-field">
            <span class="online-field-label">Message (optional) <span id="ch-message-count" class="ch-count">${c.message.length} / ${BATTLE.MESSAGE_MAX}</span></span>
            <textarea class="online-input ch-message" data-field="ch.message" rows="2" maxlength="${BATTLE.MESSAGE_MAX + 20}" placeholder="Trash talk welcome.">${esc(c.message)}</textarea>
          </label>

          <div id="ch-summary" class="ch-summary">${this._challengeSummary()}</div>
          ${atCap ? `<div class="blueprint-lock">You have ${openCount} open battles - the most at once is ${BATTLE.MAX_OPEN_BATTLES}. Finish or cancel one first.</div>` : ''}
          ${errors}
          <button type="submit" class="btn-primary btn-attack-glow online-wide ch-send" ${c.sending || atCap ? 'disabled' : ''}>${c.sending ? 'SENDING…' : '⚔️ SEND CHALLENGE'}</button>
        </form>
      </div>`;
  }

  // ----------------------------------------------------------------------------- battle actions

  _battlesAction(action, el) {
    const o = this.online;
    const id = el.dataset.id;
    switch (action) {
      case 'goto-account':
        this._click();
        this.openAccount('profile');
        return;
      case 'goto-challenge':
        this._click();
        this._openChallengeTab();
        return;
      case 'design':
        this._click();
        this.ui.setScreen('DESIGN');
        return;
      case 'accept':
        this._click();
        this._battleRun('accept', id, async () => {
          await o.acceptBattle(id);
          const v = o.battle(id);
          const next = v && v.mode === 'scheduled' && Number.isFinite(v.startAtMs)
            ? `The battle starts ${fmtWhen(v.startAtMs, o.serverNow())} - design your city until then.`
            : v && v.designSeconds ? `Design your city: it locks in ${Math.round(v.designSeconds / 60)} min.` : 'The fight starts now.';
          this.ui.showToast(`✅ Accepted! ${next}`, 4200);
        });
        return;
      case 'decline':
        this._click();
        this._battleRun('decline', id, async () => { await o.declineBattle(id); this.ui.showToast('✋ Challenge declined.', 2600); });
        return;
      case 'cancel':
        this._click();
        this._battleRun('cancel', id, async () => { await o.cancelBattle(id); this.ui.showToast('Challenge cancelled.', 2600); });
        return;
      case 'ready':
        this._click();
        this._battleRun('ready', id, async () => {
          const r = await o.setReady(id);
          const v = o.battle(id);
          this.ui.showToast(r && r.startsNow ? '🔒 Both ready - the cities lock now. Get ready to attack!' : `✓ Ready. Waiting for ${v ? v.opponentName : 'your rival'}…`, 3600);
        });
        return;
      case 'attack':
        this._attack(id);
        return;
      case 'pick-player': {
        this._click();
        const p = (this.ch.players || []).find(x => x.uid === el.dataset.uid);
        if (!p) return;
        this.ch.target = p;
        this.ch.errors = [];
        this._autoNight();
        this.renderBattles();
        return;
      }
      case 'ch-back':
        this._click();
        this.ch.target = null;
        this.ch.errors = [];
        this.renderBattles();
        return;
      case 'ch-mode':
        this._click();
        this.ch.mode = el.dataset.mode === 'scheduled' ? 'scheduled' : 'instant';
        if (this.ch.mode === 'scheduled' && !this.ch.presetId && !this.ch.customAt) {
          const first = this.online.schedulePresets().find(p => p.available);
          this.ch.presetId = first ? first.id : null;
        }
        this.ch.errors = [];
        this._autoNight();
        this._renderChallengeForm();
        return;
      case 'ch-design':
        this._click();
        this.ch.designSeconds = Number(el.dataset.seconds) || 0;
        this._autoNight();
        this._renderChallengeForm();
        return;
      case 'ch-preset':
        this._click();
        this.ch.presetId = el.dataset.preset;
        this.ch.customAt = '';
        this.ch.errors = [];
        this._autoNight();
        this._renderChallengeForm();
        return;
      case 'submit-challenge':
        this._sendChallenge();
        return;
      default:
    }
  }

  async _battleRun(kind, id, fn) {
    const key = `${kind}:${id}`;
    if (this.busy.has(key)) return;
    this.busy.add(key);
    this._rerenderBattlesIfOpen();
    try {
      await fn();
    } catch (e) {
      if (this.sound && this.sound.playCrash) this.sound.playCrash(0.3);
      this.ui.showToast(`⚠️ ${(e && e.message) || 'That did not work. Try again.'}`, 4200);
    } finally {
      this.busy.delete(key);
      this._rerenderBattlesIfOpen();
    }
  }

  async _sendChallenge() {
    const c = this.ch;
    if (c.sending || !c.target) return;
    this._click();
    const input = this._challengeInput();
    const check = validateChallenge(input, this.online.serverNow());
    if (!check.ok) {
      c.errors = check.errors;
      if (this.sound && this.sound.playCrash) this.sound.playCrash(0.3);
      this._renderChallengeForm();
      return;
    }
    c.errors = [];
    c.sending = true;
    this._renderChallengeForm();
    try {
      await this.online.createChallenge({
        opponentUid: input.opponentUid, mode: input.mode, designSeconds: input.designSeconds,
        startAtMs: input.startAtMs, theme: input.theme, message: input.message
      });
      if (this.sound && this.sound.playUpgrade) this.sound.playUpgrade();
      this.ui.showToast(`⚔️ Challenge sent to ${c.target.name}!`, 3600);
      this.ch = this._freshChallenge();   // next time: a fresh list (the new rival is now "recent")
      this.battlesTab = 'active';
      this.renderBattles();
    } catch (e) {
      c.sending = false;
      c.errors = [(e && e.message) || 'Could not send the challenge.'];
      if (this.sound && this.sound.playCrash) this.sound.playCrash(0.3);
      if (this.ch === c) this._renderChallengeForm();
    }
  }

  /**
   * ATTACK: lock both cities if needed, fetch the opponent's locked city and start the battle
   * raid in the arena (OnlineController.attackBattle). The attempt is burnt at the breach, the
   * result is sent (and retried) when the raid ends, and RETURN TO CITY - or ABORT RECON -
   * comes back to BATTLES.
   */
  async _attack(id) {
    if (this._attackingId) return;          // a double click, or a raid already running
    const v = this.online.battle(id);
    if (!v || !v.canAttack) {
      const left = v && Number.isFinite(v.fightEndsAtMs) ? Math.max(0, Math.ceil((v.fightEndsAtMs - this.online.serverNow()) / 1000)) : 0;
      this.ui.showToast(v && (v.iAttempted || v.myResult) ? '⚔️ You already used your raid in this battle.'
        : v && v.attackClosed ? `⌛ Too late: the fight window closes in ${left} s - not enough time to scout and pick a gate.`
          : 'This battle cannot be attacked right now.', 3600);
      this._rerenderBattlesIfOpen();
      return;
    }
    const garage = this.game.garageManager;
    if (garage && garage.getLoadout && garage.getLoadout().length === 0) {
      if (this.sound && this.sound.playCrash) this.sound.playCrash(0.3);
      this.ui.showToast('Equip at least one card before attacking', 3200);
      this.ui.openGarage('cards');
      // Its ATTACK button raids this battle (not a practice raid) and BACK returns here.
      this.ui.garageBattle = { id, name: v.opponentName };
      this.ui.garageReturnScreen = 'BATTLES';
      if (this.ui.renderGarage) this.ui.renderGarage();
      return;
    }
    this._click();
    this._attackingId = id;
    this._rerenderBattlesIfOpen();
    try {
      const started = this.online.attackBattle(id, {
        onExit: () => {
          this._attackingId = null;
          // AttackManager shows the home screen right after onExit: open BATTLES after that.
          setTimeout(() => this.openBattles('active'), 0);
        }
      });
      await started;
      // A toast from before the raid ("battle is live") must not sit over the recon banner.
      this._hideToast();
    } catch (e) {
      this._attackingId = null;
      if (this.sound && this.sound.playCrash) this.sound.playCrash(0.3);
      this.ui.showToast(`⚠️ ${(e && e.message) || 'Could not start the raid.'}`, 4200);
      this._rerenderBattlesIfOpen();
    }
  }
}
