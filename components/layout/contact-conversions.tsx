"use client";

import { useEffect } from "react";

/**
 * Reports a click on a phone or WhatsApp link as an Ads conversion.
 *
 * The registration form already reports one when it submits, but on this
 * site most enquiries never reach the form: the audience skews older and
 * the programme is expensive, so people phone. Without this, those leads
 * are invisible and Ads optimises against a fraction of the real signal.
 *
 * One delegated listener on `document` rather than handlers on each link,
 * because these links are editable content — a phone number in the hero,
 * the footer, the contact page, or a link an editor adds to any block
 * tomorrow. A listener that matches on href catches them all, including
 * markup this component never sees.
 *
 * `method` distinguishes the two in reports while a single conversion
 * action covers both. When the account issues dedicated actions for phone
 * and WhatsApp, pass their labels and each fires its own `send_to`; until
 * then both report against the form's action, which counts the enquiry and
 * keeps the parameter for segmenting.
 */

type Gtag = (...args: unknown[]) => void;

export function ContactConversions({
  sendTo,
  phoneSendTo = null,
  whatsappSendTo = null,
}: {
  /** "<AW-id>/<label>" fallback, or null when settings are incomplete. */
  sendTo: string | null;
  /** Dedicated phone-call action, once the Ads account has one. */
  phoneSendTo?: string | null;
  /** Dedicated WhatsApp action, once the Ads account has one. */
  whatsappSendTo?: string | null;
}) {
  useEffect(() => {
    if (!sendTo && !phoneSendTo && !whatsappSendTo) return;

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link) return;

      // getAttribute, not .href: the DOM property resolves a relative URL
      // against the page, which would not match these prefixes.
      const href = link.getAttribute("href") ?? "";
      if (!href) return;

      let method: "phone" | "whatsapp" | null = null;
      if (href.startsWith("tel:")) {
        method = "phone";
      } else if (/(^|\/\/)(wa\.me|api\.whatsapp\.com)\//.test(href)) {
        // chat.whatsapp.com is a community group invite, not an enquiry —
        // counting it as a lead would inflate conversions with people
        // joining a chat.
        method = "whatsapp";
      }
      if (!method) return;

      const gtag = (window as unknown as { gtag?: Gtag }).gtag;
      if (!gtag) return;

      const dedicated = method === "phone" ? phoneSendTo : whatsappSendTo;
      const destination = dedicated ?? sendTo;
      if (!destination) return;

      gtag("event", "conversion", { send_to: destination, method });
    }

    // Capture phase: the click navigates away (tel: opens the dialer), and a
    // bubbling listener can be skipped if something calls stopPropagation.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [sendTo, phoneSendTo, whatsappSendTo]);

  return null;
}
