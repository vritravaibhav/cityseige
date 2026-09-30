import { battlePhase, toMillis, respondDeadline, fightWindowSeconds, BATTLE } from '../../src/shared/battleRules.js';
import { MAIN_GATES, reachText } from '../../src/shared/cityRules.js';
import { BUILDING_DEFS, cityRadiusFor, limitFor, unlockTownHallFor, MAX_TOWN_HALL_LEVEL, TILE_METRES } from '../../src/data/progression.js';
import { LIMITS } from './rateLimit.js';

/**
 * Text an LLM reads. Every tool answers in plain prose with explicit numbers and coordinates
 * (and the same facts as structuredContent), because the model acts on what it reads here.
 */

/** "4m 12s", "2h 5m", "35s". */
export function fmtDur(sec) {
  const n = Math.max(0, Math.round(Number(sec) || 0));
  if (n < 60) return n + 's';
  const m = Math.floor(n / 60);
  if (m < 60) return m + 'm ' + (n % 60) + 's';
  const h = Math.floor(m / 60);
  if (h < 48) return h + 'h ' + (m % 60) + 'm';
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
}

export function iso(ms) {
  return Number.isFinite(ms) ? new Date(ms).toISOString().replace('.000Z', 'Z') : null;
}

const nameOf = (type) => (BUILDING_DEFS[type] && BUILDING_DEFS[type].name) || type;

function resultView(r) {
  if (!r || typeof r !== 'object') return null;
  return {
    stars: Number(r.stars) || 0,
    percentage: Number(r.percentage) || 0,
    durationSec: Number.isFinite(Number(r.durationSec)) ? Number(r.durationSec) : null,
    outcome: r.outcome || null
  };
}

/** A battle document as the player `uid` sees it at `nowMs` (plain data, for structuredContent). */
export function battleView(b, uid, nowMs) {
  const players = Array.isArray(b.players) ? b.players : [b.challenger, b.opponent];
  const opp = players.find(p => p !== uid) || null;
  const names = b.names || {};
  const townHalls = b.townHalls || {};
  const snaps = b.snapshots || {};
  const results = b.results || {};
  const phase = battlePhase(b, nowMs);
  const startAt = toMillis(b.startAt);
  let fightEndsAt = toMillis(b.fightEndsAt);
  if (fightEndsAt === null && startAt !== null) fightEndsAt = startAt + fightWindowSeconds(b.mode) * 1000;
  const respondBy = respondDeadline(b);
  const secsTo = (ms) => (ms === null ? null : Math.max(0, Math.round((ms - nowMs) / 1000)));
  // 'void': nobody raided (battleRules.decideWinner) - no winner, no trophies.
  const winner = b.winner ? (b.winner === 'draw' || b.winner === 'void' ? b.winner : b.winner === uid ? 'you' : 'opponent') : null;
  return {
    id: b.id,
    mode: b.mode || 'instant',
    theme: b.theme || 'day',
    status: b.status || null,
    phase,
    youAre: b.challenger === uid ? 'challenger' : 'opponent',
    opponent: { uid: opp, name: (opp && names[opp]) || 'Unknown player', townHall: (opp && townHalls[opp]) || null },
    message: typeof b.message === 'string' ? b.message : '',
    designSeconds: Number.isFinite(Number(b.designSeconds)) ? Number(b.designSeconds) : null,
    respondBy: phase === 'pending' ? iso(respondBy) : null,
    respondInSec: phase === 'pending' ? secsTo(respondBy) : null,
    startAt: iso(startAt),
    fightEndsAt: iso(fightEndsAt),
    locksInSec: phase === 'design' || phase === 'pending' ? secsTo(startAt) : null,
    fightEndsInSec: phase === 'fight' ? secsTo(fightEndsAt) : null,
    yourCityLocked: !!snaps[uid],
    yourLockedRev: snaps[uid] && Number.isInteger(snaps[uid].rev) ? snaps[uid].rev : null,
    opponentCityLocked: !!(opp && snaps[opp]),
    yourResult: resultView(results[uid]),
    opponentResult: resultView(opp && results[opp]),
    winner
  };
}

