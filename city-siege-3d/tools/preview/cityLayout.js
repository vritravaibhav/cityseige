import {
  BUILDING_DEFS,
  BUILDING_TYPES,
  MAX_TOWN_HALL_LEVEL,
  ROLE,
  limitFor,
  cityRadiusFor,
  townHallRow
} from '../../src/data/progression.js';
import {
  MAIN_GATES,
  gateIdFor,
  footprintOf,
  createModel,
  applyOps,
  auditLayout,
  fromCloudLayout,
  countsTowardDestruction,
  renderAsciiMap
} from '../../src/shared/cityRules.js';

/**
 * cityLayout - a REPRESENTATIVE city for any Town Hall, for the Town Hall preview page
 * (townhall.html). Developer tooling only: nothing in the game imports this file.
 *
 * Why it exists: a player's own save shows one city at one Town Hall. To see what a city LOOKS
 * like at every step of the ladder we need a full city for each of the 12 levels, and it has to be
 * one a player could really build - so every structure and road tile goes through the game's own
 * placement rules (cityRules.applyOps, the same rules as the Design screen and the MCP server),
 * starting from a stocked inventory. Nothing is drawn that the Design screen would refuse.
 *
 * Deterministic on purpose: no Math.random and no clock. The same Town Hall + options always give
 * the same city (ids included), so a preview link (townhall.html?th=7) is a stable reference.
 *
 * The plan, in the order it is built:
 *   1. the Town Hall just west of the centre, at level = Town Hall;
 *   2. roads: the three gate roads into the centre plus a square ring road 6 tiles out. The
 *      stretch of each gate road beyond the buildable radius is seeded as the starter city lays
 *      it (every city starts with it, and the Design screen cannot edit tiles out there);
 *   3. 2x2 / 3x3 buildings on an even-tile lattice (touching 2x2s pack with no gap, and a road on
 *      an even line costs exactly one row of them), never touching a road:
 *        core   - the research labs and the auras that guard the core (EMP, Relay, Citadel),
 *                 nearest the Town Hall;
 *        gates  - guns, pursuit spawners and the auras that buff guns (Solar, Fusion), shared out
 *                 over the three gates and clustered round a point on each gate road;
 *        economy- producers, storage and Labour Huts, nearest the centre that is still free
 *                 (inside the ring at a low Town Hall, the middle ring at a high one);
 *   4. barriers (spike traps, roadblocks) as walls across each gate approach at the rim;
 *   5. drive-over traps down the gate roads and round the ring road, spaced out;
 *   6. trees along the edge of the buildable area.
 * Anything with no legal tile left is reported, never forced.
 */

/** Fill modes: every build limit, or about 60% of each (a city partway through its Town Hall). */
export const FILLS = ['full', 'typical'];
/** Level modes: every upgradeable building at the Town Hall's level, or all at level 1. */
export const LEVEL_MODES = ['max', 'one'];
const TYPICAL_SHARE = 0.6;

/** Chebyshev distance of the ring road from the centre (an even line: see the lattice note). */
const RING = 6;
/** Where the Town Hall stands: just west of the junction, facing the east gate road. */
const HALL = { gx: -2, gz: 0 };
/** A fixed "now" so ids and the production clock never depend on when the page was opened. */
const FIXED_NOW = Date.UTC(2026, 0, 1);

// ------------------------------------------------------------------ groups

/**
 * Which zone a type is built in, from its role (so a type added to progression later is still
 * placed somewhere sensible). Auras split by what they do: the ones that buff guns stand with the
 * guns, the ones that guard the core (jamming, targeting, shield) stand at the core.
 */
export function zoneOf(type) {
  const def = BUILDING_DEFS[type];
  if (!def) return null;
  if (type === 'town_hall') return 'hall';
  if (type === 'main_gate' || type === 'road') return null;
  switch (def.role) {
    case ROLE.RESEARCH: return 'core';
    case ROLE.AURA: return def.aura && ['fireRate', 'damage'].includes(def.aura.kind) ? 'gates' : 'core';
    case ROLE.TURRET:
    case ROLE.SPAWNER: return 'gates';
    case ROLE.PRODUCER:
    case ROLE.STORAGE: return 'economy';
    case ROLE.BARRIER: return 'barrier';
    case ROLE.TRAP: return 'trap';
    case ROLE.SCENERY: return 'tree';
    default: return 'economy';
  }
}

