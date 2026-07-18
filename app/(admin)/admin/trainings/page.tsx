import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { StatusBadge, PlaceholderBadge } from "@/components/admin/badges";
import { formatPrice, formatHours } from "@/lib/format";
import { PrimaryButton } from "@/components/admin/fields";
import { TrainingRowActions } from "./row-actions";

/**
 * §8 CRUD list: search, status filter, bulk publish/duplicate/drag-reorder.
 * SIMPLIFIED THIS PASS (flagged per task brief): drag-to-reorder and bulk
 * publish are not built — sort_order is editable per-row in the edit form,
 * and publish/unpublish + duplicate are single-row actions (see
 * TrainingRowActions). Prioritizing correctness of the core CRUD flow per
 * the task brief's explicit trade-off.
 */
export default async function TrainingsListPage({
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
        <h1 className="font-display text-2xl font-bold text-ink">הכשרות</h1>
        {canEdit ? (
          <Link href="/admin/trainings/new">
            <PrimaryButton type="button">הכשרה חדשה</PrimaryButton>
          </Link>
        ) : null}
      </div>
      <ListToolbar
        statusOptions={[
          { value: "draft", label: "טיוטה" },
          { value: "published", label: "פורסם" },
        ]}
      />
      <Suspense fallback={<AdminLoadingRows />}>
        <TrainingsTable q={q} status={status} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function TrainingsTable({
  q,
  status,
  canEdit,
}: {
  q?: string;
  status?: string;
  canEdit: boolean;
}) {
  const result = await db.listTrainingsAdmin({ q, status, includeDrafts: true, perPage: 100 });

  if (result.items.length === 0) {
    return <AdminEmptyState message="אין הכשרות תואמות לחיפוש." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-start">
            <th className="px-3 py-2 text-start font-semibold text-ink">כותרת</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">סטטוס</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">שעות</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">מחיר</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <Link href={`/admin/trainings/${t.id}`} className="font-semibold text-ink hover:underline">
                  {t.title}
                </Link>
                {t.is_placeholder ? (
                  <span className="ms-2 inline-block align-middle">
                    <PlaceholderBadge />
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-3 py-2 text-ink-muted">{formatHours(t.academic_hours)}</td>
              <td className="px-3 py-2 text-ink-muted">{formatPrice(t.price) ?? "—"}</td>
              <td className="px-3 py-2">
                <TrainingRowActions id={t.id} status={t.status} canEdit={canEdit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
