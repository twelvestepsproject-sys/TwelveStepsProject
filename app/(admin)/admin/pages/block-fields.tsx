"use client";

import { Field, inputClass, textareaClass } from "@/components/admin/fields";
import { MediaPickerField } from "@/components/admin/media-picker";
import type { Media, PageBlock } from "@/lib/schemas";

/**
 * Per-block-type EDIT forms for the Pages block editor (§8: "per-block
 * form generated from its zod schema"). Task brief explicitly allows a
 * judgment call between (a) a fully generic zod-shape → form-field mapper
 * for all 20 types, or (b) hand-written forms for the highest-value types
 * with a generic JSON-textarea fallback for the rest.
 *
 * Chose (b): hand-written forms for hero, leader_message,
 * trainings_carousel, about, focus_areas, pull_quote — these are the
 * blocks editors touch constantly (the client's very first ask was
 * literally "editing the Hero section") and their shapes are irregular
 * enough (nested link objects, an array of 3-4 cards, optional media)
 * that a fully generic mapper would need most of this same per-field
 * logic anyway to be usable by a non-technical admin. A true generic
 * zod-shape walker would produce a technically-complete but unusable UI
 * for e.g. `focus_areas.cards[]` (needs add/remove-card affordances, not
 * a raw array editor) — building that generic engine well is a bigger
 * lift than 6 targeted forms, for a one-pass admin tool with 20 types
 * where 6 are edited far more often than the rest.
 *
 * The other 14 types (video_testimonials, newsletter_signup,
 * testimonials_slider, lecturers_grid, program_stages, photo_gallery,
 * podcast, community_cta, latest_articles, closing_cta, footer,
 * global_overlays, header) fall back to a generic JSON-textarea editor
 * (see <GenericJsonFields> in page-editor.tsx) — flagged here as a
 * follow-up, not a silent gap: most of those are either singleton blocks
 * edited rarely (footer, header, global_overlays) or thin enough
 * (testimonials_slider/lecturers_grid/program_stages are just an optional
 * heading) that raw JSON is a low-cost stopgap, but a future pass should
 * still give each its own small form for a fully non-technical admin.
 */

type UpdateFn = (data: Record<string, unknown>) => void;

