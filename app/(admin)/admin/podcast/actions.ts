"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { PodcastEpisode } from "@/lib/schemas";

export async function savePodcastEpisodeAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    const id = (formData.get("id") as string) || undefined;
    const publishedAtRaw = String(formData.get("published_at") ?? "");
    const input: Partial<PodcastEpisode> & { id?: string } = {
      id,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? ""),
      spotify_url: String(formData.get("spotify_url") ?? ""),
      published_at: publishedAtRaw ? new Date(publishedAtRaw).toISOString() : new Date().toISOString(),
      duration: Number(formData.get("duration_minutes") ?? 0) * 60,
      cover_image_id: null,
    };

    const saved = await db.savePodcastEpisode(input);
    revalidatePath("/admin/podcast");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deletePodcastEpisodeAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deletePodcastEpisode(id);
  revalidatePath("/admin/podcast");
}

export async function createPodcastEpisodeAndRedirect(formData: FormData) {
  const result = await savePodcastEpisodeAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/podcast/${result.data.id}`);
  }
}
