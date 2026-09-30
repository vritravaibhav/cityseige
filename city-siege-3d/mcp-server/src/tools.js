import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  summarize, catalogFor, renderAsciiMap, auditLayout, defenseReport, describeBuildings,
  coverageReport, reachText, roadRuns, roadRunsText, roadNoteFor, roadStatusOf
} from '../../src/shared/cityRules.js';
import { BUILDING_DEFS } from '../../src/data/progression.js';
import { AuthError } from './auth.js';
import { UserError, modelAt } from './store.js';
import {
  fmtDur, iso, battleView, battleLine, ACTIVE_PHASES, inventoryText, afterText, lockText, rulesText
} from './format.js';

/**
 * The City Siege MCP surface (spec section 10): design tools only.
 *
 * Every tool call: token -> player (auth.js), per-token rate limit (rateLimit.js), then the
 * tool. Edits go through CityStore.applyDesign, i.e. cityRules + one Firestore transaction, so
 * an AI can never produce a layout the game itself would refuse. There is deliberately NO tool
 * for attacking, buying, upgrading, collecting, gems or the bank - the game keeps those manual.
 */

export const TOOL_NAMES = Object.freeze([
  'get_city', 'list_buildings', 'get_catalog', 'get_rules',
  'place_building', 'move_building', 'stow_building', 'remove_tree', 'add_roads', 'remove_roads',
  'apply_design', 'validate_design', 'get_battles', 'undo_last_change'
]);
export const PROMPT_NAMES = Object.freeze(['fortify_for_battle', 'tidy_city']);

// Appended to every tool description: the model must know the grid and where to start.
const GRID = ' Grid: integer tiles, gx grows east, gz grows south, (0,0) is the city centre and north (gz -15) is up; ' +
  'the fixed Main Gates are N (0,-15), E (15,0), S (0,15). Call get_city first to see the map, building ids and inventory.';

const SERVER_INSTRUCTIONS =
  'You are designing the player\'s City Siege city (a 3D city-defense game). You can only arrange what they already own: ' +
  'place buildings from their inventory, move or stow buildings, clear trees, draw and erase roads. Buying, upgrading, ' +
  'attacking and money stay manual in the game. Start with get_city (map, ids, inventory, battle deadlines); get_rules ' +
  'explains spacing and radius. Prefer one apply_design call (try dry_run first) over many single edits. Every saved ' +
  'change appears live in the player\'s open game, and undo_last_change reverts the AI\'s latest change.';

const coord = (axis) => z.number().int().describe(axis === 'gx'
  ? 'Tile column: gx grows to the east, 0 is the centre (buildable roughly -14..14, see the build radius).'
  : 'Tile row: gz grows to the south, 0 is the centre, -15 is the north wall.');
// Factories, not shared instances: a zod object reused inside one schema becomes a JSON-schema
// "$ref", which some MCP clients and models handle badly.
const rotArg = () => z.number().int().optional().describe('Facing in degrees: 0, 90, 180 or 270 (omit to keep / default 0).');
const buildingId = (what) => z.string().min(1).max(60).describe(`Id of the ${what} (from get_city or list_buildings), e.g. "bmumqoxbmookjzgrj".`);
const tilePair = () => z.tuple([z.number().int(), z.number().int()]).describe('[gx, gz]');
const tilesArg = () => z.array(tilePair()).min(1).max(1000).optional().describe('Exact tiles: [[gx,gz], ...].');
const pathArg = () => z.array(tilePair()).min(1).max(200).optional()
  .describe('Waypoints [[gx,gz], ...] joined by straight / L-shaped runs (along gx first, then gz), every tile inclusive.');

// One apply_design call carries at most this many road tiles + path waypoints over all its ops.
// A whole road network is <= 450 tiles (erase it and draw a new one: ~900), and the cap keeps any
// call the tool accepts far under the HTTP transport's 1 MB body limit.
export const MAX_DESIGN_TILES = 2000;
const tilesIn = (ops) => ops.reduce((n, o) => n + (Array.isArray(o && o.tiles) ? o.tiles.length : 0) +
  (Array.isArray(o && o.path) ? o.path.length : 0), 0);

const opSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('place'), type: z.string().describe('Building type id, e.g. "sniper_tower" (get_catalog lists them).'), gx: coord('gx'), gz: coord('gz'), rot: rotArg() }),
  z.object({ op: z.literal('move'), id: buildingId('building'), gx: coord('gx'), gz: coord('gz'), rot: rotArg() }),
  z.object({ op: z.literal('stow'), id: buildingId('building') }),
  z.object({ op: z.literal('remove_tree'), id: buildingId('tree') }),
  z.object({ op: z.literal('add_roads'), tiles: tilesArg(), path: pathArg() }),
  z.object({ op: z.literal('remove_roads'), tiles: tilesArg(), path: pathArg() })
]);

