import {
  BUILDING_DEFS, SPARE_LIFE, MAX_BUILDING_LEVEL, costForLevel, storedAfter, producePayout, produceCapacityFor,
  produceRateFor, storageSlotsFor
} from '../data/progression.js';
import { normalizeHoldings, createModel, modelToCloud, applyOp } from '../shared/cityRules.js';

/**
 * cityMerge - the three-way merges CloudSync uses when the cloud moved on while this device still
 * had changes it had not pushed (docs/ONLINE_SPEC.md section 13, "rebase"). Pure: plain data in,
 * plain data out, no DOM / firebase / clock, so it runs in Node (tools/online/test-sync-merge.mjs).
 *
 * `base` is what this device last knew to be in the cloud (the doc it pushed or applied), `local`
 * is the live city now, `remote` the newer cloud doc. Before this, "the newer version wins" threw
 * `local` away while the bank kept what it had paid: a shop purchase, an upgrade's cost, a
 * gem-finish or a collect that had not been pushed yet was lost (or, for a collect, paid twice).
 *
 * rebaseCity - the city (cloud layout + holdings):
 *   - DESIGN comes from `remote`: which buildings stand, where, facing which way, and the roads.
 *     The AI designer's and the other device's edits win. The design edits made here that the
 *     remote left alone are then replayed through the rules the AI's own ops go through
 *     (cityRules.applyOp: radius, overlap, inventory, limits): road tiles drawn / erased, buildings
 *     moved / turned, buildings stowed (the game's stow: into storage at the level they reached
 *     here) and buildings placed (same id, level, output and build job). One that no longer fits
 *     is dropped: a building placed here then goes back to the inventory / storage with the
 *     levels paid for here, and a building stowed here stands again at the level it reached here.
 *     A building the remote moved stays where the remote put it.
 *   - GAME state is rebased: for a building standing on both sides, its level + build job come
 *     from whichever side changed them since `base` (the AI designer never does, so local wins
 *     against it), re-indexed onto the remote building list; its stored output is the LOWER of
 *     the two (advanced to `nowMs`), so a collect on either side stands and nothing is paid twice.
 *   - SHOP PURCHASES made here are re-added on top of the remote holdings: per type,
 *     max(0, (localInv - baseInv) + (localCount - baseCount)) (road: tiles instead of buildings).
 *     A placement / stow / road stroke moves one unit between the map and the inventory and nets
 *     to 0, so only bought units count and nothing is minted.
 *   - LEVELS paid here are never lost or minted: per type, the upgrade levels the merged city owns
 *     (map + storage + running jobs) end up as the remote's plus what was paid here, minus the jobs
 *     refunded (settleLevels puts a difference left by the replays on the buildings placed here,
 *     then on the stowed units).
 *   - A job started here whose building the remote removed is refunded (exactly what the game
 *     does when a building under construction is stowed); a building the remote stowed keeps the
 *     level it reached here. A remote stow credit (an AI stow of a producer) that pays output this
 *     device already banked - it collected that producer, or stowed it itself - is held back from
 *     that credit (report.creditHoldback: credit id -> amount), never taken from the live bank.
 *
 * mergeBank - the bank + garage (saves/{uid}): remote + (local - base) per resource, garage
 * levels/unlocks by max, so a spend or an income on either device survives.
 */

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const isGate = (b) => !!(b && (b.gate || b.t === 'main_gate'));
const levelOf = (b) => Math.max(1, Math.round(num(b && b.l, 1)) || 1);
const producerOf = (type) => {
  const def = BUILDING_DEFS[type];
  return def && def.produce ? def.produce : null;
};
const ZERO = () => ({ cash: 0, iron: 0, wood: 0 });

/** building id -> the job on it (by the job's id first, then index + type - as restoreCity does). */
function jobsById(layout) {
  const buildings = arr(layout && layout.buildings);
  const out = new Map();
  for (const t of arr(layout && layout.tasks)) {
    if (!isObj(t)) continue;
    let b = typeof t.id === 'string' ? buildings.find(x => isObj(x) && x.id === t.id) : null;
    if (!b && t.i !== undefined && t.i !== null) {
      const c = buildings[Number(t.i)];
      if (isObj(c) && c.t === t.t) b = c;
    }
    if (!b || isGate(b) || out.has(b.id)) continue;
    out.set(b.id, t);
  }
  return out;
}

const sameJob = (a, b) => (!a && !b) ||
  (!!a && !!b && Math.round(num(a.to)) === Math.round(num(b.to)) && Math.round(num(a.endsAt)) === Math.round(num(b.endsAt)));