/** How many of `type` the preview city wants at Town Hall `th`. */
export function wantedCount(type, th, fill = 'full') {
  const limit = limitFor(type, th);
  if (limit <= 0 || type === 'main_gate' || type === 'road') return 0;
  if (fill !== 'typical' || type === 'town_hall' || BUILDING_DEFS[type].unique) return limit;
  return Math.max(1, Math.round(limit * TYPICAL_SHARE));
}

/** The level a `type` is placed at. The Town Hall is always the Town Hall's level. */
export function levelFor(type, th, levels = 'max') {
  const def = BUILDING_DEFS[type];
  if (type === 'town_hall') return th;
  if (!def || def.upgradeable === false) return 1;
  return levels === 'one' ? 1 : th;
}

/** Deterministic PRNG (mulberry32) for the ids cityRules mints: same seed, same ids. */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Types round-robin (one of each in turn), as a queue of [type, copyIndex]. */
function roundRobin(types, want) {
  const left = Object.fromEntries(types.map(t => [t, want[t] || 0]));
  const queue = [];
  for (let copy = 0, more = true; more; copy++) {
    more = false;
    for (const t of types) {
      if (left[t] > 0) { queue.push([t, copy]); left[t]--; more = true; }
    }
  }
  return queue;
}

// ------------------------------------------------------------------ the generator

/**
 * Build the preview city for Town Hall `th`. Returns
 *   { th, fill, levels, blob, layout, audit, report, map }
 * `blob` is the local city blob restoreCity takes; `layout` the cloud layout cityRules built;
 * `audit` cityRules.auditLayout of it; `report` what was wanted, placed and skipped per type;
 * `map` cityRules' text map.
 */
