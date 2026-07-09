/**
 * Sync endpoint (CLAUDE.md §6). Terminals push their outbox and pull the server
 * op stream since their checkpoint. The server applies ops idempotently with the
 * §6 conflict policy (see @merkat/db SyncServer).
 *
 * Phase 5 backs the server with a SQLite projection (Postgres is the source of
 * record in production, §4); PowerSync is the default transport behind the same
 * SyncEngine interface on the terminal.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import type { PullResponse, PushResponse } from "@merkat/db";
import { SyncServer, migrateLocal, openLocalDb } from "@merkat/db/node";

// One server projection per API process. SYNC_DB may point at a file to persist.
const handle = openLocalDb(process.env.SYNC_DB ?? ":memory:");
migrateLocal(handle);
const server = new SyncServer(handle);

const opSchema = z.object({
  opId: z.string(),
  entity: z.string(),
  entityId: z.string(),
  op: z.enum(["insert", "update", "delete"]),
  payload: z.record(z.string(), z.unknown()),
  updatedAt: z.number(),
});
const pushSchema = z.object({ ops: z.array(opSchema) });

@Controller("sync")
export class SyncController {
  @Post("push")
  push(@Body() body: unknown): PushResponse {
    const parsed = pushSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid push payload.");
    return server.push(parsed.data);
  }

  @Get("pull")
  pull(@Query("cursor") cursor?: string): PullResponse {
    const n = Number(cursor ?? 0);
    if (!Number.isFinite(n) || n < 0) {
      throw new BadRequestException("Invalid cursor.");
    }
    return server.pull({ cursor: n });
  }
}
