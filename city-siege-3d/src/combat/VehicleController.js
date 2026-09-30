import * as THREE from 'three';
import { RAIDER_BASE, BUILDING_DEFS } from '../data/progression.js';

/**
 * Stock tuning of the battle buggy (defined in progression.js as RAIDER_BASE). The Vehicle
 * Garage (GarageManager.computeVehicleStats -> progression.vehicleStatsFor) derives every
 * upgraded value from these constants, so applying upgrades is always an absolute
 * assignment and never compounds across raids.
 */
export const VEHICLE_BASE = RAIDER_BASE;

/** Off the asphalt the buggy is slower (the road's own catalog entry says by how much). */
const ROAD_SURFACE = (BUILDING_DEFS.road && BUILDING_DEFS.road.surface) || { offRoadSpeedMult: 1, offRoadAccelMult: 1 };

/**
 * Hit feedback (crash sound, camera shake, HUD flash) plays at most this often - every round
 * lands now, and a kill box lands a dozen a second - but a bigger hit always gets its own.
 * Presentation only: the damage itself is never throttled.
 */
const HIT_FEEDBACK_SECONDS = 0.1;

/**
 * VehicleController - TPP arcade driving physics, drifting,
 * dynamic chase camera, jump hydraulics, and damage model.
 */
export class VehicleController {
  constructor(scene, camera, assetFactory, soundManager) {
    this.scene = scene;
    this.camera = camera;
    this.assetFactory = assetFactory;
    this.sound = soundManager;

    // 3D Mesh
    this.mesh = this.assetFactory.createAttackVehicle();
    this.scene.add(this.mesh);

    // Physics State
    this.position = new THREE.Vector3(0, 0, 0);
    this.heading = 0; // Radians around Y
    this.speed = 0;
    this.maxForwardSpeed = VEHICLE_BASE.maxForwardSpeed;
    this.maxReverseSpeed = -12.0;
    this.acceleration = VEHICLE_BASE.acceleration;
    this.braking = 36.0;
    this.friction = 8.0;
    this.turnSpeed = 2.4;
    this.driftFactor = 0; // 0 to 1

    // Vertical / Jump Physics
    this.verticalY = 0;
    this.velocityY = 0;
    this.gravity = -VEHICLE_BASE.gravity;   // sets every jump's hang time (progression.airtimeFor)
    this.isAirborne = false;

    // Combat Stats
    this.maxHp = VEHICLE_BASE.maxHp;
    this.hp = VEHICLE_BASE.maxHp;
    this.maxShield = VEHICLE_BASE.maxShield;
    this.shield = VEHICLE_BASE.maxShield;
    // Garage-tunable hardware strength (nitro multipliers, hydraulic jump launch).
    this.nitroSpeedMult = VEHICLE_BASE.nitroSpeedMult;
    this.nitroAccelMult = VEHICLE_BASE.nitroAccelMult;
    this.jumpBoostSpeed = VEHICLE_BASE.jumpBoostSpeed;
    this.jumpBoostY = VEHICLE_BASE.jumpBoostY;
    this.cannonDamage = VEHICLE_BASE.cannonDamage;
    this.cannonVsUnits = VEHICLE_BASE.cannonVsUnits;
    this.isCrashed = false;
    this.isInvulnerable = false;
    this.isInvisible = false;
    this.isNitro = false;
    // Breach / respawn grace (AttackManager): nothing lands but a detonation, and no bust.
    this.damageImmunityTimer = 0;
    // Per-hit CONTACT buffer (rams, blasts, police blocks): only other contact hits honour it.
    this.contactImmunityTimer = 0;
    this.hitFeedbackTimer = 0;   // see HIT_FEEDBACK_SECONDS
    this.hitFeedbackAmount = 0;
    this.onRoad = true;         // updated every frame; off-road costs top speed
    // Status effects applied by traps and auras (TrapSystem / AttackManager).
    this.slowFactor = 1;        // multiplies top speed while slowTimer > 0
    this.slowTimer = 0;
    this.stunTimer = 0;         // no throttle or steering while > 0
    this.pullTimer = 0;         // dragged toward (pullX, pullZ) while > 0
    this.pullX = 0;
    this.pullZ = 0;
    this.pullStrength = 0;
    this.pullRadius = 0;        // leash: cannot get further than this from the pull centre
    this.isSilenced = false;    // EMP field: ability cards locked out

    // Controls input state
    this.inputs = {
      forward: false,
      reverse: false,
      left: false,
      right: false,
      handbrake: false,
      fire: false
    };

    // Mounted Weapon Blaster Cannon state
    this.fireCooldown = 0;
    this.fireInterval = VEHICLE_BASE.cannonInterval; // rapid twin cannon fire
    this.projectiles = [];
    this.projectilesGroup = new THREE.Group();
    this.projectilesGroup.name = 'vehicle_projectiles';
    this.scene.add(this.projectilesGroup);

    // Camera follow parameters
    this.camDistance = 11.0;
    this.camHeight = 4.2;
    this.camLookAhead = 6.0;
    this.camCurrentPos = new THREE.Vector3();
    this.camShake = 0;

    // Ghost materials cache
    this.originalMaterials = new Map();
    this._cacheOriginalMaterials();

    this._initInputListeners();
  }

