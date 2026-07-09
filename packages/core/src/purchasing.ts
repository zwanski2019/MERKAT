/**
 * Purchasing domain (CLAUDE.md §14 — supplier/purchase-order module, brought
 * into scope). Suppliers and purchase orders; receiving a PO writes `restock`
 * movements through the stock ledger (§1.3), never an edited quantity. Money is
 * integer minor units (§1.5).
 */
import { z } from "zod";

export type PurchaseOrderStatus = "draft" | "ordered" | "partial" | "received";

export interface Supplier {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly notes: string | null;
}

export interface PurchaseOrderLine {
  readonly productId: string;
  readonly name: string;
  readonly qty: number;
  readonly unitCostMinor: number;
  /** Quantity received so far (partial receiving). */
  readonly receivedQty?: number;
}

export interface SupplierBill {
  readonly id: string;
  readonly purchaseOrderId: string;
  readonly supplierName: string;
  readonly amountMinor: number;
  readonly paid: boolean;
  readonly createdAt: number;
}

/** Remaining quantity to receive across a PO's lines. */
export function outstandingQty(lines: readonly PurchaseOrderLine[]): number {
  return lines.reduce((n, l) => n + (l.qty - (l.receivedQty ?? 0)), 0);
}

export interface PurchaseOrder {
  readonly id: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly status: PurchaseOrderStatus;
  readonly lines: readonly PurchaseOrderLine[];
  readonly createdAt: number;
  readonly receivedAt: number | null;
}

export const supplierInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email().nullish(),
  phone: z.string().trim().min(1).nullish(),
  notes: z.string().trim().nullish(),
});
export type SupplierInput = z.infer<typeof supplierInputSchema>;

export const purchaseOrderLineSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  qty: z.number().int().positive(),
  unitCostMinor: z.number().int().nonnegative(),
});

export const purchaseOrderInputSchema = z.object({
  supplierId: z.string().min(1, "Choose a supplier"),
  lines: z.array(purchaseOrderLineSchema).min(1, "Add at least one line"),
});
export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;

export function poTotalMinor(lines: readonly PurchaseOrderLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitCostMinor * l.qty, 0);
}
