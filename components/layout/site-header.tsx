import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/queries";
import type { Media } from "@/lib/schemas";
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

  // Resolved here rather than inside MobileNav: that is a client component
  // and cannot read the database. Same lookup the footer does, so both
  // render the client's uploaded icons instead of a fallback letter.
  const socialIconIds = settings.social_icons ?? {};
  const socialIcons: Record<string, Media | null> = {};
  await Promise.all(
    Object.entries(socialIconIds).map(async ([platform, mediaId]) => {
      socialIcons[platform] = mediaId ? await db.getMedia(mediaId) : null;
    }),
  );

  return (
    <HeaderShell className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur transition-[padding,box-shadow] duration-300">
      {/* Mobile is a 3-column grid whose outer tracks are the same width
          (1fr), so the middle one is centred against the bar itself rather
          than against whatever the hamburger happens to measure — the
          spacer below is what makes that true. `justify-between` cannot do
          this: with two items it centres nothing, and with the logo as one
          of them it would sit at an edge.

          lg: drops back to the original flex row, where the logo leads and
          the nav follows. */}
      <div className="site-header-inner mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3 transition-[padding] duration-300 lg:flex lg:justify-between">
        {/* Balances the hamburger's column so the logo lands in the true
            centre. `order-last` pairs with the hamburger's `order-first`:
            first in the DOM, last in the visual row. Hidden from assistive
            tech — it carries no content — and removed entirely at lg,
            where the flex row needs no counterweight. */}
        <div aria-hidden="true" className="order-last lg:hidden" />

        {/* The logo alone is the home link now — the site name that used to
            sit beside it is screen-reader-only, per the client's request. */}
        <Link
          href="/"
          className="flex items-center gap-2 justify-self-center font-display text-lg font-bold text-ink lg:justify-self-auto"
        >
          {logo ? (
            <Image
              src={mediaUrlFor(logo)}
              alt={logo.alt_he}
              width={logo.width}
              height={logo.height}
              // Sized by HEIGHT with an automatic width, not a 36x36 box.
              // The logo is the wordmark now that the site name no longer
              // sits beside it, so it has to be legible — and a square box
              // would letterbox or squash it depending on the file.
              // Height-only keeps any aspect ratio intact, so replacing the
              // file in the admin needs no code change.
              //
              // 80px at lg. The file is 2000x757 with three lines of text
              // plus a strapline under the mark, so the 56px this started
              // at left all of that unreadable. 96px was tried and read as
              // out of proportion — taller than everything else in the bar,
              // which made the logo look bolted on rather than part of it.
              // 80px still resolves the wording and sits closer to the
              // height of the nav row it shares.
              sizes="(min-width: 1024px) 280px, 200px"
              className="h-14 w-auto shrink-0 object-contain lg:h-20"
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
          {/* The site name was printed twice — inline on desktop and in a
              centered mobile column — and the client asked for both to go:
              the logo IS the wordmark, so the name beside it read as a
              duplicate. Kept as screen-reader text because the logo is now
              the only content of the home link, and "הנני" is what the link
              actually goes to. */}
          <span className="sr-only">{settings.site_name}</span>
        </Link>

        <nav aria-label="ניווט ראשי" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {menu.map((item) => (
              <li key={item.id} className="group relative">
                <Link
                  href={item.href}
                  target={item.open_in_new_tab ? "_blank" : undefined}
                  rel={item.open_in_new_tab ? "noreferrer" : undefined}
                  // The wide logo left the desktop bar needing ~1146px of a
                  // 1152px container — six pixels of slack, so any small
                  // change tipped an item onto a second line. Tighter
                  // padding and a slightly smaller label buy back ~110px.
                  //
                  // `whitespace-nowrap` is the part that actually prevents
                  // a recurrence: without it an item breaks mid-label the
                  // moment the row is under pressure, which is what the
                  // client saw. With it the row stays on one line whatever
                  // the logo's width turns out to be.
                  className="flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-2 text-[0.8125rem] font-semibold text-ink transition-colors hover:bg-surface-alt hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary xl:px-3 xl:text-sm"
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

        {/* The hamburger belongs at the visual RIGHT in RTL — the start of
            the row. It is the last child in the DOM, so on mobile it is
            pulled into the grid's first column (`order-first`) and the
            spacer, being `order-last`, takes the third. That keeps the
            logo alone in the middle column and centred.

            The desktop flex row is unaffected: both order utilities are
            undone at lg, where source order applies again. */}
        <div className="order-first flex items-center gap-3 justify-self-start lg:order-none lg:justify-self-auto">
          {/* The search box was removed from the header at the client's
              request. `/search` itself still works and stays in the
              sitemap — this only takes the box out of the bar, which also
              returns ~220px to a row that had six pixels of slack. */}
          <a
            href="#registration-modal"
            // The widest single item in the bar, so it breaks first under
            // pressure — nowrap for the same reason as the nav links.
            className="hidden whitespace-nowrap rounded-full bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-accent-hover hover:shadow-lg active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-block xl:text-sm"
          >
            תיאום שיחת היכרות
          </a>

          <MobileNav
            menu={menu}
            socialLinks={settings.social_links}
            socialIcons={socialIcons}
            siteName={settings.site_name}
          />
        </div>
      </div>
    </HeaderShell>
  );
}
