import type { Metadata } from "next";
import { db } from "@/lib/queries";

/**
 * `/kehila` — Community (§4 `/[community]`). Slug chosen per the task
 * brief's instruction to extend the established plain-transliteration
 * pattern; already present in lib/mock/fixtures/menus.ts's header/mobile
 * nav (`href: "/kehila"`), so this page fulfils an already-linked route
 * rather than introducing a second naming scheme.
 *
 * JUDGMENT CALL: no dedicated content model exists for "community" beyond
 * `site_settings.community_url` and the `community_cta` block's own static
 * `data` shape — this page is a light wrapper around that same static-copy
 * pattern (§5 block 16's own reasoning: "This component doesn't reach into
 * site_settings.community_url itself... a page author may want a different
 * link"). Reads `db.getSiteSettings()` only for the WhatsApp URL fallback,
 * everything else here is page-local copy, consistent with `community_cta`
 * not being db-backed either.
 */
export const metadata: Metadata = {
  title: "קהילה | מכללת אשד",
  description: "הקהילה של מכללת אשד — מרחב לשיתוף, שאלות, ועדכונים בין הבוגרים והתלמידים.",
};

export default async function CommunityPage() {
  const settings = await db.getSiteSettings();
  const communityUrl = settings.community_url;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">הקהילה שלנו</h1>
      <p className="mt-6 text-lg text-ink-muted">
        מעבר לתוכניות הלימוד, מכללת אשד היא גם קהילה — מקום להישאר מחוברים אליו גם אחרי סיום
        התהליך. בקבוצת הקהילה שלנו משתפים שאלות, עדכונים, ורגעים מהדרך, בין בוגרים לתלמידים
        נוכחיים.
      </p>
      {communityUrl ? (
        <a
          href={communityUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
        >
          הצטרפות לקבוצת הווטסאפ
        </a>
      ) : (
        <p className="mt-8 text-sm text-ink-muted">
          קישור לקבוצת הקהילה יתעדכן כאן בקרוב.
        </p>
      )}
    </main>
  );
}