export function generateCity(th, { fill = 'full', levels = 'max' } = {}) {
  const TH = Math.max(1, Math.min(MAX_TOWN_HALL_LEVEL, Math.round(Number(th)) || 1));
  fill = FILLS.includes(fill) ? fill : 'full';
  levels = LEVEL_MODES.includes(levels) ? levels : 'max';
  const R = cityRadiusFor(TH);
  const rim = Math.floor(R);                           // outermost axis tile inside the radius

  // --- the stocked inventory: every wanted unit, at its level (cityRules takes a unit's level
  // from the stowed-levels list, exactly as placing a stowed building does in the game).
  const want = {};
  const holdings = { inventory: {}, stowedCounts: {}, stowedLevels: {}, stowedSealed: {}, bankCredits: {} };
  for (const type of BUILDING_TYPES) {
    const n = wantedCount(type, TH, fill);
    if (!n) continue;
    want[type] = n;
    holdings.inventory[type] = n;
    const L = levelFor(type, TH, levels);
    if (L > 1) {
      holdings.stowedCounts[type] = n;
      holdings.stowedLevels[type] = Array(n).fill(L);
    }
  }
  holdings.inventory.road = limitFor('road', TH);

  // --- the gates' axes: `out` points from the centre to the gate, `side` runs along its wall.
  const gates = MAIN_GATES.map(g => {
    const len = Math.hypot(g.gx, g.gz);
    const out = { x: Math.round(g.gx / len), z: Math.round(g.gz / len) };
    return { ...g, out, side: { x: Math.abs(out.z), z: Math.abs(out.x) } };
  });
  const along = (g, q, k = 0) => [g.out.x * q + g.side.x * k, g.out.z * q + g.side.z * k];

  // --- the starting layout: the three fixed gates and the unbuildable stretch of their roads.
  const seedRoads = [];
  for (const g of gates) {
    for (let q = rim + 1; q <= 15; q++) seedRoads.push(along(g, q).join(','));
  }
  const model = createModel({
    v: 1,
    savedAt: FIXED_NOW,
    buildings: MAIN_GATES.map(g => ({ id: gateIdFor(g.name), t: 'main_gate', gx: g.gx, gz: g.gz, l: 1, rot: g.rot, gate: g.name })),
    tasks: [],
    roads: seedRoads
  }, holdings);
  const ctx = { nowMs: FIXED_NOW, rand: seeded(TH * 1000 + (fill === 'full' ? 1 : 2) * 10 + (levels === 'max' ? 1 : 2)) };

  // --- a local picture of the map, to choose tiles quickly; the verdict is always cityRules'.
  const key = (x, z) => x + ',' + z;
  const centres = new Map();                           // "gx,gz" -> { type, fp } for every structure
  const roads = new Set(seedRoads);
  const reserved = new Set();                          // 1-tile spots kept free for the gate walls
  for (const g of MAIN_GATES) centres.set(key(g.gx, g.gz), { type: 'main_gate', fp: 3 });

  const inRadius = (x, z) => Math.hypot(x, z) <= R;
  /** BuildingManager.isFootprintBlocked: any structure (trees excepted) closer than the reach on both axes. */
  const blocked = (fp, x, z) => {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const o = centres.get(key(x + dx, z + dz));
        if (!o || o.type === 'tree') continue;
        const reach = (fp + o.fp) / 2;
        if (Math.abs(dx) < reach && Math.abs(dz) < reach) return true;
      }
    }
    return false;
  };
  /** Would a `fp` building on (x, z) stand on a road tile (cityRules' touchesRoad)? */
  const touchesRoad = (fp, x, z) => {
    const reach = (1 + fp) / 2;
    const span = Math.ceil(reach) - 1;
    for (let dx = -span; dx <= span; dx++) {
      for (let dz = -span; dz <= span; dz++) {
        if (Math.abs(dx) < reach && Math.abs(dz) < reach && roads.has(key(x + dx, z + dz))) return true;
      }
    }
    return false;
  };
  /** Would it cover a tile kept for a gate wall? */
  const coversReserved = (fp, x, z) => {
    const reach = (1 + fp) / 2;
    for (const k of reserved) {
      const [rx, rz] = k.split(',').map(Number);
      if (Math.abs(rx - x) < reach && Math.abs(rz - z) < reach) return true;
    }
    return false;
  };
  /** The whole footprint inside the radius (raidbot's rule), not just its centre tile. */
  const footInside = (fp, x, z) => {
    const h = (fp - 1) / 2;
    return Math.hypot(Math.abs(x) + h, Math.abs(z) + h) <= R;
  };
  const fitsBig = (type, x, z) => {
    const fp = footprintOf(type);
    return footInside(fp, x, z) && !touchesRoad(fp, x, z) && !blocked(fp, x, z) && !coversReserved(fp, x, z);
  };
  const fitsSmall = (x, z) => inRadius(x, z) && !blocked(1, x, z);

  const placed = {};
  const refused = [];
  /** Place through cityRules; record it locally only if the rules said yes. */
  const place = (type, gx, gz) => {
    const res = applyOps(model, [{ op: 'place', type, gx, gz }], ctx);
    if (!res.ok) { refused.push({ type, gx, gz, reason: res.results[res.results.length - 1].reason }); return false; }
    centres.set(key(gx, gz), { type, fp: footprintOf(type) });
    placed[type] = (placed[type] || 0) + 1;
    return true;
  };
  const addRoads = (path) => {
    const res = applyOps(model, [{ op: 'add_roads', path }], ctx);
    if (res.ok) for (const [x, z] of res.results[0].addedTiles) roads.add(key(x, z));
    return res.ok;
  };

  // 1. The Town Hall first: every other rule (radius, limits) reads its level.
  place('town_hall', HALL.gx, HALL.gz);

  // 2. Roads: gate roads into the centre, then the ring.
  for (const g of gates) addRoads([along(g, rim), along(g, 0)]);
  addRoads([[-RING, -RING], [RING, -RING], [RING, RING], [-RING, RING], [-RING, -RING]]);

  // The front row of each gate wall stays free of big buildings.
  for (const g of gates) {
    for (let k = -3; k <= 3; k++) {
      const [x, z] = along(g, rim, k);
      if (inRadius(x, z)) reserved.add(key(x, z));
    }
  }

  // 3. Big buildings, zone by zone.
  const all = [];
  for (let x = -15; x <= 15; x++) for (let z = -15; z <= 15; z++) all.push([x, z]);
  const lattice = all.filter(([x, z]) => x % 2 === 0 && z % 2 === 0);
  const tie = ([x, z]) => (x * 0.0013 + z * 0.00071);         // deterministic, never reorders real gaps
  const sortBy = (tiles, f) => tiles.map(t => [f(t) + tie(t), t]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
  const byType = (zone) => BUILDING_TYPES.filter(t => want[t] && zoneOf(t) === zone)
    // Big footprints first (they need the most room), then the latest unlock (the showpieces).
    .sort((a, b) => (footprintOf(b) - footprintOf(a)) || (BUILDING_DEFS[b].unlockTH - BUILDING_DEFS[a].unlockTH));

  const hallDist = ([x, z]) => Math.hypot(x - HALL.gx, z - HALL.gz);
  const anchorQ = Math.max(RING + 1, Math.min(10.5, R - 4));
  const anchors = gates.map(g => along(g, anchorQ));
  const gateSector = ([x, z]) => gates.some(g => {
    const q = x * g.out.x + z * g.out.z;
    return q > 0 && Math.abs(x * g.side.x + z * g.side.z) < q * 0.45;
  });
  const orders = {
    core: (tiles) => sortBy(tiles, hallDist),
    economy: (tiles) => sortBy(tiles, ([x, z]) => Math.hypot(x, z) + (gateSector([x, z]) ? 3 : 0)),
    gate: (tiles, gi) => sortBy(tiles, ([x, z]) => Math.hypot(x - anchors[gi][0], z - anchors[gi][1]))
  };

  // The queue: core, then the gate defenses (round-robin by type, each type's copies dealt
  // round the three gates), then the economy.
  const queue = [];
  for (const t of byType('core')) for (let i = 0; i < want[t]; i++) queue.push({ type: t, zone: 'core' });
  const gateTypes = byType('gates');
  for (const [t, copy] of roundRobin(gateTypes, want)) {
    queue.push({ type: t, zone: 'gate', gate: (gateTypes.indexOf(t) + copy) % gates.length });
  }
  for (const t of byType('economy')) for (let i = 0; i < want[t]; i++) queue.push({ type: t, zone: 'economy' });

  const candidates = (item, tiles) => (item.zone === 'gate' ? orders.gate(tiles, item.gate) : orders[item.zone](tiles));
  const cache = new Map();
  const ordered = (item, pass) => {
    const k = `${pass}|${item.zone}|${item.gate ?? ''}`;
    if (!cache.has(k)) cache.set(k, candidates(item, pass === 1 ? lattice : all));
    return cache.get(k);
  };
  // Pass 1 keeps to the lattice; pass 2 gives whatever did not fit any free tile at all.
  let left = queue;
  for (const pass of [1, 2]) {
    const next = [];
    for (const item of left) {
      const spot = ordered(item, pass).find(([x, z]) => fitsBig(item.type, x, z));
      if (!spot || !place(item.type, spot[0], spot[1])) next.push(item);
    }
    left = next;
  }
  reserved.clear();

  // 4. Barriers: a wall across each gate road at the rim, growing along the edge of the buildable
  // area either side of the gate (the band big buildings cannot use anyway), then single blocks
  // across the gate road further in. Neighbouring barriers join into one wall (diagonals too),
  // so a 2x2 clump would draw as an X of wall sections: avoided while there is room.
  const isBarrier = (x, z) => {
    const o = centres.get(key(x, z));
    return !!o && zoneOf(o.type) === 'barrier';
  };
  const clumps = (x, z) => [[-1, -1], [-1, 0], [0, -1], [0, 0]].some(([ax, az]) =>
    [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dz]) => {
      const tx = x + ax + dx;
      const tz = z + az + dz;
      return (tx === x && tz === z) || isBarrier(tx, tz);
    }));
  const band = all.filter(([x, z]) => inRadius(x, z) && Math.hypot(x, z) >= R - 1.6);
  const barrierTiles = gates.map(g => {
    const list = [];
    for (const k of [0, -1, 1, -2, 2, -3, 3, -4, 4]) list.push(along(g, rim, k));
    list.push(...sortBy(band, ([x, z]) => Math.hypot(x - g.gx, z - g.gz)));
    for (let q = rim - 2; q > RING + 1; q -= 2) list.push(along(g, q));
    const junction = along(g, RING);
    list.push(...sortBy(all.filter(([x, z]) => roads.has(key(x, z))), ([x, z]) => Math.hypot(x - junction[0], z - junction[1])));
    list.push(...sortBy(all, ([x, z]) => Math.hypot(x - g.gx, z - g.gz)));
    return list;
  });
  const barrierQueue = [];
  BUILDING_TYPES.filter(t => want[t] && zoneOf(t) === 'barrier')
    .sort((a, b) => (a === 'spike_trap' ? -1 : b === 'spike_trap' ? 1 : 0))
    .forEach((t, ti) => { for (let i = 0; i < want[t]; i++) barrierQueue.push({ type: t, gate: (ti + i) % gates.length }); });
  // Each gate takes its spike traps first, so they sit on the road in the middle of its wall.
  barrierQueue.sort((a, b) => a.gate - b.gate);
  for (const item of barrierQueue) {
    const list = barrierTiles[item.gate];
    const spot = list.find(([x, z]) => fitsSmall(x, z) && !clumps(x, z)) || list.find(([x, z]) => fitsSmall(x, z));
    if (spot) place(item.type, spot[0], spot[1]);
  }

  // 5. Drive-over traps: down each gate road inside the walls, then round the ring road from the
  // junction, spaced so no two traps touch while there is room (only one mine may go off at a time).
  const isTrap = (x, z) => {
    const o = centres.get(key(x, z));
    return !!o && zoneOf(o.type) === 'trap';
  };
  const trapNear = (x, z) => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if ((dx || dz) && isTrap(x + dx, z + dz)) return true;
    return false;
  };
  const trapTiles = gates.map((g, gi) => {
    const list = [];
    for (let q = rim - 1; q > RING; q--) list.push(along(g, q));
    const junction = along(g, RING);
    const ring = all.filter(([x, z]) => roads.has(key(x, z)) && Math.max(Math.abs(x), Math.abs(z)) === RING);
    list.push(...sortBy(ring, ([x, z]) => Math.hypot(x - junction[0], z - junction[1])));
    for (let q = RING - 1; q >= 1; q--) list.push(along(g, q));
    list.push(...sortBy(all.filter(([x, z]) => roads.has(key(x, z))), ([x, z]) => Math.hypot(x - g.gx, z - g.gz)));
    list.push(...sortBy(all, ([x, z]) => Math.hypot(x - anchors[gi][0], z - anchors[gi][1])));
    return list;
  });
  const trapTypes = BUILDING_TYPES.filter(t => want[t] && zoneOf(t) === 'trap')
    .sort((a, b) => BUILDING_DEFS[a].unlockTH - BUILDING_DEFS[b].unlockTH);
  roundRobin(trapTypes, want).forEach(([t], i) => {
    const list = trapTiles[i % gates.length];
    const spot = list.find(([x, z]) => fitsSmall(x, z) && !trapNear(x, z)) || list.find(([x, z]) => fitsSmall(x, z));
    if (spot) place(t, spot[0], spot[1]);
  });

  // 6. Trees fill the edge of the buildable area, every other tile first so they read as a treeline.
  if (want.tree) {
    const edge = sortBy(all.filter(([x, z]) => inRadius(x, z) && !roads.has(key(x, z))),
      ([x, z]) => -Math.hypot(x, z));
    const treeNear = (x, z) => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const o = (dx || dz) ? centres.get(key(x + dx, z + dz)) : null;
          if (o && o.type === 'tree') return true;
        }
      }
      return false;
    };
    const free = (x, z) => fitsSmall(x, z) && !centres.has(key(x, z));
    for (let i = 0; i < want.tree; i++) {
      const spot = edge.find(([x, z]) => free(x, z) && !treeNear(x, z)) || edge.find(([x, z]) => free(x, z));
      if (!spot || !place('tree', spot[0], spot[1])) break;
    }
  }

  // --- what came out.
  const layout = model.layout;
  const blob = { ...fromCloudLayout(layout), tasks: [] };
  // The bare layout is audited: the stocked inventory's leftovers are not part of the city.
  const audit = auditLayout({ buildings: layout.buildings, tasks: layout.tasks, roads: layout.roads });
  return {
    th: TH,
    fill,
    levels,
    blob,
    layout,
    audit,
    refused,
    report: reportFor(TH, fill, levels, layout, want),
    map: renderAsciiMap(model, { legend: false })
  };
}

