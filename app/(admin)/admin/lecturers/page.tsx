import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { VisibilityBadge, PlaceholderBadge, ConsentBadge } from "@/components/admin/badges";
import { PrimaryButton } from "@/components/admin/fields";
import { LecturerRowActions } from "./row-actions";

export default async function LecturersListPage({
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
        <h1 className="font-display text-2xl font-bold text-ink">מרצים</h1>
        {canEdit ? (
          <Link href="/admin/lecturers/new">
            <PrimaryButton type="button">מרצה חדש/ה</PrimaryButton>
          </Link>
        ) : null}
      </div>
      <ListToolbar />
      <Suspense fallback={<AdminLoadingRows />}>
        <LecturersTable q={q} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function LecturersTable({ q, canEdit }: { q?: string; canEdit: boolean }) {
  const result = await db.listLecturersAdmin({ q, perPage: 200 });

  if (result.items.length === 0) {
    return <AdminEmptyState message="אין מרצים תואמים לחיפוש." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-start">
            <th className="px-3 py-2 text-start font-semibold text-ink">שם</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">תפקיד</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">הסכמה</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">תצוגה</th>
            <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((l) => (
            <tr key={l.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <Link href={`/admin/lecturers/${l.id}`} className="font-semibold text-ink hover:underline">
                  {l.name}
                </Link>
                {l.is_placeholder ? (
                  <span className="ms-2 inline-block align-middle">
                    <PlaceholderBadge />
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 text-ink-muted">{l.role}</td>
              <td className="px-3 py-2">
                <ConsentBadge onFile={l.consent_on_file} />
              </td>
              <td className="px-3 py-2">
                <VisibilityBadge visible={l.is_visible} />
              </td>
              <td className="px-3 py-2">
                <LecturerRowActions id={l.id} isVisible={l.is_visible} canEdit={canEdit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
