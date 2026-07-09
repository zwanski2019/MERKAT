/**
 * Terminal PIN unlock (CLAUDE.md §8). Staff pick their avatar and enter a
 * 4-digit PIN, validated fully offline against the synced hash — shift changes
 * need no network. The screen already wears the tenant's accent + name.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { StaffProfile } from "@merkat/core";
import { useSession } from "../../state/session.js";

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function PinUnlock(): JSX.Element {
  const navigate = useNavigate();
  const branding = useSession((s) => s.branding);
  const staff = useSession((s) => s.staff);
  const unlock = useSession((s) => s.unlock);
  const busy = useSession((s) => s.busy);
  const error = useSession((s) => s.error);
  const clearError = useSession((s) => s.clearError);

  const [selected, setSelected] = useState<StaffProfile | null>(null);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (pin.length !== 4 || !selected || busy) return;
    void (async () => {
      const ok = await unlock(selected.id, pin);
      if (ok) navigate("/");
      else setPin("");
    })();
  }, [pin, selected, busy, unlock, navigate]);

  function press(digit: string): void {
    clearError();
    setPin((p) => (p.length < 4 ? p + digit : p));
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm rounded-[--radius-card] border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <TenantMark name={branding.name} logoUrl={branding.logoUrl} />
          <h1 className="text-lg font-semibold text-fg">{branding.name}</h1>
          <p className="text-sm text-muted">
            {selected ? `Enter ${selected.name}'s PIN` : "Choose your profile"}
          </p>
        </div>

        {!selected ? (
          <div className="grid grid-cols-3 gap-3">
            {staff.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  clearError();
                  setSelected(s);
                }}
                className="flex flex-col items-center gap-2 rounded-[--radius-control] border border-border p-3 hover:border-accent"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {initials(s.name)}
                </span>
                <span className="text-xs text-fg">{s.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <PinDots length={pin.length} error={Boolean(error)} />
            <Keypad
              disabled={busy}
              onPress={press}
              onBackspace={() => setPin((p) => p.slice(0, -1))}
            />
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <button
              onClick={() => {
                setSelected(null);
                setPin("");
                clearError();
              }}
              className="text-sm text-muted hover:text-fg"
            >
              ← Back
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-muted hover:text-fg"
          >
            Sign in with email instead
          </button>
        </div>
      </div>
    </div>
  );
}

function TenantMark({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}): JSX.Element {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="size-14 rounded-[--radius-control] object-contain"
      />
    );
  }
  return (
    <span className="flex size-14 items-center justify-center rounded-[--radius-control] bg-accent text-xl font-bold text-white">
      {name.slice(0, 1)}
    </span>
  );
}

function PinDots({
  length,
  error,
}: {
  length: number;
  error: boolean;
}): JSX.Element {
  return (
    <div className="flex gap-3">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={[
            "size-3.5 rounded-full border",
            error
              ? "border-danger"
              : i < length
                ? "border-accent bg-accent"
                : "border-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function Keypad({
  onPress,
  onBackspace,
  disabled,
}: {
  onPress: (d: string) => void;
  onBackspace: () => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-3">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <KeypadButton
          key={d}
          label={d}
          disabled={disabled}
          onClick={() => onPress(d)}
        />
      ))}
      <span />
      <KeypadButton
        label="0"
        disabled={disabled}
        onClick={() => onPress("0")}
      />
      <KeypadButton label="⌫" disabled={disabled} onClick={onBackspace} />
    </div>
  );
}

function KeypadButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="merkat-num size-16 rounded-full border border-border text-xl text-fg hover:border-accent disabled:opacity-50"
    >
      {label}
    </button>
  );
}
