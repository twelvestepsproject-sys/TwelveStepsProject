"use server";

import { revalidatePath } from "next/cache";
import { revalidateEmetForPost } from "@/lib/emet/revalidate";
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
    // A post marked published with the date left blank is invisible to the
    // public site and gives no hint why: the public filter checks the status
    // and the date as two independent conditions (lib/queries/supabase/
    // index.ts - getPost, listPosts, search), so a null date fails it even
    // though the status passes. Fifteen of the English sources were saved
    // this way and 404'd while looking published in the admin.
    //
    // Publishing without a date means "publish now", so that is what it
    // does. An explicit date is still honoured, including a future one,
    // which is how scheduled publishing keeps working. A draft keeps its
    // null: a draft is not waiting on a date.
    const published_at = publishedAtRaw
      ? new Date(publishedAtRaw).toISOString()
      : status === "published"
        ? new Date().toISOString()
        : null;

    const input: Partial<Post> & { id?: string } = {
      id,
      slug,
      title,
      excerpt: String(formData.get("excerpt") ?? ""),
      body: String(formData.get("body") ?? ""),
      // Blank stays null, not "" — the article page tests cta_url directly
      // to decide whether to render the button at all.
      cta_label: String(formData.get("cta_label") ?? "").trim() || null,
      cta_url: String(formData.get("cta_url") ?? "").trim() || null,
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
    // The public pages, not just the admin list: without these a published
    // post would not appear until the cache expired on its own.
    revalidatePath("/blog");
    revalidatePath(`/blog/${saved.slug}`);
    revalidatePath("/rss.xml");
    // The EMETMATRIX pages too: they are built from the same posts table,
    // and every (emet) route caches for an hour. Without this a saved
    // chapter stays as it was until the cache lapses, and a newly created
    // one 404s until the next deploy.
    revalidateEmetForPost(saved);
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deletePostAction(id: string): Promise<void> {
  await requireContentRole();
  // Read it before deleting: afterwards there is no category to work out
  // which EMETMATRIX pages listed it, and a deleted chapter would go on
  // being served from the cache.
  const doomed = await db.getPostAdmin(id);
  await db.deletePost(id);
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath("/rss.xml");
  if (doomed) revalidateEmetForPost(doomed);
}

export async function togglePostPublishAction(id: string, nextStatus: "draft" | "published"): Promise<void> {
  await requireContentRole();
  const saved = await db.savePost({ id, status: nextStatus });
  revalidatePath("/admin/posts");
  // Publishing and unpublishing are exactly when the public list changes.
  revalidatePath("/blog");
  revalidatePath(`/blog/${saved.slug}`);
  revalidatePath("/rss.xml");
  revalidateEmetForPost(saved);
}

export async function createPostAndRedirect(formData: FormData) {
  const result = await savePostAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/posts/${result.data.id}`);
  }
}
