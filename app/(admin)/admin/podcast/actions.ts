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
      // Blank stays blank as null, not "" or 0 — the block tests these
      // directly, and `duration: 0` would render as "0 דקות" rather than
      // being omitted. An episode published as a YouTube video legitimately
      // has none of the three.
      description: String(formData.get("description") ?? "").trim() || null,
      spotify_url: String(formData.get("spotify_url") ?? "").trim() || null,
      video_url: String(formData.get("video_url") ?? "").trim() || null,
      published_at: publishedAtRaw ? new Date(publishedAtRaw).toISOString() : new Date().toISOString(),
      duration: Number(formData.get("duration_minutes") ?? 0) * 60 || null,
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
