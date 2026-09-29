import * as THREE from 'three';
import { limitFor, MAX_TOWN_HALL_LEVEL, MAX_BUILDING_LEVEL, unlocksAt, gemsToFinish, formatDuration, BUILDING_DEFS, labForTrackLevel, trackCapFor, producePayout, RAIDER_BASE, CARD_UPTIME_CAP, RAID_BASE_LIVES } from '../data/progression.js';
import { TRACKS, CARD_ORDER, CARD_META, CARD_MAX_LEVEL, GarageManager } from '../builder/GarageManager.js';
import { EconomyManager } from '../builder/EconomyManager.js';
/**
 * UIManager - Manages DOM UI screens:
 * 1. Home City View (Clean, panoramic city view, tap-to-collect resources)
 * 2. Dedicated City Shop (Buy buildings into Construction Inventory)
 * 3. Dedicated Design Map Studio (Custom freeform road & inventory placement)
 * 4. Tactical Satellite Recon & Gate Breach
 * 5. Combat TPP Assault HUD with live driving minimap
 * 6. Post-carnage summary results
 */
export class UIManager {
  constructor({ economyManager, buildingManager, gridSystem, soundManager, sceneManager, garageManager }) {
    this.economy = economyManager;
    this.buildings = buildingManager;
    this.grid = gridSystem;
    this.sound = soundManager;
    this.sceneManager = sceneManager;
    this.garage = garageManager;

    this.currentScreen = 'HOME'; // 'HOME' | 'DESIGN' | 'SHOP' | 'GARAGE' | 'RECON' | 'COMBAT' | 'RESULT'
    this.shopCategory = 'all';
    this.garageTab = 'tuning';          // 'tuning' | 'cards' | 'lab'
    this.garageReturnScreen = 'HOME';   // where BACK TO CITY goes (HOME, or DESIGN via the inspector)

    this.onStartAttack = null;
    this.onCardActivated = null;
    this.onAbortRecon = null;

    this.currentInspectedBuilding = null;

    this._bindDOMElements();
    this._initEconomyListeners();
    this._initBuilderListeners();
    this._initHomeNavigation();
    this._initDesignMode();
    this._initShop();
    this._initGarage();
    this._initHarvestAnimations();

    // Populate initial resource values
    if (this.economy.onUpdate) {
      this.economy.onUpdate(this.economy.getResources());
    }

    // Default to clean Home Screen
    this.setScreen('HOME');
  }

  _bindDOMElements() {
    // Screens / Views
    this.homeView = document.getElementById('home-view');
    this.designView = document.getElementById('design-view');
    this.combatHud = document.getElementById('combat-hud');
    this.reconBanner = document.getElementById('tactical-recon-banner');
    this.scanOverlay = document.getElementById('mapping-scan-overlay');
    this.scanGateName = document.getElementById('scan-gate-name');

    // Modals
    this.shopModal = document.getElementById('shop-view');
    this.redesignModal = document.getElementById('redesign-modal');
    this.inspectorModal = document.getElementById('inspector-modal');
    this.resultModal = document.getElementById('result-modal');

    // Resources in Top Bar
    this.resCash = document.getElementById('res-cash');
    this.resIron = document.getElementById('res-iron');
    this.resWood = document.getElementById('res-wood');
    this.resGems = document.getElementById('res-gems');
    this.builderCountEl = document.getElementById('builder-count');

    // Shop Resources Display
    this.shopResCash = document.getElementById('shop-res-cash');
    this.shopResIron = document.getElementById('shop-res-iron');
    this.shopResWood = document.getElementById('shop-res-wood');

    // Vehicle Garage screen + its resource tickers
    this.garageView = document.getElementById('garage-view');
    this.garageResCash = document.getElementById('garage-res-cash');
    this.garageResIron = document.getElementById('garage-res-iron');
    this.garageResWood = document.getElementById('garage-res-wood');

    // Floating Harvest Container
    this.harvestContainer = document.getElementById('floating-harvest-container');

    // Sound Toggle
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.soundIcon = document.getElementById('sound-icon');
    if (this.btnToggleSound) {
      this.btnToggleSound.addEventListener('click', () => {
        const nextMute = !this.sound.isMuted;
        this.sound.setMuted(nextMute);
        if (this.soundIcon) {
          this.soundIcon.textContent = nextMute ? '🔇' : '🔊';
        }
      });
    }

    // Combat HUD Elements
    this.barHp = document.getElementById('hud-hp-fill');
    this.textHp = document.getElementById('hud-hp-text');
    this.barShield = document.getElementById('hud-shield-fill');
    this.speedText = document.getElementById('hud-speed-val');
    this.barDestruction = document.getElementById('hud-destruct-fill');
    this.destructText = document.getElementById('hud-destruct-text');
    this.starsContainer = document.getElementById('hud-stars');
    this.lootedCash = document.getElementById('loot-cash');
    this.lootedIron = document.getElementById('loot-iron');
    this.lootedWood = document.getElementById('loot-wood');
    this.copsWreckedText = document.getElementById('cops-wrecked');

    // Radar Canvas
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    // Action Cards Deck Container
    this.cardsContainer = document.getElementById('action-cards-container');

    // Building Inspector Callbacks
    this.grid.onSelectBuilding = (building) => {
      this.showBuildingInspector(building);
    };
    // Arming a map tool closes the inspector: the panel hides the tiles the tool acts on, and
    // its buttons are about a building the tool is not. Every way to arm one (dock button,
    // inventory card, Pick Up & Move) goes through grid.setMode. Placing a Labour Hut is the
    // exception: the busy panel's own advice is 'PLACE A HUT FROM INVENTORY', and it re-enables
    // its Upgrade button the moment the hut lands. (The panel is never click-through - GridSystem
    // ignores every press on the HUD - so a live panel cannot act on the map behind it.)
    this.grid.onModeChange = (mode, param) => {
      if (mode === 'draw_road' || mode === 'erase_road' || mode === 'relocate' ||
          (mode === 'place_inventory' && param !== 'builder_hut')) {
        this.hideBuildingInspector();
      }
    };

    // Inventory placement update callback
    this.grid.onInventoryPlaced = () => {
      this.renderDesignInventory();
    };
  }

  _initBuilderListeners() {
    this.updateBuilderHUD();

    this.buildings.onBuildersChanged = () => {
      this.updateBuilderHUD();
      this.refreshBuildingInspector();
    };

    this.buildings.onConstructionFinished = (b) => {
      this.sound.playUpgrade();
      this.showToast(`🔨 ${b.name} finished upgrade!`);
      this.updateBuilderHUD();
      // ANY finished job frees a labourer, so whichever building's panel is open re-renders
      // (it used to only when the finished building was the one on show).
      this.refreshBuildingInspector();
      // A finishing lab upgrade opens tiers / deck slots live while the garage is open, and a
      // Town Hall opens blueprints and raises limits while the shop is.
      if (this.currentScreen === 'GARAGE') this.renderGarage();
      if (this.currentScreen === 'SHOP') this.renderShopCatalog();
    };

    setInterval(() => {
      // Catch-all for anything with no event of its own (a Labour Hut or depot placed from the
      // inventory changes labour or storage without a job starting or finishing).
      if (this._inspectorOpen() && this._inspectorState(this.currentInspectedBuilding) !== this._inspectorShownState) {
        this.refreshBuildingInspector();
      }
      // A producer keeps filling while its panel is open: the Stored figure follows it (it is not
      // part of _inspectorState, which would re-draw the whole panel every tick).
      const storedEl = this._inspectorOpen() && document.getElementById('inspector-stored');
      if (storedEl) storedEl.textContent = Math.floor(this.currentInspectedBuilding.stored || 0).toLocaleString();
      if (this.currentInspectedBuilding && this.currentInspectedBuilding.isUnderConstruction) {
        const remaining = this.currentInspectedBuilding.buildTask
          ? Math.ceil(this.currentInspectedBuilding.buildTask.remaining)
          : 0;
        const countSpan = document.getElementById('inspector-timer-countdown');
        if (countSpan) countSpan.textContent = formatDuration(Math.max(1, remaining));
        const fillBar = document.getElementById('inspector-progress-fill');
        if (fillBar && this.currentInspectedBuilding.buildTask) {
          const total = this.currentInspectedBuilding.buildTask.total || 1;
          const pct = Math.max(5, (1 - this.currentInspectedBuilding.buildTask.remaining / total) * 100);
          fillBar.style.width = `${pct}%`;
        }
      }
      if (this.currentScreen === 'GARAGE' && this.garage) {
        const lab = this.garage.getLab();
        const cd = document.getElementById('garage-lab-countdown');
        if (cd && lab && lab.isUnderConstruction && lab.buildTask) {
          cd.textContent = `${formatDuration(Math.max(1, lab.buildTask.remaining))} to L${lab.buildTask.targetLevel}`;
        }
      }
      // Undo Template goes away the moment anything else changes (it would roll that back too).
      if (this.currentScreen === 'DESIGN') this._updateUndoPresetBtn();
      this.updateBuilderHUD();
    }, 400);
  }

  updateBuilderHUD() {
    if (!this.builderCountEl) return;
    const free = this.buildings.freeBuilders;
    const total = this.buildings.totalBuilders;
    const busy = this.buildings.busyBuilders;

    if (busy > 0) {
      let shortest = 999999;
      this.buildings.activeBuildTasks.forEach(t => {
        if (t.remaining < shortest) shortest = t.remaining;
      });
      const timeStr = shortest < 999999 ? ` (${formatDuration(shortest)})` : '';
      // Stowing a Labour Hut (or parking one with a layout template) while its job runs leaves
      // more jobs running than the city has slots. The job still finishes - it runs on its own
      // deadline - but nothing new can start, so say that rather than "0 / 2 Labour Free".
      this.builderCountEl.textContent = busy > total
        ? `${busy} working / ${total} Labour${timeStr}`
        : `${free} / ${total} Labour Free${timeStr}`;
      this.builderCountEl.style.color = free === 0 ? '#ff5252' : '#ffd700';
    } else {
      this.builderCountEl.textContent = `${free} / ${total} Labour Free`;
      this.builderCountEl.style.color = '#00e5ff';
    }
    if (this.resGems) this.resGems.textContent = Math.floor(this.economy.gems || 0).toLocaleString();
    this.builderCountEl.title = total === 0
      ? `No Labour Hut on the map, so no upgrade can start. Each hut houses one labourer (your Town Hall allows up to ${this.buildings.builderCap}).`
      : `Labour slots: ${total} staffed. Your Town Hall allows up to ${this.buildings.builderCap} - build a Labour Hut for each.`;
  }

  /**
   * What to do when every labourer is busy. The shop can only help while another hut would
   * add a labourer AND the hut limit allows one; at the Town Hall's labour cap (the usual case,
   * since the hut limit equals the cap) sending the player to the shop met 'LIMIT REACHED'.
   */
  _labourAdvice() {
    const bm = this.buildings;
    const roomForMore = bm.totalBuilders < bm.builderCap;
    if (roomForMore && this.economy.getInventoryCount('builder_hut') > 0) {
      return { short: 'PLACE A HUT FROM INVENTORY', long: 'Place the Labour Hut in your inventory (Design Map) to add a labourer.' };
    }
    if (roomForMore && bm.canBuy('builder_hut').ok) {
      return { short: 'HIRE IN SHOP', long: 'Hire a Labour in the City Shop (a Labour Hut houses one).' };
    }
    return { short: 'WAIT OR FINISH ONE WITH GEMS', long: 'Wait for a job to finish, or finish one now with gems.' };
  }

  _inspectorOpen() {
    return !!(this.currentInspectedBuilding && this.inspectorModal && !this.inspectorModal.classList.contains('hidden'));
  }

  /**
   * Everything the building panel's buttons are drawn from. The panel is static HTML, so it used
   * to keep a disabled 'ALL LABOURS BUSY' / 'NEED MORE RESOURCES' button after another job
   * finished or a collect filled the bank, until it was closed and opened again.
   */
  _inspectorState(b) {
    if (!b) return '';
    const bm = this.buildings;
    const res = this.economy.getResources();
    const cost = bm.getUpgradeCost(b);   // runs on a timer: never throw on an unknown type
    const stow = bm.canStow(b);
    return [b.level, !!b.isUnderConstruction, bm.getTownHallLevel(), bm.freeBuilders, bm.totalBuilders,
      !!cost && res.cash >= cost.cash && res.iron >= cost.iron && res.wood >= cost.wood,
      this.economy.getInventoryCount('builder_hut'), stow.reason || 'ok', stow.used, stow.capacity].join('|');
  }

  /** Re-render the building panel if it is open; close it if its building has left the city. */
  refreshBuildingInspector() {
    if (!this._inspectorOpen()) return;
    const b = this.currentInspectedBuilding;
    if (!this.buildings.isInCity(b)) {
      this.hideBuildingInspector();
      return;
    }
    this.showBuildingInspector(b);
  }

