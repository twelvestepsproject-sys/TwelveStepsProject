import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { ogImageFor } from "@/lib/media";
import { renderBlock } from "@/components/blocks";

/**
 * `/[slug]` — catch-all for admin-created pages (§8 Pages: "list, create,
 * edit"). Without this route, a page created in `/admin/pages` is saved to
 * the `pages` table but is unreachable on the public site, because every
 * other site route hardcodes its own slug (`db.getPage("home")`,
 * `db.getPage("odot")`, …). This makes the Pages screen actually usable:
 * create a page, publish it, and it's live at its slug with no code change.
 *
 * Ordering note: Next.js resolves STATIC segments before dynamic ones, so
 * the fixed routes in this segment (`/blog`, `/hachsharot`, `/odot`,
 * `/tochnit-halimudim`, `/search`, …) still win over this file — it only
 * catches slugs nothing else claims. `RESERVED_SLUGS` below therefore isn't
 * needed to protect those routes; it exists to stop a *duplicate* rendering
 * of the pages that already have bespoke routes (e.g. `pages.slug = "odot"`
 * is rendered by `app/(site)/odot/page.tsx`, which adds the `#martsim`
 * anchor this generic renderer wouldn't) and to keep the homepage from also
 * being reachable at `/home`.
 *
 * Percent-encoded Hebrew slugs: Next.js does NOT auto-decode dynamic
 * segment params, so `params.slug` arrives still percent-encoded and must
 * be explicitly `decodeURIComponent`'d — same handling as
 * `app/(site)/hachsharot/[slug]/page.tsx`, and load-bearing here because
 * §8 keeps admin-generated slugs in Hebrew (no transliteration).
 *
 * Not statically pre-rendered (no `generateStaticParams`): unlike trainings
 * and posts, these pages are created ad-hoc by an editor after build, so
 * enumerating them at build time would leave any newly-created page 404ing
 * until the next deploy — the opposite of the "publish is live in seconds,
 * no redeploy" requirement (§3.5 / §10) that `savePageAction`'s
 * `revalidatePath` already targets.
 */
/**
 * Cached, but still not build-time enumerated.
 *
 * Skipping `generateStaticParams` (see above) is right — these pages are
 * created after a deploy and must not 404 until the next one. But it left
 * every request re-rendering from scratch: a 13-block page measured
 * 0.6–2.5s server-side on the VPS, against 0.25s for a cached route.
 *
 * `revalidate` keeps both properties. A new page is rendered on first
 * request and served from cache after that, so it still appears without a
 * redeploy. Edits do not wait out the window either — `savePageAction`
 * already calls `revalidatePath('/<slug>')`, which drops the entry
 * immediately. The hour is only the ceiling for changes made outside the
 * admin UI, such as a direct database edit.
 */
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Slugs owned by a bespoke route in this segment — see header comment. */
const RESERVED_SLUGS = new Set(["home", "odot", "tochnit-halimudim", "hachsharot"]);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  if (RESERVED_SLUGS.has(slug)) return {};

  const [page, settings] = await Promise.all([db.getPage(slug), db.getSiteSettings()]);
  if (!page) return {};
  const logo = settings.logo_id ? await db.getMedia(settings.logo_id) : null;

  const title = page.seo_title ?? `${page.title} | ${settings.site_name}`;

  return {
    title,
    description: page.seo_description ?? undefined,
    // Without this the shared preview showed the SITE title for every page:
    // `title` alone does not feed openGraph, so the root layout's value won
    // and a shared course page was indistinguishable from the homepage.
    //
    // `images` has to be repeated even though the root layout sets it: an
    // openGraph object here REPLACES the parent's rather than merging into
    // it, so omitting the image dropped the preview picture entirely on
    // exactly the pages most likely to be shared.
    openGraph: {
      title,
      description: page.seo_description ?? undefined,
      images: logo ? [ogImageFor(logo)] : undefined,
    },
    alternates: page.seo_canonical ? { canonical: page.seo_canonical } : undefined,
    robots: page.seo_noindex ? { index: false, follow: false } : undefined,
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  // A reserved slug reaching here means someone requested the alias form
  // (e.g. `/home`); the canonical route renders it, so 404 rather than
  // serving the same content at a second URL.
  if (RESERVED_SLUGS.has(slug)) notFound();

  // getPage() returns null for a missing OR unpublished page, so an
  // unpublished draft correctly 404s for visitors.
  const page = await db.getPage(slug);
  if (!page) notFound();

  return <main>{page.blocks.map((block) => renderBlock(block))}</main>;
}
