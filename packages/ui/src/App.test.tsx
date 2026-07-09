import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App.js";
import { useSession } from "./state/session.js";

const AMIRA = "0191a000-0000-7000-8000-0000000000a1"; // owner, PIN 4821

beforeEach(() => {
  window.history.pushState({}, "", "/");
  useSession.getState().lock();
});
afterEach(cleanup);

describe("App auth gate + routing (§5, §8)", () => {
  it("shows PIN unlock when locked, then the shell after unlocking offline", async () => {
    render(<App />);

    // locked → PIN unlock is the default entry
    expect(screen.getByText("Choose your profile")).toBeDefined();

    await act(async () => {
      await useSession.getState().unlock(AMIRA, "4821");
    });

    // owner session → shell nav appears (incl. Settings, which needs
    // settings.manage), and the lock screen is gone
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeDefined();
    });
    expect(screen.queryByText("Choose your profile")).toBeNull();
  });
});
