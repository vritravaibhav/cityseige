import * as THREE from 'three';

/**
 * BuildingManager - Manages building definitions, placement,
 * upgrades, visual swaps, and city initialization.
 */
export class BuildingManager {
  constructor(scene, assetFactory, roadNetwork, economyManager) {
    this.scene = scene;
    this.assetFactory = assetFactory;
    this.roadNetwork = roadNetwork;
    this.economy = economyManager;

    this.buildings = [];
    this.buildingGroup = new THREE.Group();
    this.buildingGroup.name = 'city_buildings';
    this.scene.add(this.buildingGroup);

    this.activeBuildTasks = [];
    this.onBuildersChanged = null;
    this.onConstructionFinished = null;

    this.catalog = {
      town_hall: {
        name: 'Town Hall',
        category: 'civil',
        cost: { cash: 500, iron: 250, wood: 400 },
        maxHp: 1200,
        footprint: 2,
        desc: 'Heart of the city. Upgrade to unlock new structural tiers.'
      },
      vehicle_lab: {
        name: 'Vehicle Tuning Lab',
        category: 'defense',
        cost: { cash: 450, iron: 250, wood: 300 },
        maxHp: 750,
        footprint: 2,
        desc: 'High-octane lab to upgrade vehicle top speed, acceleration, nitro, and jump height.'
      },
      weapons_lab: {
        name: 'Weapons & Munitions Lab',
        category: 'defense',
        cost: { cash: 550, iron: 350, wood: 250 },
        maxHp: 850,
        footprint: 2,
        desc: 'Explosive lab to upgrade bomb blast radius, explosion damage, rockets, and EMP duration.'
      },
      sniper_tower: {
        name: 'Sniper Watchtower',
        category: 'defense',
        cost: { cash: 350, iron: 200, wood: 250 },
        maxHp: 700,
        footprint: 2,
        desc: 'Elevated marksman nest firing high-velocity rounds at intruder buggies.'
      },
      tesla_coil: {
        name: 'Tesla Defense Coil',
        category: 'defense',
        cost: { cash: 500, iron: 350, wood: 200 },
        maxHp: 850,
        footprint: 2,
        desc: 'High-voltage electric arcs that zap nearby attacker vehicles.'
      },
      laser_obelisk: {
        name: 'Laser Obelisk',
        category: 'defense',
        cost: { cash: 750, iron: 500, wood: 300 },
        maxHp: 1350,
        footprint: 2,
        desc: 'Continuous focused thermal heat laser cutting through vehicle armor.'
      },
      main_gate: {
        name: 'Fortified Main Gate',
        category: 'defense',
        cost: { cash: 350, iron: 300, wood: 200 },
        maxHp: 800,
        footprint: 3,
        desc: 'Heavy perimeter defense gate with automated defense turrets.'
      },
      police_station: {
        name: 'Police Station',
        category: 'defense',
        cost: { cash: 400, iron: 200, wood: 250 },
        maxHp: 650,
        footprint: 2,
        desc: 'Houses pursuit cruisers that deploy immediately when sirens sound.'
      },
      petrol_pump: {
        name: 'Petrol Pump',
        category: 'economy',
        cost: { cash: 300, iron: 150, wood: 100 },
        maxHp: 400,
        footprint: 2,
        desc: 'High economic output! Warning: highly explosive during attacks.'
      },
      lumber_mill: {
        name: 'Lumber Mill',
        category: 'economy',
        cost: { cash: 150, iron: 50, wood: 100 },
        maxHp: 450,
        footprint: 2,
        desc: 'Mines Wood continuously to supply construction.'
      },
      iron_foundry: {
        name: 'Iron Foundry',
        category: 'economy',
        cost: { cash: 250, iron: 100, wood: 150 },
        maxHp: 550,
        footprint: 2,
        desc: 'Mines Iron continuously to forge heavy fortifications.'
      },
      cash_mint: {
        name: 'Cash Mint',
        category: 'economy',
        cost: { cash: 350, iron: 150, wood: 200 },
        maxHp: 500,
        footprint: 2,
        desc: 'Produces Cash continuously for the treasury.'
      },
      spike_trap: {
        name: 'Spike Trap',
        category: 'defense',
        cost: { cash: 80, iron: 120, wood: 40 },
        maxHp: 200,
        footprint: 1,
        desc: 'Hidden road trap that shreds attacker tires.'
      },
      roadblock: {
        name: 'Roadblock Barrier',
        category: 'defense',
        cost: { cash: 50, iron: 80, wood: 30 },
        maxHp: 300,
        footprint: 1,
        desc: 'Concrete barrier to block enemy attack routes.'
      },
      builder_hut: {
        name: 'Hire a Labour',
        category: 'civil',
        cost: { cash: 200, iron: 80, wood: 150 },
        maxHp: 350,
        footprint: 2,
        desc: 'Hire a dedicated labourer to construct and upgrade buildings. Provides +1 active Labour slot.'
      },
      tree: {
        name: 'Pine Tree',
        category: 'civil',
        cost: { cash: 10, iron: 0, wood: 20 },
        maxHp: 100,
        footprint: 1,
        desc: 'Countryside greenery.'
      },
      road: {
        name: 'Paved Asphalt Road (x5 Tiles)',
        category: 'roads',
        cost: { cash: 25, iron: 15, wood: 20 },
        packCount: 5,
        footprint: 1,
        desc: 'Durable paved asphalt tiles to connect structures and gates in your city.'
      }
    };
  }

