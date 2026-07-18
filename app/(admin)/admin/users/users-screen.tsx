"use client";

import { useState } from "react";
import { InviteUserForm } from "./invite-form";
import { UserRowActions } from "./row-actions";
import { PrimaryButton } from "@/components/admin/fields";
import { AdminEmptyState } from "@/components/admin/states";
import type { Profile } from "@/lib/schemas";

const ROLE_LABELS: Record<string, string> = {
  admin: "מנהל/ת",
  editor: "עורך/ת",
  viewer: "צופה",
};

export function UsersScreen({ users, canEdit }: { users: Profile[]; canEdit: boolean }) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">משתמשים</h1>
        {canEdit ? (
          <PrimaryButton type="button" onClick={() => setShowInvite((v) => !v)}>
            {showInvite ? "סגירה" : "הזמנת משתמש/ת"}
          </PrimaryButton>
        ) : null}
      </div>

      {showInvite ? <InviteUserForm onClose={() => setShowInvite(false)} /> : null}

      {users.length === 0 ? (
        <AdminEmptyState message="אין משתמשים." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-start">
                <th className="px-3 py-2 text-start font-semibold text-ink">שם</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">אימייל</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">תפקיד</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">סטטוס</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink">{user.full_name}</td>
                  <td className="px-3 py-2 text-ink-muted" dir="ltr">
                    {user.email}
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{ROLE_LABELS[user.role] ?? user.role}</td>
                  <td className="px-3 py-2">
                    {user.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                        פעיל/ה
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold text-ink-muted">
                        מושבת/ת
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <UserRowActions user={user} canEdit={canEdit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
