import * as THREE from 'three';

export function createOrbitalRelay(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'orbital_relay';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  const mastH = [11.6, 13.2, 14.8, 16.4, 18.0, 19.4][lvl - 1];
  const braceCount = [8, 9, 10, 12, 13, 14][lvl - 1];
  const dishR = [1.2, 1.4, 1.6, 1.8, 2.0, 2.2][lvl - 1];
  const padR = [2.8, 2.9, 3.0, 3.1, 3.2, 3.3][lvl - 1];

  const padH = 0.45;
  const baseY = padH;
  const bw = 1.3;
  const tw = 0.45;
  const mastTopY = baseY + mastH;
  const hwAt = (y) => bw + (tw - bw) * ((y - baseY) / mastH);
  const aim = (mesh, dx, dz, len) => {
    const rz = -Math.asin(dx / len);
    mesh.rotation.z = rz;
    mesh.rotation.x = Math.asin(dz / len / Math.cos(rz));
  };

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(padR, padR + 0.2, padH, 8), M.concrete);
  pad.position.y = padH / 2;
  pad.castShadow = true;
  pad.receiveShadow = true;
  group.add(pad);

  const hazard = new THREE.Mesh(new THREE.TorusGeometry(padR - 0.45, 0.12, 6, 16), M.hazardStripe);
  hazard.rotation.x = -Math.PI / 2;
  hazard.position.y = padH;
  group.add(hazard);

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.9), M.ironDark);
  cabinet.position.set(0, padH + 0.55, padR - 1.05);
  cabinet.castShadow = true;
  group.add(cabinet);

  const cabPanel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.08), M.cyberBlue);
  cabPanel.position.set(0, padH + 0.62, padR - 0.58);
  group.add(cabPanel);

  const footTopY = baseY + 2.6;
  const spread = (padR - 0.55) * Math.SQRT1_2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const bx = sx * spread;
      const bz = sz * spread;
      const dx = sx * hwAt(footTopY) - bx;
      const dz = sz * hwAt(footTopY) - bz;
      const dy = footTopY - padH;
      const len = Math.hypot(dx, dy, dz);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.28, len, 6), M.steel);
      foot.position.set(bx + dx / 2, padH + dy / 2, bz + dz / 2);
      aim(foot, dx, dz, len);
      foot.castShadow = true;
      group.add(foot);

      const px = sx * (tw - bw);
      const pz = sz * (tw - bw);
      const plen = Math.hypot(px, mastH, pz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, plen, 6), M.steel);
      post.position.set(sx * bw + px / 2, baseY + mastH / 2, sz * bw + pz / 2);
      aim(post, px, pz, plen);
      post.castShadow = true;
      group.add(post);
    }
  }

  const segH = mastH / (braceCount + 1);
  for (let i = 0; i < braceCount; i++) {
    const y = baseY + segH * (i + 1);
    const hw = hwAt(y);
    const f = i % 4;

    const tie = new THREE.Mesh(new THREE.BoxGeometry(hw * 2.1, 0.16, 0.16), M.ironDark);
    tie.position.set(f === 1 ? hw : f === 3 ? -hw : 0, y, f === 0 ? hw : f === 2 ? -hw : 0);
    tie.rotation.y = f % 2 ? Math.PI / 2 : 0;
    tie.castShadow = true;
    group.add(tie);

    const diag = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(hw * 2, segH), 0.13, 0.13), M.ironDark);
    diag.position.set(0, y + segH / 2, i % 2 ? hw : -hw);
    diag.rotation.z = (i % 2 ? 1 : -1) * Math.atan2(segH, hw * 2);
    group.add(diag);
  }

  const cap = new THREE.Mesh(new THREE.BoxGeometry(tw * 2.8, 0.22, tw * 2.8), M.steel);
  cap.position.y = mastTopY + 0.11;
  cap.castShadow = true;
  group.add(cap);

  const dishY = mastTopY - 2.6;

  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 1.9), M.steel);
  deck.position.y = dishY - 0.55;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 6, 12), M.ironDark);
  rail.rotation.x = -Math.PI / 2;
  rail.position.y = dishY - 0.05;
  group.add(rail);

  const dishPivot = new THREE.Group();
  dishPivot.position.y = dishY;
  group.add(dishPivot);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.24, 0.24), M.steel);
  arm.position.x = 0.7;
  arm.castShadow = true;
  dishPivot.add(arm);

  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8), M.ironDark);
  yoke.position.set(1.25, 0.4, 0);
  dishPivot.add(yoke);

  const dish = new THREE.Mesh(new THREE.CylinderGeometry(dishR, dishR * 0.3, dishR * 0.42, 12), M.policeWhite);
  dish.position.set(1.2 + dishR * 0.3, 0.75, 0);
  dish.rotation.z = -0.55;
  dish.castShadow = true;
  dishPivot.add(dish);

  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, dishR * 0.8, 6), M.steel);
  horn.position.y = dishR * 0.55;
  dish.add(horn);

  const hornTip = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), M.neonCyan);
  hornTip.position.y = dishR * 0.98;
  dish.add(hornTip);

  const pivot2 = new THREE.Group();
  pivot2.position.y = dishY - 3.4;
  if (lvl >= 3) {
    group.add(pivot2);
    const r2 = dishR * 0.6;

    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.2), M.steel);
    arm2.position.x = -0.55;
    pivot2.add(arm2);

    const dish2 = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2 * 0.3, r2 * 0.42, 10), M.policeWhite);
    dish2.position.set(-1.0 - r2 * 0.3, 0.5, 0);
    dish2.rotation.z = 0.75;
    dish2.castShadow = true;
    pivot2.add(dish2);

    const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.13, r2 * 0.7, 6), M.steel);
    horn2.position.y = r2 * 0.55;
    dish2.add(horn2);
  }

  const rings = [];
  if (lvl >= 5) {
    const ringY = mastTopY - 1.1;
    for (let i = 0; i < lvl - 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05 + i * 0.28, 0.1, 6, 16), M.neonCyan);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = ringY - i * 0.55;
      group.add(ring);
      rings.push(ring);
    }
    for (let a = 0; a < 4; a++) {
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), M.cyberBlue);
      node.position.set(Math.cos((a * Math.PI) / 2) * 1.05, ringY + 0.45, Math.sin((a * Math.PI) / 2) * 1.05);
      group.add(node);
    }
  }

  const beaconMat = M.neonRed.clone();

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.18, 1.2, 6), M.steel);
  finial.position.y = mastTopY + 0.82;
  finial.castShadow = true;
  group.add(finial);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), beaconMat);
  beacon.position.y = mastTopY + 1.7;
  group.add(beacon);

  if (lvl >= 4) {
    for (const s of [-1, 1]) {
      const y = baseY + mastH * (s > 0 ? 0.62 : 0.38);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), beaconMat);
      lamp.position.set(s * (hwAt(y) + 0.12), y, 0);
      group.add(lamp);
    }
  }

  group.userData.animator = (delta, elapsed) => {
    dishPivot.rotation.y += delta * 0.35;
    pivot2.rotation.y -= delta * 0.5;
    for (let i = 0; i < rings.length; i++) rings[i].rotation.z += delta * (0.9 + i * 0.4);
    const blink = Math.pow(Math.max(0, Math.sin(elapsed * 2.4)), 8);
    beaconMat.emissiveIntensity = 0.3 + blink * 2.8;
  };

  return group;
}
