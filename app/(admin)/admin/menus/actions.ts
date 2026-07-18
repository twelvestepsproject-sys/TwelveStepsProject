"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/queries";
import { requireAdminRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { MenuItem, MenuLocation } from "@/lib/schemas";

/**
 * §8 Menus screen — admin-only settings tier (§7), same as Branding.
 * `db.saveMenuItem`/`deleteMenuItem`/`reorderMenuItems` already exist and
 * operate on the resolved nested tree directly (see
 * lib/queries/mock/index.ts) — this file is a thin, role-checked,
 * friendly-error wrapper, matching every other admin screen's contract.
 */

export interface MenuItemPayload {
  id?: string;
  label: string;
  href: string;
  open_in_new_tab: boolean;
  parent_id?: string | null;
  sort_order?: number;
}

export async function saveMenuItemAction(
  location: MenuLocation,
  payload: MenuItemPayload,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminRole();
    if (!payload.label.trim()) return { ok: false, error: "יש להזין תווית לפריט התפריט." };
    if (!payload.href.trim()) return { ok: false, error: "יש להזין כתובת (href) לפריט התפריט." };

    const saved = await db.saveMenuItem(location, {
      id: payload.id,
      label: payload.label.trim(),
      href: payload.href.trim(),
      open_in_new_tab: payload.open_in_new_tab,
      parent_id: payload.parent_id ?? null,
      sort_order: payload.sort_order,
    });
    revalidatePath("/admin/menus");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: saved.id } };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function deleteMenuItemAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminRole();
    await db.deleteMenuItem(id);
    revalidatePath("/admin/menus");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function reorderMenuAction(location: MenuLocation, orderedIds: string[]): Promise<ActionResult> {
  try {
    await requireAdminRole();
    await db.reorderMenuItems(location, orderedIds);
    revalidatePath("/admin/menus");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}

export async function getMenuAction(location: MenuLocation): Promise<MenuItem[]> {
  await requireAdminRole();
  return db.getMenu(location);
}
