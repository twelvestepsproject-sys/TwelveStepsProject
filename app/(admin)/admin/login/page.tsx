import { devLogin } from "./dev-actions";
import { loginWithPassword } from "./actions";

/**
 * PHASE 5 REPLACEMENT (§16 pre-flagged exception — see actions.ts's header
 * comment). Real email + password form calling Supabase Auth.
 *
 * Branches on DATA_SOURCE so the mock-mode dev role-picker (§16 Phase 4's
 * "auth stubbed with a dev role switcher") keeps working exactly as before
 * until the switch is actually flipped — this file is explicitly allowed
 * to change in Phase 5, but "the mock path still works" is a verification
 * requirement, and this page is the single entry point for both modes.
 * The dev-only branch's markup/copy is unchanged from the Phase 4 version;
 * it now lives behind `devLogin` in `./dev-actions.ts` (moved verbatim out
 * of `actions.ts`, which is now exclusively the real Supabase Auth action).
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  if (process.env.DATA_SOURCE !== "supabase") {
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

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="font-display text-lg font-bold text-ink">מכללת אשד — ניהול</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">כניסה למערכת הניהול</h1>
        <p className="mt-2 text-sm text-ink-muted">
          הזינו את כתובת הדוא&quot;ל והסיסמה שקיבלתם ממנהל/ת המערכת. אין הרשמה עצמית.
        </p>
        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error">
            אימייל או סיסמה שגויים. נסו שוב.
          </p>
        ) : null}
        <form action={loginWithPassword} className="mt-5 flex flex-col gap-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-ink">
              דוא&quot;ל
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-semibold text-ink">
              סיסמה
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-fg transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            כניסה
          </button>
        </form>
      </div>
    </div>
  );
}
