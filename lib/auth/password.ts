import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing for self-hosted mode.
 *
 * Supabase's GoTrue hashed passwords with bcrypt and never exported those
 * hashes, so nothing carries across the migration — every account needs its
 * password set again through scripts/pg-set-password.mjs. Given that, the
 * algorithm was a free choice, and scrypt is in node:crypto: memory-hard
 * like bcrypt, no dependency, and no native build step on the server.
 *
 * Stored format is self-describing so the cost parameters can be raised
 * later without invalidating existing hashes:
 *
 *   scrypt$N$r$p$<salt-b64>$<hash-b64>
 *
 * verifyPassword() reads the parameters back out of the stored string
 * rather than assuming today's constants.
 */
const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// OWASP's scrypt floor (N=2^17, r=8, p=1). maxmem must be raised past
// node's 32MB default, since N*r*128 alone is 128MB here.
const N = 1 << 17;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 256 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM,
    });
  } catch {
    // Corrupt or hostile parameters (an N that blows past maxmem) must read
    // as a failed login, not a 500.
    return false;
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
