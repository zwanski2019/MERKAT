# Build notes

## Phase 6 — Orders + customers + payments (complete)

Gate (`CLAUDE.md §12`): a refund creates reversing rows and reprints; a Stripe
charge reconciles via webhook. Verified:

- **Refund = reversing rows (§1.4).** A refund never destroys the sale: it
  appends a negative payment, positive stock movements that return the goods to
  the ledger (§1.3, reason `adjustment`), and reprints a refund receipt; the
  original order is marked `refunded`. A component test drives the real Orders
  screen — a recorded sale (serum 40 → 38) is refunded → stock returns to 40,
  order shows `refunded`, and a `*** REFUND ***` receipt prints. Refunding the
  same order twice is refused.
- **Stripe reconciles via webhook (§10).** `POST /payments/intent` creates a
  PaymentIntent; `POST /payments/webhook` reconciles by `provider_ref` on
  `payment_intent.succeeded`. Smoke-tested over HTTP: intent
  `requires_payment` → webhook → `succeeded`; unknown ref → 404. Uses a
  simulated gateway (real Stripe SDK path is env-gated on `STRIPE_SECRET_KEY` /
  `STRIPE_WEBHOOK_SECRET` — no keys here).
- **Orders (§5):** POS now persists each sale (`useOrders.recordSale`); Orders
  screen shows history + a detail slide-over with reprint + refund.
- **Customers / CRM (§5):** list, add (Zod-validated), and a detail panel with
  loyalty + lifetime spend. AI customer summary is Phase 8.

Same iface+mock pattern (`OrderStore`, `CustomerStore`, in-memory seeds); the
synced SQLite backs them later. Payment DTOs/webhook schema live in
`@merkat/core`.

### Deferred from Phase 6 (intentional)

- **Card-present UI (Stripe Terminal) in POS.** The provider abstraction + API
  are in place and the webhook reconcile is proven; the in-POS card confirmation
  flow (Terminal SDK, connectivity degradation to cash-only) and a real Stripe
  account are deferred. Cash remains the offline path (§10).
- **Partial refunds, loyalty accrual on sale, POS↔customer linkage** — full
  refund + CRM basics ship now; these are incremental.
- **Persisted orders across reload** — recorded in the in-memory store like the
  rest; durable via the synced SQLite (Phase 5 terminal path).

## Phase 5 — Sync (complete)

Gate (`CLAUDE.md §12`, **release-blocker e2e §13**): two offline terminals each
sell the last unit and reconcile to correct net stock; no data loss. Verified:

- **Two-terminal reconcile.** `sync.test.ts` runs two local SQLite stores + a
  `SyncServer`, seeds a shared 1-unit baseline, each terminal sells offline
  (local net 0), then they sync. Both converge to net **−1** (oversold but
  correctly recorded), **both** sale movements land on **both** terminals, and
  the outbox drains — no lost update. The server projection agrees.
- **`mutate()` (§6, §13):** writes the entity row **and** the outbox op in one
  SQLite transaction — a terminal can't record a change without queuing it.
- **Conflict policy (§6):** append-only entities (movements/orders/lines/
  payments) are idempotent inserts by id — all land, derived `stock_levels`
  recomputes to the correct net (why stock never conflicts). Mutable config is
  last-writer-wins by `updated_at`; the losing version is written to
  `audit_log`. Both are unit-tested; push is idempotent by op id.
- **`HttpOplogEngine` (the documented DIY-oplog engine, §6)** behind the
  `SyncEngine` interface: push (drain outbox) then pull (apply server op stream,
  advance cursor). `PowerSyncEngine` slots in behind the same interface later.
- **Real HTTP transport:** `POST /sync/push` + `GET /sync/pull?cursor=` (NestJS,
  Zod-validated) backed by a `SyncServer`; smoke-tested over HTTP (push →
  idempotent re-push → pull stream → cursor up-to-date → 400 on bad payload).
- **Sync indicator (§6 UI contract):** the POS/topbar pill and a new
  Settings→Sync panel read a shared `SyncEngine` (swap via `setSyncEngine`);
  offline is styled calm, shows last-synced + pending.

`@merkat/db/node` gains a `node.{js,d.ts}` resolution shim so the CommonJS API
(classic module resolution) can import the node entry; the browser bundle stays
free of the node sync code (better-sqlite3), verified.

### Deferred from Phase 5 (intentional)

- **PowerSync engine + a real Postgres server.** The engine is the documented
  `HttpOplogEngine` fallback against a SQLite server projection (Postgres is the
  §4 source of record in production). PowerSync needs cloud credentials not
  available here; it goes behind the same `SyncEngine`/transport interface.
