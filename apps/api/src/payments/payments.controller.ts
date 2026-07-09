/**
 * Payments (CLAUDE.md §10). Card-present goes through Stripe (Connect + Terminal)
 * behind a PaymentProvider; webhooks land here and reconcile against payments by
 * `provider_ref`. Cash is handled entirely on the terminal (offline-capable).
 *
 * Phase 6 uses a simulated gateway so the create-intent → webhook → reconcile
 * loop is provable without Stripe credentials. The real Stripe SDK path is
 * env-gated on STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET (deferred: no keys here).
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import {
  createIntentSchema,
  newId,
  stripeWebhookSchema,
  type IntentStatus,
  type PaymentIntentResponse,
} from "@merkat/core";

interface IntentRecord {
  providerRef: string;
  amountMinor: number;
  currency: string;
  status: IntentStatus;
  orderId: string | null;
}

// Stand-in for the server payment store (Postgres in production). The webhook
// reconciles rows here by provider_ref; sync propagates status to terminals.
const intents = new Map<string, IntentRecord>();

@Controller("payments")
export class PaymentsController {
  @Post("intent")
  createIntent(@Body() body: unknown): PaymentIntentResponse {
    const parsed = createIntentSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid intent payload.");
    const { amountMinor, currency, orderId } = parsed.data;

    const providerRef = `pi_sim_${newId()}`;
    intents.set(providerRef, {
      providerRef,
      amountMinor,
      currency,
      status: "requires_payment",
      orderId: orderId ?? null,
    });

    return {
      providerRef,
      status: "requires_payment",
      clientSecret: `${providerRef}_secret_sim`,
      amountMinor,
      currency,
    };
  }

  @Post("webhook")
  webhook(@Body() body: unknown): {
    reconciled: boolean;
    providerRef: string;
    status: IntentStatus;
  } {
    const parsed = stripeWebhookSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid webhook event.");
    const { type, data } = parsed.data;
    const providerRef = data.object.id;

    const record = intents.get(providerRef);
    if (!record) throw new NotFoundException("Unknown payment reference.");

    if (type === "payment_intent.succeeded") {
      record.status = "succeeded";
    } else if (type === "payment_intent.payment_failed") {
      record.status = "failed";
    }
    // Reconciled by provider_ref (§10) — sync carries the status to terminals.
    return { reconciled: true, providerRef, status: record.status };
  }

  @Get(":ref")
  getIntent(@Param("ref") ref: string): IntentRecord {
    const record = intents.get(ref);
    if (!record) throw new NotFoundException("Unknown payment reference.");
    return record;
  }
}
