import * as THREE from 'three';

export function createQuantumCitadel(F, level = 1) {
  const group = new THREE.Group();
  group.name = 'quantum_citadel';
  const lvl = Math.max(1, Math.min(6, Math.round(level) || 1));
  const M = F.materials;

  // Tier drives spire stack, plinth spread, ring count and crystal size
  const segCount = [4, 4, 5, 5, 6, 6][lvl - 1];
  const segH = [3.5, 3.9, 3.35, 3.6, 3.3, 3.5][lvl - 1];
  const baseW = [12.0, 12.4, 12.8, 13.2, 13.6, 14.0][lvl - 1];
  const rBase = [2.2, 2.3, 2.4, 2.5, 2.6, 2.7][lvl - 1];
  const rTop = [0.85, 0.85, 0.8, 0.8, 0.75, 0.75][lvl - 1];
  const ringCount = [2, 3, 3, 4, 4, 4][lvl - 1];
  const crystalR = [1.0, 1.15, 1.25, 1.4, 1.5, 1.6][lvl - 1];

  const stepH = [0.7, 0.6, 0.5];
  const step1Top = stepH[0];
  const step2Top = step1Top + stepH[1];
  const plinthTop = step2Top + stepH[2];
  const spireH = segCount * segH;
  const capH = 0.9;
  const capTop = spireH + capH;
  const crystalY = capTop + crystalR + 0.2;
  const domeR = crystalR * 1.8;
  const domeBase = capTop + 0.05;
  const apexY = lvl >= 3 ? domeBase + domeR * 1.25 : crystalY + crystalR;

  const glowMat = M.neonCyan.clone();

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(baseW, stepH[0], baseW), M.concrete);
  step1.position.y = stepH[0] / 2;
  step1.castShadow = true;
  step1.receiveShadow = true;
  group.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.72, stepH[1], baseW * 0.72), M.concrete);
  step2.position.y = step1Top + stepH[1] / 2;
  step2.castShadow = true;
  step2.receiveShadow = true;
  group.add(step2);

  const step3 = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.5, stepH[2], baseW * 0.5), M.steel);
  step3.position.y = step2Top + stepH[2] / 2;
  step3.castShadow = true;
  step3.receiveShadow = true;
  group.add(step3);

  const plinthTrim = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.52, 0.16, baseW * 0.52), M.gold);
  plinthTrim.position.y = plinthTop - 0.04;
  group.add(plinthTrim);

  // Everything above the plinth bobs as one mass
  const spire = new THREE.Group();
  spire.position.y = plinthTop;
  group.add(spire);

  const segR = i => rBase + (rTop - rBase) * (i / segCount);

  for (let i = 0; i < segCount; i++) {
    const r0 = segR(i);
    const r1 = segR(i + 1);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1 * 0.95, r0, segH, 8), M.steel);
    seg.position.y = i * segH + segH / 2;
    seg.castShadow = true;
    spire.add(seg);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(r1 * 1.1, r1 * 1.2, 0.36, 8), M.gold);
    band.position.y = (i + 1) * segH - 0.1;
    band.castShadow = true;
    spire.add(band);
  }

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(rBase * 1.15, rBase * 1.35, 0.5, 8), M.ironDark);
  skirt.position.y = 0.25;
  skirt.castShadow = true;
  spire.add(skirt);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(rTop * 1.3, capH, 8), M.steel);
  cap.position.y = spireH + capH / 2;
  cap.castShadow = true;
  spire.add(cap);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(rTop * 0.9, 0.14, 6, 12), M.gold);
  collar.rotation.x = -Math.PI / 2;
  collar.position.y = capTop - 0.08;
  spire.add(collar);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(crystalR, 0), glowMat);
  crystal.position.y = crystalY;
  crystal.castShadow = true;
  spire.add(crystal);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.9, 6), M.gold);
  finial.position.y = apexY + 0.45;
  finial.castShadow = true;
  spire.add(finial);

  // Free-floating anti-gravity rings, none of them touching the shaft
  const rings = [];
  const ringLow = plinthTop + 2.6;
  const ringSpan = spireH - 4.0;
  for (let i = 0; i < ringCount; i++) {
    const t = ringCount === 1 ? 0.5 : i / (ringCount - 1);
    const R = 5.1 - t * 1.3;
    const tube = 0.28 - t * 0.05;
    const tilt = -Math.PI / 2 + (0.22 + i * 0.12) * (i % 2 ? -1 : 1);
    const y = ringLow + t * ringSpan;

    const pivot = new THREE.Group();
    pivot.position.y = y;
    pivot.rotation.y = i * 0.8;
    group.add(pivot);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 8, 16), i % 2 ? M.neonCyan : M.cyberBlue);
    ring.rotation.x = tilt;
    ring.castShadow = true;
    pivot.add(ring);

    for (let b = 0; b < 4; b++) {
      const a = (b * Math.PI) / 2;
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(tube * 1.7, 0), M.gold);
      node.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      ring.add(node);
    }

    rings.push({
      pivot,
      ring,
      y,
      tilt,
      prec: (i % 2 ? -1 : 1) * (0.2 + i * 0.09),
      spin: (i % 2 ? 0.55 : -0.42) - i * 0.05,
      wob: 0.6 + i * 0.25
    });
  }

  // Gold buttress fins climbing the lower shaft
  if (lvl >= 2) {
    const finH = segH * 1.6;
    for (let a = 0; a < 4; a++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = a * (Math.PI / 2) + Math.PI / 4;
      pivot.position.y = 0.4 + finH / 2;
      spire.add(pivot);

      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, finH, 0.9), M.gold);
      fin.position.z = rBase * 0.95;
      fin.castShadow = true;
      pivot.add(fin);
    }
  }

  // Shield dome and plinth pylons come online at tier 3
  if (lvl >= 3) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(domeR, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.carGlass);
    dome.position.y = domeBase;
    dome.scale.y = 1.25;
    dome.castShadow = true;
    spire.add(dome);

    const domeRim = new THREE.Mesh(new THREE.TorusGeometry(domeR * 0.98, 0.12, 6, 16), M.gold);
    domeRim.rotation.x = -Math.PI / 2;
    domeRim.position.y = domeBase;
    spire.add(domeRim);

    const pylonH = 3.0 + lvl * 0.25;
    const px = baseW * 0.33;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, pylonH, 6), M.concrete);
        pylon.position.set(sx * px, step2Top + pylonH / 2, sz * px);
        pylon.castShadow = true;
        group.add(pylon);

        const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), M.cyberBlue);
        lamp.position.set(sx * px, step2Top + pylonH + 0.45, sz * px);
        lamp.castShadow = true;
        group.add(lamp);
      }
    }
  }

  // Energy conduits cut into the shaft faces at tier 4
  if (lvl >= 4) {
    const faceTilt = Math.atan((rBase - rTop) / spireH);
    for (let i = 0; i < segCount; i++) {
      const rMid = segR(i + 0.5);
      for (let a = 0; a < 4; a++) {
        const pivot = new THREE.Group();
        pivot.position.y = i * segH + segH / 2;
        pivot.rotation.y = a * (Math.PI / 2);
        spire.add(pivot);

        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.34, segH * 0.66, 0.12), glowMat);
        strip.position.z = rMid * 0.95;
        strip.rotation.x = -faceTilt;
        pivot.add(strip);
      }
    }
  }

  // Aurora emitter spines and the plinth halo at tier 5
  if (lvl >= 5) {
    const spineY = spireH * 0.76;
    const spineR = segR(segCount * 0.76) + 1.1;
    const spineLen = 4.2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.2, spineLen, 6), M.cyberBlue);
      spine.position.set(Math.cos(a) * spineR, spineY + spineLen * 0.42, Math.sin(a) * spineR);
      spine.rotation.z = -Math.cos(a) * 0.5;
      spine.rotation.x = Math.sin(a) * 0.5;
      spine.castShadow = true;
      spire.add(spine);

      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.6, 6), M.gold);
      root.position.set(Math.cos(a) * (spineR - 0.5), spineY, Math.sin(a) * (spineR - 0.5));
      spire.add(root);
    }

    const halo = new THREE.Mesh(new THREE.TorusGeometry(baseW * 0.44, 0.18, 6, 20), glowMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = step1Top + 0.3;
    group.add(halo);
  }

  // Crown of gold spikes around the shield at the final tier
  if (lvl === 6) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.5, 6), M.gold);
      spike.position.set(Math.cos(a) * domeR * 0.92, domeBase + 0.75, Math.sin(a) * domeR * 0.92);
      spike.rotation.z = -Math.cos(a) * 0.28;
      spike.rotation.x = Math.sin(a) * 0.28;
      spike.castShadow = true;
      spire.add(spike);
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 6, 10, Math.PI / 2), M.steel);
        arc.position.set(sx * baseW * 0.2, plinthTop, sz * baseW * 0.2);
        arc.rotation.y = Math.atan2(sz, sx) + Math.PI / 4;
        arc.rotation.z = Math.PI / 4;
        arc.castShadow = true;
        group.add(arc);
      }
    }
  }

  group.userData.animator = (delta, elapsed) => {
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      r.pivot.rotation.y += delta * r.prec;
      r.ring.rotation.z += delta * r.spin;
      r.ring.rotation.x = r.tilt + Math.sin(elapsed * r.wob + i) * 0.07;
      r.pivot.position.y = r.y + Math.sin(elapsed * 0.6 + i * 1.3) * 0.16;
    }
    crystal.rotation.y += delta * 0.9;
    crystal.rotation.x += delta * 0.32;
    crystal.scale.setScalar(1 + Math.sin(elapsed * 2.6) * 0.07);
    glowMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 2.2) * 0.4;
    spire.position.y = plinthTop + Math.sin(elapsed * 0.9) * 0.06;
  };

  return group;
}
