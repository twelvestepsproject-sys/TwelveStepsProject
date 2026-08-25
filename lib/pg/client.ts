import "server-only";
import pg, { Pool } from "pg";

/**
 * node-postgres parses timestamps into JS Date objects; PostgREST returned
 * ISO strings, and the schemas and components downstream expect strings
 * (`published_at.slice(0, 10)` and similar). Returning the raw text keeps
 * the two backends interchangeable instead of forcing conversions through
 * 74 DataSource methods.
 *
 * 1114 = timestamp without time zone, 1082 = date, 1184 = timestamptz.
 */
pg.types.setTypeParser(1114, (v) => v);
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => v);

/**
 * lib/pg/client.ts — the connection pool for self-hosted Postgres.
 *
 * A module-level singleton, unlike the Supabase client which had to be
 * request-scoped (it read cookies per request). Here the pool is shared and
 * long-lived, which is what `pg` is designed for; creating one per request
 * would exhaust connections under load.
 *
 * Next.js can re-evaluate modules during development, so the pool is
 * stashed on globalThis to avoid leaking a new pool on every hot reload.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!globalThis.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Self-hosted mode needs it — see .env.example.",
      );
    }
    globalThis.__pgPool = new Pool({
      connectionString,
      // The database is not exposed to the network (see docker-compose.yml),
      // so TLS is only expected when a deployment explicitly asks for it.
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
    });
  }
  return globalThis.__pgPool;
}

export async function query<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool();
  const res = await pool.query(text, params as never[]);
  return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
}
