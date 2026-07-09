/**
 * Emits the initial migration SQL for both dialects from the canonical model
 * (CLAUDE.md §1.7). Run after building the package: `pnpm --filter @merkat/db
 * gen:migrations`. The generated files are committed artifacts:
 *   migrations/sqlite/0001_init.sql  — applied on each terminal (Tauri SQL / dev)
 *   migrations/pg/0001_init.sql      — the cloud Postgres migration
 * Regenerate (don't hand-edit) whenever the model changes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pgDdl, sqliteDdl } from "../dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const header =
  "-- Generated from packages/db/src/schema/model.ts — do not edit by hand.\n" +
  "-- Regenerate with: pnpm --filter @merkat/db gen:migrations\n\n";

function write(dialect, statements) {
  const dir = join(root, "migrations", dialect);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "0001_init.sql");
  writeFileSync(file, header + statements.join("\n\n") + "\n");
  console.log(`wrote ${file} (${statements.length} tables)`);
}

write("sqlite", sqliteDdl());
write("pg", pgDdl());
