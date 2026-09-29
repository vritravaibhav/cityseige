import * as THREE from 'three';
import { SceneManager } from './rendering/SceneManager.js';
import { AssetFactory } from './rendering/AssetFactory.js';
import { soundManager } from './audio/SoundManager.js';
import { RoadNetwork } from './builder/RoadNetwork.js';
import { EconomyManager } from './builder/EconomyManager.js';
import { BuildingManager } from './builder/BuildingManager.js';
import { GarageManager } from './builder/GarageManager.js';
import { GridSystem } from './builder/GridSystem.js';
import { VehicleController } from './combat/VehicleController.js';
import { PoliceManager } from './combat/PoliceManager.js';
import { CardSystem } from './combat/CardSystem.js';
import { TurretSystem } from './combat/TurretSystem.js';
import { TrapSystem } from './combat/TrapSystem.js';
import { DestructionEngine } from './combat/DestructionEngine.js';
import { AttackManager } from './combat/AttackManager.js';
import { UIManager } from './ui/UIManager.js';
import { readCitySave, restoreCity, saveCity, backupCitySave, CITY_SAVE_KEY } from './builder/CityPersistence.js';
import { formatDuration } from './data/progression.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();

    // 1. Rendering & Audio
    this.sceneManager = new SceneManager(this.container);
    this.assetFactory = new AssetFactory();
    this.soundManager = soundManager;

    // 2. City Builder & Economy
    this.roadNetwork = new RoadNetwork(this.sceneManager.scene, this.assetFactory);
    this.economyManager = new EconomyManager();
    this.buildingManager = new BuildingManager(
      this.sceneManager.scene,
      this.assetFactory,
      this.roadNetwork,
      this.economyManager
    );
    // Vehicle Garage save: buggy tuning, ability-card unlocks/levels and the raid deck.
    this.garageManager = new GarageManager(this.economyManager, this.buildingManager);

    this.gridSystem = new GridSystem(
      this.sceneManager.scene,
      this.sceneManager.builderCamera,
      this.roadNetwork,
      this.buildingManager,
      this.economyManager,
      this.soundManager,
      this.sceneManager
    );

    // 3. Combat & Siege Systems
    this.destructionEngine = new DestructionEngine(
      this.sceneManager.scene,
      this.soundManager,
      this.assetFactory
    );

    this.policeManager = new PoliceManager(
      this.sceneManager.scene,
      this.assetFactory,
      this.soundManager,
      this.destructionEngine
    );

    this.turretSystem = new TurretSystem(
      this.sceneManager.scene,
      this.soundManager
    );

    this.trapSystem = new TrapSystem(this.soundManager, this.destructionEngine);

    this.vehicleController = new VehicleController(
      this.sceneManager.scene,
      this.sceneManager.combatCamera,
      this.assetFactory,
      this.soundManager
    );
    this.vehicleController.mesh.visible = false; // Hidden during builder mode

    this.cardSystem = new CardSystem(
      this.sceneManager.scene,
      this.soundManager,
      this.destructionEngine,
      this.policeManager
    );

    // 4. UI Manager
    this.uiManager = new UIManager({
      economyManager: this.economyManager,
      buildingManager: this.buildingManager,
      gridSystem: this.gridSystem,
      soundManager: this.soundManager,
      sceneManager: this.sceneManager,
      garageManager: this.garageManager
    });

    // 5. Attack Orchestrator
    this.attackManager = new AttackManager({
      sceneManager: this.sceneManager,
      buildingManager: this.buildingManager,
      vehicleController: this.vehicleController,
      policeManager: this.policeManager,
      cardSystem: this.cardSystem,
      turretSystem: this.turretSystem,
      destructionEngine: this.destructionEngine,
      economyManager: this.economyManager,
      soundManager: this.soundManager,
      uiManager: this.uiManager,
      assetFactory: this.assetFactory,
      garageManager: this.garageManager,
      trapSystem: this.trapSystem
    });

    this.vehicleController.setRoadNetwork(this.roadNetwork);

    // Connect Attack Trigger & Touch Controls
    this.uiManager.onStartAttack = () => {
      this.attackManager.startRecon();
    };
    this.uiManager.bindTouchControls(this.vehicleController);

    // Render Cards in HUD
    this.uiManager.onCardActivated = (cardId) => {
      this.cardSystem.activateCard(cardId);
    };

    // The deck is empty until the first breach applies the garage loadout.
    this.uiManager.renderCardsDeck(this.cardSystem.deck, (cardId) => {
      this.cardSystem.activateCard(cardId);
    });

    this.cardSystem.onCooldownUpdate = (cards) => {
      this.uiManager.updateCardsDeck(cards);
    };

    // User Gesture Audio Unlocking
    const unlockAudio = () => {
      this.soundManager.ensureStarted();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // 6. Restore the saved city, or seed a fresh one on a genuine first run.
    // Before this the city was regenerated from hardcoded coordinates on EVERY load,
    // so every building placed and every level earned was discarded while the resources
    // spent on them stayed spent.
    let hadCitySave = true;
    try { hadCitySave = localStorage.getItem(CITY_SAVE_KEY) !== null; } catch (e) { /* storage blocked */ }
    const saved = readCitySave();
    if (saved) {
      const report = restoreCity(this.buildingManager, saved);
      // One toast element: build a single "while you were away" message.
      const away = [];
      if (report.tasksCompletedOffline > 0) {
        away.push(`\u{1F3D7}\u{FE0F} ${report.tasksCompletedOffline} ` +
          `${report.tasksCompletedOffline === 1 ? 'job' : 'jobs'} finished while you were away.`);
      }
      if (report.tasksRefunded > 0) {
        away.push(`\u{1F4B0} Labour Huts and trees no longer have levels: ${report.tasksRefunded} ` +
          `${report.tasksRefunded === 1 ? 'upgrade was' : 'upgrades were'} refunded.`);
      }
      const made = report.offlineProduced;
      if (report.offlineSeconds >= 60 && (made.cash + made.iron + made.wood + report.offlineVault) > 0) {
        const parts = [];
        if (made.cash) parts.push(`\u{1F4B0}${made.cash.toLocaleString()}`);
        if (made.iron) parts.push(`\u{2699}\u{FE0F}${made.iron.toLocaleString()}`);
        if (made.wood) parts.push(`\u{1FAB5}${made.wood.toLocaleString()}`);
        if (report.offlineVault) parts.push(`\u{1F510}${report.offlineVault.toLocaleString()} sealed in vaults`);
        away.push(`\u{23F1}\u{FE0F} Away ${formatDuration(report.offlineSeconds)}: your producers made ${parts.join(' ')}. Tap them to collect.`);
      }
      if (report.repaired.length) {
        away.push(`\u{1F6E0}\u{FE0F} Your city save was missing ${report.repaired.join(', ')} - rebuilt.`);
        // Autosave is not wired yet: write the repaired city now, damaged original to .bak.
        const kept = backupCitySave();
        saveCity(this.buildingManager);
        console.warn('[city] save was missing', report.repaired.join(', '), '- re-seeded' +
          (kept ? '; the original is kept at ' + CITY_SAVE_KEY + '.bak' : ''));
      } else if (report.tasksRefunded > 0) {
        // The refund is already in the economy save (EconomyManager.refund writes it at once):
        // write the city without the refunded job now too, or a tab that dies before the next
        // city save boots the old job again and pays the refund a second time.
        saveCity(this.buildingManager);
      }
      if (away.length) this.uiManager.showToast(away.join(' '), 5200);
      if (report.skipped.length) {
        console.warn('[city] skipped on restore:', report.skipped.join(', '));
      }
    } else {
      this.buildingManager.initDefaultCity();
      // A bank from before the city was saved (no city blob at all - not a damaged one) still
      // holds that version's bigger starter stock: trim it to the Town Hall 1 limits, refunded.
      // A brand-new bank fits them already, so this changes nothing for a new player.
      if (!hadCitySave) {
        const over = this.buildingManager.refundInventoryOverLimits();
        const parts = Object.entries(over).map(([t, n]) => t === 'road'
          ? `${n} road tiles` : `${n} x ${this.buildingManager.catalog[t]?.name || t}`);
        if (parts.length) {
          this.uiManager.showToast(`\u{1F4B0} Refunded ${parts.join(', ')} from your old save: ` +
            'more than a Town Hall 1 city may own.', 5200);
        }
      }
      saveCity(this.buildingManager);
    }

    this._initCityAutosave();

    // Start Main Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // Public handle for tooling and acceptance tests.
    window.citySiege = this;
  }

  /**
   * Persist the city on every structural change, coalesced to at most one write per
   * second, plus a guaranteed write when the tab is hidden or closed.
   */
  _initCityAutosave() {
    this._citySaveQueued = false;

    this.saveCityNow = () => {
      this._citySaveQueued = false;
      saveCity(this.buildingManager);
    };

    this.queueCitySave = () => {
      if (this._citySaveQueued) return;
      this._citySaveQueued = true;
      setTimeout(this.saveCityNow, 1000);
    };

    // Anything that moves value between the two saves must write the city in the same tick
    // as the economy blob, which is written on the spot. With only the 1s debounce a crash in
    // that second paid a collected haul out twice (bank saved, full producer not), lost a paid
    // upgrade (cost saved, job not), and after Clear Roads kept 105 roads on the map AND
    // refunded them. A microtask runs once the whole action (collect, upgrade, gem finish,
    // place, stow, preset, clear roads, raid payout) has finished mutating the city.
    this._cityFlushQueued = false;
    this.flushCitySave = () => {
      if (this._cityFlushQueued) return;
      this._cityFlushQueued = true;
      queueMicrotask(() => {
        this._cityFlushQueued = false;
        this.saveCityNow();
      });
    };

    const bm = this.buildingManager;
    const prevBuilders = bm.onBuildersChanged;
    bm.onBuildersChanged = (...args) => {
      if (prevBuilders) prevBuilders(...args);
      this.flushCitySave();
    };
    const prevFinished = bm.onConstructionFinished;
    bm.onConstructionFinished = (...args) => {
      if (prevFinished) prevFinished(...args);
      this.flushCitySave();
    };

    // Moves and road drags touch only the city blob: coalesced, at most one write a second.
    bm.onCityChanged = () => this.queueCitySave();
    if (bm.roadNetwork) bm.roadNetwork.onChange = () => this.queueCitySave();

    // Every bank change (collect, upgrade cost, refund, gems, raid loot) and every inventory
    // move is the economy half of a city change, so both flush the city in the same tick.
    const eco = this.economyManager;
    const prevUpdate = eco.onUpdate;
    eco.onUpdate = (...args) => {
      if (prevUpdate) prevUpdate(...args);
      this.flushCitySave();
    };
    const prevInventory = eco.onInventoryUpdate;
    eco.onInventoryUpdate = (...args) => {
      if (prevInventory) prevInventory(...args);
      this.flushCitySave();
    };

    // visibilitychange fires on mobile task-switch where unload often does not.
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.saveCityNow();
    });
    window.addEventListener('pagehide', this.saveCityNow);
    window.addEventListener('beforeunload', this.saveCityNow);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // Update Scene animations (camera swoop tween)
    this.sceneManager.update(delta);

    // Update Economy passive accumulation
    this.economyManager.update(delta);

    // Update Building animations (sawmills, precinct lights)
    this.buildingManager.update(delta, elapsed);

    // Update Attack & Combat mode loop
    this.attackManager.update(delta, elapsed);

    // Render Scene with active camera
    this.sceneManager.render();
  }
}

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
