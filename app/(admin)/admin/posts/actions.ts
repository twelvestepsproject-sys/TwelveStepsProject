"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import { slugify, uniqueSlug, isSlugUnique } from "@/lib/admin/slug";
import type { Post } from "@/lib/schemas";

async function allPostSlugs(): Promise<{ slug: string; id: string }[]> {
  // listPosts only returns PostSummary; slug + id are both on it, so this
  // is sufficient for a uniqueness check without fetching full bodies.
  const all = await db.listPosts({ includeDrafts: true, perPage: 1000 });
  return all.items.map((p) => ({ slug: p.slug, id: p.id }));
}

export async function savePostAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    const id = (formData.get("id") as string) || undefined;
    const title = String(formData.get("title") ?? "").trim();
    let slug = String(formData.get("slug") ?? "").trim() || slugify(title);

    const existing = await allPostSlugs();
    const otherSlugs = existing.filter((p) => p.id !== id).map((p) => p.slug);
    if (!id) {
      slug = uniqueSlug(slug, otherSlugs);
    } else if (!isSlugUnique(slug, otherSlugs)) {
      return { ok: false, error: "כתובת ה-URL (slug) הזו כבר בשימוש במאמר אחר." };
    }

    const categoryId = (formData.get("category_id") as string) || null;
    const categories = await db.listCategories();
    const category = categoryId ? (categories.find((c) => c.id === categoryId) ?? null) : null;

    const status = (formData.get("status") as Post["status"]) ?? "draft";
    const publishedAtRaw = (formData.get("published_at") as string) || "";
    const published_at = publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null;

    const input: Partial<Post> & { id?: string } = {
      id,
      slug,
      title,
      excerpt: String(formData.get("excerpt") ?? ""),
      body: String(formData.get("body") ?? ""),
      cover_image_id: null,
      category_id: categoryId,
      category,
      author_id: null,
      published_at,
      reading_time: Number(formData.get("reading_time") ?? 1) || 1,
      status,
      seo_title: null,
      seo_description: null,
      seo_canonical: null,
      seo_og_image_id: null,
      seo_noindex: false,
    };

    const saved = await db.savePost(input);
    revalidatePath("/admin/posts");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deletePostAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deletePost(id);
  revalidatePath("/admin/posts");
}

export async function togglePostPublishAction(id: string, nextStatus: "draft" | "published"): Promise<void> {
  await requireContentRole();
  await db.savePost({ id, status: nextStatus });
  revalidatePath("/admin/posts");
}

export async function createPostAndRedirect(formData: FormData) {
  const result = await savePostAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/posts/${result.data.id}`);
  }
}
