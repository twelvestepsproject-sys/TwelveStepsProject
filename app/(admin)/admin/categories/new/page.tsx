import { getDevSession } from "@/lib/admin/dev-session";
import { CategoryForm } from "../category-form";

export default async function NewCategoryPage() {
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">קטגוריה חדשה</h1>
      <CategoryForm canEdit={canEdit} />
    </div>
  );
}