  initDefaultCity() {
    this.clearAll();

    // 1. Build Central Roads
    const roadCoords = [
      // Central Cross
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13], [0, 14], [0, 15],
      [0, -1], [0, -2], [0, -3], [0, -4], [0, -5], [0, -6], [0, -7], [0, -8], [0, -9], [0, -10], [0, -11], [0, -12], [0, -13], [0, -14], [0, -15],
      [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],
      [-1, 0], [-2, 0], [-3, 0], [-4, 0], [-5, 0], [-6, 0], [-7, 0], [-8, 0], [-9, 0], [-10, 0], [-11, 0], [-12, 0], [-13, 0], [-14, 0], [-15, 0],
      // Ring Road at distance 6
      [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],
      [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
      [-6, 1], [-6, 2], [-6, 3], [-6, 4], [-6, 5], [-6, 6],
      [-1, 6], [-2, 6], [-3, 6], [-4, 6], [-5, 6],
      [6, -1], [6, -2], [6, -3], [6, -4], [6, -5], [6, -6],
      [1, -6], [2, -6], [3, -6], [4, -6], [5, -6],
      [-6, -1], [-6, -2], [-6, -3], [-6, -4], [-6, -5], [-6, -6],
      [-1, -6], [-2, -6], [-3, -6], [-4, -6], [-5, -6]
    ];

    roadCoords.forEach(([gx, gz]) => {
      this.roadNetwork.addRoad(gx, gz);
    });

    // 2. Town Hall in center
    this.addBuilding('town_hall', 3, 3, 1);

    // 3. AT LEAST 3 FORTIFIED MAIN GATES around perimeter!
    // North Gate (Top: Z ~ -15)
    this.addMainGate('North Gate', 0, -15, 0);
    // East Gate (Right: X ~ 15)
    this.addMainGate('East Gate', 15, 0, Math.PI / 2);
    // South Gate (Bottom: Z ~ 15)
    this.addMainGate('South Gate', 0, 15, Math.PI);

    // 4. Police Stations (2 Stations)
    this.addBuilding('police_station', -4, -3, 1);
    this.addBuilding('police_station', 4, 8, 1);

    // 5. Petrol Pumps (2 Stations - High Cash & Explosive Hazards)
    this.addBuilding('petrol_pump', -3, 3, 1);
    this.addBuilding('petrol_pump', 8, -3, 1);

    // 6. Resource Factories (Wood, Iron, Cash)
    this.addBuilding('lumber_mill', -8, -8, 1);
    this.addBuilding('iron_foundry', -8, 8, 1);
    this.addBuilding('cash_mint', 8, 4, 1);

    // 7. Builder Huts (Active builders constructing & repairing!)
    this.addBuilding('builder_hut', 4, -4, 1);
    this.addBuilding('builder_hut', -4, 4, 1);

    // 8. Defensive Traps & Roadblocks
    this.addBuilding('spike_trap', 0, -11, 1);
    this.addBuilding('roadblock', 0, 11, 1);
    this.addBuilding('roadblock', 11, 0, 1);

    // 9. Trees & Countryside foliage
    const treeLocs = [
      [-10, -3], [-11, -5], [-12, -7], [-10, 3], [-12, 5],
      [10, -8], [11, -10], [9, 9], [12, 11], [-3, 11]
    ];
    treeLocs.forEach(([gx, gz]) => {
      this.addBuilding('tree', gx, gz, 1);
    });
  }

