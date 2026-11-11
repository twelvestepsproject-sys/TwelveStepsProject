/**
 * Folds a reading-list block's language editions into one card.
 *
 * The library page was built one block per book, with each translation as
 * its own item — six items for a title in six languages, of which only the
 * first carried a cover and a description and the other five were a bare
 * name and a "לרכישה" link. Thirty-five cards for seven books, and a page
 * the reader had to scroll past to find anything.
 *
 * This keeps the first item of each block (its cover and description are
 * the book's) and moves every item's link into that item's purchase_links,
 * labelled by language. The language is the part after the last "|" in the
 * title — the convention the titles already follow ("… | English") — and
 * falls back to the whole title when there is no separator, which is the
 * case for the Hebrew edition that leads each block.
 *
 * Grouping is by host: bookpod.co.il ships inside Israel, amazon anywhere
 * else. Anything unrecognised is left in the Israel row rather than
 * guessed at, since that row is plain chips and a wrong label there is
 * visible rather than misleading.
 *
 * Blocks whose items are not editions of one book — the "מארזים" bundle
 * block, where each item is a different product — are left alone. The test
 * is whether the items share a cover: editions of one book have exactly
 * one cover between them.
 *
 *   node scripts/merge-reading-list-editions.mjs            # report only
 *   node scripts/merge-reading-list-editions.mjs --write    # apply
 */
import pg from "pg";

const WRITE = process.argv.includes("--write");
const url = process.env.DATABASE_URL ?? "";

if (!url) {
  console.error("refusing to run: DATABASE_URL is not set.");
  process.exit(1);
}

// This rewrites page content, so it must never be pointed at a database by
// accident. The name is the check: the hineni site is "twelvesteps", and
// the other stacks on this machine answer to their own names.
const parsed = new URL(url);
const dbName = parsed.pathname.replace(/^\//, "");
const EXPECTED = process.env.EXPECT_DB ?? "twelvesteps";
if (dbName !== EXPECTED) {
  console.error(
    `refusing to run: DATABASE_URL names database "${dbName}", expected "${EXPECTED}".\n` +
      `Set EXPECT_DB if this is deliberate.`,
  );
  process.exit(1);
}

/**
 * The language a title declares after its last "|".
 *
 * The translations name their language there ("… | English"); the Hebrew
 * edition that leads each block does not, because its "|" separates the
 * title from its subtitle. So a tail that is not one of the languages the
 * series is published in is read as a subtitle, and the edition is Hebrew.
 */
const LANGUAGES = new Set([
  "English",
  "Français",
  "Español",
  "Русский",
  "ייִדיש",
  "יידיש",
  "עברית",
  "Deutsch",
  "Italiano",
  "Português",
]);

function languageOf(title) {
  const i = title.lastIndexOf("|");
  if (i === -1) return "עברית";
  const tail = title.slice(i + 1).trim();
  return LANGUAGES.has(tail) ? tail : "עברית";
}

/** Where a link ships from, by host. */
function groupOf(href) {
  let host;
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    return "israel";
  }
  return host.includes("amazon.") ? "world" : "israel";
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows } = await client.query(
    `select pb.id, pb.sort_order, pb.data
       from public.page_blocks pb
       join public.pages p on p.id = pb.page_id
      where pb.block_type = 'reading_list'
      order by p.slug, pb.sort_order`,
  );

  let merged = 0;
  let skipped = 0;

  for (const row of rows) {
    const data = row.data;
    const items = Array.isArray(data.items) ? data.items : [];

    if (items.length < 2) {
      skipped++;
      continue;
    }

    // Already merged on an earlier run.
    if (items.some((it) => Array.isArray(it.purchase_links) && it.purchase_links.length)) {
      console.log(`  skip  block ${row.sort_order}: already has editions`);
      skipped++;
      continue;
    }

    // Several covers means several products, not one book's editions.
    const covers = items.filter((it) => it.cover_media_id).length;
    if (covers !== 1) {
      console.log(
        `  skip  block ${row.sort_order}: ${covers} covers across ${items.length} items — not one book`,
      );
      skipped++;
      continue;
    }

    const lead = items.find((it) => it.cover_media_id) ?? items[0];
    const purchase = items
      .filter((it) => it.link?.href)
      .map((it) => ({
        label: languageOf(it.title),
        href: it.link.href,
        group: groupOf(it.link.href),
      }));

    if (purchase.length === 0) {
      skipped++;
      continue;
    }

    const next = {
      ...data,
      items: [
        {
          title: lead.title,
          cover_media_id: lead.cover_media_id ?? null,
          description: lead.description ?? null,
          // The whole-card link is dropped: the chips are the destinations
          // now, and a card cannot be both.
          link: null,
          purchase_links: purchase,
        },
      ],
    };

    console.log(
      `  merge block ${row.sort_order}: ${items.length} items -> 1 card, ` +
        `${purchase.length} editions (${purchase.map((p) => p.label).join(", ")})`,
    );

    if (WRITE) {
      await client.query(`update public.page_blocks set data = $2 where id = $1`, [
        row.id,
        next,
      ]);
    }
    merged++;
  }

  console.log(
    `\n${merged} block(s) ${WRITE ? "merged" : "would be merged"}, ${skipped} left alone.`,
  );
  if (!WRITE && merged > 0) {
    console.log("Re-run with --write to apply.");
  }
} catch (err) {
  console.error(`failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
