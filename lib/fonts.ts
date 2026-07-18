import localFont from "next/font/local";

/**
 * Self-hosted per §3 (hard constraint) and §16 Phase 2 step 1.
 * woff2 files downloaded from Google Fonts' gstatic CDN (hebrew + latin
 * unicode-range subsets only) and committed under /public/fonts — never
 * fetched from Google's CDN at runtime. SIL Open Font License 1.1.
 * See docs/licenses.md for source URLs.
 */
export const fontDisplay = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "../public/fonts/heebo-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/heebo-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/heebo-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/heebo-800.woff2", weight: "800", style: "normal" },
  ],
});

export const fontBody = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "../public/fonts/assistant-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/assistant-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/assistant-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/assistant-700.woff2", weight: "700", style: "normal" },
  ],
});

/**
 * Branding-screen Typography dropdown (§3.5) offers 4 self-hosted OFL
 * Hebrew families: Heebo, Assistant, Rubik, Noto Sans Hebrew. These two
 * were added when the Branding screen was built — the Hebrew-subset woff2
 * files were sourced the same way as Heebo/Assistant (downloaded and
 * committed under /public/fonts, never fetched from Google's CDN at
 * runtime). Both ship as variable fonts on Google Fonts, so a single
 * downloaded file covers the whole weight axis (one file declared at
 * several static weights below) — see docs/licenses.md.
 */
export const fontRubik = localFont({
  variable: "--font-rubik",
  display: "swap",
  src: [
    { path: "../public/fonts/rubik-hebrew-variable.woff2", weight: "400 800", style: "normal" },
  ],
});

export const fontNotoSansHebrew = localFont({
  variable: "--font-noto-sans-hebrew",
  display: "swap",
  src: [
    {
      path: "../public/fonts/noto-sans-hebrew-hebrew-variable.woff2",
      weight: "400 800",
      style: "normal",
    },
  ],
});

/** Maps a Branding-screen font selection to its CSS `font-family` value and
 * whether the corresponding woff2 is actually self-hosted yet — used by the
 * root layout to know which `next/font` variable classes to attach, and by
 * the Branding screen to show the "font file not yet uploaded" note. */
export const FONT_FAMILY_CSS: Record<string, string> = {
  Heebo: "var(--font-display)",
  Assistant: "var(--font-body)",
  Rubik: "var(--font-rubik)",
  "Noto Sans Hebrew": "var(--font-noto-sans-hebrew)",
};
