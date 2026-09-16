import * as THREE from 'three';

/**
 * PoliceManager - Spawns pursuit cruisers from police stations,
 * controls intercept AI, siren strobes, ramming, and roadblock drops.
 */
export class PoliceManager {
  constructor(scene, assetFactory, soundManager, destructionEngine) {
    this.scene = scene;
    this.assetFactory = assetFactory;
    this.sound = soundManager;
    this.destruction = destructionEngine;

    this.policeUnits = [];
    this.roadblocks = [];
    this.policeGroup = new THREE.Group();
    this.policeGroup.name = 'police_pursuit_group';
    this.scene.add(this.policeGroup);

    this.totalWrecked = 0;
    this.spawnTimer = 0;
    this.maxPolice = 4;

    // Reinforcements: a wrecked cruiser is replaced after a delay from any police station that
    // is still standing. Raze the stations and the pursuit dries up.
    this.stations = [];
    this.respawnQueue = [];
    this.respawnDelay = 4.0;
  }

  spawnFromStations(policeStations) {
    this.stations = policeStations || [];
    if (!policeStations || policeStations.length === 0) return;

    policeStations.forEach(station => {
      const pos = station.mesh.position;
      this.spawnCruiser(pos.x + (Math.random() - 0.5) * 4, pos.z + (Math.random() - 0.5) * 4);
    });
  }

  spawnCruiser(x, z) {
    if (this.policeUnits.length >= this.maxPolice) return;

    const mesh = this.assetFactory.createPoliceVehicle();
    mesh.position.set(x, 0, z);
    this.policeGroup.add(mesh);

    const unit = {
      id: `cop_${Date.now()}_${Math.random()}`,
      mesh,
      position: new THREE.Vector3(x, 0, z),
      heading: Math.random() * Math.PI * 2,
      speed: 0,
      maxSpeed: 16.5 + Math.random() * 2.5, // Slower pursuit speed (~17 m/s vs player's 30 m/s)
      acceleration: 8.5, // Gradual acceleration so player can outrun them
      turnSpeed: 1.5, // Wider turning arc so player can dodge with sharp corners
      hp: 320,
      maxHp: 320,
      ramCooldown: 0, // Prevents multi-frame damage melting
      roadblockCooldown: 4.0 + Math.random() * 6.0,
      isDestroyed: false
    };

    this.policeUnits.push(unit);
  }

  dropRoadblock(x, z, rotation) {
    const mesh = this.assetFactory.createRoadblock();
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rotation;
    this.policeGroup.add(mesh);

    const roadblock = {
      mesh,
      position: new THREE.Vector3(x, 0, z),
      radius: 2.6,
      hp: 600,
      lastRamAt: 0,
      isDestroyed: false
    };

    this.roadblocks.push(roadblock);
    this.sound.playPlace();
  }

