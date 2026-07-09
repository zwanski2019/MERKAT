/**
 * Cloud login (CLAUDE.md §8): email + password → tenant-scoped JWT. The client
 * uses this to bind a terminal to a tenant; offline shift changes then use PIN
 * unlock. Credentials are argon2id-verified (same primitive as PIN, §8).
 *
 * Phase 2 authenticates against a seeded owner; the real staff/user store lands
 * with the sync + team flows. Permissions are still enforced server-side (§1.8).
 */
import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import {
  loginRequestSchema,
  verifySecret,
  type LoginResult,
  type Role,
} from "@merkat/core";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret";

// Seeded demo tenant + owner (mirrors the UI SeedAuthStore). Password:
// "lumiere-owner". Replaced by the synced staff table in a later phase.
const DEMO = {
  tenant: {
    id: "0191a000-0000-7000-8000-000000000001",
    name: "Lumière Cosmetics",
    businessType: "retail" as const,
    accentHex: "#E11D74",
    logoUrl: null,
    currency: "USD",
    locale: "en-US",
  },
  owner: {
    id: "0191a000-0000-7000-8000-0000000000a1",
    name: "Amira",
    role: "owner" as Role,
    email: "amira@lumiere.example",
    passwordHash:
      "$argon2id$v=19$m=19456,t=3,p=1$uHLURJ+mf7q8JIZGV/URXg$iwaFOegqbqdOn1R8usR9gyTzDsCJvM1/jWnn0F9xeW4",
  },
};

@Controller("auth")
export class AuthController {
  @Post("login")
  async login(@Body() body: unknown): Promise<LoginResult> {
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid login payload.");
    }
    const { email, password } = parsed.data;

    const owner = DEMO.owner;
    const ok =
      email === owner.email &&
      (await verifySecret(password, owner.passwordHash));
    if (!ok) {
      throw new BadRequestException("Invalid email or password.");
    }

    const token = jwt.sign(
      { tenantId: DEMO.tenant.id, staffId: owner.id, role: owner.role },
      JWT_SECRET,
      { expiresIn: "8h", subject: owner.id },
    );

    return {
      token,
      tenant: DEMO.tenant,
      staff: { id: owner.id, name: owner.name, role: owner.role },
    };
  }
}
