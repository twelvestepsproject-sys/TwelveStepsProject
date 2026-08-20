"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import { slugify, uniqueSlug, isSlugUnique } from "@/lib/admin/slug";
import type { Training, SyllabusItem, PageBlock } from "@/lib/schemas";

/**
 * Every mutation here is a real Server Action: zod validation happens
 * inside `db.saveTraining` (reusing `trainingSchema` from lib/schemas, per
 * task brief — no ad-hoc validation written here), and a role check runs
 * BEFORE any `db` call so a `viewer` posting directly to this action is
 * rejected server-side, not just hidden in the UI.
 */

function parseSyllabus(raw: string): SyllabusItem[] {
  // Simple line-based input in the form: "כותרת | תוכן" per line. Keeps the
  // form usable for a non-technical admin without building a full nested
  // repeatable-fieldset widget for syllabus items in this pass.
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split("|");
      return { title: (title ?? "").trim(), body: rest.join("|").trim() };
    });
}

export async function saveTrainingAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    const id = (formData.get("id") as string) || undefined;
    const title = String(formData.get("title") ?? "").trim();
    let slug = String(formData.get("slug") ?? "").trim() || slugify(title);

    const existingAdmin = await db.listTrainingsAdmin({ perPage: 500 });
    const otherSlugs = existingAdmin.items.filter((t) => t.id !== id).map((t) => t.slug);
    if (!id) {
      slug = uniqueSlug(slug, otherSlugs);
    } else if (!isSlugUnique(slug, otherSlugs)) {
      return { ok: false, error: "כתובת ה-URL (slug) הזו כבר בשימוש בהכשרה אחרת." };
    }

    const instructorIds = formData.getAll("instructor_ids").map(String);

    const input: Partial<Training> & { id?: string } = {
      id,
      slug,
      title,
      excerpt: String(formData.get("excerpt") ?? ""),
      body: String(formData.get("body") ?? ""),
      cover_image_id: (formData.get("cover_image_id") as string) || null,
      starts_on: (formData.get("starts_on") as string) || null,
      ends_on: (formData.get("ends_on") as string) || null,
      meeting_day: (formData.get("meeting_day") as string) || null,
      meeting_time: (formData.get("meeting_time") as string) || null,
      academic_hours: Number(formData.get("academic_hours") ?? 0),
      sessions_count: Number(formData.get("sessions_count") ?? 0),
      instructors: instructorIds as unknown as Training["instructors"],
      syllabus: parseSyllabus(String(formData.get("syllabus_raw") ?? "")),
      price: formData.get("price") ? Math.round(Number(formData.get("price")) * 100) : null,
      registration_url: (formData.get("registration_url") as string) || null,
      is_featured: formData.get("is_featured") === "on",
      status: (formData.get("status") as Training["status"]) ?? "draft",
      sort_order: Number(formData.get("sort_order") ?? 0),
      // The trainings table has carried these columns all along, but the
      // form never exposed them and this action hardcoded null — so every
      // save silently wiped whatever was there. Now read from the form.
      seo_title: (formData.get("seo_title") as string) || null,
      seo_description: (formData.get("seo_description") as string) || null,
      seo_canonical: (formData.get("seo_canonical") as string) || null,
      seo_og_image_id: null,
      seo_noindex: formData.get("seo_noindex") === "on",
    };

    const saved = await db.saveTraining(input);
    revalidatePath("/admin/trainings");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

/**
 * Saves a training page's block composition (migration 20). Separate from
 * `saveTrainingAction` because the two are independent concerns: that one
 * writes `trainings` columns (the content), this one writes `page_blocks`
 * rows keyed by `training_id` (the layout). Keeping them apart means
 * editing the layout can never accidentally rewrite the training's fields.
 */
export async function saveTrainingBlocksAction(
  trainingId: string,
  blocks: PageBlock[],
): Promise<ActionResult<null>> {
  try {
    await requireContentRole();
    await db.saveTrainingBlocks(trainingId, blocks);
    revalidatePath(`/admin/trainings/${trainingId}`);
    // The public page must reflect a layout change immediately (§3.5/§10),
    // and that route is keyed by slug, not id.
    const admin = await db.listTrainingsAdmin({ perPage: 500 });
    const slug = admin.items.find((t) => t.id === trainingId)?.slug;
    if (slug) revalidatePath(`/hachsharot/${slug}`);
    revalidatePath("/hachsharot");
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteTrainingAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deleteTraining(id);
  revalidatePath("/admin/trainings");
}

export async function togglePublishAction(id: string, nextStatus: "draft" | "published"): Promise<void> {
  await requireContentRole();
  await db.saveTraining({ id, status: nextStatus });
  revalidatePath("/admin/trainings");
}

export async function duplicateTrainingAction(id: string): Promise<void> {
  await requireContentRole();
  const admin = await db.listTrainingsAdmin({ perPage: 500 });
  const original = admin.items.find((t) => t.id === id);
  if (!original) return;
  const slugs = admin.items.map((t) => t.slug);
  const newSlug = uniqueSlug(`${original.slug}-copy`, slugs);
  await db.saveTraining({
    ...original,
    id: undefined,
    slug: newSlug,
    title: `${original.title} (עותק)`,
    status: "draft",
  });
  revalidatePath("/admin/trainings");
}

export async function createTrainingAndRedirect(formData: FormData) {
  const result = await saveTrainingAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/trainings/${result.data.id}`);
  }
}
