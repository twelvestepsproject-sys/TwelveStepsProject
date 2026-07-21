import type { z } from "zod";
import type { communityCtaBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 16 — Community CTA (heading, copy, CTA — e.g. WhatsApp group).
 * Static content from `data` only — no `db` read. The CTA `href` is
 * whatever the CMS admin puts in the block's own `data.cta.href` (e.g. a
 * WhatsApp group link); this component doesn't reach into
 * `site_settings.community_url` itself, since a page author may want a
 * different link for a specific CTA instance than the site-wide default.
 */
type CommunityCtaData = z.infer<typeof communityCtaBlockDataSchema>;

export function CommunityCta({ data }: { data: CommunityCtaData }) {
  return (
    <section className="bg-surface-alt px-6 py-16">
      <RevealOnScroll className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{data.heading}</h2>
        <p className="text-ink-muted">{data.body}</p>
        <a
          href={data.cta.href}
          target={data.cta.open_in_new_tab ? "_blank" : undefined}
          rel={data.cta.open_in_new_tab ? "noreferrer" : undefined}
          className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-accent-hover hover:shadow-lg active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {data.cta.label}
        </a>
      </RevealOnScroll>
    </section>
  );
}
