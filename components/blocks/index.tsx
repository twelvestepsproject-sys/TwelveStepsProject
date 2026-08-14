import { Suspense } from "react";
import type { PageBlock } from "@/lib/schemas";
import { Hero } from "./hero";
import { IntroMedia, IntroMediaSkeleton } from "./intro-media";
import { LeaderMessage, LeaderMessageSkeleton } from "./leader-message";
import { TrainingsCarousel, TrainingsCarouselSkeleton } from "./trainings-carousel";
import { ProgramStagesStepper, ProgramStagesStepperSkeleton } from "./program-stages-stepper";
import { TestimonialsSlider, TestimonialsSliderSkeleton } from "./testimonials-slider";
import { LecturersGrid, LecturersGridSkeleton } from "./lecturers-grid";
import { LatestArticles, LatestArticlesSkeleton } from "./latest-articles";
import { Podcast, PodcastSkeleton } from "./podcast";
import { NewsletterSignup } from "./newsletter-signup";
import { FocusAreas } from "./focus-areas";
import { PullQuote } from "./pull-quote";
import { About } from "./about";
import { VideoTestimonials, VideoTestimonialsSkeleton } from "./video-testimonials";
import { PhotoGallery, PhotoGallerySkeleton } from "./photo-gallery";
import { CommunityCta } from "./community-cta";
import { ClosingCta } from "./closing-cta";
import { TrainingDetails } from "./training-details";
import { Requirements } from "./requirements";
import { Faq } from "./faq";
import { ReadingList, ReadingListSkeleton } from "./reading-list";
import { BlockError } from "./skeleton";

/**
 * The block-type -> component lookup that makes block order/visibility
 * DB-driven (§5's closing line). `renderBlock` is called once per entry in
 * a page's already-filtered/sorted `blocks` array (filtering/sorting
 * happened inside `db.getPage()`, not here).
 *
 * Wired below: Hero, IntroMedia, LeaderMessage, TrainingsCarousel,
 * ProgramStages, TestimonialsSlider, LecturersGrid, LatestArticles,
 * Podcast, NewsletterSignup (earlier passes), plus FocusAreas, PullQuote,
 * About, VideoTestimonials, PhotoGallery, CommunityCta, ClosingCta (this
 * pass — the 10-remaining-block-types task). That accounts for 17 of the
 * 20 §5 block types; the remaining 3 — Header, Footer, GlobalOverlays —
 * are deliberately NOT here: they were judged LAYOUT-LEVEL (site-wide
 * chrome, not per-page content) and are rendered directly by
 * `app/(site)/layout.tsx` instead. See components/layout/site-header.tsx,
 * site-footer.tsx, and global-overlays.tsx for the full reasoning.
 *
 * Blocks that read `db` (async Server Components) are each wrapped in
 * their own `<Suspense>` boundary with a skeleton fallback, and further
 * wrapped in a per-block error boundary via a try/catch at the block-list
 * level (see `renderBlock`) so one block's rejected `db` call doesn't take
 * down the rest of the homepage. FocusAreas, PullQuote, About,
 * CommunityCta, and ClosingCta take no `db` read (static `data` only, per
 * the task brief), so they're dispatched directly without a Suspense/error
 * wrapper, same posture as Hero and NewsletterSignup.
 */
