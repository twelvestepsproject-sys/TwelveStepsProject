import localFont from "next/font/local";

/**
 * Self-hosted per §3 (hard constraint) and §16 Phase 2 step 1.
 * woff2 files downloaded from Google Fonts' gstatic CDN (hebrew + latin
 * unicode-range subsets only) and committed under /public/fonts — never
 * fetched from Google's CDN at runtime. SIL Open Font License 1.1.
 * See docs/licenses.md for source URLs.
 */
export const fontDisplay = localFont({
  variable: "--font-heebo",
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

/**
 * Motion/design-direction pass (2026-07): approved new ACTIVE site display
 * font. `fontDisplay` (Heebo, above) used to feed the `--font-display` CSS
 * variable directly; that variable is now Fredoka's slot instead, so Heebo
 * was moved onto its own `--font-heebo` variable (see edit above) to avoid
 * colliding with it. `--font-display` in app/globals.css's `@theme` block
 * was repointed to reference this font's variable (with the Heebo woff2
 * chain kept as the CSS fallback family name) — see that file's comment.
 * Heebo remains fully available and unchanged as an admin Branding-screen
 * Typography-dropdown option (`FONT_FAMILY_CSS.Heebo` below now points at
 * `var(--font-heebo)` directly, so picking "Heebo" in /admin still renders
 * actual Heebo, not Fredoka).
 * Sourced the same way as Rubik/Noto Sans Hebrew: Google Fonts CSS2 API,
 * hebrew-subset variable woff2, downloaded and committed under
 * /public/fonts, never fetched from Google's CDN at runtime. SIL Open Font
 * License 1.1. See docs/licenses.md.
 */
export const fontFredoka = localFont({
  variable: "--font-fredoka",
  display: "swap",
  src: [{ path: "../public/fonts/fredoka-hebrew-variable.woff2", weight: "400 700", style: "normal" }],
});

/** Maps a Branding-screen font selection to its CSS `font-family` value and
 * whether the corresponding woff2 is actually self-hosted yet — used by the
 * root layout to know which `next/font` variable classes to attach, and by
 * the Branding screen to show the "font file not yet uploaded" note.
 * NOTE: "Heebo" maps to `var(--font-heebo)` (its own dedicated variable),
 * NOT `var(--font-display)` — `--font-display` is the theme's "current
 * active display font" slot (now Fredoka by default), so this dropdown
 * option must reference Heebo's font loader directly to keep rendering
 * actual Heebo regardless of what the active display font is. */
export const FONT_FAMILY_CSS: Record<string, string> = {
  Heebo: "var(--font-heebo)",
  Assistant: "var(--font-body)",
  Rubik: "var(--font-rubik)",
  "Noto Sans Hebrew": "var(--font-noto-sans-hebrew)",
};

/**
 * EMETMATRIX design system (2026-11, Roni's chapter-page direction).
 *
 * Secular One for display, IBM Plex Mono for the small Latin eyebrow
 * labels ("CHAPTER B"). Assistant is already loaded above as `fontBody`
 * and is reused for running text rather than loaded twice.
 *
 * Self-hosted like every other family here, NOT linked from Google's CDN:
 * §3 makes that a hard constraint, so the woff2 subsets were downloaded
 * from gstatic and committed under /public/fonts. Secular One ships
 * hebrew + latin subsets; IBM Plex Mono only ever renders Latin labels,
 * so only its latin subset is carried. SIL Open Font License 1.1.
 * See docs/licenses.md for source URLs.
 *
 * Scoped to the (emet) route group by its layout — adding these variables
 * does not change how הנני's pages render.
 */
export const fontSecularOne = localFont({
  variable: "--font-secular-one",
  display: "swap",
  src: [
    { path: "../public/fonts/secular-one-hebrew.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/secular-one-latin.woff2", weight: "400", style: "normal" },
  ],
});

export const fontPlexMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  src: [
    { path: "../public/fonts/ibm-plex-mono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/ibm-plex-mono-600-latin.woff2", weight: "600", style: "normal" },
  ],
});
