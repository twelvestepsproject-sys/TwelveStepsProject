import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { formatReadingTime } from "@/lib/format";

/**
 * `/blog/[slug]` — Single article (§4 `/[blog]/[slug]`, nested under blog
 * rather than at root per §4's explicit nesting decision). Reads
 * `db.getPost(slug)`. `generateStaticParams` pre-renders every currently
 * public post (§10). JSON-LD `Article` schema per §9.
 *
 * Percent-encoded Hebrew slug decode applied unconditionally, same proven
 * pattern as every other dynamic segment this pass (see
 * hachsharot/[slug]/page.tsx's header comment for the full finding).
 */
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { items } = await db.listPosts({ perPage: 1000 });
  return items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const post = await db.getPost(slug);
  if (!post) return {};

  return {
    title: post.seo_title ?? `${post.title} | בלוג | מכללת אשד`,
    description: post.seo_description ?? post.excerpt,
    alternates: post.seo_canonical ? { canonical: post.seo_canonical } : undefined,
    robots: post.seo_noindex ? { index: false, follow: false } : undefined,
  };
}

export default async function SingleArticlePage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const post = await db.getPost(slug);

  if (!post) notFound();

  const cover = post.cover_image_id ? await db.getMedia(post.cover_image_id) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: "מכללת אשד",
    },
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-sm font-semibold text-ink-muted">
        <Link href="/blog" className="hover:text-primary hover:underline">
          בלוג
        </Link>
        {post.category ? (
          <>
            {" "}
            /{" "}
            <Link href={`/blog/category/${post.category.slug}`} className="hover:text-primary hover:underline">
              {post.category.name}
            </Link>
          </>
        ) : null}
      </p>

      {cover ? (
        <Image
          src={mediaUrlFor(cover)}
          alt={cover.alt_he}
          width={cover.width}
          height={cover.height}
          priority
          className="my-6 h-64 w-full rounded-lg object-cover sm:h-80"
        />
      ) : null}

      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{post.title}</h1>
      <div className="mt-3 flex flex-wrap gap-x-3 text-sm text-ink-muted">
        {post.published_at ? <span>{post.published_at.slice(0, 10)}</span> : null}
        <span>{formatReadingTime(post.reading_time)}</span>
      </div>

      <div className="prose prose-ink mt-8 max-w-none whitespace-pre-line text-ink">{post.body}</div>
    </main>
  );
}
