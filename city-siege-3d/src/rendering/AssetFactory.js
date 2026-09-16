import * as THREE from 'three';

/**
 * AssetFactory - Generates procedural 3D low-poly stylized meshes for buildings,
 * vehicles, defenses, gates, and environmental props.
 */
export class AssetFactory {
  constructor() {
    this._initSharedMaterials();
  }

  _initSharedMaterials() {
    this.materials = {
      // Countryside / Wood
      woodDark: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 }),
      woodLight: new THREE.MeshStandardMaterial({ color: 0x9c7a4b, roughness: 0.8 }),
      logRoof: new THREE.MeshStandardMaterial({ color: 0x7a3e1d, roughness: 0.75 }),
      stone: new THREE.MeshStandardMaterial({ color: 0x787c82, roughness: 0.9 }),
      leaves: new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 }),
      leavesLight: new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.65 }),

      // Industrial / Suburb
      brickRed: new THREE.MeshStandardMaterial({ color: 0x9e382b, roughness: 0.8 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.85 }),
      ironDark: new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.7, roughness: 0.4 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x78909c, metalness: 0.8, roughness: 0.3 }),
      moltenIron: new THREE.MeshStandardMaterial({ color: 0xff5722, emissive: 0xff3d00, emissiveIntensity: 0.8 }),

      // Metropolis / Hi-tech
      cyberBlue: new THREE.MeshStandardMaterial({ color: 0x00bcd4, emissive: 0x00838f, emissiveIntensity: 0.6 }),
      neonCyan: new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.9 }),
      neonYellow: new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xfbc02d, emissiveIntensity: 0.8 }),
      neonRed: new THREE.MeshStandardMaterial({ color: 0xf44336, emissive: 0xd32f2f, emissiveIntensity: 0.85 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 }),

      // Police
      policeBlue: new THREE.MeshStandardMaterial({ color: 0x0d47a1, roughness: 0.5 }),
      policeWhite: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 }),
      policeBlack: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }),
      sirenRed: new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.0 }),
      sirenBlue: new THREE.MeshStandardMaterial({ color: 0x2979ff, emissive: 0x2979ff, emissiveIntensity: 1.0 }),

      // Vehicles & Props
      tireRubber: new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 }),
      carPaintRed: new THREE.MeshStandardMaterial({ color: 0xd32f2f, metalness: 0.5, roughness: 0.3 }),
      carGlass: new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.1, transparent: true, opacity: 0.85 }),
      headlight: new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xfff59d, emissiveIntensity: 0.9 }),
      taillight: new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xd50000, emissiveIntensity: 0.8 }),
      hazardStripe: new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.5 }),
      gasRed: new THREE.MeshStandardMaterial({ color: 0xd50000, roughness: 0.4 }),

      // Road
      asphalt: new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.92 }),
      dirtRoad: new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.95 }),
      roadLine: new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.6 }),
      sidewalk: new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.85 })
    };
  }

  // --- BUILDINGS ---

  createTownHall(level = 1) {
    const group = new THREE.Group();
    group.name = `townhall_lvl${level}`;

    if (level === 1) {
      // Rustic Log Cabin / Countryside Estate
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.2, 3.8), this.materials.woodDark);
      base.position.y = 1.1;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      // Slanted Roof
      const roofGeo = new THREE.ConeGeometry(3.6, 2.0, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeo, this.materials.logRoof);
      roof.position.y = 3.2;
      roof.scale.set(1.1, 1, 0.95);
      roof.castShadow = true;
      group.add(roof);

      // Stone Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.2, 0.7), this.materials.stone);
      chimney.position.set(1.4, 2.5, 0.9);
      chimney.castShadow = true;
      group.add(chimney);

      // Porch / Wooden Pillars
      const porch = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.2), this.materials.woodLight);
      porch.position.set(0, 0.1, 2.4);
      group.add(porch);
    } else if (level === 2) {
      // Brick Administrative Mansion / Clocktower
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 4.2), this.materials.brickRed);
      base.position.y = 1.6;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      // Tower
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 2.0), this.materials.concrete);
      tower.position.set(0, 4.6, 0);
      tower.castShadow = true;
      group.add(tower);

      // Clock face
      const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), this.materials.policeWhite);
      clock.rotation.x = Math.PI / 2;
      clock.position.set(0, 5.2, 1.05);
      group.add(clock);

      // Tower Roof
      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.8, 4), this.materials.ironDark);
      towerRoof.position.y = 7.1;
      towerRoof.rotation.y = Math.PI / 4;
      group.add(towerRoof);
    } else {
      // Tier 3 Cyber / Metropolis Armored HQ
      const tower1 = new THREE.Mesh(new THREE.BoxGeometry(5.0, 6.5, 4.5), this.materials.ironDark);
      tower1.position.y = 3.25;
      tower1.castShadow = true;
      group.add(tower1);

      // Glass and Neon core
      const glassCore = new THREE.Mesh(new THREE.BoxGeometry(3.8, 4.0, 3.8), this.materials.cyberBlue);
      glassCore.position.y = 7.5;
      group.add(glassCore);

      // Helipad on roof
      const helipad = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 16), this.materials.concrete);
      helipad.position.y = 9.6;
      group.add(helipad);

      const hLetter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.3), this.materials.neonYellow);
      hLetter.position.y = 9.8;
      group.add(hLetter);

      // Communication Spire
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 4.0, 8), this.materials.steel);
      spire.position.set(1.5, 11.5, -1.5);
      group.add(spire);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), this.materials.neonCyan);
      beacon.position.set(1.5, 13.5, -1.5);
      group.add(beacon);
    }

    return group;
  }

  // --- RESOURCE FACTORIES ---

  createLumberMill(level = 1) {
    const group = new THREE.Group();
    group.name = `lumbermill_lvl${level}`;

    // Wooden shed
    const shed = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 3.2), this.materials.woodDark);
    shed.position.y = 1.0;
    shed.castShadow = true;
    group.add(shed);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.4, 4), this.materials.logRoof);
    roof.position.y = 2.7;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // Log Piles
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.5, 8), this.materials.woodLight);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0.3 + i * 0.35, 2.2);
      group.add(log);
    }

    // Circular Saw Blade
    const saw = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 16), this.materials.steel);
    saw.rotation.x = Math.PI / 2;
    saw.position.set(-1.9, 0.8, 0.5);
    group.add(saw);
    group.userData.animator = (delta) => {
      saw.rotation.z += delta * 15;
    };

    return group;
  }

  createIronFoundry(level = 1) {
    const group = new THREE.Group();
    group.name = `ironfoundry_lvl${level}`;

    // Heavy Foundry base
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.4, 3.6), this.materials.ironDark);
    base.position.y = 1.2;
    base.castShadow = true;
    group.add(base);

    // Twin Smokestacks
    for (let x of [-1.1, 1.1]) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 3.6, 12), this.materials.stone);
      stack.position.set(x, 3.6, -0.6);
      stack.castShadow = true;
      group.add(stack);
    }

    // Glowing Molten Crucible / Vat
    const vat = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 0.8, 12), this.materials.steel);
    vat.position.set(0, 0.4, 1.6);
    group.add(vat);

    const molten = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 12), this.materials.moltenIron);
    molten.position.set(0, 0.8, 1.6);
    group.add(molten);

    return group;
  }

  createCashMint(level = 1) {
    const group = new THREE.Group();
    group.name = `cashmint_lvl${level}`;

    // Modern Bank / Vault Building
    const building = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 3.8), this.materials.concrete);
    building.position.y = 1.4;
    building.castShadow = true;
    group.add(building);

    // Golden Pillars
    for (let x of [-1.6, -0.5, 0.5, 1.6]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 8), this.materials.gold);
      pillar.position.set(x, 1.4, 2.0);
      group.add(pillar);
    }

    // Vault Door
    const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 16), this.materials.steel);
    vaultDoor.rotation.x = Math.PI / 2;
    vaultDoor.position.set(0, 1.2, 1.95);
    group.add(vaultDoor);

    // Golden Dollar sign or Roof emblem
    const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.15, 8, 16), this.materials.gold);
    emblem.position.set(0, 3.6, 0);
    group.add(emblem);

    return group;
  }

  createBuilderHut(level = 1) {
    const group = new THREE.Group();
    group.name = `builderhut_lvl${level}`;

    // Workshop Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 2.8), this.materials.woodLight);
    cabin.position.y = 1.0;
    cabin.castShadow = true;
    group.add(cabin);

    // Pitched Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 4), this.materials.logRoof);
    roof.position.y = 2.6;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // Workbench outside
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.7), this.materials.woodDark);
    bench.position.set(0, 0.35, 1.8);
    group.add(bench);

    // Steel Anvil on bench
    const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), this.materials.steel);
    anvil.position.set(0.3, 0.85, 1.8);
    group.add(anvil);

    // Little Animated Builder Character!
    const builderGroup = new THREE.Group();
    builderGroup.position.set(-0.5, 0, 1.8);

    // Body (Blue Overalls)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.25), this.materials.policeBlue);
    body.position.y = 0.45;
    builderGroup.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.materials.woodLight);
    head.position.y = 0.8;
    builderGroup.add(head);

    // Yellow Safety Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), this.materials.neonYellow);
    helmet.position.y = 0.88;
    builderGroup.add(helmet);

    // Hammer Arm
    const hammerArm = new THREE.Group();
    hammerArm.position.set(0.2, 0.55, 0);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), this.materials.woodLight);
    arm.position.y = -0.1;
    hammerArm.add(arm);

    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.1), this.materials.steel);
    hammerHead.position.set(0, -0.25, 0.08);
    hammerArm.add(hammerHead);

    builderGroup.add(hammerArm);
    group.add(builderGroup);

    // Animate the worker hammering!
    group.userData.animator = (delta, elapsed) => {
      hammerArm.rotation.x = Math.sin(elapsed * 8) * 0.7 - 0.3;
    };

    return group;
  }

  // --- PETROL PUMP (Explosive Hazard!) ---

  createPetrolPump() {
    const group = new THREE.Group();
    group.name = 'petrol_pump';
    group.userData.isExplosive = true;

    // Station Canopy
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 4.2), this.materials.policeWhite);
    roof.position.y = 2.8;
    roof.castShadow = true;
    group.add(roof);

    const roofDecal = new THREE.Mesh(new THREE.BoxGeometry(4.85, 0.2, 4.25), this.materials.gasRed);
    roofDecal.position.y = 2.8;
    group.add(roofDecal);

    // Support Columns
    for (let x of [-1.8, 1.8]) {
      for (let z of [-1.4, 1.4]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 8), this.materials.steel);
        pole.position.set(x, 1.4, z);
        group.add(pole);
      }
    }

    // Fuel Dispenser Island
    const island = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 2.6), this.materials.concrete);
    island.position.y = 0.1;
    group.add(island);

    // 2 Fuel Pumps
    for (let z of [-0.6, 0.6]) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.6), this.materials.gasRed);
      pump.position.set(0, 0.8, z);
      pump.castShadow = true;
      group.add(pump);

      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.35, 0.3), this.materials.policeWhite);
      screen.position.set(0, 1.1, z);
      group.add(screen);
    }

    // Explosive Fuel Storage Tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 16), this.materials.gasRed);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(0, 0.8, -2.4);
    tank.castShadow = true;
    group.add(tank);

    const hazardBadge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), this.materials.hazardStripe);
    hazardBadge.rotation.x = Math.PI / 4;
    hazardBadge.position.set(1.15, 0.8, -2.4);
    group.add(hazardBadge);

    // Neon Gas Sign
    const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.2, 8), this.materials.ironDark);
    signPole.position.set(2.6, 2.1, 1.8);
    group.add(signPole);

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.15), this.materials.neonYellow);
    signBoard.position.set(2.6, 3.8, 1.8);
    group.add(signBoard);

    return group;
  }

  // --- POLICE STATION ---

  createPoliceStation(level = 1) {
    const group = new THREE.Group();
    group.name = 'police_station';
    group.userData.spawnsPolice = true;

    // Main Precinct Building
    const building = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 4.2), this.materials.policeBlue);
    building.position.y = 1.6;
    building.castShadow = true;
    group.add(building);

    // White Trim Band
    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.4, 4.3), this.materials.policeWhite);
    trim.position.y = 2.4;
    group.add(trim);

    // Garage Bay Door
    const garage = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.1), this.materials.ironDark);
    garage.position.set(0, 0.9, 2.15);
    group.add(garage);

    // Rooftop Radar & Communication Antenna
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.1, 0.3, 12), this.materials.steel);
    dish.rotation.x = 0.5;
    dish.position.set(1.4, 3.6, 0.8);
    group.add(dish);

    // Emergency Flashing Beacons
    const beaconRed = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), this.materials.sirenRed);
    beaconRed.position.set(-1.2, 3.35, 1.4);
    group.add(beaconRed);

    const beaconBlue = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), this.materials.sirenBlue);
    beaconBlue.position.set(1.2, 3.35, 1.4);
    group.add(beaconBlue);

    group.userData.beacons = [beaconRed, beaconBlue];
    group.userData.animator = (delta, elapsed) => {
      const flash = Math.sin(elapsed * 12) > 0;
      beaconRed.material.emissiveIntensity = flash ? 2.0 : 0.2;
      beaconBlue.material.emissiveIntensity = flash ? 0.2 : 2.0;
    };

    return group;
  }

  // --- MAIN GATES (At least 3 Fortified Gates: North, East, South) ---

  createMainGate(gateName = 'North Gate', rotation = 0) {
    const group = new THREE.Group();
    group.name = `main_gate_${gateName.toLowerCase().replace(' ', '_')}`;
    group.userData.isMainGate = true;
    group.userData.gateName = gateName;
    group.userData.isBreached = false;
    group.userData.hp = 600;
    group.userData.maxHp = 600;

    // Left Pillar
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.2, 1.6), this.materials.concrete);
    pillarL.position.set(-3.2, 2.6, 0);
    pillarL.castShadow = true;
    group.add(pillarL);

    // Right Pillar
    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5.2, 1.6), this.materials.concrete);
    pillarR.position.set(3.2, 2.6, 0);
    pillarR.castShadow = true;
    group.add(pillarR);

    // Top Cross Arch
    const arch = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.2, 1.8), this.materials.ironDark);
    arch.position.set(0, 5.0, 0);
    arch.castShadow = true;
    group.add(arch);

    // Signboard on Arch
    const sign = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.6, 0.2), this.materials.policeWhite);
    sign.position.set(0, 5.0, 0.95);
    group.add(sign);

    // Gate Steel Hydraulic Doors (Breachable!)
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.8, 0.4), this.materials.steel);
    doorL.position.set(-1.2, 1.9, 0);
    doorL.castShadow = true;
    group.add(doorL);

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.8, 0.4), this.materials.steel);
    doorR.position.set(1.2, 1.9, 0);
    doorR.castShadow = true;
    group.add(doorR);

    group.userData.doors = [doorL, doorR];

    // Hazard Stripes at Base
    const hazardL = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.8, 1.7), this.materials.hazardStripe);
    hazardL.position.set(-3.2, 0.4, 0);
    group.add(hazardL);

    const hazardR = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.8, 1.7), this.materials.hazardStripe);
    hazardR.position.set(3.2, 0.4, 0);
    group.add(hazardR);

    // Automated Defensive Turret atop Pillars
    for (let x of [-3.2, 3.2]) {
      const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.4, 12), this.materials.ironDark);
      turretBase.position.set(x, 5.4, 0);
      group.add(turretBase);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8), this.materials.steel);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(x, 5.7, 0.6);
      group.add(barrel);
    }

    group.rotation.y = rotation;
    return group;
  }

  // --- DEFENSIVE TRAPS & ROADBLOCKS ---

  createSpikeTrap() {
    const group = new THREE.Group();
    group.name = 'spike_trap';
    group.userData.isTrap = true;

    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 2.0), this.materials.ironDark);
    basePlate.position.y = 0.05;
    group.add(basePlate);

    // Metal Spikes
    for (let x = -1.2; x <= 1.2; x += 0.6) {
      for (let z = -0.6; z <= 0.6; z += 0.6) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), this.materials.steel);
        spike.position.set(x, 0.35, z);
        group.add(spike);
      }
    }
    return group;
  }

  createRoadblock() {
    const group = new THREE.Group();
    group.name = 'roadblock_barrier';
    group.userData.isRoadblock = true;
    group.userData.hp = 180;

    // Concrete Jersey Barrier with hazard stripes
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 0.8), this.materials.concrete);
    barrier.position.y = 0.55;
    barrier.castShadow = true;
    group.add(barrier);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.35, 0.85), this.materials.hazardStripe);
    stripe.position.y = 0.55;
    group.add(stripe);

    return group;
  }

  // --- VEHICLES ---

  createAttackVehicle() {
    const group = new THREE.Group();
    group.name = 'player_attack_vehicle';

    // Main Armored Chassis (Slimmed to 1.4m width for agile road driving)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 3.8), this.materials.carPaintRed);
    chassis.position.y = 0.65;
    chassis.castShadow = true;
    group.add(chassis);

    // Cabin / Rollcage
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 1.8), this.materials.ironDark);
    cabin.position.set(0, 1.15, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.1), this.materials.carGlass);
    windshield.position.set(0, 1.15, 0.75);
    windshield.rotation.x = -0.35;
    group.add(windshield);

    // Heavy Ramming Front Bullbar
    const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.4), this.materials.ironDark);
    bullbar.position.set(0, 0.55, 2.0);
    bullbar.castShadow = true;
    group.add(bullbar);

    // Twin Roof Missile Pods
    const podL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 1.2), this.materials.ironDark);
    podL.position.set(-0.45, 1.5, -0.1);
    group.add(podL);

    const podR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 1.2), this.materials.ironDark);
    podR.position.set(0.45, 1.5, -0.1);
    group.add(podR);

    // Missile Heads (Emissive)
    const missileHeadL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 8), this.materials.neonRed);
    missileHeadL.rotation.x = Math.PI / 2;
    missileHeadL.position.set(-0.45, 1.5, 0.6);
    group.add(missileHeadL);

    const missileHeadR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 8), this.materials.neonRed);
    missileHeadR.rotation.x = Math.PI / 2;
    missileHeadR.position.set(0.45, 1.5, 0.6);
    group.add(missileHeadR);

    // Rear Rocket Thruster Nozzles (Booster / Nitro)
    const thrusterL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.4, 12), this.materials.steel);
    thrusterL.rotation.x = Math.PI / 2;
    thrusterL.position.set(-0.35, 0.6, -1.95);
    group.add(thrusterL);

    const thrusterR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.4, 12), this.materials.steel);
    thrusterR.rotation.x = Math.PI / 2;
    thrusterR.position.set(0.35, 0.6, -1.95);
    group.add(thrusterR);

    // Flame meshes for Nitro (toggleable visibility)
    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 8), this.materials.neonCyan);
    flameL.rotation.x = -Math.PI / 2;
    flameL.position.set(-0.35, 0.6, -2.5);
    flameL.visible = false;
    group.add(flameL);

    const flameR = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 8), this.materials.neonCyan);
    flameR.rotation.x = -Math.PI / 2;
    flameR.position.set(0.35, 0.6, -2.5);
    flameR.visible = false;
    group.add(flameR);

    group.userData.flames = [flameL, flameR];

    // Headlights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.1), this.materials.headlight);
    hlL.position.set(-0.5, 0.65, 1.95);
    group.add(hlL);

    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.1), this.materials.headlight);
    hlR.position.set(0.5, 0.65, 1.95);
    group.add(hlR);

    // 4 Rugged Tires (Slimmer track)
    const wheels = [];
    const wheelPositions = [
      [-0.8, 0.45, 1.2],
      [0.8, 0.45, 1.2],
      [-0.8, 0.5, -1.2],
      [0.8, 0.5, -1.2]
    ];

    wheelPositions.forEach((pos, idx) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(...pos);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), this.materials.tireRubber);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.31, 8), this.materials.steel);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      group.add(wheelGroup);
      wheels.push(wheelGroup);
    });

    group.userData.wheels = wheels;
    return group;
  }

  // --- 3D TACTICAL GATE HOLOGRAPHIC BEACON ---

  createGateBeacon(name = 'North Gate') {
    const group = new THREE.Group();
    group.name = `beacon_${name.toLowerCase().replace(' ', '_')}`;

    // Vertical Holographic Light Pillar
    const beamGeo = new THREE.CylinderGeometry(0.8, 1.6, 28, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 14;
    group.add(beam);

    // Rotating Concentric Energy Rings
    const ring1Geo = new THREE.TorusGeometry(3.5, 0.15, 8, 24);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 10;
    group.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.4, 0.15, 8, 24);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xff1744, wireframe: true });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 14;
    group.add(ring2);

    // Floating Neon Target Diamond
    const diamondGeo = new THREE.OctahedronGeometry(1.4, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xffeb3b,
      emissive: 0xffa000,
      emissiveIntensity: 1.2
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 20;
    group.add(diamond);

    // Floating Billboard Banner for Gate Name
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(10, 20, 35, 0.85)';
    ctx.roundRect(10, 10, 492, 108, 24);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00e5ff';
    ctx.stroke();

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`⛩️ ${name.toUpperCase()}`, 256, 54);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#ff1744';
    ctx.fillText('⚡ TAP TO BREACH HERE ⚡', 256, 92);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 4, 1);
    sprite.position.y = 25;
    group.add(sprite);

    // Ground Target Circle
    const groundRingGeo = new THREE.RingGeometry(2.5, 3.2, 32);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.15;
    group.add(groundRing);

    group.userData.animator = (delta, elapsed) => {
      ring1.rotation.z += delta * 1.5;
      ring2.rotation.z -= delta * 2.0;
      diamond.rotation.y += delta * 2.2;
      diamond.position.y = 20 + Math.sin(elapsed * 3) * 1.2;
      const pulse = Math.sin(elapsed * 5) * 0.2 + 0.8;
      groundRing.scale.setScalar(pulse);
    };

    return group;
  }

  createPoliceVehicle() {
    const group = new THREE.Group();
    group.name = 'police_cruiser';
    group.userData.isPolice = true;
    group.userData.hp = 140;

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 3.6), this.materials.policeBlack);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // White Police Doors & Roof
    const whiteSection = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.45, 1.6), this.materials.policeWhite);
    whiteSection.position.set(0, 0.7, 0);
    group.add(whiteSection);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.8), this.materials.carGlass);
    cabin.position.set(0, 1.1, -0.1);
    group.add(cabin);

    // Push Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.3), this.materials.ironDark);
    bumper.position.set(0, 0.5, 1.85);
    group.add(bumper);

    // Lightbar Base
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.25), this.materials.ironDark);
    barBase.position.set(0, 1.42, -0.1);
    group.add(barBase);

    // Red & Blue Emergency Strobes
    const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.2), this.materials.sirenRed);
    redLight.position.set(-0.3, 1.48, -0.1);
    group.add(redLight);

    const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.2), this.materials.sirenBlue);
    blueLight.position.set(0.3, 1.48, -0.1);
    group.add(blueLight);

    group.userData.redLight = redLight;
    group.userData.blueLight = blueLight;

    // Wheels
    const wheels = [];
    const wheelPositions = [
      [-1.0, 0.38, 1.1],
      [1.0, 0.38, 1.1],
      [-1.0, 0.38, -1.1],
      [1.0, 0.38, -1.1]
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.25, 16), this.materials.tireRubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
    });

    group.userData.wheels = wheels;
    return group;
  }

  // --- PROPS & NATURE ---

  createPineTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.6, 8), this.materials.woodDark);
    trunk.position.y = 0.8;
    trunk.castShadow = true;
    group.add(trunk);

    const levels = [
      { r: 1.4, h: 1.5, y: 1.8 },
      { r: 1.1, h: 1.3, y: 2.6 },
      { r: 0.7, h: 1.1, y: 3.3 }
    ];

    levels.forEach(lvl => {
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(lvl.r, lvl.h, 7), this.materials.leaves);
      foliage.position.y = lvl.y;
      foliage.castShadow = true;
      group.add(foliage);
    });

    return group;
  }

  createStreetLight() {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.0, 8), this.materials.steel);
    pole.position.y = 2.0;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2), this.materials.steel);
    arm.position.set(0, 3.9, 0.5);
    group.add(arm);

    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.4), this.materials.headlight);
    lamp.position.set(0, 3.8, 1.0);
    group.add(lamp);

    return group;
  }

  // --- FLOATING 3D RESOURCE HARVEST BUBBLE (Clash of Clans style) ---

  createResourceBubble(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Color theme based on resource type
    let primaryColor = '#ffd700'; // Cash
    let glowColor = 'rgba(255, 215, 0, 0.45)';
    let icon = '💰';

    if (type === 'wood') {
      primaryColor = '#8bc34a';
      glowColor = 'rgba(139, 195, 74, 0.45)';
      icon = '🪵';
    } else if (type === 'iron') {
      primaryColor = '#00e5ff';
      glowColor = 'rgba(0, 229, 255, 0.45)';
      icon = '⚙️';
    }

    // Outer glow aura
    const gradGlow = ctx.createRadialGradient(128, 128, 60, 128, 128, 120);
    gradGlow.addColorStop(0, glowColor);
    gradGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradGlow;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    // Bubble Body (Glass Circle)
    ctx.beginPath();
    ctx.arc(128, 128, 76, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12, 22, 36, 0.92)';
    ctx.fill();

    // High-tech Border Ring
    ctx.lineWidth = 8;
    ctx.strokeStyle = primaryColor;
    ctx.stroke();

    // Inner highlight rim
    ctx.beginPath();
    ctx.arc(128, 128, 66, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    // Resource Emoji Icon
    ctx.font = '82px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 128, 126);

    // "COLLECT" badge at bottom
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(64, 182, 128, 30, 12);
    ctx.fill();

    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#06101c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COLLECT', 128, 197);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4.2, 4.2, 1.0);
    sprite.renderOrder = 999;
    sprite.userData = {
      isResourceBubble: true,
      resourceType: type,
      baseScale: 4.2
    };

    return sprite;
  }

  createConstructionHammer() {
    const group = new THREE.Group();
    group.name = 'construction_hammer';

    // Wooden handle
    const handleGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8);
    const handle = new THREE.Mesh(handleGeo, this.materials.woodDark);
    handle.position.y = 1.0;
    handle.castShadow = true;
    group.add(handle);

    // Steel hammerhead
    const headGeo = new THREE.BoxGeometry(0.85, 0.65, 1.4);
    const head = new THREE.Mesh(headGeo, this.materials.ironDark);
    head.position.set(0, 2.0, 0.2);
    head.castShadow = true;
    group.add(head);

    // Yellow warning marker band
    const bandGeo = new THREE.BoxGeometry(0.9, 0.2, 0.9);
    const band = new THREE.Mesh(bandGeo, this.materials.hazardStripe);
    band.position.set(0, 2.0, 0.2);
    group.add(band);

    return group;
  }
}
