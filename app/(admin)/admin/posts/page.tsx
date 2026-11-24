import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { Pager } from "@/components/admin/pager";
import { PrimaryButton } from "@/components/admin/fields";
import { PostRowActions } from "./row-actions";

/**
 * The articles list.
 *
 * Paged, as of this change. It fetched `perPage: 200` and rendered
 * whatever came back, so once the site passed 200 articles the rest were
 * unreachable from the admin — no link to them, and no count to show
 * anything was missing. The client reported it as "200 of 222".
 *
 * NOTE: `listPosts` does not accept a `status` filter — only
 * `includeDrafts` — so this screen still filters by status in the Server
 * Component render rather than inside `db`, a flagged deviation from
 * §5.5 rule 4. Adding a `status` param to `listPosts` would ripple into
 * the public blog index's options type for no public-facing benefit.
 *
 * The consequence is worth stating plainly: a status filter applies to
 * the current page only, so "published" on page 1 shows the published
 * rows among the first fifty, not the first fifty published rows. The
 * filter is there to scan a page, and the search box is the tool for
 * finding one article. Making it exact means the data source gets a
 * status param, which is a bigger change than this item.
 */
const PER_PAGE = 50;

export default async function PostsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page } = await searchParams;
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">מאמרים</h1>
        {canEdit ? (
          <Link href="/admin/posts/new">
            <PrimaryButton type="button">מאמר חדש</PrimaryButton>
          </Link>
        ) : null}
      </div>
      <ListToolbar
        statusOptions={[
          { value: "draft", label: "טיוטה" },
          { value: "published", label: "פורסם" },
        ]}
      />
      <Suspense key={`${q ?? ""}-${status ?? ""}-${page ?? ""}`} fallback={<AdminLoadingRows />}>
        <PostsTable q={q} status={status} page={page} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function PostsTable({
  q,
  status,
  page,
  canEdit,
}: {
  q?: string;
  status?: string;
  page?: string;
  canEdit: boolean;
}) {
  // A page number out of range, or not a number at all, reads as page 1
  // rather than erroring: it arrives from the URL, where anything can be
  // typed.
  const parsed = Number.parseInt(page ?? "1", 10);
  const current = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  const result = await db.listPosts({
    q,
    includeDrafts: true,
    page: current,
    perPage: PER_PAGE,
  });

  // `status` now rides on PostSummary, so this no longer calls
  // getPostAdmin() once per row — that was 200 extra database round trips
  // to render one page of a list, on a query that had already selected
  // the column.
  const rows = status ? result.items.filter((p) => p.status === status) : result.items;

  if (result.items.length === 0) {
    return <AdminEmptyState message="אין מאמרים תואמים לחיפוש." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-start">
              <th className="px-3 py-2 text-start font-semibold text-ink">כותרת</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">קטגוריה</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">זמן קריאה</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/posts/${p.id}`}
                    className="font-semibold text-ink hover:underline"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-ink-muted">{p.category?.name ?? "—"}</td>
                <td className="px-3 py-2 text-ink-muted">{p.reading_time} דק&apos;</td>
                <td className="px-3 py-2">
                  <PostRowActions id={p.id} status={p.status} canEdit={canEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Says so explicitly when a status filter emptied the page, rather
          than showing an empty table under a pager that reports rows. */}
      {rows.length === 0 ? (
        <AdminEmptyState message="אין מאמרים בסטטוס הזה בעמוד הנוכחי. נסו עמוד אחר או חיפוש." />
      ) : null}

      <Pager
        page={current}
        perPage={PER_PAGE}
        total={result.total}
        params={{ q, status }}
      />
    </div>
  );
}
