import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { TrainingForm } from "../training-form";

export default async function NewTrainingPage() {
  const [lecturers, session] = await Promise.all([db.listLecturers(), getDevSession()]);
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">הכשרה חדשה</h1>
      <TrainingForm lecturers={lecturers} canEdit={canEdit} />
    </div>
  );
}
