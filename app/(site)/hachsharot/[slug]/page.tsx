import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { renderBlock } from "@/components/blocks";
import {
  TrainingIntro,
  TrainingBody,
  TrainingSyllabus,
  TrainingInstructors,
  TrainingRegistrationCta,
} from "@/components/blocks/training-sections";
import type { BlockType, Media, PageBlock, Training } from "@/lib/schemas";

/** The pre-migration-20 section order, used for trainings with no blocks
 * and as the seed for the conversion script. */
const DEFAULT_TRAINING_LAYOUT: BlockType[] = [
  "training_intro",
  "training_body",
  "training_syllabus",
  "training_instructors",
  "training_registration_cta",
];

/**
 * The five `training_*` sections were written for a narrow, padded column
 * (they emit bare headings and lists, no section chrome of their own).
 * Every other block type is a full-bleed page section that supplies its own
 * `px-6` and background — nesting those inside a padded `max-w-3xl` wrapper
 * double-padded them and boxed their backgrounds into a narrow strip, which
 * is what broke this page on mobile once it started using content blocks.
 *
 * So the wrapper moves from the page onto the training sections only.
 */
function renderTrainingBlock(block: PageBlock, training: Training, cover: Media | null) {
  switch (block.block_type) {
    case "training_intro":
      return (
        <NarrowSection key={block.id}>
          <TrainingIntro data={block.data} training={training} cover={cover} />
        </NarrowSection>
      );
    case "training_body":
      return (
        <NarrowSection key={block.id}>
          <TrainingBody data={block.data} training={training} />
        </NarrowSection>
      );
    case "training_syllabus":
      return (
        <NarrowSection key={block.id}>
          <TrainingSyllabus data={block.data} training={training} />
        </NarrowSection>
      );
    case "training_instructors":
      return (
        <NarrowSection key={block.id}>
          <TrainingInstructors data={block.data} training={training} />
        </NarrowSection>
      );
    case "training_registration_cta":
      return (
        <NarrowSection key={block.id}>
          <TrainingRegistrationCta data={block.data} training={training} />
        </NarrowSection>
      );
    default:
      // Full-bleed: the block brings its own padding, width and background.
      return renderBlock(block);
  }
}

/** The column the training sections were designed for. */
function NarrowSection({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-6">{children}</div>;
}

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
  const [training, settings] = await Promise.all([db.getTraining(slug), db.getSiteSettings()]);
  if (!training) return {};

  return {
    // BUG FIX: fallback title had the org name hardcoded — same class of
    // bug as app/layout.tsx's root metadata.
    title: training.seo_title ?? `${training.title} | ${settings.site_name}`,
    description: training.seo_description ?? training.excerpt,
    alternates: training.seo_canonical ? { canonical: training.seo_canonical } : undefined,
    robots: training.seo_noindex ? { index: false, follow: false } : undefined,
  };
}

export default async function SingleTrainingPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const [training, settings] = await Promise.all([db.getTraining(slug), db.getSiteSettings()]);

  if (!training) notFound();

  const cover = training.cover_image_id ? await db.getMedia(training.cover_image_id) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: training.title,
    description: training.excerpt,
    provider: {
      "@type": "Organization",
      // BUG FIX: was the hardcoded literal "מכללת אשד" — real structured-
      // data providers must reflect the actual org name, same as the tab
      // title bug.
      name: settings.site_name,
    },
  };

  // Block-composed when the training has blocks (migration 20); otherwise
  // the original fixed layout, so a training that was never converted
  // renders exactly as it always did. `DEFAULT_LAYOUT` is that same
  // sequence expressed as blocks, which is also what the conversion script
  // writes — one definition, no chance of the two drifting apart.
  const layout: PageBlock[] =
    training.blocks.length > 0
      ? training.blocks
      : (DEFAULT_TRAINING_LAYOUT.map((block_type, i) => ({
          id: `default-${i}`,
          training_id: training.id,
          page_id: null,
          block_type,
          sort_order: i + 1,
          is_visible: true,
          data: {},
        })) as unknown as PageBlock[]);

  return (
    <main className="py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {layout.map((block) => renderTrainingBlock(block, training, cover))}
    </main>
  );
}
