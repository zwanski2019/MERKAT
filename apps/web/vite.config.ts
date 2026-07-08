import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Consume @merkat/ui as source so Vite transforms its workspace TSX directly.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@merkat/ui/tokens.css": fileURLToPath(
        new URL("../../packages/ui/src/tokens.css", import.meta.url),
      ),
      "@merkat/ui": fileURLToPath(
        new URL("../../packages/ui/src/index.tsx", import.meta.url),
      ),
    },
  },
  server: { port: 5173 },
  build: { outDir: "dist" },
});
