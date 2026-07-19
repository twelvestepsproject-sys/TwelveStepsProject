"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { submitContactAction, type FormActionResult } from "@/lib/actions/public-forms";

/**
 * Client wrapper for the `/tsor-kesher` contact form, wired to
 * `submitContactAction` (lib/actions/public-forms.ts) via `useActionState`
 * — writes a real row to `contact_messages`. Previously form markup with no
 * submission wiring at all (see docs/content-needed.md's "BUG — public
 * forms don't actually submit" section, which flagged this page too, per
 * §11's third form).
 */
const initialState: FormActionResult | null = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "שולח..." : "שליחה"}
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactAction, initialState);
  const pathname = usePathname();

  if (state?.ok) {
    return (
      <p className="rounded-md bg-surface-alt p-4 text-sm text-ink-muted" role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" aria-label="טופס יצירת קשר">
      <input type="hidden" name="source_page" value={pathname ?? undefined} />
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
      {state && !state.ok ? (
        <p className="rounded-md bg-error/10 p-3 text-sm text-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-name" className="text-sm font-semibold text-ink">
          שם מלא
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          className="rounded-md border border-border bg-surface px-4 py-2.5 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-email" className="text-sm font-semibold text-ink">
          אימייל
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          className="rounded-md border border-border bg-surface px-4 py-2.5 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-phone" className="text-sm font-semibold text-ink">
          טלפון (לא חובה)
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          className="rounded-md border border-border bg-surface px-4 py-2.5 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-sm font-semibold text-ink">
          הודעה
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className="rounded-md border border-border bg-surface px-4 py-2.5 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
