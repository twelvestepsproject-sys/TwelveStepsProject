import type { z } from "zod";
import Image from "next/image";
import type { lecturersGridBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 12 — Lecturers grid. Reads `db.listLecturers({ visibleOnly: true })`.
 *
 * Which lecturers render depends on whether this block instance has an
 * explicit selection in `data.lecturer_ids`:
 *  - non-empty: exactly those lecturers, IN THE ORDER CHOSEN in the admin
 *    (so a page can show its own teaching staff — the year-by-year
 *    psychotherapy pages each list different people).
 *  - empty (the default, and what every pre-existing block row has):
 *    unchanged legacy behavior — `is_featured` lecturers if any exist,
 *    otherwise all visible ones.
 *
 * The selection is always re-filtered through the `visibleOnly` list rather
 * than fetched by id, so hiding a lecturer (or revoking consent, which the
 * `lecturerSchema` refinement ties to visibility) removes them from every
 * page that selected them. A stale id left behind by a deleted lecturer is
 * simply skipped.
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

  const selectedIds = data.lecturer_ids ?? [];
  let shown;
  if (selectedIds.length > 0) {
    const byId = new Map(lecturers.map((l) => [l.id, l]));
    shown = selectedIds.map((id) => byId.get(id)).filter((l) => l !== undefined);
  } else {
    const featured = lecturers.filter((l) => l.is_featured);
    shown = featured.length > 0 ? featured : lecturers;
  }

  // Every selected lecturer was hidden/deleted — render nothing rather
  // than silently falling back to the site-wide list, which would show
  // people this page's editor did not choose.
  if (shown.length === 0) return null;

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
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((lecturer, i) => {
            const photo = photos[i];
            return (
              <RevealOnScroll
                key={lecturer.id}
                delayMs={i * 80}
                className="flex h-full flex-col items-center gap-3 rounded-lg border border-border bg-bg p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                {photo ? (
                  <Image
                    src={mediaUrlFor(photo)}
                    alt={photo.alt_he}
                    width={600}
                    height={800}
                    // Portrait 3:4 — the natural shape for a head-and-
                    // shoulders photo, and closest to what the uploaded images
                    // already are. aspect-ratio rather than a fixed height so
                    // the frame keeps its proportions at every breakpoint.
                    // object-top because centring a tall portrait crops the
                    // face; the tinted ground means a photo that arrives
                    // already cut out on white sits on the same base as a
                    // full-bleed one.
                    className="aspect-[3/4] w-full rounded-md bg-surface-alt object-cover object-top"
                  />
                ) : (
                  // No photo on file — a plain tinted panel rather than a
                  // broken <img> or an invented stand-in portrait. Same
                  // footprint as a real photo so the grid stays even.
                  <div
                    className="flex aspect-[3/4] w-full items-center justify-center rounded-md bg-surface-alt text-3xl text-ink-muted"
                    role="img"
                    aria-label={lecturer.name}
                  >
                    {lecturer.name.slice(0, 1)}
                  </div>
                )}
                <p className="font-display text-lg font-bold text-ink">{lecturer.name}</p>
                {lecturer.role ? (
                  <p className="text-sm text-ink-muted">{lecturer.role}</p>
                ) : null}
                {lecturer.bio ? (
                  // Capped at three lines so one long biography cannot stretch
                  // its card far past its neighbours — bios in the data range
                  // from 25 to 800+ characters. The full text stays in the DOM
                  // (line-clamp only hides the overflow visually) and shows on
                  // hover via the title attribute.
                  <p
                    className="line-clamp-3 whitespace-pre-line text-sm text-ink-muted"
                    title={lecturer.bio}
                  >
                    {lecturer.bio}
                  </p>
                ) : null}
              </RevealOnScroll>
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