/**
 * Per type: limit, wanted, placed, level; and the totals the preview shows. `counted` follows the
 * raid's own rule (cityRules.countsTowardDestruction: not gates, trees or drive-over traps).
 */
export function reportFor(th, fill, levels, layout, want) {
  const placed = {};
  for (const b of layout.buildings) placed[b.t] = (placed[b.t] || 0) + 1;
  const rows = [];
  for (const type of BUILDING_TYPES) {
    const limit = limitFor(type, th);
    if (limit <= 0) continue;
    const def = BUILDING_DEFS[type];
    const isRoad = type === 'road';
    const n = isRoad ? layout.roads.length : (placed[type] || 0);
    rows.push({
      type,
      name: type === 'road' ? 'Road tiles' : def.name,
      icon: def.icon,
      role: def.role,
      zone: type === 'main_gate' ? 'gates' : type === 'road' ? 'tree' : zoneOf(type),
      limit,
      wanted: type === 'main_gate' ? 3 : isRoad ? n : (want[type] || 0),
      placed: n,
      level: type === 'road' ? null : levelFor(type, th, levels),
      fixed: def.upgradeable === false,
      isNew: def.unlockTH === th
    });
  }
  const sum = (pred, field) => rows.filter(pred).reduce((s, r) => s + r[field], 0);
  const isCounted = (r) => r.type !== 'road' && countsTowardDestruction({ t: r.type });
  const isTrap = (r) => r.role === ROLE.TRAP;
  const totals = {
    counted: { placed: sum(isCounted, 'placed'), wanted: sum(isCounted, 'wanted'), limit: sum(isCounted, 'limit') },
    traps: { placed: sum(isTrap, 'placed'), wanted: sum(isTrap, 'wanted'), limit: sum(isTrap, 'limit') },
    trees: { placed: placed.tree || 0, wanted: want.tree || 0, limit: limitFor('tree', th) },
    roads: { placed: layout.roads.length, limit: limitFor('road', th) }
  };
  const skipped = rows.filter(r => r.type !== 'road' && r.wanted > r.placed).map(r => ({ type: r.type, name: r.name, n: r.wanted - r.placed }));
  const parts = [`placed ${totals.counted.placed} / ${totals.counted.wanted} counted buildings`];
  const trapGap = totals.traps.wanted - totals.traps.placed;
  const treeGap = totals.trees.wanted - totals.trees.placed;
  if (trapGap > 0) parts.push(`${trapGap} trap${trapGap === 1 ? '' : 's'} skipped`);
  if (treeGap > 0) parts.push(`${treeGap} tree${treeGap === 1 ? '' : 's'} skipped`);
  if (!skipped.length) parts.push('everything fit');
  return {
    th,
    fill,
    levels,
    name: townHallRow(th).name,
    rows,
    totals,
    skipped,
    summary: parts.join('; ')
  };
}
