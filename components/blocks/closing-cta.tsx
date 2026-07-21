import type { z } from "zod";
import type { closingCtaBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 18 — Closing CTA band (icon, heading, rich text, CTA). Same
 * shape/rationale as `about.tsx` — static content from `data`, `body`
 * rendered as plain text pending the real Tiptap JSON -> sanitized-HTML
 * pipeline (not built yet, out of scope this pass — see about.tsx's
 * header comment for the full reasoning, not duplicated here).
 */
type ClosingCtaData = z.infer<typeof closingCtaBlockDataSchema>;

export function ClosingCta({ data }: { data: ClosingCtaData }) {
  return (
    <section className="bg-primary px-6 py-16 text-primary-fg">
      <RevealOnScroll className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        {data.icon ? (
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fg/10 text-3xl"
            aria-hidden="true"
          >
            {data.icon}
          </span>
        ) : null}
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{data.heading}</h2>
        <p className="whitespace-pre-line text-primary-fg/90">{data.body}</p>
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
