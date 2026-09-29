import * as THREE from 'three';

export function createSwatArmory(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'swat_armory';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  const wallH = [1.7, 1.9, 2.1, 2.3, 2.5, 2.7][lvl - 1];
  const bodyW = [5.6, 5.8, 6.0, 6.2, 6.4, 6.6][lvl - 1];
  const bodyD = 4.4;
  const padT = 0.15;
  const slabT = 0.2;
  const halfW = bodyW / 2;
  const halfD = bodyD / 2;
  const roofY = padT + wallH;
  const roofTop = roofY + slabT;

  const pad = new THREE.Mesh(new THREE.BoxGeometry(8.0, padT, 7.4), M.asphalt);
  pad.position.y = padT / 2;
  pad.receiveShadow = true;
  group.add(pad);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.05, 1.3), M.hazardStripe);
  apron.position.set(0, padT + 0.025, 2.35);
  apron.receiveShadow = true;
  group.add(apron);

  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, wallH, bodyD), M.policeBlack);
  body.position.y = padT + wallH / 2;
  body.castShadow = true;
  group.add(body);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.4, 0.3, bodyD + 0.4), M.concrete);
  plinth.position.y = padT + 0.15;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  for (let x of [-halfW, halfW]) {
    for (let z of [-halfD, halfD]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, wallH, 0.26), M.steel);
      post.position.set(x, padT + wallH / 2, z);
      post.castShadow = true;
      group.add(post);
    }
  }

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.1, 0.24, bodyD + 0.1), M.policeBlue);
  stripe.position.y = roofY - 0.5;
  group.add(stripe);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.5, slabT, bodyD + 0.5), M.concrete);
  roof.position.y = roofY + slabT / 2;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const doorH = Math.min(2.05, wallH - 0.4);
  const doorW = 2.3;
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.2), M.steel);
  door.position.set(0, padT + 0.3 + doorH / 2, halfD + 0.08);
  door.castShadow = true;
  group.add(door);

  const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorH - 0.2, 0.1), M.ironDark);
  doorSeam.position.set(0, door.position.y, halfD + 0.2);
  group.add(doorSeam);

  for (let x of [-doorW / 2 - 0.12, doorW / 2 + 0.12]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.24, doorH + 0.5, 0.3), M.ironDark);
    jamb.position.set(x, padT + 0.3 + (doorH + 0.5) / 2 - 0.25, halfD + 0.06);
    jamb.castShadow = true;
    group.add(jamb);
  }

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.7, 0.26, 0.3), M.ironDark);
  lintel.position.set(0, padT + 0.3 + doorH + 0.13, halfD + 0.06);
  lintel.castShadow = true;
  group.add(lintel);

  const doorChevron = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.2, 0.26, 0.08), M.hazardStripe);
  doorChevron.position.set(0, padT + 0.45, halfD + 0.2);
  group.add(doorChevron);

  for (let x of [-doorW / 2 - 0.55, doorW / 2 + 0.55]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), x < 0 ? M.sirenRed : M.sirenBlue);
    lamp.position.set(x, padT + 0.3 + doorH + 0.32, halfD + 0.16);
    group.add(lamp);
  }

  const bagCount = [5, 5, 6, 6, 7, 7][lvl - 1];
  const bagSpan = 4.6;
  const bagY = padT + 0.42 * 0.62;
  for (let i = 0; i < bagCount; i++) {
    const t = i / (bagCount - 1);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), M.concrete);
    bag.scale.set(1.2, 0.62, 0.9);
    bag.position.set(-bagSpan / 2 + t * bagSpan, bagY, 3.28 + (i % 2) * 0.1);
    bag.rotation.y = (i % 2) * 0.35;
    bag.castShadow = true;
    group.add(bag);
  }

  if (lvl >= 4) {
    for (let i = 0; i < bagCount - 1; i++) {
      const t = (i + 0.5) / (bagCount - 1);
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), M.concrete);
      bag.scale.set(1.2, 0.62, 0.9);
      bag.position.set(-bagSpan / 2 + t * bagSpan, bagY + 0.42 * 0.62 * 2, 3.3);
      bag.rotation.y = 0.2;
      bag.castShadow = true;
      group.add(bag);
    }
  }

  const rackX = -halfW - 0.3;
  const rackCount = [3, 3, 4, 4, 5, 5][lvl - 1];
  const rackSpan = 2.6;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, rackSpan + 0.5), M.ironDark);
  rail.position.set(rackX, padT + 1.35, 0);
  group.add(rail);

  for (let z of [-(rackSpan + 0.4) / 2, (rackSpan + 0.4) / 2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.35, 0.14), M.ironDark);
    leg.position.set(rackX, padT + 0.675, z);
    group.add(leg);
  }

  for (let i = 0; i < rackCount; i++) {
    const t = i / (rackCount - 1);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.62), M.policeWhite);
    shield.rotation.z = 0.14;
    shield.position.set(rackX - 0.08, padT + 0.64, -rackSpan / 2 + t * rackSpan);
    shield.castShadow = true;
    group.add(shield);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.5), M.carGlass);
    visor.rotation.z = 0.14;
    visor.position.set(rackX - 0.18, padT + 1.05, shield.position.z);
    group.add(visor);
  }

  if (lvl >= 2) {
    for (let side of [-1, 1]) {
      const parapetX = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.5, 0.3, 0.16), M.ironDark);
      parapetX.position.set(0, roofTop + 0.15, side * (halfD + 0.17));
      parapetX.castShadow = true;
      group.add(parapetX);

      const parapetZ = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, bodyD + 0.5), M.ironDark);
      parapetZ.position.set(side * (halfW + 0.17), roofTop + 0.15, 0);
      parapetZ.castShadow = true;
      group.add(parapetZ);
    }

    for (let x of [-halfW + 0.5, halfW - 0.5]) {
      const flood = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.26), M.steel);
      flood.position.set(x, roofTop + 0.5, halfD + 0.1);
      flood.rotation.x = 0.3;
      group.add(flood);

      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.08), M.headlight);
      beam.position.set(x, roofTop + 0.46, halfD + 0.26);
      group.add(beam);
    }
  }

  const upperH = [0, 0, 1.0, 1.2, 1.4, 1.5][lvl - 1];
  const upW = bodyW - 1.8;
  const upD = bodyD - 1.2;
  const upX = 0.45;
  const upZ = -0.35;
  const upperTop = roofTop + upperH + (lvl >= 3 ? 0.18 : 0);

  if (lvl >= 3) {
    const upper = new THREE.Mesh(new THREE.BoxGeometry(upW, upperH, upD), M.policeBlack);
    upper.position.set(upX, roofTop + upperH / 2, upZ);
    upper.castShadow = true;
    group.add(upper);

    const upStripe = new THREE.Mesh(new THREE.BoxGeometry(upW + 0.08, 0.2, upD + 0.08), M.policeBlue);
    upStripe.position.set(upX, roofTop + upperH - 0.42, upZ);
    group.add(upStripe);

    const upRoof = new THREE.Mesh(new THREE.BoxGeometry(upW + 0.35, 0.18, upD + 0.35), M.concrete);
    upRoof.position.set(upX, roofTop + upperH + 0.09, upZ);
    upRoof.castShadow = true;
    upRoof.receiveShadow = true;
    group.add(upRoof);

    for (let side of [-1, 1]) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(upW - 1.0, 0.34, 0.08), M.carGlass);
      slit.position.set(upX, roofTop + upperH * 0.58, upZ + side * (upD / 2 + 0.05));
      group.add(slit);
    }

    for (let z of [upZ - upD / 2, upZ + upD / 2]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.2, upperH, 0.2), M.steel);
      brace.position.set(upX - upW / 2, roofTop + upperH / 2, z);
      group.add(brace);
      const brace2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, upperH, 0.2), M.steel);
      brace2.position.set(upX + upW / 2, roofTop + upperH / 2, z);
      group.add(brace2);
    }

    for (let i = 0; i < 4; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.07), M.steel);
      rung.position.set(upX - upW / 2 - 0.3, roofTop + 0.28 + i * (upperH / 4), upZ + upD / 2 + 0.2);
      group.add(rung);
    }
  }

  const dish = lvl >= 5 ? new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.14, 0.34, 12), M.policeWhite) : null;

  if (lvl >= 5) {
    const plateCount = lvl === 6 ? 4 : 3;
    for (let i = 0; i < plateCount; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(upW / plateCount - 0.12, 0.16, upD + 0.2), M.steel);
      plate.position.set(upX - upW / 2 + (i + 0.5) * (upW / plateCount), upperTop + 0.08, upZ);
      plate.castShadow = true;
      group.add(plate);

      for (let z of [upZ - upD / 2, upZ + upD / 2]) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), M.ironDark);
        rivet.position.set(plate.position.x, upperTop + 0.17, z);
        group.add(rivet);
      }
    }

    const dishPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.55, 8), M.ironDark);
    dishPost.position.set(upX + upW / 2 - 0.7, upperTop + 0.44, upZ);
    dishPost.castShadow = true;
    group.add(dishPost);

    dish.rotation.x = -0.9;
    dish.position.set(dishPost.position.x, upperTop + 0.92, upZ + 0.1);
    dish.castShadow = true;
    group.add(dish);

    const feed = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), M.gold);
    feed.position.set(dish.position.x, upperTop + 1.28, upZ + 0.45);
    group.add(feed);
  }

  const mastH = [1.7, 1.9, 2.1, 2.3, 2.5, 2.7][lvl - 1];
  const mastX = -halfW + 0.85;
  const mastZ = halfD - 0.85;
  const mastBase = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.62), M.ironDark);
  mastBase.position.set(mastX, roofTop + 0.11, mastZ);
  mastBase.castShadow = true;
  group.add(mastBase);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, mastH, 8), M.ironDark);
  mast.position.set(mastX, roofTop + 0.22 + mastH / 2, mastZ);
  mast.castShadow = true;
  group.add(mast);

  for (let a = 0; a < 3; a++) {
    const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, mastH * 0.55, 6), M.steel);
    const ang = (a * Math.PI * 2) / 3;
    stay.position.set(mastX + Math.cos(ang) * 0.24, roofTop + 0.22 + mastH * 0.28, mastZ + Math.sin(ang) * 0.24);
    stay.rotation.z = -Math.cos(ang) * 0.3;
    stay.rotation.x = Math.sin(ang) * 0.3;
    group.add(stay);
  }

  const armCount = [0, 1, 1, 2, 2, 3][lvl - 1];
  for (let i = 0; i < armCount; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.95 - i * 0.16, 0.07, 0.07), M.steel);
    arm.position.set(mastX, roofTop + 0.22 + mastH * (0.5 + i * 0.16), mastZ);
    arm.rotation.y = i * 0.5;
    group.add(arm);
  }

  const lampY = roofTop + 0.22 + mastH + 0.2;
  const lampMat = M.sirenBlue.clone();
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lampMat);
  lamp.position.set(mastX, lampY, mastZ);
  group.add(lamp);

  const lampCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.1, 8), M.steel);
  lampCap.position.set(mastX, lampY - 0.19, mastZ);
  group.add(lampCap);

  group.userData.animator = (delta, elapsed) => {
    lampMat.emissiveIntensity = 0.8 + Math.sin(elapsed * 3.2) * 0.4;
    lamp.scale.setScalar(1.0 + Math.sin(elapsed * 3.2) * 0.08);
    if (dish) dish.rotation.y += delta * 0.5;
  };

  return group;
}
