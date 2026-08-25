import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { storageRoot } from "@/lib/storage/paths";

/**
 * Serves uploaded media from disk in self-hosted mode — the replacement
 * for Supabase Storage's public bucket URLs.
 *
 * `media.storage_path` values are unchanged from the Supabase era
 * ("uploads/<file>"), so this resolves them against STORAGE_DIR instead of
 * a bucket. Files live outside the repo (and outside /public) because
 * uploads must survive a redeploy and must not require a rebuild to appear.
 *
 * Public by design: the `media` bucket was public on Supabase too, and
 * these are images shown on the public site.
 */
export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  const root = storageRoot();
  // decodeURIComponent first: an encoded "%2e%2e" would otherwise slip past
  // a check on the raw segments and be decoded later by path.join.
  let filePath: string;
  try {
    filePath = path.resolve(root, ...segments.map((s) => decodeURIComponent(s)));
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  // path.resolve collapses "..", so comparing against the root afterwards
  // catches traversal regardless of how it was spelled. The separator guard
  // stops a sibling directory like "storage-backup" from matching.
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return new NextResponse("Not found", { status: 404 });

    const file = await fs.readFile(filePath);
    const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": mime,
        // Upload filenames carry a timestamp suffix, so a given path's
        // bytes never change — safe to cache hard and revalidate never.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(stat.size),
        // Uploaded SVGs are sanitized, but a stored file should still never
        // be sniffed into an executable type.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
