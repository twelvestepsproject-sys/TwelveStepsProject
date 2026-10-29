/**
 * Creates the EMETMATRIX site_settings row.
 *
 * The layout reads the site name and tagline from this table on every
 * request, so without the row every page is a 500 — the import brought
 * across posts and categories but nothing that describes the site itself.
 *
 * Both values are the ones the live site publishes in its feed channel,
 * not invented copy. Everything here is editable from /admin/branding
 * afterwards; this only stops the site erroring on an empty table.
 *
 * Idempotent: it updates the single row when one already exists.
 *
 *   node --env-file=.env.emet scripts/seed-emet-settings.mjs
 */
import pg from "pg";

const url = process.env.DATABASE_URL ?? "";
if (!/:5435\//.test(url)) {
  console.error(
    `refusing to run: DATABASE_URL is not the emet database (port 5435).\n  got: ${url}`,
  );
  process.exit(1);
}

// From the source site's RSS channel: <title> and <description>.
const SITE_NAME = "אמתטריקס";
const TAGLINE = "האמת מאחורי המטריקס";

// Written for search results, where the tagline alone is too short to be
// useful. Describes what the site contains; no claims about the author.
const SEO_DESCRIPTION =
  "שבעה עשר פרקים על מציאות, תפיסה ואמת — עיון בשאלות על העולם שאנחנו חושבים שאנחנו מכירים, דרך קבלה, מחשבה יהודית והמטריקס.";

// Sampled from the site's own dark identity rather than copied from the
// design reference, which belongs to a different organisation.
const THEME = {
  "color-bg": "#0b0d0c",
  "color-surface": "#121514",
  "color-surface-alt": "#1a1e1c",
  "color-border": "#2a302d",
  "color-ink": "#f4f6f5",
  "color-ink-muted": "#9aa5a0",
  "color-primary": "#34d399",
  "color-primary-hover": "#10b981",
  "color-primary-fg": "#06120d",
  "color-accent": "#d6c9a8",
  "color-accent-hover": "#c0b08a",
  "color-accent-fg": "#101312",
};

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const existing = await client.query(`select id from public.site_settings limit 1`);

  if (existing.rows.length) {
    await client.query(
      `update public.site_settings
          set site_name = $2, tagline = $3, seo_description = $4,
              theme = $5::jsonb, updated_at = now()
        where id = $1`,
      [existing.rows[0].id, SITE_NAME, TAGLINE, SEO_DESCRIPTION, JSON.stringify(THEME)],
    );
    console.log("site_settings updated");
  } else {
    await client.query(
      `insert into public.site_settings (site_name, tagline, seo_description, theme)
       values ($1, $2, $3, $4::jsonb)`,
      [SITE_NAME, TAGLINE, SEO_DESCRIPTION, JSON.stringify(THEME)],
    );
    console.log("site_settings created");
  }

  console.log(`  name    ${SITE_NAME}`);
  console.log(`  tagline ${TAGLINE}`);
  console.log(`  theme   ${Object.keys(THEME).length} tokens`);
} catch (err) {
  console.error(`failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
