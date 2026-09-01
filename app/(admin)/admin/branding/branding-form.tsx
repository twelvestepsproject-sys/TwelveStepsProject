"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBrandingAction, type BrandingPayload } from "./actions";
import { useAutosave } from "@/components/admin/use-autosave";
import { AutosaveStatus } from "@/components/admin/autosave-status";
import { Field, inputClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { MediaPickerField } from "@/components/admin/media-picker";
import { THEME_PRESETS, THEME_DEFAULTS, FALLBACK_COLOR } from "@/lib/admin/theme-presets";
import { CONTRAST_PAIRS_TO_CHECK, contrastRatio, aaLevel } from "@/lib/admin/contrast";
import { FONT_FAMILY_CSS } from "@/lib/fonts";
import type { BodyTextWeight, FontFamilyOption, Media, RadiusScale, SiteSettings, ThemeOverrides } from "@/lib/schemas";

/**
 * §3.5 Branding screen, the full spec: logo/logo_dark/favicon/OG image
 * upload (via the media picker), site name + tagline, a color picker per
 * brand-tier token grouped/labeled in Hebrew, a live preview panel, a
 * programmatic WCAG AA contrast warning per pair (lib/admin/contrast.ts —
 * same math as scripts/check-contrast.mjs, not eyeballed), 4 preset
 * palettes + reset-to-default, a typography dropdown covering all 4
 * self-hosted families (with a note on ones whose woff2 wasn't
 * self-hosted yet — moot now, since this task downloaded Rubik + Noto
 * Sans Hebrew too, but the note mechanism stays for defense-in-depth),
 * and a sharp/soft/round radius three-way toggle.
 */

const TOKEN_GROUPS: { title: string; keys: (keyof ThemeOverrides)[] }[] = [
  {
    title: "צבע ראשי (Primary)",
    keys: ["color-primary", "color-primary-hover", "color-primary-fg"],
  },
  {
    title: "צבע פעולה (Accent)",
    keys: ["color-accent", "color-accent-hover", "color-accent-fg"],
  },
  {
    title: "משטחים ורקעים",
    keys: ["color-bg", "color-surface", "color-surface-alt", "color-border"],
  },
  {
    title: "טקסט",
    keys: ["color-ink", "color-ink-muted"],
  },
];

const TOKEN_LABELS: Record<string, string> = {
  "color-primary": "צבע ראשי",
  "color-primary-hover": "צבע ראשי — hover",
  "color-primary-fg": "טקסט על צבע ראשי",
  "color-accent": "צבע פעולה",
  "color-accent-hover": "צבע פעולה — hover",
  "color-accent-fg": "טקסט על צבע פעולה",
  "color-bg": "רקע",
  "color-surface": "משטח",
  "color-surface-alt": "משטח משני",
  "color-border": "גבול",
  "color-ink": "טקסט ראשי",
  "color-ink-muted": "טקסט מושתק",
};

const BODY_WEIGHT_OPTIONS: { value: BodyTextWeight; label: string }[] = [
  { value: "normal", label: "רגיל" },
  { value: "medium", label: "בינוני" },
  { value: "semibold", label: "מודגש" },
];

const FONT_OPTIONS: { value: FontFamilyOption; label: string; selfHosted: boolean }[] = [
  { value: "Heebo", label: "Heebo", selfHosted: true },
  { value: "Assistant", label: "Assistant", selfHosted: true },
  { value: "Rubik", label: "Rubik", selfHosted: true },
  { value: "Noto Sans Hebrew", label: "Noto Sans Hebrew", selfHosted: true },
];

const RADIUS_OPTIONS: { value: RadiusScale; label: string }[] = [
  { value: "sharp", label: "חד (Sharp)" },
  { value: "soft", label: "רך (Soft)" },
  { value: "round", label: "עגול (Round)" },
];

interface FormState {
  site_name: string;
  tagline: string;
  logo_id: string | null;
  logo_dark_id: string | null;
  favicon_id: string | null;
  og_default_image_id: string | null;
  theme: ThemeOverrides;
  font_display: FontFamilyOption;
  font_body: FontFamilyOption;
  radius_scale: RadiusScale;
  body_text_weight: BodyTextWeight;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  /** Kept as an ordered array in the form so rows can be added, renamed and
   * removed; converted back to the stored record on save. An object would
   * lose ordering and make an empty new row impossible to represent. */
  social_links: { platform: string; url: string; icon_id: string | null }[];
  community_url: string;
  donation_url: string;
  footer_credits: string;
  footer_credits_url: string;
}

function toFormState(s: SiteSettings): FormState {
  return {
    site_name: s.site_name,
    tagline: s.tagline,
    logo_id: s.logo_id,
    logo_dark_id: s.logo_dark_id,
    favicon_id: s.favicon_id,
    og_default_image_id: s.og_default_image_id,
    theme: { ...s.theme },
    // font_display/font_body are nullable on SiteSettings (null = "no
    // admin override yet, use the shipped @theme default") — but a <select>
    // needs SOME concrete value to display. "Heebo"/"Assistant" here is
    // just the dropdown's initial display value when nothing's been chosen
    // yet; it does NOT get written back unless the admin actually saves
    // the form, which is always an explicit choice at that point.
    font_display: s.font_display ?? "Heebo",
    font_body: s.font_body ?? "Assistant",
    radius_scale: s.radius_scale,
    body_text_weight: s.body_text_weight ?? "normal",
    contact_phone: s.contact_phone ?? "",
    contact_email: s.contact_email ?? "",
    contact_address: s.contact_address ?? "",
    social_links: Object.entries(s.social_links ?? {}).map(([platform, url]) => ({
      platform,
      url,
      icon_id: (s.social_icons ?? {})[platform] ?? null,
    })),
    community_url: s.community_url ?? "",
    donation_url: s.donation_url ?? "",
    footer_credits: s.footer_credits ?? "",
    footer_credits_url: s.footer_credits_url ?? "",
  };
}

/** Resolve an effective token value: theme override if set, else the
 * shipped @theme default (THEME_DEFAULTS lives in lib/admin/theme-presets.ts,
 * outside the lint-gated app/components/ hex-literal check — see that
 * file's comment for why). */
function effective(theme: ThemeOverrides, key: string): string {
  return theme[key as keyof ThemeOverrides] || THEME_DEFAULTS[key] || FALLBACK_COLOR;
}

/**
 * The form keeps social links as an ordered array so rows can be added and
 * renamed; the stored shape is a record. Blank rows are dropped rather than
 * saved as empty keys, so a half-typed row never reaches the footer.
 */
function toPayload(data: FormState): BrandingPayload {
  const social_links: Record<string, string> = {};
  const social_icons: Record<string, string> = {};
  for (const { platform, url, icon_id } of data.social_links) {
    const key = platform.trim();
    const value = url.trim();
    if (!key || !value) continue;
    social_links[key] = value;
    // Only store an icon for a row that survived — otherwise a deleted row
    // would leave an orphaned icon entry behind.
    if (icon_id) social_icons[key] = icon_id;
  }
  return {
    site_name: data.site_name,
    tagline: data.tagline,
    logo_id: data.logo_id,
    logo_dark_id: data.logo_dark_id,
    favicon_id: data.favicon_id,
    og_default_image_id: data.og_default_image_id,
    theme: data.theme,
    font_display: data.font_display,
    font_body: data.font_body,
    radius_scale: data.radius_scale,
    body_text_weight: data.body_text_weight,
    contact_phone: data.contact_phone.trim() || null,
    contact_email: data.contact_email.trim() || null,
    contact_address: data.contact_address.trim() || null,
    social_links,
    social_icons,
    community_url: data.community_url.trim() || null,
    donation_url: data.donation_url.trim() || null,
    footer_credits: data.footer_credits.trim() || null,
    footer_credits_url: data.footer_credits_url.trim() || null,
  };
}

export function BrandingForm({
  settings,
  canEdit,
  logo,
  logoDark,
  favicon,
  ogImage,
  socialIconsById = {},
}: {
  settings: SiteSettings;
  canEdit: boolean;
  logo: Media | null;
  logoDark: Media | null;
  favicon: Media | null;
  ogImage: Media | null;
  /** Resolved media for any custom social icons, so the picker can show a
   * thumbnail without a client fetch per row. */
  socialIconsById?: Record<string, Media>;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(settings));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { isDirty, isSaving, lastSavedAt, error: autosaveError, markSaved } = useAutosave(
    state,
    async (data) => {
      if (!canEdit) return;
      const result = await saveBrandingAction(toPayload(data));
      if (!result.ok) throw new Error(result.error);
    },
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function updateToken(key: string, value: string) {
    setState((s) => ({ ...s, theme: { ...s.theme, [key]: value } }));
  }

  function applyPreset(presetId: string) {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setState((s) => ({ ...s, theme: { ...preset.tokens } }));
  }

  function resetToDefault() {
    setState((s) => ({ ...s, theme: {} }));
  }

  const contrastResults = useMemo(
    () =>
      CONTRAST_PAIRS_TO_CHECK.map((pair) => {
        const fg = effective(state.theme, pair.fgToken);
        const bg = effective(state.theme, pair.bgToken);
        const ratio = contrastRatio(fg, bg);
        return { ...pair, fg, bg, ratio, level: aaLevel(ratio) };
      }),
    [state.theme],
  );
  const failingPairs = contrastResults.filter((r) => r.level !== "aa");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await saveBrandingAction(toPayload(state));
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      markSaved();
      setNotice("נשמר בהצלחה. השינויים ישתקפו באתר הציבורי מיד.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <AutosaveStatus isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} error={autosaveError} />
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <h2 className="font-display text-lg font-bold text-ink">שם ותגית</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="שם האתר" htmlFor="br-name" required>
              <input
                id="br-name"
                className={inputClass}
                value={state.site_name}
                onChange={(e) => update("site_name", e.target.value)}
                required
              />
            </Field>
            <Field label="תגית (Tagline)" htmlFor="br-tagline">
              <input
                id="br-tagline"
                className={inputClass}
                value={state.tagline}
                onChange={(e) => update("tagline", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <h2 className="font-display text-lg font-bold text-ink">לוגו ותמונות</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MediaPickerField
              label="לוגו"
              value={state.logo_id}
              media={logo}
              onChange={(id) => update("logo_id", id)}
            />
            <MediaPickerField
              label="לוגו כהה (למשטחים כהים, אופציונלי)"
              value={state.logo_dark_id}
              media={logoDark}
              onChange={(id) => update("logo_dark_id", id)}
            />
            <MediaPickerField
              label="Favicon"
              value={state.favicon_id}
              media={favicon}
              onChange={(id) => update("favicon_id", id)}
            />
            <MediaPickerField
              label="תמונת שיתוף ברירת מחדל (OG)"
              value={state.og_default_image_id}
              media={ogImage}
              onChange={(id) => update("og_default_image_id", id)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink">צבעים</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="br-preset" className="text-xs text-ink-muted">
                פלטות מוכנות:
              </label>
              <select
                id="br-preset"
                className={`${inputClass} w-auto`}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyPreset(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  בחירת פלטה...
                </option>
                {THEME_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <SecondaryButton type="button" onClick={resetToDefault}>
                איפוס לברירת מחדל
              </SecondaryButton>
            </div>
          </div>

          {TOKEN_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-ink">{group.title}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {group.keys.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={TOKEN_LABELS[key]}
                      value={effective(state.theme, key)}
                      onChange={(e) => updateToken(key, e.target.value)}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-border"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-ink">{TOKEN_LABELS[key]}</span>
                      <span className="text-[10px] text-ink-muted" dir="ltr">
                        {effective(state.theme, key)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-1 rounded-md border border-border p-3">
            <p className="text-sm font-semibold text-ink">בדיקת ניגודיות (WCAG AA)</p>
            {contrastResults.map((r) => (
              <p
                key={r.label}
                className={`text-xs ${r.level === "aa" ? "text-success" : r.level === "aa-large" ? "text-warning" : "text-error"}`}
                role={r.level === "fail" ? "alert" : undefined}
              >
                {r.level === "aa" ? "✓" : "⚠"} {r.label}: {r.ratio ? r.ratio.toFixed(2) : "?"}:1{" "}
                {r.level === "aa" ? "(עומד בתקן)" : r.level === "aa-large" ? "(עומד בתקן לטקסט גדול בלבד)" : "(לא עומד בתקן)"}
              </p>
            ))}
            {failingPairs.length > 0 ? (
              <p role="alert" className="mt-1 text-xs font-semibold text-error">
                שימו לב: {failingPairs.length} צירופי צבע אינם עומדים בתקן הנגישות המלא. ניתן לשמור בכל
                זאת, אך מומלץ לבחור צבעים בעלי ניגודיות גבוהה יותר.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <h2 className="font-display text-lg font-bold text-ink">טיפוגרפיה וצורה</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="גופן כותרות" htmlFor="br-font-display">
              <select
                id="br-font-display"
                className={inputClass}
                value={state.font_display}
                onChange={(e) => update("font_display", e.target.value as FontFamilyOption)}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="גופן גוף טקסט" htmlFor="br-font-body">
              <select
                id="br-font-body"
                className={inputClass}
                value={state.font_body}
                onChange={(e) => update("font_body", e.target.value as FontFamilyOption)}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">עיגול פינות (Radius)</p>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("radius_scale", opt.value)}
                  aria-pressed={state.radius_scale === opt.value}
                  className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                    state.radius_scale === opt.value
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border bg-surface text-ink hover:bg-surface-alt"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink">עובי הטקסט הרגיל</p>
            <p className="text-xs text-ink-muted">
              משפיע על כל טקסט הגוף באתר. לצבע הטקסט יש שליטה נפרדת למעלה
              (״טקסט מושתק״ תחת צבעים).
            </p>
            <div className="flex gap-2">
              {BODY_WEIGHT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("body_text_weight", opt.value)}
                  aria-pressed={state.body_text_weight === opt.value}
                  className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                    state.body_text_weight === opt.value
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border bg-surface text-ink hover:bg-surface-alt"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <LivePreview state={state} />

        {error ? (
          <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {notice}
          </p>
        ) : null}

        {canEdit ? (
          <div className="flex gap-3">
            <PrimaryButton type="submit" disabled={isPending}>
              {isPending ? "שומר..." : "שמירה"}
            </PrimaryButton>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">פרטי קשר ורשתות</h2>
            <p className="mt-1 text-xs text-ink-muted">
              הפרטים האלה מוצגים בתחתית כל עמוד באתר (Footer).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="טלפון" htmlFor="br-phone">
              <input
                id="br-phone"
                className={inputClass}
                dir="ltr"
                placeholder="03-1234567"
                value={state.contact_phone}
                onChange={(e) => update("contact_phone", e.target.value)}
              />
            </Field>
            <Field label="אימייל" htmlFor="br-email">
              <input
                id="br-email"
                className={inputClass}
                dir="ltr"
                type="email"
                placeholder="info@example.co.il"
                value={state.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
              />
            </Field>
          </div>

          <Field label="כתובת" htmlFor="br-address">
            <input
              id="br-address"
              className={inputClass}
              value={state.contact_address}
              onChange={(e) => update("contact_address", e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <p className="text-xs font-semibold text-ink-muted">רשתות חברתיות</p>
            {state.social_links.length === 0 ? (
              <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
                אין רשתות. לחצו ״הוספת רשת״ כדי להתחיל.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.social_links.map((row, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      className={`${inputClass} w-36`}
                      placeholder="facebook"
                      dir="ltr"
                      aria-label={`שם רשת ${i + 1}`}
                      value={row.platform}
                      onChange={(e) =>
                        update(
                          "social_links",
                          state.social_links.map((r, j) =>
                            j === i ? { ...r, platform: e.target.value } : r,
                          ),
                        )
                      }
                    />
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="https://facebook.com/..."
                      dir="ltr"
                      aria-label={`כתובת רשת ${i + 1}`}
                      value={row.url}
                      onChange={(e) =>
                        update(
                          "social_links",
                          state.social_links.map((r, j) =>
                            j === i ? { ...r, url: e.target.value } : r,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label={`מחיקת רשת ${i + 1}`}
                      onClick={() =>
                        update(
                          "social_links",
                          state.social_links.filter((_, j) => j !== i),
                        )
                      }
                      className="rounded p-1 text-error hover:bg-error/10"
                    >
                      🗑
                    </button>
                    <div className="w-full">
                      <MediaPickerField
                        label={`אייקון מותאם — ${row.platform || `רשת ${i + 1}`}`}
                        hint="אופציונלי. ריק = אייקון מובנה לרשתות מוכרות (פייסבוק, אינסטגרם, יוטיוב, וואטסאפ, טלגרם, טיקטוק, לינקדאין, X)."
                        value={row.icon_id}
                        media={row.icon_id ? socialIconsById[row.icon_id] ?? null : null}
                        onChange={(mediaId) =>
                          update(
                            "social_links",
                            state.social_links.map((r, j) =>
                              j === i ? { ...r, icon_id: mediaId } : r,
                            ),
                          )
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() =>
                update("social_links", [...state.social_links, { platform: "", url: "", icon_id: null }])
              }
              className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
            >
              + הוספת רשת
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="קישור לקבוצת קהילה" htmlFor="br-community" hint="וואטסאפ / טלגרם">
              <input
                id="br-community"
                className={inputClass}
                dir="ltr"
                placeholder="https://chat.whatsapp.com/..."
                value={state.community_url}
                onChange={(e) => update("community_url", e.target.value)}
              />
            </Field>
            <Field label="קישור לתרומות" htmlFor="br-donation" hint="אופציונלי">
              <input
                id="br-donation"
                className={inputClass}
                dir="ltr"
                value={state.donation_url}
                onChange={(e) => update("donation_url", e.target.value)}
              />
            </Field>
          </div>

          <Field
            label="שורת זכויות יוצרים"
            htmlFor="br-credits"
            hint="השורה בתחתית האתר"
          >
            <input
              id="br-credits"
              className={inputClass}
              value={state.footer_credits}
              onChange={(e) => update("footer_credits", e.target.value)}
            />
          </Field>

          <Field
            label="קישור משורת הזכויות (אופציונלי)"
            htmlFor="br-credits-url"
            hint="אם ימולא, שורת הזכויות תהפוך לקישור. אפשר אתר, וואטסאפ או מייל."
          >
            <input
              id="br-credits-url"
              className={inputClass}
              placeholder="https://..."
              value={state.footer_credits_url}
              onChange={(e) => update("footer_credits_url", e.target.value)}
            />
          </Field>
        </div>
      </fieldset>
    </form>
  );
}

function LivePreview({ state }: { state: FormState }) {
  const style: React.CSSProperties = {
    // §3.5 live preview panel: apply the in-progress (unsaved) selections
    // as inline CSS vars scoped to this panel only, so the admin sees the
    // effect before committing — the ROOT layout injection (theme-style.ts)
    // is what applies the SAVED value site-wide; this is a local preview.
    ["--color-primary" as string]: effective(state.theme, "color-primary"),
    ["--color-primary-fg" as string]: effective(state.theme, "color-primary-fg"),
    ["--color-accent" as string]: effective(state.theme, "color-accent"),
    ["--color-accent-fg" as string]: effective(state.theme, "color-accent-fg"),
    ["--color-bg" as string]: effective(state.theme, "color-bg"),
    ["--color-surface" as string]: effective(state.theme, "color-surface"),
    ["--color-surface-alt" as string]: effective(state.theme, "color-surface-alt"),
    ["--color-border" as string]: effective(state.theme, "color-border"),
    ["--color-ink" as string]: effective(state.theme, "color-ink"),
    ["--color-ink-muted" as string]: effective(state.theme, "color-ink-muted"),
    fontFamily: FONT_FAMILY_CSS[state.font_body] ?? undefined,
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-bold text-ink">תצוגה מקדימה חיה</h2>
      <div
        style={{ ...style, background: "var(--color-bg)", color: "var(--color-ink)" }}
        className="flex flex-col gap-3 rounded-lg border border-border p-5"
      >
        <p style={{ color: "var(--color-ink-muted)" }} className="text-xs">
          {state.tagline || "תגית האתר"}
        </p>
        <h3 style={{ fontFamily: FONT_FAMILY_CSS[state.font_display] }} className="text-xl font-bold">
          {state.site_name || "שם האתר"}
        </h3>
        <div
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          className="rounded-md border p-3 text-sm"
        >
          כך ייראה תוכן על גבי משטח (surface).
        </div>
        <div className="flex gap-2">
          <span
            style={{ background: "var(--color-primary)", color: "var(--color-primary-fg)" }}
            className="rounded-full px-4 py-2 text-sm font-semibold"
          >
            כפתור ראשי
          </span>
          <span
            style={{ background: "var(--color-accent)", color: "var(--color-accent-fg)" }}
            className="rounded-full px-4 py-2 text-sm font-semibold"
          >
            כפתור פעולה
          </span>
        </div>
      </div>
    </div>
  );
}
