/**
 * Purchasing data source (CLAUDE.md §14). Suppliers + purchase orders; same
 * iface+mock pattern. Receiving a PO returns its lines so the caller writes
 * `restock` movements through the inventory ledger (§1.3) — the store never
 * touches stock directly.
 */
import {
  newId,
  outstandingQty,
  type PurchaseOrder,
  type PurchaseOrderInput,
  type PurchaseOrderLine,
  type Supplier,
  type SupplierBill,
  type SupplierInput,
} from "@merkat/core";

/** A received line: how much of each product actually arrived. */
export interface ReceivedLine {
  readonly productId: string;
  readonly qty: number;
}

export interface PurchasingStore {
  listSuppliers(): Supplier[];
  createSupplier(input: SupplierInput): Supplier;
  listOrders(): PurchaseOrder[];
  createOrder(input: PurchaseOrderInput): PurchaseOrder;
  /**
   * Receive a PO — fully, or `received` quantities for partial receiving.
   * Returns the lines actually received (for the caller to add to stock) and
   * generates a supplier bill for the received value.
   */
  receiveOrder(id: string, received?: readonly ReceivedLine[]): ReceivedLine[];
  listBills(): SupplierBill[];
  markBillPaid(id: string): void;
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
  private bills: SupplierBill[] = [];

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

  receiveOrder(id: string, received?: readonly ReceivedLine[]): ReceivedLine[] {
    const order = this.orders.find((o) => o.id === id);
    if (!order || order.status === "received") return [];

    // Received quantities: the caller's amounts, or the full outstanding.
    const receivedFor = (line: PurchaseOrderLine): number => {
      const outstanding = line.qty - (line.receivedQty ?? 0);
      if (!received) return outstanding;
      const r = received.find((x) => x.productId === line.productId);
      return Math.max(0, Math.min(outstanding, r?.qty ?? 0));
    };

    const appliedLines: PurchaseOrderLine[] = order.lines.map((line) => ({
      ...line,
      receivedQty: (line.receivedQty ?? 0) + receivedFor(line),
    }));
    const now = Date.now();
    const fullyReceived = outstandingQty(appliedLines) === 0;

    const appliedThisTime: ReceivedLine[] = order.lines
      .map((line) => ({ productId: line.productId, qty: receivedFor(line) }))
      .filter((r) => r.qty > 0);

    // Bill the value received in this pass.
    const billedMinor = appliedThisTime.reduce((sum, r) => {
      const line = order.lines.find((l) => l.productId === r.productId);
      return sum + (line ? line.unitCostMinor * r.qty : 0);
    }, 0);

    this.orders = this.orders.map((o) =>
      o.id === id
        ? {
            ...o,
            lines: appliedLines,
            status: fullyReceived ? "received" : "partial",
            receivedAt: fullyReceived ? now : o.receivedAt,
          }
        : o,
    );

    if (billedMinor > 0) {
      this.bills = [
        {
          id: newId(),
          purchaseOrderId: id,
          supplierName: order.supplierName,
          amountMinor: billedMinor,
          paid: false,
          createdAt: now,
        },
        ...this.bills,
      ];
    }

    return appliedThisTime;
  }

  listBills(): SupplierBill[] {
    return [...this.bills];
  }

  markBillPaid(id: string): void {
    this.bills = this.bills.map((b) =>
      b.id === id ? { ...b, paid: true } : b,
    );
  }
}