  /**
   * "What Town Hall N gives you" - new blueprints, raised limits, labour, land. The whole
   * point of the ladder is that every level grants something, so the player should see it
   * BEFORE paying for it.
   */
  _townHallPreviewHtml(level) {
    if (level > MAX_TOWN_HALL_LEVEL) return '';
    const u = unlocksAt(level);
    const chip = (t) => {
      const d = BUILDING_DEFS[t];
      return `<span style="display:inline-block; margin:2px 4px 2px 0; padding:2px 7px; border-radius:10px; background:rgba(255,215,0,0.14); border:1px solid rgba(255,215,0,0.35); font-size:11px;">${d ? d.icon : ''} ${d ? d.name : t}</span>`;
    };
    const raised = u.raisedLimits.slice(0, 8).map(r => {
      const d = BUILDING_DEFS[r.type];
      return `${d ? d.icon : ''} ${d ? d.name : r.type} ${r.from}&rarr;${r.to}`;
    }).join(' &middot; ');
    const more = u.raisedLimits.length > 8 ? ` &middot; +${u.raisedLimits.length - 8} more` : '';
    return `
      <div style="background: rgba(255,215,0,0.07); border: 1px solid rgba(255,215,0,0.3); border-radius: 8px; padding: 10px 12px; margin: 8px 0 10px;">
        <div style="font-size: 12px; font-weight: 700; color: #ffd700; margin-bottom: 6px;">
          🏛️ Town Hall ${u.level}: ${u.name}
        </div>
        ${u.newBuildings.length ? `<div style="font-size: 11px; color: var(--text-dim); margin-bottom: 3px;">NEW BLUEPRINTS</div><div style="margin-bottom: 6px;">${u.newBuildings.map(chip).join('')}</div>` : ''}
        ${raised ? `<div style="font-size: 11px; color: var(--text-dim); margin-bottom: 3px;">MORE OF</div><div style="font-size: 11px; margin-bottom: 6px;">${raised}${more}</div>` : ''}
        <div style="font-size: 11px;">
          👷 Labour cap ${u.builders}${u.buildersGained > 0 ? ` <b style="color:#69f0ae">(+${u.buildersGained})</b>` : ''}
          &nbsp;&middot;&nbsp; 🗺️ Build radius ${u.cityRadius} tiles
          &nbsp;&middot;&nbsp; 🚓 Police cap ${u.policeCap}
          &nbsp;&middot;&nbsp; ⬆️ Buildings to L${u.levelCap}
        </div>
      </div>`;
  }

  /**
   * The next Town Hall level that raises the cap on `type`, so a blocked shop card can
   * say what to do about it instead of just refusing.
   */
  _nextLimitIncrease(type, fromTh) {
    const current = limitFor(type, fromTh);
    for (let th = fromTh + 1; th <= MAX_TOWN_HALL_LEVEL; th++) {
      const next = limitFor(type, th);
      if (next > current) return { th, to: next };
    }
    return null;
  }

  _getTypeIcon(type) {
    const icons = {
      town_hall: '🏛️',
      vehicle_lab: '🏎️',
      weapons_lab: '💣',
      sniper_tower: '🏹',
      tesla_coil: '⚡',
      laser_obelisk: '🔴',
      main_gate: '⛩️',
      police_station: '🚓',
      petrol_pump: '⛽',
      lumber_mill: '🪵',
      iron_foundry: '⚙️',
      cash_mint: '🏦',
      builder_hut: '👷',
      spike_trap: '🪤',
      roadblock: '🚧',
      tree: '🌲',
      road: '🛣️'
    };
    return icons[type] || '🏗️';
  }

  /**
   * Show the health of the structure currently being hit. Auto-hides shortly after the last hit
   * so it never lingers over the HUD while the player drives on.
   */
  showTargetBuildingHealth(building, hp) {
    const box = document.getElementById('target-building-hud');
    if (!box || !building) return;

    const maxHp = building.maxHp || 1;
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

    const nameEl = document.getElementById('target-building-name');
    const hpEl = document.getElementById('target-building-hp');
    const iconEl = document.getElementById('target-building-icon');
    const fillEl = document.getElementById('target-building-fill');

    if (nameEl) nameEl.textContent = building.name || building.type || 'STRUCTURE';
    if (hpEl) hpEl.textContent = `${Math.ceil(hp)} / ${Math.round(maxHp)}`;
    if (iconEl) iconEl.textContent = this._getTypeIcon(building.type);
    if (fillEl) fillEl.style.width = `${pct}%`;

    box.classList.remove('hidden', 'fading');
    this._targetBuilding = building;

    clearTimeout(this._targetHudFade);
    clearTimeout(this._targetHudHide);
    this._targetHudFade = setTimeout(() => box.classList.add('fading'), 1600);
    this._targetHudHide = setTimeout(() => box.classList.add('hidden'), 1900);
  }

  hideTargetBuildingHealth() {
    const box = document.getElementById('target-building-hud');
    clearTimeout(this._targetHudFade);
    clearTimeout(this._targetHudHide);
    this._targetBuilding = null;
    if (box) box.classList.add('hidden');
  }

  /**
   * Pin the health bar in screen space directly ABOVE the structure being hit.
   * Called every frame from the combat loop; cheap when nothing is targeted.
   */
  updateTargetBuildingHealthPosition(camera) {
    const b = this._targetBuilding;
    const box = document.getElementById('target-building-hud');
    if (!b || !b.mesh || !camera || !box || box.classList.contains('hidden')) return;

    if (!this._targetProj) this._targetProj = new THREE.Vector3();
    const v = this._targetProj;
    v.copy(b.mesh.position);
    const fp = (this.buildings.catalog[b.type] || {}).footprint || b.footprint || 1;
    v.y += (fp >= 2 ? 7.5 : 5.0);   // float above the roofline
    v.project(camera);

    if (v.z > 1) { box.style.opacity = '0'; return; }  // behind the camera
    box.style.opacity = '';
    box.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
    box.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
  }

  /** Armor bar that floats just above the buggy in the 3D view, colour-coded by remaining armor. */
  updateVehicleHealthBar(camera, vehicle) {
    const box = document.getElementById('vehicle-health-hud');
    if (!box || !camera || !vehicle || !vehicle.mesh || !vehicle.mesh.visible || vehicle.isCrashed) {
      if (box) box.classList.add('hidden');
      return;
    }
    if (!this._vehProj) this._vehProj = new THREE.Vector3();
    const v = this._vehProj;
    v.copy(vehicle.position);
    v.y += 3.2;
    v.project(camera);
    if (v.z > 1) { box.classList.add('hidden'); return; }

    box.classList.remove('hidden');
    box.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
    box.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;

    const ratio = Math.max(0, Math.min(1, vehicle.hp / (vehicle.maxHp || 1)));
    const fill = document.getElementById('vehicle-health-fill');
    const txt = document.getElementById('vehicle-health-text');
    if (fill) {
      fill.style.width = `${ratio * 100}%`;
      fill.style.background = ratio > 0.5 ? '#43d17a' : ratio > 0.25 ? '#ffc107' : '#ff3d3d';
    }
    if (txt) txt.textContent = `${Math.ceil(vehicle.hp)} / ${Math.round(vehicle.maxHp)}`;
  }

  hideVehicleHealthBar() {
    const box = document.getElementById('vehicle-health-hud');
    if (box) box.classList.add('hidden');
  }

  /** Hit feedback: the armor bars flash and a red vignette pulses at the screen edges. */
  flashDamage(amount) {
    const targets = [document.getElementById('vehicle-health-hud'), this.barHp && this.barHp.parentElement];
    targets.forEach(el => {
      if (!el) return;
      el.classList.remove('hit');
      void el.offsetWidth;          // restart the animation
      el.classList.add('hit');
    });
    const vig = document.getElementById('damage-vignette');
    if (vig) {
      vig.style.opacity = amount >= 60 ? '0.85' : '0.55';
      clearTimeout(this._vigT);
      this._vigT = setTimeout(() => { vig.style.opacity = '0'; }, 220);
    }
  }

  updateLivesHUD(livesLeft) {
    const el = document.getElementById('hud-lives');
    if (el) el.textContent = `${livesLeft || 0}`;
  }

  bindTouchControls(vehicleController) {
    const bindBtn = (id, inputProp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e) => { e.preventDefault(); vehicleController.inputs[inputProp] = true; };
      const end = (e) => { e.preventDefault(); vehicleController.inputs[inputProp] = false; };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointerleave', end);
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
    };

    bindBtn('touch-left', 'left');
    bindBtn('touch-right', 'right');
    bindBtn('touch-gas', 'forward');
    bindBtn('touch-brake', 'reverse');
    bindBtn('touch-drift', 'handbrake');
    bindBtn('touch-fire', 'fire');
    bindBtn('btn-fire-cannon', 'fire');

