import type { Metadata } from "next";
import { db } from "@/lib/queries";

/**
 * `/accessibility-statement` — Accessibility statement (§4
 * `/[accessibility-statement]`, §3). Per the task brief's judgment call:
 * unlike the privacy policy, this CAN reasonably carry real content now,
 * because it describes OUR OWN implementation (the self-built toolbar in
 * components/layout/accessibility-toolbar.tsx) rather than making a legal
 * claim on the client's behalf. The feature list below is verified against
 * that component's actual current behavior: font-size cycling (3 levels),
 * high-contrast toggle, grayscale toggle, and reset — "link highlight" is
 * explicitly NOT claimed here since accessibility-toolbar.tsx's own header
 * comment confirms it's deferred, not yet built; claiming it here would be
 * the same kind of dishonesty §3 warns against, just smaller-stakes.
 *
 * What IS flagged as still-provisional: the target conformance level
 * (IS 5568 / WCAG 2.1 AA per §3) is stated as a goal/target, not asserted
 * as an audited, verified fact — no accessibility audit has been run yet
 * (§16 Phase 7 is where axe + manual keyboard + screen-reader passes
 * happen), so this page doesn't claim compliance it can't yet back up.
 */
// BUG FIX: was a static `export const metadata` with the org name
// hardcoded.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.getSiteSettings();
  return {
    title: `הצהרת נגישות | ${settings.site_name}`,
    description: `הצהרת הנגישות של אתר ${settings.site_name} וכלי הנגישות המובנים בו.`,
  };
}

export default async function AccessibilityStatementPage() {
  const settings = await db.getSiteSettings();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">הצהרת נגישות</h1>

      <div className="mt-6 flex flex-col gap-6 text-ink">
        <p>
          {/* BUG FIX: org name was hardcoded in this body copy too. */}
          {settings.site_name} רואה חשיבות רבה בהנגשת האתר לכלל הציבור, כולל אנשים עם מוגבלויות. אנו
          שואפים לעמוד בהמלצות תקן ישראלי 5568 (IS 5568) ובהנחיות WCAG 2.1 ברמה AA. זהו יעד שאנו
          פועלים להשיג — האתר טרם עבר ביקורת נגישות מלאה ופורמלית, ועדכון בנושא יפורסם כאן לאחר
          שתתבצע.
        </p>

        <section>
          <h2 className="font-display text-xl font-bold text-ink">כלי הנגישות באתר</h2>
          <p className="mt-2 text-ink-muted">
            בתחתית המסך, מכפתור הנגישות הצף, ניתן להפעיל את הכלים הבאים:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-ink-muted">
            <li>הגדלת גודל הטקסט (שני מדרגות הגדלה, מעבר לגודל הרגיל)</li>
            <li>הפעלת ניגודיות גבוהה</li>
            <li>הצגת האתר בגווני אפור</li>
            <li>איפוס כל ההגדרות לברירת המחדל</li>
          </ul>
          <p className="mt-3 text-ink-muted">
            ההעדפות נשמרות במכשיר שלכם בלבד, ומיושמות מחדש בכל ביקור חוזר.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-ink">תמיכה כללית באתר</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-ink-muted">
            <li>ניווט מלא באמצעות המקלדת, עם מסגרת מיקוד (focus) ברורה לעין</li>
            <li>קישור &quot;דלג לתוכן&quot; בתחילת כל עמוד</li>
            <li>טקסט חלופי (alt) לכל תמונה בעלת משמעות</li>
            <li>מבנה סמנטי (כותרות, ציוני דרך) התומך בקוראי מסך</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-ink">פניות בנושא נגישות</h2>
          <p className="mt-2 text-ink-muted">
            נתקלתם בבעיית נגישות באתר? נשמח שתפנו אלינו דרך{" "}
            <a href="/tsor-kesher" className="text-primary underline-offset-2 hover:underline">
              עמוד יצירת הקשר
            </a>
            , ונטפל בפנייה בהקדם.
          </p>
        </section>
      </div>
    </main>
  );
}
