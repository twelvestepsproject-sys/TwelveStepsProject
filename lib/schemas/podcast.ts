import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields } from "./common";

/**
 * §6 podcast_episodes. `duration` is integer seconds — never formatted.
 *
 * Only `title` is required. An episode published as a YouTube video has no
 * Spotify link to paste and often no duration to hand, and a description is
 * optional either way — see migration 29. The public block does not depend
 * on any of them: its platform button reads the BLOCK's `platform_cta`,
 * not the episode's own link.
 */
export const podcastEpisodeSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string().nullish(),
  spotify_url: z.string().nullish(),
  // Optional YouTube URL. When present the block embeds the video; when
  // absent it keeps linking out to the platform, so this is a per-episode
  // choice rather than a site-wide switch. Nullish (not just nullable)
  // because rows created before migration 28 have no such column at all.
  video_url: z.string().nullish(),
  published_at: timestampSchema,
  duration: z.number().int().positive().nullish(),
  cover_image_id: uuidSchema.nullable(),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type PodcastEpisode = z.infer<typeof podcastEpisodeSchema>;
