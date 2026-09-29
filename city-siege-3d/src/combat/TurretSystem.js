import * as THREE from 'three';
import {
  BUILDING_DEFS,
  GATE_TURRET,
  TURRET_AURA_KINDS,
  turretStatsFor,
  auraRadiusFor,
  turretAuraMultipliers,
  splashDamageAt,
  TURRET_RELOAD_JITTER
} from '../data/progression.js';

/** Muzzle velocity of every unguided, non-beam, non-lobbed round (m/s). Guided rounds carry their own. */
const ROUND_SPEED = 42.0;
/**
 * Guided rounds steer by proportional navigation: they turn this many times as fast as the
 * line of sight to the raider swings, which leads a circling or crossing buggy onto a
 * collision course instead of chasing its tail (see _steer).
 */
const NAV_GAIN = 4;
/** Extra flight time past the gun's range, so a round aimed at the edge still arrives. */
const ROUND_LIFE_MARGIN = 0.6;
/** A round this close to the buggy's centre is a direct hit. */
const DIRECT_HIT_RADIUS = 2.0;
/** Lobbed (arcing) shells: gravity, and flight time = base + per metre of ground distance. */
const SHELL_GRAVITY = 30.0;
const SHELL_FLIGHT_BASE = 1.0;
const SHELL_FLIGHT_PER_M = 1 / 60;

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

    // One tracer material per turret type, coloured from the catalog so the player can
    // read WHICH defense is shooting them. Built from BUILDING_DEFS, so a new turret type
    // needs no edit here.
    this.bulletMats = { gate: this.bulletMat };
    for (const [type, def] of Object.entries(BUILDING_DEFS)) {
      if (!def.turret) continue;
      this.bulletMats[type] = new THREE.MeshBasicMaterial({ color: def.turret.tracer || 0xff3d00 });
    }

    // Beam turrets (turret.beam in the catalog) hit instantly; the visible beam is a unit
    // cylinder stretched from muzzle to target for a moment.
    this.beams = [];
    this.beamGeo = new THREE.CylinderGeometry(0.16, 0.16, 1, 8, 1, true);
    this.beamGeo.rotateX(Math.PI / 2);   // length along +Z, so lookAt() aims it
    // Splash bursts share one unit sphere, scaled to the round's splash radius.
    this.burstGeo = new THREE.SphereGeometry(1, 16, 12);
    this.auraSources = [];
    this._aurasDown = 0;

    // The raider's ground velocity, measured frame to frame: guided rounds lead it.
    this._lastTarget = null;
    this._targetVel = new THREE.Vector3();
    // Scratch for the swept direct-hit test.
    this._step = new THREE.Line3();
    this._closest = new THREE.Vector3();
  }

  /**
   * Live turret stats come from src/data/progression.js (turretStatsFor), so range,
   * fire rate and damage per level are defined in exactly one place. This getter exists
   * only for tooling that wants the level-1 baseline.
   */
  static get DEFENSE_STATS() {
    const out = {};
    for (const [type, def] of Object.entries(BUILDING_DEFS)) {
      if (def.turret) out[type] = { ...def.turret };
    }
    return out;
  }

  /**
   * Register every placed building that shoots. Call AFTER registerGates(), which resets
   * the turret list. Aura buildings (Solar Array, Fusion Reactor, Orbital Relay) then bind
   * to every gun they cover - gate guns included - and refreshAuras() keeps the buff live:
   * it applies only while the aura building stands, so razing a relay mid-raid ends it.
   */
  registerDefenses(buildings) {
    const live = (buildings || []).filter(b => b && b.mesh && !b.isDestroyed);
    this.auraSources = live.filter(b => {
      const def = BUILDING_DEFS[b.type];
      return def && def.aura && TURRET_AURA_KINDS.includes(def.aura.kind);
    });

    live.forEach(b => {
      const def = BUILDING_DEFS[b.type];
      if (!def || !def.turret) return;

      const lvl = Math.max(1, b.level || 1);
      const stats = turretStatsFor(b.type, lvl);
      if (!stats) return;

      const muzzleY = (b.mesh.userData && b.mesh.userData.muzzleHeight) || stats.muzzleHeight;
      const pos = b.mesh.position.clone().add(new THREE.Vector3(0, muzzleY, 0));
      this.turrets.push(this._makeTurret(b, b.type, pos, stats));
    });

    // Positions are fixed for the whole raid, so who covers whom is worked out once.
    this.turrets.forEach(t => this._bindAuras(t));
    this.refreshAuras(true);
  }

  registerGates(gates) {
    this.turrets = [];
    this.auraSources = [];
    gates.forEach(gate => {
      if (!gate.mesh) return;
      const pos = gate.mesh.position.clone().add(new THREE.Vector3(0, GATE_TURRET.muzzleHeight, 0));
      this.turrets.push(this._makeTurret(gate, 'gate', pos, GATE_TURRET));
    });
  }

  /** One gun record. `base` keeps the unbuffed numbers; refreshAuras() derives the live ones. */
  _makeTurret(parent, type, pos, stats) {
    return {
      parent,
      type,
      pos,
      base: { range: stats.range, fireInterval: stats.fireInterval, damage: stats.damage },
      auraSources: [],
      range: stats.range,
      minRange: stats.minRange || 0,
      cooldown: Math.random() * stats.fireInterval,
      fireInterval: stats.fireInterval,
      damage: stats.damage,
      splashRadius: stats.splashRadius || 0,
      homing: stats.homing || null,   // { speed, turnRate } from the catalog
      arcing: !!stats.arcing,
      beam: !!stats.beam,
      pierce: stats.pierce || 0,
      buffed: false
    };
  }

  _bindAuras(turret) {
    const at = turret.parent.mesh.position;
    turret.auraSources = this.auraSources.filter(a => {
      const aura = BUILDING_DEFS[a.type].aura;
      return aura.global || a.mesh.position.distanceTo(at) <= auraRadiusFor(a.type, a.level || 1);
    });
  }

  /**
   * Re-apply the auras from the sources still standing. Cheap enough to call every frame:
   * it only recomputes when an aura building has fallen since the last call (or `force`).
   */
  refreshAuras(force = false) {
    const down = (this.auraSources || []).reduce((n, a) => n + (a.isDestroyed ? 1 : 0), 0);
    if (!force && down === this._aurasDown) return;
    this._aurasDown = down;
    this.turrets.forEach(t => {
      const m = turretAuraMultipliers(t.auraSources
        .filter(a => !a.isDestroyed)
        .map(a => ({ type: a.type, level: a.level || 1 })));
      t.range = t.base.range * m.range;
      t.fireInterval = t.base.fireInterval / m.rate;
      // Not rounded: a +2% aura on a 16-damage Tesla shot would round straight back to 16,
      // so a level-1 Reactor or Relay silently did nothing. takeDamage handles fractions.
      t.damage = t.base.damage * m.damage;
      t.buffed = m.rate > 1 || m.damage > 1 || m.range > 1;
    });
  }

  update(delta, player) {
    if (!player || player.isCrashed) {
      this._lastTarget = null;   // a respawn teleports the buggy: do not read that as speed
      return;
    }

    // 0. An aura building razed since the last frame takes its buff with it.
    this.refreshAuras();

    // 1. Turret targeting & firing
    this.turrets.forEach(turret => {
      if (turret.parent.isDestroyed) return;

      turret.cooldown -= delta;

      if (!player.isInvisible) {
        const dist = turret.pos.distanceTo(player.position);
        // A mortar lobs shells and cannot depress its tube: inside minRange it is blind. The dead
        // zone is measured ON THE GROUND - from the raised muzzle, a 14m slant was only 13.5m of
        // ground, so the copy's '14m' was half a metre out.
        const flat = Math.hypot(turret.pos.x - player.position.x, turret.pos.z - player.position.z);
        const inBand = dist <= turret.range && flat >= (turret.minRange || 0);
        if (inBand && turret.cooldown <= 0) {
          if (turret.beam) this.fireBeam(turret, player);
          else this.fireBullet(turret.pos, player.position, turret.damage, turret.type, turret);
          // The jitter is a share of the interval, so an aura that shortens the interval
          // speeds up the real cadence by exactly what it promises. The part of this frame
          // past the reload carries over, so the cadence does not round up to whole frames;
          // a gun that sat idle with no target starts afresh.
          const carry = turret.cooldown > -delta ? turret.cooldown : 0;
          turret.cooldown = carry + turret.fireInterval * (1 + Math.random() * TURRET_RELOAD_JITTER);
        }
      }
    });

    // 1b. Fade out beams and splash bursts
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= delta;
      const k = Math.max(0, b.life / b.maxLife);
      if (b.burst) {
        b.mesh.material.opacity = 0.55 * k;
      } else {
        b.mesh.scale.x = b.mesh.scale.y = k;
      }
      if (b.life <= 0) {
        this.projectileGroup.remove(b.mesh);
        if (b.burst) b.mesh.material.dispose();
        this.beams.splice(i, 1);
      }
    }

    // 2. Update projectile motion & collisions
    const target = player.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    if (this._lastTarget && delta > 0) this._targetVel.copy(target).sub(this._lastTarget).divideScalar(delta);
    else this._targetVel.set(0, 0, 0);
    this._lastTarget = (this._lastTarget || new THREE.Vector3()).copy(target);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;

      // Guided rounds steer onto the target, so dodging alone does not beat a silo.
      if (p.homing && !player.isInvisible) {
        this._steer(p, target, this._targetVel, delta);
        p.mesh.lookAt(p.mesh.position.clone().add(p.velocity));
      }
      // Lobbed shells fall under gravity, nose following the arc.
      if (p.gravity) {
        p.velocity.y -= p.gravity * delta;
        p.mesh.lookAt(p.mesh.position.clone().add(p.velocity));
      }

      this._step.start.copy(p.mesh.position);
      p.mesh.position.addScaledVector(p.velocity, delta);
      this._step.end.copy(p.mesh.position);
      const distToPlayer = p.mesh.position.distanceTo(target);

      // Splash rounds burst on a direct hit, on reaching the point they were aimed at, or
      // on the ground - never at the edge of their splash, which only ever grazed.
      if (p.splashRadius > 0) {
        if (distToPlayer < DIRECT_HIT_RADIUS || p.life <= 0 || p.mesh.position.y <= 0) {
          this._detonate(p, player);
          this.removeProjectile(i);
        }
        continue;
      }

      // Swept along this frame's step: a 68 m/s missile in a slow frame moves further than the
      // hit sphere is wide, and could otherwise hop straight over the buggy.
      const passed = this._step.closestPointToPoint(target, true, this._closest).distanceTo(target);
      if (passed < DIRECT_HIT_RADIUS && !player.isAirborne) {
        player.takeDamage(p.damage, { pierce: p.pierce || 0 });
        this.removeProjectile(i);
        continue;
      }

      if (p.life <= 0 || p.mesh.position.y <= 0) {
        this.removeProjectile(i);
      }
    }
  }

  fireBullet(fromPos, targetPos, damage, type = 'gate', turret = null) {
    const mesh = new THREE.Mesh(this.bulletGeo, this.bulletMats[type] || this.bulletMat);
    mesh.position.copy(fromPos);

    const aimTarget = targetPos.clone().add(new THREE.Vector3(0, 0.6, 0));
    mesh.lookAt(aimTarget);

    const round = {
      mesh,
      type,
      damage,
      homing: turret ? turret.homing : null,
      splashRadius: turret ? turret.splashRadius : 0,
      pierce: turret ? turret.pierce || 0 : 0,
      gravity: 0
    };

    if (turret && turret.arcing) {
      // High ballistic lob: pick a flight time from the ground distance, then solve for the
      // launch velocity that lands exactly on the aim point after that long. The shell
      // bursts there on arrival (life runs out), so a parked raider eats the full blast.
      const d = aimTarget.clone().sub(fromPos);
      const T = SHELL_FLIGHT_BASE + Math.hypot(d.x, d.z) * SHELL_FLIGHT_PER_M;
      round.velocity = new THREE.Vector3(d.x / T, (d.y + 0.5 * SHELL_GRAVITY * T * T) / T, d.z / T);
      round.gravity = SHELL_GRAVITY;
      round.life = T;
    } else {
      const dist = aimTarget.distanceTo(fromPos);
      // A guided round keeps one speed for its whole flight (_steer only turns it).
      round.speed = round.homing ? round.homing.speed : ROUND_SPEED;
      round.velocity = aimTarget.clone().sub(fromPos).normalize().multiplyScalar(round.speed);
      if (round.splashRadius > 0) {
        round.life = dist / round.speed;   // straight splash round: burst at the aim point
      } else {
        // Live long enough to cross the gun's whole (aura-boosted) range, so the range a
        // turret advertises is range it can actually hit at. Homing rounds curve, so more.
        const range = turret ? turret.range : GATE_TURRET.range;
        round.life = (range / round.speed) * (round.homing ? 1.5 : 1) + ROUND_LIFE_MARGIN;
      }
    }

    this.projectileGroup.add(mesh);
    this.projectiles.push(round);

    this.sound.playTurretFire();
  }

  /**
   * Turn a guided round toward the raider by proportional navigation, at most
   * homing.turnRate rad/s, without changing its speed. While it closes, it turns NAV_GAIN
   * times as fast as the line of sight swings, so it flies to where the buggy is going; once
   * the buggy is pulling away (or it overshot), it turns straight back at it. The old lerp
   * toward the buggy shortened the velocity on every turn: a missile chasing a circling
   * buggy bled from 42 to 17 m/s and never got within 10 m.
   */
  _steer(p, target, targetVel, delta) {
    const dir = p.velocity.clone().normalize();
    const los = target.clone().sub(p.mesh.position);
    const dist = Math.max(los.length(), 1e-3);
    const rel = targetVel.clone().sub(p.velocity);
    const closing = -rel.dot(los) / dist;
    const maxTurn = p.homing.turnRate * delta;
    let axis, angle;
    if (closing > 0) {
      // Line-of-sight rate (los x rel / dist^2), crossed with the heading: the way to lead.
      const lead = los.clone().cross(rel).divideScalar(dist * dist).cross(dir);
      angle = Math.min(maxTurn, (NAV_GAIN * closing * lead.length() / p.speed) * delta);
      axis = dir.clone().cross(lead);
    } else {
      angle = Math.min(maxTurn, dir.angleTo(los));
      axis = dir.clone().cross(los);
      // Flying dead away from the buggy: any turn will do, so swing round level.
      if (axis.lengthSq() < 1e-12) axis.set(0, 1, 0);
    }
    if (angle > 0 && axis.lengthSq() > 1e-12) dir.applyAxisAngle(axis.normalize(), angle);
    p.velocity.copy(dir).multiplyScalar(p.speed);
  }

  /** Burst a splash round where it is now: falloff is measured from HERE, not the shell's path. */
  _detonate(p, player) {
    const at = p.mesh.position;
    const burst = new THREE.Mesh(this.burstGeo, new THREE.MeshBasicMaterial({
      color: (this.bulletMats[p.type] || this.bulletMat).color, transparent: true, opacity: 0.55, depthWrite: false
    }));
    burst.position.set(at.x, Math.max(0.5, at.y), at.z);
    burst.scale.setScalar(p.splashRadius);
    this.projectileGroup.add(burst);
    this.beams.push({ mesh: burst, life: 0.35, maxLife: 0.35, burst: true });
    if (this.sound.playExplosion) this.sound.playExplosion('medium');

    if (player.isAirborne) return;
    const dist = at.distanceTo(player.position.clone().add(new THREE.Vector3(0, 0.8, 0)));
    const dmg = splashDamageAt(p.damage, p.splashRadius, dist);
    if (dmg > 0) player.takeDamage(dmg, { pierce: p.pierce || 0 });
  }

  /**
   * Beam turret (Laser Obelisk): the hit lands the instant it fires - there is no round in
   * flight to dodge - and `pierce` of it skips the shield and burns straight into the hull
   * (VehicleController.takeDamage). A jumping buggy is still out of the beam's reach.
   */
  fireBeam(turret, player) {
    const target = player.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    const len = turret.pos.distanceTo(target);
    const mesh = new THREE.Mesh(this.beamGeo, this.bulletMats[turret.type] || this.bulletMat);
    mesh.position.copy(turret.pos).lerp(target, 0.5);
    mesh.lookAt(target);
    mesh.scale.set(1, 1, len);
    this.projectileGroup.add(mesh);
    this.beams.push({ mesh, life: 0.15, maxLife: 0.15 });

    player.takeDamage(turret.damage, { pierce: turret.pierce || 0 });
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
    this.beams.forEach(b => {
      this.projectileGroup.remove(b.mesh);
      if (b.burst) b.mesh.material.dispose();
    });
    this.beams = [];
    this.turrets = [];
    this.auraSources = [];
    this._aurasDown = 0;
    this._lastTarget = null;
  }
}
