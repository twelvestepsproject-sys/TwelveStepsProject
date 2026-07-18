"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "eshed-accessibility-prefs";

type FontSize = "normal" | "large" | "larger";
interface A11yPrefs {
  fontSize: FontSize;
  highContrast: boolean;
  grayscale: boolean;
}
const DEFAULT_PREFS: A11yPrefs = { fontSize: "normal", highContrast: false, grayscale: false };

/**
 * §5 block 20 (part) / §3 — Self-built accessibility toolbar: font size,
 * contrast, grayscale toggles, plus a reset. Client-side only, applies CSS
 * classes/custom properties to `<html>`, no backend — per the task brief's
 * explicit scope. §3 also lists "link highlight" as an accessibility
 * toolbar feature; NOT built here (deferred, not silently dropped — see
 * final report) since it needs a global stylesheet rule scoped carefully
 * enough not to fight the existing focus-visible treatment already in
 * place across every block, and that deserves its own pass rather than a
 * rushed addition here.
 *
 * Preferences persist to localStorage and are re-applied on mount. This is
 * intentionally client-only (a useEffect, not server-injected) — unlike
 * §3.5's theme-token injection (which must be SSR'd to avoid a flash of
 * the default palette on every load), a user's accessibility preference
 * is local-only and not part of the page's initial semantic content, so a
 * brief default-state flash before the effect runs is an acceptable
 * trade-off for not needing a cookie + server read just for this.
 */
export function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch {
      // Corrupt/unavailable storage -> fall back to defaults silently.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("a11y-font-large", prefs.fontSize === "large");
    root.classList.toggle("a11y-font-larger", prefs.fontSize === "larger");
    root.classList.toggle("a11y-high-contrast", prefs.highContrast);
    root.classList.toggle("a11y-grayscale", prefs.grayscale);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore write failures — preference just won't persist across reloads.
    }
  }, [prefs]);

  function cycleFontSize() {
    setPrefs((p) => ({
      ...p,
      fontSize: p.fontSize === "normal" ? "large" : p.fontSize === "large" ? "larger" : "normal",
    }));
  }

  return (
    <div className="fixed bottom-4 start-4 z-40 flex flex-col items-start gap-2">
      {open ? (
        <div
          role="region"
          aria-label="כלי נגישות"
          className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-2xl"
        >
          <button
            type="button"
            onClick={cycleFontSize}
            className="rounded-md px-3 py-2 text-start text-sm font-semibold text-ink transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            גודל טקסט: {prefs.fontSize === "normal" ? "רגיל" : prefs.fontSize === "large" ? "גדול" : "גדול מאוד"}
          </button>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, highContrast: !p.highContrast }))}
            aria-pressed={prefs.highContrast}
            className="rounded-md px-3 py-2 text-start text-sm font-semibold text-ink transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            ניגודיות גבוהה {prefs.highContrast ? "(פעיל)" : ""}
          </button>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, grayscale: !p.grayscale }))}
            aria-pressed={prefs.grayscale}
            className="rounded-md px-3 py-2 text-start text-sm font-semibold text-ink transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            גווני אפור {prefs.grayscale ? "(פעיל)" : ""}
          </button>
          <button
            type="button"
            onClick={() => setPrefs(DEFAULT_PREFS)}
            className="rounded-md border-t border-border px-3 py-2 pt-3 text-start text-sm text-ink-muted transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            איפוס
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="פתיחת כלי נגישות"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="4" r="2" fill="currentColor" />
          <path
            d="M4 8L12 10L20 8M12 10V22M8 14L12 22L16 14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
