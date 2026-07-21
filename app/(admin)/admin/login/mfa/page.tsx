import { verifyMfaChallenge } from "./actions";
import { db } from "@/lib/queries";

/**
 * Phase 5 — TOTP MFA challenge screen. Reached only when the signed-in
 * user has a verified TOTP factor and the session is still at aal1 (see
 * ../actions.ts's `loginWithPassword`). Part of the pre-flagged
 * `/admin/login` exception (§16) — this is a sub-route of it, same
 * reasoning applies: real Supabase Auth's login mechanism, intentionally
 * new in Phase 5.
 */
export default async function MfaChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const dest = next && next.startsWith("/admin") ? next : "/admin";
  const settings = await db.getSiteSettings();

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-surface-alt p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="font-display text-lg font-bold text-ink">{settings.site_name} — ניהול</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">אימות דו-שלבי</h1>
        <p className="mt-2 text-sm text-ink-muted">
          הזינו את הקוד בן 6 הספרות מאפליקציית האימות שלכם.
        </p>
        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error">
            קוד שגוי. נסו שוב.
          </p>
        ) : null}
        <form action={verifyMfaChallenge} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="next" value={dest} />
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-semibold text-ink">
              קוד אימות
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-center text-lg tracking-widest text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-fg transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            אימות
          </button>
        </form>
      </div>
    </div>
  );
}