/** What a producer holds at `nowMs`, from its `st` at the layout's `savedAt`. */
function storedAt(b, level, savedAt, nowMs) {
  if (!producerOf(b.t)) return Math.max(0, num(b.st));
  const held = Math.max(0, Math.min(produceCapacityFor(b.t, level), num(b.st)));
  return storedAfter(b.t, level, held, Math.max(0, nowMs - num(savedAt, nowMs)) / 1000);
}

function countsByType(layout) {
  const out = new Map();
  for (const b of arr(layout && layout.buildings)) {
    if (!isObj(b) || isGate(b) || typeof b.t !== 'string') continue;
    out.set(b.t, (out.get(b.t) || 0) + 1);
  }
  return out;
}

function byId(layout) {
  return new Map(arr(layout && layout.buildings).filter(b => isObj(b) && typeof b.id === 'string').map(b => [b.id, b]));
}

/** A job re-pointed at building `b` (index `i` in the merged list), without undefined fields. */
function jobFor(job, b, i) {
  const t = { i, id: b.id, t: b.t, gx: b.gx, gz: b.gz, to: Math.round(num(job.to)) };
  if (job.endsAt !== undefined) t.endsAt = Math.round(num(job.endsAt));
  if (job.total !== undefined) t.total = Math.round(num(job.total, 1));
  return t;
}

/** The values `a` has that `b` does not, as multisets (lists of levels). */
function multisetMinus(a, b) {
  const left = arr(b).map(v => Math.round(num(v)));
  const out = [];
  for (const raw of arr(a)) {
    const v = Math.round(num(raw));
    const k = left.indexOf(v);
    if (k >= 0) left.splice(k, 1);
    else out.push(v);
  }
  return out;
}

/**
 * The level each building stowed here (in `base`, gone from the live city) had when the game
 * stowed it. The game files a stowed building's level in stowedLevels (levels above 1), so the
 * entries the live holdings gained since `base` are those levels. Per type, lowest base level
 * first, each takes the smallest gained entry at or above its base level (a building never loses
 * levels); one with no entry left was stowed at its base level.
 */
function levelsStowedHere(bB, bL, hB, hL) {
  const byType = new Map();
  for (const [id, b] of bB) {
    if (bL.has(id) || isGate(b) || typeof b.t !== 'string') continue;
    if (!byType.has(b.t)) byType.set(b.t, []);
    byType.get(b.t).push(b);
  }
  const out = new Map();
  for (const [t, list] of byType) {
    const gained = multisetMinus(hL.stowedLevels[t], hB.stowedLevels[t]).sort((x, y) => x - y);
    for (const b of list.sort((x, y) => levelOf(x) - levelOf(y))) {
      const k = gained.findIndex(v => v >= levelOf(b));
      out.set(b.id, k >= 0 ? gained.splice(k, 1)[0] : levelOf(b));
    }
  }
  return out;
}

/** Upgrade levels of `type` a city owns: (level - 1) on the map and in storage, plus running jobs. */
function levelsOwned(layout, holdings, type) {
  let n = 0;
  const ids = new Set();
  for (const b of arr(layout && layout.buildings)) {
    if (!isObj(b) || isGate(b) || b.t !== type) continue;
    n += levelOf(b) - 1;
    ids.add(b.id);
  }
  for (const id of jobsById(layout).keys()) if (ids.has(id)) n++;
  const stowed = holdings && isObj(holdings.stowedLevels) ? holdings.stowedLevels[type] : null;
  for (const v of arr(stowed)) n += Math.max(1, Math.round(num(v, 1))) - 1;
  return n;
}

/** Resource units a stow credit pays (every producer's payout is 1 per unit per resource). */
const creditUnits = (c) => Math.max(num(c.cash), num(c.iron), num(c.wood));

/**
 * @param {{layout, holdings}} base    the cloud city this device last synced
 * @param {{layout, holdings}} local   the live city (cloud encoding: CloudSync._localLayout)
 * @param {{layout, holdings}} remote  the newer cloud city
 * @param {number} nowMs
 * @returns {{ layout, holdings, report }}  layout.savedAt = nowMs (every `st` is "at now")
 */
