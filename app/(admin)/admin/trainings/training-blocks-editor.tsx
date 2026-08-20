"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTrainingBlocksAction } from "./actions";
import {
  createSharedBlockAction,
  updateSharedBlockAction,
} from "../pages/actions";
import { inputClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { BLOCK_TYPE_LABELS, BLOCK_TYPES_WITH_CUSTOM_FORM, createNewBlock } from "@/lib/admin/block-registry";
import { BlockDataForm } from "../pages/page-editor";
import type { BlockType, Media, PageBlock } from "@/lib/schemas";

/**
 * Block editor for a training page (migration 20). Mirrors the Pages block
 * editor's interaction model — add / reorder / hide / remove, one form per
 * block type — but is a separate component because it saves through
 * `saveTrainingBlocksAction` (page_blocks keyed by `training_id`) and
 * offers a different set of block types.
 *
 * The per-block forms come from the Pages editor's `BlockDataForm`, so
 * there is one implementation of every block's fields.
 */

/** Block types that make no sense on a training page. `header`/`footer`
 * render nothing outside the site layout, and the training_* sections are
 * offered separately below. */
const PAGE_ONLY_TYPES: BlockType[] = ["header", "footer", "global_overlays"];

const TRAINING_SECTION_TYPES: BlockType[] = [
  "training_intro",
  "training_body",
  "training_syllabus",
  "training_instructors",
  "training_registration_cta",
];

const CONTENT_TYPES = (Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).filter(
  (t) => !PAGE_ONLY_TYPES.includes(t) && !TRAINING_SECTION_TYPES.includes(t),
);

export function TrainingBlocksEditor({
  trainingId,
  initialBlocks,
  canEdit,
  mediaById,
  lecturers,
  sharedBlocks = [],
}: {
  trainingId: string;
  initialBlocks: PageBlock[];
  canEdit: boolean;
  mediaById: Record<string, Media>;
  lecturers: { id: string; name: string; role: string }[];
  sharedBlocks?: { id: string; name: string; block_type: string }[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks);
  const [addingType, setAddingType] = useState<BlockType>("training_intro");
  const [addingSharedId, setAddingSharedId] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function addBlock() {
    setBlocks((b) => [...b, createNewBlock(addingType, trainingId, b.length + 1)]);
    setNotice(null);
  }

  /** A block row is a shared reference when it carries a shared_block_id. */
  function sharedIdOf(b: PageBlock): string | null {
    return (b as { shared_block_id?: string | null }).shared_block_id ?? null;
  }

  function sharedNameOf(b: PageBlock): string {
    const id = sharedIdOf(b);
    return sharedBlocks.find((sb) => sb.id === id)?.name ?? "";
  }

  /**
   * Promotes an inline block into the shared library and turns this row into
   * a reference. Mirrors the pages editor: this was missing here, which is
   * why a block could be shared from a page but not from a training.
   */
  function shareBlock(block: PageBlock) {
    const name = prompt("שם לבלוק המשותף (כך הוא יופיע ברשימת הבחירה):", "");
    if (!name?.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createSharedBlockAction(name, block.block_type, block.data);
      if (!result.ok || !result.data) {
        setError(result.error ?? "יצירת הבלוק המשותף נכשלה.");
        return;
      }
      setBlocks((b) =>
        b.map((x) =>
          x.id === block.id
            ? ({ ...x, shared_block_id: result.data!.id, data: {} } as unknown as PageBlock)
            : x,
        ),
      );
      setNotice("הבלוק נשמר כבלוק משותף. יש ללחוץ ״שמירת מבנה העמוד״ כדי לקבע את השינוי.");
      router.refresh();
    });
  }

  /** Edits to a shared block write to the source, so every placement updates. */
  function updateSharedBlockData(sharedId: string, data: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateSharedBlockAction(sharedId, data);
      if (!result.ok) setError(result.error ?? "עדכון הבלוק המשותף נכשל.");
    });
  }

  /** Reference row: content resolves from the shared source on read. */
  function addSharedBlock() {
    const shared = sharedBlocks.find((sb) => sb.id === addingSharedId);
    if (!shared) return;
    setBlocks((b) => [
      ...b,
      {
        id: crypto.randomUUID(),
        training_id: trainingId,
        page_id: null,
        shared_block_id: shared.id,
        block_type: shared.block_type,
        sort_order: b.length + 1,
        is_visible: true,
        data: {},
      } as unknown as PageBlock,
    ]);
    setAddingSharedId("");
  }

  function removeBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id));
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setBlocks((b) => {
      const i = b.findIndex((x) => x.id === id);
      const target = i + direction;
      if (i < 0 || target < 0 || target >= b.length) return b;
      const next = [...b];
      [next[i], next[target]] = [next[target], next[i]];
      return next;
    });
  }

  function toggleVisibility(id: string) {
    setBlocks((b) => b.map((x) => (x.id === id ? { ...x, is_visible: !x.is_visible } : x)));
  }

  function updateBlockData(id: string, data: Record<string, unknown>) {
    setBlocks((b) => b.map((x) => (x.id === id ? ({ ...x, data } as PageBlock) : x)));
  }

  function handleSave() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await saveTrainingBlocksAction(trainingId, blocks);
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      setNotice("מבנה העמוד נשמר.");
      router.refresh();
    });
  }

  return (
    <fieldset disabled={!canEdit} className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">מבנה העמוד ({blocks.length})</h2>
          <p className="mt-1 text-xs text-ink-muted">
            שולט בסדר ובתצוגה בלבד. התוכן עצמו (כותרת, מחיר, סילבוס, מרצים) נערך בטופס ההכשרה שמעל.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className={`${inputClass} w-64`}
            value={addingType}
            onChange={(e) => setAddingType(e.target.value as BlockType)}
            aria-label="סוג בלוק להוספה"
          >
            <optgroup label="חלקי ההכשרה">
              {TRAINING_SECTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BLOCK_TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
            <optgroup label="בלוקי תוכן">
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BLOCK_TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
          </select>
          <SecondaryButton type="button" onClick={addBlock}>
            + הוספת בלוק
          </SecondaryButton>
        </div>
      </div>

      {sharedBlocks.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-surface-alt/40 p-3">
          <span className="text-xs font-semibold text-ink-muted">או הוספת בלוק משותף קיים:</span>
          <select
            className={`${inputClass} w-64`}
            value={addingSharedId}
            onChange={(e) => setAddingSharedId(e.target.value)}
            aria-label="בלוק משותף להוספה"
          >
            <option value="">— בחרו בלוק —</option>
            {sharedBlocks.map((sb) => (
              <option key={sb.id} value={sb.id}>
                {sb.name} ({BLOCK_TYPE_LABELS[sb.block_type as BlockType]})
              </option>
            ))}
          </select>
          <SecondaryButton type="button" onClick={addSharedBlock}>
            + הוספה לעמוד
          </SecondaryButton>
        </div>
      ) : null}

      {blocks.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-ink-muted">
          אין בלוקים מוגדרים — העמוד מוצג במבנה ברירת המחדל (כותרת ופרטים, תוכן, סילבוס, מרצים,
          כפתור הרשמה). הוספת בלוק ראשון תיקח שליטה מלאה על הסדר.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {blocks.map((block, i) => {
            const isCollapsed = collapsed[block.id] ?? false;
            const isSection = TRAINING_SECTION_TYPES.includes(block.block_type);
            const hasCustomForm = BLOCK_TYPES_WITH_CUSTOM_FORM.includes(block.block_type);
            return (
              <li key={block.id} className="rounded-lg border border-border bg-surface">
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [block.id]: !isCollapsed }))}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? "הרחבה" : "כיווץ"}
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                    >
                      {isCollapsed ? "▸" : "▾"}
                    </button>
                    <span className="font-semibold text-ink">
                      {BLOCK_TYPE_LABELS[block.block_type]}
                    </span>
                    {(block as { shared_block_id?: string | null }).shared_block_id ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        משותף · {sharedNameOf(block)}
                      </span>
                    ) : null}
                    {isSection ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        תוכן מטופס ההכשרה
                      </span>
                    ) : null}
                    {!isSection && !hasCustomForm ? (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-ink-muted">
                        JSON גולמי
                      </span>
                    ) : null}
                    {!block.is_visible ? (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-ink-muted">
                        מוסתר
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, -1)}
                      disabled={i === 0}
                      aria-label="הזזה למעלה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, 1)}
                      disabled={i === blocks.length - 1}
                      aria-label="הזזה למטה"
                      className="rounded p-1 text-ink-muted hover:bg-surface-alt disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <label className="mx-2 flex items-center gap-1 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={block.is_visible}
                        onChange={() => toggleVisibility(block.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      גלוי
                    </label>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      aria-label="הסרת בלוק"
                      className="rounded p-1 text-error hover:bg-error/10"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {!isCollapsed ? (
                  <div className="border-t border-border p-4">
                    {sharedIdOf(block) ? (
                      <p className="mb-3 rounded bg-primary/5 px-2 py-1.5 text-xs text-ink-muted">
                        זהו בלוק משותף. עריכה כאן תעדכן אותו בכל העמודים שבהם הוא מופיע.
                      </p>
                    ) : null}
                    <BlockDataForm
                      block={block}
                      mediaById={mediaById}
                      lecturers={lecturers}
                      onChange={(data) => {
                        const sharedId = sharedIdOf(block);
                        updateBlockData(block.id, data);
                        if (sharedId) updateSharedBlockData(sharedId, data);
                      }}
                    />
                    {!sharedIdOf(block) && !isSection && canEdit ? (
                      <button
                        type="button"
                        onClick={() => shareBlock(block)}
                        className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary hover:text-primary"
                      >
                        ♻ שמירה כבלוק משותף (לשימוש בעמודים נוספים)
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          {notice}
        </p>
      ) : null}

      {canEdit ? (
        <PrimaryButton type="button" onClick={handleSave} disabled={isPending} className="self-start">
          {isPending ? "שומר..." : "שמירת מבנה העמוד"}
        </PrimaryButton>
      ) : null}
    </fieldset>
  );
}
