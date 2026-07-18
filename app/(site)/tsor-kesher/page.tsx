import type { Metadata } from "next";
import { db } from "@/lib/queries";

/**
 * `/tsor-kesher` — Contact (§4 `/[contact]`). Slug already present in
 * lib/mock/fixtures/menus.ts's header/mobile nav ("צור קשר" -> `/tsor-kesher`),
 * used as-is per the task brief's instruction not to invent a competing
 * scheme.
 *
 * Contact form UI only, per §11 / task instructions — name/email/phone/
 * message matching `contact_messages`' shape (lib/schemas/leads.ts
 * `contactMessageInputSchema`), but no real submission wiring
 * (`db.createContactMessage` via a Server Action is Phase 4). Contact
 * details (phone/email/address) are read from `db.getSiteSettings()`,
 * never hardcoded, matching site-footer.tsx's own pattern.
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

      {/* Form UI only — no submission wiring yet (Phase 4 Server Action,
          per §11 / task instructions). */}
      <form className="flex flex-col gap-4" aria-label="טופס יצירת קשר">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-name" className="text-sm font-semibold text-ink">
            שם מלא
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            className="rounded-md border border-border bg-surface px-4 py-2.5 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className="text-sm font-semibold text-ink">
            אימייל
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            className="rounded-md border border-border bg-surface px-4 py-2.5 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-phone" className="text-sm font-semibold text-ink">
            טלפון (לא חובה)
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            className="rounded-md border border-border bg-surface px-4 py-2.5 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-message" className="text-sm font-semibold text-ink">
            הודעה
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={5}
            className="rounded-md border border-border bg-surface px-4 py-2.5 text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
        >
          שליחה
        </button>
      </form>
    </main>
  );
}
