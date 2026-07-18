import { z } from "zod";
import {
  uuidSchema,
  timestampSchema,
  placeholderFields,
  slugSchema,
  seoFieldsSchema,
  draftPublishedStatus,
} from "./common";
import { categorySchema } from "./category";

/**
 * §6 posts. `reading_time` is integer minutes — never a formatted string.
 * Public listing logic (§5.5 / §6, tested by fixtures
 * machshavot-al-hemshech and tiuta-lo-gmura):
 *   status = 'published' AND published_at <= now()
 * These are two independent filters; both are needed. Author is modeled
 * as a nullable uuid FK to `profiles` (admin/system, §6) — profiles aren't
 * public content, so posts expose only `author_id` here; the public
 * byline (if any) is rendered from a denormalized name at the block level,
 * not fetched from `profiles` by a public component.
 */
export const postSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
  cover_image_id: uuidSchema.nullable(),
  category_id: uuidSchema.nullable(),
  category: categorySchema.nullable(),
  author_id: uuidSchema.nullable(),
  published_at: timestampSchema.nullable(),
  reading_time: z.number().int().positive(),
  status: draftPublishedStatus,
  ...seoFieldsSchema.shape,
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Post = z.infer<typeof postSchema>;

/** §5 block 17 (latest articles) / blog index cards. */
export const postSummarySchema = postSchema.pick({
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  cover_image_id: true,
  category: true,
  published_at: true,
  reading_time: true,
});
export type PostSummary = z.infer<typeof postSummarySchema>;
