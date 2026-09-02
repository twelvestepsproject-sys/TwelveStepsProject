import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { CategoryForm } from "../category-form";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [categories, session] = await Promise.all([db.listCategories(), getDevSession()]);
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">{category.name}</h1>
      <CategoryForm category={category} canEdit={canEdit} />
    </div>
  );
}
