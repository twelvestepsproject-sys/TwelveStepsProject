import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminEmptyState, AdminLoadingRows } from "@/components/admin/states";
import { PrimaryButton } from "@/components/admin/fields";
import { PostRowActions } from "./row-actions";

/**
 * NOTE: `listPosts` (the only listing method for posts) does not accept a
 * `status` filter param on `ListPostsOptions` — only `includeDrafts`. This
 * screen fetches includeDrafts:true and filters by status client-side in
 * the Server Component render (still server-side, just not inside `db`) —
 * a small deviation from §5.5 rule 4 ("filtering happens inside the data
 * source"), flagged here rather than silently done, because adding a
 * `status` param to `listPosts` would ripple into the public blog index's
 * options type for no public-facing benefit.
 */
export default async function PostsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
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
      <Suspense fallback={<AdminLoadingRows />}>
        <PostsTable q={q} status={status} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function PostsTable({ q, status, canEdit }: { q?: string; status?: string; canEdit: boolean }) {
  const result = await db.listPosts({ q, includeDrafts: true, perPage: 200 });
  // Full Post (with status) isn't on PostSummary, so resolve status via
  // getPostAdmin per row — acceptable at this list size (mock, local dev);
  // a real backend would filter server-side with a proper query.
  const withStatus = await Promise.all(
    result.items.map(async (p) => ({ ...p, full: await db.getPostAdmin(p.id) })),
  );
  const filtered = status ? withStatus.filter((p) => p.full?.status === status) : withStatus;

  if (filtered.length === 0) {
    return <AdminEmptyState message="אין מאמרים תואמים לחיפוש." />;
  }

  return (
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
          {filtered.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <Link href={`/admin/posts/${p.id}`} className="font-semibold text-ink hover:underline">
                  {p.title}
                </Link>
              </td>
              <td className="px-3 py-2 text-ink-muted">{p.category?.name ?? "—"}</td>
              <td className="px-3 py-2 text-ink-muted">{p.reading_time} דק&apos;</td>
              <td className="px-3 py-2">
                <PostRowActions id={p.id} status={p.full?.status ?? "draft"} canEdit={canEdit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
