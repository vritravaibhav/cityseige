import * as THREE from 'three';

export function createSpringTrap(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'spring_trap';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  const coilH = [0.42, 0.50, 0.58, 0.65, 0.72, 0.80][lvl - 1];
  const ringCount = [6, 7, 8, 8, 9, 10][lvl - 1];
  const plateR = [0.80, 0.90, 1.00, 1.10, 1.22, 1.34][lvl - 1];
  const plateT = [0.12, 0.13, 0.14, 0.15, 0.16, 0.16][lvl - 1];

  const baseTop = 0.14;
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.16, 3.1), M.hazardStripe);
  base.position.y = baseTop - 0.08;
  base.receiveShadow = true;
  group.add(base);

  if (lvl >= 2) {
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Group();
      pivot.position.y = baseTop + 0.02;
      pivot.rotation.y = (i * Math.PI) / 2;
      for (let j = -1; j <= 1; j++) {
        const chevron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.22), M.ironDark);
        chevron.position.set(j * 0.75, 0, 1.3);
        chevron.rotation.y = 0.6;
        pivot.add(chevron);
      }
      group.add(pivot);
    }
  }

  const collarH = 0.1;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(plateR * 0.62, plateR * 0.72, collarH, 12), M.ironDark);
  collar.position.y = baseTop + collarH / 2;
  collar.castShadow = true;
  group.add(collar);

  const coilBaseY = baseTop + collarH;
  const coilR = plateR * 0.46;
  const tube = 0.075;

  const coilStack = new THREE.Group();
  coilStack.position.y = coilBaseY;
  group.add(coilStack);

  const step = (coilH - tube * 2) / (ringCount - 1);
  for (let i = 0; i < ringCount; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(coilR, tube, 6, 12), M.steel);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = tube + i * step;
    ring.castShadow = true;
    coilStack.add(ring);
  }

  const guide = new THREE.Mesh(new THREE.CylinderGeometry(coilR * 0.34, coilR * 0.34, coilH, 8), M.ironDark);
  guide.position.y = coilH / 2;
  coilStack.add(guide);

  if (lvl >= 4) {
    const outerR = plateR * 0.7;
    const outerCount = ringCount - 2;
    const outerStep = (coilH - 0.18) / (outerCount - 1);
    for (let i = 0; i < outerCount; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(outerR, 0.06, 6, 12), M.steel);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.09 + i * outerStep;
      ring.castShadow = true;
      coilStack.add(ring);
    }
  }

  if (lvl >= 3) {
    const rodH = coilH * 0.92;
    const rodR = plateR * 0.86;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, rodH, 6), M.steel);
      rod.position.set(Math.cos(a) * rodR, coilBaseY + rodH / 2, Math.sin(a) * rodR);
      rod.castShadow = true;
      group.add(rod);
    }
  }

  let beaconMat = null;
  if (lvl >= 5) {
    beaconMat = M.neonYellow.clone();
    for (let x of [-1.2, 1.2]) {
      for (let z of [-1.2, 1.2]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.26, 8), M.ironDark);
        post.position.set(x, baseTop + 0.13, z);
        post.castShadow = true;
        group.add(post);

        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), beaconMat);
        lamp.position.set(x, baseTop + 0.32, z);
        group.add(lamp);
      }
    }
  }

  const plateRestY = coilBaseY + coilH + plateT / 2;
  const kicker = new THREE.Group();
  kicker.position.y = plateRestY;
  group.add(kicker);

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(plateR, plateR * 0.92, plateT, 16), M.steel);
  plate.castShadow = true;
  kicker.add(plate);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(plateR * 0.3, plateR * 0.3, 0.06, 12), M.ironDark);
  hub.position.y = plateT / 2 + 0.03;
  kicker.add(hub);

  if (lvl >= 6) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(plateR, 0.07, 6, 16), M.gold);
    rim.rotation.x = -Math.PI / 2;
    kicker.add(rim);

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.14), M.hazardStripe);
      tread.position.set(Math.cos(a) * plateR * 0.65, plateT / 2 + 0.025, Math.sin(a) * plateR * 0.65);
      tread.rotation.y = -a;
      kicker.add(tread);
    }
  }

  group.userData.animator = (delta, elapsed) => {
    const load = Math.sin(elapsed * 1.7) * 0.5 + 0.5;
    const drop = load * 0.12;
    kicker.position.y = plateRestY - drop;
    coilStack.scale.y = (coilH - drop) / coilH;
    if (beaconMat) beaconMat.emissiveIntensity = 0.6 + load * 1.4;
  };

  return group;
}