  update(delta, elapsed, player) {
    if (!player) return;
    this._updateRespawns(delta);

    let closestDist = Infinity;

    for (let i = this.policeUnits.length - 1; i >= 0; i--) {
      const unit = this.policeUnits[i];
      if (unit.isDestroyed) continue;

      const distToPlayer = unit.position.distanceTo(player.position);
      if (distToPlayer < closestDist) {
        closestDist = distToPlayer;
      }

      // 1. Siren Strobe Lighting
      if (unit.mesh.userData.redLight && unit.mesh.userData.blueLight) {
        const strobe = Math.sin(elapsed * 16 + i) > 0;
        unit.mesh.userData.redLight.material.emissiveIntensity = strobe ? 2.5 : 0.2;
        unit.mesh.userData.blueLight.material.emissiveIntensity = strobe ? 0.2 : 2.5;
      }

      // 2. AI Steering & Pursuit
      if (player.isInvisible) {
        // Lost sight: wander or slow down
        unit.speed = Math.max(5.0, unit.speed - unit.acceleration * delta);
        unit.heading += Math.sin(elapsed * 2 + i) * delta * 0.8;
      } else if (unit.breakoutTimer > 0) {
        // Un-sticking manoeuvre: hold the new heading and floor it for a moment.
        unit.breakoutTimer -= delta;
        unit.speed = Math.min(unit.maxSpeed, unit.speed + unit.acceleration * 2 * delta);
      } else {
        // Compute separation force from other police cruisers to maintain distance
        let sepX = 0;
        let sepZ = 0;
        const sepRadius = 7.2; // Desired distance between police cruisers

        for (let j = 0; j < this.policeUnits.length; j++) {
          if (i === j) continue;
          const other = this.policeUnits[j];
          if (other.isDestroyed) continue;

          const sDx = unit.position.x - other.position.x;
          const sDz = unit.position.z - other.position.z;
          const sDist = Math.hypot(sDx, sDz);

          if (sDist > 0.001 && sDist < sepRadius) {
            const weight = (sepRadius - sDist) / sepRadius;
            sepX += (sDx / sDist) * weight;
            sepZ += (sDz / sDist) * weight;
          }
        }

        // Intercept player with separation repulsion to flank and maintain distance
        const dx = (player.position.x - unit.position.x) + sepX * 14.0;
        const dz = (player.position.z - unit.position.z) + sepZ * 14.0;
        const desiredHeading = Math.atan2(dx, dz);

        // Angle diff wrap (-PI to PI)
        let angleDiff = desiredHeading - unit.heading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        unit.heading += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), unit.turnSpeed * delta);
        unit.speed = Math.min(unit.maxSpeed, unit.speed + unit.acceleration * delta);

        // 3. Tactical Roadblock Drop
        unit.roadblockCooldown -= delta;
        if (unit.roadblockCooldown <= 0 && distToPlayer > 8.0 && distToPlayer < 22.0) {
          // Drop roadblock ahead or right in front of pursuit
          const forward = new THREE.Vector3(Math.sin(unit.heading), 0, Math.cos(unit.heading));
          const dropPos = unit.position.clone().add(forward.multiplyScalar(4.0));
          this.dropRoadblock(dropPos.x, dropPos.z, unit.heading + Math.PI / 2);
          unit.roadblockCooldown = 12.0 + Math.random() * 6.0;
        }

        // 4. Ramming Attack onto Player
        unit.ramCooldown = Math.max(0, (unit.ramCooldown || 0) - delta);
        if (distToPlayer < 3.2 && !player.isAirborne) {
          // Push apart strongly so vehicles bounce rather than sticking
          const push = unit.position.clone().sub(player.position).normalize();
          if (push.length() < 0.1) push.set(1, 0, 0);
          unit.position.add(push.clone().multiplyScalar(3.2));
          unit.speed *= 0.35; // Police car decelerates from bump impact

          if (unit.ramCooldown <= 0) {
            // A cruiser making contact is a BUST: the buggy is destroyed on the spot and the
            // player moves to their next life. bust() honours spawn immunity and invisibility.
            player.bust();
            unit.hp -= 10;            // ramming is their job - it barely scratches them
            unit.ramCooldown = 1.4;
            this.sound.playCrash(0.7);

            if (unit.hp <= 0) {
              this.destroyUnit(unit);
              continue;
            }
          }
        }
      }

      // 4b. Stuck detector: a cruiser that has barely moved in 1.5s while not in contact with
      // the player is wedged (barrier, wall, pile-up). Kick it out sideways at speed.
      unit.stuckClock = (unit.stuckClock || 0) + delta;
      if (unit.stuckClock >= 1.5) {
        unit.stuckClock = 0;
        if (unit.lastCheckPos) {
          const moved = unit.position.distanceTo(unit.lastCheckPos);
          if (moved < 2.0 && distToPlayer > 4.5 && !(unit.breakoutTimer > 0)) {
            unit.heading += (Math.random() < 0.5 ? 1 : -1) * (Math.PI * 0.5 + Math.random() * 0.6);
            unit.speed = Math.max(unit.speed, unit.maxSpeed * 0.8);
            unit.breakoutTimer = 1.2;
          }
        }
        unit.lastCheckPos = unit.position.clone();
      }