export function rebaseCity({ base, local, remote, nowMs }) {
  const B = (base && base.layout) || {};
  const L = (local && local.layout) || {};
  const R = (remote && remote.layout) || {};
  const bB = byId(B);
  const bL = byId(L);
  const bR = byId(R);
  const jB = jobsById(B);
  const jL = jobsById(L);
  const jR = jobsById(R);
  const holdings = normalizeHoldings(clone(remote && remote.holdings));
  const hB = normalizeHoldings(clone(base && base.holdings));
  const hL = normalizeHoldings(clone(local && local.holdings));
  const report = {
    keptLevels: 0,         // buildings whose level/job came from this device
    keptJobs: 0,           // jobs started here that are still running
    stLowered: 0,          // producers whose remote store was lowered to what is left here
    purchases: {},         // type -> units bought here, re-added to the inventory
    droppedJobs: [],       // [{ id, t, to }] jobs started here whose building did not make it
    refund: ZERO(),        // those jobs' cost, paid back into the live bank
    bankedOutput: ZERO(),  // output of buildings placed here that went back to storage (banked, as a stow banks it)
    stowedLevels: 0,       // remote-stowed buildings stored at the level they reached here
    surplusCredit: ZERO(), // total held back from the remote's stow credits (see creditHoldback)
    creditHoldback: {},    // credit id -> { cash, iron, wood } of it this device had already banked
    replayedRoads: 0,      // road tiles drawn / erased here, replayed on top of the remote
    replayedMoves: 0,      // buildings moved / turned here, replayed on top of the remote
    replayedStows: 0,      // buildings stowed here, stowed again on top of the remote
    replayedPlacements: 0, // buildings placed here, placed again on top of the remote
    returnedToInventory: 0, // buildings placed here that no longer fit: back in the inventory / storage
    droppedDesign: 0       // other design edits made here that no longer fit
  };

  const stowLevelHere = levelsStowedHere(bB, bL, hB, hL);
  const stows = [];        // [{ id, level }] stowed here, still standing remotely: replayed
  const buildings = [];
  const tasks = [];
  for (const r of arr(R.buildings)) {
    if (!isObj(r)) continue;
    const m = { ...r };
    let job = null;
    if (!isGate(r) && typeof r.id === 'string') {
      const l = bL.get(r.id);
      const b = bB.get(r.id);
      if (l) {
        // Standing on both sides: game state from whichever side changed it since base.
        const localChanged = !b || levelOf(l) !== levelOf(b) || !sameJob(jL.get(r.id), jB.get(r.id));
        if (localChanged) {
          m.l = levelOf(l);
          job = jL.get(r.id) || null;
          if (b) report.keptLevels++;
          if (job && !sameJob(job, jB.get(r.id))) report.keptJobs++;
        } else {
          m.l = levelOf(r);
          job = jR.get(r.id) || null;
        }
        if (producerOf(r.t)) {
          const here = storedAt(l, m.l, L.savedAt, nowMs);
          const there = storedAt(r, m.l, R.savedAt, nowMs);
          if (here + 1 < there) report.stLowered++;
          m.st = Math.floor(Math.min(here, there));
        }
      } else if (b) {
        // Stowed here, still standing remotely. It carries the level it reached here (an upgrade or
        // gem finish paid here); the stow here banked its output and settled its job (refunded, or
        // finished with gems first), so neither comes back with it. The stow itself is replayed
        // below unless the remote moved or turned the building (its design edit wins).
        const lv = Math.max(levelOf(b), stowLevelHere.get(r.id) || 1);
        if (lv > levelOf(b)) {
          m.l = Math.min(MAX_BUILDING_LEVEL, lv);
          report.keptLevels++;
        } else {
          m.l = levelOf(r);
        }
        job = jB.has(r.id) ? null : (jR.get(r.id) || null);
        const p = producerOf(r.t);
        if (p) m.st = p.raidOnly ? Math.floor(storedAt(r, m.l, R.savedAt, nowMs)) : 0;
        const movedThere = r.gx !== b.gx || r.gz !== b.gz || turnOf(r) !== turnOf(b);
        if (!movedThere) stows.push({ id: r.id });
      } else {
        // Placed remotely. Its output is taken as it stands (savedAt becomes now: no backdating).
        job = jR.get(r.id) || null;
      }
    }
    if (job && Math.round(num(job.to)) !== levelOf(m) + 1) job = null;   // restoreCity would drop it
    buildings.push(m);
    if (job) tasks.push(jobFor(job, m, buildings.length - 1));
  }

  // Buildings the remote took off the map (stowed, or a tree cleared).
  const baseStowed = hB.stowedCounts;
  // Stow credits the remote added (the AI designer's stows; a device's own stow banks directly).
  const newCredits = Object.entries(holdings.bankCredits)
    .filter(([cid, c]) => !(cid in hB.bankCredits) && typeof c.reason === 'string' && c.reason.startsWith('stow '));
  for (const [id, b] of bB) {
    if (bR.has(id) || isGate(b)) continue;
    const l = bL.get(id);
    const lvHere = l ? levelOf(l) : Math.max(levelOf(b), stowLevelHere.get(id) || 1);
    // Stowed remotely: storage keeps the level it reached here (the upgrade was paid here).
    const stowedThere = (holdings.stowedCounts[b.t] || 0) > (baseStowed[b.t] || 0);
    if (stowedThere && lvHere > levelOf(b)) {
      const list = (holdings.stowedLevels[b.t] || []).slice();
      const at = levelOf(b) > 1 ? list.indexOf(levelOf(b)) : -1;
      if (levelOf(b) === 1 || at >= 0) {
        if (at >= 0) list.splice(at, 1);
        if (list.length < holdings.stowedCounts[b.t]) {
          list.push(Math.min(MAX_BUILDING_LEVEL, lvHere));
          holdings.stowedLevels[b.t] = list.sort((x, y) => y - x);
          report.stowedLevels++;
        }
      }
    }
    // The remote's stow credit for this producer, if it made one: the one of its type whose amount
    // is closest to what `base` held, grown to the credit's own time (credit.at, the AI's clock).
    const p = producerOf(b.t);
    if (!p || p.raidOnly) continue;
    let k = -1;
    let best = Infinity;
    newCredits.forEach(([, c], n) => {
      if (c.reason !== 'stow ' + b.t) return;
      const priced = Math.floor(storedAt(b, levelOf(b), B.savedAt, num(c.at) || num(R.savedAt, nowMs)));
      const d = Math.abs(creditUnits(c) - priced);
      if (d < best) { best = d; k = n; }
    });
    if (k < 0) continue;
    const [cid, credit] = newCredits.splice(k, 1)[0];
    let surplus = 0;
    if (!l) {
      // Stowed here as well: that stow banked everything the producer held, and in this city it
      // has been in storage since - the whole credit would pay it a second time.
      surplus = creditUnits(credit);
    } else {
      // Standing here: what was COLLECTED here since base is already in this bank. Output made
      // after the last collect here and up to the AI's stow is all the credit may still pay: the
      // store here now, less what it made after the stow.
      const untouched = storedAt(b, levelOf(b), B.savedAt, num(L.savedAt, nowMs));
      const heldHere = Math.max(0, num(l.st));
      if (heldHere + 2 + produceRateFor(l.t, levelOf(l)) < untouched) {
        const since = storedAfter(l.t, levelOf(l), 0, Math.max(0, num(L.savedAt, nowMs) - num(credit.at, num(R.savedAt, nowMs))) / 1000);
        surplus = Math.max(0, creditUnits(credit) - Math.max(0, Math.floor(heldHere - since)));
      }
    }
    if (surplus <= 0) continue;
    const pay = producePayout(p.type, surplus);
    const hold = { cash: Math.min(pay.cash, num(credit.cash)), iron: Math.min(pay.iron, num(credit.iron)), wood: Math.min(pay.wood, num(credit.wood)) };
    report.creditHoldback[cid] = hold;
    report.surplusCredit.cash += hold.cash;
    report.surplusCredit.iron += hold.iron;
    report.surplusCredit.wood += hold.wood;
  }

  // Units bought here since base, on top of the remote inventory.
  const invB = hB.inventory;
  const invL = hL.inventory;
  const cB = countsByType(B);
  const cL = countsByType(L);
  const types = new Set([...Object.keys(invB), ...Object.keys(invL), ...cB.keys(), ...cL.keys(), 'road']);
  for (const t of types) {
    if (!BUILDING_DEFS[t]) continue;
    const placed = t === 'road' ? arr(L.roads).length - arr(B.roads).length : (cL.get(t) || 0) - (cB.get(t) || 0);
    const bought = (num(invL[t]) - num(invB[t])) + placed;
    if (bought > 0) {
      holdings.inventory[t] = (holdings.inventory[t] || 0) + bought;
      report.purchases[t] = bought;
    }
  }

  // Buildings placed here (in no other version): replayed after the other design edits.
  const placements = [];
  for (const [id, l] of bL) if (!bB.has(id) && !bR.has(id) && !isGate(l) && BUILDING_DEFS[l.t]) placements.push(l);
  // How many of each type the game took out of storage here (the rest came fresh from the shop).
  const stowedHereCount = new Map();
  for (const [id, b] of bB) if (!bL.has(id) && !isGate(b)) stowedHereCount.set(b.t, (stowedHereCount.get(b.t) || 0) + 1);
  const fromStorage = new Map();
  for (const l of placements) {
    if (fromStorage.has(l.t)) continue;
    fromStorage.set(l.t, Math.max(0, (hB.stowedCounts[l.t] || 0) + (stowedHereCount.get(l.t) || 0) - (hL.stowedCounts[l.t] || 0)));
  }

  const merged = {
    v: R.v !== undefined ? R.v : 1,
    savedAt: nowMs,
    buildings,
    tasks,
    roads: arr(R.roads).slice()
  };
  const model = createModel(merged, holdings);
  report.returnedTypes = new Set();
  const placedHere = replayDesign({ B, L, R, bB, bL, bR, jL, model, stows, placements, fromStorage, nowMs, report });

  // Jobs started here that did not make it (their building is gone or went back): refund them.
  const placedJobs = new Set(model.layout.tasks.map(t => t.id));
  const refundedJobs = new Map();
  for (const [id, job] of jL) {
    if (placedJobs.has(id) || sameJob(job, jB.get(id))) continue;
    const t = (bL.get(id) || {}).t || job.t;
    if (typeof t !== 'string' || !BUILDING_DEFS[t]) continue;
    const to = Math.round(num(job.to));
    const cost = costForLevel(t, to) || {};
    report.droppedJobs.push({ id, t, to });
    refundedJobs.set(t, (refundedJobs.get(t) || 0) + 1);
    report.refund.cash += Math.max(0, num(cost.cash));
    report.refund.iron += Math.max(0, num(cost.iron));
    report.refund.wood += Math.max(0, num(cost.wood));
  }

  // Types whose levels this device moved around (placed / stowed / upgraded in storage).
  const touched = new Set([...placements.map(l => l.t), ...stowedHereCount.keys()]);
  for (const t of new Set([...Object.keys(hL.stowedLevels), ...Object.keys(hB.stowedLevels)])) {
    if (multisetMinus(hL.stowedLevels[t], hB.stowedLevels[t]).length || multisetMinus(hB.stowedLevels[t], hL.stowedLevels[t]).length) touched.add(t);
  }
  const placedThere = new Set([...bR.keys()].filter(id => !bB.has(id)));
  settleLevels({ model, types: touched, base, local, remote, refundedJobs, placedHere, returned: report.returnedTypes, placedThere });
  delete report.returnedTypes;

  const out = modelToCloud(model);
  out.layout.savedAt = nowMs;
  return { layout: out.layout, holdings: out.holdings, report };
}

