import { MAX_BUILDING_LEVEL, buildSecondsFor, storedAfter, producePayout } from '../data/progression.js';
import { isChainBarrier } from './BarrierWalls.js';

/**
 * CityPersistence - saves and restores the city layout.
 *
 * Before this existed the city was regenerated from hardcoded coordinates by
 * initDefaultCity() on EVERY page load, while the resources spent on it stayed spent.
 * Every building placed and every upgrade bought was silently deleted on reload.
 * Nothing about a Town Hall ladder means anything without this file.
 *
 * Build jobs are stored as ABSOLUTE wall-clock deadlines (endsAt), not as a remaining
 * countdown, so a multi-hour upgrade keeps running while the tab is closed. On load,
 * a job whose deadline has passed is completed immediately.
 *
 * Producers work the same way: the blob records what each one held at `savedAt`, and
 * restoreCity() credits the time since then (progression.storedAfter, capped at capacity),
 * so a mill left for three hours has three hours of wood waiting.
 */

export const CITY_SAVE_KEY = 'city_siege_city';
export const CITY_SAVE_VERSION = 1;

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const int = (v, lo, hi, fallback) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
};

/** Snapshot of the live city, safe to JSON.stringify. */
export function serializeCity(bm, now = Date.now()) {
  // `st` must be what each producer holds AT savedAt, but b.stored only moves once a frame and
  // a hidden tab runs no frames: closing a tab left in the background for hours saved its
  // pre-hide output stamped 'now', and restoreCity credited nothing for those hours.
  if (bm.advanceProduction) bm.advanceProduction(now);
  const buildings = bm.buildings.map(b => ({
    t: b.type,
    gx: Math.round(b.gx),
    gz: Math.round(b.gz),
    l: int(b.level, 1, MAX_BUILDING_LEVEL, 1),
    st: Math.round(num(b.stored, 0)),
    rot: num(b.mesh ? b.mesh.rotation.y : 0, 0),
    gate: b.isMainGate ? (b.name || 'Gate') : undefined
    // No landmine 'spent' flag: raid state is never persistent. Saving it (a mid-raid reload
    // writes the city) left the mine disarmed for the whole NEXT raid.
  }));

  // A job names its building by index into `buildings` above (plus type as a check). Tiles
  // are not an identity: a building may share a tree's tile, and restoring by the first
  // building found on the tile handed a paid upgrade to the tree.
  const tasks = [];
  bm.activeBuildTasks.forEach(task => {
    const i = bm.buildings.indexOf(task.building);
    if (i < 0) return;
    tasks.push({
      i,
      t: task.building.type,
      gx: Math.round(task.building.gx),
      gz: Math.round(task.building.gz),
      to: int(task.targetLevel, 1, MAX_BUILDING_LEVEL, 1),
      endsAt: Math.round(num(task.endsAt, now + task.remaining * 1000)),
      total: Math.round(num(task.total, 1))
    });
  });

  const roads = [];
  bm.roadNetwork.roads.forEach(r => roads.push([Math.round(r.gx), Math.round(r.gz)]));

  return { v: CITY_SAVE_VERSION, savedAt: now, buildings, tasks, roads };
}

export function saveCity(bm) {
  try {
    localStorage.setItem(CITY_SAVE_KEY, JSON.stringify(serializeCity(bm)));
    return true;
  } catch (e) {
    console.warn('[city] save failed', e);
    return false;
  }
}

/**
 * Read the blob without touching the world. Returns null when there is nothing to
 * restore. A blob that exists but will not parse is PRESERVED under a .bak key and
 * reported, never silently overwritten with a fresh default city.
 */
