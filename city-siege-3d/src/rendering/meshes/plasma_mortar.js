import * as THREE from 'three';

export function createPlasmaMortar(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'plasma_mortar';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Tier drives turntable height, bore calibre, tube length and how much ammo is parked alongside
  const padH = 0.3;
  const turnR = [1.90, 2.00, 2.10, 2.20, 2.32, 2.44][lvl - 1];
  const turnH = [0.85, 0.90, 0.96, 1.03, 1.10, 1.16][lvl - 1];
  const tubeR = [0.48, 0.52, 0.56, 0.62, 0.68, 0.74][lvl - 1];
  const tubeLen = [2.50, 2.56, 2.62, 2.68, 2.74, 2.80][lvl - 1];
  const drumCount = [1, 1, 2, 2, 3, 4][lvl - 1];
  const drumH = [0.90, 0.95, 1.00, 1.05, 1.10, 1.15][lvl - 1];

  const padR = turnR + 0.45;
  const deckY = padH + turnH;
  const trunnionY = 0.6;
  const tilt = Math.PI * 35 / 180;
  const dy = Math.cos(tilt), dz = Math.sin(tilt);
  const breechZ = -0.35;
  const twin = lvl >= 4;
  const offX = twin ? tubeR + 0.12 : 0;
  const armX = offX + tubeR + 0.26;
  const muzzleY = deckY + trunnionY + dy * tubeLen;

  const boreMat = M.neonRed.clone();
  const coilMat = M.neonCyan.clone();

  // Sunken concrete emplacement pad
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(padR, padR + 0.14, padH, 12), M.concrete);
  pad.position.y = padH / 2;
  pad.receiveShadow = true;
  group.add(pad);

  if (lvl >= 2) {
    const kerb = new THREE.Mesh(new THREE.TorusGeometry(padR - 0.18, 0.1, 6, 16), M.hazardStripe);
    kerb.rotation.x = -Math.PI / 2;
    kerb.position.y = padH + 0.02;
    group.add(kerb);
  }

  // Armoured turntable
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(turnR, turnR + 0.14, turnH, 12), M.ironDark);
  turntable.position.y = padH + turnH / 2;
  turntable.castShadow = true;
  group.add(turntable);

  const race = new THREE.Mesh(new THREE.TorusGeometry(turnR - 0.05, 0.11, 6, 16), M.steel);
  race.rotation.x = -Math.PI / 2;
  race.position.y = deckY - 0.04;
  group.add(race);

  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 6), M.steel);
    bolt.position.set(Math.cos(a) * (turnR - 0.34), deckY + 0.04, Math.sin(a) * (turnR - 0.34));
    group.add(bolt);
  }

  // Traversing carriage - everything that swings lives under this pivot
  const pivot = new THREE.Group();
  pivot.position.y = deckY;
  group.add(pivot);

  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(turnR * 0.66, turnR * 0.74, 0.34, 12), M.ironDark);
  yoke.position.y = 0.17;
  yoke.castShadow = true;
  pivot.add(yoke);

  for (const x of [-armX, armX]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.78, 0.66), M.steel);
    arm.position.set(x, 0.39, breechZ + 0.18);
    arm.castShadow = true;
    pivot.add(arm);
  }

  const trunnion = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, armX * 2, 8), M.steel);
  trunnion.rotation.z = Math.PI / 2;
  trunnion.position.set(0, trunnionY, breechZ + 0.18);
  pivot.add(trunnion);

  const coils = [];
  const tubeX = twin ? [-offX, offX] : [0];
  for (const x of tubeX) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(tubeR * 0.92, tubeR, tubeLen, 12), M.steel);
    tube.rotation.x = tilt;
    tube.position.set(x, trunnionY + dy * tubeLen / 2, breechZ + dz * tubeLen / 2);
    tube.castShadow = true;
    pivot.add(tube);

    const breech = new THREE.Mesh(new THREE.SphereGeometry(tubeR + 0.08, 10, 8), M.ironDark);
    breech.position.set(x, trunnionY, breechZ);
    breech.castShadow = true;
    pivot.add(breech);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(tubeR + 0.1, tubeR + 0.1, 0.24, 12), M.ironDark);
    collar.rotation.x = tilt;
    collar.position.set(x, trunnionY + dy * tubeLen * 0.82, breechZ + dz * tubeLen * 0.82);
    pivot.add(collar);

    const bore = new THREE.Mesh(new THREE.CylinderGeometry(tubeR * 0.62, tubeR * 0.62, 0.2, 12), boreMat);
    bore.rotation.x = tilt;
    bore.position.set(x, trunnionY + dy * (tubeLen - 0.13), breechZ + dz * (tubeLen - 0.13));
    pivot.add(bore);

    // Recoil dampers slung under the tube
    if (lvl >= 3) {
      const damperLen = tubeLen * 0.5;
      const damper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, damperLen, 8), M.steel);
      damper.rotation.x = tilt;
      damper.position.set(x, trunnionY - 0.3 + dy * damperLen / 2, breechZ + 0.12 + dz * damperLen / 2);
      pivot.add(damper);
    }

    // Plasma accelerator coils clamped round the bore
    if (lvl >= 5) {
      for (let i = 0; i < 2; i++) {
        const t = 0.46 + i * 0.2;
        const coil = new THREE.Mesh(new THREE.TorusGeometry(tubeR + 0.12, 0.09, 6, 12), coilMat);
        coil.rotation.x = tilt - Math.PI / 2;
        coil.position.set(x, trunnionY + dy * tubeLen * t, breechZ + dz * tubeLen * t);
        pivot.add(coil);
        coils.push(coil);
      }
    }
  }

  // Loader hopper riding behind the breech
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(armX * 1.5, 0.5, 0.7), M.ironDark);
  hopper.position.set(0, 0.55, breechZ - 0.6);
  hopper.castShadow = true;
  pivot.add(hopper);

  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 8), M.neonRed);
  feed.rotation.x = Math.PI / 2;
  feed.position.set(0, 0.55, breechZ - 1.0);
  pivot.add(feed);

  // Ammo drums with shell tips showing above the rim
  const drumAngles = [2.35, -2.35, Math.PI, 1.55];
  const drumRing = padR + 0.72;
  for (let d = 0; d < drumCount; d++) {
    const a = drumAngles[d];
    const dx = Math.cos(a) * drumRing, dz2 = Math.sin(a) * drumRing;

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, drumH, 10), M.ironDark);
    drum.position.set(dx, drumH / 2, dz2);
    drum.castShadow = true;
    group.add(drum);

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 12), M.steel);
    band.rotation.x = -Math.PI / 2;
    band.position.set(dx, drumH * 0.6, dz2);
    group.add(band);

    for (let s = 0; s < 3; s++) {
      const sa = a + s * 2.1;
      const shell = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 6), M.neonRed);
      shell.position.set(dx + Math.cos(sa) * 0.24, drumH + 0.16, dz2 + Math.sin(sa) * 0.24);
      group.add(shell);
    }
  }

  // Outrigger jacks bracing the emplacement
  if (lvl >= 3) {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const jack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 1.0), M.steel);
      jack.position.set(Math.cos(a) * (turnR + 0.3), padH + 0.13, Math.sin(a) * (turnR + 0.3));
      jack.rotation.y = -a;
      group.add(jack);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.26, 8), M.ironDark);
      foot.position.set(Math.cos(a) * (turnR + 0.78), padH + 0.13, Math.sin(a) * (turnR + 0.78));
      foot.castShadow = true;
      group.add(foot);
    }
  }

  // Blast deflectors and a charged conduit ring on the heaviest tiers
  if (lvl >= 5) {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.22), M.ironDark);
      plate.position.set(Math.cos(a) * (padR - 0.12), padH + 0.45, Math.sin(a) * (padR - 0.12));
      plate.rotation.y = -a + Math.PI / 2;
      plate.rotation.x = 0.28;
      plate.castShadow = true;
      group.add(plate);
    }

    const conduit = new THREE.Mesh(new THREE.TorusGeometry(padR - 0.55, 0.08, 6, 16), coilMat);
    conduit.rotation.x = -Math.PI / 2;
    conduit.position.y = padH + 0.06;
    group.add(conduit);
  }

  if (lvl >= 6) {
    for (const x of [-1, 1]) {
      const capacitor = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.2, 8), M.steel);
      capacitor.position.set(x * (turnR + 0.6), padH + 0.6, -turnR * 0.55);
      capacitor.castShadow = true;
      group.add(capacitor);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), M.neonCyan);
      cap.position.set(x * (turnR + 0.6), padH + 1.28, -turnR * 0.55);
      group.add(cap);
    }
  }

  group.userData.animator = (delta, elapsed) => {
    pivot.rotation.y = Math.sin(elapsed * 0.5) * 0.25;
    boreMat.emissiveIntensity = 0.8 + Math.sin(elapsed * 3.2) * 0.4;
    coilMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 5.0) * 0.3;
    for (let i = 0; i < coils.length; i++) {
      coils[i].scale.setScalar(1.0 + Math.sin(elapsed * 4.0 + i) * 0.06);
    }
  };

  group.userData.muzzleHeight = muzzleY;
  return group;
}
