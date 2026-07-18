"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { Testimonial } from "@/lib/schemas";

/**
 * §8 consent-gated de-placeholdering for testimonials — the highest-value
 * correctness check for this whole task per the brief. `db.saveTestimonial`
 * (lib/queries/mock/index.ts) always de-placeholders on save, and forces
 * `is_visible = false` + returns `__consentWarning: true` instead of
 * throwing when a de-placeholdered row would be visible without consent.
 * This action detects that flag and surfaces the EXACT Hebrew copy from §8.
 */
const CONSENT_WARNING_HE =
  "ההמלצה נשמרה כמוסתרת. לא ניתן להציג המלצה של אדם אמיתי ללא אישור בכתב. סמנו את אישור ההסכמה כדי להציג אותה.";

export async function saveTestimonialAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    const id = (formData.get("id") as string) || undefined;

    const input: Partial<Testimonial> & { id?: string } = {
      id,
      author_name: String(formData.get("author_name") ?? "").trim(),
      quote: String(formData.get("quote") ?? ""),
      photo_id: (formData.get("photo_id") as string) || null,
      sort_order: Number(formData.get("sort_order") ?? 0),
      is_visible: formData.get("is_visible") === "on",
      consent_on_file: formData.get("consent_on_file") === "on",
    };

    const saved = await db.saveTestimonial(input);
    revalidatePath("/admin/testimonials");

    const warning = "__consentWarning" in saved && saved.__consentWarning ? CONSENT_WARNING_HE : undefined;
    return { ok: true, data: { id: saved.id }, warning };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteTestimonialAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deleteTestimonial(id);
  revalidatePath("/admin/testimonials");
}

export async function toggleTestimonialVisibilityAction(
  id: string,
  nextVisible: boolean,
): Promise<ActionResult> {
  try {
    await requireContentRole();
    const saved = await db.saveTestimonial({ id, is_visible: nextVisible });
    revalidatePath("/admin/testimonials");
    const warning = "__consentWarning" in saved && saved.__consentWarning ? CONSENT_WARNING_HE : undefined;
    return { ok: true, warning };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function createTestimonialAndRedirect(formData: FormData) {
  const result = await saveTestimonialAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/testimonials/${result.data.id}`);
  }
}
