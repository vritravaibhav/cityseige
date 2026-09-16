import * as THREE from 'three';

/**
 * DestructionEngine - Handles collision damage, particle explosions,
 * debris physics, building demolition, and petrol pump chain reactions.
 */
export class DestructionEngine {
  constructor(scene, soundManager, assetFactory) {
    this.scene = scene;
    this.sound = soundManager;
    this.assetFactory = assetFactory;

    this.particles = [];
    this.debris = [];
    this.particleGroup = new THREE.Group();
    this.particleGroup.name = 'destruction_effects';
    this.scene.add(this.particleGroup);

    // Shared geometries. These used to be allocated per explosion and never disposed;
    // with twin cannons at a 0.14s interval that is ~14 fireballs + ~200 debris boxes a second.
    this._fireGeo = new THREE.SphereGeometry(0.5, 12, 12);
    this._debrisGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    this.totalBuildingsCount = 0;
    this.destroyedBuildingsCount = 0;
    this.lootedResources = { cash: 0, iron: 0, wood: 0 };
    this.onDestructionUpdate = null;
    this.onBuildingDamaged = null;
  }

  reset(buildings) {
    this.clearEffects();
    // Gates are the way in and trees are scenery - neither counts toward 100% destruction.
    this.totalBuildingsCount = buildings.filter(b => !b.isMainGate && b.type !== 'tree').length;
    this.destroyedBuildingsCount = 0;
    this.lootedResources = { cash: 0, iron: 0, wood: 0 };

    this.clearRubble(buildings);
    buildings.forEach(b => {
      b.isDestroyed = false;
      b.hp = b.maxHp;
      b.lastRamAt = 0;
      if (b.mesh) b.mesh.visible = true;
    });

    if (this.onDestructionUpdate) {
      this.onDestructionUpdate(this.getStats());
    }
  }

  /** Remove every rubble pile (raid over, or a fresh raid starting). */
  clearRubble(buildings) {
    (buildings || []).forEach(b => {
      if (b.rubbleMesh) {
        if (b.rubbleMesh.parent) b.rubbleMesh.parent.remove(b.rubbleMesh);
        b.rubbleMesh = null;
      }
    });
  }

  getStats() {
    const pct = this.totalBuildingsCount > 0
      ? Math.min(100, Math.round((this.destroyedBuildingsCount / this.totalBuildingsCount) * 100))
      : 0;

    let stars = 0;
    if (pct >= 25) stars = 1;
    if (pct >= 60) stars = 2;
    if (pct >= 95) stars = 3;

    return {
      percentage: pct,
      stars,
      destroyed: this.destroyedBuildingsCount,
      total: this.totalBuildingsCount,
      looted: { ...this.lootedResources }
    };
  }

