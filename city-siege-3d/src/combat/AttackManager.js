import * as THREE from 'three';
import { BUILDING_DEFS, RAID_KIND_SHARE, auraRadiusFor, raidDefenseFor, raidGemsFor, townHallRow } from '../data/progression.js';

/**
 * AttackManager - Coordinates pre-attack reconnaissance, direct 3D map gate tapping,
 * cinematic swooping breach sequence, combat loop, and post-attack carnage reporting.
 */
export class AttackManager {
  constructor({
    sceneManager,
    buildingManager,
    vehicleController,
    policeManager,
    cardSystem,
    turretSystem,
    destructionEngine,
    economyManager,
    soundManager,
    uiManager,
    assetFactory,
    garageManager,
    trapSystem
  }) {
    this.scene = sceneManager;
    this.buildings = buildingManager;
    this.vehicle = vehicleController;
    this.police = policeManager;
    this.cards = cardSystem;
    this.turrets = turretSystem;
    this.destruction = destructionEngine;
    this.economy = economyManager;
    this.sound = soundManager;
    this.ui = uiManager;
    this.assetFactory = assetFactory;
    this.garage = garageManager;
    this.traps = trapSystem || null;

    this.state = 'IDLE'; // 'IDLE' | 'RECON' | 'SWOOP' | 'COMBAT' | 'RESULT'
    this.selectedGate = null;

    // 3D Beacons for Gate Selection
    this.beaconsGroup = new THREE.Group();
    this.beaconsGroup.name = 'tactical_gate_beacons';
    this.scene.scene.add(this.beaconsGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.attackStats = {
      destroyedCount: 0,
      looted: { cash: 0, iron: 0, wood: 0 },
      policeWrecked: 0,
      stars: 0,
      percentage: 0
    };

    this.cards.onCardCollected = (cardInfo) => {
      this.ui.showToast(`${cardInfo.title} ${cardInfo.desc}`, 2600);
    };

    this._bindReconPointer();
  }

  _bindReconPointer() {
    // The tactical map can be dragged to pan, so a gate is chosen on RELEASE and only if the
    // pointer barely moved - a drag that happens to start on a beacon must not launch the raid.
    let downAt = null;
    window.addEventListener('pointerdown', (e) => {
      if (this.state !== 'RECON') return;
      downAt = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointerup', (e) => {
      if (this.state !== 'RECON' || !downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      downAt = null;
      if (moved > 6) return;
      if (e.target && e.target.closest && e.target.closest('#ui-container button')) return;

      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.scene.activeCamera);

      // Check intersections with all main gates and beacons
      const mainGates = this.buildings.getMainGates();
      const interactables = [];

      mainGates.forEach(g => {
        if (g.mesh) interactables.push(g.mesh);
      });
      this.beaconsGroup.children.forEach(b => {
        interactables.push(b);
      });

      const hits = this.raycaster.intersectObjects(interactables, true);
      if (hits.length > 0) {
        // Find corresponding gate
        let clickedGate = null;
        for (let hit of hits) {
          let cur = hit.object;
          while (cur && cur !== this.scene.scene) {
            const foundGate = mainGates.find(g => g.mesh === cur || (cur.name && cur.name.includes(g.id)));
            if (foundGate) {
              clickedGate = foundGate;
              break;
            }
            if (cur.userData && cur.userData.parentGate) {
              clickedGate = cur.userData.parentGate;
              break;
            }
            cur = cur.parent;
          }
          if (clickedGate) break;
        }

        if (clickedGate) {
          this.sound.playClick();
          this.triggerCinematicBreach(clickedGate);
        }
      }
    });
  }

  startRecon() {
    this.state = 'RECON';
    this.sound.ensureStarted();
    this.scene.setCameraMode('recon');
    this.buildings.setCollectiblesVisible(false);   // no floating collect markers during the attack
    // Landmines are buried from the moment the raider looks at the map, not from the breach.
    if (this.traps) this.traps.bury(this.buildings.buildings);

    // Fit all gates on screen with padding before the player is asked to pick one.
    this.scene.frameReconOnTargets(
      this.buildings.getMainGates().map(g => g.mesh && g.mesh.position).filter(Boolean)
    );

    // Hide attack vehicle until breach
    this.vehicle.mesh.visible = false;

    // Clear old beacons
    this.clearBeacons();

    // Spawn 3D Holographic Beacons over each Main Gate
    const mainGates = this.buildings.getMainGates();
    mainGates.forEach(gate => {
      const beacon = this.assetFactory.createGateBeacon(gate.name);
      beacon.position.copy(gate.mesh.position);
      beacon.userData.parentGate = gate;
      this.beaconsGroup.add(beacon);
    });

    // Show tactical recon UI overlay banner
    this.ui.showTacticalReconBanner(() => {
      // Abort callback
      this.abortRecon();
    });
  }

  abortRecon() {
    this.buildings.setCollectiblesVisible(true);
    if (this.traps) this.traps.unbury(this.buildings.buildings);
    this.clearBeacons();
    this.state = 'IDLE';
    this.ui.hideTargetBuildingHealth();
    this.scene.setCameraMode('builder');
    this.ui.hideTacticalReconBanner();
    this.ui.showBuilderHUD();
  }

  triggerCinematicBreach(gate) {
    this.selectedGate = gate;
    this.state = 'SWOOP';
    this.clearBeacons();
    this.ui.hideTacticalReconBanner();

    // Show high-tech mapping scanline effect on HUD
    this.ui.showMappingScanEffect(gate.name);
    this.sound.playUpgrade(); // target acquired chime

    // 1. Calculate vehicle spawn location outside the chosen gate
    const gatePos = gate.mesh.position;
    const outwardDir = gatePos.clone().normalize();
    if (outwardDir.length() < 0.1) outwardDir.set(0, 0, 1);

    const spawnDist = 16.0;
    const spawnX = gatePos.x + outwardDir.x * spawnDist;
    const spawnZ = gatePos.z + outwardDir.z * spawnDist;
    const heading = Math.atan2(-outwardDir.x, -outwardDir.z);

    this.breachSpawn = { x: spawnX, z: spawnZ, heading };
    // Buggy tuning from the Vehicle Garage is applied as absolute values right BEFORE spawnAt,
    // because spawnAt copies maxHp/maxShield into hp/shield. respawnAfterBust() re-uses them.
    if (this.garage) this.vehicle.applyUpgrades(this.garage.computeVehicleStats());
    this.vehicle.spawnAt(spawnX, spawnZ, heading);
    this.vehicle.mesh.visible = true;
    // Police converge on the breach gate almost immediately; give the player a moment to move
    // before contact can bust them (bust() honours damageImmunityTimer).
    this.vehicle.damageImmunityTimer = 3.0;

    // 2. Camera positions for smooth swoop
    const satPos = this.scene.reconCamera.position.clone();
    const satLook = new THREE.Vector3(0, 0, 0);

    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const targetCamPos = this.vehicle.position.clone()
      .sub(forward.clone().multiplyScalar(this.vehicle.camDistance))
      .add(new THREE.Vector3(0, this.vehicle.camHeight, 0));
    const targetCamLook = this.vehicle.position.clone().add(forward.clone().multiplyScalar(this.vehicle.camLookAhead));

    // 3. Start smooth camera swoop (1.5s)
    this.scene.startCameraSwoop(satPos, satLook, targetCamPos, targetCamLook, 1.5, () => {
      this.launchBreach(gate);
    });
  }

  launchBreach(gate) {
    this.state = 'COMBAT';
    this.ui.hideMappingScanEffect();
    this.ui.showCombatHUD();

    // 1. Reset destruction tracker & cards
    this.destruction.onBuildingDamaged = (b, hp) => this.ui.showTargetBuildingHealth(b, hp);
    this.destruction.reset(this.buildings.buildings);
    // The defense this raid has to beat, kind by kind (every gun, pursuit base, trap and aura
    // type the Town Hall allows, weighted by level against the Town Hall) - the gem bounty scales
    // with it, so a city with its guns, EMPs, Citadel or traps stowed is paid less.
    this.raidDefense = raidDefenseFor(this.buildings.buildings, this.buildings.getTownHallLevel());
    this.raidThreat = this.raidDefense.covered;

    // Three lives per raid, plus any spares stocked at the Vehicle Tuning Lab.
    this.baseLives = 3;
    this.raidLives = this.baseLives + (this.economy.vehicleLives || 0);
    this.respawnsUsed = 0;
    this.crashHandling = false;
    this.ui.updateLivesHUD(this.raidLives);

    // Exit button: retreat with whatever has been looted so far.
    this.ui.onRetreat = () => { if (this.state === 'COMBAT') this.endAttack('retreat'); };
    this.vehicle.onDamaged = (amount) => this.ui.flashDamage(amount);
    // No autocannon shell from an earlier raid may land in this one.
    this.vehicle.clearProjectiles();
    this.cards.reset();
    this.cards.setPlayer(this.vehicle, this.buildings.buildings);
    // Deck, card levels and buggy tuning come from the Vehicle Garage (GarageManager).
    if (this.garage) {
      this.cards.applyLoadout(this.garage.getLoadout(), this.garage.computeCardStats());
    }
    this.ui.renderCardsDeck(this.cards.deck, (id) => this.cards.activateCard(id));

    // 2. Register Gate Turrets
    this.turrets.clear();
    this.turrets.registerGates(this.buildings.getMainGates());
    // Placed defensive structures (sniper towers, tesla coils, laser obelisks) now fight back too.
    // Must come AFTER registerGates(), which resets the turret list.
    this.turrets.registerDefenses(this.buildings.buildings);

    // 3. Pursuit force: every spawner (Police Station, SWAT Armory, Drone Hangar), capped
    // by the Town Hall's police limit.
    this.police.clear();
    const stations = this.buildings.getPoliceStations();
    this.police.spawnFromStations(stations, this.buildings.getTownHallLevel());

    // 3b. Drive-over traps. Must run after destruction.reset(), which un-hides every mesh -
    // registration re-buries the landmines.
    if (this.traps) {
      this.traps.register(this.buildings.buildings);
      this.traps.onTrapTriggered = (b, kind) => {
        const label = { damage: 'LANDMINE!', launch: 'SPRING TRAP!', freeze: 'FROZEN!', pull: 'VORTEX!' }[kind];
        if (label && this.ui.showToast) this.ui.showToast(`\u{26A0}\u{FE0F} ${label}`);
      };
    }

    // 3c. Explosive buildings (petrol, refinery, reactor, collider) hurt the buggy too.
    this.destruction.player = this.vehicle;

    // 3d. EMP Disrupters silence ability cards inside their radius (which grows per level -
    // progression.auraRadiusFor; the old inline formula read a field EMP does not have and
    // produced a NaN radius, so no field ever silenced anything).
    this.empFields = this.buildings.buildings
      .filter(b => BUILDING_DEFS[b.type] && BUILDING_DEFS[b.type].aura && BUILDING_DEFS[b.type].aura.kind === 'silence')
      .map(b => ({ b, radius: auraRadiusFor(b.type, b.level || 1) }));
    this.vehicle.isSilenced = false;
    this.cards.onSilenced = (card) => {
      const now = performance.now();
      if (!this._lastSilenceToast || now - this._lastSilenceToast > 1500) {
        this._lastSilenceToast = now;
        if (this.ui.showToast) this.ui.showToast('\u{1F4E1} EMP FIELD - ability cards jammed!');
      }
    };

    this.scene.setCameraMode('combat');
    this.vehicle.speed = 22.0; // Ramming breach speed!

    // 4. Sound the city alarms & activate emergency lighting
    this.scene.setAlarmLighting(true);
    this.sound.playExplosion('large');
    this.sound.playCrash(1.5);

    // Smash open gate doors
    if (gate.mesh.userData.doors) {
      gate.mesh.userData.doors.forEach(d => {
        d.visible = false;
      });
    }
  }

  /**
   * Remove the gate beacons and free what they hold on the GPU. createGateBeacon builds its
   * geometry, materials and name-banner texture fresh for every recon; only removing them
   * leaked 3 textures and a dozen geometries a raid.
   */
  clearBeacons() {
    while (this.beaconsGroup.children.length > 0) {
      const beacon = this.beaconsGroup.children[0];
      this.beaconsGroup.remove(beacon);
      beacon.traverse(o => {
        if (o.geometry && !o.isSprite) o.geometry.dispose();   // every Sprite shares one quad
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }
  }

  update(delta, elapsed) {
    // Animate Beacons in Recon Mode
    if (this.state === 'RECON') {
      this.beaconsGroup.children.forEach(b => {
        if (b.userData && b.userData.animator) {
          b.userData.animator(delta, elapsed);
        }
      });
      return;
    }

    if (this.state === 'SWOOP') {
      // Handled by SceneManager swoop update
      return;
    }

    if (this.state !== 'COMBAT') return;

    // 1. Update Vehicle Physics, Whole Map Driving & Mounted Weapons
    this.vehicle.update(delta, this.buildings.buildings, this.police, this.destruction);

    // 2. Check Collisions: Vehicle with Buildings & Roadblocks
    this.destruction.checkVehicleCollisions(this.vehicle, this.buildings.buildings, this.police);
    this.police.checkRoadblockCollisions(this.vehicle);

    // 3. Update Police AI & Roadblock mechanics
    this.police.update(delta, elapsed, this.vehicle);

    // 4. Update Turret auto-targeting
    this.turrets.update(delta, this.vehicle);

    // 4b. Drive-over traps and EMP fields
    if (this.traps) this.traps.update(delta, this.vehicle);
    if (this.empFields && this.empFields.length) {
      const p = this.vehicle.position;
      this.vehicle.isSilenced = this.empFields.some(f =>
        !f.b.isDestroyed && f.b.mesh &&
        Math.hypot(p.x - f.b.mesh.position.x, p.z - f.b.mesh.position.z) <= f.radius);
      // Blocking activation alone let a cloak or nitro burn switched on OUTSIDE the field
      // carry straight through it. Entering the field cuts whatever is running.
      if (this.vehicle.isSilenced) {
        const jammed = this.cards.jamActiveEffects();
        if (jammed.length && this.ui.showToast) {
          this.ui.showToast(`\u{1F4E1} EMP FIELD - ${jammed.join(' & ')} cut out!`);
        }
      }
    }

    // 5. Update Card Abilities & Projectiles
    this.cards.update(delta, elapsed);

    // 6. Update Destruction Particles & Debris
    this.destruction.update(delta);

    // 7. Update Scene Alarms
    this.scene.setAlarmLighting(true, elapsed);

    // 8. Update UI HUD & Corner Minimap
    const destructionStats = this.destruction.getStats();
    this.ui.updateCombatHUD({
      hp: this.vehicle.hp,
      maxHp: this.vehicle.maxHp,
      shield: this.vehicle.shield,
      maxShield: this.vehicle.maxShield,
      speed: this.vehicle.getSpeedMph(),
      destructionPct: destructionStats.percentage,
      stars: destructionStats.stars,
      looted: destructionStats.looted,
      policeWrecked: this.police.totalWrecked,
      playerPos: this.vehicle.position,
      playerHeading: this.vehicle.heading,
      policeUnits: this.police.policeUnits,
      roadblocks: this.police.roadblocks,
      buildings: this.buildings.buildings,
      roadNetwork: this.buildings.roadNetwork
    });

    // Keep the target health bar pinned above the structure being hit
    this.ui.updateTargetBuildingHealthPosition(this.scene.activeCamera);
    // ...and the buggy's own armor bar pinned above the buggy.
    this.ui.updateVehicleHealthBar(this.scene.activeCamera, this.vehicle);

    // 9a. Every real structure razed -> the attack is complete.
    if (destructionStats.percentage >= 100 && destructionStats.total > 0) {
      this.endAttack('victory');
      return;
    }

    // 9b. Buggy destroyed (police contact or armor gone): blow it up, hold on the wreck for a
    // beat so the player sees it, then spend a life - or end the siege if none are left.
    if (this.vehicle.isCrashed) {
      if (!this.crashHandling) {
        this.crashHandling = true;
        this.crashTimer = 1.1;
        const vp = this.vehicle.position;
        this.destruction.spawnExplosion(vp.x, 1.2, vp.z, 'huge');
        this.sound.playExplosion('huge');
        this.vehicle.mesh.visible = false;
        this.ui.hideVehicleHealthBar();
      }
      this.crashTimer -= delta;
      if (this.crashTimer <= 0) {
        this.crashHandling = false;
        this.raidLives -= 1;
        if (this.raidLives > 0) {
          this.respawnAfterBust();
        } else {
          this.endAttack(this.vehicle.isBusted ? 'busted' : 'crash');
        }
      }
    }
  }

  /**
   * Spend a spare life and put the buggy back at the breach point. Destruction so far is KEPT,
   * but the police force is re-spawned in full - being caught is not free.
   */
  respawnAfterBust() {
    const wasBusted = this.vehicle.isBusted;   // spawnAt() below clears the flag
    // The first two respawns come from the three base lives; beyond that we burn stocked spares.
    this.respawnsUsed += 1;
    if (this.respawnsUsed > this.baseLives - 1) this.economy.consumeVehicleLife();
    const left = this.raidLives;

    const sp = this.breachSpawn || { x: 0, z: 90, heading: Math.PI };
    this.vehicle.spawnAt(sp.x, sp.z, sp.heading);
    this.vehicle.mesh.visible = true;
    this.vehicle.damageImmunityTimer = 2.5;   // breathing room so a cop cannot re-bust you on spawn

    const wrecked = this.police.totalWrecked;
    this.police.clear();
    this.police.totalWrecked = wrecked;
    this.police.spawnFromStations(this.buildings.getPoliceStations(), this.buildings.getTownHallLevel());

    this.ui.hideTargetBuildingHealth();
    this.ui.updateLivesHUD(left);
    this.ui.showToast(`${wasBusted ? '🚨 BUSTED BY POLICE' : '💥 BUGGY WRECKED'}! ${left} ${left === 1 ? 'life' : 'lives'} left. Police re-deployed.`);
  }

  /** outcome: 'crash' (out of lives) | 'victory' (100% destruction) | 'retreat' (exit button) */
  endAttack(outcome = 'crash') {
    this.state = 'RESULT';
    // Detach the buggy now, not on CLAIM: the result screen froze the world, but the number keys
    // and Space still fired cards into it (rockets spawned behind the modal, cooldowns ran).
    // reset() first, while it can still switch a running cloak or nitro burn off.
    this.cards.reset();
    this.cards.setPlayer(null, null);
    this.scene.setAlarmLighting(false);
    this.ui.hideTargetBuildingHealth();
    this.ui.onRetreat = null;
    this.ui.hideVehicleHealthBar();
    this.vehicle.onDamaged = null;

    const finalStats = this.destruction.getStats();
    this.attackStats = {
      ...finalStats,
      policeWrecked: this.police.totalWrecked,
      outcome
    };

    // Reward looted resources into player treasury!
    this.economy.rewardLoot(finalStats.looted);
    // A cracked Crypto Vault's contents are in that loot now - leave it empty.
    this.buildings.emptyCrackedVaults();

    // Gems: a win pays the Town Hall's bounty - the only earnable source of the
    // instant-finish currency - scaled by how much city AND how much defense was actually
    // at stake (progression.raidGemsFor). Stowing the city and razing a lone Town Hall pays
    // nothing, and every kind of defense stowed first (the guns, the EMPs, the traps) costs gems.
    if (outcome === 'victory' && this.economy.addGems) {
      const th = this.buildings.getTownHallLevel();
      const row = townHallRow(th);
      const threat = this.raidThreat || 0;
      const gems = raidGemsFor(th, finalStats.total, threat);
      if (gems > 0) this.economy.addGems(gems);
      this.attackStats.gems = gems;
      this.attackStats.gemBounty = row.raidGems;
      this.attackStats.gemMinTargets = row.raidMinTargets;
      this.attackStats.gemKinds = this.raidDefense ? this.raidDefense.total : 0;
      this.attackStats.gemKindShare = RAID_KIND_SHARE;
      this.attackStats.gemThreat = threat;
      this.attackStats.gemShort = this.raidDefense
        ? this.raidDefense.kinds.filter(k => k.cover < 1).map(k => (BUILDING_DEFS[k.type] ? BUILDING_DEFS[k.type].name : k.type))
        : [];
    }

    // Show summary modal
    setTimeout(() => {
      this.ui.showResultModal(this.attackStats, () => {
        this.returnToBuilder();
      });
    }, 1200);
  }

  returnToBuilder() {
    // Re-arm traps and un-bury landmines so the builder view shows your own defenses.
    if (this.traps) this.traps.reset();
    this.vehicle.isSilenced = false;
    this.empFields = [];
    this.destruction.player = null;

    this.state = 'IDLE';
    this.buildings.setCollectiblesVisible(true);
    this.scene.setCameraMode('builder');
    this.scene.setAlarmLighting(false);
    this.police.clear();
    this.turrets.clear();
    // Shells still in flight when the raid ended would hang frozen over the builder view and
    // land on the next raid's buildings.
    this.vehicle.clearProjectiles();
    // endAttack already detached the buggy; this keeps a returnToBuilder() called on its own
    // (tooling, a raid abandoned mid-way) just as safe.
    this.cards.reset();
    this.cards.setPlayer(null, null);
    this.destruction.clearEffects();
    this.destruction.clearRubble(this.buildings.buildings);

    // Restore razed buildings for the builder phase. Clearing mesh.visible alone left
    // isDestroyed set until the NEXT attack called DestructionEngine.reset(), so factories
    // stopped producing and the builder count sagged in between raids.
    this.buildings.buildings.forEach(b => {
      b.isDestroyed = false;
      b.hp = b.maxHp;
      if (b.mesh) b.mesh.visible = true;
      if (b.isMainGate && b.mesh.userData.doors) {
        b.mesh.userData.doors.forEach(d => {
          d.visible = true;
        });
      }
    });

    this.vehicle.mesh.visible = false;
    this.ui.showBuilderHUD();
  }
}
