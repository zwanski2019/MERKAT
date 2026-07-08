# Build notes

## Phase 0 — Scaffold (complete)

Gate (`CLAUDE.md §12`): `pnpm build` green across the graph; empty web + desktop
shells boot. Verified:

- `pnpm build` / `typecheck` / `lint` / `test` all green (8 packages).
- Web: `pnpm --filter @merkat/web preview` serves the shell (`<title>MERKAT</title>`).
- API: `PORT=3099 node apps/api/dist/main.js` → `GET /health` returns
  `{"status":"ok","product":"MERKAT"}` (proves `@merkat/core` linkage).

## Deferred from Phase 0 (intentional, tracked here)

1. **Tailwind wiring** — `CLAUDE.md §2` pins Tailwind. The Phase 0 empty shell
   uses `packages/ui/src/tokens.css` (the §11 design tokens) with inline styles.
   Wire Tailwind + the accent CSS variable in **Phase 2** when real screens land.
2. **Desktop native compile** — this dev box is missing `webkit2gtk-4.1` /
   `javascriptcoregtk-4.1`, so `tauri dev|build` can't compile here. The Tauri v2
   shell is fully scaffolded (`apps/desktop/src-tauri`) and loads the web SPA.
   Real Windows release build + signing is **Phase 9**. To run the Linux shell:
   `sudo apt install libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev \
   libsoup-3.0-dev` then `pnpm --filter @merkat/desktop tauri:dev`.

## Environment gotchas

- The git repo root is `~/Desktop` (shared with other projects). MERKAT is not
  yet its own repo and nothing here is committed — commit was not requested.
- Port **3001** is taken by another local app ("Yoyo Admin"). Run the API on a
  free port via `PORT=`.
