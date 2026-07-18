import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { MediaGrid } from "./media-grid";
import { UploadCard } from "./upload-card";

/**
 * §8 Media Library: "list/grid view... search... upload UI... usage
 * list... safe delete with in-use warning." List/grid + search here;
 * per-item edit (alt/license) and delete-with-usage-warning live in
 * `<MediaGrid>` (client component, since each card needs its own
 * open/edit/confirm state). Upload has its own always-visible card at the
 * top (in addition to being reachable from any `<MediaPickerField>`
 * elsewhere in the admin) so this screen is a complete, standalone upload
 * destination too, not just a picker backend.
 */
export default async function MediaLibraryPage({
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
        <h1 className="font-display text-2xl font-bold text-ink">ספריית מדיה</h1>
      </div>

      {canEdit ? <UploadCard /> : null}

      <ListToolbar />

      <Suspense fallback={<AdminLoadingRows rows={6} />}>
        <MediaList q={q} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function MediaList({ q, canEdit }: { q?: string; canEdit: boolean }) {
  const result = await db.listMedia({ q, perPage: 200 });

  if (result.items.length === 0) {
    return <AdminEmptyState message="אין עדיין קבצי מדיה. ניתן להעלות קובץ חדש למעלה." />;
  }

  return <MediaGrid items={result.items} canEdit={canEdit} />;
}
