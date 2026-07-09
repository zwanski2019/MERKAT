/**
 * Purchasing data source (CLAUDE.md §14). Suppliers + purchase orders; same
 * iface+mock pattern. Receiving a PO returns its lines so the caller writes
 * `restock` movements through the inventory ledger (§1.3) — the store never
 * touches stock directly.
 */
import {
  newId,
  type PurchaseOrder,
  type PurchaseOrderInput,
  type PurchaseOrderLine,
  type Supplier,
  type SupplierInput,
} from "@merkat/core";

export interface PurchasingStore {
  listSuppliers(): Supplier[];
  createSupplier(input: SupplierInput): Supplier;
  listOrders(): PurchaseOrder[];
  createOrder(input: PurchaseOrderInput): PurchaseOrder;
  /** Mark a PO received; returns its lines for the caller to add to stock. */
  receiveOrder(id: string): readonly PurchaseOrderLine[];
}

export class SeedPurchasingStore implements PurchasingStore {
  private suppliers: Supplier[] = [
    {
      id: "0191a000-0000-7000-8000-0000000000s1",
      name: "Beauty Wholesale Ltd",
      email: "orders@beautywholesale.example",
      phone: "+1 555 0110",
      notes: null,
    },
    {
      id: "0191a000-0000-7000-8000-0000000000s2",
      name: "Fresh Foods Co",
      email: null,
      phone: "+1 555 0120",
      notes: "Delivers Tue/Fri",
    },
  ];
  private orders: PurchaseOrder[] = [];

  listSuppliers(): Supplier[] {
    return [...this.suppliers];
  }

  createSupplier(input: SupplierInput): Supplier {
    const supplier: Supplier = {
      id: newId(),
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
    };
    this.suppliers = [supplier, ...this.suppliers];
    return supplier;
  }

  listOrders(): PurchaseOrder[] {
    return [...this.orders];
  }

  createOrder(input: PurchaseOrderInput): PurchaseOrder {
    const supplier = this.suppliers.find((s) => s.id === input.supplierId);
    const order: PurchaseOrder = {
      id: newId(),
      supplierId: input.supplierId,
      supplierName: supplier?.name ?? "Supplier",
      status: "ordered",
      lines: input.lines,
      createdAt: Date.now(),
      receivedAt: null,
    };
    this.orders = [order, ...this.orders];
    return order;
  }

  receiveOrder(id: string): readonly PurchaseOrderLine[] {
    const order = this.orders.find((o) => o.id === id);
    if (!order || order.status === "received") return [];
    this.orders = this.orders.map((o) =>
      o.id === id ? { ...o, status: "received", receivedAt: Date.now() } : o,
    );
    return order.lines;
  }
}
