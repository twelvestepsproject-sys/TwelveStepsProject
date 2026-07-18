import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields } from "./common";

/** §6 schedule_entries — the "when do we start" panel. */
export const scheduleEntrySchema = z.object({
  id: uuidSchema,
  day_label: z.string(),
  start_date: z.iso.date(),
  end_date: z.iso.date().nullable(),
  time_range: z.string().nullable(),
  program_name: z.string(),
  cohort: z.string().nullable(),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;
