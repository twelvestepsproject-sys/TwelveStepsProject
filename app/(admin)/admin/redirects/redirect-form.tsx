"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRedirectAction } from "./actions";
import { Field, inputClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import type { Redirect } from "@/lib/schemas";

interface FormState {
  from_path: string;
  to_path: string;
  status_code: string;
}

function toFormState(r?: Redirect | null): FormState {
  return {
    from_path: r?.from_path ?? "",
    to_path: r?.to_path ?? "",
    status_code: String(r?.status_code ?? 301),
  };
}

function toFormData(state: FormState, id?: string): FormData {
  const fd = new FormData();
  if (id) fd.set("id", id);
  fd.set("from_path", state.from_path);
  fd.set("to_path", state.to_path);
  fd.set("status_code", state.status_code);
  return fd;
}

export function RedirectForm({ item, canEdit }: { item?: Redirect | null; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(item));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveRedirectAction(toFormData(state, item?.id));
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      if (!item?.id && result.data) {
        router.push(`/admin/redirects/${result.data.id}`);
        return;
      }
      router.push("/admin/redirects");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset disabled={!canEdit} className="flex flex-col gap-5">
        <Field label="נתיב מקור (From)" htmlFor="from_path" required hint="לדוגמה: /old-page">
          <input
            id="from_path"
            className={inputClass}
            dir="ltr"
            value={state.from_path}
            onChange={(e) => update("from_path", e.target.value)}
            required
          />
        </Field>

        <Field label="נתיב יעד (To)" htmlFor="to_path" required hint="לדוגמה: /new-page">
          <input
            id="to_path"
            className={inputClass}
            dir="ltr"
            value={state.to_path}
            onChange={(e) => update("to_path", e.target.value)}
            required
          />
        </Field>

        <Field label="קוד סטטוס" htmlFor="status_code" required>
          <select
            id="status_code"
            className={inputClass}
            value={state.status_code}
            onChange={(e) => update("status_code", e.target.value)}
          >
            <option value="301">301 — הפניה קבועה</option>
            <option value="302">302 — הפניה זמנית</option>
            <option value="307">307 — הפניה זמנית (שומרת שיטת בקשה)</option>
            <option value="308">308 — הפניה קבועה (שומרת שיטת בקשה)</option>
          </select>
        </Field>

        {error ? (
          <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          <PrimaryButton type="submit" disabled={isPending}>
            {isPending ? "שומר..." : "שמירה"}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => router.push("/admin/redirects")}>
            ביטול
          </SecondaryButton>
        </div>
      </fieldset>
    </form>
  );
}
