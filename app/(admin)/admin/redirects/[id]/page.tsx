import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { RedirectForm } from "../redirect-form";

export default async function EditRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ items }, session] = await Promise.all([
    db.listRedirectsAdmin({ perPage: 500 }),
    getDevSession(),
  ]);
  const item = items.find((r) => r.id === id);
  if (!item) notFound();

  const canEdit = session?.role === "admin";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת הפניה</h1>
      <RedirectForm item={item} canEdit={canEdit} />
    </div>
  );
}
