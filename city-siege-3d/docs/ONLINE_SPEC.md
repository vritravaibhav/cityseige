# City Siege Online — implementation spec (contract for all online work)

Status: authoritative contract. Every module below is written against THIS file. If an implementer
finds the spec wrong or impossible, they fix the code in the smallest spec-compatible way and record the
deviation in section 13 ("Deviations log") of this file - never silently.

The game is `city-siege-3d/` (three.js + Vite, ESM, `"type": "module"`). The git root is one level up
and contains an unrelated project - never touch files outside `city-siege-3d/` except the root
`.gitignore`.

## 0. What we are building (user request, verbatim intent)

1. Firebase Authentication + Firestore storage of every player's city, so players can attack each other.
2. Battles between two players. A battle is either **instant** (fight now, after a short design window)
   or **scheduled** (e.g. "fight tonight at 21:00", played with a night theme). Between acceptance and
   the start time BOTH players design their city - by dragging in the game, or through an AI assistant
   connected over **MCP**. At the start time both cities lock, then both players raid each other's
   locked city. Scores decide the winner.
3. An **MCP server + access-token system**: a player generates a personal token in the game, plugs it
   into an MCP client (Claude Code / Claude Desktop / any MCP host), and prompts the AI to design the
   city. The MCP server edits the city **in Firestore**; the open game applies the change live.
   **MCP is design-only**: place / move / stow buildings, remove trees, draw / erase roads. It cannot
   attack, buy, upgrade, collect, spend or touch the bank. Everything else stays manual.
4. Proper docs.

Offline play must keep working exactly as today when Firebase is not configured. All existing tools
(`tools/verify-progression.mjs`, `tools/verify-meshes.mjs`, `tools/e2e/smoke.mjs`, `tools/e2e/raidbot.mjs`)
must still pass.

## 1. Fixed design decisions

- **Offline-first.** The game boots from localStorage exactly as now (synchronous). Online is an
  optional layer that links the local save to a Firebase account after boot.
- **Firebase SDK is lazy-loaded** (`await import('firebase/...')`) only when online is configured, so the
  offline bundle path and the existing smoke tests do not load it.
- **Configured** means `import.meta.env.VITE_FIREBASE_API_KEY` is set, or
  `import.meta.env.VITE_FIREBASE_EMULATORS === 'true'`.
- **PvP raids use a separate "arena" BuildingManager**, never a swap of the player's own city
  (section 8). The player's own city, its autosave and its GarageManager are never touched by a raid.
