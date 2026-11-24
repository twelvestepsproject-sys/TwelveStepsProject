#!/usr/bin/env node
/**
 * Repairs the `to_path` of redirects that point at pages which do not
 * exist.
 *
 * Why this is needed
 * -----------------
 * The 192 rows mapping the old WordPress URLs were imported with targets
 * built from the slug alone, which produced two shapes the site does not
 * serve:
 *
 *   /chapters/article-3     (29 rows)  a part has no route of its own at
 *                                      the top level; it lives under its
 *                                      chapter, /chapters/chapter-1/article-3
 *   /chapters/chapter-18    (15 rows)  a WordPress id, not a chapter
 *                                      number - post `chapter-18` is in
 *                                      fact chapter 4's own post, so the
 *                                      page is /chapters/chapter-4
 *
 * Checked against the live site before writing this: 47 of the 192
 * targets returned 404. Shipping the redirect feature without this fix
 * would have sent 47 old URLs, and whatever search ranking they carry, to
 * a dead page - worse than the status quo, where they at least landed on
 * the homepage.
 *
 * Corrections are DERIVED, never guessed
 * --------------------------------------
 * Every new target is read out of the database: the post named by the old
 * target is looked up, its category gives the chapter, and the two are
 * combined into the path the router actually serves. A row whose post
 * cannot be found is reported and left alone - the brief forbids inventing
 * content, and a redirect to a plausible-looking guess is exactly that.
 *
 * Dry run by default. `--write` applies.
 *
 *   node scripts/emet-fix-redirect-targets.mjs
 *   node scripts/emet-fix-redirect-targets.mjs --write
 */
import pg from "pg";

const WRITE = process.argv.includes("--write");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

/** The path the router serves for a post, given its category. */
function pathForPost(postSlug, categorySlug) {
  // A chapter's own post lives at the chapter URL, not under it - the
  // same rule app/(emet)/emet/chapters/[slug]/[article]/page.tsx applies
  // when it skips posts whose slug starts with "chapter-".
  if (postSlug.startsWith("chapter-")) return `/chapters/${categorySlug}`;
  return `/chapters/${categorySlug}/${postSlug}`;
}

async function main() {
  await client.connect();

  const { rows } = await client.query(`
    select r.id, r.from_path, r.to_path,
           p.slug as post_slug,
           c.slug as category_slug
      from redirects r
      left join posts p
        on p.slug = substring(r.to_path from '^/chapters/([^/]+)$')
      left join categories c
        on c.id = p.category_id
     where r.to_path ~ '^/chapters/[^/]+$'
     order by r.from_path
  `);

  const fixes = [];
  const unresolved = [];

  for (const row of rows) {
    if (!row.post_slug || !row.category_slug) {
      unresolved.push(row);
      continue;
    }
    const correct = pathForPost(row.post_slug, row.category_slug);
    if (correct !== row.to_path) {
      fixes.push({ ...row, correct });
    }
  }

  console.log(`single-segment /chapters/* redirects: ${rows.length}`);
  console.log(`  need correcting: ${fixes.length}`);
  console.log(`  cannot resolve:  ${unresolved.length}`);
  console.log("");

  for (const f of fixes) {
    console.log(`  ${f.from_path}`);
    console.log(`     ${f.to_path}  ->  ${f.correct}`);
  }

  if (unresolved.length) {
    console.log("");
    console.log("NOT TOUCHED - no post in the database matches these targets.");
    console.log("Logged for docs/manual-migration.md rather than guessed at:");
    for (const u of unresolved) {
      console.log(`  ${u.from_path} -> ${u.to_path}`);
    }
  }

  if (!WRITE) {
    console.log("");
    console.log("Dry run. Re-run with --write to apply.");
    await client.end();
    return;
  }

  // One transaction: a half-applied redirect table is harder to reason
  // about than one that was never touched.
  await client.query("begin");
  try {
    for (const f of fixes) {
      await client.query(
        "update redirects set to_path = $1, updated_at = now() where id = $2",
        [f.correct, f.id],
      );
    }
    await client.query("commit");
    console.log("");
    console.log(`Applied ${fixes.length} corrections.`);
  } catch (err) {
    await client.query("rollback");
    console.error("Failed, rolled back:", err.message);
    process.exitCode = 1;
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
