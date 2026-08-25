import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pgClient } from "@/lib/pg/query-builder";

/**
 * lib/queries/supabase/helpers.ts — shared helpers for the database
 * DataSource (§5.5 / Phase 5).
 *
 * Every one of the 74 methods in ./index.ts calls `getClient()`, which
 * makes this the single seam between the query code and the backend it
 * talks to. Pointing it at `pgClient` switches the whole data layer to
 * self-hosted Postgres without touching those methods — see
 * lib/pg/query-builder.ts for why that substitution is safe.
 *
 * DATA_SOURCE=postgres  -> self-hosted Postgres (lib/pg)
 * DATA_SOURCE=supabase  -> Supabase cloud, unchanged
 *
 * Keeping both live means the migration is reversible with one environment
 * variable, and Supabase stays available as a fallback until the new stack
 * is proven.
 */
export async function getClient(): Promise<SupabaseClient> {
  if (process.env.DATA_SOURCE === "postgres") {
    // Structurally compatible for every call this project makes; the cast
    // is the price of reusing the existing query code verbatim rather than
    // rewriting 1,571 lines.
    return pgClient as unknown as SupabaseClient;
  }
  return createSupabaseServerClient();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export interface PgError extends Error {
  code?: string;
}

export function throwIfError(error: { message: string; code?: string } | null, context: string): void {
  if (error) {
    const err = new Error(`[dataSource] ${context}: ${error.message}`) as PgError;
    err.code = error.code;
    throw err;
  }
}
