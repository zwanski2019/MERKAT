import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "@merkat/ui";
import "@merkat/ui/tokens.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