- **Browser-backed synced store.** The reconcile runs at the terminal (Node/
  desktop SQLite — the primary target, §2). The web PWA needs a wasm SQLite
  (wa-sqlite / PowerSync web) to run the real engine in-browser; until then the
  web app keeps the in-memory Phase 2–4 stores and a `NoopSyncEngine` indicator.
- **`table.status` sticky-occupied LWW (§6)** lands with the restaurant floor
  plan (Phase 7).

## Phase 4 — POS + hardware (complete)

Gate (`CLAUDE.md §12`, **release-blocker e2e §13**): a full sale completes with
the network unplugged and a receipt prints (or previews). Verified:

- **Offline cash sale, end to end.** A component test drives the real POS
  screen: browse → add to cart → Charge → tender → Complete sale → receipt.
  Nothing touches the network (in-memory store + WebHardware no-op). `buildSale`
  (`@merkat/core`) mints an immutable order + payment + one signed `sale`
  movement per line (§1.3, §1.4); inventory decrements through the ledger (serum
  40 → 39 in the test). Totals/tax/change are pure and unit-tested.
- **Receipt + drawer via HardwareBridge (§7).** Charge calls
  `hardware.openDrawer()` then `hardware.printReceipt(...)`. On web those are
  `WebHardware` no-ops (the test log shows them firing) and the UI shows a
  **receipt preview** (the §7 print fallback) rendered from the same text the
  ESC/POS printer would emit.
- **Cart (Zustand, §2)** merges repeat adds, steps quantity, variant picker for
  variant products.
- **Barcode scan (§7):** the search/scan field takes Enter-terminated scans
  (HID scanners type into the focused field); a `useBarcodeScanner` hook also
  catches rapid keystroke bursts when no field is focused.

The UI talks only to `HardwareBridge` (WebHardware today; `setHardware` injects
the platform bridge). POS route wired; "Works offline" affordance on the screen.

### Deferred from Phase 4 (intentional)

- **`TauriHardware` (real ESC/POS printer, cash-drawer kick, serial scanner)** —
  Rust-side, can't compile on this box (same constraint as the deferred desktop
  build, Phase 9). The web preview path satisfies the gate; the bridge contract
  is in place so the desktop impl drops in with no UI change.
- **Card/mobile payments** — `PaymentProvider`/Stripe Terminal is Phase 6 (§10);
  Phase 4 ships cash (always offline-capable).
- **Order persistence / history / reprint** — the sale is built and applied to
  the ledger; durable orders + the Orders screen are Phase 6. (Sales currently
  reset with the in-memory store on reload, like Phase 3 inventory.)

## Phase 3 — Products + inventory (complete)

Gate (`CLAUDE.md §12`): adding stock writes movements; levels update; low-stock
triggers. Verified:

- **Stock is a ledger (§1.3).** `addStock` only ever appends a signed
  `stock_movement`; on-hand is always derived (`deriveStockLevels` /
  `productOnHand` in `@merkat/core`, pure and mirroring the Phase 1 SQL path).
  Restock/count/adjustment are positive, waste negative. Tested: level updates
  as movements land, and a `waste` movement drops it back down.
- **Low-stock triggers (§4).** `isLowStock(onHand, threshold)` fires at/below
  the threshold; the Products table shows a warning pill. A component test adds
  stock to the seeded low product (6 → 26) and the pill clears.
- **Products screen + add-product slide-over (§5).** Table with derived on-hand,
  search, low-stock pills; slide-over creates products with a **variant
  repeater** (shade/size), gated by `featuresFor(businessType).variants`. AI
  description is a disabled Phase 8 affordance (§9). Zod validates every form.
- **Add-stock dialog** targets the product or a specific variant.

Same iface+mock pattern as auth: the UI talks only to an `InventoryStore`
(`SeedInventoryStore`, in-memory demo catalogue). Phase 5 swaps in the
synced-SQLite-backed store with no UI change. Inventory UI state is Zustand
(`useInventory`); TanStack Query arrives with real data endpoints (Phase 5/6).

### Deferred from Phase 3 (intentional)

- **Persistence** — `SeedInventoryStore` is in-memory (resets on reload); the
  real ledger persists via the synced local SQLite in Phase 5. The Node SQLite
  ledger already exists (Phase 1); the browser-backed store is Phase 5.
- **Categories, product images, edit/archive, batch/expiry entry UI** — schema
  supports them (§4); the management UI is incremental after v1 core flows.
- **AI product description / receipt OCR stock-in** — Phase 8 (§9).

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
