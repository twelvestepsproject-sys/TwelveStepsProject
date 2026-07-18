"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePodcastEpisodeAction } from "./actions";
import { DangerButton } from "@/components/admin/fields";

export function DeletePodcastButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <DangerButton
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("למחוק את הפרק?")) return;
        startTransition(async () => {
          await deletePodcastEpisodeAction(id);
          router.refresh();
        });
      }}
    >
      מחיקה
    </DangerButton>
  );
}
