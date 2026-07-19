// §5.5 launch gate: queries for any row with is_placeholder = true and
// fails if DATA_SOURCE=supabase. Against the mock (Phase 1-4) placeholder
// content is expected and this script is a deliberate no-op so it doesn't
// block local dev.
//
// Phase 5: real enforcement — queries every content table that carries
// is_placeholder via the Supabase service-role client (needs to read past
// RLS's public-visibility filters to see hidden placeholder rows too, so
// this is a legitimate service-role use: a CI/local script, never a
// client-facing path).

import { createClient } from "@supabase/supabase-js";

const dataSource = process.env.DATA_SOURCE ?? "mock";

if (dataSource !== "supabase") {
  console.log(
    `[check:placeholder] DATA_SOURCE=${dataSource} — placeholder content is expected pre-Phase-5. Skipping.`,
  );
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "[check:placeholder] DATA_SOURCE=supabase but NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. Failing closed.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Every table in §6 that carries is_placeholder boolean not null default false.
const PLACEHOLDER_TABLES = [
  "categories",
  "lecturers",
  "pages",
  "trainings",
  "posts",
  "testimonials",
  "program_stages",
  "program_steps",
  "galleries",
  "podcast_episodes",
  "schedule_entries",
];

let failed = false;

for (const table of PLACEHOLDER_TABLES) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("is_placeholder", true);

  if (error) {
    console.error(`[check:placeholder] failed to query ${table}:`, error.message);
    failed = true;
    continue;
  }

  if (count && count > 0) {
    console.error(`[check:placeholder] ${table}: ${count} placeholder row(s) remain.`);
    failed = true;
  } else {
    console.log(`[check:placeholder] ${table}: clean.`);
  }
}

if (failed) {
  console.error(
    "\n[check:placeholder] FAILED — placeholder content (or a query error) remains with DATA_SOURCE=supabase. Not launch-ready.",
  );
  process.exit(1);
}

console.log("\n[check:placeholder] PASSED — no placeholder content remains.");
process.exit(0);
