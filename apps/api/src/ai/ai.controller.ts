/**
 * AI proxy (CLAUDE.md §3, §9). The assistant runs server-side so the Anthropic
 * key never reaches the browser and `tenant_id`/`location_id` are bound from the
 * request context, never the model. Every assistant call is rate-limited per
 * tenant and every tool call it makes is logged to `audit_log`.
 *
 * Uses the real Anthropic client when `ANTHROPIC_API_KEY` is set, else the
 * deterministic mock. Data is the seed source here; production reads the tenant's
 * store (read-only, tenant-scoped).
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { newId } from "@merkat/core";
import {
  MockModelClient,
  RateLimiter,
  SeedAiDataSource,
  runAssistant,
  type AssistantResult,
  type ModelClient,
} from "@merkat/ai";
import { AnthropicModelClient, hasAnthropicKey } from "@merkat/ai/node";
import { z } from "zod";
import { insertRow } from "@merkat/db/node";
import { handle } from "../store";

const DEMO_TENANT = "0191a000-0000-7000-8000-000000000001";
const DEMO_LOCATION = "0191a000-0000-7000-8000-0000000000f0";

// Per-tenant throttle: small burst, ~1/s sustained (§9).
const limiter = new RateLimiter({ capacity: 5, ratePerSec: 1 });
const data = new SeedAiDataSource();

const requestSchema = z.object({
  question: z.string().min(1).max(500),
  tenantId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

function modelClient(): ModelClient {
  return hasAnthropicKey() ? new AnthropicModelClient() : new MockModelClient();
}

@Controller("ai")
export class AiController {
  @Post("assistant")
  async assistant(@Body() body: unknown): Promise<AssistantResult> {
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid request.");
    const tenantId = parsed.data.tenantId ?? DEMO_TENANT;
    const locationId = parsed.data.locationId ?? DEMO_LOCATION;

    if (!limiter.take(tenantId)) {
      throw new HttpException(
        "Rate limit exceeded.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await runAssistant(
      parsed.data.question,
      { tenantId, locationId, data, now: Date.now() },
      modelClient(),
    );

    // Log every tool call the assistant made (§9).
    const now = Date.now();
    for (const step of result.steps) {
      insertRow(handle, "audit_log", {
        id: newId(),
        tenant_id: tenantId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        sync_status: "synced",
        staff_id: null,
        action: "ai_tool_call",
        entity: step.tool,
        entity_id: null,
        before: null,
        after: { input: step.input, kind: step.result.kind },
      });
    }

    return result;
  }

  /** Dev helper: count of logged AI tool calls (proves §9 audit logging). */
  @Get("audit/count")
  auditCount(): { count: number } {
    const row = handle.sqlite
      .prepare(
        `SELECT COUNT(*) AS n FROM audit_log WHERE action = 'ai_tool_call'`,
      )
      .get() as { n: number };
    return { count: row.n };
  }
}