  get tileSize() {
    return this.roadNetwork ? this.roadNetwork.tileSize : 5.5;
  }

  moveBuilding(building, newGx, newGz) {
    building.gx = newGx;
    building.gz = newGz;
    if (building.mesh) {
      building.mesh.position.set(newGx * this.tileSize, 0, newGz * this.tileSize);
    }
  }

  applyPreset(presetName) {
    this.clearAll();

    if (presetName === 'metropolis') {
      // Modern Grid Metropolis
      // 3 parallel avenues horizontal and vertical
      for (let x = -14; x <= 14; x++) {
        this.roadNetwork.addRoad(x, 0);
        this.roadNetwork.addRoad(x, -7);
        this.roadNetwork.addRoad(x, 7);
      }
      for (let z = -14; z <= 14; z++) {
        this.roadNetwork.addRoad(0, z);
        this.roadNetwork.addRoad(-7, z);
        this.roadNetwork.addRoad(7, z);
      }

      this.addBuilding('town_hall', 3, 3, 2);
      this.addMainGate('North Gate', 0, -14, 0);
      this.addMainGate('East Gate', 14, 0, Math.PI / 2);
      this.addMainGate('South Gate', 0, 14, Math.PI);

      this.addBuilding('police_station', -7, -3, 2);
      this.addBuilding('police_station', 7, 7, 2);
      this.addBuilding('petrol_pump', -3, 7, 1);
      this.addBuilding('petrol_pump', 7, -3, 1);
      this.addBuilding('cash_mint', 3, -7, 2);
      this.addBuilding('iron_foundry', -7, 7, 2);
      this.addBuilding('lumber_mill', -11, -11, 2);
      this.addBuilding('builder_hut', -3, -3, 1);
      this.addBuilding('builder_hut', 3, 7, 1);

    } else if (presetName === 'valley') {
      // Winding Countryside Outpost with diagonal trails
      const path = [
        [0, -14], [0, -13], [1, -12], [2, -11], [3, -10], [3, -9], [2, -8], [1, -7], [0, -6],
        [-1, -5], [-2, -4], [-3, -3], [-3, -2], [-2, -1], [-1, 0], [0, 0],
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10],
        [11, 11], [12, 12], [13, 13], [14, 14],
        // Branch to East Gate
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
        // Branch to South Gate
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13], [0, 14]
      ];
      path.forEach(([gx, gz]) => this.roadNetwork.addRoad(gx, gz));

      this.addBuilding('town_hall', -2, -2, 1);
      this.addMainGate('North Gate', 0, -14, 0);
      this.addMainGate('East Gate', 14, 0, Math.PI / 2);
      this.addMainGate('South Gate', 0, 14, Math.PI);

