import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields } from "./common";

export const galleryImageSchema = z.object({
  id: uuidSchema,
  gallery_id: uuidSchema,
  media_id: uuidSchema,
  alt_he: z.string(),
  sort_order: z.number().int(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type GalleryImage = z.infer<typeof galleryImageSchema>;

/** §6 galleries + gallery_images, nested — §5 block 14 (photo gallery). */
export const gallerySchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  title: z.string(),
  images: z.array(galleryImageSchema),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Gallery = z.infer<typeof gallerySchema>;
