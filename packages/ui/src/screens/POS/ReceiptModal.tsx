/**
 * Receipt preview (CLAUDE.md §7). On the web there is no thermal printer, so we
 * render the same text the ESC/POS printer would emit as a preview/print
 * fallback. On desktop, HardwareBridge.printReceipt sends the byte stream.
 */
import { renderReceiptText, type SaleReceipt } from "@merkat/core";

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: SaleReceipt;
  onClose: () => void;
}): JSX.Element {
  const text = renderReceiptText(receipt).join("\n");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-6">
      <div
        role="dialog"
        aria-label="Receipt"
        className="w-full max-w-xs rounded-[--radius-card] border border-border bg-surface p-6 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Receipt</h2>
          <span className="text-sm text-accent">Sale complete ✓</span>
        </div>
        <pre className="merkat-num max-h-[60vh] overflow-auto whitespace-pre rounded-[--radius-control] bg-canvas p-3 text-xs leading-relaxed text-fg">
          {text}
        </pre>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-[--radius-control] border border-border py-2 text-fg"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-[--radius-control] bg-accent py-2 font-medium text-white"
          >
            New sale
          </button>
        </div>
      </div>
    </div>
  );
}