  _initInputListeners() {
    this.onJumpRequested = null;

    window.addEventListener('keydown', (e) => {
      if (['KeyW', 'ArrowUp'].includes(e.code)) this.inputs.forward = true;
      if (['KeyS', 'ArrowDown'].includes(e.code)) this.inputs.reverse = true;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) this.inputs.left = true;
      if (['KeyD', 'ArrowRight'].includes(e.code)) this.inputs.right = true;
      if (['ShiftLeft', 'ShiftRight', 'KeyC'].includes(e.code)) {
        this.inputs.handbrake = true;
      }
      if (e.code === 'KeyF') {
        this.inputs.fire = true;
      }
      // Space / J only drive a buggy that is on the map: before the first raid of a session the
      // hidden buggy took a Big Jump from the home screen (no card system had attached yet).
      if ((e.code === 'Space' || e.code === 'KeyJ') && this.mesh.visible && !e.target.closest('input, textarea')) {
        e.preventDefault();
        if (this.onJumpRequested) this.onJumpRequested();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['KeyW', 'ArrowUp'].includes(e.code)) this.inputs.forward = false;
      if (['KeyS', 'ArrowDown'].includes(e.code)) this.inputs.reverse = false;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) this.inputs.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) this.inputs.right = false;
      if (['ShiftLeft', 'ShiftRight', 'KeyC'].includes(e.code)) {
        this.inputs.handbrake = false;
      }
      if (e.code === 'KeyF') {
        this.inputs.fire = false;
      }
    });

    // Left click on combat canvas fires vehicle cannons!
    window.addEventListener('pointerdown', (e) => {
      if (e.button === 0 && this.mesh.visible && !this.isCrashed) {
        if (!e.target.closest('#ui-container button, #ui-container .action-card, #ui-container .modal-backdrop, #ui-container .touch-btn')) {
          this.inputs.fire = true;
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) {
        this.inputs.fire = false;
      }
    });
  }

  _cacheOriginalMaterials() {
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        this.originalMaterials.set(child, child.material);
      }
    });
  }

  setRoadNetwork(roadNetwork) {
    this.roadNetwork = roadNetwork;
  }

  /**
   * Night battle raids (SceneManager raid theme 'night') light the road ahead with a headlight
   * that rides on the buggy. Built once, on the first night raid, and only toggled after that:
   * adding or removing a light changes the light count every lit material's shader is compiled
   * for, so it is never churned per raid. An invisible light is left out of the render (and so
   * is every light on the hidden buggy between raids), so day raids render exactly as before.
   */
  setHeadlight(on) {
    if (!on && !this.headlight) return;
    if (!this.headlight) {
      // Warm white cone, 70m reach. The buggy's local +Z is forward (mesh.rotation.y = heading).
      // It hangs a little above and behind the bonnet rather than in the grille, so the cone also
      // catches the buggy's own roof and bonnet - from the chase camera a buggy lit only in front
      // of itself was a black shape on a black road.
      const spot = new THREE.SpotLight(0xfff0d8, 70, 70, Math.PI / 4.6, 0.55, 1.1);
      spot.name = 'buggy_headlight';
      spot.position.set(0, 3.0, -0.8);
      spot.target.position.set(0, 0, 16);
      spot.castShadow = false;   // a second shadow map every frame is not worth it
      this.mesh.add(spot);
      this.mesh.add(spot.target);
      this.headlight = spot;
    }
    this.headlight.visible = !!on;
  }

  /**
   * Apply Vehicle Garage tuning as ABSOLUTE values (see GarageManager.computeVehicleStats).
   * Called immediately before spawnAt() at breach, because spawnAt copies maxHp into hp.
   */
  applyUpgrades(s) {
    if (!s) return;
    this.maxForwardSpeed = s.maxForwardSpeed;
    this.acceleration = s.acceleration;
    this.maxHp = s.maxHp;
    this.maxShield = s.maxShield;
    this.nitroSpeedMult = s.nitroSpeedMult;
    this.nitroAccelMult = s.nitroAccelMult;
    this.jumpBoostSpeed = s.jumpBoostSpeed;
    this.jumpBoostY = s.jumpBoostY;
    if (Number.isFinite(s.cannonDamage)) this.cannonDamage = s.cannonDamage;
    if (Number.isFinite(s.cannonVsUnits)) this.cannonVsUnits = s.cannonVsUnits;
  }

  spawnAt(x, z, heading = 0) {
    // Clear per-run buff state so a crash mid-nitro/invisibility cannot carry into the next raid.
    this.isInvisible = false;
    this.isNitro = false;
    this.isInvulnerable = false;
    this.isBusted = false;
    this.position.set(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.verticalY = 0;
    this.velocityY = 0;
    this.isAirborne = false;
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.isCrashed = false;
    this.damageImmunityTimer = 0;
    this.contactImmunityTimer = 0;
    this.hitFeedbackTimer = 0;
    this.hitFeedbackAmount = 0;
    // Status effects applied by traps and auras (TrapSystem / AttackManager).
    this.slowFactor = 1;        // multiplies top speed while slowTimer > 0
    this.slowTimer = 0;
    this.stunTimer = 0;         // no throttle or steering while > 0
    this.pullTimer = 0;         // dragged toward (pullX, pullZ) while > 0
    this.pullX = 0;
    this.pullZ = 0;
    this.pullStrength = 0;
    this.pullRadius = 0;
    this.isSilenced = false;    // EMP field: ability cards locked out
    this.mesh.visible = true;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.set(0, heading, 0);

    // Sync camera immediately behind
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.camCurrentPos.copy(this.position).sub(forward.clone().multiplyScalar(this.camDistance)).add(new THREE.Vector3(0, this.camHeight, 0));
    this.camera.position.copy(this.camCurrentPos);
  }

  /**
   * Police contact = busted. Ends the life immediately regardless of armor. Only the breach /
   * respawn grace holds it off - a ram or a shell a moment earlier does not.
   */
  bust() {
    if (this.isCrashed || this.isInvulnerable || this.isInvisible || this.damageImmunityTimer > 0 || this.isAirborne) return;
    this.isBusted = true;
    this.isCrashed = true;
    this.speed = 0;
    this.camShake = Math.min(2.5, this.camShake + 1.5);
    this.sound.playCrash(1.4);
  }

  /**
   * `opts.pierce` (0..1) is the share of the hit that skips the shield and goes straight
   * into the hull (Laser Obelisk beams); the rest drains the shield first as usual.
   * `opts.contact` marks a ram, a blast or a police block - see takeDamageUnconditional.
   * `opts.bypassImmunity` marks a one-off detonation (a landmine) that lands even inside the
   * breach / respawn grace.
   */
  takeDamage(amount, opts = {}) {
    if (this.isAirborne) return;   // ground fire and rams cannot reach a jumping buggy
    this.takeDamageUnconditional(amount, opts);
  }

  /**
   * Damage that also lands while airborne (drones strafing from above). Always honours
   * invulnerability, a crash in progress and - unless `opts.bypassImmunity` - the breach /
   * respawn grace (damageImmunityTimer), which covers most of the drive from the gate: a
   * landmine that honoured it was spent there for 0 damage.
   *
   * Only CONTACT hits (`opts.contact`) start or honour the RAIDER_BASE.contactImmunity buffer,
   * so grinding a barrier or a chain of blasts in one frame cannot melt the buggy. Gunfire -
   * rounds, beams, splash, strafes - is a stream of separate hits and every one lands: when
   * all hits shared the buffer, a tesla spark that landed first threw away the Doomsday shell
   * right behind it, and every gun added to a defense made it weaker.
   */
  takeDamageUnconditional(amount, opts = {}) {
    if (this.isInvulnerable || this.isCrashed) return;
    if (this.damageImmunityTimer > 0 && !opts.bypassImmunity) return;
    if (opts.contact) {
      if (this.contactImmunityTimer > 0) return;
      this.contactImmunityTimer = VEHICLE_BASE.contactImmunity;
    }
    if (this.hitFeedbackTimer <= 0 || amount > this.hitFeedbackAmount) {
      this.hitFeedbackTimer = HIT_FEEDBACK_SECONDS;
      this.hitFeedbackAmount = amount;
      this.sound.playCrash(1.2);
      this.camShake = Math.min(2.5, this.camShake + 0.8);
      if (this.onDamaged) this.onDamaged(amount);   // HUD hit flash / vignette
    }

    const pierce = Math.max(0, Math.min(1, Number(opts.pierce) || 0));
    const direct = amount * pierce;
    const rest = amount - direct;
    this.hp -= direct;
    if (this.shield > 0) {
      this.shield -= rest;
      if (this.shield < 0) {
        this.hp += this.shield; // remaining bleeds to HP
        this.shield = 0;
      }
    } else {
      this.hp -= rest;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isCrashed = true;
      this.sound.playExplosion('huge');
    }
  }

  // ---------------------------------------------------------------- status effects

  /** Cap top speed at `factor` of normal for `seconds`. The stronger slow wins. */
  applySlow(factor, seconds) {
    if (this.isAirborne || this.isCrashed) return;
    this.slowFactor = Math.min(this.slowTimer > 0 ? this.slowFactor : 1, factor);
    this.slowTimer = Math.max(this.slowTimer, seconds);
    this.speed = Math.min(this.speed, this.maxForwardSpeed * this.slowFactor);
  }

  /** No throttle or steering for `seconds` - the buggy coasts on momentum. */
  applyStun(seconds) {
    if (this.isCrashed) return;
    this.stunTimer = Math.max(this.stunTimer, seconds);
  }

  /** Spring trap: throw the buggy into the air without the forward boost a jump gives. */
  launch(velocityY, stunSeconds = 0) {
    if (this.isAirborne || this.isCrashed) return;
    this.isAirborne = true;
    this.velocityY = velocityY;
    this.speed *= 0.4;
    this.camShake = 1.1;
    if (stunSeconds > 0) this.applyStun(stunSeconds);
  }

  /**
   * Vortex trap: for `seconds`, drag toward (x, z) AND leash the buggy inside `radius` of
   * it. A flat pull alone was weaker than the throttle (a stock buggy left a 12m well in
   * about two seconds), so the well now holds for its whole duration.
   */
  applyPull(x, z, strength, seconds, radius = 0) {
    if (this.isAirborne || this.isCrashed) return;
    this.pullX = x;
    this.pullZ = z;
    this.pullStrength = strength;
    this.pullRadius = Math.max(0, Number(radius) || 0);
    this.pullTimer = Math.max(this.pullTimer, seconds);
  }

  /** Keep the buggy inside an active vortex leash (called after every position update). */
  _applyLeash() {
    if (!(this.pullTimer > 0) || !(this.pullRadius > 0)) return;
    const dx = this.position.x - this.pullX;
    const dz = this.position.z - this.pullZ;
    const d = Math.hypot(dx, dz);
    if (d <= this.pullRadius) return;
    this.position.x = this.pullX + (dx / d) * this.pullRadius;
    this.position.z = this.pullZ + (dz / d) * this.pullRadius;
    // Hitting the edge of the well bleeds speed, like running into a soft wall.
    this.speed *= 0.6;
  }

  _tickStatusEffects(delta) {
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - delta);
      if (this.slowTimer === 0) this.slowFactor = 1;
    }
    if (this.stunTimer > 0) this.stunTimer = Math.max(0, this.stunTimer - delta);
    if (this.pullTimer > 0) {
      this.pullTimer = Math.max(0, this.pullTimer - delta);
      const dx = this.pullX - this.position.x;
      const dz = this.pullZ - this.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.5 && !this.isAirborne) {
        const step = Math.min(d, this.pullStrength * delta);
        this.position.x += (dx / d) * step;
        this.position.z += (dz / d) * step;
      }
    }
  }

  triggerBigJump(boostSpeed = this.jumpBoostSpeed, boostY = this.jumpBoostY) {
    if (this.isAirborne || this.isCrashed) return;
    this.isAirborne = true;
    this.velocityY = boostY; // Hydraulic rocket launch!
    // Forward propulsion ensures buggy leaps OVER roadblocks, buildings, and cruisers
    this.speed = Math.max(this.speed + boostSpeed, 24.0);
    this.sound.playBigJump();
    this.camShake = 1.3;
  }

  setInvisibility(active) {
    this.isInvisible = active;
    if (active) {
      this.sound.playInvisibility();
      const ghostMat = new THREE.MeshBasicMaterial({
        color: 0x80d8ff,
        transparent: true,
        opacity: 0.35,
        wireframe: true
      });
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          child.material = ghostMat;
        }
      });
    } else {
      this.mesh.traverse((child) => {
        if (child.isMesh && this.originalMaterials.has(child)) {
          child.material = this.originalMaterials.get(child);
        }
      });
    }
  }

  setNitro(active) {
    this.isNitro = active;
    if (active) {
      this.sound.playNitro();
    }
    if (this.mesh.userData.flames) {
      this.mesh.userData.flames.forEach(f => {
        f.visible = active;
      });
    }
  }

  update(delta, buildings = [], policeManager = null, destructionEngine = null) {
    this.damageImmunityTimer = Math.max(0, this.damageImmunityTimer - delta);
    this.contactImmunityTimer = Math.max(0, this.contactImmunityTimer - delta);
    if (this.hitFeedbackTimer > 0) {
      this.hitFeedbackTimer = Math.max(0, this.hitFeedbackTimer - delta);
      if (this.hitFeedbackTimer === 0) this.hitFeedbackAmount = 0;
    }

    if (this.isCrashed) {
      this.sound.updateEngine(0, false, false);
      this.sound.updateDrift(0);
      return;
    }

    this._tickStatusEffects(delta);

    // Roads are where the buggy is fastest: off the asphalt top speed and acceleration drop.
    this.onRoad = this._isOnRoad();
    const surfSpeed = this.onRoad ? 1 : ROAD_SURFACE.offRoadSpeedMult;
    const surfAccel = this.onRoad ? 1 : ROAD_SURFACE.offRoadAccelMult;

    const slow = this.slowTimer > 0 ? this.slowFactor : 1;
    const maxSpeed = (this.isNitro ? this.maxForwardSpeed * this.nitroSpeedMult : this.maxForwardSpeed) * slow * surfSpeed;
    const accelRate = (this.isNitro ? this.acceleration * this.nitroAccelMult : this.acceleration) * surfAccel;
    // A stunned driver has no throttle, brake or steering - momentum only.
    const stunned = this.stunTimer > 0;
    const inputs = stunned
      ? { forward: false, reverse: false, handbrake: false, left: false, right: false }
      : this.inputs;
    if (this.speed > maxSpeed) this.speed = Math.max(maxSpeed, this.speed - this.braking * 2 * delta);

    // 1. Acceleration / Reverse
    let isAccel = false;
    if (inputs.forward) {
      isAccel = true;
      this.speed = Math.min(maxSpeed, this.speed + accelRate * delta);
    } else if (inputs.reverse) {
      this.speed = Math.max(this.maxReverseSpeed, this.speed - this.braking * delta);
    } else {
      // Coast / Natural Friction
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.friction * delta);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + this.friction * delta);
      }
    }

    // 2. Handbrake Drifting
    if (inputs.handbrake) {
      this.driftFactor = Math.min(1.0, this.driftFactor + delta * 3.5);
      this.speed *= Math.max(0.75, 1.0 - delta * 0.8);
    } else {
      this.driftFactor = Math.max(0, this.driftFactor - delta * 2.5);
    }

    // 3. Steering
    const steerEffort = (inputs.left ? 1 : 0) - (inputs.right ? 1 : 0);
    const speedRatio = Math.abs(this.speed) / this.maxForwardSpeed;
    if (Math.abs(this.speed) > 0.5) {
      const turnMult = 1.0 + this.driftFactor * 0.6;
      const dir = this.speed >= 0 ? 1 : -1;
      this.heading += steerEffort * this.turnSpeed * turnMult * dir * delta;
    }

    // 4. Position Updates: Vehicle can drive freely across the WHOLE MAP!
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    const nextX = this.position.x + forwardX * this.speed * delta;
    const nextZ = this.position.z + forwardZ * this.speed * delta;

    // Full freedom of movement anywhere inside fortified perimeter walls (radius ~88m).
    // The buggy breaches from OUTSIDE the wall (spawns ~98m out, beyond the gate), so driving
    // inward must always be allowed - otherwise the assault is frozen at the spawn point.
    const mapRadius = 88.0;
    const distFromCenter = Math.hypot(nextX, nextZ);
    const currentDist = Math.hypot(this.position.x, this.position.z);

    if (distFromCenter < mapRadius || distFromCenter < currentDist) {
      this.position.x = nextX;
      this.position.z = nextZ;
      this._wallContact = false;
    } else {
      // Let the buggy SLIDE along the fence instead of rejecting both axes together, and thud
      // only once per impact - this branch runs every frame while you are pressed against the
      // wall, which previously meant ~60 crash sounds and 60 speed inversions per second.
      const slideX = Math.hypot(nextX, this.position.z);
      const slideZ = Math.hypot(this.position.x, nextZ);
      if (slideX < mapRadius || slideX < currentDist) {
        this.position.x = nextX;
      } else if (slideZ < mapRadius || slideZ < currentDist) {
        this.position.z = nextZ;
      }

      if (!this._wallContact && Math.abs(this.speed) > 4.0) {
        this.speed *= -0.3;
        this.sound.playCrash(0.4);
      }
      this._wallContact = true;
    }
    this._applyLeash();

    // 5. Vertical Jump & Gravity
    if (this.isAirborne) {
      this.velocityY += this.gravity * delta;
      this.verticalY += this.velocityY * delta;
      if (this.verticalY <= 0) {
        this.verticalY = 0;
        this.velocityY = 0;
        this.isAirborne = false;
        this.sound.playCrash(0.8); // landing thud
        this.camShake = 0.9;
      }
    }

    // 6. Mesh Transform & Wheel Animations
    this.mesh.position.set(this.position.x, this.verticalY, this.position.z);
    this.mesh.rotation.y = this.heading;

    // Body Tilt (Suspension Pitch and Roll)
    const pitch = (this.inputs.forward ? -0.04 : this.inputs.reverse ? 0.05 : 0) + (this.isAirborne ? this.velocityY * 0.015 : 0);
    const roll = -steerEffort * speedRatio * 0.08;
    this.mesh.rotation.x = pitch;
    this.mesh.rotation.z = roll;

    // Rotate Wheels
    if (this.mesh.userData.wheels) {
      const wheelRotSpeed = (this.speed / 0.45) * delta;
      this.mesh.userData.wheels.forEach((w, i) => {
        w.children[0].rotation.x += wheelRotSpeed;
        w.children[1].rotation.x += wheelRotSpeed;
        // Front wheels turn with steer
        if (i < 2) {
          w.rotation.y = steerEffort * 0.45;
        }
      });
    }

    // 7. Dynamic Chase Camera
    this.updateCamera(delta);

    // 8. Mounted Autocannon Attack / Firing
    // The autocannon is AUTOMATIC - it keeps firing on its own for as long as the buggy is
    // alive and in the field, so the player only has to drive and play ability cards.
    this.fireCooldown -= delta;
    if (this.fireCooldown <= 0 && !this.isCrashed && this.mesh.visible) {
      this.fireCannons();
      this.fireCooldown = this.fireInterval;
    }

    // 9. Update Active Weapon Projectiles
    this.updateProjectiles(delta, buildings, policeManager, destructionEngine);

    // 10. Audio updates
    this.sound.updateEngine(speedRatio, isAccel, true);
    this.sound.updateDrift(this.driftFactor * (speedRatio > 0.3 ? 1 : 0));
  }

  /** Is the buggy on a paved road tile? (No road network = no penalty.) */
  _isOnRoad() {
    const rn = this.roadNetwork;
    if (!rn || !rn.hasRoad) return true;
    const ts = rn.tileSize || 5.5;
    return rn.hasRoad(Math.round(this.position.x / ts), Math.round(this.position.z / ts));
  }

  fireCannons() {
    if (this.isCrashed || !this.mesh.visible) return;

    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const right = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
    const up = new THREE.Vector3(0, 1, 0);

    const leftSpawn = this.position.clone()
      .add(forward.clone().multiplyScalar(1.8))
      .sub(right.clone().multiplyScalar(0.45))
      .add(up.clone().multiplyScalar(0.65 + this.verticalY));

    const rightSpawn = this.position.clone()
      .add(forward.clone().multiplyScalar(1.8))
      .add(right.clone().multiplyScalar(0.45))
      .add(up.clone().multiplyScalar(0.65 + this.verticalY));

    [leftSpawn, rightSpawn].forEach(spawnPos => {
      // High-tech glowing plasma tracer shell
      const geo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(spawnPos);
      mesh.rotation.y = this.heading;
      mesh.rotation.x = Math.PI / 2;
      this.projectilesGroup.add(mesh);

      this.projectiles.push({
        mesh,
        pos: spawnPos,
        velocity: forward.clone().multiplyScalar(125.0),
        life: 1.4
      });
    });

    this.sound.playTurretFire();
  }

  updateProjectiles(delta, buildings = [], policeManager = null, destructionEngine = null) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;
      p.pos.addScaledVector(p.velocity, delta);
      p.mesh.position.copy(p.pos);

      let hit = false;

      // 1. Check building hits
      if (buildings && destructionEngine) {
        for (let b of buildings) {
          // Trees and drive-over traps are not there as far as the gun knows (isShootable).
          if (!destructionEngine.isShootable(b)) continue;
          const hitRadius = b.isMainGate ? 4.8 : 3.2;
          if (p.pos.distanceTo(b.mesh.position) < hitRadius) {
            // Per-shell damage (~14 shells/sec, two barrels): 14 stock, raised by the Weapons Lab. 65 here
            // once razed anything in a couple of seconds.
            destructionEngine.damageBuilding(b, this.cannonDamage, buildings, policeManager);
            hit = true;
            break;
          }
        }
      }

      // 2. Check police cruiser hits
      if (!hit && policeManager && policeManager.policeUnits) {
        for (let cop of policeManager.policeUnits) {
          if (cop.isDestroyed) continue;
          if (p.pos.distanceTo(cop.position) < 2.4) {
            // 24/shell stock at ~14 shells/s (a cruiser dies to ~1s of sustained fire, not
            // instantly), raised by the Weapons Lab exactly like the anti-building shells.
            cop.hp -= this.cannonVsUnits;
            if (cop.hp <= 0) {
              policeManager.destroyUnit(cop);
            }
            if (destructionEngine) {
              destructionEngine.spawnExplosion(p.pos.x, p.pos.y, p.pos.z, 'small');
            }
            hit = true;
            break;
          }
        }
      }

      if (hit || p.life <= 0) {
        this._disposeShell(p);
        this.projectiles.splice(i, 1);
      }
    }
  }

  /** Drop every autocannon shell in flight (AttackManager calls this when a raid ends or starts). */
  clearProjectiles() {
    this.projectiles.forEach(p => this._disposeShell(p));
    this.projectiles = [];
  }

  /** Each shell owns its geometry and material (fireCannons), so free them with it. */
  _disposeShell(p) {
    this.projectilesGroup.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
  }

  updateCamera(delta) {
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const lookTarget = this.position.clone().add(forward.clone().multiplyScalar(this.camLookAhead)).add(new THREE.Vector3(0, 1.5, 0));

    // Dynamic camera trailing position
    const speedZoom = (Math.abs(this.speed) / this.maxForwardSpeed) * 3.5;
    const targetCamPos = this.position.clone()
      .sub(forward.clone().multiplyScalar(this.camDistance + speedZoom))
      .add(new THREE.Vector3(0, this.camHeight + this.verticalY * 0.4, 0));

    // Smooth camera lerp
    this.camCurrentPos.lerp(targetCamPos, delta * 6.5);

    // Screen Shake
    if (this.camShake > 0) {
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * this.camShake,
        (Math.random() - 0.5) * this.camShake,
        (Math.random() - 0.5) * this.camShake
      );
      this.camera.position.copy(this.camCurrentPos).add(shakeOffset);
      this.camShake = Math.max(0, this.camShake - delta * 4.0);
    } else {
      this.camera.position.copy(this.camCurrentPos);
    }

    this.camera.lookAt(lookTarget);

    // Dynamic FOV when boosting
    const targetFov = this.isNitro ? 80 : 65;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 5);
    this.camera.updateProjectionMatrix();
  }

  getSpeedMph() {
    return Math.round(Math.abs(this.speed) * 2.237);
  }
}
