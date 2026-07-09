/**
 * Pricing config state (CLAUDE.md §2, §4, §14): tax rates, promotions, and gift
 * cards. Local UI state (Zustand); the synced tenant config backs it later.
 */
import { create } from "zustand";
import {
  newId,
  redeemGift,
  type GiftCard,
  type GiftCardInput,
  type Promotion,
  type PromotionInput,
  type TaxRate,
  type TaxRateInput,
} from "@merkat/core";

export interface PricingState {
  taxRates: TaxRate[];
  promotions: Promotion[];
  giftCards: GiftCard[];

  addTaxRate(input: TaxRateInput): void;
  setDefaultTaxRate(id: string): void;
  addPromotion(input: PromotionInput): void;
  togglePromotion(id: string): void;
  issueGiftCard(input: GiftCardInput): void;
  /** Redeem up to `amountMinor` against a card; returns the applied amount. */
  redeemGiftCard(id: string, amountMinor: number): number;
}

export const usePricing = create<PricingState>((set, get) => ({
  taxRates: [
    { id: newId(), name: "Standard", rate: 0.08, inclusive: false, isDefault: true },
    { id: newId(), name: "Zero-rated", rate: 0, inclusive: false, isDefault: false },
  ],
  promotions: [
    { id: newId(), name: "Launch 10% off", kind: "percent_off", value: 10, active: true },
    { id: newId(), name: "$5 off", kind: "amount_off", value: 500, active: false },
  ],
  giftCards: [
    { id: newId(), code: "GIFT-DEMO-01", balanceMinor: 5000, active: true },
  ],

  addTaxRate(input) {
    set((s) => ({
      taxRates: [
        ...s.taxRates,
        {
          id: newId(),
          name: input.name,
          rate: input.rate,
          inclusive: input.inclusive,
          isDefault: false,
        },
      ],
    }));
  },
  setDefaultTaxRate(id) {
    set((s) => ({
      taxRates: s.taxRates.map((r) => ({ ...r, isDefault: r.id === id })),
    }));
  },
  addPromotion(input) {
    set((s) => ({
      promotions: [
        { id: newId(), name: input.name, kind: input.kind, value: input.value, active: input.active },
        ...s.promotions,
      ],
    }));
  },
  togglePromotion(id) {
    set((s) => ({
      promotions: s.promotions.map((p) =>
        p.id === id ? { ...p, active: !p.active } : p,
      ),
    }));
  },
  issueGiftCard(input) {
    set((s) => ({
      giftCards: [
        { id: newId(), code: input.code, balanceMinor: input.balanceMinor, active: true },
        ...s.giftCards,
      ],
    }));
  },
  redeemGiftCard(id, amountMinor) {
    const card = get().giftCards.find((c) => c.id === id);
    if (!card) return 0;
    const { appliedMinor, remainingBalanceMinor } = redeemGift(card, amountMinor);
    set((s) => ({
      giftCards: s.giftCards.map((c) =>
        c.id === id
          ? { ...c, balanceMinor: remainingBalanceMinor, active: remainingBalanceMinor > 0 }
          : c,
      ),
    }));
    return appliedMinor;
  },
}));
