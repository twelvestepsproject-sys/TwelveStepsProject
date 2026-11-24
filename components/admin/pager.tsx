import Link from "next/link";

/**
 * Page links for an admin list.
 *
 * Built because the posts list silently truncated: it fetched
 * `perPage: 200` and rendered whatever came back, so with 222 posts the
 * last 22 were unreachable — no link, no message, no sign they existed.
 * A list that hides rows is worse than one that pages, because nothing
 * tells the editor to look further.
 *
 * Plain links rather than buttons and client state: the page number
 * belongs in the URL. An editor can bookmark page 3, the back button
 * works, and a Server Component can read it from `searchParams` without
 * shipping any JavaScript for it.
 *
 * Every other query parameter is preserved, so paging does not silently
 * drop an active search or status filter.
 */
export function Pager({
  page,
  perPage,
  total,
  params,
}: {
  page: number;
  perPage: number;
  total: number;
  /** The current query parameters, minus `page`. */
  params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) sp.set(key, value);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `?${qs}` : "?";
  };

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <nav
      aria-label="דפדוף"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-ink-muted">
        {/* The count the editor actually needs: which rows are on screen
            out of how many exist. This is the number whose absence made
            the truncation invisible. */}
        מציג {first}–{last} מתוך {total}
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            rel="prev"
            className="rounded-md border border-border px-3 py-1.5 text-ink transition-colors hover:bg-surface-alt"
          >
            הקודם
          </Link>
        ) : (
          <span className="rounded-md border border-border px-3 py-1.5 text-ink-muted opacity-50">
            הקודם
          </span>
        )}

        <span className="px-2 text-ink-muted">
          עמוד {page} מתוך {pages}
        </span>

        {page < pages ? (
          <Link
            href={href(page + 1)}
            rel="next"
            className="rounded-md border border-border px-3 py-1.5 text-ink transition-colors hover:bg-surface-alt"
          >
            הבא
          </Link>
        ) : (
          <span className="rounded-md border border-border px-3 py-1.5 text-ink-muted opacity-50">
            הבא
          </span>
        )}
      </div>
    </nav>
  );
}
