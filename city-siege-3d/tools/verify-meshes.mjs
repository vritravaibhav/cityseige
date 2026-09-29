import * as THREE from 'three';
import fs from 'fs';
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PALETTE = new Set('woodDark woodLight logRoof stone leaves leavesLight brickRed concrete ironDark steel moltenIron cyberBlue neonCyan neonYellow neonRed gold policeBlue policeWhite policeBlack sirenRed sirenBlue tireRubber carPaintRed carGlass headlight taillight hazardStripe gasRed asphalt dirtRoad roadLine sidewalk'.split(' '));
const SPEC = {
  spring_trap:[1,1.2,0], swat_armory:[2,6,0], solar_array:[2,4,0], landmine:[1,0.5,0], oil_refinery:[2,10,0],
  missile_silo:[2,6,1], tech_lab:[2,7,0], freeze_trap:[1,1.4,0], drone_hangar:[2,5,0], fusion_reactor:[2,18,0],
  plasma_mortar:[2,4.5,1], vortex_trap:[1,1.0,0], emp_disrupter:[2,8,0], crypto_vault:[2,6,0], orbital_relay:[2,22,0],
  doomsday_turret:[2,14,1], antimatter_collider:[2,16,0], quantum_citadel:[3,28,0]
};
const MAXW = {1:3.4, 2:10.0, 3:15.5};
const pascal = t => t.split('_').map(w => w[0].toUpperCase()+w.slice(1)).join('');
let fails = 0;
for (const [type,[fp,h,shoots]] of Object.entries(SPEC)) {
  const probs = [];
  const src = fs.readFileSync(`${ROOT}/src/rendering/meshes/${type}.js`,'utf8');
  // 1. no constructed materials (clone() is allowed)
  const ctor = src.match(/new THREE\.Mesh\w*Material/g);
  if (ctor) probs.push(`constructs ${ctor.length} material(s)`);
  // 2. palette names
  const used = new Set([...src.matchAll(/\bM\.(\w+)/g)].map(m=>m[1]));
  const bad = [...used].filter(n => !PALETTE.has(n) && n !== 'clone');
  if (bad.length) probs.push(`unknown palette: ${bad.join(',')}`);
  // 3. construct at every tier with a STRICT palette (unknown name -> throw)
  const mats = {}; for (const n of PALETTE) mats[n] = new THREE.MeshStandardMaterial({name:n});
  const F = { materials: mats };
  const mod = await import(`${ROOT}/src/rendering/meshes/${type}.js`);
  const fn = mod['create'+pascal(type)];
  if (typeof fn !== 'function') { probs.push(`missing export create${pascal(type)}`); console.log(`FAIL ${type}: ${probs.join('; ')}`); fails++; continue; }
  const sigs = []; const muzz = [];
  for (let l=1;l<=6;l++){
    let g;
    try { g = fn(F,l); } catch(e){ probs.push(`tier ${l} throws: ${e.message}`); break; }
    let n=0; g.traverse(o=>{ if(o.isMesh){ n++; if(!o.material) probs.push(`tier ${l}: mesh without material`); }});
    const b = new THREE.Box3().setFromObject(g); const sz = b.getSize(new THREE.Vector3());
    if (![sz.x,sz.y,sz.z].every(Number.isFinite)) probs.push(`tier ${l}: NaN bounds`);
    if (sz.x > MAXW[fp]+0.01 || sz.z > MAXW[fp]+0.01) probs.push(`tier ${l}: ${sz.x.toFixed(1)}x${sz.z.toFixed(1)} exceeds ${MAXW[fp]}m footprint box`);
    if (b.min.y < -0.35) probs.push(`tier ${l}: sinks to y=${b.min.y.toFixed(2)}`);
    sigs.push(`${n}|${sz.x.toFixed(2)}|${sz.y.toFixed(2)}|${sz.z.toFixed(2)}`);
    if (shoots) { const m = g.userData.muzzleHeight; if (!(m > 0)) probs.push(`tier ${l}: no muzzleHeight`); muzz.push(m); }
    if (g.userData.animator) {
      try { for (const e of [0, 0.5, 37.5, 9999]) g.userData.animator(0.016, e); } catch(e){ probs.push(`tier ${l}: animator throws ${e.message}`); }
    }
    if (l===6) {
      if (Math.abs(sz.y - h) / h > 0.25) probs.push(`tier 6 height ${sz.y.toFixed(1)}m vs target ${h}m`);
    }
  }
  // 4. tiers must change - and all six must be distinct from their neighbour
  for (let i=1;i<sigs.length;i++) if (sigs[i]===sigs[i-1]) probs.push(`tier ${i+1} identical to tier ${i}`);
  // 5. shared material mutation in an animator
  const anim = src.slice(src.indexOf('animator'));
  if (/\bM\.\w+\.(emissiveIntensity|color|opacity)\s*=/.test(anim)) probs.push('animator mutates a SHARED palette material');
  // 6. muzzle grows
  if (shoots && muzz.length===6 && !(muzz[5] > muzz[0])) probs.push(`muzzle does not grow (${muzz[0]} -> ${muzz[5]})`);
  const h1 = sigs[0].split('|')[2], h6 = sigs[5]?.split('|')[2];
  if (probs.length) { fails++; console.log(`FAIL ${type.padEnd(20)} ${probs.join('; ')}`); }
  else console.log(`ok   ${type.padEnd(20)} fp${fp}  h ${h1}m -> ${h6}m  meshes ${sigs[0].split('|')[0]} -> ${sigs[5].split('|')[0]}${shoots?`  muzzle ${muzz[0].toFixed(1)} -> ${muzz[5].toFixed(1)}`:''}`);
}
console.log(`\n${18-fails}/18 pass`);
process.exit(fails?1:0);
