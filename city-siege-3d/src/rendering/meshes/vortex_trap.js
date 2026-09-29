import * as THREE from 'three';

export function createVortexTrap(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'vortex_trap';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  const pitR = [0.92, 1.00, 1.08, 1.18, 1.28, 1.38][lvl - 1];
  const collarTube = [0.10, 0.11, 0.12, 0.12, 0.13, 0.13][lvl - 1];
  const collarY = 0.10;
  const collarTop = collarY + collarTube;
  const apronR = pitR + 0.22;
  const wellR = pitR - collarTube - 0.02;
  const pitDepth = 0.26;
  const pitTop = collarY - 0.06;
  const ring1R = pitR * 0.74;
  const ring2R = pitR * 0.46;
  const ring3R = pitR * 0.60;
  const ring1Y = [0.34, 0.36, 0.38, 0.40, 0.42, 0.44][lvl - 1];
  const ring2Y = [0.60, 0.62, 0.64, 0.66, 0.68, 0.70][lvl - 1];
  const ring3Y = (ring1Y + ring2Y) / 2;
  const coreR = [0.13, 0.14, 0.15, 0.17, 0.18, 0.20][lvl - 1];
  const coreY = pitTop + coreR * 0.85;
  const glowI = [0.5, 0.65, 0.8, 1.0, 1.25, 1.5][lvl - 1];

  const ring1Mat = M.cyberBlue.clone();
  const ring2Mat = M.neonCyan.clone();
  const ring3Mat = M.neonYellow.clone();
  const coreMat = M.cyberBlue.clone();
  const swirlMat = M.neonCyan.clone();
  ring1Mat.emissiveIntensity = glowI;
  ring2Mat.emissiveIntensity = glowI;
  ring3Mat.emissiveIntensity = glowI;
  coreMat.emissiveIntensity = glowI;
  swirlMat.emissiveIntensity = glowI * 0.8;

  const apron = new THREE.Mesh(new THREE.RingGeometry(wellR, apronR, 16), M.concrete);
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.015;
  apron.receiveShadow = true;
  group.add(apron);

  const chevronCount = [4, 5, 6, 6, 8, 8][lvl - 1];
  for (let i = 0; i < chevronCount; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i * Math.PI * 2) / chevronCount;
    const chevron = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.26), M.hazardStripe);
    chevron.position.set(0, 0.025, pitR + 0.1);
    pivot.add(chevron);
    group.add(pivot);
  }

  const collar = new THREE.Mesh(new THREE.TorusGeometry(pitR, collarTube, 6, 16), M.ironDark);
  collar.rotation.x = -Math.PI / 2;
  collar.position.y = collarY;
  collar.castShadow = true;
  group.add(collar);

  const studCount = [4, 4, 6, 6, 8, 8][lvl - 1];
  for (let i = 0; i < studCount; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i * Math.PI * 2) / studCount + 0.3;
    const stud = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.18), M.steel);
    stud.position.set(0, collarTop - 0.03, pitR);
    stud.castShadow = true;
    pivot.add(stud);
    group.add(pivot);
  }

  const well = new THREE.Mesh(new THREE.CylinderGeometry(wellR, wellR * 0.55, pitDepth, 16), M.policeBlack);
  well.position.y = pitTop - pitDepth / 2;
  well.castShadow = true;
  group.add(well);

  const throat = new THREE.Mesh(new THREE.RingGeometry(wellR * 0.24, wellR * 0.62, 16), swirlMat);
  throat.rotation.x = -Math.PI / 2;
  throat.position.y = pitTop + 0.005;
  group.add(throat);

  const swirl = new THREE.Group();
  swirl.position.y = pitTop + 0.02;
  const armCount = [3, 3, 4, 4, 5, 5][lvl - 1];
  for (let i = 0; i < armCount; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i * Math.PI * 2) / armCount;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(wellR * 0.7, 0.03, 0.09), swirlMat);
    arm.position.set(wellR * 0.38, 0, 0.14);
    arm.rotation.y = 0.5;
    pivot.add(arm);
    swirl.add(pivot);
  }
  group.add(swirl);

  const core = new THREE.Mesh(new THREE.SphereGeometry(coreR, 10, 8), coreMat);
  core.position.y = coreY;
  core.castShadow = true;
  group.add(core);

  const buildRing = (radius, tube, mat, tilt, nodes) => {
    const pivot = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 16), mat);
    torus.rotation.x = -Math.PI / 2 + tilt;
    torus.castShadow = true;
    pivot.add(torus);
    for (let i = 0; i < nodes; i++) {
      const a = (i * Math.PI * 2) / nodes;
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(tube * 1.6, 0), mat);
      node.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      torus.add(node);
    }
    group.add(pivot);
    return pivot;
  };

  const ring1 = buildRing(ring1R, 0.07, ring1Mat, 0.15, [3, 3, 4, 4, 5, 6][lvl - 1]);
  ring1.position.y = ring1Y;

  const ring2 = buildRing(ring2R, 0.06, ring2Mat, -0.15, [3, 3, 3, 4, 4, 5][lvl - 1]);
  ring2.position.y = ring2Y;

  const ring3 = lvl >= 3 ? buildRing(ring3R, 0.055, ring3Mat, 0.28, [2, 2, 3, 3, 4, 4][lvl - 1]) : null;
  if (ring3) ring3.position.y = ring3Y;

  const motes = new THREE.Group();
  if (lvl >= 5) {
    const finCount = lvl === 6 ? 6 : 4;
    for (let i = 0; i < finCount; i++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = (i * Math.PI * 2) / finCount + 0.2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.16), M.ironDark);
      fin.position.set(0, collarTop + 0.12, pitR + 0.08);
      fin.rotation.x = 0.22;
      fin.castShadow = true;
      pivot.add(fin);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 6), ring1Mat);
      tip.position.set(0, collarTop + 0.3, pitR + 0.12);
      pivot.add(tip);
      group.add(pivot);
    }

    motes.position.y = ring3Y;
    const moteCount = lvl === 6 ? 5 : 4;
    for (let i = 0; i < moteCount; i++) {
      const a = (i * Math.PI * 2) / moteCount;
      const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), ring2Mat);
      mote.position.set(Math.cos(a) * (ring1R + 0.16), (i % 2) * 0.1 - 0.05, Math.sin(a) * (ring1R + 0.16));
      motes.add(mote);
    }
    group.add(motes);
  }

  group.userData.animator = (delta, elapsed) => {
    ring1.rotation.y += delta * 1.1;
    ring2.rotation.y -= delta * 2.0;
    const bob = Math.sin(elapsed * 1.7);
    ring1.position.y = ring1Y + bob * 0.08;
    ring2.position.y = ring2Y - bob * 0.08;
    swirl.rotation.y -= delta * 1.6;
    if (ring3) {
      ring3.rotation.y += delta * 2.8;
      ring3.position.y = ring3Y + Math.cos(elapsed * 2.1) * 0.05;
    }
    motes.rotation.y -= delta * 0.9;
    const pulse = 0.5 + Math.sin(elapsed * 3.4) * 0.5;
    ring1Mat.emissiveIntensity = glowI * (0.7 + pulse * 0.6);
    ring2Mat.emissiveIntensity = glowI * (1.3 - pulse * 0.6);
    coreMat.emissiveIntensity = glowI * (0.8 + pulse * 0.7);
    swirlMat.emissiveIntensity = glowI * (0.6 + pulse * 0.5);
    core.scale.setScalar(1.0 + Math.sin(elapsed * 5.2) * 0.12);
    core.rotation.y += delta * 1.4;
  };

  return group;
}
