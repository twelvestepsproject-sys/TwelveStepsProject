import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/queries";
import { chapterNumberOf, chapterTitleOf, isChapterCategory } from "@/lib/emet/chapters";
import { emetPath } from "@/lib/emet/routes";

/**
 * `/` — the homepage.
 *
 * Every line of prose here is the author's own, taken from the live
 * site's homepage: the opening question, the quotation, the biography.
 * Nothing is written to fill a slot — the brief rules out inventing
 * marketing copy or credentials during a migration, and a paragraph that
 * sounds right but was never written is the worst kind of error to ship,
 * because it reads as true.
 *
 * The heading levels run h1 -> h2 straight down the page, which is what
 * makes the structure legible to a screen reader and to a crawler.
 */
export const revalidate = 3600;

/** From the live homepage, verbatim. */
const OPENING_QUESTION =
  "מהי המציאות בה אנו חיים, איזה תפיסת עולם תופסת את מוחנו בתוך “בית העבדים”, למה כל כך מפחיד לקפוץ אל האמת, ואיך בכל זאת אפשר וצריך להשתחרר ולפרוץ מבעד לעולם החלומות?";

const PULL_QUOTE =
  "“השאלה היא זו שמניעה אותנו. התשובה כבר תמצא אותנו אם רק ניתן לה…”";

const SUBTITLE = "פיצוח קוד המטריקס… בואו להציץ אל מעבר לאשליה";

const AUTHOR_BIO =
  "רוני אילון הירש מורה ומטפל מומחה ברפואה סינית. מוהל, מרצה ומדריך בחסידות, קבלה ופנימיות התורה. מייסד ומנהל מרכז הקירוב הראשון בת”א. כיום מנהל את מרכז ‘שמים אשירה’ בנווה-צדק ת”א, שנוצר על מנת לחבר ולקשר בין רוחניות המזרח לבין מסורת החוכמה היהודית העתיקה.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.getSiteSettings();
  return {
    title: { absolute: `${settings.site_name} — ${settings.tagline}` },
    description: settings.seo_description?.trim() || settings.tagline,
    alternates: { canonical: "/" },
  };
}

export default async function EmetHomePage() {
  const settings = await db.getSiteSettings();

  const categories = await db.listCategories();
  const chapters = categories
    .filter((c) => isChapterCategory(c.slug))
    .sort((a, b) => (chapterNumberOf(a.slug) ?? 0) - (chapterNumberOf(b.slug) ?? 0));

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
  // The biography is the author's own, so attributing it is accurate.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "רוני אילון הירש",
    description: AUTHOR_BIO,
    url: base,
  };

  return (
    <div className="bg-[#0b0d0c]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      {/* Hero. The grid is a single CSS gradient rather than an image or a
          canvas: it suggests structure beneath the surface, costs nothing
          to load, and cannot shift the layout while it arrives. */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#34d399 1px, transparent 1px), linear-gradient(90deg, #34d399 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 80% 55% at 50% 40%, #000 35%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 55% at 50% 40%, #000 35%, transparent 75%)",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:py-36">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {settings.site_name}
          </h1>
          <p className="mt-4 text-base text-emerald-300/80 sm:text-lg">{settings.tagline}</p>
          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            {SUBTITLE}
          </p>

          <Link
            href={emetPath("/chapters")}
            className="mt-12 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-7 py-3.5 font-semibold text-emerald-300 transition-colors hover:border-emerald-400/70 hover:bg-emerald-400/20 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            לפרקים
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </section>

      {/* The question the site is built around. */}
      <section className="border-b border-white/10 px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/60">
            השאלה
          </h2>
          <p className="mt-6 text-xl leading-[1.8] text-white/85 sm:text-2xl sm:leading-[1.75]">
            {OPENING_QUESTION}
          </p>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-20 sm:py-24">
        <blockquote className="mx-auto max-w-3xl text-center">
          <p className="font-display text-2xl leading-[1.7] text-emerald-200/90 sm:text-3xl sm:leading-[1.6]">
            {PULL_QUOTE}
          </p>
        </blockquote>
      </section>

      {/* The seventeen chapters. The full list, not a selection: it is the
          site's primary navigation and every chapter should be reachable
          from the homepage without JavaScript. */}
      <section className="border-b border-white/10 px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">המסע</h2>
            <Link
              href={emetPath("/chapters")}
              className="shrink-0 text-sm text-emerald-400/80 transition-colors hover:text-emerald-300"
            >
              לכל הפרקים ←
            </Link>
          </div>

          <ol className="mt-10 grid gap-x-10 border-t border-white/10 sm:grid-cols-2">
            {chapters.map((chapter) => (
              <li key={chapter.id} className="border-b border-white/10">
                <Link
                  href={emetPath(`/chapters/${chapter.slug}`)}
                  className="group flex items-baseline gap-4 py-4 transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/60"
                >
                  <span
                    aria-hidden="true"
                    className="w-7 shrink-0 text-end font-display text-sm tabular-nums text-emerald-400/45 transition-colors group-hover:text-emerald-400"
                  >
                    {chapterNumberOf(chapter.slug) ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-snug text-white/75 transition-colors group-hover:text-white sm:text-base">
                    {chapterTitleOf(chapter.name)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/60">
            על המחבר
          </h2>
          <p className="mt-6 text-base leading-[1.9] text-white/70 sm:text-lg">{AUTHOR_BIO}</p>
        </div>
      </section>

      <section className="px-5 py-20 sm:py-24">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          <Link
            href={emetPath("/sources")}
            className="group rounded-xl border border-white/10 p-7 transition-colors hover:border-emerald-400/40 hover:bg-white/[0.03]"
          >
            <h2 className="font-display text-lg font-bold text-white/90 group-hover:text-white">
              מקורות
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              המקורות שעליהם נשענים הפרקים, לפי סדר הפרקים.
            </p>
          </Link>
          <Link
            href={emetPath("/en")}
            className="group rounded-xl border border-white/10 p-7 transition-colors hover:border-emerald-400/40 hover:bg-white/[0.03]"
          >
            <h2
              lang="en"
              dir="ltr"
              className="font-display text-lg font-bold text-white/90 group-hover:text-white"
            >
              English
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              החומר באנגלית, כולל ציטוטי המקור שהפרקים דנים בהם.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
