# City Siege MCP server

An [MCP](https://modelcontextprotocol.io) server that lets an AI assistant (Claude Code, Claude
Desktop, any MCP host) **design** a City Siege player's city: place buildings from the player's
inventory, move or stow them, clear trees, and draw or erase roads. Every change is written to the
player's city in Firestore, and the game, if it is open, shows the change live.

The server can only design. There is no tool to attack, buy, upgrade, collect, spend, or touch
gems, the bank or the garage. The player does all of that in the game.

Every edit goes through `src/shared/cityRules.js`, the same pure rules module the game uses, so the
AI cannot make a layout the game would refuse. See `docs/ONLINE_SPEC.md` section 10 for the contract.

This README is for running and testing the server. The player guide, with the full tools reference
(real example calls and results), connection recipes and Cloud Run hosting, is
[`docs/MCP.md`](../docs/MCP.md). Setting up the Firebase project is [`docs/ONLINE.md`](../docs/ONLINE.md).

## Contents

- [How it fits together](#how-it-fits-together)
- [Install](#install)
- [Get an access token](#get-an-access-token)
- [Running it: HTTP (hosted) or stdio (local)](#running-it-http-hosted-or-stdio-local)
- [Connect Claude Code](#connect-claude-code)
- [Connect Claude Desktop](#connect-claude-desktop)
- [Environment variables](#environment-variables)
- [Tools and prompts](#tools-and-prompts)
- [Coordinates and the map](#coordinates-and-the-map)
- [What an edit does in Firestore](#what-an-edit-does-in-firestore)
- [Errors](#errors)
- [Limits](#limits)
- [Development and tests](#development-and-tests)
- [Hosting (Docker, Cloud Run)](#hosting-docker-cloud-run)
- [Security notes](#security-notes)

## How it fits together

```
 AI assistant (MCP client)
    |  stdio  (CITY_SIEGE_TOKEN)        or   Streamable HTTP POST /mcp (Authorization: Bearer <token>)
    v
 city-siege-mcp  --sha256(token)-->  mcpTokens/{hash}  -> uid        (revoked? scope 'design'?)
    |  cityRules validates every op (all-or-nothing)
    v
 Firestore cities/{uid}   rev+1, updatedBy 'mcp'   -->  the open game applies it live (CloudSync)
           cities/{uid}/history/{oldRev}             (undo_last_change, latest 20 kept)
           battles/{id}.snapshots.{uid}              (locked first if a battle has already started)
```

## Install

Needs Node.js 20 or newer.

```bash
cd city-siege-3d/mcp-server
npm install
node src/index.js --help
```

The server imports `../src/shared` and `../src/data` from the game folder, so keep `mcp-server/`
inside `city-siege-3d/` (the Docker image copies exactly those folders).

## Get an access token

In the game, open **ACCOUNT -> AI Designer (MCP)**, enter a label (for example "Claude Code on my
laptop") and press **GENERATE TOKEN**. The token looks like `csk_` followed by 43 characters. It
is shown **once**: copy it into your MCP client config right away. The screen also shows
ready-to-paste Claude Code (HTTP and stdio) and Claude Desktop configs with the token filled in.

- The game stores only the token's SHA-256 (`mcpTokens/{sha256}`), never the token itself.
- **Revoke** it on the same screen at any time. The server caches token checks for 30 seconds, so
  a revoked token stops working within 30 seconds.
- The token list shows when each token was last used. The server records use at most once a
  minute per token.

## Running it: HTTP (hosted) or stdio (local)

The server talks to Firestore with the Firebase **Admin** SDK, which needs admin credentials for
the game's Firebase project. So which transport you use depends on who holds those credentials.

| | Streamable HTTP (`--http`) | stdio (default) |
|---|---|---|
| Who runs it | The game operator, once, for all players (Docker / Cloud Run) | Each user, on their own machine |
| Credentials | The operator's service account, on the server | Needs admin credentials locally, so it suits the emulator (development) or the project owner |
| Player needs | The URL and their token | A checkout of the game, Node 20, their token |
| Token | `Authorization: Bearer <token>` on every request | `CITY_SIEGE_TOKEN` environment variable |

Never hand players a service-account key. For real players, host the HTTP server.

```bash
# HTTP: listens on http://127.0.0.1:8787/mcp (health check: GET /healthz)
FIREBASE_PROJECT_ID=your-project GOOGLE_APPLICATION_CREDENTIALS=/path/key.json node src/index.js --http

# stdio against the local emulator (development)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_PROJECT_ID=demo-city-siege CITY_SIEGE_TOKEN=csk_... node src/index.js
```

From `city-siege-3d/`, `npm run mcp` and `npm run mcp:http` do the same.

The HTTP server is **stateless**. Every `POST /mcp` gets a fresh MCP server bound to that
request's token, so any number of players can share one instance. `GET` and `DELETE` on `/mcp`
return 405.

## Connect Claude Code

**HTTP** (a hosted server, or your own `--http` on port 8787):

```bash
claude mcp add --transport http city-siege http://localhost:8787/mcp \
  --header "Authorization: Bearer csk_YOUR_TOKEN"
```

**stdio** (local, here against the emulator):

```bash
claude mcp add city-siege \
  -e CITY_SIEGE_TOKEN=csk_YOUR_TOKEN \
  -e FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
  -e FIREBASE_PROJECT_ID=demo-city-siege \
  -- node /absolute/path/to/city-siege-3d/mcp-server/src/index.js
```

Against a real project, replace the two emulator variables with
`-e FIREBASE_PROJECT_ID=your-project -e GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/key.json`.

Add `--scope user` to make it available in every project. Check it with `claude mcp list`, then
ask something like *"Look at my City Siege city and fortify it for tonight's battle"*, or run the
`fortify_for_battle` prompt.

## Connect Claude Desktop

Edit `claude_desktop_config.json` (Settings -> Developer -> Edit Config) and restart Claude
Desktop. Players use the HTTP config below (the ACCOUNT screen's "Claude Desktop - hosted server"
snippet); the stdio one is the "local server" snippet, for the project owner.

**stdio** (needs this repo and admin credentials):

```json
{
  "mcpServers": {
    "city-siege": {
      "command": "node",
      "args": ["/absolute/path/to/city-siege-3d/mcp-server/src/index.js"],
      "env": {
        "CITY_SIEGE_TOKEN": "csk_YOUR_TOKEN",
        "FIRESTORE_EMULATOR_HOST": "127.0.0.1:8085",
        "FIREBASE_PROJECT_ID": "demo-city-siege"
      }
    }
  }
}
```

**HTTP**, through the `mcp-remote` bridge (the Desktop config file launches local commands; only
Node.js is needed):

```json
{
  "mcpServers": {
    "city-siege": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:8787/mcp", "--header", "Authorization:${CITY_SIEGE_AUTH}"],
      "env": { "CITY_SIEGE_AUTH": "Bearer csk_YOUR_TOKEN" }
    }
  }
}
```

For a plain `http://` URL other than localhost, `mcp-remote` also needs `"--allow-http"` in `args`.
Keep `Authorization:${CITY_SIEGE_AUTH}` without a space; the space goes inside the variable.

Any other MCP host works the same way. For stdio, run `node .../mcp-server/src/index.js` with
`CITY_SIEGE_TOKEN` set. For HTTP, point the host at `https://<host>/mcp` and send the Bearer header.

## Environment variables

| Variable | Used by | Meaning |
|---|---|---|
| `CITY_SIEGE_TOKEN` | stdio | The player's access token. |
| `FIREBASE_PROJECT_ID` | both | Firebase project. Default: the service-account key's `project_id`, else `demo-city-siege`. |
| `GOOGLE_APPLICATION_CREDENTIALS` | both | Path to a service-account key file. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | both | The service-account key JSON itself (handy for secrets on hosting platforms). |
| `FIRESTORE_EMULATOR_HOST` | both | Development: use the Firestore emulator, for example `127.0.0.1:8085`. No credentials are needed. |
| `PORT` | HTTP | Listen port. Default 8787. `--port` overrides it. |
| `HOST` | HTTP | Bind address. Default `127.0.0.1`; the Docker image uses `0.0.0.0`. `--host` overrides it. |
| `MCP_AUTH_CACHE_MS` | both | How long token checks are cached. Default 30000. Tests lower it. |
| `TRUST_PROXY` | HTTP | `1` behind one reverse proxy / load balancer (Cloud Run): the caller's address, which unknown-token throttling is counted by, is then the last `X-Forwarded-For` entry. Off by default (the socket address). |

With none of the three credential options set, the server falls back to Google's application
default credentials (for example Cloud Run's service identity). It refuses a `demo-*` project
unless `FIRESTORE_EMULATOR_HOST` is set.

## Tools and prompts

Every description tells the model the coordinate system and says to call `get_city` first. Every
result is readable text, plus `structuredContent` with the same facts as data.

| Tool | Kind | What it does |
|---|---|---|
| `get_city` | read | **Start here.** Town Hall level and build radius, the inventory that can be placed, storage, roads, buildings under construction, active battles with lock deadlines, a 31x31 text map and every building id. `ids: false` leaves out the building list. |
| `list_buildings` | read | Every building: id, type, tile, level, footprint, role, stored output (as of now), upgrade state, reach in tiles (turret range, trap trigger radius, aura radius) and, for traps and barriers, whether they stand on a road. Optional `type` filter. |
| `get_catalog` | read | The types this Town Hall allows: limit and placed count, how many are in the inventory or storage, what each does, its reach in tiles and the game's placement advice. |
| `get_rules` | read | The placement rules in prose: radius per Town Hall, spacing, roads, storage, battle locking, limits. |
| `validate_design` | read | Layout errors and warnings, the raid-defense report (coverage per threat, gem bounty, concrete gaps), COVERAGE (turrets reaching each Main Gate and the Town Hall), traps and barriers off the roads, and inventory not yet placed. |
| `get_battles` | read | Battles with opponent, mode, phase, deadlines and countdowns, lock state and results. `include_finished: true` lists old ones too. |
| `place_building` | write | Place `type` from the inventory at `(gx, gz)`, with optional `rot` (0/90/180/270). Units in storage come out first and keep their level. |
| `move_building` | write | Move building `id` to `(gx, gz)`, with optional `rot`. |
| `stow_building` | write | Put building `id` into Big Storage. |
| `remove_tree` | write | Clear tree `id` (nothing is refunded). |
| `add_roads` | write | Draw roads from `tiles: [[gx,gz],...]` or `path: [[gx,gz],...]` (waypoints joined by straight or L-shaped runs). |
| `remove_roads` | write | Erase roads (same arguments). The tiles go back to the inventory. |
| `apply_design` | write | Many ops as **one** change: all-or-nothing, one live update, one undo step. `dry_run: true` checks the ops and shows the resulting map without saving. |
| `undo_last_change` | write | Restore the version the latest AI change replaced. Call it again to step further back. |

`apply_design` op shapes: `{op:"place",type,gx,gz,rot?}`, `{op:"move",id,gx,gz,rot?}`,
`{op:"stow",id}`, `{op:"remove_tree",id}`, `{op:"add_roads",tiles|path}`,
`{op:"remove_roads",tiles|path}`.

Prompts:
- `fortify_for_battle` (`battle_id?`, `focus?`) finds the battle and its lock time, reads the city
  and its defense gaps, plans turrets, traps and barriers around the gate approaches, applies it as
  one dry-run-then-apply `apply_design`, and reports what the player should still buy or upgrade.
- `tidy_city` (`style?`) fixes layout warnings, keeps a road from every gate to the centre, lines
  buildings up into blocks and never weakens the defense.

## Coordinates and the map

- Integer tiles. **gx grows to the east, gz grows to the south**, `(0,0)` is the centre, and north
  (`gz = -15`) is at the top of the map.
- The three fixed Main Gates (3x3) are North `(0,-15)`, East `(15,0)` and South `(0,15)`. There is
  no west gate.
- A building's own tile and every road tile must satisfy `hypot(gx, gz) <= radius`. The radius is
  11.5 at Town Hall 1 and grows to 14.8 at Town Hall 12.
- Footprints are 1x1 (traps, spike traps, roadblocks, trees), 3x3 (gates, Quantum Citadel) or 2x2
  (everything else). Two structures clash when `|dx| < (a+b)/2` and `|dz| < (a+b)/2`. Trees never
  block anything. Roads and buildings never block each other.
- On the map, `.` is a tile where a 1x1 fits, `=` is a road and `#` is outside the radius. Letters
  are buildings by role: uppercase on the tile a building stands on, lowercase on the rest of its
  footprint (H hall, G gate, T turret, P spawner, X trap, B barrier, E producer, S storage, A aura,
  R research, Y tree).

## What an edit does in Firestore

Each design call is **one transaction** on `cities/{uid}`:

1. It reads the city, the player's recent battles and the history index. If the city does not
   exist yet, the call is refused: *"open the game and sign in once"*.
2. It applies the ops to a working model with `cityRules.applyOps`, all-or-nothing. If any op is
   refused, **nothing is written**. A change that alters nothing (for example drawing roads that
   are already there) is not saved as a new version.
3. **Battle lock.** For every battle in `fight` or `resolving` phase that has no snapshot of this
   player yet, it writes `battles/{id}.snapshots.{uid} = {layout, townHall, name, rev, lockedAt}`
   from the city *before* this edit. The opponent raids that snapshot. Battles still in the
   `design` phase are not locked: edits made then count for the battle.
4. It writes the old version to `cities/{uid}/history/{oldRev}` (with `rev`, `layout`,
   `holdings`, `replacedBy {rev, kind, summary}` and `undoTo`) and keeps only the latest 20.
5. It writes the city with `rev + 1`, `updatedBy: 'mcp'`, `writerId: 'mcp:<first 8 hex of the
   token hash>'`, `updatedAt` and `lastChange: {by: 'mcp', summary, at}`. The summary is what the
   game's toast shows, for example "placed Sniper Watchtower at (3,4); drew 12 road tiles".
   **The production clock moves with the output**: before the ops run, every producer's `st` is
   advanced from `layout.savedAt` to now (what the open game shows), and the write stamps
   `layout.savedAt` = now. So a stow credits the output made up to the stow, and a building the AI
   places starts empty now (the game credits each producer the time since `savedAt` when it
   applies a city, so a stale `savedAt` would have filled it with hours it never stood).

Writes for one player are queued inside the process, so parallel tool calls run one after the
other (milliseconds each) instead of contending for the same document.

Stowing a producer that holds output adds an entry to `holdings.bankCredits`, because the server
never touches the bank. The game pays it through its bank transaction on `saves/{uid}`, which also
records the credit id in `saves.credited`, so it is paid once per account however many devices see
it. The game does not push the city just to clear the map (a game write would end the undo chain
below). Instead every AI write (edit or undo) reads `saves/{uid}.credited` in its transaction and
drops the credits already paid; the game's next real push drops them too.

`undo_last_change` works only while the latest version was written by MCP, so it never reverts
the player's own work. An AI edit that reaches the open game while the game still has a change of
its own to upload is merged with it and saved by the game, which ends the undo chain there. It restores the design (buildings, roads, inventory, storage) of the
version the last AI change replaced, and each further call steps one AI change further back. It
never takes back money. Bank credits already issued stay, and a producer that comes back after an
AI stow comes back empty, because its output was credited when it was stowed. It never throws
output away either (`cityRules.carryOutputForUndo`): a producer the undo takes off the map, because
the undone change placed it, is settled like a stow. Its output becomes a bank credit (reason
`stow <type>`), and the reply names it. A vault keeps its sealed cash; if it goes back to the plain
inventory it is kept in Big Storage instead, because only a stored unit holds sealed cash.

`get_city` counts as pending only the credits whose ids are not yet in `saves/{uid}.credited`.
That list is the only part of `saves/` the server reads (field-masked, also inside each write
transaction to prune paid credits), so the bank itself is never read.

## Errors

Failures come back as MCP tool results with `isError: true`. The text is
`<Label> (<CODE>): <message>`, and `structuredContent` holds `{ok: false, reason, message, ...}`.

- **Rule refusals** (`Refused (...)`) carry cityRules' reason codes: `UNKNOWN_TYPE`,
  `NOT_PLACEABLE`, `NOT_IN_INVENTORY`, `LOCKED`, `AT_LIMIT`, `OUTSIDE_RADIUS`, `BLOCKED`,
  `NOT_FOUND`, `IMMOVABLE`, `UNDER_CONSTRUCTION`, `NOT_STOWABLE`, `NO_DEPOT`, `STORAGE_FULL`,
  `NOT_A_TREE`, `NO_ROAD_INVENTORY`, `ROAD_LIMIT` and `BAD_ARGS`. The server adds `NO_CITY`,
  `NOTHING_TO_UNDO` and `NO_HISTORY`. Messages say how to fix the problem, for example:
  `Tile (3,4) is blocked by Town Hall bmumqowj6gngaw258 at (3,3) - a 1x1 footprint there would overlap it. Free tiles nearby: (3,5), (2,5), (4,5).`
- **Token problems** (`Access denied (...)`): `MISSING_TOKEN`, `MALFORMED_TOKEN`, `UNKNOWN_TOKEN`,
  `REVOKED_TOKEN` or `BAD_SCOPE`, each with what to do next. `Try again later (AUTH_THROTTLED)`:
  the token was not checked because too many unrecognised tokens were tried (see Limits). Listing tools works without a valid
  token, so the problem shows up in the chat instead of as a connection failure. Over HTTP, a
  request with **no** `Authorization` header gets HTTP 401 with instructions.
- **Rate limit** (`Rate limit reached (RATE_LIMITED)`): the message and
  `structuredContent.retryAfterSec` say when to retry.

## Limits

- Per token: **30 design changes and 120 reads per rolling minute**. A dry run counts as a read.
  The limits are kept in memory per process. With several HTTP replicas, each one allows the full
  rate.
- Unrecognised tokens: looking one up costs a Firestore read before any per-token limit can
  apply, so the server allows at most **20 lookups of unknown tokens per minute per caller address**
  (an IPv6 address counts by its /64) and **1000 per process** as a cost cap, counted before the
  read. Past the cap, a quiet caller (at most 3 lookups this minute) still gets its lookup from a
  second lane of **500 a minute**, so a flood from other addresses does not refuse a player whose
  token this process has not seen yet. Worst case under attack: about 1500 reads a minute per
  process. Over a limit the answer is `Try again later (AUTH_THROTTLED)` with a retry time and no
  read; it says the token was not checked, never that it is wrong. A token that has resolved in
  this process is never throttled, but that memory is per process and empty after every restart,
  scale-out or deploy. A token that turns out to exist gives its lookup back, and parallel calls
  with one token share one read. Malformed tokens (not `csk_` + 43 characters) never reach
  Firestore. Behind a reverse proxy set `TRUST_PROXY=1`, or every caller shares the proxy's address
  (tokens already accepted keep working, but 20 unknown tokens a minute from anyone would pause
  new ones for everybody); the server logs a warning once when requests carry `X-Forwarded-For`
  without it.
- `apply_design`: up to 200 ops per call; `tiles` up to 1000, `path` up to 200 waypoints, and at
  most 2000 tiles + waypoints over all the ops of one call (a bigger call is refused with
  `BAD_ARGS`). HTTP request bodies are capped at 1 MB; a bigger one gets HTTP 413 with a JSON-RPC
  error message.
- The game's own rules apply too: road limit per Town Hall (130 up to 400), building limits, and
  Firestore document limits (400 buildings, 450 roads).

## Development and tests

```bash
# 1. emulators (from city-siege-3d/)
npm run emulators            # auth 127.0.0.1:9099, firestore 127.0.0.1:8085

# 2. the MCP end-to-end suite (from city-siege-3d/)
node mcp-server/test/run.mjs # or: npm run test:mcp  /  cd mcp-server && npm test
```

`test/run.mjs` uses its own project, `demo-cs-mcp` (`MCP_TEST_PROJECT_ID` overrides it), and
wipes only that project. Its HTTP server runs on port 8787 (`MCP_TEST_PORT` overrides it). It reads
`FIRESTORE_EMULATOR_HOST` (default `127.0.0.1:8085`). `npm run test:online` (from `city-siege-3d/`)
runs it together with the shared-rules and Firestore-rules suites inside `firebase emulators:exec`,
which starts its own emulators, so use it only when `npm run emulators` is not already running.

What it does:

- Seeds cities from the real-game fixtures in `tools/online/fixtures`, tokens with SHA-256 ids,
  and battles in every phase.
- Spawns the server over **stdio** with the MCP SDK `Client` and over **Streamable HTTP**, then
  reads Firestore back after every call.
- Covers:
  - the exact tool list;
  - every tool's happy path;
  - all 17 refusal codes, each with no write;
  - all-or-nothing `apply_design` and dry runs;
  - rev, history, `savedAt` and `lastChange`;
  - the snapshot-before-edit lock (fight and resolving battles are locked; design-phase battles
    are not);
  - the full undo chain back to the seeded city, including bank-credit safety, and an undo that
    takes a placed producer off the map crediting its output;
  - the production clock: a stow credits the output made up to now, a placed producer starts
    empty now;
  - `get_city` counting as pending only the credits not yet in `saves/{uid}.credited`;
  - road tiles, on-road flags, "Road:" notes, reach and COVERAGE as the AI reads them;
  - missing, malformed, unknown, revoked and wrong-scope tokens, the auth cache, and unknown
    tokens throttled before their Firestore lookup (in-process and over HTTP): per address and
    per IPv6 /64, the process cap and its quiet lane (a new token still gets its lookup during a
    flood), one read for parallel first calls, and refusals that never blame the token;
  - both rate limits;
  - parallel edits (queued per player), and pruning history to 20;
  - an oversized HTTP body (413) and the `apply_design` tile cap;
  - isolation between players.
- Cross-checks with `firestore.rules` (through `@firebase/rules-unit-testing` from the game's dev
  dependencies) that the game's next push is still accepted after an MCP write.

It prints `PASS`/`FAIL` for each check and exits 1 on any failure.

The code:

| File | Role |
|---|---|
| `src/index.js` | CLI: stdio by default, `--http`, `--port`, `--host`, `--help` |
| `src/tools.js` | The 14 tools and 2 prompts (zod schemas), auth, rate-limit guard |
| `src/store.js` | Firestore transactions: edit, battle lock, history, undo |
| `src/auth.js` | Token hash lookup, 30 s cache, usage counters |
| `src/rateLimit.js` | Per-token sliding-window limits |
| `src/format.js` | The text the model reads (battles, inventory, rules prose) |
| `src/http.js` | Stateless Streamable HTTP server, `/healthz` |
| `src/firebase.js` | Firebase Admin initialisation from the environment |

## Hosting (Docker, Cloud Run)

The Dockerfile builds from the **game folder**, because it needs `src/shared` and `src/data`:

```bash
cd city-siege-3d
docker build -f mcp-server/Dockerfile -t city-siege-mcp .
docker run -p 8787:8787 -e FIREBASE_PROJECT_ID=your-project \
  -e FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" city-siege-mcp
```

- The image runs `node mcp-server/src/index.js --http` as the `node` user, with `HOST=0.0.0.0`,
  `PORT=8787` and a `/healthz` health check. `mcp-server/Dockerfile.dockerignore` keeps
  `node_modules`, `dist` and any key files out of the build context.
- **Cloud Run**: deploy the image and give the service a service account with the *Cloud
  Datastore User* role (`roles/datastore.user`). Application default credentials are then used
  and no key is needed. Cloud Run sets `PORT` itself. Two settings are required:
  - `--set-env-vars=FIREBASE_PROJECT_ID=<project>`: without a key file the server cannot read the
    project id, and it refuses its `demo-city-siege` fallback outside the emulator.
  - `--allow-unauthenticated`: the server authenticates players by their bearer tokens; Cloud
    Run's IAM check would otherwise reject every MCP client.

  Also set `TRUST_PROXY=1` (in `--set-env-vars`), so unknown-token throttling counts each caller's
  own address instead of Google's front end (see Limits).

  Step-by-step commands (Artifact Registry, service account, deploy) are in
  [`docs/MCP.md`](../docs/MCP.md#google-cloud-run). Build with `--platform linux/amd64` on an Apple
  Silicon Mac.
- Put it behind HTTPS (Cloud Run does this for you). The bearer token is a password.
- Tell players the URL: the game's MCP screen shows `VITE_MCP_SERVER_URL` (default
  `http://localhost:8787/mcp`) in the ready-to-paste configs.

## Security notes

- Tokens are 32 random bytes. Only their SHA-256 is stored, and a token only works while its
  `mcpTokens` doc exists, is not revoked and has scope `design`.
- The Admin SDK bypasses `firestore.rules`, so the server enforces the rules itself:
  - A token only ever reaches its own player's `cities/{uid}`. No tool takes a uid, and extra
    arguments are dropped.
  - Every op is validated by `cityRules`.
  - It writes only the document keys the rules allow the game to write, so the game's next push is
    still accepted.
  - The only other writes are that player's own battle snapshots (the lock) and the token's
    `lastUsedAt` and `uses`.
- There is no code path to the bank, the shop, upgrades or attacks. `saves/{uid}` is only read, and
  only its `credited` list (field mask), to tell paid stow credits from pending ones.