export function readCitySave() {
  let raw = null;
  try {
    raw = localStorage.getItem(CITY_SAVE_KEY);
  } catch (e) {
    return null;
  }
  if (!raw) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    try {
      localStorage.setItem(CITY_SAVE_KEY + '.bak', raw);
      localStorage.removeItem(CITY_SAVE_KEY);
    } catch (_) { /* quota */ }
    console.error('[city] save was unreadable; kept a copy at ' + CITY_SAVE_KEY + '.bak');
    return null;
  }

  const park = (why) => {
    // Unusable but readable: keep it under .bak before the default city overwrites it.
    try { localStorage.setItem(CITY_SAVE_KEY + '.bak', raw); } catch (_) { /* quota */ }
    console.warn('[city] ' + why + '; kept a copy at ' + CITY_SAVE_KEY + '.bak');
    return null;
  };
  if (!parsed || typeof parsed !== 'object') return park('save is not an object');
  if (!Array.isArray(parsed.buildings) || parsed.buildings.length === 0) return park('save has no buildings');
  if (int(parsed.v, 0, 999, 0) !== CITY_SAVE_VERSION) {
    return park('save version ' + parsed.v + ' != ' + CITY_SAVE_VERSION);
  }
  return parsed;
}

export function hasCitySave() {
  return readCitySave() !== null;
}

/**
 * Copy the blob as it is on disk to the .bak key (where an unreadable save is parked), so a
 * repaired city can be written back without losing the damaged original.
 */
