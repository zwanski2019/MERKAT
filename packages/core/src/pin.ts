/**
 * Offline secret hashing (CLAUDE.md §8). Staff PIN unlock is validated on-device
 * against the synced `staff.pin_hash` (argon2id), so shift changes work with no
 * network. Passwords use the same primitive.
 *
 * hash-wasm is pure WebAssembly — the exact same argon2id runs on the terminal
 * (browser + Tauri) and on the API/Node side, so a hash minted anywhere verifies
 * everywhere. Output is the standard encoded `$argon2id$v=19$...` string.
 */
import { argon2id, argon2Verify } from "hash-wasm";

// Interactive-login parameters: strong enough for a 4-digit PIN gate while
// staying fast on low-end POS hardware.
const PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 19456, // KiB (~19 MiB, OWASP argon2id minimum)
  hashLength: 32,
} as const;

function randomSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}

/** Hash a secret (PIN or password) to an encoded argon2id string. */
export async function hashSecret(secret: string): Promise<string> {
  return argon2id({
    password: secret,
    salt: randomSalt(),
    ...PARAMS,
    outputType: "encoded",
  });
}

/** Verify a secret against an encoded argon2id hash. Never throws on mismatch. */
export async function verifySecret(
  secret: string,
  encodedHash: string,
): Promise<boolean> {
  try {
    return await argon2Verify({ password: secret, hash: encodedHash });
  } catch {
    return false;
  }
}

const PIN_RE = /^\d{4}$/;

export function isValidPinFormat(pin: string): boolean {
  return PIN_RE.test(pin);
}

/** Hash a 4-digit staff PIN. Rejects malformed input before hashing. */
export async function hashPin(pin: string): Promise<string> {
  if (!isValidPinFormat(pin)) {
    throw new Error("PIN must be exactly 4 digits.");
  }
  return hashSecret(pin);
}

/** Validate a 4-digit staff PIN offline against a synced hash. */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!isValidPinFormat(pin)) return false;
  return verifySecret(pin, hash);
}
