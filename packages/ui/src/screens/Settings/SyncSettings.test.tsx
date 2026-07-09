import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SyncSettings } from "./SyncSettings.js";

afterEach(cleanup);

describe("Settings → Sync (§6 UI contract)", () => {
  it("shows the terminal sync state calmly when offline", () => {
    render(<SyncSettings />);
    // NoopSyncEngine on web → offline, nothing pending, never synced
    expect(
      screen.getByText(/Offline — changes are queued locally/),
    ).toBeDefined();
    expect(screen.getByText("Last synced")).toBeDefined();
    expect(screen.getByText("Pending changes")).toBeDefined();
    expect(screen.getByText("never")).toBeDefined();
  });
});