export function backupCitySave() {
  try {
    const raw = localStorage.getItem(CITY_SAVE_KEY);
    if (!raw) return false;
    localStorage.setItem(CITY_SAVE_KEY + '.bak', raw);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Rebuild the city from a blob. Returns a report the caller can surface, including
 * how many jobs finished while the player was away.
 */
export function restoreCity(bm, blob, now = Date.now()) {
  const report = {
    buildings: 0, roads: 0, tasksResumed: 0, tasksCompletedOffline: 0, tasksRefunded: 0, skipped: [],
    offlineSeconds: 0,
    offlineProduced: { cash: 0, iron: 0, wood: 0 },   // tappable output made while away
    offlineVault: 0,                                   // cash sealed into Crypto Vaults while away
    repaired: []                                       // gates / Town Hall the blob was missing
  };
  if (!blob) return report;

  // Time away. A missing or future stamp (clock moved back) credits nothing.
  const savedAt = num(blob.savedAt, now);
  const awaySecs = Math.max(0, (now - savedAt) / 1000);
  report.offlineSeconds = awaySecs;

  bm.clearAll();

  for (const r of blob.roads || []) {
    if (!Array.isArray(r) || r.length < 2) continue;
    const gx = Math.round(Number(r[0]));
    const gz = Math.round(Number(r[1]));
    if (!Number.isFinite(gx) || !Number.isFinite(gz)) continue;
    if (bm.roadNetwork.addRoad(gx, gz)) report.roads++;
  }

  // restored[i] is the building made from blob.buildings[i] (null if it was skipped), so
  // build jobs can find their building by index.
  const restored = [];
  for (const s of blob.buildings || []) {
    restored.push(null);
    if (!s || typeof s.t !== 'string') continue;
    const gx = Math.round(Number(s.gx));
    const gz = Math.round(Number(s.gz));
    if (!Number.isFinite(gx) || !Number.isFinite(gz)) { report.skipped.push(s.t + ' (bad tile)'); continue; }
    const level = int(s.l, 1, MAX_BUILDING_LEVEL, 1);

    let b = null;
    if (s.gate || s.t === 'main_gate') {
      // Gates are fixed features of the wall: one on each of the three gate tiles, nowhere else.
      const fixed = bm.fixedGateAt(gx, gz);
      if (!fixed || bm.getMainGates().some(g => g.gx === gx && g.gz === gz)) {
        report.skipped.push('main gate at ' + gx + ',' + gz + ' (not a free fixed gate tile)');
        continue;
      }
      b = bm.addMainGate(fixed.name, fixed.gx, fixed.gz, fixed.rot);
    } else {
      b = bm.addBuilding(s.t, gx, gz, level, { skipCapCheck: true });
      // A barrier's facing follows its wall links (BuildingManager draws them relative to it),
      // so only free-standing buildings take the saved rotation.
      if (b && b.mesh && !isChainBarrier(b) && Number.isFinite(Number(s.rot))) b.mesh.rotation.y = Number(s.rot);
    }
    if (!b) { report.skipped.push(s.t); continue; }

    // Raid damage is never persistent (returnToBuilder resets every building), so a city
    // saved mid-raid must not come back half-destroyed.
    if (Number(b.maxHp) > 0) b.hp = b.maxHp;
    b.isDestroyed = false;
    if (b.produceType) {
      const held = Math.max(0, Math.min(num(b.maxCapacity, 0), num(s.st, 0)));
      b.stored = storedAfter(b.type, b.level, held, awaySecs);
      const made = Math.floor(b.stored - held);
      if (made > 0 && b.raidOnly) report.offlineVault += made;
      else if (made > 0) {
        const pay = producePayout(b.produceType, made);
        report.offlineProduced.cash += pay.cash;
        report.offlineProduced.iron += pay.iron;
        report.offlineProduced.wood += pay.wood;
      }
    }
    // (Older saves may carry a mid-raid 'spent' landmine flag; it is ignored - every raid
    // starts with its mines armed.)
    restored[restored.length - 1] = b;
    report.buildings++;
  }

  for (const t of blob.tasks || []) {
    if (!t) continue;
    const building = taskBuilding(t, restored, bm);
    if (!building || building.isUnderConstruction) continue;
    // A job is always exactly one level (upgradeBuilding): anything else is a damaged save.
    const targetLevel = int(t.to, 1, MAX_BUILDING_LEVEL, 1);
    if (targetLevel !== (building.level || 1) + 1) continue;

    // Gates (and anything else the catalog marks fixed) never upgrade, whatever a save says.
    if (building.isMainGate || (bm.catalog[building.type] && bm.catalog[building.type].upgradeable === false)) {
      // A Labour Hut or tree job paid for before those types lost their levels: refund it.
      // (A gate job only ever comes from a damaged save - gates were never upgradeable.)
      if (!building.isMainGate && bm.economy) {
        bm.economy.refund(bm.getUpgradeCost(building));
        report.tasksRefunded++;
      }
      continue;
    }

    const endsAt = num(t.endsAt, 0);
    const total = Math.max(1, num(t.total, buildSecondsFor(building.type, targetLevel)));

    if (endsAt > 0 && endsAt <= now) {
      // Finished while the tab was closed.
      bm.completeConstruction({ building, targetLevel, remaining: 0, total, endsAt, onComplete: null });
      report.tasksCompletedOffline++;
      continue;
    }

    const remaining = endsAt > 0 ? (endsAt - now) / 1000 : total;
    bm.resumeBuildTask(building, targetLevel, remaining, total, endsAt || (now + remaining * 1000));
    report.tasksResumed++;
  }

  // The game never writes a city without its three gates and a Town Hall, but a damaged or
  // hand-edited blob can lack them - and a city with no gate cannot be raided at all.
  report.repaired = bm.ensureCityCore();

  return report;
}

/**
 * The building a saved job belongs to. A job that records an index is matched by it alone,
 * and serializeCity always writes the type beside it, so both must agree (a job with no type
 * used to 'upgrade' whatever sat at that index - a Main Gate included). Saves from before the
 * index only have the tile, so match the job's type if known and never pick a gate, a building
 * that already has a job, or decoration over a real building.
 */
function taskBuilding(t, restored, bm) {
  if (t.i !== undefined && t.i !== null) {
    const i = Number(t.i);
    const b = Number.isInteger(i) && i >= 0 && i < restored.length ? restored[i] : null;
    return b && !b.isMainGate && typeof t.t === 'string' && b.type === t.t ? b : null;
  }
  const gx = Math.round(Number(t.gx));
  const gz = Math.round(Number(t.gz));
  if (!Number.isFinite(gx) || !Number.isFinite(gz)) return null;
  const onTile = bm.buildings.filter(b => b.gx === gx && b.gz === gz && !b.isMainGate &&
    !b.isUnderConstruction && (typeof t.t !== 'string' || b.type === t.t));
  return onTile.find(b => b.type !== 'tree') || onTile[0] || null;
}

export function clearCitySave() {
  try { localStorage.removeItem(CITY_SAVE_KEY); } catch (e) { /* ignore */ }
}