const roadKey = (r) => (Array.isArray(r) ? `${Math.round(num(r[0]))},${Math.round(num(r[1]))}` : String(r).replace(/\s+/g, ''));
const tileOf = (k) => k.split(',').map(Number);
const ROT90 = Math.PI / 2;
/** A saved rotation (radians) as the quarter turn it is, in degrees (what a move op takes). */
const rotDeg = (b) => ((Math.round(num(b.rot) / ROT90) % 4 + 4) % 4) * 90;
const isChainBarrier = (t) => !!(BUILDING_DEFS[t] && BUILDING_DEFS[t].barrier && BUILDING_DEFS[t].barrier.rammable);
const turnOf = (b) => (isChainBarrier(b.t) ? 0 : rotDeg(b));

/** Re-point every job at its building's index after the building list changed (jobs carry ids). */
function reindexJobs(model) {
  const L = model.layout;
  L.tasks = L.tasks
    .map(t => ({ ...t, i: L.buildings.findIndex(b => b.id === t.id) }))
    .filter(t => t.i >= 0);
}

/**
 * The game's own stow (BuildingManager.stowBuilding) on the model: needs a free slot in the Big
 * Storage Depots left standing and no job on the building (the merged city has none on a building
 * stowed here); files the level (and a vault's sealed cash) with the unit. Trees are stowed like
 * any building in the game (the MCP's stow op refuses them, so this is not applyOp). Tappable
 * output is 0 here: the stow on this device banked it.
 */
