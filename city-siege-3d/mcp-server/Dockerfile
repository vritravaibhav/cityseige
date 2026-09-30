# City Siege MCP server - the Streamable HTTP transport, for hosting one instance that every
# player's MCP client connects to with its own access token.
#
# The server imports the game's pure rules (../src/shared, ../src/data), so the build context is
# the GAME folder, not mcp-server/:
#
#   cd city-siege-3d
#   docker build -f mcp-server/Dockerfile -t city-siege-mcp .
#   docker run -p 8787:8787 \
#     -e FIREBASE_PROJECT_ID=your-project \
#     -e FIREBASE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)" \
#     city-siege-mcp
#
# On Cloud Run leave the key out and give the service a service account with Firestore access
# (application default credentials); PORT is set by the platform.

FROM node:20-slim

WORKDIR /app

# Dependencies first, so code edits do not reinstall them.
COPY mcp-server/package.json mcp-server/package-lock.json ./mcp-server/
RUN cd mcp-server && npm ci --omit=dev && npm cache clean --force

# Only what the server imports: the shared pure rules, the progression tables, the server.
COPY src/shared ./src/shared
COPY src/data ./src/data
COPY mcp-server/src ./mcp-server/src

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787
EXPOSE 8787
USER node

HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "mcp-server/src/index.js", "--http"]
