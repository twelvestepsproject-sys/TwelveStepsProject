import type { z } from "zod";
import type { podcastBlockDataSchema } from "@/lib/schemas";
import { db } from "@/lib/queries";
import { Skeleton } from "./skeleton";
import { RevealOnScroll } from "./_shared/reveal-on-scroll";

/**
 * §5 block 15 — Podcast. Its presence on the homepage is a matter of the
 * `page_blocks` row existing and being visible, not a code branch — but
 * this component still guards on the underlying `podcast_episodes` data
 * being non-empty, since a podcast block with zero episodes has nothing
 * to show (a client who removes their only episode shouldn't leave a bare
 * heading behind).
 */
type PodcastData = z.infer<typeof podcastBlockDataSchema>;

export async function Podcast({ data }: { data: PodcastData }) {
  const episodes = await db.listPodcastEpisodes();

  if (episodes.length === 0) return null;
  const latest = episodes[0];

  return (
    <section className="bg-primary px-6 py-16 text-primary-fg">
      <RevealOnScroll className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        {data.heading ? (
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{data.heading}</h2>
        ) : null}
        <h3 className="font-display text-lg font-bold">{latest.title}</h3>
        <p className="text-primary-fg/90">{latest.description}</p>
        <a
          href={data.platform_cta.href}
          target={data.platform_cta.open_in_new_tab ? "_blank" : undefined}
          rel={data.platform_cta.open_in_new_tab ? "noreferrer" : undefined}
          className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
        >
          {data.platform_cta.label}
        </a>
      </RevealOnScroll>
    </section>
  );
}

export function PodcastSkeleton() {
  return (
    <section className="bg-primary px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        <Skeleton className="h-8 w-48 bg-primary-fg/20" />
        <Skeleton className="h-6 w-64 bg-primary-fg/20" />
        <Skeleton className="h-12 w-40 rounded-full bg-primary-fg/20" />
      </div>
    </section>
  );
}
