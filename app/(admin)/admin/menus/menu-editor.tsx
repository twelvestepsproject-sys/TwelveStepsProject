"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMenuItemAction, deleteMenuItemAction, reorderMenuAction } from "./actions";
import { inputClass, PrimaryButton, SecondaryButton, DangerButton } from "@/components/admin/fields";
import type { MenuItem, MenuLocation } from "@/lib/schemas";

/**
 * §8 Menus: "drag-drop nested builder." Reordering is implemented with
 * up/down arrow buttons rather than pointer drag-and-drop, for the same
 * reason as the Pages block editor (no DnD library installed in this
 * repo; task brief explicitly allows arrow buttons as a fallback, and
 * they're fully keyboard-operable which a pointer-only DnD widget
 * wouldn't be without significant extra work — a real accessibility
 * upside given §3's WCAG AA bar). Nesting is one level deep in the UI
 * (matches the fixture data's real usage — header has "Add as child of"
 * for creating a submenu item, no deeper nesting control since the
 * fixtures never go past 2 levels and MenuItem's own children are
 * recursively typed but the admin UX here targets the common case).
 */

interface FlatRow {
  item: MenuItem;
  depth: number;
  parentId: string | null;
  siblings: MenuItem[];
}

function flatten(items: MenuItem[], depth = 0, parentId: string | null = null): FlatRow[] {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const rows: FlatRow[] = [];
  for (const item of sorted) {
    rows.push({ item, depth, parentId, siblings: sorted });
    rows.push(...flatten(item.children, depth + 1, item.id));
  }
  return rows;
}

function allItemsFlat(items: MenuItem[]): MenuItem[] {
  return items.flatMap((i) => [i, ...allItemsFlat(i.children)]);
}

export function MenuEditor({
  location,
  label,
  initialItems,
  canEdit,
}: {
  location: MenuLocation;
  label: string;
  initialItems: MenuItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  // No local mutation — every save/delete/reorder calls its Server Action
  // then `router.refresh()`, which re-fetches `initialItems` from the
  // server component above (same pattern as every other admin list screen
  // in this repo, e.g. row-actions.tsx files).
  const items = initialItems;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: "", href: "", open_in_new_tab: false });

  const rows = flatten(items);
  const allForParentSelect = allItemsFlat(items);

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setDraft({ label: item.label, href: item.href, open_in_new_tab: item.open_in_new_tab });
  }

  function startAdd(parentId: string | null) {
    setEditingId("__new__");
    setNewParentId(parentId);
    setDraft({ label: "", href: "", open_in_new_tab: false });
  }

  function cancelEdit() {
    setEditingId(null);
    setNewParentId(null);
  }

  function handleSave(existingId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await saveMenuItemAction(location, {
        id: existingId ?? undefined,
        label: draft.label,
        href: draft.href,
        open_in_new_tab: draft.open_in_new_tab,
        parent_id: existingId ? undefined : newParentId,
      });
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("להסיר את פריט התפריט הזה? פעולה זו תסיר גם תתי-פריטים.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteMenuItemAction(id);
      if (!result.ok) {
        setError(result.error ?? "מחיקה נכשלה.");
        return;
      }
      router.refresh();
    });
  }

  function moveWithinSiblings(row: FlatRow, direction: -1 | 1) {
    const idx = row.siblings.findIndex((s) => s.id === row.item.id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= row.siblings.length) return;
    const next = [...row.siblings];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    const orderedIds = next.map((s) => s.id);

    // Optimistic local reorder for the moved siblings' subtree, keyed by
    // top-level vs nested — since reorderMenuItems only renumbers by id
    // (works for both top-level and nested ids, per its findMenuItem-based
    // implementation), a single call covers both cases.
    setError(null);
    startTransition(async () => {
      const result = await reorderMenuAction(location, orderedIds);
      if (!result.ok) {
        setError(result.error ?? "שינוי הסדר נכשל.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">{label}</h2>
        {canEdit ? (
          <SecondaryButton type="button" onClick={() => startAdd(null)}>
            + פריט חדש
          </SecondaryButton>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      {rows.length === 0 && editingId !== "__new__" ? (
        <p className="text-sm text-ink-muted">אין עדיין פריטים בתפריט זה.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li
              key={row.item.id}
              style={{ paddingInlineStart: `${row.depth * 24}px` }}
              className="flex flex-col gap-2 rounded-md border border-border p-2"
            >
              {editingId === row.item.id ? (
                <EditRow
                  draft={draft}
                  setDraft={setDraft}
                  onSave={() => handleSave(row.item.id)}
                  onCancel={cancelEdit}
                  isPending={isPending}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-ink">{row.item.label}</span>
                    <span className="text-xs text-ink-muted" dir="ltr">
                      {row.item.href}
                      {row.item.open_in_new_tab ? " ↗" : ""}
                    </span>
                  </div>
                  {canEdit ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveWithinSiblings(row, -1)}
                        aria-label="הזזה למעלה"
                        className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWithinSiblings(row, 1)}
                        aria-label="הזזה למטה"
                        className="rounded p-1 text-ink-muted hover:bg-surface-alt"
                      >
                        ↓
                      </button>
                      {row.depth === 0 ? (
                        <SecondaryButton
                          type="button"
                          onClick={() => startAdd(row.item.id)}
                          className="px-2 py-1 text-xs"
                        >
                          + תת-פריט
                        </SecondaryButton>
                      ) : null}
                      <SecondaryButton
                        type="button"
                        onClick={() => startEdit(row.item)}
                        className="px-2 py-1 text-xs"
                      >
                        עריכה
                      </SecondaryButton>
                      <DangerButton
                        type="button"
                        onClick={() => handleDelete(row.item.id)}
                        className="px-2 py-1 text-xs"
                      >
                        מחיקה
                      </DangerButton>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editingId === "__new__" ? (
        <div className="rounded-md border border-dashed border-primary p-2">
          <p className="mb-2 text-xs text-ink-muted">
            {newParentId
              ? `תת-פריט של: ${allForParentSelect.find((i) => i.id === newParentId)?.label ?? ""}`
              : "פריט חדש ברמה העליונה"}
          </p>
          <EditRow
            draft={draft}
            setDraft={setDraft}
            onSave={() => handleSave(null)}
            onCancel={cancelEdit}
            isPending={isPending}
          />
        </div>
      ) : null}
    </div>
  );
}

function EditRow({
  draft,
  setDraft,
  onSave,
  onCancel,
  isPending,
}: {
  draft: { label: string; href: string; open_in_new_tab: boolean };
  setDraft: (d: { label: string; href: string; open_in_new_tab: boolean }) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-ink-muted">תווית</label>
        <input
          className={inputClass}
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-ink-muted">כתובת (href)</label>
        <input
          className={inputClass}
          dir="ltr"
          value={draft.href}
          onChange={(e) => setDraft({ ...draft, href: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-1 text-xs text-ink">
        <input
          type="checkbox"
          checked={draft.open_in_new_tab}
          onChange={(e) => setDraft({ ...draft, open_in_new_tab: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        כרטיסייה חדשה
      </label>
      <PrimaryButton type="button" onClick={onSave} disabled={isPending} className="px-3 py-1.5 text-xs">
        שמירה
      </PrimaryButton>
      <SecondaryButton type="button" onClick={onCancel} className="px-3 py-1.5 text-xs">
        ביטול
      </SecondaryButton>
    </div>
  );
}
