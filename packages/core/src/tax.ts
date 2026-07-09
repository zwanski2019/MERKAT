/**
 * Tax rules (CLAUDE.md §4 `tax_config`, §5 Settings→Tax). A tenant defines named
 * tax rates (inclusive or exclusive); one is the default used at the POS. Money
 * is integer minor units (§1.5) — tax is computed then rounded at the edge.
 */
import { z } from "zod";
import type { TaxConfig } from "./auth.js";

export interface TaxRate {
  readonly id: string;
  readonly name: string;
  readonly rate: number; // 0.08 = 8%
  readonly inclusive: boolean;
  readonly isDefault: boolean;
}

export const taxRateInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  rate: z.number().min(0).max(1),
  inclusive: z.boolean().default(false),
});
export type TaxRateInput = z.infer<typeof taxRateInputSchema>;

/** Tax portion of a net amount under a rate (matches sale.computeTotals). */
export function taxOfNetMinor(netMinor: number, config: TaxConfig): number {
  const rate = config.rate;
  return config.inclusive
    ? Math.round(netMinor - netMinor / (1 + rate))
    : Math.round(netMinor * rate);
}

export function defaultRate(rates: readonly TaxRate[]): TaxRate | undefined {
  return rates.find((r) => r.isDefault) ?? rates[0];
}
