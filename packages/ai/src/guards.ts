/**
 * Injection hardening (CLAUDE.md §9). Every string that reaches the model from
 * the database or a user (product names, customer notes, receipt OCR text) is
 * untrusted input and a potential injection vector. We wrap tool results in
 * clear delimiters and the system prompt states that anything inside them is
 * data, never instructions.
 */

const OPEN = "<untrusted-data";
const CLOSE = "</untrusted-data>";

/** Neutralize any attempt to forge our delimiters inside untrusted content. */
function neutralize(text: string): string {
  return text
    .replaceAll("<untrusted-data", "<​untrusted-data")
    .replaceAll("</untrusted-data>", "<​/untrusted-data>");
}

/** Wrap a tool result as delimited untrusted data (§9). */
export function wrapUntrusted(source: string, value: unknown): string {
  const json = neutralize(JSON.stringify(value, null, 2));
  return `${OPEN} source="${source}">\n${json}\n${CLOSE}`;
}

export function isWrappedUntrusted(text: string): boolean {
  return text.includes(OPEN) && text.includes(CLOSE);
}
