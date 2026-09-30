# The AI designer (MCP)

Connect Claude (Claude Code, Claude Desktop, or any MCP client) to your city and ask it to design:
*"fortify my north gate for tonight's battle"*, *"tidy up my roads"*. The AI edits your city in the
cloud through the City Siege **MCP server**, and your open game shows each change live, with a toast
such as "🤖 AI designer: placed Lumber Mill at (-1,-7)".

This page is for players and for whoever hosts the server. Running and testing the server itself is
in [`mcp-server/README.md`](../mcp-server/README.md). How the cloud save works is in
[ONLINE.md](ONLINE.md).

- [What it can and cannot do](#what-it-can-and-cannot-do)
- [Access tokens](#access-tokens)
- [Connect your AI client](#connect-your-ai-client)
- [Hosting the HTTP server](#hosting-the-http-server)
- [The grid and the map](#the-grid-and-the-map)
- [Tools reference](#tools-reference)
- [Prompts](#prompts)
- [Example requests](#example-requests)
- [How an edit is saved](#how-an-edit-is-saved)
- [Environment variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## What it can and cannot do

| The AI designer can | It can never |
|---|---|
| Place buildings **from your Construction Inventory** (units in Big Storage come out first, keeping their level) | Buy anything (the shop is yours) |
| Move buildings, including the Town Hall, and turn them | Upgrade, speed up or finish jobs |
| Stow buildings into Big Storage | Collect production, spend or earn cash, iron, wood or gems |
| Clear trees | Touch the bank, the garage or your cards |
| Draw and erase roads (from your road inventory) | Accept, start or attack in battles |
| Read your city, catalog, defense gaps and battle deadlines | See or change any other player's city |
| Undo its own changes | Undo what *you* did in the game |

Every edit is checked by `src/shared/cityRules.js`, the same rules the game's Design screen
follows (proven on 3,540 probes against the real game by `tools/online/parity-check.mjs`), so the AI
cannot make a layout the game would refuse. Two things are stricter than the game: it cannot stow a
building that is being upgraded, and a Big Storage depot being stowed does not count its own slots.

## Access tokens

1. Sign in, then open the 👤 pill -> **ACCOUNT** -> **🤖 AI Designer (MCP)**.
2. Type a label (for example "Claude Code on my laptop") and press **GENERATE TOKEN**.
3. The token (`csk_` followed by 43 characters) is shown **once**. Press **📋 COPY**, paste it into
   your MCP client config right away, then press **I'VE SAVED IT - HIDE TOKEN**. The screen also
   shows ready-to-paste configs with the token filled in, each with its own COPY button.
4. The token list shows each token's label, when it was created, when it was last used and how many
   calls it made. **Revoke** (then **YES, REVOKE**) disables a token for good; **Delete** removes
   its row.

How tokens are protected:

- The game stores only the token's **SHA-256** (as the id of `mcpTokens/{hash}`); the token itself
  is never written to Firestore or to the browser's storage. Treat it like a password.
- A token works only while its document exists, is not revoked and has scope `design`.
- The server caches token checks for **30 seconds**, so a revoke takes effect within 30 s. A token
  the server has never seen is re-checked after 5 s, so a brand-new token works almost at once.
- "Last used" is written at most once a minute per token (the count catches up then).

## Connect your AI client

The MCP server has two transports:

| | Streamable HTTP (hosted) | stdio (local) |
|---|---|---|
| Who runs it | whoever runs the game, once, for all players | you, on your machine |
| What you need | the server URL and your token | a checkout of this repo, Node 20+, your token, and Firebase admin credentials (or the local emulator) |
| Use it for | real players | development against the emulator, or the project owner |

Real players should use the hosted HTTP server: stdio needs admin credentials for the whole
Firebase project, which only the project owner should ever hold.

### Claude Code

**Hosted HTTP server** (the ACCOUNT screen's first snippet, with `VITE_MCP_SERVER_URL` filled in):

```bash
claude mcp add --transport http city-siege https://your-mcp-host.example.com/mcp \
  --header "Authorization: Bearer csk_YOUR_TOKEN"
```

**Local stdio server against the emulator** (for development; run `npm run emulators` first):

```bash
claude mcp add city-siege \
  -e CITY_SIEGE_TOKEN=csk_YOUR_TOKEN \
  -e FIREBASE_PROJECT_ID=demo-city-siege \
  -e FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
  -- node /absolute/path/to/city-siege-3d/mcp-server/src/index.js
```

**Local stdio server against a real project** (project owner): replace the last two `-e` flags
with `-e FIREBASE_PROJECT_ID=your-project-id -e GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json`.

Add `--scope user` to use it in every project. `claude mcp list` checks the connection. Then ask,
for example, *"Look at my City Siege city and tell me what you see"*. The server's instructions tell
Claude to call `get_city` first.

### Claude Desktop

Settings -> Developer -> Edit Config opens `claude_desktop_config.json`. Add the server, save, and
restart Claude Desktop.

**Hosted HTTP server**, through the [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) bridge
(the Desktop config launches local commands; `mcp-remote` forwards them with your header). This is
the ACCOUNT screen's "Claude Desktop - hosted server" snippet, with the server URL and your token
filled in; it needs Node.js for `npx`, nothing else:

```json
{
  "mcpServers": {
    "city-siege": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-mcp-host.example.com/mcp", "--header", "Authorization:${CITY_SIEGE_AUTH}"],
      "env": { "CITY_SIEGE_AUTH": "Bearer csk_YOUR_TOKEN" }
    }
  }
}
```

Keep `Authorization:${CITY_SIEGE_AUTH}` without a space (a known argument-quoting issue); the space
goes inside the variable. For a plain `http://` URL other than localhost, add `"--allow-http"` to
`args`.

**Local stdio server**, for the project owner only (the ACCOUNT screen's "Claude Desktop - local
server" snippet; it needs this repo and Firebase admin credentials):

```json
{
  "mcpServers": {
    "city-siege": {
      "command": "node",
      "args": ["/absolute/path/to/city-siege-3d/mcp-server/src/index.js"],
      "env": {
        "CITY_SIEGE_TOKEN": "csk_YOUR_TOKEN",
        "FIREBASE_PROJECT_ID": "demo-city-siege",
        "FIRESTORE_EMULATOR_HOST": "127.0.0.1:8085"
      }
    }
  }
}
```

### Any other MCP host

- **HTTP**: point it at `https://<host>/mcp` (Streamable HTTP, POST only) and send the header
  `Authorization: Bearer csk_YOUR_TOKEN` on every request. The server is stateless: no session id,
  no SSE stream. A host that only speaks stdio can use `npx -y mcp-remote <url> --header ...` as
  above.
- **stdio**: command `node /absolute/path/to/city-siege-3d/mcp-server/src/index.js`, with
  `CITY_SIEGE_TOKEN` (and the Firebase variables) in its environment.

To check a hosted server by hand (these exact calls were run against a local server):

```bash
curl -s https://your-mcp-host.example.com/healthz
# {"ok":true,"name":"city-siege-mcp","version":"1.0.0","transport":"http","project":"your-project-id"}

curl -s -X POST https://your-mcp-host.example.com/mcp \
  -H "Authorization: Bearer csk_YOUR_TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_battles","arguments":{}}}'
# {"result":{"content":[{"type":"text","text":"Now: 2026-09-29T16:22:14.996Z. 1 active battle:\n- vs Bob (TH1) ...
```

A request without the header gets HTTP 401 with instructions. A request with a wrong or revoked
token is answered normally, and every tool call returns "Access denied (UNKNOWN_TOKEN): ..." so the
reason shows up in the chat instead of as a vague connection failure.

## Hosting the HTTP server

One server instance serves every player: each request carries its own token. The server needs
**admin credentials** for the game's Firebase project (it writes with the Admin SDK) and the
project id.

### Any Node host

```bash
cd city-siege-3d/mcp-server && npm ci --omit=dev && cd ..
FIREBASE_PROJECT_ID=your-project-id \
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json \
HOST=0.0.0.0 PORT=8787 \
npm run mcp:http            # = node mcp-server/src/index.js --http
```

The server imports `src/shared` and `src/data` from the game folder, so deploy the whole
`city-siege-3d` folder (or at least those two folders plus `mcp-server/`). Put it behind HTTPS: the
bearer token is a password. Health check: `GET /healthz`.

**Service account key**: Firebase console -> Project settings -> Service accounts -> Generate new
private key. It downloads as `<project>-firebase-adminsdk-<id>-<hash>.json`; keep it outside the
repo (inside `city-siege-3d/`, that name and `*service-account*.json` are git-ignored and kept out of
the Docker build context, any other name is not). Pass it as a file
(`GOOGLE_APPLICATION_CREDENTIALS`) or as the JSON text itself (`FIREBASE_SERVICE_ACCOUNT_JSON`, handy
for platform secrets). Never commit it and never give it to players: it bypasses `firestore.rules`
for every player.

### Docker

The image builds from the **game folder** (it needs `src/shared` and `src/data`):

```bash
cd city-siege-3d
docker build -f mcp-server/Dockerfile -t city-siege-mcp .
docker run -p 8787:8787 \
  -e FIREBASE_PROJECT_ID=your-project-id \
  -e FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" \
  city-siege-mcp
```

The image runs `node mcp-server/src/index.js --http` as the `node` user with `HOST=0.0.0.0`,
`PORT=8787` and a `/healthz` health check. `mcp-server/Dockerfile.dockerignore` keeps
`node_modules`, `.env*` and key files out of the build context. On an Apple Silicon Mac, build with
`--platform linux/amd64` for most cloud hosts.

### Google Cloud Run

Cloud Run needs a billing account on the project. Build the image as above, push it to Artifact
Registry, and run it with a service account that can use Firestore; no key file is needed there.

```bash
PROJECT=your-project-id; REGION=europe-west1
IMAGE=$REGION-docker.pkg.dev/$PROJECT/city-siege/mcp:1

gcloud artifacts repositories create city-siege --repository-format=docker --location=$REGION --project=$PROJECT
gcloud auth configure-docker $REGION-docker.pkg.dev
docker build --platform linux/amd64 -f mcp-server/Dockerfile -t $IMAGE . && docker push $IMAGE

gcloud iam service-accounts create city-siege-mcp --project=$PROJECT
gcloud projects add-iam-policy-binding $PROJECT \
  --member=serviceAccount:city-siege-mcp@$PROJECT.iam.gserviceaccount.com --role=roles/datastore.user

gcloud run deploy city-siege-mcp --image=$IMAGE --region=$REGION --project=$PROJECT \
  --service-account=city-siege-mcp@$PROJECT.iam.gserviceaccount.com \
  --set-env-vars=FIREBASE_PROJECT_ID=$PROJECT,TRUST_PROXY=1 \
  --allow-unauthenticated
```

- `--allow-unauthenticated` is required: the server does its own authentication with the players'
  bearer tokens, and Cloud Run's IAM check would otherwise reject every MCP client.
- `FIREBASE_PROJECT_ID` is required: without a key file the server cannot read the project id, and
  it refuses to start on its `demo-city-siege` fallback.
- `TRUST_PROXY=1`: every request reaches the server through Google's front end, so the caller's
  address (which unknown-token throttling counts by) is read from `X-Forwarded-For`.
- Cloud Run sets `PORT` itself. The service URL plus `/mcp` is what players paste; set it as
  `VITE_MCP_SERVER_URL` in the game's `.env.local` and rebuild, so the ACCOUNT screen shows it.

(These Cloud Run and Docker commands are standard but were not executed while writing this page:
neither Docker nor gcloud is installed on the development machine. The server itself, `/healthz`,
the 401/405 answers and tool calls over HTTP were run and checked.)

### Security notes for hosts

- Tokens are 32 random bytes; the server hashes what it receives and looks up `mcpTokens/{hash}`.
  A leaked database does not leak a usable token.
- The Admin SDK bypasses `firestore.rules`, so the server enforces the rules itself: a token only
  reaches its own player's `cities/{uid}` (no tool takes a uid; extra arguments are dropped), every
  op goes through `cityRules`, and it writes only the keys the rules allow the game to write, so the
  game's next push is still accepted. The only other writes are that player's battle snapshots (the
  lock) and the token's `lastUsedAt` and `uses`.
- There is no code path to the bank, the shop, upgrades or attacks. The only read of `saves/{uid}`
  is its `credited` list (a field-masked read that never returns the bank), so `get_city` can leave
  out the stow credits the game has already paid; nothing writes `saves/`.
- **Rate limits**, per token: 30 design changes and 120 reads per rolling minute (a dry run counts as
  a read). They are kept in memory per process: several replicas each allow the full rate.
- **Unknown tokens** cost a Firestore read to look up before any per-token limit applies, so they
  are throttled on their own, counted before the read: at most 20 lookups of unrecognised tokens
  per minute per caller address (an IPv6 address counts by its /64), and 1000 per process as a
  cost cap. Past that cap, a caller with at most 3 lookups this minute still gets its lookup from a
  second lane of 500 a minute, so a flood from other addresses does not lock out a player whose
  token the server has not seen yet. Worst case under attack: about 1500 reads a minute per
  process. Over a limit the answer is `Try again later (AUTH_THROTTLED)` with a retry time; it says
  the token was not checked, not that it is wrong. A token that has resolved in this process is
  never throttled, but that memory is per process and empty after every restart, scale-out or
  deploy. Parallel calls with one token share one read. Malformed tokens never reach Firestore.
  Behind a proxy, set `TRUST_PROXY=1` (the server logs a warning once when requests carry
  `X-Forwarded-For` without it).
- HTTP bodies are capped at 1 MB; a bigger body gets HTTP 413 with a readable JSON-RPC error.
  `apply_design` takes at most 200 ops; `tiles` at most 1000 entries and `path` at most 200
  waypoints per op, and at most 2000 tiles + waypoints over one call (so every accepted call fits
  well under 1 MB).
- Revoke is the kill switch for a single token; deleting the service account key stops the server.

## The grid and the map

- Integer tiles. **gx grows to the east, gz grows to the south**, `(0,0)` is the centre, and north
  (`gz = -15`) is at the top of the map.
- The city wall is 15 tiles out. The three **Main Gates** (3x3, fixed, never moved or stowed) are
  **North (0,-15)**, **East (15,0)** and **South (0,15)**. There is no west gate. Raiders come in
  through a gate and race along the roads.
- **Build radius**: a building's own tile and every road tile must satisfy
  `hypot(gx, gz) <= radius`. The radius grows with the Town Hall:

  | TH | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | Radius | 11.5 | 11.8 | 12.1 | 12.4 | 12.7 | 13 | 13.3 | 13.6 | 13.9 | 14.2 | 14.6 | 14.8 |
  | Road tiles | 130 | 150 | 170 | 190 | 210 | 235 | 260 | 285 | 310 | 340 | 370 | 400 |

- **Footprints**: 1x1 (traps, spike traps, roadblocks, trees), 3x3 (Main Gates, Quantum Citadel),
  2x2 for everything else, centred on the building's tile. Two structures clash when
  `|dx| < (a+b)/2` **and** `|dz| < (a+b)/2`. Trees never block anything. Roads and buildings never
  block each other: traps, spike traps and roadblocks belong **on** road tiles.

`get_city` draws the city as text. This is the real starter city (Town Hall 1,
`tools/online/fixtures/default-city.cloud.json`), rendered by `cityRules.renderAsciiMap`:

```text
Town Hall 1 city, build radius 11.5 tiles. North (gz -15) is up, east (gx +15) is right.
    -15  -10   -5    0    5   10   15   <- gx
      |    |    |    |    |    |    |
 -15 -##############gGg##############
      ##############ggg##############
      ###############=###############
      ###############=###############
      ############...B...############
 -10 -##########.....=.....#####Y####
      ######eee......=.......########
      ######eEe......=........#Y#####
      ###Y##eee......=.........######
      ######...=============...######
  -5 -####Y....=.....=..sss=....#####
      #####....=ppp..=..sSs=eee.#####
      ####.Y...=pPp..=..sss=eEe..####
      ####.....=ppp..=.....=eee..####
      ####.....=.....=.....=.....##gg
   0 -==========================B==gG
      ####.....=.....=.....=.....##gg
      ####.....=.eee.=.hhh.=.....####
      ####.Y...=.eEe.=.hHh.=eee..####
      #####....=.eee.=.hhh.=eEe.#####
   5 -###Y#....=.....=.....=eee.#####
      ######...=============...######
      ######eee.sss..=.........######
      ######eEe.sSs..=........#######
      ######eee.sss..=.......#Y######
  10 -##########.....=.....##########
      ############Y..B...########Y###
      ###############=###############
      ###############=###############
      ##############ggg##############
  15 -##############gGg##############
   ^ gz

Legend: . empty buildable tile (a 1x1 fits)   = road   # outside the build radius
        UPPERCASE = the tile a building stands on (its gx,gz); lowercase = the rest of its footprint
        a letter hides a road under it: whether a trap (X) or barrier (B) is on a road is list_buildings' onRoad
        B barrier (spike trap / roadblock): roadblock, spike_trap
        E producer: iron_foundry, lumber_mill, petrol_pump
        G Main Gate: main_gate
        H Town Hall: town_hall
        P police / pursuit spawner: police_station
        S storage / labour: builder_hut
        Y tree (scenery, never blocks): tree
```

Reading it: the Town Hall `H` stands on (3,3) and its 2x2 footprint is drawn as the 3x3 block of
`h` around it, which are exactly the tiles a 1x1 cannot take. The spike trap `B` at (0,-11) sits on
the north gate road. `.` always means "a 1x1 fits here right now". Letters by role: `H` hall, `G`
gate, `T` turret, `P` police/pursuit spawner, `X` trap, `B` barrier, `E` producer, `S`
storage/labour, `A` aura, `R` research, `Y` tree.

A letter hides the road under it, so the map alone cannot tell a trap on a road from one beside it.
`get_city` therefore also lists every road tile by row, `list_buildings` flags each trap and barrier
`[on road]` / `[OFF-ROAD]`, and every place or move of one says where it ended up.

## Tools reference

Every tool answers in readable text (what the model acts on) plus `structuredContent` with the same
facts as data. A refusal is a result with `isError: true` and the text `<Label> (<CODE>): <message>`;
**a refused edit changes nothing**. Every description repeats the grid and says to call `get_city`
first.

The excerpts below are real output from the starter city above, with a scheduled night battle
against "Bob" three hours away.

### Read tools

**`get_city`** `{ ids?: boolean = true }`: **start here.** Town Hall and radius, cloud rev and who
saved last, active battles with lock deadlines, inventory, roads, storage, buildings under
construction, pending bank credits, the map, (with `ids`) every building id, and every road tile
by row (also as `structuredContent.roadTiles`).

```text
Alice's city - Town Hall 1, build radius 11.5 tiles (a tile is buildable when hypot(gx,gz) <= 11.5). Cloud version rev 1, last saved by the game.

BATTLES
- vs Bob (TH1) - scheduled, night [docsBattle1]: DESIGN phase - the city locks in 3h 0m (at 2026-09-29T19:17:51.911Z). Every edit made before then is part of what Bob will raid.

INVENTORY (ready to place): lumber_mill x1, spike_trap x1, roadblock x2, tree x3.
ROADS: 105/130 tiles placed, 25 in the inventory.
STORAGE: 0/0 Big Storage slots used.

MAP
... (the map above) ...

Buildings (id type (gx,gz) level):
bmumqowj6gngaw258 town_hall (3,3) L1
gate_north_gate main_gate (0,-15) L1 [fixed]
bmumqowj74is3id5f police_station (-4,-3) L1
...

ROAD TILES (105, by row; a trap or barrier works only on or next to these):
gz -15: gx 0
gz -14: gx 0
gz -13: gx 0
gz -12: gx 0
gz -11: gx 0
...
gz 0: gx -15..15
...
```

**`list_buildings`** `{ type?: string }`: every building (or one type) with id, tile, level,
footprint, upgrade state, stored output (as of now), reach (turret range, trap trigger radius or
aura radius, in tiles at the building's level) and, for traps and barriers, whether they stand on
a road.

```text
2 buildings of type roadblock (id  type  (gx,gz)  level  size):
bmumqowj8u1w1nm4e  roadblock  (0,11)  L1  1x1  [on road]
bmumqowj83z8k02rr  roadblock  (11,0)  L1  1x1  [on road]
```

**`get_catalog`** `{}`: the types this Town Hall allows, with limit, placed count, inventory,
storage, map letter, a one-line description, the reach (turret range, trap trigger radius, aura
radius, in tiles) and the game's own placement advice. Types that unlock later are not listed.

```text
Town Hall 1: 10 types available (type - name [role, size, map letter]: placed/limit, inventory). Reach is at level 1, in tiles (1 tile = 5.5 m); turret range grows 12% per level (list_buildings gives each building's own):
town_hall - Town Hall [core, 2x2, H]: 1/1 placed, 0 in inventory - at the limit (1/1). Heart of the city. Its level IS your city tier. Advice: Every upgrade raises the level ceiling for every other building, unlocks at least one new blueprint, widens the buildable radius and raises several build limits. Town Halls 2, 4, 6, 9 and 12 also raise the labour cap by one (build another Labour Hut to staff it).
lumber_mill - Lumber Mill [producer, 2x2, E]: 1/2 placed, 1 in inventory - CAN PLACE NOW. Cuts Wood continuously to supply construction. Advice: Wood is the core building material. Every structure and every upgrade needs it.
spike_trap - Spike Trap [barrier, 1x1, B]: 1/2 placed, 1 in inventory - CAN PLACE NOW. Spiked steel barricade that shreds tires on contact. Blocks only its own tile: put it ON a road tile. Advice: A solid barrier like a roadblock, but every ram also tears the raider's tires, a harder bite than a roadblock's. Cheaper to break than a roadblock; upgrades make it tougher, not sharper.
...
```

**`get_rules`** `{}`: the design rules in prose: grid, radius and road limit per Town Hall,
footprints and spacing, the reach of every turret, trap and aura in tiles, what each op may do,
what the AI cannot do, battle locking, rate limits.

**`validate_design`** `{}`: layout errors and warnings, the raid-defense report (how well each
threat kind is covered, the gem bounty a raider would earn, concrete gaps), COVERAGE (which turrets
reach each Main Gate and the Town Hall), traps and barriers off the roads, and unused inventory.
The score and the bounty count only what is placed and its levels; moving turrets changes COVERAGE,
not the score.

```text
LAYOUT: no errors, no warnings.

RAID DEFENSE at Town Hall 1: score 1.00 (1.00 = every threat kind fully covered); 1.00 of 1 kinds covered, weakest 100%.
A raider who razes this city earns 2 of at most 2 gems (more defense = bigger bounty = a harder raid). 12 buildings count toward destruction.
No gaps: every threat kind is fully covered.
The score and the bounty count only WHAT is placed and its levels, not where: moving buildings never changes them. Placement shows in COVERAGE and ROAD PLACEMENT below.

COVERAGE: no turret is placed, so none reaches the Main Gates or the Town Hall (the first turret, the Sniper Watchtower, unlocks at Town Hall 2).

ROAD PLACEMENT: 3 of 3 traps and barriers are on a road (or, for a trap, reach one with their trigger radius).

UNUSED INVENTORY: lumber_mill x1, spike_trap x1, roadblock x2, tree x3.
ROADS: 105/130 placed, 25 tiles in the inventory.
```

On the Town Hall 5 fixture (`tools/online/fixtures/th5-city.cloud.json`) COVERAGE finds a gap the
score cannot show:

```text
COVERAGE - turrets whose range (at their level, before aura bonuses) reaches each Main Gate tile, where every raid enters, and the Town Hall (distance / range in tiles):
- North Gate (0,-15): 2 turrets - Sniper Watchtower bmumqoxbmookjzgrj (3,-8) L4 [7.6/15.8], Missile Silo bmumqoxbrukmmifmu (-2,-4) L4 [11.2/13.6]
- East Gate (15,0): 2 turrets - Sniper Watchtower bmumqoxbnj2p4suve (9,2) L2 [6.3/13], Sniper Watchtower bmumqoxbmookjzgrj (3,-8) L4 [14.4/15.8]
- South Gate (0,15): NO turret reaches it.
- Town Hall (3,3): 4 turrets - Sniper Watchtower bmumqoxbnj2p4suve (9,2) L2 [6.1/13], Missile Silo bmumqoxbrukmmifmu (-2,-4) L4 [8.6/13.6], Sniper Watchtower bmumqoxbmookjzgrj (3,-8) L4 [11/15.8], Sniper Watchtower bmumqoxbmm2q34z99 (-8,-2) L3 [12.1/14.4]

ROAD PLACEMENT: 13 of 13 traps and barriers are on a road (or, for a trap, reach one with their trigger radius).
```

**`get_battles`** `{ include_finished?: boolean = false }`: your battles with opponent, mode,
theme, phase, deadlines and countdowns, lock state and results. Read-only.

```text
Now: 2026-09-29T16:17:52.208Z. 1 active battle:
- vs Bob (TH1) - scheduled, night [docsBattle1]: DESIGN phase - the city locks in 3h 0m (at 2026-09-29T19:17:51.911Z). Every edit made before then is part of what Bob will raid.
```

### Design tools

`rot` is the facing in degrees: 0, 90, 180 or 270 (a multiple of 90; spike traps and roadblocks
ignore it because they turn to follow their wall links).

**`place_building`** `{ type, gx, gz, rot? }`: place one unit of `type` from the inventory.

```text
Done - saved as rev 2. The player's open game applies it live.
- Placed Lumber Mill bmumvr6g7tab959wh at (-1,-7), level 1.
Now: inventory spike_trap x1, roadblock x2, tree x3; roads 105/130 placed, 25 tiles left; storage 0/0 slots.
```

Refusals name the blocker and suggest free tiles:

```text
Refused (BLOCKED): Tile (3,4) is blocked by Town Hall bmumqowj6gngaw258 at (3,3) - a 2x2 footprint there would overlap it. Free tiles nearby: (3,8), (2,8), (4,8). Nothing was changed.

Refused (OUTSIDE_RADIUS): (13,6) is outside the buildable area: a Town Hall 1 city builds within 11.5 tiles of the centre (0,0), and hypot(13,6) = 14.32. Free tiles nearby: (10,5), (11,3), (10,4). Nothing was changed.
```

**`move_building`** `{ id, gx, gz, rot? }`: move (and optionally turn) a building. Not Main
Gates, not a building being upgraded. The building ignores its own old spot.

```text
Done - saved as rev 3. The player's open game applies it live.
- Moved Roadblock Barrier bmumqowj8u1w1nm4e from (0,11) to (0,9). Road: on a road tile.
```

**`stow_building`** `{ id }`: put a building into Big Storage (it keeps its level and returns to
the inventory). Needs a standing Big Storage depot with a free slot. Not the Town Hall, gates, trees
or a building being upgraded. A producer's output up to the stow becomes a bank credit (see
[How an edit is saved](#how-an-edit-is-saved)).

```text
Refused (NO_DEPOT): Stowing needs a Big Storage Depot (unlocks at Town Hall 3) and this city has none standing. Nothing was changed.
```

**`remove_tree`** `{ id }`: clear a tree for good (decoration; nothing is refunded).

```text
Done - saved as rev 4. The player's open game applies it live.
- Cleared tree bmumqowj8ivs0xchr at (-10,-3) (decoration: nothing is refunded).
```

**`add_roads`** `{ tiles?: [[gx,gz],...] | path?: [[gx,gz],...] }`: one road tile from the
inventory per new tile, up to the Town Hall's road limit. `path` joins waypoints with straight or
L-shaped runs (along gx first, then gz), every tile inclusive. Tiles already paved are skipped; any
other refusal draws nothing.

```text
CALL add_roads {"path":[[-7,9],[-3,9]]}
Done - saved as rev 5. The player's open game applies it live.
- Drew 5 road tiles. Roads 110/130, 20 left in inventory.

CALL add_roads {"path":[[-9,7],[-9,9],[-5,9]]}
Refused (OUTSIDE_RADIUS): Road tile (-9,8) is outside the buildable area (Town Hall 1: radius 11.5, hypot = 12.04). Nothing was drawn. Nothing was changed.
```

**`remove_roads`** `{ tiles? | path? }`: erase road tiles; each goes back to the inventory. Tiles
with no road are skipped.

```text
Done - saved as rev 6. The player's open game applies it live.
- Erased 1 road tile (back in the inventory).
```

**`apply_design`** `{ ops: [...], dry_run?: boolean = false }`: many ops as **one** change:
all-or-nothing, one live update in the game, one undo step. Ops run in order, so later ops see
earlier ones (stow a building, then place something where it stood). `dry_run: true` validates
everything and returns the resulting map without saving. Op shapes:

```text
{ "op": "place",        "type": "sniper_tower", "gx": 3, "gz": -6, "rot": 90 }
{ "op": "move",         "id": "bmumqowj8u1w1nm4e", "gx": 0, "gz": 9 }
{ "op": "stow",         "id": "..." }
{ "op": "remove_tree",  "id": "..." }
{ "op": "add_roads",    "tiles": [[1,-9]] }          or  "path": [[-7,9],[-3,9]]
{ "op": "remove_roads", "tiles": [[-3,9]] }          or  "path": [...]
```

```text
CALL apply_design {"ops":[{"op":"place","type":"spike_trap","gx":10,"gz":0},{"op":"place","type":"roadblock","gx":0,"gz":-9},{"op":"add_roads","tiles":[[1,-9]]}],"dry_run":true}
Dry run - nothing was saved (the city is still rev 6). All 3 ops would succeed:
- Placed Spike Trap bmumvr6ibs6wg85ai at (10,0), level 1. Road: on a road tile.
- Placed Roadblock Barrier bmumvr6ibix2iex1c at (0,-9), level 1. Road: on a road tile.
- Drew 1 road tile. Roads 110/130, 20 left in inventory.
Would leave: inventory roadblock x1, tree x3; roads 110/130 placed, 20 tiles left; storage 0/0 slots.

Map after these ops (legend as in get_city):
...
```

A trap or barrier placed off the roads is called out (dry run on the starter city):

```text
- Placed Spike Trap bmun1yjpoalyttv00 at (0,9), level 1. Road: on a road tile.
- Placed Roadblock Barrier bmun1yjpoycjfy8hg at (-3,-9), level 1. Road: OFF-ROAD: no road on (-3,-9) (nearest road tile (0,-9), 3 tiles away); a barrier blocks only its own tile, so raiders on the roads drive past it unless it closes a gap in a wall.
Would leave: inventory lumber_mill x1, roadblock x1, tree x3; roads 105/130 placed, 25 tiles left; storage 0/0 slots.
```

The first call above without `dry_run` saved it as rev 7, and `get_city` then reported: *last saved by the
AI designer 0s ago: "placed 2 buildings (Spike Trap, Roadblock Barrier); drew 1 road tile"*. That
summary is also the toast the player sees.

**`undo_last_change`** `{}`: restore the version the latest AI change replaced. Call it again to
step further back through the AI's changes.

```text
Undone - saved as rev 8: the city is back to how it was at rev 6 (reverted: placed 2 buildings (Spike Trap, Roadblock Barrier); drew 1 road tile). The player's open game applies it live.
Call undo_last_change again to step further back.
...
Refused (NOTHING_TO_UNDO): Nothing left to undo: every AI designer change since the game last saved the city has already been undone.
```

Undo only works while the latest version was written by the AI. As soon as the game saves a change
of its own (you place something, buy something, collect output), undo refuses with "the current
version of the city (rev N) was saved by the game". That includes an AI edit that reached your open
game while it still had a change of its own to upload (within about 3 s of your last edit, or
after an offline spell): the game merges the two and saves the result as its own version, so that
AI edit can no longer be undone. Paying out a stow credit is not such a change: the game pays it
through the bank and does not save the city just for that, so "stow that mill... no, undo it"
works with the game open. Undo never reverts your own work, and it never takes money
back: bank credits already issued stay, and a producer that comes back after an AI stow comes back
empty. It never throws output away either: a producer that the undo takes off the map (because the
undone change placed it) is settled like a stow. Its stored output is credited to the bank, and
the reply names it:

```text
The stored output of what this took off the map is credited to the bank when the game next syncs (as a stow credits it): Iron Foundry bmun9seeqbefa0xru 32400 iron.
```

A Crypto Vault keeps its sealed cash inside. If the vault goes back to the plain inventory, it is
kept in Big Storage instead, because only a stored unit can hold sealed cash. Storage can then show
one more unit than it has slots.

### Error codes

| Code | Meaning |
|---|---|
| `UNKNOWN_TYPE`, `NOT_PLACEABLE` | not a building type, or not placeable (roads use `add_roads`; gates are fixed) |
| `NOT_IN_INVENTORY` | none of that type in the inventory (the message also says if it is locked or at its limit) |
| `LOCKED`, `AT_LIMIT` | not unlocked at this Town Hall, or already at its limit |
| `OUTSIDE_RADIUS`, `BLOCKED` | outside the build radius, or the footprint overlaps another structure |
| `NOT_FOUND`, `IMMOVABLE`, `UNDER_CONSTRUCTION` | no building with that id, a Main Gate, or being upgraded |
| `NOT_STOWABLE`, `NO_DEPOT`, `STORAGE_FULL` | Town Hall/gate/tree, no Big Storage depot, or no free slot |
| `NOT_A_TREE` | `remove_tree` on something else |
| `NO_ROAD_INVENTORY`, `ROAD_LIMIT` | out of road tiles, or at the Town Hall's road limit |
| `BAD_ARGS` | malformed arguments (for example `rot: 45`) |
| `NO_CITY` | this account has no cloud city yet: open the game and sign in once |
| `NOTHING_TO_UNDO`, `NO_HISTORY` | nothing the AI can undo, or the version is older than the 20 kept |
| `MISSING_TOKEN`, `MALFORMED_TOKEN`, `UNKNOWN_TOKEN`, `REVOKED_TOKEN`, `BAD_SCOPE` | "Access denied": token problems, each with what to do |
| `AUTH_THROTTLED` | "Try again later": the token was not checked, because this address (20 a minute) or this server (1000 + 500 a minute, see "Security notes for hosts") tried too many unrecognised tokens; `retryAfterSec` says when |
| `RATE_LIMITED` | over 30 changes or 120 reads per minute; `structuredContent.retryAfterSec` says when to retry |

## Prompts

The server also offers two prompts. Claude Code lists MCP prompts as slash commands
(`/mcp__city-siege__fortify_for_battle`, `/mcp__city-siege__tidy_city`); other clients show them in
their prompt or attachment menu.

- **`fortify_for_battle`** `{ battle_id?, focus? }`: finds the battle and its lock time (and stops
  if the city is already locked), reads the city and its defense gaps, plans turrets, traps and
  barriers around the gate approaches (turret ranges in tiles, traps and barriers on the road
  tiles), applies everything as one dry-run-then-real `apply_design`, and reports which turrets now
  cover each gate and the Town Hall, what is still off the roads, and what you should still buy or
  upgrade.
- **`tidy_city`** `{ style? }`: fixes layout warnings, keeps a road from every gate to the centre,
  lines buildings up into blocks, clears only trees in the way, and never weakens the defense.

## Example requests

- "Call get_city, then fortify my city for tonight's battle: put my turrets where they cover the
  gates and keep the Town Hall deep inside."
- "Fortify my north gate for tonight's battle. Put my spike trap and roadblocks on the north road
  between (0,-11) and (0,-6), and show me a dry run first."
- "Place everything in my inventory where it helps defense most, then run validate_design and fix
  what it reports."
- "Tidy my city: connect every building to a road and clear the trees that are in the way."
- "Show me the map and list my weakest defense kinds."
- "Undo your last change."

The AI cannot buy, so the best flow is: buy and upgrade in the game, then ask the AI to arrange it.

## How an edit is saved

Each design call is **one Firestore transaction** on your city:

1. Read `cities/{uid}`, your recent battles and the edit history. No city yet: refuse with
   `NO_CITY` ("open the game and sign in once").
2. Apply the ops to a working copy with `cityRules`, all-or-nothing. Any refusal: nothing is
   written. A change that alters nothing (roads that are already there) is not saved.
3. **Battle lock.** For every battle already in its fight (or resolving) phase that has no locked
   copy of your city yet, write your city **as it was before this edit** into the battle first. That
   is what your opponent raids. Battles still in their design phase are not affected: edits made
   then count.
4. Keep the old version as `cities/{uid}/history/{oldRev}` (the latest 20 are kept) for undo.
5. Write the city with `rev + 1`, `updatedBy: 'mcp'` and `lastChange.summary` (the toast text).
   The production clock moves with the output: before the ops, every producer's stored output is
   brought up to now (what your open game shows) and `layout.savedAt` is set to now. So stowing a
   producer credits everything it made up to the stow, and a building the AI places starts empty.

Parallel edits for one player are queued inside the server and run one after the other.

Your open game notices the new rev within a second or two and applies it, unless you are busy
(raiding, dragging a building, template modal open): then it waits until you are done.

**Bank credits.** Stowing a producer that holds output would bank that output in the game. The
server cannot touch the bank, so it records a credit in the city's `holdings.bankCredits`. An undo
that takes a placed producer off the map records one the same way (reason `stow <type>`, like a
stow). The game pays it into your bank once per account (the bank remembers the credit ids it was
paid, however many devices see them), and the toast says so ("+💰N banked from stowed output").
Paid credits are dropped from the city by the next AI write (or the game's next real save), and
`get_city` lists as PENDING only those not yet in `saves/{uid}.credited`. That list keeps every paid
id the city still carries, up to 100; because each AI write prunes it, it does not fill up while the
AI keeps editing.

## Environment variables

| Variable | Used by | Meaning |
|---|---|---|
| `CITY_SIEGE_TOKEN` | stdio | Your access token. |
| `FIREBASE_PROJECT_ID` | both | The Firebase project. Default: the service-account key's `project_id`, else `demo-city-siege` (emulator only). |
| `GOOGLE_APPLICATION_CREDENTIALS` | both | Path to a service-account key file. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | both | The service-account key JSON itself. |
| `FIRESTORE_EMULATOR_HOST` | both | Development: use the Firestore emulator (e.g. `127.0.0.1:8085`); no credentials needed. |
| `PORT` | HTTP | Listen port, default 8787 (`--port` overrides). |
| `HOST` | HTTP | Bind address, default `127.0.0.1` (`--host` overrides; Docker uses `0.0.0.0`). |
| `MCP_AUTH_CACHE_MS` | both | Token check cache, default 30000. |
| `TRUST_PROXY` | HTTP | `1` behind one reverse proxy or load balancer (Cloud Run): the caller's address, which unknown-token throttling counts by, is then the last `X-Forwarded-For` entry. Off by default (the socket address). |

With none of the credential variables set, the server uses Google application default credentials
(for example Cloud Run's service identity). It refuses a `demo-*` project unless
`FIRESTORE_EMULATOR_HOST` is set. `node mcp-server/src/index.js --help` prints all of this.

## Troubleshooting

**"Access denied (MISSING_TOKEN)" / HTTP 401.** The client sends no token: check `CITY_SIEGE_TOKEN`
(stdio) or the `Authorization: Bearer ...` header (HTTP).

**"Access denied (UNKNOWN_TOKEN)".** The token was copied incompletely, deleted, or belongs to
another Firebase project (for example an emulator token used against production). Generate a new
one.

**"Access denied (REVOKED_TOKEN)".** It was revoked in the game. Generate a new one.

**"Refused (NO_CITY)".** This account has never uploaded a city. Open the game, sign in, and keep it
open a few seconds.

**The AI says it saved, but the game did not change.** Is the game signed in to the same account
(the pill shows your name)? Is it busy (a raid, a building in your hand, the template modal)? The
change applies when you are done. Check the cloud dot: grey means offline.

**"Rate limit reached (RATE_LIMITED)".** Wait the number of seconds it says. Ask the AI to batch
edits into one `apply_design`.

**Undo refuses after I played.** Expected: undo only reverts AI changes made since the game last
saved the city. Change it back by hand or ask the AI to redo the old layout.

**stdio server exits at once, or the client shows it as failed.** Run the same command in a
terminal to see its error on stderr. Typical: "Project demo-city-siege is an emulator-only demo
project, but FIRESTORE_EMULATOR_HOST is not set", or a missing `npm install` in `mcp-server/`.

**HTTP server unreachable from Claude Desktop.** Desktop needs the `mcp-remote` bridge (above), and
`--allow-http` for a plain-http URL that is not localhost.
