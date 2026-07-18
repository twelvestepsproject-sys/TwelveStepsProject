"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTrainingAction, togglePublishAction, duplicateTrainingAction } from "./actions";
import { DangerButton, SecondaryButton } from "@/components/admin/fields";

export function TrainingRowActions({
  id,
  status,
  canEdit,
}: {
  id: string;
  status: "draft" | "published";
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
            await togglePublishAction(id, status === "published" ? "draft" : "published");
            router.refresh();
          })
        }
      >
        {status === "published" ? "בטל פרסום" : "פרסם"}
      </SecondaryButton>
      <SecondaryButton
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await duplicateTrainingAction(id);
            router.refresh();
          })
        }
      >
        שכפול
      </SecondaryButton>
      <DangerButton
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("למחוק את ההכשרה? הפעולה בלתי הפיכה.")) return;
          startTransition(async () => {
            await deleteTrainingAction(id);
            router.refresh();
          });
        }}
      >
        מחיקה
      </DangerButton>
    </div>
  );
}
