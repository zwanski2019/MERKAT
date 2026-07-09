import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Assistant } from "./Assistant.js";

afterEach(cleanup);

describe("Assistant — NL query returns real data via tool-use (§12 gate)", () => {
  it("answers a low-stock question with the seeded low product", async () => {
    render(<Assistant />);
    fireEvent.click(
      screen.getByRole("button", { name: "What's running low on stock?" }),
    );
    // advisory answer from tool-use (mock model + real data source)
    expect(await screen.findByText(/low-stock threshold/i)).toBeDefined();
    // the real low-stock product flowed back through the tool
    expect(screen.getByText("Face Cream")).toBeDefined();
  });
});
