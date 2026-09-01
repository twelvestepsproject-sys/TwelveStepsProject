"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "eshed-cookie-consent";

/**
 * §5 block 20 (part) — Cookie consent banner, one piece of `global_overlays`.
 * Client-side only, localStorage-based dismissal, no backend — per the
 * task brief's explicit scope for this piece. No cookie/analytics script
 * is actually gated behind this yet (no GTM wiring exists in the repo
 * today, confirmed by grep) — this banner establishes the UI and the
 * accept/dismiss persistence only; wiring real conditional script loading
 * behind the stored choice is a later phase's job once GTM/analytics is
 * actually added.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable (private mode / disabled) — fail open to
      // showing the banner once per page load rather than crashing.
      setVisible(true);
    }
  }, []);

  function dismiss(choice: "accepted" | "declined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Ignore write failures — the banner still hides for this session.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="הודעת עוגיות"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-2xl"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-ink-muted">
          אנחנו משתמשים בעוגיות כדי לשפר את חוויית הגלישה באתר. לפרטים נוספים ראו את{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
            מדיניות הפרטיות
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => dismiss("declined")}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            דחייה
          </button>
          <button
            type="button"
            onClick={() => dismiss("accepted")}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            קבלה
          </button>
        </div>
      </div>
    </div>
  );
}
