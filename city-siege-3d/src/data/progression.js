/**
 * progression.js - THE single source of truth for the Town Hall 1-12 ladder.
 *
 * Before this module existed the same quantities were computed by different formulas in
 * different files (HP on placement vs on upgrade, production on placement vs on upgrade),
 * the level-12 ceiling was a bare literal in three places, and town_hall_progression.json
 * held a complete 12-level design that no code imported. Everything progression-shaped now
 * lives here and every consumer reads it - there are no second opinions.
 *
 * Rules the ladder guarantees:
 *   - Every Town Hall level 1..12 unlocks at least one NEW building type.
 *   - Every Town Hall level raises several per-type build limits, the road budget, the
 *     buildable radius and the level ceiling; Town Halls 2, 4, 6, 9 and 12 also raise the
 *     labour cap (one more Labour Hut to staff). There is always something to do.
 *   - A building can never be upgraded above the Town Hall's own level.
 *   - The raider's garage (Vehicle Lab, Weapons Lab, Tech Lab) grows on the same 12-level
 *     ladder as the defenses it has to beat - see the GARAGE section below.
 */

export const MAX_TOWN_HALL_LEVEL = 12;
export const MAX_BUILDING_LEVEL = 12;
/** Visual tiers a mesh factory must handle. Levels above this reuse the top tier. */
export const MAX_MESH_TIER = 6;
export const MAX_BUILDERS = 7;
/** Hard ceiling on a single build/upgrade job, in seconds (8 hours). */
export const MAX_BUILD_SECONDS = 28800;

// ---------------------------------------------------------------------------
// Combat roles. Every building declares exactly one; nothing is decorative by
// accident. DestructionEngine / TurretSystem / PoliceManager switch on these.
// ---------------------------------------------------------------------------
export const ROLE = {
  CORE: 'core',           // town hall - losing it matters
  GATE: 'gate',           // breach point, mounted turret
  TURRET: 'turret',       // shoots the raider
  TRAP: 'trap',           // one-shot or timed effect when driven over
  SPAWNER: 'spawner',     // produces pursuit units during a raid
  PRODUCER: 'producer',   // makes resources between raids
  STORAGE: 'storage',     // holds loot / stowed buildings
  AURA: 'aura',           // buffs other buildings in a radius
  BARRIER: 'barrier',     // solid obstacle, rammable
  RESEARCH: 'research',   // raises garage / ordnance ceilings
  SCENERY: 'scenery'      // trees, roads
};

/**
 * Every building in the game. `unlockTH` is the Town Hall level that reveals the blueprint;
 * `buildBase` is the level-1 build time in seconds and doubles per level (capped at 8h). The
 * one-tile traps and barriers start at 2-4 s: a level buys them little (a level-12 roadblock +300
 * HP), and at 5-12 s they ate 30% of the labour of a Town Hall 9-12 step (TRAP_LABOUR_SHARE_MAX).
 * `role` drives combat behaviour. `tall` is descriptive only (the mesh is a landmark);
 * nothing in combat reads it, so no copy may promise line-of-sight blocking.
 */