  spawnExplosion(x, y, z, size = 'medium') {
    // 'small' is what every non-lethal cannon hit passes; without its own tier it fell through
    // to the medium branch and threw 14 shadow-casting chunks per glancing shot.
    const radius = size === 'huge' ? 6.0 : size === 'large' ? 4.0 : size === 'small' ? 1.2 : 2.5;
    const count = size === 'huge' ? 24 : size === 'small' ? 3 : 14;

    // Fireball Sphere Mesh (shared unit geometry, scaled per blast)
    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.95
    });
    const fireball = new THREE.Mesh(this._fireGeo, fireMat);
    fireball.scale.setScalar(radius);
    fireball.position.set(x, y, z);
    this.particleGroup.add(fireball);

    this.particles.push({
      mesh: fireball,
      life: 0.6,
      maxLife: 0.6,
      update: (delta, p) => {
        const progress = 1.0 - p.life / p.maxLife;
        fireball.scale.setScalar(radius * (1.0 + progress * 2.5));
        fireMat.opacity = Math.max(0, 1.0 - progress);
        if (progress > 0.4) fireMat.color.setHex(0x333333); // smoke transition
      }
    });

    // Flying Debris Chunks (shared geometry, shared materials from the asset factory)
    const debrisMats = [
      this.assetFactory.materials.concrete,
      this.assetFactory.materials.brickRed,
      this.assetFactory.materials.woodDark,
      this.assetFactory.materials.steel
    ];

    for (let i = 0; i < count; i++) {
      const mat = debrisMats[Math.floor(Math.random() * debrisMats.length)];
      const chunk = new THREE.Mesh(this._debrisGeo, mat);
      chunk.position.set(x, y, z);
      chunk.castShadow = (size !== 'small');
      this.particleGroup.add(chunk);

      const angle = Math.random() * Math.PI * 2;
      const speed = 8.0 + Math.random() * (size === 'huge' ? 20.0 : 12.0);
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        5.0 + Math.random() * 14.0,
        Math.sin(angle) * speed
      );

      this.debris.push({
        mesh: chunk,
        velocity: vel,
        rotSpeed: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
        life: 2.2
      });
    }
  }

  damageBuilding(building, damage, buildingsList, policeManager) {
    if (building.isDestroyed) return;

    building.hp -= damage;

    // Surface the target's remaining health to the HUD (clamped - hp goes negative on a kill).
    if (this.onBuildingDamaged) {
      this.onBuildingDamaged(building, Math.max(0, building.hp));
    }

    if (building.hp <= 0) {
      this.destroyBuilding(building, buildingsList, policeManager);
    } else {
      this.spawnExplosion(building.mesh.position.x, 1.5, building.mesh.position.z, 'small');
      this.sound.playCrash(0.7);
    }
  }

  destroyBuilding(building, buildingsList, policeManager) {
    if (building.isDestroyed) return;
    building.isDestroyed = true;
    building.hp = 0;
    if (building.mesh) {
      building.mesh.visible = false;
      // Leave remains behind: a small rubble pile that still blocks the buggy (see
      // checkVehicleCollisions) without hiding the map. Removed by clearRubble().
      if (!building.isMainGate && this.assetFactory && this.assetFactory.createRubble && !building.rubbleMesh) {
        const fp = (building.footprint || (building.type === 'roadblock' || building.type === 'spike_trap' || building.type === 'tree' ? 1 : 2));
        const rubble = this.assetFactory.createRubble(fp);
        rubble.position.copy(building.mesh.position);
        rubble.rotation.y = building.mesh.rotation.y;
        (building.mesh.parent || this.scene).add(rubble);
        building.rubbleMesh = rubble;
      }
    }

    if (!building.isMainGate && building.type !== 'tree') {
      this.destroyedBuildingsCount++;
    }

    const pos = building.mesh.position;
    const isPetrol = building.isExplosive;

    // Award Loot
    const lvl = building.level || 1;
    const loot = {
      cash: Math.round((building.isExplosive ? 250 : 120) * lvl),
      iron: Math.round(80 * lvl),
      wood: Math.round(90 * lvl)
    };
    this.lootedResources.cash += loot.cash;
    this.lootedResources.iron += loot.iron;
    this.lootedResources.wood += loot.wood;
    this.sound.playLoot();

    if (isPetrol) {
      // --- CHAIN REACTION EXPLOSION! ---
      this.spawnExplosion(pos.x, 2.0, pos.z, 'huge');
      this.sound.playExplosion('huge');

      // Blast nearby buildings and police units!
      const blastRadius = 16.0;
      const blastDamage = 350;

      if (policeManager) {
        policeManager.damageAt(pos.x, pos.z, blastRadius, blastDamage);
      }

      if (buildingsList) {
        buildingsList.forEach(other => {
          if (other !== building && !other.isDestroyed && other.mesh) {
            const dist = pos.distanceTo(other.mesh.position);
            if (dist <= blastRadius) {
              this.damageBuilding(other, blastDamage, buildingsList, policeManager);
            }
          }
        });
      }
    } else {
      this.spawnExplosion(pos.x, 2.0, pos.z, 'large');
      this.sound.playExplosion('large');
    }

    if (this.onDestructionUpdate) {
      this.onDestructionUpdate(this.getStats());
    }
  }

  checkVehicleCollisions(player, buildings, policeManager) {
    if (player.isCrashed) return;

    const carPos = player.position;
    const speed = Math.abs(player.speed);

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (!b.mesh) continue;

      // Rubble from a razed structure: a small, low barrier. Slows and nudges, never pins.
      if (b.isDestroyed) {
        if (!b.rubbleMesh || player.isAirborne) continue;
        const rp = b.rubbleMesh.position;
        const rdx = carPos.x - rp.x;
        const rdz = carPos.z - rp.z;
        const rd = Math.hypot(rdx, rdz);
        const RUBBLE_RADIUS = 1.5;
        if (rd < RUBBLE_RADIUS) {
          const nx = rd > 0.001 ? rdx / rd : 0;
          const nz = rd > 0.001 ? rdz / rd : 1;
          player.position.x += nx * (RUBBLE_RADIUS - rd);
          player.position.z += nz * (RUBBLE_RADIUS - rd);
          if (speed > 6.0) {
            player.speed *= 0.7;
            player.camShake = Math.min(1.0, player.camShake + 0.12);
          }
        }
        continue;
      }

      const bPos = b.mesh.position;

      // Main gates are an ARCHWAY, not a solid block: two pillars at local x = +/-3.2 with a
      // driveable gap between them. A single 4.8m circle centred on the gate origin covered its
      // own doorway, which sealed the city - the whole point of the breach is to drive through.
      // Collide against each pillar separately so the opening stays open.
      let dx, dz, dist, hitRadius;
      if (b.isMainGate) {
        const r = b.mesh.rotation.y || 0;
        const cos = Math.cos(r);
        const sin = Math.sin(r);
        const PILLAR_OFFSET = 3.2;
        const PILLAR_RADIUS = 1.6;

        let best = Infinity;
        let bx = 0;
        let bz = 1;
        for (const side of [-1, 1]) {
          // Local (side*3.2, 0, 0) -> world, for a Y-rotation of r
          const px = bPos.x + side * PILLAR_OFFSET * cos;
          const pz = bPos.z - side * PILLAR_OFFSET * sin;
          const pdx = carPos.x - px;
          const pdz = carPos.z - pz;
          const pd = Math.hypot(pdx, pdz);
          if (pd < best) {
            best = pd;
            bx = pdx;
            bz = pdz;
          }
        }
        dx = bx;
        dz = bz;
        dist = best;
        hitRadius = PILLAR_RADIUS;
      } else {
        dx = carPos.x - bPos.x;
        dz = carPos.z - bPos.z;
        dist = Math.hypot(dx, dz);
        hitRadius = 3.2;
      }

      // Low barricades are meant to be SMASHED THROUGH (they carry their own hp: roadblock 300,
      // spike trap 200). Treating them as solid architecture pinned the buggy against a barrier
      // at 2 MPH indefinitely, with speed *= 0.45 reapplied every frame and no way past it.
      const isRammable = (b.type === 'roadblock' || b.type === 'spike_trap');
      if (isRammable && dist < hitRadius && !player.isAirborne) {
        // A barricade is a WALL: push the buggy back out along the contact normal every frame,
        // exactly like a building. (An earlier version only bled speed and never moved the car,
        // so it drove straight through - "barrier not working".)
        const nx = dist > 0.001 ? (dx / dist) : 0;
        const nz = dist > 0.001 ? (dz / dist) : 1;
        player.position.x += nx * (hitRadius - dist);
        player.position.z += nz * (hitRadius - dist);

        if (speed > 5.0) {
          // Each impact chips the barrier (scaled by speed) once per contact window, then bounces
          // the car off so it has to charge again. Breaking through takes repeated ramming,
          // sustained cannon fire, or a jump over it.
          const now = performance.now();
          if (!b.lastRamAt || now - b.lastRamAt > 450) {
            b.lastRamAt = now;
            this.damageBuilding(b, Math.round(speed * 4), buildings, policeManager);
            this.sound.playCrash(Math.min(0.7, speed / 28.0));
            player.camShake = Math.min(1.0, player.camShake + 0.3);
          }
          player.speed *= 0.35;
        }
        continue;
      }

      if (dist < hitRadius && !player.isAirborne) {
        // SOLID PHYSICAL OBSTACLE - BUILDINGS ARE NOT DESTROYED BY COLLISION!
        // Push the car out along collision normal so it acts as solid architecture
        const overlap = hitRadius - dist;
        const nx = dist > 0.001 ? (dx / dist) : 0;
        const nz = dist > 0.001 ? (dz / dist) : 1;

        player.position.x += nx * overlap;
        player.position.z += nz * overlap;

        // Dampen car speed on bump
        if (speed > 1.5) {
          player.speed *= 0.45;
          this.sound.playCrash(Math.min(0.7, speed / 28.0));
          player.camShake = Math.min(1.0, player.camShake + 0.25);
        }
      }
    }
  }

  update(delta) {
    // 1. Update expanding explosion fireballs
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.update(delta, p);
      if (p.life <= 0) {
        this.particleGroup.remove(p.mesh);
        // The fireball material is the only per-explosion allocation left; release it.
        if (p.mesh.material && p.mesh.material.dispose) p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    // 2. Update debris physics
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= delta;
      d.velocity.y -= 26.0 * delta; // gravity
      d.mesh.position.addScaledVector(d.velocity, delta);

      d.mesh.rotation.x += d.rotSpeed.x * delta;
      d.mesh.rotation.y += d.rotSpeed.y * delta;
      d.mesh.rotation.z += d.rotSpeed.z * delta;

      // Ground bounce
      if (d.mesh.position.y <= 0.2) {
        d.mesh.position.y = 0.2;
        d.velocity.y = -d.velocity.y * 0.4;
        d.velocity.x *= 0.7;
        d.velocity.z *= 0.7;
      }

      if (d.life <= 0) {
        this.particleGroup.remove(d.mesh);
        this.debris.splice(i, 1);
      }
    }
  }

  clearEffects() {
    this.particles.forEach(p => this.particleGroup.remove(p.mesh));
    this.particles = [];
    this.debris.forEach(d => this.particleGroup.remove(d.mesh));
    this.debris = [];
  }
}
