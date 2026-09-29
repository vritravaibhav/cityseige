import * as THREE from 'three';
import { RAIDER_BASE, CARD_RECHARGES_AFTER_EFFECT, CARD_BASE, blastDamageAt, IN_WORLD_PICKUP, pickupLockoutFor } from '../data/progression.js';

/** The small mechanical hop (progression RAIDER_BASE.hop): boost, lift and its own recharge. */
const HOP = RAIDER_BASE.hop;

/**
 * Level-1 numbers for every ability card live in progression.js (CARD_BASE, the first row of
 * CARD_TIERS). The Vehicle Garage (GarageManager.computeCardStats -> progression.cardStatsFor)
 * hands back absolute per-level values, so applyLoadout() never compounds. Re-exported for
 * older tooling.
 */
export { CARD_BASE };

/**
 * HUD tooltip for a card at the numbers it will actually play (applyLoadout copies them from
 * progression.cardStatsFor), so an L5 cloak never reads as the level-1 five seconds.
 */
function cardDesc(c) {
  switch (c.id) {
    case 'invisibility': return `Cloak vehicle for ${c.duration}s (recharges in ${c.cooldown}s). Police & turrets lose lock-on.`;
    // It promises cruisers, not every pursuer: a Town Hall-tuned bomb wrecks every cruiser, but a
    // SWAT truck of the same level outlasts it at Town Halls 3-4 and 9-12 (1804 dmg vs 1920 HP at 12).
    case 'bomb': return `Eject a heavy explosive behind the vehicle (${c.blastRadius}m, ${c.blastDamage} dmg): wrecks cruisers at its own level or below, blasts police roadblocks, badly hurts SWAT.`;
    case 'missiles': return `Fire twin forward rockets (${c.damage} dmg each) that blast roadblocks & cruisers.`;
    case 'jump': return 'Hydraulic booster launches vehicle high over roadblocks & police. Recharges once you land.';
    case 'nitro': return `Supercharge speed and ramming power for ${c.duration}s (recharges in ${c.cooldown}s).`;
    default: return '';
  }
}

/**
 * CardSystem - Manages player battle action cards:
 * Invisibility, Bomb, Missiles, Big Jump, and Nitro.
 */
