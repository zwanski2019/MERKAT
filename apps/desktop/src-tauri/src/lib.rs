// MERKAT desktop shell (Tauri v2). Hardware plugins (ESC/POS printer, cash
// drawer, barcode scanner) land in Phase 4 — see CLAUDE.md §7.

use tauri_plugin_sql::{Migration, MigrationKind};

// Per-terminal SQLite store (CLAUDE.md §2, §7). The schema is single-sourced in
// packages/db (§1.7): `0001_init.sql` is generated from the canonical model via
// `pnpm --filter @merkat/db gen:migrations`. Do not hand-edit it here.
const INIT_SQL: &str = include_str!("../../../../packages/db/migrations/sqlite/0001_init.sql");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "init schema from packages/db model",
        sql: INIT_SQL,
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:merkat.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running MERKAT desktop");
}