export const BUILDING_DEFS = {
  // ---------------------------------------------------------------- TH1 baseline
  // Cash producers (pump, mint, solar, refinery, vault) earn a half to two-fifths of their old
  // rates: at those a full city made 3-6x the cash its next Town Hall step could spend while the
  // iron was gathered, so most of it had no use. A step's cash now takes about a third to nine
  // tenths of the time its iron (or wood) does, and never binds (verify-progression checks it).
  town_hall: {
    name: 'Town Hall', category: 'civil', icon: '\u{1F3DB}\u{FE0F}', role: ROLE.CORE,
    cost: { cash: 500, iron: 250, wood: 400 }, maxHp: 1200, footprint: 2,
    buildBase: 25, unlockTH: 1, tall: false,
    desc: 'Heart of the city. Its level IS your city tier.',
    helps: 'Every upgrade raises the level ceiling for every other building, unlocks at least one new blueprint, widens the buildable radius and raises several build limits. Town Halls 2, 4, 6, 9 and 12 also raise the labour cap by one (build another Labour Hut to staff it).'
  },
  main_gate: {
    name: 'Fortified Main Gate', category: 'defense', icon: '\u{1F6AA}', role: ROLE.GATE,
    cost: { cash: 350, iron: 300, wood: 200 }, maxHp: 800, footprint: 3,
    buildBase: 20, unlockTH: 1, tall: false, upgradeable: false, shopHidden: true,
    desc: 'Heavy perimeter gate with a mounted turret. Every raid starts at the gate the raider picks.',
    helps: 'Your city has three fixed gates on the perimeter wall. Each is a raid entry point with a mounted turret that shoots back at a raider coming through it. Gates are not bought or upgraded.'
  },
  police_station: {
    name: 'Police Station', category: 'defense', icon: '\u{1F693}', role: ROLE.SPAWNER,
    cost: { cash: 400, iron: 200, wood: 250 }, maxHp: 650, footprint: 2,
    buildBase: 15, unlockTH: 1, tall: false,
    spawn: { unit: 'cruiser', perStation: 1, hpPerLevel: 60, speedPerLevel: 0.4 },
    desc: 'Houses pursuit cruisers that deploy the moment sirens sound.',
    helps: 'Each station puts one cruiser on the map, and its level makes that cruiser tougher and faster. Cruiser contact busts the raider outright.'
  },
  petrol_pump: {
    name: 'Petrol Pump', category: 'economy', icon: '\u{26FD}', role: ROLE.PRODUCER,
    cost: { cash: 300, iron: 150, wood: 100 }, maxHp: 400, footprint: 2,
    buildBase: 10, unlockTH: 1, tall: false,
    produce: { type: 'cash', rate: 4.0, capacity: 54000, seed: 35 },
    blast: { radius: 18, damage: 420 },
    desc: 'High output, highly explosive. Detonates in a chain reaction when destroyed.',
    helps: 'Your best early cash earner, and a trap: its blast badly hurts a raider caught next to it, and sets off every other pump, refinery, reactor or collider inside it, whatever their level.'
  },
  lumber_mill: {
    name: 'Lumber Mill', category: 'economy', icon: '\u{1FAB5}', role: ROLE.PRODUCER,
    cost: { cash: 150, iron: 50, wood: 100 }, maxHp: 450, footprint: 2,
    buildBase: 10, unlockTH: 1, tall: false,
    produce: { type: 'wood', rate: 3.5, capacity: 25200, seed: 16 },
    desc: 'Cuts Wood continuously to supply construction.',
    helps: 'Wood is the core building material. Every structure and every upgrade needs it.'
  },
  iron_foundry: {
    name: 'Iron Foundry', category: 'economy', icon: '\u{2692}\u{FE0F}', role: ROLE.PRODUCER,
    cost: { cash: 250, iron: 100, wood: 150 }, maxHp: 550, footprint: 2,
    buildBase: 10, unlockTH: 1, tall: false,
    produce: { type: 'iron', rate: 2.5, capacity: 18000, seed: 14 },
    desc: 'Smelts Iron continuously to forge heavy fortifications.',
    helps: 'Iron gates every defense and every heavy garage upgrade. It is the bottleneck resource from Town Hall 2 on (wood catches up with it from Town Hall 10).'
  },
  spike_trap: {
    name: 'Spike Trap', category: 'defense', icon: '\u{1F53A}', role: ROLE.BARRIER,
    cost: { cash: 80, iron: 120, wood: 40 }, maxHp: 900, footprint: 1,
    buildBase: 2, unlockTH: 1, tall: false,
    barrier: { ramDamageToVehicle: 25, rammable: true },
    desc: 'Spiked steel barricade that shreds tires on contact.',
    // ramDamageToVehicle is flat (25 vs a roadblock's 15 at every level): the copy promises a
    // harder bite than a roadblock, not one that grows - upgrades add toughness only.
    helps: 'A solid barrier like a roadblock, but every ram also tears the raider\'s tires, a harder bite than a roadblock\'s. Cheaper to break than a roadblock; upgrades make it tougher, not sharper.'
  },
  roadblock: {
    name: 'Roadblock Barrier', category: 'defense', icon: '\u{1F6A7}', role: ROLE.BARRIER,
    cost: { cash: 50, iron: 80, wood: 30 }, maxHp: 2000, footprint: 1,
    buildBase: 2, unlockTH: 1, tall: false,
    barrier: { ramDamageToVehicle: 15, rammable: true },
    desc: 'Concrete barrier. Your primary wall and map blocker.',
    helps: 'The cheapest way to shape the map. Chain them into walls to funnel raiders past your turrets instead of letting them drive straight to the Town Hall.'
  },
  builder_hut: {
    name: "Labour Hut", category: 'civil', icon: '\u{1F477}', role: ROLE.STORAGE,
    cost: { cash: 200, iron: 80, wood: 150 }, maxHp: 350, footprint: 2,
    // upgradeable:false - a level would only add HP; a hut staffs one slot whatever its level.
    buildBase: 15, unlockTH: 1, tall: false, upgradeable: false,
    desc: 'Houses a labourer. One free labour is needed per upgrade job.',
    helps: 'Adds a parallel upgrade slot: each hut staffs one upgrade at a time, so two huts run two upgrades at once instead of one after the other. Capped by Town Hall level. A hut has no levels - build another one instead. (New buildings are placed straight from your inventory and need no labour.)'
  },
  tree: {
    name: 'Pine Tree', category: 'civil', icon: '\u{1F332}', role: ROLE.SCENERY,
    cost: { cash: 10, iron: 0, wood: 20 }, maxHp: 100, footprint: 1,
    buildBase: 10, unlockTH: 1, tall: false, lootMultiplier: 0, upgradeable: false,
    desc: 'Countryside greenery. Pure scenery.',
    helps: 'Decoration only. Never blocks placement, never stops a raider (the buggy flattens it and rounds fly past it), carries no loot, so raiders gain nothing from clearing it, and has no levels to pay for.'
  },
  road: {
    name: 'Paved Asphalt Road (x5 Tiles)', category: 'roads', icon: '\u{1F6E3}\u{FE0F}', role: ROLE.SCENERY,
    cost: { cash: 25, iron: 15, wood: 20 }, maxHp: null, footprint: 1, packCount: 5,
    buildBase: 10, unlockTH: 1, tall: false, placeable: 'road',
    // Off the asphalt the buggy's top speed and acceleration are multiplied down.
    surface: { offRoadSpeedMult: 0.75, offRoadAccelMult: 0.8 },
    desc: 'Durable paved tiles that connect structures and gates.',
    helps: 'Roads are where raiders drive fastest: off the asphalt a buggy loses a quarter of its top speed. Lay them to steer the attack route, and leave them out where you want raiders bogged down.'
  },

  // ---------------------------------------------------------------- TH2
  vehicle_lab: {
    name: 'Vehicle Tuning Lab', category: 'defense', icon: '\u{1F527}', role: ROLE.RESEARCH,
    cost: { cash: 450, iron: 250, wood: 300 }, maxHp: 750, footprint: 2,
    buildBase: 15, unlockTH: 2, tall: false, unique: true,
    research: {
      grants: 'garageTier',
      // Highest tuning level any track may reach, indexed by Vehicle Lab level (0 = no lab):
      // Lab L opens tuning level L+1, up to TRACK_MAX_LEVEL.
      trackCapAt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12],
      slotsAt: [2, 3],                           // Lab levels that add deck slots 4 and 5
      cardLevelAt: { 2: 1, 3: 2, 4: 2, 5: 2 },   // ability-card level -> Vehicle Lab level it needs
      // Total shield the lab bolts onto the buggy, indexed by lab level (0 = no lab). +25 a
      // level through Lab 6, then the deflector plating that keeps a lone raider alive against
      // the late arsenal (reactor and relay auras, mortars, the Doomsday): from Town Hall 6 to 12
      // the full kill box grows about 3x, and +25 a level made the buggy only 47% tougher - the
      // Town Hall 12 kill box wrecked a parked TH12 raider in 3.5 s. See raiderMaxEhpAt / KILL_BAND.
      // Lab 12 opens no tuning level (every track stops at 12, which Lab 11 opens), so it adds
      // the most plating: a full Town Hall 12 city outweighs Town Hall 11's far more than the
      // buggy did (raidModelAt).
      shieldAt: [0, 25, 50, 75, 100, 125, 150, 400, 800, 1250, 1750, 2400, 4500]
    },
    desc: 'High-octane garage. Raises every buggy tuning ceiling.',
    helps: 'Your raid power lives here: Lab level L unlocks tuning level L+1 on every track (up to 12), every lab level adds shield to the buggy (+25 a level to Lab 6, then deflector plating up to 4,500 at Lab 12), and Lab 2 / Lab 3 add a 4th and 5th ability-card deck slot.'
  },
  sniper_tower: {
    name: 'Sniper Watchtower', category: 'defense', icon: '\u{1F3AF}', role: ROLE.TURRET,
    cost: { cash: 350, iron: 200, wood: 250 }, maxHp: 700, footprint: 2,
    buildBase: 15, unlockTH: 2, tall: false,
    turret: { range: 64.0, fireInterval: 2.0, damage: 45, muzzleHeight: 6.2, tracer: 0xffeb3b },
    desc: 'Elevated marksman nest firing long-range rounds.',
    helps: 'Out-ranges every other defense of the same level. Place it deep in the base so it hits raiders long before they reach it.'
  },
  cash_mint: {
    name: 'Cash Mint', category: 'economy', icon: '\u{1F4B0}', role: ROLE.PRODUCER,
    cost: { cash: 350, iron: 150, wood: 200 }, maxHp: 500, footprint: 2,
    buildBase: 12, unlockTH: 2, tall: false,
    produce: { type: 'cash', rate: 2.0, capacity: 36000, seed: 25 },
    desc: 'Prints Cash continuously for the treasury.',
    helps: 'Safer cash than a petrol pump - it does not explode - but it earns less per second.'
  },
  spring_trap: {
    name: 'Spring Launch Trap', category: 'defense', icon: '\u{1F300}', role: ROLE.TRAP,
    cost: { cash: 100, iron: 140, wood: 80 }, maxHp: 350, footprint: 1,
    // lootMultiplier 0, like the landmine: a drive-over trap is not part of the city's 100% and
    // re-arms free after every raid, so a blast that razes one must not pay. (Rounds fly over it.)
    buildBase: 2.5, unlockTH: 2, tall: false, lootMultiplier: 0,
    trap: { kind: 'launch', radius: 4.5, launchSpeed: 26, stunSeconds: 1.8, oneShot: false },
    desc: 'Coiled pressure plate that catapults a vehicle into the air.',
    helps: 'Pops the raider straight up, bleeds off most of their speed and takes the wheel away for nearly two seconds (longer per level). In the air they are safe from guns, traps and cruisers (drones still strafe them), but they come down slow and out of control and coast to a near stop - so cover the landing spot with guns and cruisers.'
  },

  // ---------------------------------------------------------------- TH3
  weapons_lab: {
    name: 'Weapons & Munitions Lab', category: 'defense', icon: '\u{1F4A3}', role: ROLE.RESEARCH,
    cost: { cash: 550, iron: 350, wood: 250 }, maxHp: 850, footprint: 2,
    buildBase: 20, unlockTH: 3, tall: false, unique: true,
    // radiusPerLevel is small on purpose: a bomb's area grows with the SQUARE of its radius, and
    // +8% a level made one Drop Bomb hit a third of a Town Hall 12 city (see BOMB_VS_CANNON_MAX).
    // cannonPerLevel matches HP_PER_LEVEL: the autocannon gets stronger exactly as fast as the
    // buildings it has to raze get tougher. At +12% against HP's +55% a full Town Hall 12 city
    // took 27 minutes of autocannon fire against 1.7 at Town Hall 1 (raidModelAt).
    research: { grants: 'ordnance', damagePerLevel: 0.10, radiusPerLevel: 0.02, cannonPerLevel: 0.55 },
    desc: 'Explosive research foundry for your raid ordnance.',
    helps: 'Each level adds +10% damage to your Drop Bomb and Twin Missiles, +2% blast radius to the Drop Bomb, and +55% damage to the buggy\'s autocannon - against buildings and pursuit units alike, as fast as buildings toughen - on every raid you run.'
  },
  big_storage: {
    name: 'Big Storage Depot', category: 'civil', icon: '\u{1F4E6}', role: ROLE.STORAGE,
    cost: { cash: 600, iron: 400, wood: 500 }, maxHp: 900, footprint: 2,
    buildBase: 10, unlockTH: 3, tall: false,
    storage: { kind: 'buildings', slotsPerLevel: 6 },
    desc: 'Warehouse holding structures you lift off the map.',
    helps: 'Lets you redesign freely without demolishing: each depot level holds 6 stowed buildings (depots add up), and a stowed building comes back at the level it left at. A layout preset may park more here than it holds; you just cannot stow more by hand until you place some back.'
  },
  swat_armory: {
    name: 'SWAT Armory', category: 'defense', icon: '\u{1F6E1}\u{FE0F}', role: ROLE.SPAWNER,
    cost: { cash: 600, iron: 420, wood: 280 }, maxHp: 950, footprint: 2,
    buildBase: 18, unlockTH: 3, tall: false,
    // +1.5/level matches the Top Speed track (+5% of 30 per level, one level ahead of the
    // Town Hall), and PURSUIT_UNITS.swat.speedMin starts level with it, so EVERY unit a
    // level-TH armory rolls is at least as fast as a TH-tuned buggy on a road.
    spawn: { unit: 'swat', perStation: 1, hpPerLevel: 120, speedPerLevel: 1.5 },
    desc: 'Deploys armored SWAT interceptors in addition to your patrol cruisers.',
    helps: 'SWAT units are far tougher than a cruiser and faster than a stock buggy. Every armory level up to 11 makes them faster, so on a road the slowest of them keeps pace with a buggy tuned to your Town Hall, and off the asphalt, where a buggy loses a quarter of its speed, they out-run it - a raider cannot simply drive away from them without nitro or a jump. Level 12 adds toughness only: its SWAT already keep pace with the best-tuned buggy.'
  },
  solar_array: {
    name: 'Solar Array', category: 'economy', icon: '\u{2600}\u{FE0F}', role: ROLE.AURA,
    cost: { cash: 420, iron: 300, wood: 180 }, maxHp: 600, footprint: 2,
    buildBase: 14, unlockTH: 3, tall: false,
    produce: { type: 'cash', rate: 1.2, capacity: 21600, seed: 12 },
    aura: { kind: 'fireRate', radius: 30, bonusPerLevel: 0.04, stacks: false },
    desc: 'Photovoltaic field that both earns and powers your grid.',
    helps: 'Earns cash AND speeds up every turret and gate gun within 30m by 4% per level. Arrays do not stack - a gun takes the best array covering it - so spread them across turret clusters.'
  },
  landmine: {
    name: 'Buried Landmine', category: 'defense', icon: '\u{1F4A5}', role: ROLE.TRAP,
    cost: { cash: 120, iron: 180, wood: 60 }, maxHp: 250, footprint: 1,
    // lootMultiplier 0: a mine is spent by the raider driving onto it, and eating one must
    // not pay (it re-arms free after every raid - a loot printer otherwise).
    buildBase: 3, unlockTH: 3, tall: false, hidden: true, lootMultiplier: 0,
    trap: { kind: 'damage', radius: 8.0, damage: 600, oneShot: true },
    desc: 'Buried charge, invisible until it detonates. One use per raid.',
    helps: 'The single biggest burst of damage per resource in the game, but it only fires once. It goes off at full strength even on a raider fresh through the gate, and pays them no loot. Only one mine can go off under a raider every 1.5 seconds - the rest of a cluster stays buried and armed until then - so spread mines out along the route rather than packing them together. A spent mine leaves a crater, not rubble. Bury them where raiders must drive, not where they choose to.'
  },

  // ---------------------------------------------------------------- TH4
  tesla_coil: {
    name: 'Tesla Defense Coil', category: 'defense', icon: '\u{26A1}', role: ROLE.TURRET,
    cost: { cash: 500, iron: 350, wood: 200 }, maxHp: 850, footprint: 2,
    buildBase: 25, unlockTH: 4, tall: false,
    turret: { range: 22.0, fireInterval: 0.9, damage: 16, muzzleHeight: 5.0, tracer: 0x00e5ff },
    desc: 'High-voltage arcs that shred anything close.',
    helps: 'Shortest range but the fastest fire rate in the game. It is your answer to a raider who parks next to a building to shell it.'
  },
  oil_refinery: {
    name: 'Oil Refinery', category: 'economy', icon: '\u{1F3ED}', role: ROLE.PRODUCER,
    cost: { cash: 800, iron: 560, wood: 380 }, maxHp: 1100, footprint: 2,
    buildBase: 22, unlockTH: 4, tall: false,
    produce: { type: 'cash', rate: 6.0, capacity: 86400, seed: 50 },
    blast: { radius: 24, damage: 780 },
    desc: 'Cracking tower and tank farm. Enormous output, enormous detonation.',
    helps: 'The biggest cash-only earner in the game, and the most dangerous economy building you can own until the Fusion Reactor (Town Hall 7) - its blast is nearly twice a petrol pump\'s.'
  },

  // ---------------------------------------------------------------- TH5
  missile_silo: {
    name: 'Missile Silo', category: 'defense', icon: '\u{1F680}', role: ROLE.TURRET,
    cost: { cash: 900, iron: 650, wood: 400 }, maxHp: 1000, footprint: 2,
    buildBase: 28, unlockTH: 5, tall: false,
    // homing: a guided round flies at a constant `speed` (m/s) - well clear of a buggy tuned to
    // Town Hall 12 (48 m/s) off nitro - and steers onto the raider at up to `turnRate` rad/s
    // (TurretSystem._steer). At 42 m/s with a lerp that bled speed on every turn, a buggy
    // circling at 23 m/s dodged 12 missiles in 13.
    turret: { range: 55.0, fireInterval: 3.2, damage: 70, muzzleHeight: 4.4, tracer: 0xff6d00,
              homing: { speed: 68, turnRate: 4.5 } },
    desc: 'Silo launching guided missiles that track their target.',
    helps: 'Its missiles fly at 68 m/s, faster than any buggy off nitro, and steer to meet the raider, so dodging does not save them - only a nitro burn (never up more than half the raid), a jump, a cloak (missiles stop steering the moment it goes up, though one already on your line still lands) or getting out of range does. 55m of reach at level 1 covers most of your economy from one tile.'
  },
  tech_lab: {
    name: 'Tech Lab', category: 'defense', icon: '\u{1F9EA}', role: ROLE.RESEARCH,
    cost: { cash: 850, iron: 500, wood: 450 }, maxHp: 800, footprint: 2,
    buildBase: 26, unlockTH: 5, tall: false, unique: true,
    research: { grants: 'cardTier', cardLevelAt: { 4: 1, 5: 2 }, cooldownCutPerLevel: 0.03 },
    desc: 'Cyber-warfare lab that pushes ability cards past their limits.',
    helps: 'Unlocks ability-card levels 4 and 5 (Tech Lab 1 and 2), and every Tech Lab level recharges all your cards 3% faster (36% at level 12; a cloak can still never be up more than 80% of the time, a nitro burn more than 50%, nor a Big Jump keep the buggy in the air more than 70%). The Vehicle Lab only takes cards to level 3, so this is where your raid kit keeps growing. One lab per city - only one is ever read.'
  },
  freeze_trap: {
    name: 'Cryo Freeze Trap', category: 'defense', icon: '\u{2744}\u{FE0F}', role: ROLE.TRAP,
    cost: { cash: 200, iron: 240, wood: 120 }, maxHp: 400, footprint: 1,
    buildBase: 3, unlockTH: 5, tall: false, lootMultiplier: 0,   // see spring_trap
    trap: { kind: 'freeze', radius: 10.0, slowFactor: 0.35, slowSeconds: 3.0, oneShot: false },
    desc: 'Cryogenic burst that flash-freezes a drivetrain.',
    helps: 'Cuts the raider to a third of their speed for three seconds (longer per level). Pair it with a Laser Obelisk: its beam lands the instant it fires, so a crawling raider cannot slip it, while unguided rounds and shells aim where the raider was and only land once it stops.'
  },

  // ---------------------------------------------------------------- TH6
  laser_obelisk: {
    name: 'Laser Obelisk', category: 'defense', icon: '\u{1F526}', role: ROLE.TURRET,
    cost: { cash: 750, iron: 500, wood: 300 }, maxHp: 1350, footprint: 2,
    buildBase: 30, unlockTH: 6, tall: false,
    // beam: hits instantly (no projectile to dodge). pierce: share of each hit that skips
    // the shield and burns straight into the hull. damagePerLevel overrides the shared curve:
    // a modest first beam that out-grows every other gun but the siege Doomsday, whose shell has
    // to keep pace with Lab 12's plating.
    turret: { range: 38.0, fireInterval: 1.2, damage: 12, muzzleHeight: 7.0, tracer: 0xff1744,
              beam: true, pierce: 0.5, damagePerLevel: 0.32 },
    desc: 'Focused thermal beam that burns straight through armor.',
    helps: 'The best all-round turret: good range, good rate and the fastest damage growth of any gun but the siege Doomsday (+32% per level instead of +3%). The beam hits instantly, even a moving raider, and half of every hit ignores the buggy\'s shield - worth upgrading before anything else from Town Hall 6.'
  },

  // ---------------------------------------------------------------- TH7
  drone_hangar: {
    name: 'Drone Hangar', category: 'defense', icon: '\u{1F681}', role: ROLE.SPAWNER,
    cost: { cash: 1200, iron: 850, wood: 550 }, maxHp: 1150, footprint: 2,
    buildBase: 34, unlockTH: 7, tall: false,
    // damagePerLevel: every hangar level makes its drones' strafes hit harder too, not only
    // tougher and faster (pursuitUnitFor). Small, because a full swarm follows the raider
    // everywhere - DRONE_SWARM_MIN_SECONDS keeps it pressure, not a second kill box.
    spawn: { unit: 'drone', perStation: 2, hpPerLevel: 40, speedPerLevel: 1.2, damagePerLevel: 0.05, flying: true },
    desc: 'Launches autonomous attack drones that hunt from the air.',
    helps: 'Drones fly and strafe from above, so the Big Jump card does not shake them: the first defense that punishes an airborne raider. Every hangar level makes its drones tougher, faster and harder-hitting.'
  },
  fusion_reactor: {
    name: 'Fusion Reactor', category: 'economy', icon: '\u{269B}\u{FE0F}', role: ROLE.AURA,
    cost: { cash: 1600, iron: 1200, wood: 700 }, maxHp: 1400, footprint: 2,
    buildBase: 38, unlockTH: 7, tall: true,
    produce: { type: 'iron', rate: 9.0, capacity: 64800, seed: 40 },
    // +2%/level keeps a lone level-12 reactor (+24%) just under AURA_DAMAGE_CAP, so every
    // reactor level still pays; a relay on top adds range, and damage only up to the cap.
    aura: { kind: 'damage', radius: 45, bonusPerLevel: 0.02, stacks: false },
    blast: { radius: 32, damage: 1400 },
    desc: 'Containment torus feeding the whole defensive grid.',
    helps: 'Smelts iron at 9/s (3.6x an Iron Foundry, the most of any building) AND adds +2% DAMAGE per level to every turret and gate gun within 45m (+24% at level 12) - your first damage aura, three Town Halls before the Orbital Relay. Reactors do not stack: a gun takes the best one covering it, and reactor plus relay damage never adds more than +25%, so under a high-level relay a reactor adds little damage. It also detonates catastrophically, so never ring it with your own economy.'
  },

  // ---------------------------------------------------------------- TH8
  plasma_mortar: {
    name: 'Plasma Mortar', category: 'defense', icon: '\u{1F30B}', role: ROLE.TURRET,
    cost: { cash: 1500, iron: 1100, wood: 650 }, maxHp: 1250, footprint: 2,
    buildBase: 40, unlockTH: 8, tall: false,
    turret: { range: 60.0, minRange: 14.0, fireInterval: 3.6, damage: 95, splashRadius: 9.0, muzzleHeight: 3.8, tracer: 0xaa00ff, arcing: true },
    desc: 'Lobs plasma shells in a high arc. Cannot hit what is too close.',
    helps: 'Splash damage over a huge area, so it punishes raiders who bunch up against a wall. Its 14m dead zone is a real weakness - never leave a mortar undefended up close.'
  },
  vortex_trap: {
    name: 'Vortex Trap', category: 'defense', icon: '\u{1F32A}\u{FE0F}', role: ROLE.TRAP,
    cost: { cash: 400, iron: 480, wood: 240 }, maxHp: 500, footprint: 1,
    buildBase: 4, unlockTH: 8, tall: false, lootMultiplier: 0,   // see spring_trap
    trap: { kind: 'pull', radius: 12.0, pullStrength: 18, holdSeconds: 4.0, oneShot: false },
    desc: 'Gravitic well that drags a vehicle back toward its centre.',
    helps: 'Does no damage at all - it leashes the raider inside its radius for four seconds (longer per level) while dragging it toward the centre. Put it where your Laser Obelisks already reach; a raider that stops fighting the pull sits still for every other gun too.'
  },

  // ---------------------------------------------------------------- TH9
  emp_disrupter: {
    name: 'EMP Disrupter', category: 'defense', icon: '\u{1F4E1}', role: ROLE.AURA,
    cost: { cash: 1800, iron: 1300, wood: 800 }, maxHp: 1100, footprint: 2,
    buildBase: 44, unlockTH: 9, tall: false,
    // 16 m + 0.5 m a level: it jams the cluster round it, so the core is fought without cards
    // until it falls. At 26 m + 3 m a level three level-12 fields (59 m) covered most of the map
    // and reached the gates: the buggy was jammed from the breach and a Town Hall 9-12 raid never
    // got past 30% (raidModelAt).
    aura: { kind: 'silence', radius: 16, radiusPerLevel: 0.5, stacks: false, targetsRaider: true },
    desc: 'Broadcasts a field that locks out vehicle electronics.',
    helps: 'Jams the raider\'s ABILITY CARDS inside its radius (16m, +0.5m per level): no nitro, no invisibility, no missiles, no bomb and no Big Jump boost, and a cloak or nitro burn already running cuts out on entry. Only the small mechanical hop still works. It is the hard counter to a fully-tuned garage.'
  },
  crypto_vault: {
    name: 'Crypto Vault', category: 'economy', icon: '\u{1F510}', role: ROLE.STORAGE,
    cost: { cash: 2000, iron: 1400, wood: 900 }, maxHp: 1600, footprint: 2,
    buildBase: 46, unlockTH: 9, tall: false,
    // raidOnly: fills like a producer (including while you are away) but can never be
    // tapped - its contents are paid out as raid loot only when the vault is destroyed.
    produce: { type: 'cash', rate: 4.0, capacity: 144000, seed: 0, raidOnly: true },
    desc: 'Hardened vault that banks cash for your next raid.',
    helps: 'Mines cash around the clock (more per level, holds about ten hours at level 1 and longer at every level) but cannot be tapped. The only way to get it out is to crack it open in a raid: everything inside is added to your loot the moment the raider destroys the vault, and a raid that never breaks it takes nothing.'
  },

  // ---------------------------------------------------------------- TH10
  orbital_relay: {
    name: 'Orbital Relay', category: 'defense', icon: '\u{1F6F0}\u{FE0F}', role: ROLE.AURA,
    cost: { cash: 2600, iron: 1900, wood: 1100 }, maxHp: 1500, footprint: 2,
    buildBase: 50, unlockTH: 10, tall: true,
    aura: { kind: 'targeting', radius: 999, bonusPerLevel: 0.02, stacks: false, global: true },
    desc: 'Towering uplink that paints the raider for every gun in the city.',
    helps: 'Marks the raider city-wide: every turret and gate gun you own gains +2% range and damage per relay level (+24% at level 12) for as long as a relay stands. Relays do not stack - the best standing one counts - so a second relay is a backup, not a multiplier. Relay plus Fusion Reactor damage never adds more than +25% to one gun; the range always counts.'
  },

  // ---------------------------------------------------------------- TH11
  doomsday_turret: {
    name: 'Doomsday Turret', category: 'defense', icon: '\u{1F52B}', role: ROLE.TURRET,
    cost: { cash: 3400, iron: 2600, wood: 1500 }, maxHp: 2000, footprint: 2,
    buildBase: 54, unlockTH: 11, tall: true,
    // A siege gun: the biggest shell by far, on a 45-second reload. Its own +38% a level keeps
    // "two shells" true against the Town Hall 11/12 raider and its late deflector plating (Lab
    // 12's 4,500), while a level-1 shell stays under an untuned buggy's 700.
    turret: { range: 50.0, fireInterval: 45.0, damage: 690, muzzleHeight: 9.5, tracer: 0xff1744, damagePerLevel: 0.38 },
    desc: 'Siege cannon that deletes a vehicle in two hits.',
    helps: 'The hardest-hitting gun in the game: 690 damage a shell at level 1, +38% per level. Two shells wreck an untuned buggy, and at your own Town Hall level two shells still wreck a buggy tuned to match - one shell never does, however many reactors and relays boost it. It reloads for 45 seconds, so it needs faster turrets covering it: every one of their hits lands as well.'
  },
  antimatter_collider: {
    name: 'Antimatter Collider', category: 'economy', icon: '\u{1F52C}', role: ROLE.PRODUCER,
    cost: { cash: 4000, iron: 3000, wood: 1800 }, maxHp: 2200, footprint: 2,
    buildBase: 56, unlockTH: 11, tall: true,
    produce: { type: 'all', rate: 8.0, capacity: 57600, seed: 60 },
    blast: { radius: 40, damage: 2200 },
    desc: 'Particle ring that manufactures cash, iron AND wood at once.',
    helps: 'The only building that produces all three resources. Its containment failure is the largest explosion in the game - place it far from anything you care about.'
  },

  // ---------------------------------------------------------------- TH12
  quantum_citadel: {
    name: 'Quantum Citadel', category: 'civil', icon: '\u{1F52E}', role: ROLE.AURA,
    cost: { cash: 6000, iron: 4500, wood: 2600 }, maxHp: 3000, footprint: 3,
    buildBase: 60, unlockTH: 12, tall: true,
    // 4% a level (48% at 12). At 5% (60%) the one Citadel made a Town Hall 12 raid far harder than
    // Town Hall 11's: every gun, spawner and aura packed round the core took 2.5x as long to raze,
    // and the pursuit had that much longer to bust the raider (raidbot.mjs, shuffled layouts:
    // lifting the Citadel off a full TH12 city took the bot from 38 wins in 120 to 72).
    aura: { kind: 'shield', radius: 40, bonusPerLevel: 0.04, stacks: false },
    desc: 'Levitating anti-gravity spire projecting a cosmic shield.',
    helps: 'Every building within 40m takes 4% less damage per citadel level (48% at level 12) - until the citadel itself falls. Explosives are the exception: one caught in another explosive\'s blast still goes off. The citadel does not shield itself. The endgame capstone: a raider who leaves it standing fights your whole core at up to 48% less damage.'
  }
};

