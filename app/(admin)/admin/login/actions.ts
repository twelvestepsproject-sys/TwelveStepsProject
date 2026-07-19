"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * PHASE 5 REPLACEMENT (§16 pre-flagged exception — this file, and
 * page.tsx alongside it, are the ONE intentional /app change in Phase 5).
 * Real Supabase Auth, email + password (§7: "no public sign-up — admins
 * are created by an existing admin, server-side"). The dev role-picker's
 * `devLogin` is gone — there is no role to "pick" anymore; the role comes
 * from `profiles.role` once authenticated (see lib/admin/dev-session.ts's
 * supabase-mode branch).
 *
 * TOTP MFA (§7 "for admin if available" — confirmed available on this
 * project, see final report): after a successful password sign-in, if the
 * user has an MFA factor enrolled, the authenticator assurance level is
 * still "aal1" and Supabase requires a second `mfa.challengeAndVerify`
 * step before the session is fully trusted — redirect to the challenge
 * screen instead of straight into /admin when that's the case.
 */

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function loginWithPassword(formData: FormData): Promise<void> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const next = formData.get("next");
  const dest = typeof next === "string" && next.startsWith("/admin") ? next : "/admin";

  if (!parsed.success) {
    redirect("/admin/login?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.session) {
    redirect("/admin/login?error=invalid");
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    redirect(`/admin/login/mfa?next=${encodeURIComponent(dest)}`);
  }

  redirect(dest);
}
