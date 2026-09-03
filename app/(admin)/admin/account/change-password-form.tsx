"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeOwnPasswordAction } from "./actions";
import { Field, inputClass, PrimaryButton } from "@/components/admin/fields";

export function ChangePasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <form
      className="flex max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await changeOwnPasswordAction(formData);
          if (!result.ok) {
            setError(result.error ?? "השינוי נכשל.");
            return;
          }
          setDone(true);
          // The layout gate reads must_change_password, which this just
          // cleared — refresh so the admin screens become reachable.
          router.refresh();
        });
      }}
    >
      <Field label="סיסמה נוכחית" htmlFor="current_password" required>
        <input
          id="current_password"
          name="current_password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          className={inputClass}
          required
        />
      </Field>

      <Field label="סיסמה חדשה" htmlFor="new_password" hint="לפחות 8 תווים." required>
        <input
          id="new_password"
          name="new_password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          className={inputClass}
          required
          minLength={8}
        />
      </Field>

      <Field label="אישור סיסמה חדשה" htmlFor="confirm_password" required>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          className={inputClass}
          required
        />
      </Field>

      <PrimaryButton type="submit" disabled={isPending} className="self-start">
        {isPending ? "שומר…" : "החלפת סיסמה"}
      </PrimaryButton>

      {done ? (
        <p role="status" className="text-sm font-semibold text-primary">
          הסיסמה הוחלפה בהצלחה.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
