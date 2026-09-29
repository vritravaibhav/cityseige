import * as THREE from 'three';

export function createFreezeTrap(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'freeze_trap';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  const padH = 0.2;
  const padTop = padH;
  const canH = [0.40, 0.46, 0.52, 0.56, 0.60, 0.64][lvl - 1];
  const canR = [0.34, 0.38, 0.42, 0.46, 0.50, 0.54][lvl - 1];
  const canTop = padTop + canH;
  const collarH = 0.07;
  const collarTop = canTop + collarH;
  const upperH = lvl >= 4 ? [0.20, 0.24, 0.26][lvl - 4] : 0;
  const upperR = canR * 0.62;
  const emitterY = collarTop + upperH;
  const lensR = [0.26, 0.29, 0.32, 0.36, 0.40, 0.44][lvl - 1];
  const lensH = 0.1;
  const capH = 0.16;

  const lensMat = M.cyberBlue.clone();

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, padH, 8), M.concrete);
  pad.position.y = padH / 2;
  pad.receiveShadow = true;
  group.add(pad);

  const canister = new THREE.Mesh(new THREE.CylinderGeometry(canR, canR + 0.06, canH, 12), M.steel);
  canister.position.y = padTop + canH / 2;
  canister.castShadow = true;
  group.add(canister);

  const band = new THREE.Mesh(new THREE.TorusGeometry(canR + 0.04, 0.05, 6, 12), M.ironDark);
  band.rotation.x = -Math.PI / 2;
  band.position.y = padTop + canH * 0.3;
  group.add(band);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(canR + 0.08, canR + 0.04, collarH, 12), M.ironDark);
  collar.position.y = canTop + collarH / 2;
  collar.castShadow = true;
  group.add(collar);

  const vanes = new THREE.Group();
  const vaneCount = [3, 4, 4, 5, 6, 6][lvl - 1];
  const vaneH = canH * 0.88;
  const vaneD = 0.34 + lvl * 0.02;
  for (let i = 0; i < vaneCount; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i * Math.PI * 2) / vaneCount;

    const vane = new THREE.Mesh(new THREE.BoxGeometry(0.1, vaneH, vaneD), M.policeWhite);
    vane.position.set(0, padTop + canH / 2, canR + vaneD / 2 - 0.04);
    vane.castShadow = true;
    pivot.add(vane);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, vaneH * 0.34, 0.1), M.policeWhite);
    fin.position.set(0, padTop + canH * 0.82, canR + vaneD - 0.02);
    pivot.add(fin);

    vanes.add(pivot);
  }
  group.add(vanes);

  const upperVanes = new THREE.Group();

  if (lvl >= 4) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(upperR, upperR + 0.04, upperH, 10), M.steel);
    stack.position.y = collarTop + upperH / 2;
    stack.castShadow = true;
    group.add(stack);

    const stackRing = new THREE.Mesh(new THREE.TorusGeometry(upperR + 0.05, 0.04, 6, 12), M.neonCyan);
    stackRing.rotation.x = -Math.PI / 2;
    stackRing.position.y = collarTop + upperH * 0.5;
    group.add(stackRing);

    if (lvl >= 5) {
      const upCount = lvl === 6 ? 4 : 3;
      for (let i = 0; i < upCount; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.y = (i * Math.PI * 2) / upCount + 0.4;

        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, upperH * 0.8, 0.26), M.policeWhite);
        fin.position.set(0, collarTop + upperH / 2, upperR + 0.11);
        pivot.add(fin);

        upperVanes.add(pivot);
      }
      group.add(upperVanes);
    }
  }

  const housing = new THREE.Mesh(new THREE.TorusGeometry(lensR, 0.06, 6, 12), M.steel);
  housing.rotation.x = -Math.PI / 2;
  housing.position.y = emitterY + 0.02;
  group.add(housing);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(lensR, lensR * 0.72, lensH, 12), lensMat);
  lens.position.y = emitterY + lensH / 2;
  lens.castShadow = true;
  group.add(lens);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(lensR * 0.78, capH, 8), lensMat);
  cap.position.y = emitterY + lensH + capH / 2;
  group.add(cap);

  const frostCount = 3 + lvl;
  for (let i = 0; i < frostCount; i++) {
    const a = (i * Math.PI * 2) / frostCount + i * 0.35;
    const r = 0.16 - (i % 3) * 0.035;
    const dist = 0.9 + (i % 2) * 0.22;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), M.policeWhite);
    shard.position.set(Math.cos(a) * dist, padTop + r * 0.55, Math.sin(a) * dist);
    shard.rotation.set(i * 0.5, a, i * 0.3);
    group.add(shard);
  }

  if (lvl >= 3) {
    const frostRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 6, 16), M.policeWhite);
    frostRing.rotation.x = -Math.PI / 2;
    frostRing.position.y = padTop + 0.03;
    group.add(frostRing);

    for (let x of [-1, 1]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, canH * 0.9, 6), M.steel);
      pipe.position.set(x * (canR + 0.34), padTop + canH * 0.45, 0);
      pipe.rotation.z = x * 0.22;
      group.add(pipe);

      const elbow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.12), M.ironDark);
      elbow.position.set(x * (canR + 0.2), padTop + canH * 0.86, 0);
      group.add(elbow);
    }
  }

  if (lvl >= 5) {
    const spikeCount = lvl === 6 ? 5 : 4;
    for (let i = 0; i < spikeCount; i++) {
      const a = (i * Math.PI * 2) / spikeCount + 0.6;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 6), M.policeWhite);
      spike.position.set(Math.cos(a) * 1.15, padTop + 0.18, Math.sin(a) * 1.15);
      spike.rotation.z = Math.cos(a) * 0.22;
      spike.rotation.x = -Math.sin(a) * 0.22;
      spike.castShadow = true;
      group.add(spike);
    }

    const glow = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.9, 16), M.neonCyan);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = padTop + 0.02;
    group.add(glow);
  }

  group.userData.animator = (delta, elapsed) => {
    vanes.rotation.y += delta * 0.55;
    upperVanes.rotation.y -= delta * 0.9;
    const pulse = Math.sin(elapsed * 3.2);
    lensMat.emissiveIntensity = 0.7 + pulse * 0.45;
    lens.scale.setScalar(1.0 + pulse * 0.07);
    cap.scale.setScalar(1.0 + pulse * 0.12);
  };

  return group;
}
