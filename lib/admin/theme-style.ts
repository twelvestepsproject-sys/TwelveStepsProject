import "server-only";
import type { SiteSettings } from "@/lib/schemas";
import { FONT_FAMILY_CSS } from "@/lib/fonts";

/**
 * §3.5: "The root layout calls db.getSiteSettings() and injects the
 * overrides as an inline <style> block on :root, AFTER the stylesheet.
 * Unset keys fall back to the @theme defaults automatically... Inject the
 * style server-side in the initial HTML. Don't apply it in a useEffect —
 * that flashes the default palette on every load."
 *
 * This was the missing half of the Branding screen before this pass: the
 * schema/DB side (`site_settings.theme jsonb`) already existed, but
 * nothing read it and injected it anywhere — a Branding screen that saves
 * values nobody renders is pointless (task brief). This module is that
 * missing piece, called from `app/layout.tsx`.
 */

const RADIUS_SCALE_VALUES: Record<SiteSettings["radius_scale"], Record<string, string>> = {
  sharp: { "radius-sm": "2px", "radius-md": "4px", "radius-lg": "8px", "radius-full": "9999px" },
  soft: { "radius-sm": "6px", "radius-md": "12px", "radius-lg": "20px", "radius-full": "9999px" },
  round: { "radius-sm": "10px", "radius-md": "20px", "radius-lg": "32px", "radius-full": "9999px" },
};

/** Very small allow-list check so `theme` values (admin-entered hex, via
 * an `<input type="color">` which always yields "#rrggbb") can't inject
 * arbitrary CSS through the inline <style> block — this is the one place
 * in the app where a raw string from the DB becomes literal CSS text. */
function isSafeCssValue(v: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$|^[0-9]+(\.[0-9]+)?(px|rem|em|%)$|^[a-zA-Z-]+$/.test(v.trim());
}

/** Build the full set of CSS variable overrides for :root from a
 * SiteSettings row: theme jsonb overrides + the radius_scale mapping.
 * `radius_scale` wins over any raw `theme["radius-*"]` value (the
 * three-way toggle IS the radius control per §3.5 — "One control,
 * whole-site effect" — a stray leftover raw override shouldn't fight it). */
export function buildThemeOverrides(settings: SiteSettings): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const [key, value] of Object.entries(settings.theme)) {
    if (typeof value === "string" && value && isSafeCssValue(value)) {
      overrides[key] = value;
    }
  }
  Object.assign(overrides, RADIUS_SCALE_VALUES[settings.radius_scale]);
  return overrides;
}

/** Render the inline <style> tag content. Returns null if there's nothing
 * to override (all defaults), so the caller can skip an empty <style>. */
export function renderThemeStyleTag(settings: SiteSettings): string | null {
  const overrides = buildThemeOverrides(settings);
  const entries = Object.entries(overrides);
  if (entries.length === 0) return null;
  const body = entries.map(([k, v]) => `--${k}:${v};`).join("");
  return `:root{${body}}`;
}

/** Font-family CSS var to attach at <html> level, honoring the admin's
 * font_display/font_body selection (§3.5 Typography dropdown). Falls back
 * to the shipped @theme defaults (--font-display/--font-body) when the
 * selected family has no self-hosted file yet — see lib/fonts.ts's
 * FONT_FAMILY_CSS comment for which families that currently applies to. */
export function fontFamilyVars(settings: SiteSettings): string {
  const display = FONT_FAMILY_CSS[settings.font_display] ?? "var(--font-display)";
  const body = FONT_FAMILY_CSS[settings.font_body] ?? "var(--font-body)";
  return `:root{--font-display:${display};--font-body:${body};}`;
}