function stowInModel(model, id) {
  const L = model.layout;
  const k = L.buildings.findIndex(b => b.id === id);
  if (k < 0) return false;
  const b = L.buildings[k];
  if (isGate(b) || b.t === 'town_hall' || L.tasks.some(t => t.id === id)) return false;
  const capacity = L.buildings.filter(x => x.id !== id).reduce((s, x) => s + storageSlotsFor(x.t, levelOf(x)), 0);
  const used = Object.values(model.holdings.stowedCounts).reduce((s, n) => s + (n || 0), 0);
  if (used >= capacity) return false;
  const h = model.holdings;
  const p = producerOf(b.t);
  h.stowedCounts[b.t] = (h.stowedCounts[b.t] || 0) + 1;
  if (levelOf(b) > 1) {
    (h.stowedLevels[b.t] = h.stowedLevels[b.t] || []).push(levelOf(b));
    h.stowedLevels[b.t].sort((x, y) => y - x);
  }
  const sealed = p && p.raidOnly ? Math.max(0, Math.floor(num(b.st))) : 0;
  if (sealed > 0) {
    (h.stowedSealed[b.t] = h.stowedSealed[b.t] || []).push(sealed);
    h.stowedSealed[b.t].sort((x, y) => y - x);
  }
  h.inventory[b.t] = (h.inventory[b.t] || 0) + 1;
  L.buildings.splice(k, 1);
  reindexJobs(model);
  return true;
}

