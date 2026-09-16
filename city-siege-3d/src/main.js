import * as THREE from 'three';
import { SceneManager } from './rendering/SceneManager.js';
import { AssetFactory } from './rendering/AssetFactory.js';
import { soundManager } from './audio/SoundManager.js';
import { RoadNetwork } from './builder/RoadNetwork.js';
import { EconomyManager } from './builder/EconomyManager.js';
import { BuildingManager } from './builder/BuildingManager.js';
import { GridSystem } from './builder/GridSystem.js';
import { VehicleController } from './combat/VehicleController.js';
import { PoliceManager } from './combat/PoliceManager.js';
import { CardSystem } from './combat/CardSystem.js';
import { TurretSystem } from './combat/TurretSystem.js';
import { DestructionEngine } from './combat/DestructionEngine.js';
import { AttackManager } from './combat/AttackManager.js';
import { UIManager } from './ui/UIManager.js';

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
      sceneManager: this.sceneManager
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
      assetFactory: this.assetFactory
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

    this.uiManager.renderCardsDeck(this.cardSystem.cards, (cardId) => {
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

    // 6. Initialize Default City
    this.buildingManager.initDefaultCity();

    // Start Main Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
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
