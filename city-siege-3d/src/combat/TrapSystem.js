import { BUILDING_DEFS, trapStatsFor, MINE_STACK_WINDOW } from '../data/progression.js';

/**
 * TrapSystem - drive-over traps (Spring, Landmine, Freeze, Vortex).
 *
 * These are NOT solid: DestructionEngine skips role 'trap' in its push-out collision so
 * the buggy drives onto them, and rounds fly over them (DestructionEngine.isShootable), so
 * the always-firing autocannon cannot clear one out of the road first. Spike traps and
 * roadblocks are solid barriers by design and are not handled here.
 *
 * Per-level scaling (damage, radius, effect duration) and the re-arm delay come from
 * progression.trapStatsFor(). A trap re-arms only TRAP_REARM_SECONDS after its effect
 * ends, so a vortex or freeze can never chain-hold a raider forever.
 *
 * Landmines go off one at a time: after one fires, the rest hold for MINE_STACK_WINDOW and
 * stay buried and armed, so a cluster on adjacent tiles costs the raider one blast, not all.
 */
export class TrapSystem {
  constructor(soundManager, destructionEngine) {
    this.sound = soundManager;
    this.destruction = destructionEngine;
    this.traps = [];
    this.onTrapTriggered = null;
    this.mineLockout = 0;   // seconds until another landmine may fire (MINE_STACK_WINDOW)
  }

  register(buildings) {
    this.traps = [];
    this.mineLockout = 0;
    (buildings || []).forEach(b => {
      const def = BUILDING_DEFS[b.type];
      if (!def || def.role !== 'trap' || !def.trap || !b.mesh || b.isDestroyed) return;
      const stats = trapStatsFor(b.type, b.level || 1);
      if (!stats) return;
      this.traps.push({
        building: b,
        ...stats,
        hidden: !!def.hidden,
        cooldown: 0
      });
      // A buried landmine is invisible until it fires.
      if (def.hidden) b.mesh.visible = false;
    });
  }

  update(delta, player) {
    if (this.mineLockout > 0) this.mineLockout = Math.max(0, this.mineLockout - delta);
    if (!player || player.isCrashed) return;
    for (const trap of this.traps) {
      const b = trap.building;
      if (b.isDestroyed || b.trapSpent) continue;
      if (trap.cooldown > 0) { trap.cooldown -= delta; continue; }
      if (player.isAirborne) continue;

      const p = b.mesh.position;
      const d = Math.hypot(player.position.x - p.x, player.position.z - p.z);
      if (d > trap.radius) continue;
      // Another mine just went off: this one waits, still buried, for the next pass.
      if (trap.kind === 'damage' && this.mineLockout > 0) continue;

      this._trigger(trap, player);
      trap.cooldown = trap.rearmSeconds;
    }
  }

  _trigger(trap, player) {
    const b = trap.building;
    const p = b.mesh.position;

    switch (trap.kind) {
      case 'damage':
        // A mine is spent the moment it fires, so it must land: it ignores the breach / respawn
        // grace that would soak it for 0. (It is not contact, so the ram buffer never applies.)
        player.takeDamage(trap.damage, { bypassImmunity: true });
        this.mineLockout = MINE_STACK_WINDOW;
        if (this.destruction) this.destruction.spawnExplosion(p.x, 0.8, p.z, 'large');
        if (this.sound) this.sound.playExplosion('large');
        break;
      case 'launch':
        player.launch(trap.launchSpeed, trap.stunSeconds);
        if (this.sound && this.sound.playBigJump) this.sound.playBigJump();
        break;
      case 'freeze':
        player.applySlow(trap.slowFactor, trap.slowSeconds);
        break;
      case 'pull':
        // The well's own radius is the leash: the raider cannot leave it until it lets go.
        player.applyPull(p.x, p.z, trap.pullStrength, trap.holdSeconds, trap.radius);
        break;
      default:
        return;
    }

    if (trap.hidden) b.mesh.visible = true;
    if (trap.oneShot) {
      // Spent for the rest of this raid; it re-arms when the city is rebuilt afterwards.
      b.trapSpent = true;
      if (this.destruction) this.destruction.destroyBuilding(b, null, null);
    }
    if (this.onTrapTriggered) this.onTrapTriggered(b, trap.kind);
  }

  /**
   * Hide every hidden trap (landmines) before the raid starts - the tactical recon map and the
   * breach swoop are where a raider picks a gate, so a mine showing there is not buried.
   * register() hides them again once the raid is live.
   */
  bury(buildings) {
    (buildings || []).forEach(b => {
      const def = BUILDING_DEFS[b.type];
      if (def && def.role === 'trap' && def.hidden && b.mesh) b.mesh.visible = false;
    });
  }

  /** Recon aborted: show the hidden traps again on the builder's own map. */
  unbury(buildings) {
    (buildings || []).forEach(b => {
      const def = BUILDING_DEFS[b.type];
      if (def && def.role === 'trap' && def.hidden && b.mesh && !b.isDestroyed) b.mesh.visible = true;
    });
  }

  /** After a raid: re-arm every trap and un-bury the hidden ones for the builder view. */
  reset() {
    this.mineLockout = 0;
    this.traps.forEach(t => {
      t.building.trapSpent = false;
      t.cooldown = 0;
      if (t.hidden && t.building.mesh) t.building.mesh.visible = true;
    });
    this.traps = [];
  }
}