export function renderBlock(block: PageBlock) {
  switch (block.block_type) {
    case "hero":
      return <Hero key={block.id} data={block.data} />;

    case "intro_media":
      return (
        <Suspense key={block.id} fallback={<IntroMediaSkeleton />}>
          <IntroMediaSafe data={block.data} />
        </Suspense>
      );

    case "leader_message":
      return (
        <Suspense key={block.id} fallback={<LeaderMessageSkeleton />}>
          <LeaderMessageSafe data={block.data} />
        </Suspense>
      );

    case "trainings_carousel":
      return (
        <Suspense key={block.id} fallback={<TrainingsCarouselSkeleton />}>
          <TrainingsCarouselSafe data={block.data} />
        </Suspense>
      );

    case "program_stages":
      return (
        <Suspense key={block.id} fallback={<ProgramStagesStepperSkeleton />}>
          <ProgramStagesStepperSafe data={block.data} />
        </Suspense>
      );

    case "testimonials_slider":
      return (
        <Suspense key={block.id} fallback={<TestimonialsSliderSkeleton />}>
          <TestimonialsSliderSafe data={block.data} />
        </Suspense>
      );

    case "lecturers_grid":
      return (
        <Suspense key={block.id} fallback={<LecturersGridSkeleton />}>
          <LecturersGridSafe data={block.data} />
        </Suspense>
      );

    case "latest_articles":
      return (
        <Suspense key={block.id} fallback={<LatestArticlesSkeleton />}>
          <LatestArticlesSafe data={block.data} />
        </Suspense>
      );

    case "podcast":
      return (
        <Suspense key={block.id} fallback={<PodcastSkeleton />}>
          <PodcastSafe data={block.data} />
        </Suspense>
      );

    case "newsletter_signup":
      return <NewsletterSignup key={block.id} data={block.data} />;

    case "focus_areas":
      return <FocusAreas key={block.id} data={block.data} />;

    case "training_details":
      return <TrainingDetails key={block.id} data={block.data} />;

    case "requirements":
      return <Requirements key={block.id} data={block.data} />;

    case "faq":
      return <Faq key={block.id} data={block.data} />;

    case "reading_list":
      return (
        <Suspense key={block.id} fallback={<ReadingListSkeleton />}>
          <ReadingListSafe data={block.data} />
        </Suspense>
      );

    case "pull_quote":
      return <PullQuote key={block.id} data={block.data} />;

    case "about":
      return <About key={block.id} data={block.data} />;

    case "community_cta":
      return <CommunityCta key={block.id} data={block.data} />;

    case "closing_cta":
      return <ClosingCta key={block.id} data={block.data} />;

    case "video_testimonials":
      return (
        <Suspense key={block.id} fallback={<VideoTestimonialsSkeleton />}>
          <VideoTestimonialsSafe data={block.data} />
        </Suspense>
      );

    case "photo_gallery":
      return (
        <Suspense key={block.id} fallback={<PhotoGallerySkeleton />}>
          <PhotoGallerySafe data={block.data} />
        </Suspense>
      );

    case "header":
    case "footer":
    case "global_overlays":
      // Layout-level, not page_blocks-rendered — see file header comment.
      // A row of this type on a page is a data-authoring mistake, not a
      // crash: render nothing here rather than duplicate the header/footer
      // inline in the page body.
      return null;

    default:
      // A block_type without a wired component yet — fail quiet, not loud,
      // since §5's 20-type enum is broader than this pass's scope.
      return null;
  }
}

/**
 * Per-block error guards. Each of these is itself an async Server
 * Component that AWAITS the real block component's underlying `db` call
 * inside a try/catch, so a thrown rejection (e.g. MOCK_ERROR_RATE firing)
 * is caught right here and rendered as `<BlockError>` instead of bubbling
 * up through Suspense and blanking the rest of the homepage. This can't be
 * done generically (Server Components don't support a reusable
 * error-boundary wrapper the way client components do with
 * `componentDidCatch`), so there's one small wrapper per async block type.
 */
async function IntroMediaSafe(props: Parameters<typeof IntroMedia>[0]) {
  try {
    return await IntroMedia(props);
  } catch {
    return <BlockError label="סרטון היכרות" />;
  }
}

async function LeaderMessageSafe(props: Parameters<typeof LeaderMessage>[0]) {
  try {
    return await LeaderMessage(props);
  } catch {
    return <BlockError label="מילה מהמנהלה" />;
  }
}

async function TrainingsCarouselSafe(props: Parameters<typeof TrainingsCarousel>[0]) {
  try {
    return await TrainingsCarousel(props);
  } catch {
    return <BlockError label="הכשרות מובילות" />;
  }
}

async function ProgramStagesStepperSafe(props: Parameters<typeof ProgramStagesStepper>[0]) {
  try {
    return await ProgramStagesStepper(props);
  } catch {
    return <BlockError label="שלבי התהליך" />;
  }
}

async function TestimonialsSliderSafe(props: Parameters<typeof TestimonialsSlider>[0]) {
  try {
    return await TestimonialsSlider(props);
  } catch {
    return <BlockError label="המלצות" />;
  }
}

async function LecturersGridSafe(props: Parameters<typeof LecturersGrid>[0]) {
  try {
    return await LecturersGrid(props);
  } catch {
    return <BlockError label="מרצים" />;
  }
}

async function ReadingListSafe(props: Parameters<typeof ReadingList>[0]) {
  try {
    return await ReadingList(props);
  } catch {
    return <BlockError label="ספרי ליבה" />;
  }
}

async function LatestArticlesSafe(props: Parameters<typeof LatestArticles>[0]) {
  try {
    return await LatestArticles(props);
  } catch {
    return <BlockError label="מאמרים אחרונים" />;
  }
}

async function PodcastSafe(props: Parameters<typeof Podcast>[0]) {
  try {
    return await Podcast(props);
  } catch {
    return <BlockError label="פודקאסט" />;
  }
}

async function VideoTestimonialsSafe(props: Parameters<typeof VideoTestimonials>[0]) {
  try {
    return await VideoTestimonials(props);
  } catch {
    return <BlockError label="סרטוני המלצות" />;
  }
}

async function PhotoGallerySafe(props: Parameters<typeof PhotoGallery>[0]) {
  try {
    return await PhotoGallery(props);
  } catch {
    return <BlockError label="גלריית תמונות" />;
  }
}
