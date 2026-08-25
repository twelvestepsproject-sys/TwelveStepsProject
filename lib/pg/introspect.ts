import "server-only";
import { query } from "./client";

/**
 * Column lookup used to resolve embed direction.
 *
 * Naming alone cannot distinguish the two cases this project uses:
 *   posts.category_id exists      -> "category:categories(*)" is belongs-to
 *   galleries.images_id does not  -> "images:gallery_images(*)" is has-many
 *
 * Guessing from the alias got this wrong, so direction is decided by asking
 * Postgres which columns exist. Cached per process — the schema does not
 * change while the app is running, and this would otherwise add a query to
 * every embedded select.
 */
const cache = new Map<string, Set<string>>();

export async function columnsOf(table: string): Promise<Set<string>> {
  const hit = cache.get(table);
  if (hit) return hit;

  const { rows } = await query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = $1`,
    [table],
  );
  const set = new Set(rows.map((r) => r.column_name));
  cache.set(table, set);
  return set;
}

export async function hasColumn(table: string, column: string): Promise<boolean> {
  return (await columnsOf(table)).has(column);
}
