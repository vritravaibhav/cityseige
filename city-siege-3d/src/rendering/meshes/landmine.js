import * as THREE from 'three';

export function createLandmine(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'landmine';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Concealment is the point - the charge only creeps a few centimetres wider per tier
  const discR = [0.55, 0.60, 0.66, 0.72, 0.80, 0.88][lvl - 1];
  const discH = [0.18, 0.19, 0.20, 0.22, 0.24, 0.26][lvl - 1];
  const topY = [0.12, 0.13, 0.14, 0.15, 0.16, 0.18][lvl - 1];
  const prongH = [0.15, 0.16, 0.18, 0.20, 0.22, 0.24][lvl - 1];
  const prongCount = [3, 4, 5, 5, 6, 6][lvl - 1];
  const discY = topY - discH / 2;
  const prongRing = discR * 0.62;

  // Scuffed earth where the charge was buried
  const scar = new THREE.Mesh(new THREE.CircleGeometry(discR + 0.35, 12), M.dirtRoad);
  scar.rotation.x = -Math.PI / 2;
  scar.position.y = 0.01;
  scar.receiveShadow = true;
  group.add(scar);

  // Sunken casing - only its lid clears the ground
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(discR, discR * 0.92, discH, 12), M.ironDark);
  casing.position.y = discY;
  casing.castShadow = true;
  group.add(casing);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(discR * 0.78, discR * 0.86, 0.04, 12), M.steel);
  lid.position.y = topY + 0.02;
  lid.castShadow = true;
  group.add(lid);

  // Trigger prongs
  for (let i = 0; i < prongCount; i++) {
    const a = (i * Math.PI * 2) / prongCount + 0.3;
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, prongH, 6), M.steel);
    prong.position.set(Math.cos(a) * prongRing, topY + prongH / 2, Math.sin(a) * prongRing);
    prong.castShadow = true;
    group.add(prong);
  }

  // Pressure collar bites into the lid once the charge is reinforced
  if (lvl >= 3) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(discR * 0.88, 0.035, 6, 16), M.ironDark);
    collar.rotation.x = -Math.PI / 2;
    collar.position.y = topY;
    group.add(collar);
  }

  // Warning chips half swallowed by the dirt
  if (lvl >= 4) {
    for (const a of [0.9, 3.4]) {
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.1), M.hazardStripe);
      chip.position.set(Math.cos(a) * (discR + 0.16), 0.02, Math.sin(a) * (discR + 0.16));
      chip.rotation.y = -a;
      group.add(chip);
    }
  }

  // Tilted tripwire whisker and a slaved secondary charge
  if (lvl >= 5) {
    const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, prongH * 1.3, 6), M.steel);
    whisker.position.set(discR * 0.34, topY + prongH * 0.45, -discR * 0.34);
    whisker.rotation.z = 0.32;
    group.add(whisker);

    const slave = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.1, 8), M.ironDark);
    slave.position.set(-discR * 0.95, 0.04, discR * 0.85);
    slave.castShadow = true;
    group.add(slave);
  }

  // Outer sensor beads finish the ring
  if (lvl >= 6) {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), M.steel);
      bead.position.set(Math.cos(a) * (discR + 0.2), 0.035, Math.sin(a) * (discR + 0.2));
      group.add(bead);
    }
  }

  // Armed indicator - its own material so the blink stays local
  const lensMat = M.neonRed.clone();
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.055 + lvl * 0.006, 8, 6), lensMat);
  lens.position.y = topY + 0.05;
  group.add(lens);

  group.userData.animator = (_delta, elapsed) => {
    lensMat.emissiveIntensity = 0.55 + Math.sin(elapsed * Math.PI) * 0.45;
  };

  return group;
}
