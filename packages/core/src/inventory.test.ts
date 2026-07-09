import { describe, expect, it } from "vitest";
import {
  addStockSchema,
  deriveStockLevels,
  isLowStock,
  productInputSchema,
  productOnHand,
  stockKey,
  type Product,
  type StockDelta,
} from "./inventory.js";

const LOC = "0191a000-0000-7000-8000-0000000000f0";
const P = "0191a000-0000-7000-8000-000000000001";
const V1 = "0191a000-0000-7000-8000-0000000000a1";

describe("stock ledger derivation (§1.3)", () => {
  it("nets signed movements per location/product", () => {
    const moves: StockDelta[] = [
      { productId: P, variantId: null, locationId: LOC, delta: 40 },
      { productId: P, variantId: null, locationId: LOC, delta: -1 },
      { productId: P, variantId: null, locationId: LOC, delta: -3 },
    ];
    expect(deriveStockLevels(moves).get(stockKey(LOC, P, null))).toBe(36);
  });

  it("sums product-level and variant-level movements for a product total", () => {
    const product: Product = {
      id: P,
      categoryId: null,
      name: "Lipstick",
      priceMinor: 1899,
      costMinor: null,
      sku: null,
      barcode: null,
      description: null,
      imageUrl: null,
      lowStockThreshold: 8,
      active: true,
      variants: [
        {
          id: V1,
          productId: P,
          attributes: { shade: "Rose" },
          sku: null,
          barcode: null,
          priceMinor: null,
          expiryDate: null,
          batchNo: null,
        },
      ],
    };
    const moves: StockDelta[] = [
      { productId: P, variantId: null, locationId: LOC, delta: 5 },
      { productId: null, variantId: V1, locationId: LOC, delta: 25 },
      { productId: null, variantId: V1, locationId: LOC, delta: -2 },
    ];
    expect(productOnHand(product, LOC, moves)).toBe(28);
  });
});

describe("low-stock trigger", () => {
  it("triggers at or below the threshold, off above it or when unset", () => {
    expect(isLowStock(8, 8)).toBe(true);
    expect(isLowStock(3, 8)).toBe(true);
    expect(isLowStock(9, 8)).toBe(false);
    expect(isLowStock(0, null)).toBe(false);
  });
});

describe("input schemas (§13)", () => {
  it("accepts a valid product with a variant", () => {
    const parsed = productInputSchema.safeParse({
      name: "Serum",
      priceMinor: 2999,
      lowStockThreshold: 5,
      variants: [{ attributes: { size: "30ml" } }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a blank name and negative price", () => {
    expect(
      productInputSchema.safeParse({ name: " ", priceMinor: 10 }).success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse({ name: "x", priceMinor: -1 }).success,
    ).toBe(false);
  });

  it("add-stock requires exactly one target and a non-zero qty", () => {
    const base = { locationId: LOC, qty: 10, reason: "restock" as const };
    expect(addStockSchema.safeParse({ ...base, productId: P }).success).toBe(
      true,
    );
    expect(addStockSchema.safeParse({ ...base }).success).toBe(false); // no target
    expect(
      addStockSchema.safeParse({ ...base, productId: P, variantId: V1 })
        .success,
    ).toBe(false); // both targets
    expect(
      addStockSchema.safeParse({ ...base, productId: P, qty: 0 }).success,
    ).toBe(false); // zero qty
  });
});
