import * as THREE from 'three';

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
    this.maxForwardSpeed = 30.0;
    this.maxReverseSpeed = -12.0;
    this.acceleration = 24.0;
    this.braking = 36.0;
    this.friction = 8.0;
    this.turnSpeed = 2.4;
    this.driftFactor = 0; // 0 to 1

    // Vertical / Jump Physics
    this.verticalY = 0;
    this.velocityY = 0;
    this.gravity = -36.0;
    this.isAirborne = false;

    // Combat Stats
    this.maxHp = 500;
    this.hp = 500;
    this.maxShield = 200;
    this.shield = 200;
    this.isCrashed = false;
    this.isInvulnerable = false;
    this.isInvisible = false;
    this.isNitro = false;
    this.damageImmunityTimer = 0;

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
    this.fireInterval = 0.14; // rapid twin cannon fire
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
      if (e.code === 'Space' || e.code === 'KeyJ') {
        if (!e.target.closest('input, textarea')) {
          e.preventDefault();
          if (this.onJumpRequested) {
            this.onJumpRequested();
          } else {
            this.triggerBigJump();
          }
        }
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

  spawnAt(x, z, heading = 0) {
    // Clear per-run buff state so a crash mid-nitro/invisibility cannot carry into the next raid.
    this.isInvisible = false;
    this.isNitro = false;
    this.isInvulnerable = false;
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
    this.mesh.visible = true;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.set(0, heading, 0);

    // Sync camera immediately behind
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.camCurrentPos.copy(this.position).sub(forward.clone().multiplyScalar(this.camDistance)).add(new THREE.Vector3(0, this.camHeight, 0));
    this.camera.position.copy(this.camCurrentPos);
  }

  takeDamage(amount) {
    if (this.isInvulnerable || this.isCrashed || this.damageImmunityTimer > 0 || this.isAirborne) return;

    this.damageImmunityTimer = 0.35; // 350ms immunity buffer so multiple contacts in one frame don't melt player
    this.sound.playCrash(1.2);
    this.camShake = Math.min(2.5, this.camShake + 0.8);

    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield < 0) {
        this.hp += this.shield; // remaining bleeds to HP
        this.shield = 0;
      }
    } else {
      this.hp -= amount;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isCrashed = true;
      this.sound.playExplosion('huge');
    }
  }

  triggerBigJump(boostSpeed = 14.0, boostY = 25.0) {
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

    if (this.isCrashed) {
      this.sound.updateEngine(0, false, false);
      this.sound.updateDrift(0);
      return;
    }

    const maxSpeed = this.isNitro ? this.maxForwardSpeed * 1.7 : this.maxForwardSpeed;
    const accelRate = this.isNitro ? this.acceleration * 1.8 : this.acceleration;

    // 1. Acceleration / Reverse
    let isAccel = false;
    if (this.inputs.forward) {
      isAccel = true;
      this.speed = Math.min(maxSpeed, this.speed + accelRate * delta);
    } else if (this.inputs.reverse) {
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
    if (this.inputs.handbrake) {
      this.driftFactor = Math.min(1.0, this.driftFactor + delta * 3.5);
      this.speed *= Math.max(0.75, 1.0 - delta * 0.8);
    } else {
      this.driftFactor = Math.max(0, this.driftFactor - delta * 2.5);
    }

    // 3. Steering
    const steerEffort = (this.inputs.left ? 1 : 0) - (this.inputs.right ? 1 : 0);
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
    this.fireCooldown -= delta;
    if (this.inputs.fire && this.fireCooldown <= 0 && !this.isCrashed && this.mesh.visible) {
      this.fireCannons();
      this.fireCooldown = this.fireInterval;
    }

    // 9. Update Active Weapon Projectiles
    this.updateProjectiles(delta, buildings, policeManager, destructionEngine);

    // 10. Audio updates
    this.sound.updateEngine(speedRatio, isAccel, true);
    this.sound.updateDrift(this.driftFactor * (speedRatio > 0.3 ? 1 : 0));
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
          if (b.isDestroyed || !b.mesh) continue;
          const hitRadius = b.isMainGate ? 4.8 : 3.2;
          if (p.pos.distanceTo(b.mesh.position) < hitRadius) {
            destructionEngine.damageBuilding(b, 65, buildings, policeManager);
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
            cop.hp -= 90;
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
        this.projectilesGroup.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  clearProjectiles() {
    this.projectiles.forEach(p => {
      this.projectilesGroup.remove(p.mesh);
    });
    this.projectiles = [];
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
