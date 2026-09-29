import * as THREE from 'three';

export function createCryptoVault(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'crypto_vault';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Tier drives bullion mass: bigger cube, heavier armour, wider ledger
  const w = [3.2, 3.6, 4.0, 4.4, 4.8, 5.2][lvl - 1];
  const cubeH = [2.0, 2.4, 2.8, 3.1, 3.4, 3.7][lvl - 1];
  const armorT = [0.36, 0.42, 0.5, 0.58, 0.66, 0.74][lvl - 1];
  const plateT = [0.1, 0.14, 0.18, 0.22, 0.26, 0.3][lvl - 1];
  const doorR = [0.62, 0.78, 0.9, 1.0, 1.1, 1.2][lvl - 1];
  const panelW = [1.1, 1.25, 1.4, 1.55, 1.7, 1.85][lvl - 1];
  const panelH = [0.55, 0.65, 0.75, 0.85, 0.95, 1.05][lvl - 1];
  const lineCount = [3, 3, 4, 4, 5, 5][lvl - 1];
  const barLayers = [0, 0, 2, 3, 4, 5][lvl - 1];

  const padT = 0.3;
  const baseY = padT;
  const roofY = baseY + cubeH;
  const capT = 0.25;
  const capTop = roofY + capT;
  const bandH = 0.22 + armorT * 0.2;
  const doorCY = baseY + cubeH * 0.46;
  const emitterH = 0.3;
  const holoBaseY = capTop + emitterH;

  // Ledger glow - one clone so the pulse never touches the shared singleton
  const holoMat = M.neonCyan.clone();

  const pad = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, padT, w + 2.4), M.concrete);
  pad.position.y = padT / 2;
  pad.receiveShadow = true;
  group.add(pad);

  const cube = new THREE.Mesh(new THREE.BoxGeometry(w, cubeH, w), M.steel);
  cube.position.y = baseY + cubeH / 2;
  cube.castShadow = true;
  cube.receiveShadow = true;
  group.add(cube);

  // Corner reinforcements straddling every vertical edge
  const cornerOff = w / 2;
  for (const cx of [-cornerOff, cornerOff]) {
    for (const cz of [-cornerOff, cornerOff]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(armorT, cubeH, armorT), M.ironDark);
      post.position.set(cx, baseY + cubeH / 2, cz);
      post.castShadow = true;
      group.add(post);
    }
  }

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(w + plateT * 2, bandH, w + plateT * 2), M.ironDark);
  skirt.position.y = baseY + bandH / 2;
  skirt.castShadow = true;
  group.add(skirt);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, capT, w + 0.34), M.ironDark);
  cap.position.y = roofY + capT / 2;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  // Vault door builder - concentric plates with a crossed spoke handle
  const handles = [];
  const mountDoor = (r, px, py, pz, ry) => {
    const bay = new THREE.Group();
    bay.position.set(px, py, pz);
    bay.rotation.y = ry;
    group.add(bay);

    const frame = new THREE.Mesh(new THREE.TorusGeometry(r + 0.13, 0.11, 6, 16), M.ironDark);
    frame.position.z = 0.06;
    frame.castShadow = true;
    bay.add(frame);

    const outer = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 16), M.steel);
    outer.rotation.x = Math.PI / 2;
    outer.position.z = 0.15;
    outer.castShadow = true;
    bay.add(outer);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.36, 16), M.gold);
    inner.rotation.x = Math.PI / 2;
    inner.position.z = 0.2;
    inner.castShadow = true;
    bay.add(inner);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.34, 0.44, 12), M.steel);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.24;
    bay.add(hub);

    const handle = new THREE.Group();
    handle.position.z = 0.34;
    bay.add(handle);
    handles.push(handle);

    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, 0.13, 0.13), M.gold);
      spoke.rotation.z = a;
      spoke.castShadow = true;
      handle.add(spoke);
    }

    const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 8, 6), M.gold);
    knob.position.z = 0.06;
    handle.add(knob);

    for (const hz of [-1, 1]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.2, r * 0.5, 0.22), M.ironDark);
      hinge.position.set(hz * (r + 0.12), 0, 0.12);
      hinge.castShadow = true;
      bay.add(hinge);
    }

    // Locking bolts ring the plate once the vault is upgraded
    if (lvl >= 2) {
      const bolts = 6 + lvl;
      for (let i = 0; i < bolts; i++) {
        const ang = (i * Math.PI * 2) / bolts;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 6), M.gold);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(Math.cos(ang) * r * 0.88, Math.sin(ang) * r * 0.88, 0.32);
        bay.add(bolt);
      }
    }
  };

  mountDoor(doorR, 0, doorCY, w / 2, 0);

  // Bolted armour plating on the blind faces from tier 2
  if (lvl >= 2) {
    const plateH = cubeH * 0.62;
    for (const sx of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(plateT, plateH, w * 0.66), M.ironDark);
      plate.position.set(sx * (w / 2 + plateT / 2), baseY + cubeH * 0.52, 0);
      plate.castShadow = true;
      group.add(plate);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, plateH, plateT), M.ironDark);
    back.position.set(0, baseY + cubeH * 0.52, -(w / 2 + plateT / 2));
    back.castShadow = true;
    group.add(back);
  }

  // Bullion pallets stacked beside the door, second pallet at tier 5
  if (lvl >= 3) {
    const barY = padT;
    const palletX = [-w * 0.32];
    if (lvl >= 5) palletX.push(w * 0.32);
    palletX.forEach((bx, p) => {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.8), M.ironDark);
      skid.position.set(bx, barY + 0.06, w / 2 + 0.62);
      skid.castShadow = true;
      group.add(skid);

      for (let i = 0; i < barLayers; i++) {
        const flip = (i + p) % 2 === 0;
        for (let j = -1; j <= 1; j++) {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(flip ? 0.62 : 0.22, 0.17, flip ? 0.22 : 0.62),
            M.gold
          );
          bar.position.set(
            bx + (flip ? 0 : j * 0.26),
            barY + 0.21 + i * 0.18,
            w / 2 + 0.62 + (flip ? j * 0.26 : 0)
          );
          bar.castShadow = true;
          group.add(bar);
        }
      }
    });

    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + plateT * 2 + 0.04, bandH, w + plateT * 2 + 0.04), lvl >= 5 ? M.gold : M.steel);
    trim.position.y = roofY - bandH / 2;
    trim.castShadow = true;
    group.add(trim);
  }

  // A second strongroom door is cut into the west face at tier 4
  if (lvl >= 4) {
    mountDoor(doorR * 0.66, -(w / 2), baseY + cubeH * 0.44, 0, -Math.PI / 2);

    for (const cx of [-1, 1]) {
      for (const cz of [-1, 1]) {
        const finial = new THREE.Mesh(new THREE.BoxGeometry(armorT * 0.8, 0.3, armorT * 0.8), M.gold);
        finial.position.set(cx * cornerOff, capTop + 0.15, cz * cornerOff);
        finial.castShadow = true;
        group.add(finial);
      }
    }
  }

  // Deposit vents and a marked bullion lane at tier 5
  if (lvl >= 5) {
    for (const sx of [-1, 1]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.9), M.steel);
      vent.position.set(sx * (w / 2 + plateT + 0.17), baseY + cubeH * 0.2, -w * 0.28);
      vent.castShadow = true;
      group.add(vent);
    }
    const lane = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.06, 0.7), M.hazardStripe);
    lane.position.set(0, padT + 0.03, w / 2 + 0.85);
    group.add(lane);
  }

  // Top tier: gilded reserve obelisk and a slow security ring on the pad
  let padRing = null;
  if (lvl === 6) {
    const obelisk = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), M.gold);
    obelisk.position.set(0, capTop + 0.34, -w * 0.3);
    obelisk.castShadow = true;
    group.add(obelisk);

    for (const cx of [-1, 1]) {
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.3, cubeH * 0.5, 0.3), M.gold);
      buttress.position.set(cx * (w / 2 + plateT), baseY + cubeH * 0.25, w * 0.3);
      buttress.castShadow = true;
      group.add(buttress);
    }

    padRing = new THREE.Mesh(new THREE.TorusGeometry(w * 0.62, 0.08, 6, 16), M.cyberBlue);
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = padT + 0.05;
    group.add(padRing);
  }

  // Holographic ledger hovering off the roof plate
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, emitterH, 8), M.ironDark);
  emitter.position.y = capTop + emitterH / 2;
  emitter.castShadow = true;
  group.add(emitter);

  const holo = new THREE.Group();
  holo.position.y = holoBaseY;
  group.add(holo);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelH, 0.07), holoMat);
  panel.position.y = 0.2 + panelH / 2;
  holo.add(panel);

  for (let i = 0; i < lineCount; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(panelW * (0.34 + (i % 3) * 0.16), 0.06, 0.03), holoMat);
    line.position.set(-panelW * 0.1, 0.32 + i * ((panelH - 0.22) / lineCount), 0.06);
    holo.add(line);
  }

  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 8), holoMat);
  beam.position.y = 0.1;
  holo.add(beam);

  if (lvl >= 5) {
    for (const sx of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(panelW * 0.4, panelH * 0.7, 0.05), holoMat);
      wing.position.set(sx * panelW * 0.62, 0.2 + panelH * 0.45, -0.12);
      wing.rotation.y = sx * 0.6;
      holo.add(wing);
    }
  }

  group.userData.animator = (delta, elapsed) => {
    for (let i = 0; i < handles.length; i++) {
      handles[i].rotation.z += delta * (0.5 - i * 0.18);
    }
    holo.position.y = holoBaseY + Math.sin(elapsed * 1.6) * 0.09;
    holo.rotation.y = Math.sin(elapsed * 0.5) * 0.3;
    holoMat.emissiveIntensity = 0.6 + Math.sin(elapsed * 3.4) * 0.3;
    if (padRing) padRing.rotation.z += delta * 0.6;
  };

  return group;
}
