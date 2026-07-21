import type { Metadata } from "next";
import { fontDisplay, fontBody, fontRubik, fontNotoSansHebrew, fontFredoka } from "@/lib/fonts";
import { db } from "@/lib/queries";
import { renderThemeStyleTag, fontFamilyVars } from "@/lib/admin/theme-style";
import "./globals.css";

export const metadata: Metadata = {
  title: "מכללת אשד",
  description: "לזוז, בקצב שלך.",
};

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
