"use client";

import { useTransition } from "react";
import { switchDevRole } from "@/app/(admin)/admin/_actions/role-switch";
import type { Role } from "@/lib/schemas";

const LABELS: Record<Role, string> = {
  admin: "מנהל/ת",
  editor: "עורך/ת",
  viewer: "צופה",
};

/**
 * §16 Phase 4's explicit requirement: "a visible role-switcher control ...
 * lets you flip between admin/editor/viewer and see the UI respond." Lives
 * in the admin layout's sidebar/header. A plain <select> submitting a
 * Server Action on change — no client-side role state is trusted anywhere;
 * every mutation re-checks the cookie server-side (lib/admin/role-check.ts).
 */
export function RoleSwitcher({ current }: { current: Role }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-2"
      action={(fd) => startTransition(() => switchDevRole(fd))}
    >
      <label htmlFor="dev-role-switch" className="text-xs font-semibold text-ink-muted">
        תפקיד (פיתוח):
      </label>
      <select
        id="dev-role-switch"
        name="role"
        defaultValue={current}
        disabled={isPending}
        onChange={(e) => {
          const fd = new FormData();
          fd.set("role", e.target.value);
          startTransition(() => switchDevRole(fd));
        }}
        className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {(Object.keys(LABELS) as Role[]).map((role) => (
          <option key={role} value={role}>
            {LABELS[role]}
          </option>
        ))}
      </select>
    </form>
  );
}
