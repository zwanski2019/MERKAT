/**
 * Client-generated identifiers (CLAUDE.md §1.2). Every row gets a `uuidv7` at
 * creation, minted on-device so two offline terminals never collide. No
 * auto-increment primary keys anywhere that syncs.
 *
 * uuidv7 is time-ordered, which keeps inserts index-friendly on both dialects.
 */
import { v7 as uuidv7 } from "uuid";

export type Id = string;

export function newId(): Id {
  return uuidv7();
}
