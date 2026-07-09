import { defineConfig } from "vitest/config";

// UI tests touch the DOM (accent CSS variable, component render), so run under
// jsdom. argon2 (hash-wasm) runs in-process — no network, proving offline auth.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
  },
});
