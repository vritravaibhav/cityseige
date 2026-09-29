import * as THREE from 'three';

export function createDroneHangar(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'drone_hangar';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  const hangarW = [5.0, 5.8, 6.4, 7.2, 7.8, 8.4][lvl - 1];
  const hangarD = [3.4, 3.8, 4.2, 4.6, 5.0, 5.4][lvl - 1];
  const hangarH = [1.5, 1.7, 1.9, 2.1, 2.3, 2.5][lvl - 1];
  const droneCount = [2, 3, 3, 4, 4, 5][lvl - 1];

  const apronT = 0.12;
  const apron = new THREE.Mesh(new THREE.BoxGeometry(hangarW + 0.9, apronT, hangarD + 0.9), M.asphalt);
  apron.position.y = apronT / 2;
  apron.receiveShadow = true;
  group.add(apron);

  const shell = new THREE.Mesh(new THREE.BoxGeometry(hangarW, hangarH, hangarD), M.concrete);
  shell.position.y = apronT + hangarH / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  const deckT = 0.2;
  const deckW = hangarW + 0.3;
  const deckD = hangarD + 0.3;
  const deckTop = apronT + hangarH + deckT;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, deckT, deckD), M.concrete);
  deck.position.y = deckTop - deckT / 2;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  const bayX = -hangarW * 0.12;
  const bayZ = -hangarD * 0.36;
  const bayW = hangarW * 0.42;
  const bayD = hangarD * 0.24;

  const doorH = hangarH * 0.72;
  const door = new THREE.Mesh(new THREE.BoxGeometry(bayW, doorH, 0.14), M.steel);
  door.position.set(bayX, apronT + doorH / 2, -hangarD / 2 - 0.07);
  door.castShadow = true;
  group.add(door);

  const doorTrim = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.16, 0.06), M.hazardStripe);
  doorTrim.position.set(bayX, apronT + 0.08, -hangarD / 2 - 0.16);
  group.add(doorTrim);

  const ribCount = 3 + lvl;
  for (let i = 0; i < ribCount; i++) {
    const x = -hangarW / 2 + (hangarW * (i + 0.5)) / ribCount;
    for (const s of [-1, 1]) {
      if (s < 0 && Math.abs(x - bayX) < bayW / 2 + 0.25) continue;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, hangarH * 0.86, 0.08), M.steel);
      rib.position.set(x, apronT + hangarH * 0.43, s * (hangarD / 2 + 0.04));
      group.add(rib);
    }
  }

  const bay = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.16, bayD), M.ironDark);
  bay.position.set(bayX, deckTop - 0.12, bayZ);
  group.add(bay);

  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, bayD * 1.1), M.steel);
    rail.position.set(bayX + s * (bayW / 2 + 0.1), deckTop + 0.045, bayZ);
    group.add(rail);
  }

  const panelD = bayD * 0.58;
  const panelZ = bayZ + bayD * 0.24;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(bayW + 0.16, 0.12, panelD), M.steel);
  panel.position.set(bayX, deckTop + 0.06, panelZ);
  panel.castShadow = true;
  group.add(panel);

  const panelRib = new THREE.Mesh(new THREE.BoxGeometry(bayW + 0.2, 0.1, 0.12), M.ironDark);
  panelRib.position.set(bayX, deckTop + 0.13, panelZ + panelD / 2);
  group.add(panelRib);

  const padZ = hangarD * 0.13;
  const padR = Math.min(hangarW * 0.25, hangarD * 0.29);

  const pad = new THREE.Mesh(new THREE.CircleGeometry(padR, 16), M.roadLine);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, deckTop + 0.012, padZ);
  pad.receiveShadow = true;
  group.add(pad);

  const padInner = new THREE.Mesh(new THREE.CircleGeometry(padR * 0.82, 16), M.asphalt);
  padInner.rotation.x = -Math.PI / 2;
  padInner.position.set(0, deckTop + 0.022, padZ);
  padInner.receiveShadow = true;
  group.add(padInner);

  const markW = padR * 0.16;
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(markW, 0.03, padR * 0.9), M.roadLine);
    bar.position.set(s * padR * 0.28, deckTop + 0.035, padZ);
    group.add(bar);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(padR * 0.56, 0.03, markW), M.roadLine);
  cross.position.set(0, deckTop + 0.035, padZ);
  group.add(cross);

  if (lvl >= 2) {
    const parapetH = 0.26;
    const edges = [
      { w: deckW, d: 0.14, x: 0, z: -deckD / 2 + 0.07 },
      { w: deckW, d: 0.14, x: 0, z: deckD / 2 - 0.07 },
      { w: 0.14, d: deckD, x: -deckW / 2 + 0.07, z: 0 },
      { w: 0.14, d: deckD, x: deckW / 2 - 0.07, z: 0 }
    ];
    edges.forEach(e => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(e.w, parapetH, e.d), M.steel);
      wall.position.set(e.x, deckTop + parapetH / 2, e.z);
      wall.castShadow = true;
      group.add(wall);
    });

    const service = new THREE.Mesh(new THREE.BoxGeometry(0.1, hangarH * 0.6, 0.8), M.cyberBlue);
    service.position.set(hangarW / 2 + 0.05, apronT + hangarH * 0.3, hangarD * 0.2);
    group.add(service);

    for (let i = -1; i <= 1; i++) {
      const chev = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.22, 0.04, 0.16), M.hazardStripe);
      chev.position.set(bayX + i * bayW * 0.3, apronT + 0.02, -hangarD / 2 - 0.16);
      chev.rotation.y = 0.5;
      group.add(chev);
    }
  }

  const beaconMat = lvl >= 3 ? M.neonRed.clone() : null;
  let radar = null;

  if (lvl >= 3) {
    const mastH = 0.9 + lvl * 0.12;
    const mastX = -hangarW * 0.34;
    const mastZ = hangarD * 0.3;

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, mastH, 6), M.steel);
    mast.position.set(mastX, deckTop + mastH / 2, mastZ);
    mast.castShadow = true;
    group.add(mast);

    radar = new THREE.Group();
    radar.position.set(mastX, deckTop + mastH, mastZ);
    group.add(radar);

    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.26, 10, 1, true), M.policeWhite);
    dish.rotation.x = Math.PI * 0.62;
    dish.position.set(0, 0.08, 0.16);
    dish.castShadow = true;
    radar.add(dish);

    const stub = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), M.ironDark);
    stub.position.set(0, 0.06, 0.04);
    radar.add(stub);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), beaconMat);
    beacon.position.set(mastX, deckTop + mastH + 0.24, mastZ);
    group.add(beacon);
  }

  if (lvl >= 4) {
    const towerH = [0.7, 0.9, 1.1][lvl - 4];
    const towerX = hangarW * 0.34;
    const towerZ = -hangarD * 0.26;
    const cabH = 0.75;
    const cabY = deckTop + towerH + cabH / 2;
    const capY = deckTop + towerH + cabH + 0.06;

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.9, towerH, 0.9), M.concrete);
    shaft.position.set(towerX, deckTop + towerH / 2, towerZ);
    shaft.castShadow = true;
    group.add(shaft);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, cabH, 1.5), M.ironDark);
    cab.position.set(towerX, cabY, towerZ);
    cab.castShadow = true;
    group.add(cab);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.56, cabH * 0.46, 1.56), M.carGlass);
    glass.position.set(towerX, cabY + 0.06, towerZ);
    group.add(glass);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.7), M.steel);
    cap.position.set(towerX, capY, towerZ);
    cap.castShadow = true;
    group.add(cap);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.3, 6), M.steel);
    antenna.position.set(towerX, capY + 0.21, towerZ);
    group.add(antenna);

    const towerBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), beaconMat);
    towerBeacon.position.set(towerX, capY + 0.42, towerZ);
    group.add(towerBeacon);
  }

  if (lvl >= 5) {
    for (const s of [-1, 1]) {
      const postH = 1.6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, postH, 6), M.ironDark);
      post.position.set(s * (hangarW / 2 + 0.3), apronT + postH / 2, -hangarD / 2 - 0.3);
      post.castShadow = true;
      group.add(post);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.2), M.ironDark);
      head.position.set(s * (hangarW / 2 + 0.3), apronT + postH + 0.1, -hangarD / 2 - 0.3);
      group.add(head);

      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.06), M.neonYellow);
      lens.position.set(s * (hangarW / 2 + 0.3), apronT + postH + 0.1, -hangarD / 2 - 0.42);
      group.add(lens);
    }
  }

  if (lvl >= 6) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(padR + 0.07, 0.06, 6, 16), M.gold);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(0, deckTop + 0.05, padZ);
    group.add(rim);

    const gantry = new THREE.Mesh(new THREE.BoxGeometry(bayW + 0.5, 0.12, 0.16), M.steel);
    gantry.position.set(bayX, deckTop + 0.62, bayZ - bayD * 0.4);
    gantry.castShadow = true;
    group.add(gantry);

    for (const s of [-1, 1]) {
      const legX = bayX + s * (bayW / 2 + 0.22);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.12), M.steel);
      leg.position.set(legX, deckTop + 0.31, bayZ - bayD * 0.4);
      leg.castShadow = true;
      group.add(leg);
    }

    for (let i = -1; i <= 1; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.5), M.ironDark);
      vent.position.set(i * hangarW * 0.2, deckTop + 0.13, deckD / 2 - 0.55);
      vent.castShadow = true;
      group.add(vent);
    }
  }

  const drones = [];
  const rotors = [];
  const ringR = padR * (droneCount >= 5 ? 0.72 : droneCount >= 4 ? 0.64 : 0.58);

  for (let i = 0; i < droneCount; i++) {
    const a = (i * Math.PI * 2) / droneCount + Math.PI / 4;
    const dx = Math.cos(a) * ringR;
    const dz = padZ + Math.sin(a) * ringR;

    if (lvl >= 5) {
      const chargePad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12), M.neonYellow);
      chargePad.position.set(dx, deckTop + 0.04, dz);
      group.add(chargePad);
    }

    const drone = new THREE.Group();
    drone.position.set(dx, deckTop + 0.05, dz);
    drone.rotation.y = -a;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.38), M.ironDark);
    body.position.y = 0.18;
    body.castShadow = true;
    drone.add(body);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.26), M.cyberBlue);
    canopy.position.set(0, 0.29, 0.05);
    drone.add(canopy);

    const camera = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M.carGlass);
    camera.position.set(0, 0.1, 0.13);
    drone.add(camera);

    for (const s of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.34), M.steel);
      skid.position.set(s * 0.13, 0.05, 0);
      drone.add(skid);
    }

    for (let k = 0; k < 4; k++) {
      const arm = new THREE.Group();
      arm.rotation.y = (k * Math.PI) / 2 + Math.PI / 4;

      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.34), M.ironDark);
      boom.position.set(0, 0.18, 0.25);
      arm.add(boom);

      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), M.steel);
      motor.position.set(0, 0.22, 0.38);
      arm.add(motor);

      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12), M.policeBlack);
      rotor.position.set(0, 0.29, 0.38);
      arm.add(rotor);
      rotors.push(rotor);

      drone.add(arm);
    }

    drone.userData.restY = drone.position.y;
    drone.userData.phase = i * 1.3;
    drones.push(drone);
    group.add(drone);
  }

  group.userData.animator = (delta, elapsed) => {
    for (let i = 0; i < rotors.length; i++) rotors[i].rotation.y += delta * 26;
    for (let i = 0; i < drones.length; i++) {
      const d = drones[i];
      d.position.y = d.userData.restY + (Math.sin(elapsed * 2.1 + d.userData.phase) * 0.5 + 0.5) * 0.06;
    }
    if (radar) radar.rotation.y += delta * 0.9;
    if (beaconMat) beaconMat.emissiveIntensity = 0.6 + (Math.sin(elapsed * 5) * 0.5 + 0.5) * 1.4;
  };

  return group;
}
