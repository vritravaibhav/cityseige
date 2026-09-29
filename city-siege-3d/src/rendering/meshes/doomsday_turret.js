import * as THREE from 'three';

export function createDoomsdayTurret(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'doomsday_turret';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Tier drives plinth height, housing bulk, barrel calibre and how many tubes hang in the mantlet
  const padH = 0.45;
  const padR = [3.10, 3.20, 3.30, 3.40, 3.50, 3.60][lvl - 1];
  const plinthH = [5.30, 5.75, 6.15, 6.60, 7.05, 7.50][lvl - 1];
  const plinthR = [1.80, 1.90, 2.00, 2.10, 2.20, 2.30][lvl - 1];
  const turnR = [2.00, 2.10, 2.20, 2.30, 2.42, 2.55][lvl - 1];
  const turnH = [0.85, 0.92, 1.00, 1.08, 1.16, 1.25][lvl - 1];
  const housW = [3.00, 3.20, 3.40, 3.60, 3.90, 4.20][lvl - 1];
  const housH = [1.70, 1.82, 1.94, 2.06, 2.20, 2.36][lvl - 1];
  const housD = [2.60, 2.75, 2.90, 3.00, 3.10, 3.20][lvl - 1];
  const barrelR = [0.42, 0.46, 0.50, 0.55, 0.60, 0.65][lvl - 1];
  const barrelLen = [5.90, 6.25, 6.60, 6.95, 7.10, 7.25][lvl - 1];

  const elev = Math.PI * 18 / 180;
  const dy = Math.sin(elev), dz = Math.cos(elev);
  const axisRot = Math.PI / 2 - elev;
  const plinthBotR = plinthR + 0.60;
  const plinthTop = padH + plinthH;
  const deckY = plinthTop + turnH;
  const trunnionY = housH * 0.52;
  const trunnionZ = -1.90;
  const housZ = trunnionZ - 0.05;
  const mantletT = (housZ + housD / 2 - trunnionZ) / dz;
  const barX = barrelR + 0.14;
  const quad = lvl >= 5;
  const stack = quad ? barrelR + 0.35 : 0;
  const brakeLen = 0.70;
  const hydX = barX + barrelR + 0.48;
  const muzzleY = deckY + trunnionY + stack * dz + dy * (barrelLen + brakeLen / 2);

  const axY = (t, o) => trunnionY + dy * t + dz * o;
  const axZ = (t, o) => trunnionZ + dz * t - dy * o;

  const coilMat = M.neonRed.clone();
  const coreMat = M.neonRed.clone();

  // Concrete emplacement pad
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(padR, padR + 0.2, padH, 12), M.concrete);
  pad.position.y = padH / 2;
  pad.receiveShadow = true;
  group.add(pad);

  const kerb = new THREE.Mesh(new THREE.TorusGeometry(padR - 0.24, 0.12, 6, 16), M.hazardStripe);
  kerb.rotation.x = -Math.PI / 2;
  kerb.position.y = padH;
  group.add(kerb);

  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    const anchor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 6), M.steel);
    anchor.position.set(Math.cos(a) * (padR - 0.75), padH + 0.08, Math.sin(a) * (padR - 0.75));
    group.add(anchor);
  }

  // Octagonal concrete plinth with buttress fins and steel bands
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(plinthR, plinthBotR, plinthH, 8), M.concrete);
  plinth.position.y = padH + plinthH / 2;
  plinth.castShadow = true;
  group.add(plinth);

  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, plinthH * 0.7, 1.1), M.concrete);
    fin.position.set(Math.cos(a) * (plinthBotR - 0.35), padH + plinthH * 0.35, Math.sin(a) * (plinthBotR - 0.35));
    fin.rotation.y = -a;
    fin.castShadow = true;
    group.add(fin);
  }

  const bandCount = 2 + lvl;
  for (let i = 0; i < bandCount; i++) {
    const t = (i + 1) / (bandCount + 1);
    const band = new THREE.Mesh(new THREE.TorusGeometry(plinthBotR + (plinthR - plinthBotR) * t + 0.06, 0.1, 6, 8), M.steel);
    band.rotation.x = -Math.PI / 2;
    band.position.y = padH + plinthH * t;
    group.add(band);
  }

  const rungCount = Math.floor((plinthH - 0.6) / 0.7);
  for (let i = 0; i < rungCount; i++) {
    const t = (i + 0.7) / rungCount;
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.1), M.steel);
    rung.position.set(0, padH + plinthH * t, -(plinthBotR + (plinthR - plinthBotR) * t + 0.16));
    group.add(rung);
  }

  // Armoured turntable and bearing race
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(turnR, turnR + 0.16, turnH, 12), M.ironDark);
  turntable.position.y = plinthTop + turnH / 2;
  turntable.castShadow = true;
  group.add(turntable);

  const race = new THREE.Mesh(new THREE.TorusGeometry(turnR - 0.05, 0.12, 6, 16), M.steel);
  race.rotation.x = -Math.PI / 2;
  race.position.y = deckY - 0.05;
  group.add(race);

  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 6), M.steel);
    bolt.position.set(Math.cos(a) * (turnR - 0.38), deckY + 0.04, Math.sin(a) * (turnR - 0.38));
    group.add(bolt);
  }

  // Everything above the race traverses together
  const pivot = new THREE.Group();
  pivot.position.y = deckY;
  group.add(pivot);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(housW, housH, housD), M.steel);
  housing.position.set(0, housH / 2, housZ);
  housing.castShadow = true;
  pivot.add(housing);

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(housW + 0.3, 0.3, housD + 0.3), M.ironDark);
  skirt.position.set(0, 0.15, housZ);
  skirt.castShadow = true;
  pivot.add(skirt);

  for (const x of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.26, housH * 0.7, housD * 0.8), M.ironDark);
    cheek.position.set(x * (housW / 2 + 0.06), housH * 0.5, housZ);
    cheek.castShadow = true;
    pivot.add(cheek);
  }

  const bustle = new THREE.Mesh(new THREE.BoxGeometry(housW * 0.82, housH * 0.7, 0.6), M.ironDark);
  bustle.position.set(0, housH * 0.45, housZ - housD / 2 - 0.3);
  bustle.castShadow = true;
  pivot.add(bustle);

  const vent = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 6, 10), M.steel);
  vent.rotation.x = -Math.PI / 2;
  vent.position.set(0, housH + 0.06, housZ - housD * 0.3);
  pivot.add(vent);

  // Gun mantlet - the slab the tubes swing through
  const mantlet = new THREE.Mesh(new THREE.BoxGeometry(housW * 0.92, housH * 0.78 + stack, 0.55), M.ironDark);
  mantlet.rotation.x = -elev;
  mantlet.position.set(0, axY(mantletT, stack / 2), axZ(mantletT, stack / 2));
  mantlet.castShadow = true;
  pivot.add(mantlet);

  const trunnion = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, housW + 0.5, 8), M.steel);
  trunnion.rotation.z = Math.PI / 2;
  trunnion.position.set(0, axY(mantletT, 0), axZ(mantletT, 0));
  pivot.add(trunnion);

  // Recoiling mass - tubes, brakes and hydraulic bodies slide as one
  const recoil = new THREE.Group();
  pivot.add(recoil);

  const seats = [{ x: -barX, o: 0 }, { x: barX, o: 0 }];
  if (quad) seats.push({ x: -barX, o: stack }, { x: barX, o: stack });

  for (const seat of seats) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(barrelR * 0.88, barrelR, barrelLen, 12), M.ironDark);
    barrel.rotation.x = axisRot;
    barrel.position.set(seat.x, axY(barrelLen / 2, seat.o), axZ(barrelLen / 2, seat.o));
    barrel.castShadow = true;
    recoil.add(barrel);

    const breech = new THREE.Mesh(new THREE.BoxGeometry(barrelR * 2.5, barrelR * 2.5, barrelR * 2.8), M.ironDark);
    breech.rotation.x = -elev;
    breech.position.set(seat.x, axY(0.15, seat.o), axZ(0.15, seat.o));
    breech.castShadow = true;
    recoil.add(breech);

    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(barrelR * 0.5, barrelR * 0.5, 0.22, 10), coreMat);
    chamber.rotation.x = axisRot;
    chamber.position.set(seat.x, axY(barrelR * 1.6, seat.o), axZ(barrelR * 1.6, seat.o));
    recoil.add(chamber);

    // Reinforcing collar rings down the tube
    for (const t of [0.22, 0.46, 0.7]) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(barrelR + 0.1, 0.11, 6, 12), M.steel);
      collar.rotation.x = axisRot - Math.PI / 2;
      collar.position.set(seat.x, axY(barrelLen * t, seat.o), axZ(barrelLen * t, seat.o));
      recoil.add(collar);
    }

    // Muzzle brake with vented baffles
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(barrelR + 0.2, barrelR + 0.16, brakeLen, 12), M.steel);
    brake.rotation.x = axisRot;
    brake.position.set(seat.x, axY(barrelLen, seat.o), axZ(barrelLen, seat.o));
    brake.castShadow = true;
    recoil.add(brake);

    for (const t of [barrelLen - 0.18, barrelLen + 0.18]) {
      const baffle = new THREE.Mesh(new THREE.TorusGeometry(barrelR + 0.22, 0.07, 6, 12), M.ironDark);
      baffle.rotation.x = axisRot - Math.PI / 2;
      baffle.position.set(seat.x, axY(t, seat.o), axZ(t, seat.o));
      recoil.add(baffle);
    }

    const bore = new THREE.Mesh(new THREE.CylinderGeometry(barrelR * 0.62, barrelR * 0.62, 0.18, 12), coilMat);
    bore.rotation.x = axisRot;
    bore.position.set(seat.x, axY(barrelLen + brakeLen / 2 - 0.1, seat.o), axZ(barrelLen + brakeLen / 2 - 0.1, seat.o));
    recoil.add(bore);

    // Charge coils clamped along the tube
    if (lvl >= 3) {
      const coilCount = lvl - 1;
      for (let i = 0; i < coilCount; i++) {
        const t = barrelLen * (0.3 + i * 0.11);
        const coil = new THREE.Mesh(new THREE.TorusGeometry(barrelR + 0.17, 0.1, 6, 12), coilMat);
        coil.rotation.x = axisRot - Math.PI / 2;
        coil.position.set(seat.x, axY(t, seat.o), axZ(t, seat.o));
        recoil.add(coil);
      }
    }
  }

  // Hydraulic recoil cylinders flanking the tubes, rods anchored to the mantlet
  const hydSeats = quad ? [0, stack] : [0];
  for (const o of hydSeats) {
    for (const x of [-hydX, hydX]) {
      const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, barrelLen * 0.34, 8), M.steel);
      hyd.rotation.x = axisRot;
      hyd.position.set(x, axY(barrelLen * 0.3, o), axZ(barrelLen * 0.3, o));
      hyd.castShadow = true;
      recoil.add(hyd);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 8), M.ironDark);
      cap.rotation.x = axisRot;
      cap.position.set(x, axY(barrelLen * 0.47, o), axZ(barrelLen * 0.47, o));
      recoil.add(cap);

      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, barrelLen * 0.3, 6), M.steel);
      rod.rotation.x = axisRot;
      rod.position.set(x, axY(barrelLen * 0.05, o), axZ(barrelLen * 0.05, o));
      pivot.add(rod);
    }
  }

  // Ammo hoist feeding the breech
  if (lvl >= 3) {
    const hoist = new THREE.Mesh(new THREE.BoxGeometry(housW * 0.5, housH * 0.5, 0.5), M.steel);
    hoist.position.set(0, housH * 0.82, housZ - housD / 2 - 0.5);
    hoist.castShadow = true;
    pivot.add(hoist);

    for (const x of [-0.5, 0.5]) {
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.1, 8), coilMat);
      feed.rotation.x = Math.PI / 2;
      feed.position.set(x * housW * 0.24, housH * 0.82, housZ - housD / 2 + 0.05);
      pivot.add(feed);
    }
  }

  // Fire-control optics and a hazard-striped roof plate
  if (lvl >= 4) {
    const optics = new THREE.Mesh(new THREE.BoxGeometry(housW * 0.34, 0.42, 0.7), M.steel);
    optics.position.set(housW * 0.26, housH + 0.21, housZ + housD * 0.2);
    optics.castShadow = true;
    pivot.add(optics);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), coilMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(housW * 0.26, housH + 0.21, housZ + housD * 0.2 + 0.4);
    pivot.add(lens);

    const roofPlate = new THREE.Mesh(new THREE.BoxGeometry(housW * 0.5, 0.12, 0.6), M.hazardStripe);
    roofPlate.position.set(-housW * 0.2, housH + 0.06, housZ + housD * 0.22);
    pivot.add(roofPlate);
  }

  // Blast deflectors braced against the turntable
  if (lvl >= 4) {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const jack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.0), M.steel);
      jack.position.set(Math.cos(a) * (padR - 0.9), padH + 0.15, Math.sin(a) * (padR - 0.9));
      jack.rotation.y = -a;
      group.add(jack);

      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.3, 8), M.ironDark);
      foot.position.set(Math.cos(a) * (padR - 0.35), padH + 0.15, Math.sin(a) * (padR - 0.35));
      foot.castShadow = true;
      group.add(foot);
    }
  }

  // Twin capacitor stacks feeding the charge coils
  if (lvl >= 5) {
    for (const x of [-1, 1]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 2.3, 8), M.steel);
      tower.position.set(x * (padR - 0.7), padH + 1.15, -1.1);
      tower.castShadow = true;
      group.add(tower);

      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), coilMat);
      crown.position.set(x * (padR - 0.7), padH + 2.4, -1.1);
      group.add(crown);

      const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, plinthH * 0.5, 6), M.ironDark);
      conduit.position.set(x * (padR - 0.7), padH + plinthH * 0.25, -1.1);
      group.add(conduit);
    }
  }

  // Commander cupola and rangefinder mast
  if (lvl >= 6) {
    const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.6, 0.55, 8), M.ironDark);
    cupola.position.set(-housW * 0.24, housH + 0.28, housZ - housD * 0.08);
    cupola.castShadow = true;
    pivot.add(cupola);

    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 8), M.steel);
    hatch.position.set(-housW * 0.24, housH + 0.6, housZ - housD * 0.08);
    pivot.add(hatch);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6), M.steel);
    mast.position.set(housW * 0.38, housH + 0.8, housZ - housD * 0.3);
    pivot.add(mast);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), coilMat);
    beacon.position.set(housW * 0.38, housH + 1.7, housZ - housD * 0.3);
    pivot.add(beacon);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(turnR - 0.55, 0.09, 6, 16), coilMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = plinthTop + 0.06;
    group.add(ring);
  }

  group.userData.animator = (delta, elapsed) => {
    pivot.rotation.y = Math.sin(elapsed * 0.26) * 0.2;
    vent.rotation.y += delta * 1.8;
    const c = (elapsed % 4.2) / 4.2;
    const kick = c < 0.07 ? c / 0.07 : (c < 0.62 ? 1 - (c - 0.07) / 0.55 : 0);
    recoil.position.y = -dy * kick * 0.4;
    recoil.position.z = -dz * kick * 0.4;
    coilMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 3.2) * 0.3 + kick * 0.8;
    coreMat.emissiveIntensity = 0.5 + (1 - kick) * 1.6;
  };

  group.userData.muzzleHeight = muzzleY;
  return group;
}
