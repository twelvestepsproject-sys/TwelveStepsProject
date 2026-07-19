#!/usr/bin/env node
/**
 * scripts/create-first-admin.mjs
 *
 * ============================================================================
 * ONE-OFF SETUP UTILITY — NOT PART OF THE APPLICATION RUNTIME.
 * Run manually, once, from a developer/operator machine to bootstrap the
 * very first real admin account for a fresh Supabase project. Nothing in
 * /app, /components, or /lib/queries imports or calls this script — it is
 * not wired into any request path, Server Action, or build step.
 * ============================================================================
 *
 * WHY THIS EXISTS: §7 "no public sign-up — admins are created by an
 * existing admin, server-side." On a brand-new project there IS no
 * existing admin yet, so this script is the one legitimate bootstrap path,
 * using the Supabase Admin API (`auth.admin.createUser`), which requires
 * the service-role key — the only place in this codebase besides
 * lib/supabase/admin.ts's doc-comment-covered exceptions that touches it.
 *
 * SAFETY:
 *  - Reads the service-role key from the environment (SUPABASE_SERVICE_ROLE_KEY
 *    via .env.local) — the key is never hardcoded in this file.
 *  - Reads the admin's email/password from environment variables you set
 *    for this one invocation (FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD),
 *    never hardcoded, never logged.
 *  - NOT destructively re-runnable: if a user with the given email already
 *    exists, the script detects this via `auth.admin.listUsers` and exits
 *    WITHOUT modifying anything (no password reset, no role overwrite) —
 *    printing a message instead. To change an existing admin's password or
 *    role, use the Supabase dashboard or the (future) Users screen, not
 *    this script.
 *  - Sets `profiles.role = 'admin'` after creation (the `handle_new_user`
 *    trigger creates the profiles row with role='viewer' by default per
 *    migration 00000000000010; this script promotes it to admin in one
 *    explicit follow-up update, logged to stdout).
 *
 * USAGE:
 *   FIRST_ADMIN_EMAIL="you@example.com" FIRST_ADMIN_PASSWORD="..." \
 *     pnpm tsx scripts/create-first-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.FIRST_ADMIN_EMAIL;
const password = process.env.FIRST_ADMIN_PASSWORD;

if (!url || !serviceRoleKey) {
  console.error(
    "[create-first-admin] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment. Aborting.",
  );
  process.exit(1);
}
if (!email || !password) {
  console.error(
    "[create-first-admin] Set FIRST_ADMIN_EMAIL and FIRST_ADMIN_PASSWORD in the environment before running this script. Aborting — nothing was created.",
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("[create-first-admin] FIRST_ADMIN_PASSWORD must be at least 8 characters. Aborting.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[create-first-admin] Target project: ${url}`);
  console.log(`[create-first-admin] Checking for an existing user with email ${email}...`);

  // Not destructively re-runnable: bail out if this email already exists.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("[create-first-admin] Failed to list existing users:", listError.message);
    process.exit(1);
  }
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    console.log(
      `[create-first-admin] A user with this email already exists (id: ${existing.id}). ` +
        "Not modifying anything — this script never overwrites an existing account. " +
        "Use the Supabase dashboard or the Users screen to change its password/role.",
    );
    process.exit(0);
  }

  console.log("[create-first-admin] No existing user found. Creating...");
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification for this bootstrap account
    user_metadata: { full_name: "אהרון רייס" },
  });
  if (createError || !created.user) {
    console.error("[create-first-admin] Failed to create user:", createError?.message);
    process.exit(1);
  }
  console.log(`[create-first-admin] Created auth.users row: ${created.user.id}`);

  // handle_new_user trigger has by now created a `profiles` row with the
  // default role ('viewer'). Promote it to admin explicitly.
  // Small delay/retry: the trigger fires synchronously within the same
  // transaction as the insert, so it should already exist, but we retry
  // briefly in case of replication lag on the read replica.
  let profile = null;
  for (let attempt = 0; attempt < 5 && !profile; attempt++) {
    const { data } = await supabase.from("profiles").select("id, role").eq("id", created.user.id).maybeSingle();
    if (data) {
      profile = data;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!profile) {
    console.error(
      "[create-first-admin] auth.users row created, but no matching profiles row appeared. Check the handle_new_user trigger (migration 00000000000010).",
    );
    process.exit(1);
  }

  const { error: promoteError } = await supabase
    .from("profiles")
    .update({ role: "admin", is_active: true })
    .eq("id", created.user.id);
  if (promoteError) {
    console.error("[create-first-admin] Failed to promote profile to admin:", promoteError.message);
    process.exit(1);
  }

  console.log(`[create-first-admin] Done. ${email} is now an active admin.`);
  console.log("[create-first-admin] Log in at /admin/login with the email/password you set.");
}

main();
