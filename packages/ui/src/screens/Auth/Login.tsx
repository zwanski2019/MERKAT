/**
 * Cloud login (CLAUDE.md §8): email + password → JWT, used to bind a terminal
 * to a tenant. Requires connectivity; offline shift changes use PIN unlock.
 */
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequestSchema } from "@merkat/core";
import { useSession } from "../../state/session.js";

export function Login(): JSX.Element {
  const navigate = useNavigate();
  const login = useSession((s) => s.login);
  const busy = useSession((s) => s.busy);
  const error = useSession((s) => s.error);
  const branding = useSession((s) => s.branding);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError("Enter a valid email and password.");
      return;
    }
    setFormError(null);
    const ok = await login(parsed.data);
    if (ok) navigate("/");
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-[--radius-card] border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="mb-1 text-lg font-semibold text-fg">Sign in</h1>
        <p className="mb-6 text-sm text-muted">to {branding.name}</p>

        <label className="mb-1 block text-sm text-fg" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-[--radius-control] border border-border bg-canvas px-3 py-2 text-fg"
        />

        <label className="mb-1 block text-sm text-fg" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-[--radius-control] border border-border bg-canvas px-3 py-2 text-fg"
        />

        {(formError ?? error) ? (
          <p role="alert" className="mb-4 text-sm text-danger">
            {formError ?? error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[--radius-control] bg-accent py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <button
            type="button"
            onClick={() => navigate("/unlock")}
            className="text-sm text-muted hover:text-fg"
          >
            Use PIN unlock instead
          </button>
        </div>
      </form>
    </div>
  );
}