    // Jump Pedal Button
    const jumpBtn = document.getElementById('touch-jump');
    if (jumpBtn) {
      const triggerJump = (e) => {
        e.preventDefault();
        if (this.onCardActivated) {
          this.onCardActivated('jump');
        } else if (vehicleController) {
          vehicleController.triggerBigJump();
        }
      };
      jumpBtn.addEventListener('pointerdown', triggerJump);
      jumpBtn.addEventListener('touchstart', triggerJump, { passive: false });
    }
  }

  setScreen(screen) {
    this.currentScreen = screen;

    // Grid helper only visible in DESIGN screen, never on Home, Recon or Combat!
    if (this.sceneManager) {
      this.sceneManager.setDesignGridVisible(screen === 'DESIGN');
    }

    // Hide all main containers first
    if (this.homeView) this.homeView.classList.add('hidden');
    if (this.designView) this.designView.classList.add('hidden');
    if (this.combatHud) this.combatHud.classList.add('hidden');
    if (this.reconBanner) this.reconBanner.classList.add('hidden');
    if (this.shopModal) this.shopModal.classList.add('hidden');
    if (this.garageView) this.garageView.classList.add('hidden');
    if (this.redesignModal) this.redesignModal.classList.add('hidden');
    // Closing the panel forgets its building too: kept, it popped the panel back open on its
    // own when that building's job finished after a trip to the shop.
    this.hideBuildingInspector();
    if (this.resultModal) this.resultModal.classList.add('hidden');

    if (screen === 'HOME') {
      if (this.homeView) this.homeView.classList.remove('hidden');
      this.grid.setMode('home');
    } else if (screen === 'DESIGN') {
      if (this.designView) this.designView.classList.remove('hidden');
      this.grid.setMode('design_select');
      this.renderDesignInventory();
      if (this.updateRoadBadge) this.updateRoadBadge();
      this._updateUndoPresetBtn();
    } else if (screen === 'SHOP') {
      // The shop is its own full screen now: the city stays hidden behind it and the map grid is
      // locked so clicks on the shop cannot harvest or inspect buildings underneath.
      if (this.shopModal) this.shopModal.classList.remove('hidden');
      this.grid.setMode('locked');
      this.renderShopCatalog();
    } else if (screen === 'GARAGE') {
      // Full-screen like the shop: #garage-view carries .shop-screen so GridSystem ignores taps.
      if (this.garageView) this.garageView.classList.remove('hidden');
      this.grid.setMode('locked');
      this.renderGarage();
    } else if (screen === 'RECON') {
      if (this.reconBanner) this.reconBanner.classList.remove('hidden');
      this.grid.setMode('locked');
    } else if (screen === 'COMBAT') {
      if (this.combatHud) this.combatHud.classList.remove('hidden');
      this.grid.setMode('locked');
    } else if (screen === 'RESULT') {
      if (this.resultModal) this.resultModal.classList.remove('hidden');
      this.grid.setMode('locked');
    }
  }

  _initHomeNavigation() {
    // Exit the raid early. AttackManager sets onRetreat for the duration of combat.
    const btnRetreat = document.getElementById('btn-retreat');
    if (btnRetreat) {
      btnRetreat.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        if (this.onRetreat) this.onRetreat();
      });
    }

    // index.html declares #btn-abort-recon but nothing ever bound it, so recon was a one-way
    // door: the only way out was to commit to an attack or reload the page.
    const btnAbort = document.getElementById('btn-abort-recon');
    if (btnAbort) {
      btnAbort.addEventListener('click', () => {
        if (this.sound) this.sound.playClick();
        if (this.onAbortRecon) this.onAbortRecon();
      });
    }

    // Attack Button
    const btnAttack = document.getElementById('btn-attack-city');
    if (btnAttack) {
      btnAttack.addEventListener('click', () => {
        this.sound.playClick();
        this.requestAttack();
      });
    }

    // Shop Button from Home Dock
    const btnOpenShop = document.getElementById('btn-open-shop');
    if (btnOpenShop) {
      btnOpenShop.addEventListener('click', () => {
        this.sound.playClick();
        this.setScreen('SHOP');
      });
    }

    // Vehicle Garage Button from Home Dock
    const btnOpenGarage = document.getElementById('btn-open-garage');
    if (btnOpenGarage) {
      btnOpenGarage.addEventListener('click', () => {
        this.sound.playClick();
        this.openGarage('tuning');
      });
    }

    // Design Map Button from Home Dock
    const btnOpenDesign = document.getElementById('btn-open-design');
    if (btnOpenDesign) {
      btnOpenDesign.addEventListener('click', () => {
        this.sound.playClick();
        this.setScreen('DESIGN');
      });
    }
  }

  _initDesignMode() {
    // Return to City Button
    const btnExit = document.getElementById('btn-exit-design');
    if (btnExit) {
      btnExit.addEventListener('click', () => {
        this.sound.playClick();
        this.setScreen('HOME');
      });
    }

    // Quick Shop Button in Design Drawer
    const btnQuickShop = document.getElementById('btn-quick-shop');
    if (btnQuickShop) {
      btnQuickShop.addEventListener('click', () => {
        this.sound.playClick();
        this.setScreen('SHOP');
      });
    }

    // Presets Modal Button
    const btnPresets = document.getElementById('btn-open-presets');
    if (btnPresets) {
      btnPresets.addEventListener('click', () => {
        this.sound.playClick();
        this.showRedesignModal();
      });
    }

    const btnClosePresets = document.getElementById('btn-close-redesign');
    if (btnClosePresets) {
      btnClosePresets.addEventListener('click', () => {
        this.hideRedesignModal();
      });
    }

    // Tool Dock Buttons: Road, Erase, Select
    const btnRoad = document.getElementById('btn-design-road');
    const btnErase = document.getElementById('btn-design-erase');
    const btnSelect = document.getElementById('btn-design-select');

    const updateToolBtns = (activeBtn) => {
      [btnRoad, btnErase, btnSelect].forEach(b => b && b.classList.remove('active'));
      if (activeBtn) activeBtn.classList.add('active');
    };

    const updateRoadBadge = () => {
      const roadCount = this.economy.getInventoryCount('road');
      if (btnRoad) {
        btnRoad.innerHTML = `<span>🛣️</span> Draw Roads (${roadCount} left)`;
        if (roadCount <= 0) {
          btnRoad.style.borderColor = 'rgba(255, 82, 82, 0.6)';
        } else {
          btnRoad.style.borderColor = '';
        }
      }
    };
    this.updateRoadBadge = updateRoadBadge;
    updateRoadBadge();

    // Clear Roads Button (Refunds all removed road tiles to inventory!)
    const btnClearRoads = document.getElementById('btn-clear-roads-design');
    if (btnClearRoads) {
      btnClearRoads.addEventListener('click', () => {
        // Only the tiles the player could draw again: road beyond the build radius (the spokes
        // out to the gates) cannot be redrawn until the Town Hall's radius grows, so it stays.
        const radius = this.grid.maxCityRadius;
        const outside = (gx, gz) => Math.hypot(gx, gz) > radius;
        if (confirm('Clear all paved roads inside your build area? Every tile will be refunded to your inventory. ' +
          'Gate roads beyond the build area stay: you could not draw them again.')) {
          this.sound.playCrash(0.6);
          const clearedCount = this.buildings.roadNetwork.clear(outside);
          const kept = this.buildings.roadNetwork.roads.size;
          this.economy.addToInventory('road', clearedCount);
          updateRoadBadge();
          this.renderDesignInventory();
          this.showToast(`🧹 Cleared and refunded +${clearedCount} Road Tiles to inventory!` +
            (kept ? ` ${kept} gate road ${kept === 1 ? 'tile' : 'tiles'} beyond your build area stay.` : ''));
        }
      });
    }

    // A preset (or its undo) rebuilds every building as a new object: close anything still
    // holding the old ones (the inspector's Stow / Upgrade buttons, a Pick Up & Move in progress).
    const dropStaleTools = () => {
      this.hideBuildingInspector();
      this.grid.setMode('design_select');
      updateToolBtns(btnSelect);
      document.querySelectorAll('.inv-card').forEach(c => c.classList.remove('active-placement'));
    };
    // Save at once: a preset moves the whole city, and the economy blob is already written.
    const saveCityNow = () => {
      if (window.citySiege && window.citySiege.saveCityNow) window.citySiege.saveCityNow();
    };

    // Apply Presets (Citadel, Metropolis, Outpost)
    document.querySelectorAll('.btn-apply-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.getAttribute('data-preset');
        if (!preset) return;
        // Dry run first: anything the layout has no slot for goes to storage and its running
        // upgrade is cancelled, so the player confirms exactly that (it used to happen on one click).
        const preview = this.buildings.previewPreset(preset);
        if (!preview.ok) return;
        const title = e.target.closest('.preset-card')?.querySelector('h3')?.textContent.trim() || preset;
        if ((preview.stowed > 0 || preview.jobsRefunded > 0) && !confirm(this._presetWarning(title, preview))) return;

        this.sound.playUpgrade();
        dropStaleTools();
        const r = this.buildings.applyPreset(preset);
        this.hideRedesignModal();
        updateRoadBadge();
        this.renderDesignInventory();
        this._updateUndoPresetBtn();
        if (r && r.ok) {
          const notes = [];
          if (r.stowed > 0) notes.push(`📦 ${r.stowed} ${r.stowed === 1 ? 'building' : 'buildings'} had no slot in this layout - moved to your inventory at their current level.`);
          if (r.jobsKept > 0) notes.push(`🔨 ${r.jobsKept} running ${r.jobsKept === 1 ? 'upgrade moved' : 'upgrades moved'} with ${r.jobsKept === 1 ? 'its building' : 'their buildings'}.`);
          if (r.jobsRefunded > 0) notes.push(`💰 ${r.jobsRefunded} ${r.jobsRefunded === 1 ? 'upgrade was' : 'upgrades were'} cancelled and refunded (the building went to your inventory).`);
          if (notes.length) notes.push('↩️ Undo Template puts it all back until you change anything else.');
          if (notes.length) this.showToast(notes.join(' '), 5200);
        }
        saveCityNow();
      });
    });

    const btnUndoPreset = document.getElementById('btn-undo-preset');
    if (btnUndoPreset) {
      btnUndoPreset.addEventListener('click', () => {
        if (!this.buildings.canUndoPreset().ok) {
          this._updateUndoPresetBtn();
          this.sound.playCrash(0.3);
          this.showToast('↩️ Nothing to undo: the city has changed since the template was applied.');
          return;
        }
        dropStaleTools();
        this.buildings.undoPreset();
        this._updateUndoPresetBtn();
        this.sound.playUpgrade();
        updateRoadBadge();
        this.renderDesignInventory();
        this.showToast('↩️ Layout restored: every building, road and running upgrade is back where it was.');
        saveCityNow();
      });
    }

    if (btnRoad) {
      btnRoad.addEventListener('click', () => {
        this.sound.playClick();
        this.grid.setMode('draw_road');
        updateToolBtns(btnRoad);
        document.querySelectorAll('.inv-card').forEach(c => c.classList.remove('active-placement'));
        const roadCard = document.querySelector('.inv-card[data-type="road"]');
        if (roadCard) roadCard.classList.add('active-placement');
      });
    }
    if (btnErase) {
      btnErase.addEventListener('click', () => {
        this.sound.playClick();
        this.grid.setMode('erase_road');
        updateToolBtns(btnErase);
        document.querySelectorAll('.inv-card').forEach(c => c.classList.remove('active-placement'));
      });
    }
    if (btnSelect) {
      btnSelect.addEventListener('click', () => {
        this.sound.playClick();
        this.grid.setMode('design_select');
        updateToolBtns(btnSelect);
        document.querySelectorAll('.inv-card').forEach(c => c.classList.remove('active-placement'));
      });
    }

    // Hook Grid callbacks
    this.grid.onRoadUpdated = () => {
      updateRoadBadge();
      this.renderDesignInventory();
    };

    // A road drawn or erased past the build radius used to do nothing but turn the cursor red.
    this.grid.onOutsideCity = () => {
      // A drag along the edge crosses many outside tiles: say it once, not once a tile.
      const now = performance.now();
      if (now - (this._outsideToastAt || -1e9) < 1500) return;
      this._outsideToastAt = now;
      this.sound.playCrash(0.3);
      this.showToast('🚧 That tile is outside your build area. A bigger Town Hall builds further out.');
    };

    this.grid.onOutOfRoads = () => {
      this.sound.playCrash(0.3);
      this.showToast('⚠️ Out of Road Tiles! Purchase more in the City Shop.');
    };

    // At the Town Hall road budget the draw used to fail silently (only a crash sound).
    this.grid.onRoadLimitReached = (gate) => {
      const th = this.buildings.getTownHallLevel();
      const next = this._nextLimitIncrease('road', th);
      this.showToast(`🛣️ Road limit reached: ${gate.have} / ${gate.limit} tiles at Town Hall ${th}.` +
        (next ? ` Town Hall ${next.th} raises it to ${next.to}.` : ''));
    };
  }

  renderDesignInventory() {
    const list = document.getElementById('inventory-items-list');
    if (!list) return;
    list.innerHTML = '';

    const inv = this.economy.inventory || {};
    const availableTypes = Object.keys(inv).filter(type => inv[type] > 0);

    if (availableTypes.length === 0) {
      list.innerHTML = `
        <div class="inv-empty-state">
          <span>Your construction inventory is empty. Visit the <strong>City Shop</strong> to purchase fortifications!</span>
          <button id="btn-empty-shop-cta" class="btn-primary" style="padding: 6px 14px; font-size: 11px;">OPEN SHOP 🛒</button>
        </div>
      `;
      const cta = document.getElementById('btn-empty-shop-cta');
      if (cta) {
        cta.addEventListener('click', () => {
          this.sound.playClick();
          this.setScreen('SHOP');
        });
      }
      return;
    }

    // Big Storage occupancy: stowed buildings (not fresh purchases) take depot slots.
    const stowUsed = this.buildings.storageUsed();
    const stowCap = this.buildings.storageCapacity();
    if (stowUsed > 0 || stowCap > 0) {
      const meter = document.createElement('div');
      meter.className = 'inv-storage-meter';
      meter.style.cssText = `flex: 0 0 auto; align-self: center; white-space: nowrap; font-size: 11px; font-weight: 700; padding: 4px 8px; color: ${stowUsed > stowCap ? '#ff8a80' : 'var(--accent-cyan)'};`;
      meter.title = 'Buildings you lifted off the map / Big Storage Depot slots';
      meter.textContent = `📦 Stowed ${stowUsed} / ${stowCap}`;
      list.appendChild(meter);
    }

    availableTypes.forEach(type => {
      const def = this.buildings.catalog[type];
      if (!def) return;
      const count = inv[type];

      const card = document.createElement('div');
      card.className = 'inv-card';
      card.setAttribute('data-type', type);
      card.innerHTML = `
        <span class="inv-count-badge">x${count}</span>
        <div class="inv-card-icon">${this._getTypeIcon(type)}</div>
        <div class="inv-card-info">
          <span class="inv-card-name">${def.name}</span>
          <span style="font-size: 10px; color: var(--accent-cyan);">${type === 'road' ? 'Draw Road Tiles' : 'Ready to Place'}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.sound.playClick();
        document.querySelectorAll('.inv-card').forEach(c => c.classList.remove('active-placement'));
        card.classList.add('active-placement');

        if (type === 'road') {
          this.grid.setMode('draw_road');
          const btnRoad = document.getElementById('btn-design-road');
          document.querySelectorAll('.left-tools-dock .tool-btn').forEach(b => b.classList.remove('active'));
          if (btnRoad) btnRoad.classList.add('active');
        } else {
          this.grid.setMode('place_inventory', type);
        }
      });

      list.appendChild(card);
    });
  }

  _initShop() {
    // Close Shop
    const btnClose = document.getElementById('btn-close-shop');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.sound.playClick();
        this.setScreen('HOME');
      });
    }

    // Proceed to Design Map from Shop
    const btnToDesign = document.getElementById('btn-shop-to-design');
    if (btnToDesign) {
      btnToDesign.addEventListener('click', () => {
        this.sound.playClick();
        this.setScreen('DESIGN');
      });
    }

    // Shop Filter Tabs (scoped to the shop: the garage reuses .shop-tab-btn for its own tabs)
    document.querySelectorAll('#shop-view .shop-tab-btn').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('#shop-view .shop-tab-btn').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.shopCategory = e.target.getAttribute('data-cat') || 'all';
        this.sound.playClick();
        this.renderShopCatalog();
      });
    });
  }

  renderShopCatalog() {
    const container = document.getElementById('blueprint-items-container');
    if (!container) return;
    container.innerHTML = '';

    const catalog = this.buildings.catalog;
    const res = this.economy.getResources();

    // Update shop top resource balances + the Town Hall tier that drives unlocks
    const shopTh = document.getElementById('shop-th-level');
    if (shopTh) shopTh.textContent = `${this.buildings.getTownHallLevel()}`;
    if (this.shopResCash) this.shopResCash.textContent = res.cash.toLocaleString();
    if (this.shopResIron) this.shopResIron.textContent = res.iron.toLocaleString();
    if (this.shopResWood) this.shopResWood.textContent = res.wood.toLocaleString();

    Object.keys(catalog).forEach(type => {
      const def = catalog[type];
      // One malformed catalog entry used to throw mid-loop and blank the WHOLE shop,
      // because the container is emptied before the loop runs.
      if (def && def.shopHidden) return;   // e.g. Main Gates: fixed on the wall, never sold
      if (!def || !def.cost || !def.category) {
        console.warn(`[shop] skipping malformed catalog entry "${type}"`);
        return;
      }
      if (this.shopCategory !== 'all' && def.category !== this.shopCategory) {
        return;
      }

      // Town Hall gating AND the per-type build limit. canBuy() counts what is already
      // placed plus what is sitting in the inventory, so blueprints cannot be stockpiled
      // past the cap and dumped on the map later.
      const thLevel = this.buildings.getTownHallLevel();
      const reqTH = def.unlockTownHall || 1;
      const gate = this.buildings.canBuy(type);
      const isLocked = gate.reason === 'LOCKED';
      const atLimit = gate.reason === 'AT_LIMIT';
      const limit = this.buildings.limitOf(type);
      const owned = this.buildings.ownedTotal(type);
      const placed = this.buildings.countOf(type);
      const nextLimit = this._nextLimitIncrease(type, thLevel);

      const hasCash = res.cash >= (def.cost.cash || 0);
      const hasIron = res.iron >= (def.cost.iron || 0);
      const hasWood = res.wood >= (def.cost.wood || 0);
      const canAfford = hasCash && hasIron && hasWood && gate.ok;
      const ownedCount = this.economy.getInventoryCount(type);
      const packCount = def.packCount || 1;
      const buyBtnText = isLocked
        ? `\u{1F512} REQUIRES TOWN HALL ${reqTH}`
        : atLimit
          ? `\u{1F6D1} LIMIT REACHED (${owned} / ${limit})`
          : canAfford
            ? (def.packCount ? `BUY (+${packCount} TO INVENTORY) \u{1F4E6}` : 'BUY (+1 TO INVENTORY) \u{1F4E6}')
            : 'NEED MORE RESOURCES \u{26A0}\u{FE0F}';

      const card = document.createElement('div');
      card.className = (isLocked || atLimit) ? 'blueprint-card is-locked' : 'blueprint-card';
      card.innerHTML = `
        <div class="blueprint-header">
          <div class="blueprint-icon">${this._getTypeIcon(type)}</div>
          <div>
            <div class="blueprint-title">${def.name}</div>
            <span style="font-size:10px; color:var(--text-dim);">${def.category.toUpperCase()}</span>
            <div class="inv-owned-tag">In Inventory: ${ownedCount}</div>
            <div class="inv-owned-tag" style="${atLimit ? 'color:#ff6d6d;' : ''}">Built: ${placed} / ${limit}</div>
          </div>
        </div>
        <p style="font-size:11px; color:var(--text-dim); margin-bottom:6px; min-height: 28px;">${def.desc}</p>
        ${def.helps ? `<div class="blueprint-helps"><span class="helps-label">WHAT IT DOES FOR YOU</span><span>${def.helps}</span></div>` : ''}
        ${isLocked ? `<div class="blueprint-lock">🔒 Unlocks at Town Hall ${reqTH} — you are Town Hall ${thLevel}</div>` : ''}
        ${atLimit ? `<div class="blueprint-lock">\u{1F6D1} Limit reached: ${owned} of ${limit} at Town Hall ${thLevel}.${nextLimit ? ` Town Hall ${nextLimit.th} raises it to ${nextLimit.to}.` : ' This is the maximum.'}</div>` : ''}
        <div class="blueprint-reqs">
          <div class="req-item">
            <span>💰 Cash:</span>
            <span class="${hasCash ? 'req-status-ok' : 'req-status-need'}">${res.cash.toLocaleString()} / ${(def.cost.cash || 0).toLocaleString()}</span>
          </div>
          <div class="req-item">
            <span>⚙️ Iron:</span>
            <span class="${hasIron ? 'req-status-ok' : 'req-status-need'}">${res.iron.toLocaleString()} / ${(def.cost.iron || 0).toLocaleString()}</span>
          </div>
          <div class="req-item">
            <span>🪵 Wood:</span>
            <span class="${hasWood ? 'req-status-ok' : 'req-status-need'}">${res.wood.toLocaleString()} / ${(def.cost.wood || 0).toLocaleString()}</span>
          </div>
        </div>
        <button class="btn-primary btn-buy-to-inv" ${canAfford ? '' : 'disabled style="opacity:0.4; cursor:not-allowed;"'}>
          ${buyBtnText}
        </button>
      `;

      if (canAfford) {
        card.querySelector('.btn-buy-to-inv').addEventListener('click', () => {
          // Re-check at click time: the card may have been rendered before another
          // purchase or placement consumed the last slot.
          const live = this.buildings.canBuy(type);
          if (!live.ok) {
            this.showToast(live.reason === 'AT_LIMIT'
              ? `Limit reached: ${live.have} of ${live.limit} ${def.name}.`
              : `${def.name} is not available yet.`);
            this.renderShopCatalog();
            return;
          }
          if (this.economy.deduct(def.cost)) {
            this.economy.addToInventory(type, packCount);
            this.sound.playUpgrade();
            this.renderShopCatalog();
            this.showToast(`Purchased +${packCount} ${def.name}!`);
            if (this.updateRoadBadge) this.updateRoadBadge();
          }
        });
      }

      container.appendChild(card);
    });
  }

  // ===================================================================
  // VEHICLE GARAGE (full screen: buggy tuning, ability cards, raid deck)
  // ===================================================================

  openGarage(tab = 'tuning') {
    this.garageReturnScreen = (this.currentScreen === 'DESIGN') ? 'DESIGN' : 'HOME';
    this.garageTab = tab;
    this.hideBuildingInspector();
    this.setScreen('GARAGE');
  }

  _initGarage() {
    if (!this.garageView || !this.garage) return;

    const btnClose = document.getElementById('btn-close-garage');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.sound.playClick();
        this.setScreen(this.garageReturnScreen || 'HOME');
      });
    }

    const btnAttack = document.getElementById('btn-garage-attack');
    if (btnAttack) {
      btnAttack.addEventListener('click', () => {
        this.sound.playClick();
        this.requestAttack();
      });
    }

    document.querySelectorAll('#garage-view .garage-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        this.garageTab = tab.getAttribute('data-tab') || 'tuning';
        this.sound.playClick();
        this.renderGarage();
      });
    });

    // One delegated handler for every [data-action] in the main column and the sidebar note.
    // Every action re-renders the whole garage (innerHTML), so listeners never leak.
    const onAction = (e) => {
      const chip = e.target.closest('.garage-stat-chip[data-track]');
      if (chip) {
        const card = document.querySelector(`.garage-track-card[data-id="${chip.dataset.track}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      this._handleGarageAction(el.dataset.action, el.dataset.id);
    };
    const main = document.getElementById('garage-main');
    if (main) main.addEventListener('click', onAction);
    const note = document.getElementById('garage-side-note');
    if (note) note.addEventListener('click', onAction);
  }

  /**
   * Both Attack buttons (home dock and garage) come through here, so they apply one rule: no
   * raid with an empty ability deck. The home button used to start one the garage refused.
   */
  requestAttack() {
    if (this.garage && this.garage.getLoadout().length === 0) {
      this.sound.playCrash(0.3);
      this.showToast('Equip at least one card before attacking');
      if (this.currentScreen !== 'GARAGE') this.openGarage('cards');
      return false;
    }
    if (this.onStartAttack) this.onStartAttack();
    return true;
  }

  _garageGoToShop() {
    this.shopCategory = 'defense';
    document.querySelectorAll('#shop-view .shop-tab-btn').forEach(t => t.classList.toggle('active', t.dataset.cat === 'defense'));
    this.setScreen('SHOP');
  }

  _handleGarageAction(action, id) {
    const g = this.garage;
    const reasonText = {
      max: 'Already at maximum level',
      cost: 'Not enough resources',
      locked: 'Unlock this card first',
      full: 'Deck full - unequip a card first',
      unknown: 'Unknown item'
    };
    const fail = (msg) => {
      this.sound.playCrash(0.3);
      this.showToast(msg);
    };
    const ok = (msg) => {
      this.sound.playUpgrade();
      this.showToast(msg);
    };

    switch (action) {
      case 'goto-shop':
        this.sound.playClick();
        this._garageGoToShop();
        return;   // the shop renders itself
      case 'goto-cards':
        this.sound.playClick();
        this.garageTab = 'cards';
        break;
      case 'buy-track': {
        const t = g.getTrack(id);
        const r = g.buyTrack(id);
        if (r.ok) ok(`🏎️ ${t.name} → L${r.level} (${t.fmt(t.value(r.level))})`);
        else fail(r.reason === 'lab' ? `Requires Vehicle Lab L${r.needLab}` : (reasonText[r.reason] || 'Cannot upgrade'));
        break;
      }
      case 'unlock-card':
      case 'level-card': {
        const m = CARD_META[id] || { name: id, icon: '🃏' };
        const r = g.buyCard(id);
        if (r.ok) {
          if (r.unlock) {
            ok(r.equippedSlot
              ? `${m.icon} ${m.name} unlocked and equipped in slot ${r.equippedSlot}`
              : `${m.icon} ${m.name} unlocked - equip it in your deck`);
          } else {
            ok(`${m.icon} ${m.name} → L${r.level}`);
          }
        } else {
          fail(r.reason === 'lab' ? `Requires Vehicle Lab L${r.needLab}`
            : r.reason === 'tech' ? `Requires Tech Lab L${r.needTech} (Town Hall 5+)`
            : (reasonText[r.reason] || 'Cannot buy'));
        }
        break;
      }
      case 'toggle-equip': {
        const m = CARD_META[id] || { name: id, icon: '🃏' };
        const r = g.toggleEquip(id);
        if (r.ok) {
          this.sound.playClick();
          this.showToast(r.equipped ? `${m.icon} ${m.name} equipped in slot ${r.slot}` : `${m.icon} ${m.name} benched`);
        } else {
          fail(reasonText[r.reason] || 'Cannot change deck');
        }
        break;
      }
      case 'buy-life': {
        const r = this.economy.buyVehicleLife(this.buildings.getTownHallLevel());
        if (r.ok) ok(`🚗 Spare life stocked (${RAID_BASE_LIVES + r.lives} lives total)`);
        else fail(r.reason === 'max' ? 'Max spare lives stocked' : 'Not enough resources');
        break;
      }
      case 'upgrade-lab': {
        const lab = g.getLab();
        const r = lab ? this.buildings.upgradeBuilding(lab) : { ok: false, reason: 'NO_LAB' };
        if (r && r.ok) ok(`👷 Labour assigned to ${lab.name} (${formatDuration(r.duration)})`);
        else if (r && r.reason === 'TOWN_HALL_CAP') fail(`Requires Town Hall ${r.requiredTH}`);
        else if (r && r.reason === 'NO_FREE_BUILDERS') fail(this.buildings.totalBuilders === 0 ? 'No Labour Hut on the map' : 'All labours busy');
        else if (r && r.reason === 'ALREADY_IN_PROGRESS') fail('Upgrade already in progress');
        else fail('Not enough resources');
        break;
      }
      case 'finish-lab': {
        const lab = g.getLab();
        const r = lab ? this.buildings.finishWithGems(lab) : { ok: false, reason: 'NOTHING_TO_FINISH' };
        if (r.ok) ok(`⚡ Finished instantly for 💎 ${r.gems}`);
        else if (r.reason === 'NOT_ENOUGH_GEMS') fail(`Need 💎 ${r.gems} (you have ${r.have})`);
        else fail('Nothing under construction');
        break;
      }
      default:
        return;
    }
    this.renderGarage();
  }

  /** Cost rows in the renderShopCatalog style (.req-item / req-status-ok|need). */
  _garageReqRows(cost, res) {
    if (!cost) return '';
    const row = (icon, label, have, need) => `
      <div class="req-item">
        <span>${icon} ${label}:</span>
        <span class="${have >= need ? 'req-status-ok' : 'req-status-need'}">${have.toLocaleString()} / ${need.toLocaleString()}</span>
      </div>`;
    return `<div class="blueprint-reqs">
      ${row('💰', 'Cash', res.cash, cost.cash || 0)}
      ${row('⚙️', 'Iron', res.iron, cost.iron || 0)}
      ${row('🪵', 'Wood', res.wood, cost.wood || 0)}
    </div>`;
  }

  /** Four-state primary button: buyable / gated / unaffordable / maxed. */
  _garageButtonState(can, labelOk) {
    if (can.ok) return { text: labelOk, disabled: false };
    if (can.reason === 'max') return { text: '⭐ MAXED', disabled: true };
    if (can.reason === 'lab') return { text: `🔒 REQUIRES LAB L${can.needLab}`, disabled: true };
    if (can.reason === 'tech') return { text: `🔒 REQUIRES TECH LAB L${can.needTech}`, disabled: true };
    return { text: 'NEED MORE RESOURCES ⚠️', disabled: true };
  }

  renderGarage() {
    if (!this.garageView || !this.garage) return;
    const g = this.garage;
    const res = this.economy.getResources();
    const lab = g.getLabLevel();
    const slots = g.getSlotCount();

    if (this.garageResCash) this.garageResCash.textContent = res.cash.toLocaleString();
    if (this.garageResIron) this.garageResIron.textContent = res.iron.toLocaleString();
    if (this.garageResWood) this.garageResWood.textContent = res.wood.toLocaleString();

    const badge = document.getElementById('garage-lab-badge');
    if (badge) {
      badge.textContent = lab > 0 ? `🏎️ Lab L${lab}` : '🏎️ No Vehicle Lab';
      badge.classList.toggle('is-missing', lab === 0);
    }

    const btnAttack = document.getElementById('btn-garage-attack');
    if (btnAttack) {
      const empty = g.getLoadout().length === 0;
      btnAttack.disabled = empty;
      btnAttack.title = empty ? 'Equip at least one card' : '';
    }

    document.querySelectorAll('#garage-view .garage-tab-btn').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === this.garageTab);
    });

    const note = document.getElementById('garage-side-note');
    if (note) {
      const ladder = g.getLabLadder();
      const nextRow = ladder[lab + 1];
      const next = nextRow ? `Lab L${nextRow.level} gives ${this._labRowGains(nextRow, ladder[lab])}` : 'Lab fully upgraded';
      note.innerHTML = `
        <span class="shop-th-badge">🏎️ Vehicle Lab L<strong id="garage-lab-level">${lab}</strong></span>
        ${lab > 0
          ? `Tuning cap: L${g.getTierCap()} / ${TRACKS[0].maxLevel} · Deck slots: ${slots}/${GarageManager.MAX_SLOTS} · Next: ${next}`
          : `No Vehicle Tuning Lab yet - level 1 of every upgrade is open. Buy the lab in the City Shop (Town Hall 2) to unlock deeper tiers and deck slots.
             <button id="btn-garage-to-shop" class="btn-secondary" data-action="goto-shop">🛒 GET THE LAB IN THE SHOP</button>`}
      `;
    }

    const strip = document.getElementById('garage-deck-strip');
    if (strip) strip.innerHTML = this._renderGarageDeckStrip();

    const body = document.getElementById('garage-tab-body');
    if (body) {
      body.innerHTML = this.garageTab === 'cards'
        ? this._renderGarageCards()
        : this.garageTab === 'lab'
          ? this._renderGarageLab()
          : this._renderGarageTuning();
    }

    if (g.takeMigrationNotice()) {
      this.showToast('New: ability cards are now unlocked, levelled and equipped in the Vehicle Garage', 4200);
    }
  }

  _renderGarageDeckStrip() {
    const g = this.garage;
    const slots = g.getSlotCount();
    const loadout = g.getLoadout();
    const benched = g.getBenchedCount();
    const spare = this.economy.vehicleLives || 0;

    let boxes = '';
    loadout.forEach((id, i) => {
      const m = CARD_META[id] || { name: id, icon: '🃏' };
      const lvl = g.getCardState(id).level;
      boxes += `
        <div class="garage-slot filled card-${id}" data-id="${id}" data-action="toggle-equip" title="${m.name} - click to unequip">
          <div class="card-key">${id === 'jump' ? `SPACE / ${i + 1}` : `${i + 1}`}</div>
          <span class="slot-remove">✕</span>
          <div class="card-icon">${m.icon}</div>
          <div class="card-name">${m.name}</div>
          <span class="slot-level">L${lvl}</span>
        </div>`;
    });
    for (let i = loadout.length; i < slots; i++) {
      boxes += `<div class="garage-slot empty" data-action="goto-cards">EMPTY - equip a card below</div>`;
    }
    const ladder = g.getLabLadder();
    for (let i = slots; i < GarageManager.MAX_SLOTS; i++) {
      const opens = ladder.find(r => r.slots > i);
      boxes += `<div class="garage-slot garage-slot-locked" title="Deck slot ${i + 1}">🔒<br>Lab L${opens ? opens.level : '?'}</div>`;
    }

    return `
      <div class="garage-deck-header">
        <span>
          <span class="deck-title ${loadout.length === 0 ? 'deck-empty' : ''}">${loadout.length === 0 ? 'NO CARDS EQUIPPED' : 'NEXT RAID DECK'}</span>
          &nbsp;<span id="garage-deck-count">${loadout.length}/${slots}</span>
        </span>
        <span id="garage-lives-total">🚗 Lives ${RAID_BASE_LIVES} + ${spare} spare</span>
      </div>
      <div class="garage-deck-row">${boxes}</div>
      ${benched > 0 ? `<div class="garage-deck-warning">${benched} card(s) benched - deck slots shrank to ${slots}. They return when the lab is rebuilt.</div>` : ''}
    `;
  }

  _renderGarageTuning() {
    const g = this.garage;
    const res = this.economy.getResources();
    const lab = g.getLabLevel();
    const vs = g.computeVehicleStats();

    const chips = [
      ['speed', `Top speed ${Math.round(vs.maxForwardSpeed * 2.237)} mph`],
      ['accel', `0-60 in ${(26.8 / vs.acceleration).toFixed(2)} s`],
      ['armor', `Armor ${vs.maxHp} HP + ${vs.maxShield} shield`],
      ['nitro', `Nitro x${vs.nitroSpeedMult.toFixed(2)}`],
      ['jump', `Jump ${TRACKS.find(t => t.id === 'jump').fmt(vs.jumpBoostY)}`]
    ].map(([id, txt]) => `<span class="garage-stat-chip" data-track="${id}">${txt}</span>`).join('')
      + `<span class="garage-stat-chip" title="Autocannon damage per shell against buildings / against cruisers, SWAT and drones (Weapons &amp; Munitions Lab)">Cannon ${vs.cannonDamage}/shell (${vs.cannonVsUnits} vs units)</span>`;
    const cap = g.getTierCap();

    const cards = TRACKS.map(t => {
      const cur = g.getTrackLevel(t.id);
      const can = g.canBuyTrack(t.id);
      const cost = g.getTrackCost(t.id);
      const isMax = cur >= t.maxLevel;
      const btn = this._garageButtonState(can, `UPGRADE TO L${cur + 1}`);
      const gated = can.reason === 'lab';

      let pips = '';
      for (let i = 0; i < t.maxLevel; i++) {
        let cls = 'pip';
        let title = `Level ${i + 1}`;
        if (i < cur) cls += ' filled';
        else if (i + 1 > cap) { cls += ' gated'; title = `Level ${i + 1} requires Vehicle Lab L${labForTrackLevel(i + 1)}`; }
        else if (i === cur) cls += ' next';
        pips += `<span class="${cls}" title="${title}"></span>`;
      }

      const delta = isMax
        ? `<span class="maxed">⭐ MAXED at ${t.fmt(t.value(cur))}</span>`
        : `Now ${t.fmt(t.value(cur))} → Next <span class="next">${t.fmt(t.value(cur + 1))}</span>`;

      return `
        <div class="blueprint-card garage-track-card ${gated ? 'is-gated' : ''} ${isMax ? 'is-maxed' : ''}" data-id="${t.id}">
          <div>
            <div class="blueprint-header">
              <div class="blueprint-icon">${t.icon}</div>
              <div>
                <div class="blueprint-title">${t.name}</div>
                <span class="garage-lvl-chip">L${cur} / ${t.maxLevel}</span>
              </div>
            </div>
            <div class="blueprint-helps"><span class="helps-label">WHAT IT DOES FOR YOU</span><span>${t.helps}</span></div>
            <div class="garage-pips">${pips}</div>
            <div class="garage-delta">${delta}</div>
            ${gated ? `<div class="blueprint-lock">🔒 Unlocks at Vehicle Lab L${can.needLab} - you have L${lab}</div>` : ''}
            ${isMax ? '' : this._garageReqRows(cost, res)}
          </div>
          <button class="btn-primary" data-action="buy-track" data-id="${t.id}" ${btn.disabled ? 'disabled' : ''}>${btn.text}</button>
        </div>`;
    }).join('');

    return `<div class="garage-stat-strip">${chips}</div><div class="blueprint-items-grid">${cards}</div>`;
  }

  _garageCardNumbers(id, tier) {
    if (!tier) return '';
    const parts = [`cooldown ${tier.cooldown}s${tier.uptimeCapped ? ' (uptime cap)' : ''}`];
    if (id === 'jump') parts.push(`${tier.airtime}s in the air`);
    else if (id === 'invisibility') parts.push(`cloak ${tier.duration}s`);
    else if (id === 'nitro') parts.push(`burn ${tier.duration}s`);
    else if (id === 'bomb') parts.push(`blast ${tier.blastRadius}m / ${tier.blastDamage} dmg`);
    else if (id === 'missiles') parts.push(`${tier.damage} dmg per rocket`);
    return parts.join(', ');
  }

  _renderGarageCards() {
    const g = this.garage;
    const res = this.economy.getResources();
    const slots = g.getSlotCount();
    const loadout = g.getLoadout();
    const deckFull = loadout.length >= slots;

    const cards = CARD_ORDER.map(id => {
      const m = CARD_META[id];
      const c = g.getCardState(id);
      const can = g.canBuyCard(id);
      const cost = g.getCardCost(id);
      const equippedIdx = loadout.indexOf(id);
      const inRaw = g.isEquipped(id);
      const isMax = c.unlocked && c.level >= CARD_MAX_LEVEL;
      const btn = this._garageButtonState(can, c.unlocked ? `LEVEL UP TO L${c.level + 1}` : 'UNLOCK');
      const action = c.unlocked ? 'level-card' : 'unlock-card';

      let pips = '';
      const gateTitle = can.reason === 'tech' ? `Requires Tech Lab L${can.needTech}` : `Requires Vehicle Lab L${can.needLab}`;
      for (let i = 0; i < CARD_MAX_LEVEL; i++) {
        let cls = 'pip';
        if (i < c.level) cls += ' filled';
        else if (i === c.level && (can.reason === 'lab' || can.reason === 'tech')) cls += ' gated';
        else if (i === c.level) cls += ' next';
        pips += `<span class="${cls}" ${cls.includes('gated') ? `title="${gateTitle}"` : ''}></span>`;
      }

      const curTier = c.unlocked ? g.getCardTier(id, c.level) : null;
      const nextTier = isMax ? null : g.getCardTier(id, c.unlocked ? c.level + 1 : 1);
      const numbers = c.unlocked
        ? `L${c.level}: ${this._garageCardNumbers(id, curTier)}<br>${isMax ? '<span class="maxed">⭐ MAXED</span>' : `Next L${c.level + 1}: <span class="next">${this._garageCardNumbers(id, nextTier)}</span>`}`
        : `Unlocks at L1: <span class="next">${this._garageCardNumbers(id, nextTier)}</span>`;

      let equipBtn = '';
      if (c.unlocked) {
        if (inRaw) {
          equipBtn = `<button class="btn-secondary" data-action="toggle-equip" data-id="${id}">UNEQUIP ✓</button>`;
        } else if (deckFull) {
          equipBtn = `<button class="btn-secondary" data-action="toggle-equip" data-id="${id}" disabled title="Unequip a card first">DECK FULL ${slots}/${slots}</button>`;
        } else {
          equipBtn = `<button class="btn-secondary" data-action="toggle-equip" data-id="${id}">EQUIP</button>`;
        }
      }

      const stateCls = !c.unlocked ? 'is-locked' : (equippedIdx >= 0 ? 'is-unlocked is-equipped' : 'is-unlocked');
      return `
        <div class="blueprint-card garage-card card-${id} ${stateCls}" data-id="${id}">
          <div>
            <div class="blueprint-header">
              <div class="blueprint-icon">${m.icon}</div>
              <div>
                <div class="blueprint-title">${m.name}</div>
                <span class="garage-lvl-chip">${c.unlocked ? `L${c.level} / ${CARD_MAX_LEVEL}` : '🔒 LOCKED'}</span>
                ${equippedIdx >= 0 ? `<div class="inv-owned-tag">IN DECK · KEY ${equippedIdx + 1}</div>` : ''}
              </div>
            </div>
            <p style="font-size:11px; color:var(--text-dim); margin-bottom:6px;">${m.desc}</p>
            ${id === 'jump' ? `<div class="garage-card-note">Recharges only on the ground. If benched, recharging or jammed, Space gives the small hydraulic hop instead (every ${RAIDER_BASE.hop.cooldown}s on the ground).</div>` : ''}
            <div class="garage-pips">${pips}</div>
            <div class="garage-delta">${numbers}</div>
            ${can.reason === 'lab' ? `<div class="blueprint-lock">🔒 Requires Vehicle Lab L${can.needLab} - you have L${g.getLabLevel()}</div>` : ''}
            ${can.reason === 'tech' ? `<div class="blueprint-lock">🧪 Card levels 4-5 need a Tech Lab (Town Hall 5). Requires Tech Lab L${can.needTech} - you have L${g.getTechLabLevel()}</div>` : ''}
            ${isMax ? '' : this._garageReqRows(cost, res)}
          </div>
          <div class="garage-btn-row">
            <button class="btn-primary" data-action="${action}" data-id="${id}" ${btn.disabled ? 'disabled' : ''}>${btn.text}</button>
            ${equipBtn}
          </div>
        </div>`;
    }).join('');

    return `<div class="blueprint-items-grid">${cards}</div>`;
  }

  _renderGarageLab() {
    const g = this.garage;
    const res = this.economy.getResources();
    const lab = g.getLab();
    const lvl = g.getLabLevel();
    const thLvl = this.buildings.getTownHallLevel();

    // Every row comes from progression.js via GarageManager.getLabLadder() - no numbers here.
    const ladder = g.getLabLadder();
    const rows = ladder.slice(1)
      .map((r, i) => `<tr class="${r.level === lvl ? 'current' : ''}"><td>Lab L${r.level}</td><td>${this._labRowGains(r, ladder[i])}</td></tr>`)
      .join('');

    let controls = '';
    if (!lab) {
      controls = `
        <div class="lab-lives-note">The lab is a Town Hall 2 blueprint. Buy it in the City Shop, place it in the Design Map, and every tier here opens up.</div>
        <button id="btn-garage-to-shop-2" class="btn-primary" data-action="goto-shop">🛒 BUY VEHICLE LAB IN SHOP</button>`;
    } else if (lab.isUnderConstruction) {
      const task = lab.buildTask || { remaining: 0, targetLevel: lvl + 1 };
      controls = `
        <div id="garage-lab-countdown" class="garage-lab-countdown">${formatDuration(task.remaining)} to L${task.targetLevel}</div>
        <button id="btn-garage-finish-lab" class="btn-primary" data-action="finish-lab">⚡ FINISH NOW - 💎 ${gemsToFinish(task.remaining)}</button>`;
    } else if (lvl >= MAX_BUILDING_LEVEL) {
      controls = `
        <button id="btn-garage-upgrade-lab" class="btn-primary" disabled>⭐ LAB FULLY UPGRADED (L${lvl})</button>`;
    } else if (lvl + 1 > thLvl) {
      controls = `
        <div class="blueprint-lock">🔒 Lab L${lvl + 1} needs Town Hall ${lvl + 1} - you are Town Hall ${thLvl}</div>
        <button id="btn-garage-upgrade-lab" class="btn-primary" disabled>🔒 REQUIRES TOWN HALL ${lvl + 1}</button>`;
    } else {
      const cost = this.buildings.getUpgradeCost(lab);
      const time = this.buildings.getBuildTime('vehicle_lab', lvl + 1);
      controls = `
        ${this._garageReqRows(cost, res)}
        <button id="btn-garage-upgrade-lab" class="btn-primary" data-action="upgrade-lab">🔨 UPGRADE LAB TO L${lvl + 1} (⏱️${formatDuration(time)})</button>`;
    }

    const spare = this.economy.vehicleLives || 0;
    const max = EconomyManager.MAX_SPARE_LIVES;
    const lifeCost = EconomyManager.lifeCostFor(thLvl);   // priced for this Town Hall
    const atMax = spare >= max;
    const canAffordLife = this.economy.canAfford(lifeCost);
    const lifeBtnText = atMax
      ? '✅ MAX LIVES STOCKED'
      : canAffordLife
        ? `BUY SPARE LIFE — 💰${lifeCost.cash.toLocaleString()} ⚙️${lifeCost.iron.toLocaleString()} 🪵${lifeCost.wood.toLocaleString()}`
        : 'NEED MORE RESOURCES ⚠️';

    return `
      <div class="garage-lab-stack">
        <div class="blueprint-card" id="garage-lab-panel">
          <div class="blueprint-header">
            <div class="blueprint-icon">🏎️</div>
            <div>
              <div class="blueprint-title">${lab ? `Vehicle Tuning Lab L${lvl}` : 'No Vehicle Tuning Lab'}</div>
              <span class="garage-lvl-chip">${lab ? `Cap L${g.getTierCap()} · ${g.getSlotCount()} deck slots` : 'Level 1 of everything is open'}</span>
            </div>
          </div>
          <table class="garage-lab-table"><tbody>${rows}</tbody></table>
          ${controls}
        </div>

        ${this._renderGarageResearch()}

        <div class="blueprint-card">
          <div class="lab-lives-panel">
            <div class="lab-lives-row">
              <span>🚗 Buggy lives per raid</span>
              <strong>${RAID_BASE_LIVES} base + ${spare} spare</strong>
            </div>
            <div class="lab-lives-note">Every raid starts with ${RAID_BASE_LIVES} lives. Spares (max ${max}) are used once those are gone. A spare is priced for your Town Hall (Town Hall ${thLvl} now).</div>
            ${atMax ? '' : this._garageReqRows(lifeCost, res)}
            <button id="btn-garage-buy-life" class="btn-primary" data-action="buy-life" ${(atMax || !canAffordLife) ? 'disabled' : ''}>${lifeBtnText}</button>
          </div>
        </div>
      </div>`;
  }

  /** "tuning L5 · +25 shield (125 total) · deck slot 5 · card L3" for one Vehicle Lab level. */
  _labRowGains(row, prev) {
    const parts = [];
    if (row.opensTrack) parts.push(`tuning L${row.trackCap}`);
    if (prev && row.shield > prev.shield) parts.push(`+${row.shield - prev.shield} shield (${row.shield} total)`);
    if (row.opensSlot) parts.push(`deck slot ${row.slots}`);
    const labOnly = row.cardLevels.filter(c => !c.tech).map(c => c.level);
    const withTech = row.cardLevels.filter(c => c.tech).map(c => c.level);
    if (labOnly.length) parts.push(`card L${labOnly.join('/')}`);
    if (withTech.length) parts.push(`card L${withTech.join('/')} with a Tech Lab`);
    return parts.join(' · ') || '-';
  }

  /** Tech Lab + Weapons & Munitions Lab: the other two garage labs and what they give now. */
  _renderGarageResearch() {
    const r = this.garage.getResearchSummary();
    const techDef = BUILDING_DEFS.tech_lab;
    const wlDef = BUILDING_DEFS.weapons_lab;
    // The cut is capped per card: a cloak, jump or nitro already at its uptime cap gains less
    // or nothing (the Cards tab tags those "(uptime cap)"), so the summary says "up to".
    const capped = Object.entries(CARD_UPTIME_CAP)
      .map(([id, cap]) => `${CARD_META[id] ? CARD_META[id].name : id} ${Math.round(cap * 100)}%`).join(', ');
    const tech = r.techLevel > 0
      ? `Ability cards recharge up to <strong>${r.cooldownCutPct}%</strong> faster${r.techLevel < MAX_BUILDING_LEVEL ? ` (L${r.techLevel + 1}: ${r.nextCooldownCutPct}%)` : ''}; a card at its uptime cap (${capped}) gains less or nothing. Tech Lab L1 / L2 open card levels 4 / 5.`
      : `Not built. A Town Hall ${techDef.unlockTH} blueprint: it opens card levels 4-5 and recharges your cards faster each level.`;
    const wl = r.weaponsLevel > 0
      ? `Drop Bomb &amp; Twin Missiles <strong>+${r.ordnanceDamagePct}%</strong> damage, Drop Bomb <strong>+${r.bombRadiusPct}%</strong> radius, autocannon <strong>+${r.cannonPct}%</strong> (${r.cannonDamage} per shell on buildings, ${r.cannonVsUnits} on cruisers, SWAT and drones).`
      : `Not built. A Town Hall ${wlDef.unlockTH} blueprint: every level hits harder with bombs, missiles and the autocannon.`;
    return `
        <div class="blueprint-card" id="garage-research-panel">
          <div class="lab-lives-panel">
            <div class="lab-lives-row"><span>${techDef.icon} ${techDef.name}</span><strong>${r.techLevel > 0 ? `L${r.techLevel}` : 'none'}</strong></div>
            <div class="lab-lives-note">${tech}</div>
            <div class="lab-lives-row"><span>${wlDef.icon} ${wlDef.name}</span><strong>${r.weaponsLevel > 0 ? `L${r.weaponsLevel}` : 'none'}</strong></div>
            <div class="lab-lives-note">${wl}</div>
          </div>
        </div>`;
  }

  _initHarvestAnimations() {
    this.grid.onHarvest = ({ type, amount, payout, clientX, clientY }) => {
      this.spawnFloatingReward(clientX, clientY, type, amount, payout);
    };
  }

  /**
   * For a producer that pays more than one resource (the Antimatter Collider), what tapping
   * it right now would bank - straight from progression.producePayout, never re-derived.
   */
  _multiPayoutNote(building) {
    if (!building || !building.produceType || building.raidOnly) return '';
    const icons = { cash: '💰', iron: '⚙️', wood: '🪵' };
    const unit = producePayout(building.produceType, 1000);
    const paid = Object.keys(icons).filter(k => unit[k] > 0);
    if (paid.length < 2) return '';
    const pay = producePayout(building.produceType, building.stored || 0);
    return ` &nbsp;→ ${paid.map(k => `${icons[k]}${pay[k].toLocaleString()}`).join(' ')}`;
  }

  /**
   * "+N icon" over the tapped producer. `payout` is what the bank actually received per
   * resource; a producer that pays more than one (the Antimatter Collider) lists each.
   */
  spawnFloatingReward(clientX, clientY, type, amount, payout = null) {
    if (!this.harvestContainer) return;

    const ICONS = { cash: '💰', iron: '⚙️', wood: '🪵' };
    const COLORS = { cash: '#ffd700', iron: '#00e5ff', wood: '#8bc34a' };
    const parts = payout
      ? ['cash', 'iron', 'wood'].filter(k => payout[k] > 0).map(k => `+${payout[k].toLocaleString()} ${ICONS[k]}`)
      : [];
    const single = parts.length <= 1;
    const key = ICONS[type] ? type : 'cash';

    const el = document.createElement('div');
    el.className = 'floating-reward';
    el.style.left = `${clientX || window.innerWidth / 2}px`;
    el.style.top = `${clientY || window.innerHeight / 2}px`;
    el.style.color = single ? COLORS[key] : '#e040fb';
    el.textContent = parts.length ? parts.join('  ') : `+${amount} ${ICONS[key]}`;

    this.harvestContainer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, 1300);
  }

  _initEconomyListeners() {
    this.economy.onUpdate = (res) => {
      if (this.resCash) this.resCash.textContent = res.cash.toLocaleString();
      if (this.resIron) this.resIron.textContent = res.iron.toLocaleString();
      if (this.resWood) this.resWood.textContent = res.wood.toLocaleString();
      if (this.resGems) this.resGems.textContent = Math.floor(this.economy.gems || 0).toLocaleString();

      if (this.shopResCash) this.shopResCash.textContent = res.cash.toLocaleString();
      if (this.shopResIron) this.shopResIron.textContent = res.iron.toLocaleString();
      if (this.shopResWood) this.shopResWood.textContent = res.wood.toLocaleString();

      if (this.garageResCash) this.garageResCash.textContent = res.cash.toLocaleString();
      if (this.garageResIron) this.garageResIron.textContent = res.iron.toLocaleString();
      if (this.garageResWood) this.garageResWood.textContent = res.wood.toLocaleString();

      // A collect or refund can make the open panel's upgrade affordable.
      this.refreshBuildingInspector();
    };

    this.economy.onInventoryUpdate = () => {
      if (this.currentScreen === 'DESIGN') {
        this.renderDesignInventory();
      }
      this.refreshBuildingInspector();
    };
  }

  showBuildingInspector(building) {
    // The city grid listens on window, so a stray combat click used to pop this panel over
    // the HUD mid-raid. Allow-list the builder screens so future screens stay covered too.
    if (this.currentScreen !== 'HOME' && this.currentScreen !== 'DESIGN') return;

    if (!this.inspectorModal) return;
    if (!building) {
      this.currentInspectedBuilding = null;
      this.inspectorModal.classList.add('hidden');
      return;
    }

    // On the home map a tap on the Vehicle Tuning Lab IS the garage: open it on the Lab tab,
    // which carries the lab's upgrade / finish-now / buy-in-shop controls and the spare lives.
    if (building.type === 'vehicle_lab' && this.currentScreen === 'HOME' && this.garage) {
      this.openGarage('lab');
      return;
    }

    this.currentInspectedBuilding = building;
    this.inspectorModal.classList.remove('hidden');
    const content = document.getElementById('inspector-content');
    if (!content) return;

    const thLvl = this.buildings.getTownHallLevel();
    const curLvl = building.level || 1;
    const nextLvl = curLvl + 1;
    const isMainGate = building.isMainGate;
    // Gates, trees and Labour Huts have no levels (catalog upgradeable:false) - the same rule
    // BuildingManager.upgradeBuilding enforces, so the inspector never offers a dead button.
    const isFixed = isMainGate || this.buildings.catalog[building.type]?.upgradeable === false;
    const isTownHall = building.type === 'town_hall';
    const isMax = isTownHall ? nextLvl > MAX_TOWN_HALL_LEVEL : (nextLvl > MAX_TOWN_HALL_LEVEL || nextLvl > thLvl);
    const requiresTH = !isTownHall && nextLvl > thLvl;
    const cost = this.buildings.getUpgradeCost(building);
    const buildTime = this.buildings.getBuildTime(building.type, nextLvl);
    const isDesignMode = this.currentScreen === 'DESIGN';
    // Structures are no longer destroyed - they are put away in the Big Storage Depot and can be
    // placed again later. Only pure decoration can actually be removed from the map.
    const isDecorative = (building.type === 'tree');
    // The stow gate lives in BuildingManager.canStow (depot capacity = slotsPerLevel x level).
    const stow = this.buildings.canStow(building);
    const stowable = !isMainGate && !isTownHall && !isDecorative;
    const canStow = stowable && stow.ok;
    const storageFull = stowable && stow.reason === 'STORAGE_FULL';
    const needsStorage = stowable && stow.reason === 'NO_DEPOT';
    const isUnderConstruction = building.isUnderConstruction;
    const freeBuilders = this.buildings.freeBuilders;

    let actionButtonsHtml = '';

    // Vehicle Tuning Lab (design mode): tuning, cards, the raid deck and spare lives all live
    // in the Vehicle Garage, so the inspector only deep-links there and keeps move / stow.
    // Kept in its own variable: the upgrade branches below ASSIGN actionButtonsHtml.
    let labLivesHtml = '';
    if (building.type === 'vehicle_lab' && this.garage) {
      const spare = this.economy.vehicleLives || 0;
      const lvl = building.level || 1;
      labLivesHtml = `
        <div class="lab-lives-panel">
          <div class="lab-lives-row">
            <span>🏎️ Tuning tier</span>
            <strong>Lab L${lvl} · cap L${trackCapFor(lvl)}</strong>
          </div>
          <div class="lab-lives-row">
            <span>🚗 Buggy lives per raid</span>
            <strong>${RAID_BASE_LIVES} base + ${spare} spare</strong>
          </div>
          <div class="lab-lives-note">Upgrades, ability cards, the raid deck and spare lives are managed in the Vehicle Garage.</div>
          <button id="btn-open-garage-from-lab" class="btn-primary">🔧 OPEN VEHICLE GARAGE</button>
        </div>
      `;
    }

    if (isUnderConstruction) {
      const task = building.buildTask || { remaining: 10, total: 10, targetLevel: nextLvl };
      const remainingSecs = Math.max(1, Math.ceil(task.remaining));
      const pct = Math.max(5, Math.min(100, Math.round((1 - task.remaining / (task.total || 1)) * 100)));

      actionButtonsHtml = `
        <div style="background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.3); border-radius: 8px; padding: 12px; margin: 10px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 13px; color: #ffd700; font-weight: 600;">
              🔨 Upgrading to Tier ${task.targetLevel}...
            </span>
            <span id="inspector-timer-countdown" style="font-size: 13px; color: #00e5ff; font-weight: 700;">
              ${formatDuration(remainingSecs)}
            </span>
          </div>
          <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
            <div id="inspector-progress-fill" style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #00e5ff, #ffd700); transition: width 0.3s ease;"></div>
          </div>
        </div>
        <button id="btn-finish-instant" class="btn-primary" style="background: linear-gradient(135deg, #ffd700, #ff9800); color: #06101c; font-weight: bold; margin-bottom: 8px;">
          ⚡ FINISH NOW - 💎 ${this.buildings.gemCostToFinish(building)}
        </button>
      `;
    } else if (isFixed) {
      actionButtonsHtml = `
        <div id="inspector-fixed-note" style="padding: 8px; background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.25); border-radius: 6px; font-size: 12px; color: var(--text-dim); margin-bottom: 8px;">
          ${isMainGate ? 'Main Gates are fixed: they are never bought or upgraded.' : 'This has no levels to upgrade.'}
        </div>
      `;
    } else if (!isMax) {
      const res = this.economy.getResources();
      const canAfford = res.cash >= cost.cash && res.iron >= cost.iron && res.wood >= cost.wood;
      const canStart = canAfford && freeBuilders > 0;

      let btnText = `🔨 Upgrade to Tier ${nextLvl} (⏱️${formatDuration(buildTime)})`;
      if (freeBuilders <= 0) {
        btnText = this.buildings.totalBuilders === 0
          ? `NO LABOUR HUT - PLACE ONE FIRST ⚠️`
          : `ALL LABOURS BUSY (${this._labourAdvice().short}) ⚠️`;
      } else if (!canAfford) {
        btnText = `NEED MORE RESOURCES ⚠️`;
      }

      actionButtonsHtml = `
        ${isTownHall ? this._townHallPreviewHtml(nextLvl) : ''}
        <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 6px;">
          Upgrade Cost: 💰${cost.cash.toLocaleString()} &nbsp; ⚙️${cost.iron.toLocaleString()} &nbsp; 🪵${cost.wood.toLocaleString()}
        </div>
        <button id="btn-upgrade-building" class="btn-primary" ${canStart ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>
          ${btnText}
        </button>
      `;
    } else if (requiresTH) {
      actionButtonsHtml = `
        <div style="padding: 8px; background: rgba(255,82,82,0.15); border: 1px solid rgba(255,82,82,0.4); border-radius: 6px; font-size: 12px; color: #ff8a80; margin-bottom: 8px;">
          🔒 Requires Town Hall Tier ${nextLvl} to upgrade further!
        </div>
      `;
    } else if (isMax) {
      actionButtonsHtml = `
        <div style="padding: 8px; background: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.3); border-radius: 6px; font-size: 12px; color: #00e5ff; margin-bottom: 8px;">
          ⭐ Maximum Upgrade Tier Reached!
        </div>
      `;
    }

    content.innerHTML = `
      <h3>${this._getTypeIcon(building.type)} ${building.name}</h3>
      <p class="desc">${this.buildings.catalog[building.type]?.desc || ''}</p>
      <div class="stats-row">
        <span>Tier: <strong>Level ${building.level || 1}</strong></span>
        <span>HP: <strong>${Math.round(building.hp)} / ${Math.round(building.maxHp)}</strong></span>
        ${building.produceType ? `<span>${building.raidOnly ? 'Sealed inside' : 'Stored'}: <strong><span id="inspector-stored">${Math.floor(building.stored || 0).toLocaleString()}</span> / ${Math.round(building.maxCapacity).toLocaleString()}</strong>${this._multiPayoutNote(building)}</span>` : ''}
      </div>
      ${building.raidOnly ? `<div class="needs-storage-note">🔐 Cannot be tapped. Everything sealed inside is added to your raid loot the moment your raider destroys this vault.</div>` : ''}
      <div class="inspector-actions">
        ${labLivesHtml}
        ${actionButtonsHtml}
        ${isDesignMode && this.grid.isDraggableBuilding(building) ? `
          <button id="btn-relocate-building" class="btn-primary" style="background: linear-gradient(135deg, #00e5ff, #0091ea); color: #06101c;">
            ✋ Pick Up & Move
          </button>
        ` : ''}
        ${isDesignMode && isUnderConstruction ? `
          <div class="needs-storage-note">🔨 Under construction - it can be moved once the upgrade finishes.</div>
        ` : ''}
        ${canStow ? `
          <button id="btn-stow-building" class="btn-secondary">
            📦 Move to Big Storage (${stow.used} / ${stow.capacity} used)
          </button>
          ${building.produceType ? `<div class="needs-storage-note">${building.raidOnly
            ? '🔐 Stowing keeps the cash sealed inside - it goes back in when you place this vault again.'
            : '📦 Anything stored is banked when you put it away.'}</div>` : ''}
        ` : ''}
        ${storageFull ? `
          <div class="needs-storage-note">
            📦 Big Storage is full (${stow.used} / ${stow.capacity}). Place a stowed building back on the map,
            upgrade a depot (+${BUILDING_DEFS.big_storage.storage.slotsPerLevel} slots per level) or build another one.
          </div>
        ` : ''}
        ${needsStorage ? `
          <div class="needs-storage-note">
            📦 Build a <strong>Big Storage Depot</strong> (Town Hall 3) to put this structure away.
            Buildings are never demolished - they are stored so you can place them again.
          </div>
        ` : ''}
        ${isDecorative ? `<button id="btn-demolish-building" class="btn-danger">🌲 Clear Decoration</button>` : ''}
        <button id="btn-close-inspector" class="btn-secondary">Close</button>
      </div>
    `;
    this._inspectorShownState = this._inspectorState(building);

    const btnLabGarage = document.getElementById('btn-open-garage-from-lab');
    if (btnLabGarage) {
      btnLabGarage.addEventListener('click', () => {
        this.sound.playClick();
        this.openGarage('lab');   // hides the inspector and remembers DESIGN as the return screen
      });
    }

    // Every button below acts on `building`. If the city has since replaced it (a layout preset
    // rebuilds every building), the panel is stale: close it instead of acting on a ghost.
    const staleGuard = (r) => {
      if (!r || r.reason !== 'NOT_IN_CITY') return false;
      this.sound.playCrash(0.3);
      this.hideBuildingInspector();
      this.showToast('That building was rearranged - tap it on the map again.');
      return true;
    };

    const btnFinish = document.getElementById('btn-finish-instant');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        const r = this.buildings.finishWithGems(building);
        if (staleGuard(r)) return;
        if (!r.ok) {
          this.showToast(r.reason === 'NOT_ENOUGH_GEMS'
            ? `💎 Need ${r.gems} gems (you have ${r.have}). Win raids to earn more.`
            : 'Nothing to finish.');
          return;
        }
        this.sound.playUpgrade();
        this.showToast(`⚡ Finished instantly for 💎 ${r.gems}`);
        this.showBuildingInspector(building);
      });
    }

    const btnUpgrade = document.getElementById('btn-upgrade-building');
    if (btnUpgrade) {
      btnUpgrade.addEventListener('click', () => {
        const res = this.buildings.upgradeBuilding(building);
        if (staleGuard(res)) return;
        if (res && res.ok) {
          this.sound.playUpgrade();
          this.showToast(`👷 Labour assigned to ${building.name} (${formatDuration(res.duration)})!`);
          this.showBuildingInspector(building);
        } else if (res && res.reason === 'NO_FREE_BUILDERS') {
          this.sound.playCrash(0.3);
          alert(this.buildings.totalBuilders === 0
            ? 'You have no Labour Hut on the map. Each hut houses one labourer - place one from your inventory or buy one in the City Shop.'
            : `All labours are currently busy! ${this._labourAdvice().long}`);
        } else if (res && res.reason === 'TOWN_HALL_CAP') {
          alert(`Requires Town Hall Level ${res.requiredTH}! Upgrade Town Hall first.`);
        } else {
          this.sound.playCrash(0.3);
          alert('Not enough resources to upgrade!');
        }
      });
    }

    const btnRelocate = document.getElementById('btn-relocate-building');
    if (btnRelocate) {
      btnRelocate.addEventListener('click', () => {
        if (!this.buildings.isInCity(building)) { staleGuard({ reason: 'NOT_IN_CITY' }); return; }
        this.sound.playClick();
        this.hideBuildingInspector();
        this.grid.setMode('relocate', building);
      });
    }

    const btnStow = document.getElementById('btn-stow-building');
    if (btnStow) {
      btnStow.addEventListener('click', () => {
        if (staleGuard(this.buildings.canStow(building))) return;
        const e = this.economy;
        const bank0 = { cash: e.cash, iron: e.iron, wood: e.wood };
        const sealed = building.raidOnly ? Math.floor(building.stored || 0) : 0;
        if (!this.buildings.stowBuilding(building)) {
          this.sound.playCrash(0.3);
          this.showToast('📦 Big Storage is full - upgrade a depot or place something back first.');
          return;
        }
        this.sound.playPlace();
        this.hideBuildingInspector();
        this.renderDesignInventory();
        // Say where its contents went: tappable output is banked, a vault's stays sealed.
        const banked = [['cash', '💰'], ['iron', '⚙️'], ['wood', '🪵']]
          .map(([k, icon]) => [Math.floor(e[k] - bank0[k]), icon])
          .filter(([n]) => n > 0)
          .map(([n, icon]) => `${icon}${n.toLocaleString()}`);
        let msg = `📦 ${building.name} moved to Big Storage.`;
        if (banked.length) msg += ` Banked ${banked.join(' ')} it had stored.`;
        if (sealed > 0) msg += ` 🔐${sealed.toLocaleString()} stays sealed inside it.`;
        this.showToast(msg);
      });
    }

    const btnDemolish = document.getElementById('btn-demolish-building');
    if (btnDemolish) {
      btnDemolish.addEventListener('click', () => {
        this.buildings.removeBuilding(building);
        this.sound.playCrash(0.5);
        this.hideBuildingInspector();
      });
    }

    const btnClose = document.getElementById('btn-close-inspector');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.hideBuildingInspector();
      });
    }
  }

  hideBuildingInspector() {
    this.currentInspectedBuilding = null;
    if (this.inspectorModal) {
      this.inspectorModal.classList.add('hidden');
    }
  }

  showRedesignModal() {
    if (this.redesignModal) {
      this._renderPresetFit();
      this.redesignModal.classList.remove('hidden');
    }
  }

  /** Each template card says what it would keep on the map for THIS city (previewPreset). */
  _renderPresetFit() {
    document.querySelectorAll('#redesign-modal .preset-fit[data-fit-for]').forEach(el => {
      const pv = this.buildings.previewPreset(el.getAttribute('data-fit-for'));
      if (!pv.ok) { el.textContent = ''; return; }
      const lossy = pv.stowed > 0 || pv.jobsRefunded > 0;
      el.classList.toggle('is-lossy', lossy);
      if (!lossy) {
        el.textContent = `✅ Fits all ${pv.owned} of your buildings.`;
        return;
      }
      const parts = [`Keeps ${pv.kept} of your ${pv.owned} buildings on the map`];
      if (pv.stowed > 0) parts.push(`${pv.stowed} to storage${pv.turrets ? ` (${pv.turrets} ${pv.turrets === 1 ? 'turret' : 'turrets'})` : ''}`);
      if (pv.jobsRefunded > 0) parts.push(`${pv.jobsRefunded} ${pv.jobsRefunded === 1 ? 'upgrade' : 'upgrades'} cancelled`);
      el.textContent = `⚠️ ${parts.join(' · ')}`;
    });
  }

  /**
   * The confirm() a lossy preset needs. Everything comes from BuildingManager.previewPreset, the
   * same plan applyPreset carries out.
   */
  _presetWarning(title, pv) {
    const lines = [`Apply ${title}?`, ''];
    if (pv.stowed > 0) {
      const which = [];
      if (pv.turrets > 0) which.push(`${pv.turrets} ${pv.turrets === 1 ? 'turret' : 'turrets'}`);
      const otherDefense = pv.defenses - pv.turrets;
      if (otherDefense > 0) which.push(`${otherDefense} other defense ${otherDefense === 1 ? 'building' : 'buildings'}`);
      if (pv.trees > 0) which.push(`${pv.trees} ${pv.trees === 1 ? 'tree' : 'trees'}`);
      const listed = which.length > 1 ? `${which.slice(0, -1).join(', ')} and ${which[which.length - 1]}` : which.join('');
      lines.push(`• ${pv.stowed} of your ${pv.owned} buildings have no slot in this layout and go to storage at their level` +
        `${listed ? `, including ${listed}` : ''}.`);
      if (pv.storageUsedAfter > pv.storageCapacityAfter) {
        lines.push(`• Storage will read ${pv.storageUsedAfter} / ${pv.storageCapacityAfter}: nothing else can be stowed by hand until you place some back.`);
      }
    }
    if (pv.jobsRefunded > 0) {
      lines.push(`• ${pv.jobsRefunded} running ${pv.jobsRefunded === 1 ? 'upgrade is' : 'upgrades are'} cancelled and refunded (the time already built is lost).`);
    }
    lines.push('', 'Undo Template puts everything back, until you change anything else.');
    return lines.join('\n');
  }

  /** Show Undo Template only while the last preset can still be taken back. */
  _updateUndoPresetBtn() {
    const btn = document.getElementById('btn-undo-preset');
    if (btn) btn.classList.toggle('hidden', !this.buildings.canUndoPreset().ok);
  }

  hideRedesignModal() {
    if (this.redesignModal) {
      this.redesignModal.classList.add('hidden');
    }
  }

  showCombatHUD() {
    this.setScreen('COMBAT');
    this.hideBuildingInspector();
  }

  showBuilderHUD() {
    this.setScreen('HOME');
  }

  showTacticalReconBanner(onAbort) {
    this.onAbortRecon = onAbort;
    this.setScreen('RECON');
  }

  hideTacticalReconBanner() {
    if (this.reconBanner) this.reconBanner.classList.add('hidden');
  }

  showMappingScanEffect(gateName) {
    if (this.scanGateName) {
      this.scanGateName.textContent = gateName.toUpperCase();
    }
    if (this.scanOverlay) {
      this.scanOverlay.classList.remove('hidden');
    }
  }

  hideMappingScanEffect() {
    if (this.scanOverlay) {
      this.scanOverlay.classList.add('hidden');
    }
  }

  updateCombatHUD(data) {
    // Health & Shield
    if (this.barHp) {
      const hpPct = Math.max(0, Math.min(100, (data.hp / data.maxHp) * 100));
      this.barHp.style.width = `${hpPct}%`;
      if (hpPct < 25) {
        this.barHp.style.background = '#f44336';
      } else if (hpPct < 55) {
        this.barHp.style.background = '#ff9800';
      } else {
        this.barHp.style.background = '#4caf50';
      }
    }
    // Aura, splash and laser-pierce damage are fractional, so round like the floating armor bar
    // (updateVehicleHealthBar) - the raw value read '457.15999999999997 / 500' and wrapped.
    if (this.textHp) this.textHp.textContent = `${Math.max(0, Math.ceil(data.hp))} / ${Math.round(data.maxHp)}`;
    if (this.barShield) {
      const shieldPct = Math.max(0, Math.min(100, (data.shield / data.maxShield) * 100));
      this.barShield.style.width = `${shieldPct}%`;
    }
    if (this.speedText) this.speedText.textContent = `${data.speed} MPH`;

    // Destruction & Stars
    if (this.barDestruction) {
      this.barDestruction.style.width = `${data.destructionPct}%`;
    }
    if (this.destructText) {
      this.destructText.textContent = `${data.destructionPct}%`;
    }
    if (this.starsContainer) {
      const s = data.stars;
      this.starsContainer.innerHTML = `
        <span class="${s >= 1 ? 'star-gold' : 'star-dim'}">⭐</span>
        <span class="${s >= 2 ? 'star-gold' : 'star-dim'}">⭐</span>
        <span class="${s >= 3 ? 'star-gold' : 'star-dim'}">⭐</span>
      `;
    }

    // Loot
    if (this.lootedCash) this.lootedCash.textContent = data.looted.cash.toLocaleString();
    if (this.lootedIron) this.lootedIron.textContent = data.looted.iron.toLocaleString();
    if (this.lootedWood) this.lootedWood.textContent = data.looted.wood.toLocaleString();
    if (this.copsWreckedText) this.copsWreckedText.textContent = data.policeWrecked;

    // Render In-Game Driving Minimap with moving police cars & roads!
    if (data.playerPos) {
      this.drawRadar(
        data.playerPos,
        data.playerHeading,
        data.policeUnits,
        data.roadblocks,
        data.buildings,
        data.roadNetwork
      );
    }
  }

  drawRadar(playerPos, playerHeading, policeUnits = [], roadblocks = [], buildings = [], roadNetwork = null) {
    if (!this.radarCtx || !playerPos) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 4;
    const worldScale = radius / 80.0; // 80 meters visual radar radius

    ctx.clearRect(0, 0, w, h);

    // Radar background circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#06101c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00e5ff';
    ctx.stroke();

    // Range rings
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    [0.33, 0.66, 1.0].forEach(rRatio => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * rRatio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.stroke();

    // Clip to radar circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
    ctx.clip();

    // 1. Render Paved Roads topology on Minimap!
    if (roadNetwork && roadNetwork.roads) {
      ctx.fillStyle = '#263238';
      const tileSizePx = (roadNetwork.tileSize || 5.5) * worldScale;
      roadNetwork.roads.forEach(road => {
        const rWorldX = road.gx * (roadNetwork.tileSize || 5.5);
        const rWorldZ = road.gz * (roadNetwork.tileSize || 5.5);
        const dx = (rWorldX - playerPos.x) * worldScale;
        const dz = (rWorldZ - playerPos.z) * worldScale;
        if (Math.hypot(dx, dz) < radius + 10) {
          ctx.fillRect(cx + dx - tileSizePx / 2, cy + dz - tileSizePx / 2, tileSizePx + 1, tileSizePx + 1);
        }
      });
    }

    // 2. Buildings (as subtle dots / gates as orange bars)
    if (buildings) {
      buildings.forEach(b => {
        // A buried landmine hides its mesh until it fires - the radar must not give it away.
        if (b.isDestroyed || !b.mesh || !b.mesh.visible) return;
        const dx = (b.mesh.position.x - playerPos.x) * worldScale;
        const dz = (b.mesh.position.z - playerPos.z) * worldScale;
        if (Math.hypot(dx, dz) < radius) {
          if (b.isMainGate) {
            ctx.fillStyle = '#ff9100';
            ctx.fillRect(cx + dx - 4, cy + dz - 4, 8, 8);
          } else {
            ctx.fillStyle = b.isExplosive ? '#ff1744' : '#455a64';
            ctx.beginPath();
            ctx.arc(cx + dx, cy + dz, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // 3. Dropped Roadblocks (yellow hazard squares)
    if (roadblocks) {
      roadblocks.forEach(rb => {
        if (rb.isDestroyed) return;
        const dx = (rb.position.x - playerPos.x) * worldScale;
        const dz = (rb.position.z - playerPos.z) * worldScale;
        if (Math.hypot(dx, dz) < radius) {
          ctx.fillStyle = '#ffd600';
          ctx.fillRect(cx + dx - 2.5, cy + dz - 2.5, 5, 5);
        }
      });
    }

    // 4. Actively Moving Police Cruisers with Pulsing Siren Cones!
    if (policeUnits) {
      const now = performance.now() * 0.008;
      policeUnits.forEach((cop, i) => {
        if (cop.isDestroyed) return;
        const dx = (cop.position.x - playerPos.x) * worldScale;
        const dz = (cop.position.z - playerPos.z) * worldScale;
        if (Math.hypot(dx, dz) < radius) {
          const isBlue = Math.sin(now + i) > 0;
          ctx.fillStyle = isBlue ? '#2979ff' : '#ff1744';
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dz, 4, 0, Math.PI * 2);
          ctx.fill();

          // Siren alert wave ring
          ctx.strokeStyle = isBlue ? 'rgba(41, 121, 255, 0.5)' : 'rgba(255, 23, 68, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dz, 7, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    // 5. Center Player Assault Vehicle Pointer
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI - playerHeading); // points in forward driving direction
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  renderCardsDeck(cards, onCardClick) {
    if (!this.cardsContainer) return;
    this.cardsContainer.innerHTML = '';

    cards.forEach(card => {
      const cardEl = document.createElement('button');
      cardEl.type = 'button';
      // Out of the tab order and never focused by a click: a focused card button re-fired on
      // Enter (Space is safe - CardSystem swallows it for the Big Jump). The number keys are
      // the keyboard path to every card.
      cardEl.tabIndex = -1;
      cardEl.addEventListener('mousedown', (e) => e.preventDefault());
      cardEl.className = `action-card card-${card.id} ${card.currentCooldown > 0 ? 'on-cooldown' : ''}`;
      cardEl.id = `card-${card.id}`;
      cardEl.title = `${card.name}: ${card.desc || ''}`;

      const pct = card.currentCooldown > 0 ? (card.currentCooldown / card.cooldown) * 100 : 0;

      cardEl.innerHTML = `
        <div class="card-key">${card.key}</div>
        <div class="card-icon">${card.icon}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-cooldown-overlay" style="height: ${pct}%"></div>
        ${card.currentCooldown > 0 ? `<div class="card-timer">${Math.ceil(card.currentCooldown)}s</div>` : ''}
      `;

      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        cardEl.blur();
        if (onCardClick) onCardClick(card.id);
      });

      this.cardsContainer.appendChild(cardEl);
    });
  }

  updateCardsDeck(cards) {
    cards.forEach(card => {
      const cardEl = document.getElementById(`card-${card.id}`);
      if (!cardEl) return;

      const overlay = cardEl.querySelector('.card-cooldown-overlay');
      const timer = cardEl.querySelector('.card-timer');

      if (card.currentCooldown > 0) {
        cardEl.classList.add('on-cooldown');
        const pct = (card.currentCooldown / card.cooldown) * 100;
        if (overlay) overlay.style.height = `${pct}%`;

        if (timer) {
          timer.textContent = `${Math.ceil(card.currentCooldown)}s`;
        } else {
          const t = document.createElement('div');
          t.className = 'card-timer';
          t.textContent = `${Math.ceil(card.currentCooldown)}s`;
          cardEl.appendChild(t);
        }
      } else {
        cardEl.classList.remove('on-cooldown');
        if (overlay) overlay.style.height = '0%';
        if (timer) timer.remove();
      }
    });
  }

  showResultModal(stats, onFinish) {
    if (!this.resultModal) return;
    this.resultModal.classList.remove('hidden');

    const content = document.getElementById('result-content');
    if (!content) return;

    content.innerHTML = `
      <div class="result-badge ${stats.outcome === 'victory' ? 'result-victory' : ''}">${
        stats.outcome === 'victory' ? '🏆 100% DESTRUCTION - ATTACK COMPLETED! 🏆'
        : stats.outcome === 'retreat' ? '🏳️ RETREATED - LOOT SECURED'
        : stats.outcome === 'busted' ? '🚨 BUSTED BY POLICE - OUT OF LIVES 🚨'
        : '💥 BUGGY DESTROYED - OUT OF LIVES 💥'}</div>
      <div class="result-stars">
        <span class="${stats.stars >= 1 ? 'star-gold' : 'star-dim'}">⭐</span>
        <span class="${stats.stars >= 2 ? 'star-gold' : 'star-dim'}">⭐</span>
        <span class="${stats.stars >= 3 ? 'star-gold' : 'star-dim'}">⭐</span>
      </div>
      <h2>Destruction: ${stats.percentage}%</h2>
      <div class="result-grid">
        <div class="result-metric">
          <span class="label">Buildings Destroyed</span>
          <span class="val">${stats.destroyed} / ${stats.total}</span>
        </div>
        <div class="result-metric">
          <span class="label">Pursuit Units Wrecked</span>
          <span class="val">🚨 ${stats.policeWrecked}</span>
        </div>
        <div class="result-metric">
          <span class="label">Cash Plundered</span>
          <span class="val">💰 +${stats.looted.cash.toLocaleString()}</span>
        </div>
        <div class="result-metric">
          <span class="label">Iron & Wood Looted</span>
          <span class="val">⚙️ +${stats.looted.iron} | 🪵 +${stats.looted.wood}</span>
        </div>
        ${stats.outcome === 'victory' ? `
        <div class="result-metric" id="result-gems">
          <span class="label">Gems Earned</span>
          <span class="val">💎 +${stats.gems || 0}${(stats.gems || 0) < stats.gemBounty ? ` <small>${this._gemShortfallText(stats)}</small>` : ''}</span>
        </div>` : ''}
      </div>
      <button id="btn-collect-loot" class="btn-primary btn-large">
        CLAIM LOOT & RETURN TO CITY 🏛️
      </button>
    `;

    const btnCollect = document.getElementById('btn-collect-loot');
    if (btnCollect) {
      btnCollect.addEventListener('click', () => {
        this.sound.playClick();
        onFinish();
      });
    }
  }

  /**
   * Why a win paid less than the full bounty: the size and the kinds of defense the full bounty
   * needs (progression.raidDefenseFor - every gun, pursuit base, trap and aura type the Town Hall
   * allows, each at RAID_KIND_SHARE of its limit), what this city had, and which kinds fell short.
   * `gemThreat` is a LEVEL-WEIGHTED score, not a count of the kinds the city owns: printed in
   * the slot a reader reads as a count, it told a Town Hall 3 player who owned all six kinds at
   * level 1 that the city 'had 2 of 6 kinds' and then listed all six as short. The count and
   * the score are now separate, and the list says what it means - short of FULL COVER, which a
   * kind can be either by being absent or by standing below the Town Hall's level.
   */
  _gemShortfallText(stats) {
    // +1e-6 first: summing per-kind cover leaves 11.999999999999996, which floored to '11.9'.
    const covered = Math.floor((stats.gemThreat || 0) * 10 + 1e-6) / 10;
    const kindsTotal = stats.gemKinds || 0;
    const present = stats.gemPresent === undefined ? kindsTotal : stats.gemPresent;
    const short = stats.gemShort || [];
    const named = short.length > 6 ? `${short.slice(0, 6).join(', ')} and ${short.length - 6} more` : short.join(', ');
    const kinds = kindsTotal === 1 ? 'the one kind of defense' : `all ${kindsTotal} kinds of defense`;
    const premium = Math.round(100 * (1 - (stats.gemCoverShare === undefined ? 1 : stats.gemCoverShare)));
    return `(the full ${stats.gemBounty} needs ${stats.gemMinTargets}+ structures and ${kinds} your Town Hall allows - ` +
      `every gun, pursuit base, trap and aura building type, ${Math.round(100 * (stats.gemKindShare || 0))}% of each type's build limit standing at your Town Hall's level; ` +
      `${premium}% of the bounty rides on your WEAKEST kind, so one kind left out costs far more than its share. ` +
      `This city had ${stats.total} ${stats.total === 1 ? 'structure' : 'structures'} and ${present} of ${kindsTotal} ${kindsTotal === 1 ? 'kind' : 'kinds'} on the ground, ` +
      `defense strength ${covered.toFixed(1)} of ${kindsTotal}` +
      `${named ? `; short of full cover: ${named}` : ''})`;
  }

  showToast(msg, duration = 2800) {
    const toast = document.getElementById('ui-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('toast-show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('toast-show');
      toast.classList.add('hidden');
    }, duration);
  }
}
