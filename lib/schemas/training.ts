import { z } from "zod";
import {
  uuidSchema,
  timestampSchema,
  placeholderFields,
  slugSchema,
  seoFieldsSchema,
  draftPublishedStatus,
} from "./common";
import { lecturerSchema } from "./lecturer";

/** §6 syllabus jsonb — a simple ordered list of syllabus sections so the
 * shape is concrete enough to render and to validate on write. */
export const syllabusItemSchema = z.object({
  title: z.string(),
  body: z.string(),
});
export type SyllabusItem = z.infer<typeof syllabusItemSchema>;

/**
 * §6 trainings. Every quantity field is numeric per the general rule
 * (academic_hours, sessions_count, price) — units are a display concern.
 * `instructors` is the resolved m2m → lecturers join, nested exactly like
 * the future SQL join will return it (§5.5 rule 6: "No joins in
 * components").
 */
export const trainingSchema = z.object({
  id: uuidSchema,
  slug: slugSchema,
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
  cover_image_id: uuidSchema.nullable(),
  starts_on: z.iso.date().nullable(),
  ends_on: z.iso.date().nullable(),
  meeting_day: z.string().nullable(),
  meeting_time: z.string().nullable(),
  academic_hours: z.number().int().nonnegative(),
  sessions_count: z.number().int().nonnegative(),
  instructors: z.array(lecturerSchema),
  syllabus: z.array(syllabusItemSchema),
  /** integer, smallest currency unit (agorot); null if unset. Never a
   * formatted string. */
  price: z.number().int().nonnegative().nullable(),
  registration_url: z.string().nullable(),
  is_featured: z.boolean(),
  status: draftPublishedStatus,
  sort_order: z.number().int(),
  ...seoFieldsSchema.shape,
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Training = z.infer<typeof trainingSchema>;

/** Summary shape for carousel/list cards — §5 block 7 (trainings carousel). */
export const trainingSummarySchema = trainingSchema.pick({
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  cover_image_id: true,
  starts_on: true,
  is_featured: true,
  academic_hours: true,
  sessions_count: true,
  price: true,
});
export type TrainingSummary = z.infer<typeof trainingSummarySchema>;
