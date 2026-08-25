import type { DataSource } from "./types";
import { mockDataSource } from "./mock";
import { supabaseDataSource } from "./supabase";

/**
 * The seam (§5.5). Components import `{ db }` from here and nothing else
 * data-related — never a mock fixture, never a Supabase client directly.
 *
 * Phase 5: the real conditional. This file is explicitly the ONE place
 * allowed to know about both implementations, per the original design.
 */
// "postgres" and "supabase" share one implementation — the difference is
// which client lib/queries/supabase/helpers.ts hands it, not the query code.
export const db: DataSource =
  process.env.DATA_SOURCE === "supabase" || process.env.DATA_SOURCE === "postgres"
    ? supabaseDataSource
    : mockDataSource;
