"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteScheduleEntryAction, toggleScheduleVisibilityAction } from "./actions";
import { DangerButton, SecondaryButton } from "@/components/admin/fields";

export function ScheduleRowActions({
  id,
  isVisible,
  canEdit,
}: {
  id: string;
  isVisible: boolean;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!canEdit) return <span className="text-xs text-ink-muted">צפייה בלבד</span>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SecondaryButton
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await toggleScheduleVisibilityAction(id, !isVisible);
            router.refresh();
          })
        }
      >
        {isVisible ? "הסתרה" : "הצגה"}
      </SecondaryButton>
      <DangerButton
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("למחוק את המועד?")) return;
          startTransition(async () => {
            await deleteScheduleEntryAction(id);
            router.refresh();
          });
        }}
      >
        מחיקה
      </DangerButton>
    </div>
  );
}
