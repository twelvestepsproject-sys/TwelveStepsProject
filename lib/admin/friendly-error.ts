import { ZodError } from "zod";
import { AdminAuthError } from "@/lib/admin/role-check";

/**
 * §8: "All admin copy in Hebrew, friendly errors, never raw Postgres/zod
 * error messages surfaced directly." Every Server Action in `/admin` should
 * catch and pass its error through this before returning it to the client
 * form — never `String(err)` a raw zod/Error message into the UI.
 */
export function toFriendlyMessage(err: unknown): string {
  if (err instanceof AdminAuthError) {
    return err.message;
  }
  if (err instanceof ZodError) {
    return "חלק מהשדות אינם תקינים. יש לבדוק את הטופס ולנסות שוב.";
  }
  if (err instanceof Error) {
    // Known, already-Hebrew, already-friendly messages we raise ourselves
    // (slug uniqueness, etc.) are passed through as-is; anything else (a
    // raw JS/Node error, a hypothetical future Postgres error message) is
    // replaced with a generic Hebrew fallback rather than leaked verbatim.
    if (/[֐-׿]/.test(err.message)) {
      return err.message;
    }
    // Log it before hiding it. Not leaking the raw message to the editor is
    // right, but it was being dropped entirely — an admin reporting "אירעה
    // שגיאה בשמירה" left nothing at all in the server log to diagnose from,
    // which is how a real save failure became untraceable.
    console.error("[admin] save failed:", err.message, err.stack);
    return "אירעה שגיאה בשמירה. נסו שוב, ואם הבעיה חוזרת פנו לתמיכה הטכנית.";
  }
  console.error("[admin] unexpected non-Error thrown:", err);
  return "אירעה שגיאה בלתי צפויה. נסו שוב.";
}

export interface ActionResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
  /** §8 consent-gate UX: set when a testimonial/lecturer saved successfully
   * but was force-hidden because consent_on_file was unchecked. */
  warning?: string;
}
