/**
 * Hardware access for the UI (CLAUDE.md §7). The SPA talks only to a
 * {@link HardwareBridge}; the web build gets {@link WebHardware} (no-op + preview
 * fallback), and the desktop injects `TauriHardware` at the app edge via
 * {@link setHardware}. Never import @tauri-apps/* here.
 */
import { WebHardware, type HardwareBridge } from "@merkat/hardware";

let bridge: HardwareBridge = new WebHardware();

export function getHardware(): HardwareBridge {
  return bridge;
}

/** Inject the platform bridge (TauriHardware on desktop). */
export function setHardware(next: HardwareBridge): void {
  bridge = next;
}