export class CardSystem {
  constructor(scene, soundManager, destructionEngine, policeManager) {
    this.scene = scene;
    this.sound = soundManager;
    this.destruction = destructionEngine;
    this.police = policeManager;

    this.cards = [
      {
        id: 'invisibility',
        name: 'Invisibility',
        icon: '👻',
        key: '1',
        hotkey: '1',
        level: 1,
        cooldown: CARD_BASE.invisibility.cooldown,
        currentCooldown: 0,
        duration: CARD_BASE.invisibility.duration,
        activeTimer: 0
      },
      {
        id: 'bomb',
        name: 'Drop Bomb',
        icon: '💣',
        key: '2',
        hotkey: '2',
        level: 1,
        cooldown: CARD_BASE.bomb.cooldown,
        currentCooldown: 0,
        blastRadius: CARD_BASE.bomb.blastRadius,
        blastDamage: CARD_BASE.bomb.blastDamage
      },
      {
        id: 'missiles',
        name: 'Twin Missiles',
        icon: '🚀',
        key: '3',
        hotkey: '3',
        level: 1,
        cooldown: CARD_BASE.missiles.cooldown,
        currentCooldown: 0,
        damage: CARD_BASE.missiles.damage
      },
      {
        id: 'jump',
        name: 'Big Jump',
        icon: '🦘',
        key: 'SPACE / 4',
        hotkey: '4',
        level: 1,
        cooldown: CARD_BASE.jump.cooldown, // recharges on the ground only (CARD_RECHARGES_AFTER_EFFECT)
        currentCooldown: 0
      },
      {
        id: 'nitro',
        name: 'Nitro Surge',
        icon: '🔥',
        key: '5',
        hotkey: '5',
        level: 1,
        cooldown: CARD_BASE.nitro.cooldown,
        currentCooldown: 0,
        duration: CARD_BASE.nitro.duration,
        activeTimer: 0
      }
    ];
    this.cards.forEach(c => { c.desc = cardDesc(c); });

    // Ordered ACTIVE cards for the current raid (set by applyLoadout from the Vehicle Garage).
    // Hotkeys, the HUD and activateCard() consult only this; `cards` stays the full catalogue.
    this.deck = [];

    // Active in-world projectiles / dropped items
    this.droppedBombs = [];
    this.activeMissiles = [];
    this.inWorldCards = [];
    this.cardObjectsGroup = new THREE.Group();
    this.cardObjectsGroup.name = 'card_abilities_group';
    this.scene.add(this.cardObjectsGroup);

    // Seconds of GROUND time before the next hop. Every take-off from Space (hop or Big Jump)
    // re-arms it, so hops cannot be chained onto each other or onto a Big Jump.
    this.hopCooldown = 0;

    this.onCooldownUpdate = null;
    this.onCardCollected = null;
    this._initKeyboard();
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea')) return;

      // Hotkeys are assigned by deck slot (1..N) in applyLoadout
      const card = this.deck.find(c => c.hotkey === e.key);
      if (card && this.playerRef && !this.playerRef.isCrashed) {
        this.activateCard(card.id);
      }

      // Space or KeyJ also triggers Big Jump card
      if ((e.code === 'Space' || e.code === 'KeyJ') && this.playerRef && !this.playerRef.isCrashed) {
        e.preventDefault();
        this.activateCard('jump');
      }
    });
  }

  setPlayer(player, buildingsList) {
    this.playerRef = player;
    this.buildingsList = buildingsList;
    if (this.playerRef) {
      this.playerRef.onJumpRequested = () => {
        this.activateCard('jump');
      };
    }
  }

  /**
   * Apply the Vehicle Garage loadout for this raid. `stats[id]` holds ABSOLUTE per-level
   * numbers (cooldown / duration / blastRadius / blastDamage / damage / level); `ids` is the
   * ordered deck. Idempotent: calling it twice yields the same deck and the same numbers.
   */
  applyLoadout(ids = [], stats = {}) {
    this.cards.forEach(c => {
      Object.assign(c, stats[c.id] || {});
      c.desc = cardDesc(c);
      c.currentCooldown = 0;
      c.activeTimer = 0;
      c.hotkey = null;
      c.key = '';
    });
    this.deck = ids.map(id => this.cards.find(c => c.id === id)).filter(Boolean);
    this.deck.forEach((c, i) => {
      c.hotkey = String(i + 1);
      c.key = c.id === 'jump' ? `SPACE / ${i + 1}` : String(i + 1);
    });
    if (this.onCooldownUpdate) this.onCooldownUpdate(this.cards);
  }

  canUse(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    return !!card && this.deck.includes(card) && card.currentCooldown <= 0 && !!this.playerRef && !this.playerRef.isCrashed;
  }

  activateCard(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    if (!card || !this.playerRef || this.playerRef.isCrashed) return false;

    // Cards outside the raid deck are inert everywhere (keyboard, HUD, touch). An unequipped
    // Big Jump degrades to the small hydraulic hop so roadblocks can never soft-lock the run.
    if (!this.deck.includes(card)) {
      if (card.id === 'jump') this._tryHop();
      return false;
    }

    // If Jump is on cooldown but player presses Space/Jump, provide mini hydraulic hop
    if (card.id === 'jump' && card.currentCooldown > 0) {
      this._tryHop();
      return false;
    }

    if (card.currentCooldown > 0) return false;

    // EMP Disrupter field: ability electronics are locked out. The plain hydraulic hop is
    // mechanical and still works, so an EMP can never soft-lock the buggy behind a barrier.
    if (this.playerRef.isSilenced) {
      if (card.id === 'jump') this._tryHop();
      if (this.onSilenced) this.onSilenced(card);
      return false;
    }

    // Big Jump needs the wheels on the ground, like the hop. (Pressed mid-air it used to burn
    // its cooldown for nothing, because triggerBigJump ignores an airborne buggy.)
    if (card.id === 'jump' && this.playerRef.isAirborne) return false;

    if (card.id === 'invisibility') {
      card.activeTimer = card.duration;
      this.playerRef.setInvisibility(true);
    } else if (card.id === 'bomb') {
      this._spawnBomb(card);
    } else if (card.id === 'missiles') {
      this._fireMissiles(card);
    } else if (card.id === 'jump') {
      this.playerRef.triggerBigJump();   // height comes from the vehicle's jump track
      this.hopCooldown = Math.max(this.hopCooldown, HOP.cooldown);
    } else if (card.id === 'nitro') {
      card.activeTimer = card.duration;
      this.playerRef.setNitro(true);
    }

    card.currentCooldown = card.cooldown;

    if (this.onCooldownUpdate) {
      this.onCooldownUpdate(this.cards);
    }
    return true;
  }

  /**
   * The small mechanical hop Space falls back to (Big Jump benched, recharging or jammed).
   * It recharges only on the ground (update()), so holding Space - OS key repeat fires this
   * ~30 times a second - lifts the buggy at most RAIDER_BASE.hop.maxAirShare of the time.
   */
  _tryHop() {
    const p = this.playerRef;
    if (!p || p.isCrashed || p.isAirborne || this.hopCooldown > 0) return false;
    p.triggerBigJump(HOP.boostSpeed, HOP.boostY);
    this.hopCooldown = HOP.cooldown;
    return true;
  }

  /**
   * EMP field: switch off every timed effect that is already running (cloak, nitro burn).
   * Returns the names of what was cut so the HUD can say so. Safe to call every frame.
   */
  jamActiveEffects() {
    const cut = [];
    if (!this.playerRef) return cut;
    this.cards.forEach(card => {
      if (!(card.activeTimer > 0)) return;
      card.activeTimer = 0;
      if (card.id === 'invisibility') this.playerRef.setInvisibility(false);
      else if (card.id === 'nitro') this.playerRef.setNitro(false);
      cut.push(card.name);
    });
    // Belt and braces: clear the flags themselves too, whatever set them.
    if (this.playerRef.isInvisible) {
      this.playerRef.setInvisibility(false);
      if (!cut.includes('Invisibility')) cut.push('Invisibility');
    }
    if (this.playerRef.isNitro) {
      this.playerRef.setNitro(false);
      if (!cut.includes('Nitro Surge')) cut.push('Nitro Surge');
    }
    if (cut.length && this.onCooldownUpdate) this.onCooldownUpdate(this.cards);
    return cut;
  }

  _spawnBomb(card = this.cards.find(c => c.id === 'bomb')) {
    const p = this.playerRef;
    const forward = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
    const spawnPos = p.position.clone().sub(forward.multiplyScalar(2.6)).add(new THREE.Vector3(0, 0.4, 0));

    // Spherical Bomb Mesh
    const bombGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const bombMat = new THREE.MeshStandardMaterial({
      color: 0x212121,
      metalness: 0.8,
      roughness: 0.3,
      emissive: 0xff1744,
      emissiveIntensity: 0.5
    });
    const bombMesh = new THREE.Mesh(bombGeo, bombMat);
    bombMesh.position.copy(spawnPos);
    this.cardObjectsGroup.add(bombMesh);

    this.droppedBombs.push({
      mesh: bombMesh,
      pos: spawnPos,
      timer: 1.5,
      flash: 0,
      // Copied onto the record so a bomb already in the air keeps its numbers.
      radius: (card && card.blastRadius) || CARD_BASE.bomb.blastRadius,
      damage: (card && card.blastDamage) || CARD_BASE.bomb.blastDamage
    });

    this.sound.playBombDrop();
  }

  _fireMissiles(card = this.cards.find(c => c.id === 'missiles')) {
    const p = this.playerRef;
    const forward = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
    const right = new THREE.Vector3(Math.cos(p.heading), 0, -Math.sin(p.heading));

    const offsets = [-0.7, 0.7];
    offsets.forEach(off => {
      const spawnPos = p.position.clone()
        .add(right.clone().multiplyScalar(off))
        .add(new THREE.Vector3(0, 1.4, 0))
        .add(forward.clone().multiplyScalar(1.5));

      const rocketGeo = new THREE.CylinderGeometry(0.14, 0.14, 1.1, 8);
      rocketGeo.rotateX(Math.PI / 2);
      const rocketMat = new THREE.MeshStandardMaterial({
        color: 0x37474f,
        emissive: 0xff3d00,
        emissiveIntensity: 0.8
      });
      const rocket = new THREE.Mesh(rocketGeo, rocketMat);
      rocket.position.copy(spawnPos);
      rocket.rotation.y = p.heading;
      this.cardObjectsGroup.add(rocket);

      this.activeMissiles.push({
        mesh: rocket,
        velocity: forward.clone().multiplyScalar(48.0),
        life: 2.2,
        damage: (card && card.damage) || CARD_BASE.missiles.damage
      });
    });

    this.sound.playMissileLaunch();
  }

  update(delta, elapsed) {
    // 1. Update Card Cooldowns & Active Timers. The jump hydraulics (hop and Big Jump alike)
    // only recharge with the wheels down, so a jump's hang time never counts as recharge.
    let stateChanged = false;
    const grounded = !(this.playerRef && this.playerRef.isAirborne);
    if (this.hopCooldown > 0 && grounded) this.hopCooldown = Math.max(0, this.hopCooldown - delta);
    this.cards.forEach(card => {
      if (card.currentCooldown > 0 && (grounded || !CARD_RECHARGES_AFTER_EFFECT[card.id])) {
        card.currentCooldown = Math.max(0, card.currentCooldown - delta);
        stateChanged = true;
      }

      if (card.activeTimer > 0) {
        card.activeTimer -= delta;
        if (card.activeTimer <= 0) {
          if (card.id === 'invisibility' && this.playerRef) {
            this.playerRef.setInvisibility(false);
          } else if (card.id === 'nitro' && this.playerRef) {
            this.playerRef.setNitro(false);
          }
        }
      }
    });

    if (stateChanged && this.onCooldownUpdate) {
      this.onCooldownUpdate(this.cards);
    }

    // 2. Update Dropped Bombs
    for (let i = this.droppedBombs.length - 1; i >= 0; i--) {
      const bomb = this.droppedBombs[i];
      bomb.timer -= delta;
      bomb.flash += delta * 15;
      bomb.mesh.material.emissiveIntensity = Math.sin(bomb.flash) > 0 ? 2.0 : 0.2;

      if (bomb.timer <= 0) {
        // DETONATE!
        const bPos = bomb.pos;
        this._discard(bomb.mesh);
        this.droppedBombs.splice(i, 1);

        this.destruction.spawnExplosion(bPos.x, 1.2, bPos.z, 'huge');
        this.sound.playExplosion('huge');

        const blastRadius = bomb.radius;
        const blastDamage = bomb.damage;

        // Damage police and roadblocks at full strength (no falloff): it is built for pursuers.
        this.police.damageAt(bPos.x, bPos.z, blastRadius, blastDamage);

        // Damage buildings (a buried landmine is invisible to the blast until it fires). They
        // take the same falloff every other blast deals (progression.blastDamageAt): full at
        // the centre, BLAST_FALLOFF_FLOOR at the rim. At full strength to the rim one bomb out-
        // damaged the autocannon 60-fold at Town Hall 12 (see progression.bombDpsAt).
        if (this.buildingsList) {
          const blast = { radius: blastRadius, damage: blastDamage };
          this.buildingsList.forEach(b => {
            if (!b.isDestroyed && b.mesh && b.mesh.visible) {
              const dmg = blastDamageAt(blast, Math.hypot(bPos.x - b.mesh.position.x, bPos.z - b.mesh.position.z));
              if (dmg > 0) this.destruction.damageBuilding(b, dmg, this.buildingsList, this.police);
            }
          });
        }
      }
    }

    // 3. Update Active Missiles
    for (let i = this.activeMissiles.length - 1; i >= 0; i--) {
      const m = this.activeMissiles[i];
      m.life -= delta;
      m.mesh.position.addScaledVector(m.velocity, delta);

      let exploded = false;

      // Check collision with Police / Roadblocks
      const mPos = m.mesh.position;
      for (let cop of this.police.policeUnits) {
        if (!cop.isDestroyed && mPos.distanceTo(cop.position) < 2.5) {
          this.police.destroyUnit(cop);
          exploded = true;
          break;
        }
      }

      // The roadblocks cruisers drop in a chase (a built Roadblock Barrier is a building, below).
      // Horizontal distance: the rocket flies at 1.4 m, the block sits on the road.
      if (!exploded) {
        for (const rb of this.police.roadblocks) {
          if (!rb.isDestroyed && Math.hypot(mPos.x - rb.position.x, mPos.z - rb.position.z) < rb.radius + 0.5) {
            this.police.damageRoadblock(rb, m.damage);
            exploded = true;
            break;
          }
        }
      }

      // Check collision with Buildings (missiles fly straight over drive-over traps and past trees)
      if (!exploded && this.buildingsList) {
        for (let b of this.buildingsList) {
          if (this.destruction.isShootable(b) && mPos.distanceTo(b.mesh.position) < 3.2) {
            this.destruction.damageBuilding(b, m.damage, this.buildingsList, this.police);
            exploded = true;
            break;
          }
        }
      }

      if (exploded || m.life <= 0) {
        this._discard(m.mesh);
        this.activeMissiles.splice(i, 1);
        if (exploded) {
          this.destruction.spawnExplosion(mPos.x, mPos.y, mPos.z, 'medium');
          this.sound.playExplosion('medium');
        }
      }
    }

    // 4. Update In-World Roaming Collectible Cards
    if (this.playerRef && !this.playerRef.isCrashed) {
      const pPos = this.playerRef.position;

      for (let card of this.inWorldCards) {
        if (card.active) {
          // Bobbing & Rotation
          card.mesh.rotation.y += delta * 2.2;
          card.mesh.position.y = 1.3 + Math.sin(elapsed * 3.5 + card.phase) * 0.35;

          // Check vehicle pickup distance. Inside an EMP field the ability pickups stay put
          // (they would otherwise hand back the nitro / jump / missiles the field jams), and a
          // NITRO / MEGA JUMP pickup waits, shrunk, while its card is recharging.
          const dist = pPos.distanceTo(card.mesh.position);
          const jammed = this.playerRef.isSilenced && card.type !== 'shield';
          const ready = this._pickupReady(card.type);
          card.mesh.scale.setScalar(ready ? 1 : 0.6);
          if (dist < 3.0 && !jammed && ready) {
            this._collectInWorldCard(card);
          }
        } else {
          card.respawnTimer -= delta;
          if (card.respawnTimer <= 0) {
            card.active = true;
            card.mesh.visible = true;
          }
        }
      }
    }
  }

  /**
   * A NITRO or MEGA JUMP pickup is a free use of that card (progression.IN_WORLD_PICKUP), so it
   * is only taken while the card is ready: its burn or hang time then counts against the same
   * CARD_UPTIME_CAP as the card's own. (A Big Jump cannot launch an airborne buggy.)
   */
  _pickupReady(type) {
    if (type !== 'nitro' && type !== 'jump') return true;
    const c = this.cards.find(x => x.id === type);
    if (!c) return true;
    if (c.currentCooldown > 0 || c.activeTimer > 0) return false;
    return type !== 'jump' || !(this.playerRef && this.playerRef.isAirborne);
  }

  _collectInWorldCard(card) {
    card.active = false;
    card.mesh.visible = false;
    card.respawnTimer = IN_WORLD_PICKUP.respawn;

    this.sound.playUpgrade();
    if (this.destruction) {
      this.destruction.spawnExplosion(card.mesh.position.x, 1.4, card.mesh.position.z, 'small');
    }

    if (card.type === 'jump') {
      // Mega Jump Launch! It leaves the Big Jump recharging (on the ground) as a use would.
      const mega = IN_WORLD_PICKUP.megaJump;
      this.playerRef.triggerBigJump(mega.boostSpeed, mega.boostY);
      this.hopCooldown = Math.max(this.hopCooldown, HOP.cooldown);
      const jc = this.cards.find(c => c.id === 'jump');
      if (jc) jc.currentCooldown = Math.max(jc.currentCooldown, pickupLockoutFor('jump'));
      if (this.onCardCollected) {
        this.onCardCollected({
          title: '🦘 MEGA JUMP CARD COLLECTED!',
          desc: 'Catapulted high over all roadblocks and police cruisers!'
        });
      }
    } else if (card.type === 'nitro') {
      // A free burn that leaves the Nitro Surge card recharging, never a reset of it.
      this.playerRef.setNitro(true);
      const nc = this.cards.find(c => c.id === 'nitro');
      if (nc) {
        nc.activeTimer = IN_WORLD_PICKUP.nitroBurn;
        nc.currentCooldown = Math.max(nc.currentCooldown, pickupLockoutFor('nitro'));
      }
      if (this.onCardCollected) {
        this.onCardCollected({
          title: '🔥 NITRO SURGE CARD COLLECTED!',
          desc: `Supercharged ${IN_WORLD_PICKUP.nitroBurn}s turbo speed & ramming boost!`
        });
      }
    } else if (card.type === 'missiles') {
      this._fireMissiles();
      const mc = this.cards.find(c => c.id === 'missiles');
      if (mc) mc.currentCooldown = 0;
      if (this.onCardCollected) {
        this.onCardCollected({
          title: '🚀 MISSILES SALVO CARD COLLECTED!',
          desc: 'Twin forward rockets blast path clear!'
        });
      }
    } else if (card.type === 'bomb') {
      this._spawnBomb();
      const bc = this.cards.find(c => c.id === 'bomb');
      if (bc) bc.currentCooldown = 0;
      if (this.onCardCollected) {
        this.onCardCollected({
          title: '💣 CLUSTER BOMB CARD COLLECTED!',
          desc: 'Heavy explosive ejected behind to wreck cruisers at its own level or below!'
        });
      }
    } else if (card.type === 'shield') {
      this.playerRef.shield = this.playerRef.maxShield;
      if (this.onCardCollected) {
        this.onCardCollected({
          title: '🛡️ SHIELD REPAIR CARD COLLECTED!',
          desc: 'Vehicle armor shields fully recharged to 100%!'
        });
      }
    }

    if (this.onCooldownUpdate) {
      this.onCooldownUpdate(this.cards);
    }
  }

  spawnInWorldCards(roadNetwork, buildingsList = []) {
    this.clearInWorldCards();

    const cardArchetypes = [
      { type: 'jump', icon: '🦘', color: 0x00e5ff, label: 'BIG JUMP' },
      { type: 'nitro', icon: '🔥', color: 0xff9100, label: 'NITRO' },
      { type: 'missiles', icon: '🚀', color: 0x76ff03, label: 'MISSILES' },
      { type: 'bomb', icon: '💣', color: 0xff1744, label: 'BOMB' },
      { type: 'shield', icon: '🛡️', color: 0x2979ff, label: 'SHIELD' }
    ];

    const spawnPositions = [];

    // 1. Gather road segment midpoints
    if (roadNetwork && roadNetwork.getRoadSegments) {
      const segs = roadNetwork.getRoadSegments();
      segs.forEach(seg => {
        const mx = (seg.x1 + seg.x2) / 2;
        const mz = (seg.z1 + seg.z2) / 2;
        if (Math.hypot(mx, mz) < 78.0) {
          spawnPositions.push(new THREE.Vector3(mx, 1.3, mz));
        }
      });
    }

    // 2. Add concentric ring waypoints so city is rich with roaming cards
    const radii = [25.0, 45.0, 65.0];
    radii.forEach((r, ri) => {
      const stepCount = 4 + ri * 2;
      for (let i = 0; i < stepCount; i++) {
        const angle = (i / stepCount) * Math.PI * 2 + (ri * 0.4);
        const wx = Math.cos(angle) * r;
        const wz = Math.sin(angle) * r;
        spawnPositions.push(new THREE.Vector3(wx, 1.3, wz));
      }
    });

    // Shuffle and pick 10 diverse card locations
    const shuffled = spawnPositions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(12, shuffled.length));

    selected.forEach((pos, idx) => {
      const arch = cardArchetypes[idx % cardArchetypes.length];
      const mesh = this._createInWorldCardMesh(arch.icon, arch.color, arch.label);
      mesh.position.copy(pos);
      this.cardObjectsGroup.add(mesh);

      this.inWorldCards.push({
        type: arch.type,
        mesh,
        active: true,
        respawnTimer: 0,
        phase: Math.random() * Math.PI * 2
      });
    });
  }

  _createInWorldCardMesh(icon, colorHex, label) {
    const cardGroup = new THREE.Group();

    // 1. Card Base (Sleek dark metallic slab)
    const slabGeo = new THREE.BoxGeometry(1.6, 2.3, 0.12);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x0c1424,
      metalness: 0.85,
      roughness: 0.25,
      emissive: colorHex,
      emissiveIntensity: 0.35
    });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    cardGroup.add(slabMesh);

    // 2. Glowing Neon Border Frame
    const borderGeo = new THREE.BoxGeometry(1.68, 2.38, 0.14);
    const borderMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      wireframe: true
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    cardGroup.add(borderMesh);

    // 3. Canvas Texture with High-Res Icon & Text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    grad.addColorStop(0, '#0d1829');
    grad.addColorStop(1, '#050b14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 360);

    // Border line
    const hexStr = '#' + colorHex.toString(16).padStart(6, '0');
    ctx.strokeStyle = hexStr;
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 244, 348);

    // Card Icon
    ctx.font = '84px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 128, 140);

    // Card Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(label, 128, 255);

    // Badge Subtext
    ctx.fillStyle = hexStr;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('⚡ CITY POWERUP ⚡', 128, 295);

    const texture = new THREE.CanvasTexture(canvas);
    const planeGeo = new THREE.PlaneGeometry(1.5, 2.2);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const frontPlane = new THREE.Mesh(planeGeo, planeMat);
    frontPlane.position.z = 0.07;
    cardGroup.add(frontPlane);

    const backPlane = frontPlane.clone();
    backPlane.position.z = -0.07;
    backPlane.rotation.y = Math.PI;
    cardGroup.add(backPlane);

    // 4. Pulsing Ground Ring
    const ringGeo = new THREE.RingGeometry(1.1, 1.4, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = -1.2;
    cardGroup.add(ringMesh);

    return cardGroup;
  }

  clearInWorldCards() {
    this.inWorldCards.forEach(c => this._discard(c.mesh));
    this.inWorldCards = [];
  }

  /**
   * Take a bomb, rocket or pickup off the map for good and free what it holds on the GPU:
   * each one builds its own geometry, materials and (pickups) canvas texture, and removing them
   * alone leaked them every raid.
   */
  _discard(mesh) {
    this.cardObjectsGroup.remove(mesh);
    mesh.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (o.material.map) o.material.map.dispose();
        o.material.dispose();
      }
    });
  }

  reset() {
    // Deactivate BEFORE zeroing the timers. The restore path lives only in update()'s expiry
    // branch, so snapping activeTimer to 0 used to skip it - crashing with invisibility or nitro
    // up left the flag set forever, and every later siege ran as an untouchable ghost.
    // Guarded because AttackManager.launchBreach() calls reset() before setPlayer().
    if (this.playerRef) {
      this.playerRef.setInvisibility(false);
      this.playerRef.setNitro(false);
    }

    this.cards.forEach(c => {
      c.currentCooldown = 0;
      c.activeTimer = 0;
    });
    this.hopCooldown = 0;
    this.deck = [];
    this.droppedBombs.forEach(b => this._discard(b.mesh));
    this.droppedBombs = [];
    this.activeMissiles.forEach(m => this._discard(m.mesh));
    this.activeMissiles = [];
    this.clearInWorldCards();
    if (this.onCooldownUpdate) {
      this.onCooldownUpdate(this.cards);
    }
  }
}