      // 5. Update Position
      unit.position.x += Math.sin(unit.heading) * unit.speed * delta;
      unit.position.z += Math.cos(unit.heading) * unit.speed * delta;
      unit.mesh.position.set(unit.position.x, 0, unit.position.z);
      unit.mesh.rotation.y = unit.heading;

      // Wheel rotation
      if (unit.mesh.userData.wheels) {
        const rot = (unit.speed / 0.38) * delta;
        unit.mesh.userData.wheels.forEach(w => {
          w.rotation.x += rot;
        });
      }
    }

    // 6. Check Police vs Police Collisions!
    // If two police vehicles collide into each other, they crash and disappear!
    const collidedPairs = [];
    for (let i = 0; i < this.policeUnits.length; i++) {
      const uA = this.policeUnits[i];
      if (uA.isDestroyed) continue;

      for (let j = i + 1; j < this.policeUnits.length; j++) {
        const uB = this.policeUnits[j];
        if (uB.isDestroyed) continue;

        const copDist = uA.position.distanceTo(uB.position);
        if (copDist >= 2.8) continue;

        // Only a genuine FACE-TO-FACE smash wrecks them. Previously any contact at any speed
        // and any angle destroyed both units, so cruisers deleted themselves by brushing while
        // merging or stacking up in a queue behind the player.
        const fwdA = { x: Math.sin(uA.heading), z: Math.cos(uA.heading) };
        const fwdB = { x: Math.sin(uB.heading), z: Math.cos(uB.heading) };

        // Nose-to-nose: the two cars point in opposing directions...
        const facingDot = fwdA.x * fwdB.x + fwdA.z * fwdB.z;
        if (facingDot > -0.6) continue;

        // ...and A is actually driving INTO B rather than away from it.
        const toB = { x: uB.position.x - uA.position.x, z: uB.position.z - uA.position.z };
        const toBLen = Math.hypot(toB.x, toB.z) || 1;
        const closingDot = (fwdA.x * toB.x + fwdA.z * toB.z) / toBLen;
        if (closingDot < 0.5) continue;

        // A glancing touch at parking speed should not vaporise two cruisers.
        if (uA.speed + uB.speed < 10.0) continue;

        collidedPairs.push([uA, uB]);
      }
    }

    if (collidedPairs.length > 0) {
      this.sound.playCrash(1.8);
      for (const [uA, uB] of collidedPairs) {
        if (!uA.isDestroyed || !uB.isDestroyed) {
          const midX = (uA.position.x + uB.position.x) / 2;
          const midZ = (uA.position.z + uB.position.z) / 2;
          if (this.destruction) {
            this.destruction.spawnExplosion(midX, 1.2, midZ, 'large');
          }
          this.sound.playExplosion('large');

          if (!uA.isDestroyed) this.destroyUnit(uA);
          if (!uB.isDestroyed) this.destroyUnit(uB);
        }
      }
    }

    // Audio Siren updates (based on proximity)
    const activePolice = this.policeUnits.filter(u => !u.isDestroyed).length;
    if (activePolice > 0 && !player.isInvisible) {
      const proximity = Math.max(0.1, Math.min(1.0, 1.0 - closestDist / 90.0));
      this.sound.setSirenActive(true, proximity);
    } else {
      this.sound.setSirenActive(false);
    }
  }

  destroyUnit(unit) {
    if (unit.isDestroyed) return;
    unit.isDestroyed = true;
    this.totalWrecked++;
    this.policeGroup.remove(unit.mesh);

    if (this.destruction) {
      this.destruction.spawnExplosion(unit.position.x, 1.0, unit.position.z, 'medium');
    }
    this.sound.playExplosion('medium');

    const idx = this.policeUnits.indexOf(unit);
    if (idx !== -1) {
      this.policeUnits.splice(idx, 1);
    }

    // Queue a replacement; whether it actually arrives depends on a station surviving.
    this.respawnQueue.push({ t: this.respawnDelay });
  }

  /** Tick reinforcement timers; spawn from a random surviving station. */
  _updateRespawns(delta) {
    if (this.respawnQueue.length === 0) return;
    const live = this.stations.filter(st => st && st.mesh && !st.isDestroyed);
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const q = this.respawnQueue[i];
      q.t -= delta;
      if (q.t > 0) continue;
      this.respawnQueue.splice(i, 1);
      if (live.length === 0) continue;                 // no station left to send backup
      if (this.policeUnits.length >= this.maxPolice) continue;
      const st = live[Math.floor(Math.random() * live.length)];
      const pos = st.mesh.position;
      this.spawnCruiser(pos.x + (Math.random() - 0.5) * 4, pos.z + (Math.random() - 0.5) * 4);
      this.sound.playPlace();
    }
  }

  damageAt(x, z, radius, damage) {
    const center = new THREE.Vector2(x, z);

    // Damage Police
    for (let i = this.policeUnits.length - 1; i >= 0; i--) {
      const unit = this.policeUnits[i];
      if (unit.isDestroyed) continue;
      const uPos = new THREE.Vector2(unit.position.x, unit.position.z);
      if (center.distanceTo(uPos) <= radius) {
        unit.hp -= damage;
        if (unit.hp <= 0) {
          this.destroyUnit(unit);
        }
      }
    }

    // Damage Roadblocks
    for (let i = this.roadblocks.length - 1; i >= 0; i--) {
      const rb = this.roadblocks[i];
      if (rb.isDestroyed) continue;
      const rPos = new THREE.Vector2(rb.position.x, rb.position.z);
      if (center.distanceTo(rPos) <= radius) {
        rb.hp -= damage;
        if (rb.hp <= 0) {
          rb.isDestroyed = true;
          this.policeGroup.remove(rb.mesh);
          if (this.destruction) {
            this.destruction.spawnExplosion(rb.position.x, 0.5, rb.position.z, 'small');
          }
          this.roadblocks.splice(i, 1);
        }
      }
    }
  }

  checkRoadblockCollisions(player) {
    if (player.isAirborne) return; // jumped cleanly over!

    for (let i = this.roadblocks.length - 1; i >= 0; i--) {
      const rb = this.roadblocks[i];
      if (rb.isDestroyed) continue;

      const dx = player.position.x - rb.position.x;
      const dz = player.position.z - rb.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < rb.radius) {
        // Solid: shove the buggy back out so the barrier actually holds the line.
        const nx = dist > 0.001 ? dx / dist : 0;
        const nz = dist > 0.001 ? dz / dist : 1;
        player.position.x += nx * (rb.radius - dist);
        player.position.z += nz * (rb.radius - dist);

        const speed = Math.abs(player.speed);
        if (speed <= 5.0) continue;   // resting against it costs nothing

        // Damage lands once per contact window, not every frame (the old -100/frame erased a
        // 180 hp block on the second frame of contact, so it never blocked anything).
        const now = performance.now();
        if (now - rb.lastRamAt > 450) {
          rb.lastRamAt = now;
          rb.hp -= Math.round(speed * 4);
          player.takeDamage(15);
          this.sound.playCrash(Math.min(0.7, speed / 28.0));
        }
        player.speed *= 0.35; // bounce off and charge again

        if (rb.hp <= 0) {
          rb.isDestroyed = true;
          this.policeGroup.remove(rb.mesh);
          if (this.destruction) {
            this.destruction.spawnExplosion(rb.position.x, 0.5, rb.position.z, 'small');
          }
          this.roadblocks.splice(i, 1);
        }
      }
    }
  }

  clear() {
    this.policeUnits.forEach(u => {
      this.policeGroup.remove(u.mesh);
    });
    this.policeUnits = [];

    this.roadblocks.forEach(r => {
      this.policeGroup.remove(r.mesh);
    });
    this.roadblocks = [];
    this.respawnQueue = [];
    this.totalWrecked = 0;
    this.sound.setSirenActive(false);
  }
}
