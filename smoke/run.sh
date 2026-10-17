#!/usr/bin/env bash
# Installs the module into a fresh Nuxt app (smoke/app) and checks types, a production build,
# SSR, the browser and dev regeneration, with routeTypedFetch both off and on.
#
#   npm run test:smoke              # the module built from this repo
#   npm run test:smoke -- 0.1.1     # a version published to npm
#
# Env: SMOKE_BROWSER=0 skips the Chrome checks, SMOKE_KEEP=1 keeps the temp app for poking around.
set -euo pipefail

SMOKE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(dirname "$SMOKE")
VERSION=${1:-}
PORT=${SMOKE_PORT:-4310}
WORK=$(mktemp -d)
SERVER=

stop_server() {
  if [ -n "$SERVER" ]; then
    pkill -P "$SERVER" 2>/dev/null || true
    kill "$SERVER" 2>/dev/null || true
    wait "$SERVER" 2>/dev/null || true
    SERVER=
  fi
}
cleanup() {
  stop_server
  if [ "${SMOKE_KEEP:-0}" = 1 ]; then echo "kept the app in $WORK"; else rm -rf "$WORK"; fi
}
trap cleanup EXIT

wait_for_server() {
  for _ in $(seq 1 120); do
    curl -sf "http://localhost:$PORT/api/health" >/dev/null && return 0
    sleep 0.5
  done
  echo "server didn't start on :$PORT" && exit 1
}

browser_flag=--browser
[ "${SMOKE_BROWSER:-1}" = 0 ] && browser_flag=

echo "▶ setting up the app in $WORK"
cp -R "$SMOKE/app/." "$WORK"
cp "$SMOKE/check.mjs" "$WORK"
if [ -z "$VERSION" ]; then
  (cd "$ROOT" && npm run prepack >/dev/null && npm pack --pack-destination "$WORK" >/dev/null 2>&1)
  SDK=$(ls "$WORK"/nuxt-api-sdk-*.tgz)
else
  SDK=nuxt-api-sdk@$VERSION
fi
cd "$WORK"
npm install --prefer-online --no-audit --no-fund --loglevel=error >/dev/null
npm install --prefer-online --no-audit --no-fund --loglevel=error "$SDK" >/dev/null
echo "  using nuxt-api-sdk@$(node -p "require('./node_modules/nuxt-api-sdk/package.json').version"), nuxt@$(node -p "require('./node_modules/nuxt/package.json').version")"

for mode in 0 1; do
  export ROUTE_TYPED=$mode
  echo "▶ routeTypedFetch: $([ $mode = 1 ] && echo on || echo off)"

  # h3 generic body/query types are only read by route-typed fetch
  if [ $mode = 1 ]; then cp extras/sdk-types-route.ts app/; else rm -f app/sdk-types-route.ts; fi
  npx nuxt prepare >/dev/null 2>&1
  npx vue-tsc -b --noEmit
  echo "  ✔ types"

  npx nuxt build >/dev/null 2>&1
  PORT=$PORT node .output/server/index.mjs >/dev/null 2>&1 &
  SERVER=$!
  wait_for_server
  node check.mjs "http://localhost:$PORT/" $browser_flag
  stop_server
done

echo "▶ dev: adding a route while nuxt dev is running"
npx nuxt dev --port "$PORT" >dev.log 2>&1 &
SERVER=$!
wait_for_server
node check.mjs "http://localhost:$PORT/"
mkdir -p server/api/live
cat >server/api/live/ping.post.ts <<'TS'
export const body = defineRouteType<{ n: number }>()
export default defineEventHandler(async (event) => ({ pong: (await readBody<{ n: number }>(event)).n + 1 }))
TS
for _ in $(seq 1 60); do grep -q 'ping: {' .nuxt/nuxt-api-sdk.ts && break; sleep 0.5; done
grep -q 'ping: {' .nuxt/nuxt-api-sdk.ts || { echo "the sdk wasn't regenerated with the new route" && exit 1; }
sleep 1
node check.mjs "http://localhost:$PORT/" --live
stop_server

echo "✔ smoke test passed"
