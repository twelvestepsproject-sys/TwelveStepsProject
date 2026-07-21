import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { MobileNav } from "./mobile-nav";
import { HeaderShell } from "./header-shell";

/**
 * §5 block 1 — Header (logo, primary nav with dropdowns, search with live
 * results, secondary CTA slot, hamburger -> off-canvas mobile menu with
 * social links).
 *
 * JUDGMENT CALL (flagged per the task brief): this is built as
 * LAYOUT-LEVEL — `app/(site)/layout.tsx` renders it directly — rather than
 * as a `page_blocks` row dispatched through `components/blocks/index.tsx`'s
 * registry. Reasoning:
 *   - The header is identical chrome on every public page, not
 *     page-specific content. A `page_blocks` row models "this piece of
 *     content on this page, at this sort_order" — the header isn't "on"
 *     the homepage any more than it's "on" the blog. Making it a block
 *     would mean either duplicating the same row across every page (drifts
 *     out of sync) or special-casing "the header block always renders
 *     first regardless of sort_order," which defeats the point of
 *     sort_order-driven ordering.
 *   - It still reads from `db` exactly like a block would
 *     (`db.getMenu('header')`, `db.getSiteSettings()` for the logo) — the
 *     "everything through db" rule doesn't require page_blocks rows
 *     specifically, just that no component reaches around the seam.
 *   - `headerBlockDataSchema` / the `"header"` block_type still exist in
 *     the §6 enum and stay there — a future admin screen could still model
 *     "header configuration" as a singleton editable thing without it
 *     being a page_blocks row (e.g. site_settings-like), that's just not
 *     built in this pass.
 * This mirrors the same reasoning applied to `footer` and
 * `global_overlays` below/elsewhere — see those files' header comments.
 *
 * `db.getMenu('header')` returns the already-resolved nested tree (§5.5
 * rule 6) — no flattening/re-nesting happens in this component, per the
 * task brief's explicit instruction.
 *
 * Search: a live-results search box is explicitly scoped in §5 #1, but
 * `db.search()` requires a query string server-side — a live-as-you-type
 * result list needs a client component wired to a Server Action or a
 * debounced fetch to a route handler, neither of which exists yet this
 * pass. Built here: a plain <form action="/search"> submitting `q`, which
 * lands on `/search` (§4's sitemap already lists this route) rather than
 * showing live results inline. Flagged as a deferred piece, not silently
 * dropped — see final report.
 */
export async function SiteHeader() {
  const [menu, settings] = await Promise.all([db.getMenu("header"), db.getSiteSettings()]);
  const logo = settings.logo_id ? await db.getMedia(settings.logo_id) : null;

  return (
    <HeaderShell className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur transition-[padding,box-shadow] duration-300">
      <div className="site-header-inner mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-3 transition-[padding] duration-300 lg:flex lg:justify-between">
        {/* BUG FIX (design feedback): on mobile there's no true center slot
            with a 2-item flex justify-between layout — the site name sat
            at whichever edge this link happened to land on. A 3-column
            grid (logo | flexible-center-name | hamburger) genuinely centers
            the middle column regardless of the outer groups' widths, mobile
            only — lg: reverts to the original flex layout, where the
            logo+name sit inline together as one lockup like before. */}
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          {logo ? (
            <Image
              src={mediaUrlFor(logo)}
              alt={logo.alt_he}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
            />
          ) : (
            // No logo uploaded yet (site_settings.logo_id is null in the
            // fixture — §3.5's "obviously provisional" wordmark hasn't been
            // generated as an actual file this pass) — fall back to the
            // site name's first letter as an icon rather than a broken
            // <img> or an invented placeholder logo file.
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg"
            >
              {settings.site_name.slice(0, 1)}
            </span>
          )}
          {/* Inline name — desktop only. On mobile the name moves to its
              own centered grid column below instead (larger text per
              design feedback), so it isn't duplicated here. */}
          <span className="hidden lg:inline">{settings.site_name}</span>
        </Link>

        {/* Centered site name, mobile only — genuinely centered between the
            logo and the hamburger regardless of either one's width, which
            justify-between could never guarantee. Larger text per design
            feedback ("שהמילה הנני יהיה בטקסט גדול"). */}
        <span className="justify-self-center text-center font-display text-2xl font-bold text-ink lg:hidden">
          {settings.site_name}
        </span>

        <nav aria-label="ניווט ראשי" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {menu.map((item) => (
              <li key={item.id} className="group relative">
                <Link
                  href={item.href}
                  target={item.open_in_new_tab ? "_blank" : undefined}
                  rel={item.open_in_new_tab ? "noreferrer" : undefined}
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {item.label}
                  {item.children.length > 0 ? (
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : null}
                </Link>
                {item.children.length > 0 ? (
                  <ul className="invisible absolute start-0 top-full z-10 min-w-48 rounded-md border border-border bg-surface p-2 opacity-0 shadow-lg transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={child.href}
                          target={child.open_in_new_tab ? "_blank" : undefined}
                          rel={child.open_in_new_tab ? "noreferrer" : undefined}
                          className="block rounded-md px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-alt hover:text-primary"
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

        {/* BUG FIX: on mobile, this wrapper (effectively just the hamburger
            button, since search/CTA are hidden below md/sm) used to render
            as the LAST flex child. With dir="rtl" + justify-between, the
            last child paints at the visual LEFT — so the hamburger showed
            up on the wrong side. `order-first` (mobile-only, undone at lg
            where the desktop layout takes over) moves it to the visual
            START of the row — the right side in RTL — without touching
            desktop ordering at all. */}
        <div className="order-first flex items-center gap-3 lg:order-none">
          <form action="/search" className="hidden items-center md:flex" role="search">
            <label htmlFor="site-search" className="sr-only">
              חיפוש באתר
            </label>
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="חיפוש..."
              className="w-40 rounded-full border border-border bg-bg px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:w-56"
            />
          </form>

          <a
            href="#registration-modal"
            className="hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-accent-hover hover:shadow-lg active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-block"
          >
            תיאום שיחת היכרות
          </a>

          <MobileNav menu={menu} socialLinks={settings.social_links} siteName={settings.site_name} />
        </div>
      </div>
    </HeaderShell>
  );
}
