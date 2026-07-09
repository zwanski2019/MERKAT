/**
 * Node-only AI entry (CLAUDE.md §3). Pulls in the Anthropic SDK + API key, so it
 * must never enter the web bundle — the browser-safe surface (tools, agent,
 * guards, mock client, rate limiter) lives in the package's main entry
 * (`@merkat/ai`); the real model client lives here (`@merkat/ai/node`).
 */
export * from "./anthropic.js";
