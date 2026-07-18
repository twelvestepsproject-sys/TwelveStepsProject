import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields } from "./common";

/** §6 podcast_episodes. `duration` is integer seconds — never formatted. */
export const podcastEpisodeSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  description: z.string(),
  spotify_url: z.string(),
  published_at: timestampSchema,
  duration: z.number().int().positive(),
  cover_image_id: uuidSchema.nullable(),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type PodcastEpisode = z.infer<typeof podcastEpisodeSchema>;
