import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { formatPrice, formatHours } from "@/lib/format";

/**
 * `/hachsharot/[slug]` — Single training (§4 `/[trainings]/[slug]`).
 * Static by default (§10): `generateStaticParams` pre-renders every
 * published training's slug at build time. Reads `db.getTraining(slug)`,
 * which returns `instructors` already nested/resolved (§5.5 rule 6 — no
 * join left to this component).
 *
 * Percent-encoded Hebrew slugs: per the task brief, the throwaway
 * `app/(site)/[slug]/page.tsx` test proved that Next.js does NOT
 * auto-decode dynamic segment params — `params.slug` arrives still
 * percent-encoded and must be explicitly `decodeURIComponent`'d. Reused
 * verbatim here rather than re-derived. (This fixture's actual training
 * slugs happen to be ASCII-transliterated per lib/schemas/common.ts's
 * `slugSchema` comment, but the decode must still run unconditionally so
 * any future Hebrew-slug training works without a code change.)
 */
interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const trainings = await db.listTrainings();
  return trainings.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const training = await db.getTraining(slug);
  if (!training) return {};

  return {
    title: training.seo_title ?? `${training.title} | מכללת אשד`,
    description: training.seo_description ?? training.excerpt,
    alternates: training.seo_canonical ? { canonical: training.seo_canonical } : undefined,
    robots: training.seo_noindex ? { index: false, follow: false } : undefined,
  };
}

export default async function SingleTrainingPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const training = await db.getTraining(slug);

  if (!training) notFound();

  const cover = training.cover_image_id ? await db.getMedia(training.cover_image_id) : null;
  const price = formatPrice(training.price);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: training.title,
    description: training.excerpt,
    provider: {
      "@type": "Organization",
      name: "מכללת אשד",
    },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {cover ? (
        <Image
          src={mediaUrlFor(cover)}
          alt={cover.alt_he}
          width={cover.width}
          height={cover.height}
          priority
          className="mb-8 h-64 w-full rounded-lg object-cover sm:h-80"
        />
      ) : null}

      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{training.title}</h1>
      <p className="mt-4 text-lg text-ink-muted">{training.excerpt}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5 text-sm sm:grid-cols-4">
        {training.starts_on ? (
          <div>
            <dt className="font-semibold text-ink">תאריך התחלה</dt>
            <dd className="text-ink-muted">{training.starts_on}</dd>
          </div>
        ) : null}
        {training.meeting_day ? (
          <div>
            <dt className="font-semibold text-ink">ימי מפגש</dt>
            <dd className="text-ink-muted">{training.meeting_day}</dd>
          </div>
        ) : null}
        {training.meeting_time ? (
          <div>
            <dt className="font-semibold text-ink">שעות מפגש</dt>
            <dd className="text-ink-muted">{training.meeting_time}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-semibold text-ink">היקף</dt>
          <dd className="text-ink-muted">{formatHours(training.academic_hours)}</dd>
        </div>
        {price ? (
          <div>
            <dt className="font-semibold text-ink">מחיר</dt>
            <dd className="text-ink-muted">{price}</dd>
          </div>
        ) : null}
      </dl>

      <div className="prose prose-ink mt-8 max-w-none whitespace-pre-line text-ink">
        {training.body}
      </div>

      {training.syllabus.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">תוכנית הלימודים</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {training.syllabus.map((item, i) => (
              <li key={i} className="rounded-md border border-border bg-surface p-4">
                <p className="font-display font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {training.instructors.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ink">מרצים ומדריכים</h2>
          <ul className="mt-4 flex flex-wrap gap-4">
            {training.instructors.map((instructor) => (
              <li key={instructor.id} className="rounded-md border border-border bg-surface px-4 py-2">
                <p className="font-display font-bold text-ink">{instructor.name}</p>
                <p className="text-xs text-ink-muted">{instructor.role}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Registration CTA — UI only, no real submission yet (Phase 4 Server
          Actions), same rule as the homepage registration modal. */}
      <div className="mt-10 rounded-lg bg-primary p-6 text-center text-primary-fg">
        <p className="mb-4 font-display text-lg font-bold">מעוניינים להצטרף להכשרה?</p>
        <a
          href="#registration-modal"
          className="inline-block rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
        >
          לתיאום שיחת היכרות
        </a>
      </div>
    </main>
  );
}
