import {
  BUILDING_DEFS, MAX_BUILDING_LEVEL, SPARE_LIFE, STARTING_GEMS,
  gemsToFinish, producePayout, produceCapacityFor, spareLifeCostFor
} from '../data/progression.js';

/**
 * EconomyManager - Bank (Cash, Iron, Wood, Gems), Construction Inventory and
 * tap-to-collect harvesting.
 *
 * Gems are the instant-finish currency. Build jobs run in real time (up to 8 hours at
 * Town Hall 12), so gems are the only way to skip a wait - which is why FINISH NOW is
 * no longer free.
 */
export class EconomyManager {
  static get SAVE_KEY() { return 'city_siege_eco'; }
  static get SAVE_VERSION() { return 2; }
  static get MAX_SPARE_LIVES() { return SPARE_LIFE.max; }   // plus AttackManager's 3 base lives
  /** Price of one spare life for a Town Hall `th` city (progression.spareLifeCostFor). */
  static lifeCostFor(th) { return spareLifeCostFor(th); }

  constructor() {
    this.cash = 1500;
    this.iron = 800;
    this.wood = 1000;
    this.gems = STARTING_GEMS;

    // Construction Inventory: counts of purchased items ready to be placed on the map
    // Sized to the Town Hall 1 limits on top of the starter city: 105 laid + 25 = 130 road
    // tiles, 1 placed + 1 = 2 spike traps. Anything more was a gift the player could not use.
    this.inventory = {
      road: 25,
      lumber_mill: 1,
      spike_trap: 1,
      roadblock: 2,
      tree: 3
    };

    // Spare lives for the battle buggy. Bought at the Vehicle Tuning Lab, spent when busted.
    this.vehicleLives = 0;
    // Levels of buildings lifted off the map, per type (highest first). Inventory counts
    // say HOW MANY you hold; this says what level each one comes back at, so stowing a
    // level-7 laser obelisk and placing it again does not reset it to level 1.
    this.stowedLevels = {};
    // How many of inventory[type] are buildings lifted off the map (as opposed to fresh
    // shop purchases). Their total is what the Big Storage Depots have to hold.
    this.stowedCounts = {};
    // Cash sealed inside stowed Crypto Vaults, per type (largest first). A vault can never be
    // tapped - its contents only pay out when a raider cracks it - so stowing one carries the
    // sealed amount into storage and placing it again seals it back inside.
    this.stowedSealed = {};
    // Bumped by every save(), i.e. by every change to the bank, inventory, storage or gems. A
    // layout undo reads it to tell "nothing happened since" from changes that cancelled out
    // (collect 500 wood, then spend 500 wood in the garage).
    this.changeCount = 0;
    this.onUpdate = null;
    this.onInventoryUpdate = null;
    // NOTE: the starter inventory above is the FIRST-RUN default only. It used to be
    // re-applied after load() whenever the road key was missing, and consumeFromInventory
    // deletes a key at zero - so spending the last road tile handed out 35 free roads on
    // every reload. Defaults are never topped up post-load now.
    this.load();
  }

  // No passive live ticking into bank - resources accumulate inside factories!
  update(delta) {
    // Empty on purpose: Player must manually tap factories/bubbles to harvest!
  }

  getResources() {
    return {
      cash: Math.floor(this.cash),
      iron: Math.floor(this.iron),
      wood: Math.floor(this.wood)
    };
  }

  // --- Manual Tap-to-Collect Harvesting ---
  /**
   * Bank `amount` units of a producer's output. What a unit is worth per resource is
   * progression.producePayout's call (the Antimatter Collider's 'all' pays cash, iron AND
   * wood); this used to branch on wood/iron and dump everything else, 'all' included, into
   * cash. Returns the { cash, iron, wood } actually credited.
   */
  collectFromBuilding(type, amount) {
    const pay = producePayout(type, amount);
    if (pay.cash + pay.iron + pay.wood <= 0) return pay;

    this.cash += pay.cash;
    this.iron += pay.iron;
    this.wood += pay.wood;

    this.save();
    if (this.onUpdate) {
      this.onUpdate(this.getResources());
    }
    return pay;
  }

