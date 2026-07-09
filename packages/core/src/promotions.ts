/**
 * Promotions / pricing rules (CLAUDE.md §14 → in scope). Order-level percent- or
 * amount-off discounts applied at the POS. (Buy-X-get-Y and customer-group
 * pricing are a later pass.) Money is integer minor units (§1.5).
 */
import { z } from "zod";

export type PromotionKind = "percent_off" | "amount_off";

export interface Promotion {
  readonly id: string;
  readonly name: string;
  readonly kind: PromotionKind;
  /** percent 0–100 for percent_off; minor units for amount_off. */
  readonly value: number;
  readonly active: boolean;
}

export const promotionInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  kind: z.enum(["percent_off", "amount_off"]),
  value: z.number().int().nonnegative(),
  active: z.boolean().default(true),
});
export type PromotionInput = z.infer<typeof promotionInputSchema>;

/** Discount (minor units) a promotion applies to a subtotal, capped at it. */
export function promotionDiscountMinor(
  subtotalMinor: number,
  promo: Promotion,
): number {
  if (!promo.active || subtotalMinor <= 0) return 0;
  const raw =
    promo.kind === "percent_off"
      ? Math.round((subtotalMinor * Math.min(100, promo.value)) / 100)
      : promo.value;
  return Math.max(0, Math.min(subtotalMinor, raw));
}
