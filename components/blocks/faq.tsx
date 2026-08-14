import type { z } from "zod";
import type { faqBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 23 — FAQ accordion. Static content from `data` only, no `db`
 * read.
 *
 * Built on native <details>/<summary> rather than a JS-driven disclosure:
 * it stays a Server Component (no client bundle for what is static text),
 * is keyboard-operable and screen-reader-announced by the browser for
 * free, and — importantly for an FAQ — its collapsed answers are still in
 * the DOM, so in-page search (Ctrl+F) and crawlers can reach them. That
 * covers §3's WCAG AA bar without hand-rolling the ARIA a custom
 * button/panel pair would need.
 *
 * Also emits FAQPage JSON-LD, which §9 specified ("FAQPage where FAQs
 * exist") but which had no data source until this block existed.
 */
type FaqData = z.infer<typeof faqBlockDataSchema>;

export function Faq({ data }: { data: FaqData }) {
  // A row with no question can't be opened or labelled, so it is dropped —
  // the admin form starts new rows empty, and an editor may save before
  // filling one in. An empty ANSWER is kept: "we'll publish this later" is
  // a legitimate half-state that still shows the question.
  const items = (data.items ?? []).filter((item) => item.question.trim() !== "");

  if (items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
      .filter((item) => item.answer.trim() !== "")
      .map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
  };

  return (
    <section className="bg-bg px-6 py-16">
      {jsonLd.mainEntity.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <RevealOnScroll className="mx-auto max-w-3xl">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{data.heading}</h2>

        {data.intro ? (
          <p className="mt-3 whitespace-pre-line text-ink-muted">{data.intro}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group rounded-md border border-border bg-surface transition-colors hover:border-primary/40 [&[open]]:border-primary/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-display font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span>{item.question}</span>
                {/* Rotates to a "−" look when open. aria-hidden because the
                    open/closed state is already announced by <details>. */}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-xl leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              {item.answer.trim() !== "" ? (
                <div className="border-t border-border px-4 py-3">
                  <p className="whitespace-pre-line text-ink-muted">{item.answer}</p>
                </div>
              ) : null}
            </details>
          ))}
        </div>
      </RevealOnScroll>
    </section>
  );
}
