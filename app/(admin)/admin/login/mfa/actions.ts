"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Phase 5 — TOTP MFA challenge (§7: "TOTP MFA for admin if available" —
 * confirmed available on this project). Second factor after password
 * sign-in for any user with a verified TOTP factor enrolled.
 */

const codeSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, "יש להזין 6 ספרות"),
});

export async function verifyMfaChallenge(formData: FormData): Promise<void> {
  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  const next = formData.get("next");
  const dest = typeof next === "string" && next.startsWith("/admin") ? next : "/admin";

  if (!parsed.success) {
    redirect(`/admin/login/mfa?next=${encodeURIComponent(dest)}&error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totpFactor = factors?.totp?.[0];
  if (!totpFactor) {
    redirect("/admin/login?error=invalid");
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  });
  if (challengeError) {
    redirect(`/admin/login/mfa?next=${encodeURIComponent(dest)}&error=1`);
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    redirect(`/admin/login/mfa?next=${encodeURIComponent(dest)}&error=1`);
  }

  redirect(dest);
}
