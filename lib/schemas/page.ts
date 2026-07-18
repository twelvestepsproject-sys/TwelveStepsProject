import { z } from "zod";
import {
  uuidSchema,
  timestampSchema,
  placeholderFields,
  slugSchema,
  seoFieldsSchema,
  draftPublishedStatus,
} from "./common";
import { pageBlockSchema } from "./blocks";

/** §6 pages. `page_blocks` are nested/resolved here in the order they'll
 * render, mirroring the future SQL join (§5.5 rule 6). */
export const pageSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  title: z.string(),
  status: draftPublishedStatus,
  published_at: timestampSchema.nullable(),
  template: z.string().nullable(),
  blocks: z.array(pageBlockSchema),
  ...seoFieldsSchema.shape,
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Page = z.infer<typeof pageSchema>;

/** Input shape for `savePage()` (§5.5) — the CMS writes a page's own
 * fields plus its full block list back in one call. */
export const pageInputSchema = pageSchema
  .omit({ id: true, created_at: true, updated_at: true, is_placeholder: true })
  .extend({ id: uuidSchema.optional() });
export type PageInput = z.infer<typeof pageInputSchema>;
