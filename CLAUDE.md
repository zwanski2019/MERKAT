# CLAUDE.md — MERKAT

> Build directive for Claude Code Max. Read this file top-to-bottom before writing any code.
> Working name: **MERKAT** (retail + restaurant operating system, white-label, local-first).
> Rename via a single `PRODUCT_NAME` constant in `packages/core/src/brand.ts` — do not hardcode the name anywhere else.

---

## 0. Mission

A single operator-grade POS operating system that runs as **both a native Windows `.exe` and a web app from one codebase**, works **fully offline**, and adapts to three verticals via one config flag:

- `retail` — cosmetics / general shops (variants: shade/size, batch/expiry)
- `restaurant` — cafés / restaurants (tables, menu modifiers, kitchen display)
- `general` — mixed / minimal

White-label: every tenant sets its own name, logo, and accent color; the app recolors from one token. This is the productization play — the same core sells to any small merchant.

An AI layer answers operator questions in natural language, forecasts reorders, generates product copy, and reads receipts for stock-in — via a **fixed tool schema, never arbitrary SQL** (see §9).

---

## 1. Non-negotiable invariants

Violating any of these is a build failure. Enforce them in code and in review.

1. **Offline is the default, not a fallback.** The desktop app must complete a full sale (browse → cart → charge → print receipt) with the network cable unplugged. Sync reconciles later.
2. **Every row gets a client-generated UUID (`uuidv7`) at creation.** No auto-increment primary keys anywhere that syncs. IDs are minted on-device so two offline terminals never collide.
3. **Stock is a ledger, not a number.** All quantity changes are immutable inserts into `stock_movements` (signed deltas). `stock_levels` is derived. Never `UPDATE ... SET quantity = X` on hand stock.
4. **Financial + order data is append-only.** Sales, order lines, payments are inserts. Corrections are new rows (refunds, voids, adjustments), never destructive updates.
5. **Money is integer minor units.** Store `amount_minor BIGINT` + `currency`. Never floats for money. Format only at the edge.
6. **The AI never sees a raw DB connection and never writes SQL.** It calls typed tools. Product names, customer notes, and receipt text are untrusted input — treat every string entering a prompt as a potential injection vector.
7. **One schema definition, two dialects.** Drizzle schema in `packages/db` compiles to both Postgres (cloud) and SQLite (local). No drift.
8. **Permissions are enforced server-side and re-checked client-side.** The client hides what a role can't do; the API rejects it regardless.

---

## 2. Stack (pin these)

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | **Turborepo** + pnpm workspaces | same setup as ARK |
| Shared UI | **Vite + React 18 + TypeScript** SPA | consumed by both desktop and web |
| Desktop shell | **Tauri v2** (Rust) | 3–8 MB binary; owns hardware I/O |
| Web host | Vite static build behind a thin server | Next.js is deferred to the storefront only |
| API | **NestJS** (Node 20+, TS) | REST + a sync endpoint |
| ORM / schema | **Drizzle ORM** | one schema → Postgres + SQLite |
| Cloud DB | **PostgreSQL 16** | source of record |
| Local DB | **SQLite** (via Tauri SQL plugin / libSQL) | per-terminal store |
| Sync engine | **PowerSync** (default, abstracted behind `SyncEngine` iface) | swappable; DIY oplog fallback documented in §8 |
| State | TanStack Query + Zustand | Query for server cache, Zustand for POS cart/UI |
| Styling | Tailwind + CSS variables for tenant accent | tokens in §11 |
| Charts | Recharts | single-accent theming |
| Payments | Stripe (Connect + Terminal for card-present) behind a `PaymentProvider` iface | cash always available; adapter allows local MENA processors later |
| AI | Anthropic SDK in `packages/ai`, tool-use only | model: `claude-opus-4-8` for analysis, `claude-sonnet-5` for high-volume copy/OCR |
| Auth | JWT (API) + offline PIN unlock (terminal) | PIN hash syncs with staff table |
| Validation | Zod at every boundary | shared schemas in `packages/core` |
| Testing | Vitest (unit), Playwright (e2e web), `cargo test` (Rust) | |

Do not introduce Prisma, Electron, or Redux. Do not add a second frontend framework for the operator UI.

---

## 3. Monorepo layout

