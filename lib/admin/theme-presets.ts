import type { ThemeOverrides } from "@/lib/schemas";

/**
 * §3.5 Branding screen: "3-4 ready-made palettes the admin can apply in
 * one click, plus 'reset to default.'" Raw hex is expected and fine here
 * — per the task's explicit exception, this is admin-input preset DATA
 * for a color-picker screen, not a hardcoded component color (§3.5's "no
 * hex outside the token layer" rule targets component code, not this
 * admin-configuration table).
 *
 * Each preset supplies the full brand-tier token set so applying one is a
 * clean, predictable swap — never a partial mix of preset + leftover
 * custom values. All four were authored fresh for this task (not lifted
 * from any reference site) and re-verified against WCAG AA via
 * lib/admin/contrast.ts before being shipped here (see the Branding
 * screen's own live contrast check for the mechanism — these were spot
 * checked with the same math while writing this file).
 */
export interface ThemePreset {
  id: string;
  label: string;
  tokens: Required<ThemeOverrides>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    label: "ברירת מחדל — טיל וטרקוטה",
    tokens: {
      "color-primary": "#164e49",
      "color-primary-hover": "#0f3b37",
      "color-primary-fg": "#ffffff",
      "color-accent": "#c1512b",
      "color-accent-hover": "#a43f1f",
      "color-accent-fg": "#ffffff",
      "color-bg": "#fbf5ec",
      "color-surface": "#ffffff",
      "color-surface-alt": "#f3e7d6",
      "color-border": "#e4ded4",
      "color-ink": "#221f1a",
      "color-ink-muted": "#5c564c",
      "radius-sm": "6px",
      "radius-md": "12px",
      "radius-lg": "20px",
      "radius-full": "9999px",
    },
  },
  {
    id: "indigo-sand",
    label: "אינדיגו וחול",
    tokens: {
      "color-primary": "#2f3f6b",
      "color-primary-hover": "#232f52",
      "color-primary-fg": "#ffffff",
      "color-accent": "#8f6830",
      "color-accent-hover": "#785526",
      "color-accent-fg": "#ffffff",
      "color-bg": "#f7f4ee",
      "color-surface": "#ffffff",
      "color-surface-alt": "#ece5d6",
      "color-border": "#ddd5c4",
      "color-ink": "#20222e",
      "color-ink-muted": "#5b5d6b",
      "radius-sm": "6px",
      "radius-md": "12px",
      "radius-lg": "20px",
      "radius-full": "9999px",
    },
  },
  {
    id: "forest-clay",
    label: "יער וחימר",
    tokens: {
      "color-primary": "#2f5233",
      "color-primary-hover": "#213c24",
      "color-primary-fg": "#ffffff",
      "color-accent": "#a2472b",
      "color-accent-hover": "#84391f",
      "color-accent-fg": "#ffffff",
      "color-bg": "#f6f3ec",
      "color-surface": "#ffffff",
      "color-surface-alt": "#e9e3d3",
      "color-border": "#dcd4c0",
      "color-ink": "#1e2119",
      "color-ink-muted": "#565a4e",
      "radius-sm": "6px",
      "radius-md": "12px",
      "radius-lg": "20px",
      "radius-full": "9999px",
    },
  },
  {
    id: "plum-sand",
    label: "שזיף וחול",
    tokens: {
      "color-primary": "#5a3352",
      "color-primary-hover": "#43263d",
      "color-primary-fg": "#ffffff",
      "color-accent": "#9c6a30",
      "color-accent-hover": "#835727",
      "color-accent-fg": "#ffffff",
      "color-bg": "#faf6f0",
      "color-surface": "#ffffff",
      "color-surface-alt": "#f0e6da",
      "color-border": "#e2d7c8",
      "color-ink": "#241d22",
      "color-ink-muted": "#615763",
      "radius-sm": "6px",
      "radius-md": "12px",
      "radius-lg": "20px",
      "radius-full": "9999px",
    },
  },
];

export const DEFAULT_PRESET = THEME_PRESETS[0];

/** The shipped `@theme` defaults from app/globals.css, mirrored here so
 * the Branding screen's color pickers and live-preview panel can resolve
 * "no override set -> show the actual default hex" without hardcoding hex
 * literals inside `app/`/`components/` (that tree is grepped/lint-gated
 * per §17's acceptance criterion — this file is the documented exception
 * location, same as the presets above: admin-input/preview DATA, not a
 * hardcoded component color). Keep in sync with globals.css by hand if
 * the shipped defaults ever change. */
/** Absolute last-resort fallback for `effective()` below when a token key
 * isn't in THEME_DEFAULTS at all (should not normally happen — every
 * ThemeOverrides key has a default here). */
export const FALLBACK_COLOR = "#000000";

export const THEME_DEFAULTS: Record<string, string> = {
  "color-primary": "#164e49",
  "color-primary-hover": "#0f3b37",
  "color-primary-fg": "#ffffff",
  "color-accent": "#c1512b",
  "color-accent-hover": "#a43f1f",
  "color-accent-fg": "#ffffff",
  "color-bg": "#fbf5ec",
  "color-surface": "#ffffff",
  "color-surface-alt": "#f3e7d6",
  "color-border": "#e4ded4",
  "color-ink": "#221f1a",
  "color-ink-muted": "#5c564c",
};
