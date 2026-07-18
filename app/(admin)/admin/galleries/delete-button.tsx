"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGalleryAction } from "./actions";
import { DangerButton } from "@/components/admin/fields";

export function DeleteGalleryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <DangerButton
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("למחוק את הגלריה?")) return;
        startTransition(async () => {
          await deleteGalleryAction(id);
          router.refresh();
        });
      }}
    >
      מחיקה
    </DangerButton>
  );
}
