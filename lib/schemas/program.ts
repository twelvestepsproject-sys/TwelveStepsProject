import { z } from "zod";
import { uuidSchema, timestampSchema, placeholderFields } from "./common";

export const programStepSchema = z.object({
  id: uuidSchema,
  stage_id: uuidSchema,
  step_number: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  sort_order: z.number().int(),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type ProgramStep = z.infer<typeof programStepSchema>;

/** §6 program_stages, nested with its steps — mirrors the future SQL join
 * (§5.5 rule 6), returned as-is by `getProgramStages()`. */
export const programStageSchema = z.object({
  id: uuidSchema,
  stage_number: z.number().int().positive(),
  title: z.string(),
  subtitle: z.string().nullable(),
  sort_order: z.number().int(),
  steps: z.array(programStepSchema),
  ...placeholderFields,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type ProgramStage = z.infer<typeof programStageSchema>;
