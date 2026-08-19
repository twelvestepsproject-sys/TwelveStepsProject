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

/**
 * Training details panel. Every field is optional (client request) and the
 * renderer drops empty rows, so there is no `required` here and no
 * validation beyond "whatever the editor typed."
 *
 * Dates use `type="date"` for a picker, but the stored value is the plain
 * string the input yields (YYYY-MM-DD) — the block schema types these as
 * strings, not dates, so an editor can also clear one back to empty. The
 * numeric-looking fields (sessions/hours/semesters) are deliberately text
 * inputs, not `type="number"`: editors write things like "כ-30" or
 * "2 (סתיו ואביב)", which a number input would silently reject.
 */
export function TrainingDetailsFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as {
    heading: string | null;
    starts_on: string | null;
    ends_on: string | null;
    meeting_day: string | null;
    meeting_time: string | null;
    sessions_count: string | null;
    academic_hours: string | null;
    price: string | null;
    semesters_count: string | null;
    location?: string | null;
    duration?: string | null;
    cohort_number?: string | null;
    registration_link: { label: string; href: string; open_in_new_tab: boolean } | null;
  };
  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת האזור" htmlFor="td-heading" hint="ריק = ללא כותרת מעל הפרטים">
        <input
          id="td-heading"
          className={inputClass}
          value={d.heading ?? ""}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>

      <p className="text-xs text-ink-muted">
        כל השדות אופציונליים — שדה שיישאר ריק פשוט לא יוצג באתר.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="תאריך התחלה" htmlFor="td-starts">
          <input
            id="td-starts"
            type="date"
            className={inputClass}
            value={d.starts_on ?? ""}
            onChange={(e) => onChange({ ...d, starts_on: e.target.value || null })}
          />
        </Field>
        <Field label="תאריך סיום" htmlFor="td-ends">
          <input
            id="td-ends"
            type="date"
            className={inputClass}
            value={d.ends_on ?? ""}
            onChange={(e) => onChange({ ...d, ends_on: e.target.value || null })}
          />
        </Field>
        <Field label="יום מפגש" htmlFor="td-day" hint="לדוגמה: יום שלישי">
          <input
            id="td-day"
            className={inputClass}
            value={d.meeting_day ?? ""}
            onChange={(e) => onChange({ ...d, meeting_day: e.target.value || null })}
          />
        </Field>
        <Field label="שעת מפגש" htmlFor="td-time" hint="לדוגמה: 17:00–20:30">
          <input
            id="td-time"
            className={inputClass}
            value={d.meeting_time ?? ""}
            onChange={(e) => onChange({ ...d, meeting_time: e.target.value || null })}
          />
        </Field>
        <Field label="מספר מפגשים" htmlFor="td-sessions">
          <input
            id="td-sessions"
            className={inputClass}
            value={d.sessions_count ?? ""}
            onChange={(e) => onChange({ ...d, sessions_count: e.target.value || null })}
          />
        </Field>
        <Field label="שעות אקדמיות" htmlFor="td-hours">
          <input
            id="td-hours"
            className={inputClass}
            value={d.academic_hours ?? ""}
            onChange={(e) => onChange({ ...d, academic_hours: e.target.value || null })}
          />
        </Field>
        <Field label="מספר סמסטרים" htmlFor="td-semesters">
          <input
            id="td-semesters"
            className={inputClass}
            value={d.semesters_count ?? ""}
            onChange={(e) => onChange({ ...d, semesters_count: e.target.value || null })}
          />
        </Field>
        <Field label="משך המסלול" htmlFor="td-duration" hint="לדוגמה: 3 שנים">
          <input
            id="td-duration"
            className={inputClass}
            value={d.duration ?? ""}
            onChange={(e) => onChange({ ...d, duration: e.target.value || null })}
          />
        </Field>
        <Field label="מספר מחזור" htmlFor="td-cohort" hint="לדוגמה: מחזור 5">
          <input
            id="td-cohort"
            className={inputClass}
            value={d.cohort_number ?? ""}
            onChange={(e) => onChange({ ...d, cohort_number: e.target.value || null })}
          />
        </Field>
        <Field label="מיקום" htmlFor="td-location" hint="לדוגמה: תל אביב · היברידי">
          <input
            id="td-location"
            className={inputClass}
            value={d.location ?? ""}
            onChange={(e) => onChange({ ...d, location: e.target.value || null })}
          />
        </Field>
        <Field label="מחיר" htmlFor="td-price" hint="טקסט חופשי, לדוגמה: 3,500 ₪">
          <input
            id="td-price"
            className={inputClass}
            value={d.price ?? ""}
            onChange={(e) => onChange({ ...d, price: e.target.value || null })}
          />
        </Field>
      </div>

      <LinkFields
        label="קישור הרשמה"
        value={d.registration_link}
        onChange={(registration_link) => onChange({ ...d, registration_link })}
      />
    </div>
  );
}

