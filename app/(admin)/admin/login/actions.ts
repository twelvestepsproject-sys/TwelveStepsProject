"use server";

import { redirect } from "next/navigation";
import { setDevRole } from "@/lib/admin/dev-session";
import { roleSchema } from "@/lib/schemas";

/**
 * The dev-only "login" — see lib/admin/dev-session.ts for the design
 * rationale (role-picker, not a fake credential form). Sets the cookie and
 * redirects into `/admin` (or wherever `next` says the visitor was headed).
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
