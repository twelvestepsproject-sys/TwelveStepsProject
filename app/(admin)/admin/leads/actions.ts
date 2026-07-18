"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/queries";
import { requireContentRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { Lead, NewsletterSubscriber } from "@/lib/schemas";

/**
 * §8 Leads/Messages/Subscribers: "notes, status" — editable via Server
 * Action, role-checked, friendly Hebrew errors, same shape as every other
 * mutating Server Action in this codebase (see schedule/actions.ts).
 */
export async function updateLeadAction(
  id: string,
  input: { status?: string; notes?: string | null },
): Promise<ActionResult<Lead>> {
  try {
    await requireContentRole();
    const saved = await db.saveLead({ id, ...input });
    revalidatePath("/admin/leads");
    return { ok: true, data: saved };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function updateSubscriberStatusAction(
  id: string,
  status: string,
): Promise<ActionResult<NewsletterSubscriber>> {
  try {
    await requireContentRole();
    const saved = await db.saveNewsletterSubscriber({ id, status });
    revalidatePath("/admin/leads");
    return { ok: true, data: saved };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}
