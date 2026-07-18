import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields, slugSchema } from "./common";

/**
 * §6: lecturers.
 * CHECK (is_placeholder OR NOT is_visible OR consent_on_file) — a real
 * lecturer cannot be publicly visible without consent on file.
 * CHECK (NOT is_featured OR is_visible) — can't be featured while hidden.
 * Both are mirrored here as a zod `.refine` so the mock layer enforces the
 * same invariant the DB will enforce via CHECK constraints later.
 */
const lecturerBase = z.object({
  id: uuidSchema,
  name: z.string(),
  role: z.string(),
  bio: z.string(),
  photo_id: uuidSchema.nullable(),
  sort_order: z.number().int(),
  is_featured: z.boolean(),
  is_visible: z.boolean(),
  page_slug: slugSchema.nullable(),
  consent_on_file: z.boolean(),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const lecturerSchema = lecturerBase
  .refine((l) => l.is_placeholder || !l.is_visible || l.consent_on_file, {
    message:
      "a real (non-placeholder) lecturer cannot be visible without consent_on_file",
    path: ["consent_on_file"],
  })
  .refine((l) => !l.is_featured || l.is_visible, {
    message: "a lecturer cannot be featured while hidden",
    path: ["is_featured"],
  });

export type Lecturer = z.infer<typeof lecturerBase>;
