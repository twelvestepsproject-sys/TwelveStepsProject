"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Motion pass (design-direction task) — a thin client-component wrapper
 * that adds a "reveal on scroll" fade/slide-up entrance the first time an
 * element enters the viewport.
 *
 * Deliberately NOT a JS animation library:
 * - Uses the native `IntersectionObserver` API only, to flip one class.
 * - The actual animation is CSS (`.reveal-on-scroll` / `.is-revealed` in
 *   app/globals.css) — opacity + transform only, both compositor-only
 *   properties that don't trigger layout/paint, so this stays cheap even
 *   on low-end mobile (§3's Lighthouse mobile >=90 constraint).
 * - `prefers-reduced-motion: reduce` is handled in CSS (the transition and
 *   initial hidden state are scoped to `prefers-reduced-motion: no-preference`),
 *   so this component doesn't need to duplicate that check in JS — a
 *   reduced-motion user always sees content fully visible immediately.
 * - Unobserves after the first reveal — this is a one-time entrance, not a
 *   repeating scroll animation, so it can't jank on every scroll pass.
 *
 * NOT used for above-the-fold hero content: gating LCP-relevant content
 * (e.g. the Hero block's heading) behind a client-side observer would
 * delay its visible paint and risk CLS/LCP regressions, so Hero is left
 * unwrapped and simply renders immediately per the approved plan.
 */
export function RevealOnScroll({
  children,
  className = "",
  delayMs,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Optional stagger delay (ms) applied via inline `transition-delay` —
   * used to stagger sibling cards/items instead of revealing them all at
   * once. Backward compatible: omitting it behaves exactly as before. */
  delayMs?: number;
  /** Which element to render as. Defaults to "div" (unchanged behavior).
   * "li" is needed when wrapping individual items inside a parent
   * `<ol>`/`<ul>` for a stagger effect — a `<div>` isn't valid there. */
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If IntersectionObserver isn't available for some reason, fail open
    // to visible rather than leaving content permanently hidden.
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={`reveal-on-scroll ${revealed ? "is-revealed" : ""} ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
