import * as THREE from 'three';

/**
 * TurretSystem - Defensive gate cannons and towers that target
 * and fire projectile tracer bursts at the player vehicle.
 */
export class TurretSystem {
  constructor(scene, soundManager) {
    this.scene = scene;
    this.sound = soundManager;

    this.projectiles = [];
    this.turrets = [];
    this.projectileGroup = new THREE.Group();
    this.projectileGroup.name = 'turret_projectiles';
    this.scene.add(this.projectileGroup);

    this.bulletGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    this.bulletGeo.rotateX(Math.PI / 2);
    this.bulletMat = new THREE.MeshBasicMaterial({ color: 0xff3d00 });

    // Distinct tracer colours so the player can read WHICH defense is shooting them
    this.bulletMats = {
      gate: this.bulletMat,
      sniper_tower: new THREE.MeshBasicMaterial({ color: 0xffeb3b }),
      tesla_coil: new THREE.MeshBasicMaterial({ color: 0x00e5ff }),
      laser_obelisk: new THREE.MeshBasicMaterial({ color: 0xff1744 })
    };
  }

  /**
   * Per-type defensive tower tuning. Each reads distinctly in combat:
   * the sniper out-ranges you, the tesla coil shreds you up close, the obelisk splits the difference.
   */
  static get DEFENSE_STATS() {
    return {
      sniper_tower:  { range: 46.0, fireInterval: 2.0, damage: 30, muzzleHeight: 6.2 },
      tesla_coil:    { range: 22.0, fireInterval: 0.9, damage: 16, muzzleHeight: 5.0 },
      laser_obelisk: { range: 38.0, fireInterval: 1.2, damage: 26, muzzleHeight: 7.0 }
    };
  }

  /**
   * Register placed defensive buildings (sniper towers, tesla coils, laser obelisks) as live turrets.
   * Call AFTER registerGates(), which resets the turret list.
   * Stats scale with the building's upgrade level so upgrading a defense is actually felt.
   */
  registerDefenses(buildings) {
    const STATS = TurretSystem.DEFENSE_STATS;
    (buildings || []).forEach(b => {
      const base = STATS[b.type];
      if (!base || !b.mesh || b.isDestroyed) return;

      const lvl = Math.max(1, b.level || 1);
      const muzzleY = (b.mesh.userData && b.mesh.userData.muzzleHeight) || base.muzzleHeight;

      this.turrets.push({
        parent: b,
        type: b.type,
        pos: b.mesh.position.clone().add(new THREE.Vector3(0, muzzleY, 0)),
        range: base.range * (1 + (lvl - 1) * 0.12),
        cooldown: Math.random() * base.fireInterval,
        fireInterval: base.fireInterval * Math.max(0.55, 1 - (lvl - 1) * 0.15),
        damage: Math.round(base.damage * (1 + (lvl - 1) * 0.35))
      });
    });
  }

  registerGates(gates) {
    this.turrets = [];
    gates.forEach(gate => {
      if (gate.mesh) {
        this.turrets.push({
          parent: gate,
          type: 'gate',
          pos: gate.mesh.position.clone().add(new THREE.Vector3(0, 5.4, 0)),
          range: 35.0,
          cooldown: 0,
          fireInterval: 1.4,
          damage: 22
        });
      }
    });
  }

  update(delta, player) {
    if (!player || player.isCrashed) return;

    // 1. Turret targeting & firing
    this.turrets.forEach(turret => {
      if (turret.parent.isDestroyed) return;

      turret.cooldown -= delta;

      if (!player.isInvisible) {
        const dist = turret.pos.distanceTo(player.position);
        if (dist <= turret.range && turret.cooldown <= 0) {
          this.fireBullet(turret.pos, player.position, turret.damage, turret.type);
          turret.cooldown = turret.fireInterval + Math.random() * 0.4;
        }
      }
    });

    // 2. Update projectile motion & collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Check hit with player
      const distToPlayer = p.mesh.position.distanceTo(player.position.clone().add(new THREE.Vector3(0, 0.8, 0)));
      if (distToPlayer < 2.0 && !player.isAirborne) {
        player.takeDamage(p.damage);
        this.removeProjectile(i);
        continue;
      }

      if (p.life <= 0 || p.mesh.position.y <= 0) {
        this.removeProjectile(i);
      }
    }
  }

  fireBullet(fromPos, targetPos, damage, type = 'gate') {
    const mesh = new THREE.Mesh(this.bulletGeo, this.bulletMats[type] || this.bulletMat);
    mesh.position.copy(fromPos);

    // Aim towards target with slight lead
    const aimTarget = targetPos.clone().add(new THREE.Vector3(0, 0.6, 0));
    mesh.lookAt(aimTarget);

    const dir = aimTarget.clone().sub(fromPos).normalize();
    const speed = 42.0;

    this.projectileGroup.add(mesh);
    this.projectiles.push({
      mesh,
      velocity: dir.multiplyScalar(speed),
      damage,
      life: 2.0
    });

    this.sound.playTurretFire();
  }

  removeProjectile(index) {
    const p = this.projectiles[index];
    if (p) {
      this.projectileGroup.remove(p.mesh);
      this.projectiles.splice(index, 1);
    }
  }

  clear() {
    this.projectiles.forEach(p => this.projectileGroup.remove(p.mesh));
    this.projectiles = [];
    this.turrets = [];
  }
}
