import * as THREE from 'three';

export function createEmpDisrupter(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'emp_disrupter';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Bigger shed, taller mast, wider dish and a longer capacitor bank each tier
  const shedW = [3.4, 3.6, 3.8, 4.2, 4.4, 4.6][lvl - 1];
  const shedD = [2.4, 2.5, 2.6, 2.8, 2.9, 3.0][lvl - 1];
  const shedH = [1.3, 1.4, 1.5, 1.7, 1.8, 2.0][lvl - 1];
  const mastH = [1.0, 1.35, 1.7, 2.05, 2.4, 2.7][lvl - 1];
  const dishR = [1.10, 1.30, 1.50, 1.70, 1.90, 2.10][lvl - 1];
  const capCount = [4, 4, 5, 5, 6, 6][lvl - 1];
  const capH = [0.85, 0.95, 1.05, 1.15, 1.25, 1.35][lvl - 1];

  const padH = 0.3;
  const padTop = padH;
  const padW = shedW + 3.4;
  const padD = shedD + 2.9;
  const padZ = 0.45;

  const pad = new THREE.Mesh(new THREE.BoxGeometry(padW, padH, padD), M.concrete);
  pad.position.set(0, padH / 2, padZ);
  pad.receiveShadow = true;
  group.add(pad);

  const curb = new THREE.Mesh(new THREE.BoxGeometry(padW, 0.12, 0.28), M.hazardStripe);
  curb.position.set(0, padTop + 0.06, padZ + padD / 2 - 0.2);
  group.add(curb);

  // Equipment shed
  const shedTop = padTop + shedH;
  const shed = new THREE.Mesh(new THREE.BoxGeometry(shedW, shedH, shedD), M.concrete);
  shed.position.y = padTop + shedH / 2;
  shed.castShadow = true;
  shed.receiveShadow = true;
  group.add(shed);

  const roofH = 0.16;
  const roofTop = shedTop + roofH;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(shedW + 0.3, roofH, shedD + 0.3), M.steel);
  roof.position.y = shedTop + roofH / 2;
  roof.castShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, shedH * 0.62, 0.12), M.ironDark);
  door.position.set(-shedW * 0.26, padTop + shedH * 0.31, shedD / 2 + 0.06);
  group.add(door);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.08), M.cyberBlue);
  panel.position.set(shedW * 0.24, padTop + shedH * 0.66, shedD / 2 + 0.05);
  group.add(panel);

  for (const z of [-shedD * 0.28, shedD * 0.28]) {
    const louvre = new THREE.Mesh(new THREE.BoxGeometry(0.1, shedH * 0.42, 0.8), M.steel);
    louvre.position.set(shedW / 2 + 0.03, padTop + shedH * 0.55, z);
    group.add(louvre);
  }

  // Capacitor bank - caps share one cloned material so they can pulse safely
  const capZ = shedD / 2 + 1.05;
  const capStep = 0.86;
  const rowSpan = (capCount - 1) * capStep;
  const capMat = M.neonYellow.clone();
  const caps = [];

  const rail = new THREE.Mesh(new THREE.BoxGeometry(rowSpan + 1.0, 0.16, 0.8), M.ironDark);
  rail.position.set(0, padTop + 0.08, capZ);
  group.add(rail);

  const railTop = padTop + 0.16;
  for (let i = 0; i < capCount; i++) {
    const x = -rowSpan / 2 + i * capStep;

    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, capH, 8), M.ironDark);
    can.position.set(x, railTop + capH / 2, capZ);
    can.castShadow = true;
    group.add(can);

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 10), M.steel);
    band.rotation.x = -Math.PI / 2;
    band.position.set(x, railTop + capH * 0.55, capZ);
    group.add(band);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.18, 8), capMat);
    cap.position.set(x, railTop + capH + 0.09, capZ);
    group.add(cap);
    caps.push(cap);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 6), M.steel);
    post.position.set(x, railTop + capH + 0.32, capZ);
    group.add(post);
  }

  const bus = new THREE.Mesh(new THREE.BoxGeometry(rowSpan + 0.7, 0.1, 0.14), M.steel);
  bus.position.set(0, railTop + capH + 0.5, capZ);
  group.add(bus);

  const conduitLen = capZ - shedD / 2;
  const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, conduitLen), M.ironDark);
  conduit.position.set(shedW * 0.3, padTop + 0.24, shedD / 2 + conduitLen / 2);
  group.add(conduit);

  // Mast up to the yoke
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.22, 8), M.ironDark);
  collar.position.y = roofTop + 0.11;
  collar.castShadow = true;
  group.add(collar);

  const yokeY = roofTop + mastH;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, mastH, 8), M.steel);
  mast.position.y = roofTop + mastH / 2;
  mast.castShadow = true;
  group.add(mast);

  if (lvl >= 3) {
    const strutTop = roofTop + mastH * 0.5;
    const strutR = 0.95;
    const strutLen = Math.hypot(strutR, strutTop - roofTop);
    const strutLean = Math.atan2(strutR, strutTop - roofTop);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, strutLen, 6), M.steel);
      strut.position.set(Math.cos(a) * strutR * 0.5, (roofTop + strutTop) / 2, Math.sin(a) * strutR * 0.5);
      strut.rotation.z = -Math.cos(a) * strutLean;
      strut.rotation.x = Math.sin(a) * strutLean;
      group.add(strut);
    }
  }

  // Two axis yoke: azimuth turntable carrying an elevation fork
  const forkH = 0.34 + dishR * 0.3;
  const forkX = 0.5 + dishR * 0.16;
  const elev = 0.62;
  const dd = dishR * 0.42;

  const yoke = new THREE.Group();
  yoke.position.y = yokeY;
  group.add(yoke);

  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.26, 12), M.ironDark);
  turntable.position.y = 0.13;
  turntable.castShadow = true;
  yoke.add(turntable);

  const saddle = new THREE.Mesh(new THREE.BoxGeometry(forkX * 2 + 0.3, 0.2, 0.7), M.steel);
  saddle.position.y = 0.36;
  saddle.castShadow = true;
  yoke.add(saddle);

  for (const x of [-forkX, forkX]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, forkH - 0.3, 0.36), M.steel);
    arm.position.set(x, 0.3 + (forkH - 0.3) / 2, 0);
    arm.castShadow = true;
    yoke.add(arm);

    const trunnion = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.22, 8), M.ironDark);
    trunnion.rotation.z = Math.PI / 2;
    trunnion.position.set(x, forkH, 0);
    yoke.add(trunnion);
  }

  const tilt = new THREE.Group();
  tilt.position.y = forkH;
  tilt.rotation.x = elev;
  yoke.add(tilt);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.3, 8), M.steel);
  hub.position.y = 0.05;
  tilt.add(hub);

  const dishGeo = new THREE.ConeGeometry(dishR, dd, 16);
  dishGeo.rotateX(Math.PI);
  const dish = new THREE.Mesh(dishGeo, M.policeWhite);
  dish.position.y = dd / 2;
  dish.castShadow = true;
  tilt.add(dish);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(dishR, 0.075, 6, 16), M.steel);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = dd;
  tilt.add(rim);

  const inner = new THREE.Mesh(new THREE.RingGeometry(dishR * 0.42, dishR * 0.6, 16), M.neonCyan);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = dd + 0.02;
  tilt.add(inner);

  const subreflector = new THREE.Mesh(new THREE.CircleGeometry(dishR * 0.26, 16), M.steel);
  subreflector.rotation.x = -Math.PI / 2;
  subreflector.position.y = dd + 0.04;
  tilt.add(subreflector);

  // Feed horn on a tripod at the focus
  const fy = dd + dishR * 0.55;
  const legBaseY = dd + 0.02;
  const legR = dishR * 0.6;
  const legLen = Math.hypot(legR, fy - legBaseY);
  const legLean = Math.atan2(legR, fy - legBaseY);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, legLen, 6), M.steel);
    leg.position.set(Math.cos(a) * legR * 0.5, (legBaseY + fy) / 2, Math.sin(a) * legR * 0.5);
    leg.rotation.z = -Math.cos(a) * legLean;
    leg.rotation.x = Math.sin(a) * legLean;
    tilt.add(leg);
  }

  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.24, 0.4, 8), M.neonCyan);
  horn.position.y = fy;
  tilt.add(horn);

  const hornTip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), M.neonCyan);
  hornTip.position.y = fy + 0.26;
  tilt.add(hornTip);

  // Counterweight balances the dish from tier 2
  if (lvl >= 2) {
    const weight = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.5), M.ironDark);
    weight.position.y = -0.34;
    weight.castShadow = true;
    tilt.add(weight);
  }

  // Stiffening ribs across the dish back
  if (lvl >= 3) {
    const ribLen = Math.hypot(dishR, dd);
    const ribLean = Math.asin(dd / ribLen);
    for (let i = 0; i < 4; i++) {
      const hinge = new THREE.Group();
      hinge.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, ribLen), M.steel);
      rib.position.set(0, dd / 2 - 0.06, dishR / 2);
      rib.rotation.x = -ribLean;
      hinge.add(rib);
      tilt.add(hinge);
    }
  }

  // Second tracking dish on its own pole from tier 4
  let aux = null;
  if (lvl >= 4) {
    const auxR = dishR * 0.44;
    const auxX = -(shedW / 2 + 1.0);
    const auxZ = -0.35;
    const auxTop = shedTop + 0.7;
    const poleH = auxTop - padTop;

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), M.ironDark);
    foot.position.set(auxX, padTop + 0.09, auxZ);
    group.add(foot);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, poleH, 8), M.steel);
    pole.position.set(auxX, padTop + poleH / 2, auxZ);
    pole.castShadow = true;
    group.add(pole);

    aux = new THREE.Group();
    aux.position.set(auxX, auxTop, auxZ);
    group.add(aux);

    const auxHead = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.24, 8), M.ironDark);
    auxHead.position.y = 0.12;
    aux.add(auxHead);

    const auxTilt = new THREE.Group();
    auxTilt.position.y = 0.26;
    auxTilt.rotation.x = 0.7;
    aux.add(auxTilt);

    const auxDd = auxR * 0.42;
    const auxGeo = new THREE.ConeGeometry(auxR, auxDd, 12);
    auxGeo.rotateX(Math.PI);
    const auxDish = new THREE.Mesh(auxGeo, M.policeWhite);
    auxDish.position.y = auxDd / 2;
    auxDish.castShadow = true;
    auxTilt.add(auxDish);

    const auxRim = new THREE.Mesh(new THREE.TorusGeometry(auxR, 0.05, 6, 12), M.steel);
    auxRim.rotation.x = -Math.PI / 2;
    auxRim.position.y = auxDd;
    auxTilt.add(auxRim);

    const auxPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, auxR * 0.7, 6), M.steel);
    auxPost.position.y = auxDd + auxR * 0.35;
    auxTilt.add(auxPost);

    const auxFeed = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), M.neonCyan);
    auxFeed.position.y = auxDd + auxR * 0.7;
    auxTilt.add(auxFeed);
  }

  // Jammer pods on the fork and a dipole rack on the shed roof
  if (lvl >= 5) {
    for (const x of [-forkX, forkX]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), M.neonCyan);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(x, forkH * 0.5, 0.42);
      yoke.add(pod);
    }

    const rackZ = -(shedD / 2 - 0.3);
    for (const x of [-shedW * 0.3, shedW * 0.3]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 6), M.steel);
      post.position.set(x, roofTop + 0.55, rackZ);
      post.castShadow = true;
      group.add(post);

      for (const y of [0.55, 0.9]) {
        const dipole = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.06), M.neonCyan);
        dipole.position.set(x, roofTop + y, rackZ);
        group.add(dipole);
      }
    }
  }

  // Fully charged: emitter halo, waveguide trunk and a warning beacon
  if (lvl >= 6) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(dishR + 0.2, 0.07, 6, 16), M.neonCyan);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = dd + 0.12;
    tilt.add(halo);

    const guide = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, mastH, 8), M.gold);
    guide.position.set(0.42, roofTop + mastH / 2, 0);
    guide.castShadow = true;
    group.add(guide);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), M.sirenRed);
    beacon.position.set(shedW * 0.35, roofTop + 0.28, shedD * 0.3);
    group.add(beacon);
  }

  group.userData.animator = (delta, elapsed) => {
    yoke.rotation.y = Math.sin(elapsed * 0.4) * 1.15;
    tilt.rotation.x = elev + Math.sin(elapsed * 0.9) * 0.07;
    capMat.emissiveIntensity = 0.55 + Math.sin(elapsed * 2.6) * 0.3;
    for (let i = 0; i < caps.length; i++) {
      const p = Math.sin(elapsed * 3.4 - i * 0.9);
      caps[i].scale.setScalar(p > 0 ? 1 + p * 0.22 : 1);
    }
    if (aux) aux.rotation.y = -Math.sin(elapsed * 0.55 + 1.3) * 1.5;
  };

  return group;
}
