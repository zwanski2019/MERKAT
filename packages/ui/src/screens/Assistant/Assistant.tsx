/**
 * Operator assistant (CLAUDE.md §5, §9). Natural-language questions are answered
 * with real data via tool-use. Everything is advisory; the assistant has no
 * tool that mutates finance or stock. Suggested-prompt chips seed common asks.
 */
import { useState } from "react";
import type { AssistantResult } from "@merkat/ai";
import { askAssistant } from "../../ai/assistant.js";

interface Turn {
  readonly question: string;
  readonly result: AssistantResult;
}

const SUGGESTIONS = [
  "What's running low on stock?",
  "Show me my best sellers",
  "What should I reorder?",
  "How were sales this week?",
];

export function Assistant(): JSX.Element {
  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(question: string): Promise<void> {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQuery("");
    try {
      const result = await askAssistant(question);
      setTurns((t) => [...t, { question, result }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-accent">✦</span>
        <h1 className="text-xl font-semibold text-fg">Assistant</h1>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto">
        {turns.length === 0 ? (
          <p className="text-sm text-muted">
            Ask about sales, stock, top products, or reorders. Answers use your
            real data — and everything is advisory.
          </p>
        ) : (
          turns.map((turn, i) => <TurnView key={i} turn={turn} />)
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={busy}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-fg disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(query);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your business…"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }): JSX.Element {
  return (
    <div>
      <div className="mb-1 text-right">
        <span className="inline-block rounded-[--radius-card] bg-accent px-3 py-1.5 text-sm text-white">
          {turn.question}
        </span>
      </div>
      <div className="rounded-[--radius-card] border border-border bg-surface p-3">
        <p className="text-sm text-fg">{turn.result.answer}</p>
        {turn.result.steps.map((step, i) =>
          step.result.kind === "read" ? (
            <DataTable key={i} data={step.result.data} />
          ) : null,
        )}
      </div>
    </div>
  );
}

function DataTable({ data }: { data: unknown }): JSX.Element | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const rows = data as Record<string, unknown>[];
  const keys = Object.keys(rows[0]!).filter((k) => k !== "productId");
  return (
    <div className="mt-2 overflow-x-auto rounded-[--radius-control] border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            {keys.map((k) => (
              <th key={k} className="p-2 font-medium capitalize">
                {k.replace(/([A-Z])/g, " $1")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {keys.map((k) => (
                <td key={k} className="merkat-num p-2 text-fg">
                  {String(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