- **Battles are for glory.** A battle raid pays the attacker the same minted loot and gems a normal raid
  pays (existing formulas, computed on the defender's snapshot); the defender's bank and vaults are
  never debited. Winner/loser change trophies and W/L counters only.
- **Client-trusted results.** There is no server-side game simulation (no Cloud Functions / Blaze plan).
  Firestore rules enforce ownership, phase timing, one attempt per player, value ranges and a
  deterministic winner. This trust model is documented, not hidden.
- **MCP server is the only non-client writer** and uses the Firebase Admin SDK. It validates every edit
  with the shared pure rules module (section 4), so an AI cannot produce a layout the game would refuse.
- **No native `alert()` / `confirm()` / `prompt()`** in any new UI. New screens are FULL SCREENS in the
  existing `.shop-screen` style (the user rejected modal dialogs for shop/garage).
- **Stable building ids** are persisted (section 3) so remote edits can address buildings.

## 2. Files and ownership

```
city-siege-3d/
  firebase.json, .firebaserc (demo-city-siege), firestore.rules, firestore.indexes.json
  .env.example                   documented VITE_* variables (no secrets)
  .env.emulator                  committed demo config for `vite --mode emulator`
  src/shared/cityRules.js        PURE layout model + validation + ops + ASCII map (Node + browser)
  src/shared/battleRules.js      PURE battle timing, phases, winner, trophies (Node + browser)
  src/builder/CityPersistence.js stable ids, foreign-city guard (small edits)
  src/net/firebase.js            lazy init, emulator wiring, isOnlineConfigured()
  src/net/AuthService.js         sign up / in / out, Google, profile + username claim
  src/net/CloudSync.js           city/holdings/bank/garage <-> Firestore, live remote apply
  src/net/BattleService.js       challenges, phases, snapshots, attempts, results, resolve, settle
  src/net/McpTokens.js           generate / list / revoke MCP tokens
  src/net/OnlineController.js    glue: owns the services, exposes game.online
  src/combat/ArenaCity.js        the separate target city for PvP raids (section 8)
  src/ui/OnlineUI.js             ACCOUNT + BATTLES full screens, design-phase banner, badges
  mcp-server/                    Node MCP server (stdio + Streamable HTTP), own package.json
  tools/online/                  Node tests (shared rules, firestore rules, MCP), e2e PvP driver
  docs/                          ONLINE.md (setup+architecture), BATTLES.md (rules), MCP.md (AI design)
```

Existing files that get (small, surgical) edits: `src/main.js`, `src/combat/AttackManager.js`,
`src/combat/PoliceManager.js` (`clear()` also resets `this.stations = []`), `src/rendering/SceneManager.js`
(raid theme), `src/combat/VehicleController.js` (headlight), `src/builder/BuildingManager.js`
(import `MAIN_GATES` from cityRules, keep ids on restore), `src/ui/UIManager.js`, `index.html`,
`src/styles.css`, `package.json` scripts.

## 3. Save formats

### 3.1 Local city blob (localStorage `city_siege_city`, CITY_SAVE_VERSION stays 1)

Unchanged except two OPTIONAL fields (old saves stay valid):
```
{ v:1, savedAt, buildings:[{ id?, t, gx, gz, l, st, rot, gate? }], tasks:[{ i, id?, t, gx, gz, to, endsAt, total }], roads:[[gx,gz]] }
```
- `serializeCity` writes `id: b.id` for every building and `id: task.building.id` for every task.
- `restoreCity` sets `b.id = s.id` when `s.id` is a string of 1..40 chars matching `/^[A-Za-z0-9_-]+$/`
  and not already used in this restore; otherwise it keeps the generated id. Gates always keep their
  fixed ids (`gate_north_gate`, ...).
- A task with `id` is matched to its building by id first (index is the fallback for old saves).
- New ids generated anywhere (BuildingManager, MCP server) use `newBuildingId()` from cityRules:
  `'b' + base36 time + base36 random` (unique enough, url-safe, <= 20 chars).
- `saveCity(bm)` returns false and writes nothing when `bm.isForeignCity === true` (defense in depth;
  the arena never has hooks anyway).

### 3.2 Cloud encoding (Firestore forbids arrays inside arrays)

`cityRules.toCloudLayout(blob)` / `fromCloudLayout(layout)` convert between the local blob and the
cloud layout. The ONLY differences: `roads` is `string[]` of `"gx,gz"`; `v`, `savedAt`, buildings and
tasks are copied field by field (dropping unknown fields); `id` is REQUIRED on every cloud building
(missing ids are generated during `toCloudLayout`, and the caller must put them back on the live
buildings - CloudSync does this by restoring ids onto `bm.buildings` in the same order).

### 3.3 Holdings (the design-relevant part of the economy)

```
holdings = {
  inventory:    { [type]: int },          // same meaning as EconomyManager.inventory (includes stowed)
  stowedCounts: { [type]: int },
  stowedLevels: { [type]: int[] },        // levels > 1, highest first
  stowedSealed: { [type]: int[] },        // crypto_vault sealed cash, largest first
  bankCredits:  { [creditId]: { cash, iron, wood, reason, at } }   // see 3.4
}
```

### 3.4 Bank credits ledger

When the MCP server stows a producer that holds tappable output, the game would have banked that output
(`_sendToStorage` -> `economy.collectFromBuilding`). The MCP server cannot touch the bank, so it adds an
entry `bankCredits[newId] = producePayout(type, floor(stored))` (+ reason `'stow <type>'`, at ms).
The client credits every entry whose id it has not credited before (it remembers credited ids in its
cloud meta, section 7.1), then its next push writes `bankCredits: {}`. Idempotent under races.

## 4. `src/shared/cityRules.js` (pure; imports ONLY `../data/progression.js`)

Must run unmodified in Node >= 20 and in the browser. No three, no DOM, no firebase, no `Date.now()`
at module scope. Every function takes plain data.

```js
export const MAIN_GATES = [ {name:'North Gate', gx:0, gz:-15, rot:0}, {name:'East Gate', gx:15, gz:0, rot:Math.PI/2}, {name:'South Gate', gx:0, gz:15, rot:Math.PI} ];
// (moved here from BuildingManager.js, which now imports it - identical values)
export const ROT_STEPS = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
export function newBuildingId(nowMs, rand = Math.random)
export function footprintOf(type)                           // max(1, BUILDING_DEFS[type].footprint || 1)
export function townHallLevelOf(buildings)                  // first town_hall's l, else 1
export function toCloudLayout(localBlob, {nowMs, rand}) / fromCloudLayout(cloudLayout)
export function emptyHoldings()
export function holdingsFromEconomy(eco) / applyHoldingsToEconomy(eco, holdings)  // plain field copy, no save()
export function createModel(cloudLayout, holdings)           // deep-cloned working model
export function modelToCloud(model) -> { layout, holdings }
export function checkPlace(model, type, gx, gz, opts)       -> {ok, reason?, message?}
export function applyOp(model, op, ctx)                     -> {ok, reason?, message?, ...details}
export function applyOps(model, ops, ctx)                   -> {ok, results[], failedAt?}  // all-or-nothing on a clone
export function summarize(model)                             -> counts/limits/inventory/storage/roads/radius/TH
export function catalogFor(model)                            -> placeable types at this TH with limits + copy
export function renderAsciiMap(model, {legend=true, ids=false}) -> string
export function auditLayout(model)                           -> {errors[], warnings[]} (full-city sanity)
export function defenseReport(model)                         -> raidDefenseFor(...) + readable gaps
export const REASON = { ... }                                // string codes below
```

`ctx = { nowMs, rand }` (tests pass fixed values).

Op shapes (the same JSON the MCP `apply_design` tool accepts):
```
{ op:'place',  type, gx, gz, rot? }          rot in degrees, one of 0/90/180/270 (default 0)
{ op:'move',   id, gx, gz, rot? }
{ op:'stow',   id }
{ op:'remove_tree', id }
{ op:'add_roads', tiles:[[gx,gz],...] }      OR { op:'add_roads', path:[[gx,gz],[gx,gz],...] } (straight/L segments between waypoints, inclusive)
{ op:'remove_roads', tiles:[[gx,gz],...] }
```

Rules - these MUST match what the game allows through its UI (GridSystem + BuildingManager + EconomyManager):
- **Radius**: a placed/moved building's centre tile and every road tile added/removed satisfy
  `Math.hypot(gx, gz) <= cityRadiusFor(TH)`. Existing pieces outside the radius (the starter city has
  trees outside it) are legal and untouched - only the piece being added/moved is checked.
- **Overlap**: exactly BuildingManager.isFootprintBlocked: `reach = (fpA + fpB)/2`, clash when
  `|dx| < reach && |dz| < reach`; trees are never obstacles (but a tree is blocked by non-trees);
  gates are obstacles with footprint 3; the moved building ignores itself. Roads and buildings never
  block each other.
- **place**: type known; not `main_gate`, not `road`; `inventory[type] > 0`; TH unlock and
  `count(type) < limitFor(type, TH)` (BuildingManager.canPlace); radius; overlap. Level/sealed come from
  storage exactly like `EconomyManager.peekStowedLevel` / `takeStowed` (read that code and mirror it,
  including which unit counts as "from storage"); fresh buildings get `st = BUILDING_DEFS[type].produce?.seed || 0`,
  from-storage vaults get `st = min(capacity, sealed)`; inventory decremented (zero entries kept).
- **move**: id exists; not a gate; not under construction (a task references it); radius; overlap
  (ignoring itself). Town Hall may move. Rotation only for non-chain-barrier buildings.
- **stow**: id exists; not gate, not town_hall, not tree (UI rule); not under construction (MCP rule -
  the game would cancel + refund the job, and refunds touch the bank); storage capacity =
  sum of `storageSlotsFor('big_storage', l)` over big_storage depots that stay standing (a depot being
  stowed does not count its own slots), used = sum of stowedCounts; `used < capacity` else STORAGE_FULL
  / NO_DEPOT. Effects mirror `stowBuilding` + `_sendToStorage` + `EconomyManager.stowLevel`
  (levels, sealed for raidOnly types, bankCredits for tappable output, inventory +1, stowedCounts +1),
  then the building is removed and later task indices are shifted.
- **remove_tree**: id exists and is a tree; removed with no refund (the game's "Clear Decoration").
- **add_roads**: per tile: radius, no road already there (skipped, not an error), `inventory.road > 0`
  else NO_ROAD_INVENTORY, `roads.size < limitFor('road', TH)` else ROAD_LIMIT. Consumes 1 road per tile.
  A failing tile fails the op (all-or-nothing) - except "already a road", which is reported as skipped.
- **remove_roads**: per tile: radius, road exists (else skipped), refunds 1 road to inventory.
- All ops leave `tasks` consistent (indices re-pointed after a removal; ids unchanged).

REASON codes: `UNKNOWN_TYPE, NOT_PLACEABLE, NOT_IN_INVENTORY, LOCKED, AT_LIMIT, OUTSIDE_RADIUS, BLOCKED,
NOT_FOUND, IMMOVABLE, UNDER_CONSTRUCTION, NOT_STOWABLE, NO_DEPOT, STORAGE_FULL, NOT_A_TREE,
NO_ROAD_INVENTORY, ROAD_LIMIT, BAD_ARGS`. Every failure carries a human `message` that an AI can act on
(e.g. "Tile (3,4) is blocked by Police Station b1x9 at (3,3). Free tiles nearby: (6,4), (3,7)").

`renderAsciiMap`: a square grid from -15..15 on both axes (31x31), north (gz=-15) at the top, one
character per tile, with row/column coordinate labels every 5 tiles, `#` wall ring outside the radius,
`=` road, `.` empty buildable, `G` gate footprint, `H` town hall, and a single letter per building
category (legend lists type -> letter); multi-tile footprints fill their tiles. With `ids:true` it also
returns a list of `id type (gx,gz) Lx`.

## 5. `src/shared/battleRules.js` (pure)

```js
export const BATTLE = {
  INSTANT_DESIGN_OPTIONS: [0, 120, 300, 600],   // seconds of design time after acceptance
  INSTANT_DEFAULT_DESIGN: 300,
  INSTANT_RESPOND_SECONDS: 600,                  // an instant challenge expires after 10 min
  INSTANT_FIGHT_SECONDS: 900,                    // fight window after lock
  SCHEDULED_MIN_LEAD_SECONDS: 600,               // scheduled start at least 10 min out
  SCHEDULED_MAX_LEAD_SECONDS: 7 * 86400,
  SCHEDULED_FIGHT_SECONDS: 3600,
  SCHEDULED_ACCEPT_BEFORE_SECONDS: 60,           // must be accepted >= 1 min before start
  RESULT_GRACE_SECONDS: 660,                     // raid time limit + 60s
  RAID_TIME_LIMIT_SECONDS: 600,                  // battle raids end with outcome 'timeout'
  MAX_OPEN_BATTLES: 5,                           // pending+design+fight per player (client-enforced)
  TROPHY_WIN: 30, TROPHY_LOSS: -20, TROPHY_DRAW: 5,
  NIGHT_START_HOUR: 19, NIGHT_END_HOUR: 6,
  MESSAGE_MAX: 140,
  TIME_SLACK_SECONDS: 120,                       // client clock tolerance accepted by the rules
};
export function toMillis(ts)                 // number | Date | Firestore Timestamp | {seconds,nanoseconds} -> ms | null
export function battlePhase(b, nowMs)        // 'pending'|'expired'|'declined'|'cancelled'|'design'|'fight'|'resolving'|'finished'
export function respondDeadline(b)           // ms
export function fightWindowSeconds(mode)
export function scoreOf(b, uid)              // results[uid] or {stars:0, percentage:0, durationSec:Infinity, missing:true}
export function decideWinner(b)              // uid | 'draw' (stars, then percentage, then lower durationSec, else draw)
export function trophyDelta(b, uid)
export function isNightAt(date)              // local hour >= 19 || < 6
export function schedulePresets(nowDate)     // [{id:'tonight21', label:'Tonight 21:00', startAt(ms), night:true}, {id:'tonight23',...}, {id:'tomorrow21',...}]
export function validateChallenge(input, nowMs) -> {ok, errors[]}
export function starsFor(percentage)         // same thresholds as DestructionEngine.getStats (25/60/95)
```
Phase semantics:
- `status==='pending'`: phase `pending` until `respondDeadline(b)` then `expired`.
  respondDeadline = instant: createdAt + INSTANT_RESPOND_SECONDS; scheduled: startAt - SCHEDULED_ACCEPT_BEFORE_SECONDS.
- `status==='declined'|'cancelled'` -> same name.
- `status==='accepted'`: now < startAt -> `design`; startAt <= now < fightEndsAt -> `fight`;
  fightEndsAt <= now -> `resolving` (until someone writes status finished). Also `resolving` as soon as
  both results exist.
- `status==='finished'` -> `finished`.

## 6. Firestore data model + rules

Collections (all timestamps are Firestore Timestamps written with `serverTimestamp()` where the rules
compare them to `request.time`, or client `Timestamp.fromMillis()` within TIME_SLACK):

`players/{uid}` (public profile, read: any signed-in user; write: owner)
```
{ uid, name, nameLower, townHall:int, trophies:int>=0, wins:int, losses:int, draws:int,
  createdAt, lastSeen }
```
`usernames/{nameLower}` -> `{ uid }` (create by owner if absent; delete by owner; no update). Names:
3..20 chars `[A-Za-z0-9_ -]`, trimmed; nameLower = lowercased.

`cities/{uid}` (read: any signed-in user - opponents may scout; write: owner (game) with `updatedBy=='game'`)
```
{ uid, name, townHall:int 1..12, rev:int, updatedAt, updatedBy:'game'|'mcp', writerId:string,
  layout:{v:1, savedAt, buildings:[...], tasks:[...], roads:[string]}, holdings:{...},
  lastChange?:{ by:'game'|'mcp', summary:string, at } }
```
Rules: create with rev==1; update with `rev == resource.data.rev + 1`; buildings.size() <= 400,
roads.size() <= 450, uid == doc id. Delete denied.
`cities/{uid}/history/{rev}`: previous versions written by the MCP server only (for undo). Owner read.

`saves/{uid}` (owner read/write only): `{ bank:{cash,iron,wood,gems,vehicleLives}, garage:{...GarageManager state...}, updatedAt }`

`mcpTokens/{sha256hex}` (64 lowercase hex id):
```
{ uid, label (<=40), createdAt, revoked:false, lastUsedAt?, uses?, scope:'design' }
```
Rules: create if signed in, `uid == request.auth.uid`, `revoked == false`, `scope == 'design'`, id is 64 hex;
get/list only if `resource.data.uid == request.auth.uid`; update only `revoked` (to true) and `label` by
owner; delete by owner. `lastUsedAt`/`uses` are written by the MCP server (admin).

`battles/{battleId}`:
```
{ mode:'instant'|'scheduled', theme:'day'|'night',
  status:'pending'|'accepted'|'declined'|'cancelled'|'finished',
  challenger:uid, opponent:uid, players:[challenger, opponent],
  names:{[uid]:string}, townHalls:{[uid]:int}, message:string,
  createdAt, designSeconds:int (instant) , startAt (scheduled: at create; instant: at accept),
  fightEndsAt (set with startAt), acceptedAt?,
  ready:{[uid]:true},                       // instant only: both ready -> startAt pulled to now
  snapshots:{[uid]:{ layout, townHall, name, rev, lockedAt }},
  attempts:{[uid]:{ startedAt }},
  results:{[uid]:{ stars, percentage, destroyed, total, outcome, durationSec, loot:{cash,iron,wood}, finishedAt }},
  winner?: uid|'draw', resolvedAt?, settled:{[uid]:true} }
```
Rules summary (write them strictly; each transition validates only the keys it may change via
`request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`):
- read/list: `request.auth.uid in resource.data.players` (queries must use `players array-contains uid`).
- create: challenger == auth.uid; opponent != challenger; players == [challenger, opponent];
  status 'pending'; mode/theme valid; instant: designSeconds in options, no startAt; scheduled:
  startAt in [request.time + MIN_LEAD - SLACK, request.time + MAX_LEAD], fightEndsAt == startAt + 3600s;
  empty ready/snapshots/attempts/results/settled maps; message <= 140.
- accept (opponent, status pending, before respond deadline): status->'accepted', acceptedAt ==
  request.time; instant: startAt within SLACK of request.time + designSeconds, fightEndsAt == startAt + 900s.
- decline (opponent, pending) / cancel (challenger, pending): status only.
- ready (instant, participant, phase design): add own key to ready; if after the write both are ready
  the same write MAY set startAt (within SLACK of request.time, and not later than the old startAt) and
  fightEndsAt == startAt + 900s.
- snapshot (participant, request.time >= startAt, status accepted, snapshots[u] absent before):
  `snapshots[u].layout == get(/databases/$(database)/documents/cities/$(u)).data.layout` for the
  written u (either player - integrity is guaranteed by the equality, so anyone may take it).
- attempt (participant for self only, phase fight, attempts[self] absent, both snapshots present).
- result (self only, attempts[self] present, results[self] absent, request.time <= fightEndsAt +
  RESULT_GRACE, stars 0..3 == starsFor(percentage), percentage 0..100, destroyed <= total,
  durationSec 0..RAID_TIME_LIMIT+60, outcome in victory|retreat|busted|crash|timeout).
- resolve (participant, status accepted -> finished, winner == decideWinner (implemented in rules),
  resolvedAt == request.time; allowed when both results exist or request.time >= fightEndsAt + grace).
- settle (self key only, status finished).
Indexes: `battles` composite `players array-contains` + `createdAt desc`.

## 7. Client online layer (`src/net/*`)

### 7.1 CloudSync
- Local meta key `city_siege_cloud` = `{ uid, syncedRev, creditedIds:[..last 100], linkedAt }`.
- `sessionId` = random per page load (writerId of our writes).
- **Link on sign-in** (async, after boot):
  1. read `cities/{uid}` and `saves/{uid}`.
  2. No cloud city: if `meta.uid` is empty or equals uid -> upload local city + holdings + bank + garage
     (first link / migration of the guest save). If `meta.uid` is ANOTHER account -> copy the local
     keys to `<key>.bak.<oldUid>`, reset the local save to a fresh default city (clear the three keys,
     write meta `{uid, fresh:true}`, `location.reload()`; after reload the link uploads the default city).
  3. Cloud city exists: if `meta.uid === uid && meta.syncedRev === cloud.rev && local.savedAt > cloud.layout.savedAt`
     -> local has unsynced progress: push. Otherwise -> cloud wins: back up local if it belonged to
     another uid, apply the cloud city + holdings (7.2) and bank + garage from `saves/{uid}`.
  4. subscribe `onSnapshot(cities/{uid})`; start presence (players/{uid}.lastSeen every 60s while
     visible, plus townHall/name).
- **Push** (debounced 1500 ms after every local `saveCityNow`; flushed on `visibilitychange:hidden`):
  transaction: read doc; if `doc.rev !== meta.syncedRev` -> remote is newer -> abort push and apply
  remote (remote wins; toast). Else write `{..., rev+1, updatedBy:'game', writerId:sessionId,
  lastChange:{by:'game', summary:'', at}}`; on commit `meta.syncedRev = rev+1`.
  Never push while `suspended` (a raid in progress), while applying a remote change, or while signed out.
- **Bank + garage push**: debounced 3 s after economy save / garage commit: `saves/{uid}` set (merge).
- **Remote apply** (onSnapshot with `rev > syncedRev && writerId !== sessionId`): if the game is busy
  (attack state != IDLE, arena loaded, a building being dragged, preset modal open) keep it as
  `pendingRemote` and retry every 500 ms; else:
  `applying = true` -> `restoreCity(bm, fromCloudLayout(doc.layout), Date.now())` ->
  `applyHoldingsToEconomy(economy, doc.holdings)` + credit unseen `bankCredits` -> `economy.save()` +
  `economy.onUpdate/onInventoryUpdate` -> `saveCity(bm)` -> `syncedRev = doc.rev` -> `applying = false` ->
  `ui.onCityReplaced({by: doc.updatedBy, summary: doc.lastChange?.summary})` (drops stale tool state,
  re-renders design inventory, road badge, shop/garage if open, toast "🤖 AI designer: <summary>").
  The next push (if credits were applied) writes `bankCredits: {}`.

### 7.2 Hooks in main.js (single funnel)
`saveCityNow()` stays the single funnel: `if (this.persistenceSuspended) return;` then `saveCity(bm)` then
`this.online?.cloudSync?.schedulePush()`. `game.suspendPersistence()` / `game.resumePersistence()`
toggle the flag (used by raids). Economy/garage saves also notify CloudSync for the bank push. Online
init happens AFTER `_initCityAutosave()` and never blocks boot; `window.citySiege.online` exposes the
OnlineController for tests.

### 7.3 BattleService
Wraps section 6: `listen(cb)` (query players array-contains uid, createdAt desc, limit 30),
`createChallenge({opponentUid, mode, designSeconds, startAtMs, theme, message})`, `accept`, `decline`,
`cancel`, `setReady`, `ensureSnapshots(battle)` (for each player lacking a snapshot at/after startAt,
transaction: read `cities/{u}` then write `snapshots.u`), `beginAttempt(battle)` -> returns the
opponent snapshot (after ensureSnapshots), `submitResult(battle, stats)`, `resolveIfDue(battle)`,
`settle(battle)` (transaction: players/{me} trophies += trophyDelta (floor 0), wins/losses/draws, and
battles.settled.me = true), `searchPlayers(prefix)`, `recentPlayers()`.
Automatic behaviour while online: on every battles snapshot and every 5 s tick: ensure own snapshot
as soon as a battle enters `fight`; resolve due battles; settle finished unsettled battles; toast on
new incoming challenge / acceptance / fight start / result.

### 7.4 McpTokens
`generate(label)` -> `{token, hash}`: token = `'csk_' + base64url(32 random bytes)`; hash =
SHA-256 hex (crypto.subtle); write `mcpTokens/{hash}`. The raw token is returned ONCE and never stored.
`list()` (where uid == me), `revoke(hash)`.

## 8. PvP raid: the arena city (`src/combat/ArenaCity.js`)

- Built lazily once: `arenaRoads = new RoadNetwork(scene, assetFactory)`, `arenaBM = new BuildingManager(scene, assetFactory, arenaRoads, null)`,
  `arenaBM.isForeignCity = true`; no hooks are ever installed on it.
- `enter(snapshot)`: `restoreCity(arenaBM, {...fromCloudLayout(snapshot.layout), tasks: []}, Date.now())`
  (validate it first with cityRules.auditLayout; refuse obviously broken layouts), hide the home
  city (`buildingManager.buildingGroup.visible = false`, home `roadGroup` hidden, collectibles hidden),
  `vehicleController.setRoadNetwork(arenaRoads)`.
- `leave()`: `arenaBM.clearAll()` (after AttackManager's returnToBuilder cleanup incl. clearRubble),
  unhide home groups, `vehicleController.setRoadNetwork(homeRoads)`, collectibles visible.
- AttackManager gets `startBattleRaid({ battle, snapshot, opponentName, theme, onAttemptStart, onResult })`:
  pins `vehicleStats = garage.computeVehicleStats()`, `loadout = garage.getLoadout()`,
  `cardStats = garage.computeCardStats()` from the HOME city BEFORE entering the arena; points
  `this.buildings` at the arena for the whole raid; everything describing the target (defense, police
  cap, gem TH, loot, minimap) reads the arena; lives, loot credit, gems and garage stats come from the
  raider. `onAttemptStart` fires at the breach (commit point: the attempt is burnt from here).
  A battle raid has a `RAID_TIME_LIMIT_SECONDS` countdown on the HUD and ends with outcome `'timeout'`.
  `endAttack` calls `onResult({stars, percentage, destroyed, total, outcome, durationSec, loot})`
  immediately (idempotent submit), and the result modal shows the battle (opponent name, "Result sent",
  button "RETURN TO CITY"). `abortRecon` and `returnToBuilder` restore `this.buildings = home` and call
  `arena.leave()`. `startRecon()` with no args is the unchanged practice raid on your own city.
- Night theme: `SceneManager.setRaidTheme('day'|'night')` applied inside `setCameraMode` for recon/combat
  (moonlight, dim hemisphere, no env map, darker fog/background, stronger bloom, visible alarm light,
  exposure ~0.75); `setCameraMode('builder')` always restores day. A `SpotLight` headlight on the buggy
  is enabled only at night.
- The home city keeps autosaving/pushing normally during a battle raid (it is untouched), but CloudSync
  defers remote applies until the raid is over.

## 9. UI (`src/ui/OnlineUI.js` + index.html + styles.css; full screens, no native dialogs)

- Top bar: an account pill (`#btn-account`) showing "👤 Sign in" or "<name> · 🏆<trophies>" + a cloud
  status dot (synced / syncing / offline / error). Hidden entirely when online is not configured? No -
  shown, and the ACCOUNT screen explains how to configure Firebase.
- Home dock: new `#btn-open-battles` ("⚔️ BATTLES", sub "Challenge a rival") with a red badge counting
  battles that need action (incoming challenge, ready to attack). Existing ATTACK CITY stays (sub text
  becomes "Practice raid").
- ACCOUNT full screen (`#account-view`, `.shop-screen.account-screen`), tabs:
  **Profile** (sign in / sign up with email+password+commander name, Google button, or profile card with
  trophies, W/L/D, TH, cloud sync status, sign out) and **AI Designer (MCP)** (what MCP is, generate
  token with label, one-time token reveal with Copy, ready-to-paste config for Claude Code (stdio and
  HTTP) and Claude Desktop, token list with label / created / last used / Revoke, example prompts).
- BATTLES full screen (`#battles-view`, `.shop-screen.battles-screen`), tabs:
  **Active** (cards: opponent, mode/theme chips, phase + live countdown, actions Accept / Decline /
  Cancel / Ready / Design my city / ATTACK <name>), **Challenge** (player search + recent players list;
  choosing one opens an in-screen form: Instant (design time 0/2/5/10 min) or Scheduled (presets
  "Tonight 21:00", "Tonight 23:00", "Tomorrow 21:00" or a datetime input; Night theme toggle,
  auto-on for night hours), optional message, SEND CHALLENGE), **History** (finished battles: both
  scores, winner, trophy change).
- Design screen banner while any battle is in `design`: "🛡️ Battle vs <name> locks in mm:ss — design
  here or ask your AI designer (MCP)". While in `fight`: "⚔️ Battle vs <name> is live — attack from
  BATTLES". Countdowns tick with the existing 400 ms UI interval.
- Toasts for: incoming challenge, accepted, battle started, opponent attacked (result arrived), battle
  finished (+/- trophies), AI designer change applied.
- Result modal: for battle raids shows "BATTLE vs <name>", "Result sent ✓ / ⚠ not sent (retrying)",
  and "RETURN TO CITY". Gem shortfall copy says "their Town Hall" for battle raids.

## 10. MCP server (`mcp-server/`)

- Deps: `@modelcontextprotocol/sdk`, `firebase-admin`, `zod` (already installed).
- Imports the game's pure modules by relative path: `../../src/shared/cityRules.js`,
  `../../src/shared/battleRules.js`, `../../src/data/progression.js`.
- Transports: **stdio** (default; token from env `CITY_SIEGE_TOKEN`) and **Streamable HTTP**
  (`--http`, `PORT` default 8787, path `/mcp`, token from `Authorization: Bearer <token>` per request;
  `/healthz`). Stateless HTTP mode is fine.
- Firebase: `FIREBASE_PROJECT_ID` (default `demo-city-siege`); credentials from
  `GOOGLE_APPLICATION_CREDENTIALS` / `FIREBASE_SERVICE_ACCOUNT_JSON`, or `FIRESTORE_EMULATOR_HOST` for dev.
- Auth: sha256(token) -> `mcpTokens/{hash}`; must exist, `revoked !== true`, `scope === 'design'`.
  Cached 30 s. Updates `lastUsedAt` (throttled to once a minute) and `uses` (+1).
- Rate limit per token: 30 mutating calls / minute, 120 read calls / minute -> MCP error with retry hint.
- Every mutation = one Firestore transaction on `cities/{uid}`: read -> for each of the user's battles in
  `fight`/`resolving` lacking `snapshots[uid]`, write that snapshot FIRST (the lock) -> build the model
  -> apply ops with cityRules (all-or-nothing) -> write history doc `cities/{uid}/history/{oldRev}`
  (keep the latest 20) -> write the city with `rev+1, updatedBy:'mcp', writerId:'mcp:'+hash.slice(0,8),
  lastChange:{by:'mcp', summary, at}` and **leave `layout.savedAt` unchanged** (it is the production
  clock, not an edit clock).
- Tools (zod schemas; every result is text an LLM can read + `structuredContent` where useful):
  `get_city` (summary + ASCII map + battle deadlines), `list_buildings`, `get_catalog`,
  `get_rules` (placement rules in prose), `place_building`, `move_building`, `stow_building`,
  `remove_tree`, `add_roads`, `remove_roads`, `apply_design` (ops[], dry_run), `validate_design`
  (auditLayout + defenseReport + unused inventory), `get_battles` (read-only: opponent, phase,
  countdown, whether your snapshot is locked), `undo_last_change` (restore the latest history version
  if the current rev was written by MCP). NOTHING else - no attack, shop, upgrade, collect, gems.
- Prompts: `fortify_for_battle` and `tidy_city`.
- Tool descriptions must tell the model the coordinate system (gx east, gz south, centre 0,0, gates at
  N(0,-15) E(15,0) S(0,15)) and to call `get_city` first.

## 11. Testing (all must pass before we call it done)

- `node tools/online/test-shared.mjs` - cityRules + battleRules unit tests (Node, no emulator).
- `node tools/online/test-firestore-rules.mjs` - @firebase/rules-unit-testing against the emulator
  (project `demo-cs-rules`), every allowed and denied transition in section 6.
- `node mcp-server/test/run.mjs` - spawns the server over stdio with the MCP SDK client against the
  emulator (project `demo-cs-mcp`), exercises every tool incl. auth failures, rate limit, dry run,
  all-or-nothing, snapshot-before-edit, undo; plus the HTTP transport.
- `GAME_URL=... PW_CORE=... node tools/online/e2e-pvp.mjs <shotsDir>` - two browser contexts against a
  Vite dev server in emulator mode: sign up A and B, first-link upload, A challenges B (instant,
  design 120 s), B accepts, A generates an MCP token in the ACCOUNT screen, an MCP client places/moves
  buildings with that token and A's open game shows the change live (bm state + screenshot), both
  press ready, fight: A raids B's snapshot in the arena (scripted like smoke's winRaid), B raids A's,
  results + resolve + settle + trophies, A's own city is byte-identical before/after the raid,
  local save never contains the opponent's city. Screenshots of every screen.
- Existing: `node tools/verify-progression.mjs`, `node tools/verify-meshes.mjs`,
  `PW_CORE=... GAME_URL=... node tools/e2e/smoke.mjs` (offline mode) must still pass.

Emulators for dev/tests: `firebase emulators:start --only auth,firestore --project demo-city-siege`
(auth 127.0.0.1:9099, firestore 127.0.0.1:8085). Different test suites use different `demo-*`
project ids so they never clear each other's data.

## 12. Environment variables

Game (`.env.local` / `.env.emulator`, read by Vite):
`VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID,
VITE_FIREBASE_STORAGE_BUCKET (optional), VITE_FIREBASE_MESSAGING_SENDER_ID (optional),
VITE_FIREBASE_EMULATORS=true|false, VITE_FIREBASE_EMULATOR_HOST (default 127.0.0.1),
VITE_FIREBASE_AUTH_EMULATOR_PORT (9099), VITE_FIREBASE_FIRESTORE_EMULATOR_PORT (8085),
VITE_MCP_SERVER_URL (shown in the HTTP config snippet; default http://localhost:8787/mcp)`.

MCP server: `CITY_SIEGE_TOKEN, FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS | FIREBASE_SERVICE_ACCOUNT_JSON,
FIRESTORE_EMULATOR_HOST, PORT`.

## 13. Deviations log

(Implementers append here: date, file, what differs from the spec and why.)

- 2026-09-29, `src/shared/cityRules.js` (foundation): clarifications, all mirroring the game code.
  (a) **place `st`**: a unit back from storage gets `min(capacity(level), sealed)` for EVERY producer, not
  only vaults (GridSystem.handleTileAction does this; `sealed` is 0 for non-vaults, since their output was
  banked on stow). A fresh one gets `min(seed, capacity(level))`. (b) **stow credit** uses the layout's
  `st` (output at `layout.savedAt`), NOT output advanced to `ctx.nowMs`: with savedAt frozen by MCP writes,
  advancing would let stow -> place -> stow mint the same hours of output again and again. Output made since
  the game's last push is not credited for that one building (conservative). Credit ids are `'c' + ...`,
  written only when the payout is > 0. (c) **stow capacity** follows this spec (a depot being stowed does not
  count its own slots), which is STRICTER than the game's `canStow` (the game lets you stow your only depot
  and go over capacity). (d) `rot` on a spike trap / roadblock is ignored (they face along their wall links;
  restoreCity ignores it too), reported in the result message - not an error. `rot` must be a multiple of 90
  (360/-90 normalised), else BAD_ARGS. (e) `remove_roads` also accepts `path` (same expansion as add_roads);
  a path segment that changes both axes goes along gx first, then gz. (f) Check order = the game's:
  place: args -> type -> radius -> inventory -> LOCKED/AT_LIMIT -> overlap; move: NOT_FOUND -> IMMOVABLE ->
  UNDER_CONSTRUCTION -> radius -> overlap. A job whose `endsAt` has passed still counts as under
  construction (it only completes when the game restores it). (g) `catalogFor` returns an ARRAY of the
  unlocked types (road included, with a `note`); `applyOps` replaces `model.layout/holdings` only on
  success; `createModel` also accepts a local blob. (h) Extra exports: `normalizeHoldings`,
  `describeBuildings` (list_buildings rows), `expandPath`, `isValidBuildingId`, `gateIdFor`,
  `fixedGateAt`, `countsTowardDestruction`, `LAYOUT_LIMITS`, `ROLE_LETTER`. (i) `renderAsciiMap`: UPPERCASE
  letter on the tile a building stands on (its gx,gz), lowercase on the rest of its footprint; 2x2 and 3x3
  footprints are drawn 3x3 (exactly the tiles a 1x1 cannot take), so `.` always means "a 1x1 fits here".
  Letters by role: H hall, G gate, T turret, P spawner, X trap, B barrier, E producer, S storage/huts,
  A aura, R research, Y tree.
- 2026-09-29, `src/builder/BuildingManager.js`: `applyPreset` also keeps each building's id (same building,
  new slot), so a template does not invalidate the ids an AI is holding.