      this.addBuilding('lumber_mill', 6, 2, 1);
      this.addBuilding('iron_foundry', -6, 2, 1);
      this.addBuilding('cash_mint', 2, 6, 1);
      this.addBuilding('police_station', -4, -6, 1);
      this.addBuilding('petrol_pump', 6, -4, 1);
      this.addBuilding('builder_hut', -1, 3, 1);
      this.addBuilding('spike_trap', 2, -11, 1);

    } else {
      // Default / Citadel
      this.initDefaultCity();
    }
  }

  addMainGate(name, gx, gz, rotation) {
    const mesh = this.assetFactory.createMainGate(name, rotation);
    mesh.position.set(gx * this.tileSize, 0, gz * this.tileSize);
    this.buildingGroup.add(mesh);

    const b = {
      id: `gate_${name.toLowerCase().replace(' ', '_')}`,
      type: 'main_gate',
      name: name,
      level: 1,
      gx,
      gz,
      rotation,
      hp: 800,
      maxHp: 800,
      mesh: mesh,
      isMainGate: true
    };
    this.buildings.push(b);
    return b;
  }

  addBuilding(type, gx, gz, level = 1) {
    const def = this.catalog[type];
    if (!def) return null;

    let mesh = null;
    if (type === 'town_hall') {
      mesh = this.assetFactory.createTownHall(level);
    } else if (type === 'police_station') {
      mesh = this.assetFactory.createPoliceStation(level);
    } else if (type === 'petrol_pump') {
      mesh = this.assetFactory.createPetrolPump();
    } else if (type === 'lumber_mill') {
      mesh = this.assetFactory.createLumberMill(level);
    } else if (type === 'iron_foundry') {
      mesh = this.assetFactory.createIronFoundry(level);
    } else if (type === 'cash_mint') {
      mesh = this.assetFactory.createCashMint(level);
    } else if (type === 'spike_trap') {
      mesh = this.assetFactory.createSpikeTrap();
    } else if (type === 'roadblock') {
      mesh = this.assetFactory.createRoadblock();
    } else if (type === 'builder_hut') {
      mesh = this.assetFactory.createBuilderHut(level);
    } else if (type === 'tree') {
      mesh = this.assetFactory.createPineTree();
    }

    if (!mesh) return null;

    mesh.position.set(gx * this.tileSize, 0, gz * this.tileSize);
    this.buildingGroup.add(mesh);

    const b = {
      id: `b_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      name: def.name,
      level,
      gx,
      gz,
      hp: def.maxHp * (level === 3 ? 2.2 : level === 2 ? 1.5 : 1.0),
      maxHp: def.maxHp * (level === 3 ? 2.2 : level === 2 ? 1.5 : 1.0),
      mesh,
      isDestroyed: false,
      isExplosive: type === 'petrol_pump',
      spawnsPolice: type === 'police_station',
      bubbleMesh: null
    };

    // Factory resource production settings
    if (type === 'lumber_mill') {
      b.produceType = 'wood';
      b.produceRate = 3.5 * level;
      b.stored = 16; // Initial harvestable amount on first load
      b.maxCapacity = 300 * level;
    } else if (type === 'iron_foundry') {
      b.produceType = 'iron';
      b.produceRate = 2.5 * level;
      b.stored = 14;
      b.maxCapacity = 250 * level;
    } else if (type === 'cash_mint') {
      b.produceType = 'cash';
      b.produceRate = 5.0 * level;
      b.stored = 25;
      b.maxCapacity = 400 * level;
    } else if (type === 'petrol_pump') {
      b.produceType = 'cash';
      b.produceRate = 7.5 * level;
      b.stored = 35;
      b.maxCapacity = 500 * level;
    }

    this.buildings.push(b);
    return b;
  }

  get totalBuilders() {
    const huts = this.buildings.filter(b => b.type === 'builder_hut' && !b.isDestroyed).length;
    return Math.max(2, huts);
  }

  get busyBuilders() {
    return this.activeBuildTasks.length;
  }

  get freeBuilders() {
    return Math.max(0, this.totalBuilders - this.busyBuilders);
  }

  getTownHallLevel() {
    const th = this.buildings.find(b => b.type === 'town_hall');
    return th ? (th.level || 1) : 1;
  }

  getBuildTime(type, targetLevel = 1) {
    const baseTimes = {
      roadblock: 5,
      spike_trap: 5,
      spring_trap: 6,
      landmine: 7,
      freeze_trap: 8,
      lumber_mill: 10,
      iron_foundry: 10,
      petrol_pump: 10,
      cash_mint: 12,
      builder_hut: 15,
      police_station: 15,
      sniper_tower: 15,
      vehicle_lab: 15,
      weapons_lab: 20,
      main_gate: 20,
      tesla_coil: 25,
      laser_obelisk: 30,
      town_hall: 25
    };
    const base = baseTimes[type] || 10;
    return Math.min(120, Math.round(base * Math.pow(1.5, Math.max(0, targetLevel - 1))));
  }

  upgradeBuilding(building, onComplete = null) {
    if (building.isUnderConstruction) {
      return { ok: false, reason: 'ALREADY_IN_PROGRESS' };
    }

    const nextLvl = (building.level || 1) + 1;
    const thLvl = this.getTownHallLevel();

    if (building.type === 'town_hall') {
      if (nextLvl > 12) return { ok: false, reason: 'MAX_TOWN_HALL' };
    } else {
      if (nextLvl > thLvl) {
        return { ok: false, reason: 'TOWN_HALL_CAP', requiredTH: nextLvl };
      }
      if (nextLvl > 12) return { ok: false, reason: 'MAX_LEVEL' };
    }

    if (this.freeBuilders <= 0) {
      return { ok: false, reason: 'NO_FREE_BUILDERS' };
    }

    const cost = this.getUpgradeCost(building);
    if (!this.economy.deduct(cost)) {
      return { ok: false, reason: 'INSUFFICIENT_RESOURCES' };
    }

    const duration = this.getBuildTime(building.type, nextLvl);
    const task = {
      id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      building,
      targetLevel: nextLvl,
      remaining: duration,
      total: duration,
      onComplete
    };

    this.activeBuildTasks.push(task);
    building.isUnderConstruction = true;
    building.buildTask = task;

    if (this.assetFactory && this.assetFactory.createConstructionHammer) {
      const hammer = this.assetFactory.createConstructionHammer();
      hammer.position.set(building.gx * this.tileSize, 5.8, building.gz * this.tileSize);
      this.buildingGroup.add(hammer);
      building.constructionMesh = hammer;
    }

    if (this.onBuildersChanged) this.onBuildersChanged();
    return { ok: true, duration, task };
  }

  completeConstruction(task) {
    const building = task.building;
    const nextLvl = task.targetLevel;

    building.level = nextLvl;
    const worldPos = building.mesh.position.clone();
    const worldRot = building.mesh.rotation.y;

    this.buildingGroup.remove(building.mesh);
    if (building.constructionMesh) {
      this.buildingGroup.remove(building.constructionMesh);
      building.constructionMesh = null;
    }

    let newMesh = null;
    if (building.type === 'town_hall') {
      newMesh = this.assetFactory.createTownHall(Math.min(3, nextLvl));
    } else if (building.type === 'lumber_mill') {
      newMesh = this.assetFactory.createLumberMill(Math.min(3, nextLvl));
    } else if (building.type === 'iron_foundry') {
      newMesh = this.assetFactory.createIronFoundry(Math.min(3, nextLvl));
    } else if (building.type === 'cash_mint') {
      newMesh = this.assetFactory.createCashMint(Math.min(3, nextLvl));
    } else if (building.type === 'police_station') {
      newMesh = this.assetFactory.createPoliceStation(Math.min(3, nextLvl));
    } else if (building.type === 'builder_hut') {
      newMesh = this.assetFactory.createBuilderHut(Math.min(3, nextLvl));
    } else {
      newMesh = this.assetFactory.createTownHall(Math.min(3, nextLvl));
    }

    newMesh.position.copy(worldPos);
    newMesh.rotation.y = worldRot;
    this.buildingGroup.add(newMesh);
    building.mesh = newMesh;

    const def = this.catalog[building.type] || { maxHp: 500 };
    const hpMult = 1.0 + (nextLvl - 1) * 0.55;
    building.maxHp = Math.round(def.maxHp * hpMult);
    building.hp = building.maxHp;

    if (building.produceRate) {
      building.produceRate *= 1.35;
      building.maxCapacity = Math.round(building.maxCapacity * 1.4);
    }

    building.isUnderConstruction = false;
    building.buildTask = null;

    if (task.onComplete) task.onComplete(building);
    if (this.onConstructionFinished) this.onConstructionFinished(building);
    if (this.onBuildersChanged) this.onBuildersChanged();
  }

  finishConstructionInstantly(building) {
    const task = this.activeBuildTasks.find(t => t.building === building);
    if (task) {
      this.completeConstruction(task);
      const idx = this.activeBuildTasks.indexOf(task);
      if (idx >= 0) this.activeBuildTasks.splice(idx, 1);
      return true;
    }
    return false;
  }

  getUpgradeCost(building) {
    const base = this.catalog[building.type]?.cost || { cash: 100, iron: 50, wood: 50 };
    const mult = Math.pow(1.7, (building.level || 1));
    return {
      cash: Math.round(base.cash * mult),
      iron: Math.round(base.iron * mult),
      wood: Math.round(base.wood * mult)
    };
  }

  // Collect harvestable resources from factory (Tap-to-collect Clash of Clans style)
  collectBuilding(building) {
    if (!building || !building.produceType || (building.stored || 0) <= 0) return null;

    const amount = Math.floor(building.stored);
    const type = building.produceType;
    this.economy.collectFromBuilding(type, amount);

    building.stored = 0;

    // Remove 3D floating bubble
    if (building.bubbleMesh) {
      this.buildingGroup.remove(building.bubbleMesh);
      building.bubbleMesh = null;
    }

    return {
      type,
      amount,
      building
    };
  }

  // Stow an existing placed building back into player's Construction Inventory
  stowBuilding(building) {
    if (!building || building.isMainGate || building.type === 'town_hall') return false;
    this.economy.addToInventory(building.type, 1);
    this.removeBuilding(building);
    return true;
  }

  removeBuilding(building) {
    const idx = this.buildings.indexOf(building);
    if (idx !== -1) {
      if (building.mesh) {
        this.buildingGroup.remove(building.mesh);
      }
      if (building.bubbleMesh) {
        this.buildingGroup.remove(building.bubbleMesh);
        building.bubbleMesh = null;
      }
      this.buildings.splice(idx, 1);
    }
  }

  clearAll() {
    this.buildings.forEach(b => {
      if (b.mesh) this.buildingGroup.remove(b.mesh);
      if (b.bubbleMesh) this.buildingGroup.remove(b.bubbleMesh);
    });
    this.buildings = [];
    this.roadNetwork.clear();
  }

  getMainGates() {
    return this.buildings.filter(b => b.isMainGate);
  }

  getPoliceStations() {
    return this.buildings.filter(b => b.spawnsPolice && !b.isDestroyed);
  }

  update(delta, elapsed) {
    // 1. Process active builder tasks (construction/upgrade timers & hammer animation)
    for (let i = this.activeBuildTasks.length - 1; i >= 0; i--) {
      const task = this.activeBuildTasks[i];
      task.remaining -= delta;

      if (task.building.constructionMesh) {
        task.building.constructionMesh.rotation.y += delta * 1.6;
        task.building.constructionMesh.rotation.z = Math.sin(elapsed * 9) * 0.45;
        task.building.constructionMesh.position.y = 5.8 + Math.sin(elapsed * 4) * 0.25;
      }

      if (task.remaining <= 0) {
        this.completeConstruction(task);
        this.activeBuildTasks.splice(i, 1);
      }
    }

    // 2. Run any mesh animation callbacks (e.g. spinning sawmill blade, flashing precinct beacons)
    this.buildings.forEach(b => {
      if (b.mesh && b.mesh.userData && b.mesh.userData.animator) {
        b.mesh.userData.animator(delta, elapsed);
      }

      // 3. Resource Factory Internal Production & Floating 3D Collect Bubble
      if (b.produceType && !b.isDestroyed) {
        b.stored = Math.min(b.maxCapacity, (b.stored || 0) + b.produceRate * delta);

        // If harvestable amount >= 12, spawn/animate floating collect bubble
        if (b.stored >= 12) {
          if (!b.bubbleMesh) {
            const bubble = this.assetFactory.createResourceBubble(b.produceType);
            bubble.position.set(b.gx * this.tileSize, 5.0, b.gz * this.tileSize);
            bubble.userData.parentBuilding = b;
            this.buildingGroup.add(bubble);
            b.bubbleMesh = bubble;
          }

          // Gentle sine-wave bobbing up and down + subtle pulse
          const bobOffset = Math.sin(elapsed * 3.5 + b.gx * 0.8) * 0.4;
          b.bubbleMesh.position.y = 5.2 + bobOffset;
          const scale = 4.2 + Math.sin(elapsed * 3.5 + b.gx * 0.8) * 0.2;
          b.bubbleMesh.scale.set(scale, scale, 1.0);
        } else if (b.bubbleMesh && b.stored < 12) {
          this.buildingGroup.remove(b.bubbleMesh);
          b.bubbleMesh = null;
        }
      }
    });
  }
}