export const BUILDING_TYPES = Object.keys(BUILDING_DEFS);

// ---------------------------------------------------------------------------
// THE LADDER. One row per building type, twelve columns (Town Hall 1..12).
// A 0 means "not unlocked yet". The first non-zero column MUST equal the
// type's unlockTH - validateProgression() enforces that at boot.
// Every type that is unlocked grows at least a little across the ladder, so
// there is always a reason to push the Town Hall one level further - except the
// `unique` research labs, which only ever read your best one and so stay at 1, and
// the turret rows, which the kill-box band holds nearly flat.
//
// Turrets: a single raider meets every gun you own at once when it parks in your kill box,
// so the turret rows are sized so that box never shreds a buggy tuned to the same Town Hall
// in under KILL_BAND.min seconds (parkedKillSecondsAt). They are well below the design doc's
// counts (10 snipers, 6 coils ... at Town Hall 12): with every hit landing, those 31 guns
// killed a parked TH12 buggy in 0.2 s, and even with no per-level growth at all in 2.4 s.
// ---------------------------------------------------------------------------
// Roads: the starter city already lays 105 tiles, so the road budget starts above that.
// Police: a Town Hall 1 city has one station. A first raid meets the buggy with no cloak and no
// tuning (850 hull + shield), and two cruisers busted it about twice as often as Town Halls 2-6
// did theirs (raidbot.mjs: 1.3-1.4 lives lost a raid against 0.2-1.1 at Town Halls 2-7).
// Landmines grow two a Town Hall all the way: the four Town Hall 12 used to add filled the last
// ground inside the wall (raidbot.mjs: 30% of the damage in the lives a Town Hall 12 raid lost).
// Town Hall 12 adds no police station, SWAT armory or EMP Disrupter to Town Hall 11's. With an 8th
// station, a 6th armory, a 3rd field (and a 60% Citadel) its pursuit busted the raider four times
// as often per exposed minute as Town Hall 11's, and a full city cost the bot 7.9 lives (TH11: 4.6)
// over 120 shuffled layouts (raidbot.mjs --layout shuffled). Its step up is the Citadel, the 4th
// sniper and drone hangar, more traps and every building a level tougher.
export const BUILD_LIMITS = {
  //                     TH1 TH2 TH3 TH4 TH5 TH6 TH7 TH8 TH9 T10 T11 T12
  town_hall:            [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
  main_gate:            [  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3,  3],
  police_station:       [  1,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7],
  petrol_pump:          [  2,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  8],
  lumber_mill:          [  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8],
  iron_foundry:         [  2,  2,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8],
  spike_trap:           [  2,  4,  4,  4,  5,  5,  6,  6,  7,  7,  8,  8],
  roadblock:            [  6,  8, 10, 12, 15, 18, 20, 24, 28, 32, 36, 40],
  builder_hut:          [  2,  3,  3,  4,  4,  5,  5,  5,  6,  6,  6,  7],
  tree:                 [ 16, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60, 70],
  road:                 [130,150,170,190,210,235,260,285,310,340,370,400],

  vehicle_lab:          [  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
  sniper_tower:         [  0,  2,  3,  3,  3,  3,  3,  3,  3,  3,  3,  4],
  cash_mint:            [  0,  1,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7],
  spring_trap:          [  0,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  8],

  weapons_lab:          [  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
  big_storage:          [  0,  0,  1,  1,  1,  2,  2,  2,  2,  3,  3,  3],
  swat_armory:          [  0,  0,  1,  2,  2,  3,  3,  4,  4,  5,  5,  5],
  solar_array:          [  0,  0,  2,  2,  3,  3,  4,  4,  4,  5,  5,  6],
  landmine:             [  0,  0,  4,  6,  8, 10, 12, 14, 16, 18, 20, 22],

  tesla_coil:           [  0,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2],
  oil_refinery:         [  0,  0,  0,  1,  2,  2,  3,  3,  3,  4,  4,  5],

  missile_silo:         [  0,  0,  0,  0,  1,  2,  2,  2,  2,  2,  2,  2],
  tech_lab:             [  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1],
  freeze_trap:          [  0,  0,  0,  0,  3,  4,  5,  6,  6,  7,  8,  8],

  laser_obelisk:        [  0,  0,  0,  0,  0,  1,  1,  1,  2,  2,  2,  2],

  drone_hangar:         [  0,  0,  0,  0,  0,  0,  1,  2,  2,  3,  3,  4],
  fusion_reactor:       [  0,  0,  0,  0,  0,  0,  1,  1,  2,  2,  3,  3],

  plasma_mortar:        [  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1],
  vortex_trap:          [  0,  0,  0,  0,  0,  0,  0,  2,  3,  4,  5,  6],

  emp_disrupter:        [  0,  0,  0,  0,  0,  0,  0,  0,  1,  2,  2,  2],
  crypto_vault:         [  0,  0,  0,  0,  0,  0,  0,  0,  1,  2,  2,  3],

  orbital_relay:        [  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  2,  2],

  doomsday_turret:      [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1],
  antimatter_collider:  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  2],

  quantum_citadel:      [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1]
};

/**
 * Per-Town-Hall city-wide allowances. Index 0 = Town Hall 1.
 *   cityRadius      buildable radius in tiles; the perimeter wall (and its gates) is at
 *                   PERIMETER_WALL_TILES. Town Hall 12 stops at 14.8, not the wall itself:
 *                   built out to 15, a full city's trap belt ran up to the fence and left a
 *                   raider no ground to turn on inside it (landmines alone took a life or two
 *                   of every raid, about twice Town Hall 11's - raidbot.mjs).
 *   policeCap       city-wide pursuit-unit cap. Always >= the units every allowed spawner
 *                   would deploy (stations + armories + 2 per hangar), so a new spawner
 *                   type is never starved by the older ones - validateProgression enforces it.
 *   raidGems        gems for a victory against a full-sized, fully defended city.
 *   raidMinTargets  counted structures a city needs for the full gem bounty (~60% of the
 *                   Town Hall's counted build limits). Smaller cities are paid pro rata, so
 *                   stowing the city and razing a lone Town Hall earns nothing.
 * The defense half of the bounty has no column: it asks for EVERY kind of raid defense the Town
 * Hall allows (raidThreatKindsAt - every gun, pursuit base, trap and aura type), each with
 * RAID_KIND_SHARE of its build limit standing at full strength - see raidDefenseFor. Economy,
 * labs and barriers alone pay nothing.
 */
/** The perimeter wall and its three Main Gates stand this many tiles from the centre (82.5 m). */
export const PERIMETER_WALL_TILES = 15;

export const TOWN_HALLS = [
  { level: 1,  name: 'Frontier Settlement',            theme: 'Wood & Cobblestone Countryside',                 builders: 2, cityRadius: 11.5, policeCap: 4,  raidGems: 2,  raidMinTargets: 11 },
  { level: 2,  name: 'Rural County Seat',              theme: 'Red Brick & Wrought Iron',                       builders: 3, cityRadius: 11.8, policeCap: 5,  raidGems: 3,  raidMinTargets: 18 },
  { level: 3,  name: 'Developing Township',            theme: 'Reinforced Masonry & Structural Timber',         builders: 3, cityRadius: 12.1, policeCap: 5,  raidGems: 4,  raidMinTargets: 25 },
  { level: 4,  name: 'Industrial Borough',             theme: 'Structural Steel, Rivets & Steam',               builders: 4, cityRadius: 12.4, policeCap: 6,  raidGems: 5,  raidMinTargets: 31 },
  { level: 5,  name: 'Modern Municipality',            theme: 'Pre-Stressed Concrete & Electronics',            builders: 4, cityRadius: 12.7, policeCap: 7,  raidGems: 6,  raidMinTargets: 37 },
  { level: 6,  name: 'High-Tech City',                 theme: 'Polished Glass, Chrome & Optical Lasers',        builders: 5, cityRadius: 13.0, policeCap: 8,  raidGems: 8,  raidMinTargets: 44 },
  { level: 7,  name: 'Cybernetic Metropolis',          theme: 'Carbon-Fiber, Neon & Autonomous Drones',         builders: 5, cityRadius: 13.3, policeCap: 10, raidGems: 10, raidMinTargets: 49 },
  { level: 8,  name: 'Fortified Megalopolis',          theme: 'Reinforced Composite Armor & Plasma Ordnance',   builders: 5, cityRadius: 13.6, policeCap: 13, raidGems: 12, raidMinTargets: 55 },
  { level: 9,  name: 'Cyberpunk Sprawl',               theme: 'Dark Alloy, Holograms & EMP Fields',             builders: 6, cityRadius: 13.9, policeCap: 14, raidGems: 14, raidMinTargets: 62 },
  { level: 10, name: 'Orbital Bastion',                theme: 'Hard-Light Emitters & Orbital Kinetic Arrays',   builders: 6, cityRadius: 14.2, policeCap: 17, raidGems: 17, raidMinTargets: 71 },
  { level: 11, name: 'Apex Titan Fortress',            theme: 'Adamantium Plating & Cataclysm Cannons',         builders: 6, cityRadius: 14.6, policeCap: 18, raidGems: 20, raidMinTargets: 78 },
  { level: 12, name: 'Transcendent Quantum Metropolis', theme: 'Anti-Gravity Rings, Aurora Energy & Cosmic Shields', builders: 7, cityRadius: 14.8, policeCap: 20, raidGems: 25, raidMinTargets: 89 }
];

// ---------------------------------------------------------------------------
// Curves. These are THE formulas - no consumer may re-derive them inline.
// ---------------------------------------------------------------------------
export const HP_PER_LEVEL = 0.55;        // +55% of base HP per level above 1
// Rammable barriers keep their 2000 / 900 base HP but grow slowly: at +55% a level-12
// roadblock out-lasted the Town Hall and barriers were half of all the HP a raid had to chew.
export const BARRIER_HP_PER_LEVEL = 0.15;
export const COST_PER_LEVEL = 1.7;       // upgrade cost multiplier per level
export const PRODUCE_PER_LEVEL = 0.35;   // +35% of base rate per level above 1
/**
 * +80% of base capacity per level above 1, well ahead of PRODUCE_PER_LEVEL, so a producer holds
 * more hours the higher it goes: an iron foundry fills in 2 h at level 1 and about 4 h at 12,
 * when every job runs to the 8-hour cap. At +40% every level filled in about 2 h, and a player
 * checking in at the job cadence banked barely a quarter of the city's output.
 */
export const CAPACITY_PER_LEVEL = 0.8;
export const TURRET_RANGE_PER_LEVEL = 0.12;
/**
 * Turret damage per level (a turret may override with turret.damagePerLevel). Levels mostly
 * buy a gun HP (HP_PER_LEVEL) and reach: every round now lands, and at +35% damage and +15%
 * fire rate a level the full Town Hall 12 kit out-grew the raider 283x to 3.3x.
 */
export const TURRET_DAMAGE_PER_LEVEL = 0.03;
/** Fire-rate growth per level. 0: a gun's rate is its own; Solar Arrays are what speed it up. */
export const TURRET_RATE_PER_LEVEL = 0;
export const TURRET_RATE_FLOOR = 0.55;

// Drive-over traps (TrapSystem). Tuned so a same-level landmine takes about half of a buggy
// tuned to the same Town Hall through Town Hall 6, never all of it; from Town Hall 7 the
// Vehicle Lab's deflector plating (shieldAt) takes that share down to about a quarter at 12.
export const TRAP_DAMAGE_PER_LEVEL = 0.12;
export const TRAP_RADIUS_PER_LEVEL = 0.03;
export const TRAP_DURATION_PER_LEVEL = 0.08;
/** A trap re-arms this long after its effect ENDS, so a raider always gets a window to leave. */
export const TRAP_REARM_SECONDS = 4.0;
/**
 * After a landmine goes off under the raider, no other mine can for this long: the rest of a
 * cluster stays buried and armed. Every mine in reach used to fire in the same frame, so two
 * on adjacent tiles wrecked a buggy tuned to Town Halls 3-6 and three wrecked it up to Town
 * Hall 9, all inside the breach grace. 1.5 s carries even a stock buggy off-road (22.5 m/s)
 * clear of a row of three level-12 mines along its path, so a stack costs one mine's damage.
 */
export const MINE_STACK_WINDOW = 1.5;

// Explosive buildings (DestructionEngine chain reactions).
export const BLAST_DAMAGE_PER_LEVEL = 0.12;
export const BLAST_RADIUS_PER_LEVEL = 0.03;
/** Damage at the very edge of a blast, as a share of the centre damage (see blastDamageAt). */
export const BLAST_FALLOFF_FLOOR = 0.3;

/** Loot a destroyed building pays per level (explosives pay more cash). */
export const LOOT_PER_LEVEL = { cash: 120, iron: 80, wood: 90 };
export const EXPLOSIVE_LOOT_CASH = 250;
/**
 * Share of its loot a building pays when an explosive's blast razed it or set it off (what the
 * raider razes itself pays in full). At full loot one pump shot open set off every explosive
 * clustered round it and paid for all of them: about 20 s of a hit-and-run on your own city
 * (loot is banked on a retreat too, and the city comes back free) paid 1-1.5 minutes of the
 * whole city's iron and wood, repeatable without limit.
 */
export const CHAIN_LOOT_SHARE = 0.25;

/**
 * One explosive shot open in a full city, at every Town Hall: besides the explosives it sets
 * off (each one inside another's blast goes off, by design), its chain reaction razes at most
 * CHAIN_RAZE_MAX of the city's counted structures and pays at most CHAIN_LOOT_MAX_MINUTES of
 * the whole city's production of any resource. verify-progression runs the real
 * DestructionEngine on full cities laid out three ways (mixed rings, explosives round the rim,
 * every explosive packed at the centre ringed by the flimsiest buildings). With every blast at
 * full strength to its rim and summed, one reactor razed 40-86% of a full Town Hall 7-12 city
 * and paid 5-9 minutes of its iron and wood.
 */
export const CHAIN_RAZE_MAX = 0.1;
export const CHAIN_LOOT_MAX_MINUTES = 1;

/** Quantum Citadel: the damage reduction never exceeds this, however many levels (level 12 is 48%). */
export const SHIELD_AURA_CAP = 0.5;

/**
 * Fusion Reactor (+2%/level) and Orbital Relay (+2%/level) damage together never add more
 * than this. Uncapped they multiplied the whole kill box, and at +50% one boosted Doomsday
 * shell came within reach of a buggy tuned to the same Town Hall - the copy promises it takes
 * two. With Solar's fire rate on top, the full aura kit is still worth x1.85 at Town Hall 12.
 */
export const AURA_DAMAGE_CAP = 0.25;

/** The mounted turret on each fixed Main Gate (gates are not upgradeable). */
export const GATE_TURRET = { range: 35.0, fireInterval: 1.4, damage: 22, muzzleHeight: 5.4 };

/**
 * Every reload is the gun's fire interval plus up to this share of it at random, so guns fall
 * out of step. It scales with the interval: a flat 0.4 s on top ate a third of a Solar Array's
 * promised speed-up on a fast gun (an L12 array's +48% came out as +30% on a Tesla Coil).
 */
export const TURRET_RELOAD_JITTER = 0.1;

/**
 * Splash rounds (Plasma Mortar) burst where they were aimed. Full damage inside this share
 * of the splash radius, then a linear fall to SPLASH_FALLOFF_FLOOR at the edge, 0 beyond.
 */
export const SPLASH_FULL_SHARE = 1 / 3;
export const SPLASH_FALLOFF_FLOOR = 0.35;

/**
 * Pursuit units a spawner sends. A spawner's catalog entry names the unit and adds
 * per-level HP, speed (and for drones strafe damage) on top. SWAT starts faster than a stock
 * buggy, and its slowest roll at armory level L is exactly as fast as a buggy whose Top Speed
 * track matches Town Hall L (one level ahead of it), so no unit is simply out-run on a road.
 * Only a nitro burn out-runs them, and never for more than CARD_UPTIME_CAP.nitro of a raid.
 */
export const PURSUIT_UNITS = {
  cruiser: { hp: 320, speedMin: 16.5, speedMax: 19.0, accel: 8.5, turn: 1.5, scale: 1.0, flying: false },
  // paceTunedBuggy: the whole roll range shifts down so its slowest unit is never faster than a
  // buggy tuned to the armory's level on a road (tracks stop at 12, so level 12 would be).
  swat:    { hp: 600, speedMin: 33.0, speedMax: 36.0, accel: 13.0, turn: 1.7, scale: 1.18, flying: false, paceTunedBuggy: true },
  drone:   { hp: 180, speedMin: 23.0, speedMax: 25.0, accel: 16.0, turn: 2.6, scale: 1.0, flying: true,
             altitude: 6.5, strafeDamage: 35, strafeInterval: 1.2, strafeRange: 4.5 }
};

const clampLevel = (level) => {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_BUILDING_LEVEL, n));
};