- 2026-09-29, `src/shared/battleRules.js`: `schedulePresets` returns all three picks with
  `available:false` + `reason` when one is past or under 10 minutes away (instead of dropping it);
  `battlePhase` returns `'expired'` for an unknown status; `respondDeadline` returns null while the
  timestamp it needs is not known yet (a pending serverTimestamp), and such a battle stays `pending`.
- 2026-09-29, fixtures `tools/online/fixtures/{default-city,th5-city}.cloud.json` (`{townHall, layout,
  holdings}`) are produced by `tools/online/fixtures/generate.mjs` from the real game. Their times are
  absolute (`layout.savedAt`, `tasks[].endsAt`): a test that restores one in the game and needs the Tesla
  Coil job still running must shift them by `Date.now() - layout.savedAt`.
- 2026-09-29, `firestore.rules` (security rules) - exact write shapes the rules enforce beyond section 6.
  Client code must write these (tests: `tools/online/test-firestore-rules.mjs`, 378 assertions).
  (a) **players**: create needs `usernames/{nameLower}` owned by the same uid, checked with `getAfter`, so
  write the claim FIRST or in the same batch/transaction (never profile-then-claim); create has
  trophies/wins/losses/draws all 0; keys = uid,name,nameLower,townHall,trophies,wins,losses,draws,createdAt
  (+ optional lastSeen), all timestamps real Timestamps. Update may touch only name,nameLower,townHall,
  trophies,wins,losses,draws,lastSeen; renaming needs the new claim the same way. **Trophies move only as a
  settle step**: per write at most one of wins/losses/draws goes up by 1, and trophies change by exactly
  +30 (win), +5 (draw), to `max(0, t-20)` (loss), or not at all. So presence must write only
  lastSeen/townHall/name, never a cached trophies value, and settle one battle per transaction.
  (b) **usernames**: `get` only (no list); id must be 3..20 of `[a-z0-9_ -]` with no edge spaces; body exactly
  `{uid}`. Delete only when the owner's profile (after the write) no longer uses that nameLower, so a rename
  is one batch: create new claim + update profile + delete old claim.
  (c) **cities**: keys = uid,name(<=40),townHall(1..12),rev,updatedAt,updatedBy,writerId(1..100 chars),
  layout,holdings (+ lastChange). `updatedAt` must be `serverTimestamp()` (or within 120 s) whenever it is
  written; layout keys exactly v(==1),savedAt(number),buildings(<=400),tasks(<=400),roads(<=450);
  holdings keys within inventory,stowedCounts,stowedLevels,stowedSealed,bankCredits (each a map). A client
  write that includes `lastChange` needs `by:'game'`, summary <= 200 chars. Push must set `updatedBy:'game'`
  explicitly (after an MCP write the stored value is 'mcp').
  (d) **saves**: keys within bank,garage,updatedAt; bank keys within cash,iron,wood,gems (numbers >= 0) and
  vehicleLives (int >= 0); garage any map.
  (e) **mcpTokens**: create body exactly {uid,label(<=40),createdAt,revoked:false,scope:'design'};
  createdAt `serverTimestamp()` (or within 120 s). `list()` must query `where('uid','==',me)` (an
  `orderBy('createdAt','desc')` is fine - composite index added). Owner may delete.
  (f) **battles create**: keys = mode,theme,status,challenger,opponent,players,names,townHalls,createdAt,
  ready,snapshots,attempts,results,settled + `designSeconds` (instant) or `startAt,fightEndsAt` (scheduled);
  `message` is OPTIONAL (<=140); a scheduled battle MAY carry `designSeconds` if it is one of the options
  (ignored). `createdAt` MUST be `serverTimestamp()`. `names`/`townHalls` may only have the two players'
  keys and MUST have the challenger's (names 1..40 chars, TH 1..12). The opponent must have a
  `players/{uid}` doc. No acceptedAt/winner/resolvedAt at create.
  (g) **accept** may also set the opponent's OWN `names`/`townHalls` entry (nothing else in those maps).
  Instant accept must write startAt AND fightEndsAt (= startAt + 900 s exactly, same Timestamp math).
  (h) **ready**: only own key, value `true`; a write that also moves startAt must happen when the doc
  already has the other player ready (use a transaction), startAt within 120 s of now and <= the old one.
  (i) **snapshot** value is exactly `{layout, townHall, name(1..40), rev, lockedAt}`; `townHall` and `rev`
  must ALSO equal the city doc (copy them from the city you just read in the transaction); `lockedAt`
  `serverTimestamp()` or within 120 s. Both players' snapshots may be written in one update.
  (j) **attempt** value is exactly `{startedAt: serverTimestamp()}`.
  (k) **result** value is exactly {stars,percentage,destroyed,total,outcome,durationSec,loot,finishedAt}
  with `finishedAt: serverTimestamp()`, `loot` exactly {cash,iron,wood} (numbers >= 0), stars/destroyed/
  total ints (total <= 1000), durationSec any number 0..660, and TWO checks beyond the spec, both true for
  `DestructionEngine.getStats()` output: percentage within 0.5 of `destroyed*100/total` (0 when total is 0),
  and outcome `'victory'` only at percentage 100.
  (l) **resolve** writes exactly {status:'finished', winner, resolvedAt: serverTimestamp()}; winner must
  equal `battleRules.decideWinner` (cross-checked on 26 randomised score pairs). **settle** writes only
  `settled.<me>: true`.
  (m) `firestore.indexes.json` also has `mcpTokens (uid asc, createdAt desc)`.
