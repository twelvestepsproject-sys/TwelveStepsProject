import { getDevSession } from "@/lib/admin/dev-session";
import { TestimonialForm } from "../testimonial-form";

export default async function NewTestimonialPage() {
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">המלצה חדשה</h1>
      <TestimonialForm canEdit={canEdit} />
    </div>
  );
}
