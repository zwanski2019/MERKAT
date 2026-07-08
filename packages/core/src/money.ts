/**
 * Money is always integer minor units (CLAUDE.md §1.5, §13).
 * Never use floats for money. Construction and formatting go through here.
 */
export interface Money {
  readonly amountMinor: bigint;
  readonly currency: string;
}

export function money(amountMinor: bigint | number, currency: string): Money {
  const minor =
    typeof amountMinor === "bigint" ? amountMinor : BigInt(Math.trunc(amountMinor));
  return { amountMinor: minor, currency: currency.toUpperCase() };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: ${a.currency} vs ${b.currency}. Refusing to mix money.`,
    );
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function multiply(a: Money, qty: number): Money {
  if (!Number.isInteger(qty)) {
    throw new Error(`Quantity must be an integer, got ${qty}.`);
  }
  return { amountMinor: a.amountMinor * BigInt(qty), currency: a.currency };
}

/**
 * Format at the edge only. Uses 2 minor digits by default; pass `minorDigits`
 * for zero-decimal currencies. Numerals should be rendered tabular/lining (§11).
 */
export function formatMoney(
  m: Money,
  locale = "en-US",
  minorDigits = 2,
): string {
  const divisor = 10 ** minorDigits;
  const major = Number(m.amountMinor) / divisor;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: minorDigits,
    maximumFractionDigits: minorDigits,
  }).format(major);
}
