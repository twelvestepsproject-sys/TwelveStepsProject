import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { GalleryForm } from "../gallery-form";

export default async function NewGalleryPage() {
  const [media, session] = await Promise.all([db.listMedia({ perPage: 100 }), getDevSession()]);
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">גלריה חדשה</h1>
      <GalleryForm mediaOptions={media.items} canEdit={canEdit} />
    </div>
  );
}
