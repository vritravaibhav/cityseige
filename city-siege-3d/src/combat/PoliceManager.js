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
  }

  spawnFromStations(policeStations) {
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
      hp: 120,
      maxHp: 120,
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
      radius: 2.0,
      hp: 180,
      isDestroyed: false
    };

    this.roadblocks.push(roadblock);
    this.sound.playPlace();
  }

  update(delta, elapsed, player) {
    if (!player) return;

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
            // Apply single hit damage with generous cooldown (18-24 damage, NOT instant death!)
            const ramDamage = Math.round(18 + Math.random() * 6);
            player.takeDamage(ramDamage);
            unit.hp -= 35;
            unit.ramCooldown = 1.8; // Police cannot hit again for 1.8 seconds!
            this.sound.playCrash(0.7);

            if (unit.hp <= 0) {
              this.destroyUnit(unit);
              continue;
            }
          }
        }
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
        if (copDist < 2.8) {
          collidedPairs.push([uA, uB]);
        }
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

      const dist = player.position.distanceTo(rb.position);
      if (dist < 2.5) {
        // High impact hit with roadblock!
        player.takeDamage(40);
        player.speed *= 0.3; // abrupt slowdown!

        rb.hp -= 100;
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
    this.totalWrecked = 0;
    this.sound.setSirenActive(false);
  }
}
