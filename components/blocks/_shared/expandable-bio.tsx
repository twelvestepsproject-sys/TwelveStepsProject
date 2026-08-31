"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A lecturer biography clamped to three lines, with a "לקריאה נוספת"
 * toggle when there is actually more to read.
 *
 * Replaces a plain `line-clamp-3` with the full text in a `title`
 * attribute. That hid the rest of the bio behind a hover tooltip, which
 * does not exist on touch devices at all — on a phone the remaining text
 * was simply unreachable, and bios in the data run past 800 characters.
 *
 * The toggle is rendered only when the text is genuinely clamped, measured
 * rather than guessed: a character-count threshold gets it wrong at every
 * breakpoint, since how much fits in three lines depends on the card width
 * and the font. `scrollHeight > clientHeight` asks the browser directly.
 *
 * Measured in a layout effect after paint and again on resize, because a
 * bio that fits on desktop can clamp on a narrow phone.
 */
export function ExpandableBio({ bio, name }: { bio: string; name: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    function measure() {
      const node = textRef.current;
      if (!node) return;
      // Only meaningful while collapsed — expanded, scrollHeight and
      // clientHeight are equal by definition and this would read false.
      if (expanded) return;
      setIsClamped(node.scrollHeight > node.clientHeight + 1);
    }

    measure();

    // Fonts load after first paint and change the line count, so a single
    // measurement on mount can be taken against a fallback face.
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, bio]);

  return (
    <div className="flex w-full flex-col gap-1">
      <p
        ref={textRef}
        id={`bio-${name}`}
        className={`whitespace-pre-line text-sm text-ink-muted ${expanded ? "" : "line-clamp-3"}`}
      >
        {bio}
      </p>
      {isClamped || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`bio-${name}`}
          className="self-center text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {expanded ? "הצגה מקוצרת" : "לקריאה נוספת"}
        </button>
      ) : null}
    </div>
  );
}
