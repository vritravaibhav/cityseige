import { isOnlineConfigured, onlineConfig, loadFirebase } from './firebase.js';
import { AuthService, friendlyError, codedError, cleanCommanderName } from './AuthService.js';
import { CloudSync } from './CloudSync.js';
import { BattleService } from './BattleService.js';
import { McpTokens } from './McpTokens.js';
import { BATTLE, schedulePresets, isNightAt, battlePhase } from '../shared/battleRules.js';

/**
 * OnlineController - the one object the game (and the online screens) talk to about online play.
 * It owns the four services (AuthService, CloudSync, BattleService, McpTokens), glues them to the
 * running game, and is exposed as `window.citySiege.online` (GameApp.online).
 *
 * Offline-first: constructing it never touches the network. init() loads Firebase only when the
 * build is configured (VITE_FIREBASE_API_KEY, or VITE_FIREBASE_EMULATORS=true); otherwise the
 * controller stays in `configured:false` and every action rejects with a friendly
 * "not configured" error, so the ACCOUNT screen can explain how to set Firebase up.
 *
 * =================================================================================================
 * PUBLIC API  (for src/ui/OnlineUI.js - everything a screen needs; all rejections are Error objects
 *              whose `.message` is ready to show and whose `.code` is the Firebase/our code)
 * =================================================================================================
 *
 * State (read any time; the matching event fires on every change)
 *   configured : boolean              Firebase is configured for this build
 *   config     : { projectId, emulators, mcpServerUrl, ... }   (no secrets in here)
 *   authReady  : boolean              the first auth state has arrived (show "Sign in" only after)
 *   user       : null | { uid, email, displayName, providers[] }
 *   profile    : null | { uid, name, nameLower, townHall, trophies, wins, losses, draws, createdAtMs, lastSeenMs }
 *   needsProfile : boolean            signed in but no commander name yet -> call claimName(name)
 *   sync       : { status: 'offline'|'syncing'|'synced'|'error', detail, rev, lastSyncedAt, pendingRemote, linked }
 *   battles    : BattleView[]         newest first (see below)
 *   tokens     : TokenRow[]           newest first (see below)
 *   lastError  : null | { scope, message, code, at }
 *   toasts     : boolean (default true) the controller itself shows the spec's toasts (incoming
 *                challenge, accepted, started, result, finished, AI designer change). Set false
 *                to show them yourself from the 'battle-event' / 'city-replaced' events.
 *   status()   : one object with all of the above (for a first render)
 *
 * Events:  const off = online.on(name, fn);  off();     (online.off(name, fn) works too)
 *   'auth'           { configured, ready, user, profile, needsProfile }   sign in / out / profile
 *   'profile'        profile                                            live (trophies after settle)
 *   'sync'           sync (as above)                                    cloud status dot
 *   'linked'         { uid, how: 'uploaded'|'downloaded', rev }         first link finished
 *   'account-switch' { from, to, backupSuffix }                         local save backed up, reload follows
 *   'city-replaced'  { by: 'mcp'|'game', reason: 'remote'|'link'|'conflict'|'restore', summary, rev,
 *                      credited: { count, cash, iron, wood }, city: { buildings, roads, townHall },
 *                      rebase: null | { kept, purchases, keptJobs, keptLevels, droppedJobs, ... } }
 *                    rebase = this device's unsynced changes were merged onto the cloud city
 *                    (cityMerge.rebaseCity report); `kept` = something of ours survived it
 *                    (the controller has ALREADY refreshed the existing screens - see _refreshUi)
 *   'pushed'         { rev, reason }                                    a local change reached the cloud
 *   'battles'        { list: BattleView[], needsAction: n }             badge = needsAction
 *   'battle-event'   { type, battle: BattleView, message }  type: 'incoming'|'accepted'|'declined'|
 *                    'cancelled'|'started'|'opponent-result'|'finished'
 *   'battle-result-sent' { battleId, ok, already?, queued?, error? }    for the result modal
 *   'tokens'         TokenRow[]
 *   'error'          { scope: 'init'|'auth'|'sync'|'battles'|'tokens', message, code }
 *
 * Account
 *   init() / whenReady()                          -> Promise (called by main.js; safe to call again)
 *   signUp({ email, password, name })             -> Promise   (claims the commander name too)
 *   signIn({ email, password })                   -> Promise
 *   signInWithGoogle()                            -> Promise   (popup; first time picks a name from Google)
 *   signOut()                                     -> Promise   (flushes the cloud save first; local save stays)
 *   claimName(name)                               -> Promise   (create the profile / rename)
 *   sendPasswordReset(email)                      -> Promise
 *   validateName(name)                            -> { ok, name, nameLower, message? }   (no network)
 *   syncNow()                                     -> Promise<{ok|skipped|conflict|error}> push now
 *   guestBackup()                                 -> null | { townHall, buildings, roads, cash, iron, wood, gems, at }
 *       the city this device played as a guest before signing in replaced it (kept on the device)
 *   restoreGuestCity()                            -> Promise   make that city the account's city
 *   dismissGuestBackup()                          stop offering it (the save stays on the device)
 *
 * Battles
 *   BattleView = { id, mode, theme, status, phase: 'pending'|'expired'|'declined'|'cancelled'|
 *     'design'|'fight'|'resolving'|'finished', message, opponentUid, opponentName, opponentTownHall,
 *     myName, myTownHall, iAmChallenger, designSeconds, createdAtMs, acceptedAtMs, respondByMs,
 *     startAtMs, fightEndsAtMs, resultGraceEndsAtMs, iAmReady, theyAreReady, myCityLocked,
 *     theirCityLocked, bothLocked, iAttempted, theyAttempted, myResult, theirResult (null |
 *     { stars, percentage, destroyed, total, outcome, durationSec, loot, finishedAtMs }), winner,
 *     iWon, isDraw, isVoid (nobody raided: no trophies), trophyDelta (what settle moved, else the
 *     nominal step), trophyDeltaNominal, settled, canAccept, canDecline, canCancel, canReady,
 *     canDesign, canAttack (not in the last ATTACK_CUTOFF s), attackClosed, myAttemptStartedAtMs,
 *     theirAttemptStartedAtMs, myRaid ('here'|'tab'|'lost'|'away'|'over': where my started raid
 *     without a result runs), theirRaidOver, raidsOver, awaitingResult, resultPending, needsAction,
 *     countdownTo (ms, server clock), countdownLabel }
 *     The list is recomputed (a 'battles' event) at every moment the clock changes a view too
 *     (battleRules.nextChangeAt: phase boundaries, the attack cutoff, a raid clock running out).
 *   Countdowns: remaining = view.countdownTo - online.serverNow().
 *   createChallenge({ opponentUid, mode:'instant'|'scheduled', designSeconds (0|120|300|600),
 *                     startAtMs, theme?:'day'|'night', message? })        -> Promise<battleId>
 *   acceptBattle(id) / declineBattle(id) / cancelBattle(id)              -> Promise
 *   setReady(id)                                  -> Promise<{ startsNow }>   (instant only)
 *   attackBattle(id, { onExit }?)                 -> Promise<{ battle, snapshot, opponentName, theme }>
 *       onExit(result|null) fires once when the home city is back (RETURN TO CITY / ABORT RECON).
 *       starts the PvP raid through AttackManager.startBattleRaid (spec 8): burns the attempt
 *       at the breach and sends the result when the raid ends (queued + retried if offline).
 *   battle(id)                                    -> BattleView | null
 *   searchPlayers(prefix) / recentPlayers()       -> Promise<PlayerRow[]>
 *       PlayerRow = { uid, name, townHall, trophies, wins, losses, draws, lastSeenMs, online, recentOpponent? }
 *   schedulePresets()                             -> [{ id, label, startAt, night, available, reason? }]
 *   isNightAt(ms) / BATTLE                        battleRules helpers for the forms
 *   serverNow()                                   -> ms, local clock corrected to the server's
 *   Lower level (tests / advanced): online.battleService.{ensureSnapshots, beginAttempt,
 *   startAttempt, submitResult, resolveIfDue, settle}
 *
 * AI designer (MCP) tokens
 *   TokenRow = { hash, label, createdAtMs, lastUsedAtMs, uses, revoked, scope, kind: 'token'|'oauth', appHost }
 *     kind 'oauth' = an app connected by signing in (ChatGPT...): revoke/delete work the same
 *   getOAuthRequest(id)                            -> Promise<null | { id, clientName, redirectHost, finishUrl,
 *                                                     expiresAtMs }>   the CONNECT screen's request (null = gone)
 *   approveOAuthRequest(id)                        -> Promise<finishUrl>  records "I approve" (rules check who)
 *   generateToken(label)                          -> Promise<{ token, hash, label }>  token shown ONCE
 *   listTokens()                                  -> Promise<TokenRow[]>
 *   revokeToken(hash) / deleteToken(hash)         -> Promise
 *   mcpConfig(token?)                             -> { serverUrl, serverPath, env, claudeCodeStdio,
 *                                                     claudeCodeHttp, claudeDesktopHttp, claudeDesktop,
 *                                                     examplePrompts[] }
 * =================================================================================================
 */

