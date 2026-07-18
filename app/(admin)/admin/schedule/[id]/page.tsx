import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ScheduleForm } from "../schedule-form";

export default async function EditScheduleEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [entries, session] = await Promise.all([db.listScheduleEntries(), getDevSession()]);
  const entry = entries.find((e) => e.id === id);
  if (!entry) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת מועד</h1>
      <ScheduleForm entry={entry} canEdit={canEdit} />
    </div>
  );
}
