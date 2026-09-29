import * as THREE from 'three';

export function createFusionReactor(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'fusion_reactor';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Tier drives pylon height, ring scale and how much hardware is bolted on
  const padH = 0.35;
  const pedH = [1.4, 1.5, 1.6, 1.8, 2.0, 2.2][lvl - 1];
  const pylonH = [7.4, 8.6, 9.8, 11.0, 12.3, 13.6][lvl - 1];
  const torusR = [1.9, 2.1, 2.3, 2.55, 2.8, 3.05][lvl - 1];
  const tubeR = [0.42, 0.46, 0.5, 0.56, 0.62, 0.68][lvl - 1];
  const coreR = [0.7, 0.8, 0.9, 1.02, 1.15, 1.28][lvl - 1];

  const deckY = padH + pedH;
  const pylonTop = deckY + pylonH;
  const hubY = pylonTop + 0.25;
  const ringY = pylonTop - 2.6;
  const pylonR = torusR + 0.85;
  const pedR = pylonR * 0.8;
  const padR = pylonR + 0.6;
  const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(padR, padR + 0.15, padH, 8), M.concrete);
  pad.position.y = padH / 2;
  pad.receiveShadow = true;
  group.add(pad);

  const hazard = new THREE.Mesh(new THREE.TorusGeometry(padR - 0.3, 0.1, 6, 16), M.hazardStripe);
  hazard.rotation.x = -Math.PI / 2;
  hazard.position.y = padH + 0.02;
  group.add(hazard);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(pedR, pedR + 0.35, pedH, 8), M.concrete);
  drum.position.y = padH + pedH / 2;
  drum.castShadow = true;
  drum.receiveShadow = true;
  group.add(drum);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(pedR + 0.22, pedR + 0.22, 0.32, 8), M.ironDark);
  collar.position.y = deckY - 0.12;
  collar.castShadow = true;
  group.add(collar);

  // Vent slots around the pedestal drum
  for (let i = 0; i < 6; i++) {
    const va = (i * Math.PI * 2) / 6 + Math.PI / 6;
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.12), M.cyberBlue);
    vent.position.set(Math.cos(va) * (pedR + 0.24), padH + pedH * 0.5, Math.sin(va) * (pedR + 0.24));
    vent.rotation.y = -va;
    group.add(vent);
  }

  const finCount = 3 + lvl;
  const finGap = (ringY - deckY - 1.4) / finCount;
  const clampLen = pylonR - torusR + 0.5;

  angles.forEach(a => {
    const arm = new THREE.Group();
    arm.rotation.y = Math.PI / 2 - a;
    group.add(arm);

    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, pylonH, 6), M.steel);
    pylon.position.set(0, deckY + pylonH / 2, pylonR);
    pylon.castShadow = true;
    arm.add(pylon);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 1.1), M.ironDark);
    foot.position.set(0, deckY + 0.21, pylonR);
    foot.castShadow = true;
    arm.add(foot);

    for (const dx of [-0.42, 0.42]) {
      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, ringY - deckY, 6), M.ironDark);
      conduit.position.set(dx, deckY + (ringY - deckY) / 2, pylonR + 0.12);
      arm.add(conduit);
    }

    for (let i = 0; i < finCount; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.72), M.steel);
      fin.position.set(0, deckY + 0.9 + i * finGap, pylonR - 0.16);
      arm.add(fin);
    }

    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.62, clampLen), M.steel);
    clamp.position.set(0, ringY, pylonR + 0.1 - clampLen / 2);
    clamp.castShadow = true;
    arm.add(clamp);

    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, pylonR - 0.55), M.steel);
    strut.position.set(0, pylonTop + 0.06, (pylonR + 0.55) / 2);
    arm.add(strut);
  });

  // Triangular tie rings and cryo tanks land at tier 3
  if (lvl >= 3) {
    for (const f of [0.34, 0.66]) {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(pylonR, 0.13, 6, 3), M.steel);
      tie.rotation.x = -Math.PI / 2;
      tie.position.y = deckY + (ringY - deckY) * f;
      tie.castShadow = true;
      group.add(tie);
    }

    const tankR = padR - 0.55;
    for (const a of angles) {
      const ta = a + Math.PI / 3;
      const tx = Math.cos(ta) * tankR;
      const tz = Math.sin(ta) * tankR;

      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.7, 8), M.steel);
      tank.position.set(tx, padH + 0.85, tz);
      tank.castShadow = true;
      group.add(tank);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), M.steel);
      dome.position.set(tx, padH + 1.7, tz);
      group.add(dome);

      const band = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 10), M.neonCyan);
      band.rotation.x = -Math.PI / 2;
      band.position.set(tx, padH + 1.15, tz);
      group.add(band);
    }
  }

  // Containment ring - spins about Y
  const ringGroup = new THREE.Group();
  ringGroup.position.y = ringY;
  group.add(ringGroup);

  const torus = new THREE.Mesh(new THREE.TorusGeometry(torusR, tubeR, 8, 16), M.steel);
  torus.rotation.x = -Math.PI / 2;
  torus.castShadow = true;
  ringGroup.add(torus);

  const channel = new THREE.Mesh(new THREE.TorusGeometry(torusR, 0.09, 6, 16), M.cyberBlue);
  channel.rotation.x = -Math.PI / 2;
  channel.position.y = tubeR + 0.04;
  ringGroup.add(channel);

  for (let i = 0; i < 6; i++) {
    const sa = (i * Math.PI * 2) / 6;
    const band = new THREE.Mesh(new THREE.TorusGeometry(tubeR + 0.09, 0.1, 6, 10), M.ironDark);
    band.position.set(Math.cos(sa) * torusR, 0, Math.sin(sa) * torusR);
    band.rotation.y = -sa;
    ringGroup.add(band);
  }

  const plasmaMat = M.neonYellow.clone();

  const tendrilCount = 3 + lvl;
  const tendrilInner = coreR * 0.9;
  const tendrilOuter = torusR - tubeR;
  for (let i = 0; i < tendrilCount; i++) {
    const ta = (i * Math.PI * 2) / tendrilCount;
    const tendril = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, tendrilOuter - tendrilInner, 6), plasmaMat);
    tendril.position.set(Math.cos(ta) * (tendrilInner + tendrilOuter) / 2, 0, Math.sin(ta) * (tendrilInner + tendrilOuter) / 2);
    tendril.rotation.z = Math.PI / 2;
    tendril.rotation.y = -ta;
    ringGroup.add(tendril);
  }

  // Outer magnet coils wrap the ring from tier 5
  if (lvl >= 5) {
    for (let i = 0; i < 6; i++) {
      const ca = (i * Math.PI * 2) / 6 + Math.PI / 6;
      const coil = new THREE.Mesh(new THREE.TorusGeometry(tubeR + 0.34, 0.14, 6, 12), M.gold);
      coil.position.set(Math.cos(ca) * torusR, 0, Math.sin(ca) * torusR);
      coil.rotation.y = -ca;
      coil.castShadow = true;
      ringGroup.add(coil);
    }
  }

  // Counter-rotating inner gyro ring from tier 4
  let ring2 = null;
  if (lvl >= 4) {
    ring2 = new THREE.Mesh(new THREE.TorusGeometry(torusR * 0.62, 0.16, 6, 16), M.steel);
    ring2.position.y = ringY;
    ring2.rotation.y = 0.4;
    ring2.castShadow = true;
    group.add(ring2);

    for (let i = 0; i < 4; i++) {
      const na = (i * Math.PI) / 2;
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), M.neonCyan);
      node.position.set(Math.cos(na) * torusR * 0.62, Math.sin(na) * torusR * 0.62, 0);
      ring2.add(node);
    }
  }

  // Plasma core
  const coreGroup = new THREE.Group();
  coreGroup.position.y = ringY;
  group.add(coreGroup);

  const coreShell = new THREE.Mesh(new THREE.SphereGeometry(coreR, 8, 6), M.moltenIron);
  coreShell.castShadow = true;
  coreGroup.add(coreShell);

  const coreInner = new THREE.Mesh(new THREE.SphereGeometry(coreR * 0.94, 12, 10), plasmaMat);
  coreGroup.add(coreInner);

  // Beam injector lances at the top tier
  if (lvl >= 6) {
    const baseR = padR - 0.55;
    const baseY = padH + 2.2;
    const tipR = torusR + 0.15;
    const tipY = ringY - 0.5;
    const dz = tipR - baseR;
    const dy = tipY - baseY;
    const lanceLen = Math.hypot(dz, dy);

    angles.forEach(a => {
      const arm = new THREE.Group();
      arm.rotation.y = Math.PI / 2 - (a + Math.PI / 3);
      group.add(arm);

      const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, lanceLen, 6), M.ironDark);
      lance.position.set(0, baseY + dy / 2, baseR + dz / 2);
      lance.rotation.x = Math.atan2(dz, dy);
      lance.castShadow = true;
      arm.add(lance);

      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.7, 6), plasmaMat);
      nozzle.position.set(0, tipY + 0.2, tipR);
      nozzle.rotation.x = Math.atan2(dz, dy);
      arm.add(nozzle);
    });
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.5, 6), M.ironDark);
  hub.position.y = hubY;
  hub.castShadow = true;
  group.add(hub);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.9, 6), M.steel);
  mast.position.y = pylonTop + 0.95;
  mast.castShadow = true;
  group.add(mast);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M.neonRed);
  beacon.position.y = pylonTop + 1.4;
  group.add(beacon);

  group.userData.animator = (delta, elapsed) => {
    ringGroup.rotation.y += delta * 0.42;
    if (ring2) ring2.rotation.x -= delta * 0.85;
    coreGroup.scale.setScalar(1.0 + Math.sin(elapsed * 3.1) * 0.08);
    coreInner.scale.setScalar(1.0 + Math.sin(elapsed * 5.4) * 0.06);
    plasmaMat.emissiveIntensity = 1.3 + Math.sin(elapsed * 5.4) * 0.55;
    beacon.scale.setScalar(1.0 + Math.sin(elapsed * 2.2) * 0.2);
  };

  return group;
}
