/**
 * The languages this site publishes in.
 *
 * What this is for
 * ----------------
 * The client asked for French, Spanish and Russian "like the English",
 * and then asked for infrastructure he can extend himself — adding a
 * language, and translating into it, without a developer.
 *
 * So a language is not hardcoded as a route. A language is a CATEGORY
 * whose slug is one of the codes below. The client creates the category
 * in the admin, files posts under it, and the language appears on the
 * site: its own index page, its own article pages, and an entry in the
 * switcher. No deploy, no migration, no code change.
 *
 * The one thing that cannot come from the database is how a language
 * should be TYPESET — its text direction, its `lang` attribute, and the
 * name to show a reader who does not read the current language. Those are
 * properties of the language itself, not editorial choices, so they live
 * here. Adding a language the table below does not know is still
 * possible: it falls back to LTR with its category name, which is right
 * for most of the world's languages and wrong only for the handful that
 * run right to left.
 *
 * Hebrew is deliberately absent as a "language section". It is the site's
 * primary language — it is the chapters, not a translation of them — and
 * it lives at the root rather than under a code. The switcher lists it
 * first by pointing at the root.
 *
 * Why not a `languages` table
 * ---------------------------
 * It would need a migration, an admin screen to manage it, and the client
 * would then have to create a category AND a language row and keep them
 * in step. Deriving the language from the category he already has to
 * create removes a step rather than adding one. If a language ever needs
 * per-language settings beyond typesetting — its own tagline, its own
 * footer — that is the point to add the table, and `description` on the
 * category covers the first of those already.
 */

/** How a language is written. Everything that is not editorial. */
export interface LanguageMeta {
  /** The `lang` attribute: a BCP 47 tag, not the category slug. */
  code: string;
  /** Text direction. The reason this file cannot be pure data from the DB. */
  dir: "ltr" | "rtl";
  /** The language's name in itself, which is what a switcher should show. */
  endonym: string;
}

/**
 * Known languages, keyed by the category slug that carries them.
 *
 * Keyed by slug rather than by code because the slug is what an editor
 * types into the admin, and `english` already exists as a category with
 * 146 posts under it. Renaming that category to `en` to satisfy a tidier
 * key would break every URL under /en/articles and every redirect
 * pointing at one.
 */
export const LANGUAGES: Record<string, LanguageMeta> = {
  english: { code: "en", dir: "ltr", endonym: "English" },
  french: { code: "fr", dir: "ltr", endonym: "Français" },
  spanish: { code: "es", dir: "ltr", endonym: "Español" },
  russian: { code: "ru", dir: "ltr", endonym: "Русский" },
  // Room for more. A language absent from this map still works — see
  // `languageMetaFor` — it just gets LTR and its category name.
  arabic: { code: "ar", dir: "rtl", endonym: "العربية" },
  portuguese: { code: "pt", dir: "ltr", endonym: "Português" },
  german: { code: "de", dir: "ltr", endonym: "Deutsch" },
};

/**
 * The URL segment a language's pages live under.
 *
 * `english` keeps `/en`, which is where its 146 posts already are and
 * where 3 redirects point. Every other language uses its code, so French
 * is `/fr` — which is what the client asked for and what a reader
 * expects.
 */
export function languageSegment(categorySlug: string): string {
  return LANGUAGES[categorySlug.toLowerCase()]?.code ?? categorySlug.toLowerCase();
}

/**
 * Typesetting metadata for a language category, falling back sensibly for
 * one this file has never heard of.
 *
 * The fallback is the point: the client can create a category for a
 * language nobody anticipated and get a working section, rather than a
 * crash or a blank page. LTR is right for the large majority of
 * languages; a new RTL language needs a line added here, which is the
 * one case that genuinely needs a developer.
 */
export function languageMetaFor(categorySlug: string, categoryName?: string): LanguageMeta {
  const known = LANGUAGES[categorySlug.toLowerCase()];
  if (known) return known;
  return {
    code: categorySlug.toLowerCase(),
    dir: "ltr",
    endonym: categoryName?.trim() || categorySlug,
  };
}

/**
 * Picks the language categories out of the full category list.
 *
 * A category is a language section when this file knows its slug as a
 * language. That is deliberately stricter than "not a chapter": it keeps
 * `sources` — which is Hebrew source material, not a translation — out of
 * the language switcher, and it means a mistyped category slug shows up
 * as a missing language rather than as a mysterious new one.
 */
export function languageCategoriesOf<T extends { slug: string }>(categories: T[]): T[] {
  return categories
    .filter((c) => Boolean(LANGUAGES[c.slug.toLowerCase()]))
    .sort((a, b) => {
      // English first — it is the established section with the content in
      // it — then the rest alphabetically by their own name, so the order
      // does not shuffle as languages are added.
      if (a.slug.toLowerCase() === "english") return -1;
      if (b.slug.toLowerCase() === "english") return 1;
      return languageMetaFor(a.slug).endonym.localeCompare(
        languageMetaFor(b.slug).endonym,
      );
    });
}

/** Resolves a URL segment (`fr`) back to its category slug (`french`). */
export function categorySlugForSegment(segment: string): string | null {
  const wanted = segment.toLowerCase();
  for (const [slug, meta] of Object.entries(LANGUAGES)) {
    if (meta.code === wanted || slug === wanted) return slug;
  }
  return null;
}
