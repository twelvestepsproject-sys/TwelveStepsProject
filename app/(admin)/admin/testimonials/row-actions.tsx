"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTestimonialAction, toggleTestimonialVisibilityAction } from "./actions";
import { DangerButton, SecondaryButton } from "@/components/admin/fields";

export function TestimonialRowActions({
  id,
  isVisible,
  canEdit,
}: {
  id: string;
  isVisible: boolean;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [warning, setWarning] = useState<string | null>(null);
  const router = useRouter();

  if (!canEdit) return <span className="text-xs text-ink-muted">צפייה בלבד</span>;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await toggleTestimonialVisibilityAction(id, !isVisible);
              setWarning(result.warning ?? null);
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
            if (!confirm("למחוק את ההמלצה? הפעולה בלתי הפיכה.")) return;
            startTransition(async () => {
              await deleteTestimonialAction(id);
              router.refresh();
            });
          }}
        >
          מחיקה
        </DangerButton>
      </div>
      {warning ? (
        <p role="alert" className="max-w-xs text-xs text-warning">
          {warning}
        </p>
      ) : null}
    </div>
  );
}
