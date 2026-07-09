/**
 * Barcode scanner detection for the web POS (CLAUDE.md §7). Most scanners are
 * HID keyboard-emulation: they "type" the code far faster than a human and end
 * with Enter. We detect a rapid keystroke burst terminated by Enter.
 *
 * When a real input is focused the scanner types into it, so that field's own
 * Enter handler takes the scan — this global detector only fires when focus is
 * elsewhere, to avoid double-adding. (Serial scanners via the Tauri Rust event
 * bus are wired in Phase 9 behind HardwareBridge.onBarcode.)
 */
import { useEffect, useRef } from "react";

interface Options {
  readonly maxGapMs?: number;
  readonly minLength?: number;
}

function isEditableTarget(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useBarcodeScanner(
  onScan: (code: string) => void,
  options: Options = {},
): void {
  const maxGap = options.maxGapMs ?? 50;
  const minLength = options.minLength ?? 3;
  const buffer = useRef("");
  const lastAt = useRef(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (isEditableTarget()) return; // focused field handles its own scans
      const now = Date.now();
      if (now - lastAt.current > maxGap) buffer.current = "";
      lastAt.current = now;

      if (e.key === "Enter") {
        const code = buffer.current;
        buffer.current = "";
        if (code.length >= minLength) onScan(code);
        return;
      }
      if (e.key.length === 1) buffer.current += e.key;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onScan, maxGap, minLength]);
}
