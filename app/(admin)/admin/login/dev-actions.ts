"use server";

import { redirect } from "next/navigation";
import { setDevRole } from "@/lib/admin/dev-session";
import { roleSchema } from "@/lib/schemas";

/**
 * The dev-only "login" — moved verbatim out of `actions.ts` during Phase 5
 * (see that file's header comment: `actions.ts` is now exclusively the
 * real Supabase Auth action, since it's the pre-flagged /admin/login
 * exception). This function's body is UNCHANGED from the Phase 4 version;
 * `setDevRole` itself now no-ops when DATA_SOURCE=supabase (see
 * lib/admin/dev-session.ts), so this file is only ever exercised — and
 * only ever reachable via page.tsx's DATA_SOURCE branch — in mock mode.
 */
export async function devLogin(formData: FormData): Promise<void> {
  const parsed = roleSchema.safeParse(formData.get("role"));
  if (!parsed.success) {
    redirect("/admin/login?error=1");
  }
  await setDevRole(parsed.data);
  const next = formData.get("next");
  const dest = typeof next === "string" && next.startsWith("/admin") ? next : "/admin";
  redirect(dest);
}
