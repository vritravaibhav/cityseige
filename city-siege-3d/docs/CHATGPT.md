# Connect ChatGPT to your city (OAuth)

ChatGPT cannot take a pasted access token, so it connects the way it connects to any app: **OAuth**.
You add City Siege as a connector in ChatGPT, press Connect, ChatGPT sends you to City Siege's
**CONNECT** screen, you press **ALLOW**, and you are back in ChatGPT, connected. From then on you can
ask it to design your city, and every change shows up live in your open game.

It is the same design-only access as the token: ChatGPT can place, move and stow buildings, clear
trees and draw or erase roads. It can never attack, buy, upgrade, collect, or touch your bank.

Other MCP clients that sign in with OAuth (for example Claude's custom connectors) use the same flow;
only ChatGPT's is described step by step here.

- [What you need](#what-you-need)
- [Quick test from your own computer (tunnel)](#quick-test-from-your-own-computer-tunnel)
- [Add the connector in ChatGPT](#add-the-connector-in-chatgpt)
- [Using it](#using-it)
- [Hosting it for real](#hosting-it-for-real)
- [How it works](#how-it-works)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## What you need

1. **Online play working**: a Firebase project with Authentication enabled and the rules deployed
   ([ONLINE.md](ONLINE.md)). This repo uses `shadow-duel-dark-2026`; `npm run deploy:rules` deploys the
   rules, including the two OAuth collections this needs.
2. **A City Siege account**: sign up in the game (👤 pill → Profile). Your city uploads on the first sign-in.
3. **A service-account key** for the MCP server (Firebase console → Project settings → Service accounts
   → Generate new private key). Keep it **outside the repo**, e.g. `~/.config/city-siege/key.json`.
4. **The MCP server on a public https URL.** ChatGPT's servers call it over the internet, so
   `localhost` is not enough. For a quick test, a tunnel gives your local server a public https URL
   (next section). For everyone else, host it ([below](#hosting-it-for-real)).
5. **ChatGPT with developer mode.** Custom MCP connectors live under developer mode. Which plans get it,
   and whether write tools are allowed there, is up to OpenAI and has changed over time: check the
   current [developer mode help page](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt).

## Quick test from your own computer (tunnel)

Three terminals in `city-siege-3d/`:

```bash
# 1. the game, online against the real project (reads .env.local)
npm run dev                      # prints its URL, e.g. http://localhost:3001/ (3000 when free)

# 2. a public https URL for the MCP server (install once: brew install cloudflared)
cloudflared tunnel --url http://localhost:8787
#    -> prints https://<random-words>.trycloudflare.com

# 3. the MCP server with OAuth on. PUBLIC_URL = the tunnel URL from step 2 (no trailing slash),
#    GAME_URL = the game URL from step 1 (the CONNECT screen opens there, in YOUR browser).
GOOGLE_APPLICATION_CREDENTIALS=~/.config/city-siege/key.json \
FIREBASE_PROJECT_ID=shadow-duel-dark-2026 \
PUBLIC_URL=https://<random-words>.trycloudflare.com \
GAME_URL=http://localhost:3001/ \
TRUST_PROXY=1 \
npm run mcp:http
```

The server logs `OAuth on: issuer https://<random-words>.trycloudflare.com ...`. Check it from
anywhere: `https://<random-words>.trycloudflare.com/.well-known/oauth-protected-resource` should
show `"resource": "https://<random-words>.trycloudflare.com/mcp"`.

A quick tunnel's URL changes every time you start it: then restart the MCP server with the new
`PUBLIC_URL` and edit the connector's URL in ChatGPT.

## Add the connector in ChatGPT

1. ChatGPT → **Settings → Apps & Connectors → Advanced settings** → turn on **Developer mode**.
   (OpenAI moves this now and then; its [developer mode guide](https://developers.openai.com/api/docs/guides/developer-mode)
   has the current path.)
2. **Create** a connector:
   - Name: `City Siege`; description: `Designs my City Siege city`.
   - **MCP Server URL**: `https://<your-server>/mcp` (with `/mcp`).
   - **Authentication**: **OAuth**. Leave client ID/secret empty: ChatGPT registers itself.
   - Confirm that you trust the app, then **Create**.
3. ChatGPT opens the sign-in: you land on City Siege's **CONNECT** screen. If you are not signed in
   to the game in that browser, press **SIGN IN TO CONTINUE**, sign in, and you come straight back.
4. Check the screen: it names the app (**ChatGPT**), where you go back to (**chatgpt.com**), your
   commander name, and what the app may and may not do. Press **✓ ALLOW**.
5. You are back in ChatGPT and the connector shows as connected. In the game, ACCOUNT → AI Designer
   now lists **🔗 ChatGPT · signed in · chatgpt.com**.

The same list in the game is where you disconnect: **Revoke** stops ChatGPT at once (within 30 s),
and its refresh token dies with it.

## Using it

In a chat, enable the City Siege connector (the `+` / tools menu → Developer mode → City Siege) and
ask, for example:

- "Call get_city and show me my map."
- "Fortify my city for tonight's battle: turrets covering the gates, the Town Hall deep inside."
- "Place everything in my inventory where it helps defence most, then run validate_design and fix
  what it reports."
- "Undo your last change."

Keep the game open on the Design Map to watch: each change arrives with a toast
"🤖 AI designer: ...". ChatGPT may ask you to confirm tools that change your city; that is ChatGPT's
safety step, not the game's. The full tool list is in [MCP.md](MCP.md#tools-reference).

## Hosting it for real

For other players (and a URL that does not change) run the server on any Node host with https:
Render, Fly.io, Railway, a VPS behind Caddy/nginx, or Cloud Run (needs a billing account). The Docker
image and the host-specific steps are in [MCP.md](MCP.md#hosting-the-http-server). OAuth needs these
environment variables on top of the usual ones:

| Variable | Value |
|---|---|
| `PUBLIC_URL` | the server's public https origin, e.g. `https://mcp.city-siege.example` (no path, no trailing slash). It is the OAuth issuer and `<PUBLIC_URL>/mcp` is the resource tokens are bound to, so it must be exactly what ChatGPT reaches. |
| `GAME_URL` | where players open the game, e.g. `https://play.city-siege.example/`. Its CONNECT screen approves connections, so it must be the game built for the **same Firebase project**. |
| `OAUTH_REDIRECT_HOSTS` | optional allowlist of app redirect hosts, e.g. `chatgpt.com,claude.ai`. Unset = any https redirect (and `localhost`) may register. |
| `TRUST_PROXY=1` | behind a proxy or tunnel (throttling uses the caller's real address). |

Then set `VITE_MCP_SERVER_URL=https://<your-server>/mcp` for the game build, so ACCOUNT → AI Designer
shows the right URL to paste into ChatGPT, and add the game's domain to Firebase Authentication →
Settings → Authorized domains.

## How it works

```mermaid
sequenceDiagram
    participant C as ChatGPT
    participant M as MCP server (PUBLIC_URL)
    participant B as Your browser
    participant G as Game (GAME_URL) CONNECT screen
    participant F as Firestore
    C->>M: POST /mcp (no token)
    M-->>C: 401 WWW-Authenticate: resource_metadata=...
    C->>M: GET /.well-known/oauth-protected-resource, /.well-known/oauth-authorization-server
    C->>M: client ID metadata document or POST /oauth/register
    C->>B: open /oauth/authorize (PKCE S256, state, resource)
    B->>M: GET /oauth/authorize
    M->>F: oauthRequests/{id}
    M-->>B: 302 GAME_URL?oauth_request={id}
    B->>G: CONNECT screen (sign in if needed)
    G->>F: read oauthRequests/{id}; ALLOW writes oauthApprovals/{id} = {uid} (rules check who)
    G-->>B: go to /oauth/finish?req={id}
    B->>M: GET /oauth/finish
    M->>F: spend request, oauthCodes/{hash}
    M-->>B: 302 chatgpt.com/...?code&state&iss
    B->>C: code
    C->>M: POST /oauth/token (code + code_verifier)
    M->>F: mcpTokens/{grantId} kind oauth (hashes only)
    M-->>C: access token (1 h) + refresh token (60 days, rotated)
    C->>M: POST /mcp  Authorization: Bearer cso_...
    M->>F: design edit on YOUR city -> the open game applies it live
```

- Standards: OAuth 2.1 authorization code + PKCE (S256 only), protected-resource metadata
  (RFC 9728), authorization-server metadata (RFC 8414), Dynamic Client Registration (RFC 7591) and
  Client ID Metadata Documents (the method ChatGPT prefers), the `iss` response parameter (RFC 9207,
  which lets ChatGPT use its stable redirect URI), `resource` binding (RFC 8707), token revocation
  (RFC 7009). All clients are public clients: no client secrets.
- The code: `mcp-server/src/oauth.js` (the authorization server), `mcp-server/src/auth.js`
  (checking `cso_` access tokens), `mcp-server/src/http.js` (401 challenges),
  `src/ui/ConnectUI.js` (the CONNECT screen), `OnlineController.getOAuthRequest / approveOAuthRequest`,
  and the `oauthRequests` / `oauthApprovals` rules in `firestore.rules`.

## Security

- **Who approved is proven by Firebase Auth**, not by anything in a URL: ALLOW is a Firestore write
  that the rules accept only as `{ uid: <your own uid> }`, only while the request is open, and only
  once. No password or token ever passes through the game's URL or this server's pages.
- **Codes are useless when stolen**: a code is spent on first use (even a failed one) and needs the
  PKCE verifier only the app that started the flow has.
- **Tokens**: the access token lives 1 hour, the refresh token 60 days and is replaced on every use
  (the previous one is accepted for 2 more minutes, so a lost network answer does not disconnect
  you). Firestore keeps only SHA-256 hashes. Tokens are bound to `<PUBLIC_URL>/mcp`.
- **Design-only**: the same 14 tools as a pasted token, the same rules as the Design Map, and a
  battle's locked city is never touched.
- **Know the app**: the CONNECT screen shows where you will be sent back to. Only allow apps you
  started the connection from; `OAUTH_REDIRECT_HOSTS` lets a host restrict which apps can register.
- **Client metadata documents** are fetched over https only, from public addresses only (checked on
  the connection itself), at most 32 KB, cached for an hour.

## Troubleshooting

| What you see | Why / fix |
|---|---|
| ChatGPT: "Error creating connector" or it never asks you to sign in | It cannot reach the server or its metadata. Open `https://<server>/.well-known/oauth-protected-resource` in a browser; the `resource` must be exactly `https://<server>/mcp`. With a tunnel: the tunnel URL changed, or `PUBLIC_URL` is not the tunnel URL. |
| The browser goes to `http://localhost:...` and nothing loads | `GAME_URL` points at a game that is not running (on that machine). Start it, or point `GAME_URL` at the hosted game. |
| CONNECT says "Online play is off in this build" | That game build has no Firebase config: run `npm run dev` (with `.env.local`), not `npm run dev:offline`. |
| CONNECT: "This link has expired" | More than 10 minutes passed, or the request was already used. Press Connect in ChatGPT again. |
| Sign-in fails with an auth error | Authentication is not enabled on the Firebase project, or the game's domain is not an authorized domain. |
| A page "Not approved yet" | You opened the finish link without pressing ALLOW: go back to CONNECT. |
| "Wrong return address" / "Unknown app" page | The app's registration and its request do not match (for example a connector re-created in ChatGPT): delete the connector and create it again. With `OAUTH_REDIRECT_HOSTS` set, its host may not be on the list. |
| ChatGPT keeps asking you to reconnect | The connection was revoked in the game or has not been used for 60 days, or `PUBLIC_URL` changed (tokens are bound to the old URL). |
| Permission denied when approving | The deployed `firestore.rules` are older than this feature: `npm run deploy:rules`. |

Tests: `npm run test:oauth` (the protocol, including the official MCP SDK client doing the whole
flow by itself with both registration methods) and `npm run test:e2e:oauth` (the real CONNECT screen
in Chrome). See [ONLINE.md](ONLINE.md#testing).
