"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { submitNewsletterAction, type FormActionResult } from "@/lib/actions/public-forms";

/**
 * Client wrapper for the newsletter signup form (§5 block 10 / footer
 * reuse). Isolated from `newsletter-signup.tsx` so that component stays a
 * Server Component — only this small island needs client JS, per the task
 * brief's preference for `useActionState`/`useFormStatus` over a manual
 * fetch/onSubmit handler.
 */
const initialState: FormActionResult | null = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-accent-hover hover:shadow-lg active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {pending ? "שולח..." : "הרשמה"}
    </button>
  );
}

export function NewsletterForm({ heading }: { heading: string }) {
  const [state, formAction] = useActionState(submitNewsletterAction, initialState);
  const pathname = usePathname();

  if (state?.ok) {
    return (
      <p className="w-full rounded-full bg-surface px-4 py-3 text-sm font-semibold text-primary" role="status">
        {state.message}
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <form action={formAction} className="flex w-full flex-col gap-3 sm:flex-row" aria-label={heading}>
        <input type="hidden" name="source" value={pathname ?? undefined} />
        {/* Honeypot: hidden from real users (off-screen + not focusable),
            visible to naive bots that fill every field. Server Action treats
            a non-empty value as a bot and silently no-ops the write. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute h-0 w-0 overflow-hidden opacity-0"
        />
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
        <SubmitButton />
      </form>
      {state && !state.ok ? (
        <p className="text-sm text-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
