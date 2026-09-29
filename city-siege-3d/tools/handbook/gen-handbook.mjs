/**
 * gen-handbook.mjs - builds the player/designer handbook straight from the game's rules.
 *   node tools/handbook/gen-handbook.mjs [out.html]
 * Every number comes from src/data/progression.js (and the garage tables), so the
 * handbook cannot drift from the game: regenerate it after any balance change.
 */
import fs from 'fs';
const P = await import('../../src/data/progression.js');
const G = await import('../../src/builder/GarageManager.js');

const OUT = process.argv[2] || new URL('./handbook.html', import.meta.url).pathname;
const D = P.BUILDING_DEFS, TYPES = P.BUILDING_TYPES, LV = [...Array(12)].map((_, i) => i + 1);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = v => Math.round(Number(v)).toLocaleString('en-US');
const pct = v => `${+(v * 100).toFixed(1)}%`;
const fmt = P.formatDuration;
const cost = c => `<span class="res">💰${n(c.cash)}</span> <span class="res">⚙️${n(c.iron)}</span> <span class="res">🪵${n(c.wood)}</span>`;
const ROLE = { core: 'Core', gate: 'Gate', turret: 'Turret', trap: 'Trap', spawner: 'Spawner', producer: 'Producer',
  storage: 'Storage', aura: 'Aura', barrier: 'Barrier', research: 'Research', scenery: 'Scenery' };
const RES = { cash: 'cash', iron: 'iron', wood: 'wood', all: 'cash, iron and wood' };
const R = P.RAIDER_BASE;