- 2026-09-29, `src/shared/cityRules.js` (foundation, addendum): `auditLayout` also accepts a bare layout (a
  battle snapshot's `layout`) or a local blob, not only a model. A NOT_IN_INVENTORY message also says when the
  type is locked or at its limit (the code stays NOT_IN_INVENTORY: the game checks the inventory first).
  Proof of parity with the real game: `tools/online/parity-check.mjs` (3540 probes: place 2200, move 550,
  draw/erase road 500, stow 280, clear tree 10 - every verdict and refusal reason agrees; stow differs only
  in the two MCP-only rules above).
- 2026-09-29, `mcp-server/` (MCP server engineer). (a) **Undo chains**: the first `undo_last_change` restores the
  latest history version (as specified); a second one steps one AI change further back instead of re-doing.
  Each history doc is `{uid, rev, name, townHall, layout, holdings, updatedBy, writerId, updatedAt, lastChange,
  archivedAt, replacedBy:{rev, kind:'edit'|'undo', summary, writerId}, undoTo}`; `undoTo` = the rev an undo of
  its successor restores (null = nothing further). (b) **Undo never moves money**: the restored version keeps the
  CURRENT `holdings.bankCredits`, every building still standing keeps its current `st`, and a producer that
  comes back after an AI stow returns with `st: 0` (its output was credited) - otherwise stow -> undo would mint
  the output twice. (c) An edit that changes nothing (e.g. add_roads over paved tiles) writes no version.
  (d) The lock query is `players array-contains uid, createdAt >= now - 8 days, orderBy createdAt desc` (the
  existing composite index; a battle can only need a lock within 7 days + 1 h of its creation); get_battles
  uses the same index with `limit(30)`. (e) HTTP: a request with NO `Authorization: Bearer` header gets HTTP
  401 (JSON-RPC error -32001 with instructions); a present-but-bad/revoked token is let through and every tool
  call answers `isError` "Access denied (UNKNOWN_TOKEN|REVOKED_TOKEN|...)", so the player sees why in the chat
  (tools/list works without a valid token). Rate limits are `isError` results `Rate limit reached
  (RATE_LIMITED)` + `structuredContent.retryAfterSec`, not JSON-RPC errors; `apply_design` with `dry_run`
  counts as a read. (f) Usage: `uses` counts every authenticated call but is written with `lastUsedAt` at most
  once a minute per token (first use at once, the rest accumulated and flushed on exit). (g) Extra env/flags:
  `HOST` (HTTP bind, default 127.0.0.1; Docker sets 0.0.0.0), `--port`, `--host`, `MCP_AUTH_CACHE_MS` (token
  cache, default 30000; tests lower it). (h) Extra optional tool args: `get_city.ids` (default true: appends
  the id list), `list_buildings.type`, `get_battles.include_finished`. Zero-argument tools have no input schema
  so a call without `arguments` works. (i) The snapshot `name` is the city doc's `name` (<= 40), else the
  battle's `names[uid]`, else 'Player'. (j) stdio needs Firebase ADMIN credentials on the user's machine, so
  it suits the emulator / the project owner; real players should use the hosted HTTP server (README says so).
- 2026-09-29, `src/net/*` + `src/main.js` (client online layer). (a) **Auth emulator project**: the web SDK sends
  only an API key, so browser sign-ups land in the Auth emulator's DEFAULT project (`demo-city-siege`, the one
  `emulators:start --project` names) whatever `VITE_FIREBASE_PROJECT_ID` says; Firestore data does follow the
  project id. Browser suites therefore share one auth user pool: use unique emails and delete only your own
  users - never `DELETE .../projects/demo-city-siege/accounts`. (b) **Echo suppression**: a push writes only when
  the city differs from what is known to be in the cloud - buildings (id/type/tile/level/rot; rot ignored for
  spike traps/roadblocks, which face along their links), jobs, roads, holdings - or a producer holds LESS than the
  cloud says (collected). Output merely growing is not pushed (cloud `st` stays a conservative lower bound). So
  applying an MCP edit never writes it back: the doc stays `updatedBy:'mcp'` and MCP undo keeps working.
  Likewise a link where the local city already equals the cloud city adopts the rev without rebuilding it.
  (c) **Bank + garage on link**: step 3 decides the CITY; the bank follows the cloud unless the cloud blob hashes
  to what this device pushed last (`meta.bankHash`), in which case the local bank (at least as new) stays and is
  pushed. Meta = `{uid, syncedRev, creditedIds, linkedAt, bankHash, fresh?}`. A guest save replaced by an
  existing cloud city is also backed up (`<key>.bak.guest`). (d) A push that finds a newer rev writes nothing,
  toasts, and queues that doc for the normal busy-deferred apply; pushes are not blocked while a remote change
  waits. Busy = attack state != IDLE, `attackManager.buildings !== home` or `attackManager.arena.active`,
  `gridSystem.dragBuilding`, `#redesign-modal` shown, or persistence suspended. (e) Economy/garage `save()` are
  wrapped from outside by OnlineController (the classes are untouched); an economy save schedules the bank push
  AND a city push (holdings live in the city doc). (f) **BattleService**: `beginAttempt` only prepares (locks,
  returns the opponent snapshot); the attempt is burnt by `startAttempt` (AttackManager's onAttemptStart, at the
  breach). `submitResult` writes a missing attempt first, queues the result in localStorage
  `city_siege_battle_results` and retries every tick until the grace ends; resolves `{ok}|{ok,already}|{ok:false,
  queued,error}`. `ensureSnapshots` and `setReady` flush a waiting city push first (the lock holds what was
  designed). `createChallenge` also fills the opponent's `names`/`townHalls` entries from `players/{opp}`.
  Automatic lock/resolve/settle: the challenger acts at once, the opponent only if still undone 3 s later (two
  simultaneous transactions on one battle doc fail a precondition - HTTP 400 + SDK retry - in both consoles).
  (g) `serverNow()` = local clock + an offset measured once per session from the presence write's server
  `lastSeen` (< 250 ms ignored); instant accept / ready compute startAt with it. (h) `window.citySiege.online`
  exists in offline builds too (`configured:false`, every action rejects `not-configured`); there only our
  `src/net/firebase.js` wrapper loads - no SDK chunk and no Firebase endpoint is requested.
