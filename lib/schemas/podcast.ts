import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields } from "./common";

/** §6 podcast_episodes. `duration` is integer seconds — never formatted. */
export const podcastEpisodeSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string(),
  spotify_url: z.string(),
  // Optional YouTube URL. When present the block embeds the video; when
  // absent it keeps linking out to the platform, so this is a per-episode
  // choice rather than a site-wide switch. Nullish (not just nullable)
  // because rows created before migration 28 have no such column at all.
  video_url: z.string().nullish(),
  published_at: timestampSchema,
  duration: z.number().int().positive(),
  cover_image_id: uuidSchema.nullable(),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type PodcastEpisode = z.infer<typeof podcastEpisodeSchema>;
