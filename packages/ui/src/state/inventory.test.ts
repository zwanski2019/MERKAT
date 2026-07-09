import { describe, expect, it } from "vitest";
import { SeedInventoryStore } from "../inventory/store.js";
import { createInventoryStore } from "./inventory.js";

function fresh() {
  return createInventoryStore(new SeedInventoryStore());
}

function findByName(store: ReturnType<typeof fresh>, name: string) {
  return store.getState().items.find((i) => i.product.name === name)!;
}

describe("inventory store — ledger writes + derived levels (§1.3, Phase 3)", () => {
  it("seeds derived on-hand levels from movements", () => {
    const s = fresh();
    expect(findByName(s, "Vitamin C Serum").onHand).toBe(40);
    expect(findByName(s, "Matte Lipstick").onHand).toBe(43); // 25 Rose + 18 Coral
  });

  it("shows a low-stock pill for a product below its threshold", () => {
    const s = fresh();
    const cream = findByName(s, "Face Cream");
    expect(cream.onHand).toBe(6);
    expect(cream.lowStock).toBe(true); // threshold 10
  });

  it("createProduct adds a product with zero on-hand", () => {
    const s = fresh();
    const before = s.getState().items.length;
    s.getState().createProduct({
      name: "Cleanser",
      priceMinor: 1500,
      lowStockThreshold: 5,
      active: true,
      variants: [],
    });
    expect(s.getState().items.length).toBe(before + 1);
    expect(findByName(s, "Cleanser").onHand).toBe(0);
  });

  it("addStock appends a movement and the level updates (never edits a qty)", () => {
    const s = fresh();
    s.getState().createProduct({
      name: "Cleanser",
      priceMinor: 1500,
      lowStockThreshold: 5,
      active: true,
      variants: [],
    });
    const id = findByName(s, "Cleanser").product.id;
    const before = s.getState().store.listMovements().length;

    s.getState().addStock({
      productId: id,
      locationId: s.getState().locationId,
      qty: 12,
      reason: "restock",
    });

    expect(s.getState().store.listMovements().length).toBe(before + 1);
    expect(findByName(s, "Cleanser").onHand).toBe(12);
  });

  it("low-stock triggers as movements cross the threshold", () => {
    const s = fresh();
    s.getState().createProduct({
      name: "Toner",
      priceMinor: 1200,
      lowStockThreshold: 5,
      active: true,
      variants: [],
    });
    const id = findByName(s, "Toner").product.id;
    const loc = s.getState().locationId;

    s.getState().addStock({
      productId: id,
      locationId: loc,
      qty: 3,
      reason: "restock",
    });
    expect(findByName(s, "Toner").lowStock).toBe(true); // 3 <= 5

    s.getState().addStock({
      productId: id,
      locationId: loc,
      qty: 4,
      reason: "restock",
    });
    expect(findByName(s, "Toner").onHand).toBe(7);
    expect(findByName(s, "Toner").lowStock).toBe(false); // 7 > 5

    // waste is a negative movement — drops back below the threshold
    s.getState().addStock({
      productId: id,
      locationId: loc,
      qty: -3,
      reason: "waste",
    });
    expect(findByName(s, "Toner").onHand).toBe(4);
    expect(findByName(s, "Toner").lowStock).toBe(true);
  });
});
