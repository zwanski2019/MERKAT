/**
 * Wires the operator assistant for the browser (CLAUDE.md §9). Uses the
 * deterministic MockModelClient over real demo data; production swaps in the
 * Anthropic-backed client via the API AI proxy (server-side, key never in the
 * browser) behind the same interface. `tenant_id`/`location_id` are bound here
 * from the session — never model-supplied.
 */
import {
  MockModelClient,
  getTool,
  runAssistant,
  type AssistantResult,
} from "@merkat/ai";
import { useInventory } from "../state/inventory.js";
import { useSession } from "../state/session.js";
import { UiAiDataSource } from "./datasource.js";

const model = new MockModelClient();
const data = new UiAiDataSource();

export interface ReceiptDraftItem {
  readonly name: string;
  readonly qty: number;
}

/**
 * Read a receipt image into a stock-in DRAFT (§9). Returns only a draft — the
 * operator confirms before any stock movement is written; the tool never
 * touches the ledger.
 */
export function readReceiptDraft(image: string): ReceiptDraftItem[] {
  const tool = getTool("read_receipt_ocr");
  if (!tool) return [];
  const branding = useSession.getState().branding;
  const out = tool.run(
    { image },
    {
      tenantId: branding.id,
      locationId: useInventory.getState().locationId,
      data,
      now: Date.now(),
    },
  );
  if (out.kind !== "draft") return [];
  return (out.draft as { stockIn: ReceiptDraftItem[] }).stockIn;
}

export function askAssistant(question: string): Promise<AssistantResult> {
  const branding = useSession.getState().branding;
  return runAssistant(
    question,
    {
      tenantId: branding.id,
      locationId: useInventory.getState().locationId,
      data,
      now: Date.now(),
    },
    model,
  );
}
