import {
  TRACK_MAX_LEVEL,
  GARAGE_TRACKS,
  MAX_BUILDING_LEVEL,
  DECK_BASE_SLOTS,
  trackCapFor,
  labForTrackLevel,
  deckSlotsFor,
  cardLevelGate,
  cardCooldownCutFor,
  labShieldFor,
  ordnanceFor,
  trackCostFor,
  trackValueFor,
  vehicleStatsFor,
  pursuitUnitFor,
  CARD_UPTIME_CAP,
  CARD_MAX_LEVEL,
  CARD_TIERS,
  CARD_UNLOCKS,
  cardStatsFor,
  cardLevelCostFor,
  cardUnlockCostFor,
  RAIDER_BASE
} from '../data/progression.js';

/**
 * GarageManager - owns the Vehicle Garage save (localStorage 'city_siege_garage'):
 * five buggy tuning tracks (12 levels each), five ability cards (unlock + 5 levels) and the
 * ordered raid loadout. Every purchase goes through EconomyManager.deduct().
 *
 * The garage ladder itself - which lab level opens which tuning level, deck slot or card
 * level, what every track level and card level is worth and what each costs - lives in
 * src/data/progression.js (vehicle_lab / tech_lab / weapons_lab research blocks plus the
 * GARAGE and ABILITY CARDS sections). This file only reads it. Nothing derived is stored: lab
 * levels, slot count and the effective deck are recomputed on every read, and combat values
 * are pure functions of the persisted levels.
 */

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));

/** Garage save format. v1 had 5-level tracks with bigger steps; see _migrateTracks(). */
const GARAGE_SAVE_VERSION = 2;
/**
 * Per-level step of each track in the v1 (5-level) save format. Used ONLY to convert an old
 * save so a player keeps the value they paid for; live numbers come from GARAGE_TRACKS.
 */
const V1_TRACK_STEP = { speed: 0.12, accel: 0.15, armor: 150, nitro: 0.06, jump: 0.14 };

const MPH = 2.237;
/** Cruiser top speed at a level-1 and a level-12 Police Station, for the Top Speed copy. */
const CRUISER_MPH = [1, MAX_BUILDING_LEVEL].map(L => Math.round(pursuitUnitFor('police_station', L).speedMax * MPH));

export const TRACKS = [
  {
    id: 'speed',
    name: 'Top Speed & Turbo Injection',
    icon: '🏁',
    helps: `Raises the buggy's flat-out speed by ${Math.round(GARAGE_TRACKS.speed.perLevel * 100)}% per level. Police cruisers top out at ${CRUISER_MPH[0]}-${CRUISER_MPH[1]} mph (level 1-${MAX_BUILDING_LEVEL} station), SWAT keep pace with a buggy tuned to your Town Hall on a road and out-run it off the asphalt, so every level widens the escape margin and hardens roadblock rams.`,
    fmt: (v) => `${Math.round(v * MPH)} mph`
  },
  {
    id: 'accel',
    name: 'Torque & Powertrain Acceleration',
    icon: '⚙️',
    helps: `Faster launches out of corners and after a bust: +${+(GARAGE_TRACKS.accel.perLevel * 100).toFixed(1)}% acceleration per level. Braking and coasting are unchanged.`,
    fmt: (v) => `0-60 in ${(26.8 / v).toFixed(2)} s`
  },
  {
    id: 'armor',
    name: 'Chassis Armor & Roll Cage',
    icon: '🛡️',
    helps: `Adds +${GARAGE_TRACKS.armor.perLevel} HP per level to the hull (the shield grows with the Vehicle Lab instead). Police contact is still an instant bust - armor only matters against turrets, traps, blasts and drones.`,
    fmt: (v) => `${Math.round(v)} HP`
  },
  {
    id: 'nitro',
    name: 'Nitrous Oxide Reserves (Nitro Kit)',
    icon: '🔥',
    helps: `Hardware strength of the Nitro Surge card: +${GARAGE_TRACKS.nitro.perLevel}x top speed and +${GARAGE_TRACKS.nitro.accelPerLevel}x acceleration per level while the nitro burns. Burn time and cooldown come from the card level, and the burn is never up more than ${Math.round(CARD_UPTIME_CAP.nitro * 100)}% of a raid, however fast the Tech Lab recharges it.`,
    fmt: (v) => `x${v.toFixed(2)}`
  },
  {
    id: 'jump',
    name: 'Hydraulic Jump Suspension',
    icon: '🦘',
    helps: `Launches the Big Jump card ${Math.round(GARAGE_TRACKS.jump.perLevel * 100)}% harder per level: more height and hang time, and airborne means immune to cops, roadblocks and turrets. The card recharges only once the wheels are down, and never so fast that the buggy spends more than ${Math.round(CARD_UPTIME_CAP.jump * 100)}% of a raid in the air. The card level only shortens the cooldown.`,
    fmt: (v) => `${((v * v) / (2 * RAIDER_BASE.gravity)).toFixed(1)} m`
  }
].map(t => ({
  ...t,
  maxLevel: TRACK_MAX_LEVEL,
  value: (L) => trackValueFor(t.id, L)
}));