  // --- Construction Inventory Management ---
  addToInventory(type, count = 1) {
    this.inventory[type] = (this.inventory[type] || 0) + count;
    this.save();
    if (this.onInventoryUpdate) {
      this.onInventoryUpdate(this.inventory);
    }
  }

  /**
   * Take up to `count` fresh purchases of `type` out of the inventory - never a stowed
   * building, which carries a level and a storage slot. Returns how many were taken; pricing
   * any refund is the caller's job.
   */
  takeFreshFromInventory(type, count) {
    const fresh = Math.max(0, (this.inventory[type] || 0) - (this.stowedCounts[type] || 0));
    const n = Math.max(0, Math.min(fresh, Math.floor(Number(count) || 0)));
    if (!n) return 0;
    this.inventory[type] -= n;
    this.save();
    if (this.onInventoryUpdate) this.onInventoryUpdate(this.inventory);
    return n;
  }

  consumeFromInventory(type) {
    if ((this.inventory[type] || 0) > 0) {
      this.inventory[type]--;
      // Deliberately keep the zero entry: deleting it made "have I ever owned one of
      // these" indistinguishable from "this is a fresh save".
      this.save();
      if (this.onInventoryUpdate) {
        this.onInventoryUpdate(this.inventory);
      }
      return true;
    }
    return false;
  }

  getInventoryCount(type) {
    return this.inventory[type] || 0;
  }

  getTotalInventoryCount() {
    return Object.values(this.inventory).reduce((sum, c) => sum + (c || 0), 0);
  }

  canAfford(cost) {
    return (
      this.cash >= (cost.cash || 0) &&
      this.iron >= (cost.iron || 0) &&
      this.wood >= (cost.wood || 0)
    );
  }

  deduct(cost) {
    if (!this.canAfford(cost)) return false;
    this.cash -= (cost.cash || 0);
    this.iron -= (cost.iron || 0);
    this.wood -= (cost.wood || 0);
    this.save();
    if (this.onUpdate) {
      this.onUpdate(this.getResources());
    }
    return true;
  }

  rewardLoot(loot) {
    this.cash += (loot.cash || 0);
    this.iron += (loot.iron || 0);
    this.wood += (loot.wood || 0);
    this.save();
    if (this.onUpdate) {
      this.onUpdate(this.getResources());
    }
  }

  /** Stock one spare life, priced for the Town Hall `th` city it will raid. */
  buyVehicleLife(th) {
    if (this.vehicleLives >= EconomyManager.MAX_SPARE_LIVES) return { ok: false, reason: 'max' };
    const cost = EconomyManager.lifeCostFor(th);
    if (!this.deduct(cost)) return { ok: false, reason: 'cost', cost };
    this.vehicleLives++;
    this.save();
    return { ok: true, lives: this.vehicleLives, cost };
  }

  consumeVehicleLife() {
    if (this.vehicleLives <= 0) return false;
    this.vehicleLives--;
    this.save();
    return true;
  }

  /**
   * A building is going into storage: count it and remember its level. `sealed` is what a
   * Crypto Vault held (tappable output is banked by the caller before it gets here).
   */
  stowLevel(type, level, sealed = 0) {
    const L = Math.max(1, Math.round(Number(level)) || 1);
    this.stowedCounts[type] = (this.stowedCounts[type] || 0) + 1;
    if (L > 1) {
      (this.stowedLevels[type] = this.stowedLevels[type] || []).push(L);
      this.stowedLevels[type].sort((a, b) => b - a);
    }
    const S = Math.floor(Number(sealed) || 0);
    if (S > 0) {
      (this.stowedSealed[type] = this.stowedSealed[type] || []).push(S);
      this.stowedSealed[type].sort((a, b) => b - a);
    }
    this.save();
  }