```
merkat/
├─ apps/
│  ├─ desktop/            # Tauri v2 — Rust shell + hardware plugins, loads packages/ui
│  ├─ web/                # Vite host serving packages/ui as a PWA
│  └─ api/                # NestJS — REST, sync endpoint, AI proxy, Stripe webhooks
├─ packages/
│  ├─ ui/                 # the entire operator SPA: screens, components, routing
│  ├─ db/                 # Drizzle schema (pg + sqlite), migrations, SyncEngine iface
│  ├─ core/               # zod schemas, money utils, types, brand.ts, permission matrix
│  ├─ ai/                 # Anthropic client, tool definitions, prompt contracts, guards
│  └─ hardware/           # TS bindings to Tauri hardware commands (printer/scanner/drawer)
├─ turbo.json
├─ pnpm-workspace.yaml
└─ CLAUDE.md
```

Rules:
- `packages/ui` imports from `db`, `core`, `ai`, `hardware` — never the reverse.
- Anything platform-specific (Tauri `invoke`) is isolated in `packages/hardware` behind a capability interface with a **web no-op/mock implementation**, so the web build compiles without Tauri.
- `apps/*` are thin: wiring, config, entry points. Logic lives in `packages/*`.

---

## 4. Data model

Drizzle, one file per domain in `packages/db/src/schema/`. All tables carry: `id uuid pk`, `tenant_id`, `created_at`, `updated_at`, `deleted_at` (soft delete), and `sync_status` on syncing tables.

### Core (all verticals)
- **tenants** — `business_type` (`retail`|`restaurant`|`general`), `name`, `logo_url`, `accent_hex`, `currency`, `tax_config jsonb`, `locale`
- **locations** — a tenant may run multiple shops; stock and orders are location-scoped
- **staff** — `role` (`owner`|`manager`|`cashier`|`kitchen`), `pin_hash` (argon2, validated offline), `permissions jsonb` (overrides on the role matrix), `email`, `active`
- **categories** — reorderable, per business_type
- **products** — `name`, `category_id`, `price_minor`, `cost_minor`, `sku`, `barcode`, `description`, `image_url`, `low_stock_threshold`, `active`
- **product_variants** — cosmetics/general: `product_id`, `attributes jsonb` (e.g. `{shade, size}`), own `sku`/`barcode`/`price_minor`, optional `expiry_date`, `batch_no`
- **stock_movements** *(append-only ledger)* — `product_id`|`variant_id`, `location_id`, `delta` (signed int), `reason` (`sale`|`restock`|`adjustment`|`transfer_in`|`transfer_out`|`waste`|`count`), `ref_id` (order id etc.), `staff_id`
- **stock_levels** *(derived)* — materialized `SUM(delta)` per (product/variant, location); rebuilt from movements, cached for fast reads. Never written directly.
- **customers** — contact, `loyalty_points`, `total_spend_minor`, `tags jsonb`, `notes`
- **orders** — works as a retail sale *and* a restaurant check: `location_id`, `customer_id?`, `channel` (`in_store`|`online`), `status` (`open`|`paid`|`refunded`|`voided`), `subtotal_minor`, `tax_minor`, `discount_minor`, `total_minor`, `table_id?`, `opened_by`, `closed_at`
- **order_lines** — `order_id`, `product_id`|`variant_id`, `qty`, `unit_price_minor`, `line_total_minor`, `note`
- **payments** — `order_id`, `method` (`cash`|`card`|`mobile`), `amount_minor`, `provider_ref?`, `status`
- **audit_log** — `staff_id`, `action`, `entity`, `entity_id`, `before jsonb`, `after jsonb`

### Restaurant-only (empty in retail tenants)
- **floor_zones** — `name` (Main / Terrace / Bar), `layout jsonb`
- **tables** — `zone_id`, `label`, `seats`, `x`, `y`, `shape`, `status` (`open`|`occupied`|`check`|`reserved`)
- **modifier_groups** — `name`, `min`, `max`, `required` (e.g. "Choose size" required radio)
- **modifiers** — `group_id`, `name`, `price_delta_minor`
- **product_modifier_groups** — join: which groups apply to which menu item
- **order_line_modifiers** — `order_line_id`, `modifier_id`, `price_delta_minor`, `note` ("no onions")
- **combos** — bundle of products at a set price
- **kitchen_tickets** — `order_id`, `station` (`grill`|`cold`|`bar`|`all`), `status` (`new`|`preparing`|`done`|`bumped`), `sent_at`, `bumped_at`

