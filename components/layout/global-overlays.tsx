import { RegistrationModal } from "./registration-modal";
import { CookieConsentBanner } from "./cookie-consent-banner";
import { AccessibilityToolbar } from "./accessibility-toolbar";

/**
 * §5 block 22 (numbered #20 in the de-duplicated enum in lib/schemas/blocks.ts,
 * "global overlays" in the §5 prose numbering — same entry, see that file's
 * enum for the authoritative list) — registration modal, upcoming-cohorts
 * panel, cookie consent banner, chat widget slot, accessibility toolbar.
 *
 * JUDGMENT CALL (flagged per the task brief): LAYOUT-LEVEL, rendered once
 * by `app/(site)/layout.tsx`, NOT a `page_blocks` row — these are global to
 * every page by definition (a cookie banner or a11y toolbar "on the
 * homepage only" makes no sense), so the same reasoning as
 * `site-header.tsx` / `site-footer.tsx` applies: modeling this as a row
 * would mean either duplicating it per page or special-casing it to always
 * render outside the normal sort_order flow.
 *
 * SCOPE for this pass (per task brief, explicit):
 *  - Registration modal: UI shell only, no working submit — see
 *    registration-modal.tsx's own header comment for the full scope note.
 *  - Cookie consent banner: built, client-side/localStorage only, no
 *    backend — see cookie-consent-banner.tsx.
 *  - Accessibility toolbar: built, client-side only (font size / contrast
 *    / grayscale) — see accessibility-toolbar.tsx. "Link highlight" (§3's
 *    fourth toggle) and a reset are noted there; link highlight deferred.
 *  - Upcoming-cohorts panel: SKIPPED. §5's one-line mention
 *    ("upcoming-cohorts panel") has no shape specified anywhere in the
 *    spec — no schema field, no described layout/trigger/content. Per the
 *    task brief's explicit instruction ("skip ... if not clearly specified
 *    enough to build now — flag them as deferred rather than guessing at a
 *    design"), this is deferred rather than invented. It likely wants a
 *    `db.listScheduleEntries({ visibleOnly: true })`-backed panel (the
 *    `schedule_entries` table already exists and fits "upcoming cohorts"
 *    conceptually) but the panel's own presentation (slide-in? sidebar?
 *    triggered by what?) needs a real design decision, not a guess.
 *  - Chat widget slot: SKIPPED, same reasoning — §11 says "Chat widget (if
 *    any): load on interaction or idle only," implying it may not even
 *    exist, and no vendor/config is specified. §3 also requires asking
 *    before adding any third-party overlay vendor, which a chat widget
 *    almost always is. Deferred, not guessed.
 *
 * `globalOverlaysBlockDataSchema`'s boolean flags
 * (`registration_modal_enabled`, `cookie_consent_enabled`,
 * `accessibility_toolbar_enabled`, etc.) exist in lib/schemas/blocks.ts but
 * have no `page_blocks` row to read from given the layout-level decision
 * above — this component currently always mounts all three built pieces
 * unconditionally. If a future "site settings"-style admin control for
 * these toggles is added, this is the file that would read it (no `db`
 * call is made here today since nothing yet needs one).
 */
export function GlobalOverlays() {
  return (
    <>
      <RegistrationModal />
      <CookieConsentBanner />
      <AccessibilityToolbar />
    </>
  );
}
