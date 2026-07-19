"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { db } from "@/lib/queries";
import {
  leadInputSchema,
  newsletterSubscribeInputSchema,
  contactMessageInputSchema,
} from "@/lib/schemas";
import { isRateLimited, extractIp } from "./rate-limit";

/**
 * lib/actions/public-forms.ts — Server Actions backing the three public
 * forms flagged in docs/content-needed.md's "BUG — public forms don't
 * actually submit" section (§11): registration modal -> `leads`,
 * newsletter signup -> `newsletter_subscribers`, contact form ->
 * `contact_messages`.
 *
 * Shared pattern across all three:
 *   1. Honeypot check first, and SILENTLY — a bot that filled every field
 *      (including the honeypot) gets the same "success" response a real
 *      user would, so it never learns it was caught.
 *   2. IP rate limit (5 / 10 min / IP, per lib/actions/rate-limit.ts).
 *   3. zod validation against the EXISTING lib/schemas input schemas —
 *      never a new schema, per task brief.
 *   4. `db.createX()` — the one real, working part today.
 *   5. Turnstile / GTM / Resend integration points are marked with TODOs
 *      exactly where they'd slot in, not faked (see below).
 *
 * All three return the same `FormActionResult` shape so the client
 * components can share a bit of loading/success/error UI logic.
 */

export interface FormActionResult {
  ok: boolean;
  /** Friendly Hebrew message, shown on both success and (non-leaking) error. */
  message: string;
}

const GENERIC_ERROR_MESSAGE =
  "אירעה שגיאה בשליחת הטופס. נסו שוב, ואם הבעיה חוזרת פנו אלינו בטלפון או באימייל.";
const RATE_LIMIT_MESSAGE = "נשלחו יותר מדי בקשות מכתובת זו. נסו שוב בעוד כמה דקות.";

/**
 * TURNSTILE INTEGRATION POINT (not built — no site key yet, per task
 * brief / client decision, §11 "Cloudflare Turnstile" deferred to a
 * follow-up once the client has a Cloudflare account):
 *
 * Once `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` exist (§13 env vars),
 * each form should:
 *   1. Render the Turnstile widget client-side (site key) and include its
 *      response token as a hidden form field (e.g. `cf-turnstile-response`).
 *   2. Here, in each action below, BEFORE the zod validation step, read
 *      that token from `formData` and POST it to Cloudflare's siteverify
 *      endpoint:
 *        POST https://challenges.cloudflare.com/turnstile/v0/siteverify
 *        body: { secret: TURNSTILE_SECRET_KEY, response: token, remoteip: ip }
 *      Reject the submission (same GENERIC_ERROR_MESSAGE, no detail leaked)
 *      if `success !== true`.
 *   This is intentionally NOT stubbed with a fake always-true check — a
 *   no-op Turnstile would be worse than no Turnstile, since it would look
 *   wired up in the UI without providing any actual protection.
 */

/**
 * RESEND INTEGRATION POINT (not built — no RESEND_API_KEY in .env.local
 * yet, per task brief): once configured, each action's success path below
 * should additionally send a notification email to
 * `process.env.NOTIFICATION_EMAIL_TO` (§13) via Resend + a React Email
 * template, Hebrew RTL, per §11. The DB write (the part that must
 * genuinely work today) happens unconditionally above where this would go;
 * the email send would be best-effort / non-blocking — a failed email
 * should never fail the form submission itself.
 */

async function checkRateLimit(formName: string): Promise<boolean> {
  const headerList = await headers();
  const ip = extractIp(headerList);
  return isRateLimited(`${formName}:${ip}`);
}

// ---------------------------------------------------------------------
// Registration modal -> leads
// ---------------------------------------------------------------------

