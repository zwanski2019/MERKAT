/**
 * Payments (CLAUDE.md §10). Cash is always available and offline-capable; card
 * present goes through Stripe Terminal and needs connectivity. This module owns
 * the provider-agnostic DTOs + Zod schemas shared by the API and the terminal;
 * the runtime `PaymentProvider` implementations live in the UI.
 */
import { z } from "zod";

export type PaymentProviderKind = "cash" | "stripe";

export const createIntentSchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.string().min(1),
  orderId: z.string().uuid().nullish(),
});
export type CreateIntentRequest = z.infer<typeof createIntentSchema>;

export type IntentStatus = "requires_payment" | "succeeded" | "failed";

export interface PaymentIntentResponse {
  readonly providerRef: string; // Stripe PaymentIntent id (or simulated)
  readonly status: IntentStatus;
  readonly clientSecret: string | null;
  readonly amountMinor: number;
  readonly currency: string;
}

/** Minimal Stripe webhook event shape we reconcile against (§10). */
export const stripeWebhookSchema = z.object({
  type: z.string(), // e.g. "payment_intent.succeeded"
  data: z.object({
    object: z.object({
      id: z.string(),
      amount: z.number().optional(),
      status: z.string().optional(),
    }),
  }),
});
export type StripeWebhookEvent = z.infer<typeof stripeWebhookSchema>;
