/**
 * Imports emetmatrix.com into the EMETMATRIX database.
 *
 * Source is .content-emet/inventory.json, crawled from the site's RSS feed.
 * That file is gitignored on purpose: it holds every article body in full,
 * including the quoted film dialogue, and git history cannot be edited
 * after the fact. The database is the working copy; re-crawl to rebuild.
 * The feed is the only structured export the site offers — there is no WP
 * REST API and no sitemap — but it carries full `content:encoded` bodies
 * and the legacy `?p=<id>` identifiers the redirect map needs, which makes
 * it a better source than scraping rendered HTML.
 *
 * Idempotent: every record is keyed on its legacy WordPress id, held in
 * the slug, so a re-run updates in place rather than duplicating. Safe to
 * run repeatedly as the inventory is re-crawled.
 *
 * What this deliberately does NOT do:
 *  - invent content. Bodies are imported verbatim; posts whose body is
 *    effectively empty are recorded in the report, not filled in.
 *  - resolve the {mosimage} artifacts. Those are Joomla-era markers left
 *    from a migration that predates WordPress, pointing at image files by
 *    bare relative name. They are counted and reported for manual review.
 *  - translate anything. English and Hebrew posts are separate records
 *    with no translation link, because no genuine counterparts exist.
 *
 * Guarded on port 5435: this writes content tables and the other two
 * sites' databases are a digit away on 5432 and 5433.
 *
 *   node --env-file=.env.emet scripts/import-emet.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "";
if (!/:5435\//.test(url)) {
  console.error(
    `refusing to run: DATABASE_URL is not the emet database (port 5435).\n  got: ${url}`,
  );
  process.exit(1);
}

const inventory = JSON.parse(readFileSync(".content-emet/inventory.json", "utf8"));

/** Decodes the numeric and named entities WordPress leaves in feed titles. */
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function plainText(htmlStr) {
  return decodeEntities(htmlStr.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Slugs are the legacy id: stable, unique, and the redirect key. */
const slugFor = (post, prefix) => `${prefix}-${post.id}`;

/** The Matrix dialogue transcripts. These are quoted source material the
 *  Hebrew chapters discuss, not the author's own writing, so they are
 *  imported for reference but kept out of the index — see the report. */
const SPEAKERS = [
  "Neo", "Trinity", "Morpheus", "Cypher", "Agent Smith", "Smith",
  "Tank", "Oracle", "Mouse", "Apoc", "Switch", "Dozer",
];
function isTranscript(post) {
  const text = plainText(post.body);
  const named = SPEAKERS.filter((s) =>
    new RegExp(`${s}\\s*[:“"]`).test(text),
  ).length;
  const lines = (text.match(/[A-Za-z]+\s*:\s*[“"]/g) ?? []).length;
  return named >= 3 || lines >= 8;
}

/** Reads the chapter number out of a Hebrew category name.
 *
 *  Chapters are titled "פרק ג' | …", numbered with Hebrew letters rather
 *  than digits, and the gershayim in the teens ("י״ב") is written
 *  inconsistently across the source. Matching letter by letter from the
 *  start of the name handles both forms and is what makes
 *  /chapters/chapter-12 land on chapter יב.
 */
const HEBREW_NUMERALS = {
  "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5,
  "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10,
  "כ": 20, "ל": 30,
};
function hebrewChapterNumber(categoryName) {
  // "פרק ג' | …" or "פרק-ז' | …" — take what sits between פרק and the
  // separator, then add up its numeral letters.
  const m = /^פרק[\s–-]*([א-ת׳״'"’”]+)/.exec(
    categoryName,
  );
  if (!m) return null;
  let total = 0;
  for (const ch of m[1]) {
    const v = HEBREW_NUMERALS[ch];
    if (v) total += v;
  }
  return total > 0 && total <= 40 ? total : null;
}

/** Last-resort slug for a chapter whose number cannot be read. Latin
 *  characters only, so the URL never becomes percent-encoded Hebrew. */
function slugifyHebrew(name) {
  return (
    decodeEntities(name)
      .replace(/[^א-ת0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "untitled"
  );
}

const isEnglish = (p) => p.categories.includes("English");
const chapterCategory = (p) =>
  p.categories.find((c) => c.startsWith("פרק")) ?? null;

// ~200 words a minute for Hebrew prose, never less than a minute.
const readingTime = (body) =>
  Math.max(1, Math.round(plainText(body).split(/\s+/).length / 200));

const client = new pg.Client({ connectionString: url });
await client.connect();

const report = {
  chapters: 0, subchapters: 0, sources: 0, english: 0, transcripts: 0,
  emptyBodies: [], mosimage: [], bareImageRefs: [], redirects: 0,
  unnumberedChapters: [],
};

async function upsertCategory(slug, name, description) {
  const existing = await client.query(
    `select id from public.categories where slug = $1`, [slug],
  );
  if (existing.rows.length) {
    await client.query(
      `update public.categories set name = $2, description = $3, updated_at = now()
        where id = $1`,
      [existing.rows[0].id, name, description],
    );
    return existing.rows[0].id;
  }
  const { rows } = await client.query(
    `insert into public.categories (slug, name, description)
     values ($1, $2, $3) returning id`,
    [slug, name, description],
  );
  return rows[0].id;
}

async function upsertPost(post, { slug, title, categoryId, noindex, seoDescription }) {
  const body = post.body;
  const text = plainText(body);
  if (text.length < 120) report.emptyBodies.push(`${post.id} "${title}"`);
  if (post.mosimage) report.mosimage.push(`${post.id} (×${post.mosimage})`);
  if (post.imgs === 0 && post.bare_refs) report.bareImageRefs.push(String(post.id));

  // published_at from the feed's RFC-822 pubDate; invalid dates become null
  // rather than today, so a bad value never masquerades as a fresh post.
  const parsed = post.date ? new Date(post.date) : null;
  const publishedAt = parsed && !Number.isNaN(parsed.valueOf()) ? parsed.toISOString() : null;

  const excerpt = text.slice(0, 200);
  const existing = await client.query(`select id from public.posts where slug = $1`, [slug]);
  const values = [
    slug, title, excerpt, body, categoryId, publishedAt,
    readingTime(body), noindex, seoDescription,
  ];

  if (existing.rows.length) {
    await client.query(
      `update public.posts
          set title = $2, excerpt = $3, body = $4, category_id = $5,
              published_at = $6, reading_time = $7, seo_noindex = $8,
              seo_description = $9, status = 'published', updated_at = now()
        where id = $1`,
      [existing.rows[0].id, ...values.slice(1)],
    );
    return existing.rows[0].id;
  }
  const { rows } = await client.query(
    `insert into public.posts
       (slug, title, excerpt, body, category_id, published_at, reading_time,
        seo_noindex, seo_description, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published')
     returning id`,
    values,
  );
  return rows[0].id;
}

async function addRedirect(fromPath, toPath) {
  const existing = await client.query(
    `select id from public.redirects where from_path = $1`, [fromPath],
  );
  if (existing.rows.length) {
    await client.query(
      `update public.redirects set to_path = $2, updated_at = now() where id = $1`,
      [existing.rows[0].id, toPath],
    );
  } else {
    await client.query(
      `insert into public.redirects (from_path, to_path, status_code)
       values ($1, $2, 301)`,
      [fromPath, toPath],
    );
  }
  report.redirects++;
}

try {
  await client.query("begin");

  const posts = Object.values(inventory);

  // --- categories: the 17 chapters, sources, and the English archive ---
  const chapterNames = [...new Set(posts.map(chapterCategory).filter(Boolean))];
  const categoryIds = new Map();
  for (const name of chapterNames) {
    // The slug carries the real chapter number read off the Hebrew
    // numeral: "פרק ג' | מהות עולם ההעלם" -> chapter-3. Deriving it from
    // the crawl order or the title's length would look similar and be
    // wrong twice over — the feed does not return chapters in order, and
    // a title edited in the admin would silently change the URL and break
    // every redirect pointing at it.
    const number = hebrewChapterNumber(name);
    const slug = number ? `chapter-${number}` : `chapter-x-${slugifyHebrew(name)}`;
    if (!number) report.unnumberedChapters.push(decodeEntities(name));
    const id = await upsertCategory(slug, decodeEntities(name), null);
    categoryIds.set(name, id);
  }
  const sourcesId = await upsertCategory("sources", "מקורות", null);
  const englishId = await upsertCategory("english", "English", null);

  // --- the posts themselves ---
  const seenBodies = new Set();
  for (const post of posts) {
    const title = decodeEntities(post.title).trim();
    const english = isEnglish(post);
    const chapter = chapterCategory(post);

    // One duplicate pair exists in the feed (identical body, two ids).
    // Keep the first and redirect the second to it.
    const fingerprint = `${title}::${post.chars}`;
    if (seenBodies.has(fingerprint) && post.chars > 200) {
      await addRedirect(`/?p=${post.id}`, `/en/${slugFor({ id: post.id }, "en")}`);
      continue;
    }
    seenBodies.add(fingerprint);

    let slug, categoryId, noindex = false, route;

    if (english) {
      const transcript = isTranscript(post);
      if (transcript) {
        report.transcripts++;
        // Quoted film dialogue, not original writing: kept for reference
        // but excluded from the index and the sitemap.
        noindex = true;
      }
      report.english++;
      slug = slugFor(post, "en");
      categoryId = englishId;
      route = `/en/articles/${slug}`;
    } else if (chapter) {
      const isMain = title.startsWith("פרק");
      if (isMain) report.chapters++;
      else report.subchapters++;
      slug = slugFor(post, isMain ? "chapter" : "article");
      categoryId = categoryIds.get(chapter);
      route = `/chapters/${slug}`;
    } else {
      report.sources++;
      slug = slugFor(post, "source");
      categoryId = sourcesId;
      route = `/sources/${slug}`;
    }

    await upsertPost(post, {
      slug, title, categoryId, noindex,
      seoDescription: plainText(post.body).slice(0, 155) || null,
    });

    // Legacy WordPress URL -> new canonical route.
    await addRedirect(`/?p=${post.id}`, route);
  }

  await client.query("commit");
} catch (err) {
  await client.query("rollback");
  console.error(`\nimport failed, rolled back: ${err.message}`);
  await client.end();
  process.exit(1);
}

const counts = await client.query(
  `select
     (select count(*) from public.posts) as posts,
     (select count(*) from public.posts where seo_noindex) as noindexed,
     (select count(*) from public.categories) as categories,
     (select count(*) from public.redirects) as redirects`,
);
await client.end();

const c = counts.rows[0];
console.log("=== IMPORT REPORT ===");
console.log(`  chapters          ${report.chapters}`);
console.log(`  subchapters       ${report.subchapters}`);
console.log(`  sources           ${report.sources}`);
console.log(`  english           ${report.english}  (${report.transcripts} transcripts, noindexed)`);
console.log(`  redirects         ${report.redirects}`);
console.log("");
console.log(`  posts in db       ${c.posts}`);
console.log(`  categories in db  ${c.categories}`);
console.log(`  noindexed in db   ${c.noindexed}`);
console.log("");
console.log("=== NEEDS REVIEW ===");
console.log(`  near-empty bodies     ${report.emptyBodies.length}`);
if (report.emptyBodies.length) console.log(`     ${report.emptyBodies.slice(0, 6).join(", ")}`);
console.log(`  {mosimage} markers    ${report.mosimage.length} posts`);
console.log(`  bare image refs       ${report.bareImageRefs.length} posts`);
console.log("");
console.log("  Those two are Joomla-era artifacts: images referenced by bare");
console.log("  filename with no path. The text is intact; the pictures are not");
console.log("  in the feed and may no longer exist on the old server.");
