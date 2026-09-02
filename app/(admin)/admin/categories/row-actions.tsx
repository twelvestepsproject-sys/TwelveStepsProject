"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategoryAction } from "./actions";
import { DangerButton } from "@/components/admin/fields";

export function CategoryRowActions({
  id,
  name,
  canEdit,
}: {
  id: string;
  name: string;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canEdit) return <span className="text-xs text-ink-muted">צפייה בלבד</span>;

  return (
    <div className="flex flex-col items-start gap-1">
      <DangerButton
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`למחוק את הקטגוריה "${name}"? הפעולה בלתי הפיכה.`)) return;
          startTransition(async () => {
            // A category with articles cannot be deleted (the action checks
            // and refuses), so the refusal is shown here rather than lost.
            const result = await deleteCategoryAction(id);
            setError(result.ok ? null : (result.error ?? "המחיקה נכשלה."));
            router.refresh();
          });
        }}
      >
        מחיקה
      </DangerButton>
      {error ? (
        <p role="alert" className="max-w-xs text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
