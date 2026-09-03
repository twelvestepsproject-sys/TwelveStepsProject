"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setUserRoleAction,
  setUserActiveAction,
  deleteUserAction,
  resetUserPasswordAction,
} from "./actions";
import { DangerButton, SecondaryButton, inputClass } from "@/components/admin/fields";
import type { Profile, Role } from "@/lib/schemas";

const ROLE_LABELS: Record<Role, string> = {
  admin: "מנהל/ת",
  editor: "עורך/ת",
  viewer: "צופה",
};

export function UserRowActions({ user, canEdit }: { user: Profile; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [issued, setIssued] = useState<string | null>(null);
  const router = useRouter();

  if (!canEdit) return <span className="text-xs text-ink-muted">צפייה בלבד</span>;

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Shown inline and left up until dismissed: with no mail server this
          string is the only copy, and it is gone once this unmounts. */}
      {issued ? (
        <div role="status" className="flex flex-col gap-1 rounded-md border border-primary bg-primary/10 p-2">
          <p className="text-xs font-semibold text-ink">
            סיסמה זמנית חדשה: {issued} — העבירו למשתמש/ת. תתבקש/י להחליף בהתחברות.
          </p>
          <button
            type="button"
            onClick={() => setIssued(null)}
            className="self-start text-xs font-semibold text-primary underline"
          >
            העתקתי — סגירה
          </button>
        </div>
      ) : null}
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`role-${user.id}`}>
        תפקיד עבור {user.full_name}
      </label>
      <select
        id={`role-${user.id}`}
        defaultValue={user.role}
        disabled={isPending}
        className={`${inputClass} w-auto py-1.5 text-xs`}
        onChange={(e) =>
          startTransition(async () => {
            await setUserRoleAction(user.id, e.target.value as Role);
            router.refresh();
          })
        }
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <SecondaryButton
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await setUserActiveAction(user.id, !user.is_active);
            router.refresh();
          })
        }
      >
        {user.is_active ? "השבתה" : "הפעלה"}
      </SecondaryButton>
      <DangerButton
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`למחוק את המשתמש/ת ${user.full_name}?`)) return;
          startTransition(async () => {
            await deleteUserAction(user.id);
            router.refresh();
          });
        }}
      >
        מחיקה
      </DangerButton>
      <SecondaryButton
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`לאפס את הסיסמה של ${user.full_name}? הסיסמה הנוכחית תפסיק לעבוד.`)) return;
          startTransition(async () => {
            const result = await resetUserPasswordAction(user.id);
            if (result.ok && result.data) setIssued(result.data.password);
            router.refresh();
          });
        }}
      >
        איפוס סיסמה
      </SecondaryButton>
    </div>
    </div>
  );
}
