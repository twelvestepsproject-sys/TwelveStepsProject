"use client";

import { useEffect, useRef } from "react";

/**
 * The falling-Hebrew-letters backdrop behind a chapter title.
 *
 * Canvas rather than DOM nodes or CSS animation: the effect needs a few
 * hundred glyphs repainting several times a second, and that many
 * animated elements costs layout and paint on every frame. One canvas is
 * a single composited layer whose cost does not grow with the glyph
 * count.
 *
 * Accessibility and motion
 * ------------------------
 * `prefers-reduced-motion: reduce` is honoured by painting ONE static
 * frame of scattered letters instead of animating — the texture the
 * design wants, with no movement. That is checked at mount and again
 * whenever the setting changes, so a reader who turns the preference on
 * mid-visit gets the animation stopped rather than only on reload.
 *
 * The canvas is `aria-hidden` and carries no text content: it is
 * decoration, and the chapter title beside it is the real heading.
 *
 * Cost control
 * ------------
 * The loop stops when the hero scrolls out of view (IntersectionObserver)
 * and when the tab is hidden, so a reader partway down a chapter is not
 * paying for an animation they cannot see. It also stops on unmount —
 * without that, client-side navigation to another chapter would leave the
 * previous page's rAF loop running forever.
 */
export function MatrixRain({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Hebrew letters plus a couple of digits, which is what gives the
    // field its "code" read rather than looking like scattered text.
    const GLYPHS = "אבגדהוזחטיכלמנסעפצקרשת01";
    const STEP = 18; // px between columns, and the row advance per tick

    /**
     * Colours are read from the CSS tokens rather than written here, so
     * the canvas cannot drift from the palette in emet-prose.css — and
     * §3.5 forbids a hardcoded hex in app code regardless. The fallbacks
     * only apply if the tokens are somehow missing, which would mean the
     * stylesheet failed to load.
     */
    const styles = getComputedStyle(canvas);
    const token = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;

    const BG = token("--emet-bg", "white");
    const LEAD = token("--emet-green-deep", "green");
    const GREEN = token("--emet-green", "green");
    const MONO = token("--font-plex-mono", "");

    let columns = 0;
    let drops: number[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;

    /** Sizes the backing store to the element's CSS box, accounting for
     *  device pixel ratio so the glyphs are not blurry on a retina
     *  screen. Re-seeds the column offsets to the new height. */
    function size() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(width / STEP);
      drops = Array.from({ length: columns }, () => (Math.random() * height) / STEP);
    }

    /** One animated tick: a translucent wash over the previous frame
     *  leaves the fading trail, then each column draws its leading glyph
     *  in the deeper green and advances. */
    function tick() {
      if (!ctx) return;
      // The fade that leaves the trail. `globalAlpha` rather than an
      // rgba() string, so the background token can be any colour format
      // without this needing to parse it.
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.font = `16px ${MONO ? `${MONO}, ` : ""}monospace`;

      for (let i = 0; i < columns; i++) {
        const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        // Drawn from the right edge: the column order should read the
        // same way the Hebrew around it does.
        const x = width - i * STEP;
        const y = drops[i] * STEP;
        ctx.fillStyle = LEAD;
        ctx.fillText(glyph, x, y);

        if (y > height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      }
    }

    /** The reduced-motion alternative: one pass of scattered glyphs at
     *  varying opacity, painted once and left alone. */
    function paintStill() {
      if (!ctx) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);
      ctx.font = `16px ${MONO ? `${MONO}, ` : ""}monospace`;
      ctx.fillStyle = GREEN;
      for (let i = 0; i < columns; i++) {
        const n = Math.floor(Math.random() * 12) + 3;
        for (let k = 0; k < n; k++) {
          // Varying alpha gives the field depth without the motion.
          ctx.globalAlpha = Math.random() * 0.6;
          ctx.fillText(
            GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            width - i * STEP,
            Math.random() * height,
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    let last = 0;
    function loop(ts: number) {
      if (!running) return;
      // ~16fps. The effect reads as a slow drift, and a full 60fps would
      // burn battery for a backdrop nobody is looking straight at.
      if (ts - last > 60) {
        tick();
        last = ts;
      }
      frame = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduced.matches) return;
      running = true;
      frame = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frame);
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    /** Applies whichever mode the current preference calls for. */
    function apply() {
      stop();
      size();
      if (reduced.matches) paintStill();
      else start();
    }

    apply();

    const onResize = () => apply();
    window.addEventListener("resize", onResize);
    reduced.addEventListener("change", apply);

    // Pause when scrolled away or the tab is hidden.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (reduced.matches) return;
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (!reduced.matches) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      reduced.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
