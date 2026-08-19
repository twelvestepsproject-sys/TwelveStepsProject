"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePageAction, createSharedBlockAction, updateSharedBlockAction } from "./actions";
import { useAutosave } from "@/components/admin/use-autosave";
import { AutosaveStatus } from "@/components/admin/autosave-status";
import { Field, inputClass, textareaClass, Checkbox, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { PlaceholderBadge } from "@/components/admin/badges";
import { BLOCK_TYPE_LABELS, ALL_BLOCK_TYPES, BLOCK_TYPES_WITH_CUSTOM_FORM, createNewBlock } from "@/lib/admin/block-registry";
import {
  HeroFields,
  LeaderMessageFields,
  TrainingsCarouselFields,
  AboutFields,
  FocusAreasFields,
  PullQuoteFields,
  TrainingDetailsFields,
  LecturersGridFields,
  RequirementsFields,
  FaqFields,
  ReadingListFields,
  LinkCardsFields,
  CertificatesFields,
  SyllabusDownloadFields,
  SemestersFields,
  ProgramStagesFields,
  TrainingIntroFields,
  TrainingBodyFields,
  TrainingSyllabusFields,
  TrainingInstructorsFields,
  TrainingRegistrationCtaFields,
  GenericJsonFields,
} from "./block-fields";
import type { BlockType, Media, Page, PageBlock } from "@/lib/schemas";

/**
 * The Pages block editor (§8): "add/remove/reorder (drag & drop) §5
 * blocks, per-block form generated from its zod schema, visibility
 * toggle, collapse/expand."
 *
 * Reordering: implemented with up/down arrow buttons rather than full
 * pointer-drag-and-drop. Task brief explicitly allows this fallback
 * ("a simple up/down-arrow reorder control is an acceptable fallback if
 * full drag-and-drop is too much scope") given no drag-and-drop library
 * is installed in this repo and this task's brief separately says "don't
 * introduce new dependencies without justification." Arrow buttons are
 * fully keyboard-accessible (a real accessibility upside over pointer-only
 * DnD, which matters for §3's WCAG AA bar) and get every page to a fully
 * reorderable state today; swapping in @dnd-kit later is a pure UI change
 * behind the same `moveBlock`/`sort_order` renumbering logic.
 *
 * `db.savePage()` takes the FULL page (whole `blocks[]` array) on every
 * call, not a partial patch — so this component holds the entire page as
 * one piece of state and autosave/manual-save always sends everything.
 */

interface FormState {
  slug: string;
  title: string;
  status: "draft" | "published";
  template: string;
  seo_title: string;
  seo_description: string;
  seo_canonical: string;
  seo_noindex: boolean;
  blocks: PageBlock[];
}

function toFormState(p?: Page | null): FormState {
  return {
    slug: p?.slug ?? "",
    title: p?.title ?? "",
    status: p?.status ?? "draft",
    template: p?.template ?? "",
    seo_title: p?.seo_title ?? "",
    seo_description: p?.seo_description ?? "",
    seo_canonical: p?.seo_canonical ?? "",
    seo_noindex: p?.seo_noindex ?? false,
    blocks: p?.blocks ? [...p.blocks].sort((a, b) => a.sort_order - b.sort_order) : [],
  };
}

function renumber(blocks: PageBlock[]): PageBlock[] {
  return blocks.map((b, i) => ({ ...b, sort_order: i + 1 }));
}

export function PageEditor({
  page,
  canEdit,
  mediaById,
  lecturers = [],
  sharedBlocks = [],
}: {
  page?: Page | null;
  canEdit: boolean;
  /** Pre-resolved Media rows for every media id referenced by this page's
   * blocks, keyed by id, so <MediaPickerField> can render a thumbnail
   * without an extra client fetch per block. */
  mediaById: Record<string, Media>;
  /** Visible lecturers, for the lecturers_grid block's selection UI —
   * fetched server-side since this is a client component. */
  lecturers?: { id: string; name: string; role: string }[];
  /** Shared blocks available to insert (migration 24). */
  sharedBlocks?: { id: string; name: string; block_type: string }[];
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(page));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addingType, setAddingType] = useState<BlockType>("hero");
  const [addingSharedId, setAddingSharedId] = useState("");

  const { isDirty, isSaving, lastSavedAt, error: autosaveError, markSaved } = useAutosave(
    state,
    async (data) => {
      if (!canEdit || !page?.id) return;
      const result = await savePageAction(page.id, toPayload(data));
      if (!result.ok) throw new Error(result.error);
    },
  );

  function toPayload(data: FormState) {
    return {
      slug: data.slug,
      title: data.title,
      status: data.status,
      published_at: data.status === "published" ? (page?.published_at ?? new Date().toISOString()) : null,
      template: data.template || null,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      seo_canonical: data.seo_canonical || null,
      seo_og_image_id: page?.seo_og_image_id ?? null,
      seo_noindex: data.seo_noindex,
      blocks: data.blocks,
    };
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function updateBlockData(blockId: string, data: Record<string, unknown>) {
    setState((s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === blockId ? ({ ...b, data } as PageBlock) : b)),
    }));
  }

  function toggleVisibility(blockId: string) {
    setState((s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, is_visible: !b.is_visible } : b)),
    }));
  }

  function removeBlock(blockId: string) {
    if (!confirm("להסיר את הבלוק הזה מהעמוד?")) return;
    setState((s) => ({ ...s, blocks: renumber(s.blocks.filter((b) => b.id !== blockId)) }));
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setState((s) => {
      const idx = s.blocks.findIndex((b) => b.id === blockId);
      const targetIdx = idx + direction;
      if (idx < 0 || targetIdx < 0 || targetIdx >= s.blocks.length) return s;
      const next = [...s.blocks];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return { ...s, blocks: renumber(next) };
    });
  }

  function addBlock() {
    setState((s) => ({
      ...s,
      blocks: [...s.blocks, createNewBlock(addingType, page?.id ?? "new", s.blocks.length + 1)],
    }));
  }

  /** Adds a REFERENCE row.  stays empty and  mirrors the
   * source so existing renderers need no special case; the server resolves
   * the content on read. */
  /**
   * Promotes an inline block into the shared library and converts this row
   * into a reference to it, so the content now lives in exactly one place.
   * Saves immediately rather than waiting for the page save: the shared
   * block must exist before any other page can point at it.
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
      setState((s) => ({
        ...s,
        blocks: s.blocks.map((b) =>
          b.id === block.id
            ? ({ ...b, shared_block_id: result.data!.id, data: {} } as unknown as PageBlock)
            : b,
        ),
      }));
      setNotice("הבלוק נשמר כבלוק משותף. יש לשמור את העמוד כדי לקבע את השינוי.");
      router.refresh();
    });
  }

  /**
   * Edits to a shared block write to the source, not to this page's row —
   * that is the whole point of sharing. Debouncing is unnecessary: the page
   * editor already autosaves, and this fires on an explicit field change.
   */
  function updateSharedBlockData(sharedId: string, data: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateSharedBlockAction(sharedId, data);
      if (!result.ok) setError(result.error ?? "עדכון הבלוק המשותף נכשל.");
    });
  }

  /** A block row is a shared reference when it carries a shared_block_id. */
  function sharedIdOf(b: PageBlock): string | null {
    return (b as { shared_block_id?: string | null }).shared_block_id ?? null;
  }

  function sharedNameOf(b: PageBlock): string {
    const id = sharedIdOf(b);
    return sharedBlocks.find((sb) => sb.id === id)?.name ?? "";
  }

  function addSharedBlock() {
    const shared = sharedBlocks.find((sb) => sb.id === addingSharedId);
    if (!shared) return;
    setState((s) => ({
      ...s,
      blocks: [
        ...s.blocks,
        {
          id: crypto.randomUUID(),
          page_id: page?.id ?? "new",
          shared_block_id: shared.id,
          block_type: shared.block_type,
          sort_order: s.blocks.length + 1,
          is_visible: true,
          data: {},
        } as unknown as PageBlock,
      ],
    }));
    setAddingSharedId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      if (!page?.id) {
        setError("יש לשמור את פרטי העמוד לפני עריכת בלוקים.");
        return;
      }
      const result = await savePageAction(page.id, toPayload(state));
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      markSaved();
      setNotice("נשמר בהצלחה.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <AutosaveStatus isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} error={autosaveError} />
        {page?.is_placeholder ? <PlaceholderBadge /> : null}
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <h2 className="font-display text-lg font-bold text-ink">פרטי העמוד</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="כותרת" htmlFor="p-title" required>
            <input
              id="p-title"
              className={inputClass}
              value={state.title}
              onChange={(e) => updateField("title", e.target.value)}
              required
            />
          </Field>
          <Field label="כתובת URL (slug)" htmlFor="p-slug" required>
            <input
              id="p-slug"
              className={inputClass}
              value={state.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              required
            />
          </Field>
          <Field label="סטטוס" htmlFor="p-status">
            <select
              id="p-status"
              className={inputClass}
              value={state.status}
              onChange={(e) => updateField("status", e.target.value as "draft" | "published")}
            >
              <option value="draft">טיוטה</option>
              <option value="published">פורסם</option>
            </select>
          </Field>
          <Field label="תבנית (template, אופציונלי)" htmlFor="p-template">
            <input
              id="p-template"
              className={inputClass}
              value={state.template}
              onChange={(e) => updateField("template", e.target.value)}
            />
          </Field>
        </div>

        <details className="rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">SEO</summary>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="כותרת SEO" htmlFor="p-seo-title">
              <input
                id="p-seo-title"
                className={inputClass}
                value={state.seo_title}
                onChange={(e) => updateField("seo_title", e.target.value)}
              />
            </Field>
            <Field label="תיאור SEO" htmlFor="p-seo-desc">
              <textarea
                id="p-seo-desc"
                className={`${textareaClass} min-h-16`}
                value={state.seo_description}
                onChange={(e) => updateField("seo_description", e.target.value)}
              />
            </Field>
            <Field label="כתובת קנונית" htmlFor="p-seo-canonical">
              <input
                id="p-seo-canonical"
                className={inputClass}
                value={state.seo_canonical}
                onChange={(e) => updateField("seo_canonical", e.target.value)}
              />
            </Field>
            <Checkbox
              id="p-seo-noindex"
              name="seo_noindex"
              label="noindex (הסתרה ממנועי חיפוש)"
              defaultChecked={state.seo_noindex}
            />
          </div>
        </details>
      </fieldset>

      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">בלוקים ({state.blocks.length})</h2>
          <div className="flex items-center gap-2">
            <select
              className={`${inputClass} w-56`}
              value={addingType}
              onChange={(e) => setAddingType(e.target.value as BlockType)}
              aria-label="סוג בלוק להוספה"
            >
              {ALL_BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BLOCK_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <SecondaryButton type="button" onClick={addBlock}>
              + הוספת בלוק
            </SecondaryButton>
          </div>
        </div>

        {/* Insert an existing shared block. Placement (order, visibility)
            belongs to this page; the content stays in the shared source, so
            editing it anywhere updates every page it appears on. */}
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

        {state.blocks.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-ink-muted">
            אין עדיין בלוקים בעמוד זה. הוסיפו בלוק ראשון למעלה.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {state.blocks.map((block, i) => {
              const isCollapsed = collapsed[block.id] ?? false;
              const hasCustomForm = BLOCK_TYPES_WITH_CUSTOM_FORM.includes(block.block_type);
              return (
                <li key={block.id} className="rounded-lg border border-border bg-surface">
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCollapsed((c) => ({ ...c, [block.id]: !isCollapsed }))}
                        aria-expanded={!isCollapsed}
                        className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                        aria-label={isCollapsed ? "הרחבה" : "כיווץ"}
                      >
                        {isCollapsed ? "▸" : "▾"}
                      </button>
                      <span className="font-semibold text-ink">{BLOCK_TYPE_LABELS[block.block_type]}</span>
                      {sharedIdOf(block) ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          משותף · {sharedNameOf(block)}
                        </span>
                      ) : null}
                      {!hasCustomForm && !sharedIdOf(block) ? (
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
                        disabled={i === state.blocks.length - 1}
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
                          if (sharedId) {
                            // Keep the form responsive locally, but persist to
                            // the shared source so every placement updates.
                            updateBlockData(block.id, data);
                            updateSharedBlockData(sharedId, data);
                          } else {
                            updateBlockData(block.id, data);
                          }
                        }}
                      />
                      {!sharedIdOf(block) && canEdit ? (
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
      </fieldset>

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
        <div className="flex gap-3">
          <PrimaryButton type="submit" disabled={isPending}>
            {isPending ? "שומר..." : "שמירה"}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => router.push("/admin/pages")}>
            ביטול
          </SecondaryButton>
        </div>
      ) : null}
    </form>
  );
}

/** Exported so the trainings block editor dispatches through the exact same
 * per-type forms, rather than keeping a second copy that could drift. */
export function BlockDataForm({
  block,
  mediaById,
  lecturers,
  onChange,
}: {
  block: PageBlock;
  mediaById: Record<string, Media>;
  lecturers: { id: string; name: string; role: string }[];
  onChange: (data: Record<string, unknown>) => void;
}) {
  const data = block.data as Record<string, unknown>;
  switch (block.block_type) {
    case "hero":
      return (
        <HeroFields
          data={data}
          onChange={onChange}
          media={data.background_media_id ? mediaById[data.background_media_id as string] : null}
        />
      );
    case "leader_message":
      return (
        <LeaderMessageFields
          data={data}
          onChange={onChange}
          media={data.portrait_media_id ? mediaById[data.portrait_media_id as string] : null}
        />
      );
    case "trainings_carousel":
      return <TrainingsCarouselFields data={data} onChange={onChange} />;
    case "about":
      return <AboutFields data={data} onChange={onChange} />;
    case "focus_areas":
      return <FocusAreasFields data={data} onChange={onChange} />;
    case "pull_quote":
      return <PullQuoteFields data={data} onChange={onChange} />;
    case "training_details":
      return <TrainingDetailsFields data={data} onChange={onChange} />;
    case "lecturers_grid":
      return <LecturersGridFields data={data} onChange={onChange} lecturers={lecturers} />;
    case "requirements":
      return <RequirementsFields data={data} onChange={onChange} />;
    case "faq":
      return <FaqFields data={data} onChange={onChange} />;
    case "reading_list":
      return <ReadingListFields data={data} onChange={onChange} mediaById={mediaById} />;
    case "link_cards":
      return <LinkCardsFields data={data} onChange={onChange} mediaById={mediaById} />;
    case "certificates":
      return <CertificatesFields data={data} onChange={onChange} mediaById={mediaById} />;
    case "syllabus_download":
      return <SyllabusDownloadFields data={data} onChange={onChange} mediaById={mediaById} />;
    case "semesters":
      return <SemestersFields data={data} onChange={onChange} />;
    case "program_stages":
      return <ProgramStagesFields data={data} onChange={onChange} />;
    case "training_intro":
      return <TrainingIntroFields data={data} onChange={onChange} />;
    case "training_body":
      return <TrainingBodyFields data={data} onChange={onChange} />;
    case "training_syllabus":
      return <TrainingSyllabusFields data={data} onChange={onChange} />;
    case "training_instructors":
      return <TrainingInstructorsFields data={data} onChange={onChange} />;
    case "training_registration_cta":
      return <TrainingRegistrationCtaFields data={data} onChange={onChange} />;
    default:
      return <GenericJsonFields data={data} onChange={onChange} />;
  }
}
