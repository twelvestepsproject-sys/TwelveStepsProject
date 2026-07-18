import { randomUUID } from "node:crypto";

/**
 * Shared helpers for the mock DataSource implementation (§5.5 rules).
 */

/** ~80–250ms default, configurable via MOCK_LATENCY_MS. Every method in
 * mockDataSource awaits this so loading states / Suspense boundaries are
 * exercised honestly in dev, per §5.5 rule 3. */
export function delay(ms?: number): Promise<void> {
  const configured = ms ?? Number(process.env.MOCK_LATENCY_MS ?? 150);
  const clamped = Number.isFinite(configured) ? Math.max(0, configured) : 150;
  if (clamped === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, clamped));
}

/** MOCK_ERROR_RATE (default 0): each method has this probability of
 * rejecting, so error boundaries can be exercised (§5.5 rule 7). Call
 * AFTER `delay()` so a simulated failure still pays realistic latency. */
export function maybeFail(methodName: string): void {
  const rate = Number(process.env.MOCK_ERROR_RATE ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) return;
  if (Math.random() < rate) {
    throw new Error(
      `[mock] simulated failure in ${methodName} (MOCK_ERROR_RATE=${rate})`,
    );
  }
}

/** Every write needs a fresh id when the caller doesn't supply one
 * (creates vs. updates). */
export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Case-insensitive substring match across one or more haystack fields —
 * approximates Postgres FTS closely enough for the mock (§5.5: search
 * happens INSIDE the data source, never left to the caller). */
export function matchesQuery(q: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}

export function paginate<T>(items: T[], page = 1, perPage = 10) {
  const safePage = Math.max(1, page);
  const safePerPage = Math.max(1, perPage);
  const start = (safePage - 1) * safePerPage;
  return {
    items: items.slice(start, start + safePerPage),
    total: items.length,
    page: safePage,
    perPage: safePerPage,
  };
}
