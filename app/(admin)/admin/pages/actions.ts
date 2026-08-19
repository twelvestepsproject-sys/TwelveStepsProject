"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import { slugify, uniqueSlug, isSlugUnique } from "@/lib/admin/slug";
import type { PageBlock } from "@/lib/schemas";

/**
 * §8 Pages block editor. `db.savePage()` takes the FULL `PageInput` shape
 * (id + every page field + the complete `blocks[]` array) on every call —
 * unlike the merge-by-id `save*` methods elsewhere in the DataSource, so
 * every call site here always sends the whole payload, never a partial
 * patch. Role-checked with `requireContentRole` (editor/admin, same tier
 * as every other content screen — Pages is content, not settings).
 */

export interface PagePayload {
  slug: string;
  title: string;
  status: "draft" | "published";
  published_at: string | null;
  template: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_canonical: string | null;
  seo_og_image_id: string | null;
  seo_noindex: boolean;
  blocks: PageBlock[];
}

export async function savePageAction(id: string | undefined, payload: PagePayload): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    let slug = payload.slug.trim() || slugify(payload.title);
    const existingAll = await db.listPages({ perPage: 500, includeDrafts: true });
    const otherSlugs = existingAll.items.filter((p) => p.id !== id).map((p) => p.slug);
    if (!id) {
      slug = uniqueSlug(slug, otherSlugs);
    } else if (!isSlugUnique(slug, otherSlugs)) {
      return { ok: false, error: "כתובת ה-URL (slug) הזו כבר בשימוש בעמוד אחר." };
    }

    const saved = await db.savePage({
      id,
      ...payload,
      slug,
      blocks: payload.blocks.map((b, i) => ({ ...b, page_id: id ?? "pending", sort_order: i + 1 })),
    });

    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${saved.id}`);
    // Publishing must be live within seconds with no redeploy (§3.5 /
    // §10) — revalidate the specific public page path, plus "/" since the
    // homepage IS a `pages` row too and every other admin screen in this
    // repo uses `revalidatePath` (no prior `revalidateTag` usage exists
    // yet; Next 16 changed `revalidateTag` to require a cache-life
    // profile argument, so this stays consistent with the established
    // pattern rather than introducing a new API shape for one screen).
    revalidatePath(`/${saved.slug}`);
    revalidatePath("/");

    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deletePageAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deletePage(id);
  revalidatePath("/admin/pages");
  revalidatePath("/");
}

export async function createPageAndRedirect(formData: FormData) {
  await requireContentRole();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const existingAll = await db.listPages({ perPage: 500, includeDrafts: true });
  const slug = uniqueSlug(slugify(title), existingAll.items.map((p) => p.slug));

  const saved = await db.savePage({
    slug,
    title,
    status: "draft",
    published_at: null,
    template: null,
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    blocks: [],
  });
  revalidatePath("/admin/pages");
  redirect(`/admin/pages/${saved.id}`);
}

/**
 * Shared blocks (migration 24). Two operations the page editor needs:
 * promote an inline block into the shared library, and update a shared
 * block's content from wherever it is placed.
 *
 * Both revalidate every path, because a shared block by definition appears
 * on pages this action knows nothing about — narrowing that would leave
 * stale copies on the other placements.
 */
export async function createSharedBlockAction(
  name: string,
  blockType: string,
  data: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();
    if (!name.trim()) return { ok: false, error: "יש לתת שם לבלוק המשותף." };
    const saved = await db.saveSharedBlock({
      name: name.trim(),
      block_type: blockType as never,
      data,
    } as never);
    revalidatePath("/", "layout");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function updateSharedBlockAction(
  id: string,
  data: unknown,
): Promise<ActionResult<null>> {
  try {
    await requireContentRole();
    await db.saveSharedBlock({ id, data } as never);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteSharedBlockAction(id: string): Promise<ActionResult<null>> {
  try {
    await requireContentRole();
    await db.deleteSharedBlock(id);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}
