import { describe, it, expect } from "vitest";
import { money, add, subtract, multiply, formatMoney } from "./money.js";

describe("money", () => {
  it("constructs from minor units", () => {
    expect(money(1050, "usd").amountMinor).toBe(1050n);
    expect(money(1050, "usd").currency).toBe("USD");
  });

  it("adds same-currency amounts", () => {
    expect(add(money(1050, "USD"), money(200, "USD")).amountMinor).toBe(1250n);
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money(1, "USD"), money(1, "EUR"))).toThrow(/mismatch/i);
  });

  it("subtracts and multiplies", () => {
    expect(subtract(money(500, "USD"), money(150, "USD")).amountMinor).toBe(350n);
    expect(multiply(money(250, "USD"), 3).amountMinor).toBe(750n);
  });

  it("rejects non-integer quantities", () => {
    expect(() => multiply(money(250, "USD"), 1.5)).toThrow();
  });

  it("formats at the edge", () => {
    expect(formatMoney(money(1050, "USD"))).toBe("$10.50");
  });
});
