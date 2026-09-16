/**
 * EconomyManager - Tracks player Bank Balances (Cash, Iron, Wood),
 * Construction Inventory (purchased items ready to place in Design Map),
 * and manual tap-to-collect harvesting.
 */
export class EconomyManager {
  static get MAX_SPARE_LIVES() { return 2; }   // 1 base life + 2 spares = 3 total
  static get LIFE_COST() { return { cash: 400, iron: 250, wood: 150 }; }

  constructor() {
    this.cash = 1500;
    this.iron = 800;
    this.wood = 1000;

    // Construction Inventory: counts of purchased items ready to be placed on the map
    this.inventory = {
      road: 35,
      lumber_mill: 1,
      spike_trap: 2,
      roadblock: 2,
      tree: 3
    };

    // Spare lives for the battle buggy. Bought at the Vehicle Tuning Lab, spent when busted.
    // Not granted automatically - a raid starts with 1 life plus whatever you stocked here.
    this.vehicleLives = 0;
    this.onUpdate = null;
    this.onInventoryUpdate = null;
    this.load();
    if (this.inventory.road === undefined) {
      this.inventory.road = 35;
    }
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
  collectFromBuilding(type, amount) {
    if (amount <= 0) return 0;
    const harvested = Math.floor(amount);

    if (type === 'wood') {
      this.wood += harvested;
    } else if (type === 'iron') {
      this.iron += harvested;
    } else {
      // cash / petrol
      this.cash += harvested;
    }

    this.save();
    if (this.onUpdate) {
      this.onUpdate(this.getResources());
    }
    return harvested;
  }

  // --- Construction Inventory Management ---
  addToInventory(type, count = 1) {
    this.inventory[type] = (this.inventory[type] || 0) + count;
    this.save();
    if (this.onInventoryUpdate) {
      this.onInventoryUpdate(this.inventory);
    }
  }

  consumeFromInventory(type) {
    if ((this.inventory[type] || 0) > 0) {
      this.inventory[type]--;
      if (this.inventory[type] === 0) {
        delete this.inventory[type];
      }
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

  buyVehicleLife() {
    if (this.vehicleLives >= EconomyManager.MAX_SPARE_LIVES) return { ok: false, reason: 'max' };
    if (!this.deduct(EconomyManager.LIFE_COST)) return { ok: false, reason: 'cost' };
    this.vehicleLives++;
    this.save();
    return { ok: true, lives: this.vehicleLives };
  }

  consumeVehicleLife() {
    if (this.vehicleLives <= 0) return false;
    this.vehicleLives--;
    this.save();
    return true;
  }

  save() {
    try {
      const state = {
        cash: this.cash,
        iron: this.iron,
        wood: this.wood,
        inventory: this.inventory,
        vehicleLives: this.vehicleLives
      };
      localStorage.setItem('city_siege_eco', JSON.stringify(state));
    } catch (e) {
      // ignore storage quota
    }
  }

  load() {
    try {
      const saved = localStorage.getItem('city_siege_eco');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.cash = parsed.cash ?? this.cash;
        this.iron = parsed.iron ?? this.iron;
        this.wood = parsed.wood ?? this.wood;
        this.vehicleLives = Math.max(0, Math.min(EconomyManager.MAX_SPARE_LIVES, parsed.vehicleLives ?? 0));
        if (parsed.inventory && typeof parsed.inventory === 'object') {
          this.inventory = parsed.inventory;
        }
      }
    } catch (e) {
      // ignore
    }
  }
}
