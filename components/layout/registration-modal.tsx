"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { submitRegistrationAction, type FormActionResult } from "@/lib/actions/public-forms";

/**
 * §5 block 20 (part) — Registration modal, one piece of `global_overlays`.
 *
 * Wired to `submitRegistrationAction` (lib/actions/public-forms.ts) via
 * React 19's `useActionState` — writes a real row to `leads`. Previously a
 * UI shell only (see docs/content-needed.md's "BUG — public forms don't
 * actually submit" section for the history): the form called
 * `preventDefault()` and showed a "not yet wired up" message instead of
 * submitting anywhere.
 *
 * Opens via any `<a href="#registration-modal">` in the page (see
 * site-header.tsx's CTA) — implemented as a simple open/close state
 * toggled by a global custom event, so ANY future block/link across the
 * site can trigger it without prop-drilling through every layout file.
 * `global_overlays.registration_modal_enabled` (schema flag, already
 * defined in lib/schemas/blocks.ts) gates whether this even mounts.
 */
const OPEN_EVENT = "open-registration-modal";
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

/** Call from anywhere (e.g. an onClick) to open the modal without prop
 * drilling — dispatched as a plain DOM CustomEvent. */
export function openRegistrationModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }
}

export function RegistrationModal({ trainings = [] }: { trainings?: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(submitRegistrationAction, initialState);
  const pathname = usePathname();

  // GTM event integration point: once a real GTM container is wired up
  // (§13 NEXT_PUBLIC_GTM_ID / site_settings.gtm_id — nothing exists yet in
  // this project), fire e.g. `window.dataLayer?.push({ event:
  // 'registration_submit' })` here when `state?.ok` flips true. Skipped for
  // now rather than faking an analytics call.
  useEffect(() => {
    function onOpen() {
      setOpen(true);
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

        {state?.ok ? (
          <p className="rounded-md bg-surface-alt p-4 text-sm text-ink-muted" role="status">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="source_page" value={pathname ?? undefined} />
            {/* Honeypot: hidden from real users (off-screen + not
                focusable), visible to naive bots that fill every field.
                Server Action treats a non-empty value as a bot and
                silently no-ops the write. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute h-0 w-0 overflow-hidden opacity-0"
            />
            <p className="text-sm text-ink-muted">
              השאירו פרטים ונחזור אליכם לתיאום שיחת היכרות קצרה, ללא התחייבות.
            </p>
            {state && !state.ok ? (
              <p className="rounded-md bg-error/10 p-3 text-sm text-error" role="alert">
                {state.message}
              </p>
            ) : null}
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
            {trainings.length > 0 ? (
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-interest" className="text-sm font-semibold text-ink">
                  באיזה מסלול מעוניינים?
                </label>
                <select
                  id="reg-interest"
                  name="interest"
                  className="rounded-md border border-border bg-bg px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <option value="">עדיין לא בטוח/ה</option>
                  {trainings.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <label className="flex items-start gap-2 text-sm text-ink-muted">
              <input type="checkbox" name="consent" required className="mt-1" />
              <span>
                אני מאשר/ת יצירת קשר בהתאם ל
                <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
                  מדיניות הפרטיות
                </Link>
                .
              </span>
            </label>
            {/* Marketing consent, separate from the privacy one above and
                deliberately NOT `required`: the form must still submit when
                someone declines mailings, or it stops being a consent at
                all. `defaultChecked` per the client's request — opt-out
                rather than opt-in. */}
            <label className="flex items-start gap-2 text-sm text-ink-muted">
              <input type="checkbox" name="marketing_consent" defaultChecked className="mt-1" />
              <span>אני מאשר/ת קבלת עדכונים ודיוור על תוכניות, מאמרים ואירועים.</span>
            </label>
            <SubmitButton />
          </form>
        )}
      </div>
    </div>
  );
}
