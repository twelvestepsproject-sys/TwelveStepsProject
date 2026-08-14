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
