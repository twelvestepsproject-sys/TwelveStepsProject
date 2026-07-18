"use server";

import { revalidatePath } from "next/cache";
import { setDevRole } from "@/lib/admin/dev-session";
import { roleSchema } from "@/lib/schemas";

/**
 * The visible role-switcher control required by §16 Phase 4 ("A visible
 * role-switcher control... lets you flip between admin/editor/viewer and
 * see the UI respond"). Distinct from the login page's action: this is for
 * flipping roles while already inside `/admin`, without a redirect.
 */
export async function switchDevRole(formData: FormData): Promise<void> {
  const parsed = roleSchema.safeParse(formData.get("role"));
  if (!parsed.success) return;
  await setDevRole(parsed.data);
  revalidatePath("/admin", "layout");
}
