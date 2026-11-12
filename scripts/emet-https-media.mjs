/**
 * Upgrades embedded media URLs from http:// to https:// in post bodies.
 *
 * The site is served over https, so a browser refuses to load a video,
 * image or script fetched over plain http on the same page — mixed content
 * is blocked outright, with nothing shown and only a console warning. The
 * imported WordPress content carries http:// URLs throughout.
 *
 * Eight hosts appear on http across 311 references. Only two are rewritten:
 *
 *   www.youtube.com   254 refs — embedded <iframe> players
 *   sham.shidur.net    46 refs — embedded <video>, valid *.shidur.net cert
 *
 * The other six are left alone, and that is the point of this script
 * rather than a global search-and-replace. Every one of them is an
 * outbound <a href> — a link in body text, not a subresource:
 *
 *   www.hidabroot.org, www.fileflyer.com, www.shamayim.info,
 *   shamayim.info, ashira.co.il, www.mami.fm
 *
 * A browser blocks mixed *subresources* (video, iframe, image, script) and
 * does not block *navigation* to http, so these links work as they are.
 * Three of them serve no https at all, so rewriting would replace a
 * working link with a broken one.
 *
 *   node scripts/emet-https-media.mjs            # report only
 *   node scripts/emet-https-media.mjs --write    # apply
 */
import pg from "pg";

const WRITE = process.argv.includes("--write");
const url = process.env.DATABASE_URL ?? "";

if (!url) {
  console.error("refusing to run: DATABASE_URL is not set.");
  process.exit(1);
}

// This rewrites content, so it must never be pointed at the wrong database
// by accident. The name is the check: the emet site is "emet", and the
// other stacks on this host answer to their own names.
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

/**
 * Hosts confirmed to serve https AND to appear as embedded media. Both
 * conditions are checked by hand before a host is listed: upgrading one
 * that does not answer on 443 replaces a blocked resource with a broken
 * one, and upgrading a plain link changes something the browser was never
 * going to block.
 */
const HOSTS = ["sham.shidur.net", "www.youtube.com"];

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows } = await client.query(
    `select id, slug, body
       from public.posts
      where ${HOSTS.map((_, i) => `body like $${i + 1}`).join(" or ")}
      order by slug`,
    HOSTS.map((h) => `%http://${h}%`),
  );

  let changed = 0;
  let total = 0;

  for (const row of rows) {
    let next = row.body;
    const counts = [];

    for (const host of HOSTS) {
      // Split/join rather than a regex: the host contains dots, and a
      // string replace of a literal cannot misfire on a neighbouring URL.
      const needle = `http://${host}`;
      const hits = next.split(needle).length - 1;
      if (hits > 0) {
        next = next.split(needle).join(`https://${host}`);
        counts.push(`${host} x${hits}`);
        total += hits;
      }
    }

    if (next === row.body) continue;

    console.log(`  ${row.slug}: ${counts.join(", ")}`);

    if (WRITE) {
      await client.query(`update public.posts set body = $2, updated_at = now() where id = $1`, [
        row.id,
        next,
      ]);
    }
    changed++;
  }

  console.log(
    `\n${total} URL(s) in ${changed} post(s) ${WRITE ? "upgraded" : "would be upgraded"}.`,
  );
  if (!WRITE && changed > 0) console.log("Re-run with --write to apply.");

  // Report what is left on http, so a host that should have been in the
  // list above is visible rather than silently skipped.
  //
  // regexp_matches with 'g' rather than substring(): substring returns only
  // the FIRST match per row, so a post embedding youtube and linking
  // elsewhere reported youtube alone and hid the rest. Three hosts stayed
  // invisible that way until the rewrite removed the ones masking them.
  const { rows: left } = await client.query(
    `select m[1] as host, count(*) as count
       from public.posts,
            lateral regexp_matches(body, 'http://([a-zA-Z0-9._-]+)', 'g') as m
      group by m[1]
      order by count(*) desc`,
  );
  const remaining = left.filter((r) => r.host && !HOSTS.includes(r.host));
  if (remaining.length) {
    console.log("\nStill on http (not in the verified list):");
    for (const r of remaining) console.log(`  ${r.host}  x${r.count}`);
  }
} catch (err) {
  console.error(`failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
