import * as THREE from 'three';
import {
  BUILDING_DEFS,
  MAX_BUILDING_LEVEL,
  MAX_TOWN_HALL_LEVEL,
  MAX_MESH_TIER,
  hpForLevel,
  costForLevel,
  buildSecondsFor,
  produceRateFor,
  produceCapacityFor,
  storedAfter,
  storageSlotsFor,
  limitFor,
  buildersFor,
  labourFor,
  cityRadiusFor,
  townHallRow,
  validateProgression,
  gemsToFinish
} from '../data/progression.js';
import { MESH_FACTORIES } from '../rendering/meshes/index.js';
import { isChainBarrier, standingBarrierIndex, barrierLinksOf } from './BarrierWalls.js';
import { serializeCity, restoreCity } from './CityPersistence.js';
// The three fixed Main Gates live in the pure rules module (the MCP server validates layouts
// with the same list); re-exported so existing importers keep working.
import { MAIN_GATES, newBuildingId } from '../shared/cityRules.js';

export { MAIN_GATES };

/**
 * BuildingManager - Manages building placement, upgrades, visual tiers and the
 * builder/labour queue.
 *
 * All progression numbers (HP per level, cost per level, build seconds, per-type
 * build limits, builder counts) come from src/data/progression.js. This file must
 * never re-derive any of them inline - that duplication is exactly what made a
 * level-2 building have 1.50x HP when placed and 1.55x HP when upgraded.
 */
export class BuildingManager {
  constructor(scene, assetFactory, roadNetwork, economyManager) {
    this.scene = scene;
    this.assetFactory = assetFactory;
    this.roadNetwork = roadNetwork;
    this.economy = economyManager;

    this.buildings = [];
    this.buildingGroup = new THREE.Group();
    this.buildingGroup.name = 'city_buildings';
    this.scene.add(this.buildingGroup);

    this.activeBuildTasks = [];
    // Harvest bubbles / construction hammers are builder-screen UI; hidden for the whole attack.
    this.collectiblesHidden = false;
    this.onBuildersChanged = null;
    this.onConstructionFinished = null;
    // Fired on any structural change (place, remove, move, level up) so the city autosaves.
    this.onCityChanged = null;
    // The city as it was before the last layout preset (applyPreset / undoPreset). Session only.
    this._presetUndo = null;

    // The catalog is a thin adapter over BUILDING_DEFS so existing UI code that reads
    // def.unlockTownHall / def.cost / def.category keeps working unchanged.
    this.catalog = {};
    for (const [type, def] of Object.entries(BUILDING_DEFS)) {
      this.catalog[type] = { ...def, unlockTownHall: def.unlockTH };
    }

    const progressionErrors = validateProgression();
    if (progressionErrors.length) {
      console.error('[progression] ladder is inconsistent:\n  ' + progressionErrors.join('\n  '));
    }
  }

  // ---------------------------------------------------------------- build limits

  /** How many of `type` the city currently owns (roads live in RoadNetwork). */
  _changed() {
    if (this.onCityChanged) this.onCityChanged();
  }

  countOf(type) {
    if (type === 'road') return this.roadNetwork ? this.roadNetwork.roads.size : 0;
    return this.buildings.filter(b => b.type === type && !b.isDestroyed).length;
  }

  /** The per-Town-Hall cap on `type`. */
  limitOf(type) {
    return limitFor(type, this.getTownHallLevel());
  }

  /**
   * Placed + still sitting in the Construction Inventory. The shop checks this so the
   * limit cannot be sidestepped by stockpiling blueprints you are not allowed to place.
   */
  ownedTotal(type) {
    const stored = this.economy && this.economy.getInventoryCount
      ? this.economy.getInventoryCount(type)
      : 0;
    return this.countOf(type) + stored;
  }

  /**
   * Refund, at the shop price, the fresh blueprints that put a type over this Town Hall's
   * limit (placed + held) and return { type: count }. Stowed buildings are never touched.
   * main.js runs this once, on the first boot of a save from before the city itself was
   * saved: that version rebuilt the starter city on every load beside a starter stock of 35
   * roads and 2 spike traps, which came back as 140 / 130 roads and 3 / 2 spike traps.
   */
  refundInventoryOverLimits() {
    const refunded = {};
    const e = this.economy;
    if (!e || !e.inventory) return refunded;
    for (const type of Object.keys(e.inventory)) {
      const def = BUILDING_DEFS[type];
      const over = this.ownedTotal(type) - this.limitOf(type);
      if (!def || over <= 0) continue;
      const n = e.takeFreshFromInventory(type, over);
      if (!n) continue;
      const per = def.packCount || 1;             // roads are sold 5 tiles to a pack
      const share = (k) => Math.floor(((def.cost && def.cost[k]) || 0) * n / per);
      e.refund({ cash: share('cash'), iron: share('iron'), wood: share('wood') });
      refunded[type] = n;
    }
    return refunded;
  }

  /** Can the shop sell another `type` right now? */
  canBuy(type) {
    const def = BUILDING_DEFS[type];
    if (!def) return { ok: false, reason: 'UNKNOWN_TYPE', type };
    const th = this.getTownHallLevel();
    if (th < def.unlockTH) return { ok: false, reason: 'LOCKED', requiredTH: def.unlockTH };
    const limit = limitFor(type, th);
    const have = this.ownedTotal(type);
    const step = def.packCount || 1;
    if (have + step > limit) return { ok: false, reason: 'AT_LIMIT', have, limit, type };
    return { ok: true, have, limit, type };
  }

  /**
   * Single authority on "may another one of these exist right now". Every path that
   * can add a building (shop buy, inventory placement, road draw, preset, save load)
   * must consult this, or the cap is decorative.
   */
  canPlace(type) {
    const def = BUILDING_DEFS[type];
    if (!def) return { ok: false, reason: 'UNKNOWN_TYPE', type };
    const th = this.getTownHallLevel();
    if (th < def.unlockTH) return { ok: false, reason: 'LOCKED', requiredTH: def.unlockTH };
    const limit = limitFor(type, th);
    const have = this.countOf(type);
    if (limit <= 0) return { ok: false, reason: 'LOCKED', requiredTH: def.unlockTH };
    if (have >= limit) return { ok: false, reason: 'AT_LIMIT', have, limit, type };
    return { ok: true, have, limit, type };
  }

  /** Tiles from origin the player may build on at this Town Hall level. */
  get buildRadius() {
    return cityRadiusFor(this.getTownHallLevel());
  }