export const CARD_ORDER = ['jump', 'missiles', 'nitro', 'bomb', 'invisibility'];

/** Display copy for the garage (mirrors the CardSystem definitions). */
export const CARD_META = {
  jump: { name: 'Big Jump', icon: '🦘', desc: 'Hydraulic booster launches vehicle high over roadblocks & police. Recharges once you land.' },
  missiles: { name: 'Twin Missiles', icon: '🚀', desc: 'Fire twin forward rockets that blast roadblocks & cruisers.' },
  nitro: { name: 'Nitro Surge', icon: '🔥', desc: 'Supercharge speed and ramming power for a few seconds.' },
  bomb: { name: 'Drop Bomb', icon: '💣', desc: 'Eject heavy explosive behind vehicle: wrecks cruisers at its own level or below, badly hurts SWAT.' },
  invisibility: { name: 'Invisibility', icon: '👻', desc: 'Cloak the vehicle. Police & turrets lose lock-on.' }
};

/**
 * Read-only views of progression.js for the garage UI and tooling. Card levels 2-3 are gated by
 * the Vehicle Tuning Lab and levels 4-5 by the Tech Lab (Town Hall 5+) - the labs'
 * research.cardLevelAt tables - and every price is progression's cardUnlockCostFor /
 * cardLevelCostFor, which grows with the Town Hall that first opens the purchase. Past level 5
 * every Tech Lab level still shortens every card's cooldown.
 */
export { CARD_MAX_LEVEL, CARD_TIERS };
export const CARD_DEFS = Object.fromEntries(Object.entries(CARD_UNLOCKS).map(([id, u]) => [id, {
  ...u,
  ...(u.startUnlocked ? {} : { unlockCost: cardUnlockCostFor(id) })
}]));
export const CARD_LEVEL_COST = [null, null, 2, 3, 4, 5].map(L => (L ? cardLevelCostFor(L) : null));
export const CARD_LEVEL_LAB = [null, null, 2, 3, 4, 5].map(L => (L ? cardLevelGate(L).lab : null));
export const CARD_LEVEL_TECH = [null, null, 2, 3, 4, 5].map(L => (L ? cardLevelGate(L).tech : null));

export class GarageManager {
  static get KEY() { return 'city_siege_garage'; }
  static get COST_SCALE() { return 1.0; }
  static get MAX_SLOTS() { return deckSlotsFor(MAX_BUILDING_LEVEL); }
  static get BASE_SLOTS() { return DECK_BASE_SLOTS; }

  constructor(economyManager, buildingManager) {
    this.economy = economyManager;
    this.buildings = buildingManager;
    this.state = this._defaults();
    this.onChange = null;
    this.migratedFromEco = false;   // in-memory only: drives a one-time toast in the garage
    this.load();
  }

  // ---------------------------------------------------------------- persistence

  _defaults() {
    return {
      v: GARAGE_SAVE_VERSION,
      tracks: { speed: 0, accel: 0, armor: 0, nitro: 0, jump: 0 },
      cards: {
        jump: { unlocked: true, level: 1 },
        missiles: { unlocked: true, level: 1 },
        nitro: { unlocked: true, level: 1 },
        bomb: { unlocked: false, level: 0 },
        invisibility: { unlocked: false, level: 0 }
      },
      loadout: ['jump', 'missiles', 'nitro']
    };
  }

