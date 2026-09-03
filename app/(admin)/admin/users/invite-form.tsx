"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteUserAction } from "./actions";
import { Field, inputClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";

export function InviteUserForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface-alt/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await inviteUserAction(formData);
          if (!result.ok) {
            setError(result.error ?? "ההזמנה נכשלה.");
            return;
          }
          // Deliberately NOT closing when a temporary password came back:
          // it is shown once and nothing emails it, so closing here would
          // lose it. The admin dismisses it after copying.
          if (result.warning) {
            setCreated(result.warning);
            router.refresh();
            return;
          }
          onClose();
          router.refresh();
        });
      }}
    >
      {/* The old copy said this was a mock invite that only wrote a profile
          row — true under Supabase, not any more. Creation is real now, and
          there is no mail server, so the password is handed over directly
          rather than emailed. */}
      <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
        נוצר חשבון עם סיסמה זמנית שתוצג כאן פעם אחת. אין שליחת מייל — יש להעביר אותה
        למשתמש/ת ולבקש להחליף בהתחברות הראשונה.
      </p>

      {created ? (
        <div role="status" className="flex flex-col gap-2 rounded-md border border-primary bg-primary/10 p-3">
          <p className="text-sm font-semibold text-ink">{created}</p>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              onClose();
            }}
            className="self-start rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg"
          >
            העתקתי — סגירה
          </button>
        </div>
      ) : null}

      <Field label="שם מלא" htmlFor="full_name" required>
        <input id="full_name" name="full_name" className={inputClass} required />
      </Field>

      <Field label="אימייל" htmlFor="email" required>
        <input id="email" name="email" type="email" dir="ltr" className={inputClass} required />
      </Field>

      <Field label="תפקיד" htmlFor="role" required>
        <select id="role" name="role" defaultValue="viewer" className={inputClass}>
          <option value="admin">מנהל/ת</option>
          <option value="editor">עורך/ת</option>
          <option value="viewer">צופה</option>
        </select>
      </Field>

      {error ? (
        <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <PrimaryButton type="submit" disabled={isPending}>
          {isPending ? "שולח..." : "הזמנה"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onClose}>
          ביטול
        </SecondaryButton>
      </div>
    </form>
  );
}