function LinkFields({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: { label: string; href: string; open_in_new_tab: boolean } | null;
  onChange: (link: { label: string; href: string; open_in_new_tab: boolean } | null) => void;
  required?: boolean;
}) {
  const v = value ?? { label: "", href: "", open_in_new_tab: false };
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-xs font-semibold text-ink-muted">{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="טקסט קישור"
          value={v.label}
          onChange={(e) => onChange({ ...v, label: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="כתובת (href)"
          value={v.href}
          onChange={(e) => onChange({ ...v, href: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-ink">
        <input
          type="checkbox"
          checked={v.open_in_new_tab}
          onChange={(e) => onChange({ ...v, open_in_new_tab: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        פתיחה בכרטיסייה חדשה
      </label>
      {!required ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="self-start text-xs text-ink-muted underline"
        >
          הסרת קישור
        </button>
      ) : null}
    </div>
  );
}

export function HeroFields({
  data,
  onChange,
  media,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
  media?: Media | null;
}) {
  const d = data as {
    eyebrow: string | null;
    heading: string;
    intro: string;
    phone_cta: string | null;
    primary_cta_label: string | null;
    background_media_id: string | null;
  };
  return (
    <div className="flex flex-col gap-3">
      <Field label="עיניים (eyebrow)" htmlFor="b-eyebrow">
        <input
          id="b-eyebrow"
          className={inputClass}
          value={d.eyebrow ?? ""}
          onChange={(e) => onChange({ ...d, eyebrow: e.target.value || null })}
        />
      </Field>
      <Field label="כותרת ראשית (H1)" htmlFor="b-heading" required>
        <input
          id="b-heading"
          className={inputClass}
          value={d.heading}
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
        />
      </Field>
      <Field label="טקסט פתיחה" htmlFor="b-intro" required>
        <textarea
          id="b-intro"
          className={textareaClass}
          value={d.intro}
          onChange={(e) => onChange({ ...d, intro: e.target.value })}
        />
      </Field>
      <Field label="טלפון ליצירת קשר (tel:)" htmlFor="b-phone">
        <input
          id="b-phone"
          className={inputClass}
          value={d.phone_cta ?? ""}
          onChange={(e) => onChange({ ...d, phone_cta: e.target.value || null })}
        />
      </Field>
      <Field label="טקסט כפתור פעולה ראשי" htmlFor="b-cta-label">
        <input
          id="b-cta-label"
          className={inputClass}
          value={d.primary_cta_label ?? ""}
          onChange={(e) => onChange({ ...d, primary_cta_label: e.target.value || null })}
        />
      </Field>
      <MediaPickerField
        label="תמונת רקע"
        value={d.background_media_id}
        media={media}
        onChange={(id) => onChange({ ...d, background_media_id: id })}
      />
    </div>
  );
}

export function LeaderMessageFields({
  data,
  onChange,
  media,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
  media?: Media | null;
}) {
  const d = data as {
    portrait_media_id: string | null;
    video_url: string | null;
    heading: string;
    body: string;
    link: { label: string; href: string; open_in_new_tab: boolean } | null;
  };
  return (
    <div className="flex flex-col gap-3">
      <MediaPickerField
        label="דיוקן"
        value={d.portrait_media_id}
        media={media}
        onChange={(id) => onChange({ ...d, portrait_media_id: id })}
      />
      <Field label="קישור וידאו (אופציונלי)" htmlFor="b-video">
        <input
          id="b-video"
          className={inputClass}
          value={d.video_url ?? ""}
          onChange={(e) => onChange({ ...d, video_url: e.target.value || null })}
        />
      </Field>
      <Field label="כותרת" htmlFor="b-heading" required>
        <input
          id="b-heading"
          className={inputClass}
          value={d.heading}
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
        />
      </Field>
      <Field label="תוכן המסר" htmlFor="b-body" required>
        <textarea
          id="b-body"
          className={textareaClass}
          value={d.body}
          onChange={(e) => onChange({ ...d, body: e.target.value })}
        />
      </Field>
      <LinkFields label="קישור יציאה" value={d.link} onChange={(link) => onChange({ ...d, link })} />
    </div>
  );
}

export function TrainingsCarouselFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as {
    heading: string;
    intro: string | null;
    featured_only: boolean;
    all_trainings_link: { label: string; href: string; open_in_new_tab: boolean } | null;
  };
  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת" htmlFor="b-heading" required>
        <input
          id="b-heading"
          className={inputClass}
          value={d.heading}
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
        />
      </Field>
      <Field label="טקסט פתיחה" htmlFor="b-intro">
        <textarea
          id="b-intro"
          className={textareaClass}
          value={d.intro ?? ""}
          onChange={(e) => onChange({ ...d, intro: e.target.value || null })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={d.featured_only}
          onChange={(e) => onChange({ ...d, featured_only: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        הצגת הכשרות מומלצות בלבד (במקום כל ההכשרות)
      </label>
      <LinkFields
        label='קישור "כל ההכשרות"'
        value={d.all_trainings_link}
        onChange={(link) => onChange({ ...d, all_trainings_link: link })}
      />
    </div>
  );
}

export function AboutFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as {
    icon: string | null;
    heading: string;
    subheading: string | null;
    body: string;
    cta: { label: string; href: string; open_in_new_tab: boolean } | null;
  };
  return (
    <div className="flex flex-col gap-3">
      <Field label="אייקון (שם/מזהה, אופציונלי)" htmlFor="b-icon">
        <input
          id="b-icon"
          className={inputClass}
          value={d.icon ?? ""}
          onChange={(e) => onChange({ ...d, icon: e.target.value || null })}
        />
      </Field>
      <Field label="כותרת" htmlFor="b-heading" required>
        <input
          id="b-heading"
          className={inputClass}
          value={d.heading}
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
        />
      </Field>
      <Field label="כותרת משנה" htmlFor="b-subheading">
        <input
          id="b-subheading"
          className={inputClass}
          value={d.subheading ?? ""}
          onChange={(e) => onChange({ ...d, subheading: e.target.value || null })}
        />
      </Field>
      <Field label="תוכן" htmlFor="b-body" required>
        <textarea
          id="b-body"
          className={textareaClass}
          value={d.body}
          onChange={(e) => onChange({ ...d, body: e.target.value })}
        />
      </Field>
      <LinkFields label="קישור פעולה" value={d.cta} onChange={(cta) => onChange({ ...d, cta })} />
    </div>
  );
}

export function FocusAreasFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as {
    heading: string | null;
    cards: { icon: string | null; title: string; body: string }[];
  };
  function updateCard(i: number, patch: Partial<{ icon: string | null; title: string; body: string }>) {
    const cards = d.cards.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange({ ...d, cards });
  }
  function addCard() {
    if (d.cards.length >= 4) return;
    onChange({ ...d, cards: [...d.cards, { icon: null, title: "כותרת", body: "תיאור." }] });
  }
  function removeCard(i: number) {
    if (d.cards.length <= 3) return;
    onChange({ ...d, cards: d.cards.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת (אופציונלי)" htmlFor="b-heading">
        <input
          id="b-heading"
          className={inputClass}
          value={d.heading ?? ""}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>
      <p className="text-xs text-ink-muted">3–4 כרטיסים.</p>
      {d.cards.map((card, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-muted">כרטיס {i + 1}</p>
            {d.cards.length > 3 ? (
              <button
                type="button"
                onClick={() => removeCard(i)}
                className="text-xs text-error underline"
              >
                הסרה
              </button>
            ) : null}
          </div>
          <input
            className={inputClass}
            placeholder="כותרת"
            value={card.title}
            onChange={(e) => updateCard(i, { title: e.target.value })}
          />
          <textarea
            className={`${textareaClass} min-h-16`}
            placeholder="תיאור"
            value={card.body}
            onChange={(e) => updateCard(i, { body: e.target.value })}
          />
        </div>
      ))}
      {d.cards.length < 4 ? (
        <button type="button" onClick={addCard} className="self-start text-sm text-primary underline">
          + הוספת כרטיס
        </button>
      ) : null}
    </div>
  );
}

export function PullQuoteFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as { quote: string };
  return (
    <Field label="ציטוט" htmlFor="b-quote" required>
      <textarea
        id="b-quote"
        className={textareaClass}
        value={d.quote}
        onChange={(e) => onChange({ ...d, quote: e.target.value })}
      />
    </Field>
  );
}

export function GenericJsonFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  return (
    <Field
      label="נתוני בלוק (JSON)"
      htmlFor="b-json"
      hint="לסוג בלוק זה עדיין אין טופס ייעודי — ניתן לערוך את הנתונים כ-JSON גולמי. טופס ייעודי הוא שיפור עתידי."
    >
      <textarea
        id="b-json"
        dir="ltr"
        className={`${textareaClass} min-h-40 font-mono text-xs`}
        defaultValue={JSON.stringify(data, null, 2)}
        onBlur={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
          } catch {
            // Invalid JSON — leave state untouched, the textarea keeps the
            // admin's in-progress edit rather than discarding it.
          }
        }}
      />
    </Field>
  );
}

export type { PageBlock };
