import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { emetPath } from "@/lib/emet/routes";
import { loadMediaByFilename } from "@/lib/emet/media";
import { Reveal } from "@/components/emet/reveal";
import {
  chapterNumberOf,
  chapterTitleOf,
  isChapterCategory,
} from "@/lib/emet/chapters";

/**
 * `/` — the homepage, rebuilt to match the live site's three sections:
 * a full-bleed hero over the code-rain background, the opening question
 * beside the author's portrait, and the chapters as a cover-image grid.
 *
 * Every line of prose is the author's own, taken off the live site. The
 * brief rules out inventing copy during a migration, and a paragraph that
 * merely sounds right is the worst kind of error to ship because it reads
 * as true.
 *
 * Images come from the media table by filename rather than by hardcoded
 * path, so replacing one through the admin is enough — no deploy.
 */
export const revalidate = 3600;

/** From the live homepage, verbatim. */
const OPENING_QUESTION =
  "מהי המציאות בה אנו חיים, איזה תפיסת עולם תופסת את מוחנו בתוך “בית העבדים”, למה כל כך מפחיד לקפוץ אל האמת, ואיך בכל זאת אפשר וצריך להשתחרר ולפרוץ מבעד לעולם החלומות?";

const AUTHOR_BIO =
  "רוני אילון הירש מורה ומטפל מומחה ברפואה סינית. מוהל, מרצה ומדריך בחסידות, קבלה ופנימיות התורה. מייסד ומנהל מרכז הקירוב הראשון בת”א. כיום מנהל את מרכז ‘שמים אשירה’ בנווה-צדק ת”א, שנוצר על מנת לחבר ולקשר בין רוחניות המזרח לבין מסורת החוכמה היהודית העתיקה. מחבר האתר אמתריקס – פיצוח קוד המטריקס על פי המיסטיקה היהודית והקבלה.";

const CHAPTERS_HEADING =
  "פיצוח קוד המטריקס… בואו להציץ אל מעבר לאשליה";

/** The homepage shows the first six chapters. Covers are keyed by the
 *  chapter's own slug, the same set /chapters uses, so a cover replaced
 *  in the admin changes in both places. */
const HOMEPAGE_CHAPTERS = 6;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.getSiteSettings();
  return {
    title: { absolute: `${settings.site_name} — ${settings.tagline}` },
    description: settings.seo_description?.trim() || settings.tagline,
    alternates: { canonical: emetPath("/") },
  };
}

