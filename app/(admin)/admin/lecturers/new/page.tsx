import { getDevSession } from "@/lib/admin/dev-session";
import { LecturerForm } from "../lecturer-form";

export default async function NewLecturerPage() {
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">מרצה חדש/ה</h1>
      <LecturerForm canEdit={canEdit} />
    </div>
  );
}