  _sanitize(raw) {
    const d = this._defaults();
    const src = (raw && typeof raw === 'object') ? raw : {};
    const out = { v: GARAGE_SAVE_VERSION, tracks: {}, cards: {}, loadout: [] };
    // v2 always writes `v`, so a save with tracks but no version is a 5-level v1 save too.
    const ver = Math.round(Number(src.v));
    const fromV1 = ver === 1 || (src.v === undefined && !!src.tracks);

    TRACKS.forEach(t => {
      const rt = src.tracks && typeof src.tracks === 'object' ? src.tracks[t.id] : 0;
      out.tracks[t.id] = fromV1 ? this._migrateTrack(t.id, rt) : clampInt(rt, 0, t.maxLevel);
    });

    CARD_ORDER.forEach(id => {
      // Guard every table lookup: a card listed in CARD_ORDER but missing from CARD_DEFS
      // or the defaults used to throw out of the constructor and blank the game on boot.
      if (!CARD_DEFS[id]) return;
      const rc = (src.cards && typeof src.cards === 'object' && src.cards[id] && typeof src.cards[id] === 'object'
        ? src.cards[id] : d.cards[id]) || { unlocked: false, level: 0 };
      const unlocked = !!rc.unlocked || !!CARD_DEFS[id].startUnlocked;
      out.cards[id] = {
        unlocked,
        level: unlocked ? clampInt(rc.level || 1, 1, CARD_MAX_LEVEL) : 0
      };
    });

    const seen = new Set();
    const list = Array.isArray(src.loadout) ? src.loadout : d.loadout;
    list.forEach(id => {
      if (typeof id !== 'string' || !CARD_DEFS[id] || seen.has(id)) return;
      if (!out.cards[id] || !out.cards[id].unlocked) return;
      if (out.loadout.length >= GarageManager.MAX_SLOTS) return;
      seen.add(id);
      out.loadout.push(id);
    });

    return out;
  }

  /**
   * v1 saves stored 5-level tracks with bigger steps. Convert to the level whose value is
   * closest to what the player already had, so nobody loses speed or armor they paid for.
   */
  _migrateTrack(id, oldLevel) {
    const old = clampInt(oldLevel, 0, 5);
    const oldStep = V1_TRACK_STEP[id];
    const newStep = GARAGE_TRACKS[id] && GARAGE_TRACKS[id].perLevel;
    if (!old || !oldStep || !newStep) return old;
    return clampInt(Math.round((old * oldStep) / newStep), 0, TRACK_MAX_LEVEL);
  }

  load() {
    let saved = null;
    try {
      saved = localStorage.getItem(GarageManager.KEY);
    } catch (e) {
      saved = null;
    }

    if (saved) {
      // A save exists. Whatever goes wrong from here, NEVER fall through to the first-run
      // branch - that branch calls save() and would overwrite every purchased track and
      // card with starter values. Park the unreadable blob under .bak instead.
      try {
        this.state = this._sanitize(JSON.parse(saved));
      } catch (e) {
        console.error('[garage] save unreadable; kept a copy at ' + GarageManager.KEY + '.bak', e);
        try { localStorage.setItem(GarageManager.KEY + '.bak', saved); } catch (_) { /* quota */ }
        this.state = this._defaults();
        this.recoveredFromCorruptSave = true;
      }
      return;
    }

    // First run of the garage. A returning player (an eco save exists but no garage save)
    // had every card yesterday, so Drop Bomb is granted for free; Invisibility stays the
    // flagship purchase.
    this.state = this._defaults();
    let veteran = false;
    try {
      veteran = !!localStorage.getItem('city_siege_eco');
    } catch (e) {
      veteran = false;
    }
    if (veteran) {
      this.state.cards.bomb = { unlocked: true, level: 1 };
      this.migratedFromEco = true;
    }
    this.save();
  }

  save() {
    try {
      localStorage.setItem(GarageManager.KEY, JSON.stringify(this.state));
    } catch (e) {
      // ignore storage quota / private mode
    }
  }

  _commit() {
    this.state = this._sanitize(this.state);
    this.save();
    if (this.onChange) this.onChange(this.state);
  }

  /** Consume the one-time migration flag (true only on the first call after a veteran grant). */
  takeMigrationNotice() {
    const flag = this.migratedFromEco;
    this.migratedFromEco = false;
    return flag;
  }

  // ---------------------------------------------------------------- lab (derived)

  getLab() {
    let best = null;
    (this.buildings && this.buildings.buildings || []).forEach(b => {
      if (b.type !== 'vehicle_lab' || b.isDestroyed) return;
      if (!best || (b.level || 1) > (best.level || 1)) best = b;
    });
    return best;
  }

  getLabLevel() {
    const lab = this.getLab();
    return lab ? (lab.level || 1) : 0;
  }

  /** Highest standing building of `type`'s level, or 0. */
  _bestLevelOf(type) {
    let best = 0;
    (this.buildings && this.buildings.buildings || []).forEach(b => {
      if (b.type === type && !b.isDestroyed) best = Math.max(best, b.level || 1);
    });
    return best;
  }

  getTechLabLevel() {
    return this._bestLevelOf('tech_lab');
  }

  getWeaponsLabLevel() {
    return this._bestLevelOf('weapons_lab');
  }

  getSlotCount() {
    return deckSlotsFor(this.getLabLevel());
  }

