/**
 * Removes a hardcoded /emet prefix from internal links in post bodies.
 *
 * The site now answers at the root of its domain, so an href written as
 * "/emet/chapters/chapter-1/article-2" 404s — the page lives at
 * "/chapters/chapter-1/article-2". These links were correct when the site
 * was served under /emet and were written by hand in the admin, which is
 * why no amount of EMET_BASE_PATH changes them: the prefix is in the
 * content, not in the code.
 *
 * This is what made "למעבר לתת פרק הבא" 404 after the root-URL switch.
 *
 * Only the four section roots the (emet) route group defines are touched,
 * and only directly after /emet:
 *
 *   /emet/chapters/...  ->  /chapters/...
 *   /emet/sources/...   ->  /sources/...
 *   /emet/en/...        ->  /en/...
 *   /emet/search...     ->  /search...
 *   /emet  or  /emet/   ->  /
 *
 * Anything else beginning with /emet is left alone and reported, rather
 * than stripped on the assumption that it must be internal. A path this
 * script does not recognise is more likely a mistake worth a human's
 * attention than one worth guessing at.
 *
 * Absolute URLs are not touched either. A link to
 * https://emetmatrix.com/emet/... points at whatever that domain serves,
 * which is not this script's business; lib/emet/rewrite-absolute.ts
 * handles those at render time.
 *
 *   node scripts/emet-strip-basepath-links.mjs            # report only
 *   node scripts/emet-strip-basepath-links.mjs --write    # apply
 *
 * Safe to re-run: a body with no /emet links is left untouched.
 */
import pg from "pg";

const WRITE = process.argv.includes("--write");
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

/** The sections that exist at the root. Anything else stays as it is. */
const SECTIONS = ["chapters", "sources", "en", "search"];

/**
 * Rewrites the href values in one body.
 *
 * Matching is anchored on `href="/emet` so only link targets are changed —
 * the same string in visible text is someone writing about a URL, and
 * rewriting that would edit the prose. Both quote styles are handled
 * because the admin's editor emits either.
 */
function stripPrefix(body) {
  const unknown = [];
  let count = 0;

  const next = body.replace(
    /href=(["'])\/emet(\/[^"']*|)\1/g,
    (match, quote, rest) => {
      // Bare /emet or /emet/ is the home page.
      if (rest === "" || rest === "/") {
        count++;
        return `href=${quote}/${quote}`;
      }
      const section = rest.replace(/^\//, "").split(/[/?#]/)[0];
      if (!SECTIONS.includes(section)) {
        unknown.push(`/emet${rest}`);
        return match;
      }
      count++;
      return `href=${quote}${rest}${quote}`;
    },
  );

  return { next, count, unknown };
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows } = await client.query(
    `select id, slug, body
       from public.posts
      where body like '%/emet%'
      order by slug`,
  );

  let changedPosts = 0;
  let changedLinks = 0;
  const allUnknown = [];

  for (const row of rows) {
    const { next, count, unknown } = stripPrefix(row.body);
    for (const u of unknown) allUnknown.push(`${row.slug}: ${u}`);

    if (next === row.body) continue;

    console.log(`  ${row.slug}: ${count} link(s)`);

    if (WRITE) {
      await client.query(
        `update public.posts set body = $2, updated_at = now() where id = $1`,
        [row.id, next],
      );
    }
    changedPosts++;
    changedLinks += count;
  }

  console.log(
    `\n${changedLinks} link(s) in ${changedPosts} post(s) ` +
      `${WRITE ? "rewritten" : "would be rewritten"}.`,
  );
  if (!WRITE && changedPosts > 0) console.log("Re-run with --write to apply.");

  if (allUnknown.length) {
    console.log("\nLeft alone - /emet path with an unrecognised section:");
    for (const u of allUnknown) console.log(`  ${u}`);
    console.log("Check these by hand; the script will not guess at them.");
  }
} catch (err) {
  console.error(`failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
