import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { formatPrice } from "@/lib/format";

/**
 * `/hachsharot` — Trainings index (§4 sitemap `/[trainings]`). Reads
 * `db.listTrainings()` — filtering (published-only) and sorting already
 * happened inside the mock data source (§5.5 rule 3), this page only
 * renders what comes back. Static by default (§10): no `generateStaticParams`
 * needed here since this is the collection root, not a dynamic segment, but
 * the fetch is still tagged for future revalidation.
 *
 * `listTrainings()` on the current `DataSource` returns a bare `Training[]`,
 * not a `Paginated<Training>` (only `listTrainingsAdmin` is paginated) — so
 * this public index renders the full published list rather than paging it.
 * Flagged in the final report as a friction point: §4 doesn't explicitly
 * require trainings-index pagination the way it does for `/blog`, and the
 * fixture volume (5 trainings) doesn't yet need it, so this isn't treated
 * as a blocking gap — just noted for whoever adds pagination if the
 * collection grows.
 */
// BUG FIX: was a static `export const metadata` with the org name
// hardcoded — see app/layout.tsx's root metadata for the same fix pattern.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.getSiteSettings();
  return {
    title: `הכשרות | ${settings.site_name}`,
    description: `מגוון ההכשרות וסדנאות ${settings.site_name} — מסדנת היכרות קצרה ועד תוכנית העומק הרב-שנתית.`,
  };
}

export default async function TrainingsIndexPage() {
  // Heading/intro come from an optional `hachsharot` CMS page so an editor
  // can change them; the grid below stays code-driven because it renders
  // live `trainings` rows, not authored blocks. Falls back to the original
  // wording when no such page exists, so nothing breaks if it is deleted.
  const [trainings, headerPage] = await Promise.all([
    db.listTrainings(),
    db.getPage("hachsharot"),
  ]);

  const covers = await Promise.all(
    trainings.map((t) => (t.cover_image_id ? db.getMedia(t.cover_image_id) : Promise.resolve(null))),
  );

  // A `hero` block on the CMS page supplies the wording when present.
  const heroBlock = headerPage?.blocks.find((b) => b.block_type === "hero");
  const heroData = heroBlock?.data as { heading?: string; intro?: string } | undefined;
  const pageHeading = heroData?.heading || "הכשרות";
  const pageIntro =
    heroData?.intro || "מגוון מסלולים — מסדנת היכרות קצרה ועד תוכנית העומק הרב-שנתית.";

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{pageHeading}</h1>
        <p className="mt-2 whitespace-pre-line text-ink-muted">{pageIntro}</p>
      </header>

      {trainings.length === 0 ? (
        <p className="text-center text-ink-muted">אין כרגע הכשרות פעילות להצגה.</p>
      ) : (
        /* Centred like the homepage carousel: with two published
           trainings a 3-column grid leaves the third column empty, which in
           RTL pushes the pair to the right edge. */
        <div className="flex flex-wrap justify-center gap-6">
          {trainings.map((training, i) => {
            const cover = covers[i];
            const price = formatPrice(training.price);
            return (
              <article
                key={training.id}
                className="flex w-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
              >
                {cover ? (
                  <Image
                    src={mediaUrlFor(cover)}
                    alt={cover.alt_he}
                    width={cover.width}
                    height={cover.height}
                    // Without `sizes` the srcset is built from the file's
                    // own width and asks for w=1920 for a 160px-tall card;
                    // past an image's natural width the optimizer returns
                    // the original unconverted. Matches the article's own
                    // breakpoints above: full, then half, then a third.
                    sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                    className="h-40 w-full rounded-md object-cover"
                  />
                ) : null}
                <h2 className="font-display text-lg font-bold text-ink">{training.title}</h2>
                <p className="text-sm text-ink-muted">{training.excerpt}</p>
                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  {training.starts_on ? (
                    <div>
                      <dt className="sr-only">מחזור הבא</dt>
                      <dd>מחזור הבא: {training.starts_on}</dd>
                    </div>
                  ) : null}
                  {price ? (
                    <div>
                      <dt className="sr-only">מחיר</dt>
                      <dd>{price}</dd>
                    </div>
                  ) : null}
                </dl>
                <Link
                  href={`/hachsharot/${training.slug}`}
                  className="mt-auto font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
                >
                  לפרטים נוספים
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