  initDefaultCity() {
    this.clearAll();

    // 1. Build Central Roads
    const roadCoords = [
      // Central Cross
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13], [0, 14], [0, 15],
      [0, -1], [0, -2], [0, -3], [0, -4], [0, -5], [0, -6], [0, -7], [0, -8], [0, -9], [0, -10], [0, -11], [0, -12], [0, -13], [0, -14], [0, -15],
      [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],
      [-1, 0], [-2, 0], [-3, 0], [-4, 0], [-5, 0], [-6, 0], [-7, 0], [-8, 0], [-9, 0], [-10, 0], [-11, 0], [-12, 0], [-13, 0], [-14, 0], [-15, 0],
      // Ring Road at distance 6
      [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],
      [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
      [-6, 1], [-6, 2], [-6, 3], [-6, 4], [-6, 5], [-6, 6],
      [-1, 6], [-2, 6], [-3, 6], [-4, 6], [-5, 6],
      [6, -1], [6, -2], [6, -3], [6, -4], [6, -5], [6, -6],
      [1, -6], [2, -6], [3, -6], [4, -6], [5, -6],
      [-6, -1], [-6, -2], [-6, -3], [-6, -4], [-6, -5], [-6, -6],
      [-1, -6], [-2, -6], [-3, -6], [-4, -6], [-5, -6]
    ];

    roadCoords.forEach(([gx, gz]) => {
      this.roadNetwork.addRoad(gx, gz);
    });

    // 2. Town Hall in center
    this.addBuilding('town_hall', 3, 3, 1);

    // 3. The three fixed Main Gates on the perimeter (North, East, South).
    MAIN_GATES.forEach(g => this.addMainGate(g.name, g.gx, g.gz, g.rot));

    // 4. Police Station: Town Hall 1 allows one (a second comes with Town Hall 2). Its preset
    // slot at (4, 8) stays in the default layout for it.
    this.addBuilding('police_station', -4, -3, 1);

    // 5. Petrol Pumps (2 Stations - High Cash & Explosive Hazards)
    this.addBuilding('petrol_pump', -3, 3, 1);
    this.addBuilding('petrol_pump', 8, -3, 1);

    // 6. Resource Factories (Wood, Iron, Cash)
    this.addBuilding('lumber_mill', -8, -8, 1);
    this.addBuilding('iron_foundry', -8, 8, 1);
    // (A Cash Mint used to sit here, but it is a Town Hall 2 blueprint.)
    this.addBuilding('iron_foundry', 8, 4, 1);

    // 7. Builder Huts (Active builders constructing & repairing!). The second hut used to sit
    // at (-4,4), overlapping the 2x2 petrol pump at (-3,3): neither could be dropped back on
    // its own tile.
    this.addBuilding('builder_hut', 4, -4, 1);
    this.addBuilding('builder_hut', -4, 8, 1);

    // 8. Defensive Traps & Roadblocks
    this.addBuilding('spike_trap', 0, -11, 1);
    this.addBuilding('roadblock', 0, 11, 1);
    this.addBuilding('roadblock', 11, 0, 1);

    // 9. Trees & Countryside foliage
    const treeLocs = [
      [-10, -3], [-11, -5], [-12, -7], [-10, 3], [-12, 5],
      [10, -8], [11, -10], [9, 9], [12, 11], [-3, 11]
    ];
    treeLocs.forEach(([gx, gz]) => {
      this.addBuilding('tree', gx, gz, 1);
    });
  }

  get tileSize() {
    return this.roadNetwork ? this.roadNetwork.tileSize : 5.5;
  }

  /**
   * Is `building` one of the city's live buildings? A layout preset (or a reload) rebuilds
   * every building as a new object, so a panel or tool still holding the old one must not act
   * on it: a stale inspector used to stow a copy of a level-6 mill (a free duplicate that
   * survived the save) and to charge for upgrades of a building no longer on the map.
   */
  isInCity(building) {
    return !!building && this.buildings.indexOf(building) >= 0;
  }

  /** Move a building and everything floating over it (collect bubble, construction hammer). */
  moveBuilding(building, newGx, newGz) {
    if (!this.isInCity(building)) return { ok: false, reason: 'NOT_IN_CITY' };
    const wasBarrier = isChainBarrier(building);
    const from = { gx: building.gx, gz: building.gz };
    building.gx = newGx;
    building.gz = newGz;
    const x = newGx * this.tileSize;
    const z = newGz * this.tileSize;
    if (building.mesh) building.mesh.position.set(x, 0, z);
    if (building.bubbleMesh) building.bubbleMesh.position.set(x, building.bubbleMesh.position.y, z);
    if (building.constructionMesh) building.constructionMesh.position.set(x, building.constructionMesh.position.y, z);
    if (wasBarrier) {
      this.refreshBarrierLinks(from.gx, from.gz);
      this.refreshBarrierLinks(newGx, newGz);
    }
    this._changed();
    return { ok: true };
  }

  /**
   * Rearrange the city into a preset layout WITHOUT gaining or losing anything.
   *
   * Presets used to clearAll() and rebuild from a fixed list: they granted free buildings
   * (Metropolis handed out a level-2 Town Hall, instantly unlocking the TH2 tier) and,
   * now that the city persists, they would also have wiped every upgrade. Now a preset is
   * only a set of slots: each slot is filled with one of YOUR buildings of that type
   * (highest level first). Anything you own that the layout has no slot for goes to the
   * Construction Inventory at its current level. Road tiles are conserved the same way.
   *
   * Running upgrades are paid for, so they are conserved too: a building that gets a slot
   * takes its job (same deadline) with it, and one sent to the inventory has its job
   * cancelled and refunded, exactly like stowing it by hand. clearAll() used to drop every
   * job silently - a Town Hall 11->12 upgrade (171k cash, 86k iron, 137k wood) just vanished.
   * Uncollected producer output moves with the building as well.
   *
   * The UI asks previewPreset() first and makes the player confirm what goes to storage, and
   * the city as it was is kept for undoPreset(): a preset used to wipe a hand-built Town Hall 8
   * layout (56 of 72 buildings, every turret and depot) with one click and no way back.
   */
  applyPreset(presetName) {
    const plan = this._planPreset(presetName);
    if (!plan) return { ok: false, reason: 'UNKNOWN_PRESET' };
    const { layout, hall, thLevel, roadsOwned, roadTiles, placements, trees, leftovers } = plan;
    const gates = this.getMainGates().map(g => ({ name: g.name, gx: g.gx, gz: g.gz, rot: g.mesh ? g.mesh.rotation.y : 0 }));
    // The city and everything the preset moves in the economy, as they are before it runs.
    const before = { city: serializeCity(this), holdings: this.economy ? this.economy.snapshotHoldings() : null };

    let jobsRefunded = 0;
    for (const rec of leftovers) {
      if (rec.job) jobsRefunded += this.cancelTasksFor(rec.b, { refund: true }) > 0 ? 1 : 0;
    }

    this.clearAll();

    // Roads: the plan's tiles (up to what you own and your Town Hall allows); the rest is inventory.
    let roadsPlaced = 0;
    for (const [gx, gz] of roadTiles) {
      if (this.roadNetwork.addRoad(gx, gz)) roadsPlaced++;
    }

    let jobsKept = 0;
    const carryOver = (rec, nb) => {
      // Same building, new slot: it keeps its id (remote edits address buildings by id).
      if (rec.b && rec.b.id) nb.id = rec.b.id;
      if (nb.produceType && Number.isFinite(Number(rec.stored))) {
        nb.stored = Math.max(0, Math.min(nb.maxCapacity, Number(rec.stored)));
      }
      if (rec.job && rec.job.targetLevel > nb.level) {
        const remaining = Math.max(0, (rec.job.endsAt - Date.now()) / 1000);
        if (this.resumeBuildTask(nb, rec.job.targetLevel, remaining, rec.job.total, rec.job.endsAt)) jobsKept++;
      }
    };

    const th = this.addBuilding('town_hall', layout.townHall[0], layout.townHall[1], thLevel, { skipCapCheck: true });
    if (th && hall) carryOver(hall, th);
    // Gates are fixed features of the wall - they keep their own positions.
    gates.forEach(g => this.addMainGate(g.name, g.gx, g.gz, g.rot));

    for (const { rec, gx, gz } of placements) {
      const nb = this.addBuilding(rec.type, gx, gz, rec.level, { skipCapCheck: true });
      if (nb) {
        carryOver(rec, nb);
        continue;
      }
      // Could not be rebuilt on the map: it goes to the inventory like any other leftover.
      if (rec.job && this.economy) {
        this.economy.refund(this.getUpgradeCost(rec));
        jobsRefunded++;
      }
      leftovers.push(rec);
    }

    // Trees the layout leaves room for stay where they stood.
    for (const { rec, gx, gz } of trees) {
      const nb = this.addBuilding('tree', gx, gz, 1, { skipCapCheck: true });
      if (!nb) { leftovers.push(rec); continue; }
      if (rec.b && rec.b.id) nb.id = rec.b.id;
      if (nb.mesh && rec.b.mesh) nb.mesh.rotation.y = rec.b.mesh.rotation.y;
    }

    // Everything without a slot goes to inventory at its level, exactly like stowing it by
    // hand: tappable output is banked and a Crypto Vault keeps its sealed cash (_sendToStorage).
    let stowed = 0;
    for (const rec of leftovers) {
      this._sendToStorage(rec.b, rec.level, rec.stored);
      stowed++;
    }
    if (this.economy) {
      const invRoads = this.economy.getInventoryCount('road');
      const wantInv = roadsOwned - roadsPlaced;
      if (wantInv !== invRoads) this.economy.addToInventory('road', wantInv - invRoads);
    }

    if (this.onBuildersChanged) this.onBuildersChanged();
    this._presetUndo = { ...before, after: this._undoFingerprint() };
    return { ok: true, stowed, roadsPlaced, jobsKept, jobsRefunded };
  }

