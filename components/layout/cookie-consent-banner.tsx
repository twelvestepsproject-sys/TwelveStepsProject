"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readConsent, writeConsent } from "@/lib/analytics/consent";

/**
 * §5 block 20 (part) — Cookie consent banner, one piece of `global_overlays`.
 * Client-side only, localStorage-based, no backend.
 *
 * The stored choice is now load-bearing: components/layout/analytics-tag
 * reads it and will not request gtag.js unless it says "accepted". Until
 * that existed this banner gated nothing, which made it a question whose
 * answer went nowhere. Both sides share lib/analytics/consent so the key
 * and the spelling cannot drift apart.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No stored choice — including when storage is unavailable — means ask
    // again. Failing open to the banner is right: the alternative is
    // treating an unreadable browser as consent.
    if (!readConsent()) setVisible(true);
  }, []);

  function dismiss(choice: "accepted" | "declined") {
    writeConsent(choice);
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