export async function submitRegistrationAction(
  _prevState: FormActionResult | null,
  formData: FormData,
): Promise<FormActionResult> {
  // Honeypot: a hidden field real users never fill. If it's non-empty,
  // silently report success without writing anything.
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot !== "") {
    return { ok: true, message: "תודה! פרטיך התקבלו ונחזור אליך בהקדם." };
  }

  if (await checkRateLimit("registration")) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  // TODO(turnstile): verify formData.get("cf-turnstile-response") here
  // once TURNSTILE_SECRET_KEY exists — see module-level comment above.

  try {
    const parsed = leadInputSchema.parse({
      first_name: String(formData.get("first_name") ?? ""),
      last_name: String(formData.get("last_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      source_page: formData.get("source_page") ? String(formData.get("source_page")) : null,
      utm: null,
      consent_at: new Date().toISOString(),
    });

    await db.createLead(parsed);

    // TODO(gtm): fire a GTM event (e.g. dataLayer.push({ event:
    // 'registration_submit' })) here once NEXT_PUBLIC_GTM_ID / a real GTM
    // container is wired up (§13, site_settings.gtm_id) — no GTM
    // integration exists anywhere in this project yet, so nothing is
    // fired today rather than faking an analytics call. This must happen
    // client-side after a successful action response, not here on the
    // server — noted at the call site in registration-modal.tsx too.

    // TODO(resend): send notification email to NOTIFICATION_EMAIL_TO here
    // — see module-level comment above. Not configured yet.

    return { ok: true, message: "תודה! פרטיך התקבלו ונחזור אליך בהקדם לתיאום שיחת היכרות." };
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, message: "יש לבדוק את הפרטים שהוזנו (שם, אימייל וטלפון) ולנסות שוב." };
    }
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }
}

// ---------------------------------------------------------------------
// Newsletter signup -> newsletter_subscribers
// ---------------------------------------------------------------------

export async function submitNewsletterAction(
  _prevState: FormActionResult | null,
  formData: FormData,
): Promise<FormActionResult> {
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot !== "") {
    return { ok: true, message: "תודה על ההרשמה!" };
  }

  if (await checkRateLimit("newsletter")) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  // TODO(turnstile): see module-level comment above.

  try {
    const parsed = newsletterSubscribeInputSchema.parse({
      email: String(formData.get("email") ?? ""),
      consent_at: new Date().toISOString(),
      source: formData.get("source") ? String(formData.get("source")) : null,
    });

    await db.subscribeNewsletter(parsed);

    // TODO(resend): see module-level comment above (§11 doesn't require a
    // notification email for newsletter specifically, but a welcome email
    // would plug in the same way once Resend is configured).

    return { ok: true, message: "תודה על ההרשמה! נעדכן אותך בחדשות ובעדכונים." };
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, message: "כתובת האימייל אינה תקינה. יש לבדוק ולנסות שוב." };
    }
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }
}

// ---------------------------------------------------------------------
// Contact form -> contact_messages
// ---------------------------------------------------------------------

export async function submitContactAction(
  _prevState: FormActionResult | null,
  formData: FormData,
): Promise<FormActionResult> {
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot !== "") {
    return { ok: true, message: "תודה על פנייתך! נחזור אליך בהקדם." };
  }

  if (await checkRateLimit("contact")) {
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  // TODO(turnstile): see module-level comment above.

  try {
    const phoneRaw = String(formData.get("phone") ?? "").trim();
    const parsed = contactMessageInputSchema.parse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: phoneRaw === "" ? null : phoneRaw,
      message: String(formData.get("message") ?? ""),
      source_page: formData.get("source_page") ? String(formData.get("source_page")) : null,
    });

    await db.createContactMessage(parsed);

    // TODO(resend): notification email to NOTIFICATION_EMAIL_TO — see
    // module-level comment above. Not configured yet.

    return { ok: true, message: "תודה על פנייתך! נחזור אליך בהקדם." };
  } catch (err) {
    if (err instanceof ZodError) {
      return { ok: false, message: "יש לבדוק את הפרטים שהוזנו ולנסות שוב." };
    }
    return { ok: false, message: GENERIC_ERROR_MESSAGE };
  }
}
