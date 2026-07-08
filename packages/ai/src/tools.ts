import { z } from "zod";

/**
 * Fixed, Zod-schema'd tool contract (CLAUDE.md §9). The model calls these;
 * it never sees a DB handle or writes SQL. `tenant_id`/`location_id` are bound
 * from the authenticated session server-side, NEVER from model-supplied args —
 * so they are intentionally absent from these input schemas.
 *
 * Write-path tools (descriptions, OCR stock-in) return drafts only; a mutation
 * requires explicit operator confirmation.
 */
export const RangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const aiToolSchemas = {
  get_sales_summary: z.object({
    range: RangeSchema,
    group_by: z.enum(["day", "week", "category", "product"]),
  }),
  get_low_stock: z.object({
    threshold_mode: z.enum(["per_product", "global"]),
  }),
  get_top_products: z.object({
    range: RangeSchema,
    limit: z.number().int().min(1).max(100),
    metric: z.enum(["revenue", "units"]),
  }),
  get_slow_movers: z.object({ range: RangeSchema }),
  forecast_reorder: z.object({
    product_id: z.string().uuid().optional(),
    horizon_days: z.number().int().min(1).max(180),
  }),
  get_expiring_stock: z.object({
    within_days: z.number().int().min(1).max(365),
  }),
  generate_product_description: z.object({
    name: z.string().min(1),
    attributes: z.record(z.string()),
    tone: z.enum(["neutral", "playful", "premium"]),
  }),
  read_receipt_ocr: z.object({
    image: z.string(), // base64 or reference; validated at the edge
  }),
} as const;

export type AiToolName = keyof typeof aiToolSchemas;
