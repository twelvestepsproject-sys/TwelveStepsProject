"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Motion pass — Hero "settle in" entrance + subtle background parallax.
 *
 * CRITICAL constraint (§3/task brief): the Hero's H1/eyebrow/intro must
 * NEVER be gated on JS for initial visibility. This component satisfies
 * that by construction:
 * - The heading wrapper's REST-STATE CSS (no class added) is already the
 *   fully-settled final appearance (opacity 1, no transform) — see
 *   `components/blocks/hero.tsx`, which renders the heading with zero
 *   conditional classes tied to this island.
 * - On mount, this fires a ONE-TIME Web Animations API `.animate()` call
 *   that plays FROM a near-identity starting point (opacity 0.85,
 *   translateY(6px)) TO the element's own current computed style. WAAPI
 *   animations are visual-only and don't touch the underlying CSS/DOM
 *   rest state, so if this component's JS never runs (disabled JS, error,
 *   slow hydration), the heading is simply the already-fully-visible
 *   server-rendered markup — never stuck invisible.
 * - `prefers-reduced-motion: reduce` is checked before calling `.animate()`
 *   at all.
 *
 * Parallax: Hero currently has no background image/media layer (flat
 * `bg-primary`), so there's nothing to parallax without fabricating a new
 * decorative layer beyond what the approved plan asked for. This component
 * still updates a `--hero-parallax-y` custom property on its root (capped
 * to a small range, rAF-throttled, transform-only) so a background layer
 * MAY consume it in the future without another pass touching this file —
 * but no visible parallax element is added here, since Hero has no
 * background media to move. This is a deliberate scope decision, not an
 * oversight — see the task's final report.
 */
export function HeroEntrance({ headingRef }: { headingRef: React.RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    const node = headingRef.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    if (typeof node.animate === "function") {
      node.animate(
        [
          { opacity: 0.85, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 700, easing: "ease-out", fill: "backwards" },
      );
    }

    // rAF-throttled scroll listener updating --hero-parallax-y, capped to
    // a small range. No background layer currently consumes it (Hero is
    // flat bg-primary, nothing to parallax) — kept inert/no-op visually,
    // wired for a future background-media layer without another JS pass.
    let ticking = false;
    let rafId = 0;
    const root = document.documentElement;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(() => {
        const y = Math.max(-20, Math.min(20, window.scrollY * -0.08));
        root.style.setProperty("--hero-parallax-y", `${y}px`);
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [headingRef]);

  return null;
}

/**
 * Client-only "12" accent wrapper: finds a standalone "12" token in the
 * heading text (`\b12\b`) and wraps it in a span with a subtle scale-pop
 * class. If the heading has no literal "12" this renders the text as-is —
 * server and client render identically either way, so there's no
 * hydration mismatch risk, and no content is fabricated to force the
 * effect to appear.
 */
export function HeroHeadingWithAccent({ heading }: { heading: string }): ReactNode {
  const match = heading.match(/\b12\b/);
  if (!match || match.index === undefined) return heading;

  const start = match.index;
  const end = start + match[0].length;
  return (
    <>
      {heading.slice(0, start)}
      <span className="hero-accent-12">{heading.slice(start, end)}</span>
      {heading.slice(end)}
    </>
  );
}
