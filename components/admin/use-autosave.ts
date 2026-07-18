"use client";

import { useEffect, useRef, useState } from "react";

/**
 * §8: "Autosave drafts every ~10s; warn on navigate-away with unsaved
 * changes." Shared hook so every edit form gets this once, not duplicated
 * per screen (per task brief: "a shared hook/component is the right
 * approach").
 *
 * Usage: call with the current form data (any serializable snapshot) and a
 * `save` function. The hook:
 *  - tracks dirty state by comparing the latest snapshot to the last-saved
 *    one (structural JSON compare — good enough for plain form objects),
 *  - autosaves on a ~10s interval while dirty,
 *  - registers a `beforeunload` handler while dirty,
 *  - exposes `isDirty` / `isSaving` / `lastSavedAt` / `saveNow` so the form
 *    can also show its own "unsaved changes" banner and a manual save
 *    button, and can warn on in-app navigation (Next.js App Router has no
 *    built-in route-change-block hook for this yet, so `beforeunload`
 *    covers the tab-close/refresh case, and `isDirty` is exposed for the
 *    form to render its own in-app "you have unsaved changes" notice next
 *    to any navigation link it renders).
 *
 * Refs are used ONLY inside effects/callbacks (never read/written during
 * render) — `isDirty` is tracked as real state, updated from an effect that
 * re-runs whenever `data` changes, so this hook stays lint-clean under
 * react-hooks/refs (no ref access during the render body).
 */
export function useAutosave<T>(data: T, save: (data: T) => Promise<void>, intervalMs = 10_000) {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastSavedSnapshot = useRef<string>(JSON.stringify(data));
  const latestData = useRef(data);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    latestData.current = data;
    setIsDirty(JSON.stringify(data) !== lastSavedSnapshot.current);
  }, [data]);

  async function saveNow() {
    if (JSON.stringify(latestData.current) === lastSavedSnapshot.current) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveRef.current(latestData.current);
      lastSavedSnapshot.current = JSON.stringify(latestData.current);
      setIsDirty(false);
      setLastSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה אוטומטית נכשלה.");
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    const id = setInterval(() => {
      if (JSON.stringify(latestData.current) !== lastSavedSnapshot.current) {
        void saveNow();
      }
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (JSON.stringify(latestData.current) !== lastSavedSnapshot.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /** Call after a successful MANUAL/explicit save (e.g. the form's own
   * submit handler) so autosave doesn't immediately re-fire redundantly. */
  function markSaved(savedData?: T) {
    lastSavedSnapshot.current = JSON.stringify(savedData ?? latestData.current);
    setIsDirty(false);
    setLastSavedAt(new Date());
  }

  return { isDirty, isSaving, lastSavedAt, error, saveNow, markSaved };
}
