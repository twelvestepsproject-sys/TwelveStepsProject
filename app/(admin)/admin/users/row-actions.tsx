"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserRoleAction, setUserActiveAction, deleteUserAction } from "./actions";
import { DangerButton, SecondaryButton, inputClass } from "@/components/admin/fields";
import type { Profile, Role } from "@/lib/schemas";

const ROLE_LABELS: Record<Role, string> = {
  admin: "מנהל/ת",
  editor: "עורך/ת",
  viewer: "צופה",
};

export function UserRowActions({ user, canEdit }: { user: Profile; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!canEdit) return <span className="text-xs text-ink-muted">צפייה בלבד</span>;

  return (
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
    </div>
  );
}
