import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * lib/queries/supabase/helpers.ts — shared helpers for the Supabase
 * DataSource implementation (§5.5 / Phase 5).
 *
 * Every method in lib/queries/supabase/index.ts calls `getClient()` fresh
 * (never a module-level singleton) because the underlying `@supabase/ssr`
 * client is request-scoped (reads cookies() per request).
 */
export async function getClient(): Promise<SupabaseClient> {
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
    const err = new Error(`[supabaseDataSource] ${context}: ${error.message}`) as PgError;
    err.code = error.code;
    throw err;
  }
}
