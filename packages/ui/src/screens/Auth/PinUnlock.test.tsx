import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PinUnlock } from "./PinUnlock.js";

afterEach(cleanup);

describe("PinUnlock render (§8)", () => {
  it("shows the tenant brand and the staff avatar picker", () => {
    render(
      <MemoryRouter>
        <PinUnlock />
      </MemoryRouter>,
    );
    // tenant name from the seeded store
    expect(screen.getAllByText("Lumière Cosmetics").length).toBeGreaterThan(0);
    // staff avatars to choose from
    expect(screen.getByText("Amira")).toBeDefined();
    expect(screen.getByText("Sofia")).toBeDefined();
    expect(screen.getByText("Choose your profile")).toBeDefined();
  });
});
