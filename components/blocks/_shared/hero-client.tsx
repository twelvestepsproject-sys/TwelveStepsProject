"use client";

import { useRef, type ReactNode } from "react";
import { HeroEntrance } from "./hero-entrance";

/**
 * Thin client boundary so `hero.tsx` can go back to being an `async`
 * Server Component (needed once it started resolving `background_media_id`
 * via `db.getMedia()`) while still hosting the ref `HeroEntrance` needs for
 * its WAAPI "settle in" effect. Renders its `children` (the server-rendered
 * heading/intro/CTAs markup, passed straight through, unchanged) inside the
 * ref'd wrapper — no conditional visibility classes here either, same
 * "never gate initial paint on JS" guarantee as before.
 */
export function HeroClient({ children }: { children: ReactNode }) {
  const headingWrapRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <HeroEntrance headingRef={headingWrapRef} />
      {/* relative z-10: the parent section may have absolutely-positioned
          background-image/overlay layers behind this content (hero.tsx) —
          this guarantees the actual text/CTAs always paint above them. */}
      <div ref={headingWrapRef} className="relative z-10">
        {children}
      </div>
    </>
  );
}
