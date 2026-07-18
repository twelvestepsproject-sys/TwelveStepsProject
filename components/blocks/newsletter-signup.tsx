import type { z } from "zod";
import type { newsletterSignupBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 10 — Newsletter signup. Static form SHELL only — no `db` read,
 * no submit wiring. Actual submission goes through `db.subscribeNewsletter`
 * via a Server Action, which is Phase 4 territory (task brief explicitly
 * scopes this block to "form shell, no data read yet").
 */
type NewsletterSignupData = z.infer<typeof newsletterSignupBlockDataSchema>;

export function NewsletterSignup({ data }: { data: NewsletterSignupData }) {
  return (
    <section className="bg-surface-alt px-6 py-16">
      <RevealOnScroll className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {data.heading}
        </h2>
        {data.body ? <p className="text-ink-muted">{data.body}</p> : null}
        <form className="flex w-full flex-col gap-3 sm:flex-row" aria-label={data.heading}>
          <label htmlFor="newsletter-email" className="sr-only">
            כתובת אימייל
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            required
            placeholder="כתובת אימייל"
            className="flex-1 rounded-full border border-border bg-surface px-4 py-3 text-ink transition-colors placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
          >
            הרשמה
          </button>
        </form>
        <p className="text-xs text-ink-muted">
          {data.consent_text}{" "}
          <a
            href={data.privacy_link.href}
            className="underline underline-offset-2 transition-colors hover:text-ink"
          >
            {data.privacy_link.label}
          </a>
        </p>
      </RevealOnScroll>
    </section>
  );
}
