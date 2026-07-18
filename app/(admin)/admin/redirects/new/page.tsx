import { getDevSession } from "@/lib/admin/dev-session";
import { RedirectForm } from "../redirect-form";

export default async function NewRedirectPage() {
  const session = await getDevSession();
  const canEdit = session?.role === "admin";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">הפניה חדשה</h1>
      <RedirectForm canEdit={canEdit} />
    </div>
  );
}
