import "server-only";
import path from "node:path";

/**
 * Root directory for uploaded media in self-hosted mode.
 *
 * Configurable via STORAGE_DIR because on the Contabo server this should
 * point at a persistent volume outside the deployment directory — otherwise
 * a redeploy that replaces the app directory would take every upload with
 * it. Defaults to ./storage/media for local development, which is where
 * scripts/pg-import-storage.mjs put the files it pulled from Supabase.
 *
 * Always absolute and normalised, so callers can use it directly as the
 * boundary for path-traversal checks.
 */
export function storageRoot(): string {
  const configured = process.env.STORAGE_DIR;
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), "storage", "media");
}