function mechanics(t) {
  const d = D[t], out = [];
  if (d.turret) {
    const a = P.turretStatsFor(t, 1), z = P.turretStatsFor(t, 12);
    out.push(`Shoots the buggy: range <b>${a.range.toFixed(0)}m → ${z.range.toFixed(1)}m</b>, damage <b>${a.damage} → ${z.damage}</b>, a shot every <b>${a.fireInterval.toFixed(2)}s → ${z.fireInterval.toFixed(2)}s</b> (L1 → L12).`);
    if (d.turret.homing) out.push('Homing rounds steer toward the buggy mid-flight.');
    if (d.turret.minRange) out.push(`Blind inside <b>${d.turret.minRange}m</b>.`);
    if (d.turret.splashRadius) out.push(`Shells splash for <b>${d.turret.splashRadius}m</b>; damage falls to ${pct(P.SPLASH_FALLOFF_FLOOR)} at the edge.`);
  }
  if (d.trap) {
    const a = P.trapStatsFor(t, 1), z = P.trapStatsFor(t, 12);
    const verb = { damage: 'Explodes', launch: 'Launches the buggy into the air', freeze: 'Freezes the drivetrain', pull: 'Leashes the buggy and drags it to the centre' }[a.kind];
    let s = `${verb} when the buggy drives within <b>${a.radius.toFixed(1)}m → ${z.radius.toFixed(1)}m</b>`;
    if (a.damage) s += `, <b>${n(a.damage)} → ${n(z.damage)}</b> damage`;
    if (a.kind === 'freeze') s += `, speed cut to <b>${pct(a.slowFactor)}</b> for <b>${a.slowSeconds.toFixed(1)}s → ${z.slowSeconds.toFixed(1)}s</b>`;
    if (a.stunSeconds) s += `, no control for <b>${a.stunSeconds.toFixed(1)}s → ${z.stunSeconds.toFixed(1)}s</b>`;
    if (a.holdSeconds) s += `, held <b>${a.holdSeconds.toFixed(1)}s → ${z.holdSeconds.toFixed(1)}s</b>`;
    s += a.oneShot ? '. <b>Fires once per raid.</b>' : `. Re-arms ${a.rearmSeconds.toFixed(1)}s after firing.`;
    if (d.hidden) s += ' Hidden from the raider until it goes off.';
    out.push(s + ' Drive-over: never blocks the road, rounds fly over it, and it never counts toward 100%.');
  }
  if (d.barrier) out.push(`Solid wall. Each ram chips it and costs the buggy <b>${d.barrier.ramDamageToVehicle} HP</b>. Barrier health grows only ${pct(P.BARRIER_HP_PER_LEVEL)} per level (other buildings: ${pct(P.HP_PER_LEVEL)}).`);
  if (d.spawn) {
    const a = P.pursuitUnitFor(t, 1), z = P.pursuitUnitFor(t, 12);
    const rule = a.flying ? `flies, strafes for ${a.strafeDamage} every ${a.strafeInterval}s and <b>hits the buggy in the air</b>` : 'touching the buggy is an instant <b>bust</b>';
    out.push(`Sends <b>${P.spawnerUnitsFor(t)} × ${a.kind}</b> per raid: <b>${n(a.hp)} → ${n(z.hp)} HP</b>, ${a.speedMin.toFixed(1)}–${a.speedMax.toFixed(1)} → ${z.speedMin.toFixed(1)}–${z.speedMax.toFixed(1)} m/s; ${rule}. Wrecked units come back while any spawner stands, up to the Town Hall's police cap.`);
  }
  if (d.produce) {
    const pr = d.produce;
    const hours = P.produceCapacityFor(t, 1) / P.produceRateFor(t, 1) / 3600;
    let s = `Makes <b>${RES[pr.type] || pr.type}</b>: ${P.produceRateFor(t, 1).toFixed(1)}/s → ${P.produceRateFor(t, 12).toFixed(1)}/s, holds ${n(P.produceCapacityFor(t, 1))} → ${n(P.produceCapacityFor(t, 12))} (about ${hours.toFixed(1)} hours of output). Keeps producing while the game is closed.`;
    s += pr.raidOnly ? ' <b>Cannot be tapped</b>: its contents are only paid out when a raid destroys it.' : ' Tap it to collect.';
    out.push(s);
  }
  if (d.blast) {
    const a = P.blastFor(t, 1), z = P.blastFor(t, 12);
    out.push(`Explodes when destroyed: <b>${n(a.damage)} → ${n(z.damage)}</b> damage in <b>${a.radius.toFixed(0)}m → ${z.radius.toFixed(1)}m</b>, falling to ${pct(P.BLAST_FALLOFF_FLOOR)} at the edge. Hits the buggy, pursuit units and your own buildings, and can set off other explosives.`);
  }
  if (d.aura) {
    const a = d.aura, b1 = P.auraBonusFor(t, 1), b12 = P.auraBonusFor(t, 12);
    const r = a.radiusPerLevel ? `${P.auraRadiusFor(t, 1)}m → ${P.auraRadiusFor(t, 12)}m` : `${a.radius}m`;
    const txt = {
      fireRate: `Turrets within ${r} fire faster: <b>+${pct(b1)} → +${pct(b12)}</b>.`,
      damage: `Turrets within ${r} hit harder: <b>+${pct(b1)} → +${pct(b12)}</b> (all damage buffs together cap at +${pct(P.AURA_DAMAGE_CAP)}).`,
      targeting: `<b>Every turret in the city</b> gets <b>+${pct(b1)} → +${pct(b12)}</b> range and damage while this stands.`,
      silence: `Jams the buggy's ability cards within <b>${r}</b>, and switches off any cloak or nitro already running. The plain hop still works.`,
      shield: `Buildings within ${r} take <b>${pct(b1)} → ${pct(b12)}</b> less damage (capped at ${pct(P.SHIELD_AURA_CAP)}). It does not shield itself.`
    }[a.kind];
    out.push(txt + (a.stacks ? '' : ' Several of these do not stack; the strongest one counts.'));
  }
  if (d.research) {
    const r = d.research;
    if (r.grants === 'garageTier') out.push(`Lab level L opens buggy tuning level L+1, adds shield every level (<b>+${n(P.labShieldFor(1))}</b> at Lab 1, <b>${n(P.labShieldFor(12))}</b> total at Lab 12), and Labs ${r.slotsAt.join(' and ')} add ability-card deck slots. Card levels 2 and 3 need Lab 1 and 2.`);
    if (r.grants === 'ordnance') out.push(`Per level: <b>+${pct(r.damagePerLevel)}</b> Drop Bomb and Twin Missile damage, <b>+${pct(r.radiusPerLevel)}</b> bomb blast radius, <b>+${pct(r.cannonPerLevel)}</b> autocannon damage.`);
    if (r.grants === 'cardTier') out.push(`Tech Lab 1 opens card level 4, Tech Lab 2 opens level 5, and every Tech Lab level cuts card cooldowns by <b>${pct(r.cooldownCutPerLevel)}</b>.`);
  }
  if (d.storage && d.storage.kind === 'buildings') out.push(`Holds <b>${d.storage.slotsPerLevel} stowed buildings per depot level</b> (depots add up). Stowed buildings keep their level.`);
  if (d.unique) out.push('Only the best one counts.');
  if (d.tall) out.push('Tall enough to block sightlines across the city.');
  if (d.lootMultiplier === 0) out.push('Pays no loot when destroyed.');
  return out;
}

