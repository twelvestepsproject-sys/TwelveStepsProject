import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { PrimaryButton } from "@/components/admin/fields";
import { RedirectRowActions } from "./row-actions";

/**
 * §8 Redirects: "CRUD." §6: "applied in middleware" — see this task's
 * report for the explicit decision on whether that wiring was done this
 * pass (documented in middleware.ts's own header comment addition).
 */
export default async function RedirectsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await getDevSession();
  const canEdit = session?.role === "admin";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">הפניות</h1>
        {canEdit ? (
          <Link href="/admin/redirects/new">
            <PrimaryButton type="button">הפניה חדשה</PrimaryButton>
          </Link>
        ) : null}
      </div>
      <ListToolbar />
      <Suspense fallback={<AdminLoadingRows />}>
        <RedirectsTable q={q} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function RedirectsTable({ q, canEdit }: { q?: string; canEdit: boolean }) {
  const result = await db.listRedirectsAdmin({ q, perPage: 200 });

  if (result.items.length === 0) {
    return <AdminEmptyState message="אין הפניות מוגדרות." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-start">
            <th className="px-3 py-2 text-start font-semibold text-ink">מקור</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">יעד</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">קוד</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2" dir="ltr">
                <Link href={`/admin/redirects/${r.id}`} className="font-semibold text-ink hover:underline">
                  {r.from_path}
                </Link>
              </td>
              <td className="px-3 py-2 text-ink-muted" dir="ltr">
                {r.to_path}
              </td>
              <td className="px-3 py-2 text-ink-muted">{r.status_code}</td>
              <td className="px-3 py-2">
                <RedirectRowActions id={r.id} canEdit={canEdit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
