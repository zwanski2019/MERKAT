/**
 * App root: routing + the auth gate (CLAUDE.md §5, §8). Unauthenticated
 * terminals land on PIN unlock (the offline default); the shell and its screens
 * require a session. The tenant accent is applied on load so even the lock
 * screen wears the brand (§11).
 */
import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell.js";
import { NAV } from "./nav.js";
import { Login } from "./screens/Auth/Login.js";
import { PinUnlock } from "./screens/Auth/PinUnlock.js";
import { Assistant } from "./screens/Assistant/Assistant.js";
import { Customers } from "./screens/Customers/Customers.js";
import { Dashboard } from "./screens/Dashboard/Dashboard.js";
import { Orders } from "./screens/Orders/Orders.js";
import { Placeholder } from "./screens/Placeholder.js";
import { Reports } from "./screens/Reports/Reports.js";
import { POS } from "./screens/POS/POS.js";
import { Products } from "./screens/Products/Products.js";
import { FloorPlan } from "./screens/Restaurant/FloorPlan.js";
import { KDS } from "./screens/Restaurant/KDS.js";
import { MenuBuilder } from "./screens/Restaurant/MenuBuilder.js";
import { Settings } from "./screens/Settings/Settings.js";
import { useSession } from "./state/session.js";
import { applyBranding } from "./theme/accent.js";

function RequireSession({ children }: { children: ReactNode }): JSX.Element {
  const session = useSession((s) => s.session);
  return session ? <>{children}</> : <Navigate to="/unlock" replace />;
}

function RedirectIfAuthed({ children }: { children: ReactNode }): JSX.Element {
  const session = useSession((s) => s.session);
  return session ? <Navigate to="/" replace /> : <>{children}</>;
}

export function App(): JSX.Element {
  const branding = useSession((s) => s.branding);
  useEffect(() => applyBranding(branding), [branding]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/unlock"
          element={
            <RedirectIfAuthed>
              <PinUnlock />
            </RedirectIfAuthed>
          }
        />
        <Route
          element={
            <RequireSession>
              <AppShell />
            </RequireSession>
          }
        >
          <Route path="/settings" element={<Settings />} />
          <Route path="/products" element={<Products />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/floor" element={<FloorPlan />} />
          <Route path="/kds" element={<KDS />} />
          <Route path="/menu" element={<MenuBuilder />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/assistant" element={<Assistant />} />
          {NAV.filter(
            (item) =>
              ![
                "/",
                "/settings",
                "/products",
                "/pos",
                "/orders",
                "/customers",
                "/floor",
                "/kds",
                "/menu",
                "/reports",
                "/assistant",
              ].includes(item.path),
          ).map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={<Placeholder title={item.label} phase={item.phase} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
