import { z } from "zod";

/** Postgres FTS backs `search()` in production (§6); the mock approximates
 * it with substring matching over the same searchable entities. */
export const searchResultTypeSchema = z.enum(["post", "training", "page"]);
export type SearchResultType = z.infer<typeof searchResultTypeSchema>;

export const searchResultSchema = z.object({
  type: searchResultTypeSchema,
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
