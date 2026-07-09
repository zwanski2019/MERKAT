/**
 * Real Anthropic-backed model client (CLAUDE.md §2, §9). Node-only — it imports
 * the Anthropic SDK and holds the API key, so it must never enter the web bundle
 * (exposed via `@merkat/ai/node`). Runs the Messages API tool-use loop: it
 * offers the fixed tool schemas, and the agent (agent.ts) executes the tool
 * calls it returns. Key is read from the environment, never passed by the model.
 *
 * The analysis model (`AI_MODELS.analysis`) drives the assistant; the bulk model
 * is used for high-volume copy/OCR inside the write-path tool implementations.
 *
 * NOTE: exercised only with a live ANTHROPIC_API_KEY (not available in the dev
 * environment); the mock client is the tested path.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AI_MODELS } from "./models.js";
import type {
  AgentMessage,
  ModelClient,
  ModelRequest,
  ModelResponse,
  ToolCall,
} from "./model.js";
import { AI_TOOLS } from "./registry.js";

function toAnthropicTools(): Anthropic.Tool[] {
  return AI_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: zodToJsonSchema(tool.schema, {
      target: "openApi3",
    }) as Anthropic.Tool.InputSchema,
  }));
}

function toAnthropicMessages(
  messages: readonly AgentMessage[],
): Anthropic.MessageParam[] {
  return messages.map((m): Anthropic.MessageParam => {
    if (m.role === "assistant" && m.toolCalls) {
      return {
        role: "assistant",
        content: m.toolCalls.map((c, i) => ({
          type: "tool_use",
          id: `call_${i}`,
          name: c.name,
          input: (c.input ?? {}) as Record<string, unknown>,
        })),
      };
    }
    if (m.role === "tool" && m.toolResults) {
      return {
        role: "user",
        content: m.toolResults.map((r, i) => ({
          type: "tool_result",
          tool_use_id: `call_${i}`,
          content: r.content, // already wrapped as <untrusted-data> (§9)
        })),
      };
    }
    return { role: "user", content: m.text ?? "" };
  });
}

export interface AnthropicClientOptions {
  readonly apiKey?: string;
  readonly model?: string;
  readonly maxTokens?: number;
}

export class AnthropicModelClient implements ModelClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(opts: AnthropicClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
    this.client = new Anthropic({ apiKey });
    this.model = opts.model ?? AI_MODELS.analysis;
    this.maxTokens = opts.maxTokens ?? 1024;
  }

  async respond(req: ModelRequest): Promise<ModelResponse> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: req.system,
      tools: toAnthropicTools(),
      messages: toAnthropicMessages(req.messages),
    });

    const toolCalls: ToolCall[] = [];
    let text = "";
    for (const block of message.content) {
      if (block.type === "tool_use") {
        toolCalls.push({ name: block.name, input: block.input });
      } else if (block.type === "text") {
        text += block.text;
      }
    }
    return toolCalls.length > 0 ? { toolCalls } : { text };
  }
}

/** True when a live Anthropic key is configured (the real path is available). */
export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
