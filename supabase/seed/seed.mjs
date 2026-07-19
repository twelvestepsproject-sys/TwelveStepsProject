#!/usr/bin/env node
/**
 * supabase/seed/seed.mjs — §5.5 / §16 Phase 5: "loads these same files
 * into Postgres via /supabase/seed, so any effort [on fixtures] is not
 * throwaway." Loads every /lib/mock/fixtures/*.ts file into the real
 * Postgres tables via the Supabase service-role client (bypassing RLS is
 * correct here: this is a one-off/CI seeding script, not a client-facing
 * path — see lib/supabase/admin.ts's doc comment for the general policy).
 *
 * IDEMPOTENT: every insert is an upsert keyed on the fixture's own uuid
 * (`id`), so re-running this script is safe and converges to the same
 * state rather than duplicating rows. Run with:
 *
 *   pnpm tsx supabase/seed/seed.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (reads from .env.local via `dotenv` if present — see the
 * bottom of this file).
 *
 * ORDER MATTERS (FK dependencies): media -> categories/lecturers ->
 * pages+blocks / trainings(+instructors) / posts / testimonials ->
 * program_stages -> program_steps -> galleries+images -> podcast_episodes
 * -> schedule_entries -> menus+menu_items -> site_settings -> captured
 * data (leads/newsletter/contact) -> redirects -> profiles (profiles is
 * seeded LAST and only updates existing auth.users-backed rows, see the
 * dedicated note in that section — it does NOT create auth users itself,
 * that's scripts/create-first-admin.mjs's job).
 */

import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "[seed] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Aborting.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const root = path.resolve(import.meta.dirname, "../../lib/mock/fixtures");
async function importFixture(file) {
  const mod = await import(pathToFileURL(path.join(root, file)).href);
  return mod;
}

function log(step, count) {
  console.log(`[seed] ${step}: ${count} row(s)`);
}

async function upsert(table, rows, { onConflict = "id" } = {}) {
  if (rows.length === 0) {
    log(table, 0);
    return;
  }
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    console.error(`[seed] FAILED upserting ${table}:`, error.message);
    throw error;
  }
  log(table, rows.length);
}

