import { devLogin } from "./actions";

/**
 * Dev-only role picker — the temporary stand-in for real Supabase Auth
 * login (§16 Phase 4). See lib/admin/dev-session.ts for why this is a role
 * picker rather than a fake password form: there is no real credential to
 * check yet, and pretending otherwise would be theater. This entire screen
 * disappears in Phase 5.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const roles: { value: "admin" | "editor" | "viewer"; label: string; desc: string }[] = [
    { value: "admin", label: "מנהל/ת מערכת", desc: "גישה מלאה — תוכן, מיתוג, הגדרות ומשתמשים." },
    { value: "editor", label: "עורך/ת תוכן", desc: "יצירה ועריכה של תוכן — ללא הגדרות מערכת." },
    { value: "viewer", label: "צופה", desc: "צפייה בלבד, ללא אפשרות עריכה." },
  ];

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="font-display text-lg font-bold text-ink">מכללת אשד — ניהול</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">כניסה (מצב פיתוח)</h1>
        <p className="mt-2 text-sm text-ink-muted">
          אימות אמיתי (Supabase Auth) ייכנס בשלב הבא. כרגע ניתן לבחור תפקיד לצורך פיתוח ובדיקה
          של ממשק הניהול.
        </p>
        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error">
            אירעה שגיאה, נסו שוב.
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-3">
          {roles.map((r) => (
            <form key={r.value} action={devLogin}>
              <input type="hidden" name="role" value={r.value} />
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <button
                type="submit"
                className="w-full rounded-md border border-border bg-bg px-4 py-3 text-start transition-colors hover:border-primary hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="block font-semibold text-ink">כניסה כ{r.label}</span>
                <span className="block text-xs text-ink-muted">{r.desc}</span>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