const clampTH = (th) => {
  const n = Math.round(Number(th));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_TOWN_HALL_LEVEL, n));
};

export function defFor(type) {
  return BUILDING_DEFS[type] || null;
}

/** Max HP of `type` at `level`. The ONLY HP formula in the game. */
export function hpForLevel(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def) return null;
  const base = Number(def.maxHp);
  if (!Number.isFinite(base) || base <= 0) return null;   // roads have no HP
  const perLevel = def.role === ROLE.BARRIER ? BARRIER_HP_PER_LEVEL : HP_PER_LEVEL;
  return Math.round(base * (1 + (clampLevel(level) - 1) * perLevel));
}

/** Resource cost to REACH `level` (level 1 == the shop price). */
export function costForLevel(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def) return null;
  const mult = Math.pow(COST_PER_LEVEL, clampLevel(level) - 1);
  return {
    cash: Math.round((def.cost.cash || 0) * mult),
    iron: Math.round((def.cost.iron || 0) * mult),
    wood: Math.round((def.cost.wood || 0) * mult)
  };
}

/** Build/upgrade duration in seconds. Doubles each level, capped at 8 hours. */
export function buildSecondsFor(type, level) {
  const def = BUILDING_DEFS[type];
  const base = def && Number.isFinite(def.buildBase) ? def.buildBase : 10;
  return Math.min(MAX_BUILD_SECONDS, Math.round(base * Math.pow(2, clampLevel(level) - 1)));
}

export function produceRateFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.produce) return 0;
  return def.produce.rate * (1 + (clampLevel(level) - 1) * PRODUCE_PER_LEVEL);
}

export function produceCapacityFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.produce) return 0;
  return Math.round(def.produce.capacity * (1 + (clampLevel(level) - 1) * CAPACITY_PER_LEVEL));
}

/** Live turret stats at a level, or null if the type does not shoot. */
export function turretStatsFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.turret) return null;
  const t = def.turret;
  const L = clampLevel(level);
  const dmgPerLevel = Number.isFinite(t.damagePerLevel) ? t.damagePerLevel : TURRET_DAMAGE_PER_LEVEL;
  return {
    ...t,
    range: t.range * (1 + (L - 1) * TURRET_RANGE_PER_LEVEL),
    fireInterval: t.fireInterval * Math.max(TURRET_RATE_FLOOR, 1 - (L - 1) * TURRET_RATE_PER_LEVEL),
    damage: Math.round(t.damage * (1 + (L - 1) * dmgPerLevel))
  };
}

/** Live drive-over trap stats at a level, or null if the type is not a trap. */
export function trapStatsFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.trap) return null;
  const t = def.trap;
  const L = clampLevel(level);
  const dur = 1 + (L - 1) * TRAP_DURATION_PER_LEVEL;
  const out = {
    kind: t.kind,
    radius: t.radius * (1 + (L - 1) * TRAP_RADIUS_PER_LEVEL),
    damage: Math.round((t.damage || 0) * (1 + (L - 1) * TRAP_DAMAGE_PER_LEVEL)),
    slowFactor: t.slowFactor || 1,
    slowSeconds: (t.slowSeconds || 0) * dur,
    launchSpeed: t.launchSpeed || 0,
    stunSeconds: (t.stunSeconds || 0) * dur,
    pullStrength: t.pullStrength || 0,
    holdSeconds: (t.holdSeconds || 0) * dur,
    oneShot: !!t.oneShot
  };
  out.rearmSeconds = Math.max(out.slowSeconds, out.stunSeconds, out.holdSeconds) + TRAP_REARM_SECONDS;
  return out;
}

/** Chain-reaction blast of an explosive building at a level, or null. */
export function blastFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.blast) return null;
  const L = clampLevel(level);
  return {
    radius: def.blast.radius * (1 + (L - 1) * BLAST_RADIUS_PER_LEVEL),
    damage: Math.round(def.blast.damage * (1 + (L - 1) * BLAST_DAMAGE_PER_LEVEL))
  };
}

/** Damage a splash round deals `dist` metres from where it burst (0 outside `splashRadius`). */
export function splashDamageAt(damage, splashRadius, dist) {
  if (!(splashRadius > 0) || !(dist <= splashRadius)) return 0;
  const full = splashRadius * SPLASH_FULL_SHARE;
  const k = dist <= full ? 1 : Math.max(SPLASH_FALLOFF_FLOOR, 1 - (dist - full) / (splashRadius - full));
  // Not rounded: turret damage arrives here already carrying its (fractional) aura bonus.
  return damage * k;
}

/**
 * Damage a blast deals `dist` metres from its centre (0 outside the radius): to the raider, and
 * to the buildings a Drop Bomb or an explosive building's blast catches.
 */
export function blastDamageAt(blast, dist) {
  if (!blast || !(dist <= blast.radius)) return 0;
  return Math.round(blast.damage * Math.max(BLAST_FALLOFF_FLOOR, 1 - dist / blast.radius));
}

/**
 * Chain reactions: does a `type` building caught inside another explosive's blast radius go
 * off itself? Every explosive (anything with a `blast`) does, whatever its level, HP or
 * Citadel cover - so "detonates in a chain reaction" holds at every level. As plain damage
 * it held only at level 1: building HP grows +55% a level against the blast's +12%, and a
 * refinery never set off another refinery at all. Everything else in the radius just takes
 * the blast's damage (blastDamageAt) - once per chain reaction: a building caught in several
 * of its blasts takes the hardest one (DestructionEngine.destroyBuilding).
 */
export function detonatesInBlast(type) {
  const def = BUILDING_DEFS[type];
  return !!(def && def.blast);
}

/**
 * Loot a destroyed building pays out (trees and other lootMultiplier-0 types pay nothing).
 * `chained`: an explosive's blast razed it or set it off, so it pays CHAIN_LOOT_SHARE of that.
 */
export function lootFor(type, level, { chained = false } = {}) {
  const def = BUILDING_DEFS[type] || {};
  const L = Math.max(1, Math.round(Number(level)) || 1);
  const mult = (def.lootMultiplier === undefined ? 1 : def.lootMultiplier) * (chained ? CHAIN_LOOT_SHARE : 1);
  return {
    cash: Math.round((def.blast ? EXPLOSIVE_LOOT_CASH : LOOT_PER_LEVEL.cash) * L * mult),
    iron: Math.round(LOOT_PER_LEVEL.iron * L * mult),
    wood: Math.round(LOOT_PER_LEVEL.wood * L * mult)
  };
}

/** Strength of an aura at a level (fire-rate / damage / range share, or shield reduction). */
export function auraBonusFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.aura) return 0;
  const bonus = (def.aura.bonusPerLevel || 0) * clampLevel(level);
  return def.aura.kind === 'shield' ? Math.min(SHIELD_AURA_CAP, bonus) : bonus;
}

/** Radius of an aura at a level (EMP fields grow with radiusPerLevel; others are fixed). */
export function auraRadiusFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.aura) return 0;
  return def.aura.radius + (def.aura.radiusPerLevel || 0) * (clampLevel(level) - 1);
}

/** Aura kinds that change a gun's numbers (EMP 'silence' and Citadel 'shield' act elsewhere). */
export const TURRET_AURA_KINDS = ['fireRate', 'damage', 'targeting'];