async function main() {
  console.log(`[seed] Target: ${url}`);

  // ---- media (referenced by nearly everything else) ----
  const { media } = await importFixture("media.ts");
  await upsert("media", media);

  // ---- categories ----
  const { categories } = await importFixture("categories.ts");
  await upsert("categories", categories);

  // ---- lecturers ----
  const { lecturers } = await importFixture("lecturers.ts");
  await upsert("lecturers", lecturers.map(stripPlaceholderExtras));

  // ---- trainings (+ m2m instructors) ----
  const { trainings } = await importFixture("trainings.ts");
  const trainingRows = trainings.map(({ instructors, ...rest }) => rest);
  await upsert("trainings", trainingRows);

  const instructorRows = trainings.flatMap((t) =>
    (t.instructors ?? []).map((lecturer, idx) => ({
      training_id: t.id,
      lecturer_id: lecturer.id,
      sort_order: idx,
    })),
  );
  await upsert("training_instructors", instructorRows, { onConflict: "training_id,lecturer_id" });

  // ---- posts (category nested -> category_id only) ----
  const { posts } = await importFixture("posts.ts");
  const postRows = posts.map(({ category, ...rest }) => rest);
  await upsert("posts", postRows);

  // ---- testimonials ----
  const { testimonials } = await importFixture("testimonials.ts");
  await upsert("testimonials", testimonials);

  // ---- program stages + steps ----
  const { programStages } = await importFixture("program-stages.ts");
  const stageRows = programStages.map(({ steps, ...rest }) => rest);
  await upsert("program_stages", stageRows);

  const { programSteps } = await importFixture("program-steps.ts");
  await upsert("program_steps", programSteps);

  // ---- galleries + images ----
  const { galleries } = await importFixture("galleries.ts");
  const galleryRows = galleries.map(({ images, ...rest }) => rest);
  await upsert("galleries", galleryRows);
  const imageRows = galleries.flatMap((g) => g.images ?? []);
  await upsert("gallery_images", imageRows);

  // ---- podcast episodes ----
  const { podcastEpisodes } = await importFixture("podcast.ts");
  await upsert("podcast_episodes", podcastEpisodes);

  // ---- schedule entries ----
  const { scheduleEntries } = await importFixture("schedule.ts");
  await upsert("schedule_entries", scheduleEntries);

  // ---- pages + blocks ----
  const { pages } = await importFixture("pages.ts");
  const pageRows = pages.map(({ blocks, ...rest }) => rest);
  await upsert("pages", pageRows);
  const blockRows = pages.flatMap((p) => p.blocks ?? []);
  await upsert("page_blocks", blockRows);

  // ---- menus + menu_items (flatten the nested tree fixture) ----
  const { menusByLocation } = await importFixture("menus.ts");
  const menuIdByLocation = {};
  for (const location of Object.keys(menusByLocation)) {
    const { data: existing } = await supabase
      .from("menus")
      .select("id")
      .eq("location", location)
      .maybeSingle();
    if (existing) {
      menuIdByLocation[location] = existing.id;
    } else {
      const { data, error } = await supabase
        .from("menus")
        .insert({ location })
        .select("id")
        .single();
      if (error) throw error;
      menuIdByLocation[location] = data.id;
    }
  }
  log("menus", Object.keys(menuIdByLocation).length);

  function flattenMenuItems(items, menuId, parentId = null) {
    const rows = [];
    for (const item of items) {
      const { children, ...rest } = item;
      rows.push({ ...rest, menu_id: menuId, parent_id: parentId });
      rows.push(...flattenMenuItems(children ?? [], menuId, item.id));
    }
    return rows;
  }
  const menuItemRows = Object.entries(menusByLocation).flatMap(([location, items]) =>
    flattenMenuItems(items, menuIdByLocation[location]),
  );
  await upsert("menu_items", menuItemRows);

  // ---- site_settings (singleton) ----
  const { siteSettings } = await importFixture("site-settings.ts");
  const { data: existingSettings } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
  const { id: _fixtureId, ...settingsFields } = siteSettings;
  if (existingSettings) {
    const { error } = await supabase.from("site_settings").update(settingsFields).eq("id", existingSettings.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("site_settings").insert(settingsFields);
    if (error) throw error;
  }
  log("site_settings", 1);

  // ---- captured data: leads / newsletter_subscribers / contact_messages ----
  const { leads } = await importFixture("leads.ts");
  await upsert("leads", leads);
  const { newsletterSubscribers } = await importFixture("newsletter-subscribers.ts");
  await upsert("newsletter_subscribers", newsletterSubscribers);
  const { contactMessages } = await importFixture("contact-messages.ts");
  await upsert("contact_messages", contactMessages);

  // ---- redirects ----
  const { redirects } = await importFixture("redirects.ts");
  await upsert("redirects", redirects);

  // ---- profiles: NOT seeded by id here. ----
  // profiles.id is a FK to auth.users(id) (§6/§7), and auth.users rows can
  // only be created via Supabase Auth / the Admin API — not by this
  // fixtures-to-Postgres seed script. lib/mock/fixtures/profiles.ts's three
  // fictional rows (dev admin/editor/viewer) have no corresponding real
  // auth.users accounts and would violate the FK if inserted directly.
  // scripts/create-first-admin.mjs creates ONE real admin account
  // (aharon.reiss@gmail.com, matching the mock fixture's admin row) via
  // the Admin API, which the handle_new_user trigger then mirrors into
  // profiles automatically. Additional users are created the same way,
  // through the real Users screen once it's wired to the Admin API.
  console.log(
    "[seed] profiles: skipped — auth.users-backed, created via scripts/create-first-admin.mjs instead.",
  );

  console.log("\n[seed] Done.");
}

function stripPlaceholderExtras(row) {
  return row;
}

main().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
