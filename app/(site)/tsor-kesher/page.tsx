import type { Metadata } from "next";
import { db } from "@/lib/queries";
import { ContactForm } from "./contact-form";

/**
 * `/tsor-kesher` — Contact (§4 `/[contact]`). Slug already present in
 * lib/mock/fixtures/menus.ts's header/mobile nav ("צור קשר" -> `/tsor-kesher`),
 * used as-is per the task brief's instruction not to invent a competing
 * scheme.
 *
 * Contact form wired to `submitContactAction` (lib/actions/public-forms.ts)
 * via the co-located `<ContactForm>` client component — writes a real row
 * to `contact_messages`. Previously form markup only, no submission wiring
 * (see docs/content-needed.md's "BUG — public forms don't actually submit"
 * section). Contact details (phone/email/address) are read from
 * `db.getSiteSettings()`, never hardcoded, matching site-footer.tsx's own
 * pattern.
 */
export const metadata: Metadata = {
  title: "צור קשר | מכללת אשד",
  description: "יצירת קשר עם מכללת אשד — טלפון, אימייל, וטופס פנייה.",
};

export default async function ContactPage() {
  const settings = await db.getSiteSettings();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">צור קשר</h1>
        <p className="mt-2 text-ink-muted">נשמח לשמוע מכם ולענות על כל שאלה.</p>
      </header>

      <dl className="mb-10 flex flex-col gap-2 rounded-lg border border-border bg-surface-alt p-5 text-sm">
        {settings.contact_phone ? (
          <div className="flex gap-2">
            <dt className="font-semibold text-ink">טלפון:</dt>
            <dd>
              <a href={`tel:${settings.contact_phone}`} className="text-primary hover:underline">
                {settings.contact_phone}
              </a>
            </dd>
          </div>
        ) : null}
        {settings.contact_email ? (
          <div className="flex gap-2">
            <dt className="font-semibold text-ink">אימייל:</dt>
            <dd>
              <a href={`mailto:${settings.contact_email}`} className="text-primary hover:underline">
                {settings.contact_email}
              </a>
            </dd>
          </div>
        ) : null}
        {settings.contact_address ? (
          <div className="flex gap-2">
            <dt className="font-semibold text-ink">כתובת:</dt>
            <dd className="text-ink-muted">{settings.contact_address}</dd>
          </div>
        ) : null}
      </dl>

      <ContactForm />
    </main>
  );
}
