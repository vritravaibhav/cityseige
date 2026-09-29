import * as THREE from 'three';

export function createOilRefinery(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'oil_refinery';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const tube = (ax, ay, az, bx, by, bz, r, mat) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
    m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    m.quaternion.setFromUnitVectors(up, dir.set(dx / len, dy / len, dz / len));
    group.add(m);
    return m;
  };

  // Tier drives column height, tank size, flare height and how much pipework is bolted on
  const padTop = 0.3;
  const colH = [4.2, 5.0, 5.8, 6.6, 7.4, 8.2][lvl - 1];
  const colR = [0.72, 0.78, 0.84, 0.90, 0.96, 1.02][lvl - 1];
  const collarCount = [3, 3, 4, 4, 5, 5][lvl - 1];
  const tankR = [1.20, 1.32, 1.42, 1.50, 1.56, 1.62][lvl - 1];
  const tankH = [1.50, 1.70, 1.90, 2.10, 2.30, 2.50][lvl - 1];
  const flareH = [3.8, 4.5, 5.2, 6.0, 6.8, 7.6][lvl - 1];
  const flameH = [0.70, 0.80, 0.90, 1.05, 1.20, 1.35][lvl - 1];
  const rackY = [1.00, 1.10, 1.20, 1.30, 1.40, 1.50][lvl - 1];

  const colX = -2.6, colZ = -2.6;
  const flareX = 3.8, flareZ = 3.7;
  const headerX = 0.4;

  // Containment pad with a painted hazard kerb
  const pad = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.3, 9.4), M.concrete);
  pad.position.y = padTop / 2;
  pad.receiveShadow = true;
  group.add(pad);

  for (const z of [-4.55, 4.55]) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.18, 0.3), M.hazardStripe);
    kerb.position.set(0, padTop + 0.09, z);
    group.add(kerb);
  }
  for (const x of [-4.55, 4.55]) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 9.4), M.hazardStripe);
    kerb.position.set(x, padTop + 0.09, 0);
    group.add(kerb);
  }

  // Fractionating column on a cast skirt
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(colR * 1.15, colR * 1.25, 0.6, 12), M.ironDark);
  skirt.position.set(colX, padTop + 0.3, colZ);
  skirt.castShadow = true;
  group.add(skirt);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(colR, colR * 1.06, colH, 12), M.steel);
  column.position.set(colX, padTop + colH / 2, colZ);
  column.castShadow = true;
  group.add(column);

  for (let i = 0; i < collarCount; i++) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(colR + 0.05, 0.14, 6, 12), M.ironDark);
    collar.rotation.x = -Math.PI / 2;
    collar.position.set(colX, padTop + (colH * (i + 1)) / (collarCount + 1), colZ);
    group.add(collar);
  }

  const colTopY = padTop + colH;
  const domeH = colR * 0.55;
  const colDome = new THREE.Mesh(new THREE.SphereGeometry(colR, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.steel);
  colDome.scale.y = 0.55;
  colDome.position.set(colX, colTopY, colZ);
  colDome.castShadow = true;
  group.add(colDome);

  const ventTopY = colTopY + domeH + 0.7;
  const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.7, 8), M.ironDark);
  vent.position.set(colX, ventTopY - 0.35, colZ);
  vent.castShadow = true;
  group.add(vent);

  for (let i = 0; i < Math.floor(colH / 0.55); i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.62), M.steel);
    rung.position.set(colX - colR - 0.18, padTop + 0.4 + i * 0.55, colZ);
    group.add(rung);
  }

  // Storage tank farm - two squat drums, a third at lvl 3 and a fourth at lvl 5
  const spots = [[2.7, -2.5], [2.7, 1.4]];
  if (lvl >= 3) spots.push([-0.4, 3.1]);
  if (lvl >= 5) spots.push([-3.05, 0.7]);

  const tankTopY = padTop + 0.25 + tankH;
  spots.forEach(([tx, tz]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(tankR + 0.10, tankR + 0.14, 0.25, 12), M.ironDark);
    ring.position.set(tx, padTop + 0.125, tz);
    ring.receiveShadow = true;
    group.add(ring);

    const shell = new THREE.Mesh(new THREE.CylinderGeometry(tankR, tankR, tankH, 12), M.concrete);
    shell.position.set(tx, padTop + 0.25 + tankH / 2, tz);
    shell.castShadow = true;
    group.add(shell);

    const band = new THREE.Mesh(new THREE.TorusGeometry(tankR + 0.02, 0.09, 6, 12), M.hazardStripe);
    band.rotation.x = -Math.PI / 2;
    band.position.set(tx, padTop + 0.25 + tankH * 0.32, tz);
    group.add(band);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(tankR, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.steel);
    dome.scale.y = 0.4;
    dome.position.set(tx, tankTopY, tz);
    dome.castShadow = true;
    group.add(dome);

    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.3, 8), M.ironDark);
    hatch.position.set(tx, tankTopY + tankR * 0.4 + 0.1, tz);
    group.add(hatch);

    const side = tx > headerX ? -1 : 1;
    for (let i = 0; i < Math.floor(tankH / 0.5); i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), M.steel);
      rung.position.set(tx + side * (tankR + 0.12), padTop + 0.5 + i * 0.5, tz);
      group.add(rung);
    }

    // Riser off the manifold into the tank roof
    const riserX = tx + side * tankR;
    tube(riserX, rackY, tz, riserX, tankTopY + 0.15, tz, 0.09, M.steel);
    tube(riserX, tankTopY + 0.15, tz, tx, tankTopY + 0.15, tz, 0.09, M.steel);
    tube(headerX, rackY, tz, riserX, rackY, tz, 0.11, M.steel);
  });

  // Pipe manifold - a header run down the site with trestle supports
  tube(headerX, rackY, -3.8, headerX, rackY, 3.8, 0.14, M.steel);
  tube(headerX, rackY, colZ, colX + colR, rackY, colZ, 0.12, M.steel);

  for (const z of [-3.2, -0.4, 3.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, rackY - padTop, 0.16), M.ironDark);
    post.position.set(headerX, padTop + (rackY - padTop) / 2, z);
    group.add(post);
  }

  if (lvl >= 3) {
    const upperY = rackY + 0.55;
    tube(headerX - 0.36, upperY, -3.4, headerX - 0.36, upperY, 3.4, 0.10, M.steel);
    tube(headerX - 0.36, upperY, colZ, colX + colR, upperY, colZ, 0.10, M.steel);
    tube(headerX - 0.36, upperY, 1.4, headerX - 0.36, rackY, 1.4, 0.10, M.steel);
  }

  if (lvl >= 4) {
    // Inspection catwalk wrapped round the column
    const catwalkY = padTop + colH * 0.62;
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(colR + 0.55, colR + 0.55, 0.09, 12), M.steel);
    deck.position.set(colX, catwalkY, colZ);
    deck.castShadow = true;
    group.add(deck);

    const rail = new THREE.Mesh(new THREE.TorusGeometry(colR + 0.52, 0.055, 6, 16), M.ironDark);
    rail.rotation.x = -Math.PI / 2;
    rail.position.set(colX, catwalkY + 0.45, colZ);
    group.add(rail);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.neonRed);
    beacon.position.set(colX, ventTopY + 0.16, colZ);
    group.add(beacon);
  }

  if (lvl >= 5) {
    // Compressor house and heat exchangers feeding the upper trays
    const house = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 1.4), M.concrete);
    house.position.set(-1.2, padTop + 0.55, -3.8);
    house.castShadow = true;
    group.add(house);

    const houseRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.6), M.ironDark);
    houseRoof.position.set(-1.2, padTop + 1.18, -3.8);
    houseRoof.castShadow = true;
    group.add(houseRoof);

    for (const x of [-1.9, -0.5]) {
      const exch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.6, 8), M.steel);
      exch.rotation.z = Math.PI / 2;
      exch.position.set(x, padTop + 1.5, -3.8);
      exch.castShadow = true;
      group.add(exch);
    }
    tube(-0.4, padTop + 1.5, -3.8, headerX, rackY, -3.4, 0.09, M.steel);
  }

  if (lvl >= 6) {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + 0.5;
      tube(
        flareX, padTop + 0.4 + flareH * 0.72, flareZ,
        flareX + Math.cos(a) * 1.0, padTop, flareZ + Math.sin(a) * 0.8,
        0.045, M.ironDark
      );
    }
    const knockout = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.8, 8), M.ironDark);
    knockout.rotation.z = Math.PI / 2;
    knockout.position.set(2.0, padTop + 0.62, 3.9);
    knockout.castShadow = true;
    group.add(knockout);
    tube(2.9, padTop + 0.62, 3.9, flareX, rackY, flareZ, 0.09, M.steel);
  }

  // Flare stack
  const flareBase = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.4, 8), M.concrete);
  flareBase.position.set(flareX, padTop + 0.2, flareZ);
  flareBase.receiveShadow = true;
  group.add(flareBase);

  const stackBase = padTop + 0.4;
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, flareH, 8), M.steel);
  stack.position.set(flareX, stackBase + flareH / 2, flareZ);
  stack.castShadow = true;
  group.add(stack);

  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 10), M.ironDark);
    band.rotation.x = -Math.PI / 2;
    band.position.set(flareX, stackBase + (flareH * (i + 1)) / 4, flareZ);
    group.add(band);
  }

  const flareTopY = stackBase + flareH;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.45, 8), M.ironDark);
  tip.position.set(flareX, flareTopY + 0.225, flareZ);
  tip.castShadow = true;
  group.add(tip);

  const pilotRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 10), M.gold);
  pilotRing.rotation.x = -Math.PI / 2;
  pilotRing.position.set(flareX, flareTopY + 0.42, flareZ);
  group.add(pilotRing);

  const flameMat = M.moltenIron.clone();
  const flame = new THREE.Group();
  flame.position.set(flareX, flareTopY + 0.45, flareZ);
  group.add(flame);

  const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.3 + lvl * 0.02, flameH, 8), flameMat);
  tongue.position.y = flameH / 2;
  flame.add(tongue);

  const coreFlame = new THREE.Mesh(new THREE.ConeGeometry(0.16, flameH * 0.62, 6), M.neonYellow);
  coreFlame.position.y = flameH * 0.33;
  flame.add(coreFlame);

  group.userData.animator = (delta, elapsed) => {
    const f = Math.sin(elapsed * 9.3) * 0.62 + Math.sin(elapsed * 21.7) * 0.34;
    flame.scale.set(1 + f * 0.16, 1 + f * 0.30, 1 + f * 0.16);
    flameMat.emissiveIntensity = 0.8 + f * 0.45;
  };

  return group;
}