- 2026-09-29, combat (`src/combat/ArenaCity.js`, `AttackManager.js`, `PoliceManager.js`, `VehicleController.js`,
  `src/rendering/SceneManager.js`, battle bits of `UIManager.js`/`index.html`/`styles.css`) - section 8 as built.
  (a) **`startBattleRaid(opts)` returns** `{ok:true, townHall, warnings}` or `{ok:false, reason:'BUSY'|'NO_LOADOUT'|
  'BAD_LAYOUT', message, errors?}`; on a refusal nothing changed and no callback fires. Extra options: `onExit(result)`
  fires once when the home city is back (ABORT RECON or RETURN TO CITY; `result` is null after an abort);
  `timeLimitSeconds` is capped at `BATTLE.RAID_TIME_LIMIT_SECONDS`. `snapshot` may be a battle snapshot, a fixture
  (`{layout,...}`) or a bare cloud layout. (b) **`onAttemptStart(battle)` fires when a gate is chosen**
  (`triggerCinematicBreach`, where ABORT stops being possible), once. (c) **The clock** is wall time from
  `launchBreach` (after the 1.5 s swoop), so a throttled/hidden tab cannot stretch it; `durationSec` is rounded to
  0.1 s, capped at the limit, and equals the limit on `'timeout'`. (d) **`onResult(r)` contract**: return a Promise
  (resolves `false` -> "⚠ Result not sent (retrying)", anything else -> "Result sent ✓", rejects -> not sent) or
  `true`/`false`; `undefined` leaves "Sending…" until the caller calls `attackManager.setBattleResultStatus('sent'|
  'failed'|'sending', detail?)` (also used for later retries; UIManager remembers it for a modal that opens later).
  endAttack called twice still sends one result. A battle's result modal is skipped if the city is already back when
  its 1.2 s timer fires. (e) **Arena**: `ArenaCity.prepare(snapshot)` refuses only on `auditLayout` ERRORS (warnings -
  overlaps, over-limit counts - are raided as locked); `enter()` also hides the home collectibles (so no home job
  completes mid-raid) and `update()` runs only mesh animators (the arena's full `update()` is never run - no
  production, bubbles or jobs). "Arena loaded" for CloudSync = `attackManager.buildings !== home` or
  `attackManager.arena.active` (both hold from startBattleRaid to onExit). (f) **Home save during a battle raid**
  (spec: keeps autosaving): nothing writes `city_siege_city` from recon through the raid; the ONE write is the loot
  payout's `economy.onUpdate` flush in endAttack, exactly as in a practice raid - same buildings/ids/tiles/levels/
  jobs/roads, only `savedAt` and producers' `st` move on. A caller that wants the stored city byte-identical across
  the raid can wrap it in `game.suspendPersistence()` / resume in `onExit`. (g) **Night theme**
  (`SceneManager.setRaidTheme`): exposure 0.75, env map off, moon 0xa9bcff x1.6 on the sun's direction, hemisphere
  0x5a6fae/0x10161f x1.7, background 0x03060d, combat fog 0x060a14 70-240 m, recon fog 260-760 m, bloom 0.9/0.55/0.6,
  alarm light decay 0 / 140 m / intensity x0.14, stars + a moon sprite (built once, then only toggled). The recon
  map gets moon x1.9 and sky fill x1.8 on top (a satellite night scan the raider can still pick a gate from;
  exposure unchanged). Day values are captured at boot and restored exactly; `setCameraMode('builder')` also resets
  the stored theme to 'day', and a practice `startRecon()` forces day. (h) **Headlight**: `VehicleController.
  setHeadlight(on)`, one SpotLight built on the first night raid and only toggled after (a light added/removed
  recompiles every lit material); it sits above/behind the bonnet so the cone also lights the buggy from the chase
  camera. (i) UIManager additions: `showBattleRaidHud(name, limit)`, `updateBattleRaidTimer(secondsLeft, running)`,
  `hideBattleRaidHud()`, `setBattleResultStatus(status, detail)`; `showResultModal` reads `stats.battle =
  {opponentName, durationSec, timeLimitSeconds, reports}` (adds "BATTLE vs", raid time, the delivery line, RETURN TO
  CITY, "their Town Hall" gem copy, and a height cap so it fits a 800 px window).
- 2026-09-29, UI (`src/ui/OnlineUI.js`, `UIManager.js`, `index.html`, `styles.css`, glue in `main.js` /
  `OnlineController.js`) - section 9 as built. (a) **BATTLES dock icon is 🏆**, not ⚔️: ATTACK CITY right above it
  already uses ⚔️ and two identical icons side by side read as one action. Label and sub text are as specified.
  (b) `OnlineController.attackBattle(id, { onExit })`: optional second argument passed through to
  `startBattleRaid.onExit`; OnlineUI uses it to reopen BATTLES after RETURN TO CITY / ABORT RECON (deferred one
  tick, because AttackManager shows HOME right after onExit). (c) `OnlineController._onCityReplaced` checks
  `reason === 'link'` before `by === 'mcp'`: a sign-in on a new device loaded a city whose last cloud change was an
  AI edit and toasted "🤖 AI designer: ..." as if it had just happened. (d) The spec's toasts are the controller's
  own (`online.toasts = true`); OnlineUI adds only toasts for the player's own actions (challenge sent, accepted,
  ready, token created/copied/revoked, errors). While ACCOUNT or BATTLES is open the toast sits at the bottom of
  the screen (at the top it covered the first card's header); on phones (<= 768 px) it is `max-content` wide
  (it used to wrap every word at half the screen width). (e) UIManager gets `onlineUI` (set by OnlineUI),
  screens `'ACCOUNT'` / `'BATTLES'` in `setScreen` (grid locked, `onlineUI.onScreen(screen)` after every switch),
  and `onlineUI.tick()` on the existing 400 ms interval. (f) The design banner is a child of
  `.design-bottom-drawer` positioned just above it, so it never covers the drawer or the tool dock at any height.
  During `fight` it only shows while the player still has a raid to use. (g) The night toggle of the challenge
  form is shown for both modes and follows the chosen start time (instant: now + design time) until the player
  flips it. (h) Inline confirmations instead of dialogs: token Revoke turns into "YES, REVOKE / Keep" for 5 s.
  Sign out and Cancel/Decline act at once (nothing is lost: the local save stays, a battle can be re-sent).
  (i) Phones (<= 600 px): the home top bar never fitted on one row and pushed its right end (the new account pill
  and the sound toggle) off the screen, so that group (`.top-bar-right`) is parked in the bottom-right corner.
- 2026-09-29, docs (`docs/ONLINE.md`, `docs/BATTLES.md`, `docs/MCP.md`, `mcp-server/README.md`, both READMEs,
  handbook `#raid`/`#saves`): the docs describe the code where it differs from this spec. (a) Section 11's
  `tools/online/e2e-pvp.mjs` is not in the repo (the two-browser PvP proofs were scratchpad scripts), so
  ONLINE.md gives a manual two-browser checklist instead. (b) The handbook's new battle numbers (10-minute raid
  clock, +30/-20 trophies) are static template text: `gen-handbook.mjs` does not read `battleRules.js`. (c) Every
  MCP example in MCP.md is real output of the server on the default-city fixture (captured against the emulator),
  and every mermaid diagram was rendered with mermaid 11 to prove it parses.
