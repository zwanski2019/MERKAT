/**
 * Customers / CRM (CLAUDE.md §5). List, add, and view customers with loyalty +
 * lifetime spend. The AI customer summary lands in Phase 8 (§9).
 */
import { useState, type ReactNode } from "react";
import {
  customerInputSchema,
  formatMoney,
  money,
  type Customer,
} from "@merkat/core";
import { useCustomers } from "../../state/customers.js";
import { useSession } from "../../state/session.js";

export function Customers(): JSX.Element {
  const customers = useCustomers((s) => s.customers);
  const branding = useSession((s) => s.branding);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Customers</h1>
          <p className="text-sm text-muted">{customers.length} customers</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
        >
          Add customer
        </button>
      </div>

      <div className="overflow-x-auto rounded-[--radius-card] border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface text-left text-muted">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Contact</th>
              <th className="p-3 text-right font-medium">Loyalty</th>
              <th className="p-3 text-right font-medium">Lifetime spend</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                onClick={() => setSelected(c)}
                className="cursor-pointer border-t border-border hover:bg-canvas"
              >
                <td className="p-3 font-medium text-fg">{c.name}</td>
                <td className="p-3 text-muted">{c.email ?? c.phone ?? "—"}</td>
                <td className="merkat-num p-3 text-right text-fg">
                  {c.loyaltyPoints}
                </td>
                <td className="merkat-num p-3 text-right text-fg">
                  {fmt(c.totalSpendMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding ? <AddCustomer onClose={() => setAdding(false)} /> : null}
      {selected ? (
        <CustomerDetail customer={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function AddCustomer({ onClose }: { onClose: () => void }): JSX.Element {
  const createCustomer = useCustomers((s) => s.create);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(): void {
    const parsed = customerInputSchema.safeParse({
      name,
      email: email.trim() || null,
      phone: phone.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    createCustomer(parsed.data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-6">
      <div
        role="dialog"
        aria-label="Add customer"
        className="w-full max-w-sm rounded-[--radius-card] border border-border bg-surface p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-fg">Add customer</h2>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input merkat-num"
          />
        </Field>
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        <div className="flex gap-3">
          <button
            onClick={submit}
            className="rounded-[--radius-control] bg-accent px-4 py-2 font-medium text-white"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="rounded-[--radius-control] border border-border px-4 py-2 text-fg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}): JSX.Element {
  const branding = useSession((s) => s.branding);
  const fmt = (m: number): string =>
    formatMoney(money(m, branding.currency), branding.locale);
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30">
      <div
        role="dialog"
        aria-label="Customer detail"
        className="h-full w-full max-w-sm bg-surface p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">{customer.name}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          <Line label="Email" value={customer.email ?? "—"} />
          <Line label="Phone" value={customer.phone ?? "—"} />
          <Line label="Loyalty points" value={String(customer.loyaltyPoints)} />
          <Line label="Lifetime spend" value={fmt(customer.totalSpendMinor)} />
        </dl>
        {customer.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {customer.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {customer.notes ? (
          <p className="mt-4 rounded-[--radius-control] bg-canvas p-3 text-sm text-fg">
            {customer.notes}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-muted">
          AI summary arrives in Phase 8.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm text-fg">{label}</span>
      {children}
    </label>
  );
}

function Line({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="merkat-num text-fg">{value}</dd>
    </div>
  );
}
