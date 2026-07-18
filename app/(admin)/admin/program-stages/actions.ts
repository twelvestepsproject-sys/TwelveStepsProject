"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { ProgramStage, ProgramStep } from "@/lib/schemas";

/**
 * §6: program_stages / program_steps have no draft concept (checked the
 * schema — no `status` field, per task brief instruction not to assume).
 * All stages/steps are always "live" once saved; visibility is simply
 * whether they exist. Kept as ONE screen (not stage list + separate step
 * screens) since §5.5 fixtures intentionally model only 5 stages / 14 steps
 * total — small enough that one page with inline stage+step editing is more
 * usable for a non-technical admin than navigating between two collections.
 */

export async function saveStageAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();
    const id = (formData.get("id") as string) || undefined;
    const input: Partial<ProgramStage> & { id?: string } = {
      id,
      stage_number: Number(formData.get("stage_number") ?? 1),
      title: String(formData.get("title") ?? ""),
      subtitle: (formData.get("subtitle") as string) || null,
      sort_order: Number(formData.get("sort_order") ?? 0),
    };
    const saved = await db.saveProgramStage(input);
    revalidatePath("/admin/program-stages");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteStageAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deleteProgramStage(id);
  revalidatePath("/admin/program-stages");
}

export async function saveStepAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();
    const stageId = String(formData.get("stage_id") ?? "");
    const stages = await db.getProgramStages();
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return { ok: false, error: "שלב לא נמצא." };

    const stepId = (formData.get("step_id") as string) || undefined;
    const existingSteps = stage.steps.filter((s) => s.id !== stepId);

    const step: Partial<ProgramStep> & { id?: string } = {
      id: stepId,
      stage_id: stageId,
      step_number: Number(formData.get("step_number") ?? 1),
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
      sort_order: Number(formData.get("sort_order") ?? existingSteps.length + 1),
    };

    const saved = await db.saveProgramStage({ id: stageId, steps: [...existingSteps, step] as ProgramStep[] });
    revalidatePath("/admin/program-stages");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteStepAction(stageId: string, stepId: string): Promise<void> {
  await requireContentRole();
  await db.deleteProgramStep(stageId, stepId);
  revalidatePath("/admin/program-stages");
}
