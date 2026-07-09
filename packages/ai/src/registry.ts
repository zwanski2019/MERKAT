/**
 * The fixed AI tool registry (CLAUDE.md §9). The model may only call these.
 * Read tools run parameterized, tenant-scoped, read-only queries via the data
 * source; write-path tools (`generate_product_description`, `read_receipt_ocr`)
 * return DRAFTS that require explicit operator confirmation — no tool ever
 * mutates finance or stock. `tenant_id`/`location_id` come from `AiContext`
 * (server-bound), never from model-supplied args.
 */
import type { z } from "zod";
import type { AiDataSource } from "./datasource.js";
import { aiToolSchemas, type AiToolName } from "./tools.js";

export interface AiContext {
  readonly tenantId: string; // bound server-side, never from the model (§9)
  readonly locationId: string;
  readonly data: AiDataSource;
  readonly now: number;
}

export type ToolKind = "read" | "draft";

export interface ReadResult {
  readonly kind: "read";
  readonly data: unknown;
}
export interface DraftResult {
  readonly kind: "draft";
  readonly draft: unknown;
  readonly requiresConfirmation: true;
  readonly summary: string;
}
export type ToolResult = ReadResult | DraftResult;

export interface AiTool {
  readonly name: AiToolName;
  readonly kind: ToolKind;
  readonly description: string;
  readonly schema: z.ZodTypeAny;
  run(input: unknown, ctx: AiContext): ToolResult;
}

function read(data: unknown): ReadResult {
  return { kind: "read", data };
}
function draft(summary: string, value: unknown): DraftResult {
  return { kind: "draft", draft: value, requiresConfirmation: true, summary };
}

export const AI_TOOLS: readonly AiTool[] = [
  {
    name: "get_sales_summary",
    kind: "read",
    description:
      "Sales totals over a date range, grouped by day/week/category/product.",
    schema: aiToolSchemas.get_sales_summary,
    run(input, ctx) {
      const a = aiToolSchemas.get_sales_summary.parse(input);
      return read(ctx.data.salesSummary(a.range, a.group_by));
    },
  },
  {
    name: "get_low_stock",
    kind: "read",
    description: "Products at or below their low-stock threshold.",
    schema: aiToolSchemas.get_low_stock,
    run(input, ctx) {
      const a = aiToolSchemas.get_low_stock.parse(input);
      return read(ctx.data.lowStock(a.threshold_mode));
    },
  },
  {
    name: "get_top_products",
    kind: "read",
    description: "Best-selling products over a range by revenue or units.",
    schema: aiToolSchemas.get_top_products,
    run(input, ctx) {
      const a = aiToolSchemas.get_top_products.parse(input);
      return read(ctx.data.topProducts(a.range, a.limit, a.metric));
    },
  },
  {
    name: "get_slow_movers",
    kind: "read",
    description: "Products selling slowly over a range.",
    schema: aiToolSchemas.get_slow_movers,
    run(input, ctx) {
      const a = aiToolSchemas.get_slow_movers.parse(input);
      return read(ctx.data.slowMovers(a.range));
    },
  },
  {
    name: "forecast_reorder",
    kind: "read",
    description: "Reorder suggestions from recent sales velocity.",
    schema: aiToolSchemas.forecast_reorder,
    run(input, ctx) {
      const a = aiToolSchemas.forecast_reorder.parse(input);
      return read(ctx.data.forecastReorder(a.product_id, a.horizon_days));
    },
  },
  {
    name: "get_expiring_stock",
    kind: "read",
    description: "Stock expiring within N days (retail/variants).",
    schema: aiToolSchemas.get_expiring_stock,
    run(input, ctx) {
      const a = aiToolSchemas.get_expiring_stock.parse(input);
      return read(ctx.data.expiringStock(a.within_days));
    },
  },
  {
    name: "generate_product_description",
    kind: "draft",
    description: "Draft marketing copy for a product. Returns text only.",
    schema: aiToolSchemas.generate_product_description,
    run(input) {
      const a = aiToolSchemas.generate_product_description.parse(input);
      const attrs = Object.entries(a.attributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const text =
        `${a.name} — a ${a.tone} choice` +
        (attrs ? ` featuring ${attrs}.` : ".");
      // Real impl calls the bulk model (§9); the draft never touches the DB.
      return draft("Suggested product description", { text });
    },
  },
  {
    name: "read_receipt_ocr",
    kind: "draft",
    description:
      "Read a supplier receipt image into a stock-in draft for review.",
    schema: aiToolSchemas.read_receipt_ocr,
    run(input) {
      aiToolSchemas.read_receipt_ocr.parse(input);
      // Real impl runs vision OCR (§9); returns a draft the operator confirms
      // before any stock movement is written.
      return draft("Receipt stock-in draft (confirm before applying)", {
        stockIn: [
          { name: "Vitamin C Serum", qty: 24 },
          { name: "Matte Lipstick", qty: 12 },
        ],
      });
    },
  },
];

const BY_NAME = new Map(AI_TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): AiTool | undefined {
  return BY_NAME.get(name as AiToolName);
}

/** No tool mutates finance/stock — every tool is read-only or a draft (§9). */
export function hasNoMutatingTools(): boolean {
  return AI_TOOLS.every((t) => t.kind === "read" || t.kind === "draft");
}
