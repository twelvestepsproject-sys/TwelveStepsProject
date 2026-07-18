import type { z } from "zod";
import Image from "next/image";
import type { lecturersGridBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 12 — Lecturers grid. Reads `db.listLecturers({ visibleOnly: true })`.
 * `is_featured` lecturers are surfaced first for the homepage grid (§6:
 * "is_featured means also surfaced on the homepage grid"), but ALL visible
 * lecturers still render here per the current fixtures/behavior — a
 * dedicated "featured only" homepage filter isn't in scope of the
 * `DataSource` interface's `listLecturers` signature (see friction note in
 * the final report). Empty case: render nothing.
 *
 * Avatars: each lecturer carries `photo_id`, resolved via `db.getMedia()`
 * (no join left to the caller beyond that one extra lookup — `Lecturer`
 * itself only stores the id, same as the future SQL row). `alt_he` from
 * the resolved `Media` row is mandatory alt text per §3's accessibility
 * requirement, never omitted or defaulted to empty.
 */
type LecturersGridData = z.infer<typeof lecturersGridBlockDataSchema>;

export async function LecturersGrid({ data }: { data: LecturersGridData }) {
  const lecturers = await db.listLecturers({ visibleOnly: true });

  if (lecturers.length === 0) return null;

  const featured = lecturers.filter((l) => l.is_featured);
  const shown = featured.length > 0 ? featured : lecturers;

  const photos = await Promise.all(
    shown.map((l) => (l.photo_id ? db.getMedia(l.photo_id) : Promise.resolve(null))),
  );

  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-6xl">
        {data.heading ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((lecturer, i) => {
            const photo = photos[i];
            return (
              <div
                key={lecturer.id}
                className="flex flex-col items-center gap-2 text-center transition-transform duration-300 hover:-translate-y-1"
              >
                {photo ? (
                  <Image
                    src={mediaUrlFor(photo)}
                    alt={photo.alt_he}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  // No photo on file (fixture gap, not a rendering bug) —
                  // an empty circle stands in rather than a broken <img>
                  // or a fabricated placeholder photo.
                  <div
                    className="h-20 w-20 rounded-full bg-surface-alt"
                    role="img"
                    aria-label={lecturer.name}
                  />
                )}
                <p className="font-display font-bold text-ink">{lecturer.name}</p>
                <p className="text-xs text-ink-muted">{lecturer.role}</p>
              </div>
            );
          })}
        </div>
        {data.all_lecturers_link ? (
          <div className="mt-8 text-center">
            <a
              href={data.all_lecturers_link.href}
              className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
            >
              {data.all_lecturers_link.label}
            </a>
          </div>
        ) : null}
      </RevealOnScroll>
    </section>
  );
}

export function LecturersGridSkeleton() {
  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mx-auto mb-8 h-8 w-48" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    </section>
  );
}
