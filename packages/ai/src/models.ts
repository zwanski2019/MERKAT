/**
 * Model ids in one place (CLAUDE.md §2, §9).
 * Analysis/forecasting uses the stronger model; high-volume copy/OCR the faster.
 */
export const AI_MODELS = {
  analysis: "claude-opus-4-8",
  bulk: "claude-sonnet-5",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];