const READ = { readOnlyHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

function text(t, structured) {
  const out = { content: [{ type: 'text', text: t }] };
  if (structured) out.structuredContent = structured;
  return out;
}

/** An isError result: `label (CODE): message`, plus the same facts as data. */
function failure(message, code, label = 'Refused', extra = {}) {
  return {
    content: [{ type: 'text', text: `${label}${code ? ` (${code})` : ''}: ${message}` }],
    structuredContent: { ok: false, reason: code || null, message, ...extra },
    isError: true
  };
}

/** Results as data, without the bulky per-tile lists. */
function slimResults(results) {
  return (results || []).map(r => {
    const o = { ...r };
    delete o.addedTiles;
    delete o.removedTiles;
    return o;
  });
}

/**
 * One MCP server instance bound to one caller's token (stdio: the env token for the process;
 * HTTP: the request's bearer token). The auth cache, rate limiter and store are shared.
 */
export function createCityServer({ token, source = 'stdio', auth, store, limiter, version = '1.0.0', log = () => {}, now = () => Date.now() }) {
  const server = new McpServer({ name: 'city-siege', title: 'City Siege AI Designer', version }, { instructions: SERVER_INSTRUCTIONS });

  /** auth -> rate limit -> handler, turning known failures into readable isError results. */
  const guarded = (kind, handler) => async (args) => {
    let who;
    try {
      who = await auth.authenticate(token, { source });
    } catch (e) {
      if (e instanceof AuthError) {
        // A throttled token was not checked at all: do not call it denied.
        return failure(e.message, e.code, e.code === 'AUTH_THROTTLED' ? 'Try again later' : 'Access denied',
          e.retryAfterSec ? { retryAfterSec: e.retryAfterSec } : {});
      }
      log('auth lookup failed: ' + (e.stack || e));
      return failure(`Could not check the access token right now (${e.message}). Try again in a moment.`, 'AUTH_UNAVAILABLE', 'Error');
    }
    const k = typeof kind === 'function' ? kind(args || {}) : kind;
    const gate = limiter.take(who.hash, k);
    if (!gate.ok) {
      return failure(`at most ${gate.limit} ${k === 'write' ? 'design changes' : 'read calls'} per minute per access token. ` +
        `Retry in ${gate.retryAfterSec} s. Tip: batch many edits into one apply_design call.`, 'RATE_LIMITED', 'Rate limit reached',
      { retryAfterSec: gate.retryAfterSec });
    }
    auth.noteUse(who.hash);
    try {
      return await handler(args || {}, who);
    } catch (e) {
      if (e instanceof UserError) return failure(e.message, e.code, 'Refused', e.extra);
      log('tool failed: ' + (e.stack || e));
      return failure(`${e.message}. If this was an edit, call get_city to see whether it was saved before retrying.`, 'INTERNAL', 'Server error');
    }
  };

  /** Run ops through the store and phrase the outcome. `single` strips applyOps' "op 0 (...) failed:" prefix. */
  async function runOps(who, ops, { dryRun = false, single = false } = {}) {
    const r = await store.applyDesign(who.uid, { ops, writerId: who.writerId, dryRun });
    if (!r.ok) {
      const bad = r.results[r.failedAt] || {};
      let msg = bad.message || 'refused';
      if (single) msg = msg.replace(/^op 0 \([a-z_]+\) failed: /, '');
      return failure(msg + (dryRun ? ' (dry run - nothing would be saved)' : ' Nothing was changed.'), bad.reason,
        dryRun ? 'Dry run refused' : 'Refused', { failedAt: r.failedAt, rev: r.rev, results: slimResults(r.results) });
    }
    const s = summarize(r.model);
    const lines = [];
    if (dryRun) {
      lines.push(`Dry run - nothing was saved (the city is still rev ${r.rev}). ${r.results.length === 1 ? 'The op' : `All ${r.results.length} ops`} would succeed:`);
    } else if (r.noChange) {
      lines.push(`Nothing to save - the city already looks like that (still rev ${r.rev}).`);
    } else {
      lines.push(`Done - saved as rev ${r.rev}. The player's open game applies it live.`);
    }
    // Traps and barriers only work where raiders drive, and the map cannot show a road under a
    // letter: say where each one placed or moved ends up, judged on the city AFTER every op.
    const results = r.results.map(x => {
      if (!x || (x.op !== 'place' && x.op !== 'move')) return x;
      const b = r.model.layout.buildings.find(o => o.id === x.id);
      const road = b ? roadStatusOf(r.model, b) : null;
      return road ? { ...x, ...road, message: `${x.message} Road: ${roadNoteFor(r.model, b)}.` } : x;
    });
    for (const x of results) lines.push('- ' + x.message);
    const lock = lockText(r.locked, { dryRun, fromRev: r.previousRev });
    if (lock) lines.push(lock);
    lines.push(afterText(s, { dryRun }));
    if (dryRun) {
      lines.push('', 'Map after these ops (legend as in get_city):', renderAsciiMap(r.model, { legend: false }));
    }
    return text(lines.join('\n'), {
      ok: true, dryRun: !!dryRun, saved: !dryRun && !r.noChange, rev: r.rev, previousRev: r.previousRev ?? null,
      summary: r.summary, results: slimResults(results), locked: r.locked || [],
      inventory: s.inventory, roads: s.roads, storage: s.storage
    });
  }

  // ---------------------------------------------------------------- read tools

  server.registerTool('get_city', {
    title: 'Get city',
    description: 'START HERE. The player\'s city: Town Hall level and build radius, the inventory you can place, storage, ' +
      'roads, buildings under construction, active battles with their lock deadlines, a 31x31 text map (north up), ' +
      'every building id with its tile and level, and every road tile by row. Call it again after a batch of edits.' + GRID,
    inputSchema: {
      ids: z.boolean().optional().describe('Append the building list (id type (gx,gz) level). Default true.')
    },
    annotations: READ
  }, guarded('read', async ({ ids = true }, who) => {
    const nowMs = now();
    const doc = await store.readCity(who.uid);
    const model = modelAt(doc, nowMs);
    const s = summarize(model);
    let battles = [];
    let battleNote = '';
    try {
      battles = (await store.listBattles(who.uid)).map(b => battleView(b, who.uid, nowMs)).filter(v => ACTIVE_PHASES.includes(v.phase));
    } catch (e) {
      battleNote = ` (could not read battles: ${e.message})`;
    }
    // lastChange belongs to the latest write only when it was signed by the same writer
    // (a game push that leaves lastChange alone must not be reported as the AI's change).
    const lc = doc.lastChange && doc.lastChange.by === doc.updatedBy ? doc.lastChange : null;
    const lcAt = lc && lc.at && typeof lc.at.toMillis === 'function' ? lc.at.toMillis() : Number(lc && lc.at) || null;
    const lines = [
      `${doc.name ? doc.name + '\'s city' : 'The player\'s city'} - Town Hall ${s.townHall}, build radius ${s.cityRadius} tiles ` +
        `(a tile is buildable when hypot(gx,gz) <= ${s.cityRadius}). Cloud version rev ${doc.rev}, last saved by ` +
        `${doc.updatedBy === 'mcp' ? 'the AI designer' : 'the game'}` +
        (lc && lc.summary ? `${lcAt ? ` ${fmtDur((nowMs - lcAt) / 1000)} ago` : ''}: "${lc.summary}"` : '') + '.',
      '',
      'BATTLES' + battleNote,
      ...(battles.length ? battles.map(v => '- ' + battleLine(v)) : ['- No active battles.']),
      '',
      `INVENTORY (ready to place): ${inventoryText(s)}.`,
      `ROADS: ${s.roads.placed}/${s.roads.limit} tiles placed, ${s.roads.inInventory} in the inventory.`,
      `STORAGE: ${s.storage.used}/${s.storage.capacity} Big Storage slots used.`
    ];
    if (s.underConstruction.length) {
      lines.push('UNDER CONSTRUCTION (cannot be moved or stowed until done): ' + s.underConstruction.map(u =>
        `${u.type} ${u.id} at (${u.gx},${u.gz}) -> level ${u.toLevel}${Number.isFinite(u.endsAt) ? (u.endsAt > nowMs ? `, done in ${fmtDur((u.endsAt - nowMs) / 1000)}` : ', timer done (completes when the game opens)') : ''}`).join('; ') + '.');
    }
    // The city keeps paid credits until the game's next real push: only the unpaid ones are pending.
    const credits = Object.keys(model.holdings.bankCredits || {});
    if (credits.length) {
      let paid = null;
      try {
        paid = await store.paidCredits(who.uid);
      } catch (e) {
        log('reading paid credits failed: ' + e.message);
      }
      s.pendingBankCredits = paid ? credits.filter(id => !paid.has(id)).length : credits.length;
      if (s.pendingBankCredits) {
        lines.push(`PENDING BANK CREDITS: ${s.pendingBankCredits} stow credit${s.pendingBankCredits === 1 ? '' : 's'} not paid yet ` +
          `(paid into the bank when the game next syncs)${paid ? '' : ' - could not check which the game has paid already'}.`);
      }
    }
    lines.push('', 'MAP', renderAsciiMap(model, { legend: true, ids }));
    // The map hides a road under any letter; raiders drive these tiles and traps / barriers belong on them.
    lines.push('', `ROAD TILES (${s.roads.placed}, by row; a trap or barrier works only on or next to these):`,
      roadRunsText(model) || '(none)');
    const roadTiles = roadRuns(model).flatMap(({ gz, runs }) => runs.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => [a + k, gz])));
    return text(lines.join('\n'), { uid: who.uid, name: doc.name || '', rev: doc.rev, summary: s, battles, roadTiles });
  }));

  server.registerTool('list_buildings', {
    title: 'List buildings',
    description: 'Every building with its id, type, tile (gx,gz), level, footprint (1, 2 or 3 tiles square), role, stored ' +
      'output, upgrade state, reach (turret range, trap trigger radius, aura radius, in tiles at its level) and, for traps ' +
      'and barriers, whether they stand on a road. Ids are what move_building, stow_building and remove_tree need. ' +
      'Optionally filter by type.' + GRID,
    inputSchema: {
      type: z.string().optional().describe('Only this building type, e.g. "sniper_tower" or "tree".')
    },
    annotations: READ
  }, guarded('read', async ({ type }, who) => {
    const model = modelAt(await store.readCity(who.uid), now());
    let rows = describeBuildings(model);
    if (type) rows = rows.filter(r => r.type === type);
    const lines = [`${rows.length} building${rows.length === 1 ? '' : 's'}${type ? ` of type ${type}` : ''} (id  type  (gx,gz)  level  size):`];
    for (const r of rows) {
      lines.push(`${r.id}  ${r.type}  (${r.gx},${r.gz})  L${r.level}  ${r.footprint}x${r.footprint}` +
        (r.fixed ? '  [fixed gate]' : '') +
        (r.upgradingTo ? `  [upgrading to L${r.upgradingTo}: cannot move/stow]` : '') +
        (r.stored ? `  [holds ${r.stored} output]` : '') +
        (r.reach && !r.fixed ? `  [${reachText(r.type, r.level)}]` : '') +
        (r.onRoad === true ? '  [on road]' : r.onRoad === false ? (r.reachesRoad ? '  [off road, reaches it]' : '  [OFF-ROAD]') : ''));
    }
    return text(lines.join('\n'), { count: rows.length, buildings: rows });
  }));

  server.registerTool('get_catalog', {
    title: 'Get catalog',
    description: 'The building types this Town Hall allows: type id, name, role, footprint, map letter, limit vs placed, how ' +
      'many are in the inventory (ready to place) or in storage, what each does, its reach (turret range / trap trigger ' +
      'radius / aura radius in tiles) and the game\'s own placement advice. Only inventory can be placed - buying is ' +
      'manual in the game. Types that unlock at higher Town Halls are not listed.' + GRID,
    annotations: READ
  }, guarded('read', async (_args, who) => {
    const model = modelAt(await store.readCity(who.uid), now());
    const cat = catalogFor(model);
    const s = summarize(model);
    const lines = [`Town Hall ${s.townHall}: ${cat.length} types available (type - name [role, size, map letter]: placed/limit, inventory). ` +
      'Reach is at level 1, in tiles (1 tile = 5.5 m); turret range grows 12% per level (list_buildings gives each building\'s own):'];
    const reach = {};
    for (const c of cat) {
      const r = reachText(c.type, 1);
      if (r) reach[c.type] = r;
      const role = BUILDING_DEFS[c.type] && BUILDING_DEFS[c.type].role;
      const where = role === 'trap' ? ' Works only on or right next to a road tile raiders drive.'
        : role === 'barrier' ? ' Blocks only its own tile: put it ON a road tile.' : '';
      lines.push(`${c.type} - ${c.name} [${c.role}, ${c.footprint}x${c.footprint}, ${c.letter}]: ${c.placed}/${c.limit} placed, ` +
        `${c.inInventory} in inventory${c.stowed ? ` (${c.stowed} from storage${c.stowedLevels.length ? ', levels ' + c.stowedLevels.join('/') : ''})` : ''}` +
        (c.type === 'road' ? ` - ${c.note}` : c.canPlaceNow ? ' - CAN PLACE NOW' : ` - ${c.why}`) +
        `. ${c.desc}` + (r ? ` Reach: ${r}.` : '') + where + (c.helps ? ` Advice: ${c.helps}` : ''));
    }
    return text(lines.join('\n'), { townHall: s.townHall, catalog: cat.map(c => ({ ...c, reach: reach[c.type] || null })) });
  }));

  server.registerTool('get_rules', {
    title: 'Get placement rules',
    description: 'The design rules in prose: build radius per Town Hall, footprints and spacing, roads, storage, what each op ' +
      'may and may not do, how battles lock the city, and the rate limits. Read it once before a big redesign.' + GRID,
    annotations: READ
  }, guarded('read', async () => text(rulesText())));

  server.registerTool('validate_design', {
    title: 'Validate design',
    description: 'Check the whole city: layout errors and warnings (overlaps, pieces outside the radius, limits), the raid-defense ' +
      'report (how well each threat kind is covered for this Town Hall, the gem bounty a raider earns, concrete gaps to fix), ' +
      'COVERAGE (which turrets reach each Main Gate and the Town Hall - this is what moving turrets changes), traps and barriers ' +
      'that are off the roads, and inventory not placed yet. Read-only; run it before and after a redesign.' + GRID,
    annotations: READ
  }, guarded('read', async (_args, who) => {
    const model = modelAt(await store.readCity(who.uid), now());
    const audit = auditLayout(model);
    const d = defenseReport(model);
    const s = summarize(model);
    const coverage = coverageReport(model);
    const rows = describeBuildings(model);
    const roadPieces = rows.filter(r => r.onRoad !== undefined);
    const offRoad = roadPieces.filter(r => !r.onRoad && r.reachesRoad !== true);
    const nameOf = (t) => (BUILDING_DEFS[t] && BUILDING_DEFS[t].name) || t;
    const unused = catalogFor(model).filter(c => c.type !== 'road' && c.inInventory > 0)
      .map(c => ({ type: c.type, inInventory: c.inInventory, canPlaceNow: c.canPlaceNow, why: c.why || null }));
    const lines = [
      `LAYOUT: ${audit.errors.length ? audit.errors.length + ' error(s)' : 'no errors'}, ${audit.warnings.length ? audit.warnings.length + ' warning(s)' : 'no warnings'}.`,
      ...audit.errors.map(e => '- ERROR ' + e),
      ...audit.warnings.map(w => '- warning ' + w),
      '',
      `RAID DEFENSE at Town Hall ${d.townHall}: score ${d.score.toFixed(2)} (1.00 = every threat kind fully covered); ` +
        `${d.covered.toFixed(2)} of ${d.total} kinds covered, weakest ${Math.round(d.weakest * 100)}%.`,
      `A raider who razes this city earns ${d.gemBounty} of at most ${d.maxGems} gems (more defense = bigger bounty = a harder raid). ` +
        `${d.countedTargets} buildings count toward destruction${d.countedTargets < d.minTargets ? ` (below the ${d.minTargets} a full Town Hall ${d.townHall} city has)` : ''}.`,
      ...(d.gaps.length ? ['Gaps:', ...d.gaps.map(g => '- ' + g)] : ['No gaps: every threat kind is fully covered.']),
      'The score and the bounty count only WHAT is placed and its levels, not where: moving buildings never changes them. ' +
        'Placement shows in COVERAGE and ROAD PLACEMENT below.',
      '',
      ...(!rows.some(r => r.reach && r.reach.kind === 'turret' && !r.fixed)
        ? [`COVERAGE: no turret is placed, so none reaches the Main Gates or the Town Hall${d.townHall < 2
          ? ' (the first turret, the Sniper Watchtower, unlocks at Town Hall 2)' : ''}.`]
        : ['COVERAGE - turrets whose range (at their level, before aura bonuses) reaches each Main Gate tile, where every raid ' +
          'enters, and the Town Hall (distance / range in tiles):',
        ...coverage.map(p => `- ${p.name} (${p.gx},${p.gz}): ` + (p.turrets.length
          ? `${p.turrets.length} turret${p.turrets.length === 1 ? '' : 's'} - ` +
            p.turrets.map(t => `${nameOf(t.type)} ${t.id} (${t.gx},${t.gz}) L${t.level} [${t.distTiles}/${t.rangeTiles}]`).join(', ')
          : 'NO turret reaches it.'))]),
      '',
      `ROAD PLACEMENT: ${roadPieces.length - offRoad.length} of ${roadPieces.length} traps and barriers are on a road (or, for a ` +
        'trap, reach one with their trigger radius).' + (offRoad.length ? ' Off the roads:' : ''),
      ...offRoad.map(r => {
        const b = model.layout.buildings.find(o => o.id === r.id);
        return `- ${nameOf(r.type)} ${r.id} at (${r.gx},${r.gz}): ${roadNoteFor(model, b)}.`;
      }),
      '',
      'UNUSED INVENTORY: ' + (unused.length
        ? unused.map(u => `${u.type} x${u.inInventory}${u.canPlaceNow ? '' : ` (${u.why})`}`).join(', ')
        : 'none') + '.',
      `ROADS: ${s.roads.placed}/${s.roads.limit} placed, ${s.roads.inInventory} tiles in the inventory.`
    ];
    return text(lines.join('\n'), {
      audit, defense: d, coverage, unusedInventory: unused, roads: s.roads,
      offRoad: offRoad.map(r => ({ id: r.id, type: r.type, gx: r.gx, gz: r.gz, nearestRoad: r.nearestRoad || null }))
    });
  }));

  server.registerTool('get_battles', {
    title: 'Get battles',
    description: 'The player\'s battles (read-only): opponent, mode (instant/scheduled), theme, phase (pending, design, fight, ' +
      'resolving, finished...), deadlines with countdowns, whether each city is locked, and results. The city locks for a ' +
      'battle at its start time: edits before then are what the opponent raids; edits after only change the live city. ' +
      'Accepting, starting and attacking happen in the game, not here.' + GRID,
    inputSchema: {
      include_finished: z.boolean().optional().describe('Also list finished / expired / declined battles. Default false.')
    },
    annotations: READ
  }, guarded('read', async ({ include_finished = false }, who) => {
    const nowMs = now();
    const all = (await store.listBattles(who.uid)).map(b => battleView(b, who.uid, nowMs));
    const shown = include_finished ? all : all.filter(v => ACTIVE_PHASES.includes(v.phase));
    const lines = [`Now: ${iso(nowMs)}. ${shown.length} ${include_finished ? '' : 'active '}battle${shown.length === 1 ? '' : 's'}` +
      (!include_finished && all.length > shown.length ? ` (${all.length - shown.length} finished/closed not shown; include_finished:true lists them)` : '') + ':'];
    for (const v of shown) lines.push('- ' + battleLine(v));
    if (!shown.length) lines.push('- none. Challenges are sent from the game\'s BATTLES screen.');
    return text(lines.join('\n'), { now: iso(nowMs), battles: shown });
  }));

  // ---------------------------------------------------------------- design tools

  server.registerTool('place_building', {
    title: 'Place building',
    description: 'Place one building from the player\'s Construction Inventory on tile (gx,gz). Units waiting in Big Storage come ' +
      'out first and keep their level. Refused (nothing changes) if the type is not in the inventory, is locked or at its Town ' +
      'Hall limit, the tile is outside the build radius, or the footprint overlaps another structure - the error names the ' +
      'blocker and suggests free tiles. For several edits prefer apply_design.' + GRID,
    inputSchema: {
      type: z.string().describe('Building type id, e.g. "sniper_tower" (get_catalog lists what can be placed).'),
      gx: coord('gx'), gz: coord('gz'), rot: rotArg()
    },
    annotations: WRITE
  }, guarded('write', async ({ type, gx, gz, rot: r }, who) =>
    runOps(who, [{ op: 'place', type, gx, gz, ...(r === undefined ? {} : { rot: r }) }], { single: true })));

  server.registerTool('move_building', {
    title: 'Move building',
    description: 'Move a placed building (by id) to tile (gx,gz), optionally turning it (rot). The Town Hall may move; Main Gates ' +
      'and buildings being upgraded may not. Same radius and spacing rules as placing (the building ignores its own old spot).' + GRID,
    inputSchema: { id: buildingId('building'), gx: coord('gx'), gz: coord('gz'), rot: rotArg() },
    annotations: WRITE
  }, guarded('write', async ({ id, gx, gz, rot: r }, who) =>
    runOps(who, [{ op: 'move', id, gx, gz, ...(r === undefined ? {} : { rot: r }) }], { single: true })));

  server.registerTool('stow_building', {
    title: 'Stow building',
    description: 'Put a placed building (by id) into Big Storage: its tiles are freed and it returns to the inventory, keeping its ' +
      'level. Needs a standing Big Storage depot with a free slot. Not allowed for the Town Hall, Main Gates, trees (use ' +
      'remove_tree) or a building being upgraded. A producer\'s output up to now is credited to the bank when the game next ' +
      'syncs (a Crypto Vault keeps its cash sealed inside).' + GRID,
    inputSchema: { id: buildingId('building') },
    annotations: WRITE
  }, guarded('write', async ({ id }, who) => runOps(who, [{ op: 'stow', id }], { single: true })));

  server.registerTool('remove_tree', {
    title: 'Remove tree',
    description: 'Clear a tree (by id) for good - trees are decoration and nothing is refunded. Trees never block buildings, so ' +
      'clear them only for looks or to free road space.' + GRID,
    inputSchema: { id: buildingId('tree') },
    annotations: { ...WRITE, destructiveHint: true }
  }, guarded('write', async ({ id }, who) => runOps(who, [{ op: 'remove_tree', id }], { single: true })));

  server.registerTool('add_roads', {
    title: 'Add roads',
    description: 'Draw road tiles; each new tile uses one road tile from the inventory, up to the Town Hall\'s road limit. Give ' +
      'EITHER tiles ([[gx,gz],...]) OR path (waypoints joined by straight / L-shaped runs, gx first then gz, inclusive). Tiles ' +
      'already paved are skipped; any other refusal draws nothing. Roads never block buildings; raiders drive on them, and ' +
      'traps / spike traps / roadblocks work ON road tiles.' + GRID,
    inputSchema: { tiles: tilesArg(), path: pathArg() },
    annotations: WRITE
  }, guarded('write', async ({ tiles, path }, who) =>
    runOps(who, [{ op: 'add_roads', ...(tiles ? { tiles } : {}), ...(path ? { path } : {}) }], { single: true })));

  server.registerTool('remove_roads', {
    title: 'Remove roads',
    description: 'Erase road tiles (EITHER tiles or path, as in add_roads); every erased tile goes back to the inventory. Tiles ' +
      'with no road are skipped.' + GRID,
    inputSchema: { tiles: tilesArg(), path: pathArg() },
    annotations: WRITE
  }, guarded('write', async ({ tiles, path }, who) =>
    runOps(who, [{ op: 'remove_roads', ...(tiles ? { tiles } : {}), ...(path ? { path } : {}) }], { single: true })));

  server.registerTool('apply_design', {
    title: 'Apply design',
    description: 'Apply many design ops as ONE change: all-or-nothing (if any op is refused nothing is saved and the error names ' +
      'the op and why), one live update in the game, one undo step. Ops run in order, so later ops see earlier ones (stow a ' +
      'building, then place something where it stood). dry_run: true validates everything and shows the resulting map without ' +
      'saving - use it first for bigger redesigns. Op shapes: {op:"place",type,gx,gz,rot?} {op:"move",id,gx,gz,rot?} ' +
      `{op:"stow",id} {op:"remove_tree",id} {op:"add_roads",tiles|path} {op:"remove_roads",tiles|path}. At most 200 ops and ` +
      `${MAX_DESIGN_TILES} road tiles + path waypoints in one call.` + GRID,
    inputSchema: {
      ops: z.array(opSchema).min(1).max(200).describe('The ops, applied in order.'),
      dry_run: z.boolean().optional().describe('true = check and preview only, save nothing. Default false.')
    },
    annotations: WRITE
  }, guarded(({ dry_run }) => (dry_run ? 'read' : 'write'), async ({ ops, dry_run = false }, who) => {
    const n = tilesIn(ops);
    if (n > MAX_DESIGN_TILES) {
      return failure(`one apply_design call takes at most ${MAX_DESIGN_TILES} road tiles + path waypoints in total; this one has ${n}. ` +
        'Split it into several calls (a path of a few waypoints draws a long road). Nothing was changed.', 'BAD_ARGS');
    }
    return runOps(who, ops, { dryRun: !!dry_run });
  }));

  server.registerTool('undo_last_change', {
    title: 'Undo last AI change',
    description: 'Revert the most recent AI-designer change by restoring the version it replaced; call again to step further back. ' +
      'Only works while the latest version was written by the AI - it never reverts what the player did in the game. Money is ' +
      'never taken back, and a producer the undo takes off the map has its stored output credited to the bank, as a stow does.' + GRID,
    annotations: WRITE
  }, guarded('write', async (_args, who) => {
    const r = await store.undo(who.uid, { writerId: who.writerId });
    const s = summarize(r.model);
    const lines = [
      `Undone - saved as rev ${r.rev}: the city is back to how it was at rev ${r.restoredRev} (reverted: ${r.reverted}). ` +
        'The player\'s open game applies it live.',
      r.moreToUndo ? 'Call undo_last_change again to step further back.' : 'That was the earliest AI change since the game last saved the city; there is nothing further to undo.'
    ];
    // Producers the undo took off the map keep what they made meanwhile (settled like a stow).
    const nameOf = (t) => (BUILDING_DEFS[t] && BUILDING_DEFS[t].name) || t;
    const c = r.carried || { credits: [], sealed: [], restowed: 0 };
    if (c.credits.length) {
      lines.push('The stored output of what this took off the map is credited to the bank when the game next syncs (as a stow credits it): ' +
        c.credits.map(x => `${nameOf(x.type)} ${x.buildingId} ${['cash', 'iron', 'wood'].filter(k => x[k] > 0).map(k => `${x[k]} ${k}`).join(', ')}`).join('; ') + '.');
    }
    if (c.sealed.length) {
      lines.push('Sealed cash stays inside the vault' + (c.sealed.length === 1 ? '' : 's') + ' this took off the map: ' +
        c.sealed.map(x => `${nameOf(x.type)} ${x.buildingId} ${x.cash} cash`).join('; ') +
        (c.restowed ? ` (${c.restowed} went back into Big Storage rather than the plain inventory: only a stored unit keeps sealed cash).` : '.'));
    }
    const lock = lockText(r.locked, { fromRev: r.previousRev });
    if (lock) lines.push(lock);
    lines.push(afterText(s));
    return text(lines.join('\n'), {
      ok: true, rev: r.rev, previousRev: r.previousRev, restoredRev: r.restoredRev, reverted: r.reverted,
      summary: r.summary, moreToUndo: r.moreToUndo, locked: r.locked, credits: c.credits, sealed: c.sealed
    });
  }));

  // ---------------------------------------------------------------- prompts

  server.registerPrompt('fortify_for_battle', {
    title: 'Fortify for a battle',
    description: 'Redesign the city to defend an upcoming battle before it locks.',
    argsSchema: {
      battle_id: z.string().optional().describe('The battle to prepare for (get_battles lists ids). Default: the next one to lock.'),
      focus: z.string().optional().describe('Anything to prioritise, e.g. "protect the Town Hall" or "the east gate is weak".')
    }
  }, ({ battle_id, focus }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          `Fortify my City Siege city for ${battle_id ? `battle ${battle_id}` : 'my next battle'}.${focus ? ` Priority: ${focus}.` : ''}`,
          '',
          '1. Call get_battles and find the battle and when my city locks. Everything must be saved well before that; if it is already locked, tell me and stop.',
          '2. Call get_city (map, ids, inventory, ROAD TILES), list_buildings (each turret\'s range and each trap\'s trigger radius in tiles, and which traps / barriers are on a road), get_catalog (reach and the game\'s placement advice per type) and validate_design (defense gaps, COVERAGE of each gate and the Town Hall). Read get_rules if you are unsure about spacing.',
          '3. Plan against raiders who enter through a Main Gate - N (0,-15), E (15,0) or S (0,15) - and race along the roads:',
          '   - put turrets where their range (in tiles) covers the gate approaches and the Town Hall and other high-value buildings - a gate with no turret in COVERAGE is the first gap to close;',
          '   - put traps, spike traps and roadblocks ON the road tiles (get_city ROAD TILES) leading in from the gates; every place / move result says whether the piece is on a road;',
          '   - spread police / SWAT spawners so pursuit starts early; keep producers and storage inside the defended core;',
          '   - place everything useful from the inventory. You cannot buy or upgrade: list what I should buy or upgrade myself.',
          '4. Put the whole change into ONE apply_design call. Run it with dry_run: true first, fix any refused op (the error names the blocker and free tiles), then run it for real.',
          '5. Run validate_design again and tell me what changed and why: which turrets now reach each gate and the Town Hall (COVERAGE, before vs after), any trap or barrier still off the roads, and the remaining gaps. The defense score and gem bounty count only what is placed and its levels - they move only if you placed something from the inventory, so do not present an unchanged score as a result of the layout. If I dislike it, undo_last_change reverts it.'
        ].join('\n')
      }
    }]
  }));

  server.registerPrompt('tidy_city', {
    title: 'Tidy the city',
    description: 'Clean up the layout without weakening the defense.',
    argsSchema: {
      style: z.string().optional().describe('Optional look to aim for, e.g. "grid blocks" or "ring roads".')
    }
  }, ({ style }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: [
          `Tidy up my City Siege city${style ? ` (style: ${style})` : ''} without making it easier to raid.`,
          '',
          '1. Call get_city and validate_design. Fix every layout warning first (overlaps, pieces outside the build radius).',
          '2. Keep a road from each Main Gate (N (0,-15), E (15,0), S (0,15)) to the centre; erase road stubs that lead nowhere and draw roads so every producer sits next to one.',
          '3. Line buildings up into neat blocks with roads between them; clear trees only where they are in the way (they are decoration, nothing is refunded).',
          '4. Do not stow defenses, and keep turret coverage over the gates and the Town Hall. Traps and barriers stay on roads.',
          '5. Make it ONE apply_design call: dry_run: true first, fix refusals, then apply. Summarise the changes; undo_last_change reverts them if I do not like the result.'
        ].join('\n')
      }
    }]
  }));

  return server;
}
