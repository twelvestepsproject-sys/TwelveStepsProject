import { getDevSession } from "@/lib/admin/dev-session";
import { ScheduleForm } from "../schedule-form";

export default async function NewScheduleEntryPage() {
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">מועד חדש בלוח הזמנים</h1>
      <ScheduleForm canEdit={canEdit} />
    </div>
  );
}
