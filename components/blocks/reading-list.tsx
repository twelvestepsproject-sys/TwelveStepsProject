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
 *
 * An item carrying `purchase_links` renders its editions as two rows of
 * chips instead of being one big link, because a book in six languages is
 * six destinations and a card can only point at one. Items without them
 * keep the old whole-card link: the same block lists bundles and sources
 * elsewhere on the site, and those have exactly one place to go.
 */
type ReadingListData = z.infer<typeof readingListBlockDataSchema>;

/** The two rows of chips, in the order a reader scans them. */
const PURCHASE_GROUPS = [
  { key: "israel" as const, label: "🇮🇱 קנייה בישראל · משלוח עד הבית" },
  { key: "world" as const, label: "🌍 ארה״ב, אירופה ושאר העולם" },
];

/**
 * The destination decides the treatment: Israeli editions are outlined so
 * the row reads as a set of equal choices, while the overseas ones take the
 * accent — the site's own CTA colour — so the buy-abroad row carries the
 * weight the mockup gave Amazon's orange without importing a brand colour.
 */
const CHIP_CLASS = {
  israel:
    "border border-border bg-surface text-ink hover:border-primary hover:text-primary",
  world:
    "border border-transparent bg-accent text-accent-fg hover:bg-accent-hover",
};

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

        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((item, i) => {
            const cover = covers[i];
            const purchase = item.purchase_links ?? [];
            // The whole row is a link when one is set and there are no
            // editions; otherwise a plain container. Wrapping the card was
            // chosen over wrapping only the title so the cover is clickable
            // too — but a card holding its own chips cannot also be a link,
            // since nesting anchors is invalid and the chips are the real
            // destinations.
            const wholeCardLinks = purchase.length === 0 && Boolean(item.link?.href);
            const Wrapper = wholeCardLinks ? "a" : "div";
            const linkProps = wholeCardLinks
              ? {
                  href: item.link!.href,
                  target: item.link!.open_in_new_tab ? "_blank" : undefined,
                  rel: item.link!.open_in_new_tab ? "noreferrer" : undefined,
                }
              : {};

            return (
              <li key={i}>
                <Wrapper
                  {...linkProps}
                  className={`flex h-full gap-4 rounded-md border border-border bg-surface p-4 ${
                    wholeCardLinks
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
                  {/* min-w-0 so a long title wraps inside the card rather
                      than widening the grid column past its track. */}
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-display font-bold text-ink">{item.title}</p>
                    {item.description ? (
                      <p className="whitespace-pre-line text-sm text-ink-muted">
                        {item.description}
                      </p>
                    ) : null}
                    {wholeCardLinks && item.link?.label ? (
                      <span className="mt-1 text-sm font-semibold text-primary">
                        {item.link.label}
                      </span>
                    ) : null}

                    {PURCHASE_GROUPS.map(({ key, label }) => {
                      const links = purchase.filter((l) => l.group === key && l.href.trim() !== "");
                      if (links.length === 0) return null;
                      return (
                        <div key={key} className="mt-3 flex flex-col gap-1.5">
                          <p className="text-xs text-ink-muted">{label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {links.map((link, j) => (
                              <a
                                key={j}
                                href={link.href}
                                target="_blank"
                                rel="noreferrer"
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${CHIP_CLASS[key]}`}
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
