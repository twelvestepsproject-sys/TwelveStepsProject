"use client";

import { useEffect, type RefObject } from "react";

/**
 * Header shrink-on-scroll (motion pass). Toggles a "scrolled" class on the
 * `<header>` element itself via a ref passed down from `site-header.tsx` —
 * deliberately NOT a new wrapping element and NOT anything `fixed`/`z-*`.
 *
 * CRITICAL (per mobile-nav.tsx's fixed bug): the header already has
 * `backdrop-blur`, which creates a new stacking context — any `fixed` +
 * high-`z-index` DESCENDANT of it gets trapped inside that context and
 * can't paint above content outside the header (that's exactly what broke
 * the mobile off-canvas panel, fixed by portaling it to `document.body`).
 * This component avoids that class of bug entirely by not introducing any
 * new element at all: it just calls `classList.toggle` on the header DOM
 * node the caller already owns. No new stacking context, no new
 * positioning context, nothing for a future `fixed` descendant to get
 * trapped inside.
 *
 * rAF-throttled scroll listener, threshold `window.scrollY > 40`. Renders
 * nothing (`return null`) — purely a side-effect island.
 */
export function HeaderShrinkOnScroll({ headerRef }: { headerRef: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let ticking = false;
    let rafId = 0;

    function apply() {
      const node = headerRef.current;
      if (!node) return;
      const scrolled = window.scrollY > 40;
      node.classList.toggle("is-scrolled", scrolled);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(() => {
        apply();
        ticking = false;
      });
    }

    apply(); // sync initial state (e.g. reload mid-scroll / back-forward cache)
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [headerRef]);

  return null;
}
