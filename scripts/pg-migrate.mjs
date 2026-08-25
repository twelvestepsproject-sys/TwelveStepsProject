// Applies the schema to a plain Postgres database.
//
// Runs postgres/init/*.sql first (the prelude that stands in for the
// Supabase-provided `auth` and `storage` schemas), then the existing
// supabase/migrations/*.sql unchanged. Keeping the originals as the single
// source of truth avoids two diverging copies of the schema.
//
// Tracks what has run in `public.schema_migrations`, so re-running is safe.
//
// Usage: node scripts/pg-migrate.mjs [--reset]

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

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
      // file is optional
    }
  }
}

await loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const reset = process.argv.includes("--reset");
const client = new pg.Client({ connectionString });
await client.connect();

try {
  if (reset) {
    // Drops everything this project created. The prelude's schemas go too,
    // so a reset really is a clean slate rather than a partial one.
    console.log("resetting schema…");
    await client.query(`
      drop schema if exists public cascade;
      drop schema if exists auth cascade;
      drop schema if exists storage cascade;
      create schema public;
    `);
  }

  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows } = await client.query("select filename from public.schema_migrations");
  const done = new Set(rows.map((r) => r.filename));

  const initDir = path.join(process.cwd(), "postgres", "init");
  const migDir = path.join(process.cwd(), "supabase", "migrations");

  const files = [
    ...(await fs.readdir(initDir)).sort().map((f) => ({ dir: initDir, file: `init/${f}`, real: f })),
    ...(await fs.readdir(migDir)).sort().map((f) => ({ dir: migDir, file: f, real: f })),
  ].filter((f) => f.real.endsWith(".sql"));

  let applied = 0;
  for (const { dir, file, real } of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, real), "utf8");

    // Each file in its own transaction: a failure leaves the database at
    // the last good migration rather than half-applied.
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public.schema_migrations (filename) values ($1)", [file]);
      await client.query("commit");
      console.log(`  ✓ ${file}`);
      applied += 1;
    } catch (err) {
      await client.query("rollback");
      console.error(`  ✗ ${file}`);
      console.error(`    ${err.message}`);
      process.exit(1);
    }
  }

  console.log(applied === 0 ? "\nalready up to date." : `\napplied ${applied} file(s).`);
} finally {
  await client.end();
}
