import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { BrandingForm } from "./branding-form";
import { AdminErrorState } from "@/components/admin/states";

/** §3.5 / §8 Branding screen — admin-only (checked again inside the
 * Server Action; this page-level check is a UX nicety so a non-admin
 * lands on a clear message instead of a form that will reject every
 * save). */
export default async function BrandingPage() {
  const [settings, session] = await Promise.all([db.getSiteSettings(), getDevSession()]);
  const isAdmin = session?.role === "admin";

  const [logo, logoDark, favicon, ogImage] = await Promise.all([
    settings.logo_id ? db.getMedia(settings.logo_id) : null,
    settings.logo_dark_id ? db.getMedia(settings.logo_dark_id) : null,
    settings.favicon_id ? db.getMedia(settings.favicon_id) : null,
    settings.og_default_image_id ? db.getMedia(settings.og_default_image_id) : null,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">מיתוג</h1>
      {!isAdmin ? (
        <AdminErrorState message="מסך זה זמין למנהל/ת מערכת בלבד. ניתן לצפות בהגדרות אך לא לשמור שינויים." />
      ) : null}
      <BrandingForm
        settings={settings}
        canEdit={isAdmin}
        logo={logo}
        logoDark={logoDark}
        favicon={favicon}
        ogImage={ogImage}
      />
    </div>
  );
}
