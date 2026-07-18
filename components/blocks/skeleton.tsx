/**
 * Shared skeleton primitive for block loading states (§16 Phase 3 /
 * task brief: "loading, empty, and error states included"). Token classes
 * only — no hex, no arbitrary Tailwind colors.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-alt ${className}`}
      aria-hidden="true"
    />
  );
}

/** Generic inline error state for a block whose `db` read rejected. Kept
 * quiet and non-blocking — one block failing must not take down the rest
 * of the homepage (each block is its own Suspense boundary). */
export function BlockError({ label }: { label: string }) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-2xl rounded-md border border-border bg-surface-alt p-4 text-sm text-ink-muted"
    >
      לא ניתן היה לטעון את הרכיב &quot;{label}&quot; כרגע.
    </div>
  );
}
