/**
 * Model client boundary (CLAUDE.md §2, §9). The agent talks to a `ModelClient`;
 * production wires the Anthropic SDK (`@merkat/ai/node`), and tests/offline use
 * {@link MockModelClient} — deterministic tool selection, no network. The mock
 * treats content inside <untrusted-data> strictly as data (never as
 * instructions), demonstrating the injection guard.
 */
export interface ToolCall {
  readonly name: string;
  readonly input: unknown;
}

export interface AgentMessage {
  readonly role: "user" | "assistant" | "tool";
  readonly text?: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolResults?: readonly { name: string; content: string }[];
}

export interface ModelRequest {
  readonly system: string;
  readonly messages: readonly AgentMessage[];
  readonly tools: readonly { name: string; description: string }[];
}

export interface ModelResponse {
  readonly toolCalls?: readonly ToolCall[];
  readonly text?: string;
}

export interface ModelClient {
  respond(req: ModelRequest): Promise<ModelResponse>;
}

const RANGE = {
  from: "2026-07-01T00:00:00.000Z",
  to: "2026-07-08T00:00:00.000Z",
};

function pickTools(question: string): ToolCall[] {
  const q = question.toLowerCase();
  if (
    /(low stock|low on stock|running low|out of stock|reorder point)/.test(q)
  ) {
    return [
      { name: "get_low_stock", input: { threshold_mode: "per_product" } },
    ];
  }
  if (/(top|best[- ]?sell|bestseller)/.test(q)) {
    return [
      {
        name: "get_top_products",
        input: { range: RANGE, limit: 5, metric: "revenue" },
      },
    ];
  }
  if (/(slow|not selling)/.test(q)) {
    return [{ name: "get_slow_movers", input: { range: RANGE } }];
  }
  if (/(reorder|forecast|restock)/.test(q)) {
    return [{ name: "forecast_reorder", input: { horizon_days: 14 } }];
  }
  if (/(expir|expiry|use by)/.test(q)) {
    return [{ name: "get_expiring_stock", input: { within_days: 30 } }];
  }
  if (/(sales|revenue|how much|takings|turnover)/.test(q)) {
    return [
      { name: "get_sales_summary", input: { range: RANGE, group_by: "day" } },
    ];
  }
  return [];
}

function summarize(messages: readonly AgentMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "tool");
  const result = last?.toolResults?.[0];
  if (!result) {
    return "I can answer questions about sales, stock, top products, and reorders.";
  }
  // Parse the wrapped untrusted payload as DATA only (never executing it, §9).
  const match = result.content.match(/>\n([\s\S]*)\n<\/untrusted-data>/);
  let count: number | null = null;
  try {
    const parsed = match ? JSON.parse(match[1]!) : null;
    if (Array.isArray(parsed)) count = parsed.length;
  } catch {
    count = null;
  }
  switch (result.name) {
    case "get_low_stock":
      return `${count ?? "Some"} products are at or below their low-stock threshold.`;
    case "get_top_products":
      return `Here are your top ${count ?? ""} products by revenue.`;
    case "get_slow_movers":
      return `${count ?? "Some"} products are moving slowly.`;
    case "forecast_reorder":
      return `Reorder suggestions are ready for ${count ?? "your"} products.`;
    case "get_expiring_stock":
      return `${count ?? "Some"} items are expiring soon.`;
    default:
      return "Here is what I found in your data.";
  }
}

export class MockModelClient implements ModelClient {
  async respond(req: ModelRequest): Promise<ModelResponse> {
    const hasToolResult = req.messages.some((m) => m.role === "tool");
    if (hasToolResult) {
      return { text: summarize(req.messages) };
    }
    const question =
      [...req.messages].reverse().find((m) => m.role === "user")?.text ?? "";
    const toolCalls = pickTools(question);
    if (toolCalls.length > 0) return { toolCalls };
    return {
      text: "I can answer questions about sales, stock, top products, and reorders.",
    };
  }
}
