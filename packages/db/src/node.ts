/**
 * Node/desktop-only entry point (CLAUDE.md §3). Everything reachable from here
 * pulls in `better-sqlite3`, a native module that must never enter the web
 * bundle. The browser-safe surface (schema, model, DDL, SyncEngine) lives in
 * the package's main entry (`@merkat/db`); the local SQLite store lives here
 * (`@merkat/db/node`).
 */
export * from "./local.js";
export * from "./stock.js";
export * from "./write.js";
export * from "./seed.js";
