#!/usr/bin/env bash
# MERKAT run/driver harness — builds, launches, and DRIVES the app headless.
#   - web (Vite React PWA shell): launched via `vite preview`, driven with
#     headless Google Chrome (screenshot + rendered-DOM assertions).
#   - api (NestJS): launched with node, smoked with curl.
# Desktop (Tauri) is intentionally NOT built here: this container lacks
# webkit2gtk-4.1 (see SKILL.md Gotchas). The desktop shell loads this same web
# SPA, so driving the web build exercises the real operator UI.
#
# Usage:  bash .claude/skills/run-merkat/smoke.sh
# Env:    WEB_PORT (default 4173)  API_PORT (default 3099)  OUT (screenshot dir)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
WEB_PORT="${WEB_PORT:-4173}"
API_PORT="${API_PORT:-3099}"   # 3001 is taken by another local app; avoid it
OUT="${OUT:-$ROOT/.claude/skills/run-merkat/out}"
mkdir -p "$OUT"

# Pick a Chrome binary present in the container.
CHROME="$(command -v google-chrome || command -v chromium-browser || command -v chromium || true)"
[ -n "$CHROME" ] || { echo "FAIL: no chrome/chromium binary found"; exit 1; }

WEB_PID=""; API_PID=""
cleanup() {
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null || true
  pkill -f "node.*vite.*preview" 2>/dev/null || true
}
trap cleanup EXIT

wait_for() { # url, name
  for _ in $(seq 1 40); do
    if curl -fsS -o /dev/null "$1" 2>/dev/null; then return 0; fi
    sleep 0.5
  done
  echo "FAIL: $2 did not come up at $1"; return 1
}

echo "== build (idempotent) =="
if [ ! -f apps/api/dist/main.js ] || [ ! -f apps/web/dist/index.html ]; then
  # Whole-graph build: turbo builds workspace deps (core/db/…) in order first.
  [ -d node_modules ] || pnpm install --frozen-lockfile
  pnpm build >/dev/null
fi

echo "== launch api on :$API_PORT =="
PORT="$API_PORT" node apps/api/dist/main.js >"$OUT/api.log" 2>&1 &
API_PID=$!
wait_for "http://localhost:$API_PORT/health" "api" || exit 1
HEALTH="$(curl -fsS "http://localhost:$API_PORT/health")"
echo "   /health -> $HEALTH"
echo "$HEALTH" | grep -q '"product":"MERKAT"' || { echo "FAIL: unexpected /health body"; exit 1; }

echo "== launch web preview on :$WEB_PORT =="
pnpm --filter @merkat/web preview -- --port "$WEB_PORT" >"$OUT/web.log" 2>&1 &
WEB_PID=$!
wait_for "http://localhost:$WEB_PORT/" "web" || exit 1

echo "== drive web shell with headless chrome =="
"$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --virtual-time-budget=6000 --window-size=1280,800 \
  --screenshot="$OUT/merkat-shell.png" "http://localhost:$WEB_PORT/" 2>/dev/null
"$CHROME" --headless=new --no-sandbox --disable-gpu \
  --virtual-time-budget=6000 --dump-dom "http://localhost:$WEB_PORT/" 2>/dev/null > "$OUT/dom.html"

# Assert the React shell actually mounted (not just the empty index.html).
fail=0
for needle in "MERKAT" "Dashboard" "POS" "Assistant" "shell is running"; do
  if grep -q "$needle" "$OUT/dom.html"; then
    echo "   ok: rendered '$needle'"
  else
    echo "   MISSING in rendered DOM: '$needle'"; fail=1
  fi
done
[ -s "$OUT/merkat-shell.png" ] && echo "   screenshot: $OUT/merkat-shell.png" || { echo "FAIL: no screenshot"; fail=1; }

[ "$fail" = 0 ] && echo "PASS: MERKAT web shell + API driven successfully" || { echo "FAIL: shell did not render"; exit 1; }
