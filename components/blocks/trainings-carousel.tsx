import type { z } from "zod";
import Image from "next/image";
import type { trainingsCarouselBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";
import { TrainingsCarouselControls } from "./_shared/trainings-carousel-controls";

/**
 * §5 block 7 — Trainings carousel. Reads `db.listTrainings({ featuredOnly })`
 * — pagination/filtering already happened inside the data source, this
 * component only renders what it gets back. Empty case: if there are no
 * featured trainings, render nothing (no heading floating over an empty
 * strip) rather than fabricate placeholder cards.
 *
 * Cover images: `cover_image_id` resolved via `db.getMedia()`. Several
 * fixture trainings genuinely have `cover_image_id: null` (real content
 * gap pending the image-sourcing pass, logged in docs/licenses.md) — that
 * card simply renders without an image slot, no broken `<img>`, no
 * fabricated placeholder photo standing in for a real one.
 */
type TrainingsCarouselData = z.infer<typeof trainingsCarouselBlockDataSchema>;

export async function TrainingsCarousel({ data }: { data: TrainingsCarouselData }) {
  const trainings = await db.listTrainings({ featuredOnly: data.featured_only });

  if (trainings.length === 0) return null;

  const covers = await Promise.all(
    trainings.map((t) =>
      t.cover_image_id ? db.getMedia(t.cover_image_id) : Promise.resolve(null),
    ),
  );

  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
          {data.intro ? <p className="text-ink-muted">{data.intro}</p> : null}
        </div>
        {data.layout === "grid" ? (
          // Same three-column grid as /hachsharot, so a page with only a
          // couple of trainings reads as a deliberate set rather than a
          // half-empty scroll strip.
          /* Centred rather than a plain 3-column grid: with only two
             published trainings the third column stays empty, which in RTL
             pushes the pair to the right edge. A centred flex row with a
             per-card basis keeps the three-across rhythm when full and
             centres whatever is there when it is not. */
          <div className="flex flex-wrap justify-center gap-6">
            {trainings.map((training, i) => {
              const cover = covers[i];
              return (
                <RevealOnScroll
                  key={training.id}
                  delayMs={i * 100}
                  className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
                >
                  <article className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg">
                    {cover ? (
                      <Image
                        src={mediaUrlFor(cover)}
                        alt={cover.alt_he}
                        width={cover.width}
                        height={cover.height}
                        className="h-40 w-full rounded-md object-cover"
                      />
                    ) : null}
                    <h3 className="font-display text-lg font-bold text-ink">{training.title}</h3>
                    <p className="text-sm text-ink-muted">{training.excerpt}</p>
                    {training.starts_on ? (
                      <p className="text-xs text-ink-muted">מחזור הבא: {training.starts_on}</p>
                    ) : null}
                    <a
                      href={`/hachsharot/${training.slug}`}
                      className="mt-auto font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      לפרטים נוספים
                    </a>
                  </article>
                </RevealOnScroll>
              );
            })}
          </div>
        ) : (
        <TrainingsCarouselControls heading={data.heading}>
          {trainings.map((training, i) => {
            const cover = covers[i];
            return (
              <RevealOnScroll
                key={training.id}
                delayMs={i * 100}
                className="min-w-[280px] shrink-0 snap-start sm:min-w-[320px]"
              >
                <article className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg">
                  {cover ? (
                    <Image
                      src={mediaUrlFor(cover)}
                      alt={cover.alt_he}
                      width={cover.width}
                      height={cover.height}
                      className="h-40 w-full rounded-md object-cover"
                    />
                  ) : null}
                  <h3 className="font-display text-lg font-bold text-ink">{training.title}</h3>
                  <p className="text-sm text-ink-muted">{training.excerpt}</p>
                  {training.starts_on ? (
                    <p className="text-xs text-ink-muted">מחזור הבא: {training.starts_on}</p>
                  ) : null}
                  <a
                    href={`/hachsharot/${training.slug}`}
                    className="mt-auto font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    לפרטים נוספים
                  </a>
                </article>
              </RevealOnScroll>
            );
          })}
        </TrainingsCarouselControls>
        )}
        {data.all_trainings_link ? (
          <div className="mt-8 text-center">
            <a
              href={data.all_trainings_link.href}
              className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
            >
              {data.all_trainings_link.label}
            </a>
          </div>
        ) : null}
      </RevealOnScroll>
    </section>
  );
}

export function TrainingsCarouselSkeleton() {
  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mx-auto mb-8 h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </section>
  );
}
