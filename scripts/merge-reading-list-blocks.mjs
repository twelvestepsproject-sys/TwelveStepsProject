/**
 * Folds consecutive single-card reading-list blocks into one block.
 *
 * Each book on the library page was authored as its own block, which was
 * fine when a block was a vertical list. Now that cards lay out two per
 * row, a block holding one card still renders as its own full-width
 * section, so four books make four stacked rows instead of a 2x2 grid —
 * blocks are siblings on the page and no grid reaches across them.
 *
 * The books after the first carry a zero-width space as their heading,
 * which is the authoring tell that they were never meant to read as
 * separate sections: they are continuations of the one above. So a run is
 * joined into the block that starts it, and the headingless blocks are
 * removed.
 *
 * Only blocks that already hold exactly one card are touched, and only
 * where that card has editions — the bundle block and the 8-card block are
 * real sections with their own headings and are left alone.
 *
 *   node scripts/merge-reading-list-blocks.mjs            # report only
 *   node scripts/merge-reading-list-blocks.mjs --write    # apply
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
const EXPECTED = process.env.EXPECT_DB ?? "twelvesteps";
if (dbName !== EXPECTED) {
  console.error(
    `refusing to run: DATABASE_URL names database "${dbName}", expected "${EXPECTED}".`,
  );
  process.exit(1);
}

/** A heading that is blank, or only the zero-width space used as a spacer. */
function isBlankHeading(h) {
  return !h || h.replace(/[​\s]/g, "") === "";
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows: pages } = await client.query(
    `select distinct p.id, p.slug
       from public.pages p
       join public.page_blocks pb on pb.page_id = p.id
      where pb.block_type = 'reading_list'`,
  );

  let joined = 0;

  for (const page of pages) {
    const { rows: blocks } = await client.query(
      `select id, sort_order, block_type, data
         from public.page_blocks
        where page_id = $1
        order by sort_order`,
      [page.id],
    );

    // A block is foldable when it is a reading list holding exactly one
    // card that has editions of its own.
    const foldable = (b) =>
      b.block_type === "reading_list" &&
      Array.isArray(b.data.items) &&
      b.data.items.length === 1 &&
      Array.isArray(b.data.items[0].purchase_links) &&
      b.data.items[0].purchase_links.length > 0;

    let i = 0;
    while (i < blocks.length) {
      if (!foldable(blocks[i])) {
        i++;
        continue;
      }

      // Walk forward over the run: the blocks that follow and carry no
      // heading of their own belong to this one.
      let end = i + 1;
      while (end < blocks.length && foldable(blocks[end]) && isBlankHeading(blocks[end].data.heading)) {
        end++;
      }

      if (end - i < 2) {
        i = end;
        continue;
      }

      const head = blocks[i];
      const run = blocks.slice(i, end);
      const items = run.flatMap((b) => b.data.items);

      console.log(
        `  ${page.slug}: blocks ${run.map((b) => b.sort_order).join(", ")} -> 1 block with ${items.length} cards`,
      );
      for (const it of items) console.log(`      • ${it.title}`);

      if (WRITE) {
        await client.query(`update public.page_blocks set data = $2 where id = $1`, [
          head.id,
          { ...head.data, items },
        ]);
        await client.query(`delete from public.page_blocks where id = any($1::uuid[])`, [
          run.slice(1).map((b) => b.id),
        ]);
      }
      joined++;
      i = end;
    }
  }

  console.log(`\n${joined} run(s) ${WRITE ? "joined" : "would be joined"}.`);
  if (!WRITE && joined > 0) console.log("Re-run with --write to apply.");
} catch (err) {
  console.error(`failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
