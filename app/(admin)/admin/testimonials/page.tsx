import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { VisibilityBadge, PlaceholderBadge, ConsentBadge } from "@/components/admin/badges";
import { PrimaryButton } from "@/components/admin/fields";
import { TestimonialRowActions } from "./row-actions";

export default async function TestimonialsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">המלצות</h1>
        {canEdit ? (
          <Link href="/admin/testimonials/new">
            <PrimaryButton type="button">המלצה חדשה</PrimaryButton>
          </Link>
        ) : null}
      </div>
      <ListToolbar />
      <Suspense fallback={<AdminLoadingRows />}>
        <TestimonialsTable q={q} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function TestimonialsTable({ q, canEdit }: { q?: string; canEdit: boolean }) {
  const result = await db.listTestimonialsAdmin({ q, perPage: 200 });

  if (result.items.length === 0) {
    return <AdminEmptyState message="אין המלצות תואמות לחיפוש." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-start">
            <th className="px-3 py-2 text-start font-semibold text-ink">שם</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">ציטוט</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">הסכמה</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">תצוגה</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <Link href={`/admin/testimonials/${t.id}`} className="font-semibold text-ink hover:underline">
                  {t.author_name}
                </Link>
                {t.is_placeholder ? (
                  <span className="ms-2 inline-block align-middle">
                    <PlaceholderBadge />
                  </span>
                ) : null}
              </td>
              <td className="max-w-xs truncate px-3 py-2 text-ink-muted">{t.quote}</td>
              <td className="px-3 py-2">
                <ConsentBadge onFile={t.consent_on_file} />
              </td>
              <td className="px-3 py-2">
                <VisibilityBadge visible={t.is_visible} />
              </td>
              <td className="px-3 py-2">
                <TestimonialRowActions id={t.id} isVisible={t.is_visible} canEdit={canEdit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
