import type { z } from "zod";
import type { pullQuoteBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 5 — Pull quote (quote mark + short statement). Static content
 * from `data` only — no `db` read.
 */
type PullQuoteData = z.infer<typeof pullQuoteBlockDataSchema>;

export function PullQuote({ data }: { data: PullQuoteData }) {
  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center">
        <p className="font-display text-5xl text-accent-text" aria-hidden="true">
          &rdquo;
        </p>
        <p className="font-display text-xl font-semibold text-ink sm:text-2xl">{data.quote}</p>
      </RevealOnScroll>
    </section>
  );
}
