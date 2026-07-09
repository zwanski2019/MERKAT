import { beforeEach, describe, expect, it } from "vitest";
import { buildSale } from "@merkat/core";
import { SeedInventoryStore } from "../inventory/store.js";
import { createInventoryStore } from "./inventory.js";
import { usePos } from "./pos.js";

beforeEach(() => usePos.getState().clear());

describe("cart store (§2)", () => {
  it("merges repeat adds into one line and steps quantity", () => {
    const add = usePos.getState().add;
    add({
      productId: "p1",
      variantId: null,
      name: "Serum",
      unitPriceMinor: 2999,
    });
    add({
      productId: "p1",
      variantId: null,
      name: "Serum",
      unitPriceMinor: 2999,
    });
    expect(usePos.getState().lines).toHaveLength(1);
    expect(usePos.getState().lines[0]!.qty).toBe(2);

    usePos.getState().setQty("p:p1", 0); // qty 0 removes
    expect(usePos.getState().lines).toHaveLength(0);
  });
});

describe("charge decrements inventory through the ledger (§1.3, Phase 4 gate)", () => {
  it("a sale writes negative movements and on-hand drops", () => {
    const inv = createInventoryStore(new SeedInventoryStore());
    const serum = inv
      .getState()
      .items.find((i) => i.product.name === "Vitamin C Serum")!;
    expect(serum.onHand).toBe(40);

    const sale = buildSale({
      tenantId: "t1",
      locationId: inv.getState().locationId,
      lines: [
        {
          key: "p:serum",
          productId: serum.product.id,
          variantId: null,
          name: "Vitamin C Serum",
          unitPriceMinor: serum.product.priceMinor,
          qty: 3,
        },
      ],
      taxConfig: { rate: 0.08, inclusive: false },
      method: "cash",
      tenderedMinor: 10000,
    });

    inv.getState().applyMovements(sale.movements);
    const after = inv
      .getState()
      .items.find((i) => i.product.name === "Vitamin C Serum")!;
    expect(after.onHand).toBe(37); // 40 - 3, via the ledger
  });
});
