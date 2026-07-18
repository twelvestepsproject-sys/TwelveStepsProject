/**
 * Loading / empty / error state primitives for the admin, mirroring the
 * conventions already used on the public site (rules-that-apply-everywhere:
 * "Loading/empty/error states").
 */

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-alt/50 p-8 text-center text-sm text-ink-muted">
      {message}
    </div>
  );
}

export function AdminErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error">
      {message}
    </div>
  );
}

export function AdminLoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
      ))}
    </div>
  );
}