/**
 * Requirements list. One text input per requirement, with add/remove and
 * ↑↓ reordering — the "add and remove freely" the client asked for.
 *
 * Rows are keyed by index rather than by a generated id: the list is a
 * plain `string[]` (see the schema note on why it isn't objects), so there
 * is no stable id to key on. That is safe here because every mutation
 * rebuilds the whole array through `onChange` and the inputs are
 * controlled — React re-renders values from state rather than preserving
 * per-row DOM identity across a reorder.
 */
export function RequirementsFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as { heading: string; intro: string | null; items?: string[] };
  const items = d.items ?? [];

  function updateItem(index: number, value: string) {
    onChange({ ...d, items: items.map((it, i) => (i === index ? value : it)) });
  }

  function addItem() {
    onChange({ ...d, items: [...items, ""] });
  }

  function removeItem(index: number) {
    onChange({ ...d, items: items.filter((_, i) => i !== index) });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...d, items: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת" htmlFor="rq-heading" required>
        <input
          id="rq-heading"
          className={inputClass}
          value={d.heading}
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
        />
      </Field>

      <Field label="טקסט פתיחה" htmlFor="rq-intro" hint="אופציונלי — פסקה קצרה מעל הרשימה">
        <textarea
          id="rq-intro"
          className={textareaClass}
          value={d.intro ?? ""}
          onChange={(e) => onChange({ ...d, intro: e.target.value || null })}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-xs font-semibold text-ink-muted">רשימת הדרישות</p>

        {items.length === 0 ? (
          <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
            אין דרישות ברשימה. לחצו ״הוספת דרישה״ כדי להתחיל.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-xs text-ink-muted">{i + 1}.</span>
                <input
                  className={inputClass}
                  value={item}
                  placeholder="לדוגמה: תואר ראשון במקצועות הטיפול"
                  onChange={(e) => updateItem(i, e.target.value)}
                  aria-label={`דרישה ${i + 1}`}
                />
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    aria-label="הזזה למעלה"
                    className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    aria-label="הזזה למטה"
                    className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    aria-label={`מחיקת דרישה ${i + 1}`}
                    className="rounded p-1 text-error hover:bg-error/10"
                  >
                    🗑
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addItem}
          className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
        >
          + הוספת דרישה
        </button>
      </div>
    </div>
  );
}

/**
 * Program stages. The stage/step CONTENT lives in the program_stages
 * tables and is edited at /admin/program-stages — this form only controls
 * the heading and the two auto-generated prefixes, so the note says where
 * the rest is edited rather than leaving an editor hunting for it.
 */
export function ProgramStagesFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as {
    heading: string | null;
    stage_label?: string | null;
    step_label?: string | null;
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
        השלבים והצעדים עצמם נערכים במסך ״שלבי התוכנית״ בתפריט הניהול. כאן נקבעים
        הכותרת והמילים שמופיעות לפני המספרים.
      </p>
      <Field label="כותרת" htmlFor="ps-heading" hint="ריק = ללא כותרת">
        <input
          id="ps-heading"
          className={inputClass}
          value={d.heading ?? ""}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>
      <Field label="המילה לפני מספר השלב" htmlFor="ps-stage-label" hint="ריק = ״שלב״">
        <input
          id="ps-stage-label"
          className={inputClass}
          placeholder="שלב"
          value={d.stage_label ?? ""}
          onChange={(e) => onChange({ ...d, stage_label: e.target.value || null })}
        />
      </Field>
      <Field label="המילה לפני מספר הצעד" htmlFor="ps-step-label" hint="ריק = ״צעד״">
        <input
          id="ps-step-label"
          className={inputClass}
          placeholder="צעד"
          value={d.step_label ?? ""}
          onChange={(e) => onChange({ ...d, step_label: e.target.value || null })}
        />
      </Field>
    </div>
  );
}

/**
 * Semesters — three nested editable levels (semester → session → part).
 *
 * Everything is driven through one `setSemesters` that rebuilds the whole
 * array, rather than per-level state: `onChange` already replaces the
 * block's entire `data`, so keeping a single immutable update path avoids
 * three sets of nearly-identical add/remove/move handlers getting out of
 * sync. Rows are keyed by index for the same reason as the other list
 * blocks — the data carries no stable id, and inputs are controlled.
 *
 * Sessions and parts are collapsed behind <details> so a semester with
 * fifteen sessions stays navigable in the admin.
 */
type SemesterPart = { title: string; body: string | null };
type SemesterSession = { label: string; date: string | null; parts: SemesterPart[] };
type Semester = { title: string; subtitle: string | null; sessions: SemesterSession[] };

