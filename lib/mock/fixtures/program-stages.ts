import type { ProgramStage } from "@/lib/schemas";
import { programSteps } from "./program-steps";

const stepsByStage = (stageId: string) =>
  programSteps.filter((s) => s.stage_id === stageId);

/**
 * §5.5 / sample-content-review.md §6: exactly 5 stages with 2/4/3/2/3
 * steps (14 total), approved Hebrew text copied verbatim. Deliberately
 * non-uniform, deliberately not modeled on any known real methodology
 * (not 12-step, not 6×12).
 */
const stage1Id = "50000000-0000-4000-8000-000000000001";
const stage2Id = "50000000-0000-4000-8000-000000000002";
const stage3Id = "50000000-0000-4000-8000-000000000003";
const stage4Id = "50000000-0000-4000-8000-000000000004";
const stage5Id = "50000000-0000-4000-8000-000000000005";

export const programStages = [
  {
    id: stage1Id,
    stage_number: 1,
    title: "הגעה",
    subtitle: null,
    sort_order: 1,
    steps: stepsByStage(stage1Id),
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: stage2Id,
    stage_number: 2,
    title: "הבנה",
    subtitle: null,
    sort_order: 2,
    steps: stepsByStage(stage2Id),
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: stage3Id,
    stage_number: 3,
    title: "שינוי",
    subtitle: null,
    sort_order: 3,
    steps: stepsByStage(stage3Id),
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: stage4Id,
    stage_number: 4,
    title: "חיבור",
    subtitle: null,
    sort_order: 4,
    steps: stepsByStage(stage4Id),
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: stage5Id,
    stage_number: 5,
    title: "המשכיות",
    subtitle: null,
    sort_order: 5,
    steps: stepsByStage(stage5Id),
    is_placeholder: true,
    created_at: "2025-09-01T08:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
] satisfies ProgramStage[];

export const STAGE_IDS = { stage1Id, stage2Id, stage3Id, stage4Id, stage5Id };
