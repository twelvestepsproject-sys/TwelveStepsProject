// Sets an admin password in the self-hosted database.
//
//   node scripts/pg-set-password.mjs <email> [password]
//
// Needed because Supabase never exported its bcrypt hashes: every account
// starts with no usable password after the migration. Also the way to
// create the first admin on a fresh server.
//
// Omit the password and one is generated and printed — better than the
// operator inventing a weak one. Passing it as an argument puts it in the
// shell history, so the generated form is the default for a reason.

import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import readline from "node:readline/promises";

const scrypt = promisify(scryptCb);

// Kept in sync with lib/auth/password.ts by hand: this script is standalone
// (no bundler, no "server-only" resolution) so it cannot import that module.
const N = 1 << 17;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 256 * 1024 * 1024;

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = await fs.readFile(path.join(process.cwd(), file), "utf8");
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const i = t.indexOf("=");
        if (i === -1) continue;
        const k = t.slice(0, i).trim();
        const v = t.slice(i + 1).trim().split(/\s+#/)[0].trim();
        if (!process.env[k]) process.env[k] = v;
      }
    } catch {
      /* optional */
    }
  }
}

await loadEnv();

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/pg-set-password.mjs <email> [password]");
  process.exit(1);
}

let password = process.argv[3];
let generated = false;
if (!password) {
  // base64url of 12 bytes: 16 characters, no ambiguous shell quoting.
  password = randomBytes(12).toString("base64url");
  generated = true;
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/twelvesteps",
});
await client.connect();

try {
  const { rows } = await client.query(
    `select u.id, p.role::text as role, p.is_active
       from auth.users u left join public.profiles p on p.id = u.id
      where u.email = $1`,
    [email],
  );

  if (rows.length === 0) {
    // Creating a user is a bigger step than resetting one, so it is
    // confirmed rather than assumed from a typo'd email.
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(`No account for ${email}. Create it as an admin? [y/N] `))
      .trim()
      .toLowerCase();
    rl.close();
    if (answer !== "y" && answer !== "yes") {
      console.log("Cancelled.");
      process.exit(1);
    }

    const encrypted = await hashPassword(password);
    // handle_new_user() creates the profiles row from raw_user_meta_data.
    const { rows: created } = await client.query(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
       values ($1, $2, $3::jsonb, now())
       returning id`,
      [email, encrypted, JSON.stringify({ full_name: email.split("@")[0], role: "admin" })],
    );
    await client.query(
      `update public.profiles set role = 'admin', is_active = true where id = $1`,
      [created[0].id],
    );
    console.log(`\nCreated admin ${email}.`);
  } else {
    const encrypted = await hashPassword(password);
    await client.query(
      `update auth.users set encrypted_password = $2, updated_at = now() where id = $1`,
      [rows[0].id, encrypted],
    );
    console.log(`\nPassword updated for ${email} (role: ${rows[0].role ?? "none"}).`);
    if (rows[0].is_active === false) {
      console.log("Note: this account is marked inactive and cannot sign in until reactivated.");
    }
  }

  if (generated) {
    console.log(`\n  password: ${password}\n`);
    console.log("Save it now — it is not stored anywhere in readable form.\n");
  }
} finally {
  await client.end();
}
