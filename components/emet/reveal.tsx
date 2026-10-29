"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades a section in as it enters the viewport.
 *
 * IntersectionObserver rather than a scroll handler: the browser does the
 * work off the main thread, and a scroll listener firing on every frame
 * is exactly the cost the brief warns against paying for decoration.
 *
 * The element starts visible in the markup and is only hidden once
 * JavaScript has confirmed it can animate — so a reader without JS, or a
 * crawler, sees the content rather than a page of invisible divs. That is
 * the failure mode of most reveal-on-scroll code and it is silent: the
 * text is in the HTML, so nothing looks broken until someone with JS
 * disabled reports a blank page.
 *
 * Under prefers-reduced-motion nothing is hidden and no observer is
 * created. The setting asks for no movement, not for movement that
 * happens faster.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Milliseconds, for staggering siblings. Keep small — a long stagger
   *  means the last item arrives after the reader has already looked. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const element = ref.current;
    if (!element) return;

    // Hidden only now, after the markup has rendered visible.
    setShown(false);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          // One-shot: re-animating on every pass turns scrolling back up
          // into a flicker.
          observer.unobserve(entry.target);
        }
      },
      // Fires slightly before the element is fully in view, so the motion
      // finishes about when the reader's eye arrives.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } transition-[opacity,transform] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none`}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
