import type { Metadata } from "next";

/**
 * `/privacy` — Privacy policy (§4 `/[privacy]`, §11, §15, §3). Per §3 /
 * §11 / the task brief: this is a legal document the CLIENT must supply,
 * drafted by their counsel — never fabricated or copied from another site.
 * `docs/content-needed.md` already flags this row as "missing" (not just
 * "placeholder", since a placeholder policy would be actively dangerous in
 * a mental-health context per §3's "invented social proof is a real harm"
 * principle, which extends to invented legal text).
 *
 * This page renders an honest, clearly-marked "not yet available" state —
 * no lorem-ipsum legal prose, no invented clauses. `noindex` since there's
 * nothing here worth search engines surfacing yet, and because the
 * newsletter/registration/contact forms already reference this URL for
 * their consent copy (§11), so the route must exist and resolve even
 * before real content lands.
 */
export const metadata: Metadata = {
  title: "מדיניות פרטיות | מכללת אשד",
  description: "מדיניות הפרטיות של מכללת אשד.",
  robots: { index: false, follow: false },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">מדיניות פרטיות</h1>
      <div
        role="status"
        className="mt-8 rounded-lg border border-border bg-surface-alt p-6 text-ink-muted"
      >
        <p className="font-semibold text-ink">מדיניות הפרטיות טרם פורסמה.</p>
        <p className="mt-3">
          עמוד זה מיועד למדיניות הפרטיות המלאה של מכללת אשד, כפי שתנוסח על ידי הגורם המשפטי של
          הארגון. מתוך אחריות לתוכן בהקשר של בריאות הנפש, איננו כותבים או ממציאים נוסח משפטי
          מטעם הארגון — הטקסט המלא יעודכן כאן לכשיתקבל.
        </p>
        <p className="mt-3">
          הפער מתועד ב-<code>docs/content-needed.md</code> כפריט חובה לפני עלייה לאוויר.
        </p>
      </div>
    </main>
  );
}
