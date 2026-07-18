"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import { findMediaUsage } from "@/lib/admin/media-usage";
import type { Media } from "@/lib/schemas";

/**
 * Metadata-only mutations for the Media Library (§8). The actual upload
 * (writing bytes to disk + the initial `db.saveMedia()` insert) happens in
 * the Route Handler at `app/api/admin/media-upload/route.ts` — a plain
 * Server Action can't receive a `multipart/form-data` File the same way a
 * fetch-driven upload with progress wants to, so that path is a Route
 * Handler instead, called directly from the client upload UI. Everything
 * that's pure metadata (editing alt text/license note, deleting) stays a
 * conventional Server Action here, matching every other admin screen.
 */

export async function updateMediaAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, error: "לא נמצא פריט מדיה לעדכון." };

    const altHe = String(formData.get("alt_he") ?? "").trim();
    if (!altHe) {
      return { ok: false, error: "טקסט חלופי (alt) בעברית הוא שדה חובה." };
    }

    const input: Partial<Media> & { id: string } = {
      id,
      alt_he: altHe,
      license_note: (formData.get("license_note") as string) || null,
    };
    const saved = await db.saveMedia(input);
    revalidatePath("/admin/media");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  try {
    await requireContentRole();
    const usage = await findMediaUsage(id);
    if (usage.length > 0) {
      return {
        ok: false,
        error: `לא ניתן למחוק — התמונה בשימוש ב-${usage.length} מקומות: ${usage
          .map((u) => u.label)
          .join(", ")}. הסירו את השימוש ואז מחקו.`,
      };
    }
    await db.deleteMedia(id);
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

/** Used by the delete-confirmation UI to show usage before the admin
 * commits to deleting, per §8 "safe delete with in-use warning." */
export async function getMediaUsageAction(id: string) {
  await requireContentRole();
  return findMediaUsage(id);
}
