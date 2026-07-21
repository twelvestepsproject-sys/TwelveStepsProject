import type { z } from "zod";
import type { heroBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { HeroClient } from "./_shared/hero-client";
import { HeroHeadingWithAccent } from "./_shared/hero-entrance";

/**
 * §5 block 2 — Hero. Data comes straight from its `page_blocks.data` row
 * (passed in as a prop by the page renderer), not from `db` — EXCEPT for
 * `background_media_id`, which needs an async `db.getMedia()` resolution
 * (same pattern as `intro-media.tsx`'s `thumbnail_media_id`) — that's why
 * this outer component is `async` and does the one `db` read itself,
 * while the actual client-side ref/animation logic lives in the separate
 * `HeroClient` island (motion pass' `HeroEntrance`/`HeroHeadingWithAccent`
 * moved under it) so THIS file can stay a plain Server Component again.
 *
 * Motion pass note: deliberately NOT wrapped in `RevealOnScroll` — this is
 * the above-the-fold, LCP-relevant content. Gating it behind an
 * IntersectionObserver-triggered fade would delay its first visible paint
 * and risk the LCP/CLS budget in §3.
 */
type HeroData = z.infer<typeof heroBlockDataSchema>;

export async function Hero({ data }: { data: HeroData }) {
  const background = data.background_media_id ? await db.getMedia(data.background_media_id) : null;

  return (
    <section
      className={`relative overflow-hidden px-6 py-16 text-primary-fg sm:py-24 ${background ? "" : "bg-primary"}`}
    >
      {/* BUG FIX: the image/overlay divs were `-z-10` (negative z-index)
          siblings of the section's own `bg-primary` paint — a negative
          z-index child can end up stacking BEHIND a parent's own opaque
          background in some layouts, which is exactly what happened here:
          the photo was in the HTML and loading correctly, just invisible
          behind the solid color. Fixed by removing `bg-primary` from the
          section itself when there's a photo (the overlay div below
          supplies the color wash instead) and keeping the image/overlay at
          the DEFAULT stacking order (no z-index at all) as plain absolutely
          positioned elements painted in DOM order, with the actual content
          getting `relative z-10` to guarantee it's still on top. */}
      {background ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center will-change-transform"
          style={{
            backgroundImage: `url(${mediaUrlFor(background)})`,
            transform: "translateY(var(--hero-parallax-y, 0px)) scale(1.08)",
          }}
        />
      ) : null}
      {/* Opacity overlay so white text stays readable over any photo —
          resolves through the existing --color-primary token (an
          rgb()-mixed translucent wash of the brand primary), never a new
          hex value. Also gives the section its "warm, not stark" feel per
          the request for a nice opacity treatment. */}
      {background ? <div aria-hidden="true" className="absolute inset-0 bg-primary/75" /> : null}
      <HeroClient>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          {/* Design feedback: the eyebrow (first word, e.g. "הנני" — the
              org name) should read as the dominant opening element, not a
              small label above the real headline. Bumped to a large
              display size and the rest of the stack rebalanced under it:
              H1 steps down a size (it's now the SECOND-largest element,
              not the largest), intro stays proportionate. No new colors —
              still text-primary-fg/[opacity], same tokens as before. */}
          {data.eyebrow ? (
            <p className="font-display text-4xl font-bold text-primary-fg sm:text-5xl">
              {data.eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            <HeroHeadingWithAccent heading={data.heading} />
          </h1>
          <p className="text-base text-primary-fg/90 sm:text-lg">{data.intro}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {data.primary_cta_label ? (
              <button
                type="button"
                className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-accent-hover hover:shadow-lg active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {data.primary_cta_label}
              </button>
            ) : null}
            {data.phone_cta ? (
              <a
                href={`tel:${data.phone_cta}`}
                className="rounded-full border border-primary-fg/40 px-6 py-3 font-semibold text-primary-fg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-primary-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {data.phone_cta}
              </a>
            ) : null}
          </div>
        </div>
      </HeroClient>
    </section>
  );
}
