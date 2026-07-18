"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { ScheduleEntry } from "@/lib/schemas";

export async function saveScheduleEntryAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireContentRole();

    const id = (formData.get("id") as string) || undefined;
    const input: Partial<ScheduleEntry> & { id?: string } = {
      id,
      day_label: String(formData.get("day_label") ?? "").trim(),
      start_date: String(formData.get("start_date") ?? ""),
      end_date: (formData.get("end_date") as string) || null,
      time_range: (formData.get("time_range") as string) || null,
      program_name: String(formData.get("program_name") ?? ""),
      cohort: (formData.get("cohort") as string) || null,
      sort_order: Number(formData.get("sort_order") ?? 0),
      is_visible: formData.get("is_visible") === "on",
    };

    const saved = await db.saveScheduleEntry(input);
    revalidatePath("/admin/schedule");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteScheduleEntryAction(id: string): Promise<void> {
  await requireContentRole();
  await db.deleteScheduleEntry(id);
  revalidatePath("/admin/schedule");
}

export async function toggleScheduleVisibilityAction(id: string, nextVisible: boolean): Promise<void> {
  await requireContentRole();
  await db.saveScheduleEntry({ id, is_visible: nextVisible });
  revalidatePath("/admin/schedule");
}

export async function createScheduleEntryAndRedirect(formData: FormData) {
  const result = await saveScheduleEntryAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/schedule/${result.data.id}`);
  }
}