### Sync tables
- **outbox** — local only: `op_id uuid`, `entity`, `entity_id`, `op` (`insert`|`update`|`delete`), `payload jsonb`, `seq` (monotonic local), `synced_at?`
- **sync_cursor** — last server checkpoint pulled

Vertical toggling: `tenant.business_type` drives feature flags in `packages/core/src/features.ts`. UI reads flags; restaurant tables simply stay empty for retail tenants. No separate builds.

---

## 5. Screens (from locked Stitch wireframe)

Build order follows the shell → core → vertical → extras sequence. Each screen lives in `packages/ui/src/screens/`.

**Shell & shared:** `Onboarding/BusinessType`, `Dashboard` (KPIs + AI insights), `Settings` (Branding/Tax/Receipt/Hardware/Payments/Sync/Team), `Auth/Login` + `Auth/PinUnlock`, `Team` (roles + permission matrix).

**Retail core:** `Products` (table + add-product slide-over with AI description + variant repeater), `POS` (product grid + live cart + Charge + offline indicator), `Customers` (CRM + AI summary), `Orders` (history + detail + refund/reprint).

**Restaurant:** `FloorPlan` (draggable tables, status color, edit-layout mode), `KDS` (kitchen display, aging timers, bump), `MenuBuilder` (categories + items + modifier groups + combos).

**AI:** `Assistant` (chat with suggested-prompt chips, inline data/charts), `Reports` (chart grid + per-card AI takeaway + transactions table).

Accent color, logo, and business_type feed the shell from `tenant` on load; every screen inherits.

---

## 6. Sync — the hard part, spec it exactly

**Model:** local SQLite is the terminal's source of truth. Mutations write the entity **and** append to `outbox` in one transaction. A background worker pushes the outbox and pulls server changes.

**Why it's tractable:** most entities are append-only (movements, orders, lines, payments, audit) — inserts never conflict. Only a small mutable-config set (`products`, `categories`, `menu`, `tenant`, `settings`, `staff`, `table.status`) needs conflict handling.

**Push (upload):**
1. Read unsynced `outbox` rows ordered by `seq`.
2. `POST /sync/push` with the batch. API applies each op **idempotently by `entity_id`/`op_id`** (upsert). Re-sending a batch is safe.
3. On 200, mark rows `synced_at`.

**Pull (download):**
1. `GET /sync/pull?cursor=<checkpoint>`.
2. API returns changed rows since cursor + new checkpoint.
3. Apply to SQLite; advance `sync_cursor`.

**Conflict policy:**
- Append-only tables: no conflict possible (unique UUIDs). Just insert.
- **Stock:** never conflicts — it's the movement ledger. Both terminals' `-1` movements both land; `stock_levels` recomputes to the correct net. This is why §1.3 exists.
- Mutable config: **last-writer-wins by server-authoritative `updated_at`**, with the losing version written to `audit_log` so nothing is silently lost.
- `table.status`: LWW but treat `occupied` as sticky — a terminal can't flip an occupied table to open without an explicit close event.

**Transport:** default to **PowerSync** (handles the outbox queue, checkpointing, and streaming pull for you against Postgres). Wrap it behind:

```ts
// packages/db/src/sync/engine.ts
export interface SyncEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): SyncStatus;                 // { online, lastSyncedAt, pending }
  onStatusChange(cb: (s: SyncStatus) => void): Unsubscribe;
  flush(): Promise<void>;               // force push now
}
```

Implement `PowerSyncEngine` first. Keep a documented `HttpOplogEngine` fallback (the raw push/pull above) so we're never locked to a vendor. The UI only ever talks to `SyncEngine` + reads local SQLite — it must not know which engine is active.

**UI contract:** a persistent sync indicator (corner of POS + Settings→Sync) shows `online / last synced Xs ago / N pending`. Offline is a normal state, styled calm-neutral, never alarming red.

---

## 7. Desktop hardware (Tauri Rust side)

Expose Rust commands via `invoke`, wrapped in `packages/hardware` with a web mock so the SPA compiles everywhere.

