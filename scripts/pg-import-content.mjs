// Copies all content from the Supabase cloud project into local Postgres.
//
// Reads through the Supabase client (service role, so RLS does not hide
// rows) and writes with plain SQL. Order matters: parents before children,
// or foreign keys reject the insert.
//
// Safe to re-run — every row is upserted by primary key, so a partial run
// can simply be repeated.
//
// Usage: node scripts/pg-import-content.mjs [--dry-run]

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

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

const dryRun = process.argv.includes("--dry-run");

// Dependency order. `profiles` needs auth.users to exist first, which is
// handled separately below since Supabase keeps those in a schema the
// service-role client cannot read directly.
const TABLES = [
  "media",
  "categories",
  "lecturers",
  "pages",
  "trainings",
  "training_instructors",
  "shared_blocks",
  "page_blocks",
  "posts",
  "testimonials",
  "program_stages",
  "program_steps",
  "galleries",
  "gallery_images",
  "podcast_episodes",
  "schedule_entries",
  "menus",
  "menu_items",
  "site_settings",
  "leads",
  "newsletter_subscribers",
  "contact_messages",
  "redirects",
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Generated columns (e.g. search_vector) are computed by Postgres and
// reject an explicit value, so they must be excluded from the column list.
const generated = new Set();
{
  const { rows } = await client.query(
    `select table_name, column_name from information_schema.columns
     where table_schema = 'public' and is_generated = 'ALWAYS'`,
  );
  for (const r of rows) generated.add(`${r.table_name}.${r.column_name}`);
}

let totalRead = 0;
let totalWritten = 0;
const summary = [];

try {
  // Users first: `profiles.id` references auth.users(id), so the parent
  // rows must exist. Supabase stores the real password hashes in a schema
  // we cannot export, so each user gets a placeholder hash and must have a
  // password set locally (see scripts/pg-set-password.mjs).
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  for (const u of authUsers?.users ?? []) {
    if (!dryRun) {
      await client.query(
        `insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at)
         values ($1, $2, $3, $4, $5)
         on conflict (id) do update set email = excluded.email`,
        [u.id, u.email, "NEEDS_RESET", u.email_confirmed_at ?? null, u.created_at ?? new Date()],
      );
    }
  }
  summary.push(["auth.users", authUsers?.users?.length ?? 0, authUsers?.users?.length ?? 0]);

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      summary.push([table, "—", `skipped (${error.message.slice(0, 40)})`]);
      continue;
    }
    let rows = data ?? [];
    // menu_items references itself via parent_id, so a child inserted before
    // its parent trips the foreign key. Top-level rows first.
    if (rows.length && "parent_id" in rows[0]) {
      rows = [...rows].sort((a, b) => (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0));
    }
    totalRead += rows.length;

    if (rows.length === 0) {
      summary.push([table, 0, 0]);
      continue;
    }

    let written = 0;
    if (!dryRun) {
      for (const row of rows) {
        const cols = Object.keys(row).filter((c) => !generated.has(`${table}.${c}`));
        // node-postgres sends a JS array as a Postgres array literal, which
        // a jsonb column rejects. Objects and arrays destined for json/jsonb
        // have to be serialised explicitly.
        const vals = cols.map((c) => {
          const v = row[c];
          return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
        });
        const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
        const quoted = cols.map((c) => `"${c}"`).join(", ");
        // Upsert so a re-run repairs a partial import instead of failing.
        const update = cols.filter((c) => c !== "id").map((c) => `"${c}" = excluded."${c}"`).join(", ");
        // Join tables (training_instructors, gallery_images) have a
        // composite key and no id column, so there is nothing to name in
        // ON CONFLICT — fall back to DO NOTHING, which still makes a re-run
        // safe. A table whose only column is its key gets the same.
        const conflict = !cols.includes("id")
          ? "on conflict do nothing"
          : update
            ? `on conflict (id) do update set ${update}`
            : "on conflict (id) do nothing";
        try {
        await client.query(
          `insert into public.${table} (${quoted}) values (${ph})
           ${conflict}`,
          vals,
        );
        } catch (e) {
          console.error(`
FAILED on table "${table}", row id=${row.id}`);
          console.error(`  columns: ${cols.join(", ")}`);
          console.error(`  ${e.message}`);
          process.exit(1);
        }
        written += 1;
      }
    }
    totalWritten += written;
    summary.push([table, rows.length, dryRun ? "(dry run)" : written]);
  }

  // profiles last: depends on auth.users.
  const { data: profiles } = await supabase.from("profiles").select("*");
  if (profiles?.length && !dryRun) {
    for (const row of profiles) {
      const cols = Object.keys(row).filter((c) => !generated.has(`profiles.${c}`));
      const vals = cols.map((c) => {
        const v = row[c];
        return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
      });
      const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
      const quoted = cols.map((c) => `"${c}"`).join(", ");
      const update = cols.filter((c) => c !== "id").map((c) => `"${c}" = excluded."${c}"`).join(", ");
      await client.query(
        `insert into public.profiles (${quoted}) values (${ph})
         on conflict (id) do update set ${update}`,
        vals,
      );
    }
  }
  summary.push(["profiles", profiles?.length ?? 0, dryRun ? "(dry run)" : profiles?.length ?? 0]);

  console.log("\ntable".padEnd(26) + "source".padEnd(10) + "imported");
  console.log("-".repeat(46));
  for (const [t, r, w] of summary) {
    console.log(String(t).padEnd(26) + String(r).padEnd(10) + String(w));
  }
  console.log("-".repeat(46));
  console.log(`${dryRun ? "would import" : "imported"}: ${totalRead} content rows\n`);
} finally {
  await client.end();
}
