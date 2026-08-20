"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTrainingAction } from "./actions";
import { useAutosave } from "@/components/admin/use-autosave";
import { AutosaveStatus } from "@/components/admin/autosave-status";
import { Field, inputClass, textareaClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { PlaceholderBadge } from "@/components/admin/badges";
import { MediaPickerField } from "@/components/admin/media-picker";
import type { Lecturer, Media, Training } from "@/lib/schemas";

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image_id: string | null;
  starts_on: string;
  ends_on: string;
  meeting_day: string;
  meeting_time: string;
  academic_hours: string;
  sessions_count: string;
  syllabus_raw: string;
  price: string;
  registration_url: string;
  is_featured: boolean;
  status: "draft" | "published";
  sort_order: string;
  instructor_ids: string[];
  seo_title: string;
  seo_description: string;
  seo_canonical: string;
  seo_noindex: boolean;
}

function toFormState(t?: Training | null): FormState {
  return {
    title: t?.title ?? "",
    slug: t?.slug ?? "",
    excerpt: t?.excerpt ?? "",
    body: t?.body ?? "",
    cover_image_id: t?.cover_image_id ?? null,
    starts_on: t?.starts_on ?? "",
    ends_on: t?.ends_on ?? "",
    meeting_day: t?.meeting_day ?? "",
    meeting_time: t?.meeting_time ?? "",
    academic_hours: String(t?.academic_hours ?? 0),
    sessions_count: String(t?.sessions_count ?? 0),
    syllabus_raw: (t?.syllabus ?? []).map((s) => `${s.title} | ${s.body}`).join("\n"),
    price: t?.price != null ? String(t.price / 100) : "",
    registration_url: t?.registration_url ?? "",
    is_featured: t?.is_featured ?? false,
    status: t?.status ?? "draft",
    sort_order: String(t?.sort_order ?? 0),
    instructor_ids: (t?.instructors ?? []).map((i) => i.id),
    seo_title: t?.seo_title ?? "",
    seo_description: t?.seo_description ?? "",
    seo_canonical: t?.seo_canonical ?? "",
    seo_noindex: t?.seo_noindex ?? false,
  };
}

function toFormData(state: FormState, id?: string): FormData {
  const fd = new FormData();
  if (id) fd.set("id", id);
  fd.set("title", state.title);
  fd.set("slug", state.slug);
  fd.set("excerpt", state.excerpt);
  fd.set("body", state.body);
  if (state.cover_image_id) fd.set("cover_image_id", state.cover_image_id);
  fd.set("starts_on", state.starts_on);
  fd.set("ends_on", state.ends_on);
  fd.set("meeting_day", state.meeting_day);
  fd.set("meeting_time", state.meeting_time);
  fd.set("academic_hours", state.academic_hours);
  fd.set("sessions_count", state.sessions_count);
  fd.set("syllabus_raw", state.syllabus_raw);
  fd.set("price", state.price);
  fd.set("registration_url", state.registration_url);
  if (state.is_featured) fd.set("is_featured", "on");
  fd.set("status", state.status);
  fd.set("sort_order", state.sort_order);
  fd.set("seo_title", state.seo_title);
  fd.set("seo_description", state.seo_description);
  fd.set("seo_canonical", state.seo_canonical);
  if (state.seo_noindex) fd.set("seo_noindex", "on");
  for (const id_ of state.instructor_ids) fd.append("instructor_ids", id_);
  return fd;
}

