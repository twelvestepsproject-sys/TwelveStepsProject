import Link from "next/link";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { AdminEmptyState } from "@/components/admin/states";
import { PrimaryButton } from "@/components/admin/fields";
import { formatDuration } from "@/lib/format";
import { DeletePodcastButton } from "./delete-button";

export default async function PodcastListPage() {
  const [episodes, session] = await Promise.all([db.listPodcastEpisodes(), getDevSession()]);
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">פודקאסט</h1>
        {canEdit ? (
          <Link href="/admin/podcast/new">
            <PrimaryButton type="button">פרק חדש</PrimaryButton>
          </Link>
        ) : null}
      </div>

      {episodes.length === 0 ? (
        <AdminEmptyState message="אין פרקים עדיין." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-start">
                <th className="px-3 py-2 text-start font-semibold text-ink">כותרת</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">משך</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">פורסם</th>
                <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((ep) => (
                <tr key={ep.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/admin/podcast/${ep.id}`} className="font-semibold text-ink hover:underline">
                      {ep.title}
                    </Link>
                  </td>
                  {/* Duration is optional now — a video episode often has
                      none — and formatDuration(null) would print NaN:NaN. */}
                  <td className="px-3 py-2 text-ink-muted">
                    {ep.duration ? formatDuration(ep.duration) : "—"}
                  </td>
                  <td className="px-3 py-2 text-ink-muted">
                    {new Date(ep.published_at).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-3 py-2">{canEdit ? <DeletePodcastButton id={ep.id} /> : "צפייה בלבד"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
