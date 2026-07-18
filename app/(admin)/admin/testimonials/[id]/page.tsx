import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { TestimonialForm } from "../testimonial-form";

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [admin, session] = await Promise.all([
    db.listTestimonialsAdmin({ perPage: 500 }),
    getDevSession(),
  ]);
  const testimonial = admin.items.find((t) => t.id === id);
  if (!testimonial) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";
  const photo = testimonial.photo_id ? await db.getMedia(testimonial.photo_id) : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת המלצה</h1>
      <TestimonialForm testimonial={testimonial} canEdit={canEdit} photo={photo} />
    </div>
  );
}
