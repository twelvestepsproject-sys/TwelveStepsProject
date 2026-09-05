/**
 * The single source of truth for the cookie choice.
 *
 * The banner writes it and the analytics loader reads it, so both agree on
 * one key and one spelling — previously the banner stored a value nothing
 * ever read, which is how a consent UI ends up decorative.
 *
 * Deliberately opt-IN: no stored choice means no tracking. An analytics
 * script that loads before the visitor answers makes the question a
 * formality, and on a mental-health site the people being measured are the
 * ones least served by that.
 */
export const CONSENT_STORAGE_KEY = "eshed-cookie-consent";

/** Fired on `window` when the choice changes, so the tag can react in the
 *  same page view rather than waiting for a reload. */
export const CONSENT_EVENT = "cookie-consent-change";

export type ConsentChoice = "accepted" | "declined";

export function readConsent(): ConsentChoice | null {
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored === "accepted" || stored === "declined" ? stored : null;
  } catch {
    // Private mode, or storage disabled. Unknown, not consent.
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // The banner still hides for this session; the choice just will not
    // survive a reload.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}