const hpRow = t => LV.map(L => P.hpForLevel(t, L));
const limRow = t => LV.map(th => P.limitFor(t, th));
const byTH = {}; TYPES.forEach(t => (byTH[D[t].unlockTH] = byTH[D[t].unlockTH] || []).push(t));

const ladder = P.TOWN_HALLS.map(r => {
  const u = P.unlocksAt(r.level);
  return `<tr><td class="num">${r.level}</td><td><b>${esc(r.name)}</b><div class="dim small">${esc(r.theme)}</div></td>
  <td>${u.newBuildings.map(t => `<span class="chip">${D[t].icon} ${esc(D[t].name)}</span>`).join(' ')}</td>
  <td class="num">${u.raisedLimits.length || '—'}</td><td class="num">${r.builders}</td><td class="num">${r.cityRadius}</td>
  <td class="num">${r.policeCap}</td><td class="num">${r.raidGems}</td><td class="num">${n(P.hpForLevel('town_hall', r.level))}</td>
  <td class="nowrap">${r.level === 1 ? '<span class="dim">start</span>' : cost(P.costForLevel('town_hall', r.level)) + `<div class="dim small">${fmt(P.buildSecondsFor('town_hall', r.level))}</div>`}</td></tr>`;
}).join('');

const card = t => {
  const d = D[t], hp = hpRow(t), lim = limRow(t), max = Math.max(...hp.filter(Boolean), 1), mech = mechanics(t);
  return `<article class="bcard" id="b-${t}">
  <header><div class="bicon" aria-hidden="true">${d.icon}</div><div><h3>${esc(d.name)}</h3><div class="dim small">${esc(d.desc)}</div></div>
  <div class="tags"><span class="role r-${d.role}">${ROLE[d.role]}</span><span class="th">TH ${d.unlockTH}</span></div></header>
  <p class="helps"><span class="lbl">What it does for you</span>${esc(d.helps)}</p>
  ${mech.length ? `<ul class="mech">${mech.map(m => `<li>${m}</li>`).join('')}</ul>` : ''}
  <dl class="facts"><div><dt>Shop price</dt><dd>${cost(d.cost)}${d.packCount ? ` <span class="dim">for ${d.packCount}</span>` : ''}</dd></div>
  <div><dt>Footprint</dt><dd>${d.footprint}×${d.footprint} tiles</dd></div>
  <div><dt>Build / upgrade time</dt><dd>L1 ${fmt(P.buildSecondsFor(t, 1))} · L6 ${fmt(P.buildSecondsFor(t, 6))} · L12 ${fmt(P.buildSecondsFor(t, 12))}</dd></div>
  <div><dt>Cost of level 12</dt><dd>${d.upgradeable === false ? '<span class="dim">not upgradeable</span>' : cost(P.costForLevel(t, 12))}</dd></div></dl>
  <div class="strip-wrap"><table class="strip"><thead><tr><th scope="row">Level</th>${LV.map(L => `<th>${L}</th>`).join('')}</tr></thead><tbody>
  ${d.maxHp !== null ? `<tr><th scope="row">HP</th>${hp.map(v => `<td><span class="bar" style="--h:${Math.round(v / max * 100)}%"></span><span class="v">${n(v)}</span></td>`).join('')}</tr>` : ''}
  <tr><th scope="row">Max at TH</th>${lim.map(v => `<td class="${v ? '' : 'off'}">${v || '—'}</td>`).join('')}</tr></tbody></table></div>
  </article>`;
};

