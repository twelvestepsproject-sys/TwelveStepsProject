import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
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
interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Slugs owned by a bespoke route in this segment — see header comment. */
const RESERVED_SLUGS = new Set(["home", "odot", "tochnit-halimudim"]);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  if (RESERVED_SLUGS.has(slug)) return {};

  const [page, settings] = await Promise.all([db.getPage(slug), db.getSiteSettings()]);
  if (!page) return {};

  return {
    title: page.seo_title ?? `${page.title} | ${settings.site_name}`,
    description: page.seo_description ?? undefined,
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