- **Receipt printing (ESC/POS):** serial/USB thermal printers. Rust builds the byte stream (init, text, cut). Command: `print_receipt(payload)`. Support a "print to PDF/preview" fallback when no printer.
- **Cash drawer:** kicked via the printer's ESC/POS drawer-kick sequence. Command: `open_drawer()`.
- **Barcode scanner:** most are HID keyboard-emulation → they type into the focused search/scan field; handle a "rapid keystroke + Enter" detector in POS. Also support serial scanners via a Rust listener emitting a `barcode` event.
- **Label/variant printing:** optional, same ESC/POS path.

Interface:
```ts
// packages/hardware/src/index.ts
export interface HardwareBridge {
  printReceipt(r: Receipt): Promise<void>;
  openDrawer(): Promise<void>;
  onBarcode(cb: (code: string) => void): Unsubscribe;
  listDevices(): Promise<DeviceStatus[]>;   // feeds Settings→Hardware status dots
}
```
`TauriHardware` (real) + `WebHardware` (no-ops / warns). Never import `@tauri-apps/*` outside `packages/hardware` or `apps/desktop`.

---

## 8. Auth & permissions

- **API:** email+password → JWT (access + refresh). Tenant-scoped; every query filters by `tenant_id`.
- **Terminal PIN unlock:** for shared POS terminals. After the device is bound to a tenant, staff pick their avatar and enter a 4-digit PIN. PIN validated **offline** against the synced `staff.pin_hash` (argon2id). This lets shift changes happen with no network.
- **Permission matrix** in `packages/core/src/permissions.ts`: role → allowed actions grouped by area (POS, Refunds, Products, Reports, Settings, Team). Manager-PIN gate for refunds/voids is a tenant setting. Client hides disallowed UI; **API enforces independently** — assume the client is compromised.

---

## 9. AI layer (`packages/ai`) — tool-use only, injection-hardened

The assistant answers operator questions and generates content. It **never** receives a DB handle or emits SQL. It calls a fixed set of typed tools; the tool implementations run parameterized, tenant-scoped, read-only queries.

