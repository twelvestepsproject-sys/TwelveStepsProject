import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDevSession } from "@/lib/admin/dev-session";
import { RoleSwitcher } from "@/components/admin/role-switcher";
import { ADMIN_NAV } from "@/components/admin/nav-config";
import { db } from "@/lib/queries";

/**
 * Admin shell (§8: "Hebrew RTL, mobile-usable, built for a non-technical
 * user... it should look and feel like the same site's admin"). Reuses the
 * same tokens/fonts as the public site. Auth is the cookie-backed dev
 * session (lib/admin/dev-session.ts) — middleware.ts already redirects
 * unauthenticated visitors to /admin/login before this layout ever renders,
 * but this double-checks for defense in depth and to type-narrow `session`.
 *
 * BUG FIX: `app/(admin)/admin/login/page.tsx` is nested UNDER this layout
 * (Next.js layouts nest, a child layout/page can't "opt out" of a parent —
 * a sibling layout.tsx in login/ was tried first and did NOT work, since
 * it wraps rather than replaces this one). Without this early-exit, an
 * unauthenticated visit to /admin/login redirected to /admin/login forever:
 * middleware correctly exempts that path, but this layout did not, so it
 * fired its own redirect back to the same page on every request. Checking
 * the request path here (via `headers()`, since layouts don't receive the
 * pathname as a prop) and skipping the session requirement specifically
 * for /admin/login fixes it — that route must be reachable WITHOUT a
 * session, since it's where the session gets created.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? headerList.get("next-url") ?? "";
  const isLoginRoute = pathname.startsWith("/admin/login");

  const session = await getDevSession();
  if (!session && !isLoginRoute) {
    redirect("/admin/login");
  }

  if (!session) {
    // On /admin/login with no session: render children directly, no shell
    // chrome (nav/role-switcher need a session to make sense of).
    return <>{children}</>;
  }

  // An account still on an admin-issued temporary password is sent to
  // change it and cannot reach anything else. The temporary one exists only
  // to get in — it was chosen by someone else and passed over WhatsApp or
  // read aloud, so leaving it usable indefinitely defeats the point.
  //
  // The change-password route itself is exempt, or this would loop.
  const isAccountRoute = pathname.startsWith("/admin/account");
  if (!isAccountRoute && session.must_change_password) {
    redirect("/admin/account");
  }

  const visibleNav = ADMIN_NAV.filter((item) => item.minRole.includes(session.role));
  // BUG FIX: this used to be the literal string "מכללת אשד — ניהול" — same
  // class of bug as app/layout.tsx's static `metadata` export, just here
  // it's a hardcoded JSX string instead of a build-time-only export, but
  // the effect was identical: it could never reflect a real site_name
  // saved via /admin/branding. Reads db.getSiteSettings() same as the
  // public-site root layout does.
  const settings = await db.getSiteSettings();

  return (
    <div dir="rtl" className="min-h-screen bg-surface-alt md:flex">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
      >
        דילוג לתוכן הראשי
      </a>
      <aside className="shrink-0 border-b border-border bg-surface p-4 md:w-64 md:border-b-0 md:border-e">
        <Link href="/admin" className="font-display text-lg font-bold text-ink">
          {settings.site_name} — ניהול
        </Link>
        <div className="mt-3 rounded-md bg-surface-alt p-3">
          <p className="text-sm font-semibold text-ink">{session.full_name}</p>
          <p className="text-xs text-ink-muted">מצב פיתוח — אימות אמיתי בשלב הבא</p>
          <div className="mt-2">
            <RoleSwitcher current={session.role} />
          </div>
        </div>
        <nav className="mt-6 flex flex-col gap-1 text-sm" aria-label="ניווט ניהול">
          {visibleNav.map((item) => (
            item.deferred ? (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex items-center justify-between rounded-md px-3 py-2 text-ink-muted/50 pointer-events-none"
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] text-ink-muted">
                  בקרוב
                </span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-md px-3 py-2 text-ink transition-colors hover:bg-surface-alt"
              >
                <span>{item.label}</span>
              </Link>
            )
          ))}
        </nav>
      </aside>
      <main id="admin-main" className="min-w-0 flex-1 p-4 md:p-6">
        {session.role === "viewer" ? (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            מצב צפייה בלבד — אין הרשאה לערוך תוכן בתפקיד זה.
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
