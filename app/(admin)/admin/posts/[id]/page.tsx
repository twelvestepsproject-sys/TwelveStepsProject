import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { PostForm } from "../post-form";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, categories, session] = await Promise.all([
    db.getPostAdmin(id),
    db.listCategories(),
    getDevSession(),
  ]);
  if (!post) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";

  // Resolved here rather than inside the picker: the form is a client
  // component, and without the row it would have to fetch the whole media
  // list just to render one thumbnail it already has the id for.
  const coverImage = post.cover_image_id ? await db.getMedia(post.cover_image_id) : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת מאמר</h1>
      <PostForm
        post={post}
        categories={categories}
        canEdit={canEdit}
        coverImage={coverImage}
      />
    </div>
  );
}
