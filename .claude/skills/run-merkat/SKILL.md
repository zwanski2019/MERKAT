---
name: run-merkat
description: Build, launch, and drive the MERKAT POS app (web shell + API) headless. Use to run, start, serve, smoke-test, or screenshot MERKAT — the Vite React operator shell and the NestJS API.
---

# Run MERKAT

MERKAT is an offline-first POS monorepo (Turborepo + pnpm). The operator UI is a
**Vite + React SPA** (`packages/ui`, hosted by `apps/web`); the backend is a
**NestJS API** (`apps/api`). A Tauri desktop shell (`apps/desktop`) wraps the
same web SPA but **cannot be built in this container** (see Gotchas).

The driver is **`.claude/skills/run-merkat/smoke.sh`** — it builds the graph,
launches the API + web preview, drives the shell with **headless Google Chrome**
(screenshot + rendered-DOM assertions), asserts the API `/health`, and cleans up.
All paths below are relative to the repo root (`<unit>/`).

## Prerequisites

Node ≥ 20, pnpm 11, and a Chrome/Chromium binary. In this container all were
present. On a bare Ubuntu box:

```bash
sudo apt-get update && sudo apt-get install -y chromium-browser
npm i -g pnpm@11    # if pnpm is missing
```

## Run (agent path) — one command

```bash
bash .claude/skills/run-merkat/smoke.sh
```

It is idempotent and self-cleaning. Expected tail:

```
   /health -> {"status":"ok","product":"MERKAT"}
   ok: rendered 'MERKAT'
   ok: rendered 'Dashboard'
   ...
   screenshot: .../.claude/skills/run-merkat/out/merkat-shell.png
PASS: MERKAT web shell + API driven successfully
```

Then **look at the screenshot** at `.claude/skills/run-merkat/out/merkat-shell.png`
— it should show the MERKAT wordmark, left sidebar (Dashboard active in accent
green), the search bar + AI spark + a calm neutral "offline" sync pill, and the
Dashboard heading. A blank frame means the SPA didn't mount.

Overrides: `WEB_PORT=5000 API_PORT=4000 bash .claude/skills/run-merkat/smoke.sh`.
The rendered DOM and server logs land in `.claude/skills/run-merkat/out/`.

## Run (human path)

Two terminals, live-reloading, useless headless:

```bash
pnpm --filter @merkat/web dev          # http://localhost:5173
PORT=3099 pnpm --filter @merkat/api dev && node apps/api/dist/main.js   # :3099
```

Desktop shell (only where webkit libs exist — NOT this container):

```bash
pnpm --filter @merkat/desktop tauri:dev
```

## Build / verify the graph

```bash
pnpm install
pnpm build        # turbo builds core/db/ai/hardware/ui → web/api in order
pnpm typecheck && pnpm lint && pnpm test   # 6 money tests pass
```

## Gotchas (battle scars from this container)

- **Port 3001 is taken** by another local app ("Yoyo Admin"). The API defaults
  to **3099** here — never assume 3001 is MERKAT. `curl :3001/health` returns a
  Next.js 404 page, not MERKAT.
- **Desktop can't build here:** `pkg-config --exists webkit2gtk-4.1` fails
  (missing `libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev`).
  `tauri dev/build` will not compile. The web SPA is the drivable surface; the
  desktop shell loads that same SPA, so driving web covers the operator UI.
- **Use `http://`, not `https://`, for localhost** — headless Chrome throws an
  SSL handshake error and writes no screenshot if handed an `https` localhost URL.
- **The shell is a client-rendered SPA:** plain `curl :4173/` returns a near-empty
  `index.html`. You must render with Chrome (`--dump-dom` / `--screenshot`, with
  `--virtual-time-budget` so React effects run) to see "Dashboard", the nav, etc.
- **Chrome needs `--no-sandbox --disable-gpu`** in this container or it won't start.
- **pnpm blocks native build scripts:** `esbuild` (Vite needs its binary) and
  `@nestjs/core` are allow-listed in `pnpm-workspace.yaml` (`onlyBuiltDependencies`).
  A supply-chain hook may re-add an `allowBuilds:` block on install — leave it.
- Nav items switch the heading via React state (not URL routing), so there is one
  URL; assert rendered content, not routes. Real screens arrive in later phases.

## Troubleshooting

- `no chrome/chromium binary found` → install per Prerequisites.
- `web did not come up` → check `.claude/skills/run-merkat/out/web.log`; usually a
  busy `WEB_PORT`. Re-run with a different `WEB_PORT`.
- `unexpected /health body` → the API bound but returned wrong JSON; check
  `out/api.log`. If it's a Next.js 404, something else owns `API_PORT` (see 3001).
