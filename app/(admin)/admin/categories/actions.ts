"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import { slugify, uniqueSlug } from "@/lib/admin/slug";
import type { Category } from "@/lib/schemas";

/**
 * Blog categories. `saveCategory`/`deleteCategory` existed in the data layer
 * from the start but nothing ever called them — there was no screen, so the
 * only way to add a category was to write SQL by hand.
 *
 * The slug is derived from the name rather than asked for: it appears in
 * /blog/category/<slug> and an editor has no reason to invent one. It is
 * only generated when creating, so an existing category keeps its URL when
 * renamed — changing it silently would break any link already shared.
 */
export async function saveCategoryAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    const id = (formData.get("id") as string) || undefined;
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false, error: "יש להזין שם לקטגוריה." };

    const all = await db.listCategories();
    const otherSlugs = all.filter((c) => c.id !== id).map((c) => c.slug);

    const input: Partial<Category> & { id?: string } = {
      id,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
    };

    // New categories get a slug from the name; existing ones keep theirs.
    if (!id) {
      const desired = slugify(name);
      input.slug = uniqueSlug(desired || "category", otherSlugs);
    }

    const saved = await db.saveCategory(input);

    revalidatePath("/admin/categories");
    revalidatePath("/blog");
    revalidatePath(`/blog/category/${saved.slug}`);

    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    await requireContentRole();

    // posts.category_id is NO ACTION, so deleting a category that still has
    // articles fails with a raw foreign-key error. Checked here so the
    // editor gets a sentence they can act on instead.
    const category = (await db.listCategories()).find((c) => c.id === id);
    if (category) {
      const { total } = await db.listPosts({ categorySlug: category.slug, page: 1, perPage: 1 });
      if (total > 0) {
        return {
          ok: false,
          error: `לא ניתן למחוק: ${total} מאמרים משויכים לקטגוריה זו. שנו את הקטגוריה שלהם תחילה.`,
        };
      }
    }

    await db.deleteCategory(id);
    revalidatePath("/admin/categories");
    revalidatePath("/blog");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function createCategoryAndRedirect(formData: FormData) {
  const result = await saveCategoryAction(formData);
  if (result.ok) redirect("/admin/categories");
  return result;
}
