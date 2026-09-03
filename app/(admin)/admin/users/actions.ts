"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/queries";
import { requireAdminRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { Profile, Role } from "@/lib/schemas";

/**
 * §8 Users (admin only): "invite, set role, deactivate."
 *
 * IMPORTANT: there is no real Supabase Auth yet (Phase 5) — `inviteUserAction`
 * below creates a `profiles` row directly. It does NOT send a real email and
 * does NOT create a real auth account, because neither backend exists
 * before Phase 5. This is a deliberate simulation of what the real invite
 * flow will eventually trigger, not a shortcut masquerading as the real
 * thing — the UI surfaces this explicitly (see the users page's notice).
 */
export async function inviteUserAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminRole();

    const input: Partial<Profile> = {
      full_name: String(formData.get("full_name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      role: (formData.get("role") as Role) ?? "viewer",
      is_active: true,
      avatar_id: null,
    };

    const saved = await db.saveUser(input);
    revalidatePath("/admin/users");

    // Self-hosted creation returns a generated password. It is shown to the
    // admin once, here, because nothing emails it — without this the account
    // exists and nobody can sign in to it.
    const temporary = (saved as { __temporaryPassword?: string }).__temporaryPassword;
    return {
      ok: true,
      data: { id: saved.id },
      warning: temporary
        ? `המשתמש נוצר. סיסמה זמנית: ${temporary} — העבירו אותה למשתמש/ת ובקשו להחליף. היא לא תוצג שוב.`
        : undefined,
    };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function setUserRoleAction(id: string, role: Role): Promise<ActionResult<Profile>> {
  try {
    await requireAdminRole();
    const saved = await db.saveUser({ id, role });
    revalidatePath("/admin/users");
    return { ok: true, data: saved };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function setUserActiveAction(id: string, isActive: boolean): Promise<ActionResult<Profile>> {
  try {
    await requireAdminRole();
    const saved = await db.saveUser({ id, is_active: isActive });
    revalidatePath("/admin/users");
    return { ok: true, data: saved };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteUserAction(id: string): Promise<void> {
  await requireAdminRole();
  await db.deleteUser(id);
  revalidatePath("/admin/users");
}

/**
 * Resets another user's password to a fresh temporary one.
 *
 * With no mail server there can be no self-service "forgot password", so
 * this is the recovery path: an admin issues a new temporary password and
 * passes it on, and the flag forces the user to replace it immediately.
 * Without this every reset would go through whoever has server access.
 */
export async function resetUserPasswordAction(id: string): Promise<ActionResult<{ password: string }>> {
  try {
    await requireAdminRole();

    const { query } = await import("@/lib/pg/client");
    const { hashPassword } = await import("@/lib/auth/password");
    const { randomBytes } = await import("node:crypto");

    const temporary = randomBytes(12).toString("base64url");
    const { rowCount } = await query(
      `update auth.users set encrypted_password = $2, updated_at = now() where id = $1`,
      [id, await hashPassword(temporary)],
    );
    if (!rowCount) return { ok: false, error: "המשתמש לא נמצא." };

    await query(`update public.profiles set must_change_password = true where id = $1`, [id]);

    revalidatePath("/admin/users");
    return { ok: true, data: { password: temporary } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}
