import * as THREE from 'three';
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
  constructor({ economyManager, buildingManager, gridSystem, soundManager, sceneManager }) {
    this.economy = economyManager;
    this.buildings = buildingManager;
    this.grid = gridSystem;
    this.sound = soundManager;
    this.sceneManager = sceneManager;

    this.currentScreen = 'HOME'; // 'HOME' | 'DESIGN' | 'SHOP' | 'RECON' | 'COMBAT' | 'RESULT'
    this.shopCategory = 'all';

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
    this.builderCountEl = document.getElementById('builder-count');

    // Shop Resources Display
    this.shopResCash = document.getElementById('shop-res-cash');
    this.shopResIron = document.getElementById('shop-res-iron');
    this.shopResWood = document.getElementById('shop-res-wood');

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

    // Inventory placement update callback
    this.grid.onInventoryPlaced = () => {
      this.renderDesignInventory();
    };
  }

  _initBuilderListeners() {
    this.updateBuilderHUD();

    this.buildings.onBuildersChanged = () => {
      this.updateBuilderHUD();
    };

    this.buildings.onConstructionFinished = (b) => {
      this.sound.playUpgrade();
      this.showToast(`🔨 ${b.name} finished upgrade!`);
      this.updateBuilderHUD();
      if (this.currentInspectedBuilding === b) {
        this.showBuildingInspector(b);
      }
    };

    setInterval(() => {
      if (this.currentInspectedBuilding && this.currentInspectedBuilding.isUnderConstruction) {
        const remaining = this.currentInspectedBuilding.buildTask
          ? Math.ceil(this.currentInspectedBuilding.buildTask.remaining)
          : 0;
        const countSpan = document.getElementById('inspector-timer-countdown');
        if (countSpan) countSpan.textContent = `${remaining}s`;
        const fillBar = document.getElementById('inspector-progress-fill');
        if (fillBar && this.currentInspectedBuilding.buildTask) {
          const total = this.currentInspectedBuilding.buildTask.total || 1;
          const pct = Math.max(5, (1 - this.currentInspectedBuilding.buildTask.remaining / total) * 100);
          fillBar.style.width = `${pct}%`;
        }
      }
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
      const timeStr = shortest < 999999 ? ` (${Math.ceil(shortest)}s)` : '';
      this.builderCountEl.textContent = `${free} / ${total} Labour Free${timeStr}`;
      this.builderCountEl.style.color = free === 0 ? '#ff5252' : '#ffd700';
    } else {
      this.builderCountEl.textContent = `${free} / ${total} Labour Free`;
      this.builderCountEl.style.color = '#00e5ff';
    }
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
    if (this.redesignModal) this.redesignModal.classList.add('hidden');
    if (this.inspectorModal) this.inspectorModal.classList.add('hidden');
    if (this.resultModal) this.resultModal.classList.add('hidden');

    if (screen === 'HOME') {
      if (this.homeView) this.homeView.classList.remove('hidden');
      this.grid.setMode('home');
    } else if (screen === 'DESIGN') {
      if (this.designView) this.designView.classList.remove('hidden');
      this.grid.setMode('design_select');
      this.renderDesignInventory();
      if (this.updateRoadBadge) this.updateRoadBadge();
    } else if (screen === 'SHOP') {
      // The shop is its own full screen now: the city stays hidden behind it and the map grid is
      // locked so clicks on the shop cannot harvest or inspect buildings underneath.
      if (this.shopModal) this.shopModal.classList.remove('hidden');
      this.grid.setMode('locked');
      this.renderShopCatalog();
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
        if (this.onStartAttack) this.onStartAttack();
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
        if (confirm('Clear all paved roads in the city? All road tiles will be refunded to your inventory.')) {
          this.sound.playCrash(0.6);
          const clearedCount = this.buildings.roadNetwork.clear();
          this.economy.addToInventory('road', clearedCount);
          updateRoadBadge();
          this.renderDesignInventory();
          this.showToast(`🧹 Cleared and refunded +${clearedCount} Road Tiles to inventory!`);
        }
      });
    }

    // Apply Presets (Citadel, Metropolis, Outpost)
    document.querySelectorAll('.btn-apply-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.getAttribute('data-preset');
        if (preset) {
          this.sound.playUpgrade();
          this.buildings.applyPreset(preset);
          this.hideRedesignModal();
          updateRoadBadge();
          this.renderDesignInventory();
        }
      });
    });

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

    this.grid.onOutOfRoads = () => {
      this.sound.playCrash(0.3);
      this.showToast('⚠️ Out of Road Tiles! Purchase more in the City Shop.');
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

    // Shop Filter Tabs
    document.querySelectorAll('.shop-tab-btn').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.shop-tab-btn').forEach(t => t.classList.remove('active'));
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
      if (this.shopCategory !== 'all' && def.category !== this.shopCategory) {
        return;
      }

      // Town Hall gating: only blueprints your city tier has actually unlocked can be bought.
      const thLevel = this.buildings.getTownHallLevel();
      const reqTH = def.unlockTownHall || 1;
      const isLocked = thLevel < reqTH;

      const hasCash = res.cash >= (def.cost.cash || 0);
      const hasIron = res.iron >= (def.cost.iron || 0);
      const hasWood = res.wood >= (def.cost.wood || 0);
      const canAfford = hasCash && hasIron && hasWood && !isLocked;
      const ownedCount = this.economy.getInventoryCount(type);
      const packCount = def.packCount || 1;
      const buyBtnText = isLocked
        ? `🔒 REQUIRES TOWN HALL ${reqTH}`
        : canAfford
          ? (def.packCount ? `BUY (+${packCount} TO INVENTORY) 📦` : 'BUY (+1 TO INVENTORY) 📦')
          : 'NEED MORE RESOURCES ⚠️';

      const card = document.createElement('div');
      card.className = isLocked ? 'blueprint-card is-locked' : 'blueprint-card';
      card.innerHTML = `
        <div class="blueprint-header">
          <div class="blueprint-icon">${this._getTypeIcon(type)}</div>
          <div>
            <div class="blueprint-title">${def.name}</div>
            <span style="font-size:10px; color:var(--text-dim);">${def.category.toUpperCase()}</span>
            <div class="inv-owned-tag">In Inventory: ${ownedCount}</div>
          </div>
        </div>
        <p style="font-size:11px; color:var(--text-dim); margin-bottom:6px; min-height: 28px;">${def.desc}</p>
        ${def.helps ? `<div class="blueprint-helps"><span class="helps-label">WHAT IT DOES FOR YOU</span><span>${def.helps}</span></div>` : ''}
        ${isLocked ? `<div class="blueprint-lock">🔒 Unlocks at Town Hall ${reqTH} — you are Town Hall ${thLevel}</div>` : ''}
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

  _initHarvestAnimations() {
    this.grid.onHarvest = ({ type, amount, clientX, clientY }) => {
      this.spawnFloatingReward(clientX, clientY, type, amount);
    };
  }

  spawnFloatingReward(clientX, clientY, type, amount) {
    if (!this.harvestContainer) return;

    let icon = '💰';
    let color = '#ffd700';
    if (type === 'wood') {
      icon = '🪵';
      color = '#8bc34a';
    } else if (type === 'iron') {
      icon = '⚙️';
      color = '#00e5ff';
    }

    const el = document.createElement('div');
    el.className = 'floating-reward';
    el.style.left = `${clientX || window.innerWidth / 2}px`;
    el.style.top = `${clientY || window.innerHeight / 2}px`;
    el.style.color = color;
    el.textContent = `+${amount} ${icon}`;

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

      if (this.shopResCash) this.shopResCash.textContent = res.cash.toLocaleString();
      if (this.shopResIron) this.shopResIron.textContent = res.iron.toLocaleString();
      if (this.shopResWood) this.shopResWood.textContent = res.wood.toLocaleString();
    };

    this.economy.onInventoryUpdate = () => {
      if (this.currentScreen === 'DESIGN') {
        this.renderDesignInventory();
      }
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

    this.currentInspectedBuilding = building;
    this.inspectorModal.classList.remove('hidden');
    const content = document.getElementById('inspector-content');
    if (!content) return;

    const thLvl = this.buildings.getTownHallLevel();
    const curLvl = building.level || 1;
    const nextLvl = curLvl + 1;
    const isMainGate = building.isMainGate;
    const isTownHall = building.type === 'town_hall';
    const isMax = isTownHall ? nextLvl > 12 : (nextLvl > 12 || nextLvl > thLvl);
    const requiresTH = !isTownHall && nextLvl > thLvl;
    const cost = this.buildings.getUpgradeCost(building);
    const buildTime = this.buildings.getBuildTime(building.type, nextLvl);
    const isDesignMode = this.currentScreen === 'DESIGN';
    // Structures are no longer destroyed - they are put away in the Big Storage Depot and can be
    // placed again later. Only pure decoration can actually be removed from the map.
    const isDecorative = (building.type === 'tree');
    const hasStorage = this.buildings.buildings.some(b => b.type === 'big_storage' && !b.isDestroyed);
    const canStow = !isMainGate && !isTownHall && !isDecorative && hasStorage;
    const needsStorage = !isMainGate && !isTownHall && !isDecorative && !hasStorage;
    const isUnderConstruction = building.isUnderConstruction;
    const freeBuilders = this.buildings.freeBuilders;

    let actionButtonsHtml = '';

    // Vehicle Tuning Lab sells spare lives for the battle buggy (max 2 spares = 3 lives).
    // Kept in its own variable: the upgrade branches below ASSIGN actionButtonsHtml and would
    // otherwise wipe this panel out.
    let labLivesHtml = '';
    if (building.type === 'vehicle_lab' && !isUnderConstruction) {
      const spare = this.economy.vehicleLives || 0;
      const max = 2;
      const cost = { cash: 400, iron: 250, wood: 150 };
      const res = this.economy.getResources();
      const canAfford = res.cash >= cost.cash && res.iron >= cost.iron && res.wood >= cost.wood;
      const atMax = spare >= max;
      labLivesHtml = `
        <div class="lab-lives-panel">
          <div class="lab-lives-row">
            <span>🚗 Buggy lives per raid</span>
            <strong>3 base + ${spare} spare</strong>
          </div>
          <div class="lab-lives-note">Every raid starts with 3 lives. Spares (max ${max}) are used once those are gone.</div>
          <button id="btn-buy-life" class="btn-primary" ${(atMax || !canAfford) ? 'disabled style="opacity:0.45; cursor:not-allowed;"' : ''}>
            ${atMax ? '✅ MAX LIVES STOCKED' : `BUY SPARE LIFE — 💰${cost.cash} ⚙️${cost.iron} 🪵${cost.wood}`}
          </button>
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
              ${remainingSecs}s
            </span>
          </div>
          <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
            <div id="inspector-progress-fill" style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #00e5ff, #ffd700); transition: width 0.3s ease;"></div>
          </div>
        </div>
        <button id="btn-finish-instant" class="btn-primary" style="background: linear-gradient(135deg, #ffd700, #ff9800); color: #06101c; font-weight: bold; margin-bottom: 8px;">
          ⚡ FINISH NOW (INSTANT)
        </button>
      `;
    } else if (!isMainGate && !isMax) {
      const res = this.economy.getResources();
      const canAfford = res.cash >= cost.cash && res.iron >= cost.iron && res.wood >= cost.wood;
      const canStart = canAfford && freeBuilders > 0;

      let btnText = `🔨 Upgrade to Tier ${nextLvl} (⏱️${buildTime}s)`;
      if (freeBuilders <= 0) {
        btnText = `ALL LABOURS BUSY (HIRE IN SHOP) ⚠️`;
      } else if (!canAfford) {
        btnText = `NEED MORE RESOURCES ⚠️`;
      }

      actionButtonsHtml = `
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
        ${building.produceType ? `<span>Stored: <strong>${Math.floor(building.stored || 0)} / ${building.maxCapacity}</strong></span>` : ''}
      </div>
      <div class="inspector-actions">
        ${labLivesHtml}
        ${actionButtonsHtml}
        ${isDesignMode ? `
          <button id="btn-relocate-building" class="btn-primary" style="background: linear-gradient(135deg, #00e5ff, #0091ea); color: #06101c;">
            ✋ Pick Up & Move
          </button>
        ` : ''}
        ${canStow ? `
          <button id="btn-stow-building" class="btn-secondary">
            📦 Move to Big Storage
          </button>
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

    const btnBuyLife = document.getElementById('btn-buy-life');
    if (btnBuyLife) {
      btnBuyLife.addEventListener('click', () => {
        const r = this.economy.buyVehicleLife();
        if (r.ok) {
          this.sound.playUpgrade();
          this.showToast(`🚗 Spare life stocked (${1 + r.lives} lives total)`);
          this.showBuildingInspector(building);
        } else {
          this.sound.playCrash(0.3);
        }
      });
    }

    const btnFinish = document.getElementById('btn-finish-instant');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        this.buildings.finishConstructionInstantly(building);
        this.sound.playUpgrade();
        this.showToast(`⚡ Instant construction completed!`);
        this.showBuildingInspector(building);
      });
    }

    const btnUpgrade = document.getElementById('btn-upgrade-building');
    if (btnUpgrade) {
      btnUpgrade.addEventListener('click', () => {
        const res = this.buildings.upgradeBuilding(building);
        if (res && res.ok) {
          this.sound.playUpgrade();
          this.showToast(`👷 Labour assigned to ${building.name} (${res.duration}s)!`);
          this.showBuildingInspector(building);
        } else if (res && res.reason === 'NO_FREE_BUILDERS') {
          this.sound.playCrash(0.3);
          alert('All labours are currently busy! Wait for a construction task to finish or Hire a Labour in the City Shop.');
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
        this.sound.playClick();
        this.hideBuildingInspector();
        this.grid.setMode('relocate', building);
      });
    }

    const btnStow = document.getElementById('btn-stow-building');
    if (btnStow) {
      btnStow.addEventListener('click', () => {
        this.buildings.stowBuilding(building);
        this.sound.playPlace();
        this.hideBuildingInspector();
        this.renderDesignInventory();
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
      this.redesignModal.classList.remove('hidden');
    }
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
    if (this.textHp) this.textHp.textContent = `${data.hp} / ${data.maxHp}`;
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
        if (b.isDestroyed || !b.mesh) return;
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
          <span class="label">Police Cruisers Wrecked</span>
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
