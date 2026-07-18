/**
 * Small shared status chips reused across every admin list/edit screen.
 * Token colors only — no hex, no Tailwind arbitrary colors.
 */

export function PlaceholderBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
      תוכן דמה
    </span>
  );
}

export function VisibilityBadge({ visible }: { visible: boolean }) {
  return visible ? (
    <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
      גלוי
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold text-ink-muted">
      מוסתר
    </span>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
      פורסם
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-xs font-semibold text-ink-muted">
      טיוטה
    </span>
  );
}

export function ConsentBadge({ onFile }: { onFile: boolean }) {
  return onFile ? (
    <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
      אישור הסכמה קיים
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-error/10 px-2 py-0.5 text-xs font-semibold text-error">
      אין אישור הסכמה
    </span>
  );
}
