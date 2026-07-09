import { describe, expect, it } from "vitest";
import { promotionDiscountMinor, type Promotion } from "./promotions.js";
import {
  pointsEarned,
  redeemGift,
  redeemValueMinor,
  type GiftCard,
} from "./loyalty.js";
import { taxOfNetMinor } from "./tax.js";

describe("promotions (§14)", () => {
  const pct: Promotion = { id: "1", name: "10% off", kind: "percent_off", value: 10, active: true };
  const amt: Promotion = { id: "2", name: "$5 off", kind: "amount_off", value: 500, active: true };

  it("computes percent- and amount-off discounts", () => {
    expect(promotionDiscountMinor(10000, pct)).toBe(1000);
    expect(promotionDiscountMinor(10000, amt)).toBe(500);
  });

  it("caps at the subtotal and respects active flag", () => {
    expect(promotionDiscountMinor(300, amt)).toBe(300); // capped
    expect(promotionDiscountMinor(10000, { ...pct, active: false })).toBe(0);
  });
});

describe("loyalty + gift cards (§14)", () => {
  it("earns whole points per unit spent and redeems value", () => {
    expect(pointsEarned(3239)).toBe(32); // $32.39 → 32 pts at 1/$1
    expect(redeemValueMinor(32)).toBe(32); // 32 pts × 1 minor
  });

  it("redeems a gift card up to its balance", () => {
    const card: GiftCard = { id: "g1", code: "GIFT-1234", balanceMinor: 2000, active: true };
    expect(redeemGift(card, 1500)).toEqual({
      appliedMinor: 1500,
      remainingBalanceMinor: 500,
    });
    expect(redeemGift(card, 5000)).toEqual({
      appliedMinor: 2000,
      remainingBalanceMinor: 0,
    });
    expect(redeemGift({ ...card, active: false }, 100).appliedMinor).toBe(0);
  });
});

describe("tax rates (§4)", () => {
  it("computes exclusive and inclusive tax portions", () => {
    expect(taxOfNetMinor(10000, { rate: 0.08, inclusive: false })).toBe(800);
    expect(taxOfNetMinor(10800, { rate: 0.08, inclusive: true })).toBe(800);
  });
});