/**
 * Design edits made here (base -> local) that the remote did not also touch, applied to the merged
 * city with the rules the AI designer's ops pass (cityRules.applyOp: radius, overlap, road
 * inventory and limit, per-type limits; a building with a job is not moved): road tiles, stows,
 * then moves and placements (two passes, so a building can land where another one moved away).
 * Each edit stands alone: one that fails is dropped and the rest still apply. Returns the
 * buildings placed again: id -> { level it came back at, the local building }.
 */
function replayDesign({ B, L, R, bB, bL, bR, jL, model, stows, placements, fromStorage, nowMs, report }) {
  const ctx = { nowMs: num(model.layout.savedAt, nowMs), rand: () => 0.5 };
  const rB = new Set(arr(B.roads).map(roadKey));
  const rL = new Set(arr(L.roads).map(roadKey));
  const rR = new Set(arr(R.roads).map(roadKey));
  const tryOp = (op, counter) => {
    const res = applyOp(model, op, ctx);
    if (!res || !res.ok) report.droppedDesign++;
    else report[counter] += (Number(res.added) || 0) + (Number(res.removed) || 0);
  };
  for (const k of rL) if (!rB.has(k) && !rR.has(k)) tryOp({ op: 'add_roads', tiles: [tileOf(k)] }, 'replayedRoads');
  for (const k of rB) if (!rL.has(k) && rR.has(k)) tryOp({ op: 'remove_roads', tiles: [tileOf(k)] }, 'replayedRoads');

  // Stowed here: into storage again (at the level it reached here), unless it no longer fits -
  // then it stands, at that level.
  for (const s of stows) {
    if (stowInModel(model, s.id)) report.replayedStows++;
    else report.droppedDesign++;
  }

  let pending = [];
  for (const [id, l] of bL) {
    const b = bB.get(id);
    const r = bR.get(id);
    if (!b || !r || isGate(l)) continue;
    const here = l.gx !== b.gx || l.gz !== b.gz || turnOf(l) !== turnOf(b);
    const there = r.gx !== b.gx || r.gz !== b.gz || turnOf(r) !== turnOf(b);
    if (here && !there) pending.push({ kind: 'move', op: { op: 'move', id, gx: l.gx, gz: l.gz, ...(turnOf(l) !== turnOf(b) ? { rot: turnOf(l) } : {}) } });
  }
  // Placed here, highest level first (the game takes the highest stowed level first too).
  for (const l of placements.slice().sort((a, b) => levelOf(b) - levelOf(a))) {
    pending.push({ kind: 'place', l, op: { op: 'place', type: l.t, gx: l.gx, gz: l.gz, rot: turnOf(l) } });
  }
  const placedHere = new Map();
  // Two passes, so two buildings that swapped places here can both land.
  for (let pass = 0; pass < 2 && pending.length; pass++) {
    pending = pending.filter(e => {
      const res = applyOp(model, e.op, ctx);
      if (!res || !res.ok) return true;
      if (e.kind === 'move') { report.replayedMoves++; return false; }
      const l = e.l;
      const b = model.layout.buildings.find(x => x.id === res.id);
      if (b && !model.layout.buildings.some(x => x !== b && x.id === l.id)) b.id = l.id;   // keep its id
      // The level it came back at (from storage, like the game's placement) or the one it has here
      // (upgrades paid here), the higher; settleLevels squares it if the remote changed storage.
      if (res.fromStorage) fromStorage.set(l.t, Math.max(0, (fromStorage.get(l.t) || 0) - 1));
      b.l = Math.min(MAX_BUILDING_LEVEL, Math.max(levelOf(b), levelOf(l)));
      const p = producerOf(b.t);
      if (p) b.st = Math.floor(Math.min(produceCapacityFor(b.t, b.l), Math.max(0, num(l.st))));
      const job = jL.get(l.id);
      if (job && Math.round(num(job.to)) === b.l + 1) {
        model.layout.tasks.push(jobFor(job, b, model.layout.buildings.indexOf(b)));
      }
      placedHere.set(b.id, { cameAt: res.level || 1, local: l });
      report.replayedPlacements++;
      return false;
    });
  }
  for (const e of pending) {
    if (e.kind === 'move') { report.droppedDesign++; continue; }
    // Placed here but no longer fits: the unit is back where it came from (the remote holdings still
    // count it). Output it made here is banked, as the game's stow banks it; a vault's cash and the
    // levels paid here go with the unit into storage (settleLevels files the levels).
    const l = e.l;
    const h = model.holdings;
    const p = producerOf(l.t);
    const held = Math.max(0, Math.floor(num(l.st)));
    const left = fromStorage.get(l.t) || 0;
    if (left > 0) {
      fromStorage.set(l.t, left - 1);             // its stowed unit is still in storage
    } else if ((levelOf(l) > 1 || (p && p.raidOnly && held > 0)) &&
        (h.inventory[l.t] || 0) > (h.stowedCounts[l.t] || 0)) {
      h.stowedCounts[l.t] = (h.stowedCounts[l.t] || 0) + 1;   // a fresh unit goes into storage with its levels
      if (p && p.raidOnly && held > 0) {
        (h.stowedSealed[l.t] = h.stowedSealed[l.t] || []).push(held);
        h.stowedSealed[l.t].sort((x, y) => y - x);
      }
    }
    if (p && !p.raidOnly && held > 0) {
      const pay = producePayout(p.type, held);
      report.bankedOutput.cash += pay.cash;
      report.bankedOutput.iron += pay.iron;
      report.bankedOutput.wood += pay.wood;
    }
    report.returnedToInventory++;
    report.returnedTypes.add(l.t);
  }
  return placedHere;
}