- 2026-09-29, e2e (`tools/online/e2e-pvp.mjs`, `tools/online/lib/e2e.mjs`): section 11 as built, plus two fixes.
  (a) **Scope**: everything in section 11 goes through the real screens (forms, cards, the Design inventory,
  a mouse drag on the map, a gate click on the recon map); the MCP client is the SDK Client over stdio,
  started with the env from the ACCOUNT screen's stdio snippet. Extra scenarios: design time "None" (both
  cities lock with no READY), an MCP edit saved mid-recon is held back and applied after ABORT RECON (which
  burns no attempt), a reload, and a network drop mid-raid (B stays on the page; A closes the tab while
  offline and reopens). (b) **Setup**: wipes its own Firestore project (default `demo-cs-e2e`) and deletes only
  its own auth users (emails ending `@e2e-pvp.test`) in the auth emulator's default project (client (a) above);
  failed requests to the emulator origins are allowlisted, and the SDK's failed requests inside the deliberate
  offline windows. (c) **"A's own city byte-identical before/after the raid"** is checked as: `cities/A`
  byte-identical (same rev - the raid pushed nothing), and the live serialization + local save identical
  except `savedAt` and producers' `st` (clocks that the loot payout's save moves on, combat (f) above). A's
  localStorage is scanned every 100 ms and every `setItem` inspected for B's building ids. (d) **Fix,
  `BattleService.submitResult`**: it read the battle with `getDoc`, which offline answers from the cache, and
  the cache already held the unsent result (latency compensation): the 5 s retry saw `results[me]`, dropped
  the localStorage queue entry and flipped the modal to "Result sent ✓" while the server had nothing; a tab
  closed before the network returned lost the result (the burnt attempt then counts 0★). It now reads with
  `getDocFromServer` (`_fresh(id, {server:true})`): offline the modal says "⚠ Result not sent (retrying)"
  and the queue entry stays until the server has the result (A/B in e2e section 12: 5 FAIL on the old line,
  0 with the fix). (e) **Fix, `UIManager._placeBattleRaidHud`**: the battle pill's CSS spot (under EXIT RAID)
  is only free on a wide screen; on phones, landscape phones and small tablets it covered the destruction
  tracker's damage/loot numbers and hid under the recon banner. It now drops below whichever of the recon
  banner / tracker / radar (+ its label) it would overlap, measured with the clock and on resize; at
  1280x800 it stays at top 66. Pre-existing phone crowding of the combat HUD itself (EXIT RAID over the
  tracker title, radar over the tracker, cards over the gauges) is unchanged.
