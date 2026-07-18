import type { Metadata } from "next";
import { db } from "@/lib/queries";
import { formatDuration } from "@/lib/format";

/**
 * `/podcast` — Podcast episodes list (§4 `/[podcast]`, "only if the client
 * has one" — the fixture volume does include one episode per §5.5, proving
 * the harder/present case). Slug is literal `podcast` per the task brief
 * (an English loanword already used as-is in the header nav, matching the
 * same style as `/gallery` staying literal per §4).
 */
export const metadata: Metadata = {
  title: "פודקאסט | מכללת אשד",
  description: "הפודקאסט של מכללת אשד — שיחות על תהליכי שינוי, ליווי, וקהילה.",
};

export default async function PodcastIndexPage() {
  const episodes = await db.listPodcastEpisodes();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">הפודקאסט שלנו</h1>
        <p className="mt-2 text-ink-muted">שיחות על תהליכי שינוי, ליווי, וקהילה.</p>
      </header>

      {episodes.length === 0 ? (
        <p className="text-center text-ink-muted">אין כרגע פרקים להצגה.</p>
      ) : (
        <ol className="flex flex-col gap-6">
          {episodes.map((ep) => (
            <li key={ep.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-ink">{ep.title}</h2>
              <p className="mt-2 text-sm text-ink-muted">{ep.description}</p>
              <p className="mt-2 text-xs text-ink-muted">{formatDuration(ep.duration)}</p>
              <a
                href={ep.spotify_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
              >
                האזנה בספוטיפיי
              </a>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
