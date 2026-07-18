import Link from "next/link";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { AdminEmptyState } from "@/components/admin/states";
import { PrimaryButton } from "@/components/admin/fields";
import { DeleteGalleryButton } from "./delete-button";

export default async function GalleriesListPage() {
  const [galleries, session] = await Promise.all([db.listGalleries(), getDevSession()]);
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">גלריות</h1>
        {canEdit ? (
          <Link href="/admin/galleries/new">
            <PrimaryButton type="button">גלריה חדשה</PrimaryButton>
          </Link>
        ) : null}
      </div>

      {galleries.length === 0 ? (
        <AdminEmptyState message="אין גלריות עדיין." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {galleries.map((g) => (
            <div key={g.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="font-semibold text-ink">{g.title}</p>
              <p className="text-xs text-ink-muted">{g.images.length} תמונות</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/admin/galleries/${g.id}`}>
                  <PrimaryButton type="button">עריכה</PrimaryButton>
                </Link>
                {canEdit ? <DeleteGalleryButton id={g.id} /> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