  /**
   * One `type` is being placed from the inventory. Stowed buildings come out first, freeing
   * their storage slot: the highest level and the largest sealed amount together, so every
   * amount fits the capacity it comes back at (the k-th largest amount was held by one of
   * the k highest-level vaults). Returns { fromStorage, level, sealed }; a fresh purchase is
   * { fromStorage: false, level: 1, sealed: 0 }.
   */
  takeStowed(type) {
    const fromStorage = (this.stowedCounts[type] || 0) > 0;
    if (fromStorage) {
      this.stowedCounts[type]--;
      if (!this.stowedCounts[type]) delete this.stowedCounts[type];
    }
    const take = (map) => {
      const list = map[type];
      if (!fromStorage || !list || !list.length) return 0;
      const v = list.shift();
      if (!list.length) delete map[type];
      return v;
    };
    const level = take(this.stowedLevels) || 1;
    const sealed = take(this.stowedSealed);
    this.save();
    return { fromStorage, level, sealed };
  }

  /** takeStowed(type).level - the level the next placed `type` comes back at. */
  takeStowedLevel(type) {
    return this.takeStowed(type).level;
  }

  /** Buildings currently held in storage (what the Big Storage Depots must hold). */
  getStowedTotal() {
    return Object.values(this.stowedCounts).reduce((sum, n) => sum + (n || 0), 0);
  }

  peekStowedLevel(type) {
    const list = this.stowedLevels[type];
    return list && list.length ? list[0] : 1;
  }

  /** Give resources back (a cancelled upgrade). Never goes through deduct(). */
  refund(cost) {
    if (!cost) return;
    this.cash += Math.max(0, Number(cost.cash) || 0);
    this.iron += Math.max(0, Number(cost.iron) || 0);
    this.wood += Math.max(0, Number(cost.wood) || 0);
    this.save();
    if (this.onUpdate) this.onUpdate(this.getResources());
  }

  /**
   * Everything a layout preset can move - the bank (its refunds and banked output), the
   * inventory and what sits in storage - as a deep copy. Gems and spare lives are never touched
   * by a preset, so they are left out and an undo cannot roll them back.
   */
  snapshotHoldings() {
    const copy = (o) => JSON.parse(JSON.stringify(o || {}));
    return {
      cash: this.cash,
      iron: this.iron,
      wood: this.wood,
      inventory: copy(this.inventory),
      stowedLevels: copy(this.stowedLevels),
      stowedCounts: copy(this.stowedCounts),
      stowedSealed: copy(this.stowedSealed)
    };
  }

  /** Put back what snapshotHoldings() recorded (undoing a layout preset). */
  restoreHoldings(h) {
    if (!h) return;
    const copy = (o) => JSON.parse(JSON.stringify(o || {}));
    this.cash = h.cash;
    this.iron = h.iron;
    this.wood = h.wood;
    this.inventory = copy(h.inventory);
    this.stowedLevels = copy(h.stowedLevels);
    this.stowedCounts = copy(h.stowedCounts);
    this.stowedSealed = copy(h.stowedSealed);
    this.save();
    if (this.onUpdate) this.onUpdate(this.getResources());
    if (this.onInventoryUpdate) this.onInventoryUpdate(this.inventory);
  }

  // --- Gems: the instant-finish currency ---

  gemCostToFinish(remainingSeconds) {
    return gemsToFinish(remainingSeconds);
  }

  canAffordGems(n) {
    return this.gems >= Math.max(0, Math.ceil(Number(n) || 0));
  }

  spendGems(n) {
    const cost = Math.max(0, Math.ceil(Number(n) || 0));
    if (this.gems < cost) return false;
    this.gems -= cost;
    this.save();
    if (this.onUpdate) this.onUpdate(this.getResources());
    return true;
  }

  addGems(n) {
    const gain = Math.max(0, Math.ceil(Number(n) || 0));
    if (!gain) return;
    this.gems += gain;
    this.save();
    if (this.onUpdate) this.onUpdate(this.getResources());
  }