export function TrainingForm({
  training,
  lecturers,
  canEdit,
  coverImage,
}: {
  training?: Training | null;
  lecturers: Lecturer[];
  canEdit: boolean;
  coverImage?: Media | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(training));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { isDirty, isSaving, lastSavedAt, error: autosaveError, markSaved } = useAutosave(
    state,
    async (data) => {
      if (!canEdit || !training?.id) return; // no autosave before first create
      const result = await saveTrainingAction(toFormData(data, training.id));
      if (!result.ok) throw new Error(result.error);
    },
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await saveTrainingAction(toFormData(state, training?.id));
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      markSaved();
      if (!training?.id && result.data) {
        router.push(`/admin/trainings/${result.data.id}`);
        return;
      }
      setNotice("נשמר בהצלחה.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <AutosaveStatus isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} error={autosaveError} />
        {training?.is_placeholder ? <PlaceholderBadge /> : null}
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-5">
        <Field label="כותרת" htmlFor="title" required>
          <input
            id="title"
            className={inputClass}
            value={state.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </Field>

        <Field
          label="כתובת URL (slug)"
          htmlFor="slug"
          hint="נוצר אוטומטית מהכותרת בעברית. ניתן לערוך; חייב להיות ייחודי."
        >
          <input
            id="slug"
            className={inputClass}
            value={state.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="ריק = נוצר אוטומטית מהכותרת"
          />
        </Field>

        <Field label="תקציר" htmlFor="excerpt" required>
          <textarea
            id="excerpt"
            className={textareaClass}
            value={state.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            required
          />
        </Field>

        <Field label="תוכן מלא" htmlFor="body" required>
          <textarea
            id="body"
            className={`${textareaClass} min-h-48`}
            value={state.body}
            onChange={(e) => update("body", e.target.value)}
            required
          />
        </Field>

        <MediaPickerField
          label="תמונת שער"
          hint="מוצגת בכרטיס ההכשרה ובעמוד ההכשרה עצמו."
          value={state.cover_image_id}
          media={coverImage}
          onChange={(id) => update("cover_image_id", id)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="תאריך התחלה" htmlFor="starts_on">
            <input
              id="starts_on"
              type="date"
              className={inputClass}
              value={state.starts_on}
              onChange={(e) => update("starts_on", e.target.value)}
            />
          </Field>
          <Field label="תאריך סיום" htmlFor="ends_on">
            <input
              id="ends_on"
              type="date"
              className={inputClass}
              value={state.ends_on}
              onChange={(e) => update("ends_on", e.target.value)}
            />
          </Field>
          <Field label="יום מפגש" htmlFor="meeting_day">
            <input
              id="meeting_day"
              className={inputClass}
              value={state.meeting_day}
              onChange={(e) => update("meeting_day", e.target.value)}
            />
          </Field>
          <Field label="שעת מפגש" htmlFor="meeting_time">
            <input
              id="meeting_time"
              className={inputClass}
              value={state.meeting_time}
              onChange={(e) => update("meeting_time", e.target.value)}
            />
          </Field>
          <Field label="שעות אקדמיות" htmlFor="academic_hours">
            <input
              id="academic_hours"
              type="number"
              min={0}
              className={inputClass}
              value={state.academic_hours}
              onChange={(e) => update("academic_hours", e.target.value)}
            />
          </Field>
          <Field label="מספר מפגשים" htmlFor="sessions_count">
            <input
              id="sessions_count"
              type="number"
              min={0}
              className={inputClass}
              value={state.sessions_count}
              onChange={(e) => update("sessions_count", e.target.value)}
            />
          </Field>
          <Field label="מחיר (₪, ריק = לא נקוב)" htmlFor="price">
            <input
              id="price"
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={state.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="לדוגמה: 3500"
            />
          </Field>
          <Field label="סדר תצוגה" htmlFor="sort_order">
            <input
              id="sort_order"
              type="number"
              className={inputClass}
              value={state.sort_order}
              onChange={(e) => update("sort_order", e.target.value)}
            />
          </Field>
        </div>

        <Field label="קישור להרשמה" htmlFor="registration_url">
          <input
            id="registration_url"
            className={inputClass}
            value={state.registration_url}
            onChange={(e) => update("registration_url", e.target.value)}
          />
        </Field>

        <Field
          label="סילבוס"
          htmlFor="syllabus_raw"
          hint="שורה לכל נושא, בפורמט: כותרת | תיאור"
        >
          <textarea
            id="syllabus_raw"
            className={textareaClass}
            value={state.syllabus_raw}
            onChange={(e) => update("syllabus_raw", e.target.value)}
          />
        </Field>

        <Field label="מרצים" htmlFor="instructor_ids">
          <select
            id="instructor_ids"
            multiple
            className={`${inputClass} h-32`}
            value={state.instructor_ids}
            onChange={(e) =>
              update(
                "instructor_ids",
                Array.from(e.target.selectedOptions).map((o) => o.value),
              )
            }
          >
            {lecturers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>

        <label htmlFor="is_featured" className="flex items-start gap-2 text-sm text-ink">
          <input
            id="is_featured"
            type="checkbox"
            checked={state.is_featured}
            onChange={(e) => update("is_featured", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <span>הכשרה מומלצת (מוצגת בעמוד הבית)</span>
        </label>

        {/* SEO — these columns already existed on `trainings`; the form
            simply never exposed them, so they could not be filled in. */}
        <details className="rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            קידום במנועי חיפוש (SEO)
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <Field
              label="כותרת SEO"
              htmlFor="seo_title"
              hint="ריק = כותרת ההכשרה תשמש כברירת מחדל"
            >
              <input
                id="seo_title"
                className={inputClass}
                value={state.seo_title}
                onChange={(e) => update("seo_title", e.target.value)}
              />
            </Field>
            <Field
              label="תיאור SEO"
              htmlFor="seo_description"
              hint="ריק = התקציר ישמש כברירת מחדל"
            >
              <textarea
                id="seo_description"
                className={textareaClass}
                value={state.seo_description}
                onChange={(e) => update("seo_description", e.target.value)}
              />
            </Field>
            <Field label="כתובת קנונית" htmlFor="seo_canonical" hint="אופציונלי">
              <input
                id="seo_canonical"
                className={inputClass}
                dir="ltr"
                value={state.seo_canonical}
                onChange={(e) => update("seo_canonical", e.target.value)}
              />
            </Field>
            <label htmlFor="seo_noindex" className="flex items-start gap-2 text-sm text-ink">
              <input
                id="seo_noindex"
                type="checkbox"
                checked={state.seo_noindex}
                onChange={(e) => update("seo_noindex", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>הסתרה ממנועי חיפוש (noindex)</span>
            </label>
          </div>
        </details>

        <Field label="סטטוס" htmlFor="status">
          <select
            id="status"
            className={inputClass}
            value={state.status}
            onChange={(e) => update("status", e.target.value as "draft" | "published")}
          >
            <option value="draft">טיוטה</option>
            <option value="published">פורסם</option>
          </select>
        </Field>

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

        <div className="flex gap-3">
          <PrimaryButton type="submit" disabled={isPending}>
            {isPending ? "שומר..." : "שמירה"}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => router.push("/admin/trainings")}>
            ביטול
          </SecondaryButton>
        </div>
      </fieldset>
    </form>
  );
}
