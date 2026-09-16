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
  }

  registerGates(gates) {
    this.turrets = [];
    gates.forEach(gate => {
      if (gate.mesh) {
        this.turrets.push({
          parent: gate,
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
          this.fireBullet(turret.pos, player.position, turret.damage);
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

  fireBullet(fromPos, targetPos, damage) {
    const mesh = new THREE.Mesh(this.bulletGeo, this.bulletMat);
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
