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
export const metadata: Metadata = {
  title: "הכשרות | מכללת אשד",
  description: "מגוון ההכשרות וסדנאות מכללת אשד — מסדנת היכרות קצרה ועד תוכנית העומק הרב-שנתית.",
};

export default async function TrainingsIndexPage() {
  const trainings = await db.listTrainings();

  const covers = await Promise.all(
    trainings.map((t) => (t.cover_image_id ? db.getMedia(t.cover_image_id) : Promise.resolve(null))),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">הכשרות</h1>
        <p className="mt-2 text-ink-muted">
          מגוון מסלולים — מסדנת היכרות קצרה ועד תוכנית העומק הרב-שנתית.
        </p>
      </header>

      {trainings.length === 0 ? (
        <p className="text-center text-ink-muted">אין כרגע הכשרות פעילות להצגה.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trainings.map((training, i) => {
            const cover = covers[i];
            const price = formatPrice(training.price);
            return (
              <article
                key={training.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                {cover ? (
                  <Image
                    src={mediaUrlFor(cover)}
                    alt={cover.alt_he}
                    width={cover.width}
                    height={cover.height}
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
