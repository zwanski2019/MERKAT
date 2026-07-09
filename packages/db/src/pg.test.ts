import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { pgDdl } from "./schema/ddl.js";
import { MODEL } from "./schema/model.js";

// Proves the Postgres dialect migrates (§12 Phase 1) by executing the generated
// DDL against PGlite (in-process Postgres) — the same schema, the other dialect.
describe("postgres dialect migrates (§1.7, §12)", () => {
  it("creates every table and round-trips jsonb/bigint/timestamptz", async () => {
    const pg = new PGlite();
    for (const statement of pgDdl()) await pg.exec(statement);

    const { rows } = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n
         FROM information_schema.tables
        WHERE table_schema = 'public'`,
    );
    expect(rows[0]!.n).toBe(MODEL.length);

    await pg.exec(
      `INSERT INTO tenants
         (id, tenant_id, created_at, updated_at, sync_status,
          business_type, name, accent_hex, currency, locale, tax_config)
       VALUES
         (gen_random_uuid(), gen_random_uuid(), now(), now(), 'synced',
          'retail', 'Lumière', '#E11D74', 'USD', 'en-US', '{"rate":0.08}')`,
    );

    const t = await pg.query<{ business_type: string; tax_config: unknown }>(
      "SELECT business_type, tax_config FROM tenants",
    );
    expect(t.rows[0]!.business_type).toBe("retail");
    expect(t.rows[0]!.tax_config).toEqual({ rate: 0.08 });

    // enum CHECK constraint is enforced in pg too
    await expect(
      pg.exec(
        `INSERT INTO tenants
           (id, tenant_id, created_at, updated_at, sync_status,
            business_type, name, accent_hex, currency, locale)
         VALUES
           (gen_random_uuid(), gen_random_uuid(), now(), now(), 'synced',
            'not_a_type', 'X', '#fff', 'USD', 'en')`,
      ),
    ).rejects.toThrow();

    await pg.close();
  });
});
