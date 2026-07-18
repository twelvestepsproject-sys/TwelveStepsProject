import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { PostForm } from "../post-form";

export default async function NewPostPage() {
  const [categories, session] = await Promise.all([db.listCategories(), getDevSession()]);
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">מאמר חדש</h1>
      <PostForm categories={categories} canEdit={canEdit} />
    </div>
  );
}
