"use client";

import { useRef, type ReactNode } from "react";
import { HeaderShrinkOnScroll } from "./header-shrink-on-scroll";

/**
 * Thin client wrapper around the `<header>` element itself, so
 * `site-header.tsx` can stay a Server Component (it does `db` reads) while
 * still getting a ref-based shrink-on-scroll toggle. Renders the SAME
 * `<header>` element with the same className passed in — not an extra
 * wrapping `<div>` — so no new stacking/positioning context is introduced
 * around the header's existing `backdrop-blur` (see
 * header-shrink-on-scroll.tsx's header comment for why that matters).
 */
export function HeaderShell({ className, children }: { className: string; children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);

  return (
    <header ref={headerRef} className={className}>
      <HeaderShrinkOnScroll headerRef={headerRef} />
      {children}
    </header>
  );
}
