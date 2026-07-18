"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import { slugify, uniqueSlug, isSlugUnique } from "@/lib/admin/slug";
import type { Gallery, GalleryImage } from "@/lib/schemas";

/**
 * SIMPLIFICATION (flagged per task brief): §8's Media Library (drag-drop
 * upload, client-side resize, replace-in-place, usage list) is explicitly
 * deferred this pass. Without it, a gallery's images can't be picked from a
 * visual library — this form instead lets the admin type/paste existing
 * `media_id`s (one per line, with alt text after a `|`), matching what the
 * mock media fixtures already contain. `db.getMedia()` + `mediaUrl()` are
 * used to preview each referenced image so the admin isn't editing blind
 * ids. Full drag-drop upload lands with the Media Library screen.
 */

function parseImages(raw: string, galleryId: string): Partial<GalleryImage>[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const [mediaId, ...rest] = line.split("|");
      return {
        gallery_id: galleryId,
        media_id: (mediaId ?? "").trim(),
        alt_he: rest.join("|").trim(),
        sort_order: idx + 1,
      };
    });
}

export async function saveGalleryAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    const id = (formData.get("id") as string) || undefined;
    const title = String(formData.get("title") ?? "").trim();
    let slug = String(formData.get("slug") ?? "").trim() || slugify(title);

    const all = await db.listGalleries();
    const otherSlugs = all.filter((g) => g.id !== id).map((g) => g.slug);
    if (!id) {
      slug = uniqueSlug(slug, otherSlugs);
    } else if (!isSlugUnique(slug, otherSlugs)) {
      return { ok: false, error: "כתובת ה-URL (slug) הזו כבר בשימוש בגלריה אחרת." };
    }

    const galleryId = id ?? crypto.randomUUID();
    const imagesRaw = String(formData.get("images_raw") ?? "");

    const input: Partial<Gallery> & { id?: string } = {
      id,
      slug,
      title,
      images: parseImages(imagesRaw, galleryId) as GalleryImage[],
    };

    const saved = await db.saveGallery(input);
    revalidatePath("/admin/galleries");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteGalleryAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deleteGallery(id);
  revalidatePath("/admin/galleries");
}

export async function createGalleryAndRedirect(formData: FormData) {
  const result = await saveGalleryAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/galleries/${result.data.id}`);
  }
}
