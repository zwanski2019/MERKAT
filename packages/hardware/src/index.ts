/**
 * Hardware capability interface (CLAUDE.md §7).
 * TauriHardware (real) lives behind apps/desktop; WebHardware is the no-op mock
 * so the SPA compiles and runs everywhere. Never import @tauri-apps/* here in a
 * way the web build can't tree-shake — the real impl is injected at the app edge.
 */
export type Unsubscribe = () => void;

export interface ReceiptLine {
  text: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
}

export interface Receipt {
  header: ReceiptLine[];
  lines: ReceiptLine[];
  footer: ReceiptLine[];
  cut: boolean;
}

export interface DeviceStatus {
  kind: "printer" | "scanner" | "drawer";
  connected: boolean;
  label: string;
}

export interface HardwareBridge {
  printReceipt(r: Receipt): Promise<void>;
  openDrawer(): Promise<void>;
  onBarcode(cb: (code: string) => void): Unsubscribe;
  listDevices(): Promise<DeviceStatus[]>;
}

/** Web fallback: warns instead of touching hardware (CLAUDE.md §7). */
export class WebHardware implements HardwareBridge {
  async printReceipt(_r: Receipt): Promise<void> {
    console.warn("[hardware] printReceipt: no printer on web; use preview.");
  }
  async openDrawer(): Promise<void> {
    console.warn("[hardware] openDrawer: no drawer on web.");
  }
  onBarcode(_cb: (code: string) => void): Unsubscribe {
    return () => {};
  }
  async listDevices(): Promise<DeviceStatus[]> {
    return [];
  }
}