  /**
   * Which of the player's buildings a preset would put where, decided without touching
   * anything. applyPreset() carries this plan out and previewPreset() reports it, so the
   * warning the player confirms is exactly what happens.
   */
  _planPreset(presetName) {
    const layout = this._presetLayout(presetName);
    if (!layout) return null;

    // Snapshot what the player owns: one record per building, with its running job.
    const pool = {};
    let hall = null;
    for (const b of this.buildings) {
      if (b.isMainGate) continue;
      const task = this.activeBuildTasks.find(t => t.building === b);
      const rec = {
        b,
        type: b.type,
        level: b.level || 1,
        stored: b.stored,
        job: task ? { targetLevel: task.targetLevel, total: task.total, endsAt: task.endsAt } : null
      };
      if (b.type === 'town_hall') {
        if (!hall || rec.level > hall.level) hall = rec;
        continue;
      }
      (pool[b.type] = pool[b.type] || []).push(rec);
    }
    // Highest level first; between equals, the one mid-upgrade keeps its job by getting the slot.
    Object.values(pool).forEach(list => list.sort((a, b) => (b.level - a.level) || ((b.job ? 1 : 0) - (a.job ? 1 : 0))));

    // Decide every slot before touching the map, so the buildings headed for the inventory can
    // have their jobs refunded while they still exist.
    const placements = [];
    for (const [type, gx, gz] of layout.slots) {
      const list = pool[type];
      if (!list || !list.length) continue;       // you do not own one: the slot stays empty
      placements.push({ rec: list.shift(), gx, gz });
    }

    // Roads: the layout's tiles in order, up to what you own and what your Town Hall allows.
    const thLevel = hall ? hall.level : 1;
    const roadsOwned = this.roadNetwork.roads.size + (this.economy ? this.economy.getInventoryCount('road') : 0);
    const roadCap = Math.min(roadsOwned, limitFor('road', thLevel));
    const paved = new Set();
    const roadTiles = [];
    for (const [gx, gz] of layout.roads) {
      if (roadTiles.length >= roadCap) break;
      if (paved.has(gx + ',' + gz)) continue;
      paved.add(gx + ',' + gz);
      roadTiles.push([gx, gz]);
    }

    // Trees are scenery and no template has slots for them, so each one stays on its own tile
    // unless the new layout paves it or builds over it. (Every tree used to go to storage, where
    // it took a Big Storage slot and blocked stowing by hand until it was planted again.)
    const standing = [['town_hall', ...layout.townHall], ...placements.map(p => [p.rec.type, p.gx, p.gz])];
    const builtOver = (gx, gz) => standing.some(([t, x, z]) => {
      const reach = (1 + this.footprintOf(t)) / 2;       // isFootprintBlocked's rule for a 1-tile tree
      return Math.abs(x - gx) < reach && Math.abs(z - gz) < reach;
    });
    const trees = [];
    pool.tree = (pool.tree || []).filter(rec => {
      const { gx, gz } = rec.b;
      if (paved.has(gx + ',' + gz) || builtOver(gx, gz)) return true;
      trees.push({ rec, gx, gz });
      return false;
    });

    return {
      layout,
      hall,
      thLevel,
      roadsOwned,
      roadTiles,
      placements,
      trees,
      leftovers: Object.values(pool).flat()
    };
  }