const EXAMPLE_PROMPTS = [
  'Call get_city, then fortify my city for tonight\'s battle: put my turrets where they cover the gates and keep the Town Hall deep inside.',
  'Tidy my city: connect every building to a road and clear the trees that are in the way.',
  'Place everything in my inventory where it helps defence most, then run validate_design and fix what it reports.',
  'Show me the ASCII map and list my weakest defence kinds.'
];

export class OnlineController {
  /** @param {object} game the GameApp (window.citySiege) */
  constructor(game) {
    this.game = game;
    this.configured = isOnlineConfigured();
    this.config = onlineConfig();
    this.fb = null;
    this.authService = null;
    this.cloudSync = null;
    this.battleService = null;
    this.mcpTokens = null;

    this.authReady = !this.configured;
    this.user = null;
    this.profile = null;
    this.needsProfile = false;
    this.sync = {
      status: 'offline',
      detail: this.configured ? 'Not signed in - playing offline' : 'Online play is not configured in this build',
      rev: 0, lastSyncedAt: null, pendingRemote: false, linked: false
    };
    this.battles = [];
    this.tokens = [];
    this.lastError = null;
    this.toasts = true;
    this.clockOffsetMs = 0;
    this.rules = { BATTLE, schedulePresets, isNightAt, battlePhase };
    this.BATTLE = BATTLE;

    this._handlers = new Map();
    this._linkedUid = null;
    this._ready = null;
  }

