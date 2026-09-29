/**
 * raidbot.mjs - plays REAL raids in Chrome and reports whether a buggy tuned to a Town Hall can
 * raze a full city of the same Town Hall.
 *
 *   PW_CORE=/path/to/node_modules/playwright-core node tools/e2e/raidbot.mjs --th 9 --runs 3
 *
 * Options
 *   --th 9 | 1-12 | 3,6,9   Town Hall(s) to test (default 9)
 *   --runs N                 raids per Town Hall (default 3); run r uses seed (--seed + r)
 *   --spares N               spare lives bought before the raid (default 2, the most the garage stocks)
 *   --jobs N                 raids played in parallel, one browser page each (default 3)
 *   --layout core|shuffled|lattice
 *                            city layout: 'core' (defenses packed round the Town Hall, economy
 *                            round them, barriers and traps on the rim - the round-8 review
 *                            city), 'shuffled' (the same rings, each ring's order drawn from the
 *                            run's seed: a different city every run) or 'lattice' (every 2-tile type interleaved round-robin on a
 *                            2-tile lattice, traps and barriers round-robin on the free tiles
 *                            nearest the centre). Both obey the game's own placement rule
 *                            (BuildingManager.isFootprintBlocked and the buildable radius): a
 *                            city no player could build is reported as failedToPlace
 *   --stow "a,b:n"           after the city is built, lift buildings off it as a player stowing
 *                            them in Big Storage would: every building of type a, the last n of
 *                            type b (the build limits are untouched, so the gem bounty still
 *                            knows what the Town Hall allows)
 *   --gate auto|0|1|2        breach gate ('auto' picks the one the city covers least)
 *   --maxt S                 sim seconds before the bot gives up (default 900)
 *   --fps N                  fixed simulation step, 1/N s (default 60)
 *   --seed S                 base seed for the page's Math.random (default 1)
 *   --json                   print one JSON object per raid instead of the table line
 *   --detail                 also print each life (how it ended, where the damage came from)
 *   --trace                  with --detail, print the bot's view every 0.25 s
 *   --patch "JS"             run JS in the page before the city is built, with the live
 *                            progression module as P (tuning experiments, e.g.
 *                            --patch "P.BUILD_LIMITS.emp_disrupter.fill(0)")
 *
 * Every run boots a fresh page, builds the city from scratch (every building the Town Hall
 * allows, each at level TH; Labour Huts and gates are level 1), tunes the garage exactly to the
 * Town Hall (every track at the Vehicle Lab's cap, every card at progression.raidKitAt's level,
 * every lab at TH), and plays the raid through the real AttackManager.update at a fixed step
 * with the render loop stopped. The bot only presses what a player can press - throttle,
 * brake/reverse, steer, the card hotkeys and Space - and knows only what the owner of the city
 * knows (where their own buildings, traps and EMP fields are, and where the units it can see
 * are). Needs the Vite dev server on http://localhost:3000 (GAME_URL overrides).
 */
import path from 'path';

const PW = process.env.PW_CORE;
if (!PW) { console.error('Set PW_CORE to a playwright-core install directory.'); process.exit(2); }
const { chromium } = await import(path.join(PW, 'index.mjs'));
const URL = process.env.GAME_URL || 'http://localhost:3000/';

// ---------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const parseTh = (s) => String(s).split(',').flatMap(part => {
  const m = part.match(/^(\d+)-(\d+)$/);
  if (m) { const out = []; for (let k = +m[1]; k <= +m[2]; k++) out.push(k); return out; }
  return [Number(part)];
}).filter(n => n >= 1 && n <= 12);
const THS = parseTh(opt('th', '9'));
const RUNS = Math.max(1, Number(opt('runs', 3)));
const SPARES = Math.max(0, Number(opt('spares', 2)));
const JOBS = Math.max(1, Number(opt('jobs', 3)));
const LAYOUT = String(opt('layout', 'core'));
const GATE = String(opt('gate', 'auto'));
const MAXT = Number(opt('maxt', 900));
const FPS = Number(opt('fps', 60));
const SEED = Number(opt('seed', 1));
const JSON_OUT = !!opt('json', false);
const DETAIL = !!opt('detail', false);
const TRACE = !!opt('trace', false);
const MAP = !!opt('map', false);
const PATCH = opt('patch', '') || '';
const STOW = String(opt('stow', '') || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
  const [type, n] = s.split(':');
  return { type, n: n === undefined ? Infinity : Math.max(0, Number(n) || 0) };
});

// ---------------------------------------------------------------- the in-page bot
/**
 * Runs inside the game page. Builds the city, tunes the garage, breaches, and returns a
 * controller whose run(n) plays n fixed steps. Everything here reads the live game objects.
 */
