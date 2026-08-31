import type { Metadata } from "next";
import { fontDisplay, fontBody, fontRubik, fontNotoSansHebrew, fontFredoka } from "@/lib/fonts";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { renderThemeStyleTag, fontFamilyVars } from "@/lib/admin/theme-style";
import "./globals.css";

/**
 * BUG FIX: this used to be a static `export const metadata` object with a
 * literal hardcoded title/description — Next.js only evaluates a static
 * `metadata` export once at build time, so it could NEVER reflect
 * `site_settings.site_name`/`tagline` no matter what the admin saved,
 * directly violating this file's own §3.5 acceptance-bar promise just
 * below ("the site name... zero code changes and zero redeploy"). Real
 * symptom: the browser tab kept showing the old placeholder org name
 * long after the real name was saved. `generateMetadata` is the
 * async/dynamic equivalent — same `db.getSiteSettings()` call already
 * used by the layout body below, so this adds no new read.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.getSiteSettings();
  const logo = settings.logo_id ? await db.getMedia(settings.logo_id) : null;
  const favicon = settings.favicon_id ? await db.getMedia(settings.favicon_id) : null;

  // Sharing a link produced no preview image at all — there was no
  // openGraph block here, so WhatsApp, Facebook and iMessage fell back to
  // a bare title. The logo already in Branding is the image, which means
  // replacing it there updates the preview with no code change, exactly
  // like the header. `metadataBase` is what turns the relative
  // /api/media/... path into the absolute URL these scrapers require.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const ogImages = logo
    ? [
        {
          url: mediaUrlFor(logo),
          width: logo.width,
          height: logo.height,
          alt: logo.alt_he || settings.site_name,
        },
      ]
    : undefined;

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title: settings.site_name,
    description: settings.tagline,
    // The Branding screen has offered a favicon upload since it was built,
    // but nothing ever read `favicon_id` — uploading one saved the row and
    // changed nothing, so the tab kept showing the generic mark shipped in
    // public/favicon.ico. Wired up here, with that file as the fallback for
    // when no favicon has been uploaded.
    //
    // `apple` gets the same image: iOS uses it for a home-screen bookmark,
    // and falling back to the site logo beats iOS's own default, which is a
    // screenshot of the page.
    icons: favicon
      ? {
          icon: mediaUrlFor(favicon),
          shortcut: mediaUrlFor(favicon),
          apple: mediaUrlFor(favicon),
        }
      : undefined,
    openGraph: {
      type: "website",
      siteName: settings.site_name,
      title: settings.site_name,
      description: settings.tagline ?? undefined,
      locale: "he_IL",
      url: siteUrl ?? undefined,
      images: ogImages,
    },
    twitter: {
      // summary_large_image needs a wide image to look right; the logo is
      // square or portrait, so the compact card is the honest choice.
      card: "summary",
      title: settings.site_name,
      description: settings.tagline ?? undefined,
      images: ogImages,
    },
  };
}

/**
 * §3.5 acceptance bar: "I can change the primary color, the logo, the
 * site name, and the font from /admin, and every page reflects it within
 * seconds, with zero code changes and zero redeploy." This root layout is
 * where that promise is actually kept: `db.getSiteSettings()` is read on
 * every request (Server Component, no client fetch/useEffect — avoids the
 * "flash of default palette" §3.5 explicitly warns against), and its
 * `theme` jsonb overrides + `radius_scale` + font selection are injected
 * as an inline <style> block AFTER globals.css, so unset keys fall back
 * to the shipped @theme defaults via ordinary CSS cascade. This was
 * previously missing entirely (verified via full-text search before this
 * pass) — a Branding screen that saves values nobody reads would be
 * pointless, so closing this gap is part of the Branding screen's scope.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await db.getSiteSettings();
  const themeStyle = renderThemeStyleTag(settings);
  const fontVarsStyle = fontFamilyVars(settings);

  return (
    <html
      lang="he"
      dir="rtl"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontRubik.variable} ${fontNotoSansHebrew.variable} ${fontFredoka.variable} h-full antialiased`}
    >
      <head>
        {/* Server-rendered CSS custom-property overrides only; values are
            constrained to hex/length/keyword tokens by isSafeCssValue() in
            lib/admin/theme-style.ts before reaching this string. */}
        {fontVarsStyle ? <style dangerouslySetInnerHTML={{ __html: fontVarsStyle }} /> : null}
        {themeStyle ? <style dangerouslySetInnerHTML={{ __html: themeStyle }} /> : null}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
