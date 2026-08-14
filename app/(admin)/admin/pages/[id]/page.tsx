import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { PageEditor } from "../page-editor";
import type { Media } from "@/lib/schemas";

function collectMediaIds(data: unknown, acc: Set<string>) {
  if (data == null) return;
  if (typeof data === "string") {
    // Cheap heuristic: only strings that look like a uuid are treated as
    // potential media ids (every *_media_id / *_image_id field is a uuid
    // per lib/schemas/blocks.ts).
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) acc.add(data);
    return;
  }
  if (Array.isArray(data)) {
    data.forEach((v) => collectMediaIds(v, acc));
    return;
  }
  if (typeof data === "object") {
    Object.values(data as Record<string, unknown>).forEach((v) => collectMediaIds(v, acc));
  }
}

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Lecturers are fetched here (server) and passed down because the block
  // editor is a client component: the lecturers_grid form needs the full
  // visible roster to render its selection checkboxes.
  const [all, session, lecturers] = await Promise.all([
    db.listPages({ perPage: 500, includeDrafts: true }),
    getDevSession(),
    db.listLecturers({ visibleOnly: true }),
  ]);
  const page = all.items.find((p) => p.id === id);
  if (!page) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";

  const mediaIds = new Set<string>();
  page.blocks.forEach((b) => collectMediaIds(b.data, mediaIds));
  const mediaEntries = await Promise.all(
    Array.from(mediaIds).map(async (mid) => [mid, await db.getMedia(mid)] as const),
  );
  const mediaById: Record<string, Media> = {};
  for (const [mid, m] of mediaEntries) {
    if (m) mediaById[mid] = m;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת עמוד: {page.title}</h1>
      <PageEditor
        page={page}
        canEdit={canEdit}
        mediaById={mediaById}
        lecturers={lecturers.map((l) => ({ id: l.id, name: l.name, role: l.role }))}
      />
    </div>
  );
}