const buildings = Object.keys(byTH).sort((a, b) => a - b).map(th => {
  const r = P.townHallRow(Number(th));
  return `<section class="thgroup" id="th-${th}"><h3 class="thhead"><span class="thnum">TH ${th}</span> ${esc(r.name)} <span class="dim">· ${byTH[th].length} new</span></h3><div class="cards">${byTH[th].map(card).join('')}</div></section>`;
}).join('');

const hpMatrix = TYPES.filter(t => D[t].maxHp !== null).map(t => `<tr><th scope="row">${D[t].icon} ${esc(D[t].name)}</th>${hpRow(t).map(v => `<td>${n(v)}</td>`).join('')}</tr>`).join('');
const limMatrix = TYPES.map(t => `<tr><th scope="row">${D[t].icon} ${esc(D[t].name)}</th>${limRow(t).map(v => `<td class="${v ? '' : 'off'}">${v || '—'}</td>`).join('')}</tr>`).join('');

const TL = [0, 3, 6, 9, 12];
const tracks = G.TRACKS.map(tr => `<tr><th scope="row">${tr.icon} ${esc(tr.name)}</th>${TL.map(L => `<td>${esc(tr.fmt(tr.value(L)))}</td>`).join('')}<td class="nowrap">${cost(P.trackCostFor(tr.id, 0))}</td><td class="nowrap">${cost(P.trackCostFor(tr.id, 11))}</td></tr>`).join('');
const cards = G.CARD_ORDER.map(id => {
  const tiers = G.CARD_TIERS[id], meta = G.CARD_META[id], def = G.CARD_DEFS[id];
  const cell = x => Object.entries(x).map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()} ${v}`).join(', ');
  return `<tr><th scope="row">${meta.icon} ${esc(meta.name)}<div class="dim small">${def.startUnlocked ? 'free from the start' : `unlock ${n(def.unlockCost.cash)} cash${def.unlockLab ? `, Vehicle Lab ${def.unlockLab}` : ''}`}</div></th>${tiers.map(x => `<td>${esc(cell(x))}</td>`).join('')}</tr>`;
}).join('');
const gates = [2, 3, 4, 5].map(L => { const g = P.cardLevelGate(L); return `L${L}: ${g.lab ? `Vehicle Lab ${g.lab}` : '—'}${g.tech ? ` + Tech Lab ${g.tech}` : ''}`; }).join(' · ');

const knobs = [
  ['HP_PER_LEVEL', P.HP_PER_LEVEL, 'Share of base HP each level adds (barriers use BARRIER_HP_PER_LEVEL = ' + P.BARRIER_HP_PER_LEVEL + ').'],
  ['COST_PER_LEVEL', P.COST_PER_LEVEL, `Upgrade cost multiplier per level. Level 12 costs ${n(Math.pow(P.COST_PER_LEVEL, 11))}× the shop price.`],
  ['buildBase (each building)', '5–60 s', 'Level-1 build time; doubles every level.'],
  ['MAX_BUILD_SECONDS', `${P.MAX_BUILD_SECONDS} (${fmt(P.MAX_BUILD_SECONDS)})`, 'Longest a single job can take.'],
  ['PRODUCE_PER_LEVEL / CAPACITY_PER_LEVEL', `${P.PRODUCE_PER_LEVEL} / ${P.CAPACITY_PER_LEVEL}`, 'Producer rate and storage growth per level.'],
  ['TURRET_RANGE / DAMAGE / RATE_PER_LEVEL', `${P.TURRET_RANGE_PER_LEVEL} / ${P.TURRET_DAMAGE_PER_LEVEL} / ${P.TURRET_RATE_PER_LEVEL}`, 'Turret growth per level (a turret may override its damage growth).'],
  ['TURRET_RATE_FLOOR', P.TURRET_RATE_FLOOR, 'Fire interval never drops below this share of base.'],
  ['AURA_DAMAGE_CAP / SHIELD_AURA_CAP', `${P.AURA_DAMAGE_CAP} / ${P.SHIELD_AURA_CAP}`, 'Ceilings on aura damage buffs and the Citadel shield.'],
  ['TRAP_DAMAGE / RADIUS / DURATION_PER_LEVEL', `${P.TRAP_DAMAGE_PER_LEVEL} / ${P.TRAP_RADIUS_PER_LEVEL} / ${P.TRAP_DURATION_PER_LEVEL}`, 'Trap growth per level.'],
  ['BLAST_DAMAGE / RADIUS_PER_LEVEL', `${P.BLAST_DAMAGE_PER_LEVEL} / ${P.BLAST_RADIUS_PER_LEVEL}`, 'Explosive building growth per level.'],
  ['BUILD_LIMITS', '36 × 12 table', 'How many of each building each Town Hall allows.'],
  ['TOWN_HALLS', '12 rows', 'Labour cap, build radius, police cap, gem bounty and the size/defense a raid needs to pay it.'],
  ['PURSUIT_UNITS', 'cruiser / swat / drone', 'HP, speed and contact rule of every pursuit unit.'],
  ['GARAGE_TRACKS / TRACK_COST_GROWTH', `per-track steps / ${P.TRACK_COST_GROWTH}`, 'How much each tuning level adds and how fast its price grows.'],
  ['RAIDER_BASE', `${R.maxHp} HP, ${R.maxShield} shield, ${n(R.maxForwardSpeed * 2.237)} mph`, 'The stock buggy, hop cooldown, contact-immunity window (rams and blasts only), cannon damage.'],
  ['LOOT_PER_LEVEL', `${P.LOOT_PER_LEVEL.cash}/${P.LOOT_PER_LEVEL.iron}/${P.LOOT_PER_LEVEL.wood}`, 'Loot per destroyed building per level (explosives pay ' + P.EXPLOSIVE_LOOT_CASH + ' cash).'],
  ['gemsToFinish()', `1 → ${P.gemsToFinish(3600)} → ${P.gemsToFinish(86400)}`, 'Instant-finish price: under a minute, one hour, one day.'],
].map(k => `<tr><th scope="row"><code>${esc(k[0])}</code></th><td class="nowrap">${esc(k[1])}</td><td>${esc(k[2])}</td></tr>`).join('');

const lowTH = P.TOWN_HALLS[0], highTH = P.TOWN_HALLS[11];
/** Gems a full Town Hall 12 city pays with every building of `stowed` types lifted off it. */
const stowedGems = (stowed) => {
  const city = P.raidThreatKindsAt(12).filter(t => !stowed.includes(t)).flatMap(t => Array.from({ length: P.limitFor(t, 12) }, () => ({ type: t, level: 12 })));
  return P.raidGemsFor(12, P.countedLimitFor(12), P.raidDefenseScoreFor(city, 12));
};
const vars = {
  DATE: process.env.GEN_DATE || new Date().toISOString().slice(0, 10),
  LADDER: ladder, BUILDINGS: buildings, HPMATRIX: hpMatrix, LIMMATRIX: limMatrix, TRACKS: tracks, CARDS: cards, KNOBS: knobs,
  TOC: Object.keys(byTH).sort((a, b) => a - b).map(th => `<a href="#th-${th}">${th}</a>`).join(''),
  HP_PCT: pct(P.HP_PER_LEVEL), BARRIER_PCT: pct(P.BARRIER_HP_PER_LEVEL), COSTX: P.COST_PER_LEVEL,
  OBELISK: `${n(P.hpForLevel('laser_obelisk', 1))} at L1 → ${n(P.hpForLevel('laser_obelisk', 2))} at L2 → ${n(P.hpForLevel('laser_obelisk', 12))} at L12`,
  THCOST: `${n(P.costForLevel('town_hall', 1).cash)} cash → ${n(P.costForLevel('town_hall', 2).cash)} at L2 → ${n(P.costForLevel('town_hall', 12).cash)} at L12`,
  THTIME: `${fmt(P.buildSecondsFor('town_hall', 1))}, ${fmt(P.buildSecondsFor('town_hall', 2))}, ${fmt(P.buildSecondsFor('town_hall', 3))} … ${fmt(P.buildSecondsFor('town_hall', 12))} at L12`,
  MAXT: fmt(P.MAX_BUILD_SECONDS), G1H: P.gemsToFinish(3600), G24H: P.gemsToFinish(86400), GMAX: P.gemsToFinish(P.MAX_BUILD_SECONDS),
  START_GEMS: P.STARTING_GEMS, GEM_LOW: lowTH.raidGems, GEM_HIGH: highTH.raidGems,
  PROD_PCT: pct(P.PRODUCE_PER_LEVEL), CAP_PCT: pct(P.CAPACITY_PER_LEVEL),
  T_RANGE: pct(P.TURRET_RANGE_PER_LEVEL), T_DMG: pct(P.TURRET_DAMAGE_PER_LEVEL), T_RATE: pct(P.TURRET_RATE_PER_LEVEL), T_FLOOR: pct(P.TURRET_RATE_FLOOR),
  RB1: P.limitFor('roadblock', 1), RB12: P.limitFor('roadblock', 12),
  LAB: P.TOWN_HALLS.map(r => r.builders).join(' · '), R1: lowTH.cityRadius, R12: highTH.cityRadius,
  BUGGY: `${R.maxHp} HP + ${R.maxShield} shield, ${n(R.maxForwardSpeed * 2.237)} mph`,
  GATE: `${P.GATE_TURRET.range}m range, ${P.GATE_TURRET.damage} damage every ${P.GATE_TURRET.fireInterval}s`,
  HOP: R.hop.cooldown, IMM: R.contactImmunity, LIVES: 3,
  HOPAIR: pct(R.hop.maxAirShare), CANNON: R.cannonDamage, CANNONU: R.cannonVsUnits,
  CANNON12: Math.round(R.cannonDamage * P.ordnanceFor(12).cannonMult),
  ONROAD: pct(1 - D.road.surface.offRoadSpeedMult), ONROADA: pct(1 - D.road.surface.offRoadAccelMult),
  MINEWIN: P.MINE_STACK_WINDOW, CHAINLOOT: pct(P.CHAIN_LOOT_SHARE),
  KILL_MIN: P.KILL_BAND.min, KILL_MAX: P.KILL_BAND.max,
  LOOT: `cash = ${P.LOOT_PER_LEVEL.cash} × level (${P.EXPLOSIVE_LOOT_CASH} × level if it explodes), iron = ${P.LOOT_PER_LEVEL.iron} × level, wood = ${P.LOOT_PER_LEVEL.wood} × level`,
  MINT1: lowTH.raidMinTargets, KINDS1: P.raidThreatKindsAt(1).length, MINT12: highTH.raidMinTargets, KINDS12: P.raidThreatKindsAt(12).length,
  KINDSHARE: pct(P.RAID_KIND_SHARE), COVERSHARE: pct(P.RAID_COVER_SHARE), COVERPREMIUM: pct(1 - P.RAID_COVER_SHARE),
  GEMS12ONE: stowedGems(['emp_disrupter']), GEMS12AURA: stowedGems(['emp_disrupter', 'orbital_relay', 'quantum_citadel']),
  GEMS12TRAPS: stowedGems(['emp_disrupter', 'orbital_relay', 'quantum_citadel', ...TYPES.filter(t => D[t].role === P.ROLE.TRAP)]),
  GATES: gates, TRACKX: P.TRACK_COST_GROWTH, SLOTS: [0, 1, 2, 3].map(l => P.deckSlotsFor(l)).join(' / '),
};
let html = fs.readFileSync(new URL('./template.html', import.meta.url), 'utf8');
html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const left = html.match(/\{\{\w+\}\}/g);
if (left) { console.error('unfilled placeholders:', [...new Set(left)].join(' ')); process.exit(1); }
fs.writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB, ${TYPES.length} buildings)`);