  /**
   * What applyPreset(presetName) would do to this city, without doing it: how many buildings
   * keep a spot, how many go to storage (and how many of those defend the city), which running
   * upgrades are cancelled and refunded, and what storage would read afterwards.
   */
  previewPreset(presetName) {
    const plan = this._planPreset(presetName);
    if (!plan) return { ok: false, reason: 'UNKNOWN_PRESET' };
    const { hall, placements, trees, leftovers } = plan;
    const def = (t) => BUILDING_DEFS[t] || {};
    const depotSlots = (rec) => (def(rec.type).storage && def(rec.type).storage.kind === 'buildings')
      ? storageSlotsFor(rec.type, rec.level) : 0;
    const byType = {};
    leftovers.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });
    const kept = placements.length + trees.length + (hall ? 1 : 0);
    return {
      ok: true,
      owned: kept + leftovers.length,
      kept,
      stowed: leftovers.length,
      turrets: leftovers.filter(r => def(r.type).role === 'turret').length,
      defenses: leftovers.filter(r => def(r.type).category === 'defense').length,
      trees: leftovers.filter(r => r.type === 'tree').length,
      jobsRefunded: leftovers.filter(r => r.job).length,
      jobsKept: placements.filter(p => p.rec.job).length + (hall && hall.job ? 1 : 0),
      storageUsedAfter: this.storageUsed() + leftovers.length,
      storageCapacityAfter: placements.reduce((sum, p) => sum + depotSlots(p.rec), 0),
      byType
    };
  }

  /**
   * Can the last preset still be taken back? Only while nothing else has changed since: an
   * undo restores the city AND the bank, so after a collect, a purchase, a move or a finished
   * job it would roll that back too. A stale undo is dropped for good.
   */
  canUndoPreset() {
    const u = this._presetUndo;
    if (!u) return { ok: false, reason: 'NOTHING_TO_UNDO' };
    if (this._undoFingerprint() !== u.after) {
      this._presetUndo = null;
      return { ok: false, reason: 'CITY_CHANGED' };
    }
    return { ok: true };
  }

  /**
   * Put the city back as it was before the last preset: every building on its own tile at its
   * level, every job with its original deadline (restoreCity finishes one that came due in the
   * meantime), and the bank, inventory and storage as they were, so the preset's refunds and
   * banked output are handed back. Producers are credited the time since, like a reload.
   */
  undoPreset() {
    const can = this.canUndoPreset();
    if (!can.ok) return can;
    const u = this._presetUndo;
    this._presetUndo = null;
    restoreCity(this, u.city);
    if (this.economy) this.economy.restoreHoldings(u.holdings);
    if (this.onBuildersChanged) this.onBuildersChanged();
    this._changed();
    return { ok: true };
  }

  /**
   * The layout, jobs and roads, plus the economy's change counter - what an undo would
   * overwrite. Producer output is left out (it grows by itself); a collect bumps the counter.
   */
  _undoFingerprint() {
    const s = serializeCity(this);
    return JSON.stringify([
      s.buildings.map(b => [b.t, b.gx, b.gz, b.l]),
      s.tasks.map(t => [t.i, t.to, t.endsAt]),
      s.roads,
      this.economy ? this.economy.changeCount : 0
    ]);
  }

  _valleyRoads() {
    return [
        [0, -14], [0, -13], [1, -12], [2, -11], [3, -10], [3, -9], [2, -8], [1, -7], [0, -6],
        [-1, -5], [-2, -4], [-3, -3], [-3, -2], [-2, -1], [-1, 0], [0, 0],
        // The diagonal ends inside the radius: it used to run on to (14,14), beyond the wall.
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8],
        // Branch to East Gate
        [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0],
        // Branch to South Gate
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13], [0, 14]
      ];
  }

  _defaultRoadCoords() {
    return [
      // Central Cross
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13], [0, 14], [0, 15],
      [0, -1], [0, -2], [0, -3], [0, -4], [0, -5], [0, -6], [0, -7], [0, -8], [0, -9], [0, -10], [0, -11], [0, -12], [0, -13], [0, -14], [0, -15],
      [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0],
      [-1, 0], [-2, 0], [-3, 0], [-4, 0], [-5, 0], [-6, 0], [-7, 0], [-8, 0], [-9, 0], [-10, 0], [-11, 0], [-12, 0], [-13, 0], [-14, 0], [-15, 0],
      // Ring Road at distance 6
      [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],
      [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
      [-6, 1], [-6, 2], [-6, 3], [-6, 4], [-6, 5], [-6, 6],
      [-1, 6], [-2, 6], [-3, 6], [-4, 6], [-5, 6],
      [6, -1], [6, -2], [6, -3], [6, -4], [6, -5], [6, -6],
      [1, -6], [2, -6], [3, -6], [4, -6], [5, -6],
      [-6, -1], [-6, -2], [-6, -3], [-6, -4], [-6, -5], [-6, -6],
      [-1, -6], [-2, -6], [-3, -6], [-4, -6], [-5, -6]
    ];
  }

  /**
   * Slot lists for each preset. Pure data: nothing here is placed or granted.
   *
   * Every template fits a Town Hall 1 city, like the starter layout: each slot is inside the
   * TH1 build radius (11.5), no 2x2 slot covers a road tile or another slot, and the only
   * roads past that radius are the spokes out to the gates. Metropolis used to run its grid
   * out to +/-14 (eight tiles beyond the perimeter wall, 39 of them out of Design mode's
   * reach) and put seven buildings on its own streets and four outside the radius.
   */
  _presetLayout(presetName) {
    if (presetName === 'metropolis') {
      const roads = [];
      // Spokes to the gates, then a grid at +/-7 that stops inside the radius (hypot(9,7) < 11.5).
      for (let t = -14; t <= 14; t++) roads.push([t, 0], [0, t]);
      for (let t = -9; t <= 9; t++) roads.push([t, -7], [t, 7], [-7, t], [7, t]);
      return {
        roads,
        townHall: [3, 3],
        slots: [
          ['police_station', -5, -2], ['police_station', 5, 5], ['police_station', -3, 10],
          ['petrol_pump', -2, 5], ['petrol_pump', 5, -2], ['petrol_pump', 10, 3],
          ['cash_mint', 2, -5], ['cash_mint', -10, 3],
          ['iron_foundry', -5, 5], ['iron_foundry', 3, -10],
          ['lumber_mill', -5, -5], ['lumber_mill', -10, -3],
          ['builder_hut', -2, -2], ['builder_hut', 2, 5], ['builder_hut', 10, -3],
          ['vehicle_lab', -3, -10], ['sniper_tower', 3, 10], ['sniper_tower', 5, -5],
          ['spike_trap', 0, -11], ['roadblock', 0, 11], ['roadblock', 11, 0]
        ]
      };
    }
    if (presetName === 'valley') {
      const s = this._valleyRoads ? this._valleyRoads() : [];
      return {
        roads: s,
        townHall: [0, -2],
        slots: [
          ['lumber_mill', 6, 2], ['iron_foundry', -6, 2], ['cash_mint', 2, 6],
          ['police_station', -4, -6], ['police_station', 5, -8],
          ['petrol_pump', 6, -4], ['petrol_pump', -8, -2],
          ['builder_hut', -2, 3], ['builder_hut', -5, 7],
          ['spike_trap', 2, -11], ['roadblock', 11, 2], ['roadblock', -2, 11]
        ]
      };
    }
    if (presetName === 'citadel' || presetName === 'default' || !presetName) {
      // Record the default city's layout without placing it.
      const roads = this._defaultRoadCoords();
      return {
        roads,
        townHall: [3, 3],
        slots: [
          ['police_station', -4, -3], ['police_station', 4, 8],
          ['petrol_pump', -3, 3], ['petrol_pump', 8, -3],
          ['lumber_mill', -8, -8], ['iron_foundry', -8, 8], ['iron_foundry', 8, 4],
          ['builder_hut', 4, -4], ['builder_hut', -4, 8],
          ['spike_trap', 0, -11], ['roadblock', 0, 11], ['roadblock', 11, 0]
        ]
      };
    }
    return null;
  }

  addMainGate(name, gx, gz, rotation) {
    const mesh = this.assetFactory.createMainGate(name, rotation);
    mesh.position.set(gx * this.tileSize, 0, gz * this.tileSize);

    // Shadows at the insertion point rather than 31 scattered per-mesh flags across 139 meshes.
    // Previously roofs, chimneys, pillars, trim and props cast nothing, so buildings read as
    // flat colour blocks with no self-shadowing.
    mesh.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });

    this.buildingGroup.add(mesh);

    const b = {
      id: `gate_${name.toLowerCase().replace(' ', '_')}`,
      type: 'main_gate',
      name: name,
      level: 1,
      gx,
      gz,
      rotation,
      hp: 800,
      maxHp: 800,
      mesh: mesh,
      isMainGate: true
    };
    this.buildings.push(b);
    return b;
  }

  /**
   * Single source of truth for turning a building type + level into a mesh.
   * Both addBuilding() and completeConstruction() route through here so a type can never
   * be placeable-but-not-upgradeable (or silently morph into a Town Hall on upgrade).
   * Returns null for unknown types - callers MUST handle null rather than substituting a mesh.
   */
  createMeshFor(type, level = 1) {
    const lvl = Math.max(1, Math.min(MAX_MESH_TIER, Math.round(level) || 1));
    const f = this.assetFactory;

    // Building types authored as standalone mesh modules take priority.
    const registered = MESH_FACTORIES[type];
    if (registered) return registered(f, lvl);


    switch (type) {
      case 'town_hall':     return f.createTownHall(lvl);
      case 'police_station':return f.createPoliceStation(lvl);
      case 'petrol_pump':   return f.createPetrolPump(lvl);
      case 'lumber_mill':   return f.createLumberMill(lvl);
      case 'iron_foundry':  return f.createIronFoundry(lvl);
      case 'cash_mint':     return f.createCashMint(lvl);
      case 'builder_hut':   return f.createBuilderHut(lvl);
      case 'big_storage':   return f.createBigStorage ? f.createBigStorage(lvl) : null;
      case 'spike_trap':    return f.createSpikeTrap(lvl);
      case 'roadblock':     return f.createRoadblock(lvl);
      case 'tree':          return f.createPineTree(lvl);
      case 'vehicle_lab':   return f.createVehicleLab ? f.createVehicleLab(lvl) : null;
      case 'weapons_lab':   return f.createWeaponsLab ? f.createWeaponsLab(lvl) : null;
      case 'sniper_tower':  return f.createSniperTower ? f.createSniperTower(lvl) : null;
      case 'tesla_coil':    return f.createTeslaCoil ? f.createTeslaCoil(lvl) : null;
      case 'laser_obelisk': return f.createLaserObelisk ? f.createLaserObelisk(lvl) : null;
      default:              return null;
    }
  }

  addBuilding(type, gx, gz, level = 1, opts = {}) {
    const def = this.catalog[type];
    if (!def) {
      console.error(`[BuildingManager] Unknown building type "${type}".`);
      return null;
    }

    // Loading a save and seeding the default city legitimately bypass the cap; every
    // player-facing path must not.
    if (!opts.skipCapCheck) {
      const gate = this.canPlace(type);
      if (!gate.ok) return null;
    }

    const lvl = Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.round(Number(level)) || 1));

    const maxHp = hpForLevel(type, lvl);
    if (maxHp === null) {
      console.error(`[BuildingManager] "${type}" has no usable maxHp; refusing to place it. ` +
        'A building with NaN HP can never be destroyed and makes 100% raid completion impossible.');
      return null;
    }

    const mesh = this.createMeshFor(type, lvl);
    if (!mesh) {
      console.error(`[BuildingManager] No mesh factory for building type "${type}".`);
      return null;
    }

    mesh.position.set(gx * this.tileSize, 0, gz * this.tileSize);

    // Shadows at the insertion point rather than scattered per-mesh flags (only 31 of 139
    // meshes set castShadow, so roofs, chimneys, pillars and props cast nothing).
    mesh.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });

    this.buildingGroup.add(mesh);

    const b = {
      // Stable and unique across writers: persisted by CityPersistence, and the MCP server mints
      // its ids with the same function (the old b_<ms>_<0..999> collided within a millisecond).
      id: newBuildingId(Date.now()),
      type,
      name: def.name,
      level: lvl,
      gx,
      gz,
      footprint: def.footprint || 1,
      role: def.role,
      hp: maxHp,
      maxHp,
      mesh,
      isDestroyed: false,
      isExplosive: !!def.blast,
      spawnsPolice: def.role === 'spawner',
      bubbleMesh: null
    };

    this._applyProduction(b);

    this.buildings.push(b);
    if (isChainBarrier(b)) this.refreshBarrierLinks(gx, gz);
    this._changed();
    return b;
  }

  // ---------------------------------------------------------------- barrier walls

  /**
   * Redraw the wall sections of every barrier on or next to tile (gx, gz). A barrier draws
   * the half-section to the midpoint with each linked neighbour (BarrierWalls, the same
   * links DestructionEngine collides against) as children of its own mesh, so razing a block
   * in a raid hides its halves with it: the gap the collision opens is the gap you see.
   */
  refreshBarrierLinks(gx, gz) {
    const index = standingBarrierIndex(this.buildings);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const b = index.get(`${gx + dx},${gz + dz}`);
        if (b) this._drawBarrierLinks(b, barrierLinksOf(b, index));
      }
    }
  }

  _drawBarrierLinks(b, links) {
    const mesh = b.mesh;
    if (!mesh) return;
    mesh.children.filter(c => c.userData && c.userData.isBarrierLink).forEach(c => mesh.remove(c));

    // Lay the block itself along its wall: the axis most of its links run on (ties keep it).
    const axes = new Map();
    for (const [, dx, dz] of links) {
      let a = Math.atan2(-dz, dx);                  // rotation.y that points local +x along (dx, dz)
      if (a < -1e-6) a += Math.PI;                  // a wall axis has no direction
      if (a >= Math.PI - 1e-6) a -= Math.PI;
      const key = Math.round(a * 1000);
      axes.set(key, (axes.get(key) || 0) + 1);
    }
    const ranked = [...axes.entries()].sort((p, q) => q[1] - p[1]);
    if (ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1])) {
      mesh.rotation.y = ranked[0][0] / 1000;
    }

    const rot = mesh.rotation.y;
    for (const [, dx, dz] of links) {
      const len = Math.hypot(dx, dz) * this.tileSize / 2;   // centre to the shared midpoint
      const piece = this._barrierLinkPiece(b.type, len);
      if (!piece) continue;
      piece.userData.isBarrierLink = true;
      // The piece runs along its local +x; express the world direction in the block's frame.
      piece.rotation.y = Math.atan2(-dz, dx) - rot;
      mesh.add(piece);
    }
  }

  /** One half wall-section for barrier `type`, running from the origin `len` metres along +x. */
  _barrierLinkPiece(type, len) {
    const M = this.assetFactory && this.assetFactory.materials;
    if (!M) return null;
    const cache = this._linkGeo || (this._linkGeo = new Map());
    const geo = (key, make) => {
      if (!cache.has(key)) cache.set(key, make());
      return cache.get(key);
    };
    const L = Math.round(len * 100) / 100;
    const part = (g, m, x, y, z = 0) => {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      o.receiveShadow = true;
      return o;
    };
    const group = new THREE.Group();
    group.name = 'barrier_link';

    if (type === 'spike_trap') {
      // A low spiked strip. Slightly thinner than the trap's own plate so the two never z-fight.
      group.add(part(geo(`spk-plate-${L}`, () => new THREE.BoxGeometry(L, 0.08, 1.3)), M.ironDark, L / 2, 0.04));
      const cone = geo('spk-cone', () => new THREE.ConeGeometry(0.12, 0.5, 6));
      for (let x = 1.5; x <= L - 0.2; x += 0.75) {
        group.add(part(cone, M.steel, x, 0.33, -0.35));
        group.add(part(cone, M.steel, x, 0.33, 0.35));
      }
      return group;
    }

    // Roadblock: a jersey-barrier section, a touch smaller than the block so it tucks inside it.
    group.add(part(geo(`rb-body-${L}`, () => new THREE.BoxGeometry(L, 1.0, 0.72)), M.concrete, L / 2, 0.5));
    group.add(part(geo(`rb-stripe-${L}`, () => new THREE.BoxGeometry(L, 0.32, 0.76)), M.hazardStripe, L / 2, 0.5));
    return group;
  }

  /** Production fields for `b` at its current level. One formula, one call site. */
  _applyProduction(b) {
    const def = this.catalog[b.type];
    if (!def || !def.produce) return;
    b.produceType = def.produce.type;
    // Crypto Vault: fills like any producer but can never be tapped - its contents are paid
    // out as raid loot only when the raider destroys it (DestructionEngine.destroyBuilding).
    b.raidOnly = !!def.produce.raidOnly;
    b.produceRate = produceRateFor(b.type, b.level);
    b.maxCapacity = produceCapacityFor(b.type, b.level);
    if (b.stored === undefined) b.stored = def.produce.seed || 0;
    b.stored = Math.min(b.stored, b.maxCapacity);
  }

  /**
   * Labour slots: one per standing Labour Hut, capped by the Town Hall (progression.labourFor).
   * There is no free labourer any more - with one, the first hut added nothing.
   */
  get totalBuilders() {
    const huts = this.buildings.filter(b => b.type === 'builder_hut' && !b.isDestroyed).length;
    return labourFor(huts, this.getTownHallLevel());
  }

  /** Labour slots the Town Hall would allow if enough huts were built. */
  get builderCap() {
    return buildersFor(this.getTownHallLevel());
  }

  get busyBuilders() {
    return this.activeBuildTasks.length;
  }

  get freeBuilders() {
    return Math.max(0, this.totalBuilders - this.busyBuilders);
  }

  /** Show or hide every floating collectible marker (resource bubbles, construction hammers). */
  setCollectiblesVisible(visible) {
    this.collectiblesHidden = !visible;
    this.buildings.forEach(b => {
      if (b.bubbleMesh) b.bubbleMesh.visible = visible;
      if (b.constructionMesh) b.constructionMesh.visible = visible;
    });
  }

  /** This city's row of the Town Hall ladder (builders, radius, police cap, gems). */
  townHallRow() {
    return townHallRow(this.getTownHallLevel());
  }

  getTownHallLevel() {
    const th = this.buildings.find(b => b.type === 'town_hall');
    return th ? (th.level || 1) : 1;
  }

  getBuildTime(type, targetLevel = 1) {
    return buildSecondsFor(type, targetLevel);
  }

  upgradeBuilding(building, onComplete = null) {
    if (!this.isInCity(building)) return { ok: false, reason: 'NOT_IN_CITY' };
    if (building.isUnderConstruction) {
      return { ok: false, reason: 'ALREADY_IN_PROGRESS' };
    }

    // Gates are not upgradeable. This rule used to live only in the inspector's render
    // branch, so any programmatic upgrade path silently produced a gate whose level, HP
    // and mesh disagreed.
    if (building.isMainGate || this.catalog[building.type]?.upgradeable === false) {
      return { ok: false, reason: 'NOT_UPGRADEABLE' };
    }

    const nextLvl = (building.level || 1) + 1;
    const thLvl = this.getTownHallLevel();

    if (building.type === 'town_hall') {
      if (nextLvl > MAX_TOWN_HALL_LEVEL) return { ok: false, reason: 'MAX_TOWN_HALL' };
    } else {
      if (nextLvl > MAX_BUILDING_LEVEL) return { ok: false, reason: 'MAX_LEVEL' };
      if (nextLvl > thLvl) {
        return { ok: false, reason: 'TOWN_HALL_CAP', requiredTH: nextLvl };
      }
    }

    if (this.freeBuilders <= 0) {
      return { ok: false, reason: 'NO_FREE_BUILDERS' };
    }

    const cost = this.getUpgradeCost(building);
    if (!this.economy.deduct(cost)) {
      return { ok: false, reason: 'INSUFFICIENT_RESOURCES' };
    }

    const duration = this.getBuildTime(building.type, nextLvl);
    const task = this._startTask(building, nextLvl, duration, duration, Date.now() + duration * 1000, onComplete);

    if (this.onBuildersChanged) this.onBuildersChanged();
    return { ok: true, duration, task };
  }

  /**
   * Create the live task record + construction hammer. `endsAt` is an absolute
   * wall-clock deadline so a multi-hour job survives a reload with the tab closed.
   */
  _startTask(building, targetLevel, remaining, total, endsAt, onComplete = null) {
    const task = {
      id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      building,
      targetLevel,
      remaining,
      total,
      endsAt,
      onComplete
    };

    this.activeBuildTasks.push(task);
    building.isUnderConstruction = true;
    building.buildTask = task;

    if (this.assetFactory && this.assetFactory.createConstructionHammer) {
      const hammer = this.assetFactory.createConstructionHammer();
      hammer.position.set(building.gx * this.tileSize, 5.8, building.gz * this.tileSize);
      hammer.visible = !this.collectiblesHidden;
      this.buildingGroup.add(hammer);
      building.constructionMesh = hammer;
    }

    return task;
  }

  /** Re-arm a job read back from a save. Charges nothing - it was paid for already. */
  resumeBuildTask(building, targetLevel, remaining, total, endsAt) {
    if (!this.isInCity(building) || building.isUnderConstruction) return null;
    this._startTask(building, targetLevel, Math.max(0, remaining), Math.max(1, total), endsAt);
    if (this.onBuildersChanged) this.onBuildersChanged();
    return building.buildTask;
  }

  /**
   * Drop any in-flight job for `building` and clean up its hammer. Without this,
   * stowing or presetting mid-upgrade left the task ticking on a detached building,
   * and completeConstruction later re-parented an orphan mesh that nothing could
   * select, collide with or clear.
   */
  cancelTasksFor(building, { refund = true } = {}) {
    let cancelled = 0;
    for (let i = this.activeBuildTasks.length - 1; i >= 0; i--) {
      if (this.activeBuildTasks[i].building !== building) continue;
      this.activeBuildTasks.splice(i, 1);
      cancelled++;
    }
    if (building.constructionMesh) {
      this._discardMesh(building.constructionMesh);
      building.constructionMesh = null;
    }
    if (cancelled && refund && this.economy) {
      this.economy.refund(this.getUpgradeCost(building));
    }
    building.isUnderConstruction = false;
    building.buildTask = null;
    if (cancelled && this.onBuildersChanged) this.onBuildersChanged();
    return cancelled;
  }

  completeConstruction(task) {
    const building = task.building;
    const nextLvl = task.targetLevel;

    building.level = nextLvl;
    const oldMesh = building.mesh;
    const worldPos = oldMesh.position.clone();
    const worldRot = oldMesh.rotation.y;

    this.buildingGroup.remove(oldMesh);
    if (building.constructionMesh) {
      this._discardMesh(building.constructionMesh);
      building.constructionMesh = null;
    }

    // Rebuild the mesh at the new tier. Previously any type without an explicit branch fell
    // through to createTownHall(), so upgrading a petrol pump literally turned it into a
    // courthouse and dropped its gameplay userData flags. Now an unknown type keeps its
    // existing mesh and only its stats improve.
    let newMesh = this.createMeshFor(building.type, nextLvl);
    if (!newMesh) {
      console.warn(`[BuildingManager] No tiered mesh for "${building.type}" - keeping current model.`);
      newMesh = building.mesh;
    }

    newMesh.position.copy(worldPos);
    newMesh.rotation.y = worldRot;
    this.buildingGroup.add(newMesh);
    building.mesh = newMesh;
    if (newMesh !== oldMesh) this._disposeMesh(oldMesh);

    const maxHp = hpForLevel(building.type, nextLvl);
    if (maxHp !== null) {
      building.maxHp = maxHp;
      building.hp = maxHp;
    }
    this._applyProduction(building);

    building.isUnderConstruction = false;
    building.buildTask = null;
    // The upgraded block is a fresh mesh: give it back its wall sections.
    if (isChainBarrier(building)) this.refreshBarrierLinks(building.gx, building.gz);

    if (task.onComplete) task.onComplete(building);
    if (this.onConstructionFinished) this.onConstructionFinished(building);
    if (this.onBuildersChanged) this.onBuildersChanged();
    this._changed();
  }

  /** Gems it would cost right now to finish `building`'s job, or 0 if it has none. */
  gemCostToFinish(building) {
    const task = this.activeBuildTasks.find(t => t.building === building);
    return task ? gemsToFinish(task.remaining) : 0;
  }

  /**
   * The player-facing instant finish. Costs gems scaled to the time left - it used to be
   * free and unlimited, which made every build timer (and the whole Labour economy)
   * advisory. finishConstructionInstantly() below stays as the uncharged primitive.
   */
  finishWithGems(building) {
    if (!this.isInCity(building)) return { ok: false, reason: 'NOT_IN_CITY' };
    const task = this.activeBuildTasks.find(t => t.building === building);
    if (!task) return { ok: false, reason: 'NOTHING_TO_FINISH' };
    const gems = gemsToFinish(task.remaining);
    if (!this.economy || !this.economy.spendGems(gems)) {
      return { ok: false, reason: 'NOT_ENOUGH_GEMS', gems, have: this.economy ? this.economy.gems : 0 };
    }
    this.finishConstructionInstantly(building);
    if (this.onBuildersChanged) this.onBuildersChanged();
    return { ok: true, gems };
  }

  finishConstructionInstantly(building) {
    const task = this.activeBuildTasks.find(t => t.building === building);
    if (task) {
      const idx = this.activeBuildTasks.indexOf(task);
      if (idx >= 0) this.activeBuildTasks.splice(idx, 1);
      this.completeConstruction(task);
      return true;
    }
    return false;
  }

  getUpgradeCost(building) {
    return costForLevel(building.type, (building.level || 1) + 1);
  }

  // Collect harvestable resources from factory (Tap-to-collect Clash of Clans style)
  collectBuilding(building) {
    if (!building || !building.produceType || building.raidOnly || (building.stored || 0) <= 0) return null;
    // A replaced building's output already moved to its successor (applyPreset).
    if (!this.isInCity(building)) return null;

    const amount = Math.floor(building.stored);
    const type = building.produceType;
    // What actually landed in the bank, per resource ('all' pays three at once).
    const payout = this.economy.collectFromBuilding(type, amount);

    building.stored = 0;

    // Remove 3D floating bubble
    if (building.bubbleMesh) {
      this._discardMesh(building.bubbleMesh);
      building.bubbleMesh = null;
    }
    // Save the emptied producer: stored output accrues offline from the save, so a stale save
    // would hand this haul out a second time. (The bank write above flushes the city save in
    // the same tick - main.js wraps economy.onUpdate - so there is no window for a crash.)
    this._changed();

    return {
      type,
      amount,
      payout,
      building
    };
  }

  /**
   * A raid just paid out: every Crypto Vault the raider cracked open (DestructionEngine
   * marks them) is now empty. Called by AttackManager right after the loot is banked.
   */
  emptyCrackedVaults() {
    let emptied = 0;
    this.buildings.forEach(b => {
      if (!b.vaultCracked) return;
      b.stored = 0;
      b.vaultCracked = false;
      emptied++;
    });
    if (emptied) this._changed();
    return emptied;
  }

  /** Stowed-building slots across every standing Big Storage Depot (progression slotsPerLevel). */
  storageCapacity() {
    return this.buildings
      .filter(b => !b.isDestroyed && BUILDING_DEFS[b.type] && BUILDING_DEFS[b.type].storage &&
        BUILDING_DEFS[b.type].storage.kind === 'buildings')
      .reduce((sum, b) => sum + storageSlotsFor(b.type, b.level || 1), 0);
  }

  /** Buildings currently held in storage. */
  storageUsed() {
    return this.economy && this.economy.getStowedTotal ? this.economy.getStowedTotal() : 0;
  }

  /**
   * May `building` be lifted into storage right now? Needs a depot with a free slot. (A layout
   * preset is the one exception: it parks whatever its slots cannot hold, even over capacity,
   * and hand-stowing stays blocked until enough of that is placed again.)
   */
  canStow(building) {
    if (!this.isInCity(building)) return { ok: false, reason: 'NOT_IN_CITY' };
    if (building.isMainGate || building.type === 'town_hall') return { ok: false, reason: 'NOT_STOWABLE' };
    const capacity = this.storageCapacity();
    const used = this.storageUsed();
    if (capacity <= 0) return { ok: false, reason: 'NO_DEPOT', used, capacity };
    if (used >= capacity) return { ok: false, reason: 'STORAGE_FULL', used, capacity };
    return { ok: true, used, capacity };
  }

  // Stow an existing placed building back into player's Construction Inventory
  stowBuilding(building) {
    if (!this.canStow(building).ok) return false;
    // Refund an in-flight upgrade first, then keep the building's level (and what it holds) with it.
    this.cancelTasksFor(building);
    this._sendToStorage(building, building.level || 1, building.stored);
    this.removeBuilding(building);
    return true;
  }

  /**
   * Put one building into the Construction Inventory at `level`. Both stow paths - the
   * inspector's button and a layout preset's leftovers - come through here. Output that was
   * ready to tap is banked on the way. A Crypto Vault's sealed cash cannot be tapped, so it
   * travels into storage with the vault and is sealed back inside when the vault is placed
   * again (EconomyManager.takeStowed). The button used to skip both, deleting a mill's full
   * store or a vault's contents; the preset path dropped the vault's.
   */
  _sendToStorage(b, level, stored) {
    const held = Math.max(0, Math.floor(Number(stored) || 0));
    if (b.produceType && !b.raidOnly && held > 0) {
      this.economy.collectFromBuilding(b.produceType, held);
    }
    this.economy.stowLevel(b.type, level, b.produceType && b.raidOnly ? held : 0);
    this.economy.addToInventory(b.type, 1);
  }

  removeBuilding(building) {
    const idx = this.buildings.indexOf(building);
    if (idx !== -1) {
      this.cancelTasksFor(building);
      if (building.mesh) {
        this._discardMesh(building.mesh);
      }
      if (building.bubbleMesh) {
        this._discardMesh(building.bubbleMesh);
        building.bubbleMesh = null;
      }
      this.buildings.splice(idx, 1);
      if (isChainBarrier(building)) this.refreshBarrierLinks(building.gx, building.gz);
      this._changed();
    }
  }

  clearAll() {
    const keep = this._sharedGpu();
    this.buildings.forEach(b => {
      if (b.mesh) this._discardMesh(b.mesh, keep);
      if (b.bubbleMesh) this._discardMesh(b.bubbleMesh, keep);
      if (b.constructionMesh) this._discardMesh(b.constructionMesh, keep);
      b.isUnderConstruction = false;
      b.buildTask = null;
    });
    this.activeBuildTasks = [];
    this.buildings = [];
    this.roadNetwork.clear();
    if (this.onBuildersChanged) this.onBuildersChanged();
  }

  /**
   * GPU resources every building shares, which a discarded mesh must leave alone: the
   * AssetFactory palette, its geometry cache and the barrier-link geometry cache.
   */
  _sharedGpu() {
    const f = this.assetFactory;
    return new Set([
      ...(f && f.materials ? Object.values(f.materials) : []),
      ...(f && f._geoCache ? f._geoCache.values() : []),
      ...(this._linkGeo ? this._linkGeo.values() : [])
    ]);
  }

  /**
   * Free what a mesh that is leaving for good holds on the GPU. Every create* call builds its
   * geometries fresh (the new meshes clone their glowing materials, a collect bubble draws its
   * own canvas texture), so only taking them out of the scene leaked ~1250 geometries and 10
   * textures per preset apply + undo, and a texture per collect.
   */
  _disposeMesh(root, keep = this._sharedGpu()) {
    if (!root) return;
    root.traverse(o => {
      if (o.geometry && !o.isSprite && !keep.has(o.geometry)) o.geometry.dispose();   // Sprites share one quad
      const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of mats) {
        if (keep.has(m)) continue;
        if (m.map) m.map.dispose();
        m.dispose();
      }
    });
  }

  /** Take a building, bubble or hammer mesh out of the scene for good (see _disposeMesh). */
  _discardMesh(root, keep) {
    if (!root) return;
    this.buildingGroup.remove(root);
    this._disposeMesh(root, keep);
  }

  getMainGates() {
    return this.buildings.filter(b => b.isMainGate);
  }

  /** The fixed Main Gate that belongs on tile (gx, gz), or null. */
  fixedGateAt(gx, gz) {
    return MAIN_GATES.find(g => g.gx === gx && g.gz === gz) || null;
  }

  /**
   * Make sure the city has what every city must: the three fixed Main Gates and a Town Hall.
   * The game never writes a save without them, but a damaged or hand-edited one can lack them,
   * and a city with no gate cannot be raided. The Town Hall comes back at level 1 on its usual
   * tile (or the nearest free one). Returns the names of what had to be added.
   */
  ensureCityCore() {
    const added = [];
    for (const g of MAIN_GATES) {
      if (this.getMainGates().some(b => b.gx === g.gx && b.gz === g.gz)) continue;
      if (this.addMainGate(g.name, g.gx, g.gz, g.rot)) added.push(g.name);
    }
    if (!this.buildings.some(b => b.type === 'town_hall')) {
      const fp = this.footprintOf('town_hall');
      const radius = cityRadiusFor(1);
      let spot = null;
      for (let r = 0; r <= Math.ceil(radius) && !spot; r++) {
        for (let dx = -r; dx <= r && !spot; dx++) {
          for (let dz = -r; dz <= r && !spot; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            const gx = 3 + dx, gz = 3 + dz;
            if (Math.hypot(gx, gz) <= radius && !this.isFootprintBlocked(fp, gx, gz)) spot = { gx, gz };
          }
        }
      }
      if (spot && this.addBuilding('town_hall', spot.gx, spot.gz, 1, { skipCapCheck: true })) added.push('Town Hall');
    }
    if (added.length) this._changed();
    return added;
  }

  /** Side of the square a structure covers, in tiles (progression footprint; gates use theirs). */
  footprintOf(typeOrBuilding) {
    const type = typeof typeOrBuilding === 'string' ? typeOrBuilding : typeOrBuilding && typeOrBuilding.type;
    const def = this.catalog[type];
    return Math.max(1, (def && def.footprint) || 1);
  }

  /**
   * Would a `footprint`-sized structure centred on (gx, gz) overlap an existing one?
   * Footprints are squares centred on their tile, so two overlap when their centres are
   * closer than half the sum of their sides on BOTH axes. Two 1-tile structures only clash
   * on the same tile, which is what lets roadblocks and spike traps chain into a solid wall.
   * Trees are scenery and never block. (GridSystem's placement and drop checks call this.)
   */
  isFootprintBlocked(footprint, gx, gz, ignore = null) {
    return this.buildings.some(o => {
      if (o === ignore || o.isDestroyed || o.type === 'tree') return false;
      const reach = (footprint + this.footprintOf(o)) / 2;
      return Math.abs(o.gx - gx) < reach && Math.abs(o.gz - gz) < reach;
    });
  }

  getPoliceStations() {
    return this.buildings.filter(b => b.spawnsPolice && !b.isDestroyed);
  }

  /**
   * Bring every standing producer's output up to `nowMs` on the wall clock and return the
   * seconds credited. A backgrounded tab throttles rAF (and main.js clamps delta to 0.1s), so
   * a per-frame delta paused every producer while the tab was hidden. And browsers stop rAF
   * in a hidden tab altogether: serializeCity calls this too, or a tab closed after hours in
   * the background saved its pre-hide output stamped with the close time, and restoreCity
   * never credited those hours. `fallbackSecs` is credited on the very first call.
   */
  advanceProduction(nowMs = Date.now(), fallbackSecs = 0) {
    const secs = this._lastProduceAt ? Math.max(0, (nowMs - this._lastProduceAt) / 1000) : fallbackSecs;
    // Only ever forward: a clock stamp moved back would credit the same stretch twice.
    if (!this._lastProduceAt || nowMs > this._lastProduceAt) this._lastProduceAt = nowMs;
    if (secs > 0) {
      for (const b of this.buildings) {
        if (b.produceType && !b.isDestroyed) b.stored = storedAfter(b.type, b.level, b.stored, secs);
      }
    }
    return secs;
  }

  update(delta, elapsed) {
    // 1. Process active builder tasks (construction/upgrade timers & hammer animation)
    for (let i = this.activeBuildTasks.length - 1; i >= 0; i--) {
      const task = this.activeBuildTasks[i];
      // A job whose building has left the city has nothing to finish (completing it used to
      // drop an orphan mesh onto the map). Refunded like stowing mid-upgrade.
      if (!this.isInCity(task.building)) {
        this.cancelTasksFor(task.building);
        continue;
      }
      // Deadline-driven, not delta-accumulated: a backgrounded tab throttles rAF, so a
      // countdown that only subtracts delta would run slower than real time.
      task.remaining = task.endsAt
        ? Math.max(0, (task.endsAt - Date.now()) / 1000)
        : task.remaining - delta;

      if (task.building.constructionMesh) {
        task.building.constructionMesh.rotation.y += delta * 1.6;
        task.building.constructionMesh.rotation.z = Math.sin(elapsed * 9) * 0.45;
        task.building.constructionMesh.position.y = 5.8 + Math.sin(elapsed * 4) * 0.25;
      }

      // Never finish a job mid-raid: completeConstruction swaps in a fresh visible mesh,
      // which resurrected a building the raider had just destroyed as an uncollidable,
      // unkillable ghost. It completes the moment the city is back in builder mode.
      if (task.remaining <= 0 && !this.collectiblesHidden) {
        // Remove the task first: completeConstruction fires onConstructionFinished, which
        // re-renders the inspector - and with the task still listed it showed 'ALL LABOURS
        // BUSY' and a disabled Upgrade button although this labourer was now free.
        this.activeBuildTasks.splice(i, 1);
        this.completeConstruction(task);
      }
    }

    // Production runs on the wall clock, like the build jobs above (see advanceProduction).
    this.advanceProduction(Date.now(), delta);

    // 2. Run any mesh animation callbacks (e.g. spinning sawmill blade, flashing precinct beacons)
    this.buildings.forEach(b => {
      if (b.mesh && b.mesh.userData && b.mesh.userData.animator) {
        b.mesh.userData.animator(delta, elapsed);
      }

      // 3. Resource Factory Internal Production & Floating 3D Collect Bubble
      if (b.produceType && !b.isDestroyed) {
        // A vault cannot be tapped, so it never shows a collect bubble.
        if (b.raidOnly) {
          if (b.bubbleMesh) {
            this._discardMesh(b.bubbleMesh);
            b.bubbleMesh = null;
          }
          return;
        }

        // If harvestable amount >= 12, spawn/animate floating collect bubble
        if (b.stored >= 12) {
          if (!b.bubbleMesh) {
            const bubble = this.assetFactory.createResourceBubble(b.produceType);
            bubble.position.set(b.gx * this.tileSize, 5.0, b.gz * this.tileSize);
            bubble.userData.parentBuilding = b;
            bubble.visible = !this.collectiblesHidden;   // stays hidden if a raid is in progress
            this.buildingGroup.add(bubble);
            b.bubbleMesh = bubble;
          }

          // Gentle sine-wave bobbing up and down + subtle pulse
          const bobOffset = Math.sin(elapsed * 3.5 + b.gx * 0.8) * 0.4;
          b.bubbleMesh.position.y = 5.2 + bobOffset;
          const scale = 4.2 + Math.sin(elapsed * 3.5 + b.gx * 0.8) * 0.2;
          b.bubbleMesh.scale.set(scale, scale, 1.0);
        } else if (b.bubbleMesh && b.stored < 12) {
          this._discardMesh(b.bubbleMesh);
          b.bubbleMesh = null;
        }
      }
    });
  }
}