/**
 * Multipliers a gun gets from the STANDING aura buildings covering it; `sources` is
 * [{ type, level }]. An aura with stacks:false counts only its best source of that kind
 * (a second relay is a backup, not a multiplier); stacks:true would add them up.
 *   fireRate  -> rate      damage -> damage      targeting -> damage AND range
 * The damage and targeting bonuses share one ceiling, AURA_DAMAGE_CAP.
 */
export function turretAuraMultipliers(sources) {
  const best = {};
  const sum = {};
  for (const s of sources || []) {
    const def = BUILDING_DEFS[s.type];
    if (!def || !def.aura || !TURRET_AURA_KINDS.includes(def.aura.kind)) continue;
    const kind = def.aura.kind;
    const bonus = auraBonusFor(s.type, s.level);
    if (def.aura.stacks) sum[kind] = (sum[kind] || 0) + bonus;
    else best[kind] = Math.max(best[kind] || 0, bonus);
  }
  const k = (kind) => (best[kind] || 0) + (sum[kind] || 0);
  return {
    rate: 1 + k('fireRate'),
    damage: 1 + Math.min(AURA_DAMAGE_CAP, k('damage') + k('targeting')),
    range: 1 + k('targeting')
  };
}

/** Stowed-building slots a Big Storage Depot provides at a level. */
export function storageSlotsFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.storage || def.storage.kind !== 'buildings') return 0;
  return (def.storage.slotsPerLevel || 0) * clampLevel(level);
}

/**
 * What one unit of producer output is worth per resource. 'all' (the Antimatter Collider)
 * pays a unit of EACH resource, which is what "cash, iron AND wood at once" means.
 */
export const PRODUCE_SPLIT = {
  cash: { cash: 1 },
  iron: { iron: 1 },
  wood: { wood: 1 },
  all:  { cash: 1, iron: 1, wood: 1 }
};

/** Resources paid for collecting `amount` units of `produceType` output. */
export function producePayout(produceType, amount) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  const split = PRODUCE_SPLIT[produceType] || PRODUCE_SPLIT.cash;
  return {
    cash: Math.floor(n * (split.cash || 0)),
    iron: Math.floor(n * (split.iron || 0)),
    wood: Math.floor(n * (split.wood || 0))
  };
}

/** Offline production: what `stored` becomes after `seconds` away (capped at capacity). */
export function storedAfter(type, level, stored, seconds) {
  const cap = produceCapacityFor(type, level);
  const gained = produceRateFor(type, level) * Math.max(0, Number(seconds) || 0);
  return Math.max(0, Math.min(cap, (Number(stored) || 0) + gained));
}

/**
 * The pursuit unit a spawner of `type` sends at `level`: its PURSUIT_UNITS archetype plus the
 * spawner's per-level HP, speed and (drones) strafe damage (speedMin..speedMax is the spread
 * one unit rolls from). null if `type` spawns nothing.
 */
export function pursuitUnitFor(type, level) {
  const def = BUILDING_DEFS[type];
  if (!def || !def.spawn) return null;
  const s = def.spawn;
  const kind = PURSUIT_UNITS[s.unit] ? s.unit : 'cruiser';
  const K = PURSUIT_UNITS[kind];
  const up = clampLevel(level) - 1;
  const out = {
    ...K,
    kind,
    hp: Math.round(K.hp + (s.hpPerLevel || 0) * up),
    speedMin: K.speedMin + (s.speedPerLevel || 0) * up,
    speedMax: K.speedMax + (s.speedPerLevel || 0) * up
  };
  if (K.strafeDamage) out.strafeDamage = Math.round(K.strafeDamage * (1 + (s.damagePerLevel || 0) * up));
  if (K.paceTunedBuggy) {
    const top = trackValueFor('speed', trackCapFor(clampLevel(level)));
    const over = Math.max(0, out.speedMin - top);
    out.speedMin -= over;
    out.speedMax -= over;
  }
  delete out.paceTunedBuggy;
  return out;
}

/** Units a spawner sends at raid start (hangars launch two drones). */
export function spawnerUnitsFor(type) {
  const def = BUILDING_DEFS[type];
  return def && def.spawn ? (def.spawn.perStation || 1) : 0;
}

/**
 * Counted structures (everything a 100% raid must destroy: no gates, trees, roads or
 * drive-over traps) that Town Hall `th` allows in total.
 */
export function countedLimitFor(th) {
  let total = 0;
  for (const type of BUILDING_TYPES) {
    const def = BUILDING_DEFS[type];
    if (type === 'main_gate' || def.role === ROLE.SCENERY || def.role === ROLE.TRAP) continue;
    total += limitFor(type, th);
  }
  return total;
}

/**
 * Roles that make a raid harder, and so count as defense for the gem bounty: guns, pursuit-unit
 * spawners, drive-over traps and every aura - the EMP Disrupter jams the raider's cards, the
 * Quantum Citadel shields what it has to raze, and Solar Arrays, Fusion Reactors and Orbital
 * Relays make the guns faster, harder-hitting and longer-reaching. Barriers are counted structures
 * (a 100% raid razes them) and pay through raidMinTargets. Only guns and spawners used to count,
 * so a Town Hall 12 city with its EMPs, Relays, Citadel and 44 traps stowed paid the full bounty
 * for a raid the bot then won 6 times in 6 (the full city: 2 in 6 on the 3 base lives).
 */
export const RAID_THREAT_ROLES = [ROLE.TURRET, ROLE.SPAWNER, ROLE.TRAP, ROLE.AURA];

/** Does a `type` building count as raid defense for the gem bounty? */
export function isRaidThreat(type) {
  const def = BUILDING_DEFS[type];
  return !!def && RAID_THREAT_ROLES.includes(def.role);
}

/**
 * Share of a kind's build limit that has to stand, at full strength, for that kind of defense
 * to count in full toward the bounty (validateProgression holds it to 50-100%).
 */
export const RAID_KIND_SHARE = 0.6;

/** The kinds of raid defense (isRaidThreat types) Town Hall `th` allows: what the full bounty asks for. */
export function raidThreatKindsAt(th) {
  const T = clampTH(th);
  return BUILDING_TYPES.filter(t => isRaidThreat(t) && BUILDING_DEFS[t].unlockTH <= T);
}

/**
 * The defense a raid had to beat, kind by kind. A kind is scored on its BEST
 * ceil(RAID_KIND_SHARE x limit) buildings only, each worth min(1, level / th), with missing copies
 * counting 0: cover = sum / that count. So a kind is covered in full only when that many copies
 * stand at the Town Hall's level, and every defense level pays. Summing every copy instead let
 * extra low-level copies stand in for levels: a Town Hall 12 city with all defenses at level 8
 * paid the same 25 gems as one at level 12 (and was far easier to raid), so the last four levels
 * of every defense - about 115 labour-hours and 73M resources - paid nothing. Every kind weighs the same, so stowing the EMPs, the Relays, the
 * Citadel or the traps costs gems just as stowing the guns does, and the building a new Town Hall
 * unlocks is part of the bounty from the day it opens.
 * Returns { kinds: [{ type, value, need, cover }], covered (0..total), total }.
 */
export function raidDefenseFor(structures, th) {
  const T = clampTH(th);
  const kinds = raidThreatKindsAt(T).map(type => ({
    type, value: 0, need: Math.max(1, Math.ceil(RAID_KIND_SHARE * limitFor(type, T))), cover: 0, strengths: []
  }));
  const byType = Object.fromEntries(kinds.map(k => [k.type, k]));
  for (const s of structures || []) {
    const k = s && byType[s.type];
    if (k) k.strengths.push(Math.min(1, clampLevel(s.level) / T));
  }
  let covered = 0;
  for (const k of kinds) {
    k.strengths.sort((a, b) => b - a);
    k.value = k.strengths.slice(0, k.need).reduce((sum, v) => sum + v, 0);
    k.cover = Math.min(1, k.value / k.need);
    delete k.strengths;
    covered += k.cover;
  }
  return { kinds, covered, total: kinds.length };
}

/** Kinds of defense a raid had to beat (raidDefenseFor's `covered`, 0..raidThreatKindsAt(th).length). */
export function raidThreatValue(structures, th) {
  return raidDefenseFor(structures, th).covered;
}

/**
 * Gems a victory pays: the Town Hall's bounty x city size x defense beaten. Full size is
 * `raidMinTargets` counted structures and full defense is every kind the Town Hall allows
 * (raidThreatValue); below either the bounty shrinks pro rata (rounded down), so a city missing
 * any one kind of defense is paid at least a gem less. A lone Town Hall pays nothing, and neither
 * does a big city whose defenses were all stowed.
 */
export function raidGemsFor(th, countedTargets, threatValue) {
  const row = townHallRow(th);
  const kinds = raidThreatKindsAt(th).length;
  const n = Math.max(0, Math.floor(Number(countedTargets) || 0));
  const threats = Math.max(0, Number(threatValue) || 0);
  const size = row.raidMinTargets > 0 ? Math.min(1, n / row.raidMinTargets) : 1;
  const defense = kinds > 0 ? Math.min(1, threats / kinds) : 1;
  return Math.floor(row.raidGems * size * defense + 1e-9);
}

/** How many of `type` a Town Hall `th` city may own. 0 means still locked. */
export function limitFor(type, th) {
  const row = BUILD_LIMITS[type];
  if (!row) return 0;
  return row[clampTH(th) - 1] || 0;
}

export function unlockTownHallFor(type) {
  const def = BUILDING_DEFS[type];
  return def ? def.unlockTH : Infinity;
}

export function isUnlockedAt(type, th) {
  return clampTH(th) >= unlockTownHallFor(type) && limitFor(type, th) > 0;
}

export function newBuildingsAt(th) {
  const level = clampTH(th);
  return BUILDING_TYPES.filter(t => BUILDING_DEFS[t].unlockTH === level);
}

export function townHallRow(th) {
  return TOWN_HALLS[clampTH(th) - 1];
}

export function buildersFor(th) { return townHallRow(th).builders; }
/**
 * Labour slots a city staffs: one per standing Labour Hut, up to the Town Hall's cap. No floor:
 * a free labourer on top made the first hut add nothing. A city with no hut is never stuck -
 * placing a hut from the inventory (or buying one) needs no labour.
 */
export function labourFor(huts, th) {
  return Math.max(0, Math.min(Math.floor(Number(huts) || 0), buildersFor(th)));
}
export function cityRadiusFor(th) { return townHallRow(th).cityRadius; }
export function policeCapFor(th) { return townHallRow(th).policeCap; }

// ---------------------------------------------------------------------------
// GARAGE - the raider's half of the ladder. You raid your own city, so the garage has to
// keep growing for as long as the defenses do: Vehicle Lab levels 1..12 each open a
// tuning level and add shield, Tech Lab levels each recharge cards faster, Weapons Lab
// levels each hit harder. GarageManager reads everything below; it derives nothing.
// ---------------------------------------------------------------------------

/** The stock battle buggy. VehicleController re-exports this as VEHICLE_BASE. */
export const RAIDER_BASE = {
  maxForwardSpeed: 30.0,
  acceleration: 24.0,
  maxHp: 500,
  maxShield: 200,
  nitroSpeedMult: 1.7,
  nitroAccelMult: 1.8,
  jumpBoostSpeed: 14.0,
  jumpBoostY: 25.0,
  gravity: 36.0,            // m/s^2 pulling an airborne buggy down (sets every jump's hang time)
  cannonDamage: 14,         // per autocannon shell (two barrels every cannonInterval: ~14 shells a second)
  cannonInterval: 0.14,     // seconds between autocannon volleys (two shells each)
  cannonVsUnits: 24,        // per shell against cruisers, SWAT and drones (a cruiser lasts ~1s)
  /**
   * Seconds after a CONTACT hit (a ram, a blast, a police block) during which further contact
   * hits do nothing, so grinding against a barrier or a chain of blasts in one frame cannot
   * melt the buggy. Gunfire - turret rounds, beams, splash shells and drone strafes - never
   * starts or honours it: it used to share one timer with them, so a tesla spark that landed
   * first threw away the Doomsday shell behind it and extra guns made a defense weaker.
   * The breach and respawn graces (VehicleController.damageImmunityTimer) are separate.
   */
  contactImmunity: 0.35,
  /**
   * The small mechanical hop Space gives when the Big Jump card is benched, recharging or
   * jammed by an EMP. Airborne dodges ground fire, rams, traps and busts, so the hop has its
   * own recharge, counted on the ground: holding Space used to keep the buggy in the air 97%
   * of the time. maxAirShare is the most of a raid the hop alone may keep it airborne.
   */
  hop: { boostSpeed: -4.0, boostY: 16.5, cooldown: 2.5, maxAirShare: 0.35 }
};

/** Seconds a buggy launched upward at `boostY` m/s spends in the air. */
export function airtimeFor(boostY) {
  return (2 * Math.max(0, Number(boostY) || 0)) / RAIDER_BASE.gravity;
}

/** Share of the time the hop can keep the buggy airborne (its recharge only runs on the ground). */
export function hopAirShare(hop = RAIDER_BASE.hop) {
  const air = airtimeFor(hop.boostY);
  return air / (air + hop.cooldown);
}

export const TRACK_MAX_LEVEL = 12;
/** Next-level track price = base * TRACK_COST_GROWTH ^ current level (rounded to 5). */
export const TRACK_COST_GROWTH = 1.6;

/**
 * Buggy tuning tracks, 12 levels each. Per-level steps are sized so level 12 lands where the
 * old 5-level tracks topped out for speed, acceleration, nitro and jump (police chases stay
 * winnable but not trivial), while armor keeps its full +150 a level all the way up.
 */
export const GARAGE_TRACKS = {
  speed: { perLevel: 0.05,  base: { cash: 350, iron: 180, wood: 80 } },   // x top speed
  accel: { perLevel: 0.065, base: { cash: 300, iron: 150, wood: 80 } },   // x acceleration
  armor: { perLevel: 150,   base: { cash: 320, iron: 240, wood: 120 } },  // + hull HP
  nitro: { perLevel: 0.025, accelPerLevel: 0.04, base: { cash: 380, iron: 200, wood: 100 } }, // + nitro mults
  jump:  { perLevel: 0.06,  base: { cash: 300, iron: 160, wood: 120 } }   // x hydraulic launch
};

/** Deck slots with no Vehicle Lab; the lab's research.slotsAt adds the rest. */
export const DECK_BASE_SLOTS = 3;

