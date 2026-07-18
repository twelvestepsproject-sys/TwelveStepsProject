import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields } from "./common";

/**
 * §6: testimonials.
 * CHECK (is_placeholder OR NOT is_visible OR consent_on_file) — a real
 * testimonial cannot be visible without consent on file. Fictional /
 * placeholder rows are exempt so fixtures aren't blocked. This is a
 * backstop per §8 — the Server Action (Phase 4) is the primary UX that
 * prevents ever hitting it.
 */
const testimonialBase = z.object({
  id: uuidSchema,
  author_name: z.string(),
  quote: z.string(),
  photo_id: uuidSchema.nullable(),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  consent_on_file: z.boolean(),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const testimonialSchema = testimonialBase.refine(
  (t) => t.is_placeholder || !t.is_visible || t.consent_on_file,
  {
    message:
      "a real (non-placeholder) testimonial cannot be visible without consent_on_file",
    path: ["consent_on_file"],
  },
);

export type Testimonial = z.infer<typeof testimonialBase>;
