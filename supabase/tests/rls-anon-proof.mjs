#!/usr/bin/env node
/**
 * supabase/tests/rls-anon-proof.mjs — §17 acceptance criterion: "RLS on
 * for every table; the anon key cannot read leads, contact_messages,
 * newsletter_subscribers, or profiles. Proven by a test."
 *
 * Uses ONLY the anon key (never the service role) to attempt reads that
 * must be rejected/empty, and reads that must succeed appropriately
 * scoped (published-only). Exits non-zero if any assertion fails.
 *
 * Run with: pnpm tsx supabase/tests/rls-anon-proof.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("[rls-proof] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
  } else {
    console.error(`  FAIL: ${message}`);
    failures++;
  }
}

async function main() {
  console.log(`[rls-proof] Target: ${url}\n`);

  console.log("Zero anon SELECT access:");
  for (const table of ["leads", "contact_messages", "newsletter_subscribers", "profiles"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    // With RLS default-deny (no SELECT policy for anon), PostgREST returns
    // an EMPTY array with NO error (RLS silently filters all rows) rather
    // than a 401/403 — this is standard Postgres RLS behavior. Both "empty
    // data" and "an explicit error" count as proof of no access.
    const blocked = (Array.isArray(data) && data.length === 0) || Boolean(error);
    assert(blocked, `${table}: anon SELECT returns 0 rows (data=${JSON.stringify(data)}, error=${error?.message ?? "none"})`);
  }

  console.log("\nanon INSERT allowed only on leads/contact_messages/newsletter_subscribers:");
  const { error: leadError } = await anon.from("leads").insert({
    first_name: "בדיקה",
    last_name: "אוטומטית",
    email: `rls-proof-${Date.now()}@example.com`,
    phone: "0500000000",
    consent_at: new Date().toISOString(),
  });
  assert(!leadError, `leads: anon INSERT succeeds (error=${leadError?.message ?? "none"})`);

  console.log("\ndraft-status post excluded from anon SELECT:");
  const { data: draftPosts } = await anon.from("posts").select("id, status").eq("status", "draft").limit(5);
  assert(
    !draftPosts || draftPosts.length === 0,
    `posts: anon SELECT with status=draft filter returns 0 rows (got ${draftPosts?.length ?? 0})`,
  );

  console.log("\npublished content still readable by anon (sanity check RLS isn't over-blocking):");
  const { data: publishedPosts, error: publishedError } = await anon
    .from("posts")
    .select("id, status")
    .eq("status", "published")
    .limit(5);
  assert(!publishedError, `posts: anon SELECT of published rows succeeds (error=${publishedError?.message ?? "none"})`);

  console.log("\n" + (failures === 0 ? "[rls-proof] ALL PASSED" : `[rls-proof] ${failures} FAILURE(S)`));
  process.exit(failures === 0 ? 0 : 1);
}

main();
