import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/queries";
import { mediaUrlFor } from "@/lib/media";
import { NewsletterSignup } from "@/components/blocks/newsletter-signup";
import { SocialIcon } from "./social-icon";
import type { Media } from "@/lib/schemas";

/**
 * §5 block 19 — Footer (logo, email, phone, social/community buttons,
 * quick nav, trainings list, newsletter form with consent copy, physical
 * address, legal links, credits).
 *
 * JUDGMENT CALL (flagged per the task brief, same reasoning as
 * `site-header.tsx`): built as LAYOUT-LEVEL, rendered directly by
 * `app/(site)/layout.tsx`, NOT a `page_blocks` row. It's identical chrome
 * on every public page — modeling it as a per-page row would mean
 * duplicating it on every page (drift risk) or special-casing "always
 * renders last regardless of sort_order," defeating the point of
 * sort_order. The `footer` block_type/schema stay in the §6 enum for a
 * possible future admin "footer configuration" screen; this pass just
 * doesn't make it a page_blocks instance.
 *
 * Reads `db.getSiteSettings()` (branding + contact + links, already built
 * correctly per the existing codebase) and `db.getMenu('footer_quick')`.
 * Trainings list: reads `db.listTrainings()` when
 * `footerBlockDataSchema.trainings_list` is true — but this component has
 * no `page_blocks.data` to read that flag from (no row exists, per the
 * layout-level decision above), so it defaults to "on" and always lists
 * trainings when there are any, same posture as the schema's own
 * `.default(true)`. If a future admin "footer settings" screen is added,
 * that flag would gate this the same way `data` gates every other block.
 *
 * Newsletter: reuses the exact `NewsletterSignup` block component (§5 #10)
 * rather than a second form implementation — its own file already notes
 * it's a static shell (no submit wiring, Phase 4 territory), which holds
 * here too. It needs `data` shaped to `newsletterSignupBlockDataSchema`;
 * built here from `site_settings` + a plain Hebrew consent string, since
 * there's no page_blocks row for it in a footer context either.
 */
export async function SiteFooter() {
  const [settings, quickNav, trainings] = await Promise.all([
    db.getSiteSettings(),
    db.getMenu("footer_quick"),
    db.listTrainings(),
  ]);
  const logo = settings.logo_id ? await db.getMedia(settings.logo_id) : null;

  // Uploaded per-platform icons, if the client set any. Missing entries
  // fall back to a built-in SVG inside <SocialIcon>.
  const socialIconIds = settings.social_icons ?? {};
  const socialIcons: Record<string, Media | null> = {};
  await Promise.all(
    Object.entries(socialIconIds).map(async ([platform, mediaId]) => {
      socialIcons[platform] = mediaId ? await db.getMedia(mediaId) : null;
    }),
  );

  return (
    <footer className="border-t border-border bg-surface-alt">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <NewsletterSignup
          data={{
            heading: "הישארו מעודכנים",
            body: "עדכונים על תוכניות חדשות, מאמרים, ואירועי קהילה — ישר לתיבה.",
            consent_text: "בהרשמה אני מאשר/ת קבלת דיוור בהתאם למדיניות הפרטיות.",
            privacy_link: { label: "מדיניות פרטיות", href: "/privacy", open_in_new_tab: false },
          }}
        />

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {logo ? (
                <Image
                  src={mediaUrlFor(logo)}
                  alt={logo.alt_he}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              ) : null}
              <span className="font-display text-lg font-bold text-ink">{settings.site_name}</span>
            </div>
            {settings.tagline ? <p className="text-sm text-ink-muted">{settings.tagline}</p> : null}
            {Object.keys(settings.social_links).length > 0 || settings.community_url ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(settings.social_links).map(([platform, href]) => (
                  <a
                    key={platform}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-sm font-semibold text-ink-muted transition-colors hover:bg-primary hover:text-primary-fg"
                    aria-label={platform}
                  >
                    <SocialIcon platform={platform} icon={socialIcons[platform] ?? null} />
                  </a>
                ))}
                {settings.community_url ? (
                  <a
                    href={settings.community_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 items-center rounded-full bg-surface px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-primary hover:text-primary-fg"
                  >
                    קהילה
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-display text-sm font-bold text-ink">ניווט מהיר</h3>
            <ul className="flex flex-col gap-1.5">
              {quickNav.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink-muted transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {trainings.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-sm font-bold text-ink">הכשרות</h3>
              <ul className="flex flex-col gap-1.5">
                {trainings.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/hachsharot/${t.slug}`}
                      className="text-sm text-ink-muted transition-colors hover:text-primary"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="font-display text-sm font-bold text-ink">יצירת קשר</h3>
            <ul className="flex flex-col gap-1.5 text-sm text-ink-muted">
              {settings.contact_phone ? (
                <li>
                  <a href={`tel:${settings.contact_phone}`} className="transition-colors hover:text-primary">
                    {settings.contact_phone}
                  </a>
                </li>
              ) : null}
              {settings.contact_email ? (
                <li>
                  <a href={`mailto:${settings.contact_email}`} className="transition-colors hover:text-primary">
                    {settings.contact_email}
                  </a>
                </li>
              ) : null}
              {settings.contact_address ? <li>{settings.contact_address}</li> : null}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          {/* Linked only when a URL is set, so a site that just wants a
              copyright line is unaffected. rel="noreferrer" and the new tab
              match how every other outbound link here behaves. */}
          {settings.footer_credits ? (
            settings.footer_credits_url ? (
              <p>
                <a
                  href={settings.footer_credits_url}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  {settings.footer_credits}
                </a>
              </p>
            ) : (
              <p>{settings.footer_credits}</p>
            )
          ) : null}
          <ul className="flex gap-4">
            <li>
              <Link href="/accessibility-statement" className="transition-colors hover:text-primary">
                נגישות
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="transition-colors hover:text-primary">
                פרטיות
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
