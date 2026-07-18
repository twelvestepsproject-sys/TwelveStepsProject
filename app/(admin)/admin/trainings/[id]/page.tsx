import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { TrainingForm } from "../training-form";

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [admin, lecturers, session] = await Promise.all([
    db.listTrainingsAdmin({ perPage: 500 }),
    db.listLecturers(),
    getDevSession(),
  ]);
  const training = admin.items.find((t) => t.id === id);
  if (!training) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";
  const coverImage = training.cover_image_id ? await db.getMedia(training.cover_image_id) : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת הכשרה</h1>
      <TrainingForm training={training} lecturers={lecturers} canEdit={canEdit} coverImage={coverImage} />
    </div>
  );
}