/**
 * A card with a duration may never be active more than this share of the time, however
 * short the Tech Lab makes its cooldown (an invisible buggy cannot be shot or busted, and an
 * airborne one cannot be rammed, trapped, busted or hit by ground fire). The cloak's 80% leaves
 * a gap of under 2 s that one Big Jump (about 2.4 s in the air) bridges, and the jump's 70%
 * has it ready again about a second after it lands. At 65% / 60% the cloak gap was about 4 s
 * and a landed buggy waited 1.6 s for its jump with the hop locked out: from Town Hall 9 the
 * pursuit caught it there after nearly every cloak (raidbot.mjs: in 118 of 119 Town Hall 12
 * busts the hop was recharging, in 110 the jump). The EMP Disrupter answers both. A Big Jump's
 * "duration" is its hang time, which grows with the Hydraulic Jump track. Nitro is capped
 * too: its burn (72-96 m/s on a road from Town Hall 5) out-runs SWAT, drones and a Missile
 * Silo's 68 m/s rounds, and uncapped a level-5 card with a Tech Lab burned longer than it took
 * to recharge (108-213% uptime), so the buggy never came off nitro. validateProgression
 * requires an entry here for every card that has a duration.
 */
export const CARD_UPTIME_CAP = { invisibility: 0.8, jump: 0.7, nitro: 0.5 };

/**
 * Cards whose cooldown only runs once their effect is over: the Big Jump's hydraulics
 * recharge on the ground, never in the air. Their uptime is duration / (duration + cooldown);
 * every other card's cooldown starts on use, so theirs is duration / cooldown. Without this a
 * level-5 Big Jump with a Tech Lab 12 (1.15s cooldown, 2.4s hang time) never came down.
 */
export const CARD_RECHARGES_AFTER_EFFECT = { jump: true };

/** Share of a raid card `cardId` can keep its effect up with this cooldown and duration. */
export function cardUptimeFor(cardId, cooldown, duration) {
  if (!(duration > 0)) return 0;
  return CARD_RECHARGES_AFTER_EFFECT[cardId] ? duration / (duration + cooldown) : duration / cooldown;
}

/** Hang time of a Big Jump with the Hydraulic Jump track at `trackLevel`. */
export function jumpAirtimeFor(trackLevel) {
  return airtimeFor(trackValueFor('jump', trackLevel));
}

const labResearch = (type) => (BUILDING_DEFS[type] && BUILDING_DEFS[type].research) || {};
const clampLab = (lab) => Math.max(0, Math.min(MAX_BUILDING_LEVEL, Math.round(Number(lab)) || 0));

/** Highest tuning level a track may reach with Vehicle Lab `labLevel` (0 = no lab). */
export function trackCapFor(labLevel) {
  const table = labResearch('vehicle_lab').trackCapAt || [1];
  return Math.min(TRACK_MAX_LEVEL, table[Math.min(clampLab(labLevel), table.length - 1)]);
}

/** Lowest Vehicle Lab level that opens tuning level `level` (Infinity if none does). */
export function labForTrackLevel(level) {
  const table = labResearch('vehicle_lab').trackCapAt || [1];
  const idx = table.findIndex(cap => cap >= level);
  return idx === -1 ? Infinity : idx;
}

/** Ability-card deck slots with Vehicle Lab `labLevel`. */
export function deckSlotsFor(labLevel) {
  const at = labResearch('vehicle_lab').slotsAt || [];
  return DECK_BASE_SLOTS + at.filter(l => clampLab(labLevel) >= l).length;
}

/** Labs needed for ability-card level `level`: { lab: Vehicle Lab level, tech: Tech Lab level }. */
export function cardLevelGate(level) {
  const lab = (labResearch('vehicle_lab').cardLevelAt || {})[level] || 0;
  const tech = (labResearch('tech_lab').cardLevelAt || {})[level] || 0;
  return { lab, tech };
}

/** Extra buggy shield from Vehicle Lab `labLevel` (vehicle_lab.research.shieldAt). */
export function labShieldFor(labLevel) {
  const table = labResearch('vehicle_lab').shieldAt || [0];
  return table[Math.min(clampLab(labLevel), table.length - 1)] || 0;
}

/** Ordnance multipliers from Weapons Lab `wl`. */
export function ordnanceFor(wl) {
  const r = labResearch('weapons_lab');
  const L = clampLab(wl);
  return {
    damageMult: 1 + (r.damagePerLevel || 0) * L,
    radiusMult: 1 + (r.radiusPerLevel || 0) * L,
    cannonMult: 1 + (r.cannonPerLevel || 0) * L
  };
}

/** Share (0..0.9) of every card's cooldown that Tech Lab `techLevel` cuts away. */
export function cardCooldownCutFor(techLevel) {
  return Math.min(0.9, (labResearch('tech_lab').cooldownCutPerLevel || 0) * clampLab(techLevel));
}

/**
 * A card's cooldown after the Tech Lab's per-level cut, never short enough to break
 * CARD_UPTIME_CAP for that card (see cardUptimeFor for how its uptime is counted).
 */
export function cardCooldownFor(cardId, cooldown, duration, techLevel) {
  const cut = cardCooldownCutFor(techLevel);
  let cd = cooldown * (1 - cut);
  const cap = CARD_UPTIME_CAP[cardId];
  if (cap && duration > 0) {
    const floor = CARD_RECHARGES_AFTER_EFFECT[cardId] ? (duration * (1 - cap)) / cap : duration / cap;
    // The floor is rounded UP to the 2 decimals shown: 9.2308 -> 9.23 let a cloak run 65.005%.
    cd = Math.max(cd, Math.ceil(floor * 100) / 100);
  }
  return +cd.toFixed(2);
}

/**
 * The ability pickups floating over a raid's roads (CardSystem.spawnInWorldCards). A NITRO or
 * MEGA JUMP pickup is a free use of that card, so it shares the card's CARD_UPTIME_CAP budget:
 * it waits, untouched, while the card is recharging, and taking it leaves the card recharging
 * for pickupLockoutFor(). Both used to zero the card's cooldown instead, so a driver who took a
 * pickup and fired the card as its burn ended had nitro 9 s out of 9.
 */
export const IN_WORLD_PICKUP = {
  respawn: 14,                               // seconds a taken pickup stays gone
  nitroBurn: 4.5,                            // seconds of nitro from a NITRO pickup
  megaJump: { boostSpeed: 16, boostY: 27 }   // a MEGA JUMP pickup's launch (1.5 s in the air)
};

/** Card recharge a NITRO / MEGA JUMP pickup leaves behind: the CARD_UPTIME_CAP floor for its effect. */
export function pickupLockoutFor(cardId) {
  const effect = cardId === 'nitro' ? IN_WORLD_PICKUP.nitroBurn
    : cardId === 'jump' ? airtimeFor(IN_WORLD_PICKUP.megaJump.boostY) : 0;
  return cardCooldownFor(cardId, 0, effect, 0);
}

// ---------------------------------------------------------------------------
// ABILITY CARDS - every number the garage sells and the raid plays. GarageManager and
// CardSystem only read this section; cardStatsFor() is the one place the labs are applied.
// ---------------------------------------------------------------------------
export const CARD_MAX_LEVEL = 5;

/**
 * Absolute per-level card numbers, L1..L5, before the labs. Invisibility tops out at
 * 62-65% uptime without a Tech Lab and at CARD_UPTIME_CAP.invisibility with one: an invisible
 * buggy cannot be shot, homed on or busted, and before the EMP Disrupter (Town Hall 9) nothing
 * else answers it. The Drop Bomb's radius barely grows
 * (14 m to 17 m): it hits every building inside it, so its reach grows with the SQUARE of the
 * radius - 23.5 m at level 5 hit a third of a Town Hall 12 city per drop. Nitro levels buy a
 * longer single burn (3.5 s to 5.5 s) at no more than CARD_UPTIME_CAP.nitro of the time: from
 * level 3 the recharge is twice the burn, so the buggy spends at least half the raid off nitro.
 */
export const CARD_TIERS = {
  invisibility: [
    { cooldown: 14.0, duration: 5.0 },
    { cooldown: 13.0, duration: 6.0 },
    { cooldown: 12.0, duration: 7.0 },
    { cooldown: 12.0, duration: 7.5 },
    { cooldown: 11.6, duration: 7.5 }
  ],
  bomb: [
    { cooldown: 7.0, blastRadius: 14.0, blastDamage: 350 },
    { cooldown: 6.5, blastRadius: 14.75, blastDamage: 450 },
    { cooldown: 6.0, blastRadius: 15.5, blastDamage: 550 },
    { cooldown: 5.5, blastRadius: 16.25, blastDamage: 680 },
    { cooldown: 5.0, blastRadius: 17.0, blastDamage: 820 }
  ],
  missiles: [
    { cooldown: 6.0, damage: 300 },
    { cooldown: 5.5, damage: 375 },
    { cooldown: 5.0, damage: 450 },
    { cooldown: 4.5, damage: 560 },
    { cooldown: 4.0, damage: 680 }
  ],
  jump: [
    { cooldown: 3.5 },
    { cooldown: 3.0 },
    { cooldown: 2.5 },
    { cooldown: 2.1 },
    { cooldown: 1.8 }
  ],
  nitro: [
    { cooldown: 9.0, duration: 3.5 },
    { cooldown: 9.0, duration: 4.0 },
    { cooldown: 9.0, duration: 4.5 },
    { cooldown: 10.0, duration: 5.0 },
    { cooldown: 11.0, duration: 5.5 }
  ]
};

/** Level-1 numbers: what CardSystem plays before a garage loadout is applied. */
export const CARD_BASE = Object.fromEntries(Object.entries(CARD_TIERS).map(([id, tiers]) => [id, { ...tiers[0] }]));

/** Cards the garage starts with, and the Vehicle Lab level each of the others needs to be bought. */
export const CARD_UNLOCKS = {
  jump: { startUnlocked: true },
  missiles: { startUnlocked: true },
  nitro: { startUnlocked: true },
  bomb: { unlockLab: 0 },
  invisibility: { unlockLab: 1 }
};

/**
 * Card prices at Town Hall 1 rates. cardUnlockCostFor / cardLevelCostFor multiply them by
 * COST_PER_LEVEL for every Town Hall above the first one whose labs can buy them - the curve
 * every building upgrade follows - so level 4-5 (Tech Lab, Town Hall 5) cost like the Town
 * Hall 5 purchases they are. Flat, card level 5 cost well under a minute of a Town Hall 5
 * city's cash output.
 */
export const CARD_COSTS = {
  unlock: {
    bomb: { cash: 360, iron: 200, wood: 120 },
    invisibility: { cash: 355, iron: 175, wood: 120 }
  },
  level: { cash: 265, iron: 130, wood: 90 },   // card level 2; each level above it doubles
  levelGrowth: 2
};

const scaleCost = (cost, mult) => {
  const r5 = (v) => Math.round(v / 5) * 5;
  return { cash: r5(cost.cash * mult), iron: r5(cost.iron * mult), wood: r5(cost.wood * mult) };
};

/** Lowest Town Hall at which a lab of `type` can stand at `level` (1 when no lab is needed). */
function townHallForLab(type, level) {
  if (!(level > 0)) return 1;
  return Math.max(BUILDING_DEFS[type].unlockTH, Math.min(MAX_BUILDING_LEVEL, level));
}

/** First Town Hall whose labs can open ability-card level `level` (cardLevelGate). */
export function cardLevelTownHall(level) {
  const g = cardLevelGate(level);
  return Math.max(townHallForLab('vehicle_lab', g.lab), townHallForLab('tech_lab', g.tech));
}

/** First Town Hall whose Vehicle Lab can buy card `id` (1 for a card you start with). */
export function cardUnlockTownHall(id) {
  const u = CARD_UNLOCKS[id];
  return u ? townHallForLab('vehicle_lab', u.unlockLab || 0) : 1;
}

/** Price of unlocking card `id`, or null if it starts unlocked. */
export function cardUnlockCostFor(id) {
  const base = CARD_COSTS.unlock[id];
  return base ? scaleCost(base, Math.pow(COST_PER_LEVEL, cardUnlockTownHall(id) - 1)) : null;
}

/** Price of raising any card TO `level` (2..CARD_MAX_LEVEL), or null outside that range. */
export function cardLevelCostFor(level) {
  const L = Math.round(Number(level));
  if (!(L >= 2 && L <= CARD_MAX_LEVEL)) return null;
  const mult = Math.pow(CARD_COSTS.levelGrowth, L - 2) * Math.pow(COST_PER_LEVEL, cardLevelTownHall(L) - 1);
  return scaleCost(CARD_COSTS.level, mult);
}

/**
 * Raid numbers for card `id` at `level`: its tier, the Tech Lab's cooldown cut (never short
 * enough to break CARD_UPTIME_CAP; a Big Jump's "duration" is its hang time from the Jump
 * track) and the Weapons & Munitions Lab's ordnance bonus (Drop Bomb damage + radius, Twin
 * Missiles damage). The garage shows and the raid plays exactly this.
 */
export function cardStatsFor(id, level, { techLevel = 0, weaponsLevel = 0, jumpTrack = 0 } = {}) {
  const tiers = CARD_TIERS[id];
  if (!tiers) return null;
  const lvl = Math.max(1, Math.min(CARD_MAX_LEVEL, Math.round(Number(level)) || 1));
  const out = { ...tiers[lvl - 1], level: lvl };
  const airtime = id === 'jump' ? jumpAirtimeFor(jumpTrack) : 0;
  if (id === 'jump') out.airtime = +airtime.toFixed(2);
  const uncapped = cardCooldownFor(id, out.cooldown, 0, techLevel);
  out.cooldown = cardCooldownFor(id, out.cooldown, id === 'jump' ? airtime : (out.duration || 0), techLevel);
  // Held at the CARD_UPTIME_CAP floor: a shorter tier cooldown or more Tech Lab cannot help.
  out.uptimeCapped = out.cooldown > uncapped;
  const ord = ordnanceFor(weaponsLevel);
  if (id === 'bomb') {
    out.blastDamage = Math.round(out.blastDamage * ord.damageMult);
    out.blastRadius = +(out.blastRadius * ord.radiusMult).toFixed(1);
  } else if (id === 'missiles') {
    out.damage = Math.round(out.damage * ord.damageMult);
  }
  return out;
}

/**
 * Spare buggy lives: bought in the garage, used once the 3 base lives are gone, never more
 * than `max` stocked. The price is Town Hall 1's and grows COST_PER_LEVEL per Town Hall, so a
 * life is never a rounding error of a big city's income (a flat 400 cash was under half a
 * second of a Town Hall 12 city's).
 */
export const SPARE_LIFE = { max: 2, cost: { cash: 400, iron: 250, wood: 150 } };

/** Price of one spare life for a Town Hall `th` city. */
export function spareLifeCostFor(th) {
  return scaleCost(SPARE_LIFE.cost, Math.pow(COST_PER_LEVEL, clampTH(th) - 1));
}

/** Price of the NEXT level of track `id` when it currently sits at `current`. */
export function trackCostFor(id, current) {
  const t = GARAGE_TRACKS[id];
  if (!t || current >= TRACK_MAX_LEVEL) return null;
  const mult = Math.pow(TRACK_COST_GROWTH, Math.max(0, current));
  const r5 = (v) => Math.round(v / 5) * 5;
  return { cash: r5(t.base.cash * mult), iron: r5(t.base.iron * mult), wood: r5(t.base.wood * mult) };
}

