import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { PodcastForm } from "../podcast-form";

export default async function EditPodcastEpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [episodes, session] = await Promise.all([db.listPodcastEpisodes(), getDevSession()]);
  const episode = episodes.find((e) => e.id === id);
  if (!episode) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת פרק</h1>
      <PodcastForm episode={episode} canEdit={canEdit} />
    </div>
  );
}
