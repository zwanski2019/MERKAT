/**
 * The operator assistant loop (CLAUDE.md §9). It offers the fixed tools to the
 * model, executes the model's tool calls after Zod-validating their inputs,
 * wraps every result as untrusted data, and returns an advisory answer plus the
 * structured tool results for the UI to render.
 *
 * Guarantees: tool inputs are validated before execution; `tenant_id`/
 * `location_id` are injected from `AiContext` (never model-supplied); no tool
 * mutates finance or stock; write-path drafts require operator confirmation.
 */
import { wrapUntrusted } from "./guards.js";
import type { AgentMessage, ModelClient, ToolCall } from "./model.js";
import { SYSTEM_PROMPT_V1 } from "./prompts/system.js";
import {
  AI_TOOLS,
  getTool,
  type AiContext,
  type ToolResult,
} from "./registry.js";

export interface AssistantStep {
  readonly tool: string;
  readonly input: unknown;
  readonly result: ToolResult;
}

export interface AssistantResult {
  readonly answer: string;
  readonly steps: readonly AssistantStep[];
}

export async function runAssistant(
  question: string,
  ctx: AiContext,
  model: ModelClient,
  opts: { maxTurns?: number } = {},
): Promise<AssistantResult> {
  const maxTurns = opts.maxTurns ?? 4;
  const tools = AI_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
  }));
  const messages: AgentMessage[] = [{ role: "user", text: question }];
  const steps: AssistantStep[] = [];

  for (let turn = 0; turn < maxTurns; turn++) {
    const res = await model.respond({
      system: SYSTEM_PROMPT_V1,
      messages,
      tools,
    });

    if (res.toolCalls && res.toolCalls.length > 0) {
      messages.push({ role: "assistant", toolCalls: res.toolCalls });
      const toolResults = res.toolCalls.map((call) =>
        executeCall(call, ctx, steps),
      );
      messages.push({ role: "tool", toolResults });
      continue;
    }

    return { answer: res.text ?? "", steps };
  }

  return { answer: "I couldn't complete that request.", steps };
}

function executeCall(
  call: ToolCall,
  ctx: AiContext,
  steps: AssistantStep[],
): { name: string; content: string } {
  const tool = getTool(call.name);
  if (!tool) {
    return {
      name: call.name,
      content: wrapUntrusted(call.name, { error: "unknown tool" }),
    };
  }
  // Validate model-supplied args before execution (§9).
  const parsed = tool.schema.safeParse(call.input);
  if (!parsed.success) {
    return {
      name: call.name,
      content: wrapUntrusted(call.name, { error: "invalid tool input" }),
    };
  }
  const result = tool.run(call.input, ctx);
  steps.push({ tool: call.name, input: call.input, result });
  const payload = result.kind === "read" ? result.data : result.draft;
  return { name: call.name, content: wrapUntrusted(call.name, payload) };
}
