import type { z } from "zod";
import type { newsletterSignupBlockDataSchema } from "@/lib/schemas";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";
import { NewsletterForm } from "./newsletter-form";

/**
 * §5 block 10 — Newsletter signup. Stays a Server Component (reads `data`
 * only, no client state of its own); the actual form/submit logic lives in
 * the co-located `<NewsletterForm>` client component below, which wraps
 * `submitNewsletterAction` (lib/actions/public-forms.ts) via React 19's
 * `useActionState`. See docs/content-needed.md's "BUG — public forms don't
 * actually submit" section — this was previously a bare `<form>` with no
 * `action` at all.
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
        <NewsletterForm heading={data.heading} />
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
