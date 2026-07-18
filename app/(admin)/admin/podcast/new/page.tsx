import { getDevSession } from "@/lib/admin/dev-session";
import { PodcastForm } from "../podcast-form";

export default async function NewPodcastEpisodePage() {
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">פרק חדש</h1>
      <PodcastForm canEdit={canEdit} />
    </div>
  );
}
