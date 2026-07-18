import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";

/**
 * `/tochnit-halimudim/[year-slug]` — Year 1/2/3 sub-pages (§4
 * `/[studies-hub]/[year-slug]`). See the studies-hub index page and
 * `DataSource.listStudyYears`'s own comment for the full judgment-call
 * reasoning: no §6 schema/fixture models a studies-hub hierarchy distinct
 * from `trainings`, so this reads a small, explicitly-flagged, NOT-§6
 * fixture — but still through the `db` seam like every other collection,
 * not a direct fixture import. `generateStaticParams` still pre-renders
 * every year statically (§10), and the percent-encoded Hebrew slug decode
 * is applied unconditionally (same proven pattern as every other dynamic
 * route this pass), even though these particular slugs are
 * ASCII-transliterated today.
 */
interface PageProps {
  params: Promise<{ "year-slug": string }>;
}

export async function generateStaticParams() {
  const studyYears = await db.listStudyYears();
  return studyYears.map((y) => ({ "year-slug": y.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { "year-slug": rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const studyYears = await db.listStudyYears();
  const year = studyYears.find((y) => y.slug === slug);
  if (!year) return {};
  return {
    title: `${year.label} | תוכנית הלימודים | מכללת אשד`,
    description: year.description,
  };
}

export default async function StudyYearPage({ params }: PageProps) {
  const { "year-slug": rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const studyYears = await db.listStudyYears();
  const year = studyYears.find((y) => y.slug === slug);

  if (!year) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-semibold text-ink-muted">
        <Link href="/tochnit-halimudim" className="hover:text-primary hover:underline">
          תוכנית הלימודים
        </Link>{" "}
        / {year.label}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{year.label}</h1>
      <p className="mt-6 text-lg text-ink-muted">{year.description}</p>

      <div className="mt-10 rounded-lg border border-border bg-surface-alt p-5 text-sm text-ink-muted">
        תוכן מפורט לכל שנה — נושאי לימוד, מרצים, ולוח זמנים — ימולא בהמשך על ידי הצוות האקדמי.
        ראו <code>docs/content-needed.md</code> לפירוט הפער.
      </div>
    </main>
  );
}