  /** Highest track level reachable with the current Vehicle Lab (progression trackCapAt). */
  getTierCap() {
    return trackCapFor(this.getLabLevel());
  }

  /**
   * What each Vehicle Lab level grants, straight from the progression.js tables: the tuning
   * cap, the lab's total shield bonus, deck slots and any ability-card level it opens.
   * Row 0 is "no lab". The garage's Lab tab renders exactly this.
   */
  getLabLadder() {
    const rows = [];
    for (let L = 0; L <= MAX_BUILDING_LEVEL; L++) {
      const cardLevels = [];
      for (let c = 2; c <= CARD_MAX_LEVEL; c++) {
        const gate = cardLevelGate(c);
        if (gate.lab === L && L > 0) cardLevels.push({ level: c, tech: gate.tech });
      }
      rows.push({
        level: L,
        trackCap: trackCapFor(L),
        opensTrack: L > 0 && trackCapFor(L) > trackCapFor(L - 1),
        shield: labShieldFor(L),
        slots: deckSlotsFor(L),
        opensSlot: L > 0 && deckSlotsFor(L) > deckSlotsFor(L - 1),
        cardLevels
      });
    }
    return rows;
  }

  /** Live payoff of the Tech Lab and the Weapons & Munitions Lab, for the garage summary. */
  getResearchSummary() {
    const tech = this.getTechLabLevel();
    const wl = this.getWeaponsLabLevel();
    const ord = ordnanceFor(wl);
    const vs = this.computeVehicleStats();
    const pct = (m) => Math.round((m - 1) * 100);
    return {
      techLevel: tech,
      cooldownCutPct: Math.round(cardCooldownCutFor(tech) * 100),
      nextCooldownCutPct: Math.round(cardCooldownCutFor(tech + 1) * 100),
      weaponsLevel: wl,
      ordnanceDamagePct: pct(ord.damageMult),
      bombRadiusPct: pct(ord.radiusMult),
      cannonPct: pct(ord.cannonMult),
      cannonDamage: vs.cannonDamage,
      cannonVsUnits: vs.cannonVsUnits
    };
  }

  // ---------------------------------------------------------------- tracks

  getTrack(id) {
    return TRACKS.find(t => t.id === id) || null;
  }

  getTrackLevel(id) {
    return this.state.tracks[id] || 0;
  }

  /** Cost of the NEXT level (cur+1), or null at max. */
  getTrackCost(id) {
    const t = this.getTrack(id);
    if (!t) return null;
    const cur = this.getTrackLevel(id);
    if (cur >= t.maxLevel) return null;
    return trackCostFor(id, cur);
  }

  /** Vehicle Lab level required for the NEXT level of this track. */
  getTrackGate(id) {
    return labForTrackLevel(this.getTrackLevel(id) + 1);
  }

  canBuyTrack(id) {
    const t = this.getTrack(id);
    if (!t) return { ok: false, reason: 'unknown' };
    const cur = this.getTrackLevel(id);
    if (cur >= t.maxLevel) return { ok: false, reason: 'max' };
    const needLab = this.getTrackGate(id);
    if (this.getLabLevel() < needLab) return { ok: false, reason: 'lab', needLab };
    const cost = this.getTrackCost(id);
    if (!this.economy.canAfford(cost)) return { ok: false, reason: 'cost', cost };
    return { ok: true, cost, next: cur + 1 };
  }

  buyTrack(id) {
    const can = this.canBuyTrack(id);
    if (!can.ok) return can;
    if (!this.economy.deduct(can.cost)) return { ok: false, reason: 'cost' };
    this.state.tracks[id] = this.getTrackLevel(id) + 1;
    this._commit();
    return { ok: true, level: this.state.tracks[id] };
  }

  // ---------------------------------------------------------------- cards

  getCardState(id) {
    return this.state.cards[id] || { unlocked: false, level: 0 };
  }

  /** Cost of the next purchase (unlock, or the next level), or null at max. */
  getCardCost(id) {
    const def = CARD_DEFS[id];
    if (!def) return null;
    const c = this.getCardState(id);
    if (!c.unlocked) return cardUnlockCostFor(id);
    if (c.level >= CARD_MAX_LEVEL) return null;
    return cardLevelCostFor(c.level + 1);
  }

  /** Lab level required for the next purchase (unlock or level). */
  getCardGate(id) {
    const def = CARD_DEFS[id];
    if (!def) return 0;
    const c = this.getCardState(id);
    if (!c.unlocked) return def.unlockLab || 0;
    if (c.level >= CARD_MAX_LEVEL) return 0;
    return cardLevelGate(c.level + 1).lab;
  }

