/**
 * §8: "Slug auto-generated from the Hebrew title (stays Hebrew, no
 * transliteration), uniqueness-checked, editable." Shared by every admin
 * edit form that has a slug field.
 *
 * SIMPLIFICATION (flagged per task brief): §8 also describes "a warning +
 * auto-redirect offer when changing a published slug" — that depends on the
 * `redirects` admin screen, which is explicitly deferred this pass. Building
 * the auto-redirect offer now would mean writing to a `redirects` collection
 * with no screen to manage it. This module implements the uniqueness check +
 * free editability; the redirect-offer step is left for when Redirects
 * lands.
 */

/** Slugify a Hebrew (or mixed) title into the same slug shape
 * `lib/schemas/common.ts`'s `slugSchema` accepts: Hebrew letters/digits/
 * hyphens OR ascii lowercase/digits/hyphens, hyphen-joined, no
 * transliteration. Hebrew stays Hebrew. */
export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    // Keep Hebrew letters (U+0590–U+05FF), ascii letters/digits; replace
    // everything else (spaces, punctuation, quotes) with a hyphen.
    .replace(/[^a-z0-9֐-׿]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** True if `slug` is free among `existingSlugs`, optionally excluding the
 * row's own current id/slug pair when editing (pass the record's own slug in
 * `ignoreSlug` so a no-op save doesn't flag itself as a collision). */
export function isSlugUnique(
  slug: string,
  existingSlugs: string[],
  ignoreSlug?: string | null,
): boolean {
  return !existingSlugs.some((s) => s === slug && s !== ignoreSlug);
}

/** Given a desired slug and the set of slugs already in use, append -2, -3,
 * … until unique. Used when auto-generating from a title on create. */
export function uniqueSlug(desired: string, existingSlugs: string[]): string {
  if (isSlugUnique(desired, existingSlugs)) return desired;
  let n = 2;
  while (!isSlugUnique(`${desired}-${n}`, existingSlugs)) n += 1;
  return `${desired}-${n}`;
}