const stars = (r) => (r ? `${r.stars}/3 stars, ${Math.round(r.percentage)}% destroyed` : 'no result');

/** One readable line per battle. */
export function battleLine(v) {
  const who = v.opponent.name;
  const head = `vs ${who}${v.opponent.townHall ? ` (TH${v.opponent.townHall})` : ''} - ${v.mode}${v.theme === 'night' ? ', night' : ''} [${v.id}]: `;
  switch (v.phase) {
    case 'pending': {
      const wait = v.respondInSec === null ? '' : ` (expires in ${fmtDur(v.respondInSec)})`;
      const next = v.mode === 'scheduled' && v.startAt
        ? ` If accepted it starts at ${v.startAt}.`
        : v.designSeconds !== null ? ` Once accepted, both players get ${fmtDur(v.designSeconds)} to design before the cities lock.` : '';
      return head + (v.youAre === 'challenger'
        ? `PENDING - waiting for ${who} to accept${wait}.`
        : `PENDING - ${who} challenged the player; accept or decline in the game's BATTLES screen${wait}.`) + next;
    }
    case 'design':
      return head + `DESIGN phase - the city locks in ${fmtDur(v.locksInSec)} (at ${v.startAt}). Every edit made before then is ` +
        `part of what ${who} will raid.`;
    case 'fight':
      return head + `FIGHT phase - ends in ${fmtDur(v.fightEndsInSec)} (at ${v.fightEndsAt}). ` +
        (v.yourCityLocked
          ? `The city is locked for this battle (rev ${v.yourLockedRev}); edits now only change the live city and future battles. `
          : 'The city locks for this battle as it is right now, on the next edit or raid; later edits only change the live city. ') +
        (v.yourResult ? `Player's raid: ${stars(v.yourResult)}.` : 'The player has not raided yet (attack from the game\'s BATTLES screen).') +
        (v.opponentResult ? ` ${who}'s raid: ${stars(v.opponentResult)}.` : '');
    case 'resolving':
      return head + `FIGHT OVER - waiting for the result to be recorded. Player: ${stars(v.yourResult)}; ${who}: ${stars(v.opponentResult)}.`;
    case 'finished':
      if (v.winner === 'void') return head + 'FINISHED - void: nobody attacked, no trophies either way.';
      return head + `FINISHED - ${v.winner === 'you' ? 'the player won' : v.winner === 'draw' ? 'a draw' : `${who} won`} ` +
        `(player: ${stars(v.yourResult)}; ${who}: ${stars(v.opponentResult)}).`;
    default:
      return head + v.phase.toUpperCase() + '.';
  }
}

export const ACTIVE_PHASES = ['pending', 'design', 'fight', 'resolving'];

/** "landmine x2, cash_mint x1 (from storage: level 3)" - what place_building can take now. */
export function inventoryText(summary) {
  const items = [];
  for (const [type, n] of Object.entries(summary.inventory || {})) {
    if (!(n > 0) || type === 'road') continue;
    const stowed = (summary.stowed.counts || {})[type] || 0;
    const levels = (summary.stowed.levels || {})[type] || [];
    const lim = (summary.limits || {})[type];
    let s = `${type} x${n}`;
    if (stowed) s += ` (${stowed} from storage${levels.length ? ', levels ' + levels.join('/') : ''})`;
    if (lim && lim.limit <= 0) s += ' [locked at this Town Hall]';
    else if (lim && lim.placed >= lim.limit) s += ` [at limit ${lim.placed}/${lim.limit}]`;
    items.push(s);
  }
  return items.length ? items.join(', ') : 'nothing (buying is manual, in the game\'s Shop)';
}

