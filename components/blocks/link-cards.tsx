import type { z } from "zod";
import Image from "next/image";
import type { linkCardsBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 30 — Link cards. A row of navigational cards (title, text,
 * optional image, optional button), e.g. the trainings page pointing at
 * שנה א׳/ב׳/ג׳.
 *
 * Async because images are stored as `image_media_id` and resolved via
 * `db.getMedia()` — same pattern as `reading-list.tsx`, never a URL
 * denormalized into the block data.
 *
 * The whole card is one anchor when a link is set, so the image and title
 * are clickable rather than just the button — the button then renders as a
 * visual affordance inside it (a <span>, not a nested <a>, which would be
 * invalid HTML). Cards without a link degrade to a plain container.
 *
 * The grid caps at 3 columns because that is what the "choose a year" case
 * needs and it keeps cards readable; 4+ cards wrap to a second row rather
 * than shrinking further.
 */
type LinkCardsData = z.infer<typeof linkCardsBlockDataSchema>;

export async function LinkCards({ data }: { data: LinkCardsData }) {
  // A card with no title has nothing to label it — the admin form starts
  // rows empty, so an editor may save before filling one in.
  const cards = (data.cards ?? []).filter((c) => c.title.trim() !== "");

  if (cards.length === 0) return null;

  const images = await Promise.all(
    cards.map((c) => (c.image_media_id ? db.getMedia(c.image_media_id) : Promise.resolve(null))),
  );

  const columns = cards.length === 1 ? "sm:grid-cols-1" : cards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-6xl">
        {data.heading ? (
          <h2 className="text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}
        {data.intro ? (
          <p className="mx-auto mt-3 max-w-2xl text-center whitespace-pre-line text-ink-muted">
            {data.intro}
          </p>
        ) : null}

        <div className={`mt-8 grid grid-cols-1 gap-6 ${columns}`}>
          {cards.map((card, i) => {
            const image = images[i];
            const href = card.link?.href?.trim();
            const Wrapper = href ? "a" : "div";
            const isExternal = href?.startsWith("http");
            const linkProps = href
              ? {
                  href,
                  target: card.link?.open_in_new_tab ? "_blank" : undefined,
                  rel: card.link?.open_in_new_tab || isExternal ? "noreferrer" : undefined,
                }
              : {};

            return (
              <RevealOnScroll key={i} delayMs={i * 80}>
                <Wrapper
                  {...linkProps}
                  className={`flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface ${
                    href
                      ? "transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      : ""
                  }`}
                >
                  {image ? (
                    <Image
                      src={mediaUrlFor(image)}
                      alt={image.alt_he}
                      width={image.width}
                      height={image.height}
                      className="h-44 w-full object-cover"
                    />
                  ) : null}

                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h3 className="font-display text-lg font-bold text-ink">{card.title}</h3>
                    {card.body ? (
                      <p className="whitespace-pre-line text-sm text-ink-muted">{card.body}</p>
                    ) : null}

                    {href && card.link?.label ? (
                      // A <span>, not an <a>: the card itself is already the
                      // link, and nesting anchors is invalid HTML.
                      <span className="mt-auto pt-3 font-semibold text-primary">
                        {card.link.label} ←
                      </span>
                    ) : null}
                  </div>
                </Wrapper>
              </RevealOnScroll>
            );
          })}
        </div>
      </RevealOnScroll>
    </section>
  );
}

export function LinkCardsSkeleton() {
  return (
    <section className="bg-bg px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mx-auto mb-8 h-8 w-56" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    </section>
  );
}
