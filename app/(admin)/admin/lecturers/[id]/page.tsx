import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { LecturerForm } from "../lecturer-form";

export default async function EditLecturerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lecturer, session] = await Promise.all([db.getLecturer(id), getDevSession()]);
  if (!lecturer) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";
  const photo = lecturer.photo_id ? await db.getMedia(lecturer.photo_id) : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת מרצה</h1>
      <LecturerForm lecturer={lecturer} canEdit={canEdit} photo={photo} />
    </div>
  );
}
