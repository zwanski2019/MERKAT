# Build notes

## Phase 2 — Shell + auth (complete)

Gate (`CLAUDE.md §12`): PIN unlock works offline; accent recolors the app.
Verified:

- **Offline PIN unlock (§8).** Staff pick an avatar and enter a 4-digit PIN,
  validated on-device against the synced hash via **argon2id** (`hash-wasm`,
  pure WASM — same primitive in browser, Tauri, and the API). No network. Tests
  cover correct PIN, wrong PIN, lock/relock, and a full `<App>` render that goes
  locked → PIN screen → shell after unlocking.
- **Accent recolors live (§11).** The tenant accent is the one per-tenant color,
  injected as the `--accent` CSS variable; Tailwind's `--color-accent` maps to
  it, so Settings→Branding recolors the whole app as you type. Tested at the
  store level (updateBranding sets `--accent`) and via `applyAccent`.
- **Tailwind wired (was deferred from Phase 0).** Tailwind v4 via
  `@tailwindcss/vite`; design tokens (§11) mapped in `apps/web/src/index.css`.
  Purged CSS is ~4.6 kB.
- **Routing + shell.** react-router-dom; sidebar/topbar, account menu
  (lock/sign-out), calm sync pill. Nav is **permission-filtered** by role
  (`can()`, §8) — e.g. a cashier doesn't see Settings/Reports.
- **Login → JWT (§8).** `POST /auth/login` (NestJS) verifies argon2id creds and
  signs a tenant-scoped JWT; bad/malformed → 400. Verified over HTTP.
- **Permission matrix (§8).** Settings→Team renders the role × action grid from
  `ROLES`/`ACTIONS` in `@merkat/core`; a test asserts the matrix + overrides.

The UI talks only to an injected `AuthStore` (iface+mock pattern, like
SyncEngine/HardwareBridge). Phase 2 ships `SeedAuthStore`, an in-memory demo
tenant with staff carrying real argon2id hashes; Phase 5 swaps in the
synced-SQLite-backed store with no UI change. Demo PINs: Amira (owner) 4821,
Sofia (cashier) 1234; owner email login `amira@lumiere.example` /
`lumiere-owner`.

### Deferred from Phase 2 (intentional)

- **Browser-backed local store** — `SeedAuthStore` is in-memory; the real
  offline staff data flows from the synced local SQLite in Phase 5. (The Node
  SQLite path already exists from Phase 1, but the browser store is Phase 5.)
- **API JWT verification middleware / refresh tokens** — the login endpoint
  issues a JWT; guards that verify it on protected routes come with the sync +
  data endpoints (Phase 5–6). Client hides UI by role now; server-side
  enforcement per route lands with those endpoints.
- **Team editing / per-tenant permission overrides** — matrix is read-only in
  Phase 2; `can()` already supports overrides.
- **Couldn't drive the app in a real browser here** (Claude-in-Chrome extension
  not connected); verified via jsdom render of the real components + the live
  API check instead.

## Phase 0 — Scaffold (complete)

Gate (`CLAUDE.md §12`): `pnpm build` green across the graph; empty web + desktop
shells boot. Verified:

- `pnpm build` / `typecheck` / `lint` / `test` all green (8 packages).
- Web: `pnpm --filter @merkat/web preview` serves the shell (`<title>MERKAT</title>`).
- API: `PORT=3099 node apps/api/dist/main.js` → `GET /health` returns
  `{"status":"ok","product":"MERKAT"}` (proves `@merkat/core` linkage).

## Phase 1 — Schema + local DB (complete)

Gate (`CLAUDE.md §12`): both dialects migrate; seed loads; `stock_levels`
derives from movements. Verified:

- **One model, two dialects (§1.7).** `packages/db/src/schema/model.ts` is the
  single source of truth. `materialize.ts` builds concrete Drizzle `pgTable` +
  `sqliteTable` from it; `ddl.ts` emits `CREATE TABLE` for both. A drift test
  asserts identical table + column sets across dialects — they cannot diverge.
- **Both dialects migrate.** SQLite via `migrateLocal` (better-sqlite3, run in
  tests + the compiled `@merkat/db/node` smoke). Postgres DDL executed against
  PGlite in `pg.test.ts` — 23 tables created, `jsonb`/`bigint`/`timestamptz`
  round-trip, enum `CHECK` enforced. 8 db tests + 6 core tests green.
- **Stock is a ledger (§1.3, §6).** `stock_movements` is append-only signed
  deltas; `rebuildStockLevels` derives `stock_levels` as `SUM(delta)`. Tested:
  two offline `-1` movements both land and net recomputes (40 → 38), no lost
  update — the property that makes stock sync conflict-free.
- **Seed (§12).** One retail (Lumière Cosmetics, variants) + one restaurant
  (Café Central, floor/tables/menu/modifiers) tenant.
- **SQLite wired in Tauri (§7).** `tauri-plugin-sql` registered in
  `apps/desktop/src-tauri` with the generated `migrations/sqlite/0001_init.sql`
  (single-sourced from the model via `pnpm --filter @merkat/db gen:migrations`).
  Not compile-verified here — desktop native compile is still deferred (below).
- Money is stored 64-bit (§1.5): pg `bigint` / sqlite `INTEGER`, read as JS
  `number`, widened to `bigint` Money at the edge. IDs are client `uuidv7`
  (§1.2) via `newId()` in `@merkat/core`.

### Deferred from Phase 1 (intentional)

- **Postgres runtime path** — verified via PGlite only; a real PG 16 server +
  the cloud sync endpoint are Phase 5. `drizzle-kit` is installed for future pg
  migration tooling but we generate DDL from the model directly (drizzle-kit
  introspection of dynamically-built tables is awkward).
- **`mutate()` (entity + outbox in one tx, §6, §13)** — Phase 1 uses a plain
  `insertRow` bootstrap/seed helper. The transactional outbox writer lands in
  Phase 5. Do not route POS writes through `insertRow`.

## Deferred from Phase 0 (intentional, tracked here)

1. ~~**Tailwind wiring**~~ — RESOLVED in Phase 2. Tailwind v4 is wired via
   `@tailwindcss/vite`; `tokens.css` design tokens are mapped in
   `apps/web/src/index.css`, with `--accent` as a runtime variable.
2. **Desktop native compile** — this dev box is missing `webkit2gtk-4.1` /
   `javascriptcoregtk-4.1`, so `tauri dev|build` can't compile here. The Tauri v2
   shell is fully scaffolded (`apps/desktop/src-tauri`) and loads the web SPA.
   Real Windows release build + signing is **Phase 9**. To run the Linux shell:
   `sudo apt install libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev \
libsoup-3.0-dev` then `pnpm --filter @merkat/desktop tauri:dev`.

## Environment gotchas

- MERKAT is now its own git repo (root at the project dir; branch `main`).
- `better-sqlite3` is a native module — its build script is approved in
  `pnpm-workspace.yaml`. On a fresh clone with a new Node ABI, run
  `pnpm rebuild better-sqlite3` if the binding is missing.
- Port **3001** is taken by another local app ("Yoyo Admin"). Run the API on a
  free port via `PORT=`.
