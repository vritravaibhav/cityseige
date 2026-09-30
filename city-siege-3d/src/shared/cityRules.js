import {
  BUILDING_DEFS,
  MAX_BUILDING_LEVEL,
  MAX_TOWN_HALL_LEVEL,
  limitFor,
  cityRadiusFor,
  storageSlotsFor,
  producePayout,
  produceCapacityFor,
  storedAfter,
  turretStatsFor,
  trapStatsFor,
  auraRadiusFor,
  raidDefenseFor,
  raidGemsFor,
  townHallRow,
  TILE_METRES
} from '../data/progression.js';

/**
 * cityRules - the city layout as PLAIN DATA: the cloud encoding, a working model, every design
 * edit the game's Design screen allows (place / move / stow / clear a tree / draw and erase
 * roads) and a text map of it.
 *
 * Why this exists: in the game the tile rules are enforced by the UI (GridSystem +
 * BuildingManager + EconomyManager), which all import three.js. The MCP server edits a player's
 * city in Firestore with no game running, so it needs the SAME rules without a scene. Every rule
 * here mirrors a line of that code (named in the comments), and tools/online/parity-check.mjs
 * drives the real game through GridSystem.handleTileAction to prove the verdicts agree.
 *
 * Pure on purpose: imports only progression.js, touches no DOM / three / firebase, and reads the
 * clock only through ctx.nowMs (Date.now() is a default inside functions, never at module scope),
 * so it runs unmodified in Node and in the browser.
 *
 * Coordinates: gx grows to the east, gz to the south, (0,0) is the centre. A structure is a
 * square of `footprint` tiles centred on its tile.
 */

/**
 * The city's three Main Gates: fixed features of the perimeter wall. They are never sold,
 * moved or upgraded, so every city (fresh, restored or rearranged) has exactly these.
 * (Moved here from BuildingManager.js, which re-exports it: identical values.)
 */
export const MAIN_GATES = [
  { name: 'North Gate', gx: 0, gz: -15, rot: 0 },
  { name: 'East Gate', gx: 15, gz: 0, rot: Math.PI / 2 },
  { name: 'South Gate', gx: 0, gz: 15, rot: Math.PI }
];

/** The four facings a building can be given (radians; op `rot` is in degrees 0/90/180/270). */
export const ROT_STEPS = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];

/** What the Firestore rules accept for one city document (spec section 6). */
export const LAYOUT_LIMITS = { buildings: 400, roads: 450 };

/** Failure codes of checkPlace / applyOp. The value is the code itself. */
export const REASON = Object.freeze({
  UNKNOWN_TYPE: 'UNKNOWN_TYPE',
  NOT_PLACEABLE: 'NOT_PLACEABLE',
  NOT_IN_INVENTORY: 'NOT_IN_INVENTORY',
  LOCKED: 'LOCKED',
  AT_LIMIT: 'AT_LIMIT',
  OUTSIDE_RADIUS: 'OUTSIDE_RADIUS',
  BLOCKED: 'BLOCKED',
  NOT_FOUND: 'NOT_FOUND',
  IMMOVABLE: 'IMMOVABLE',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
  NOT_STOWABLE: 'NOT_STOWABLE',
  NO_DEPOT: 'NO_DEPOT',
  STORAGE_FULL: 'STORAGE_FULL',
  NOT_A_TREE: 'NOT_A_TREE',
  NO_ROAD_INVENTORY: 'NO_ROAD_INVENTORY',
  ROAD_LIMIT: 'ROAD_LIMIT',
  BAD_ARGS: 'BAD_ARGS'
});

/**
 * One map letter per building role (the "category" of the text map). UPPERCASE marks the tile a
 * building stands on (its gx,gz); lowercase fills the rest of its footprint.
 */
export const ROLE_LETTER = Object.freeze({
  core: 'H', gate: 'G', turret: 'T', spawner: 'P', trap: 'X', barrier: 'B',
  producer: 'E', storage: 'S', aura: 'A', research: 'R', scenery: 'Y'
});

const ROLE_WORDS = {
  H: 'Town Hall', G: 'Main Gate', T: 'turret', P: 'police / pursuit spawner', X: 'trap',
  B: 'barrier (spike trap / roadblock)', E: 'producer', S: 'storage / labour', A: 'aura',
  R: 'research lab', Y: 'tree (scenery, never blocks)'
};

// ------------------------------------------------------------------ small helpers

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const isInt = (v) => typeof v === 'number' && Number.isInteger(v);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const clampInt = (v, lo, hi, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
};
const tileKey = (gx, gz) => gx + ',' + gz;
const fmtTile = (gx, gz) => '(' + gx + ',' + gz + ')';
const nameOf = (type) => (BUILDING_DEFS[type] && BUILDING_DEFS[type].name) || type;
const isGateEntry = (b) => !!b && (!!b.gate || b.t === 'main_gate');

/** A building id the save may carry: 1..40 url-safe characters. */
export function isValidBuildingId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

/** The fixed id BuildingManager.addMainGate gives a gate ('North Gate' -> 'gate_north_gate'). */
export function gateIdFor(name) {
  return `gate_${String(name).toLowerCase().replace(' ', '_')}`;
}

const FIXED_GATE_IDS = new Set(MAIN_GATES.map(g => gateIdFor(g.name)));

/** The fixed Main Gate that belongs on tile (gx, gz), or null (BuildingManager.fixedGateAt). */
export function fixedGateAt(gx, gz) {
  return MAIN_GATES.find(g => g.gx === gx && g.gz === gz) || null;
}

/**
 * A new building id: 'b' + base36 time + base36 random (<= 20 url-safe chars). Every place a
 * building is created (BuildingManager.addBuilding, the MCP server) uses this, so ids stay unique
 * across writers without coordination.
 */
export function newBuildingId(nowMs, rand = Math.random) {
  const t = Math.max(0, Math.floor(Number(nowMs) || 0)).toString(36);
  let r = Number(rand());
  if (!Number.isFinite(r) || r < 0) r = 0;
  if (r >= 1) r = 0.999999999;
  const tail = Math.floor(r * 36 ** 8).toString(36).padStart(8, '0');
  return ('b' + t + tail).slice(0, 20);
}

/**
 * An id no building in `used` has. With a fixed test rand, or two ids in the same millisecond,
 * newBuildingId repeats itself, so step the time part until it is free (deterministic).
 */
function uniqueId(used, nowMs, rand, prefix = 'b') {
  for (let k = 0; k < 10000; k++) {
    const id = prefix + newBuildingId(Number(nowMs || 0) + k, rand).slice(1);
    if (!used.has(id)) { used.add(id); return id; }
  }
  throw new Error('cityRules: could not generate a unique id');
}

/** Side of the square a type covers, in tiles (BuildingManager.footprintOf). */
export function footprintOf(type) {
  const def = BUILDING_DEFS[type];
  return Math.max(1, (def && def.footprint) || 1);
}

/**
 * The city's Town Hall level: the first town_hall's level, else 1 (BuildingManager.getTownHallLevel).
 * Takes save entries ({t, l}) or live buildings ({type, level}).
 */
export function townHallLevelOf(buildings) {
  const th = arr(buildings).find(b => b && (b.t === 'town_hall' || b.type === 'town_hall'));
  if (!th) return 1;
  const l = th.l !== undefined ? th.l : th.level;
  return clampInt(l || 1, 1, MAX_TOWN_HALL_LEVEL, 1);
}

/** Spike traps and roadblocks: their facing follows their wall links (BarrierWalls.isChainBarrier). */
function isChainBarrierType(type) {
  const def = BUILDING_DEFS[type];
  return !!(def && def.barrier && def.barrier.rammable);
}

/** DestructionEngine.countsTowardDestruction: gates, trees and traps are not raid targets. */
export function countsTowardDestruction(b) {
  if (!b || isGateEntry(b) || b.t === 'tree') return false;
  const def = BUILDING_DEFS[b.t];
  return !(def && def.role === 'trap');
}

// ------------------------------------------------------------------ cloud encoding

function copyBuilding(s, id) {
  const o = { id };
  for (const k of ['t', 'gx', 'gz', 'l', 'st', 'rot', 'gate']) {
    if (s[k] !== undefined) o[k] = s[k];
  }
  return o;
}

function copyTask(t, i, id) {
  const o = { i };
  if (id !== undefined) o.id = id;
  for (const k of ['t', 'gx', 'gz', 'to', 'endsAt', 'total']) {
    if (t[k] !== undefined) o[k] = t[k];
  }
  return o;
}

/**
 * The index (into `buildings`) of the building a saved job belongs to, or -1. Same order as
 * CityPersistence.taskBuilding: by id first, then by index (type must agree, never a gate), then -
 * for saves from before the index - by tile.
 */
function taskTargetIn(buildings, t) {
  if (!t) return -1;
  if (typeof t.id === 'string') {
    const i = buildings.findIndex(b => b && b.id === t.id);
    if (i >= 0) {
      const b = buildings[i];
      return !isGateEntry(b) && (typeof t.t !== 'string' || b.t === t.t) ? i : -1;
    }
  }
  if (t.i !== undefined && t.i !== null) {
    const i = Number(t.i);
    const b = Number.isInteger(i) && i >= 0 && i < buildings.length ? buildings[i] : null;
    return b && !isGateEntry(b) && typeof t.t === 'string' && b.t === t.t ? i : -1;
  }
  const gx = Math.round(Number(t.gx));
  const gz = Math.round(Number(t.gz));
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return -1;
  let tree = -1;
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (!b || b.gx !== gx || b.gz !== gz || isGateEntry(b)) continue;
    if (typeof t.t === 'string' && b.t !== t.t) continue;
    if (b.t !== 'tree') return i;
    if (tree < 0) tree = i;
  }
  return tree;
}

/**
 * Local city blob (CityPersistence.serializeCity) -> cloud layout. Firestore forbids arrays
 * inside arrays, so roads become "gx,gz" strings; buildings and tasks are copied field by field
 * (unknown fields and `undefined` values dropped - Firestore rejects undefined). Every cloud
 * building has an id: a missing, malformed or duplicate one is generated here, and the caller
 * must put the ids back on its live buildings (CloudSync restores them onto bm.buildings in
 * the same order). Gates always carry their fixed ids.
 */
