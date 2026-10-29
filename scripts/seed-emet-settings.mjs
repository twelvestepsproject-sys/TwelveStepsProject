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

// Matches what the pages actually render: a light site, with the dark
// treatment reserved for the hero over the code-rain photograph.
//
// These were the dark values the first pass set, and they stayed behind
// when the design went light — the pages looked right only because they
// carry their colours directly, so any component reading the tokens
// would have come back with near-black on a white page.
//
// emerald-700 rather than the lighter 400: the brighter green was picked
// to carry on near-black and has too little contrast against white.
const THEME = {
  "color-bg": "#ffffff",
  "color-surface": "#ffffff",
  "color-surface-alt": "#f7f7f7",
  "color-border": "#e5e5e5",
  "color-ink": "#1a1a1a",
  "color-ink-muted": "#6b6b6b",
  "color-primary": "#047857",
  "color-primary-hover": "#065f46",
  "color-primary-fg": "#ffffff",
  "color-accent": "#8a7a5c",
  "color-accent-hover": "#6f6249",
  "color-accent-fg": "#ffffff",
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
