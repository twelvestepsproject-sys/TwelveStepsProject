import Link from "next/link";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { AdminEmptyState } from "@/components/admin/states";
import { VisibilityBadge, PlaceholderBadge } from "@/components/admin/badges";
import { PrimaryButton } from "@/components/admin/fields";
import { ScheduleRowActions } from "./row-actions";

export default async function ScheduleListPage() {
  const [entries, session] = await Promise.all([db.listScheduleEntries(), getDevSession()]);
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">לוח זמנים</h1>
        {canEdit ? (
          <Link href="/admin/schedule/new">
            <PrimaryButton type="button">מועד חדש</PrimaryButton>
          </Link>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <AdminEmptyState message="אין מועדים עדיין." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-start">
                <th className="px-3 py-2 text-start font-semibold text-ink">תוכנית</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">תאריך התחלה</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">קבוצה</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">תצוגה</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/admin/schedule/${entry.id}`} className="font-semibold text-ink hover:underline">
                      {entry.program_name}
                    </Link>
                    {entry.is_placeholder ? (
                      <span className="ms-2 inline-block align-middle">
                        <PlaceholderBadge />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-ink-muted">
                    {new Date(entry.start_date).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{entry.cohort ?? "—"}</td>
                  <td className="px-3 py-2">
                    <VisibilityBadge visible={entry.is_visible} />
                  </td>
                  <td className="px-3 py-2">
                    <ScheduleRowActions id={entry.id} isVisible={entry.is_visible} canEdit={canEdit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