async function setupRaid({ th, layout, gatePick, spares, fps, seed, maxt, trace, patch, stow }) {
  // Stop the render loop first and let any frame already queued run out, so nothing but the
  // bot's own steps touches the game (or its random numbers) from here on.
  const G0 = window.citySiege;
  G0.animate = () => {};
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  // The game's own instance of the module: Vite may serve it with an HMR stamp (?t=...), and a
  // bare import would load a second copy that a --patch could change without the game noticing.
  const progUrl = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/src\/data\/progression\.js(\?|$)/.test(n)) || '/src/data/progression.js';
  const P = await import(progUrl);
  // Deterministic page: the game's own randomness (unit spawn jitter, speed rolls, reload
  // jitter) comes from Math.random, so the same seed and the same code replay the same raid.
  let s = (seed * 2654435761) >>> 0 || 1;
  Math.random = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  if (patch) new Function('P', 'G', patch)(P, window.citySiege);
  const D = P.BUILDING_DEFS;
  const G = window.citySiege;
  const bm = G.buildingManager, am = G.attackManager, v = G.vehicleController, cs = G.cardSystem, gm = G.garageManager;

  // Run on a simulated clock (roadblock ram windows read performance.now).
  let simMs = 0;
  performance.now = () => simMs;
  try { Storage.prototype.setItem = () => {}; } catch (e) { /* private mode */ }
  const ui = G.uiManager;
  ['updateCombatHUD', 'updateTargetBuildingHealthPosition', 'updateVehicleHealthBar', 'showToast', 'flashDamage',
    'showTargetBuildingHealth', 'hideTargetBuildingHealth', 'renderCardsDeck', 'showResultModal', 'updateLivesHUD',
    'showMappingScanEffect', 'hideMappingScanEffect', 'showCombatHUD', 'showTacticalReconBanner', 'hideTacticalReconBanner']
    .forEach(k => { if (typeof ui[k] === 'function') ui[k] = () => {}; });
  const snd = G.soundManager;
  for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(snd))) {
    if (k !== 'constructor' && typeof snd[k] === 'function') snd[k] = () => {};
  }

  // ---------------------------------------------------------------- the city
  const lvlOf = (t) => (D[t].upgradeable === false ? 1 : th);
  const failed = [];
  const R = P.cityRadiusFor(th);
  const rn = bm.roadNetwork;
  /** The game's own placement rule: inside the buildable radius, clear of every footprint and road. */
  const fits = (type, gx, gz) => {
    const fp = bm.footprintOf(type), h = (fp - 1) / 2;
    if (Math.hypot(Math.abs(gx) + h, Math.abs(gz) + h) > R) return false;
    if (bm.isFootprintBlocked(fp, gx, gz)) return false;
    for (let x = Math.ceil(gx - h); x <= Math.floor(gx + h); x++) {
      for (let z = Math.ceil(gz - h); z <= Math.floor(gz + h); z++) if (rn.hasRoad(x, z)) return false;
    }
    return true;
  };
  const byDist = (a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]);
  if (layout === 'lattice') {
    // Every type interleaved. The 2-tile buildings go round-robin by type onto a 2-tile lattice
    // out from the centre; the traps and barriers then go round-robin onto the free tiles nearest
    // the centre. It used to put the traps on the odd tiles between the buildings, which the
    // game's footprint rule does not allow (every trap overlapped a building), so its raids
    // described a city no player could build. Touching 2-tile buildings leave no tile between
    // them, so in a full city the traps and barriers fill the ring the buildings leave.
    const gates = bm.getMainGates().map(g => ({ name: g.name, gx: g.gx, gz: g.gz, rot: g.mesh.rotation.y }));
    bm.clearAll();
    gates.forEach(g => bm.addMainGate(g.name, g.gx, g.gz, g.rot));
    const big = [], small = [];
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) big.push([2 * i, 2 * j]);
    for (let gx = -15; gx <= 15; gx++) for (let gz = -15; gz <= 15; gz++) small.push([gx, gz]);
    big.sort(byDist); small.sort(byDist);
    const roundRobin = (types) => {
      const left = Object.fromEntries(types.map(t => [t, P.limitFor(t, th)]));
      const queue = [];
      for (let more = true; more;) { more = false; for (const t of types) if (left[t] > 0) { queue.push(t); left[t]--; more = true; } }
      return queue;
    };
    const put = (t, spots) => {
      const k = spots.findIndex(([gx, gz]) => fits(t, gx, gz));
      if (k === -1 || !bm.addBuilding(t, spots[k][0], spots[k][1], lvlOf(t), { skipCapCheck: true })) { failed.push(t); return; }
      spots.splice(k, 1);
    };
    roundRobin(['town_hall', 'quantum_citadel', 'emp_disrupter', 'orbital_relay', 'fusion_reactor', 'doomsday_turret', 'laser_obelisk',
      'plasma_mortar', 'missile_silo', 'tesla_coil', 'sniper_tower', 'solar_array', 'police_station', 'swat_armory', 'drone_hangar',
      'vehicle_lab', 'weapons_lab', 'tech_lab', 'crypto_vault', 'big_storage', 'antimatter_collider', 'oil_refinery', 'petrol_pump',
      'cash_mint', 'iron_foundry', 'lumber_mill', 'builder_hut']).forEach(t => put(t, big));
    roundRobin(['landmine', 'freeze_trap', 'vortex_trap', 'spring_trap', 'spike_trap', 'roadblock']).forEach(t => put(t, small));
  } else {
    // 'core': the round-8 review city. The starter roads stay; every defense, aura, spawner and
    // lab is packed round the Town Hall, the economy round them, barriers and traps on the rim.
    for (const b of [...bm.buildings]) if (!b.isMainGate) bm.removeBuilding(b);
    const tiles = [];
    for (let gx = -15; gx <= 15; gx++) for (let gz = -15; gz <= 15; gz++) tiles.push([gx, gz]);
    tiles.sort(byDist);
    const place = (type, ring) => {
      const list = ring === 'out' ? [...tiles].reverse() : tiles;
      for (const [gx, gz] of list) if (fits(type, gx, gz)) return bm.addBuilding(type, gx, gz, lvlOf(type), { skipCapCheck: true });
      return null;
    };
    // 'shuffled': the same rings, each ring's buildings in an order drawn from the run's seed (its
    // own generator, so the raid's randomness is untouched) - a different city every run, so a
    // tuning change is not judged on one lucky or unlucky arrangement of one layout.
    let r = (seed * 2246822519 + 0x9E3779B9) >>> 0 || 7;
    const rand = () => { r = (r + 0x6D2B79F5) | 0; let t = Math.imul(r ^ (r >>> 15), 1 | r); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const ring = (types) => {
      const q = types.flatMap(t => Array.from({ length: P.limitFor(t, th) }, () => t));
      if (layout === 'shuffled') for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
      return q;
    };
    const defense = P.BUILDING_TYPES.filter(t => ['turret', 'aura', 'spawner', 'research'].includes(D[t].role));
    const economy = P.BUILDING_TYPES.filter(t => ['producer', 'storage'].includes(D[t].role) && t !== 'builder_hut');
    for (const t of ['town_hall', ...ring(defense), ...ring(economy), ...ring(['builder_hut'])]) if (!place(t, 'in')) failed.push(t);
    for (const t of ring(['roadblock', 'spike_trap', 'landmine', 'spring_trap', 'freeze_trap', 'vortex_trap'])) if (!place(t, 'out')) failed.push(t);
  }
  // Whatever the layout, no two buildings may overlap under the game's own rule.
  for (const b of bm.buildings) {
    if (b.type !== 'tree' && bm.isFootprintBlocked(bm.footprintOf(b), b.gx, b.gz, b)) failed.push(`${b.type} overlaps at ${b.gx},${b.gz}`);
  }
  // --stow: lift buildings off the finished city, as a player stowing them in Big Storage would.
  const stowed = {};
  for (const { type, n } of stow || []) {
    const of = bm.buildings.filter(b => b.type === type);
    const lift = of.slice(Math.max(0, of.length - n));
    lift.forEach(b => bm.removeBuilding(b));
    stowed[type] = lift.length;
  }

  // ---------------------------------------------------------------- the garage, tuned to th
  const kit = P.raidKitAt(th);
  const cap = P.trackCapFor(kit.vehicleLab);
  for (const k of Object.keys(gm.state.tracks)) gm.state.tracks[k] = cap;
  for (const id of Object.keys(gm.state.cards)) {
    const open = P.cardUnlockTownHall(id) <= th;
    gm.state.cards[id] = { unlocked: open, level: open ? kit.cardLevel : 0 };
  }
  // Best deck for the slots the lab gives: cloak, missiles, bomb and jump before nitro.
  gm.state.loadout = ['invisibility', 'missiles', 'jump', 'bomb', 'nitro'].filter(id => gm.state.cards[id].unlocked);
  G.economyManager.vehicleLives = spares;

  // ---------------------------------------------------------------- pick the gate and breach
  const dt = 1 / fps;
  let el = 0;
  const step = () => { simMs += dt * 1000; el += dt; G.sceneManager.update(dt); am.update(dt, el); };
  am.startRecon();
  const gates = bm.getMainGates();
  const spawnOf = (g) => { const p = g.mesh.position, n = Math.hypot(p.x, p.z) || 1; return { x: p.x + (p.x / n) * 16, z: p.z + (p.z / n) * 16 }; };
  const coverAt = (x, z) => {
    let c = 0;
    for (const b of bm.buildings) {
      const ts = D[b.type] && D[b.type].turret ? P.turretStatsFor(b.type, b.level) : null;
      if (ts && Math.hypot(b.mesh.position.x - x, b.mesh.position.z - z) <= ts.range) c += ts.damage / ts.fireInterval;
      const a = D[b.type] && D[b.type].aura;
      if (a && a.kind === 'silence' && Math.hypot(b.mesh.position.x - x, b.mesh.position.z - z) <= P.auraRadiusFor(b.type, b.level) + 25) c += 1000;
    }
    return c;
  };
  let gate = gates[0];
  if (gatePick === 'auto') {
    let best = Infinity;
    for (const g of gates) {
      const sp = spawnOf(g);
      // Where the gate leads: cover at the spawn and 30 m inside it.
      const n = Math.hypot(sp.x, sp.z);
      const c = coverAt(sp.x, sp.z) + coverAt(sp.x * (1 - 45 / n), sp.z * (1 - 45 / n));
      if (c < best) { best = c; gate = g; }
    }
  } else gate = gates[Number(gatePick) % gates.length];
  am.triggerCinematicBreach(gate);
  for (let i = 0; i < 400 && am.state !== 'COMBAT'; i++) step();

  const counted = am.destruction.getStats().total;
  const ehp = v.maxHp + v.maxShield;
  const deck = cs.deck.map(c => `${c.id}:${c.level}`);
  const lives0 = am.raidLives;

  // ---------------------------------------------------------------- bookkeeping
  const rec = { empDown: [], lives: [], dmg: {}, busts: {}, t: { exposed: 0, cloaked: 0, air: 0, silenced: 0 }, cards: {} };
  let life = { start: 0, dmg: {}, silenced: 0, cloaked: 0, air: 0 };
  const src = { cur: 'other' };
  const origTake = v.takeDamageUnconditional.bind(v);
  v.takeDamageUnconditional = (amount, o = {}) => {
    const before = v.hp + v.shield;
    origTake(amount, o);
    const lost = before - (v.hp + v.shield);
    if (lost > 0) {
      rec.dmg[src.cur] = (rec.dmg[src.cur] || 0) + lost;
      life.dmg[src.cur] = (life.dmg[src.cur] || 0) + lost;
    }
  };
  const tag = (obj, fn, name) => { const o = obj[fn].bind(obj); obj[fn] = (...a) => { const prev = src.cur; src.cur = typeof name === 'function' ? name(...a) : name; try { return o(...a); } finally { src.cur = prev; } }; };
  tag(am.turrets, 'update', 'turrets');
  tag(am.police, 'update', 'drones');
  tag(am.traps, 'update', 'traps');
  tag(am.destruction, 'checkVehicleCollisions', 'barriers');
  tag(am.police, 'checkRoadblockCollisions', 'roadblocks');
  tag(v, 'updateProjectiles', 'blasts');
  tag(cs, 'update', 'blasts');
  // Which unit busted the buggy.
  const origBust = v.bust.bind(v);
  v.bust = () => {
    const was = v.isCrashed;
    origBust();
    if (!was && v.isCrashed) {
      let k = '?', best = Infinity;
      for (const u of am.police.policeUnits) { if (u.isDestroyed || u.flying) continue; const d = u.position.distanceTo(v.position); if (d < best) { best = d; k = u.kind; } }
      life.bustedBy = k;
      rec.busts[k] = (rec.busts[k] || 0) + 1;
      const cd = (id) => { const c = cs.cards.find(x => x.id === id); return c && cs.deck.includes(c) ? +c.currentCooldown.toFixed(1) : '-'; };
      const near = am.police.policeUnits.filter(u => !u.isDestroyed && !u.flying && u.position.distanceTo(v.position) < 30).length;
      life.bustState = `spd ${v.speed.toFixed(0)}${v.onRoad ? 'R' : ''} r${Math.round(Math.hypot(v.position.x, v.position.z))} ${v.stunTimer > 0 ? 'STUN ' : ''}${v.slowTimer > 0 ? 'SLOW ' : ''}${v.pullTimer > 0 ? 'PULL ' : ''}${v.isSilenced ? 'JAM ' : ''}near ${near} cd inv ${cd('invisibility')} jump ${cd('jump')} hop ${cs.hopCooldown.toFixed(1)} nitro ${cd('nitro')} mode ${bot.mode} inv ${v.isInvisible} air ${v.isAirborne} imm ${v.damageImmunityTimer.toFixed(1)}`;
    }
  };
  const use = (id) => { const ok = cs.activateCard(id); if (ok) rec.cards[id] = (rec.cards[id] || 0) + 1; return ok; };

  // ---------------------------------------------------------------- world model
  const T = 5.5;
  const FENCE = 86.5;
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const role = (b) => D[b.type] && D[b.type].role;
  const liveEmps = () => (am.empFields || []).filter(f => !f.b.isDestroyed);
  const inEmp = (x, z, m = 0) => liveEmps().some(f => Math.hypot(x - f.b.mesh.position.x, z - f.b.mesh.position.z) <= f.radius + m);
  const shootable = () => bm.buildings.filter(b => am.destruction.isShootable(b));
  const counts = (b) => am.destruction.countsTowardDestruction(b) && !b.isDestroyed;
  const armedTraps = () => am.traps.traps.filter(t => !t.building.isDestroyed && !t.building.trapSpent && t.cooldown <= 0);
  const liveGuns = () => am.turrets.turrets.filter(t => !t.parent.isDestroyed);
  const gunDpsAt = (x, z) => {
    let dps = 0;
    for (const t of liveGuns()) {
      const d = Math.hypot(t.pos.x - x, t.pos.z - z);
      if (d <= t.range && d >= (t.minRange || 0)) dps += t.damage / t.fireInterval;
    }
    return dps;
  };
  /** Does a round fired from (x, z) at building `tb` reach it before any other building? */
  const lineClear = (x, z, tb, blockers) => {
    const tx = tb.mesh.position.x, tz = tb.mesh.position.z;
    const L = Math.hypot(tx - x, tz - z) || 1;
    const ux = (tx - x) / L, uz = (tz - z) / L;
    for (const b of blockers) {
      if (b === tb) continue;
      const bx = b.mesh.position.x - x, bz = b.mesh.position.z - z;
      const along = bx * ux + bz * uz;
      if (along < 0 || along > L - 1) continue;
      if (Math.abs(bx * uz - bz * ux) < (b.isMainGate ? 4.8 : 3.3)) return false;
    }
    return true;
  };

  // ---- navigation grid (2.75 m cells) and A*
  const CELL = 2.75, HALF = 36, N = 2 * HALF + 1;
  const idx = (i, j) => (i + HALF) * N + (j + HALF);
  const toCell = (x) => Math.max(-HALF, Math.min(HALF, Math.round(x / CELL)));
  let grid = null, gridAt = -1;
  const buildGrid = () => {
    const cost = new Float32Array(N * N).fill(1);
    const block = (x, z, r, c) => {
      const i0 = toCell(x - r), i1 = toCell(x + r), j0 = toCell(z - r), j1 = toCell(z + r);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        if (Math.hypot(i * CELL - x, j * CELL - z) <= r) { const k = idx(i, j); cost[k] = c === Infinity ? Infinity : Math.max(cost[k], c); }
      }
    };
    for (let i = -HALF; i <= HALF; i++) for (let j = -HALF; j <= HALF; j++) if (Math.hypot(i * CELL, j * CELL) > FENCE) cost[idx(i, j)] = -1;
    for (const b of bm.buildings) {
      if (!b.mesh) continue;
      const r = role(b);
      if (b.isDestroyed) { if (b.rubbleMesh) block(b.mesh.position.x, b.mesh.position.z, 2.2, 6); continue; }
      if (r === 'trap' || r === 'scenery') continue;
      if (b.isMainGate) {
        const rot = b.mesh.rotation.y || 0, c = Math.cos(rot), sn = Math.sin(rot);
        for (const side of [-1, 1]) block(b.mesh.position.x + side * 3.2 * c, b.mesh.position.z - side * 3.2 * sn, 2.6, Infinity);
        continue;
      }
      if (r === 'barrier') { block(b.mesh.position.x, b.mesh.position.z, 4.3, 40); continue; }
      block(b.mesh.position.x, b.mesh.position.z, 4.4, Infinity);
    }
    for (const t of armedTraps()) {
      const p = t.building.mesh.position;
      block(p.x, p.z, t.radius + 1.5, t.kind === 'damage' ? 25 : t.kind === 'pull' ? 18 : 10);
    }
    for (const f of liveEmps()) {
      const p = f.b.mesh.position;
      block(p.x, p.z, f.radius + 2, 4);
    }
    return cost;
  };
  const astar = (sx, sz, gx, gz) => {
    const cost = grid;
    const si = toCell(sx), sj = toCell(sz), gi = toCell(gx), gj = toCell(gz);
    const start = idx(si, sj), goal = idx(gi, gj);
    const g = new Float32Array(N * N).fill(Infinity), from = new Int32Array(N * N).fill(-1);
    const heap = [];
    const push = (k, f) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    g[start] = 0; push(start, 0);
    const H = (k) => { const i = Math.floor(k / N) - HALF, j = (k % N) - HALF; return Math.hypot(i - gi, j - gj); };
    let expanded = 0, bestK = start, bestH = H(start);
    while (heap.length && expanded < 6000) {
      const [, k] = pop();
      if (k === goal) { bestK = k; break; }
      expanded++;
      const i = Math.floor(k / N) - HALF, j = (k % N) - HALF;
      const h = H(k); if (h < bestH) { bestH = h; bestK = k; }
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < -HALF || ni > HALF || nj < -HALF || nj > HALF) continue;
        const nk = idx(ni, nj);
        let c = cost[nk];
        // Beyond the fence the buggy can only drive inward (it breaches from outside it).
        if (c === -1) c = Math.hypot(ni, nj) < Math.hypot(i, j) ? 1 : Infinity;
        if (c === Infinity && nk !== goal) continue;
        const step = (di && dj ? 1.414 : 1) * (c === Infinity ? 50 : c);
        const ng = g[k] + step;
        if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(nk, ng + H(nk)); }
      }
    }
    const path = [];
    for (let k = bestK; k !== -1; k = from[k]) path.push({ x: (Math.floor(k / N) - HALF) * CELL, z: ((k % N) - HALF) * CELL });
    return path.reverse();
  };

  // ---- targets
  const blastValue = (b) => {
    const bl = P.blastFor(b.type, b.level);
    if (!bl) return 0;
    let n = 0;
    for (const o of bm.buildings) if (o !== b && counts(o) && Math.hypot(o.mesh.position.x - b.mesh.position.x, o.mesh.position.z - b.mesh.position.z) < bl.radius) n++;
    return n;
  };
  /** How many standing counted structures lie inside a circle. */
  const coveredBy = (x, z, r, self) => {
    let n = 0;
    for (const o of bm.buildings) if (o !== self && counts(o) && Math.hypot(o.mesh.position.x - x, o.mesh.position.z - z) <= r) n++;
    return n;
  };
  /**
   * What razing `b` is worth beyond the 1/N it adds to the score: an EMP by how much of the
   * remaining city its field jams, a Citadel by how much it shields, a spawner or a gun by the
   * pressure it takes off, an explosive by what its blast takes with it.
   */
  const valueOf = (b) => {
    const r = role(b), def = D[b.type];
    const at = b.mesh.position;
    if (def.aura && def.aura.kind === 'silence') return 25 + 2.5 * coveredBy(at.x, at.z, P.auraRadiusFor(b.type, b.level), b);
    if (def.aura && def.aura.kind === 'shield') return 20 + 1.5 * coveredBy(at.x, at.z, P.auraRadiusFor(b.type, b.level), b);
    if (r === 'spawner') return 60;
    if (r === 'turret') { const ts = P.turretStatsFor(b.type, b.level); return 35 + Math.min(40, 400 * ts.damage / ts.fireInterval / b.maxHp); }
    if (def.aura) return 30;
    if (def.blast) return 10 + 3 * blastValue(b);
    return 0;
  };
  /** Seconds of autocannon fire to cut through what stands between (x, z) and `tb`. */
  const carveSeconds = (x, z, tb, blockers) => {
    const tx = tb.mesh.position.x, tz = tb.mesh.position.z;
    const L = Math.hypot(tx - x, tz - z) || 1;
    const ux = (tx - x) / L, uz = (tz - z) / L;
    let hp = 0;
    for (const b of blockers) {
      if (b === tb) continue;
      const bx = b.mesh.position.x - x, bz = b.mesh.position.z - z;
      const along = bx * ux + bz * uz;
      if (along < 0 || along > L - 1) continue;
      if (Math.abs(bx * uz - bz * ux) < (b.isMainGate ? 4.8 : 3.3)) hp += Math.max(0, b.hp);
    }
    return hp / cannonDps;
  };
  const cannonDps = (2 * v.cannonDamage) / P.RAIDER_BASE.cannonInterval;
  /** Every explosive that goes off if `b` does (each one inside another's blast), with its blast. */
  const chainOf = (b) => {
    const out = [];
    const seen = new Set();
    const stack = [b];
    while (stack.length) {
      const c = stack.pop();
      if (seen.has(c)) continue;
      seen.add(c);
      const bl = P.blastFor(c.type, c.level);
      if (!bl) continue;
      out.push({ b: c, bl });
      for (const o of bm.buildings) {
        if (seen.has(o) || o.isDestroyed || !o.mesh || !D[o.type].blast) continue;
        if (Math.hypot(o.mesh.position.x - c.mesh.position.x, o.mesh.position.z - c.mesh.position.z) <= bl.radius) stack.push(o);
      }
    }
    return out;
  };
  /** Worst blast the buggy at (x, z) takes if `b` goes off (only the first blast to reach it lands). */
  const chainHurtAt = (b, x, z) => {
    let worst = 0;
    for (const { b: c, bl } of chainOf(b)) worst = Math.max(worst, P.blastDamageAt(bl, Math.hypot(c.mesh.position.x - x, c.mesh.position.z - z)));
    return worst;
  };
  /**
   * Where to stand to shoot `tb`: rings of candidate spots round it, costed by the drive there,
   * the time to cut a lane through whatever stands in the way (the autocannon hits the first
   * building on its line), being jammed inside an EMP field, gun cover and armed traps. An EMP
   * is best cut out from outside its own field.
   */
  const spotFor = (tb) => {
    const tx = tb.mesh.position.x, tz = tb.mesh.position.z;
    const blockers = shootable();
    const solids = bm.buildings.filter(b => !b.isDestroyed && b.mesh && role(b) !== 'trap' && role(b) !== 'scenery');
    const isEmp = D[tb.type].aura && D[tb.type].aura.kind === 'silence';
    const ehpNow = v.maxHp + v.maxShield;
    // An explosive target's blast (and the chain it sets off) reaches the buggy: stand back.
    const blast = P.blastFor(tb.type, tb.level);
    let best = null, bestC = Infinity;
    for (const r of [10, 14, 19, 25, 33, 43, 56, 70, 85]) {
      if (r > 60 && !isEmp && !blast) continue;
      for (let k = 0; k < 32; k++) {
        const a = (k / 32) * 2 * Math.PI;
        const x = tx + Math.sin(a) * r, z = tz + Math.cos(a) * r;
        if (Math.hypot(x, z) > FENCE - 2) continue;
        if (solids.some(b => Math.hypot(b.mesh.position.x - x, b.mesh.position.z - z) < 4.6)) continue;
        const carve = carveSeconds(x, z, tb, blockers);
        let c = Math.hypot(x - v.position.x, z - v.position.z) * 0.4 + r * 0.2 + carve * 1.5;
        if (inEmp(x, z, 3)) c += isEmp ? 120 : 160;
        c += 300 * gunDpsAt(x, z) / ehpNow;
        if (blast) c += 250 * chainHurtAt(tb, x, z) / ehpNow;
        for (const t of armedTraps()) if (Math.hypot(t.building.mesh.position.x - x, t.building.mesh.position.z - z) < t.radius + 2) c += 60;
        if (c < bestC) { bestC = c; best = { x, z, clear: carve === 0, carve, r }; }
      }
    }
    return best;
  };

  /**
   * Next target: the best value for the risk of where the buggy has to stand to hit it. Rough
   * value minus distance ranks every standing structure; the best dozen get a firing spot, and a
   * spot inside an EMP field (no cards) or under heavy gun cover costs a lot - the city is peeled
   * from the outside in, and the EMP is taken once it can be reached.
   */
  const pickTarget = () => {
    const px = v.position.x, pz = v.position.z;
    const cands = [];
    for (const b of bm.buildings) {
      if (!counts(b) || !am.destruction.isShootable(b)) continue;
      if ((bot.skip.get(b) || 0) > el) continue;
      const d = Math.hypot(b.mesh.position.x - px, b.mesh.position.z - pz);
      cands.push({ b, rough: valueOf(b) - d * 0.9 });
    }
    cands.sort((x, y) => y.rough - x.rough);
    const ehpNow = v.maxHp + v.maxShield;
    let best = null, bestS = -Infinity, bestSpot = null;
    for (const c of cands.slice(0, 12)) {
      const sp = spotFor(c.b);
      if (!sp) continue;
      const isEmp = D[c.b.type].aura && D[c.b.type].aura.kind === 'silence';
      const jammed = inEmp(sp.x, sp.z, 2);
      let sc = valueOf(c.b) - Math.hypot(sp.x - px, sp.z - pz) * 0.6 - Math.min(60, sp.carve * 1.2);
      if (jammed) sc -= isEmp ? 90 : 140;
      sc -= 600 * gunDpsAt(sp.x, sp.z) / ehpNow;
      if (sc > bestS) { bestS = sc; best = c.b; bestSpot = sp; }
    }
    bot.nextSpot = bestSpot;
    return best;
  };

  // ---- bot state
  const bot = { skip: new Map(), target: null, spot: null, retarget: 0, path: [], replan: 0, lastP: { x: 0, z: 0, t: 0 }, unstick: 0, unstickDir: 1 };
  const cardOf = (id) => cs.cards.find(c => c.id === id);
  const ready = (id) => cs.canUse(id) && !v.isSilenced;

  /** Steer the nose toward `heading`. Steering flips when the buggy is rolling backwards. */
  const steerTo = (heading) => {
    const e = wrap(heading - v.heading);
    const inp = v.inputs;
    const back = v.speed < -0.3 || (v.speed < 0.3 && inp.reverse);
    if (!back) { inp.left = e > 0.035; inp.right = e < -0.035; }
    else { inp.right = e > 0.035; inp.left = e < -0.035; }
    return e;
  };
  /**
   * Turn on the spot toward `heading`: keep rolling slowly the way the buggy already rolls
   * (steering only works while it moves), backing up when it is `tooClose`.
   */
  const pivotTo = (heading, tooClose = false) => {
    const inp = v.inputs;
    const e = wrap(heading - v.heading);
    if (Math.abs(e) < 0.04) {
      if (v.speed > 0.6) inp.reverse = true; else if (v.speed < -0.6) inp.forward = true;
      return e;
    }
    const goBack = v.speed < -0.3 || (Math.abs(v.speed) <= 0.3 && tooClose);
    if (goBack) inp.reverse = v.speed > -3.5; else inp.forward = v.speed < 3.5;
    steerTo(heading);
    return e;
  };

  /**
   * Best heading to get away from the ground pursuers: 32 candidate headings, each scored by
   * how far the nearest unit would be after 1.5 s of driving it, minus obstacles, the fence,
   * EMP fields, armed traps and the time it takes to turn onto it.
   */
  const escapeHeading = (ground, px, pz) => {
    const solids = bm.buildings.filter(b => !b.isDestroyed && b.mesh && role(b) !== 'trap' && role(b) !== 'scenery');
    const spd = Math.max(20, v.maxForwardSpeed * 0.8);
    let best = v.heading, bestS = -Infinity;
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * 2 * Math.PI;
      let blocked = 0;
      for (const dd of [2.5, 5, 8, 12, 17, 23, 30]) {
        const x = px + Math.sin(a) * dd, z = pz + Math.cos(a) * dd;
        if (Math.hypot(x, z) > 87 && Math.hypot(x, z) > Math.hypot(px, pz)) { blocked = dd; break; }
        if (solids.some(o => Math.hypot(x - o.mesh.position.x, z - o.mesh.position.z) < (role(o) === 'barrier' ? 3.6 : 4.0))) { blocked = dd; break; }
      }
      const turnT = Math.abs(wrap(a - v.heading)) / 2.4;
      const t = 1.5;
      const x = px + Math.sin(a) * spd * Math.max(0, t - turnT), z = pz + Math.cos(a) * spd * Math.max(0, t - turnT);
      let m = Infinity;
      for (const g of ground) {
        const u = g.u;
        if (v.isInvisible && g.cloakLeft > t) {
          // Blind: it coasts on along its heading, slowing down.
          const go = Math.max(5 * t, (u.speed * u.speed - 25) / (2 * u.acceleration));
          const ux = u.position.x + Math.sin(u.heading) * Math.min(go, u.speed * t), uz = u.position.z + Math.cos(u.heading) * Math.min(go, u.speed * t);
          m = Math.min(m, Math.hypot(x - ux, z - uz) - 4);
        } else {
          // It steers straight at the buggy: where it gets to in t seconds.
          const dx = x - u.position.x, dz = z - u.position.z, dd = Math.hypot(dx, dz) || 1;
          const reach = Math.min(dd, u.maxSpeed * t);
          m = Math.min(m, dd - reach + (u.kind === 'swat' ? 0 : 6));
        }
      }
      let sc = Math.min(m, 60) + (blocked ? -120 + blocked * 3 : 0) - turnT * 8;
      // Running into an EMP field kills the cloak, the jump and the nitro: the worst place to flee to.
      if (!v.isSilenced) { for (const dd of [6, 14, 24]) { if (inEmp(px + Math.sin(a) * dd, pz + Math.cos(a) * dd, 3)) { sc -= 70; break; } } }
      else if (inEmp(x, z, 0)) sc -= 20;
      // Armed traps anywhere along the run, not only where it ends: a mine costs a quarter of
      // the buggy, a spring or a vortex hands it to whoever is chasing.
      for (const tr of armedTraps()) {
        const tp = tr.building.mesh.position;
        for (const dd of [4, 9, 15, 22]) {
          const sx = px + Math.sin(a) * dd, sz = pz + Math.cos(a) * dd;
          if (Math.hypot(tp.x - sx, tp.z - sz) < tr.radius + 1.5) { sc -= tr.kind === 'damage' ? 45 : 30; break; }
        }
      }
      if (sc > bestS) { bestS = sc; best = a; }
    }
    return best;
  };

  const control = () => {
    const inp = v.inputs;
    inp.forward = inp.reverse = inp.left = inp.right = inp.handbrake = false;
    const px = v.position.x, pz = v.position.z;
    const sil = v.isSilenced, inv = v.isInvisible, air = v.isAirborne;
    const imm = v.damageImmunityTimer;

    // -------- perception: ground pursuers (contact busts) and how soon they arrive
    const vx = Math.sin(v.heading) * v.speed, vz = Math.cos(v.heading) * v.speed;
    const ground = [];
    for (const u of am.police.policeUnits) {
      if (u.isDestroyed || u.flying) continue;
      const dx = u.position.x - px, dz = u.position.z - pz, d = Math.hypot(dx, dz) || 0.01;
      const ux = Math.sin(u.heading) * u.speed, uz = Math.cos(u.heading) * u.speed;
      const closing = -((ux - vx) * dx + (uz - vz) * dz) / d;
      ground.push({ u, d, dx, dz, closing, ttc: (d - 3.2) / Math.max(0.5, closing) });
    }
    ground.sort((a, b) => a.ttc - b.ttc);
    const first = ground[0];
    const cloakLeft0 = v.isInvisible && cardOf('invisibility') ? cardOf('invisibility').activeTimer : 0;
    ground.forEach(g => { g.cloakLeft = cloakLeft0; });
    const byDist = [...ground].sort((a, b) => a.d - b.d);
    const cloakCard = cardOf('invisibility');
    const cloakLeft = inv && cloakCard ? cloakCard.activeTimer : 0;
    const safeFor = inv ? cloakLeft : 0;          // seconds the buggy cannot be busted anyway
    const graceLeft = Math.max(safeFor, imm);

    // -------- 1. contact imminent: get airborne (Big Jump if it can, the hop otherwise)
    if (first && !air && graceLeft < 0.25 && (first.ttc < 0.28 || first.d < 4.4)) use('jump');

    // -------- 2. cloak: pursuit closing, or shelling under fire
    if (!inv && !sil && ready('invisibility') && imm < 1.0) {
      const threat = ground.some(g => g.d < 30 || (g.ttc < 1.8 && g.d < 70));
      const hurting = gunDpsAt(px, pz) > 0 && (v.hp + v.shield) < 0.5 * (v.maxHp + v.maxShield);
      const shelling = bot.spot && Math.hypot(bot.spot.x - px, bot.spot.z - pz) < 7 && gunDpsAt(px, pz) > 0.03 * (v.maxHp + v.maxShield);
      if (threat || hurting || shelling) use('invisibility');
    }

    // -------- 3. missiles kill any pursuer they touch: fire when one is on the nose
    if (!sil && ready('missiles')) {
      for (const g of byDist) {
        if (g.d > 80) break;
        const e = Math.abs(wrap(Math.atan2(g.dx, g.dz) - v.heading));
        if (e < Math.atan2(1.6, g.d)) { use('missiles'); break; }
      }
    }
    // -------- 4. bomb: wrecks cruisers round the buggy (it drops behind; the buggy is not hurt)
    if (!sil && ready('bomb') && byDist.some(g => g.d < 12)) use('bomb');

    // -------- 4b. no cloak for a few seconds and the pack is coming (a respawn with the cloak
    // still recharging, or the gap between cloaks): stall - keep away until it is back.
    const cloakCd = cloakCard && cs.deck.includes(cloakCard) ? cloakCard.currentCooldown : Infinity;
    if (!inv && !sil && cloakCd > 0 && cloakCd < 5 && byDist.some(g => g.d < 55 && g.closing > 0)) {
      bot.mode = 'stall';
      const esc = escapeHeading(byDist.filter(g => g.d < 80), px, pz);
      const e = steerTo(esc);
      inp.forward = true;
      inp.handbrake = Math.abs(e) > 1.8 && v.speed > 10;
      if (ready('nitro') && Math.abs(e) < 0.9 && byDist.some(g => g.d < 35)) use('nitro');
      return;
    }

    // -------- 5. the pursuit is the problem: disengage (cloak running out) or fight/flee
    const danger = byDist.filter(g => g.d < (graceLeft > 0 ? 24 : 40) && (g.ttc < 2.2 || g.d < 16));
    const cloakEnding = inv && cloakLeft < 2.4;
    if (danger.length && (graceLeft < 0.6 || cloakEnding)) {
      const c = byDist[0];
      const toC = Math.atan2(c.dx, c.dz);
      const eC = wrap(toC - v.heading);
      const missileSoon = !sil && cardOf('missiles') && cs.deck.includes(cardOf('missiles')) && cardOf('missiles').currentCooldown < 0.6;
      if (missileSoon && c.d > 14 && c.d < 70 && danger.length <= 2) {
        // One or two chasers and a missile ready: turn onto the nearest and fire.
        bot.mode = 'missile-duel';
        if (Math.abs(eC) > 1.3) { inp.forward = true; inp.handbrake = Math.abs(eC) > 2.2 && v.speed > 8; steerTo(toC); }
        else { inp.reverse = c.d < 30 && v.speed > -10; inp.forward = !inp.reverse && v.speed < 4; steerTo(toC); }
        return;
      }
      bot.mode = 'flee';
      const esc = escapeHeading(danger, px, pz);
      const e = steerTo(esc);
      inp.forward = true;
      inp.handbrake = Math.abs(e) > 1.8 && v.speed > 10;
      // The cloak gap: a nitro burn (same ~11 s cycle as the cloak) carries the buggy clear
      // of the pack until the cloak is back.
      if (!sil && ready('nitro') && !inv && Math.abs(e) < 0.9 && danger.some(g => g.d < 45)) use('nitro');
      return;
    }
    // Burning nitro with the pack still close: keep running until the cloak is back.
    if (v.isNitro && !inv && byDist.some(g => g.d < 60)) {
      bot.mode = 'nitro-run';
      const esc = escapeHeading(byDist.filter(g => g.d < 80), px, pz);
      const e = steerTo(esc);
      inp.forward = true;
      inp.handbrake = Math.abs(e) > 1.8 && v.speed > 10;
      return;
    }

    // -------- offence: pick a target and a firing spot, drive there, face it
    bot.retarget -= dt;
    if (!bot.target || bot.target.isDestroyed || !am.destruction.isShootable(bot.target) || bot.retarget <= 0) {
      const prev = bot.target;
      bot.target = pickTarget();
      if (bot.target !== prev || !bot.spot || bot.retarget <= 0) { bot.spot = bot.target ? bot.nextSpot : null; bot.replan = 0; }
      bot.retarget = 6;
    }
    const tb = bot.target;
    if (!tb) return;
    // A target that has not lost HP for 12 s is out of reach from here: skip it for a while.
    const lineHp = tb.hp + (bot.spot && !bot.spot.clear ? carveSeconds(v.position.x, v.position.z, tb, shootable()) * cannonDps : 0);
    if (bot.watch !== tb) { bot.watch = tb; bot.watchHp = lineHp; bot.watchT = el; }
    else if (lineHp < bot.watchHp - 1) { bot.watchHp = lineHp; bot.watchT = el; }
    else if (el - bot.watchT > 12) { bot.skip.set(tb, el + 25); bot.target = null; bot.watch = null; return; }
    const tx = tb.mesh.position.x, tz = tb.mesh.position.z;
    const sp = bot.spot || { x: px, z: pz };
    const ds = Math.hypot(sp.x - px, sp.z - pz);
    const dT = Math.hypot(tx - px, tz - pz);
    const toT = Math.atan2(tx - px, tz - pz);

    // Unstick: pinned against something for a second -> back off turning.
    if (bot.unstick > 0) {
      bot.unstick -= dt;
      inp.reverse = true; inp.left = bot.unstickDir > 0; inp.right = bot.unstickDir < 0;
      return;
    }
    if (el - bot.lastP.t > 1.2) {
      const moved = Math.hypot(px - bot.lastP.x, pz - bot.lastP.z);
      if (moved < 2 && ds > 6 && !air && !bot.holding) { bot.unstick = 0.7; bot.unstickDir = Math.random() < 0.5 ? 1 : -1; bot.replan = 0; }
      bot.lastP = { x: px, z: pz, t: el };
    }

    const lineOk = lineClear(px, pz, tb, shootable());
    const arrived = ds < 4.5 || (dT < (bot.spot ? bot.spot.r : 20) + 4 && (lineOk || (bot.spot && !bot.spot.clear && ds < 12)) && inEmp(px, pz, 2) === inEmp(sp.x, sp.z, 2));
    bot.holding = arrived;
    bot.mode = arrived ? 'hold' : 'drive';
    if (!arrived) {
      bot.replan -= dt;
      if (!grid || el - gridAt > 1.0) { grid = buildGrid(); gridAt = el; }
      if (bot.replan <= 0 || !bot.path.length) { bot.path = astar(px, pz, sp.x, sp.z); bot.replan = 0.6; }
      // Pure pursuit: the first path point 6 m ahead.
      let aim = sp;
      while (bot.path.length > 1 && Math.hypot(bot.path[0].x - px, bot.path[0].z - pz) < 6) bot.path.shift();
      if (bot.path.length) aim = bot.path[0];
      const want = Math.atan2(aim.x - px, aim.z - pz);
      const e = wrap(want - v.heading);
      if (Math.abs(e) > 2.0 && Math.abs(v.speed) < 6) { inp.reverse = true; steerTo(want); }
      else {
        inp.forward = !(ds < 14 && v.speed > 16) && !(Math.abs(e) > 1.2 && v.speed > 12);
        inp.handbrake = Math.abs(e) > 1.4 && v.speed > 10;
        steerTo(want);
      }
    } else {
      // Hold the spot, nose on the target; the autocannon fires on its own.
      const e = pivotTo(toT, dT < 9);
      if (!sil && Math.abs(e) < Math.atan2(2.6, dT) && ready('missiles') && dT < 95 && !ground.some(g => g.d < 60)) use('missiles');
      const bomb = cardOf('bomb');
      if (!sil && bomb && ready('bomb')) {
        // The bomb drops 2.6 m behind the buggy: worth it when the target (or a cluster) is in reach.
        const bx = px - Math.sin(v.heading) * 2.6, bz = pz - Math.cos(v.heading) * 2.6;
        let hit = 0;
        for (const o of bm.buildings) if (counts(o) && am.destruction.isShootable(o)) {
          const dd = Math.hypot(o.mesh.position.x - bx, o.mesh.position.z - bz);
          if (dd < bomb.blastRadius) hit += P.blastDamageAt({ radius: bomb.blastRadius, damage: bomb.blastDamage }, dd) / bomb.blastDamage;
        }
        if (hit >= 1.2) use('bomb');
      }
    }
  };

  let lifeLostAt = -1;
  const traceLog = [];
  let traceT = 0;
  const cdOf = (id) => { const c = cardOf(id); return c ? +c.currentCooldown.toFixed(1) : '-'; };
  const run = (steps) => {
    for (let n = 0; n < steps; n++) {
      if (am.state !== 'COMBAT' || el >= maxt) break;
      if (!v.isCrashed) {
        control();
        if (trace && el >= traceT) {
          traceT = el + 0.25;
          const gs = am.police.policeUnits.filter(u => !u.isDestroyed && !u.flying).map(u => [u.kind[0], Math.round(u.position.distanceTo(v.position))]).sort((a, b) => a[1] - b[1]).slice(0, 3);
          const i = v.inputs;
          traceLog.push(`${el.toFixed(2)} L${rec.lives.length + 1} (${v.position.x.toFixed(0)},${v.position.z.toFixed(0)}) r${Math.hypot(v.position.x, v.position.z).toFixed(0)} spd ${v.speed.toFixed(0)}${v.onRoad ? 'R' : ''} hp ${Math.round(v.hp + v.shield)} ${v.isInvisible ? 'INV ' : ''}${v.isAirborne ? 'AIR ' : ''}${v.isSilenced ? 'SIL ' : ''}${v.damageImmunityTimer > 0 ? 'IMM ' : ''}cops ${JSON.stringify(gs)} cd inv ${cdOf('invisibility')} j ${cdOf('jump')} hop ${cs.hopCooldown.toFixed(1)} n ${cdOf('nitro')} in ${i.forward ? 'F' : ''}${i.reverse ? 'B' : ''}${i.left ? 'L' : ''}${i.right ? 'R' : ''} tgt ${bot.target ? bot.target.type : '-'} ${am.destruction.getStats().percentage}%`);
        }
        if (v.isInvisible) { rec.t.cloaked += dt; life.cloaked += dt; }
        else if (v.isAirborne) { rec.t.air += dt; life.air += dt; }
        else rec.t.exposed += dt;
        if (v.isSilenced) { rec.t.silenced += dt; life.silenced += dt; }
      } else if (lifeLostAt < 0) {
        lifeLostAt = el;
        const st = am.destruction.getStats();
        rec.lives.push({ t: +(el - life.start).toFixed(1), at: +el.toFixed(1), pct: st.percentage, how: v.isBusted ? 'bust' : 'wreck', by: life.bustedBy || null, bustState: life.bustState,
          silenced: +life.silenced.toFixed(1), cloaked: +life.cloaked.toFixed(1), air: +life.air.toFixed(1), wasSilenced: v.isSilenced,
          dmg: Object.fromEntries(Object.entries(life.dmg).map(([k, x]) => [k, Math.round(x)])) });
      }
      const livesBefore = am.raidLives;
      for (const f of am.empFields || []) if (f.b.isDestroyed && !rec.empDown.some(e => e.b === f.b)) rec.empDown.push({ b: f.b, t: +el.toFixed(1), life: rec.lives.length + 1 });
      step();
      if (am.raidLives < livesBefore && am.state === 'COMBAT') { life = { start: el, dmg: {}, silenced: 0, cloaked: 0, air: 0 }; lifeLostAt = -1; bot.path = []; bot.target = null; }
    }
    const st = am.destruction.getStats();
    const done = am.state !== 'COMBAT' || el >= maxt;
    if (!done) return { done: false, t: el, pct: st.percentage };
    const outcome = am.state === 'COMBAT' ? 'timeout' : (am.attackStats && am.attackStats.outcome);
    if (am.state === 'COMBAT') am.endAttack('retreat');
    const lost = rec.lives.length;
    return {
      done: true, th, layout, gate: gate.name, seed, outcome, won: outcome === 'victory', pct: st.percentage, destroyed: st.destroyed, total: counted,
      seconds: +el.toFixed(1), livesTotal: lives0, livesLost: lost, livesUsed: lost + (outcome === 'victory' || outcome === 'timeout' ? 1 : 0),
      ehp, deck, failedToPlace: failed, busts: rec.busts, dmg: Object.fromEntries(Object.entries(rec.dmg).map(([k, x]) => [k, Math.round(x)])),
      time: Object.fromEntries(Object.entries(rec.t).map(([k, x]) => [k, +x.toFixed(0)])), cards: rec.cards, lives: rec.lives,
      empDown: rec.empDown.map(e => `${e.t}s (life ${e.life})`), empPos: (am.empFields || []).map(f => `r${Math.round(Math.hypot(f.b.mesh.position.x, f.b.mesh.position.z))}/${Math.round(f.radius)}m`),
      gems: am.attackStats && am.attackStats.gems, gemShort: am.attackStats && am.attackStats.gemShort, stowed,
      trace: trace ? traceLog : undefined
    };
  };
  window.__raidbot = { run };
  // ASCII map of the city at the breach (--map): one character per tile.
  const glyph = { landmine: 'm', spring_trap: 's', freeze_trap: 'f', vortex_trap: 'v', roadblock: '#', spike_trap: '^', emp_disrupter: 'E', quantum_citadel: 'Q',
    town_hall: 'H', swat_armory: 'W', police_station: 'P', drone_hangar: 'D', tree: ' ' };
  const map = [];
  for (let z = -17; z <= 17; z++) {
    let line = '';
    for (let x = -17; x <= 17; x++) {
      const b = bm.buildings.find(o => !o.isMainGate && Math.abs(o.gx - x) < (o.footprint || 1) / 2 + 0.01 && Math.abs(o.gz - z) < (o.footprint || 1) / 2 + 0.01 && (o.footprint > 1 || (o.gx === x && o.gz === z)));
      const g = bm.getMainGates().find(o => o.gx === x && o.gz === z);
      line += g ? 'G' : b ? (glyph[b.type] || (D[b.type].role === 'turret' ? 'T' : 'b')) : Math.hypot(x, z) * T > 88 ? '.' : bm.roadNetwork.hasRoad(x, z) ? '=' : ' ';
    }
    map.push(line);
  }
  return { counted, ehp, deck, failed, gate: gate.name, lives: lives0, map };
}

