import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields, slugSchema } from "./common";

export const categorySchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  name: z.string(),
  description: z.string().nullable(),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Category = z.infer<typeof categorySchema>;
