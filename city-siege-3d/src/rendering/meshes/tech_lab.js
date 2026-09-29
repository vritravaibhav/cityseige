import * as THREE from 'three';

export function createTechLab(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'tech_lab';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Tier drives storey count, shell size and how much hardware is bolted on
  const storeys = [1, 1, 2, 2, 3, 3][lvl - 1];
  const storeyH = [2.1, 2.4, 1.85, 2.0, 1.65, 1.75][lvl - 1];
  const w = [4.0, 4.4, 4.8, 5.2, 5.6, 6.0][lvl - 1];
  const rackCols = [3, 4, 4, 5, 5, 6][lvl - 1];
  const dishR = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3][lvl - 1];

  const padT = 0.3;
  const baseY = padT;
  const shellH = storeys * storeyH + 0.2;
  const roofY = baseY + shellH;
  const glassH = storeyH - 0.2;

  // Pulsing server glow - one clone, never the shared singleton
  const glowMat = M.neonCyan.clone();

  const pad = new THREE.Mesh(new THREE.BoxGeometry(w + 1.6, padT, w + 1.6), M.concrete);
  pad.position.y = padT / 2;
  pad.receiveShadow = true;
  group.add(pad);

  // Steel floor slabs, one per storey plus the roof deck
  for (let s = 0; s <= storeys; s++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.2, w + 0.6), M.steel);
    slab.position.y = baseY + s * storeyH + 0.1;
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
  }

  // Curtain-wall glass between the slabs
  for (let s = 0; s < storeys; s++) {
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, glassH, w), M.carGlass);
    glass.position.y = baseY + s * storeyH + storeyH / 2 + 0.1;
    glass.castShadow = true;
    group.add(glass);
  }

  const colOff = w / 2 + 0.1;
  for (const cx of [-colOff, colOff]) {
    for (const cz of [-colOff, colOff]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.34, shellH, 0.34), M.steel);
      col.position.set(cx, baseY + shellH / 2, cz);
      col.castShadow = true;
      group.add(col);
    }
  }

  // Server racks behind the glass, second row once the lab expands
  const rackW = Math.min(0.62, (w - 0.8) / (rackCols + 0.6));
  const rackH = glassH * 0.6;
  const rackRows = lvl >= 3 ? [-w * 0.24, w * 0.16] : [-w * 0.12];
  for (let s = 0; s < storeys; s++) {
    const floorTop = baseY + s * storeyH + 0.2;
    for (const rz of rackRows) {
      for (let i = 0; i < rackCols; i++) {
        const rx = (i - (rackCols - 1) / 2) * rackW * 1.45;
        const rack = new THREE.Mesh(new THREE.BoxGeometry(rackW, rackH, rackW * 0.72), M.ironDark);
        rack.position.set(rx, floorTop + rackH / 2, rz);
        rack.castShadow = true;
        group.add(rack);

        const strip = new THREE.Mesh(new THREE.BoxGeometry(rackW * 0.46, rackH * 0.7, 0.06), glowMat);
        strip.position.set(rx, floorTop + rackH / 2, rz + rackW * 0.4);
        group.add(strip);
      }
    }
  }

  // Entrance bay on the front face
  const doorH = Math.min(1.5, glassH * 0.8);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, doorH, 0.16), M.ironDark);
  door.position.set(0, baseY + 0.2 + doorH / 2, w / 2 + 0.05);
  door.castShadow = true;
  group.add(door);

  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(1.1, doorH * 0.7, 0.1), M.cyberBlue);
  doorGlass.position.set(0, baseY + 0.2 + doorH * 0.55, w / 2 + 0.14);
  group.add(doorGlass);

  const mountDish = (px, pz, r, spin) => {
    const mastH = 0.45;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, mastH, 8), M.steel);
    mast.position.set(px, roofY + mastH / 2, pz);
    mast.castShadow = true;
    group.add(mast);

    const pivot = new THREE.Group();
    pivot.position.set(px, roofY + mastH, pz);
    pivot.userData.spin = spin;
    group.add(pivot);

    const tilt = new THREE.Group();
    tilt.rotation.x = -0.55;
    pivot.add(tilt);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), M.policeWhite);
    dish.rotation.x = Math.PI;
    dish.scale.y = 0.6;
    dish.position.y = r * 0.6;
    dish.castShadow = true;
    tilt.add(dish);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.97, r * 0.05, 6, 12), M.steel);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = r * 0.5;
    tilt.add(rim);

    const horn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.16, r * 0.4, 8), M.ironDark);
    horn.rotation.x = Math.PI;
    horn.position.y = r * 0.82;
    tilt.add(horn);

    return pivot;
  };

  const dishPivot = mountDish(0, 0, dishR, 0.35);

  // Exterior mullion bands and a service ladder from tier 3
  if (lvl >= 3) {
    for (let s = 1; s <= storeys; s++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.36, 0.14, w + 0.36), M.steel);
      band.position.y = baseY + s * storeyH - storeyH * 0.45;
      group.add(band);
    }
    const rungs = Math.floor(shellH / 0.5);
    for (let i = 0; i < rungs; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.07), M.steel);
      rung.position.set(0, baseY + 0.4 + i * 0.5, -w / 2 - 0.2);
      group.add(rung);
    }
    const coolant = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, shellH, 8), M.ironDark);
    coolant.position.set(w / 2 + 0.25, baseY + shellH / 2, -w / 2 + 0.5);
    coolant.castShadow = true;
    group.add(coolant);
  }

  // Second dish and the antenna array come online at tier 4
  let dish2Pivot = null;
  if (lvl >= 4) {
    dish2Pivot = mountDish(w * 0.3, w * 0.28, dishR * 0.6, -0.5);

    const antCount = lvl === 6 ? 6 : 4;
    const antH = [0, 0, 0, 0.9, 1.05, 1.2][lvl - 1];
    const railW = w * 0.72;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(railW, 0.14, 0.22), M.steel);
    rail.position.set(0, roofY + 0.07, -w * 0.3);
    rail.castShadow = true;
    group.add(rail);

    for (let i = 0; i < antCount; i++) {
      const ax = (i - (antCount - 1) / 2) * (railW / antCount);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, antH, 6), glowMat);
      rod.position.set(ax, roofY + 0.14 + antH / 2, -w * 0.3);
      group.add(rod);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), glowMat);
      tip.position.set(ax, roofY + 0.14 + antH, -w * 0.3);
      group.add(tip);
    }
  }

  // Flanking cooling pods and a ground data ring at tier 5
  if (lvl >= 5) {
    for (const sx of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 2.2), M.ironDark);
      pod.position.set(sx * (w / 2 + 0.75), baseY + 0.75, -w * 0.12);
      pod.castShadow = true;
      group.add(pod);

      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 10), M.steel);
      vent.position.set(sx * (w / 2 + 0.75), baseY + 1.6, -w * 0.12);
      group.add(vent);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 2.24), M.hazardStripe);
      stripe.position.set(sx * (w / 2 + 0.75), baseY + 1.35, -w * 0.12);
      group.add(stripe);
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.62, 0.07, 6, 16), glowMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = padT + 0.04;
    group.add(ring);
  }

  // Top tier: solar wings and a roof parapet
  if (lvl === 6) {
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 6), M.steel);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(sx * (w / 2 + 0.35), roofY + 0.4, w * 0.18);
      group.add(arm);

      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 2.4), M.cyberBlue);
      wing.rotation.z = sx * 0.5;
      wing.position.set(sx * (w / 2 + 0.85), roofY + 0.62, w * 0.18);
      wing.castShadow = true;
      group.add(wing);
    }

    const parapet = [
      { x: 0, z: w / 2 + 0.2, sx: w + 0.6, sz: 0.16 },
      { x: -w / 2 - 0.2, z: 0, sx: 0.16, sz: w + 0.6 },
      { x: w / 2 + 0.2, z: 0, sx: 0.16, sz: w + 0.6 }
    ];
    parapet.forEach(p => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(p.sx, 0.34, p.sz), M.steel);
      bar.position.set(p.x, roofY + 0.17, p.z);
      bar.castShadow = true;
      group.add(bar);
    });
  }

  group.userData.animator = (delta, elapsed) => {
    dishPivot.rotation.y += delta * dishPivot.userData.spin;
    if (dish2Pivot) dish2Pivot.rotation.y += delta * dish2Pivot.userData.spin;
    glowMat.emissiveIntensity = 0.55 + Math.sin(elapsed * 3.2) * 0.35;
  };

  return group;
}
