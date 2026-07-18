"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

/**
 * Shared search + status-filter toolbar for the CRUD list screens (§8:
 * "CRUD lists: search, status filter..."). Drives the URL's `q`/`status`
 * search params so the list Server Component re-fetches via
 * `db.list*Admin({ q, status })` — filtering happens in the data source,
 * never client-side (§5.5 rule 4), this component only edits the URL.
 */
export function ListToolbar({
  statusOptions,
}: {
  statusOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <label htmlFor="admin-search" className="sr-only">
          חיפוש
        </label>
        <input
          id="admin-search"
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="חיפוש..."
          onChange={(e) => updateParam("q", e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
      {statusOptions ? (
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="סינון לפי סטטוס"
        >
          <option value="">כל הסטטוסים</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : null}
      {isPending ? <span className="text-xs text-ink-muted">מסנן...</span> : null}
    </div>
  );
}