export function toCloudLayout(localBlob, { nowMs = Date.now(), rand = Math.random } = {}) {
  const blob = isObj(localBlob) ? localBlob : {};
  const src = arr(blob.buildings);
  const used = new Set();
  const buildings = [];
  const newIndex = new Map();     // source index -> index in `buildings`
  const pending = [];             // entries that still need a generated id
  // First pass: gates take their fixed ids and every valid, unused id is kept, so a building
  // that already has an id never loses it to a generated one.
  src.forEach((s, i) => {
    if (!isObj(s)) return;
    let id;
    const gx = Math.round(Number(s.gx));
    const gz = Math.round(Number(s.gz));
    if (isGateEntry(s)) {
      const fixed = fixedGateAt(gx, gz);
      const gid = fixed ? gateIdFor(fixed.name) : null;
      if (gid && !used.has(gid)) id = gid;
    } else if (isValidBuildingId(s.id) && !used.has(s.id) && !FIXED_GATE_IDS.has(s.id)) {
      id = s.id;
    }
    if (id) used.add(id);
    newIndex.set(i, buildings.length);
    const o = copyBuilding(s, id);
    if (!id) pending.push(o);
    buildings.push(o);
  });
  for (const o of pending) o.id = uniqueId(used, nowMs, rand);

  // Jobs: resolve against the SOURCE list (same rule restoreCity uses), then point at the new
  // index and the building's final id.
  const tasks = [];
  const srcView = src.map(s => (isObj(s) ? s : null));
  for (const t of arr(blob.tasks)) {
    if (!isObj(t)) continue;
    const si = taskTargetIn(srcView, t);
    if (si < 0 || !newIndex.has(si)) continue;
    const ni = newIndex.get(si);
    tasks.push(copyTask(t, ni, buildings[ni].id));
  }

  const roads = [];
  const seen = new Set();
  for (const r of arr(blob.roads)) {
    if (!Array.isArray(r) || r.length < 2) continue;
    const gx = Math.round(Number(r[0]));
    const gz = Math.round(Number(r[1]));
    if (!Number.isFinite(gx) || !Number.isFinite(gz)) continue;
    const k = tileKey(gx, gz);
    if (seen.has(k)) continue;
    seen.add(k);
    roads.push(k);
  }

  const savedAt = Number(blob.savedAt);
  return {
    v: blob.v !== undefined ? blob.v : 1,
    savedAt: Number.isFinite(savedAt) ? savedAt : Number(nowMs) || 0,
    buildings,
    tasks,
    roads
  };
}

const ROAD_RE = /^\s*(-?\d+)\s*,\s*(-?\d+)\s*$/;

