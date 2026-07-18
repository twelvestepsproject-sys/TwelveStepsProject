"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MenuItem } from "@/lib/schemas";

/**
 * Hamburger -> off-canvas mobile menu with social links, per §5 block 1.
 * Client component (needs open/close state + Escape/scroll-lock) — the
 * data (menu tree, social links, site name) is resolved server-side in
 * `site-header.tsx` and passed in as props, so this component makes no
 * `db` calls of its own, same split as every other interactive block piece
 * in this codebase (e.g. intro-media-player.tsx).
 */
export function MobileNav({
  menu,
  socialLinks,
  siteName,
}: {
  menu: MenuItem[];
  socialLinks: Record<string, string>;
  siteName: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="פתיחת תפריט"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
      >
        <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
          <path d="M0 1H20M0 8H20M0 15H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`תפריט ניווט, ${siteName}`}
          className="fixed inset-0 z-50 bg-ink/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute inset-y-0 start-0 flex w-full max-w-xs flex-col gap-6 overflow-y-auto bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold text-ink">{siteName}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירת תפריט"
                className="flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M1 1L15 15M15 1L1 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="ניווט ראשי - נייד">
              <ul className="flex flex-col gap-1">
                {menu.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2 font-semibold text-ink transition-colors hover:bg-surface-alt hover:text-primary"
                    >
                      {item.label}
                    </Link>
                    {item.children.length > 0 ? (
                      <ul className="ms-4 flex flex-col gap-1 border-s border-border ps-3">
                        {item.children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className="block rounded-md px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-alt hover:text-primary"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </nav>

            {Object.keys(socialLinks).length > 0 ? (
              <div className="mt-auto flex gap-3 border-t border-border pt-4">
                {Object.entries(socialLinks).map(([platform, href]) => (
                  <a
                    key={platform}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-sm font-semibold text-ink-muted transition-colors hover:bg-primary hover:text-primary-fg"
                  >
                    {platform.slice(0, 1).toUpperCase()}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
