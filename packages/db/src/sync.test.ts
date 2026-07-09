import { newId } from "@merkat/core";
import { describe, expect, it } from "vitest";
import { migrateLocal, openLocalDb, type LocalHandle } from "./local.js";
import { getStockLevel, rebuildStockLevels } from "./stock.js";
import { insertRow } from "./write.js";
import { HttpOplogEngine, InProcessTransport } from "./sync/engine-http.js";
import { mutate, pendingCount } from "./sync/mutate.js";
import { SyncServer } from "./sync/server.js";

const TENANT = "0191a000-0000-7000-8000-000000000001";
const LOC = "0191a000-0000-7000-8000-0000000000f0";
const PROD = "0191a000-0000-7000-8000-0000000000c1";

function fresh(): LocalHandle {
  const h = openLocalDb(":memory:");
  migrateLocal(h);
  return h;
}

/** Seed identical baseline (shared, pre-sync) into a store: 1 unit on hand. */
function seedBaseline(h: LocalHandle, t = 1000): void {
  const base = {
    tenant_id: TENANT,
    created_at: t,
    updated_at: t,
    sync_status: "synced",
  };
  insertRow(h, "tenants", {
    id: TENANT,
    ...base,
    business_type: "retail",
    name: "Lumière",
    accent_hex: "#E11D74",
    currency: "USD",
    locale: "en-US",
  });
  insertRow(h, "locations", { id: LOC, ...base, name: "Store" });
  insertRow(h, "products", {
    id: PROD,
    ...base,
    name: "Serum",
    price_minor: 2999,
    active: true,
    low_stock_threshold: 5,
  });
  // opening +1 movement (the "last unit"), shared on every store
  insertRow(h, "stock_movements", {
    id: "0191a000-0000-7000-8000-0000000000e0",
    ...base,
    product_id: PROD,
    location_id: LOC,
    delta: 1,
    reason: "restock",
  });
}

function sellOne(h: LocalHandle, now: number): void {
  mutate(h, {
    entity: "stock_movements",
    op: "insert",
    row: {
      id: newId(),
      tenant_id: TENANT,
      created_at: now,
      updated_at: now,
      product_id: PROD,
      location_id: LOC,
      delta: -1,
      reason: "sale",
      sync_status: "pending",
    },
  });
}

function onHand(h: LocalHandle): number {
  rebuildStockLevels(h, TENANT);
  return getStockLevel(h, TENANT, { productId: PROD, locationId: LOC });
}

describe("two-terminal reconcile (§6, §12 release blocker)", () => {
  it("both offline terminals sell the last unit and reconcile with no data loss", async () => {
    const server = new SyncServer(fresh());
    const a = fresh();
    const b = fresh();
    for (const h of [server.store, a, b]) seedBaseline(h);

    // Each terminal sells its "last unit" while offline.
    sellOne(a, 2000);
    sellOne(b, 2001);
    expect(onHand(a)).toBe(0); // 1 - 1, locally
    expect(onHand(b)).toBe(0);

    const engineA = new HttpOplogEngine(a, new InProcessTransport(server));
    const engineB = new HttpOplogEngine(b, new InProcessTransport(server));

    // Sync in sequence (A, then B, then A again to receive B's op).
    await engineA.flush();
    await engineB.flush();
    await engineA.flush();

    // Both terminals converge to the same net: 1 - 1 - 1 = -1 (oversold, but
    // correctly recorded — neither sale was lost).
    expect(onHand(a)).toBe(-1);
    expect(onHand(b)).toBe(-1);
    expect(onHand(server.store)).toBe(-1);

    // No data loss: both sale movements are present on both terminals.
    const saleCount = (h: LocalHandle): number =>
      (
        h.sqlite
          .prepare(
            `SELECT COUNT(*) AS n FROM stock_movements WHERE reason = 'sale'`,
          )
          .get() as { n: number }
      ).n;
    expect(saleCount(a)).toBe(2);
    expect(saleCount(b)).toBe(2);

    // Outbox fully drained on both.
    expect(pendingCount(a)).toBe(0);
    expect(pendingCount(b)).toBe(0);
  });
});

describe("config conflict — last-writer-wins + audit (§6)", () => {
  it("higher updated_at wins; the losing version is kept in audit_log", async () => {
    const server = new SyncServer(fresh());
    const a = fresh();
    const b = fresh();
    for (const h of [server.store, a, b]) seedBaseline(h);

    const productRow = (name: string, updated: number) => ({
      id: PROD,
      tenant_id: TENANT,
      created_at: 1000,
      updated_at: updated,
      name,
      price_minor: 2999,
      active: true,
      low_stock_threshold: 5,
      sync_status: "pending",
    });
    // A renames at t=2000, B renames later at t=3000 (B should win).
    mutate(a, {
      entity: "products",
      op: "update",
      row: productRow("A-name", 2000),
    });
    mutate(b, {
      entity: "products",
      op: "update",
      row: productRow("B-name", 3000),
    });

    const engineA = new HttpOplogEngine(a, new InProcessTransport(server));
    const engineB = new HttpOplogEngine(b, new InProcessTransport(server));
    await engineA.flush();
    await engineB.flush();
    await engineA.flush();

    const name = (h: LocalHandle): string =>
      (
        h.sqlite
          .prepare(`SELECT name FROM products WHERE id = ?`)
          .get(PROD) as {
          name: string;
        }
      ).name;
    expect(name(a)).toBe("B-name");
    expect(name(b)).toBe("B-name");
    expect(name(server.store)).toBe("B-name");

    // B recorded A's losing version (nothing silently lost, §6).
    const losers = (
      b.sqlite
        .prepare(
          `SELECT COUNT(*) AS n FROM audit_log WHERE action = 'sync_lww_loser'`,
        )
        .get() as { n: number }
    ).n;
    expect(losers).toBeGreaterThanOrEqual(1);
  });
});

describe("push is idempotent (§6)", () => {
  it("re-sending the same batch does not double-apply", () => {
    const server = new SyncServer(fresh());
    const a = fresh();
    for (const h of [server.store, a]) seedBaseline(h);
    sellOne(a, 2000);

    const engine = new HttpOplogEngine(a, new InProcessTransport(server));
    // Two pushes of the same outbox op (simulate a retried/duplicated batch).
    const ops = [
      {
        opId: "fixed-op-1",
        entity: "stock_movements",
        entityId: "0191a000-0000-7000-8000-0000000000d9",
        op: "insert" as const,
        payload: {
          id: "0191a000-0000-7000-8000-0000000000d9",
          tenant_id: TENANT,
          created_at: 2000,
          updated_at: 2000,
          product_id: PROD,
          location_id: LOC,
          delta: -1,
          reason: "sale",
          sync_status: "synced",
        },
        updatedAt: 2000,
      },
    ];
    server.push({ ops });
    server.push({ ops }); // duplicate
    void engine;
    expect(onHand(server.store)).toBe(0); // 1 - 1, applied once
  });
});
