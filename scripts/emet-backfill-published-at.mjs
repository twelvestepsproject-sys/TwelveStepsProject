/**
 * Fills in a missing published_at for posts that are already marked
 * published.
 *
 * Why these posts 404
 * -------------------
 * The public filter is two independent conditions (lib/queries/supabase/
 * index.ts, getPost / listPosts / search):
 *
 *   status = 'published' AND published_at IS NOT NULL AND published_at <= now()
 *
 * A post saved as "published" with the date field left blank satisfies the
 * first and fails the second, so it exists in the admin and 404s in public.
 * That is how 15 of the en-source posts ended up invisible.
 *
 * Why not relax the filter instead
 * --------------------------------
 * Treating a null date as published would change behaviour in four query
 * sites across BOTH sites on this database, and would break scheduled
 * publishing, which relies on the date being checked separately from the
 * status. The fixtures in lib/mock/fixtures/posts.ts exist specifically to
 * hold those two conditions apart. The data is what is wrong here, not the
 * rule.
 *
 * What this does NOT touch
 * ------------------------
 * Drafts. A draft is a deliberate state - someone chose not to publish it -
 * and a script does not get to publish it on their behalf. Drafts are
 * reported at the end so a human can decide.
 *
 * The date used is the post's own updated_at, not now(): it reflects when
 * the post was actually worked on, keeps the ordering in listPosts sane,
 * and is already in the past, so the post goes live immediately.
 *
 *   node scripts/emet-backfill-published-at.mjs                 # report only
 *   node scripts/emet-backfill-published-at.mjs --write         # apply
 *   node scripts/emet-backfill-published-at.mjs --like 'en-source-%'
 *
 * Safe to re-run: a post that already has a date is never modified.
 */
import pg from "pg";

const WRITE = process.argv.includes("--write");

const likeIdx = process.argv.indexOf("--like");
const LIKE = likeIdx !== -1 ? process.argv[likeIdx + 1] : null;
if (likeIdx !== -1 && (!LIKE || LIKE.startsWith("--"))) {
  console.error("--like needs a pattern, e.g. --like 'en-source-%'");
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("refusing to run: DATABASE_URL is not set.");
  process.exit(1);
}

const parsed = new URL(url);
const dbName = parsed.pathname.replace(/^\//, "");
const EXPECTED = process.env.EXPECT_DB ?? "emet";
if (dbName !== EXPECTED) {
  console.error(
    `refusing to run: DATABASE_URL names database "${dbName}", expected "${EXPECTED}".\n` +
      `Set EXPECT_DB if this is deliberate.`,
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  // Published but dateless: the ones this script fixes.
  const { rows: fixable } = await client.query(
    `select id, slug, updated_at
       from public.posts
      where status = 'published'
        and published_at is null
        ${LIKE ? "and slug like $1" : ""}
      order by slug`,
    LIKE ? [LIKE] : [],
  );

  // Drafts, reported only. Both kinds: with and without a date.
  const { rows: drafts } = await client.query(
    `select slug, published_at
       from public.posts
      where status = 'draft'
        ${LIKE ? "and slug like $1" : ""}
      order by slug`,
    LIKE ? [LIKE] : [],
  );

  if (fixable.length === 0) {
    console.log("No published posts are missing a date. Nothing to do.");
  } else {
    console.log(
      `${fixable.length} published post(s) with no date ` +
        `${WRITE ? "being given one" : "would be given one"}:\n`,
    );
    for (const row of fixable) {
      const when = row.updated_at
        ? new Date(row.updated_at).toISOString().slice(0, 16).replace("T", " ")
        : "now()";
      console.log(`  ${row.slug.padEnd(20)} -> ${when}`);
    }

    if (WRITE) {
      // coalesce: a row with no updated_at either still gets a usable date
      // rather than being skipped.
      const { rowCount } = await client.query(
        `update public.posts
            set published_at = coalesce(updated_at, now())
          where status = 'published'
            and published_at is null
            ${LIKE ? "and slug like $1" : ""}`,
        LIKE ? [LIKE] : [],
      );
      console.log(`\n${rowCount} post(s) updated.`);
    } else {
      console.log("\nRe-run with --write to apply.");
    }
  }

  if (drafts.length) {
    console.log(`\nLeft alone - still drafts (${drafts.length}):`);
    for (const d of drafts) {
      const note = d.published_at ? "has a date, but status is draft" : "no date, status draft";
      console.log(`  ${d.slug.padEnd(20)} ${note}`);
    }
    console.log(
      "\nThese will keep returning 404 until someone sets them to published\n" +
        "in the admin. That is a content decision, not one for this script.",
    );
  }
} catch (err) {
  console.error(`failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