- 2026-09-30, review fixes, MCP (`mcp-server/src/*`, `src/shared/cityRules.js`, one edit each in
  `src/net/OnlineController.js` + `src/ui/OnlineUI.js`). (a) **Supersedes section 10's "leave `layout.savedAt`
  unchanged" and cityRules (b)'s reasoning**: every MCP write (and every dry run and read) first advances each
  producer's `st` from `savedAt` to now with the new `cityRules.advanceProduction(model, nowMs)` (restoreCity's
  away credit: `storedAfter`, capped, during upgrades too; `st` FLOORED so it is never above what the game's own
  save carries, which would read as a collect; only forward - a `savedAt` ahead of now credits nothing) and the
  write stamps `layout.savedAt` = now. With savedAt frozen, a stow credited only the output of the game's last
  push (25,200 wood the game showed were lost, live) and the game's remote apply (`restoreCity(..., Date.now())`)
  gave a producer the AI had just placed the hours before it existed (a full 32,400 iron, one tap). Moving `st`
  and `savedAt` together credits every second once, so the stow -> place -> stow double mint (b) avoided cannot
  happen. `opStow` itself is unchanged (it still credits the model's `st`; the store advances the model first),
  so parity-check is unaffected. Undo keeps its rules with `st` advanced to now and `savedAt` = now.
  (b) **Writes are queued per uid inside the process** (`CityStore._serial`): parallel tool calls ran as
  contending transactions (2-12 s each on the emulator, some failing INTERNAL "Transaction is invalid or
  closed"); 6 parallel edits now take ~85 ms. A transaction the emulator closed under the SDK is run once more.
  (c) **Unrecognised tokens are throttled before their Firestore lookup** (`auth.js`): at most 20 lookups of
  unknown hashes per minute per caller (`source` = HTTP client address, `'stdio'` for stdio) and 200 per process,
  taken BEFORE the read and given back when the token exists; over it, `Access denied (AUTH_THROTTLED)` +
  `retryAfterSec`, no read. A hash that resolved once is never throttled. The token format is now exactly
  `csk_` + 43 base64url chars (what the game generates; was 20..200), so malformed tokens never reach Firestore.
  New env `TRUST_PROXY=1` (HTTP): the caller address is the last `X-Forwarded-For` entry. (d) **HTTP body over
  1 MB** is drained (up to 16 MB) and answered HTTP 413 with the JSON-RPC error and `Connection: close`, instead
  of a socket reset. `apply_design` takes at most 2000 road tiles + path waypoints over all its ops (`BAD_ARGS`
  beyond), so every accepted call fits under the cap. (e) **Placement feedback** (new cityRules exports
  `reachOf`, `reachText`, `roadRuns`, `roadRunsText`, `roadStatusOf`, `roadNoteFor`, `coverageReport`;
  `describeBuildings` rows gain `reach` and, for traps/barriers, `onRoad`, `nearestRoad`, `reachesRoad`):
  get_city lists every road tile by row (+ `structuredContent.roadTiles`); list_buildings shows reach in tiles
  and `[on road]`/`[OFF-ROAD]`; every place/move result of a trap or barrier ends "Road: ..." judged on the city
  after ALL ops of the call (+ `onRoad`/`reachesRoad` in the result); get_catalog adds reach at level 1 and the
  type's `helps` advice; get_rules gains a REACH section; validate_design adds COVERAGE (turrets whose range at
  their level reaches each Main Gate tile and the Town Hall; tile-centre distance x 5.5 m, mortar dead zone
  excluded, before aura bonuses) and ROAD PLACEMENT (traps whose trigger radius reaches no road tile centre,
  barriers not on a road), and says the score ignores placement. The map legend gains one line (a letter hides
  the road under it); the grid itself is unchanged. fortify_for_battle asks for COVERAGE and on-road checks and
  no longer presents the placement-blind score as the redesign's result. (f) **Claude Desktop snippet**:
  `mcpConfig()` adds `claudeDesktopHttp` (`npx -y mcp-remote <serverUrl> --header Authorization:${CITY_SIEGE_AUTH}`
  with `env.CITY_SIEGE_AUTH = 'Bearer <token>'`, `--allow-http` for a plain http:// URL other than localhost);
  the ACCOUNT screen shows it as "Claude Desktop - hosted server" (`#copy-src-cfg-desktop`) and the stdio JSON as
  "Claude Desktop - local server (stdio, for the project owner)" (`#copy-src-cfg-desktop-stdio`). Proven live:
  the snippet copied from the real ACCOUNT screen, run as-is, reached the HTTP server through mcp-remote.
- 2026-09-30, battles fixer (review findings; `src/shared/battleRules.js`, `firestore.rules`, `src/net/BattleService.js`,
  tests, plus the smallest edits in `OnlineController.js`, `OnlineUI.js`, `UIManager.js`, `AttackManager.js`,
  `styles.css`, `mcp-server/src/format.js`, `docs/BATTLES.md`, `docs/ONLINE.md`). Behaviour changes:
  (a) **VOID**: a battle where NEITHER player has a result is `winner: 'void'` (was 'draw', +5 each - farmable by two
  idle players). `decideWinner` returns 'void', `trophyDelta` 0, new `recordFieldFor(winner, uid)` -> null; the rules'
  `winnerOf` agrees; settle of a void battle writes only `settled.<me>: true` + `trophyChange.<me>: 0` (no players
  write); History shows "VOID ... Void - nobody attacked ... no trophies", the toast "void - nobody attacked, no
  trophies"; MCP get_battles says "FINISHED - void". (b) **Resolve as soon as the verdict is fixed**
  (`battleRules.resolveDue`, mirrored in resolveOk): both results; or `fightEndsAt` passed and every attempt has its
  result (`results.keys().hasAll(attempts.keys())` - nobody can attempt any more); or the grace is over. "Results close
  in" shows only while a started raid owes its result (`view.awaitingResult`). (c) **Trophy ticks are bound to a
  settled battle** (the minting hole: `updateDoc(players/me, {wins+1, trophies+30})` was allowed). `players` gains
  optional `lastSettled` (battle id) and `lastChallengeAt`; a W/L/D tick must name in `lastSettled` a finished battle
  with this player whose `settled.<uid>` is absent before and set by the same batch, and the counter must be the one
  its winner gives (`settledTickOk`); a write without a tick may not move `lastSettled`. `settleOk(battleId)` requires
  `trophyChange.<me>` (int) and, except for void, the players record step in the same transaction: `lastSettled ==`
  this battle, the right counter +1, and `trophyChange == trophies after - before`. A loser can still simply never
  settle (documented in the rules header and ONLINE.md). (d) **`battles.trophyChange.{uid}`**: what settle really
  moved (a loss at 0 trophies moves 0). `view.trophyDelta` is that value once settled (else the nominal step,
  `view.trophyDeltaNominal`); the "finished" toast fires when MY settle lands, with the applied change ("Defeat (no
  trophies to lose)"); History shows "±0 🏆 already at 0". (e) **Battle ids** must match `^[A-Za-z0-9_-]{1,64}$`
  (create rule; stored XSS through `data-battle`/`data-id`), and OnlineUI escapes every rendered id. (f) **Challenge
  cooldown** `CHALLENGE_COOLDOWN_SECONDS = 10` (rules + JS constants block): createChallenge is one batch - the battle +
  `players/{me}.lastChallengeAt: serverTimestamp()`; the create rule reads the stamp before/after (`getAfter` == now,
  the old one >= 10 s old); a client-chosen `lastChallengeAt` is refused; the client pre-checks and says "Wait N s".
  (g) **`BattleService.listen`** follows TWO queries (supersedes 7.3's single `limit(30)`): live = `players
  array-contains me, createdAt >= now - 8 days, orderBy createdAt desc` with NO limit (lock/resolve/settle/Active),
  plus history = the newest 30; `raw` is their union and the first list waits for both (no false "challenged you"
  toasts). Same composite index. (h) **`MAX_OPEN_BATTLES`** counts commitments only: design/fight + pending challenges
  I SENT (incoming offers never block accepting or sending); `BattleService.openCount()`; the challenge form uses the
  same count. (i) **Lock**: each client locks its OWN city at startAt (after `cloudSync.flush()`); the other player's
  city only from `startAt + LOCK_GRACE_SECONDS` (15, rules-enforced in `snapOk` for a non-owner writer) if its owner's
  game has not locked it. `beginAttempt` waits up to that grace for the opponent's own lock ("PREPARING RAID…"), then
  locks their cloud city itself. Supersedes the "either player's snapshot" line of 6 and client (f)'s "challenger
  locks both". (j) **Attack cutoff** `ATTACK_CUTOFF_SECONDS = 30` (JS only): `canAttack` is false in the last 30 s
  (`view.attackClosed`; the card says "Too late to start a raid"); `beginAttempt` refuses with "Too late: the fight
  window closes in N s ...". `startBattleRaid` takes `commitBy` (Date.now() ms, = fightEndsAt - 3 s on the local
  clock): the recon pill shows "PICK A GATE WITHIN m:ss" when that is nearer than the raid clock, and at it the recon
  ends by itself (toast, no attempt burnt, BATTLES reopens); `triggerCinematicBreach` refuses a gate past it.
  `UIManager.updateBattleRaidTimer(secondsLeft, running, note?)`. (k) **Refused breach / closed result**:
  `onAttemptStart` failure toasts at once ("The fight window closed before your breach - this raid will not count",
  or "did not reach the battle yet ... retried when the raid ends") instead of only setting `lastError`;
  `submitResult` returns `{ok:false, queued:false, closed:true}` and drops the queue entry when the battle closed or
  when there is no attempt on the server and `fightEndsAt` has passed; `onResult` resolves `'closed'`, and
  AttackManager passes a string result through as the status (corrects combat (d)): UIManager status `'closed'` = "✗
  Not counted: the battle had closed before this raid could count". (l) **Interrupted raid**: an attempt with no
  result, nothing queued and no raid running on this device reads "✗ Raid interrupted (page closed) - counts as no
  raid"; the opponent's "raiding now…" becomes "raid interrupted (no result)" after `startedAt + RAID_TIME_LIMIT +
  60 s` (`view.myAttemptStartedAtMs` / `theirAttemptStartedAtMs`). (m) Accepting a scheduled challenge toasts "The
  battle starts <when> - design your city until then." (n) `OnlineController._clearError(scope)`: every battles
  snapshot clears a 'battles' `lastError`, so the red banner only means "cannot load battles". (o) **Design banner**
  under `max-height: 500px` is anchored to the drawer's right end (`max-width: calc(100vw - 250px)`), clear of the
  tool dock (corrects UI (f): at 844x390 it covered Erase Roads, at 915x412 Select / Move). Seen while proving it and
  NOT changed (pre-existing, not the banner): on landscape phones the design drawer itself overlaps the lower tool
  buttons (844x390: 3 of 9 sample points of Select / Move; 667x375 and 568x320 more). (p) **Empty deck**: ATTACK on a
  battle card opens the garage with `ui.garageBattle = {id, name}` and `garageReturnScreen = 'BATTLES'`; the garage
  button reads "⚔️ ATTACK <name>" and calls `onlineUI._attack(id)` (the battle raid, not a practice raid);
  `openGarage` / BACK clear it. (q) Tests: `test-firestore-rules.mjs` 378 -> 431 assertions (new: minting, settle
  binding, void, early resolve, id charset, cooldown, lock grace; each new check proven by a mutation of the rules
  that makes its tests fail); `test-shared.mjs` battleRules 62; `e2e-pvp.mjs` section 8 now expects B's floor loss to
  read "Defeat (no trophies to lose)" / "±0 already at 0".
- 2026-09-30, game fixes (`src/rendering/SceneManager.js`, `src/styles.css`, regression block at the end of
  `tools/e2e/smoke.mjs`). (a) **Night theme values** (supersede combat (g) above): hemisphere 0x5a6fae / ground
  **0x3a4868 x4.0** (was 0x10161f x1.7), moon **x1.9** (was 1.6), exposure **0.95** (was 0.75), combat fog
  **90-300 m** (was 70-240), recon multipliers **1.0 / 1.0** (were sky fill x1.8, moon x1.9). Unchanged: moon colour
  and direction, env map off, background, fog colour, recon fog, bloom, alarm, stars. Why: a raid from the North Gate
  drives toward the moon, so every wall it sees is backlit and lit by the hemisphere alone; with the near-black
  ground colour 64% of target-building pixels and 56% of road pixels were below luma 20/255 and cops beside the buggy
  showed only their light bars. The ground colour lights walls (half their hemisphere light) but not the grass, so it
  lifts buildings and cars while the grass stays dark; the moon stays low because it is what lights the grass and,
  near x2.9, pushes white walls past the bloom threshold. Measured on the TH5 fixture at 1280x800 (real
  startBattleRaid, frozen frame, HUD hidden): North Gate inside, buildings p50 12 -> 47 with 64% -> 32% below 20 (day
  33%), roads 47% -> 22% below 20, cop contrast against what is behind them 25 -> 51; South Gate buildings 49% -> 18%
  below 20; whole frame 22-26 -> 37-42 mean luma (day 61-65, sky still black with stars). Recon keeps its old
  brightness (frame 43 -> 45) because the new exposure alone makes up for the dropped multipliers, and with equal
  recon/combat values the night swoop no longer steps down (hemi 3.06 -> 1.7, moon 3.04 -> 1.6) on its last frame.
  (b) **Wheel over full screens**: the builder wheel listener returns before `preventDefault` when the event comes
  from `.shop-screen`, `.modal-backdrop` or `#inspector-modal` (a pinch, `ctrlKey`, is still swallowed there so the
  browser never zooms the page). The builder camera is active behind SHOP, GARAGE, BATTLES and ACCOUNT, so the wheel
  zoomed the hidden city (68 -> 98) and no screen scrolled with a mouse or trackpad: ACCOUNT > AI Designer (1558 px of
  content in 721 px) had its token list and Revoke out of reach. The map (HOME, DESIGN) and the recon map still zoom
  with the wheel. (c) **Landscape phones** (`max-height: 500px`): the account pill + sound group is parked in the
  bottom-right corner as on narrow phones (the rule is now `(max-width: 600px), (max-height: 500px)`); the home dock
  drops the sub lines and tightens its buttons (top 88 px) so all five fit down to 360 px tall, and the home top bar
  loses its subtitle and tightens the tickers so the labour badge fits at 667 px. At `max-height: 340px` (568x320)
  the dock scrolls. Before: at 844x390 DESIGN MAP was 0% on screen and the sound toggle off the right edge; at
  667x375 and 740x360 the pill too. Desktop, tablet and portrait-phone layouts are unchanged (same rects). Not
  changed (pre-existing at HEAD): on a portrait phone (390x844) the dock's first button overlaps the wrapped brand
  pill and the right end of the resource tickers is off-screen.
- 2026-09-30, sync fixes (`src/net/CloudSync.js`, new `src/net/cityMerge.js`, `src/net/OnlineController.js`,
  `src/builder/EconomyManager.js`; small edits to `firestore.rules` saves, `src/ui/OnlineUI.js` Profile card, docs).
  Tests: `tools/online/test-sync-merge.mjs` (Node, 43) and `tools/online/e2e-sync.mjs` (Chrome + emulators + the real
  MCP store, 48 PASS; the same suite against the previous CloudSync: 30 FAIL, every scenario A-J). Supersede 7.1 and
  client (b)/(c)/(d) above where they differ. (a) **Rebase instead of "remote wins"**: when a newer cloud city arrives
  (listener, push conflict, or at link for the same account) while this page has unpushed changes, `rebaseCity(base,
  local, remote)` builds the result: the remote DESIGN (presence, tiles, rotation, roads) and holdings; for buildings
  standing on both sides, level + build job from whichever side changed them since `base` (MCP never does, so local
  wins against it; another device's level-up stands where this one changed nothing), re-indexed onto the remote list;
  `st` = the lower of the two sides advanced to now (a collect on either side stands); shop purchases re-added:
  `purchase[t] = max(0, (localInv - baseInv) + (localCount - baseCount))` (road: tiles). Beyond the minimum: road
  tiles drawn/erased here and buildings moved/turned here that the remote did not touch are REPLAYED with
  `cityRules.applyOp` (same radius/overlap/inventory/limit checks as MCP ops; a building with a job is not moved; one
  that no longer fits is dropped, its unit staying in the inventory); a building placed here goes back to the
  inventory; a job started here on a building the remote removed is refunded (`costForLevel(t, to)`, as the game
  refunds a stowed job); a building the remote stowed keeps the level it reached here (stowedLevels); a remote stow
  credit for output this device had already collected is held back (surplus = credit's pricing, `base` st advanced to
  the remote savedAt, minus local st; only when the remote added a `stow <type>` credit). Merged `savedAt` = now. The
  result is pushed at once on top of the remote rev (`updatedBy:'game'`, so that MCP edit is no longer undoable - it
  was merged with the player's work). `base` = the cloud doc this page last synced (`{rev, layout, holdings}`), kept in
  memory and in `localStorage.city_siege_cloud_base` (with uid) so an offline session / a reload rebases too; with no
  valid base (old meta, another account) the old "cloud wins" apply runs. Toasts say "Your own changes here were kept."
  (b) **Push timing**: the debounce (1.5 s) can no longer be restarted past 3 s after the first unpushed save
  (`_dirtySince`); an economy save that changed cash/iron/wood/gems/lives calls `pushSoon()` (a microtask: the action
  finishes mutating first), inventory-only saves (a road tile) keep the debounce. A push requested while one is in
  flight runs right after it (was: debounced again). (c) **Collect detection**: `_needsPush` compares each producer
  with `storedAfter(type, level, cloud st, now - cloud savedAt)` (tolerance 2 units + 1 s of output); the raw `<`
  compare missed every collect after the first. (d) **Per-page rev**: `syncedRev`/`base` live in memory per page; the
  meta copy is only the boot hint. Two tabs are two writers that apply and rebase each other's pushes; storage-blocked
  browsers no longer conflict on every push. Our own write seen back with a rev we never got a reply for (a dropped
  connection) is adopted as synced. (e) **Bank** (`saves/{uid}`): written in a transaction - if the doc is not what this
  page last synced (`bankBase`, kept in meta), the write is `cityMerge.mergeBank` = theirs + (local - base) per resource
  (floor 0; lives capped), garage levels/unlocks by max, the deck from the side that changed it; the live bank then
  gets whatever changed during the transaction on top. `saves/{uid}` is followed with onSnapshot and merged the same
  way (deferred while busy; snapshots at or before the newest state a transaction already read are ignored, by
  `updatedAt`). At link the same merge replaces "bankIsOurs" when a base is known. (f) **Credits ledger**: MCP stow
  credits are no longer paid into the live bank on apply; they become `pendingCredits` (meta) and the bank transaction
  pays those not in `saves.credited` and appends their ids (last 100) - once per account, whichever device first. The
  game no longer pushes the city only to clear `bankCredits` (it wrote `updatedBy:'game'` and ended MCP undo): a push
  writes the still-unpaid credits and drops paid ones. **Rules**: `saves` keys may include `credited` (list, <= 100);
  the client only writes it when non-empty, but a deployed project must get the new `firestore.rules` before an AI stow
  credit can be paid. (g) **Account switch without a bank doc**: `_linkBank` for another account (or a guest) takes that
  account's cloud bank, or `EconomyManager.starterBank()` + the default garage when `saves/` is missing (it used to
  keep and push the previous account's bank). (h) **Guest city**: when a guest save is replaced by an existing account
  city (and differs from it), `city_siege_guest_backup` notes it (`{uid, townHall, buildings, roads, cash, iron, wood,
  gems, at}`); the sign-in toast says it is kept; ACCOUNT > Profile shows a card with RESTORE GUEST CITY (restores
  `<key>.bak.guest` with savedAt = now, backs up the account's local save to `.bak.<uid>`, pushes the city as the next
  rev and the bank with force) or KEEP MY ACCOUNT'S CITY (hides the card; the backup stays). API:
  `online.guestBackup() / restoreGuestCity() / dismissGuestBackup()`; `city-replaced` gains reason `'restore'` and
  `rebase` (the merge report). (i) The trophy-forging finding assigned here is the battles fixer's `players.lastSettled`
  rule (verified: 10 bare `wins+1/trophies+30` updates and 10 with a fake `lastSettled` are all `permission-denied`).
- 2026-09-30, final integration (docs, scripts, repo hygiene). (a) **Admin key hygiene**: new
  `city-siege-3d/.gitignore` ignores `*firebase-adminsdk*.json` (the name the Firebase console downloads a service
  account key under, `<project>-firebase-adminsdk-<id>-<hash>.json`, which the repo root's `*service-account*.json`
  missed: `git check-ignore` exited 1 for it) and `*-sa-key*.json`; `mcp-server/Dockerfile.dockerignore` matches key
  names at any depth (`**/*service-account*.json`, `**/*firebase-adminsdk*.json`, `**/*-sa-key*.json`,
  `**/*.json.key`; the old root-only patterns let a key in a subfolder into the build context). ONLINE.md step 9 and
  MCP.md say to keep the key outside the repo. (b) **npm scripts**: `test:parity` (parity-check.mjs; needs `GAME_URL`
  of an offline Vite + `PW_CORE`), `test:e2e` (e2e-pvp.mjs; needs `GAME_URL` of an emulator-mode Vite for
  `FIREBASE_PROJECT_ID`, `PW_CORE`), `fixtures` (fixtures/generate.mjs; offline Vite + `PW_CORE`). (c) **e2e suites**:
  `e2e-pvp.mjs` and `e2e-sync.mjs` take `E2E_EMAIL_SUFFIX` (defaults unchanged: `@e2e-pvp.test`, `@e2e-sync.test`),
  so two runs sharing the auth emulator's one user pool no longer delete each other's users. e2e-pvp section 12's
  "queue emptied" check now waits up to 3 s for A to drop its queue entry after the admin SDK sees the result (the
  client drops it only after its own write acknowledgement, which can arrive later: the one-in-84 flake the
  battles fixer reported). (d) **Docs now state the real sync windows** (review finding): "unsent" is the whole
  offline session or unpushed editing period, not only the 1.5 s debounce; a device that has not seen another's
  spend can spend the same money again (no simultaneity needed); without a rebase base the cloud simply wins; an AI
  edit merged with unsent game changes is saved by the game and ends the undo chain. Also: the lock FAQ (own game
  at start, opponent's only 15 s later), result retries about every 10 s, void in README/handbook, `TRUST_PROXY` in
  the env tables, the Testing table rebuilt on the npm scripts with this run's counts.
- 2026-09-30, review round 2, MCP (`mcp-server/src/{auth,rateLimit,http,store,tools}.js`, `src/shared/cityRules.js`).
  (a) **Unknown-token throttle no longer locks players out** (it did: 200 junk tokens a minute from 10 addresses
  refused every token the process had not seen yet, i.e. every player after a restart and every new token, and 20
  from one NAT address refused everyone behind it with "copy your token again"). `MISS_LIMITS` is now `{source: 20,
  global: 1000, quiet: 500}`: `global` is a cost cap, and past it a caller with at most `QUIET_LOOKUPS` = 3 lookups
  this minute (this one included) still gets its lookup from the `quiet` lane, so a lockout now needs ~50 flooding
  sources plus ~170 more fresh ones in the same minute; worst case ~1500 reads a minute per process (was 200).
  The per-source key is `sourceKey(addr)`: IPv4 (also IPv4-mapped, with a port) as is, IPv6 by its /64. Parallel
  calls with one token share one read (`inflight`); a hash found missing leaves `known`. Refusals are labelled
  `Try again later (AUTH_THROTTLED)` (was "Access denied") and say the token was not checked (no "copy it again").
  `known` stays per process (documented: empty after every restart). The HTTP server logs a warning once when a
  request carries `X-Forwarded-For` without `TRUST_PROXY`. The per-address budget still pauses new tokens for
  everyone behind an address that floods (inherent to counting by address). (b) **Undo settles output** (new
  `cityRules.carryOutputForUndo(cur, restored, ctx)`, used by `CityStore.undo`; `opStow`'s credit code moved into
  the shared `creditOutput`, behaviour unchanged, parity 280/280 stow probes): a producer the undo takes off the map
  (the undone change placed it) had its output silently dropped (32,400 iron live); it is now credited like a stow
  (`bankCredits`, reason `stow <type>` so cityMerge's rebase guard treats it as one), named in the reply and in
  `structuredContent.credits`. A vault's cash stays sealed: sealed lists now follow the CURRENT holdings (a vault
  that comes back takes its stow's sealed cash out again - it used to come back with the older version's stale
  `st`), and a vault sent back to the plain inventory is kept stowed (`stowedCounts` +1, may read one over the
  depots' slots) because only a stored unit can hold sealed cash. (c) **get_city PENDING BANK CREDITS** counts only
  credits whose ids are not in `saves/{uid}.credited` (`CityStore.paidCredits`, `getAll` with `fieldMask:
  ['credited']`: the server's only read of `saves/`, never the bank); `summary.pendingBankCredits` likewise.
- 2026-09-30, review round 2, battles (`firestore.rules`, `src/shared/battleRules.js`, `src/net/BattleService.js`,
  `src/ui/OnlineUI.js`). (a) **Challenge cooldown per challenge, not per batch**: `challengeCooldownOk(uid, battleId)`
  also requires `getAfter(players/{challenger}).lastChallengeId == battleId`; `players` gains optional
  `lastChallengeId` (`[A-Za-z0-9_-]{1,64}`, may change only together with `lastChallengeAt == request.time`), and
  `createChallenge` writes `{lastChallengeAt: serverTimestamp(), lastChallengeId: ref.id}`. A batch leaves one value
  there, so one stamp pays for exactly one create (one batch of 499 creates with one stamp used to pass). Clients
  and rules must be deployed together: the old client write (no `lastChallengeId`) is refused by the new rules, the
  new one by the old rules. Not changed (deferred): one account may still send one challenge per 10 s, each
  scheduled one pending up to 7 days, and the live listener and the MCP lock query read every one of them; bounding
  that needs a status-filtered listener and a new composite index (players, status, createdAt). (b) **Views follow
  the clock**: new pure `battleRules.nextChangeAt(b, nowMs)` (respond deadline, startAt, startAt + LOCK_GRACE, the
  attack cutoff, fightEndsAt, the result grace end, and `raidEndsBy` = attempt + RAID_TIME_LIMIT + 60 s for a raid
  without a result) and `raidEndsBy(b, uid)`. `BattleService._refresh` arms one timer for the soonest such moment
  (+250 ms) that refreshes and runs `_auto`, so canAttack/attackClosed/needsAction, the dock badge and the Design Map
  banner change at the cutoff with no Firestore change (they changed only on a snapshot or a phase change);
  `OnlineUI._attack` refused after the cutoff toasts "⌛ Too late: the fight window closes in N s ...". (c) **Where a
  started raid runs**: view gains `myRaid` ('here' | 'tab' | 'lost' | 'away' | 'over', for my attempt without a
  result and nothing queued), `theirRaidOver` and `raidsOver`. localStorage `city_siege_battle_raids` = `{battleId:
  {uid, beat, dead?}}` is written by the page that runs the raid from the breach (`startAttempt`) until its result is
  queued (`submitResult`), beaten every 5 s tick, marked `dead` on `pagehide`; other tabs redraw on its `storage`
  event. So another tab reads "⏳ raid in progress in another tab" (was "✗ Raid interrupted (page closed)"), a reload
  or closed tab "✗ Raid interrupted (page closed) - counts as no raid" at once, no trace in this browser "⏳ raid in
  progress on another device" until `raidEndsBy`, then "✗ Raid interrupted (no result)". The resolving card uses the
  same texts (was "no raid" / "waiting…" for up to 11 min) and says whether the verdict waits for a raid in progress
  or only for the results to close. (d) **"is live" toast** (`started` event) fires when the battle is in `fight` AND
  both cities are locked (was: at the phase change, while the card still said "locking…"); the card's Cities line
  says "🔒 yours · waiting for <name>'s city to lock (up to 15 s)" meanwhile. (e) **History** is sorted by the date
  each row shows (finished: startAt, else createdAt), newest first (was createdAt, so a scheduled battle played
  after later-created instant ones sat below them).
- 2026-09-30, sync review round 2 (`src/net/CloudSync.js`, `src/net/cityMerge.js`, `src/net/OnlineController.js`;
  small edits to `firestore.rules` (`writers` on cities + saves), docs). Supersedes the sync entry above where they
  differ. Tests: `test-sync-merge.mjs` 71 (was 43; the new ones fail 18 times on the previous cityMerge + ledger),
  `e2e-sync.mjs` scenarios K-P. (a) **Write tokens**: every game write of `cities/{uid}` and `saves/{uid}` appends
  `'<sessionId>.<n>'` to the doc's `writers` (list, last 8; rules: optional list <= 8; the MCP server's `tx.update`
  leaves it alone). A write whose reply was lost is recognised by its token when the doc is read again. City: every
  push is "in doubt" (`_cityDoubts`, also in localStorage `city_siege_cloud_doubt` `{uid, list: [{token, rev,
  layout, holdings}]}`) until its reply; any read of the city (link, listener, push conflict, remote apply) that
  carries the token makes that push the base (`_settleCityDoubts`), so an AI / other-device write on top of a push
  whose reply was lost is no longer rebased against the older base (a purchase was added twice); a read at or past
  its rev without the token drops it. Bank: the transaction adopts `cur` when it already carries this push's token
  (the SDK re-ran it after a lost reply: the collect / spend / credits used to apply twice); a push that fails after
  writing keeps `{token, merged, local0}` as `meta.bankDoubt`, settled by the next server read (`getDocFromServer`
  before the next bank push, the saves listener, or link): landed -> `_bankSynced(merged, local0)`. Deployed projects
  need the new rules before any sync write succeeds (old rules refuse the `writers` key). (b) **Credits ledger**:
  the bank transaction also reads `cities/{uid}`; `cityMerge.planCredits` pays a pending credit only while the city
  carries it and `credited` does not list it; `credited` keeps EVERY paid id the city still carries (was: the last
  100, so with > 100 credits alive the oldest were paid again on every later apply); only as many are paid as leave
  room under the rules' 100 (oldest first), and when that blocks some, the game pushes the city once (forced, ends
  MCP undo) so it keeps only unpaid credits. Pending credits the applied / read city no longer carries are dropped
  (a credit leaves the city only once paid). (c) **Credit hold-back** is per credit (`report.creditHoldback[id]`),
  applied to the pending credit before it is paid (`_queueCredits`), never subtracted from the live bank (floored at
  0, it minted whatever of the collect had been spent). Credits are matched to the producer they paid for by type
  and closest amount at the credit's own `at`. Stowed here AND by the AI: the whole credit is held back (the stow
  here banked it; was paid twice). Collected here, stowed by the AI: held back = credit - (output made after the
  last collect here up to `credit.at`), only when a collect is detectable (store below the untouched projection).
  (d) **Replays**: stows made here are replayed (the game's stow: level reached here, sealed vault cash, storage
  slot needed; trees too; skipped when the remote moved/turned the building - its design wins) and placements made
  here are replayed with `applyOp('place')` (local id, level, output and job kept; storage taken first as the game
  does). The level a building had when stowed here comes from the stowedLevels entries gained since base. A
  placement that no longer fits goes back to the inventory with its levels (into storage if fresh; output banked:
  `report.bankedOutput`) and `returnedToInventory` makes the toast say "A building you placed here no longer fits
  and is back in your inventory: place it again." (not counted as "kept"). `settleLevels` then makes each touched
  type's upgrade levels (map + storage + jobs) = remote + (local - base) - refunded jobs. Before: a building
  gem-finished and stowed here came back at the old level with its job gone, and one placed + upgraded here went
  back to the inventory at level 1, silently. (e) **Link "local is ahead"** = same account and cloud rev == the rev
  this device last synced (after settling doubts); the `savedAt` comparison is gone (the MCP stamps `savedAt` with
  its own clock: a device clock behind it lost its unsent changes). Pre-existing and documented, not changed: when
  two devices both change the same building's level/job before seeing each other, this device's wins.
- 2026-09-30, mcp-server/src/store.js (orchestrator): every MCP write transaction (edit and undo) also reads `saves/{uid}.credited` (field mask, before any write) and drops those already-paid ids from `holdings.bankCredits`. Closes review-2's deferred "server-side pruning": paid credits no longer pile up in the city between game pushes, so the client's 100-id `credited` window cannot fill while the AI iterates, and the game never has to push just to clear them (which ended the AI undo chain). Regression checks in mcp-server/test/run.mjs ("an AI write drops the credits saves.credited already holds", "undo restores the road but not the paid credits").
- 2026-09-30 (orchestrator, user choice "merge rules, share DB"): the live project is the existing `shadow-duel-dark-2026` (Spark plan, shared with the Shadow Duel game). firestore.rules now ends with Shadow Duel's live rules (entitlements/profiles/rooms, helpers renamed sd*; verified identical apart from the renames) and test-firestore-rules.mjs pins them (13 assertions). Web app `city-siege (web)` registered; config in git-ignored `.env.production.local` (mode production: `npm run build`, `npm run dev:live`), so plain `npm run dev` stays offline. `npm run deploy:rules` deploys rules + indexes; `.firebaserc` alias `prod`. Rules and indexes deployed and verified equal to the local file. Authentication is not initialized on the project yet (console step for the owner).
