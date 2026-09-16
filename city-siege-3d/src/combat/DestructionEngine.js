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

    this.totalBuildingsCount = 0;
    this.destroyedBuildingsCount = 0;
    this.lootedResources = { cash: 0, iron: 0, wood: 0 };
    this.onDestructionUpdate = null;
  }

  reset(buildings) {
    this.clearEffects();
    this.totalBuildingsCount = buildings.filter(b => !b.isMainGate).length;
    this.destroyedBuildingsCount = 0;
    this.lootedResources = { cash: 0, iron: 0, wood: 0 };

    buildings.forEach(b => {
      b.isDestroyed = false;
      b.hp = b.maxHp;
      if (b.mesh) b.mesh.visible = true;
    });

    if (this.onDestructionUpdate) {
      this.onDestructionUpdate(this.getStats());
    }
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
    const radius = size === 'huge' ? 6.0 : size === 'large' ? 4.0 : 2.5;
    const count = size === 'huge' ? 24 : 14;

    // Fireball Sphere Mesh
    const fireGeo = new THREE.SphereGeometry(radius * 0.5, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.95
    });
    const fireball = new THREE.Mesh(fireGeo, fireMat);
    fireball.position.set(x, y, z);
    this.particleGroup.add(fireball);

    this.particles.push({
      mesh: fireball,
      life: 0.6,
      maxLife: 0.6,
      update: (delta, p) => {
        const progress = 1.0 - p.life / p.maxLife;
        fireball.scale.setScalar(1.0 + progress * 2.5);
        fireMat.opacity = Math.max(0, 1.0 - progress);
        if (progress > 0.4) fireMat.color.setHex(0x333333); // smoke transition
      }
    });

    // Flying Debris Chunks
    const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const debrisMats = [
      this.assetFactory.materials.concrete,
      this.assetFactory.materials.brickRed,
      this.assetFactory.materials.woodDark,
      this.assetFactory.materials.steel
    ];

    for (let i = 0; i < count; i++) {
      const mat = debrisMats[Math.floor(Math.random() * debrisMats.length)];
      const chunk = new THREE.Mesh(boxGeo, mat);
      chunk.position.set(x, y, z);
      chunk.castShadow = true;
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
    if (building.mesh) building.mesh.visible = false;

    if (!building.isMainGate) {
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
      if (b.isDestroyed || !b.mesh) continue;

      const bPos = b.mesh.position;
      const dx = carPos.x - bPos.x;
      const dz = carPos.z - bPos.z;
      const dist = Math.hypot(dx, dz);
      const hitRadius = b.isMainGate ? 4.8 : 3.2;

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
