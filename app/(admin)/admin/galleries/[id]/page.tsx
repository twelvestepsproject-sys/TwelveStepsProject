import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { GalleryForm } from "../gallery-form";

export default async function EditGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [galleries, media, session] = await Promise.all([
    db.listGalleries(),
    db.listMedia({ perPage: 100 }),
    getDevSession(),
  ]);
  const gallery = galleries.find((g) => g.id === id);
  if (!gallery) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת גלריה</h1>
      <GalleryForm gallery={gallery} mediaOptions={media.items} canEdit={canEdit} />
    </div>
  );
}
