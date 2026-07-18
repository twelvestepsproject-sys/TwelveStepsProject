"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTestimonialAction } from "./actions";
import { useAutosave } from "@/components/admin/use-autosave";
import { AutosaveStatus } from "@/components/admin/autosave-status";
import { Field, inputClass, textareaClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { PlaceholderBadge } from "@/components/admin/badges";
import { MediaPickerField } from "@/components/admin/media-picker";
import type { Media, Testimonial } from "@/lib/schemas";

interface FormState {
  author_name: string;
  quote: string;
  photo_id: string | null;
  sort_order: string;
  is_visible: boolean;
  consent_on_file: boolean;
}

function toFormState(t?: Testimonial | null): FormState {
  return {
    author_name: t?.author_name ?? "",
    quote: t?.quote ?? "",
    photo_id: t?.photo_id ?? null,
    sort_order: String(t?.sort_order ?? 0),
    is_visible: t?.is_visible ?? false,
    consent_on_file: t?.consent_on_file ?? false,
  };
}

function toFormData(state: FormState, id?: string): FormData {
  const fd = new FormData();
  if (id) fd.set("id", id);
  fd.set("author_name", state.author_name);
  fd.set("quote", state.quote);
  if (state.photo_id) fd.set("photo_id", state.photo_id);
  fd.set("sort_order", state.sort_order);
  if (state.is_visible) fd.set("is_visible", "on");
  if (state.consent_on_file) fd.set("consent_on_file", "on");
  return fd;
}

export function TestimonialForm({
  testimonial,
  canEdit,
  photo,
}: {
  testimonial?: Testimonial | null;
  canEdit: boolean;
  photo?: Media | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(testimonial));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const { isDirty, isSaving, lastSavedAt, error: autosaveError, markSaved } = useAutosave(
    state,
    async (data) => {
      if (!canEdit || !testimonial?.id) return;
      const result = await saveTestimonialAction(toFormData(data, testimonial.id));
      if (!result.ok) throw new Error(result.error);
      if (result.warning) setWarning(result.warning);
    },
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setWarning(null);
    startTransition(async () => {
      const result = await saveTestimonialAction(toFormData(state, testimonial?.id));
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      markSaved();
      if (result.warning) {
        setWarning(result.warning);
        setState((s) => ({ ...s, is_visible: false }));
      } else {
        setNotice("נשמר בהצלחה.");
      }
      if (!testimonial?.id && result.data) {
        router.push(`/admin/testimonials/${result.data.id}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <AutosaveStatus isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} error={autosaveError} />
        {testimonial?.is_placeholder ? <PlaceholderBadge /> : null}
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-5">
        <Field label="שם" htmlFor="author_name" required>
          <input
            id="author_name"
            className={inputClass}
            value={state.author_name}
            onChange={(e) => update("author_name", e.target.value)}
            required
          />
        </Field>

        <Field label="ציטוט" htmlFor="quote" required>
          <textarea
            id="quote"
            className={textareaClass}
            value={state.quote}
            onChange={(e) => update("quote", e.target.value)}
            required
          />
        </Field>

        <MediaPickerField
          label="תמונה / אווטאר"
          hint="אווטאר מופשט בלבד — לעולם לא תמונת סטוק המוצגת כאדם אמיתי."
          value={state.photo_id}
          media={photo}
          onChange={(id) => update("photo_id", id)}
        />

        <Field label="סדר תצוגה" htmlFor="sort_order">
          <input
            id="sort_order"
            type="number"
            className={inputClass}
            value={state.sort_order}
            onChange={(e) => update("sort_order", e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt/40 p-4">
          <label htmlFor="consent_on_file" className="flex items-start gap-2 text-sm text-ink">
            <input
              id="consent_on_file"
              type="checkbox"
              checked={state.consent_on_file}
              onChange={(e) => update("consent_on_file", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <span>
              <span className="font-semibold">אישור הסכמה בכתב קיים</span>
              <span className="block text-xs text-ink-muted">
                חובה לפני הצגת המלצה של אדם אמיתי באתר. ללא סימון תיבה זו, ההמלצה תישמר אך תוסתר
                אוטומטית.
              </span>
            </span>
          </label>
          <label htmlFor="is_visible" className="flex items-start gap-2 text-sm text-ink">
            <input
              id="is_visible"
              type="checkbox"
              checked={state.is_visible}
              onChange={(e) => update("is_visible", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <span>מוצגת באתר (מגלגלת ההמלצות)</span>
          </label>
        </div>

        {warning ? (
          <p role="alert" className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            {warning}
          </p>
        ) : null}
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
          <SecondaryButton type="button" onClick={() => router.push("/admin/testimonials")}>
            ביטול
          </SecondaryButton>
        </div>
      </fieldset>
    </form>
  );
}