function moveInArray<T>(arr: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Small ↑ ↓ 🗑 cluster, repeated at all three nesting levels. */
function RowControls({
  onUp,
  onDown,
  onRemove,
  removeLabel,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onUp}
        aria-label="הזזה למעלה"
        className="rounded p-1 text-ink-muted hover:bg-surface-alt"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDown}
        aria-label="הזזה למטה"
        className="rounded p-1 text-ink-muted hover:bg-surface-alt"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="rounded p-1 text-error hover:bg-error/10"
      >
        🗑
      </button>
    </span>
  );
}

export function SemestersFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as { heading: string | null; semesters?: Semester[] };
  const semesters = d.semesters ?? [];

  function setSemesters(next: Semester[]) {
    onChange({ ...d, semesters: next });
  }

  function updateSemester(si: number, patch: Partial<Semester>) {
    setSemesters(semesters.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  }

  function updateSessions(si: number, sessions: SemesterSession[]) {
    updateSemester(si, { sessions });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת האזור" htmlFor="sem-heading" hint="אופציונלי">
        <input
          id="sem-heading"
          className={inputClass}
          value={d.heading ?? ""}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>

      {semesters.length === 0 ? (
        <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
          אין סמסטרים. לחצו ״הוספת סמסטר״ כדי להתחיל.
        </p>
      ) : null}

      {semesters.map((semester, si) => {
        const sessions = semester.sessions ?? [];
        return (
          <div key={si} className="flex flex-col gap-2 rounded-md border-2 border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-ink">סמסטר {si + 1}</span>
              <RowControls
                onUp={() => setSemesters(moveInArray(semesters, si, -1))}
                onDown={() => setSemesters(moveInArray(semesters, si, 1))}
                onRemove={() => setSemesters(semesters.filter((_, i) => i !== si))}
                removeLabel={`מחיקת סמסטר ${si + 1}`}
              />
            </div>

            <input
              className={inputClass}
              value={semester.title}
              placeholder="כותרת הסמסטר (לדוגמה: סמסטר א׳ — תשתיות)"
              aria-label={`כותרת סמסטר ${si + 1}`}
              onChange={(e) => updateSemester(si, { title: e.target.value })}
            />
            <input
              className={inputClass}
              value={semester.subtitle ?? ""}
              placeholder="כותרת משנה (לדוגמה: 90 ש״א · 15 מפגשים)"
              aria-label={`כותרת משנה סמסטר ${si + 1}`}
              onChange={(e) => updateSemester(si, { subtitle: e.target.value || null })}
            />

            <div className="flex flex-col gap-2 rounded border border-dashed border-border p-2">
              <p className="text-xs font-semibold text-ink-muted">מפגשים ({sessions.length})</p>

              {sessions.map((session, xi) => {
                const parts = session.parts ?? [];
                return (
                  <details key={xi} className="rounded border border-border bg-surface-alt/30">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-2">
                      <span className="text-sm text-ink">
                        {session.label || `מפגש ${xi + 1}`}
                        {session.date ? (
                          <span className="text-xs text-ink-muted"> · {session.date}</span>
                        ) : null}
                      </span>
                      <RowControls
                        onUp={() => updateSessions(si, moveInArray(sessions, xi, -1))}
                        onDown={() => updateSessions(si, moveInArray(sessions, xi, 1))}
                        onRemove={() =>
                          updateSessions(
                            si,
                            sessions.filter((_, i) => i !== xi),
                          )
                        }
                        removeLabel={`מחיקת מפגש ${xi + 1}`}
                      />
                    </summary>

                    <div className="flex flex-col gap-2 border-t border-border p-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          className={inputClass}
                          value={session.label}
                          placeholder="כותרת (לדוגמה: מפגש 1)"
                          aria-label={`כותרת מפגש ${xi + 1}`}
                          onChange={(e) =>
                            updateSessions(
                              si,
                              sessions.map((s, i) =>
                                i === xi ? { ...s, label: e.target.value } : s,
                              ),
                            )
                          }
                        />
                        <input
                          className={inputClass}
                          value={session.date ?? ""}
                          placeholder="תאריך (אופציונלי, לדוגמה: 11.11.26)"
                          aria-label={`תאריך מפגש ${xi + 1}`}
                          onChange={(e) =>
                            updateSessions(
                              si,
                              sessions.map((s, i) =>
                                i === xi ? { ...s, date: e.target.value || null } : s,
                              ),
                            )
                          }
                        />
                      </div>

                      <p className="text-xs font-semibold text-ink-muted">תוכן המפגש</p>
                      {parts.map((part, pi) => (
                        <div key={pi} className="flex flex-col gap-1 rounded border border-border p-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              className={inputClass}
                              value={part.title}
                              placeholder="כותרת (לדוגמה: שיעור א׳)"
                              aria-label={`כותרת חלק ${pi + 1}`}
                              onChange={(e) =>
                                updateSessions(
                                  si,
                                  sessions.map((s, i) =>
                                    i === xi
                                      ? {
                                          ...s,
                                          parts: parts.map((p, j) =>
                                            j === pi ? { ...p, title: e.target.value } : p,
                                          ),
                                        }
                                      : s,
                                  ),
                                )
                              }
                            />
                            <RowControls
                              onUp={() =>
                                updateSessions(
                                  si,
                                  sessions.map((s, i) =>
                                    i === xi ? { ...s, parts: moveInArray(parts, pi, -1) } : s,
                                  ),
                                )
                              }
                              onDown={() =>
                                updateSessions(
                                  si,
                                  sessions.map((s, i) =>
                                    i === xi ? { ...s, parts: moveInArray(parts, pi, 1) } : s,
                                  ),
                                )
                              }
                              onRemove={() =>
                                updateSessions(
                                  si,
                                  sessions.map((s, i) =>
                                    i === xi
                                      ? { ...s, parts: parts.filter((_, j) => j !== pi) }
                                      : s,
                                  ),
                                )
                              }
                              removeLabel={`מחיקת חלק ${pi + 1}`}
                            />
                          </div>
                          <textarea
                            className={textareaClass}
                            value={part.body ?? ""}
                            placeholder="טקסט"
                            aria-label={`טקסט חלק ${pi + 1}`}
                            onChange={(e) =>
                              updateSessions(
                                si,
                                sessions.map((s, i) =>
                                  i === xi
                                    ? {
                                        ...s,
                                        parts: parts.map((p, j) =>
                                          j === pi ? { ...p, body: e.target.value || null } : p,
                                        ),
                                      }
                                    : s,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          updateSessions(
                            si,
                            sessions.map((s, i) =>
                              i === xi ? { ...s, parts: [...parts, { title: "", body: null }] } : s,
                            ),
                          )
                        }
                        className="self-start rounded-md border border-border px-2 py-1 text-xs text-ink hover:border-primary hover:text-primary"
                      >
                        + הוספת חלק
                      </button>
                    </div>
                  </details>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  updateSessions(si, [
                    ...sessions,
                    {
                      label: `מפגש ${sessions.length + 1}`,
                      date: null,
                      parts: [{ title: "", body: null }],
                    },
                  ])
                }
                className="self-start rounded-md border border-border px-2 py-1 text-xs text-ink hover:border-primary hover:text-primary"
              >
                + הוספת מפגש
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          setSemesters([...semesters, { title: "", subtitle: null, sessions: [] }])
        }
        className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
      >
        + הוספת סמסטר
      </button>
    </div>
  );
}

/**
 * Certificates. Add/remove/reorder of media slots with an optional caption
 * each. No alt-text field here on purpose: alt text lives on the `media`
 * row (mandatory at upload per §3), so editing it in two places would let
 * them disagree.
 */
export function CertificatesFields({
  data,
  onChange,
  mediaById,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
  mediaById: Record<string, Media>;
}) {
  type Item = { media_id: string | null; caption: string | null };
  const d = data as { heading: string; intro: string | null; items?: Item[] };
  const items = d.items ?? [];

  function updateItem(index: number, patch: Partial<Item>) {
    onChange({ ...d, items: items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });
  }

  function addItem() {
    onChange({ ...d, items: [...items, { media_id: null, caption: null }] });
  }

  function removeItem(index: number) {
    onChange({ ...d, items: items.filter((_, i) => i !== index) });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...d, items: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת" htmlFor="cert-heading" required>
        <input
          id="cert-heading"
          className={inputClass}
          value={d.heading}
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
        />
      </Field>

      <Field label="טקסט" htmlFor="cert-intro" hint="אופציונלי — הסבר קצר מתחת לכותרת">
        <textarea
          id="cert-intro"
          className={textareaClass}
          value={d.intro ?? ""}
          onChange={(e) => onChange({ ...d, intro: e.target.value || null })}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-xs font-semibold text-ink-muted">תמונות התעודות</p>

        {items.length === 0 ? (
          <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
            אין תעודות. לחצו ״הוספת תעודה״ כדי להתחיל.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-muted">תעודה {i + 1}</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      aria-label="הזזה למעלה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      aria-label="הזזה למטה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label={`מחיקת תעודה ${i + 1}`}
                      className="rounded p-1 text-error hover:bg-error/10"
                    >
                      🗑
                    </button>
                  </span>
                </div>

                <MediaPickerField
                  label="תמונת התעודה"
                  value={item.media_id}
                  media={item.media_id ? mediaById[item.media_id] : null}
                  onChange={(mediaId) => updateItem(i, { media_id: mediaId })}
                />

                <input
                  className={inputClass}
                  value={item.caption ?? ""}
                  placeholder="כיתוב מתחת לתמונה (אופציונלי)"
                  aria-label={`כיתוב תעודה ${i + 1}`}
                  onChange={(e) => updateItem(i, { caption: e.target.value || null })}
                />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addItem}
          className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
        >
          + הוספת תעודה
        </button>
      </div>
    </div>
  );
}

/**
 * Syllabus download. Two ways to supply the file — upload a PDF to the
 * media library, or paste a link to one hosted elsewhere. The uploaded file
 * wins when both are set (matching the renderer), and the form says so
 * rather than leaving the precedence a mystery.
 */
export function SyllabusDownloadFields({
  data,
  onChange,
  mediaById,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
  mediaById: Record<string, Media>;
}) {
  const d = data as {
    heading: string | null;
    body: string | null;
    file_media_id?: string | null;
    file_url: string;
    button_label: string | null;
    open_in_new_tab?: boolean;
  };
  const hasUpload = Boolean(d.file_media_id);
  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת" htmlFor="sd-heading" hint="אופציונלי">
        <input
          id="sd-heading"
          className={inputClass}
          value={d.heading ?? ""}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>

      <Field label="טקסט" htmlFor="sd-body" hint="אופציונלי — משפט מעל הכפתור">
        <textarea
          id="sd-body"
          className={textareaClass}
          value={d.body ?? ""}
          onChange={(e) => onChange({ ...d, body: e.target.value || null })}
        />
      </Field>

      <MediaPickerField
        label="קובץ PDF (העלאה למערכת)"
        hint="הדרך המומלצת — העלו את הסילבוס דרך ״בחירת קובץ״ והוא יאוחסן באתר."
        value={d.file_media_id ?? null}
        media={d.file_media_id ? mediaById[d.file_media_id] : null}
        onChange={(mediaId) => onChange({ ...d, file_media_id: mediaId })}
      />

      <Field
        label="או: קישור חיצוני לקובץ"
        htmlFor="sd-url"
        hint={
          hasUpload
            ? "לא בשימוש — הקובץ שהועלה למעלה גובר. להשתמש בקישור, הסירו קודם את הקובץ."
            : "לחלופין, הדביקו קישור מגוגל דרייב / דרופבוקס. ודאו שהקישור פתוח לצפייה לכל מי שיש לו את הכתובת."
        }
      >
        <input
          id="sd-url"
          className={inputClass}
          dir="ltr"
          placeholder="https://drive.google.com/..."
          value={d.file_url}
          onChange={(e) => onChange({ ...d, file_url: e.target.value })}
        />
      </Field>

      <Field label="טקסט הכפתור" htmlFor="sd-label" hint="ריק = ״סילבוס להורדה״">
        <input
          id="sd-label"
          className={inputClass}
          value={d.button_label ?? ""}
          onChange={(e) => onChange({ ...d, button_label: e.target.value || null })}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={d.open_in_new_tab !== false}
          onChange={(e) => onChange({ ...d, open_in_new_tab: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        פתיחה בכרטיסייה חדשה (מומלץ)
      </label>

      {!hasUpload && !d.file_url?.trim() ? (
        <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
          עד שייבחר קובץ או יוזן קישור, הבלוק לא יוצג באתר.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Link cards. Same add/remove/reorder shape as the other list blocks; each
 * card additionally gets its own <MediaPickerField>, hence `mediaById`.
 * Rows are keyed by index — the data carries no stable id, and every
 * mutation rebuilds the array through `onChange` with controlled inputs.
 */
export function LinkCardsFields({
  data,
  onChange,
  mediaById,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
  mediaById: Record<string, Media>;
}) {
  type Card = {
    title: string;
    body: string | null;
    image_media_id: string | null;
    link: { label: string; href: string; open_in_new_tab: boolean } | null;
  };
  const d = data as { heading: string | null; intro: string | null; cards?: Card[] };
  const cards = d.cards ?? [];

  function updateCard(index: number, patch: Partial<Card>) {
    onChange({ ...d, cards: cards.map((c, i) => (i === index ? { ...c, ...patch } : c)) });
  }

  function addCard() {
    onChange({
      ...d,
      cards: [...cards, { title: "", body: null, image_media_id: null, link: null }],
    });
  }

  function removeCard(index: number) {
    onChange({ ...d, cards: cards.filter((_, i) => i !== index) });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...d, cards: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת האזור" htmlFor="lc-heading" hint="אופציונלי">
        <input
          id="lc-heading"
          className={inputClass}
          value={d.heading ?? ""}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>

      <Field label="טקסט פתיחה" htmlFor="lc-intro" hint="אופציונלי — פסקה קצרה מעל הכרטיסיות">
        <textarea
          id="lc-intro"
          className={textareaClass}
          value={d.intro ?? ""}
          onChange={(e) => onChange({ ...d, intro: e.target.value || null })}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-xs font-semibold text-ink-muted">כרטיסיות</p>

        {cards.length === 0 ? (
          <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
            אין כרטיסיות. לחצו ״הוספת כרטיסייה״ כדי להתחיל.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cards.map((card, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-muted">כרטיסייה {i + 1}</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      aria-label="הזזה למעלה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      aria-label="הזזה למטה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCard(i)}
                      aria-label={`מחיקת כרטיסייה ${i + 1}`}
                      className="rounded p-1 text-error hover:bg-error/10"
                    >
                      🗑
                    </button>
                  </span>
                </div>

                <input
                  className={inputClass}
                  value={card.title}
                  placeholder="כותרת הכרטיסייה (לדוגמה: שנה א׳)"
                  aria-label={`כותרת כרטיסייה ${i + 1}`}
                  onChange={(e) => updateCard(i, { title: e.target.value })}
                />

                <textarea
                  className={textareaClass}
                  value={card.body ?? ""}
                  placeholder="טקסט קצר (אופציונלי)"
                  aria-label={`טקסט כרטיסייה ${i + 1}`}
                  onChange={(e) => updateCard(i, { body: e.target.value || null })}
                />

                <MediaPickerField
                  label="תמונה (אופציונלי)"
                  value={card.image_media_id}
                  media={card.image_media_id ? mediaById[card.image_media_id] : null}
                  onChange={(mediaId) => updateCard(i, { image_media_id: mediaId })}
                />

                <LinkFields
                  label="כפתור / קישור"
                  value={card.link}
                  onChange={(link) => updateCard(i, { link })}
                />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addCard}
          className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
        >
          + הוספת כרטיסייה
        </button>
      </div>
    </div>
  );
}

/**
 * The five training-page sections (migration 20). Their CONTENT lives on
 * the `trainings` row and is edited in the training form above — these
 * forms expose only presentation choices, so each one leads with a note
 * saying where the actual text is edited. Without that, an editor opening
 * "הכשרה — סילבוס" and finding just a heading field would reasonably
 * conclude the syllabus had gone missing.
 */
function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">{children}</p>
  );
}

export function TrainingIntroFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as { show_cover?: boolean; show_details?: boolean };
  return (
    <div className="flex flex-col gap-3">
      <SectionNote>
        הכותרת, התקציר, התמונה והפרטים נערכים בטופס ההכשרה שמעל. כאן ניתן רק לבחור מה יוצג.
      </SectionNote>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={d.show_cover !== false}
          onChange={(e) => onChange({ ...d, show_cover: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        הצגת תמונת השער
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={d.show_details !== false}
          onChange={(e) => onChange({ ...d, show_details: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        הצגת טבלת הפרטים (תאריכים, שעות, מחיר)
      </label>
    </div>
  );
}

function SectionHeadingFields({
  data,
  onChange,
  note,
  placeholder,
  id,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
  note: string;
  placeholder: string;
  id: string;
}) {
  const d = data as { heading: string | null };
  return (
    <div className="flex flex-col gap-3">
      <SectionNote>{note}</SectionNote>
      <Field label="כותרת האזור" htmlFor={id} hint="ריק = הכותרת המקורית">
        <input
          id={id}
          className={inputClass}
          value={d.heading ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>
    </div>
  );
}

export function TrainingBodyFields(props: { data: Record<string, unknown>; onChange: UpdateFn }) {
  return (
    <SectionHeadingFields
      {...props}
      id="tb-heading"
      placeholder="ללא כותרת"
      note="הטקסט עצמו נערך בשדה ״תוכן מלא״ בטופס ההכשרה שמעל."
    />
  );
}

export function TrainingSyllabusFields(props: { data: Record<string, unknown>; onChange: UpdateFn }) {
  return (
    <SectionHeadingFields
      {...props}
      id="ts-heading"
      placeholder="תוכנית הלימודים"
      note="הסילבוס עצמו נערך בשדה ״סילבוס״ בטופס ההכשרה שמעל."
    />
  );
}

export function TrainingInstructorsFields(props: { data: Record<string, unknown>; onChange: UpdateFn }) {
  return (
    <SectionHeadingFields
      {...props}
      id="ti-heading"
      placeholder="מרצים ומדריכים"
      note="רשימת המרצים נערכת בשדה ״מרצים״ בטופס ההכשרה שמעל."
    />
  );
}

export function TrainingRegistrationCtaFields({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
}) {
  const d = data as { heading: string | null; cta_label: string | null };
  return (
    <div className="flex flex-col gap-3">
      <SectionNote>
        כתובת ההרשמה נלקחת משדה ״קישור להרשמה״ בטופס ההכשרה. אם הוא ריק, הכפתור פותח את טופס
        יצירת הקשר באתר.
      </SectionNote>
      <Field label="כותרת" htmlFor="trc-heading" hint="ריק = ״מעוניינים להצטרף להכשרה?״">
        <input
          id="trc-heading"
          className={inputClass}
          value={d.heading ?? ""}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>
      <Field label="טקסט הכפתור" htmlFor="trc-label" hint="ריק = ״לתיאום שיחת היכרות״">
        <input
          id="trc-label"
          className={inputClass}
          value={d.cta_label ?? ""}
          onChange={(e) => onChange({ ...d, cta_label: e.target.value || null })}
        />
      </Field>
    </div>
  );
}

/**
 * Reading list (core books / sources). Add/remove/reorder like the other
 * list blocks, but each row also gets its own <MediaPickerField> for the
 * cover — hence the `mediaById` prop, which supplies already-resolved
 * Media rows so a thumbnail renders without a client fetch per row.
 */
export function ReadingListFields({
  data,
  onChange,
  mediaById,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
  mediaById: Record<string, Media>;
}) {
  type Item = {
    title: string;
    cover_media_id: string | null;
    description: string | null;
    link: { label: string; href: string; open_in_new_tab: boolean } | null;
  };
  const d = data as { heading: string; intro: string | null; items?: Item[] };
  const items = d.items ?? [];

  function updateItem(index: number, patch: Partial<Item>) {
    onChange({ ...d, items: items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });
  }

  function addItem() {
    onChange({
      ...d,
      items: [...items, { title: "", cover_media_id: null, description: null, link: null }],
    });
  }

  function removeItem(index: number) {
    onChange({ ...d, items: items.filter((_, i) => i !== index) });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...d, items: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת" htmlFor="rl-heading" required>
        <input
          id="rl-heading"
          className={inputClass}
          value={d.heading}
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
        />
      </Field>

      <Field label="טקסט פתיחה" htmlFor="rl-intro" hint="אופציונלי — פסקה קצרה מעל הרשימה">
        <textarea
          id="rl-intro"
          className={textareaClass}
          value={d.intro ?? ""}
          onChange={(e) => onChange({ ...d, intro: e.target.value || null })}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-xs font-semibold text-ink-muted">רשימת הספרים / המקורות</p>

        {items.length === 0 ? (
          <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
            אין פריטים ברשימה. לחצו ״הוספת ספר / מקור״ כדי להתחיל.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-muted">פריט {i + 1}</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      aria-label="הזזה למעלה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      aria-label="הזזה למטה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label={`מחיקת פריט ${i + 1}`}
                      className="rounded p-1 text-error hover:bg-error/10"
                    >
                      🗑
                    </button>
                  </span>
                </div>

                <input
                  className={inputClass}
                  value={item.title}
                  placeholder="שם הספר / המקור"
                  aria-label={`שם פריט ${i + 1}`}
                  onChange={(e) => updateItem(i, { title: e.target.value })}
                />

                <textarea
                  className={textareaClass}
                  value={item.description ?? ""}
                  placeholder="תיאור קצר (אופציונלי)"
                  aria-label={`תיאור פריט ${i + 1}`}
                  onChange={(e) => updateItem(i, { description: e.target.value || null })}
                />

                <MediaPickerField
                  label="תמונת כריכה (אופציונלי)"
                  value={item.cover_media_id}
                  media={item.cover_media_id ? mediaById[item.cover_media_id] : null}
                  onChange={(mediaId) => updateItem(i, { cover_media_id: mediaId })}
                />

                <LinkFields
                  label="קישור (אופציונלי)"
                  value={item.link}
                  onChange={(link) => updateItem(i, { link })}
                />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addItem}
          className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
        >
          + הוספת ספר / מקור
        </button>
      </div>
    </div>
  );
}

/**
 * FAQ accordion. Same add/remove/reorder shape as RequirementsFields, but
 * each row is a question+answer pair, so the answer gets a textarea.
 * Rows are keyed by index for the same reason (no stable id on the data).
 */
export function FaqFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as {
    heading: string;
    intro: string | null;
    items?: { question: string; answer: string }[];
  };
  const items = d.items ?? [];

  function updateItem(index: number, patch: Partial<{ question: string; answer: string }>) {
    onChange({ ...d, items: items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });
  }

  function addItem() {
    onChange({ ...d, items: [...items, { question: "", answer: "" }] });
  }

  function removeItem(index: number) {
    onChange({ ...d, items: items.filter((_, i) => i !== index) });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...d, items: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת" htmlFor="faq-heading" required>
        <input
          id="faq-heading"
          className={inputClass}
          value={d.heading}
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
        />
      </Field>

      <Field label="טקסט פתיחה" htmlFor="faq-intro" hint="אופציונלי — פסקה קצרה מעל השאלות">
        <textarea
          id="faq-intro"
          className={textareaClass}
          value={d.intro ?? ""}
          onChange={(e) => onChange({ ...d, intro: e.target.value || null })}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-xs font-semibold text-ink-muted">שאלות ותשובות</p>

        {items.length === 0 ? (
          <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
            אין שאלות ברשימה. לחצו ״הוספת שאלה״ כדי להתחיל.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-muted">שאלה {i + 1}</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      aria-label="הזזה למעלה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      aria-label="הזזה למטה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label={`מחיקת שאלה ${i + 1}`}
                      className="rounded p-1 text-error hover:bg-error/10"
                    >
                      🗑
                    </button>
                  </span>
                </div>
                <input
                  className={inputClass}
                  value={item.question}
                  placeholder="השאלה"
                  aria-label={`שאלה ${i + 1}`}
                  onChange={(e) => updateItem(i, { question: e.target.value })}
                />
                <textarea
                  className={textareaClass}
                  value={item.answer}
                  placeholder="התשובה"
                  aria-label={`תשובה ${i + 1}`}
                  onChange={(e) => updateItem(i, { answer: e.target.value })}
                />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addItem}
          className="self-start rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
        >
          + הוספת שאלה
        </button>
      </div>
    </div>
  );
}

/**
 * Lecturers grid. The checkbox list is the selection; the ↑↓ buttons on the
 * chosen rows set display order (`lecturer_ids` is order-significant, and
 * the renderer honors it).
 *
 * Leaving everything unchecked is a valid, meaningful state — it means
 * "show featured/all", which is what every pre-existing block does — so the
 * empty case gets an explicit note rather than being treated as an error.
 *
 * `lecturers` comes from the server component that renders the editor;
 * this is a client component and cannot query `db` itself. Only visible
 * lecturers are offered, since hidden ones would not render anyway.
 */
export function LecturersGridFields({
  data,
  onChange,
  lecturers,
}: {
  data: Record<string, unknown>;
  onChange: UpdateFn;
  lecturers: { id: string; name: string; role: string }[];
}) {
  const d = data as {
    heading: string | null;
    all_lecturers_link: { label: string; href: string; open_in_new_tab: boolean } | null;
    lecturer_ids?: string[];
  };
  const selected = d.lecturer_ids ?? [];
  const byId = new Map(lecturers.map((l) => [l.id, l]));

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange({ ...d, lecturer_ids: next });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...d, lecturer_ids: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="כותרת" htmlFor="lg-heading" hint="ריק = ללא כותרת">
        <input
          id="lg-heading"
          className={inputClass}
          value={d.heading ?? ""}
          onChange={(e) => onChange({ ...d, heading: e.target.value || null })}
        />
      </Field>

      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        <p className="text-xs font-semibold text-ink-muted">בחירת מרצים</p>

        {lecturers.length === 0 ? (
          <p className="text-sm text-ink-muted">
            אין מרצים גלויים להצגה. יש להוסיף מרצים במסך המרצים.
          </p>
        ) : (
          <>
            {selected.length === 0 ? (
              <p className="rounded bg-surface-alt px-2 py-1.5 text-xs text-ink-muted">
                לא נבחרו מרצים — יוצגו המרצים המומלצים, ואם אין כאלה כל המרצים הגלויים.
              </p>
            ) : (
              <ol className="flex flex-col gap-1">
                {selected.map((id, i) => {
                  const l = byId.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1"
                    >
                      <span className="text-sm text-ink">
                        {i + 1}. {l ? l.name : "(מרצה שהוסר)"}
                        {l ? <span className="text-xs text-ink-muted"> — {l.role}</span> : null}
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => move(i, -1)}
                          aria-label="הזזה למעלה"
                          className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          aria-label="הזזה למטה"
                          className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(id)}
                          className="rounded px-1.5 py-1 text-xs text-ink-muted underline"
                        >
                          הסרה
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-1 flex flex-col gap-1">
              <p className="text-xs text-ink-muted">סימון מרצה יוסיף אותו לרשימה:</p>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {lecturers.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={selected.includes(l.id)}
                      onChange={() => toggle(l.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span>
                      {l.name}
                      <span className="text-xs text-ink-muted"> — {l.role}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <LinkFields
        label="קישור ״לכל המרצים״"
        value={d.all_lecturers_link}
        onChange={(all_lecturers_link) => onChange({ ...d, all_lecturers_link })}
      />
    </div>
  );
}

export function FocusAreasFields({ data, onChange }: { data: Record<string, unknown>; onChange: UpdateFn }) {
  const d = data as {
    heading: string | null;
    subheading?: string | null;
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
      <Field label="כותרת משנה (אופציונלי)" htmlFor="b-fa-subheading" hint="שורת הסבר מתחת לכותרת">
        <textarea
          id="b-fa-subheading"
          className={textareaClass}
          value={d.subheading ?? ""}
          onChange={(e) => onChange({ ...d, subheading: e.target.value || null })}
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
