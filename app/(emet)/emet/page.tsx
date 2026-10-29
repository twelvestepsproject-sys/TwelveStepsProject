import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { emetPath } from "@/lib/emet/routes";
import { loadMediaByFilename } from "@/lib/emet/media";
import { Reveal } from "@/components/emet/reveal";
import { chapterNumberOf, isChapterCategory } from "@/lib/emet/chapters";

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
      <section className="bg-white px-5 py-20 sm:py-28">
        <Reveal className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="order-2 md:order-1">
            <h2 className="font-display text-2xl leading-[1.6] text-[#2b2b2b] sm:text-3xl sm:leading-[1.55]">
              {OPENING_QUESTION}
            </h2>
            <p className="mt-7 text-[0.95rem] leading-[2] text-[#6b6b6b]">{AUTHOR_BIO}</p>
          </div>

          {portrait ? (
            <div className="order-1 md:order-2">
              <Image
                src={mediaUrlFor(portrait)}
                alt={portrait.alt_he}
                width={portrait.width}
                height={portrait.height}
                sizes="(min-width: 768px) 460px, 100vw"
                className="h-auto w-full"
              />
            </div>
          ) : null}
        </Reveal>
      </section>

      {/* 3. The chapters, as cover cards with the title over the image. */}
      <section className="px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-xl text-[#3a3a3a] sm:text-2xl">
            {CHAPTERS_HEADING}
          </h2>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((chapter) => {
              const cover = media.get(`${chapter.slug}-cover.webp`);
              return (
                <li key={chapter.id}>
                  <Link
                    href={emetPath(`/chapters/${chapter.slug}`)}
                    className="group relative block aspect-[16/9] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
                  >
                    {cover ? (
                      <Image
                        src={mediaUrlFor(cover)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span aria-hidden="true" className="absolute inset-0 bg-[#2a2a2a]" />
                    )}
                    {/* Gradient rather than a flat wash: the titles sit at the
                        bottom, so only that band needs darkening. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                    />
                    <span className="absolute inset-x-0 bottom-0 p-5">
                      <span className="block text-sm font-semibold leading-snug text-white drop-shadow sm:text-base">
                        {chapter.name}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-12 text-center">
            <Link
              href={emetPath("/chapters")}
              className="inline-block rounded-full border border-[#c9c9c9] px-12 py-4 tracking-[0.15em] text-[#3a3a3a] transition-colors hover:border-[#3a3a3a] hover:bg-[#3a3a3a] hover:text-[#1a1a1a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
            >
              לכל הפרקים לחצו
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
