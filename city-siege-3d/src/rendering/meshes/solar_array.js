import * as THREE from 'three';

export function createSolarArray(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'solar_array';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Panels get wider, taller off the deck and more numerous each tier
  const tilt = 0.61;
  const pw = [1.70, 1.85, 2.00, 2.15, 2.30, 2.40][lvl - 1];
  const pd = [1.30, 1.40, 1.50, 1.65, 1.80, 1.90][lvl - 1];
  const legH = [0.55, 0.60, 0.65, 0.70, 0.80, 0.90][lvl - 1];
  const groundCount = [3, 4, 5, 5, 6, 6][lvl - 1];
  const upperCount = [0, 0, 0, 1, 1, 2][lvl - 1];

  const sx = pw + 0.25;
  const rowMax = Math.ceil(groundCount / 2);
  const rowSpan = (rowMax - 1) * sx + pw;
  const rowZ = pd * 0.72 + 0.5;
  const padH = 0.25;
  const padTop = padH;
  const padW = rowSpan + 1.1;
  const padD = rowZ * 2 + pd * Math.cos(tilt) + 1.0;

  const pad = new THREE.Mesh(new THREE.BoxGeometry(padW, padH, padD), M.concrete);
  pad.position.y = padH / 2;
  pad.receiveShadow = true;
  group.add(pad);

  // Every panel hangs off its own pivot so the whole farm can track together
  const pivots = [];
  const addRow = (count, z, baseY, height) => {
    const start = -((count - 1) * sx) / 2;
    for (let i = 0; i < count; i++) {
      const x = start + i * sx;
      for (const lx of [-pw * 0.3, pw * 0.3]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, height, 6), M.steel);
        leg.position.set(x + lx, baseY + height / 2, z);
        leg.castShadow = true;
        group.add(leg);
      }

      const pivot = new THREE.Group();
      pivot.position.set(x, baseY + height, z);
      pivot.rotation.x = -tilt;

      const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.1, pd), M.cyberBlue);
      panel.castShadow = true;
      pivot.add(panel);

      const spine = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.94, 0.1, 0.16), M.steel);
      spine.position.y = -0.1;
      pivot.add(spine);

      group.add(pivot);
      pivots.push(pivot);
    }
  };

  addRow(rowMax, -rowZ, padTop, legH);
  addRow(groundCount - rowMax, rowZ, padTop, legH);

  const panelRise = (pd * Math.sin(tilt) + 0.1 * Math.cos(tilt)) / 2;
  const panelTop = padTop + legH + panelRise;

  // Inverter cabinet on the service edge
  const cabH = 0.95 + lvl * 0.07;
  const cabX = padW / 2 - 0.75;
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.7, cabH, 1.0), M.ironDark);
  cabinet.position.set(cabX, padTop + cabH / 2, 0);
  cabinet.castShadow = true;
  group.add(cabinet);

  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.7), M.steel);
  vent.position.set(cabX + 0.38, padTop + cabH * 0.45, 0);
  group.add(vent);

  const statusMat = M.neonYellow.clone();
  const status = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), statusMat);
  status.position.set(cabX + 0.36, padTop + cabH - 0.18, 0);
  group.add(status);

  const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, cabX, 6), M.ironDark);
  conduit.rotation.z = Math.PI / 2;
  conduit.position.set(cabX / 2, padTop + 0.09, 0);
  group.add(conduit);

  // Painted service curb and combiner boxes come in at tier 3
  if (lvl >= 3) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(padW, 0.12, 0.3), M.hazardStripe);
    curb.position.set(0, padTop + 0.06, -(padD / 2 - 0.18));
    group.add(curb);

    for (const z of [-rowZ, rowZ]) {
      const combiner = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.3), M.steel);
      combiner.position.set(-(rowSpan / 2 + 0.32), padTop + 0.25, z);
      combiner.castShadow = true;
      group.add(combiner);
    }
  }

  // Elevated second deck of panels from tier 4
  let deckY = panelTop;
  let deckW = 0;
  if (lvl >= 4) {
    deckY = panelTop + 1.0;
    deckW = (upperCount - 1) * sx + pw + 0.7;
    const deckD = 2.0;
    const colH = deckY - padTop - 0.18;

    for (const x of [-(deckW / 2 - 0.35), deckW / 2 - 0.35]) {
      for (const z of [-0.8, 0.8]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, colH, 8), M.steel);
        col.position.set(x, padTop + colH / 2, z);
        col.castShadow = true;
        group.add(col);
      }
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), M.ironDark);
      brace.position.set(x, padTop + colH * 0.55, 0);
      group.add(brace);
    }

    const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.18, deckD), M.steel);
    deck.position.y = deckY - 0.09;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    addRow(upperCount, 0, deckY, legH * 0.7);
  }

  // Battery bank mirrors the inverter at tier 5, plus a monitoring beacon on the deck
  if (lvl >= 5) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 1.6), M.ironDark);
    bank.position.set(-(padW / 2 - 0.75), padTop + 0.425, 0);
    bank.castShadow = true;
    group.add(bank);

    for (const z of [-0.45, 0.45]) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), M.cyberBlue);
      cell.position.set(-(padW / 2 - 0.39), padTop + 0.45, z);
      group.add(cell);
    }

    const mastH = 0.8;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, mastH, 6), M.steel);
    mast.position.set(-(deckW / 2 - 0.25), deckY + mastH / 2, 0.95);
    group.add(mast);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), M.neonCyan);
    beacon.position.set(-(deckW / 2 - 0.25), deckY + mastH + 0.08, 0.95);
    group.add(beacon);
  }

  // Tier 6 tops the deck out with a reflector skirt under each upper panel
  if (lvl >= 6) {
    for (const x of [-sx / 2, sx / 2]) {
      const reflector = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.8, 0.08, 0.4), M.policeWhite);
      reflector.position.set(x, deckY + 0.14, -1.0);
      group.add(reflector);
    }
  }

  group.userData.animator = (delta, elapsed) => {
    const sweep = Math.sin(elapsed * 0.3) * 0.25;
    for (let i = 0; i < pivots.length; i++) pivots[i].rotation.x = -tilt + sweep;
    statusMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 3.2) * 0.35;
  };

  return group;
}
