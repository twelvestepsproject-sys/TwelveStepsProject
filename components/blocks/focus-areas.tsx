import type { z } from "zod";
import type { focusAreasBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 4 — Focus areas (3-4 cards naming what the program addresses).
 * Static content from `data` only — no `db` read, per the task brief
 * ("no db read needed beyond the block's own data"). Schema already
 * enforces 3-4 cards (`focusAreasBlockDataSchema`'s `.min(3).max(4)`), so
 * no additional guard is needed here beyond rendering what's given.
 */
type FocusAreasData = z.infer<typeof focusAreasBlockDataSchema>;

export function FocusAreas({ data }: { data: FocusAreasData }) {
  return (
    <section className="bg-surface px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-6xl">
        {data.heading ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.cards.map((card, i) => (
            <RevealOnScroll
              key={i}
              delayMs={i * 100}
              className="flex flex-col items-center gap-3 rounded-lg border border-border bg-bg p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
            >
              {card.icon ? (
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary"
                  aria-hidden="true"
                >
                  {card.icon}
                </span>
              ) : null}
              <h3 className="font-display text-lg font-bold text-ink">{card.title}</h3>
              <p className="text-sm text-ink-muted">{card.body}</p>
            </RevealOnScroll>
          ))}
        </div>
      </RevealOnScroll>
    </section>
  );
}
