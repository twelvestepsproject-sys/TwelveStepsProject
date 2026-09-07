/**
 * Seeds the Tamar Reiss site (tamarreiss.com) with its existing content.
 *
 * The content itself lives in scripts/tamar-content.json and scripts/
 * tamar-articles.json, scanned off the live site on 2026-09-06. Every string
 * there is verbatim; fields the old site had no equivalent for are null
 * rather than filled with invented copy.
 *
 * Nothing here is destructive beyond the rows it owns: pages and posts are
 * matched by slug and rebuilt, so re-running is safe and picks up edits to
 * the JSON. Content the editor adds later under different slugs is untouched.
 *
 * The guard on port 5433 matters — this script deletes rows, and the הנני
 * database is one digit away on 5432.
 *
 *   node --env-file=.env.tamar scripts/seed-tamar.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "";
if (!/:5433\//.test(url)) {
  console.error(
    `refusing to run: DATABASE_URL is not the tamar database (port 5433).\n  got: ${url}`,
  );
  process.exit(1);
}

const content = JSON.parse(readFileSync("scripts/tamar-content.json", "utf8"));
const articles = JSON.parse(readFileSync("scripts/tamar-articles.json", "utf8"));

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query("begin");

  for (const page of content.pages) {
    // Deleting the page cascades to its blocks, so a re-run cannot leave
    // orphaned or duplicated blocks behind.
    await client.query(`delete from public.pages where slug = $1`, [page.slug]);
    const { rows } = await client.query(
      `insert into public.pages (slug, title, status, published_at, seo_description)
       values ($1, $2, 'published', now(), $3)
       returning id`,
      [page.slug, page.title, page.seo_description],
    );
    const pageId = rows[0].id;

    for (const [i, [blockType, data]] of page.blocks.entries()) {
      await client.query(
        `insert into public.page_blocks (page_id, block_type, sort_order, data)
         values ($1, $2, $3, $4)`,
        [pageId, blockType, i, JSON.stringify(data)],
      );
    }
    console.log(`page   ${page.slug.padEnd(12)} ${page.blocks.length} blocks`);
  }

  // The header menu drives site navigation; the location is unique, so this
  // updates the existing row rather than creating a second header.
  const menu = await client.query(
    `insert into public.menus (location) values ('header')
     on conflict (location) do update set updated_at = now()
     returning id`,
  );
  const menuId = menu.rows[0].id;
  await client.query(`delete from public.menu_items where menu_id = $1`, [menuId]);
  for (const [i, [label, href]] of content.nav.entries()) {
    await client.query(
      `insert into public.menu_items (menu_id, label, href, sort_order)
       values ($1, $2, $3, $4)`,
      [menuId, label, href, i],
    );
  }
  console.log(`menu   header       ${content.nav.length} items`);

  let posts = 0;
  for (const [sourceSlug, slug] of Object.entries(content.articles)) {
    const article = articles[sourceSlug];
    if (!article) {
      console.warn(`  ! no scanned article for ${sourceSlug} — skipped`);
      continue;
    }
    const body = article.body_clean ?? article.body;
    const excerpt = body
      .split("\n")
      .filter(Boolean)
      .slice(0, 2)
      .join(" ")
      .slice(0, 200);
    // Roughly 200 Hebrew words a minute, never less than a minute.
    const readingTime = Math.max(1, Math.round(body.split(/\s+/).length / 200));

    await client.query(`delete from public.posts where slug = $1`, [slug]);
    await client.query(
      `insert into public.posts
         (slug, title, excerpt, body, status, published_at, reading_time)
       values ($1, $2, $3, $4, 'published', now(), $5)`,
      [slug, article.title, excerpt, body, readingTime],
    );
    posts++;
  }
  console.log(`posts               ${posts} articles`);

  await client.query("commit");
  console.log("\nseed complete.");
} catch (err) {
  await client.query("rollback");
  console.error(`\nseed failed, rolled back: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
