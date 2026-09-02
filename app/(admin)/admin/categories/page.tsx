import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { PrimaryButton } from "@/components/admin/fields";
import { CategoryRowActions } from "./row-actions";

/**
 * Blog categories. The data layer has always had saveCategory/deleteCategory
 * but no screen ever called them, so adding one meant writing SQL — this is
 * that screen.
 */
export default async function CategoriesListPage() {
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">קטגוריות</h1>
        {canEdit ? (
          <Link href="/admin/categories/new">
            <PrimaryButton type="button">קטגוריה חדשה</PrimaryButton>
          </Link>
        ) : null}
      </div>
      <p className="text-sm text-ink-muted">
        הקטגוריות מופיעות כסינון בעמוד המאמרים. שיוך מאמר לקטגוריה נעשה במסך המאמר.
      </p>
      <Suspense fallback={<AdminLoadingRows />}>
        <CategoriesTable canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function CategoriesTable({ canEdit }: { canEdit: boolean }) {
  const categories = await db.listCategories();

  if (categories.length === 0) {
    return <AdminEmptyState message="עדיין אין קטגוריות." />;
  }

  // How many articles sit in each, so the editor can see at a glance which
  // ones are in use — and why a delete might be refused.
  const counts = await Promise.all(
    categories.map((c) =>
      db.listPosts({ categorySlug: c.slug, page: 1, perPage: 1 }).then((r) => r.total),
    ),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-start">
            <th className="px-3 py-2 text-start font-semibold text-ink">שם</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">תיאור</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">מאמרים</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={c.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <Link
                  href={`/admin/categories/${c.id}`}
                  className="font-semibold text-ink hover:underline"
                >
                  {c.name}
                </Link>
              </td>
              <td className="max-w-xs truncate px-3 py-2 text-ink-muted">{c.description ?? "—"}</td>
              <td className="px-3 py-2 text-ink-muted tabular-nums">{counts[i]}</td>
              <td className="px-3 py-2">
                <CategoryRowActions id={c.id} name={c.name} canEdit={canEdit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
