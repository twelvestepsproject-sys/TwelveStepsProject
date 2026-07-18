"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/queries";
import { requireAdminRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { Redirect } from "@/lib/schemas";

/**
 * §8 Redirects: "CRUD" (admin-only — see role-check.ts's requireAdminRole;
 * §7's "admin: everything" implies full settings access, which redirects
 * fall under, same bucket as menus/branding).
 */
export async function saveRedirectAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminRole();

    const id = (formData.get("id") as string) || undefined;
    const statusCodeRaw = Number(formData.get("status_code") ?? 301);
    const input: Partial<Redirect> & { id?: string } = {
      id,
      from_path: String(formData.get("from_path") ?? "").trim(),
      to_path: String(formData.get("to_path") ?? "").trim(),
      status_code: (statusCodeRaw === 302 || statusCodeRaw === 307 || statusCodeRaw === 308
        ? statusCodeRaw
        : 301) as Redirect["status_code"],
    };

    const saved = await db.saveRedirect(input);
    revalidatePath("/admin/redirects");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteRedirectAction(id: string): Promise<void> {
  await requireAdminRole();
  await db.deleteRedirect(id);
  revalidatePath("/admin/redirects");
}

export async function createRedirectAndRedirect(formData: FormData) {
  const result = await saveRedirectAction(formData);
  if (result.ok && result.data) {
    redirect(`/admin/redirects/${result.data.id}`);
  }
}