/** Value one track shows at level L (for the garage's "now -> next" line). */
export function trackValueFor(id, L) {
  const t = GARAGE_TRACKS[id];
  const n = Math.max(0, Math.min(TRACK_MAX_LEVEL, Math.round(Number(L)) || 0));
  const B = RAIDER_BASE;
  switch (id) {
    case 'speed': return B.maxForwardSpeed * (1 + t.perLevel * n);
    case 'accel': return B.acceleration * (1 + t.perLevel * n);
    case 'armor': return B.maxHp + t.perLevel * n;
    case 'nitro': return B.nitroSpeedMult + t.perLevel * n;
    case 'jump':  return B.jumpBoostY * (1 + t.perLevel * n);
    default: return 0;
  }
}

/**
 * Absolute buggy stats for a raid: stock values + track levels + lab bonuses. The only
 * place any of these numbers is computed, so applying them never compounds.
 */
export function vehicleStatsFor(tracks = {}, { labLevel = 0, weaponsLabLevel = 0 } = {}) {
  const B = RAIDER_BASE;
  const lvl = (id) => Math.max(0, Math.min(TRACK_MAX_LEVEL, Math.round(Number(tracks[id])) || 0));
  return {
    maxForwardSpeed: trackValueFor('speed', lvl('speed')),
    acceleration: trackValueFor('accel', lvl('accel')),
    maxHp: trackValueFor('armor', lvl('armor')),
    maxShield: B.maxShield + labShieldFor(labLevel),
    nitroSpeedMult: trackValueFor('nitro', lvl('nitro')),
    nitroAccelMult: B.nitroAccelMult + GARAGE_TRACKS.nitro.accelPerLevel * lvl('nitro'),
    jumpBoostSpeed: B.jumpBoostSpeed,
    jumpBoostY: trackValueFor('jump', lvl('jump')),
    // The Weapons Lab's autocannon bonus applies to every shell, whatever it hits.
    cannonDamage: Math.round(B.cannonDamage * ordnanceFor(weaponsLabLevel).cannonMult),
    cannonVsUnits: Math.round(B.cannonVsUnits * ordnanceFor(weaponsLabLevel).cannonMult)
  };
}

/**
 * Hull + shield of a buggy tuned as far as Town Hall `th` allows (every lab at the Town
 * Hall's level, every track at the lab's cap). Balance checks compare defenses to this.
 */
export function raiderMaxEhpAt(th) {
  const T = clampTH(th);
  const lab = T >= BUILDING_DEFS.vehicle_lab.unlockTH ? T : 0;
  const cap = trackCapFor(lab);
  const s = vehicleStatsFor({ armor: cap }, { labLevel: lab });
  return s.maxHp + s.maxShield;
}

// ---------------------------------------------------------------------------
// BALANCE MODELS - what verify-progression holds the ladder to. The game never reads them;
// they exist so every tuning change is measured against the raider it has to face.
// ---------------------------------------------------------------------------

/** One grid tile in metres (RoadNetwork.tileSize). The perimeter wall stands 15 tiles out. */
export const TILE_METRES = 5.5;

/**
 * Seconds the full kill box of a Town Hall needs to wreck a parked buggy tuned to that same
 * Town Hall (parkedKillSecondsAt), from the first Town Hall that sells a gun: never shredded
 * (min) - it was 0.2 s at Town Hall 12 once every round landed - and never toothless (max).
 * Town Hall 2's two snipers sit near the top of the band.
 */
export const KILL_BAND = { min: 6, max: 20 };

/**
 * Damage per second the full kill box of Town Hall `th` puts on a parked raider: every turret
 * the Town Hall allows, at level `th`, plus `gates` Main Gate guns (only one can reach a
 * buggy - the gates are 143 m apart), every gun under the best Solar Array, Fusion Reactor and
 * Orbital Relay at level `th`, and no reload jitter (TURRET_RELOAD_JITTER only ever lengthens
 * a reload), so it never under-counts. Every round
 * lands: gunfire ignores the raider's contact buffer (RAIDER_BASE.contactImmunity).
 */
export function fullKitDpsAt(th, gates = 1) {
  const T = clampTH(th);
  const auras = BUILDING_TYPES
    .filter(t => BUILDING_DEFS[t].aura && TURRET_AURA_KINDS.includes(BUILDING_DEFS[t].aura.kind) && isUnlockedAt(t, T))
    .map(t => ({ type: t, level: T }));
  const m = turretAuraMultipliers(auras);
  // TurretSystem.refreshAuras: damage x m.damage (not rounded - a +2% on a 16-damage shot
  // would round straight back to 16), fire interval / m.rate.
  const gun = (damage, interval) => (damage * m.damage * m.rate) / interval;
  let dps = gates * gun(GATE_TURRET.damage, GATE_TURRET.fireInterval);
  for (const t of BUILDING_TYPES) {
    const n = limitFor(t, T);
    const s = n > 0 ? turretStatsFor(t, T) : null;
    if (s) dps += n * gun(s.damage, s.fireInterval);
  }
  return dps;
}

/** Seconds the kill box of fullKitDpsAt(th, gates) needs to wreck a parked TH-tuned buggy. */
export function parkedKillSecondsAt(th, gates = 1) {
  return raiderMaxEhpAt(th) / fullKitDpsAt(th, gates);
}

/**
 * The raid kit a buggy tuned to Town Hall `th` brings: every lab at the Town Hall's level (0
 * until it unlocks) and every ability card at the highest level those labs open.
 */
export function raidKitAt(th) {
  const T = clampTH(th);
  const lab = (type) => (T >= BUILDING_DEFS[type].unlockTH ? T : 0);
  const kit = { vehicleLab: lab('vehicle_lab'), techLab: lab('tech_lab'), weaponsLab: lab('weapons_lab'), cardLevel: 1 };
  for (let L = 2; L <= CARD_MAX_LEVEL; L++) {
    const g = cardLevelGate(L);
    if (kit.vehicleLab >= g.lab && kit.techLab >= g.tech) kit.cardLevel = L;
  }
  return kit;
}

/** Autocannon damage per second on one building for the raid kit of Town Hall `th`. */
export function autocannonDpsAt(th) {
  const s = vehicleStatsFor({}, { weaponsLabLevel: raidKitAt(th).weaponsLab });
  return (2 * s.cannonDamage) / RAIDER_BASE.cannonInterval;
}

/**
 * Drop Bomb damage per second of its cooldown against a Town Hall `th` city whose counted
 * structures are spread evenly over its buildable disc, each taking the bomb's blastDamageAt
 * falloff - so a bomb that covers twice the area does twice the work, as it does in a raid.
 */
export function bombDpsAt(th) {
  const kit = raidKitAt(th);
  const b = cardStatsFor('bomb', kit.cardLevel, { techLevel: kit.techLab, weaponsLevel: kit.weaponsLab });
  const cityR = cityRadiusFor(th) * TILE_METRES;
  const perM2 = countedLimitFor(th) / (Math.PI * cityR * cityR);
  const blast = { radius: b.blastRadius, damage: b.blastDamage };
  let area = 0;   // damage summed over the blast disc, in rings 0.1 m wide
  for (let r = 0.05; r < blast.radius; r += 0.1) area += blastDamageAt(blast, r) * 2 * Math.PI * r * 0.1;
  return (perM2 * area) / b.cooldown;
}

/** The Drop Bomb never out-damages the autocannon by more than this, at any Town Hall. */
export const BOMB_VS_CANNON_MAX = 5;

/**
 * Every drone the Town Hall's hangars launch, strafing a parked TH-tuned buggy together, needs
 * at least this long to wreck it: drones follow the raider everywhere, so they are pressure,
 * not a second kill box on top of the guns.
 */
export const DRONE_SWARM_MIN_SECONDS = 12;

/** Seconds every drone Town Hall `th` allows needs to wreck a parked TH-tuned buggy (Infinity: none). */
export function droneSwarmKillSecondsAt(th) {
  let dps = 0;
  for (const type of BUILDING_TYPES) {
    const unit = limitFor(type, th) > 0 ? pursuitUnitFor(type, th) : null;
    if (unit && unit.strafeDamage) dps += limitFor(type, th) * spawnerUnitsFor(type) * unit.strafeDamage / unit.strafeInterval;
  }
  return dps > 0 ? raiderMaxEhpAt(th) / dps : Infinity;
}

// ---------------------------------------------------------------------------
// RAID-COMPLETION MODEL. KILL_BAND only says a parked raider is not shredded; this says a
// raid can be FINISHED: a buggy tuned to Town Hall `th`, with its 3 lives and both spares,
// razing a full city of the same Town Hall (every building the Town Hall allows, at level th).
// It is a deterministic stand-in for tools/e2e/raidbot.mjs, which plays real raids in Chrome;
// the coefficients below are fitted to that bot's measurements, and verify-progression holds
// every Town Hall to it so a tuning change cannot quietly make a Town Hall unwinnable again.
// ---------------------------------------------------------------------------

/** Lives a raid can spend: the 3 base lives plus every spare the garage can stock. */
export const RAID_BASE_LIVES = 3;

/**
 * A Town Hall step (every building raised to the new level, the new slots built up to it, the
 * garage tracks the new Vehicle Lab opens) may take at most this many times as long in hut
 * labour as the city takes to earn its resources. Build timers are mobile-style, so from Town
 * Hall 8 the huts set the pace and resources bank up behind them; this keeps that from growing.
 * With 5-12 s trap and barrier base times the Town Hall 11 -> 12 step took 4.8x.
 */
export const LABOUR_VS_RESOURCES_MAX = 4;
/**
 * The one-tile traps and barriers may take at most this share of a Town Hall step's labour: a
 * level buys them little, and at 5-12 s base times they took 24-30% of every step's.
 */
export const TRAP_LABOUR_SHARE_MAX = 0.2;

/**
 * Model coefficients, fitted to raidbot.mjs raids (see raidModelAt for what each one scales).
 *   landed       share of the raider's paper damage that reaches the city over a whole raid
 *                (driving between targets, evading, respawning, overkill)
 *   cardUse      share of the Twin Missiles' and Drop Bomb's paper damage a raid lands
 *   chainShare   share of the explosives' summed blast damage that razes something new (blasts
 *                overlap, and a building caught in several blasts of one chain takes the hardest)
 *   gunShare     share of the full kill box that is shooting the buggy on average over a raid
 *                (guns out of reach, guns already razed)
 *   bustRate     busts per exposed second per ground pursuer (a SWAT truck counts swatWeight)
 *   jamPower     the share of a raid the buggy spends jammed is the fields' share of the city to
 *                this power: a raider steers round a few small fields, not round fields that
 *                cover the map
 *   jammedBusts  how many times faster busts come inside an EMP field, where the buggy has only
 *                the hop (outside one the Big Jump and nitro get it clear of most contacts)
 *   droneShare   share of the full drone swarm strafing the exposed buggy on average
 *   minesPerLife landmines a life drives over on its way in through the traps round the rim
 *   deathSeconds raid time each death costs (the wreck, the drive back from the gate, a fresh
 *                pursuit force), during which the city keeps shooting: past one death per
 *                deathSeconds of losses the raid spirals and is never finished
 */
export const RAID_MODEL = {
  landed: 0.61,
  cardUse: 0.5,
  chainShare: 0.7,
  gunShare: 0.1,
  bustRate: 0.0006,
  swatWeight: 2,
  jamPower: 1.5,
  jammedBusts: 3.6,
  droneShare: 0.03,
  minesPerLife: 0.64,
  deathSeconds: 31
};

/**
 * Most lives raidModelAt may expect a TH-tuned raid to spend on a full same-level city: every
 * life a raid has (the 3 base lives and both spares), never more. The model's number is an
 * expectation over raids that go well and badly (lives spent per whole city razed, a lost raid
 * counting for the share it razed). It used to be 7 - more lives than a raid has - so a
 * Town Hall the model expected to cost 6.8 passed: round 9's Town Hall 12 (60% Citadel, 8th
 * police station, 6th SWAT armory, 3rd EMP), which the bot won 25 times in 40 on the core layout
 * with both spares, 2 in 10 on the 3 base lives, and 38 in 120 over shuffled layouts (7.9 lives
 * per city razed; Town Hall 11: 4.6). As tuned now the model puts Town Hall 12 at 4.0, a step
 * over Town Hall 11's 3.7, and the bot wins it 80 times in 120 on shuffled layouts (5.4). Round 8
 * sat at 27 for Town Hall 9 (0 of 12) and never finished at 10-12 (0 of 36). It guards against
 * that kind of collapse; the bot's own count swings a life either way with the layout.
 */
export const RAID_LIVES_EXPECTED_MAX = RAID_BASE_LIVES + SPARE_LIFE.max;
/** One Town Hall may cost a little less than the one before it (Town Hall 5's Tech Lab and card levels 4-5 do)... */
export const RAID_LIVES_DIP = 1;
/** ...but each band of four Town Halls (1-4, 5-8, 9-12) costs at least this many lives more than the band before. */
export const RAID_LIVES_RISE = 0.3;

/** Structures of a full Town Hall `th` city per square metre of its buildable disc. */
function cityDensityAt(th) {
  const r = cityRadiusFor(th) * TILE_METRES;
  return countedLimitFor(th) / (Math.PI * r * r);
}

/** Summed damage one blast deals to a uniform city of `perM2` structures per square metre. */
function blastOnCity(blast, perM2) {
  let sum = 0;
  for (let r = 0.05; r < blast.radius; r += 0.1) sum += blastDamageAt(blast, r) * 2 * Math.PI * r * 0.1;
  return sum * perM2;
}

/**
 * The raid a buggy tuned to Town Hall `th` has to win against a full city of the same Town
 * Hall, in expected numbers:
 *   razeSeconds  the city's HP (a standing Quantum Citadel's cover counted in for the share of
 *             the city it covers), less what its explosives' chain reactions raze, over the
 *             raider's landed damage (autocannon, plus missiles and bombs outside the fields)
 *   seconds   the raid's length: razeSeconds plus deathSeconds for every death (Infinity once
 *             the deaths come faster than that - the raid spirals and is never finished)
 *   covered   share of the city inside EMP fields
 *   jammed    share of the raid the buggy spends in them, fighting without its cards
 *   exposed   share of the raid the buggy can be shot and busted: out of the fields a cloak
 *             hides it (its uptime cap), in them nothing does
 *   deaths    lives the raid loses over its length: the guns (gunShare of the kill box on the
 *             exposed buggy), busts (bustRate per ground pursuer while exposed, jammedBusts
 *             times that in a field), drones (droneShare of their swarm DPS while exposed),
 *             each life starting a trapShare down to the landmines on its way in
 *   livesUsed deaths + 1: the life that finishes the raid
 */
