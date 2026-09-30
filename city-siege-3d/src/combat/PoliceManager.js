import * as THREE from 'three';
import { PURSUIT_UNITS, policeCapFor, pursuitUnitFor, spawnerUnitsFor } from '../data/progression.js';

/**
 * PoliceManager - Spawns pursuit cruisers from police stations,
 * controls intercept AI, siren strobes, ramming, and roadblock drops.
 *
 * Pursuit units come from progression.pursuitUnitFor(): a spawner building's catalog entry
 * names the PURSUIT_UNITS archetype it sends (police_station -> cruiser, swat_armory -> swat,
 * drone_hangar -> drone) and adds per-level HP and speed (and a drone's strafe damage) on top.
 *
 * Contact rules:
 *   cruiser / swat - contact is a BUST (the buggy is destroyed and a life is spent).
 *   drone          - flies, so it cannot ram; it strafes for `strafeDamage` instead, and
 *                    it keeps hitting an AIRBORNE buggy, which nothing else can.
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

  /**
   * Deploy the city's pursuit force at raid start. `spawners` is every standing building
   * whose role is 'spawner'; `townHallLevel` sets the city-wide unit cap.
   */
  spawnFromStations(spawners, townHallLevel = 1) {
    this.stations = spawners || [];
    this.maxPolice = policeCapFor(townHallLevel);
    if (!spawners || spawners.length === 0) return;
    this._deployOrder(spawners).forEach(station => this._spawnFrom(station));
  }

  /**
   * One entry per unit the spawners would send, ordered so the city-wide cap is shared
   * fairly: spawner TYPES take turns (cruiser, SWAT, drone, cruiser, ...), and within a
   * type every station sends its first unit before any sends its second. The ladder sizes
   * policeCap to cover every allowed spawner, so this only matters for an over-built city -
   * but there, filling the cap in build order starved whichever type was built last.
   */
  _deployOrder(spawners) {
    const byType = new Map();
    spawners.forEach(station => {
      const per = spawnerUnitsFor(station.type) || 1;
      if (!byType.has(station.type)) byType.set(station.type, []);
      byType.get(station.type).push({ station, per });
    });
    const queues = [...byType.values()].map(list => {
      const q = [];
      const most = Math.max(...list.map(e => e.per));
      for (let k = 0; k < most; k++) list.forEach(e => { if (k < e.per) q.push(e.station); });
      return q;
    });
    const order = [];
    for (let i = 0; queues.some(q => i < q.length); i++) {
      queues.forEach(q => { if (i < q.length) order.push(q[i]); });
    }
    return order;
  }

  /** Spawn one unit of whatever `station` produces, scaled by the station's level. */
  _spawnFrom(station) {
    const spec = pursuitUnitFor(station.type, station.level || 1) || pursuitUnitFor('police_station', 1);
    const pos = station.mesh.position;
    return this.spawnUnit(
      pos.x + (Math.random() - 0.5) * 4,
      pos.z + (Math.random() - 0.5) * 4,
      spec,
      station
    );
  }

  /** Put one unit on the map; `K` is a pursuitUnitFor() spec. Null once the cap is reached. */
  spawnUnit(x, z, K, station = null) {
    if (this.policeUnits.length >= this.maxPolice) return null;
    const kind = K.kind;

    const mesh = K.flying ? this._createDrone() : this.assetFactory.createPoliceVehicle();
    mesh.scale.setScalar(K.scale);
    mesh.position.set(x, K.flying ? K.altitude : 0, z);
    this.policeGroup.add(mesh);

    const hp = K.hp;
    const unit = {
      id: `cop_${Date.now()}_${Math.random()}`,
      kind,
      flying: !!K.flying,
      station,
      mesh,
      position: new THREE.Vector3(x, 0, z),
      heading: Math.random() * Math.PI * 2,
      speed: 0,
      maxSpeed: K.speedMin + Math.random() * (K.speedMax - K.speedMin),
      acceleration: K.accel,
      turnSpeed: K.turn,
      hp,
      maxHp: hp,
      strafeDamage: K.strafeDamage || 0,   // drones only: per strafe, at the hangar's level
      ramCooldown: 0, // Prevents multi-frame damage melting
      roadblockCooldown: K.flying ? Infinity : 4.0 + Math.random() * 6.0,
      isDestroyed: false
    };

    this.policeUnits.push(unit);
    return unit;
  }

  /** Small quadcopter built from the shared palette (no new materials). */
  _createDrone() {
    const M = this.assetFactory.materials;
    const g = new THREE.Group();
    g.name = 'pursuit_drone';
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.4), M.ironDark);
    body.castShadow = true;
    g.add(body);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), M.neonRed);
    eye.position.set(0, -0.18, 0.62);
    g.add(eye);
    const rotors = [];
    for (const [ax, az] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.3), M.steel);
      arm.position.set(ax * 0.55, 0.1, az * 0.55);
      arm.rotation.y = Math.atan2(ax, az);
      g.add(arm);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 12), M.policeBlack);
      rotor.position.set(ax * 1.0, 0.24, az * 1.0);
      g.add(rotor);
      rotors.push(rotor);
    }
    g.userData.rotors = rotors;
    return g;
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

  /** Take `damage` off a police roadblock (Drop Bomb, Twin Missiles); it breaks at 0 HP. */
  damageRoadblock(rb, damage) {
    if (!rb || rb.isDestroyed) return;
    rb.hp -= damage;
    if (rb.hp <= 0) this.breakRoadblock(rb);
  }

  /**
   * The one way a police roadblock leaves the map mid-raid: out of HP from a bomb, a missile or
   * a ram. Safe inside a backwards loop over `roadblocks` (it splices only this block).
   */
  breakRoadblock(rb) {
    if (!rb || rb.isDestroyed) return;
    rb.isDestroyed = true;
    this._discard(rb.mesh);
    if (this.destruction) {
      this.destruction.spawnExplosion(rb.position.x, 0.5, rb.position.z, 'small');
    }
    const idx = this.roadblocks.indexOf(rb);
    if (idx !== -1) this.roadblocks.splice(idx, 1);
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
        if (unit.flying) {
          // Drones strafe from above. Horizontal distance only - and being airborne does
          // not save the raider, which is the whole reason to build a Drone Hangar. A strafe
          // is gunfire, not contact: it lands whatever else hit the buggy a moment ago. Its
          // damage is the hangar's level (pursuitUnitFor), carried on the unit.
          const K = PURSUIT_UNITS.drone;
          const strafe = unit.strafeDamage || K.strafeDamage;
          const hDist = Math.hypot(player.position.x - unit.position.x, player.position.z - unit.position.z);
          if (hDist < K.strafeRange && unit.ramCooldown <= 0 && !player.isInvisible) {
            player.takeDamageUnconditional
              ? player.takeDamageUnconditional(strafe)
              : player.takeDamage(strafe);
            unit.ramCooldown = K.strafeInterval;
            this.sound.playTurretFire && this.sound.playTurretFire();
          }
        } else if (distToPlayer < 3.2 && !player.isAirborne) {
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
      const alt = unit.flying ? PURSUIT_UNITS.drone.altitude + Math.sin(elapsed * 2.2 + i) * 0.35 : 0;
      unit.mesh.position.set(unit.position.x, alt, unit.position.z);
      unit.mesh.rotation.y = unit.heading;
      if (unit.mesh.userData.rotors) {
        unit.mesh.userData.rotors.forEach(r => { r.rotation.y += delta * 40; });
      }

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
        if (this.policeUnits[i] && this.policeUnits[i].flying) break;
        if (this.policeUnits[j] && this.policeUnits[j].flying) continue;
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
    this._discard(unit.mesh);

    if (this.destruction) {
      this.destruction.spawnExplosion(unit.position.x, 1.0, unit.position.z, 'medium');
    }
    this.sound.playExplosion('medium');

    const idx = this.policeUnits.indexOf(unit);
    if (idx !== -1) {
      this.policeUnits.splice(idx, 1);
    }

    // Queue a replacement; whether it actually arrives depends on a station surviving.
    this.respawnQueue.push({ t: this.respawnDelay, type: unit.station ? unit.station.type : null });
  }

  /**
   * Tick reinforcement timers. A wrecked unit is replaced by the same kind from a surviving
   * spawner of the same type (a lost drone comes back as a drone); if every one of those is
   * razed, any surviving spawner sends backup instead.
   */
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
      const same = live.filter(st => st.type === q.type);
      const pool = same.length ? same : live;
      const st = pool[Math.floor(Math.random() * pool.length)];
      this._spawnFrom(st);
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
      if (center.distanceTo(rPos) <= radius) this.damageRoadblock(rb, damage);
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
          player.takeDamage(15, { contact: true });
          this.sound.playCrash(Math.min(0.7, speed / 28.0));
        }
        player.speed *= 0.35; // bounce off and charge again

        if (rb.hp <= 0) this.breakRoadblock(rb);
      }
    }
  }

  /**
   * Take a unit or police roadblock off the map for good and free its geometry (every one is
   * built fresh; its materials are the shared palette, so they stay). Removing them alone
   * leaked some 30 geometries a raid.
   */
  _discard(mesh) {
    this.policeGroup.remove(mesh);
    mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  clear() {
    this.policeUnits.forEach(u => {
      if (!u.isDestroyed) this._discard(u.mesh);
    });
    this.policeUnits = [];

    this.roadblocks.forEach(r => {
      if (!r.isDestroyed) this._discard(r.mesh);
    });
    this.roadblocks = [];
    this.respawnQueue = [];
    // The spawners belong to the city just raided - after a battle raid, the arena's buildings.
    // Kept, they held the torn-down arena alive until the next raid re-assigned the list.
    // (Every raid start and respawn calls spawnFromStations right after clear().)
    this.stations = [];
    this.totalWrecked = 0;
    this.sound.setSirenActive(false);
  }
}
