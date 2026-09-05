"use client";

import { useEffect, useState } from "react";
import { CONSENT_EVENT, readConsent } from "@/lib/analytics/consent";

/**
 * Loads the Google tag (gtag.js), but only once the visitor has accepted
 * cookies.
 *
 * The site already showed a consent banner that gated nothing, so adding a
 * tracking script unconditionally would have turned it into a question
 * whose answer is ignored. Here the script is not requested at all until
 * the choice is "accepted": declining means Google is never contacted,
 * which is the only version of this that the banner's wording is true
 * about.
 *
 * The id comes from site settings rather than a constant, so it can be
 * changed — or a GA4 id swapped in — without a deploy. Nothing renders
 * when it is empty, which also keeps development and preview environments
 * from reporting into a live Ads account.
 */
export function AnalyticsTag({ measurementId }: { measurementId: string | null }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Read once on mount rather than during render: localStorage does not
    // exist during SSR, and reading it in the initial state would make the
    // server and client markup disagree. Only set when it differs, so an
    // already-correct value does not queue a second render.
    const initial = readConsent() === "accepted";
    setAllowed((prev) => (prev === initial ? prev : initial));

    function onChange(e: Event) {
      setAllowed((e as CustomEvent<string>).detail === "accepted");
    }
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  // Injected imperatively rather than with next/script. The tag has to
  // appear only after a runtime consent check, and gtag's own bootstrap
  // must run before the remote file finishes loading — both of which are
  // simpler to guarantee by appending the script directly, exactly as
  // Google's published snippet does.
  useEffect(() => {
    if (!measurementId || !allowed) return;
    if (document.getElementById("gtag-src")) return; // already injected

    const w = window as unknown as {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    w.dataLayer = w.dataLayer || [];
    // Must be a real `function` — gtag relies on `arguments`, which an
    // arrow function does not have.
    function gtag(...args: unknown[]) {
      w.dataLayer!.push(args);
    }
    w.gtag = gtag;
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
  }, [measurementId, allowed]);

  return null;
}