  save() {
    this.changeCount++;
    try {
      const state = {
        v: EconomyManager.SAVE_VERSION,
        cash: this.cash,
        iron: this.iron,
        wood: this.wood,
        gems: this.gems,
        inventory: this.inventory,
        stowedLevels: this.stowedLevels,
        stowedCounts: this.stowedCounts,
        stowedSealed: this.stowedSealed,
        vehicleLives: this.vehicleLives
      };
      localStorage.setItem(EconomyManager.SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      // ignore storage quota
    }
  }

  /**
   * Read the bank back defensively. Everything is coerced and range-checked: an
   * unvalidated string in one of these fields compounds through `+=` into a string
   * ("3" + 1 === "31") and silently corrupts the save from then on.
   */
  load() {
    let parsed = null;
    let saved = null;
    try {
      saved = localStorage.getItem(EconomyManager.SAVE_KEY);
      if (!saved) return;
      parsed = JSON.parse(saved);
    } catch (e) {
      // The first save() after boot overwrites the key with the starter bank, so park the
      // unreadable blob under a .bak key first (as CityPersistence and GarageManager do).
      // Only claiming to keep it lost it on the very first tap.
      const bak = EconomyManager.SAVE_KEY + '.bak';
      try {
        if (saved) localStorage.setItem(bak, saved);
      } catch (_) { /* quota */ }
      console.error('[economy] save was unreadable; starting from the starter bank. ' +
        'The unreadable save was kept at ' + bak + '.');
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;

    const money = (v, fallback) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : fallback;
    };

    this.cash = money(parsed.cash, this.cash);
    this.iron = money(parsed.iron, this.iron);
    this.wood = money(parsed.wood, this.wood);
    this.gems = money(parsed.gems, this.gems);
    this.vehicleLives = Math.max(0, Math.min(
      EconomyManager.MAX_SPARE_LIVES,
      Math.round(Number(parsed.vehicleLives)) || 0
    ));

    if (parsed.inventory && typeof parsed.inventory === 'object') {
      // Rebuild against the catalog rather than trusting the blob: keys for types that
      // no longer exist stay invisible in the UI but still count toward totals.
      const clean = {};
      for (const type of Object.keys(BUILDING_DEFS)) {
        const raw = Math.round(Number(parsed.inventory[type]));
        if (Number.isFinite(raw) && raw > 0) clean[type] = raw;
        else if (parsed.inventory[type] !== undefined) clean[type] = 0;
      }
      this.inventory = clean;
    }

    // Stowed levels: integers 2..12, never more entries than the inventory actually holds.
    this.stowedLevels = {};
    if (parsed.stowedLevels && typeof parsed.stowedLevels === 'object') {
      for (const type of Object.keys(this.inventory)) {
        const raw = parsed.stowedLevels[type];
        if (!Array.isArray(raw)) continue;
        const list = raw.map(v => Math.round(Number(v)))
          .filter(v => Number.isFinite(v) && v >= 2 && v <= 12)
          .sort((a, b) => b - a)
          .slice(0, this.inventory[type] || 0);
        if (list.length) this.stowedLevels[type] = list;
      }
    }

    // Stowed counts: 0..inventory held, and never fewer than the levels remembered above
    // (a save from before counts existed only knows its level-2+ stowed buildings).
    this.stowedCounts = {};
    const rawCounts = parsed.stowedCounts && typeof parsed.stowedCounts === 'object' ? parsed.stowedCounts : {};
    for (const type of Object.keys(this.inventory)) {
      const held = this.inventory[type] || 0;
      const known = (this.stowedLevels[type] || []).length;
      const raw = Math.round(Number(rawCounts[type]));
      const n = Math.max(known, Math.min(held, Number.isFinite(raw) && raw > 0 ? raw : 0));
      if (n > 0) this.stowedCounts[type] = n;
    }

    // Sealed vault cash: only for raid-only producers, whole positive amounts no larger than a
    // top-level vault holds, and never more entries than stowed buildings of that type.
    this.stowedSealed = {};
    if (parsed.stowedSealed && typeof parsed.stowedSealed === 'object') {
      for (const type of Object.keys(this.stowedCounts)) {
        const def = BUILDING_DEFS[type];
        const raw = parsed.stowedSealed[type];
        if (!def || !def.produce || !def.produce.raidOnly || !Array.isArray(raw)) continue;
        const cap = produceCapacityFor(type, MAX_BUILDING_LEVEL);
        const list = raw.map(v => Math.floor(Number(v)))
          .filter(v => Number.isFinite(v) && v > 0)
          .map(v => Math.min(cap, v))
          .sort((a, b) => b - a)
          .slice(0, this.stowedCounts[type]);
        if (list.length) this.stowedSealed[type] = list;
      }
    }
  }
}