/**
 * Per type, the upgrade levels the merged city owns must be the remote's plus what this device
 * paid (local - base), minus the jobs refunded. The replays get this right in the common case;
 * when they cannot (a building placed here that went back to storage, both sides taking the same
 * stowed unit, the remote having changed this type's storage) the difference is put on (or taken
 * off) the buildings placed here first, then the stowed units - never minted, never lost while
 * there is a unit of that type to carry it.
 */
function settleLevels({ model, types, base, local, remote, refundedJobs, placedHere, returned, placedThere }) {
  const h = model.holdings;
  for (const t of types) {
    if (!BUILDING_DEFS[t]) continue;
    const target = levelsOwned(remote.layout, remote.holdings, t) +
      levelsOwned(local.layout, local.holdings, t) - levelsOwned(base.layout, base.holdings, t) - (refundedJobs.get(t) || 0);
    let diff = target - levelsOwned(model.layout, h, t);
    if (!diff) continue;
    const busy = new Set(model.layout.tasks.map(x => x.id));
    const placed = model.layout.buildings.filter(b => b.t === t && placedHere.has(b.id) && !busy.has(b.id));
    if (diff > 0) {
      for (const b of placed) {
        const want = Math.min(MAX_BUILDING_LEVEL, levelOf(placedHere.get(b.id).local));
        while (diff > 0 && levelOf(b) < want) { b.l = levelOf(b) + 1; diff--; }
      }
      while (diff > 0) {
        const list = h.stowedLevels[t] || [];
        if ((h.stowedCounts[t] || 0) > list.length) {
          const lv = Math.min(MAX_BUILDING_LEVEL, 1 + diff);
          list.push(lv);
          diff -= lv - 1;
        } else {
          let k = -1;                              // the lowest entry that can still go up
          for (let n = list.length - 1; n >= 0 && k < 0; n--) if (list[n] < MAX_BUILDING_LEVEL) k = n;
          if (k < 0) break;
          const up = Math.min(diff, MAX_BUILDING_LEVEL - list[k]);
          list[k] += up;
          diff -= up;
        }
        h.stowedLevels[t] = list.sort((x, y) => y - x);
      }
      // A unit placed on both sides (the AI placed the one this device placed): it stands where the
      // remote put it, so the levels paid for it here go there.
      if (diff > 0 && returned.has(t)) {
        for (const b of model.layout.buildings) {
          if (b.t !== t || !placedThere.has(b.id) || busy.has(b.id)) continue;
          while (diff > 0 && levelOf(b) < MAX_BUILDING_LEVEL) { b.l = levelOf(b) + 1; diff--; }
        }
      }
    } else {
      for (const b of placed) {
        const floor = Math.max(1, placedHere.get(b.id).cameAt);
        while (diff < 0 && levelOf(b) > floor) { b.l = levelOf(b) - 1; diff++; }
      }
      const list = h.stowedLevels[t] || [];
      while (diff < 0 && list.length) {
        const k = list.length - 1;              // the lowest entry
        list[k]--;
        diff++;
        if (list[k] < 2) list.splice(k, 1);
      }
      if (list.length) h.stowedLevels[t] = list.sort((x, y) => y - x);
      else delete h.stowedLevels[t];
    }
    for (const b of placed) {
      const p = producerOf(b.t);
      if (p) b.st = Math.min(num(b.st), produceCapacityFor(b.t, levelOf(b)));
    }
  }
}

