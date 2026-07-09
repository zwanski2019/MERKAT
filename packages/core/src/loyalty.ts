/**
 * Loyalty points + gift cards (CLAUDE.md §14 → in scope). Points accrue on spend
 * and redeem for value; gift cards carry a minor-unit balance. All balances are
 * integer minor units / whole points (§1.5).
 */
import { z } from "zod";

export interface LoyaltyConfig {
  /** Points earned per whole currency unit spent (e.g. 1 pt / $1). */
  readonly pointsPerUnit: number;
  /** Redemption value in minor units per point (e.g. 1 pt = $0.01 → 1). */
  readonly minorPerPoint: number;
}

export const DEFAULT_LOYALTY: LoyaltyConfig = {
  pointsPerUnit: 1,
  minorPerPoint: 1,
};

/** Points earned for a spend (minor units), floored to whole points. */
export function pointsEarned(
  totalMinor: number,
  config: LoyaltyConfig = DEFAULT_LOYALTY,
): number {
  return Math.floor((totalMinor / 100) * config.pointsPerUnit);
}

/** Minor-unit value of redeeming `points`. */
export function redeemValueMinor(
  points: number,
  config: LoyaltyConfig = DEFAULT_LOYALTY,
): number {
  return Math.max(0, Math.floor(points)) * config.minorPerPoint;
}

export interface GiftCard {
  readonly id: string;
  readonly code: string;
  readonly balanceMinor: number;
  readonly active: boolean;
}

export const giftCardInputSchema = z.object({
  code: z.string().trim().min(4, "Code must be at least 4 characters"),
  balanceMinor: z.number().int().positive(),
});
export type GiftCardInput = z.infer<typeof giftCardInputSchema>;

export interface GiftRedemption {
  readonly appliedMinor: number;
  readonly remainingBalanceMinor: number;
}

/** Redeem up to `amountMinor` from a gift card; returns applied + new balance. */
export function redeemGift(card: GiftCard, amountMinor: number): GiftRedemption {
  if (!card.active || amountMinor <= 0) {
    return { appliedMinor: 0, remainingBalanceMinor: card.balanceMinor };
  }
  const applied = Math.min(card.balanceMinor, amountMinor);
  return {
    appliedMinor: applied,
    remainingBalanceMinor: card.balanceMinor - applied,
  };
}
