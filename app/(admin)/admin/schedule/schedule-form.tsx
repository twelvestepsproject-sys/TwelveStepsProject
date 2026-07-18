"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveScheduleEntryAction } from "./actions";
import { useAutosave } from "@/components/admin/use-autosave";
import { AutosaveStatus } from "@/components/admin/autosave-status";
import { Field, inputClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { PlaceholderBadge } from "@/components/admin/badges";
import type { ScheduleEntry } from "@/lib/schemas";

interface FormState {
  day_label: string;
  start_date: string;
  end_date: string;
  time_range: string;
  program_name: string;
  cohort: string;
  sort_order: string;
  is_visible: boolean;
}

function toFormState(e?: ScheduleEntry | null): FormState {
  return {
    day_label: e?.day_label ?? "",
    start_date: e?.start_date ?? "",
    end_date: e?.end_date ?? "",
    time_range: e?.time_range ?? "",
    program_name: e?.program_name ?? "",
    cohort: e?.cohort ?? "",
    sort_order: String(e?.sort_order ?? 0),
    is_visible: e?.is_visible ?? true,
  };
}

function toFormData(state: FormState, id?: string): FormData {
  const fd = new FormData();
  if (id) fd.set("id", id);
  fd.set("day_label", state.day_label);
  fd.set("start_date", state.start_date);
  fd.set("end_date", state.end_date);
  fd.set("time_range", state.time_range);
  fd.set("program_name", state.program_name);
  fd.set("cohort", state.cohort);
  fd.set("sort_order", state.sort_order);
  if (state.is_visible) fd.set("is_visible", "on");
  return fd;
}

export function ScheduleForm({ entry, canEdit }: { entry?: ScheduleEntry | null; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(entry));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { isDirty, isSaving, lastSavedAt, error: autosaveError, markSaved } = useAutosave(
    state,
    async (data) => {
      if (!canEdit || !entry?.id) return;
      const result = await saveScheduleEntryAction(toFormData(data, entry.id));
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
      const result = await saveScheduleEntryAction(toFormData(state, entry?.id));
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      markSaved();
      if (!entry?.id && result.data) {
        router.push(`/admin/schedule/${result.data.id}`);
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
        {entry?.is_placeholder ? <PlaceholderBadge /> : null}
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-5">
        <Field label="שם התוכנית" htmlFor="program_name" required>
          <input
            id="program_name"
            className={inputClass}
            value={state.program_name}
            onChange={(e) => update("program_name", e.target.value)}
            required
          />
        </Field>

        <Field label="תווית יום" htmlFor="day_label" required>
          <input
            id="day_label"
            className={inputClass}
            value={state.day_label}
            onChange={(e) => update("day_label", e.target.value)}
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="תאריך התחלה" htmlFor="start_date" required>
            <input
              id="start_date"
              type="date"
              className={inputClass}
              value={state.start_date}
              onChange={(e) => update("start_date", e.target.value)}
              required
            />
          </Field>
          <Field label="תאריך סיום" htmlFor="end_date">
            <input
              id="end_date"
              type="date"
              className={inputClass}
              value={state.end_date}
              onChange={(e) => update("end_date", e.target.value)}
            />
          </Field>
          <Field label="טווח שעות" htmlFor="time_range">
            <input
              id="time_range"
              className={inputClass}
              value={state.time_range}
              onChange={(e) => update("time_range", e.target.value)}
            />
          </Field>
          <Field label="קבוצה / מחזור" htmlFor="cohort">
            <input
              id="cohort"
              className={inputClass}
              value={state.cohort}
              onChange={(e) => update("cohort", e.target.value)}
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

        <label htmlFor="is_visible" className="flex items-start gap-2 text-sm text-ink">
          <input
            id="is_visible"
            type="checkbox"
            checked={state.is_visible}
            onChange={(e) => update("is_visible", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <span>מוצג באתר</span>
        </label>

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
          <SecondaryButton type="button" onClick={() => router.push("/admin/schedule")}>
            ביטול
          </SecondaryButton>
        </div>
      </fieldset>
    </form>
  );
}