// ---------------------------------------------------------------- driver
const jobs = [];
for (const th of THS) for (let r = 1; r <= RUNS; r++) jobs.push({ th, run: r, seed: SEED + r - 1 + 1000 * th });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const errors = [];
const fmtLine = (r) => `TH${String(r.th).padStart(2)} run ${r.run}: ${r.won ? 'WON ' : 'lost'}  lives ${r.livesUsed}/${r.livesTotal}  ${String(r.pct).padStart(3)}% destroyed (${r.destroyed}/${r.total})  ${String(Math.round(r.seconds)).padStart(4)}s  [${r.gate}, seed ${r.seed}]`;

async function worker(wid) {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 400 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`worker ${wid}: ${e.message}`));
  for (;;) {
    const job = jobs.shift();
    if (!job) break;
    await page.goto(URL);
    await page.waitForFunction(() => window.citySiege && window.citySiege.buildingManager, null, { timeout: 30000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.citySiege && window.citySiege.buildingManager, null, { timeout: 30000 });
    await page.waitForTimeout(300);
    const setup = await page.evaluate(setupRaid, { th: job.th, layout: LAYOUT, gatePick: GATE, spares: SPARES, fps: FPS, seed: job.seed, maxt: MAXT, trace: TRACE, patch: PATCH, stow: STOW });
    if (MAP) console.log(`TH${job.th} ${LAYOUT} city (G gate, H town hall, T gun, E EMP, Q citadel, P/W/D spawners, m mine, s/f/v traps, # ^ barriers, = road, b other):\n` + setup.map.join('\n'));
    let res;
    for (;;) {
      res = await page.evaluate((n) => window.__raidbot.run(n), FPS * 20);
      if (res.done) break;
    }
    res.run = job.run;
    results.push(res);
    if (JSON_OUT) console.log(JSON.stringify(res));
    else {
      console.log(fmtLine(res));
      if (DETAIL) {
        if (res.empPos.length) console.log(`        EMPs ${res.empPos.join(' ')} down at ${res.empDown.join(', ') || 'never'}`);
        console.log(`        busts ${JSON.stringify(res.busts)}  damage ${JSON.stringify(res.dmg)}  time ${JSON.stringify(res.time)}  cards ${JSON.stringify(res.cards)}`);
        if (res.trace) console.log(res.trace.join('\n'));
        res.lives.forEach((l, i) => console.log(`        life ${i + 1}: ${l.how}${l.by ? ' by ' + l.by + ' [' + l.bustState + ']' : ''} after ${l.t}s at ${l.pct}% (cloaked ${l.cloaked}s, air ${l.air}s, jammed ${l.silenced}s${l.wasSilenced ? ', in an EMP field' : ''}) dmg ${JSON.stringify(l.dmg)}`));
      }
    }
  }
  await Promise.race([ctx.close(), new Promise(r => setTimeout(r, 5000))]);
}
await Promise.all(Array.from({ length: Math.min(JOBS, jobs.length) }, (_, i) => worker(i)));
await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]);

// ---------------------------------------------------------------- summary
if (!JSON_OUT) {
  console.log('\nTH  won  lives used (won raids)  % destroyed  seconds');
  for (const th of THS) {
    const rs = results.filter(r => r.th === th);
    const won = rs.filter(r => r.won);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
    console.log(`${String(th).padStart(2)}  ${won.length}/${rs.length}  ${won.length ? avg(won.map(r => r.livesUsed)).toFixed(1).padStart(4) : '   -'}                  ${avg(rs.map(r => r.pct)).toFixed(0).padStart(3)}%        ${avg(rs.map(r => r.seconds)).toFixed(0).padStart(4)}`);
  }
}
if (errors.length) { console.log('page errors:', errors.slice(0, 5)); process.exitCode = 1; }
process.exit(process.exitCode || 0);
