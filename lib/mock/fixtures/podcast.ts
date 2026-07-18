import type { PodcastEpisode } from "@/lib/schemas";

/** §5.5: 1 podcast entry — its presence is data-driven (§5 block 15), not
 * a code branch. */
export const podcastEpisodes = [
  {
    id: "70000000-0000-4000-8000-000000000001",
    title: "פרק 1 — על הצעד הראשון",
    description:
      "בפרק הפתיחה של הפודקאסט של מכללת אשד מדברים על מה שקורה ברגע שלפני שמחליטים לבקש עזרה, ולמה זה כל כך קשה ומשמעותי בו זמנית.",
    spotify_url: "https://open.spotify.com/show/placeholder-eshed-podcast",
    published_at: "2026-01-15T09:00:00Z",
    duration: 1830,
    cover_image_id: null,
    is_placeholder: true,
    created_at: "2026-01-15T09:00:00Z",
    updated_at: "2026-01-15T09:00:00Z",
  },
] satisfies PodcastEpisode[];
