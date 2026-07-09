/**
 * Customers data source (CLAUDE.md §5). Same iface+mock pattern; the synced
 * SQLite `customers` table backs it later. AI customer summary is Phase 8 (§9).
 */
import { newId, type Customer, type CustomerInput } from "@merkat/core";

export interface CustomerStore {
  list(): Customer[];
  get(id: string): Customer | undefined;
  create(input: CustomerInput): Customer;
}

export class SeedCustomerStore implements CustomerStore {
  private customers: Customer[] = [
    {
      id: "0191a000-0000-7000-8000-0000000000b1",
      name: "Nadia Haddad",
      email: "nadia@example.com",
      phone: "+1 555 0142",
      loyaltyPoints: 120,
      totalSpendMinor: 45000,
      tags: ["vip"],
      notes: "Prefers fragrance-free products.",
    },
    {
      id: "0191a000-0000-7000-8000-0000000000b2",
      name: "Omar Said",
      email: null,
      phone: "+1 555 0199",
      loyaltyPoints: 30,
      totalSpendMinor: 12000,
      tags: [],
      notes: null,
    },
  ];

  list(): Customer[] {
    return [...this.customers];
  }

  get(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  create(input: CustomerInput): Customer {
    const customer: Customer = {
      id: newId(),
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      loyaltyPoints: 0,
      totalSpendMinor: 0,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
    };
    this.customers = [customer, ...this.customers];
    return customer;
  }
}
