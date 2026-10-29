import { sanitizeArticleHtml } from "@/lib/emet/sanitize-html";

/**
 * Renders a migrated article body.
 *
 * The content arrives as the HTML WordPress stored, which is why this
 * renders markup rather than plain text: dropping the tags would lose the
 * paragraph breaks, headings and blockquotes the articles are built from,
 * and the brief is explicit that migrated text must not be reshaped.
 *
 * It is passed through `sanitizeArticleHtml` first. The source is a site
 * nobody here controls and the bodies predate it — treating them as
 * trusted markup would mean any script left in twenty years of imports
 * executes on this domain.
 *
 * Typography is set here rather than per page so every article — chapter,
 * subchapter, source, English — reads the same. The measure is capped at
 * ~70 characters, which is where Hebrew prose stays comfortable over the
 * long articles this site is made of.
 */
export function ArticleBody({ html, lang }: { html: string; lang?: "he" | "en" }) {
  const clean = sanitizeArticleHtml(html);
  const english = lang === "en";

  return (
    <div
      lang={english ? "en" : "he"}
      dir={english ? "ltr" : "rtl"}
      className={[
        "emet-prose mx-auto max-w-[70ch]",
        "text-[1.0625rem] leading-[1.9] text-white/80 sm:text-[1.125rem]",
        english ? "text-left" : "text-right",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
