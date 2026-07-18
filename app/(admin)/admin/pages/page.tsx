import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { StatusBadge, PlaceholderBadge } from "@/components/admin/badges";
import { PrimaryButton } from "@/components/admin/fields";
import { createPageAndRedirect } from "./actions";
import { inputClass } from "@/components/admin/fields";

/** §8 Pages: "list, create, edit." */
export default async function PagesListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">עמודים</h1>
      </div>

      {canEdit ? (
        <form action={createPageAndRedirect} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border bg-surface-alt/40 p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="new-page-title" className="text-xs font-semibold text-ink">
              כותרת עמוד חדש
            </label>
            <input id="new-page-title" name="title" required className={inputClass} placeholder="למשל: יצירת קשר" />
          </div>
          <PrimaryButton type="submit">יצירת עמוד</PrimaryButton>
        </form>
      ) : null}

      <ListToolbar statusOptions={[{ value: "draft", label: "טיוטה" }, { value: "published", label: "פורסם" }]} />

      <Suspense fallback={<AdminLoadingRows rows={4} />}>
        <PagesTable q={q} status={status} />
      </Suspense>
    </div>
  );
}

async function PagesTable({ q, status }: { q?: string; status?: string }) {
  const result = await db.listPages({ q, status, includeDrafts: true, perPage: 200 });

  if (result.items.length === 0) {
    return <AdminEmptyState message="אין עדיין עמודים. ניתן ליצור עמוד חדש למעלה." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-start text-sm">
        <thead className="bg-surface-alt text-ink-muted">
          <tr>
            <th className="p-3 text-start">כותרת</th>
            <th className="p-3 text-start">כתובת</th>
            <th className="p-3 text-start">סטטוס</th>
            <th className="p-3 text-start">בלוקים</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {result.items.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="p-3 font-semibold text-ink">
                {p.title}
                {p.is_placeholder ? (
                  <span className="ms-2 inline-block align-middle">
                    <PlaceholderBadge />
                  </span>
                ) : null}
              </td>
              <td className="p-3 text-ink-muted" dir="ltr">
                /{p.slug}
              </td>
              <td className="p-3">
                <StatusBadge status={p.status} />
              </td>
              <td className="p-3 text-ink-muted">{p.blocks.length}</td>
              <td className="p-3">
                <Link href={`/admin/pages/${p.id}`} className="text-primary underline">
                  עריכה
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
