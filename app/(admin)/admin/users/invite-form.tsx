"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteUserAction } from "./actions";
import { Field, inputClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";

export function InviteUserForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          onClose();
          router.refresh();
        });
      }}
    >
      <p className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
        זוהי הזמנה מדומה: נוצרת רשומת פרופיל בלבד. שליחת מייל הזמנה אמיתית ויצירת חשבון התחברות
        (Supabase Auth) ייבנו בשלב 5 של הפרויקט, כשתחובר מערכת ההרשאות האמיתית.
      </p>

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
