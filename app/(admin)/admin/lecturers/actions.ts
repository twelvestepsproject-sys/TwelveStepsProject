"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import { slugify, uniqueSlug, isSlugUnique } from "@/lib/admin/slug";
import type { Lecturer } from "@/lib/schemas";

/**
 * §8 consent-gated de-placeholdering for lecturers — mirrors the
 * testimonials action exactly. `db.saveLecturer` (lib/queries/mock/index.ts)
 * already contains the core logic: it always de-placeholders on save, and
 * if the row would end up visible without consent_on_file, it forces
 * is_visible = false and returns `{ ...lecturer, __consentWarning: true }`
 * instead of throwing. This Server Action's job is to detect that flag and
 * translate it into the exact Hebrew copy from §8 — the admin must NEVER
 * see the underlying zod .refine()/CHECK-constraint-equivalent fire as a
 * raw error.
 */
const CONSENT_WARNING_HE =
  "פרטי המרצה נשמרו כמוסתרים. לא ניתן להציג מרצה אמיתי/ת ללא אישור בכתב. סמנו את אישור ההסכמה כדי להציגם.";

export async function saveLecturerAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    const id = (formData.get("id") as string) || undefined;
    const name = String(formData.get("name") ?? "").trim();
    let pageSlug = String(formData.get("page_slug") ?? "").trim();

    const allAdmin = await db.listLecturersAdmin({ perPage: 500 });
    const otherSlugs = allAdmin.items
      .filter((l) => l.id !== id && l.page_slug)
      .map((l) => l.page_slug as string);

    if (pageSlug) {
      const desired = slugify(pageSlug) || slugify(name);
      if (!id) {
        pageSlug = uniqueSlug(desired, otherSlugs);
      } else if (!isSlugUnique(desired, otherSlugs)) {
        return { ok: false, error: "כתובת ה-URL (slug) הזו כבר בשימוש במרצה אחר/ת." };
      } else {
        pageSlug = desired;
      }
    }

    const input: Partial<Lecturer> & { id?: string } = {
      id,
      name,
      role: String(formData.get("role") ?? ""),
      bio: String(formData.get("bio") ?? ""),
      photo_id: (formData.get("photo_id") as string) || null,
      sort_order: Number(formData.get("sort_order") ?? 0),
      is_featured: formData.get("is_featured") === "on",
      is_visible: formData.get("is_visible") === "on",
      page_slug: pageSlug || null,
      consent_on_file: formData.get("consent_on_file") === "on",
    };

    const saved = await db.saveLecturer(input);
    revalidatePath("/admin/lecturers");

    const warning = "__consentWarning" in saved && saved.__consentWarning ? CONSENT_WARNING_HE : undefined;
    return { ok: true, data: { id: saved.id }, warning };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteLecturerAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deleteLecturer(id);
  revalidatePath("/admin/lecturers");
}

export async function toggleLecturerVisibilityAction(id: string, nextVisible: boolean): Promise<ActionResult> {
  try {
    await requireContentRole();
    const saved = await db.saveLecturer({ id, is_visible: nextVisible });
    revalidatePath("/admin/lecturers");
    const warning = "__consentWarning" in saved && saved.__consentWarning ? CONSENT_WARNING_HE : undefined;
    return { ok: true, warning };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function createLecturerAndRedirect(formData: FormData) {
  const result = await saveLecturerAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/lecturers/${result.data.id}`);
  }
}