export default async function EmetHomePage() {
  const settings = await db.getSiteSettings();

  const categories = await db.listCategories();
  const chapters = categories
    .filter((c) => isChapterCategory(c.slug))
    .sort((a, b) => (chapterNumberOf(a.slug) ?? 0) - (chapterNumberOf(b.slug) ?? 0));

  const featured = chapters.slice(0, HOMEPAGE_CHAPTERS);
  const media = await loadMediaByFilename([
    "hero-bg.webp",
    "author-portrait.webp",
    ...featured.map((c) => `${c.slug}-cover.webp`),
  ]);
  const hero = media.get("hero-bg.webp");
  const portrait = media.get("author-portrait.webp");

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "רוני אילון הירש",
    description: AUTHOR_BIO,
    url: base,
  };

  return (
    <div className="bg-[#f7f7f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      {/* 1. Hero: full viewport, title and pill button over the background. */}
      <section className="relative flex min-h-[86vh] items-center justify-center overflow-hidden bg-[#06110c]">
        {hero ? (
          <Image
            src={mediaUrlFor(hero)}
            alt=""
            fill
            // The largest element on first paint, so it must not be lazy.
            priority
            sizes="100vw"
            // A very slow zoom: enough to keep the code-rain from reading
            // as a flat photograph, far too slow to pull the eye off the
            // title. Dropped entirely under reduced motion.
            className="emet-hero-drift object-cover object-center"
          />
        ) : null}
        {/* Darkens the centre so white type stays legible over the busiest
            part of the image. */}
        <div aria-hidden="true" className="absolute inset-0 bg-black/25" />

        <div className="emet-hero-enter relative z-10 px-5 text-center">
          <h1 className="font-display text-6xl font-light tracking-[0.06em] text-white drop-shadow-lg sm:text-8xl">
            EMETRIX
          </h1>
          <Link
            href={emetPath("/chapters")}
            className="mt-10 inline-block rounded-full bg-white/95 px-10 py-4 text-base tracking-wide text-[#1a1a1a] shadow-xl transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:px-14"
          >
            {settings.tagline}
          </Link>
        </div>
      </section>

      {/* 2. The opening question, with the portrait alongside. */}
      <section className="bg-white px-6 py-24 sm:px-10 sm:py-32">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.15fr_1fr] md:gap-20 lg:gap-24">
          <div className="order-2 md:order-1">
            {/* Scales with the viewport instead of jumping at one
                breakpoint, so the question stays the largest thing on the
                screen on a wide monitor without overflowing a phone. */}
            <h2 className="font-display text-[clamp(1.6rem,2.6vw,2.6rem)] font-light leading-[1.45] tracking-tight text-[#141414]">
              {OPENING_QUESTION}
            </h2>
            <div aria-hidden="true" className="mt-9 h-px w-16 bg-emerald-700/35" />
            <p className="mt-7 max-w-prose text-[1.0625rem] leading-[1.95] text-[#5a5a5a]">
              {AUTHOR_BIO}
            </p>
          </div>

          {portrait ? (
            <div className="order-1 md:order-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-[#f0f0f0]">
                <Image
                  src={mediaUrlFor(portrait)}
                  alt={portrait.alt_he}
                  fill
                  sizes="(min-width: 768px) 46vw, 100vw"
                  className="object-cover object-top transition-transform duration-[1.2s] ease-out hover:scale-[1.03]"
                />
              </div>
            </div>
          ) : null}
        </Reveal>
      </section>

      {/* 3. The chapters, as cover cards with the title over the image. */}
      <section className="bg-[#fafafa] px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700/70">
              הפרקים
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.5rem,2.2vw,2.15rem)] font-light leading-snug text-[#141414]">
              {CHAPTERS_HEADING}
            </h2>
          </div>

          <ul className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((chapter) => {
              const cover = media.get(`${chapter.slug}-cover.webp`);
              const number = chapterNumberOf(chapter.slug);
              return (
                <li key={chapter.id}>
                  <Link
                    href={emetPath(`/chapters/${chapter.slug}`)}
                    className="group relative block aspect-[4/3] overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                  >
                    {cover ? (
                      <Image
                        src={mediaUrlFor(cover)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 400px, (min-width: 640px) 46vw, 100vw"
                        className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                      />
                    ) : (
                      <span aria-hidden="true" className="absolute inset-0 bg-[#2a2a2a]" />
                    )}
                    {/* Gradient rather than a flat wash: the titles sit at the
                        bottom, so only that band needs darkening. It deepens
                        on hover so the title stays legible as the image
                        brightens behind it. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-opacity duration-500 group-hover:from-black/90"
                    />

                    {number ? (
                      <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 font-display text-sm tabular-nums text-white backdrop-blur-sm transition-colors duration-300 group-hover:bg-emerald-700/80">
                        {number}
                      </span>
                    ) : null}

                    <span className="absolute inset-x-0 bottom-0 p-6">
                      <span className="block font-display text-base font-semibold leading-snug text-white drop-shadow-sm sm:text-lg">
                        {chapterTitleOf(chapter.name)}
                      </span>
                      <span className="mt-2 flex items-center gap-1.5 text-sm text-white/0 transition-all duration-300 group-hover:text-white/85">
                        לקריאה
                        <span aria-hidden="true">←</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-14">
            <Link
              href={emetPath("/chapters")}
              // The light-theme pass left this hovering to dark-on-dark:
              // bg-[#3a3a3a] with text-[#1a1a1a] is unreadable. White text
              // on the filled state, as it should have been.
              className="group inline-flex items-center gap-3 rounded-full border border-[#141414] px-9 py-4 text-sm tracking-[0.12em] text-[#141414] transition-colors duration-300 hover:bg-[#141414] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
            >
              לכל הפרקים
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:-translate-x-1"
              >
                ←
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