  /** Tech Lab level required for the next card level (0 below card level 4). */
  getCardTechGate(id) {
    const c = this.getCardState(id);
    if (!c.unlocked || c.level >= CARD_MAX_LEVEL) return 0;
    return cardLevelGate(c.level + 1).tech;
  }

  canBuyCard(id) {
    const def = CARD_DEFS[id];
    if (!def) return { ok: false, reason: 'unknown' };
    const c = this.getCardState(id);
    if (c.unlocked && c.level >= CARD_MAX_LEVEL) return { ok: false, reason: 'max' };
    const needLab = this.getCardGate(id);
    if (this.getLabLevel() < needLab) return { ok: false, reason: 'lab', needLab };
    const needTech = this.getCardTechGate(id);
    if (this.getTechLabLevel() < needTech) return { ok: false, reason: 'tech', needTech };
    const cost = this.getCardCost(id);
    if (!cost || !this.economy.canAfford(cost)) return { ok: false, reason: 'cost', cost };
    return { ok: true, cost, unlock: !c.unlocked, next: c.unlocked ? c.level + 1 : 1 };
  }

  buyCard(id) {
    const can = this.canBuyCard(id);
    if (!can.ok) return can;
    if (!this.economy.deduct(can.cost)) return { ok: false, reason: 'cost' };
    const c = this.state.cards[id];
    let equippedSlot = 0;
    if (!c.unlocked) {
      this.state.cards[id] = { unlocked: true, level: 1 };
      if (this.getLoadout().length < this.getSlotCount() && !this.state.loadout.includes(id)) {
        this.state.loadout.push(id);
        equippedSlot = this.state.loadout.length;
      }
    } else {
      c.level = Math.min(CARD_MAX_LEVEL, c.level + 1);
    }
    this._commit();
    return { ok: true, unlock: can.unlock, level: this.state.cards[id].level, equippedSlot };
  }

  isEquipped(id) {
    return this.state.loadout.includes(id);
  }

  toggleEquip(id) {
    if (!CARD_DEFS[id]) return { ok: false, reason: 'unknown' };
    const c = this.getCardState(id);
    if (!c.unlocked) return { ok: false, reason: 'locked' };
    const idx = this.state.loadout.indexOf(id);
    if (idx >= 0) {
      this.state.loadout.splice(idx, 1);
      this._commit();
      return { ok: true, equipped: false };
    }
    if (this.getLoadout().length >= this.getSlotCount()) return { ok: false, reason: 'full' };
    this.state.loadout.push(id);
    this._commit();
    return { ok: true, equipped: true, slot: this.state.loadout.length };
  }

  getRawLoadout() {
    return this.state.loadout.slice();
  }

  /** Effective deck: unlocked ids, truncated to the current slot count. Never written back. */
  getLoadout() {
    return this.state.loadout
      .filter(id => this.getCardState(id).unlocked)
      .slice(0, this.getSlotCount());
  }

  /** Cards equipped in storage but pushed out because the lab (and its slots) went away. */
  getBenchedCount() {
    return Math.max(0, this.state.loadout.filter(id => this.getCardState(id).unlocked).length - this.getSlotCount());
  }

  // ---------------------------------------------------------------- combat values

  /**
   * Absolute buggy stats for the next raid: tracks + Vehicle Lab shield + Weapons Lab
   * autocannon, all from progression.vehicleStatsFor().
   */
  computeVehicleStats() {
    return vehicleStatsFor(this.state.tracks, {
      labLevel: this.getLabLevel(),
      weaponsLabLevel: this.getWeaponsLabLevel()
    });
  }

  /**
   * Raid numbers for one card at a level (defaults to its persisted level), from
   * progression.cardStatsFor with this city's labs: the card's tier, the Tech Lab's cooldown
   * cut and the Weapons & Munitions Lab's ordnance bonus. A Big Jump's "duration" is its hang
   * time from the Hydraulic Jump track, which floors the cooldown so the buggy is never
   * airborne more than CARD_UPTIME_CAP.jump of a raid. The garage shows exactly this.
   */
  getCardTier(id, level = null) {
    if (!CARD_TIERS[id]) return null;
    return cardStatsFor(id, level == null ? this.getCardState(id).level : level, {
      techLevel: this.getTechLabLevel(),
      weaponsLevel: this.getWeaponsLabLevel(),
      jumpTrack: this.getTrackLevel('jump')
    });
  }

  /** Final per-raid card numbers for every card (tier + Tech Lab + Weapons Lab). */
  computeCardStats() {
    const out = {};
    CARD_ORDER.forEach(id => {
      out[id] = this.getCardTier(id);
    });
    return out;
  }
}