  // ---------------------------------------------------------------- events

  on(name, fn) {
    if (!this._handlers.has(name)) this._handlers.set(name, new Set());
    this._handlers.get(name).add(fn);
    return () => this.off(name, fn);
  }

  off(name, fn) {
    const set = this._handlers.get(name);
    if (set) set.delete(fn);
  }

  _emit(name, payload) {
    if (name === 'tokens') this.tokens = payload;
    const set = this._handlers.get(name);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(payload); } catch (e) { console.error(`[online] '${name}' handler failed`, e); }
    }
  }

  _toast(message, duration = 3600) {
    if (!this.toasts || !message) return;
    const ui = this.game && this.game.uiManager;
    if (ui && ui.showToast) ui.showToast(message, duration);
  }

  _error(scope, err) {
    const e = friendlyError(err);
    this.lastError = { scope, message: e.message, code: e.code, at: Date.now() };
    this._emit('error', { scope, message: e.message, code: e.code });
  }

  /** A scope works again (e.g. the battles listener delivered): drop its banner. */
  _clearError(scope) {
    if (this.lastError && this.lastError.scope === scope) this.lastError = null;
  }

  // ---------------------------------------------------------------- boot

  /** Load Firebase (configured builds only) and start following the auth state. Never throws. */
  init() {
    if (!this._ready) this._ready = this._init();
    return this._ready;
  }

  whenReady() {
    return this.init();
  }

  async _init() {
    if (!this.configured) return false;
    try {
      this.fb = await loadFirebase();
    } catch (e) {
      console.warn('[online] Firebase failed to load', e);
      this.authReady = true;
      this._onSyncStatus({ ...this.sync, status: 'error', detail: 'Could not load the online services: ' + friendlyError(e).message });
      this._error('init', e);
      this._emit('auth', this.authState());
      this._ready = null;   // a later init() may retry (e.g. the chunk failed on a flaky network)
      return false;
    }
    const deps = { fb: this.fb, game: this.game, controller: this };
    this.authService = new AuthService(this.fb, { townHall: () => this.townHall() });
    this.cloudSync = new CloudSync(deps);
    this.battleService = new BattleService(deps);
    this.mcpTokens = new McpTokens(deps);
    this._installGameHooks();
    this.authService.onAuth((s) => this._onAuthState(s));
    this.authService.start();
    return true;
  }

  /**
   * Economy and garage saves are the bank half of the cloud save: wrap their save() from the
   * outside (the classes stay untouched) so every bank change schedules the debounced push.
   * During an account switch the wrappers also stop any write to the keys being wiped.
   * A save that moved the bank itself (a purchase, an upgrade's cost, a collect, a gem finish)
   * pushes the city at once: the other half of that value (the item, the job, the emptied
   * producer) lives in the city doc, and a remote edit landing in the debounce window would race
   * it. Inventory-only saves (a road tile drawn, a building placed) keep the debounce.
   */
  _installGameHooks() {
    const self = this;
    const bankKey = (e) => [e.cash, e.iron, e.wood, e.gems, e.vehicleLives].join('|');
    const wrap = (obj, { economy = false } = {}) => {
      if (!obj || typeof obj.save !== 'function' || obj.save.__online) return;
      const original = obj.save;
      let lastBank = economy ? bankKey(obj) : '';
      const wrapped = function (...args) {
        if (self.cloudSync && self.cloudSync.resetting) return undefined;
        const r = original.apply(this, args);
        if (self.cloudSync) {
          self.cloudSync.scheduleBankPush();
          const moved = economy && bankKey(this) !== lastBank;
          if (economy) lastBank = bankKey(this);
          // holdings (inventory / storage) live in the city doc
          if (moved) self.cloudSync.pushSoon('economy');
          else self.cloudSync.schedulePush();
        }
        return r;
      };
      wrapped.__online = true;
      obj.save = wrapped;
    };
    wrap(this.game.economyManager, { economy: true });
    wrap(this.game.garageManager);
  }

  // ---------------------------------------------------------------- auth glue

  authState() {
    return { configured: this.configured, ready: this.authReady, user: this.user, profile: this.profile, needsProfile: this.needsProfile };
  }

  _onAuthState(s) {
    const uid = s.user ? s.user.uid : null;
    if (this._linkedUid && this._linkedUid !== uid) this._teardown();
    this.user = s.user;
    this.profile = s.profile;
    this.needsProfile = s.needsProfile;
    this.authReady = s.ready;
    if (uid && s.profile && this._linkedUid !== uid) {
      this._linkedUid = uid;
      this.cloudSync.link(s.user, s.profile);
      this.battleService.start(uid);
      this.mcpTokens.start(uid);
    }
    if (s.profile && this.cloudSync) this.cloudSync.name = s.profile.name;
    this._emit('auth', this.authState());
    if (s.profile) this._emit('profile', s.profile);
  }

  _teardown() {
    this._linkedUid = null;
    if (this.cloudSync) this.cloudSync.unlink();
    if (this.battleService) this.battleService.stop();
    if (this.mcpTokens) this.mcpTokens.stop();
    this.battles = [];
    this._emit('battles', { list: [], needsAction: 0 });
    this._emit('tokens', []);
  }

  _need(name) {
    if (!this.configured) throw codedError('not-configured');
    if (!this[name]) throw codedError('unavailable', 'Still connecting to the online services. Try again in a moment.');
    return this[name];
  }

  async signUp(opts) { await this.init(); return this._need('authService').signUp(opts); }
  async signIn(opts) { await this.init(); return this._need('authService').signIn(opts); }
  async signInWithGoogle() { await this.init(); return this._need('authService').signInWithGoogle(); }
  async claimName(name) { await this.init(); return this._need('authService').claimName(name); }
  async sendPasswordReset(email) { await this.init(); return this._need('authService').sendPasswordReset(email); }
  validateName(name) { return cleanCommanderName(name); }

  async signOut() {
    await this.init();
    const auth = this._need('authService');
    // Last chance to send a waiting change while we still have credentials.
    if (this.cloudSync && this.cloudSync.linked) {
      try { await this.cloudSync.flush(); } catch (e) { /* the local save keeps it */ }
    }
    return auth.signOut();
  }

  async syncNow() {
    await this.init();
    return this._need('cloudSync').flush();
  }

  // ---------------------------------------------------------------- sync glue

  _onSyncStatus(state) {
    this.sync = state;
    this._emit('sync', state);
  }

  /** The game's Town Hall level (1..12). */
  townHall() {
    const bm = this.game && this.game.buildingManager;
    const th = bm && bm.getTownHallLevel ? bm.getTownHallLevel() : 1;
    return Math.max(1, Math.min(12, Math.round(Number(th)) || 1));
  }

  /** Now, on the server's clock (battle phases are judged by it). */
  serverNow() {
    return Date.now() + this.clockOffsetMs;
  }

  _setClockOffset(ms) {
    // Sub-quarter-second differences are measurement noise (network latency).
    this.clockOffsetMs = Math.abs(ms) < 250 ? 0 : Math.round(ms);
  }

  /** CloudSync applied a city from the cloud: refresh what the screens show, then tell listeners. */
  _onCityReplaced(info) {
    this._refreshUi(info);
    const bm = this.game.buildingManager;
    const city = {
      buildings: bm.buildings.filter(b => !b.isMainGate).length,
      roads: bm.roadNetwork ? bm.roadNetwork.roads.size : 0,
      townHall: this.townHall()
    };
    const payload = { ...info, city };
    this._emit('city-replaced', payload);
    const c = info.credited || {};
    const paid = c.count ? ` (+${[c.cash && `💰${c.cash}`, c.iron && `⚙️${c.iron}`, c.wood && `🪵${c.wood}`].filter(Boolean).join(' ') || '0'} banked from stowed output)` : '';
    // The cloud city arrived while this device had changes it had not saved yet: they were
    // rebased onto it (CloudSync), so say so - the player saw their city jump.
    const r = info.rebase;
    const refunded = r && r.droppedJobs && r.droppedJobs.length
      ? ` ${r.droppedJobs.length === 1 ? 'An upgrade' : `${r.droppedJobs.length} upgrades`} on a building it removed ${r.droppedJobs.length === 1 ? 'was' : 'were'} refunded.` : '';
    // A building placed here whose tile the change took: its unit (and the levels paid for it) is
    // back in the inventory - say so, or the player finds it missing only at the battle lock.
    const nBack = (r && r.returnedToInventory) || 0;
    const back = nBack
      ? ` ${nBack === 1 ? 'A building you placed here no longer fits and is' : `${nBack} buildings you placed here no longer fit and are`} back in your inventory: place ${nBack === 1 ? 'it' : 'them'} again.` : '';
    const kept = (r && r.kept ? ' Your own changes here were kept.' : '') + back + refunded;
    // A sign-in that loads the account's city is not news from the AI designer, even when the
    // last change stored in the cloud was one of its edits.
    if (info.reason === 'restore') {
      this._toast('☁️ Your guest city is back and is now saved to your account.', 4200);
    } else if (info.reason === 'link') {
      const guest = this.guestBackup();
      this._toast('☁️ Signed in: your city was loaded from your account.' + kept +
        (guest ? ' The city you played here as a guest is kept on this device (ACCOUNT › Restore).' : ''), guest ? 6000 : 3600);
    } else if (info.by === 'mcp') {
      // The summary has no full stop ("placed Spike Trap at (0,0)"): end it before the sentences
      // that follow, or the toast reads as one run-on line.
      const head = `${info.summary || 'your city layout was changed'}${paid}`;
      this._toast(`🤖 AI designer: ${head}${kept && !/[.!?]$/.test(head) ? '.' : ''}${kept}`, back ? 7000 : 5200);
    } else if (info.reason === 'conflict') {
      this._toast('☁️ Your city was changed on another device at the same time: merged with your changes here.' + back + refunded, back ? 6000 : 4200);
    } else {
      this._toast('☁️ Your city was updated from another device.' + kept, 3600);
    }
  }

  // ---------------------------------------------------------------- guest city kept at sign-in

  /**
   * The city this device played as a guest before the account's city replaced it at sign-in, or
   * null: { townHall, buildings, roads, cash, iron, wood, gems, at }.
   */
  guestBackup() {
    return this.cloudSync ? this.cloudSync.guestBackup() : null;
  }

  /** Make the kept guest city the account's city (the account's current one is kept locally). */
  async restoreGuestCity() {
    await this.init();
    return this._need('cloudSync').restoreGuestBackup();
  }

  /** Stop offering the guest city (its save stays on the device). */
  dismissGuestBackup() {
    if (this.cloudSync) this.cloudSync.dismissGuestBackup();
    this._emit('sync', this.sync);
  }

  /**
   * The city was rebuilt from outside (like a template undo): drop everything that still holds
   * the old building objects and re-render what depends on the city, with the existing
   * UIManager methods. A UIManager.onCityReplaced(info), if the online UI adds one, runs last.
   */
  _refreshUi(info) {
    const ui = this.game.uiManager;
    const grid = this.game.gridSystem;
    try {
      if (grid) {
        grid.dragBuilding = null;
        grid.dragOrigin = null;
        grid.isPointerDown = false;
        grid.selectedBuilding = null;
      }
      if (!ui) return;
      if (ui.hideBuildingInspector) ui.hideBuildingInspector();
      const screen = ui.currentScreen;
      if (grid && screen === 'DESIGN') grid.setMode('design_select');
      else if (grid && screen === 'HOME') grid.setMode('home');
      if (screen === 'DESIGN' && typeof document !== 'undefined') {
        document.querySelectorAll('.left-tools-dock .tool-btn').forEach(b => b.classList.remove('active'));
        const select = document.getElementById('btn-design-select');
        if (select) select.classList.add('active');
        document.querySelectorAll('.inv-card').forEach(c => c.classList.remove('active-placement'));
      }
      if (ui.renderDesignInventory) ui.renderDesignInventory();
      if (ui.updateRoadBadge) ui.updateRoadBadge();
      if (ui._updateUndoPresetBtn) ui._updateUndoPresetBtn();
      if (screen === 'SHOP' && ui.renderShopCatalog) ui.renderShopCatalog();
      if (screen === 'GARAGE' && ui.renderGarage) ui.renderGarage();
      if (typeof ui.onCityReplaced === 'function') ui.onCityReplaced(info);
    } catch (e) {
      console.warn('[online] screen refresh after a cloud change failed', e);
    }
  }

  // ---------------------------------------------------------------- battles glue

  _onBattles(list) {
    this.battles = list;
    this._emit('battles', { list, needsAction: list.filter(v => v.needsAction).length });
  }

  _battleEvent(ev) {
    this._emit('battle-event', ev);
    // "attack from BATTLES" means nothing to a player who is mid-raid already.
    const am = this.game.attackManager;
    if (ev.type === 'started' && am && am.state && am.state !== 'IDLE') return;
    this._toast(ev.message, 4200);
  }

  /** A result that failed at the end of the raid got through on a retry. */
  _onResultDelivered(battleId, r) {
    this._emit('battle-result-sent', { battleId, ...r });
    const am = this.game.attackManager;
    if (am && am.state === 'RESULT' && am.setBattleResultStatus) am.setBattleResultStatus('sent');
  }

  battle(id) {
    return this.battleService ? this.battleService.get(id) : null;
  }

  async createChallenge(opts) { await this.init(); return this._need('battleService').createChallenge(opts); }
  async acceptBattle(id) { await this.init(); return this._need('battleService').accept(id); }
  async declineBattle(id) { await this.init(); return this._need('battleService').decline(id); }
  async cancelBattle(id) { await this.init(); return this._need('battleService').cancel(id); }
  async setReady(id) { await this.init(); return this._need('battleService').setReady(id); }
  async searchPlayers(prefix) { await this.init(); return this._need('battleService').searchPlayers(prefix); }
  async recentPlayers() { await this.init(); return this._need('battleService').recentPlayers(); }
  schedulePresets() { return schedulePresets(new Date(this.serverNow())); }
  isNightAt(ms) { return isNightAt(ms); }

  /**
   * Attack the opponent's locked city (spec 8). Needs AttackManager.startBattleRaid (the arena).
   * The attempt is burnt at the breach (onAttemptStart), the result is sent the moment the raid
   * ends (onResult resolves to the send outcome for the result modal).
   */
  async attackBattle(id, { onExit = null } = {}) {
    await this.init();
    const svc = this._need('battleService');
    const am = this.game.attackManager;
    if (!am || typeof am.startBattleRaid !== 'function') {
      throw codedError('failed-precondition', 'Battle raids are not available in this build.');
    }
    if (am.state && am.state !== 'IDLE') throw codedError('failed-precondition', 'Finish your current raid first.');
    const garage = this.game.garageManager;
    if (garage && garage.getLoadout && garage.getLoadout().length === 0) {
      throw codedError('failed-precondition', 'Equip at least one card before attacking (GARAGE).');
    }
    const prep = await svc.beginAttempt(id);
    // A gate must be picked while the fight window is open (the attempt is refused after it):
    // the raid gets that deadline on its own clock, a few seconds early for the round trip.
    const endsAt = prep.battle && prep.battle.fightEndsAtMs;
    const commitBy = Number.isFinite(endsAt) ? Date.now() + (endsAt - this.serverNow()) - 3000 : null;
    const started = am.startBattleRaid({
      battle: prep.battle,
      snapshot: prep.snapshot,
      opponentName: prep.opponentName,
      theme: prep.theme,
      commitBy,
      onAttemptStart: () => svc.startAttempt(id).catch((e) => {
        // Said at once, over the raid: a refused attempt means this raid cannot count.
        const err = friendlyError(e);
        this._toast(err.code === 'permission-denied'
          ? '⚠️ The fight window closed before your breach - this raid will not count.'
          : `⚠️ Your attack did not reach the battle yet (${err.message}) - it is retried when the raid ends.`, 6000);
        return { ok: false, error: err };
      }),
      // AttackManager shows "Result sent" when this resolves truthy, "not sent (retrying)" on
      // false, and 'closed' ("Not counted") when the battle can no longer take it; a queued
      // result that gets through later flips it to sent (_onResultDelivered).
      onResult: (stats) => svc.submitResult(id, stats).then((r) => {
        this._emit('battle-result-sent', { battleId: id, ...r });
        return r.ok ? true : (r.closed ? 'closed' : false);
      }),
      // The BATTLES screen reopens itself here (OnlineUI).
      onExit: typeof onExit === 'function' ? onExit : null
    });
    if (started && started.ok === false) {
      throw codedError('failed-precondition', started.message || 'That city cannot be raided.');
    }
    return prep;
  }

  // ---------------------------------------------------------------- OAuth connect (ChatGPT etc.)

  /**
   * The connection request an AI app parked with the MCP server (mcp-server/src/oauth.js), read by
   * its unguessable id for the CONNECT screen. null when it is gone (used, cancelled, expired).
   */
  async getOAuthRequest(id) {
    await this.init();
    if (!this.fb || !/^[A-Za-z0-9_-]{32}$/.test(String(id || ''))) return null;
    const { doc, getDoc } = this.fb.fsSdk;
    const snap = await getDoc(doc(this.fb.db, 'oauthRequests', id));
    if (!snap.exists()) return null;
    const r = snap.data();
    let finishUrl = null;
    try {
      const u = new URL(String(r.finishUrl || ''));
      if (u.protocol === 'https:' || u.protocol === 'http:') finishUrl = u.toString();
    } catch { /* not a URL: treated as gone below */ }
    if (!finishUrl) return null;
    return {
      id,
      clientName: String(r.clientName || 'An AI app').slice(0, 60),
      redirectHost: String(r.redirectHost || '').slice(0, 200),
      finishUrl,
      expiresAtMs: r.expiresAt && r.expiresAt.toMillis ? r.expiresAt.toMillis() : 0
    };
  }

  /** ALLOW on the CONNECT screen: oauthApprovals/{id} = { uid }. Resolves to the URL to go to next. */
  async approveOAuthRequest(id) {
    const req = await this.getOAuthRequest(id);
    if (!req) throw codedError('not-found', 'This connection request expired or was already used. Start again from your AI app.');
    const uid = this.user && this.user.uid;
    if (!uid) throw codedError('unauthenticated', 'Sign in first.');
    const { doc, setDoc, serverTimestamp } = this.fb.fsSdk;
    try {
      await setDoc(doc(this.fb.db, 'oauthApprovals', id), { uid, approvedAt: serverTimestamp() });
    } catch (e) {
      throw friendlyError(e);
    }
    return req.finishUrl;
  }

  // ---------------------------------------------------------------- MCP tokens glue

  async generateToken(label) { await this.init(); return this._need('mcpTokens').generate(label); }
  async listTokens() { await this.init(); const t = await this._need('mcpTokens').list(); this._emit('tokens', t); return t; }
  async revokeToken(hash) { await this.init(); return this._need('mcpTokens').revoke(hash); }
  async deleteToken(hash) { await this.init(); return this._need('mcpTokens').remove(hash); }

  /** Ready-to-paste MCP client configs for a token (placeholders where the page cannot know). */
  mcpConfig(token = '<YOUR_TOKEN>') {
    const c = this.config;
    const serverUrl = c.mcpServerUrl;
    const serverPath = '/path/to/city-siege-3d/mcp-server/src/index.js';
    const env = { CITY_SIEGE_TOKEN: token, FIREBASE_PROJECT_ID: c.projectId || 'your-firebase-project' };
    if (c.emulators) env.FIRESTORE_EMULATOR_HOST = `${c.emulatorHost}:${c.firestoreEmulatorPort}`;
    else env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/service-account.json';
    const envFlags = Object.entries(env).map(([k, v]) => `-e ${k}=${v}`).join(' ');
    // Claude Desktop's config only launches local commands: a player reaches the hosted server
    // through the mcp-remote bridge (the stdio JSON needs this repo and an admin key - owner only).
    // No space in "Authorization:${...}" (an argument-quoting issue); mcp-remote refuses a plain
    // http:// URL other than localhost unless told --allow-http.
    const remoteArgs = ['-y', 'mcp-remote', serverUrl, '--header', 'Authorization:${CITY_SIEGE_AUTH}'];
    if (/^http:\/\//i.test(serverUrl || '') && !/^http:\/\/(localhost|127\.0\.0\.1)([:/]|$)/i.test(serverUrl)) remoteArgs.push('--allow-http');
    return {
      serverUrl,
      serverPath,
      env,
      claudeCodeStdio: `claude mcp add city-siege ${envFlags} -- node ${serverPath}`,
      claudeCodeHttp: `claude mcp add --transport http city-siege ${serverUrl} --header "Authorization: Bearer ${token}"`,
      claudeDesktopHttp: JSON.stringify({ mcpServers: { 'city-siege': { command: 'npx', args: remoteArgs, env: { CITY_SIEGE_AUTH: `Bearer ${token}` } } } }, null, 2),
      claudeDesktop: JSON.stringify({ mcpServers: { 'city-siege': { command: 'node', args: [serverPath], env } } }, null, 2),
      examplePrompts: EXAMPLE_PROMPTS.slice()
    };
  }

  // ---------------------------------------------------------------- summary

  status() {
    return {
      configured: this.configured,
      authReady: this.authReady,
      signedIn: !!this.user,
      user: this.user,
      profile: this.profile,
      needsProfile: this.needsProfile,
      sync: this.sync,
      battles: this.battles,
      needsAction: this.battles.filter(v => v.needsAction).length,
      tokens: this.tokens,
      lastError: this.lastError
    };
  }
}
