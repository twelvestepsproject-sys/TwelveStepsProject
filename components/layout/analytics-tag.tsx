"use client";

import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/analytics/consent";

/**
 * Loads the Google tag (gtag.js) using Google Consent Mode v2.
 *
 * The tag loads for everyone, but its first instruction — sent before the
 * remote script is even requested — denies every storage type. In that
 * state gtag sets no cookies and sends no identifiers; it reports only
 * cookieless pings. Accepting the banner upgrades the same tag in place
 * via a `consent: "update"`, with no reload.
 *
 * This replaced a stricter setup that refused to inject the script at all
 * before consent. That was honest but invisible: Google's own verification
 * crawler never clicks the banner, so it reported "Google Tag missing" and
 * the Ads account could not confirm the install. Consent Mode is Google's
 * answer to exactly that — the tag is detectable, while a visitor who has
 * not accepted is still not given cookies or identifiers.
 *
 * `ad_user_data` and `ad_personalization` are the two v2 signals; without
 * them an Ads account treats the tag as pre-v2 and degrades conversion
 * reporting in the EEA.
 *
 * The id comes from site settings rather than a constant, so it can be
 * changed — or a GA4 id swapped in — without a deploy. Nothing renders
 * when it is empty, which also keeps development and preview environments
 * from reporting into a live Ads account.
 */

type Gtag = (...args: unknown[]) => void;

function getGtag(): Gtag | undefined {
  return (window as unknown as { gtag?: Gtag }).gtag;
}

export function AnalyticsTag({ measurementId }: { measurementId: string | null }) {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    // Read once on mount rather than during render: localStorage does not
    // exist during SSR, and reading it in the initial state would make the
    // server and client markup disagree.
    const initial = readConsent() === "accepted";
    setGranted((prev) => (prev === initial ? prev : initial));

    function onChange(e: Event) {
      setGranted((e as CustomEvent<string>).detail === "accepted");
    }
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  // Inject once, regardless of the answer. Injected imperatively rather
  // than with next/script because gtag's bootstrap — including the default
  // consent state — must run before the remote file loads, exactly as
  // Google's published snippet does.
  useEffect(() => {
    if (!measurementId) return;
    if (document.getElementById("gtag-src")) return; // already injected

    const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
    w.dataLayer = w.dataLayer || [];
    // Must be a real `function` — gtag relies on `arguments`, which an
    // arrow function does not have.
    function gtag(...args: unknown[]) {
      w.dataLayer!.push(args);
    }
    w.gtag = gtag;

    // Order matters: the default must be queued before `config`, or the
    // tag may set cookies for the first page view of a visitor who never
    // accepted.
    gtag("consent", "default", {
      ad_storage: "denied",
      analytics_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });

    gtag("js", new Date());
    gtag("config", measurementId);

    const el = document.createElement("script");
    el.id = "gtag-src";
    el.async = true;
    el.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(el);
    // Deliberately not removed on unmount: this sits in the layout and
    // lives for the session, and tearing the tag down mid-visit would lose
    // the conversion the form is about to report.
  }, [measurementId]);

  // Kept separate from injection so it also runs when the visitor answers
  // the banner later in the same page view.
  useEffect(() => {
    if (!measurementId || !granted) return;
    const gtag = getGtag();
    if (!gtag) return;
    gtag("consent", "update", {
      ad_storage: "granted",
      analytics_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  }, [measurementId, granted]);

  return null;
}
