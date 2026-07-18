"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/queries";
import { requireAdminRole } from "@/lib/admin/role-check";
import { toFriendlyMessage, type ActionResult } from "@/lib/admin/friendly-error";
import type { SiteSettings, ThemeOverrides, FontFamilyOption, RadiusScale } from "@/lib/schemas";

/**
 * §3.5 Branding screen — admin-only (§7: "editor: ...no settings/
 * branding; admin: everything") hence `requireAdminRole`, not
 * `requireContentRole` like every content screen in this task.
 *
 * Writes the whole branding-relevant slice of `site_settings` in one call
 * via `db.saveSiteSettings()` (a partial merge-by-id, unlike `savePage`).
 * Revalidates "/" (and every path, effectively, since theme is read in
 * the ROOT layout) so the acceptance-bar test — change a color, see it
 * live within seconds, zero redeploy — actually holds.
 */

export interface BrandingPayload {
  site_name: string;
  tagline: string;
  logo_id: string | null;
  logo_dark_id: string | null;
  favicon_id: string | null;
  og_default_image_id: string | null;
  theme: ThemeOverrides;
  font_display: FontFamilyOption;
  font_body: FontFamilyOption;
  radius_scale: RadiusScale;
}

export async function saveBrandingAction(payload: BrandingPayload): Promise<ActionResult> {
  try {
    await requireAdminRole();

    const input: Partial<SiteSettings> = { ...payload };
    await db.saveSiteSettings(input);

    // Theme is read by the ROOT layout on every request, so revalidating
    // "/" is not enough by itself for every route segment layout caches
    // — revalidate broadly (layout-level revalidation) so the change is
    // visible everywhere within seconds per §3.5's acceptance bar.
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");

    return { ok: true };
  } catch (err) {
    return { ok: false, error: toFriendlyMessage(err) };
  }
}
