/**
 * WCAG AA contrast-ratio math, shared by:
 *  - the Branding screen (`/admin/branding`), which must show a live warning
 *    next to any admin-chosen color pair that fails AA (§3.5: "Show a live
 *    preview panel and a contrast warning next to any pair that fails AA...
 *    compute this programmatically, don't eyeball it");
 *  - `scripts/check-contrast.mjs`, a standalone check over the shipped
 *    `@theme` defaults in `app/globals.css`, so the default token pairs stay
 *    provably AA-compliant as they're edited (§17: "Every default token pair
 *    passes WCAG AA").
 *
 * Pure math, no DOM/Node dependency, so the same module works both from a
 * "use client" component and from a plain `node script.mjs` (via a tiny
 * inline re-implementation there — see that script's header comment for why
 * it doesn't import this file directly).
 */

/** Parse "#rgb", "#rrggbb" (with or without leading '#') into 0-255 channels. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.1 §1.4.3 / G18. */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Contrast ratio between two hex colors, per WCAG 2.1: (L1+0.05)/(L2+0.05),
 * lighter over darker. Returns null if either hex is unparseable. */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export type AaLevel = "fail" | "aa-large" | "aa";

/** WCAG AA thresholds: 4.5:1 for normal text, 3:1 for large text (>=18pt or
 * >=14pt bold). We report the stricter "normal text" pass/fail plus a
 * distinct "aa-large" tier so the UI can show "passes for large text only"
 * rather than a flat pass/fail, matching how the token comments in
 * app/globals.css already reason about this (e.g. --color-accent-text). */
export function aaLevel(ratio: number | null): AaLevel {
  if (ratio == null) return "fail";
  if (ratio >= 4.5) return "aa";
  if (ratio >= 3) return "aa-large";
  return "fail";
}

export interface ContrastPair {
  /** Human label, Hebrew, for the Branding screen's warning list. */
  label: string;
  fgToken: string;
  bgToken: string;
}

/** The pairs worth checking whenever brand-tier tokens change — foreground
 * colors that actually render as text/icons over a given surface in the
 * live site. Not exhaustive (semantic success/error/warning are fixed and
 * already verified once in app/globals.css's own comments), but covers
 * every brand-tier combination a component actually uses. */
export const CONTRAST_PAIRS_TO_CHECK: ContrastPair[] = [
  { label: "טקסט על רקע ראשי (bg)", fgToken: "color-ink", bgToken: "color-bg" },
  { label: "טקסט על משטח (surface)", fgToken: "color-ink", bgToken: "color-surface" },
  { label: "טקסט על משטח משני (surface-alt)", fgToken: "color-ink", bgToken: "color-surface-alt" },
  { label: "טקסט מושתק על רקע ראשי", fgToken: "color-ink-muted", bgToken: "color-bg" },
  { label: "טקסט על כפתור ראשי (primary)", fgToken: "color-primary-fg", bgToken: "color-primary" },
  { label: "טקסט על כפתור פעולה (accent)", fgToken: "color-accent-fg", bgToken: "color-accent" },
];
