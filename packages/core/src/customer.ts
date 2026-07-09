/**
 * Customers / CRM (CLAUDE.md §4, §5). Domain type + Zod input schema (§13). The
 * AI customer summary is Phase 8 (§9).
 */
import { z } from "zod";

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly loyaltyPoints: number;
  readonly totalSpendMinor: number;
  readonly tags: readonly string[];
  readonly notes: string | null;
}

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email().nullish(),
  phone: z.string().trim().min(1).nullish(),
  notes: z.string().trim().nullish(),
  tags: z.array(z.string().trim().min(1)).default([]),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;
