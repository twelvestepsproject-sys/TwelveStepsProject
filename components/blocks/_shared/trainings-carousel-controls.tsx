"use client";

import { useRef, type ReactNode } from "react";

/**
 * Motion pass — trainings carousel scroll container + prev/next controls +
 * keyboard nav, as one client island.
 *
 * `children` are the already-rendered training cards (plain JSX, built
 * server-side in `trainings-carousel.tsx`) — passed straight through as
 * React children, NOT via a function render-prop. A function can't cross
 * the Server->Client Component boundary as a prop (Next.js errors on
 * `data-server-component-functions-not-serializable` at build time), so
 * this component owns the actual scrollable `<div>` element itself and
 * just renders `{children}` inside it, with the ref/keydown handler
 * attached directly to that div.
 *
 * The scroll container (`overflow-x-auto` + `snap-x snap-mandatory`) is
 * plain CSS and already gets native touch/drag swipe support for free, no
 * JS needed for that part — this island only adds the arrow buttons and
 * ArrowLeft/ArrowRight keyboard handling on top.
 *
 * RTL-CRITICAL direction handling: rather than hardcode which arrow scrolls
 * which way, "next"/"previous" are derived from the actual computed
 * `direction` of the document at call time (`getComputedStyle(document
 * .documentElement).direction`), not assumed from dir="rtl" alone.
 * `<html dir="rtl">` is unconditional in this codebase (app/layout.tsx) —
 * verified empirically against the running dev server (not just reasoned
 * about) that modern evergreen browsers (this project's baseline) scroll a
 * `dir="rtl"` container with NEGATIVE scrollLeft values as content moves
 * forward in reading order, so "next" maps to negative scrollLeft in RTL,
 * positive in LTR; "previous" is the inverse.
 */
export function TrainingsCarouselControls({
  children,
  heading,
  cardScrollAmount = 336, // ~320px min card width + 16px (gap-6 breakpoint) — see trainings-carousel.tsx
}: {
  children: ReactNode;
  heading: string;
  cardScrollAmount?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function isRtl() {
    return getComputedStyle(document.documentElement).direction === "rtl";
  }

  /** `forward` = advance in reading order (the semantic "next"). */
  function scrollByDirection(forward: boolean) {
    const node = scrollRef.current;
    if (!node) return;
    const sign = isRtl() ? -1 : 1;
    const delta = (forward ? 1 : -1) * sign * cardScrollAmount;
    node.scrollBy({ left: delta, behavior: "smooth" });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // ArrowRight/ArrowLeft map to reading-order next/previous based on
    // actual direction, not visual left/right assumptions.
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByDirection(isRtl() ? true : false);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByDirection(isRtl() ? false : true);
    }
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="קרוסלה"
        aria-label={heading}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {children}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => scrollByDirection(false)}
          aria-label="ההכשרה הקודמת"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 2L4 8L10 14"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => scrollByDirection(true)}
          aria-label="ההכשרה הבאה"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6 2L12 8L6 14"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
