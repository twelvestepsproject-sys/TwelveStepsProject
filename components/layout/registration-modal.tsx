"use client";

import { useEffect, useState } from "react";

/**
 * §5 block 20 (part) — Registration modal, one piece of `global_overlays`.
 *
 * SCOPE (per task brief, explicit): UI SHELL ONLY. Form fields render,
 * client-side validation affordances (required/type=email/pattern for an
 * Israeli phone) are present, but there is NO working submit — no Server
 * Action, no `db.createLead()` call wired up. That's explicitly Phase 4
 * (§11: "Registration modal: ... -> leads. Israeli phone validation.
 * Honeypot + IP rate limit + Cloudflare Turnstile ... GTM event,
 * notification email"), not built here. Submitting this form currently
 * just prevents default and shows a "not yet wired up" note — it does NOT
 * silently no-op in a way that could look like a real submission succeeded.
 *
 * Opens via any `<a href="#registration-modal">` in the page (see
 * site-header.tsx's CTA) — implemented as a simple open/close state
 * toggled by a global custom event, so ANY future block/link across the
 * site can trigger it without prop-drilling through every layout file.
 * `global_overlays.registration_modal_enabled` (schema flag, already
 * defined in lib/schemas/blocks.ts) gates whether this even mounts.
 */
const OPEN_EVENT = "open-registration-modal";

/** Call from anywhere (e.g. an onClick) to open the modal without prop
 * drilling — dispatched as a plain DOM CustomEvent. */
export function openRegistrationModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }
}

export function RegistrationModal() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
      setSubmitted(false);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Also open on a same-page `#registration-modal` hash link click (the
  // header's CTA uses a plain <a href="#registration-modal">) without
  // requiring every caller to import openRegistrationModal().
  useEffect(() => {
    function onHashClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest?.('a[href="#registration-modal"]');
      if (target) {
        e.preventDefault();
        setOpen(true);
        setSubmitted(false);
      }
    }
    document.addEventListener("click", onHashClick);
    return () => document.removeEventListener("click", onHashClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-lg bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="registration-modal-title" className="font-display text-xl font-bold text-ink">
            תיאום שיחת היכרות
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="סגירה"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1 1L15 15M15 1L1 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <p className="rounded-md bg-surface-alt p-4 text-sm text-ink-muted" role="status">
            הטופס עדיין לא מחובר לשליחה אמיתית (שלב פיתוח הבא) — זהו תצוגה מקדימה של העיצוב בלבד.
          </p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <p className="text-sm text-ink-muted">
              השאירו פרטים ונחזור אליכם לתיאום שיחת היכרות קצרה, ללא התחייבות.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-first-name" className="text-sm font-semibold text-ink">
                  שם פרטי
                </label>
                <input
                  id="reg-first-name"
                  name="first_name"
                  type="text"
                  required
                  className="rounded-md border border-border bg-bg px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-last-name" className="text-sm font-semibold text-ink">
                  שם משפחה
                </label>
                <input
                  id="reg-last-name"
                  name="last_name"
                  type="text"
                  required
                  className="rounded-md border border-border bg-bg px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-email" className="text-sm font-semibold text-ink">
                אימייל
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                required
                className="rounded-md border border-border bg-bg px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-phone" className="text-sm font-semibold text-ink">
                טלפון
              </label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                required
                // Israeli mobile/landline: 0 + 1-2 digit area/prefix + 6-7
                // digits, 9-10 digits total, optional hyphens — a client-side
                // shape hint only; the real validation per §11 happens
                // server-side in the (not-yet-built) Server Action.
                pattern="0[0-9\-]{8,10}"
                placeholder="05X-XXXXXXX"
                className="rounded-md border border-border bg-bg px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-ink-muted">
              <input type="checkbox" name="consent" required className="mt-1" />
              <span>
                אני מאשר/ת יצירת קשר בהתאם ל
                <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
                  מדיניות הפרטיות
                </a>
                .
              </span>
            </label>
            <button
              type="submit"
              className="mt-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
            >
              שליחה
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
