import type { z } from "zod";
import type { semestersBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 33 — Semesters. Collapsible semester panels, each listing its
 * sessions, each session listing its titled parts.
 *
 * Card treatment (border, hover lift, two-column inner grid) deliberately
 * mirrors `program-stages-stepper.tsx` so the two read as the same family;
 * the difference is that a semester starts COLLAPSED, which is what the
 * client asked for — a full year's schedule is far too long to show
 * expanded by default.
 *
 * Built on native <details>/<summary>, like `faq.tsx`: it keeps this a
 * Server Component, the browser handles keyboard operation and screen
 * reader announcement, and collapsed content stays in the DOM so Ctrl+F
 * and crawlers still reach it.
 *
 * Semesters sit in a responsive grid — side by side on desktop, stacked on
 * mobile. `items-start` matters: without it, grid items stretch to match
 * the tallest sibling, so expanding one semester would leave a tall empty
 * gap beside the collapsed ones.
 */
type SemestersData = z.infer<typeof semestersBlockDataSchema>;

export function Semesters({ data }: { data: SemestersData }) {
  // A semester with no title has nothing to click on; the admin form
  // starts rows empty, so an editor may save mid-edit.
  const semesters = (data.semesters ?? []).filter((s) => s.title.trim() !== "");

  if (semesters.length === 0) return null;

  return (
    <section className="bg-surface px-6 py-16">
      <RevealOnScroll className="mx-auto max-w-6xl">
        {data.heading ? (
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {data.heading}
          </h2>
        ) : null}

        {/* A lone semester spans the full width instead of sitting in a
            half-empty two-column grid — the 12-steps training has exactly
            one, and a single narrow card beside dead space reads as a bug. */}
        <div
          className={`grid grid-cols-1 items-start gap-6 ${
            semesters.length > 1 ? "lg:grid-cols-2" : ""
          }`}
        >
          {semesters.map((semester, si) => {
            const sessions = (semester.sessions ?? []).filter((s) => s.label.trim() !== "");
            return (
              <RevealOnScroll key={si} delayMs={si * 100}>
                <details className="group rounded-lg border border-border bg-bg shadow-sm transition-all duration-300 hover:shadow-md">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span className="flex flex-col gap-1">
                      <span className="font-display text-xl font-bold text-ink">
                        {semester.title}
                      </span>
                      {semester.subtitle ? (
                        <span className="text-sm text-ink-muted">{semester.subtitle}</span>
                      ) : null}
                    </span>
                    {/* aria-hidden: <details> already announces its state. */}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-2xl leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>

                  {sessions.length > 0 ? (
                    <ol className="flex flex-col gap-4 border-t border-border p-6">
                      {sessions.map((session, xi) => {
                        const parts = (session.parts ?? []).filter((p) => p.title.trim() !== "");
                        return (
                          <li
                            key={xi}
                            className="rounded-md border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                          >
                            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <span className="font-display font-bold text-ink">
                                {session.label}
                              </span>
                              {session.date ? (
                                <span className="text-xs text-ink-muted">{session.date}</span>
                              ) : null}
                            </div>

                            {parts.length > 0 ? (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {parts.map((part, pi) => (
                                  <div key={pi}>
                                    <p className="font-display text-sm font-bold text-ink">
                                      {part.title}
                                    </p>
                                    {part.body ? (
                                      <p className="mt-0.5 whitespace-pre-line text-sm text-ink-muted">
                                        {part.body}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </details>
              </RevealOnScroll>
            );
          })}
        </div>
      </RevealOnScroll>
    </section>
  );
}
