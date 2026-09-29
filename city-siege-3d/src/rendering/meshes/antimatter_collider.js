import * as THREE from 'three';

export function createAntimatterCollider(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'antimatter_collider';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Ring grows wider and rides higher every tier; a second ring stacks on at lvl 4
  const ringR = [2.20, 2.60, 3.00, 3.40, 3.80, 4.15][lvl - 1];
  const tube = [0.22, 0.25, 0.28, 0.30, 0.33, 0.36][lvl - 1];
  const pylonH = [4.0, 5.0, 6.0, 6.8, 7.6, 8.4][lvl - 1];
  const magnetCount = [8, 9, 10, 10, 11, 12][lvl - 1];
  const coreR = [0.55, 0.65, 0.75, 0.85, 0.95, 1.05][lvl - 1];

  const padH = 0.35;
  const padTop = padH;
  const padR = Math.min(4.8, ringR + 0.75);
  const ringY = padTop + pylonH;
  const ringGap = 1.7 + lvl * 0.1;
  const ring2Y = ringY + ringGap;
  const ring2R = ringR * 0.72;
  const topRingY = lvl >= 4 ? ring2Y : ringY;
  const coreY = topRingY + coreR + 1.4;
  const capR = coreR * 1.18;
  const spireH = 0.80 + lvl * 0.12;

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(padR, padR + 0.1, padH, 12), M.concrete);
  pad.position.y = padH / 2;
  pad.receiveShadow = true;
  group.add(pad);

  const hazard = new THREE.Mesh(new THREE.TorusGeometry(padR - 0.45, 0.09, 6, 16), M.hazardStripe);
  hazard.rotation.x = -Math.PI / 2;
  hazard.position.y = padTop + 0.02;
  group.add(hazard);

  // Four concrete pylons on the diagonals, clear of the injector lanes
  const pw = 0.55 + lvl * 0.06;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const px = Math.cos(a) * ringR;
    const pz = Math.sin(a) * ringR;

    const foot = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.5, 0.3, pw + 0.5), M.concrete);
    foot.position.set(px, padTop + 0.15, pz);
    foot.rotation.y = -a;
    foot.receiveShadow = true;
    group.add(foot);

    const pylon = new THREE.Mesh(new THREE.BoxGeometry(pw, pylonH, pw), M.concrete);
    pylon.position.set(px, padTop + pylonH / 2, pz);
    pylon.rotation.y = -a;
    pylon.castShadow = true;
    group.add(pylon);

    const collar = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.3, 0.26, pw + 0.3), M.steel);
    collar.position.set(px, ringY - 0.3, pz);
    collar.rotation.y = -a;
    collar.castShadow = true;
    group.add(collar);
  }

  if (lvl >= 2) {
    const braceSpan = ringR * 1.42;
    const braceY = padTop + pylonH * 0.52;
    for (const s of [-1, 1]) {
      const bx = new THREE.Mesh(new THREE.BoxGeometry(braceSpan, 0.18, 0.18), M.steel);
      bx.position.set(0, braceY, s * ringR * 0.707);
      group.add(bx);

      const bz = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, braceSpan), M.steel);
      bz.position.set(s * ringR * 0.707, braceY, 0);
      group.add(bz);
    }
  }

  // Coolant tanks flanking the pad once the collider is properly cooled
  if (lvl >= 3) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 8), M.steel);
        tank.position.set(sx * 1.15, padTop + 0.8, sz * (padR - 0.85));
        tank.castShadow = true;
        group.add(tank);

        const band = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 6, 10), M.gold);
        band.rotation.x = -Math.PI / 2;
        band.position.set(sx * 1.15, padTop + 1.25, sz * (padR - 0.85));
        group.add(band);
      }
    }
  }

  const addRing = (r, y, t, magnets) => {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 16), M.steel);
    torus.rotation.x = -Math.PI / 2;
    torus.position.y = y;
    torus.castShadow = true;
    group.add(torus);

    for (let i = 0; i < magnets; i++) {
      const a = (i * Math.PI * 2) / magnets;
      const mx = Math.cos(a) * r;
      const mz = Math.sin(a) * r;

      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(t * 2 + 0.34, t * 2.4 + 0.3, 0.5 + lvl * 0.04),
        M.ironDark
      );
      housing.position.set(mx, y, mz);
      housing.rotation.y = -a;
      housing.castShadow = true;
      group.add(housing);

      if (lvl >= 3) {
        const coil = new THREE.Mesh(new THREE.BoxGeometry(t * 1.5, 0.16, 0.34), M.gold);
        coil.position.set(mx, y + t * 1.2 + 0.2, mz);
        coil.rotation.y = -a;
        group.add(coil);
      }
    }
  };

  addRing(ringR, ringY, tube, magnetCount);

  if (lvl >= 4) {
    addRing(ring2R, ring2Y, tube * 0.8, Math.max(6, magnetCount - 4));

    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const sx = Math.cos(a);
      const sz = Math.sin(a);
      const dx = ring2R * sx - ringR * sx;
      const dz = ring2R * sz - ringR * sz;
      const len = Math.hypot(Math.hypot(dx, dz), ringGap);

      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, len, 6), M.ironDark);
      strut.position.set((ringR + ring2R) * 0.5 * sx, (ringY + ring2Y) * 0.5, (ringR + ring2R) * 0.5 * sz);
      strut.rotation.z = Math.atan2(-dx, ringGap);
      strut.rotation.x = Math.atan2(dz, ringGap);
      strut.castShadow = true;
      group.add(strut);
    }
  }

  // Injector spurs climb from their bunkers into the ring on opposite sides
  const spurDrop = 1.8 + lvl * 0.18;
  const spurTopR = ringR - tube * 0.2;
  const spurBotR = ringR * 0.52;
  const spurY = ringY - spurDrop;
  const spurLen = Math.hypot(spurTopR - spurBotR, spurDrop);
  for (const s of [-1, 1]) {
    const spur = new THREE.Mesh(new THREE.CylinderGeometry(tube * 0.8, tube * 0.95, spurLen, 8), M.steel);
    spur.position.set((s * (spurTopR + spurBotR)) / 2, spurY + spurDrop / 2, 0);
    spur.rotation.z = Math.atan2(-s * (spurTopR - spurBotR), spurDrop);
    spur.castShadow = true;
    group.add(spur);

    const bunker = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), M.ironDark);
    bunker.position.set(s * spurBotR, spurY, 0);
    bunker.castShadow = true;
    group.add(bunker);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, spurY - padTop, 8), M.concrete);
    mast.position.set(s * spurBotR, padTop + (spurY - padTop) / 2, 0);
    mast.castShadow = true;
    group.add(mast);

    const nozzle = new THREE.Mesh(new THREE.SphereGeometry(tube * 1.1, 8, 6), M.neonYellow);
    nozzle.position.set(s * spurTopR, ringY, 0);
    group.add(nozzle);
  }

  // Containment column and nested core
  const colH = coreY - coreR * 1.05 - padTop;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, colH, 8), M.concrete);
  column.position.y = padTop + colH / 2;
  column.castShadow = true;
  group.add(column);

  const collarCount = 2 + lvl;
  for (let i = 0; i < collarCount; i++) {
    const cy = padTop + (colH * (i + 1)) / (collarCount + 1);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.08, 6, 10), M.steel);
    band.rotation.x = -Math.PI / 2;
    band.position.y = cy;
    group.add(band);
  }

  const coreMat = M.neonCyan.clone();
  const coreGlow = 0.8 + lvl * 0.3;
  coreMat.emissiveIntensity = coreGlow;

  const core = new THREE.Mesh(new THREE.SphereGeometry(coreR, 12, 8), coreMat);
  core.position.y = coreY;
  core.castShadow = true;
  group.add(core);

  const capGeo = new THREE.SphereGeometry(capR, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.4);
  const capTop = new THREE.Mesh(capGeo, M.gold);
  capTop.position.y = coreY;
  capTop.castShadow = true;
  group.add(capTop);

  const capBottom = new THREE.Mesh(capGeo, M.gold);
  capBottom.position.y = coreY;
  capBottom.rotation.x = Math.PI;
  capBottom.castShadow = true;
  group.add(capBottom);

  const spinRings = [];
  const equator = new THREE.Mesh(new THREE.TorusGeometry(coreR * 1.24, 0.09, 6, 16), M.gold);
  equator.rotation.x = -Math.PI / 2;
  equator.position.y = coreY;
  group.add(equator);
  spinRings.push(equator);

  if (lvl >= 5) {
    for (const tilt of [0.7, -0.7]) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(coreR * 1.45, 0.07, 6, 16), M.gold);
      halo.rotation.x = -Math.PI / 2 + tilt;
      halo.position.y = coreY;
      group.add(halo);
      spinRings.push(halo);
    }
  }

  if (lvl >= 6) {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), M.neonCyan);
      fin.position.set(Math.cos(a) * capR * 0.8, coreY - capR * 0.6, Math.sin(a) * capR * 0.8);
      fin.rotation.x = Math.PI;
      group.add(fin);
    }
  }

  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.22, spireH, 6), M.steel);
  spire.position.y = coreY + capR + spireH / 2;
  spire.castShadow = true;
  group.add(spire);

  // Accelerated particles streaking around the ring circumference
  const beads = [];
  const beadCount = 3 + lvl;
  const beadR = 0.09 + lvl * 0.012;
  for (let i = 0; i < beadCount; i++) {
    const pivot = new THREE.Group();
    pivot.position.y = ringY;
    pivot.rotation.y = (i * Math.PI * 2) / beadCount;

    const bead = new THREE.Mesh(new THREE.SphereGeometry(beadR, 6, 6), M.neonYellow);
    bead.position.x = ringR;
    pivot.add(bead);
    group.add(pivot);
    beads.push(pivot);
  }

  if (lvl >= 4) {
    for (let i = 0; i < 3; i++) {
      const pivot = new THREE.Group();
      pivot.position.y = ring2Y;
      pivot.rotation.y = (i * Math.PI * 2) / 3;

      const bead = new THREE.Mesh(new THREE.SphereGeometry(beadR * 0.85, 6, 6), M.neonYellow);
      bead.position.x = ring2R;
      pivot.add(bead);
      group.add(pivot);
      beads.push(pivot);
    }
  }

  group.userData.animator = (delta, elapsed) => {
    for (let i = 0; i < beads.length; i++) {
      beads[i].rotation.y += delta * (2.4 + (i % 3) * 0.45);
    }
    for (let i = 0; i < spinRings.length; i++) {
      spinRings[i].rotation.z += delta * (0.8 + i * 0.35);
    }
    const pulse = Math.sin(elapsed * 5.0);
    coreMat.emissiveIntensity = coreGlow + pulse * 0.35;
    core.scale.setScalar(1 + pulse * 0.07);
  };

  return group;
}