/** "gx,gz" (or a [gx, gz] pair) -> [gx, gz], or null. */
function parseRoad(r) {
  if (Array.isArray(r) && r.length >= 2) {
    const gx = Math.round(Number(r[0]));
    const gz = Math.round(Number(r[1]));
    return Number.isFinite(gx) && Number.isFinite(gz) ? [gx, gz] : null;
  }
  const m = typeof r === 'string' ? ROAD_RE.exec(r) : null;
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** Cloud layout -> local city blob (what restoreCity takes). The exact inverse of toCloudLayout. */
export function fromCloudLayout(cloudLayout) {
  const L = isObj(cloudLayout) ? cloudLayout : {};
  const buildings = arr(L.buildings).filter(isObj).map(s => copyBuilding(s, s.id));
  buildings.forEach(b => { if (b.id === undefined) delete b.id; });
  const tasks = arr(L.tasks).filter(isObj).map(t => copyTask(t, t.i, t.id));
  const roads = [];
  for (const r of arr(L.roads)) {
    const p = parseRoad(r);
    if (p) roads.push(p);
  }
  return { v: L.v !== undefined ? L.v : 1, savedAt: L.savedAt, buildings, tasks, roads };
}

// ------------------------------------------------------------------ holdings

/** Holdings of a player who owns nothing (spec 3.3). */
export function emptyHoldings() {
  return { inventory: {}, stowedCounts: {}, stowedLevels: {}, stowedSealed: {}, bankCredits: {} };
}

/**
 * Holdings cleaned exactly like EconomyManager.load cleans its save: counts are whole and >= 0
 * (zero entries kept), stowed levels are 2..12 highest first and never more than the count held,
 * stowed counts never exceed what the inventory holds, sealed cash only for raid-only types.
 * Valid input comes back unchanged (key order kept), so this is safe on every read.
 */
export function normalizeHoldings(h) {
  const src = isObj(h) ? h : {};
  const out = emptyHoldings();
  const inv = isObj(src.inventory) ? src.inventory : {};
  for (const type of Object.keys(inv)) {
    if (!BUILDING_DEFS[type]) continue;
    const raw = Math.round(Number(inv[type]));
    out.inventory[type] = Number.isFinite(raw) && raw > 0 ? raw : 0;
  }
  // Each map keeps its own key order (so valid holdings come back byte for byte).
  const levels = isObj(src.stowedLevels) ? src.stowedLevels : {};
  for (const type of Object.keys(levels)) {
    if (!(type in out.inventory) || !Array.isArray(levels[type])) continue;
    const list = levels[type].map(v => Math.round(Number(v)))
      .filter(v => Number.isFinite(v) && v >= 2 && v <= MAX_BUILDING_LEVEL)
      .sort((a, b) => b - a)
      .slice(0, out.inventory[type] || 0);
    if (list.length) out.stowedLevels[type] = list;
  }
  const counts = isObj(src.stowedCounts) ? src.stowedCounts : {};
  const countTypes = [...Object.keys(counts), ...Object.keys(out.stowedLevels)].filter((t, i, a) => a.indexOf(t) === i && t in out.inventory);
  for (const type of countTypes) {
    const held = out.inventory[type] || 0;
    const known = (out.stowedLevels[type] || []).length;
    const raw = Math.round(Number(counts[type]));
    const n = Math.max(known, Math.min(held, Number.isFinite(raw) && raw > 0 ? raw : 0));
    if (n > 0) out.stowedCounts[type] = n;
  }
  const sealed = isObj(src.stowedSealed) ? src.stowedSealed : {};
  for (const type of Object.keys(sealed)) {
    if (!out.stowedCounts[type]) continue;
    const def = BUILDING_DEFS[type];
    if (!def || !def.produce || !def.produce.raidOnly || !Array.isArray(sealed[type])) continue;
    const cap = produceCapacityFor(type, MAX_BUILDING_LEVEL);
    const list = sealed[type].map(v => Math.floor(Number(v)))
      .filter(v => Number.isFinite(v) && v > 0)
      .map(v => Math.min(cap, v))
      .sort((a, b) => b - a)
      .slice(0, out.stowedCounts[type]);
    if (list.length) out.stowedSealed[type] = list;
  }
  const credits = isObj(src.bankCredits) ? src.bankCredits : {};
  for (const [id, c] of Object.entries(credits)) {
    if (!isValidBuildingId(id) || !isObj(c)) continue;
    const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
    out.bankCredits[id] = {
      cash: n(c.cash), iron: n(c.iron), wood: n(c.wood),
      reason: typeof c.reason === 'string' ? c.reason.slice(0, 80) : '',
      at: Number.isFinite(Number(c.at)) ? Number(c.at) : 0
    };
  }
  return out;
}

/** The design-relevant part of a live EconomyManager (a copy; bankCredits start empty). */
export function holdingsFromEconomy(eco) {
  const e = eco || {};
  return {
    inventory: clone(e.inventory || {}),
    stowedCounts: clone(e.stowedCounts || {}),
    stowedLevels: clone(e.stowedLevels || {}),
    stowedSealed: clone(e.stowedSealed || {}),
    bankCredits: {}
  };
}

/**
 * Put holdings into a live EconomyManager: the four fields are replaced (cleaned as load()
 * cleans them). No save(), no callbacks, and bankCredits are NOT applied - crediting them is
 * CloudSync's job (it remembers which ids it has credited).
 */
export function applyHoldingsToEconomy(eco, holdings) {
  const h = normalizeHoldings(holdings);
  eco.inventory = h.inventory;
  eco.stowedCounts = h.stowedCounts;
  eco.stowedLevels = h.stowedLevels;
  eco.stowedSealed = h.stowedSealed;
  return eco;
}

// Mirrors of EconomyManager's inventory bookkeeping, on a plain holdings object.

function peekStowedLevel(h, type) {        // EconomyManager.peekStowedLevel
  const list = h.stowedLevels[type];
  return list && list.length ? list[0] : 1;
}

function takeStowed(h, type) {             // EconomyManager.takeStowed
  const fromStorage = (h.stowedCounts[type] || 0) > 0;
  if (fromStorage) {
    h.stowedCounts[type]--;
    if (!h.stowedCounts[type]) delete h.stowedCounts[type];
  }
  const take = (map) => {
    const list = map[type];
    if (!fromStorage || !list || !list.length) return 0;
    const v = list.shift();
    if (!list.length) delete map[type];
    return v;
  };
  const level = take(h.stowedLevels) || 1;
  const sealed = take(h.stowedSealed);
  return { fromStorage, level, sealed };
}

function stowLevel(h, type, level, sealed = 0) {   // EconomyManager.stowLevel
  const L = Math.max(1, Math.round(Number(level)) || 1);
  h.stowedCounts[type] = (h.stowedCounts[type] || 0) + 1;
  if (L > 1) {
    (h.stowedLevels[type] = h.stowedLevels[type] || []).push(L);
    h.stowedLevels[type].sort((a, b) => b - a);
  }
  const S = Math.floor(Number(sealed) || 0);
  if (S > 0) {
    (h.stowedSealed[type] = h.stowedSealed[type] || []).push(S);
    h.stowedSealed[type].sort((a, b) => b - a);
  }
}

// ------------------------------------------------------------------ the working model

/**
 * The layout normalised for editing: plain objects only, every building with a unique id,
 * gates on their fixed ids, roads as unique "gx,gz" strings, jobs pointing at their building
 * by index AND id. Accepts a cloud layout (or a local blob - roads may be [gx,gz] pairs).
 */
function normalizeLayout(layout) {
  const L = isObj(layout) ? layout : {};
  const local = { ...L, roads: arr(L.roads).map(parseRoad).filter(Boolean) };
  const savedAt = Number(L.savedAt);
  // Deterministic ids for anything missing one (a well-formed cloud layout has them all).
  const stamp = Number.isFinite(savedAt) ? savedAt : 0;
  return toCloudLayout(local, { nowMs: stamp, rand: () => 0 });
}

/**
 * A deep-cloned working model: { layout: cloud layout, holdings }. Nothing passed in is ever
 * mutated; applyOp / applyOps edit the model, modelToCloud reads it back out.
 */
export function createModel(cloudLayout, holdings) {
  return { layout: normalizeLayout(clone(cloudLayout)), holdings: normalizeHoldings(clone(holdings)) };
}

/** The model as Firestore stores it: { layout, holdings } (deep copies). */
export function modelToCloud(model) {
  return { layout: clone(model.layout), holdings: clone(model.holdings) };
}

/**
 * Bring every producer's output up to `nowMs` and move the production clock (`layout.savedAt`)
 * there, in place - restoreCity's away credit (storedAfter from `st` held at savedAt, capped at
 * capacity; running during an upgrade too, like BuildingManager.advanceProduction). A writer that
 * is not the game (the MCP server) calls this before editing, so `st` and `savedAt` always move
 * TOGETHER: a stow then credits the output made up to now, and a building placed now is not
 * handed the hours before it existed when the game restores the city from `savedAt`.
 * `st` is floored: never more than was made, and never above what the game's own save (which
 * rounds a value at least this big) will carry - so the game never mistakes it for a collect.
 * Only ever forward: a `savedAt` ahead of `nowMs` (a fast device clock) credits nothing and stays.
 * Every producer's `st` is normalised as restoreCity reads it (0..capacity) even when no time is
 * credited. Returns the seconds credited.
 */
export function advanceProduction(model, nowMs) {
  const L = model.layout;
  const now = Number(nowMs);
  if (!Number.isFinite(now)) return 0;
  const from = Number(L.savedAt);
  const forward = !Number.isFinite(from) || now > from;
  const secs = Number.isFinite(from) && now > from ? (now - from) / 1000 : 0;
  for (const b of L.buildings) {
    const def = BUILDING_DEFS[b.t];
    if (!def || !def.produce || isGateEntry(b)) continue;
    const level = clampInt(b.l || 1, 1, MAX_BUILDING_LEVEL, 1);
    const held = Math.max(0, Math.min(produceCapacityFor(b.t, level), Number(b.st) || 0));
    b.st = Math.floor(storedAfter(b.t, level, held, secs));
  }
  if (forward) L.savedAt = now;
  return secs;
}

/**
 * An undo (the MCP server's undo_last_change) restores the DESIGN of an older version, never money
 * or output. `cur` is the city now (production advanced to now), `restored` the older version's
 * model; this settles `restored` in place so nothing is minted or lost:
 *  - the production clock and the bank credits are the current ones (a credit may be paid already);
 *  - a building standing in both keeps its current stored output;
 *  - a producer the undo takes off the map (the reverted change placed it) is settled as a stow
 *    settles it: tappable output becomes a bank credit, a vault's cash stays sealed in the unit.
 *    Only a stowed unit can hold sealed cash, so a vault that goes back to the plain inventory is
 *    kept in Big Storage instead (storage may then read one over its slots);
 *  - a producer that comes back (the reverted change stowed it) returns empty - that stow credited
 *    its output - and a vault takes its sealed cash back out of storage, as placing it does.
 * Sealed cash follows the CURRENT storage lists (the older version's would forget a stow's cash).
 * Returns { credits: [{id, buildingId, type, cash, iron, wood, ...}], sealed: [{buildingId, type,
 * cash}], restowed: n }.
 */
export function carryOutputForUndo(cur, restored, ctx = {}) {
  const h = restored.holdings;
  const out = { credits: [], sealed: [], restowed: 0 };
  restored.layout.savedAt = cur.layout.savedAt;
  h.bankCredits = clone(cur.holdings.bankCredits);
  h.stowedSealed = clone(cur.holdings.stowedSealed);
  const standing = new Map(cur.layout.buildings.map(b => [b.id, b]));
  const kept = new Set(restored.layout.buildings.map(b => b.id));
  for (const b of cur.layout.buildings) {
    if (kept.has(b.id) || isGateEntry(b)) continue;
    const def = BUILDING_DEFS[b.t];
    const held = Math.max(0, Math.floor(Number(b.st) || 0));
    if (!def || !def.produce || held <= 0) continue;
    if (def.produce.raidOnly) {
      (h.stowedSealed[b.t] = h.stowedSealed[b.t] || []).push(held);   // stowLevel's sealed list
      h.stowedSealed[b.t].sort((x, y) => y - x);
      out.sealed.push({ buildingId: b.id, type: b.t, cash: held });
    } else {
      const credit = creditOutput(h, b.t, held, ctx);
      if (credit) out.credits.push({ ...credit, buildingId: b.id, type: b.t });
    }
  }
  for (const b of restored.layout.buildings) {
    const live = standing.get(b.id);
    if (live) {
      if (live.st !== undefined) b.st = live.st;
      continue;
    }
    const def = BUILDING_DEFS[b.t];
    if (!def || !def.produce || isGateEntry(b)) continue;
    if (!def.produce.raidOnly) {
      b.st = 0;
      continue;
    }
    // takeStowed + opPlace: the largest sealed amount comes out, capped at the vault's capacity.
    const list = h.stowedSealed[b.t] || [];
    const cap = produceCapacityFor(b.t, clampInt(b.l || 1, 1, MAX_BUILDING_LEVEL, 1));
    b.st = list.length ? Math.min(cap, list.shift()) : 0;
    if (!list.length) delete h.stowedSealed[b.t];
  }
  for (const [type, list] of Object.entries(h.stowedSealed)) {
    const n = Math.min(list.length, h.inventory[type] || 0);
    const have = h.stowedCounts[type] || 0;
    if (n > have) {
      h.stowedCounts[type] = n;
      out.restowed += n - have;
    }
  }
  return out;
}

function thOf(model) {
  return townHallLevelOf(model.layout.buildings);
}

function radiusOf(model) {
  return cityRadiusFor(thOf(model));
}

function isOutside(model, gx, gz) {
  return Math.hypot(gx, gz) > radiusOf(model);        // GridSystem.handleTileAction isOutside
}

function countOf(model, type) {                        // BuildingManager.countOf
  if (type === 'road') return model.layout.roads.length;
  return model.layout.buildings.filter(b => b.t === type).length;
}

/** BuildingManager.canPlace on the model: TH unlock, then the per-type limit. */
function canPlaceType(model, type) {
  const def = BUILDING_DEFS[type];
  if (!def) return { ok: false, reason: REASON.UNKNOWN_TYPE };
  const th = thOf(model);
  if (th < def.unlockTH) return { ok: false, reason: REASON.LOCKED, requiredTH: def.unlockTH, th };
  const limit = limitFor(type, th);
  const have = countOf(model, type);
  if (limit <= 0) return { ok: false, reason: REASON.LOCKED, requiredTH: def.unlockTH, th };
  if (have >= limit) return { ok: false, reason: REASON.AT_LIMIT, have, limit, th };
  return { ok: true, have, limit, th };
}

/**
 * Buildings a `fp`-sized structure centred on (gx, gz) would overlap - exactly
 * BuildingManager.isFootprintBlocked: reach = (fpA + fpB) / 2, clash when closer than that on
 * BOTH axes. Trees never block; gates block with their 3x3 footprint; `ignoreId` (the building
 * being moved) is skipped. Roads are not structures and never block (nor are blocked).
 */
function blockersAt(model, fp, gx, gz, ignoreId = null) {
  const out = [];
  for (const o of model.layout.buildings) {
    if ((ignoreId !== null && o.id === ignoreId) || o.t === 'tree') continue;
    const reach = (fp + footprintOf(o.t)) / 2;
    if (Math.abs(o.gx - gx) < reach && Math.abs(o.gz - gz) < reach) out.push(o);
  }
  return out;
}

function roadSet(model) {
  return new Set(model.layout.roads);
}

/**
 * Up to `limit` legal tiles for a `type` near (gx, gz), nearest first: inside the radius and not
 * blocked. For ordinary buildings, tiles whose footprint stays off the roads come first (a
 * building parked on a road is legal but chokes it); barriers and traps belong on roads.
 */
function freeTilesNear(model, type, gx, gz, ignoreId = null, limit = 3) {
  const fp = footprintOf(type);
  const R = radiusOf(model);
  const roads = roadSet(model);
  const role = BUILDING_DEFS[type] ? BUILDING_DEFS[type].role : '';
  const roadAware = role !== 'barrier' && role !== 'trap';
  const reachRoad = (1 + fp) / 2;
  const touchesRoad = (x, z) => {
    const span = Math.ceil(reachRoad) - 1;
    for (let dx = -span; dx <= span; dx++) {
      for (let dz = -span; dz <= span; dz++) {
        if (Math.abs(dx) < reachRoad && Math.abs(dz) < reachRoad && roads.has(tileKey(x + dx, z + dz))) return true;
      }
    }
    return false;
  };
  const cx = Number.isFinite(gx) ? Math.max(-15, Math.min(15, gx)) : 0;
  const cz = Number.isFinite(gz) ? Math.max(-15, Math.min(15, gz)) : 0;
  const found = [];
  for (let span = 6; span <= 30 && found.length < limit; span += 24) {
    found.length = 0;
    for (let x = cx - span; x <= cx + span; x++) {
      for (let z = cz - span; z <= cz + span; z++) {
        if (x === gx && z === gz) continue;
        if (Math.hypot(x, z) > R) continue;
        if (blockersAt(model, fp, x, z, ignoreId).length) continue;
        found.push({ x, z, d: Math.hypot(x - cx, z - cz), road: roadAware && touchesRoad(x, z) });
      }
    }
  }
  found.sort((a, b) => (a.road - b.road) || (a.d - b.d) || (a.z - b.z) || (a.x - b.x));
  return found.slice(0, limit).map(p => [p.x, p.z]);
}

function suggestText(model, type, gx, gz, ignoreId) {
  const tiles = freeTilesNear(model, type, gx, gz, ignoreId);
  if (!tiles.length) return ` No free tile fits a ${footprintOf(type)}x${footprintOf(type)} ${nameOf(type)} anywhere in the city right now - stow or move something first.`;
  return ' Free tiles nearby: ' + tiles.map(([x, z]) => fmtTile(x, z)).join(', ') + '.';
}

function describeB(b) {
  return `${isGateEntry(b) ? (b.gate || 'Main Gate') : nameOf(b.t)} ${b.id} at ${fmtTile(b.gx, b.gz)}`;
}

function fail(reason, message, extra = {}) {
  return { ok: false, reason, message, ...extra };
}

function outsideFail(model, type, gx, gz, ignoreId) {
  const th = thOf(model);
  const R = radiusOf(model);
  return fail(REASON.OUTSIDE_RADIUS,
    `${fmtTile(gx, gz)} is outside the buildable area: a Town Hall ${th} city builds within ${R} tiles of the centre ` +
    `(0,0), and hypot(${gx},${gz}) = ${Math.hypot(gx, gz).toFixed(2)}.` + suggestText(model, type, gx, gz, ignoreId),
    { radius: R });
}

function blockedFail(model, type, gx, gz, blockers, ignoreId) {
  const fp = footprintOf(type);
  const shown = blockers.slice(0, 2).map(describeB).join(' and ');
  return fail(REASON.BLOCKED,
    `Tile ${fmtTile(gx, gz)} is blocked by ${shown}` +
    (blockers.length > 2 ? ` (+${blockers.length - 2} more)` : '') +
    ` - a ${fp}x${fp} footprint there would overlap it.` + suggestText(model, type, gx, gz, ignoreId),
    { blockedBy: blockers.map(b => b.id) });
}

/** Levenshtein distance, for "did you mean" on a mistyped building type. */
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function unknownTypeFail(type) {
  const q = String(type).toLowerCase().replace(/[\s-]+/g, '_');
  const types = Object.keys(BUILDING_DEFS).filter(t => t !== 'main_gate');
  const close = types
    .map(t => ({ t, d: t.includes(q) || q.includes(t) || nameOf(t).toLowerCase().includes(q.replace(/_/g, ' ')) ? 0 : editDistance(q, t) }))
    .sort((a, b) => a.d - b.d)
    .filter(x => x.d <= 4)
    .slice(0, 3)
    .map(x => x.t);
  return fail(REASON.UNKNOWN_TYPE, `Unknown building type "${type}".` +
    (close.length ? ` Did you mean ${close.map(t => `"${t}"`).join(' or ')}?` : '') +
    ' Call get_catalog for the exact type ids.');
}

function inventoryList(model) {
  const inv = model.holdings.inventory;
  const have = Object.keys(inv).filter(t => inv[t] > 0 && t !== 'road').map(t => `${t} x${inv[t]}`);
  return have.length ? have.join(', ') : 'nothing';
}

/** The index of the building a job belongs to (see taskTargetIn), in the model. */
function taskTarget(model, task) {
  return taskTargetIn(model.layout.buildings, task);
}

/** The job running on building index `i`, or null. */
function taskOn(model, i) {
  return model.layout.tasks.find(t => taskTarget(model, t) === i) || null;
}

function underConstructionFail(model, b, task, ctx, action) {
  const now = Number(ctx && ctx.nowMs);
  const left = Number.isFinite(now) && Number.isFinite(Number(task.endsAt)) ? Math.max(0, Number(task.endsAt) - now) / 1000 : null;
  const when = left === null ? '' : left <= 0
    ? ' Its timer has run out: it completes the next time the game is opened.'
    : ` It finishes in about ${formatSecs(left)}.`;
  return fail(REASON.UNDER_CONSTRUCTION,
    `${nameOf(b.t)} ${b.id} at ${fmtTile(b.gx, b.gz)} is being upgraded to level ${task.to}; it cannot be ${action} until the upgrade finishes.` + when,
    { id: b.id, endsAt: task.endsAt });
}

function formatSecs(s) {
  const n = Math.max(0, Math.round(s));
  if (n < 60) return n + 's';
  const m = Math.floor(n / 60);
  if (m < 60) return m + 'm ' + (n % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

/** Degrees -> index into ROT_STEPS, null when absent, or -1 when not a quarter turn. */
function rotStep(rot) {
  if (rot === undefined || rot === null) return null;
  if (typeof rot !== 'number' || !Number.isFinite(rot) || rot % 90 !== 0) return -1;
  return (((rot / 90) % 4) + 4) % 4;
}

/** Remove building `k` and keep every job pointing at the same building (index AND id). */
function removeBuildingAt(model, k) {
  const L = model.layout;
  const targets = L.tasks.map(t => taskTarget(model, t));
  L.buildings.splice(k, 1);
  const tasks = [];
  L.tasks.forEach((t, n) => {
    const i = targets[n];
    if (i < 0 || i === k) return;              // a job on the removed building goes with it
    const ni = i > k ? i - 1 : i;
    tasks.push({ ...t, i: ni, id: L.buildings[ni].id });
  });
  L.tasks = tasks;
}

function findById(model, id) {
  const i = model.layout.buildings.findIndex(b => b.id === id);
  return i >= 0 ? { i, b: model.layout.buildings[i] } : null;
}

function notFoundFail(model, id) {
  const asType = typeof id === 'string' && BUILDING_DEFS[id]
    ? ` "${id}" is a building TYPE; ops that act on a placed building need its id (list_buildings shows them, e.g. ${
      model.layout.buildings.filter(b => b.t === id).slice(0, 3).map(b => b.id).join(', ') || 'none placed'}).`
    : ' Call list_buildings (or get_city with ids) for the current ids.';
  return fail(REASON.NOT_FOUND, `No building with id "${id}" in this city.` + asType, { id });
}

/** Storage slots of the standing depots, minus `excludeId`'s own (BuildingManager.storageCapacity). */
function storageCapacityOf(model, excludeId = null) {
  return model.layout.buildings
    .filter(b => b.id !== excludeId && BUILDING_DEFS[b.t] && BUILDING_DEFS[b.t].storage &&
      BUILDING_DEFS[b.t].storage.kind === 'buildings')
    .reduce((sum, b) => sum + storageSlotsFor(b.t, b.l || 1), 0);
}

function storageUsedOf(model) {                         // EconomyManager.getStowedTotal
  return Object.values(model.holdings.stowedCounts).reduce((s, n) => s + (n || 0), 0);
}

function badArgs(message) {
  return fail(REASON.BAD_ARGS, message);
}

function checkCoords(gx, gz, what = 'gx and gz') {
  if (!isInt(gx) || !isInt(gz)) return badArgs(`${what} must be whole numbers (got ${JSON.stringify(gx)}, ${JSON.stringify(gz)}).`);
  if (Math.abs(gx) > 100 || Math.abs(gz) > 100) return badArgs(`${fmtTile(gx, gz)} is far off the map: tiles run -15..15 on both axes.`);
  return null;
}

// ------------------------------------------------------------------ validation + ops

/**
 * May a `type` go on (gx, gz)? The checks, in GridSystem.handleTileAction's order: radius, a unit
 * in the inventory, BuildingManager.canPlace (unlock + limit), then the footprint.
 * opts.ignoreId skips one building in the overlap test (a move); opts.inventory=false and
 * opts.limits=false drop those checks (a move needs neither).
 * Returns { ok } or { ok:false, reason, message }.
 */
export function checkPlace(model, type, gx, gz, opts = {}) {
  const { ignoreId = null, inventory = true, limits = true } = opts || {};
  if (typeof type !== 'string' || !type) return badArgs('type must be a building type id such as "sniper_tower".');
  const def = BUILDING_DEFS[type];
  if (!def) return unknownTypeFail(type);
  if (type === 'main_gate') return fail(REASON.NOT_PLACEABLE, 'Main Gates are fixed features of the perimeter wall; there are always exactly three and they cannot be placed.');
  if (type === 'road' || def.placeable === 'road') return fail(REASON.NOT_PLACEABLE, 'Roads are not buildings: draw them with add_roads (tiles or path) and erase them with remove_roads.');
  const bad = checkCoords(gx, gz);
  if (bad) return bad;
  if (isOutside(model, gx, gz)) return outsideFail(model, type, gx, gz, ignoreId);
  if (inventory && (model.holdings.inventory[type] || 0) <= 0) {
    const gate = canPlaceType(model, type);
    const also = gate.reason === REASON.LOCKED ? ` (It also unlocks only at Town Hall ${gate.requiredTH}; this city is Town Hall ${gate.th}.)`
      : gate.reason === REASON.AT_LIMIT ? ` (The city is also at its limit: ${gate.have} of ${gate.limit} placed.)` : '';
    return fail(REASON.NOT_IN_INVENTORY,
      `There is no ${nameOf(type)} in the Construction Inventory. Buying is manual (the game's Shop); the AI can only ` +
      `place what the player already owns: ${inventoryList(model)}.` + also);
  }
  if (limits) {
    const gate = canPlaceType(model, type);
    if (!gate.ok && gate.reason === REASON.LOCKED) {
      return fail(REASON.LOCKED, `${nameOf(type)} unlocks at Town Hall ${gate.requiredTH}; this city is Town Hall ${gate.th}.`, { requiredTH: gate.requiredTH });
    }
    if (!gate.ok) {
      return fail(REASON.AT_LIMIT,
        `${nameOf(type)}: ${gate.have} of ${gate.limit} already placed (the Town Hall ${gate.th} limit). ` +
        'Move an existing one instead, or stow one first.', { have: gate.have, limit: gate.limit });
    }
  }
  const blockers = blockersAt(model, footprintOf(type), gx, gz, ignoreId);
  if (blockers.length) return blockedFail(model, type, gx, gz, blockers, ignoreId);
  return { ok: true };
}

function opPlace(model, op, ctx) {
  const { type, gx, gz } = op;
  const step = rotStep(op.rot);
  if (step === -1) return badArgs('rot must be 0, 90, 180 or 270 (degrees).');
  const chk = checkPlace(model, type, gx, gz);
  if (!chk.ok) return chk;

  const h = model.holdings;
  const def = BUILDING_DEFS[type];
  // GridSystem: the level comes from peekStowedLevel, THEN takeStowed pops the storage lists.
  const level = clampInt(peekStowedLevel(h, type), 1, MAX_BUILDING_LEVEL, 1);
  const back = takeStowed(h, type);
  let st = 0;
  if (def.produce) {
    const cap = produceCapacityFor(type, level);
    // BuildingManager._applyProduction seeds a new building; one back from storage brings only
    // what it took in (a vault's sealed cash - tappable output was banked when it was stowed).
    st = back.fromStorage ? Math.min(cap, back.sealed) : Math.min(def.produce.seed || 0, cap);
  }
  h.inventory[type] = (h.inventory[type] || 0) - 1;   // consumeFromInventory keeps the zero entry
  const used = new Set(model.layout.buildings.map(b => b.id));
  const id = uniqueId(used, ctx.nowMs, ctx.rand);
  const barrier = isChainBarrierType(type);
  const rot = !barrier && step !== null ? ROT_STEPS[step] : 0;
  model.layout.buildings.push({ id, t: type, gx, gz, l: level, st: Math.round(st), rot });
  const note = barrier && step ? ' (rot ignored: spike traps and roadblocks turn to follow their wall links)' : '';
  return {
    ok: true, op: 'place', id, type, gx, gz, level, fromStorage: back.fromStorage, st: Math.round(st),
    message: `Placed ${nameOf(type)} ${id} at ${fmtTile(gx, gz)}, level ${level}${back.fromStorage ? ' (from storage)' : ''}${
      back.sealed ? `, ${Math.min(back.sealed, Math.round(st))} cash sealed back inside` : ''}.${note}`
  };
}

function opMove(model, op, ctx) {
  if (typeof op.id !== 'string' || !op.id) return badArgs('move needs the "id" of a placed building (list_buildings shows them).');
  const found = findById(model, op.id);
  if (!found) return notFoundFail(model, op.id);
  const { i, b } = found;
  if (isGateEntry(b)) return fail(REASON.IMMOVABLE, `${b.gate || 'The Main Gate'} is a fixed feature of the perimeter wall and cannot be moved.`, { id: b.id });
  const task = taskOn(model, i);
  if (task) return underConstructionFail(model, b, task, ctx, 'moved');
  const bad = checkCoords(op.gx, op.gz);
  if (bad) return bad;
  const step = rotStep(op.rot);
  if (step === -1) return badArgs('rot must be 0, 90, 180 or 270 (degrees).');
  // GridSystem.isValidDropTile: radius, then the footprint ignoring the building itself.
  if (isOutside(model, op.gx, op.gz)) return outsideFail(model, b.t, op.gx, op.gz, b.id);
  const blockers = blockersAt(model, footprintOf(b.t), op.gx, op.gz, b.id);
  if (blockers.length) return blockedFail(model, b.t, op.gx, op.gz, blockers, b.id);
  const from = { gx: b.gx, gz: b.gz };
  b.gx = op.gx;
  b.gz = op.gz;
  const barrier = isChainBarrierType(b.t);
  if (step !== null && !barrier) b.rot = ROT_STEPS[step];
  const note = barrier && step ? ' (rot ignored: spike traps and roadblocks turn to follow their wall links)' : '';
  return {
    ok: true, op: 'move', id: b.id, type: b.t, from, to: { gx: b.gx, gz: b.gz }, rot: b.rot,
    message: `Moved ${nameOf(b.t)} ${b.id} from ${fmtTile(from.gx, from.gz)} to ${fmtTile(b.gx, b.gz)}.${note}`
  };
}

/**
 * Bank the tappable output `held` of a `type` producer leaving the map. The game banks it at once
 * (BuildingManager._sendToStorage); a writer that cannot touch the bank records a credit in the
 * holdings that the game pays once per account (spec 3.4). Returns {id, cash, iron, wood, reason,
 * at}, or null when nothing is owed (no output, not a producer, or a raid-only vault).
 */
function creditOutput(h, type, held, ctx) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.produce || def.produce.raidOnly || !(held > 0)) return null;
  const pay = producePayout(def.produce.type, held);
  if (pay.cash + pay.iron + pay.wood <= 0) return null;
  // Credit ids live in their own namespace ('c...'): the client remembers which it has paid.
  const id = uniqueId(new Set(Object.keys(h.bankCredits)), ctx.nowMs, ctx.rand, 'c');
  // 'stow <type>' also for an undo that takes a producer off the map: cityMerge's rebase matches it.
  const credit = { ...pay, reason: 'stow ' + type, at: Number(ctx.nowMs) || 0 };
  h.bankCredits[id] = credit;
  return { id, ...credit };
}

function opStow(model, op, ctx) {
  if (typeof op.id !== 'string' || !op.id) return badArgs('stow needs the "id" of a placed building (list_buildings shows them).');
  const found = findById(model, op.id);
  if (!found) return notFoundFail(model, op.id);
  const { i, b } = found;
  if (isGateEntry(b)) return fail(REASON.NOT_STOWABLE, `${b.gate || 'A Main Gate'} is part of the perimeter wall and cannot be stowed.`, { id: b.id });
  if (b.t === 'town_hall') return fail(REASON.NOT_STOWABLE, 'The Town Hall can never be stowed (it may be moved).', { id: b.id });
  if (b.t === 'tree') return fail(REASON.NOT_STOWABLE, `Trees are not stowed: clear ${b.id} with remove_tree instead (no refund).`, { id: b.id });
  // MCP-only rule: the game would cancel the job and refund its cost, and refunds touch the bank.
  const task = taskOn(model, i);
  if (task) return underConstructionFail(model, b, task, ctx, 'stowed');
  // A depot being stowed cannot hold itself: only the depots that stay standing count.
  const capacity = storageCapacityOf(model, b.id);
  const used = storageUsedOf(model);
  const isDepot = storageSlotsFor(b.t, b.l || 1) > 0;
  if (capacity <= 0) {
    return fail(REASON.NO_DEPOT, isDepot
      ? `${b.id} is the only Big Storage Depot; a depot cannot store itself. Build (in the game) or place a second depot first.`
      : 'Stowing needs a Big Storage Depot (unlocks at Town Hall 3) and this city has none standing.',
    { used, capacity });
  }
  if (used >= capacity) {
    return fail(REASON.STORAGE_FULL,
      `Big Storage is full: ${used} of ${capacity} slots used${isDepot ? ' (not counting the depot being stowed)' : ''}. ` +
      'Place a stowed building back on the map first (a place op takes stowed units before fresh ones).', { used, capacity });
  }

  const h = model.holdings;
  const def = BUILDING_DEFS[b.t];
  const level = b.l || 1;
  // BuildingManager._sendToStorage: tappable output is banked, a vault's cash is sealed in.
  const held = Math.max(0, Math.floor(Number(b.st) || 0));
  const raidOnly = !!(def.produce && def.produce.raidOnly);
  const credit = creditOutput(h, b.t, held, ctx);
  const sealed = raidOnly ? held : 0;
  stowLevel(h, b.t, level, sealed);
  h.inventory[b.t] = (h.inventory[b.t] || 0) + 1;
  removeBuildingAt(model, i);
  const paid = credit ? ['cash', 'iron', 'wood'].filter(k => credit[k] > 0).map(k => `${credit[k]} ${k}`).join(', ') : '';
  return {
    ok: true, op: 'stow', id: b.id, type: b.t, level, sealed, credit,
    storage: { used: used + 1, capacity: storageCapacityOf(model) },
    message: `Stowed ${nameOf(b.t)} ${b.id} (level ${level}) in Big Storage (${used + 1}/${storageCapacityOf(model)} slots).` +
      (paid ? ` Its stored output (${paid}) is credited to the bank when the game next syncs.` : '') +
      (sealed ? ` ${sealed} cash stays sealed inside it.` : '')
  };
}

function opRemoveTree(model, op, ctx) {
  if (typeof op.id !== 'string' || !op.id) return badArgs('remove_tree needs the "id" of a tree (list_buildings shows them).');
  const found = findById(model, op.id);
  if (!found) return notFoundFail(model, op.id);
  const { i, b } = found;
  if (b.t !== 'tree') {
    return fail(REASON.NOT_A_TREE, `${b.id} is a ${isGateEntry(b) ? 'Main Gate' : nameOf(b.t)}, not a tree; remove_tree only clears trees (use stow for buildings).`, { id: b.id });
  }
  const task = taskOn(model, i);
  if (task) return underConstructionFail(model, b, task, ctx, 'removed');
  removeBuildingAt(model, i);
  return { ok: true, op: 'remove_tree', id: b.id, message: `Cleared tree ${b.id} at ${fmtTile(b.gx, b.gz)} (decoration: nothing is refunded).` };
}

/**
 * Waypoints -> every tile of the straight / L-shaped segments between them, inclusive. A segment
 * that changes both coordinates goes along gx first, then along gz. Returns null when a
 * waypoint is not a pair of whole numbers.
 */
export function expandPath(path) {
  if (!Array.isArray(path) || !path.length) return null;
  const pts = [];
  for (const p of path) {
    const q = Array.isArray(p) ? p : (isObj(p) ? [p.gx, p.gz] : null);
    if (!q || !isInt(q[0]) || !isInt(q[1])) return null;
    pts.push([q[0], q[1]]);
  }
  const out = [pts[0]];
  for (let n = 1; n < pts.length; n++) {
    let [x, z] = pts[n - 1];
    const [tx, tz] = pts[n];
    while (x !== tx) { x += Math.sign(tx - x); out.push([x, z]); }
    while (z !== tz) { z += Math.sign(tz - z); out.push([x, z]); }
    if (out.length > 2000) return out;
  }
  return out;
}

function roadTilesOf(op) {
  const hasTiles = op.tiles !== undefined;
  const hasPath = op.path !== undefined;
  if (hasTiles === hasPath) return { error: badArgs(`${op.op} needs exactly one of "tiles" ([[gx,gz],...]) or "path" (waypoints [[gx,gz],...]).`) };
  let tiles;
  if (hasPath) {
    tiles = expandPath(op.path);
    if (!tiles) return { error: badArgs('path must be a non-empty list of [gx,gz] waypoints with whole-number coordinates.') };
  } else {
    if (!Array.isArray(op.tiles) || !op.tiles.length) return { error: badArgs('tiles must be a non-empty list of [gx,gz] pairs.') };
    tiles = [];
    for (const p of op.tiles) {
      const q = Array.isArray(p) ? p : (isObj(p) ? [p.gx, p.gz] : null);
      if (!q) return { error: badArgs('every tile must be a [gx,gz] pair.') };
      tiles.push([q[0], q[1]]);
    }
  }
  if (tiles.length > 1000) return { error: badArgs(`too many tiles in one op (${tiles.length}); a city holds at most ${LAYOUT_LIMITS.roads} road tiles.`) };
  for (const [gx, gz] of tiles) {
    const bad = checkCoords(gx, gz, 'road tile coordinates');
    if (bad) return { error: bad };
  }
  return { tiles };
}

function opAddRoads(model, op) {
  const { tiles, error } = roadTilesOf(op);
  if (error) return error;
  const th = thOf(model);
  const limit = limitFor('road', th);
  const roads = roadSet(model);
  let inv = model.holdings.inventory.road || 0;
  const added = [];
  const skipped = [];
  for (const [gx, gz] of tiles) {
    // GridSystem draw_road: radius, skip a tile that already has a road, then a tile from the
    // inventory, then BuildingManager.canPlace('road') (the Town Hall's tile budget).
    if (isOutside(model, gx, gz)) {
      const f = outsideFail(model, 'road', gx, gz, null);
      return fail(REASON.OUTSIDE_RADIUS, `Road tile ${fmtTile(gx, gz)} is outside the buildable area (Town Hall ${th}: radius ${radiusOf(model)}, ` +
        `hypot = ${Math.hypot(gx, gz).toFixed(2)}). Nothing was drawn.`, { tile: [gx, gz], radius: f.radius });
    }
    const k = tileKey(gx, gz);
    if (roads.has(k)) { skipped.push([gx, gz]); continue; }
    if (inv <= 0) {
      return fail(REASON.NO_ROAD_INVENTORY,
        `Out of road tiles at ${fmtTile(gx, gz)}: this op needs ${tiles.length - skipped.length} new tiles but the inventory had ` +
        `${model.holdings.inventory.road || 0}. Nothing was drawn. Road packs are bought in the game's Shop; remove_roads frees tiles.`,
        { tile: [gx, gz], have: model.holdings.inventory.road || 0 });
    }
    if (roads.size >= limit) {
      return fail(REASON.ROAD_LIMIT,
        `Road limit reached at ${fmtTile(gx, gz)}: ${roads.size} of ${limit} tiles (the Town Hall ${th} limit). Nothing was drawn; remove_roads elsewhere first.`,
        { tile: [gx, gz], limit });
    }
    roads.add(k);
    inv--;
    added.push([gx, gz]);
  }
  for (const [gx, gz] of added) model.layout.roads.push(tileKey(gx, gz));
  if (added.length) model.holdings.inventory.road = inv;
  return {
    ok: true, op: 'add_roads', added: added.length, addedTiles: added, skipped,
    roadsPlaced: model.layout.roads.length, roadLimit: limit, roadInventory: model.holdings.inventory.road || 0,
    message: `Drew ${added.length} road tile${added.length === 1 ? '' : 's'}` +
      (skipped.length ? `, skipped ${skipped.length} already paved` : '') +
      `. Roads ${model.layout.roads.length}/${limit}, ${model.holdings.inventory.road || 0} left in inventory.`
  };
}

function opRemoveRoads(model, op) {
  const { tiles, error } = roadTilesOf(op);
  if (error) return error;
  const roads = roadSet(model);
  const removed = [];
  const skipped = [];
  for (const [gx, gz] of tiles) {
    if (isOutside(model, gx, gz)) {
      return fail(REASON.OUTSIDE_RADIUS, `Road tile ${fmtTile(gx, gz)} is outside the buildable area (radius ${radiusOf(model)}); ` +
        'roads out there cannot be edited. Nothing was erased.', { tile: [gx, gz] });
    }
    const k = tileKey(gx, gz);
    if (!roads.has(k)) { skipped.push([gx, gz]); continue; }
    roads.delete(k);
    removed.push([gx, gz]);
  }
  if (removed.length) {
    const gone = new Set(removed.map(([x, z]) => tileKey(x, z)));
    model.layout.roads = model.layout.roads.filter(k => !gone.has(k));
    // GridSystem erase_road: every erased tile goes back to the inventory.
    model.holdings.inventory.road = (model.holdings.inventory.road || 0) + removed.length;
  }
  return {
    ok: true, op: 'remove_roads', removed: removed.length, removedTiles: removed, skipped,
    roadsPlaced: model.layout.roads.length, roadInventory: model.holdings.inventory.road || 0,
    message: `Erased ${removed.length} road tile${removed.length === 1 ? '' : 's'} (back in the inventory)` +
      (skipped.length ? `, skipped ${skipped.length} with no road` : '') + '.'
  };
}

/**
 * Apply one design op to the model (in place). A failing op changes nothing. Returns
 * { ok:true, op, message, ...details } or { ok:false, reason, message, ... }.
 */
export function applyOp(model, op, ctx = {}) {
  const c = { nowMs: Number.isFinite(Number(ctx && ctx.nowMs)) ? Number(ctx.nowMs) : Date.now(), rand: (ctx && ctx.rand) || Math.random };
  if (!isObj(op)) return badArgs('an op must be an object such as {"op":"place","type":"sniper_tower","gx":3,"gz":4}.');
  switch (op.op) {
    case 'place': return opPlace(model, op, c);
    case 'move': return opMove(model, op, c);
    case 'stow': return opStow(model, op, c);
    case 'remove_tree': return opRemoveTree(model, op, c);
    case 'add_roads': return opAddRoads(model, op);
    case 'remove_roads': return opRemoveRoads(model, op);
    default:
      return badArgs(`unknown op ${JSON.stringify(op.op)}; use place, move, stow, remove_tree, add_roads or remove_roads.`);
  }
}

/**
 * Apply ops in order, all-or-nothing: they run on a clone, and only if every one succeeds is
 * the model replaced by the result. Returns { ok, results[], failedAt? } (results stop at the
 * failing op).
 */
export function applyOps(model, ops, ctx = {}) {
  if (!Array.isArray(ops) || !ops.length) {
    return { ok: false, results: [badArgs('ops must be a non-empty list of design ops.')], failedAt: 0 };
  }
  const work = { layout: clone(model.layout), holdings: clone(model.holdings) };
  const results = [];
  for (let n = 0; n < ops.length; n++) {
    const r = applyOp(work, ops[n], ctx);
    results.push(r);
    if (!r.ok) {
      r.message = `op ${n} (${ops[n] && ops[n].op}) failed: ${r.message}` + (n ? ` The ${n} op${n === 1 ? '' : 's'} before it were rolled back too.` : '');
      return { ok: false, results, failedAt: n };
    }
  }
  model.layout = work.layout;
  model.holdings = work.holdings;
  return { ok: true, results };
}

// ------------------------------------------------------------------ reading the model

/** Every building as an AI reads it (list_buildings). */
export function describeBuildings(model) {
  const roads = roadTilesOfModel(model);
  return model.layout.buildings.map((b, i) => {
    const task = isGateEntry(b) ? null : taskOn(model, i);
    const def = BUILDING_DEFS[b.t] || {};
    const o = {
      id: b.id, type: b.t, name: isGateEntry(b) ? (b.gate || def.name) : (def.name || b.t),
      gx: b.gx, gz: b.gz, level: b.l || 1, footprint: footprintOf(b.t), role: def.role || null
    };
    if (def.produce) o.stored = Math.floor(Number(b.st) || 0);
    if (task) o.upgradingTo = task.to;
    if (task) o.upgradeEndsAt = task.endsAt;
    if (isGateEntry(b)) o.fixed = true;
    const reach = isGateEntry(b) ? null : reachOf(b.t, b.l || 1);
    if (reach) o.reach = reach;
    const road = roadStatusIn(roads, b);
    if (road) Object.assign(o, road);
    return o;
  });
}

// ------------------------------------------------------------------ reach and roads (placement feedback)

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * How far a type reaches at a level, in tiles (1 tile = TILE_METRES m) and metres: a turret's
 * range (plus a mortar's dead zone), a drive-over trap's trigger radius (TrapSystem fires when the
 * raider's centre is inside it), an aura's radius. Before aura bonuses (an Orbital Relay adds
 * turret range). null for a type that reaches nothing (producers, spawners, barriers...).
 */
export function reachOf(type, level = 1) {
  const t = turretStatsFor(type, level);
  if (t) {
    const o = { kind: 'turret', tiles: r1(t.range / TILE_METRES), metres: r1(t.range) };
    if (t.minRange) o.minTiles = r1(t.minRange / TILE_METRES);
    return o;
  }
  const tr = trapStatsFor(type, level);
  if (tr) return { kind: 'trap', tiles: r1(tr.radius / TILE_METRES), metres: r1(tr.radius) };
  const def = BUILDING_DEFS[type];
  if (def && def.aura) {
    if (def.aura.global) return { kind: 'aura', global: true };
    const m = auraRadiusFor(type, level);
    return { kind: 'aura', tiles: r1(m / TILE_METRES), metres: r1(m) };
  }
  return null;
}

/** "range 11.6 tiles", "trigger radius 0.8 tiles", "aura 5.5 tiles", "aura city-wide" - or ''. */
export function reachText(type, level = 1) {
  const r = reachOf(type, level);
  if (!r) return '';
  if (r.kind === 'turret') return `range ${r.tiles} tiles` + (r.minTiles ? ` (blind inside ${r.minTiles})` : '');
  if (r.kind === 'trap') return `trigger radius ${r.tiles} tiles`;
  return r.global ? 'aura city-wide' : `aura ${r.tiles} tiles`;
}

function roadTilesOfModel(model) {
  const set = new Set();
  const list = [];
  for (const k of model.layout.roads) {
    const p = parseRoad(k);
    if (!p || set.has(tileKey(p[0], p[1]))) continue;
    set.add(tileKey(p[0], p[1]));
    list.push(p);
  }
  return { set, list };
}

/** Every road tile as row runs, north to south: [{ gz, runs: [[fromGx, toGx], ...] }]. */
export function roadRuns(model) {
  const rows = new Map();
  for (const [gx, gz] of roadTilesOfModel(model).list) {
    if (!rows.has(gz)) rows.set(gz, []);
    rows.get(gz).push(gx);
  }
  return [...rows.keys()].sort((a, b) => a - b).map(gz => {
    const runs = [];
    for (const x of rows.get(gz).sort((a, b) => a - b)) {
      const last = runs[runs.length - 1];
      if (last && x === last[1] + 1) last[1] = x;
      else runs.push([x, x]);
    }
    return { gz, runs };
  });
}

/** roadRuns as text, one line per row: "gz -7: gx -3..3, 5". */
export function roadRunsText(model) {
  return roadRuns(model).map(({ gz, runs }) =>
    `gz ${gz}: gx ${runs.map(([a, b]) => (a === b ? String(a) : `${a}..${b}`)).join(', ')}`).join('\n');
}

/**
 * Where a drive-over trap or a barrier (spike trap / roadblock) stands relative to the roads
 * raiders drive: `onRoad` (its own tile is a road tile), the nearest road tile when it is not,
 * and for a trap `reachesRoad` - its trigger radius reaches the centre of a road tile, so a
 * raider driving down that road sets it off. null for every other role. (The text map cannot
 * show this: a trap or barrier letter hides the '=' under it.)
 */
function roadStatusIn(roads, b) {
  const def = BUILDING_DEFS[b.t];
  if (!def || isGateEntry(b) || (def.role !== 'trap' && def.role !== 'barrier')) return null;
  const onRoad = roads.set.has(tileKey(b.gx, b.gz));
  const out = { onRoad };
  let bestD = Infinity;
  if (!onRoad) {
    let best = null;
    for (const [gx, gz] of roads.list) {
      const d = Math.hypot(gx - b.gx, gz - b.gz);
      if (d < bestD) { bestD = d; best = { gx, gz, tiles: r1(d) }; }
    }
    out.nearestRoad = best;
  }
  if (def.role === 'trap') {
    const t = trapStatsFor(b.t, b.l || 1);
    out.reachesRoad = onRoad || (!!t && bestD * TILE_METRES <= t.radius);
  }
  return out;
}

/** roadStatusIn for one building of the model (or null). */
export function roadStatusOf(model, b) {
  return b ? roadStatusIn(roadTilesOfModel(model), b) : null;
}

/** One readable clause about a trap's / barrier's road placement ('' for other roles). */
export function roadNoteFor(model, b) {
  const s = roadStatusOf(model, b);
  if (!s) return '';
  if (s.onRoad) return 'on a road tile';
  const near = s.nearestRoad ? `nearest road tile ${fmtTile(s.nearestRoad.gx, s.nearestRoad.gz)}, ${s.nearestRoad.tiles} ` +
    `tile${s.nearestRoad.tiles === 1 ? '' : 's'} away` : 'the city has no roads';
  if ('reachesRoad' in s) {
    const radius = reachOf(b.t, b.l || 1).tiles;
    return s.reachesRoad
      ? `not on a road tile, but its ${radius}-tile trigger radius reaches the road (${near})`
      : `OFF-ROAD: its ${radius}-tile trigger radius reaches no road (${near}), so raiders driving the roads will not set it off`;
  }
  return `OFF-ROAD: no road on ${fmtTile(b.gx, b.gz)} (${near}); a barrier blocks only its own tile, so raiders on the ` +
    'roads drive past it unless it closes a gap in a wall';
}

/**
 * Which turrets reach each Main Gate tile (every raid enters through one) and the Town Hall:
 * straight-line distance between tile centres against each turret's range at its level (a
 * Plasma Mortar's dead zone excluded), before aura bonuses. Unlike defenseReport's score, which
 * counts only types and levels, this changes when turrets move.
 */
export function coverageReport(model) {
  const bs = model.layout.buildings;
  const guns = bs.filter(b => !isGateEntry(b) && turretStatsFor(b.t, b.l || 1));
  const points = MAIN_GATES.map(g => ({ name: g.name, gx: g.gx, gz: g.gz }));
  const hall = bs.find(b => b.t === 'town_hall');
  if (hall) points.push({ name: 'Town Hall', id: hall.id, gx: hall.gx, gz: hall.gz });
  return points.map(p => {
    const turrets = [];
    for (const b of guns) {
      const s = turretStatsFor(b.t, b.l || 1);
      const m = Math.hypot(b.gx - p.gx, b.gz - p.gz) * TILE_METRES;
      if (m > s.range || (s.minRange && m < s.minRange)) continue;
      turrets.push({ id: b.id, type: b.t, level: b.l || 1, gx: b.gx, gz: b.gz, distTiles: r1(m / TILE_METRES), rangeTiles: r1(s.range / TILE_METRES) });
    }
    turrets.sort((a, b) => a.distTiles - b.distTiles);
    return { ...p, turrets };
  });
}

/** Counts, limits, inventory, storage, roads, radius and Town Hall of the model. */
export function summarize(model) {
  const th = thOf(model);
  const counts = {};
  for (const b of model.layout.buildings) counts[b.t] = (counts[b.t] || 0) + 1;
  const h = model.holdings;
  const limits = {};
  for (const type of Object.keys(BUILDING_DEFS)) {
    const limit = limitFor(type, th);
    const placed = type === 'road' ? model.layout.roads.length : (counts[type] || 0);
    const inInventory = h.inventory[type] || 0;
    if (!limit && !placed && !inInventory) continue;
    limits[type] = { placed, limit, inInventory, stowed: h.stowedCounts[type] || 0 };
  }
  const underConstruction = [];
  model.layout.tasks.forEach(t => {
    const i = taskTarget(model, t);
    if (i < 0) return;
    const b = model.layout.buildings[i];
    underConstruction.push({ id: b.id, type: b.t, gx: b.gx, gz: b.gz, toLevel: t.to, endsAt: t.endsAt });
  });
  return {
    townHall: th,
    cityRadius: cityRadiusFor(th),
    buildings: model.layout.buildings.length,
    counts,
    limits,
    inventory: clone(h.inventory),
    stowed: { counts: clone(h.stowedCounts), levels: clone(h.stowedLevels), sealed: clone(h.stowedSealed) },
    storage: { used: storageUsedOf(model), capacity: storageCapacityOf(model) },
    roads: { placed: model.layout.roads.length, limit: limitFor('road', th), inInventory: h.inventory.road || 0 },
    underConstruction,
    pendingBankCredits: Object.keys(h.bankCredits || {}).length,
    savedAt: model.layout.savedAt
  };
}

/** The types this Town Hall can place, with their limits, holdings and shop copy (get_catalog). */
export function catalogFor(model) {
  const th = thOf(model);
  const h = model.holdings;
  const out = [];
  for (const [type, def] of Object.entries(BUILDING_DEFS)) {
    if (type === 'main_gate') continue;
    const limit = limitFor(type, th);
    if (th < def.unlockTH || limit <= 0) continue;
    const placed = countOf(model, type);
    const inInventory = h.inventory[type] || 0;
    const gate = canPlaceType(model, type);
    const entry = {
      type, name: def.name, icon: def.icon, category: def.category, role: def.role,
      letter: type === 'road' ? '=' : (ROLE_LETTER[def.role] || '?'),
      footprint: footprintOf(type), unlockTH: def.unlockTH,
      limit, placed, inInventory,
      stowed: h.stowedCounts[type] || 0,
      stowedLevels: clone(h.stowedLevels[type] || []),
      canPlaceNow: gate.ok && inInventory > 0,
      desc: def.desc || '', helps: def.helps || ''
    };
    if (type === 'road') entry.note = 'Roads are drawn with add_roads / remove_roads, one inventory tile per road tile.';
    else if (!entry.canPlaceNow) entry.why = !gate.ok ? `at the limit (${placed}/${limit})` : 'none in the inventory (buying is manual, in the game Shop)';
    out.push(entry);
  }
  return out;
}

/**
 * The city as text: a 31x31 grid (-15..15 both ways), north (gz = -15) at the top, one
 * character per tile, coordinate labels every 5 tiles. `#` outside the buildable radius, `=`
 * road, `.` empty buildable tile (a 1x1 fits there), then one letter per building role:
 * UPPERCASE on the tile a building stands on (its gx,gz), lowercase on the rest of its footprint
 * (every tile a 1x1 could not take). With ids:true a list of `id type (gx,gz) Lx` follows.
 */
export function renderAsciiMap(model, { legend = true, ids = false } = {}) {
  const th = thOf(model);
  const R = cityRadiusFor(th);
  const N = 15;
  const grid = [];
  for (let gz = -N; gz <= N; gz++) {
    const row = [];
    for (let gx = -N; gx <= N; gx++) row.push(Math.hypot(gx, gz) > R ? '#' : '.');
    grid.push(row);
  }
  const put = (gx, gz, ch) => {
    if (gx < -N || gx > N || gz < -N || gz > N) return;
    grid[gz + N][gx + N] = ch;
  };
  const get = (gx, gz) => (gx < -N || gx > N || gz < -N || gz > N ? null : grid[gz + N][gx + N]);
  for (const k of model.layout.roads) {
    const p = parseRoad(k);
    if (p) put(p[0], p[1], '=');
  }
  const letterOf = (b) => (isGateEntry(b) ? 'G' : (ROLE_LETTER[(BUILDING_DEFS[b.t] || {}).role] || '?'));
  const structures = model.layout.buildings.filter(b => b.t !== 'tree');
  for (const b of model.layout.buildings) if (b.t === 'tree') put(b.gx, b.gz, 'Y');
  // Footprint halos first, then every centre on top, so a centre is never hidden.
  for (const b of structures) {
    const fp = footprintOf(b.t);
    const span = fp >= 2 ? 1 : 0;
    const lower = letterOf(b).toLowerCase();
    for (let dx = -span; dx <= span; dx++) {
      for (let dz = -span; dz <= span; dz++) {
        if (!dx && !dz) continue;
        const cur = get(b.gx + dx, b.gz + dz);
        // A halo never covers another building's letter; it does cover a tree (trees never block).
        if (cur === null || /[a-z]/.test(cur) || (/[A-Z]/.test(cur) && cur !== 'Y')) continue;
        put(b.gx + dx, b.gz + dz, lower);
      }
    }
  }
  for (const b of structures) put(b.gx, b.gz, letterOf(b));

  const margin = 6;
  const header = Array(margin + 2 * N + 1).fill(' ');
  const ticks = Array(margin + 2 * N + 1).fill(' ');
  for (let gx = -N; gx <= N; gx += 5) {
    const col = margin + gx + N;
    const label = String(gx);
    for (let c = 0; c < label.length; c++) header[col - label.length + 1 + c] = label[c];
    ticks[col] = '|';
  }
  const lines = [];
  lines.push(`Town Hall ${th} city, build radius ${R} tiles. North (gz -15) is up, east (gx +15) is right.`);
  lines.push(header.join('').replace(/\s+$/, '') + '   <- gx');
  lines.push(ticks.join('').replace(/\s+$/, ''));
  for (let gz = -N; gz <= N; gz++) {
    const label = gz % 5 === 0 ? String(gz) : '';
    lines.push(label.padStart(margin - 2) + ' ' + (gz % 5 === 0 ? '-' : ' ') + grid[gz + N].join(''));
  }
  lines.push('   ^ gz');
  if (legend) {
    const byLetter = {};
    for (const b of model.layout.buildings) {
      const L = b.t === 'tree' ? 'Y' : letterOf(b);
      (byLetter[L] = byLetter[L] || new Set()).add(b.t);
    }
    lines.push('');
    lines.push('Legend: . empty buildable tile (a 1x1 fits)   = road   # outside the build radius');
    lines.push('        UPPERCASE = the tile a building stands on (its gx,gz); lowercase = the rest of its footprint');
    lines.push('        a letter hides a road under it: whether a trap (X) or barrier (B) is on a road is list_buildings\' onRoad');
    for (const L of Object.keys(byLetter).sort()) {
      lines.push(`        ${L} ${ROLE_WORDS[L] || ''}: ${[...byLetter[L]].sort().join(', ')}`);
    }
  }
  if (ids) {
    lines.push('');
    lines.push('Buildings (id type (gx,gz) level):');
    const desc = describeBuildings(model);
    for (const d of desc) {
      lines.push(`${d.id} ${d.type} ${fmtTile(d.gx, d.gz)} L${d.level}` + (d.upgradingTo ? ` [upgrading to L${d.upgradingTo}]` : '') + (d.fixed ? ' [fixed]' : ''));
    }
  }
  return lines.join('\n');
}

/**
 * Whole-city sanity check. `errors` are layouts the game cannot represent or a raid cannot run
 * on (no Town Hall, gates missing or off their tiles, unknown types, bad coordinates, duplicate
 * ids, broken jobs, Firestore size limits). `warnings` are legal-but-odd states the UI would not
 * produce (overlaps, a structure outside the radius, over a limit, storage over capacity).
 */
export function auditLayout(model) {
  const errors = [];
  const warnings = [];
  // A model ({layout, holdings}); a bare layout (e.g. a battle snapshot's) is audited as one too.
  const L = model && model.layout ? model.layout
    : (model && Array.isArray(model.buildings) ? model : { buildings: [], tasks: [], roads: [] });
  const bs = arr(L.buildings);
  const th = townHallLevelOf(bs);
  const R = cityRadiusFor(th);
  if (bs.length > LAYOUT_LIMITS.buildings) errors.push(`${bs.length} buildings: a city document holds at most ${LAYOUT_LIMITS.buildings}.`);
  if (arr(L.roads).length > LAYOUT_LIMITS.roads) errors.push(`${arr(L.roads).length} road tiles: a city document holds at most ${LAYOUT_LIMITS.roads}.`);
  const halls = bs.filter(b => b.t === 'town_hall');
  if (!halls.length) errors.push('No Town Hall.');
  if (halls.length > 1) errors.push(`${halls.length} Town Halls (exactly one allowed): ${halls.map(b => b.id).join(', ')}.`);
  const seen = new Set();
  const gatesAt = new Set();
  for (const b of bs) {
    if (!isValidBuildingId(b.id)) errors.push(`Building ${JSON.stringify(b.id)} (${b.t}) has an invalid id.`);
    else if (seen.has(b.id)) errors.push(`Duplicate building id ${b.id}.`);
    seen.add(b.id);
    if (!isInt(b.gx) || !isInt(b.gz)) { errors.push(`${b.id} (${b.t}) is not on a whole tile: ${JSON.stringify([b.gx, b.gz])}.`); continue; }
    if (isGateEntry(b)) {
      const fixed = fixedGateAt(b.gx, b.gz);
      if (!fixed) errors.push(`Main Gate ${b.id} at ${fmtTile(b.gx, b.gz)} is not on a gate tile.`);
      else if (gatesAt.has(tileKey(b.gx, b.gz))) errors.push(`Two Main Gates on ${fmtTile(b.gx, b.gz)}.`);
      gatesAt.add(tileKey(b.gx, b.gz));
      continue;
    }
    const def = BUILDING_DEFS[b.t];
    if (!def || b.t === 'road') { errors.push(`${b.id}: unknown building type ${JSON.stringify(b.t)}.`); continue; }
    if (!isInt(b.l) || b.l < 1 || b.l > MAX_BUILDING_LEVEL) errors.push(`${b.id} (${b.t}) has level ${JSON.stringify(b.l)} (1..${MAX_BUILDING_LEVEL}).`);
    else if (b.t !== 'town_hall' && b.l > th) warnings.push(`${b.id} (${b.t}) is level ${b.l}, above the Town Hall's ${th}.`);
    if (Math.abs(b.gx) > 20 || Math.abs(b.gz) > 20) errors.push(`${b.id} (${b.t}) at ${fmtTile(b.gx, b.gz)} is far outside the city wall.`);
    else if (b.t !== 'tree' && Math.hypot(b.gx, b.gz) > R) warnings.push(`${b.id} (${b.t}) at ${fmtTile(b.gx, b.gz)} is outside the Town Hall ${th} build radius (${R}).`);
  }
  for (const g of MAIN_GATES) {
    if (!gatesAt.has(tileKey(g.gx, g.gz))) errors.push(`The ${g.name} ${fmtTile(g.gx, g.gz)} is missing.`);
  }
  // Overlaps (BuildingManager.isFootprintBlocked between every pair of standing structures).
  const solid = bs.filter(b => b.t !== 'tree' && isInt(b.gx) && isInt(b.gz));
  for (let a = 0; a < solid.length; a++) {
    for (let c = a + 1; c < solid.length; c++) {
      const A = solid[a], B = solid[c];
      const reach = (footprintOf(A.t) + footprintOf(B.t)) / 2;
      if (Math.abs(A.gx - B.gx) < reach && Math.abs(A.gz - B.gz) < reach) {
        warnings.push(`${A.id} (${A.t}) at ${fmtTile(A.gx, A.gz)} overlaps ${B.id} (${B.t}) at ${fmtTile(B.gx, B.gz)}.`);
      }
    }
  }
  // Limits (a save can only exceed them if it was edited by hand).
  const counts = {};
  for (const b of bs) counts[b.t] = (counts[b.t] || 0) + 1;
  counts.road = arr(L.roads).length;
  for (const [t, n] of Object.entries(counts)) {
    if (!BUILDING_DEFS[t]) continue;
    const lim = limitFor(t, th);
    if (n > lim) warnings.push(`${n} ${t} placed, over the Town Hall ${th} limit of ${lim}.`);
  }
  // Roads: well-formed and unique.
  const roadSeen = new Set();
  for (const r of arr(L.roads)) {
    const p = parseRoad(r);
    if (!p) { errors.push(`Malformed road tile ${JSON.stringify(r)}.`); continue; }
    const k = tileKey(p[0], p[1]);
    if (roadSeen.has(k)) warnings.push(`Road tile ${k} is listed twice.`);
    roadSeen.add(k);
  }
  // Jobs: each points at a real, upgradeable building, one level up, at most one per building.
  const jobOn = new Set();
  arr(L.tasks).forEach((t, n) => {
    const i = taskTargetIn(bs, t);
    if (i < 0) { errors.push(`Job ${n} (${t && t.t} -> L${t && t.to}) matches no building.`); return; }
    const b = bs[i];
    if (jobOn.has(i)) errors.push(`Two jobs on ${b.id}.`);
    jobOn.add(i);
    if (t.i !== i) errors.push(`Job ${n} on ${b.id} has index ${t.i}, the building is at ${i}.`);
    if (Number(t.to) !== (b.l || 1) + 1) warnings.push(`Job on ${b.id} targets level ${t.to} but the building is level ${b.l} (the game drops it).`);
  });
  // Storage (a preset may legitimately park more than the depots hold; hand-stowing cannot).
  if (model && model.holdings) {
    const used = storageUsedOf(model);
    const cap = storageCapacityOf(model);
    if (used > cap) warnings.push(`Storage holds ${used} buildings but the depots have ${cap} slots.`);
  }
  return { errors, warnings };
}

/**
 * How much raid defense the layout puts up, in the gem bounty's own terms
 * (progression.raidDefenseFor), plus readable gaps an AI can act on.
 */
export function defenseReport(model) {
  const th = thOf(model);
  const bs = model.layout.buildings;
  const structures = bs.filter(b => !isGateEntry(b)).map(b => ({ type: b.t, level: b.l || 1 }));
  const d = raidDefenseFor(structures, th);
  const counted = bs.filter(countsTowardDestruction).length;
  const row = townHallRow(th);
  const h = model.holdings;
  const gaps = [];
  for (const k of d.kinds) {
    if (k.cover >= 1) continue;
    const placed = bs.filter(b => b.t === k.type).length;
    const inv = h.inventory[k.type] || 0;
    const limit = limitFor(k.type, th);
    let hint;
    if (placed < k.need && inv > 0) hint = `place ${Math.min(inv, k.need - placed)} more from the inventory (${inv} held)`;
    else if (placed < k.need) hint = `needs ${k.need - placed} more (buy in the game; ${placed}/${limit} placed)`;
    else hint = `upgrade them toward level ${th} in the game`;
    gaps.push(`${nameOf(k.type)}: ${Math.round(k.cover * 100)}% covered (${placed} placed, ${k.need} at level ${th} count in full) - ${hint}.`);
  }
  return {
    townHall: th,
    kinds: d.kinds,
    covered: d.covered,
    total: d.total,
    weakest: d.weakest,
    score: d.score,
    countedTargets: counted,
    minTargets: row.raidMinTargets,
    gemBounty: raidGemsFor(th, counted, d.score),
    maxGems: row.raidGems,
    gaps
  };
}