export function raidModelAt(th) {
  const T = clampTH(th);
  const M = RAID_MODEL;
  const kit = raidKitAt(T);
  const ehp = raiderMaxEhpAt(T);
  const perM2 = cityDensityAt(T);
  const cityR = cityRadiusFor(T) * TILE_METRES;

  // What there is to raze, and what its own explosives raze for the raider.
  let hp = 0, blasts = 0;
  for (const type of BUILDING_TYPES) {
    const def = BUILDING_DEFS[type];
    if (type === 'main_gate' || def.role === ROLE.SCENERY || def.role === ROLE.TRAP) continue;
    const n = limitFor(type, T);
    if (!n) continue;
    const L = def.upgradeable === false ? 1 : T;
    hp += n * hpForLevel(type, L);
    const bl = blastFor(type, L);
    if (bl) blasts += n * blastOnCity(bl, perM2);
  }
  if (limitFor('quantum_citadel', T) > 0) {
    const s = auraBonusFor('quantum_citadel', T);
    const cover = Math.min(1, (auraRadiusFor('quantum_citadel', T) / cityR) ** 2);
    hp *= 1 + cover * (s / (1 - s));
  }
  hp = Math.max(0.2 * hp, hp - M.chainShare * blasts);

  // EMP fields: the share of the raid the buggy fights without its cards.
  const emps = limitFor('emp_disrupter', T);
  const covered = emps ? Math.min(1, emps * (auraRadiusFor('emp_disrupter', T) / cityR) ** 2) : 0;
  const jammed = covered ** M.jamPower;

  // The raider's damage: the autocannon everywhere, the cards only out of the fields.
  const cardOpts = { techLevel: kit.techLab, weaponsLevel: kit.weaponsLab };
  const mi = cardStatsFor('missiles', kit.cardLevel, cardOpts);
  const cards = 2 * mi.damage / mi.cooldown + (cardUnlockTownHall('bomb') <= T ? bombDpsAt(T) : 0);
  const dps = M.landed * (autocannonDpsAt(T) + (1 - jammed) * M.cardUse * cards);
  const seconds = hp / dps;

  // Exposure: a cloak hides the buggy for its uptime, but not inside a field.
  let cloak = 0;
  if (cardUnlockTownHall('invisibility') <= T) {
    const c = cardStatsFor('invisibility', kit.cardLevel, cardOpts);
    cloak = cardUptimeFor('invisibility', c.cooldown, c.duration);
  }
  const exposed = (1 - jammed) * (1 - cloak) + jammed;
  const bustExposed = (1 - jammed) * (1 - cloak) + jammed * M.jammedBusts;

  // Every life drives in over the rim: a share of it gone to landmines before it fights.
  const mine = limitFor('landmine', T) > 0 ? trapStatsFor('landmine', T).damage / ehp : 0;
  const trapShare = Math.min(0.9, M.minesPerLife * mine);
  // Deaths per second of raid: the guns and the drones wear a life down, a bust ends it.
  const pursuers = limitFor('police_station', T) + M.swatWeight * limitFor('swat_armory', T);
  const drones = droneSwarmKillSecondsAt(T);
  const gunRate = M.gunShare * fullKitDpsAt(T, 1) * exposed / ehp / (1 - trapShare);
  const droneRate = Number.isFinite(drones) ? M.droneShare * exposed / drones / (1 - trapShare) : 0;
  const bustRate = M.bustRate * pursuers * bustExposed;
  const rate = gunRate + droneRate + bustRate;
  // Each death adds deathSeconds of raid, which costs deaths of its own.
  const spiral = rate * M.deathSeconds;
  const raidSeconds = spiral < 1 ? seconds / (1 - spiral) : Infinity;
  const deaths = rate * raidSeconds;
  return {
    th: T, seconds: raidSeconds, razeSeconds: seconds, covered, jammed, exposed, cloak, trapShare,
    gunDeaths: gunRate * raidSeconds, bustDeaths: bustRate * raidSeconds, droneDeaths: droneRate * raidSeconds,
    deaths, livesUsed: deaths + 1
  };
}

/**
 * Gems a brand-new player starts with. 50 finished the first seven Town Hall jobs (39 gems)
 * outright, so the opening ladder never ran on its timers; wins pay the rest (raidGems).
 */
export const STARTING_GEMS = 15;

/**
 * Gems needed to finish a job with `remaining` seconds left.
 * Piecewise so a 30-second job is never worth gemming and an 8-hour one is.
 */
export function gemsToFinish(remaining) {
  const r = Math.max(0, Math.ceil(Number(remaining) || 0));
  if (r <= 0) return 0;
  if (r <= 60) return 1;
  if (r <= 3600) return Math.max(1, Math.round(1 + ((r - 60) / 3540) * 19));
  return Math.round(20 + ((Math.min(r, 86400) - 3600) / 82800) * 240);
}

/** Everything Town Hall `th` grants, for the UI and the player guide. */
export function unlocksAt(th) {
  const level = clampTH(th);
  const row = townHallRow(level);
  const prev = level > 1 ? TOWN_HALLS[level - 2] : null;
  const raised = [];
  for (const type of BUILDING_TYPES) {
    const now = limitFor(type, level);
    const before = level > 1 ? limitFor(type, level - 1) : 0;
    if (now > before && before > 0) raised.push({ type, from: before, to: now });
  }
  return {
    level,
    name: row.name,
    theme: row.theme,
    newBuildings: newBuildingsAt(level),
    raisedLimits: raised,
    builders: row.builders,
    buildersGained: prev ? row.builders - prev.builders : row.builders,
    cityRadius: row.cityRadius,
    policeCap: row.policeCap,
    levelCap: level
  };
}

/**
 * Boot-time self-check. Throws loudly rather than letting the ladder drift:
 * a typo in BUILD_LIMITS is a silent progression bug otherwise.
 */
export function validateProgression() {
  const errors = [];
  for (const type of BUILDING_TYPES) {
    const def = BUILDING_DEFS[type];
    const row = BUILD_LIMITS[type];
    if (!row) { errors.push(`${type}: no BUILD_LIMITS row`); continue; }
    if (row.length !== MAX_TOWN_HALL_LEVEL) errors.push(`${type}: ${row.length} columns, expected 12`);
    const firstOpen = row.findIndex(n => n > 0);
    if (firstOpen === -1) { errors.push(`${type}: never unlocks`); continue; }
    if (firstOpen + 1 !== def.unlockTH) {
      errors.push(`${type}: limits open at TH${firstOpen + 1} but unlockTH is ${def.unlockTH}`);
    }
    for (let i = 1; i < row.length; i++) {
      if (row[i] < row[i - 1]) errors.push(`${type}: limit drops at TH${i + 1} (${row[i - 1]} -> ${row[i]})`);
    }
    if (def.maxHp !== null && !(Number(def.maxHp) > 0)) errors.push(`${type}: bad maxHp`);
    for (const k of ['cash', 'iron', 'wood']) {
      if (!Number.isFinite(def.cost[k])) errors.push(`${type}: cost.${k} is not a number`);
    }
    if (!Object.values(ROLE).includes(def.role)) errors.push(`${type}: unknown role ${def.role}`);
  }
  for (let th = 1; th <= MAX_TOWN_HALL_LEVEL; th++) {
    if (newBuildingsAt(th).length === 0) errors.push(`Town Hall ${th} unlocks no new building`);
  }
  if (TOWN_HALLS.length !== MAX_TOWN_HALL_LEVEL) errors.push('TOWN_HALLS is not 12 rows');
  for (let i = 1; i < TOWN_HALLS.length; i++) {
    if (TOWN_HALLS[i].builders < TOWN_HALLS[i - 1].builders) errors.push(`builders drop at TH${i + 1}`);
    if (TOWN_HALLS[i].cityRadius <= TOWN_HALLS[i - 1].cityRadius) errors.push(`cityRadius does not grow at TH${i + 1}`);
  }
  if (TOWN_HALLS[TOWN_HALLS.length - 1].builders !== MAX_BUILDERS) errors.push('TH12 does not reach MAX_BUILDERS');
  if (TOWN_HALLS.some(r => r.cityRadius > PERIMETER_WALL_TILES)) errors.push('a Town Hall builds past the perimeter wall');

  for (let th = 1; th <= MAX_TOWN_HALL_LEVEL; th++) {
    const row = townHallRow(th);
    // Every unit the allowed spawners would deploy must fit under the cap, or the newest
    // spawner type (drones at TH7) is silently starved.
    let demand = 0;
    for (const type of BUILDING_TYPES) demand += spawnerUnitsFor(type) * limitFor(type, th);
    if (row.policeCap < demand) errors.push(`TH${th}: policeCap ${row.policeCap} < spawner demand ${demand}`);
    const counted = countedLimitFor(th);
    if (!(row.raidMinTargets > 0) || row.raidMinTargets > counted) {
      errors.push(`TH${th}: raidMinTargets ${row.raidMinTargets} not in 1..${counted}`);
    }
    // A fully built city that has just upgraded its Town Hall must still earn the full bounty.
    if (th > 1 && row.raidMinTargets > countedLimitFor(th - 1)) {
      errors.push(`TH${th}: raidMinTargets ${row.raidMinTargets} > TH${th - 1} city size ${countedLimitFor(th - 1)}`);
    }
    // Full defense must be reachable: at least one kind of raid defense, each one buildable.
    const kinds = raidThreatKindsAt(th);
    if (!kinds.length) errors.push(`TH${th}: no kind of raid defense for the gem bounty`);
    for (const t of kinds) if (!(limitFor(t, th) > 0)) errors.push(`TH${th}: ${t} counts toward the bounty but cannot be built`);
  }
  // Full defense must need real defenses, not a token one of each kind, and must be reachable.
  if (!(RAID_KIND_SHARE >= 0.5 && RAID_KIND_SHARE <= 1)) errors.push(`RAID_KIND_SHARE ${RAID_KIND_SHARE} not in 0.5..1`);
  // A unique building is one the game only ever reads the best copy of - selling a second
  // one would take the player's resources for nothing.
  for (const type of BUILDING_TYPES) {
    if (!BUILDING_DEFS[type].unique) continue;
    for (let th = 1; th <= MAX_TOWN_HALL_LEVEL; th++) {
      if (limitFor(type, th) > 1) errors.push(`${type}: unique, but TH${th} allows ${limitFor(type, th)}`);
    }
  }

  // Garage ladder: every Vehicle Lab level must pay off, and the cap table must be sane.
  const vr = labResearch('vehicle_lab');
  const caps = vr.trackCapAt || [];
  if (caps.length !== MAX_BUILDING_LEVEL + 1) errors.push(`vehicle_lab.trackCapAt has ${caps.length} entries, expected 13`);
  for (let i = 1; i < caps.length; i++) if (caps[i] < caps[i - 1]) errors.push(`trackCapAt drops at Lab ${i}`);
  if (caps[caps.length - 1] !== TRACK_MAX_LEVEL) errors.push('Lab 12 does not open TRACK_MAX_LEVEL');
  for (let L = 1; L <= MAX_BUILDING_LEVEL; L++) {
    const opensTrack = trackCapFor(L) > trackCapFor(L - 1);
    const opensSlot = deckSlotsFor(L) > deckSlotsFor(L - 1);
    const addsShield = labShieldFor(L) > labShieldFor(L - 1);
    if (!opensTrack && !opensSlot && !addsShield) errors.push(`Vehicle Lab ${L} grants nothing`);
  }
  const shields = vr.shieldAt || [];
  if (shields.length !== MAX_BUILDING_LEVEL + 1) errors.push(`vehicle_lab.shieldAt has ${shields.length} entries, expected 13`);
  if (shields[0] !== 0) errors.push('vehicle_lab.shieldAt[0] (no lab) must be 0');
  for (let i = 1; i < shields.length; i++) {
    if (!(shields[i] > shields[i - 1])) errors.push(`vehicle_lab.shieldAt adds no shield at Lab ${i}`);
  }
  if (!(labResearch('tech_lab').cooldownCutPerLevel > 0)) errors.push('Tech Lab levels past 2 grant nothing');

  // Ability cards: a tier for every level, a price for every purchase, dearer at every level.
  for (const id of Object.keys(CARD_UNLOCKS)) {
    if (!CARD_TIERS[id] || CARD_TIERS[id].length !== CARD_MAX_LEVEL) errors.push(`card ${id}: needs ${CARD_MAX_LEVEL} tiers`);
    if (!CARD_UNLOCKS[id].startUnlocked && !CARD_COSTS.unlock[id]) errors.push(`card ${id}: no unlock price`);
  }
  for (let L = 3; L <= CARD_MAX_LEVEL; L++) {
    if (!(cardLevelCostFor(L).cash > cardLevelCostFor(L - 1).cash)) errors.push(`card level ${L} is not dearer than level ${L - 1}`);
  }
  // A card with a duration (a Big Jump's is its hang time) must have an uptime cap below 1, and
  // no tier may break it at any Tech Lab level - or its effect never switches off (nitro did).
  for (const [id, tiers] of Object.entries(CARD_TIERS)) {
    const timed = id === 'jump' || tiers.some(t => t.duration > 0);
    if (!timed) continue;
    const cap = CARD_UPTIME_CAP[id];
    if (!(cap > 0 && cap < 1)) { errors.push(`card ${id} has a duration but no CARD_UPTIME_CAP below 1`); continue; }
    const tracks = id === 'jump' ? Array.from({ length: TRACK_MAX_LEVEL + 1 }, (_, i) => i) : [0];
    for (let tech = 0; tech <= MAX_BUILDING_LEVEL; tech++) {
      for (let L = 1; L <= tiers.length; L++) {
        for (const jumpTrack of tracks) {
          const s = cardStatsFor(id, L, { techLevel: tech, jumpTrack });
          const up = cardUptimeFor(id, s.cooldown, id === 'jump' ? jumpAirtimeFor(jumpTrack) : s.duration);
          if (up > cap + 1e-9) errors.push(`card ${id} L${L} at Tech Lab ${tech}${id === 'jump' ? `, Jump track ${jumpTrack}` : ''}: ${(100 * up).toFixed(1)}% uptime > ${100 * cap}%`);
        }
      }
    }
  }

  // Holding Space must never make the buggy a permanent airborne ghost.
  const hop = RAIDER_BASE.hop;
  if (!(hop.cooldown > 0) || hopAirShare(hop) > hop.maxAirShare) {
    errors.push(`hop keeps the buggy airborne ${(100 * hopAirShare(hop)).toFixed(0)}% of the time (max ${100 * hop.maxAirShare}%)`);
  }
  return errors;
}

/** "45s", "3m 20s", "2h 40m", "8h" - build timers run to 8 hours, raw seconds are unreadable. */
export function formatDuration(seconds) {
  const t = Math.max(0, Math.ceil(Number(seconds) || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}
