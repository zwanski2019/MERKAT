/**
 * Inventory data source (CLAUDE.md §1.3, §4). Same iface+mock pattern as
 * AuthStore/SyncEngine: the UI talks only to {@link InventoryStore}. Phase 3
 * ships {@link SeedInventoryStore} (in-memory, append-only movement ledger);
 * Phase 5 swaps in the synced-SQLite-backed store with no UI change.
 *
 * Stock is a ledger (§1.3): `addStock` only ever appends a signed movement —
 * it never mutates a quantity. On-hand levels are always derived.
 */
import {
  isLowStock,
  newId,
  productOnHand,
  type AddStockInput,
  type Product,
  type ProductInput,
  type ProductListItem,
  type ProductVariant,
  type StockMovement,
} from "@merkat/core";

export interface InventoryStore {
  readonly locationId: string;
  listProducts(): ProductListItem[];
  getProduct(id: string): Product | undefined;
  createProduct(input: ProductInput): Product;
  /** Append a signed stock movement (never mutates a stored quantity). */
  addStock(input: AddStockInput, staffId?: string | null): StockMovement;
  listMovements(productId?: string): StockMovement[];
}

const DEMO_LOCATION = "0191a000-0000-7000-8000-0000000000f0";

export class SeedInventoryStore implements InventoryStore {
  readonly locationId = DEMO_LOCATION;
  private products: Product[] = [];
  private movements: StockMovement[] = [];

  constructor() {
    this.seed();
  }

  listProducts(): ProductListItem[] {
    const moves = this.movements;
    return this.products.map((product) => {
      const onHand = productOnHand(product, this.locationId, moves);
      return {
        product,
        onHand,
        lowStock: isLowStock(onHand, product.lowStockThreshold),
      };
    });
  }

  getProduct(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  createProduct(input: ProductInput): Product {
    const productId = newId();
    const variants: ProductVariant[] = input.variants.map((v) => ({
      id: newId(),
      productId,
      attributes: v.attributes ?? {},
      sku: v.sku ?? null,
      barcode: v.barcode ?? null,
      priceMinor: v.priceMinor ?? null,
      expiryDate: v.expiryDate ?? null,
      batchNo: v.batchNo ?? null,
    }));
    const product: Product = {
      id: productId,
      categoryId: input.categoryId ?? null,
      name: input.name,
      priceMinor: input.priceMinor,
      costMinor: input.costMinor ?? null,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      lowStockThreshold: input.lowStockThreshold ?? null,
      active: input.active,
      variants,
    };
    this.products = [product, ...this.products];
    return product;
  }

  addStock(input: AddStockInput, staffId: string | null = null): StockMovement {
    const movement: StockMovement = {
      id: newId(),
      productId: input.productId ?? null,
      variantId: input.variantId ?? null,
      locationId: input.locationId,
      delta: input.qty,
      reason: input.reason,
      refId: null,
      staffId,
      createdAt: Date.now(),
    };
    this.movements = [...this.movements, movement];
    return movement;
  }

  listMovements(productId?: string): StockMovement[] {
    if (!productId) return [...this.movements];
    const product = this.getProduct(productId);
    const variantIds = new Set(product?.variants.map((v) => v.id) ?? []);
    return this.movements.filter(
      (m) =>
        m.productId === productId ||
        (m.variantId != null && variantIds.has(m.variantId)),
    );
  }

  // Demo retail catalogue, mirroring the Phase 1 seed (Lumière Cosmetics).
  private seed(): void {
    const serum = this.createProduct({
      name: "Vitamin C Serum",
      priceMinor: 2999,
      costMinor: 1200,
      sku: "SKN-SERUM-30",
      lowStockThreshold: 5,
      active: true,
      variants: [],
    });
    const lipstick = this.createProduct({
      name: "Matte Lipstick",
      priceMinor: 1899,
      costMinor: 700,
      sku: "MKP-LIP",
      lowStockThreshold: 8,
      active: true,
      variants: [
        { attributes: { shade: "Rose" }, sku: "MKP-LIP-ROSE" },
        { attributes: { shade: "Coral" }, sku: "MKP-LIP-CORAL" },
      ],
    });
    const [rose, coral] = lipstick.variants;
    // A product seeded below its threshold, so the low-stock pill shows on load.
    const cream = this.createProduct({
      name: "Face Cream",
      priceMinor: 2499,
      costMinor: 1000,
      sku: "SKN-CREAM",
      lowStockThreshold: 10,
      active: true,
      variants: [],
    });

    const restock = (
      target: { productId: string } | { variantId: string },
      qty: number,
    ): void => {
      this.addStock({
        ...target,
        locationId: this.locationId,
        qty,
        reason: "restock",
      });
    };

    restock({ productId: serum.id }, 40);
    if (rose) restock({ variantId: rose.id }, 25);
    if (coral) restock({ variantId: coral.id }, 18);
    restock({ productId: cream.id }, 6); // below threshold of 10
  }
}
