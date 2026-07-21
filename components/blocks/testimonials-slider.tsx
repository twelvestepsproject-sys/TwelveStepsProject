import type { z } from "zod";
import Image from "next/image";
import type { testimonialsSliderBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 11 — Testimonials slider. Reads
 * `db.listTestimonials({ visibleOnly: true })`. Per §5's explicit rule:
 * "Only real, consented testimonials — if the client has none yet, the
 * block ships hidden." So the empty case here is not a placeholder message
 * — it's rendering nothing at all (`return null`), same as if the block
 * row had `is_visible: false`.
 *
 * Avatars: `photo_id` resolved via `db.getMedia()`, `alt_he` from the
 * resolved row used as alt text (mandatory per §3, never blank).
 *
 * Static (non-JS) rendering for now: a scrollable row rather than a true
 * auto-rotating/pausable carousel — that interaction layer is a
 * client-component concern for a later pass; this establishes the
 * data-correct, accessible baseline (all quotes present in the DOM,
 * keyboard-reachable links) first.
 */
type TestimonialsSliderData = z.infer<typeof testimonialsSliderBlockDataSchema>;

export async function TestimonialsSlider({ data }: { data: TestimonialsSliderData }) {
  const testimonials = await db.listTestimonials({ visibleOnly: true });

  if (testimonials.length === 0) return null;

  const photos = await Promise.all(
    testimonials.map((t) => (t.photo_id ? db.getMedia(t.photo_id) : Promise.resolve(null))),
  );

  return (
    // Warm gradient background treatment (structural idea from the
    // reference images — soft cream/tan section backdrop for testimonial
    // cards), built entirely from our own bg/surface-alt tokens, not the
    // reference site's specific hex values.
    <section className="bg-gradient-to-b from-bg to-surface-alt px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-5xl">
        {data.heading ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}
        <ul className="flex snap-x gap-6 overflow-x-auto pb-4">
          {testimonials.map((t, i) => {
            const photo = photos[i];
            return (
              <li
                key={t.id}
                className="flex w-72 shrink-0 snap-start flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
              >
                {photo ? (
                  <div className="w-fit rounded-full bg-gradient-to-br from-accent/25 via-primary/15 to-accent/10 p-1">
                    <Image
                      src={mediaUrlFor(photo)}
                      alt={photo.alt_he}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </div>
                ) : null}
                <p className="font-display text-2xl text-accent-text" aria-hidden="true">
                  &ldquo;
                </p>
                <p className="text-sm text-ink">{t.quote}</p>
                <p className="mt-auto text-sm font-semibold text-ink-muted">{t.author_name}</p>
              </li>
            );
          })}
        </ul>
      </RevealOnScroll>
    </section>
  );
}

export function TestimonialsSliderSkeleton() {
  return (
    <section className="bg-surface-alt px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Skeleton className="mx-auto mb-8 h-8 w-56" />
        <div className="flex gap-6 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-72 shrink-0" />
          ))}
        </div>
      </div>
    </section>
  );
}
