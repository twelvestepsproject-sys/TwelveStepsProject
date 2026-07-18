/**
 * Small status line rendered above/below an edit form, driven by
 * `useAutosave`'s return value. Shared so every edit screen shows the same
 * "unsaved changes" / "נשמר אוטומטית" affordance.
 */
export function AutosaveStatus({
  isDirty,
  isSaving,
  lastSavedAt,
  error,
}: {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  error: string | null;
}) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-error">
        שמירה אוטומטית נכשלה: {error}
      </p>
    );
  }
  if (isSaving) {
    return <p className="text-sm text-ink-muted">שומר אוטומטית...</p>;
  }
  if (isDirty) {
    return (
      <p className="text-sm text-warning" role="status">
        יש שינויים שלא נשמרו — שמירה אוטומטית תוך כ-10 שניות.
      </p>
    );
  }
  if (lastSavedAt) {
    return (
      <p className="text-sm text-ink-muted" role="status">
        נשמר אוטומטית ב-{lastSavedAt.toLocaleTimeString("he-IL")}
      </p>
    );
  }
  return null;
}