/**
 * Did the merge keep anything of this device's that plain "remote wins" would have dropped? (A
 * placement that went back to the inventory is not "kept": the toast says so on its own.)
 */
export function rebaseKeptSomething(report) {
  return !!report && (report.keptLevels > 0 || report.keptJobs > 0 || report.stLowered > 0 ||
    Object.keys(report.purchases).length > 0 || report.droppedJobs.length > 0 || report.stowedLevels > 0 ||
    report.replayedRoads > 0 || report.replayedMoves > 0 || report.replayedStows > 0 ||
    report.replayedPlacements > 0);
}

// ------------------------------------------------------------------ stow credits ledger

/**
 * Which pending MCP stow credits one bank write pays, and the `credited` list it records
 * (CloudSync.pushBank, inside the transaction that reads saves/{uid} and cities/{uid}).
 *   pending  [[id, credit]] this device has queued;  paid  saves.credited as read;
 *   inCity   ids the cloud city carries now;         cap   the rules' limit on `credited`.
 * A credit is paid only while the city carries it and `credited` does not list it. `credited`
 * keeps EVERY paid id the city still carries - the city keeps a credit until a game push drops it,
 * so a forgotten id would be paid again (it used to keep only the last 100) - and only as many
 * credits are paid as that leaves room for (oldest first: ids are 'c' + time); `blocked` then
 * says the rest wait for a city push that drops the paid ones. Paid ids the city no longer
 * carries stay while there is room. `drop`: pending ids the city no longer carries - a credit
 * leaves the city only once it is paid, so they are never paid (again).
 */
export function planCredits({ pending, paid, inCity, cap = 100 }) {
  const city = inCity instanceof Set ? inCity : new Set(inCity || []);
  const done = arr(paid);
  const doneSet = new Set(done);
  const keep = done.filter(id => city.has(id));
  const due = arr(pending).filter(([id]) => city.has(id) && !doneSet.has(id))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const pay = due.slice(0, Math.max(0, cap - keep.length));
  const gone = done.filter(id => !city.has(id));
  const spare = Math.max(0, cap - keep.length - pay.length);
  return {
    pay,
    credited: [...gone.slice(Math.max(0, gone.length - spare)), ...keep, ...pay.map(([id]) => id)],
    drop: arr(pending).map(([id]) => id).filter(id => !city.has(id)),
    blocked: due.length > pay.length
  };
}

// ------------------------------------------------------------------ bank + garage

const BANK_KEYS = ['cash', 'iron', 'wood', 'gems'];

function mergeGarage(base, local, remote) {
  if (!isObj(remote)) return clone(local) || null;
  if (!isObj(local)) return clone(remote);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (isObj(base) && same(local, base)) return clone(remote);
  if (isObj(base) && same(remote, base)) return clone(local);
  // Both changed: every level / unlock is something paid for on one side, so keep the higher.
  const out = clone(local);
  const lt = isObj(local.tracks) ? local.tracks : {};
  const rt = isObj(remote.tracks) ? remote.tracks : {};
  out.tracks = { ...lt };
  for (const k of Object.keys(rt)) out.tracks[k] = Math.max(num(lt[k]), num(rt[k]));
  const lc = isObj(local.cards) ? local.cards : {};
  const rc = isObj(remote.cards) ? remote.cards : {};
  out.cards = clone(lc);
  for (const k of Object.keys(rc)) {
    const a = isObj(lc[k]) ? lc[k] : { unlocked: false, level: 0 };
    const b = isObj(rc[k]) ? rc[k] : { unlocked: false, level: 0 };
    out.cards[k] = { ...a, unlocked: !!a.unlocked || !!b.unlocked, level: Math.max(num(a.level), num(b.level)) };
  }
  // The deck is a choice, not a purchase: this device's pick stands.
  return out;
}

/**
 * Bank shapes are CloudSync._bankShape: { bank: {cash, iron, wood, gems, vehicleLives}, garage }.
 * Returns remote + (local - base) per resource (never below 0) and the merged garage.
 */
export function mergeBank(base, local, remote) {
  const b = (base && base.bank) || {};
  const l = (local && local.bank) || {};
  const r = (remote && remote.bank) || {};
  const bank = {};
  for (const k of BANK_KEYS) bank[k] = Math.max(0, num(r[k]) + num(l[k]) - num(b[k]));
  const lives = Math.round(num(r.vehicleLives) + num(l.vehicleLives) - num(b.vehicleLives));
  bank.vehicleLives = Math.max(0, Math.min(SPARE_LIFE.max, lives));
  return { bank, garage: mergeGarage(base && base.garage, local && local.garage, remote && remote.garage) };
}