/** The short "state after the change" line mutation results end with. */
export function afterText(summary, { dryRun = false } = {}) {
  return `${dryRun ? 'Would leave' : 'Now'}: inventory ${inventoryText(summary)}; roads ${summary.roads.placed}/${summary.roads.limit} placed, ` +
    `${summary.roads.inInventory} tiles left; storage ${summary.storage.used}/${summary.storage.capacity} slots.`;
}

/** What a write did to the player's battles (the lock-before-edit). */
export function lockText(locked, { dryRun = false, fromRev } = {}) {
  if (!locked || !locked.length) return '';
  const names = locked.map(l => l.opponentName).join(', ');
  return dryRun
    ? `Saving this would first lock the city as it is now for the battle(s) already under way (vs ${names}); ` +
      'the change would only affect the live city and future battles.'
    : `Locked first: the battle(s) vs ${names} had already started, so the city as it was at rev ${fromRev} (before this ` +
      'change) is what gets raided there. This change only affects the live city and future battles.';
}

const GATES = MAIN_GATES.map(g => `${g.name.replace(' Gate', '')} (${g.gx},${g.gz})`).join(', ');

/** The placement rules in prose (get_rules). Numbers come from progression.js, never typed in. */
export function rulesText() {
  const ths = Array.from({ length: MAX_TOWN_HALL_LEVEL }, (_, i) => i + 1);
  const radius = ths.map(th => `TH${th} ${cityRadiusFor(th)}`).join(', ');
  const roads = ths.map(th => `TH${th} ${limitFor('road', th)}`).join(', ');
  const fp = (n) => Object.keys(BUILDING_DEFS).filter(t => Math.max(1, BUILDING_DEFS[t].footprint || 1) === n && t !== 'road');
  const reachOfRole = (role) => Object.keys(BUILDING_DEFS).filter(t => BUILDING_DEFS[t].role === role && reachText(t, 1))
    .map(t => `${t} ${reachText(t, 1).replace(/^(range|trigger radius|aura) /, '')} (TH${unlockTownHallFor(t)})`).join(', ');
  return [
    'CITY SIEGE - DESIGN RULES FOR THE AI DESIGNER',
    '',
    'GRID',
    '- Integer tiles. gx grows to the east, gz grows to the south, (0,0) is the city centre; north (gz -15) is "up" on the map.',
    `- The perimeter wall is 15 tiles out. Three fixed Main Gates (3x3, never moved, stowed or placed): ${GATES}. There is no west gate.`,
    '- Raiders drive in through one of the gates and race along the roads (driving off-road is slow) to destroy buildings. Raid stars: 25% / 60% / 95% destroyed.',
    '',
    'BUILDABLE AREA',
    `- A building's own tile, and every road tile, must satisfy hypot(gx, gz) <= the Town Hall's build radius: ${radius}.`,
    '- Only the building\'s own (centre) tile is tested. Pieces already outside the radius (e.g. starter trees) are legal and are left alone.',
    '',
    'FOOTPRINTS AND SPACING',
    `- Structures are squares centred on their tile: 1x1: ${fp(1).join(', ')}; 3x3: ${fp(3).join(', ')}; 2x2: every other type.`,
    '- Two structures clash when |dx| < (sizeA + sizeB) / 2 AND |dz| < (sizeA + sizeB) / 2. So two 2x2 buildings need their tiles at least 2 apart on one axis; a 1x1 next to a 2x2 needs 2 on one axis; 1x1 pieces may sit side by side.',
    '- Trees never block anything (but a tree cannot go on a structure). Roads and buildings never block each other: traps, spike traps and roadblocks belong ON road tiles; ordinary buildings are better kept off roads so traffic flows.',
    '- On the map (get_city) "." is a tile where a 1x1 fits right now; letters are buildings (UPPERCASE on the tile a building stands on). A letter hides a road under it: get_city lists every ROAD TILE, and list_buildings says whether each trap / barrier is on a road.',
    '',
    `REACH (level 1, in tiles; 1 tile = ${TILE_METRES} m; distance is measured between tile centres)`,
    `- Turrets (range grows 12% per level; an Orbital Relay adds more): ${reachOfRole('turret')}. A turret covers a spot when the spot is within its range.`,
    `- Drive-over traps fire when the raider's centre comes within the trigger radius (it grows 3% per level): ${reachOfRole('trap')}. So a trap must sit ON a road tile raiders drive (or, with a radius of 1 tile or more, right next to one).`,
    '- Spike traps and roadblocks are solid 1x1 barriers: they block only their own tile, so they belong ON road tiles (chained, they wall a route off).',
    `- Auras: ${reachOfRole('aura')}.`,
    '- list_buildings gives every building\'s reach at its own level; validate_design\'s COVERAGE lists which turrets reach each Main Gate and the Town Hall.',
    '',
    'OPS (tools, or ops inside apply_design)',
    '- place {type, gx, gz, rot?}: takes one unit from the Construction Inventory (bought manually in the game). The type must be unlocked at this Town Hall and under its limit (get_catalog shows both). Units waiting in Big Storage come out first and keep their level. rot is the facing in degrees: 0, 90, 180 or 270.',
    '- move {id, gx, gz, rot?}: any building except Main Gates and buildings being upgraded. The Town Hall may move. Same radius and spacing rules; the building ignores its own old spot. Spike traps and roadblocks turn to follow their wall links (rot ignored).',
    '- stow {id}: into Big Storage (keeps its level, back to the inventory). Needs a standing Big Storage depot with a free slot (a depot cannot hold itself). Not the Town Hall, gates, trees or a building being upgraded. A producer\'s output up to now is credited to the bank when the game next syncs; a Crypto Vault keeps its cash sealed inside.',
    '- remove_tree {id}: clears a tree for good (decoration, nothing refunded).',
    `- add_roads {tiles | path}: one road tile from the inventory per new tile, up to the Town Hall road limit: ${roads}. "path" = waypoints joined by straight or L-shaped runs (along gx first, then gz), inclusive. Tiles already paved are skipped.`,
    '- remove_roads {tiles | path}: erased tiles go back to the inventory; tiles with no road are skipped.',
    '- apply_design {ops[], dry_run?}: several ops as ONE change - all-or-nothing, one live update, one undo step. Ops run in order (stow something, then place into its space). dry_run: true checks everything and shows the resulting map without saving.',
    '- undo_last_change: reverts the latest AI change (call again to go further back). It never reverts what the player did in the game.',
    '- Every refused op changes nothing and says why (a reason code such as BLOCKED or OUTSIDE_RADIUS, the blocking building and its id, free tiles nearby).',
    '',
    'WHAT THE AI DESIGNER CANNOT DO (the player does these in the game)',
    '- Buy anything, upgrade, speed up, collect production, spend or earn cash/iron/wood/gems, touch the garage, accept or start battles, attack.',
    '',
    'BATTLES',
    '- A battle locks both cities at its start time (instant battles: after the agreed design window; scheduled: at the chosen time). Each player then raids the other\'s LOCKED city.',
    '- Edits made during the design phase are what the opponent will raid. Once a battle has started, the server first locks the city as it was before the edit, so later edits only change the live city and future battles.',
    `- Instant battles: design window of ${BATTLE.INSTANT_DESIGN_OPTIONS.map(s => s / 60 + ' min').join(' / ')}, fight window ${BATTLE.INSTANT_FIGHT_SECONDS / 60} min. Scheduled: fight window ${BATTLE.SCHEDULED_FIGHT_SECONDS / 60} min. Winner: more stars, then higher destruction %, then the faster raid.`,
    '',
    'LIMITS',
    `- Per access token: ${LIMITS.write} design changes and ${LIMITS.read} reads per minute. Batch edits with apply_design.`,
    '- Every change is saved as a new city version (rev); the player\'s open game applies it live within a second or two.'
  ].join('\n');
}
