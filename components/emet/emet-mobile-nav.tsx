"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The mobile navigation drawer.
 *
 * The only client component in the header: everything else renders on the
 * server, so a visitor with JavaScript disabled still gets the desktop
 * list and every link remains reachable. This adds the drawer on top of
 * that rather than replacing it.
 *
 * Closing on route change matters more than it looks. Next keeps this
 * component mounted across navigations, so without it the drawer stays
 * open over the page the visitor just asked for.
 *
 * The open drawer is portalled to <body>. It is rendered from inside
 * <header>, which is `sticky` and carries `backdrop-blur` — each of which
 * creates a stacking context, so a z-index set on a descendant is
 * confined within the header and cannot rise above it however large it
 * is. Left in place the drawer sat *under* the header's own translucent
 * background, which showed the page through the top of the menu and hid
 * the site name behind the overlay. A portal takes it out of that context
 * entirely; the z-index then means what it says.
 */
export function EmetMobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  // createPortal needs document, which does not exist while the server
  // renders. Gating on this keeps the first client render identical to
  // the server's, so React does not report a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // The drawer covers the page, so the page behind it must not scroll.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="פתיחת תפריט"
        aria-expanded={open}
        // 44px square: the minimum comfortable tap target.
        className="flex h-11 w-11 items-center justify-center rounded-lg text-[#3a3a3a] transition-colors hover:bg-black/5 hover:text-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && mounted
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="תפריט ניווט"
          // z-70, above the header's z-50 and the reading-progress bar's
          // z-60. Header and drawer both sat at 50, and the header is
          // `sticky` — so it forms its own stacking context and painted
          // over the drawer, which is what made the menu look
          // see-through along the top while the rest of it was opaque.
          //
          // Opaque, not a tint: bg-white/97 silently produced nothing,
          // because Tailwind generates its opacity scale in steps and 97
          // is not one of them.
          className="fixed inset-0 z-[70] bg-white"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-full flex-col p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירת תפריט"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[#3a3a3a] transition-colors hover:bg-black/5 hover:text-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="ניווט ראשי" className="mt-6">
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-lg px-4 py-4 font-display text-2xl text-[#2b2b2b] transition-colors hover:bg-black/5 hover:text-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
