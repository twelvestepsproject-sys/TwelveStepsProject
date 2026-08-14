import type { z } from "zod";
import type { requirementsBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 22 — Requirements list (heading, optional intro, free-length
 * list of prerequisites). Static content from `data` only, no `db` read.
 *
 * Blank rows are filtered out rather than rendered as empty bullets: the
 * admin form starts a new item as an empty string, so an editor who adds a
 * row and saves before typing would otherwise publish a stray bullet.
 */
type RequirementsData = z.infer<typeof requirementsBlockDataSchema>;

export function Requirements({ data }: { data: RequirementsData }) {
  const items = (data.items ?? []).filter((item) => item.trim() !== "");

  // Nothing to show — render nothing rather than a lone heading over an
  // empty list (a half-configured block shouldn't leave a visible artifact).
  if (items.length === 0 && !data.intro) return null;

  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-3xl">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{data.heading}</h2>

        {data.intro ? (
          <p className="mt-3 whitespace-pre-line text-ink-muted">{data.intro}</p>
        ) : null}

        {items.length > 0 ? (
          <ul className="mt-6 flex flex-col gap-3">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-md border border-border bg-surface p-4"
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className="whitespace-pre-line text-ink">{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </RevealOnScroll>
    </section>
  );
}
