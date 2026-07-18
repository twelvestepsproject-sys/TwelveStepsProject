"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRedirectAction } from "./actions";
import { DangerButton } from "@/components/admin/fields";

export function RedirectRowActions({ id, canEdit }: { id: string; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!canEdit) return <span className="text-xs text-ink-muted">צפייה בלבד</span>;

  return (
    <DangerButton
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("למחוק את ההפניה?")) return;
        startTransition(async () => {
          await deleteRedirectAction(id);
          router.refresh();
        });
      }}
    >
      מחיקה
    </DangerButton>
  );
}
