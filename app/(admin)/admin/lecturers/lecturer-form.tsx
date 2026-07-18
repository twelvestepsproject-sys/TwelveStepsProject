"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLecturerAction } from "./actions";
import { useAutosave } from "@/components/admin/use-autosave";
import { AutosaveStatus } from "@/components/admin/autosave-status";
import { Field, inputClass, textareaClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { PlaceholderBadge } from "@/components/admin/badges";
import { MediaPickerField } from "@/components/admin/media-picker";
import type { Lecturer, Media } from "@/lib/schemas";

interface FormState {
  name: string;
  role: string;
  bio: string;
  photo_id: string | null;
  page_slug: string;
  sort_order: string;
  is_featured: boolean;
  is_visible: boolean;
  consent_on_file: boolean;
}

function toFormState(l?: Lecturer | null): FormState {
  return {
    name: l?.name ?? "",
    role: l?.role ?? "",
    bio: l?.bio ?? "",
    photo_id: l?.photo_id ?? null,
    page_slug: l?.page_slug ?? "",
    sort_order: String(l?.sort_order ?? 0),
    is_featured: l?.is_featured ?? false,
    is_visible: l?.is_visible ?? false,
    consent_on_file: l?.consent_on_file ?? false,
  };
}

function toFormData(state: FormState, id?: string): FormData {
  const fd = new FormData();
  if (id) fd.set("id", id);
  fd.set("name", state.name);
  fd.set("role", state.role);
  fd.set("bio", state.bio);
  if (state.photo_id) fd.set("photo_id", state.photo_id);
  fd.set("page_slug", state.page_slug);
  fd.set("sort_order", state.sort_order);
  if (state.is_featured) fd.set("is_featured", "on");
  if (state.is_visible) fd.set("is_visible", "on");
  if (state.consent_on_file) fd.set("consent_on_file", "on");
  return fd;
}

export function LecturerForm({
  lecturer,
  canEdit,
  photo,
}: {
  lecturer?: Lecturer | null;
  canEdit: boolean;
  photo?: Media | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(lecturer));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const { isDirty, isSaving, lastSavedAt, error: autosaveError, markSaved } = useAutosave(
    state,
    async (data) => {
      if (!canEdit || !lecturer?.id) return;
      const result = await saveLecturerAction(toFormData(data, lecturer.id));
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
      const result = await saveLecturerAction(toFormData(state, lecturer?.id));
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
      if (!lecturer?.id && result.data) {
        router.push(`/admin/lecturers/${result.data.id}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <AutosaveStatus isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} error={autosaveError} />
        {lecturer?.is_placeholder ? <PlaceholderBadge /> : null}
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-5">
        <Field label="שם" htmlFor="name" required>
          <input
            id="name"
            className={inputClass}
            value={state.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </Field>

        <Field label="תפקיד" htmlFor="role" required>
          <input
            id="role"
            className={inputClass}
            value={state.role}
            onChange={(e) => update("role", e.target.value)}
            required
          />
        </Field>

        <Field label="ביוגרפיה" htmlFor="bio" required>
          <textarea
            id="bio"
            className={textareaClass}
            value={state.bio}
            onChange={(e) => update("bio", e.target.value)}
            required
          />
        </Field>

        <MediaPickerField
          label="תמונה"
          hint="דיוקן או אווטאר מופשט בלבד — לעולם לא תמונת סטוק המוצגת כאדם אמיתי."
          value={state.photo_id}
          media={photo}
          onChange={(id) => update("photo_id", id)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="כתובת URL לעמוד אישי (אופציונלי)"
            htmlFor="page_slug"
            hint="נשאר ריק אם אין עמוד נפרד."
          >
            <input
              id="page_slug"
              className={inputClass}
              value={state.page_slug}
              onChange={(e) => update("page_slug", e.target.value)}
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
                חובה לפני הצגת מרצה אמיתי/ת באתר. ללא סימון תיבה זו, המרצה יישמר אך יוסתר אוטומטית.
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
            <span>מוצג/ת באתר (עמוד &quot;אודות&quot; ורשת המרצים)</span>
          </label>
          <label htmlFor="is_featured" className="flex items-start gap-2 text-sm text-ink">
            <input
              id="is_featured"
              type="checkbox"
              checked={state.is_featured}
              onChange={(e) => update("is_featured", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border"
            />
            <span>מומלץ/ת (מוצג/ת גם בעמוד הבית) — דורש תצוגה מופעלת</span>
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
          <SecondaryButton type="button" onClick={() => router.push("/admin/lecturers")}>
            ביטול
          </SecondaryButton>
        </div>
      </fieldset>
    </form>
  );
}
