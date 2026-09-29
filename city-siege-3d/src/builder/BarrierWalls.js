import { BUILDING_DEFS } from '../data/progression.js';

/**
 * BarrierWalls - rammable barriers (roadblocks, spike traps) on neighbouring tiles, diagonals
 * included, join into one continuous wall.
 *
 * BuildingManager draws the joining sections and DestructionEngine collides the buggy
 * against the very same links, so what the player sees is exactly what stops the raider.
 * A barrier that is razed mid-raid drops out of the index, which opens its stretch of wall.
 */

/** The 8 neighbouring tiles a barrier links to. */
export const BARRIER_LINK_DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

/** Does `b` chain into walls? (Catalog barriers only - gates and drive-over traps do not.) */
export function isChainBarrier(b) {
  if (!b || b.isMainGate) return false;
  const def = BUILDING_DEFS[b.type];
  return !!(def && def.barrier && def.barrier.rammable);
}

/** "gx,gz" -> barrier, for every standing chain barrier in `buildings`. */
export function standingBarrierIndex(buildings) {
  const index = new Map();
  for (const b of buildings) {
    if (!b.isDestroyed && isChainBarrier(b)) index.set(`${b.gx},${b.gz}`, b);
  }
  return index;
}

/** The standing barriers `b` links to, as [neighbour, dx, dz] in tiles. */
export function barrierLinksOf(b, index) {
  const links = [];
  for (const [dx, dz] of BARRIER_LINK_DIRS) {
    const n = index.get(`${b.gx + dx},${b.gz + dz}`);
    if (n && n !== b) links.push([n, dx, dz]);
  }
  return links;
}

/**
 * Closest point on `b`'s share of the wall to (x, z): its centre, or anywhere along the
 * half-sections running to the midpoint with each linked neighbour. Positions come from
 * the meshes, so this works in world units without knowing the tile size.
 */
export function closestWallPoint(b, links, x, z) {
  const cx = b.mesh.position.x;
  const cz = b.mesh.position.z;
  let bestX = cx;
  let bestZ = cz;
  let bestD2 = (x - cx) ** 2 + (z - cz) ** 2;
  for (const [n] of links) {
    if (!n.mesh) continue;
    const ex = (n.mesh.position.x - cx) / 2;
    const ez = (n.mesh.position.z - cz) / 2;
    const len2 = ex * ex + ez * ez;
    if (len2 <= 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((x - cx) * ex + (z - cz) * ez) / len2));
    const px = cx + ex * t;
    const pz = cz + ez * t;
    const d2 = (x - px) ** 2 + (z - pz) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestX = px;
      bestZ = pz;
    }
  }
  return { x: bestX, z: bestZ, dist: Math.sqrt(bestD2) };
}
