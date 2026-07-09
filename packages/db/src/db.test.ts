import { describe, expect, it } from "vitest";
import { pgDdl, sqliteDdl } from "./schema/ddl.js";
import { pgSchema, sqliteSchema } from "./schema/materialize.js";
import { MODEL } from "./schema/model.js";
import { migrateLocal, openLocalDb, type LocalHandle } from "./local.js";
import { seed } from "./seed.js";
import { getStockLevel, rebuildStockLevels } from "./stock.js";
import { insertRow } from "./write.js";
import { newId } from "@merkat/core";

function freshDb(): LocalHandle {
  const handle = openLocalDb(":memory:");
  migrateLocal(handle);
  return handle;
}

function columnNames(table: unknown): string[] {
  // Drizzle exposes columns on the internal Symbol(drizzle:Columns).
  const sym = Object.getOwnPropertySymbols(table as object).find(
    (s) => s.description === "drizzle:Columns",
  );
  const cols = (table as Record<symbol, Record<string, unknown>>)[sym!];
  return Object.keys(cols).sort();
}

describe("schema — one model, two dialects (§1.7)", () => {
  it("materializes identical table sets for pg and sqlite", () => {
    const modelNames = MODEL.map((t) => t.name).sort();
    expect(Object.keys(pgSchema).sort()).toEqual(modelNames);
    expect(Object.keys(sqliteSchema).sort()).toEqual(modelNames);
  });

  it("has no column drift between dialects", () => {
    for (const { name } of MODEL) {
      expect(columnNames(sqliteSchema[name])).toEqual(
        columnNames(pgSchema[name]),
      );
    }
  });

  it("emits dialect-appropriate DDL", () => {
    const sqlite = sqliteDdl().join("\n");
    const pg = pgDdl().join("\n");
    expect(sqlite).toContain('CREATE TABLE IF NOT EXISTS "tenants"');
    expect(pg).toContain('CREATE TABLE IF NOT EXISTS "tenants"');
    // money is bigint in pg, 64-bit INTEGER in sqlite
    expect(pg).toContain("bigint");
    expect(pg).toContain("timestamptz");
    expect(pg).toContain("jsonb");
    // both dialects generate one statement per table
    expect(sqliteDdl()).toHaveLength(MODEL.length);
    expect(pgDdl()).toHaveLength(MODEL.length);
  });
});

describe("migrate + seed (§12 Phase 1)", () => {
  it("migrates and loads one retail + one restaurant tenant", () => {
    const handle = freshDb();
    seed(handle);

    const tenants = handle.sqlite
      .prepare("SELECT business_type FROM tenants ORDER BY business_type")
      .all() as { business_type: string }[];
    expect(tenants.map((t) => t.business_type)).toEqual([
      "restaurant",
      "retail",
    ]);

    const products = handle.sqlite
      .prepare("SELECT COUNT(*) AS n FROM products")
      .get() as { n: number };
    expect(products.n).toBe(4);
    handle.close();
  });

  it("decodes json/bool/date through the drizzle schema", () => {
    const handle = freshDb();
    seed(handle);
    const rows = handle.db.select().from(sqliteSchema.tenants!).all() as Record<
      string,
      unknown
    >[];
    const retail = rows.find((r) => r.business_type === "retail")!;
    expect(retail.tax_config).toEqual({ rate: 0.08, inclusive: false });
    expect(retail.created_at).toBeInstanceOf(Date);
    handle.close();
  });
});

describe("stock is a ledger, levels are derived (§1.3, §6)", () => {
  it("derives stock_levels from movements", () => {
    const handle = freshDb();
    const { retail } = seed(handle);
    const [serumId] = retail.productIds;
    // seed restocked 40 of the serum
    expect(
      getStockLevel(handle, retail.tenantId, {
        productId: serumId,
        locationId: retail.locationId,
      }),
    ).toBe(40);
  });

  it("two offline -1 movements both land and net recomputes (conflict-free)", () => {
    const handle = freshDb();
    const { retail } = seed(handle);
    const [serumId] = retail.productIds;
    const now = new Date();

    // Two terminals each sell the last-ish unit; both movements insert.
    for (const _ of [0, 1]) {
      insertRow(handle, "stock_movements", {
        id: newId(),
        tenant_id: retail.tenantId,
        created_at: now,
        updated_at: now,
        sync_status: "synced",
        product_id: serumId,
        location_id: retail.locationId,
        delta: -1,
        reason: "sale",
      });
    }
    rebuildStockLevels(handle, retail.tenantId);

    // 40 - 1 - 1 = 38; no lost update.
    expect(
      getStockLevel(handle, retail.tenantId, {
        productId: serumId,
        locationId: retail.locationId,
      }),
    ).toBe(38);
    handle.close();
  });
});
