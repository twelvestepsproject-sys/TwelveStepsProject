import Link from "next/link";

/**
 * 404 (§4, §16 item 17) — per the task brief, "don't over-invest" here.
 * A minimal branded page rather than the bare Next.js default: uses the
 * design tokens (no hardcoded hex/brand), links back to the homepage and
 * search, in Hebrew RTL like the rest of the site. Scoped to
 * `app/(site)/not-found.tsx` so it inherits the public site layout
 * (header/footer/overlays) rather than rendering chrome-less.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="font-display text-2xl font-bold text-ink">העמוד לא נמצא</h1>
      <p className="text-ink-muted">
        ייתכן שהקישור שגוי, או שהעמוד הוסר. אפשר לחזור לעמוד הבית או לנסות לחפש.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-lg"
        >
          לעמוד הבית
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-border px-6 py-3 font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        >
          לחיפוש באתר
        </Link>
      </div>
    </main>
  );
}
