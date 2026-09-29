import * as THREE from 'three';
import {
  BUILDING_DEFS,
  ROLE,
  producePayout,
  blastFor,
  blastDamageAt,
  detonatesInBlast,
  lootFor,
  auraBonusFor,
  auraRadiusFor,
  SHIELD_AURA_CAP
} from '../data/progression.js';
import { isChainBarrier, standingBarrierIndex, barrierLinksOf, closestWallPoint } from '../builder/BarrierWalls.js';

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

  /** Trees: decoration only. They never stop the buggy or soak a round (see flattenScenery). */
  isScenery(b) {
    const def = b && BUILDING_DEFS[b.type];
    return !!(def && def.role === ROLE.SCENERY);
  }

  /**
   * Can a round (autocannon shell, missile) strike `b`? Not if it is razed, hidden, scenery or
   * a drive-over trap. Rounds fly past trees, so a tree sharing a tile with a building cannot
   * soak the fire aimed at that building; and they fly over a trap's pressure plate - the
   * autocannon fires on its own along the buggy's heading, so a shootable trap was shot apart
   * (level 1 in under two seconds) before the raider it lay in wait for ever reached it.
   */
  isShootable(b) {
    if (!b || b.isDestroyed || !b.mesh || !b.mesh.visible) return false;
    const def = BUILDING_DEFS[b.type];
    return !(def && (def.role === ROLE.SCENERY || def.role === ROLE.TRAP));
  }

  /**
   * Knock a tree flat for the rest of the raid (the buggy drove into it, or a bomb or a blast
   * caught it). Scenery is decoration: no fireball, no rubble barrier, no loot, no score.
   * returnToBuilder() stands it back up.
   */
  flattenScenery(b) {
    if (b.isDestroyed) return;
    b.isDestroyed = true;
    b.hp = 0;
    if (b.mesh) b.mesh.visible = false;
    this.sound.playCrash(0.35);
  }

  countsTowardDestruction(b) {
    if (!b || b.isMainGate || b.type === 'tree') return false;
    const def = BUILDING_DEFS[b.type];
    return !(def && def.role === 'trap');
  }

  reset(buildings) {
    this.clearEffects();
    // Gates are the way in, trees are scenery and traps are obstacles - none of them count
    // toward 100% destruction. (A hidden landmine counting would make 100% unreachable.)
    this.totalBuildingsCount = buildings.filter(b => this.countsTowardDestruction(b)).length;
    this.destroyedBuildingsCount = 0;
    this.lootedResources = { cash: 0, iron: 0, wood: 0 };

    this.clearRubble(buildings);
    buildings.forEach(b => {
      b.isDestroyed = false;
      b.hp = b.maxHp;
      b.lastRamAt = 0;
      b.vaultCracked = false;
      if (b.mesh) b.mesh.visible = true;
    });

    if (this.onDestructionUpdate) {
      this.onDestructionUpdate(this.getStats());
    }
  }

  /** Remove every rubble pile and mine crater (raid over, or a fresh raid starting). */
  clearRubble(buildings) {
    (buildings || []).forEach(b => {
      if (b.rubbleMesh) {
        if (b.rubbleMesh.parent) b.rubbleMesh.parent.remove(b.rubbleMesh);
        b.rubbleMesh = null;
      }
      if (b.craterMesh) {
        if (b.craterMesh.parent) b.craterMesh.parent.remove(b.craterMesh);
        b.craterMesh = null;
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

  /**
   * `chained`: the damage is an explosive building's blast, not the raider's own fire, so a
   * building it razes pays only progression.CHAIN_LOOT_SHARE of its loot (see destroyBuilding).
   */
  damageBuilding(building, damage, buildingsList, policeManager, { chained = false } = {}) {
    if (building.isDestroyed || !building.mesh) return;

    // Quantum Citadel: every building inside a standing citadel's field takes less damage.
    const shield = this._shieldFor(building, buildingsList);
    building.hp -= damage * (1 - shield);

    // Surface the target's remaining health to the HUD (clamped - hp goes negative on a kill).
    if (this.onBuildingDamaged) {
      this.onBuildingDamaged(building, Math.max(0, building.hp));
    }

    if (building.hp <= 0) {
      this.destroyBuilding(building, buildingsList, policeManager, { chained });
    } else {
      this.spawnExplosion(building.mesh.position.x, 1.5, building.mesh.position.z, 'small');
      this.sound.playCrash(0.7);
    }
  }

  /**
   * Damage reduction (0..SHIELD_AURA_CAP) from the strongest standing Quantum Citadel
   * covering `building` - citadels do not stack. The citadel does not shield itself, so
   * raiders can always break it.
   */
  _shieldFor(building, buildingsList) {
    if (!buildingsList) return 0;
    let best = 0;
    for (const c of buildingsList) {
      if (c === building || c.isDestroyed || !c.mesh) continue;
      const def = BUILDING_DEFS[c.type];
      if (!def || !def.aura || def.aura.kind !== 'shield') continue;
      const lvl = c.level || 1;
      if (c.mesh.position.distanceTo(building.mesh.position) > auraRadiusFor(c.type, lvl)) continue;
      best = Math.max(best, auraBonusFor(c.type, lvl));
    }
    return Math.min(SHIELD_AURA_CAP, best);
  }

  /**
   * Raze `building`. `chained`: an explosive building's blast razed it or set it off, not the
   * raider's own fire (it then pays only progression.CHAIN_LOOT_SHARE of its loot - see lootFor).
   * `chainHits`: the chain reaction this blast belongs to (building -> hardest blast it has taken).
   */
  destroyBuilding(building, buildingsList, policeManager, { chained = false, chainHits = null } = {}) {
    if (building.isDestroyed) return;
    if (this.isScenery(building)) {
      this.flattenScenery(building);
      return;
    }
    building.isDestroyed = true;
    building.hp = 0;
    if (building.mesh) {
      building.mesh.visible = false;
      // Leave remains behind: a small rubble pile that still blocks the buggy (see
      // checkVehicleCollisions) without hiding the map. Removed by clearRubble(). A drive-over
      // trap was never an obstacle and leaves none: a spent mine's rubble pinned a buggy
      // driving down a row of mines until the next one went off under it.
      const def = BUILDING_DEFS[building.type];
      const isTrap = !!(def && def.role === 'trap');
      const fp = building.footprint || (def && def.footprint) || 2;
      if (!building.isMainGate && !isTrap && this.assetFactory && this.assetFactory.createRubble && !building.rubbleMesh) {
        const rubble = this.assetFactory.createRubble(fp);
        rubble.position.copy(building.mesh.position);
        rubble.rotation.y = building.mesh.rotation.y;
        (building.mesh.parent || this.scene).add(rubble);
        building.rubbleMesh = rubble;
      } else if (isTrap && def.trap && def.trap.oneShot && this.assetFactory && this.assetFactory.createCrater && !building.craterMesh) {
        // A spent mine leaves a crater: a flat scorch mark with no collision (it is never put on
        // rubbleMesh, which checkVehicleCollisions reads). Removed by clearRubble().
        const crater = this.assetFactory.createCrater(fp);
        crater.position.copy(building.mesh.position);
        (building.mesh.parent || this.scene).add(crater);
        building.craterMesh = crater;
      }
    }

    if (this.countsTowardDestruction(building)) {
      this.destroyedBuildingsCount++;
    }

    if (!building.mesh) return;
    const pos = building.mesh.position;

    // Award loot (progression.lootFor). Trees carry none (they are scenery and do not count toward 100%, so
    // paying for them made self-raiding a loot printer). A Crypto Vault adds everything
    // sealed inside it - and only a destroyed vault pays; AttackManager empties it once the
    // raid's loot is banked (BuildingManager.emptyCrackedVaults). Anything an explosive's blast
    // razed or set off pays a share of its loot, so shooting open one pump is not a loot printer.
    const lvl = building.level || 1;
    const loot = lootFor(building.type, lvl, { chained });
    if (building.raidOnly && (building.stored || 0) >= 1 && !building.vaultCracked) {
      const inside = producePayout(building.produceType, building.stored);
      loot.cash += inside.cash;
      loot.iron += inside.iron;
      loot.wood += inside.wood;
      building.vaultCracked = true;
    }
    this.lootedResources.cash += loot.cash;
    this.lootedResources.iron += loot.iron;
    this.lootedResources.wood += loot.wood;
    if (loot.cash + loot.iron + loot.wood > 0) this.sound.playLoot();

    const blast = blastFor(building.type, lvl);
    if (blast) {
      // --- CHAIN REACTION: every explosive type uses its own catalog blast. ---
      const blastRadius = blast.radius;
      const blastDamage = blast.damage;

      this.spawnExplosion(pos.x, 2.0, pos.z, 'huge');
      this.sound.playExplosion('huge');

      if (policeManager) {
        policeManager.damageAt(pos.x, pos.z, blastRadius, blastDamage);
      }

      // The raider is caught in it too - that is the point of an explosive economy.
      if (this.player && !this.player.isCrashed) {
        const pd = Math.hypot(this.player.position.x - pos.x, this.player.position.z - pos.z);
        const hurt = blastDamageAt(blast, pd);
        // Contact: a chain reaction goes off in one frame, and only its first blast lands.
        if (hurt > 0) this.player.takeDamage(hurt, { contact: true });
      }

      if (buildingsList) {
        // One chain reaction is one explosion, for the city as for the raider: a building caught
        // in several of its blasts takes the hardest of them, not their sum. Summed, and at full
        // strength to the rim, the blasts of one reactor shot open razed 40-86% of a full Town
        // Hall 7-12 city.
        const hits = chainHits || new Map();
        buildingsList.forEach(other => {
          // A buried landmine (hidden mesh) is not there as far as a blast is concerned.
          if (other === building || other.isDestroyed || !other.mesh || !other.mesh.visible) return;
          const dist = pos.distanceTo(other.mesh.position);
          if (dist > blastRadius) return;
          // Another explosive in the radius goes off too, at any level and through any Citadel
          // cover (progression.detonatesInBlast). Everything else takes the blast's falloff
          // (progression.blastDamageAt), the same the raider and the Drop Bomb get.
          if (detonatesInBlast(other.type)) {
            this.destroyBuilding(other, buildingsList, policeManager, { chained: true, chainHits: hits });
            return;
          }
          const dmg = blastDamageAt(blast, dist);
          const taken = hits.get(other) || 0;
          if (dmg <= taken) return;
          hits.set(other, dmg);
          this.damageBuilding(other, dmg - taken, buildingsList, policeManager, { chained: true });
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
    // Barriers on neighbouring tiles form one wall (BarrierWalls): each collides as its centre
    // plus the half-sections to its standing neighbours, so a chain has no gaps to slip through.
    const barrierIndex = standingBarrierIndex(buildings);
    // One ram per frame, charged to the barrier the buggy is deepest into, so hitting the
    // joint of two linked blocks is one ram rather than two.
    let ram = null;

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
      } else if (isChainBarrier(b) && Math.abs(carPos.x - bPos.x) < 8 && Math.abs(carPos.z - bPos.z) < 8) {
        // (Only near enough to touch a half-section - 3.9m diagonal + 3.2m reach - is it worth
        // looking up the links.)
        const p = closestWallPoint(b, barrierLinksOf(b, barrierIndex), carPos.x, carPos.z);
        dx = carPos.x - p.x;
        dz = carPos.z - p.z;
        dist = p.dist;
        hitRadius = 3.2;
      } else {
        dx = carPos.x - bPos.x;
        dz = carPos.z - bPos.z;
        dist = Math.hypot(dx, dz);
        hitRadius = 3.2;
      }

      // Low barricades are meant to be SMASHED THROUGH (they carry their own hp: roadblock 300,
      // spike trap 200). Treating them as solid architecture pinned the buggy against a barrier
      // at 2 MPH indefinitely, with speed *= 0.45 reapplied every frame and no way past it.
      const bDef = BUILDING_DEFS[b.type];

      // Drive-over traps are not obstacles - TrapSystem handles them. Treating them as
      // solid architecture would stop the buggy dead before it ever reached the trigger.
      if (bDef && bDef.role === 'trap') continue;

      // Trees are decoration: the buggy mows one down instead of stopping dead against it
      // (a row of them used to be a near-free wall that could not even be rammed).
      if (bDef && bDef.role === ROLE.SCENERY) {
        if (dist < hitRadius && !player.isAirborne) {
          this.flattenScenery(b);
          player.camShake = Math.min(1.0, player.camShake + 0.1);
        }
        continue;
      }

      const isRammable = !!(bDef && bDef.barrier && bDef.barrier.rammable);
      if (isRammable && dist < hitRadius && !player.isAirborne) {
        // A barricade is a WALL: push the buggy back out along the contact normal every frame,
        // exactly like a building. (An earlier version only bled speed and never moved the car,
        // so it drove straight through - "barrier not working".)
        const nx = dist > 0.001 ? (dx / dist) : 0;
        const nz = dist > 0.001 ? (dz / dist) : 1;
        player.position.x += nx * (hitRadius - dist);
        player.position.z += nz * (hitRadius - dist);
        if (!ram || dist < ram.dist) ram = { b, bDef, dist };
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

    if (ram && speed > 5.0) {
      // Each impact chips the barrier (scaled by speed) once per contact window, then bounces
      // the car off so it has to charge again. Breaking through takes repeated ramming,
      // sustained cannon fire, or a jump over it.
      const b = ram.b;
      const bDef = ram.bDef;
      const now = performance.now();
      if (!b.lastRamAt || now - b.lastRamAt > 450) {
        b.lastRamAt = now;
        this.damageBuilding(b, Math.round(speed * 4), buildings, policeManager);
        // Ramming hurts the raider too. Player-built barriers used to cost 0 HP while
        // police-dropped ones cost 15 - the same collision, two different rules.
        const ramHurt = bDef && bDef.barrier ? bDef.barrier.ramDamageToVehicle || 0 : 0;
        if (ramHurt > 0) player.takeDamage(ramHurt, { contact: true });
        this.sound.playCrash(Math.min(0.7, speed / 28.0));
        player.camShake = Math.min(1.0, player.camShake + 0.3);
      }
      player.speed *= 0.35;
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
