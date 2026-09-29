import * as THREE from 'three';

export function createMissileSilo(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'missile_silo';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Wider collar, longer exposed missile and a second tube up the tiers
  const bodyR = [0.42, 0.45, 0.48, 0.52, 0.55, 0.58][lvl - 1];
  const noseH = [0.80, 0.85, 0.90, 1.00, 1.05, 1.10][lvl - 1];
  const apexY = [4.40, 4.70, 5.02, 5.36, 5.70, 6.00][lvl - 1];
  const collarH = [0.80, 0.86, 0.92, 1.00, 1.06, 1.12][lvl - 1];
  const collarR = bodyR + 0.14 + collarH + [0.30, 0.36, 0.42, 0.50, 0.58, 0.66][lvl - 1];

  const dual = lvl >= 4;
  const padH = 0.30;
  const padTop = padH;
  const padW = dual ? 9.0 : 6.8;
  const padD = dual ? 7.4 : 6.6;
  const padCX = dual ? 0.3 : 0;
  const mainX = dual ? -1.35 : 0;
  const subX = 2.9;
  const collarTop = padTop + collarH;

  const pad = new THREE.Mesh(new THREE.BoxGeometry(padW, padH, padD), M.concrete);
  pad.position.set(padCX, padH / 2, 0);
  pad.receiveShadow = true;
  group.add(pad);

  const apron = new THREE.Mesh(new THREE.CylinderGeometry(collarR + 0.55, collarR + 0.7, 0.12, 12), M.concrete);
  apron.position.set(mainX, padTop + 0.06, 0);
  apron.receiveShadow = true;
  group.add(apron);

  // Collar, bore liner, blast doors and the missile itself
  const buildSilo = (cx, cR, cH, bR, tipY, nH) => {
    const top = padTop + cH;
    const bore = bR + 0.14;
    const holeR = cR - cH;

    const collar = new THREE.Mesh(new THREE.TorusGeometry(cR - cH / 2, cH / 2, 6, 16), M.concrete);
    collar.rotation.x = -Math.PI / 2;
    collar.position.set(cx, padTop + cH / 2 - 0.1, 0);
    collar.castShadow = true;
    group.add(collar);

    const lip = new THREE.Mesh(new THREE.TorusGeometry(holeR + 0.06, 0.08, 6, 16), M.steel);
    lip.rotation.x = -Math.PI / 2;
    lip.position.set(cx, top - 0.1, 0);
    group.add(lip);

    const shaftFloor = new THREE.Mesh(new THREE.CircleGeometry(holeR, 12), M.ironDark);
    shaftFloor.rotation.x = -Math.PI / 2;
    shaftFloor.position.set(cx, padTop + 0.05, 0);
    group.add(shaftFloor);

    const doorSpan = bore * 2 + 0.5;
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(cx, top, s * (cR - 0.12));
      hinge.rotation.x = -s * 1.05;

      const door = new THREE.Mesh(new THREE.BoxGeometry(doorSpan + 0.4, 0.16, doorSpan), M.steel);
      door.position.z = (s * doorSpan) / 2;
      door.castShadow = true;
      hinge.add(door);

      for (const rx of [-0.32, 0.32]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, doorSpan * 0.8), M.ironDark);
        rib.position.set(rx * (doorSpan + 0.4), 0.15, (s * doorSpan) / 2);
        hinge.add(rib);
      }
      group.add(hinge);
    }

    const m = new THREE.Group();
    m.position.x = cx;

    const bodyBottom = padTop + 0.15;
    const bodyLen = tipY - nH - bodyBottom;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(bR, bR, bodyLen, 12), M.policeWhite);
    body.position.y = bodyBottom + bodyLen / 2;
    body.castShadow = true;
    m.add(body);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(bR, nH, 12), M.neonRed);
    nose.position.y = tipY - nH / 2;
    nose.castShadow = true;
    m.add(nose);

    const band = new THREE.Mesh(new THREE.TorusGeometry(bR + 0.04, 0.07, 6, 12), M.steel);
    band.rotation.x = -Math.PI / 2;
    band.position.y = tipY - nH - 0.55;
    m.add(band);

    for (let a = 0; a < 4; a++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = (a * Math.PI) / 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, bR * 1.3, bR * 1.05), M.steel);
      fin.position.set(0, top + 0.55, bR * 1.5);
      fin.castShadow = true;
      pivot.add(fin);
      m.add(pivot);
    }

    group.add(m);
    return m;
  };

  const missile = buildSilo(mainX, collarR, collarH, bodyR, apexY, noseH);

  let subMissile = null;
  let beacon = null;
  let beaconMat = null;

  // Painted approach chevrons either side of the main tube
  if (lvl >= 2) {
    const chevZ = collarR + 0.55;
    for (const s of [-1, 1]) {
      for (let i = 0; i < lvl; i++) {
        const chev = new THREE.Group();
        chev.position.set(mainX + (i - (lvl - 1) / 2) * 0.85, padTop + 0.04, s * chevZ);
        chev.rotation.y = s > 0 ? 0 : Math.PI;
        for (const b of [-1, 1]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.16), M.hazardStripe);
          bar.position.set(b * 0.19, 0, 0.1);
          bar.rotation.y = b * 0.75;
          chev.add(bar);
        }
        group.add(chev);
      }
    }

    const bunkX = padCX + padW / 2 - 1.1;
    const bunkZ = -(padD / 2 - 1.0);
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.0, 1.4), M.concrete);
    bunker.position.set(bunkX, padTop + 0.5, bunkZ);
    bunker.castShadow = true;
    group.add(bunker);

    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.78, 0.7), M.steel);
    hatch.position.set(bunkX - 0.86, padTop + 0.39, bunkZ);
    group.add(hatch);

    const vane = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.2), M.ironDark);
    vane.position.set(bunkX, padTop + 1.06, bunkZ);
    vane.castShadow = true;
    group.add(vane);

    // Rotating warning beacon once the launch crew is staffed
    if (lvl >= 3) {
      beaconMat = M.neonRed.clone();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 6), M.steel);
      post.position.set(bunkX, padTop + 1.32, bunkZ);
      group.add(post);

      beacon = new THREE.Group();
      beacon.position.set(bunkX, padTop + 1.66, bunkZ);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), beaconMat);
      beacon.add(dome);
      const flare = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.12), beaconMat);
      flare.position.y = 0.02;
      beacon.add(flare);
      group.add(beacon);
    }
  }

  // Blast deflector vents on the diagonals
  if (lvl >= 3) {
    const ventR = collarR + 0.5;
    for (let a = 0; a < 4; a++) {
      const ang = Math.PI / 4 + (a * Math.PI) / 2;
      const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.25, 8), M.ironDark);
      duct.position.set(mainX + Math.cos(ang) * ventR, padTop + 0.62, Math.sin(ang) * ventR);
      duct.rotation.z = -Math.cos(ang) * 0.22;
      duct.rotation.x = Math.sin(ang) * 0.22;
      duct.castShadow = true;
      group.add(duct);

      const cap = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 10), M.steel);
      cap.rotation.x = -Math.PI / 2;
      cap.position.set(mainX + Math.cos(ang) * ventR, padTop + 1.24, Math.sin(ang) * ventR);
      group.add(cap);
    }
  }

  // Second hardened tube with its own shorter bird
  if (dual) {
    const subR = [1.40, 1.50, 1.60][lvl - 4];
    const subBodyR = [0.34, 0.36, 0.38][lvl - 4];
    const subApex = [3.50, 3.80, 4.10][lvl - 4];
    subMissile = buildSilo(subX, subR, 0.8, subBodyR, subApex, 0.7);

    const trench = new THREE.Mesh(new THREE.BoxGeometry(subX - mainX - collarR - subR, 0.3, 0.7), M.ironDark);
    trench.position.set((mainX + collarR + subX - subR) / 2, padTop + 0.15, -0.9);
    group.add(trench);
  }

  // Floodlight masts and a second fin set once the site is fully hardened
  if (lvl >= 5) {
    for (const c of [[-1, -1], [1, 1]]) {
      const mx = padCX + c[0] * (padW / 2 - 0.8);
      const mz = c[1] * (padD / 2 - 0.8);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3.0, 6), M.steel);
      mast.position.set(mx, padTop + 1.5, mz);
      mast.castShadow = true;
      group.add(mast);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.36), M.ironDark);
      head.position.set(mx, padTop + 3.1, mz);
      group.add(head);

      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.08), M.neonYellow);
      lamp.position.set(mx - c[0] * 0.2, padTop + 3.06, mz - c[1] * 0.2);
      group.add(lamp);
    }

    for (let a = 0; a < 4; a++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = Math.PI / 4 + (a * Math.PI) / 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.34), M.steel);
      fin.position.set(0, apexY - noseH - 0.95, bodyR * 1.35);
      fin.castShadow = true;
      pivot.add(fin);
      missile.add(pivot);
    }
  }

  // Buttress blocks ringing the collar at the final tier
  if (lvl >= 6) {
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4;
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.45), M.ironDark);
      block.position.set(mainX + Math.cos(ang) * (collarR - 0.1), padTop + 0.25, Math.sin(ang) * (collarR - 0.1));
      block.rotation.y = -ang;
      block.castShadow = true;
      group.add(block);

      const tab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.14), M.hazardStripe);
      tab.position.set(mainX + Math.cos(ang) * (collarR - 0.1), padTop + 0.52, Math.sin(ang) * (collarR - 0.1));
      tab.rotation.y = -ang;
      group.add(tab);
    }
  }

  group.userData.isDefense = true;

  group.userData.animator = (delta, elapsed) => {
    missile.position.y = Math.sin(elapsed * 0.55) * 0.15;
    if (subMissile) subMissile.position.y = Math.sin(elapsed * 0.55 + 2.1) * 0.12;
    if (beacon) beacon.rotation.y += delta * 1.8;
    if (beaconMat) beaconMat.emissiveIntensity = 0.55 + Math.sin(elapsed * 3.4) * 0.45;
  };

  group.userData.muzzleHeight = apexY;
  return group;
}
