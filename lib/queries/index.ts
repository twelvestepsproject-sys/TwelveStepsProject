import type { DataSource } from "./types";
import { mockDataSource } from "./mock";

/**
 * The seam (§5.5). Components import `{ db }` from here and nothing else
 * data-related — never a mock fixture, never a Supabase client directly.
 *
 * Phase 5 will add:
 *   import { supabaseDataSource } from "./supabase";
 *   export const db: DataSource =
 *     process.env.DATA_SOURCE === "supabase" ? supabaseDataSource : mockDataSource;
 *
 * `/lib/queries/supabase` does not exist yet (hard rule until Phase 5), so
 * for now `db` is always `mockDataSource`.
 */
export const db: DataSource = mockDataSource;
