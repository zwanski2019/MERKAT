/**
 * Multi-location stock transfers (CLAUDE.md §4 — a tenant may run multiple
 * shops). A transfer is two ledger movements per line (§1.3): `transfer_out` at
 * the source and `transfer_in` at the destination, so net stock is conserved and
 * derived levels stay correct. Never edits a quantity.
 */
import { z } from "zod";
import { newId } from "./id.js";
import type { StockMovement } from "./inventory.js";

export interface StoreLocation {
  readonly id: string;
  readonly name: string;
}

export interface TransferLine {
  readonly productId: string;
  readonly name: string;
  readonly qty: number;
}

export const transferInputSchema = z
  .object({
    fromLocationId: z.string().min(1),
    toLocationId: z.string().min(1),
    lines: z
      .array(
        z.object({
          productId: z.string().min(1),
          name: z.string().min(1),
          qty: z.number().int().positive(),
        }),
      )
      .min(1, "Add at least one line"),
  })
  .refine((v) => v.fromLocationId !== v.toLocationId, {
    message: "Source and destination must differ",
  });
export type TransferInput = z.infer<typeof transferInputSchema>;

/** Build the paired out/in movements for a transfer. */
export function buildTransferMovements(
  input: TransferInput,
  opts: { tenantId?: string; staffId?: string | null; now?: number } = {},
): StockMovement[] {
  const now = opts.now ?? Date.now();
  const movements: StockMovement[] = [];
  for (const line of input.lines) {
    const refId = newId(); // ties the out/in pair together
    movements.push({
      id: newId(),
      productId: line.productId,
      variantId: null,
      locationId: input.fromLocationId,
      delta: -line.qty,
      reason: "transfer_out",
      refId,
      staffId: opts.staffId ?? null,
      createdAt: now,
    });
    movements.push({
      id: newId(),
      productId: line.productId,
      variantId: null,
      locationId: input.toLocationId,
      delta: line.qty,
      reason: "transfer_in",
      refId,
      staffId: opts.staffId ?? null,
      createdAt: now,
    });
  }
  return movements;
}
