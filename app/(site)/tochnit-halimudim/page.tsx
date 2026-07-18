import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { renderBlock } from "@/components/blocks";

/**
 * `/tochnit-halimudim` — Studies hub (§4 `/[studies-hub]`). See
 * lib/mock/fixtures/pages.ts's `studiesHubBlocks` comment for the judgment
 * call: no dedicated schema/fixture exists for a "studies hub" distinct
 * from `trainings` + `program_stages`, so this reuses the existing
 * page_blocks pattern rather than inventing new schema. The year sub-page
 * links below read via `db.listStudyYears()` — the underlying fixture
 * (lib/mock/fixtures/study-years.ts) is a small, explicitly-flagged, NOT-§6
 * entity, but it's still accessed through the `db` seam like every other
 * collection, not imported directly (see `DataSource.listStudyYears`'s own
 * comment for the full reasoning).
 */
export const metadata: Metadata = {
  title: "תוכנית הלימודים | מכללת אשד",
  description: "תוכנית הלימודים הרב-שנתית של מכללת אשד — שלב אחר שלב.",
};

export default async function StudiesHubPage() {
  const [page, studyYears] = await Promise.all([
    db.getPage("tochnit-halimudim"),
    db.listStudyYears(),
  ]);
  if (!page) notFound();

  return (
    <main>
      {page.blocks.map((block) => renderBlock(block))}

      <section className="bg-bg px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            שנות הלימוד
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {studyYears.map((year) => (
              <Link
                key={year.slug}
                href={`/tochnit-halimudim/${year.slug}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="font-display text-lg font-bold text-ink">{year.label}</h3>
                <p className="text-sm text-ink-muted">{year.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
