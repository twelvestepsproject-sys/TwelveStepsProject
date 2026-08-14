import type { z } from "zod";
import Image from "next/image";
import type { readingListBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 24 — Reading list (core books / sources).
 *
 * Async because cover images are stored as `cover_media_id` and resolved
 * through `db.getMedia()` — the same one-extra-lookup pattern as
 * `lecturers-grid.tsx`'s avatars, rather than denormalizing a URL into the
 * block data (which would go stale if the media row changed).
 *
 * Rows with a blank title are dropped: the admin form starts a new row
 * empty, and the title is the only thing that makes an entry meaningful.
 * Everything else is genuinely optional — an item can be a bare name.
 */
type ReadingListData = z.infer<typeof readingListBlockDataSchema>;

export async function ReadingList({ data }: { data: ReadingListData }) {
  const items = (data.items ?? []).filter((item) => item.title.trim() !== "");

  if (items.length === 0) return null;

  const covers = await Promise.all(
    items.map((item) =>
      item.cover_media_id ? db.getMedia(item.cover_media_id) : Promise.resolve(null),
    ),
  );

  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-4xl">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{data.heading}</h2>

        {data.intro ? (
          <p className="mt-3 whitespace-pre-line text-ink-muted">{data.intro}</p>
        ) : null}

        <ul className="mt-6 flex flex-col gap-4">
          {items.map((item, i) => {
            const cover = covers[i];
            // The whole row is a link when one is set; otherwise a plain
            // container. Chosen over wrapping only the title so the cover
            // is clickable too, which is what a reader expects from a
            // book card.
            const Wrapper = item.link?.href ? "a" : "div";
            const linkProps = item.link?.href
              ? {
                  href: item.link.href,
                  target: item.link.open_in_new_tab ? "_blank" : undefined,
                  rel: item.link.open_in_new_tab ? "noreferrer" : undefined,
                }
              : {};

            return (
              <li key={i}>
                <Wrapper
                  {...linkProps}
                  className={`flex gap-4 rounded-md border border-border bg-surface p-4 ${
                    item.link?.href
                      ? "transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      : ""
                  }`}
                >
                  {cover ? (
                    <Image
                      src={mediaUrlFor(cover)}
                      alt={cover.alt_he}
                      width={72}
                      height={104}
                      className="h-26 w-18 shrink-0 rounded object-cover ring-1 ring-border"
                    />
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <p className="font-display font-bold text-ink">{item.title}</p>
                    {item.description ? (
                      <p className="whitespace-pre-line text-sm text-ink-muted">
                        {item.description}
                      </p>
                    ) : null}
                    {item.link?.href && item.link.label ? (
                      <span className="mt-1 text-sm font-semibold text-primary">
                        {item.link.label}
                      </span>
                    ) : null}
                  </div>
                </Wrapper>
              </li>
            );
          })}
        </ul>
      </RevealOnScroll>
    </section>
  );
}

export function ReadingListSkeleton() {
  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Skeleton className="mb-6 h-8 w-56" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    </section>
  );
}
