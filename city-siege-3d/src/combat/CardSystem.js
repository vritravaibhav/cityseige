import * as THREE from 'three';

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
        cooldown: 14.0,
        currentCooldown: 0,
        duration: 5.0,
        activeTimer: 0,
        desc: 'Cloak vehicle for 5s. Police & turrets lose lock-on.'
      },
      {
        id: 'bomb',
        name: 'Drop Bomb',
        icon: '💣',
        key: '2',
        hotkey: '2',
        cooldown: 7.0,
        currentCooldown: 0,
        desc: 'Eject heavy explosive behind vehicle to wipe pursuers.'
      },
      {
        id: 'missiles',
        name: 'Twin Missiles',
        icon: '🚀',
        key: '3',
        hotkey: '3',
        cooldown: 6.0,
        currentCooldown: 0,
        desc: 'Fire twin forward rockets that blast roadblocks & cruisers.'
      },
      {
        id: 'jump',
        name: 'Big Jump',
        icon: '🦘',
        key: 'SPACE / 4',
        hotkey: '4',
        cooldown: 3.5, // Fast 3.5s cooldown for thrilling leaps!
        currentCooldown: 0,
        desc: 'Hydraulic booster launches vehicle high over roadblocks & police.'
      },
      {
        id: 'nitro',
        name: 'Nitro Surge',
        icon: '🔥',
        key: '5',
        hotkey: '5',
        cooldown: 9.0,
        currentCooldown: 0,
        duration: 3.5,
        activeTimer: 0,
        desc: 'Supercharge speed and ramming power for 3.5 seconds.'
      }
    ];

    // Active in-world projectiles / dropped items
    this.droppedBombs = [];
    this.activeMissiles = [];
    this.inWorldCards = [];
    this.cardObjectsGroup = new THREE.Group();
    this.cardObjectsGroup.name = 'card_abilities_group';
    this.scene.add(this.cardObjectsGroup);

    this.onCooldownUpdate = null;
    this.onCardCollected = null;
    this._initKeyboard();
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea')) return;

      // Check hotkeys 1-5
      const card = this.cards.find(c => c.hotkey === e.key || c.key === e.key);
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

  canUse(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    return card && card.currentCooldown <= 0 && this.playerRef && !this.playerRef.isCrashed;
  }

  activateCard(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    if (!card || !this.playerRef || this.playerRef.isCrashed) return false;

    // If Jump is on cooldown but player presses Space/Jump, provide mini hydraulic hop
    if (card.id === 'jump' && card.currentCooldown > 0) {
      if (!this.playerRef.isAirborne) {
        this.playerRef.triggerBigJump(-4.0, 16.5);
      }
      return false;
    }

    if (card.currentCooldown > 0) return false;

    if (card.id === 'invisibility') {
      card.activeTimer = card.duration;
      this.playerRef.setInvisibility(true);
    } else if (card.id === 'bomb') {
      this._spawnBomb();
    } else if (card.id === 'missiles') {
      this._fireMissiles();
    } else if (card.id === 'jump') {
      this.playerRef.triggerBigJump(14.0, 25.0);
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

  _spawnBomb() {
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
      flash: 0
    });

    this.sound.playBombDrop();
  }

  _fireMissiles() {
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
        life: 2.2
      });
    });

    this.sound.playMissileLaunch();
  }

  update(delta, elapsed) {
    // 1. Update Card Cooldowns & Active Timers
    let stateChanged = false;
    this.cards.forEach(card => {
      if (card.currentCooldown > 0) {
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
        this.cardObjectsGroup.remove(bomb.mesh);
        this.droppedBombs.splice(i, 1);

        this.destruction.spawnExplosion(bPos.x, 1.2, bPos.z, 'huge');
        this.sound.playExplosion('huge');

        const blastRadius = 14.0;
        const blastDamage = 350;

        // Damage police and roadblocks
        this.police.damageAt(bPos.x, bPos.z, blastRadius, blastDamage);

        // Damage buildings
        if (this.buildingsList) {
          this.buildingsList.forEach(b => {
            if (!b.isDestroyed && b.mesh) {
              const dist = bPos.distanceTo(b.mesh.position);
              if (dist <= blastRadius) {
                this.destruction.damageBuilding(b, blastDamage, this.buildingsList, this.police);
              }
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

      // Check collision with Buildings
      if (!exploded && this.buildingsList) {
        for (let b of this.buildingsList) {
          if (!b.isDestroyed && b.mesh && mPos.distanceTo(b.mesh.position) < 3.2) {
            this.destruction.damageBuilding(b, 300, this.buildingsList, this.police);
            exploded = true;
            break;
          }
        }
      }

      if (exploded || m.life <= 0) {
        this.cardObjectsGroup.remove(m.mesh);
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

          // Check vehicle pickup distance
          const dist = pPos.distanceTo(card.mesh.position);
          if (dist < 3.0) {
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

  _collectInWorldCard(card) {
    card.active = false;
    card.mesh.visible = false;
    card.respawnTimer = 14.0; // Respawns in 14 seconds!

    this.sound.playUpgrade();
    if (this.destruction) {
      this.destruction.spawnExplosion(card.mesh.position.x, 1.4, card.mesh.position.z, 'small');
    }

    if (card.type === 'jump') {
      // Mega Jump Launch!
      this.playerRef.triggerBigJump(16.0, 27.0);
      const jc = this.cards.find(c => c.id === 'jump');
      if (jc) jc.currentCooldown = 0;
      if (this.onCardCollected) {
        this.onCardCollected({
          title: '🦘 MEGA JUMP CARD COLLECTED!',
          desc: 'Catapulted high over all roadblocks and police cruisers!'
        });
      }
    } else if (card.type === 'nitro') {
      this.playerRef.setNitro(true);
      const nc = this.cards.find(c => c.id === 'nitro');
      if (nc) {
        nc.activeTimer = 4.5;
        nc.currentCooldown = 0;
      }
      if (this.onCardCollected) {
        this.onCardCollected({
          title: '🔥 NITRO SURGE CARD COLLECTED!',
          desc: 'Supercharged 4.5s turbo speed & ramming boost!'
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
          desc: 'Heavy explosive ejected behind to wipe pursuers!'
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
    this.inWorldCards.forEach(c => {
      this.cardObjectsGroup.remove(c.mesh);
    });
    this.inWorldCards = [];
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
    this.droppedBombs.forEach(b => this.cardObjectsGroup.remove(b.mesh));
    this.droppedBombs = [];
    this.activeMissiles.forEach(m => this.cardObjectsGroup.remove(m.mesh));
    this.activeMissiles = [];
    this.clearInWorldCards();
    if (this.onCooldownUpdate) {
      this.onCooldownUpdate(this.cards);
    }
  }
}
