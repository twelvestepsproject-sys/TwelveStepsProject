import type { z } from "zod";
import Image from "next/image";
import type { readingListBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";
import { ExpandableBio } from "./_shared/expandable-bio";

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

/**
 * The flag is drawn rather than typed: Windows ships no glyphs for the
 * regional-indicator pairs that make flag emoji, so 🇮🇱 renders there as
 * two lettered boxes or nothing at all. The globe is a single codepoint
 * and does render, but it is drawn here too so the two rows match.
 */
function IsraelFlag() {
  return (
    <svg viewBox="0 0 22 16" aria-hidden="true" className="h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-border">
      {/* A flag's colours are the flag's, not the theme's: #0038b8 is the
          blue the Israeli flag is specified in, and drawing it in a design
          token would make it a different flag. This is the one place in the
          file where §3.5's rule does not apply. */}
      {/* eslint-disable no-restricted-syntax */}
      <rect width="22" height="16" fill="#ffffff" />
      <rect y="1.6" width="22" height="2.2" fill="#0038b8" />
      <rect y="12.2" width="22" height="2.2" fill="#0038b8" />
      <path
        d="M11 5l2.6 4.5h-5.2L11 5zm0 6l-2.6-4.5h5.2L11 11z"
        fill="none"
        stroke="#0038b8"
        strokeWidth="0.9"
      />
      {/* eslint-enable no-restricted-syntax */}
    </svg>
  );
}

function Globe() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted">
      <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <ellipse cx="8" cy="8" rx="2.9" ry="6.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M1.7 6h12.6M1.7 10h12.6" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/** The two rows of chips, in the order a reader scans them. */
const PURCHASE_GROUPS = [
  {
    key: "israel" as const,
    label: "קנייה בישראל · משלוח עד הבית",
    Icon: IsraelFlag,
  },
  { key: "world" as const, label: "ארה״ב, אירופה ושאר העולם", Icon: Globe },
];

/**
 * The destination decides the treatment: Israeli editions are outlined so
 * the row reads as a set of equal choices, while the overseas ones take the
 * accent — the site's own CTA colour — so the buy-abroad row carries the
 * weight the mockup gave Amazon's orange without importing a brand colour.
 */
const CHIP_CLASS = {
  // Hover fills the chip rather than only tinting its edge: the row is a
  // set of equal choices, and a filled one reads as the one being picked —
  // which is the state the mockup shows on the chosen language.
  israel:
    "border border-border bg-surface text-ink hover:border-primary hover:bg-primary hover:text-primary-fg",
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
      {/* Wider than the 4xl the one-column list used: two cards side by
          side, each with a cover and two chip rows, need the room. */}
      <RevealOnScroll className="mx-auto max-w-5xl">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{data.heading}</h2>

        {data.intro ? (
          <p className="mt-3 whitespace-pre-line text-ink-muted">{data.intro}</p>
        ) : null}

        {/* items-stretch + h-full on the card makes every card in a row as
            tall as the tallest, so the chip rows line up across the row
            instead of floating at different heights. */}
        <ul className="mt-6 grid items-stretch gap-5 md:grid-cols-2">
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
              <li key={i} className="h-full">
                <Wrapper
                  {...linkProps}
                  className={`flex h-full gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:gap-5 sm:p-5 ${
                    wholeCardLinks
                      ? "transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      : ""
                  }`}
                >
                  {cover ? (
                    // The cover sits on its own shadow rather than a ring:
                    // a printed book casts one, and the card already has a
                    // border doing the job of separating it from the page.
                    <Image
                      src={mediaUrlFor(cover)}
                      alt={cover.alt_he}
                      width={104}
                      height={150}
                      className="h-auto w-[72px] shrink-0 self-start rounded object-contain shadow-md sm:w-[104px]"
                    />
                  ) : null}
                  {/* min-w-0 so a long title wraps inside the card rather
                      than widening the grid column past its track. */}
                  {/* min-w-0 so a long title wraps inside the card rather
                      than widening the grid column past its track. */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {/* Titles carry their subtitle after a "|" — "איכה |
                        ריפוי מבוסס חוויה ו־12 הצעדים". Splitting them lets
                        the name read at full weight and the subtitle sit
                        under it in the accent, which is how the cards are
                        scanned: name first, then what the book is. */}
                    {(() => {
                      const cut = item.title.indexOf("|");
                      const name = cut === -1 ? item.title : item.title.slice(0, cut).trim();
                      const subtitle = cut === -1 ? null : item.title.slice(cut + 1).trim();
                      return (
                        <>
                          <p className="font-display text-lg font-bold text-primary">{name}</p>
                          {subtitle ? (
                            <p className="text-sm font-semibold text-accent-text">{subtitle}</p>
                          ) : null}
                        </>
                      );
                    })()}
                    {/* Clamped on phones only: a full blurb pushes the
                        purchase chips off a small screen, and the chips are
                        the point of the card. Desktop has the room, so the
                        clamp lifts at sm and the toggle disappears with it. */}
                    {item.description ? (
                      <div className="mt-1">
                        <ExpandableBio
                          bio={item.description}
                          name={`book-${i}`}
                          clampClass="line-clamp-3 sm:line-clamp-none"
                        />
                      </div>
                    ) : null}
                    {wholeCardLinks && item.link?.label ? (
                      <span className="mt-1 text-sm font-semibold text-primary">
                        {item.link.label}
                      </span>
                    ) : null}

                    {/* mt-auto pushes the whole purchase area to the foot of
                        the card, so in a row of equal-height cards the chips
                        line up however long the descriptions are. */}
                    {purchase.length > 0 ? (
                      <div className="mt-auto flex flex-col gap-3 pt-4">
                        {PURCHASE_GROUPS.map(({ key, label, Icon }) => {
                          const links = purchase.filter(
                            (l) => l.group === key && l.href.trim() !== "",
                          );
                          if (links.length === 0) return null;
                          return (
                            <div key={key} className="flex flex-col gap-2">
                              <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                                <Icon />
                                {label}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {links.map((link, j) => (
                                  <a
                                    key={j}
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${CHIP_CLASS[key]}`}
                                  >
                                    {link.label}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
