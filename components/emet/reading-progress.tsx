"use client";

import { useEffect, useState } from "react";

/**
 * A thin progress bar across the top of a long article.
 *
 * Chapters here run to several thousand words, where the browser's own
 * scrollbar is a poor gauge — it measures the whole document including
 * the header, footer and subchapter list, not the reading.
 *
 * Deliberately small: it reads scroll position and sets a width. No
 * library, no scroll hijacking, and it never moves the page itself, which
 * the brief rules out explicitly.
 *
 * Hidden under `prefers-reduced-motion`. A bar that tracks scrolling is
 * exactly the kind of continuous movement that setting asks to stop, and
 * it carries no information the page needs — so it goes away rather than
 * freezing in place.
 */
export function ReadingProgress() {
  const [percent, setPercent] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setEnabled(!query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    function onScroll() {
      // Coalesce to one update per frame: the scroll event fires far more
      // often than the screen repaints.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - doc.clientHeight;
        setPercent(scrollable > 0 ? Math.min(100, (doc.scrollTop / scrollable) * 100) : 0);
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      // Decorative: the same information is in the scrollbar, and
      // announcing a percentage that changes on every scroll would be
      // noise to a screen reader.
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent"
    >
      <div
        className="h-full bg-emerald-400/70 transition-[width] duration-150 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
