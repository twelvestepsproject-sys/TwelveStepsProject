import type { z } from "zod";
import type { aboutBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 8 — About (icon, heading, subheading, rich-text body, CTA).
 * Static content from `data` only — no `db` read.
 *
 * Rich text: §6 says `body` fields are Tiptap JSON, rendered to HTML
 * server-side per §2 ("JSON is the source of truth, rendered to HTML
 * server-side, sanitized on write"). That render pipeline (JSON -> HTML,
 * with sanitization) doesn't exist yet this early in the build — per the
 * task brief, this is explicitly out of scope for this pass ("that's
 * likely later work, don't over-scope"). `aboutBlockDataSchema.body` is
 * currently typed as a plain `z.string()` (confirmed in
 * lib/schemas/blocks.ts), so it's rendered as-is, as plain text via a
 * <p> — NOT dangerouslySetInnerHTML, since there is no sanitizer in front
 * of it yet and a plain string is not guaranteed-safe markup. Flagged here
 * and in docs/content-needed.md as a real, tracked gap: swap this for the
 * real Tiptap JSON -> sanitized-HTML renderer once that pipeline exists,
 * rather than rendering raw HTML now.
 */
type AboutData = z.infer<typeof aboutBlockDataSchema>;

export function About({ data }: { data: AboutData }) {
  return (
    <section className="bg-bg px-6 py-16">
      <RevealOnScroll className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        {data.icon ? (
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary"
            aria-hidden="true"
          >
            {data.icon}
          </span>
        ) : null}
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{data.heading}</h2>
        {data.subheading ? (
          <p className="font-display text-lg text-ink-muted">{data.subheading}</p>
        ) : null}
        {/* Plain-text render — see file header re: Tiptap JSON not wired up yet. */}
        <p className="whitespace-pre-line text-ink-muted">{data.body}</p>
        {data.cta ? (
          <a
            href={data.cta.href}
            target={data.cta.open_in_new_tab ? "_blank" : undefined}
            rel={data.cta.open_in_new_tab ? "noreferrer" : undefined}
            className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {data.cta.label}
          </a>
        ) : null}
      </RevealOnScroll>
    </section>
  );
}
