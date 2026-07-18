import type { z } from "zod";
import type { heroBlockDataSchema } from "@/lib/schemas";

/**
 * §5 block 2 — Hero. Data comes straight from its `page_blocks.data` row
 * (passed in as a prop by the page renderer), not from `db` — this block
 * has no async read of its own, so no loading/error state applies here;
 * the page-level `getPage()` call already covers that.
 *
 * Motion pass note: deliberately NOT wrapped in `RevealOnScroll` — this is
 * the above-the-fold, LCP-relevant content. Gating it behind an
 * IntersectionObserver-triggered fade would delay its first visible paint
 * and risk the LCP/CLS budget in §3. Only the CTA hover transitions were
 * added here; the entrance-on-scroll treatment is reserved for
 * below-the-fold blocks.
 */
type HeroData = z.infer<typeof heroBlockDataSchema>;

export function Hero({ data }: { data: HeroData }) {
  return (
    <section className="bg-primary px-6 py-16 text-primary-fg sm:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        {data.eyebrow ? (
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-primary-fg/80">
            {data.eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-4xl font-bold sm:text-5xl">{data.heading}</h1>
        <p className="text-lg text-primary-fg/90">{data.intro}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {data.primary_cta_label ? (
            <button
              type="button"
              className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
            >
              {data.primary_cta_label}
            </button>
          ) : null}
          {data.phone_cta ? (
            <a
              href={`tel:${data.phone_cta}`}
              className="rounded-full border border-primary-fg/40 px-6 py-3 font-semibold text-primary-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              {data.phone_cta}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
