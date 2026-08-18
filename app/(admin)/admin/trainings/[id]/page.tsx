import { notFound } from "next/navigation";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { TrainingForm } from "../training-form";
import { TrainingBlocksEditor } from "../training-blocks-editor";
import type { Media } from "@/lib/schemas";

/** Same uuid-shaped-string walk the Pages editor uses to pre-resolve every
 * media row a block references, so thumbnails render without a client
 * fetch per block. */
function collectMediaIds(data: unknown, acc: Set<string>) {
  if (data == null) return;
  if (typeof data === "string") {
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

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [admin, lecturers, session, blocks] = await Promise.all([
    db.listTrainingsAdmin({ perPage: 500 }),
    db.listLecturers(),
    getDevSession(),
    db.getTrainingBlocksAdmin(id),
  ]);
  const training = admin.items.find((t) => t.id === id);
  if (!training) notFound();

  const canEdit = session?.role === "admin" || session?.role === "editor";
  const coverImage = training.cover_image_id ? await db.getMedia(training.cover_image_id) : null;

  const mediaIds = new Set<string>();
  blocks.forEach((b) => collectMediaIds(b.data, mediaIds));
  const mediaEntries = await Promise.all(
    Array.from(mediaIds).map(async (mid) => [mid, await db.getMedia(mid)] as const),
  );
  const mediaById: Record<string, Media> = {};
  for (const [mid, m] of mediaEntries) {
    if (m) mediaById[mid] = m;
  }

  const visibleLecturers = lecturers
    .filter((l) => l.is_visible)
    .map((l) => ({ id: l.id, name: l.name, role: l.role }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-ink">עריכת הכשרה</h1>
      <TrainingForm training={training} lecturers={lecturers} canEdit={canEdit} coverImage={coverImage} />
      <TrainingBlocksEditor
        trainingId={training.id}
        initialBlocks={blocks}
        canEdit={canEdit}
        mediaById={mediaById}
        lecturers={visibleLecturers}
      />
    </div>
  );
}
