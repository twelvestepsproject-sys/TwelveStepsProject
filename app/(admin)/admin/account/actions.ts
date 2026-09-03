"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/pg/client";
import { getAuthUser } from "@/lib/auth/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";

/**
 * Changing your own password.
 *
 * There is no mail server, so a new account starts on a password an admin
 * generated and passed on by hand. `must_change_password` keeps the admin
 * UI blocked until the user replaces it — the point is that the temporary
 * one stops working as a permanent credential.
 *
 * The current password is required even though the session already proves
 * who this is: it is what stops an unattended logged-in browser from being
 * used to take the account over.
 */
const MIN_LENGTH = 8;

export async function changeOwnPasswordAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getAuthUser();
    if (!user) return { ok: false, error: "יש להתחבר כדי לבצע פעולה זו." };

    const current = String(formData.get("current_password") ?? "");
    const next = String(formData.get("new_password") ?? "");
    const confirm = String(formData.get("confirm_password") ?? "");

    if (!current || !next) return { ok: false, error: "יש למלא את כל השדות." };
    if (next.length < MIN_LENGTH) {
      return { ok: false, error: `הסיסמה החדשה חייבת להכיל לפחות ${MIN_LENGTH} תווים.` };
    }
    if (next !== confirm) return { ok: false, error: "הסיסמה החדשה ואישור הסיסמה אינם זהים." };
    if (next === current) return { ok: false, error: "הסיסמה החדשה זהה לנוכחית." };

    const { rows } = await query<{ encrypted_password: string }>(
      `select encrypted_password from auth.users where id = $1`,
      [user.id],
    );
    const stored = rows[0]?.encrypted_password;
    if (!stored || !(await verifyPassword(current, stored))) {
      return { ok: false, error: "הסיסמה הנוכחית אינה נכונה." };
    }

    await query(`update auth.users set encrypted_password = $2, updated_at = now() where id = $1`, [
      user.id,
      await hashPassword(next),
    ]);
    // Cleared here and nowhere else: the flag means "still on a password
    // someone else chose", which stops being true exactly now.
    await query(`update public.profiles set must_change_password = false where id = $1`, [user.id]);

    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}
