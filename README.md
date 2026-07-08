# MERKAT

Operator-grade POS operating system — one codebase, native Windows `.exe` **and**
web app, fully offline-first, white-label, three verticals (retail / restaurant /
general). See [`CLAUDE.md`](./CLAUDE.md) for the full build directive.

## Monorepo layout

```
apps/
  web/       Vite + React PWA host (renders packages/ui)
  desktop/   Tauri v2 shell (Rust) wrapping the web build
  api/       NestJS — REST, sync endpoint, AI proxy
packages/
  ui/        operator SPA (screens, components, shell)
  core/      brand, money, features, permissions, zod schemas
  db/        Drizzle schema (pg + sqlite) + SyncEngine interface
  ai/        Anthropic tool-use contract + prompt guards
  hardware/  printer / scanner / drawer bridge (+ web mock)
```

## Develop

```bash
pnpm install
pnpm build        # turbo: builds the package graph
pnpm typecheck
pnpm lint
pnpm test

pnpm --filter @merkat/web dev        # web shell at http://localhost:5173
pnpm --filter @merkat/desktop tauri:dev   # desktop shell (needs system webkit libs)
pnpm --filter @merkat/api dev && node apps/api/dist/main.js   # API on :3001
```

Rename the product by editing `PRODUCT_NAME` in
`packages/core/src/brand.ts` — nowhere else.

## Status

**Phase 0 (Scaffold) complete.** Empty web + desktop shells boot; package graph
builds, typechecks, lints, and tests green. Next: Phase 1 (Drizzle schema +
local SQLite). See `CLAUDE.md §12` for the phase gates.