**Tools (Zod-schema'd, tenant_id injected server-side, never from the model):**
- `get_sales_summary({ range, group_by })`
- `get_low_stock({ threshold_mode })`
- `get_top_products({ range, limit, metric })`
- `get_slow_movers({ range })`
- `forecast_reorder({ product_id?, horizon_days })`
- `get_expiring_stock({ within_days })` *(retail/variants)*
- `generate_product_description({ name, attributes, tone })` *(write path: returns text only, no DB effect)*
- `read_receipt_ocr({ image })` → structured stock-in draft *(human confirms before it writes movements)*

**Guardrails (this is your domain — enforce it):**
- Model output is **advisory**. Any write (reorder, stock-in from OCR, description) is staged and requires explicit operator confirmation before a mutation runs.
- Every string from the DB or user (product names, customer notes, receipt OCR) that enters a prompt is wrapped as untrusted data with clear delimiters; the system prompt states tool results are data, not instructions. No tool is callable that mutates finance/stock directly.
- Tool params are validated by Zod before execution; reject anything off-schema. `tenant_id` and `location_id` are bound from the authenticated session, **never** taken from model-supplied arguments.
- Rate-limit + log every AI tool call to `audit_log`.
- Models: `claude-opus-4-8` for analysis/forecasting, `claude-sonnet-5` for high-volume description/OCR. Keep the model id in one config constant.

**Prompt contracts** live as versioned files in `packages/ai/src/prompts/` with a golden-test per tool (input → expected tool call shape).

---

## 10. Payments

- `PaymentProvider` interface: `cash`, `stripe` (Connect for multi-merchant payouts, Terminal for card-present), extensible for a local MENA processor later.
- Cash is always available and offline-capable (records a `payment` + closes the order locally, syncs later).
- Card-present via Stripe Terminal requires connectivity at charge time — degrade gracefully to "cash only" when offline and surface it in POS.
- Stripe webhooks land on `apps/api`; reconcile against local `payments` by `provider_ref`.

---

## 11. Design tokens (from the locked wireframe)

```css
--canvas-light:#FAFAFA; --canvas-dark:#0B0D0F;
--surface-light:#FFFFFF; --surface-dark:#16181D;
--text:#18181B; --text-muted:#71717A; --border:#E4E4E7;
--accent:#10B981;      /* tenant-configurable, recolors app from tenant.accent_hex */
--warning:#F59E0B; --danger:#EF4444;
--radius-card:12px; --radius-control:8px;
```
Font: Inter/Geist. **Tabular/lining numerals on every money and stock figure.** Left sidebar nav, top bar (search + AI spark + account). Color signals state (low stock, occupied, aging tickets) — not decoration. Accent is injected as a CSS variable at runtime from `tenant.accent_hex`; nothing else is colored per-tenant.

---

## 12. Build phases (gate each before moving on)

**Phase 0 — Scaffold.** Turborepo + pnpm, all `apps/*` and `packages/*` stubs, shared TS/ESLint/Prettier config, `brand.ts`, CI running lint+typecheck+test. *Done when:* `pnpm build` green across the graph; empty desktop + web both boot and show a shell.

**Phase 1 — Schema + local DB.** Drizzle schema (pg + sqlite), migrations, seed for one retail + one restaurant tenant. SQLite wired in Tauri. *Done when:* both dialects migrate; seed loads; `stock_levels` derives from movements.

**Phase 2 — Shell + auth.** Sidebar/topbar, routing, Login + PinUnlock, permission matrix, Settings→Branding driving the accent + logo live. *Done when:* PIN unlock works offline; accent recolors the app.

**Phase 3 — Products + inventory.** Products screen, add-product slide-over, variants, stock movements, low-stock pills. *Done when:* adding stock writes movements; levels update; low-stock triggers.

**Phase 4 — POS + hardware.** Product grid, cart (Zustand), charge (cash), receipt print, drawer kick, barcode scan, offline sale end-to-end. *Done when:* a full sale completes with network unplugged and a receipt prints (or previews).

**Phase 5 — Sync.** `SyncEngine` + PowerSync impl, outbox, push/pull, indicator UI, two-terminal reconcile test. *Done when:* two offline terminals each sell the last unit and reconcile to correct net stock; no data loss.

**Phase 6 — Orders + customers + payments.** Order history/detail, refunds (as new rows), CRM, Stripe card path. *Done when:* refund creates reversing rows and reprints; Stripe charge reconciles via webhook.

**Phase 7 — Restaurant vertical.** Floor plan (drag + status), menu builder (modifiers/combos), KDS with aging timers + bump, table→check flow. *Done when:* a restaurant tenant can seat a table, send to kitchen, bump, and close a check.

**Phase 8 — AI.** `packages/ai` tools, Assistant screen, dashboard insights, Reports takeaways, receipt OCR stock-in (confirm-before-write). *Done when:* NL query returns real data via tool-use; no tool can mutate finance/stock without confirmation; injection golden-tests pass.

**Phase 9 — Windows build + signing.** Tauri release build, code-sign the `.exe`, auto-update channel, installer. *Done when:* a signed installer produces a launching offline-capable POS on a clean Windows box.

---

## 13. Conventions & guardrails

- TypeScript strict everywhere. No `any` without a `// justified:` comment.
- Zod at every boundary (API in/out, sync payloads, AI tool params, form input).
- Money helpers in `packages/core/src/money.ts` — construction and formatting go through them; raw arithmetic on minor units only.
- All mutations to syncing tables go through a `mutate()` helper that writes entity + outbox in one SQLite transaction. Never write a syncing table directly.
- Feature-flag restaurant/retail via `features.ts`; never branch on raw `business_type` strings in components.
- Every destructive-looking action (refund, void, delete) is soft/append-only + audit-logged.
- Commit style: conventional commits. One phase = one reviewable PR series.
- Tests: unit for money/permissions/sync-merge/AI-tool-schemas; e2e for the offline-sale and two-terminal-reconcile flows; these two e2e flows are release blockers.

## 14. Deferred (do not build in v1 — flag if scope creeps)
- Public customer-facing storefront / online ordering → separate **Next.js** app (`apps/storefront`) for SSR/SEO, reusing `packages/core` + API. Decide before Phase 6 if it moves into scope, because it changes the API surface.
- Multi-currency, multi-language storefront, supplier/purchase-order module, accounting export — post-v1.

---

### First action for Claude Code Max
Execute **Phase 0** only. Scaffold the monorepo exactly per §3, wire CI, boot empty desktop + web shells, and stop at the Phase 0 gate for review. Do not start Phase 1 until Phase 0 is green.
