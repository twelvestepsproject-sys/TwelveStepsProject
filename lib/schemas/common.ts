import { z } from "zod";

/**
 * Shared primitives used across every entity schema (§6).
 */

/** uuid PK, per §6 ("uuid PKs"). */
export const uuidSchema = z.string().uuid();

/** created_at / updated_at, ISO date strings — mocks must be serializable
 * exactly like PostgREST responses (§5.5 rule 8). */
export const timestampSchema = z.iso.datetime();

/** Every content table in §6 carries this — see §5.5's dedicated section.
 * Admin-only metadata; never read or rendered by any public component. */
export const placeholderFields = {
  is_placeholder: z.boolean(),
};

export const draftPublishedStatus = z.enum(["draft", "published"]);
export type DraftPublishedStatus = z.infer<typeof draftPublishedStatus>;

/** Lowercase slug: ascii, digits, hyphen — OR Hebrew letters + hyphen.
 * Slugs stay Hebrew per §8 ("stays Hebrew, no transliteration") but the
 * fixture slugs in this repo are ascii-transliterated Latin per the sample
 * content review, so accept both scripts. */
export const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9֐-׿]+(-[a-z0-9֐-׿]+)*$/u, "invalid slug");

export const seoFieldsSchema = z.object({
  seo_title: z.string().nullable(),
  seo_description: z.string().nullable(),
  seo_canonical: z.string().nullable(),
  seo_og_image_id: uuidSchema.nullable(),
  seo_noindex: z.boolean(),
});
export type SeoFields = z.infer<typeof seoFieldsSchema>;

/** `media` table (§6). storage_path is Storage-relative; in mock mode it's
 * a path under /lib/mock/fixtures/images resolved by the fixture, or a
 * public/ path once served by Next. */
export const mediaSchema = z.object({
  id: uuidSchema,
  storage_path: z.string(),
  alt_he: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mime_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  blurhash: z.string().nullable(),
  license_note: z.string().nullable(),
  uploaded_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Media = z.infer<typeof mediaSchema>;

/** Generic pagination envelope — every paginated list method returns this,
 * never a bare array (§5.5 / Task instructions). */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}
