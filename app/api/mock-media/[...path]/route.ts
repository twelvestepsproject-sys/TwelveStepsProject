import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Mock-phase-only static file server for `/lib/mock/fixtures/images/`.
 *
 * `media.storage_path` (§6 `media` table) is documented in
 * `lib/schemas/common.ts` as "Storage-relative; in mock mode it's a path
 * under /lib/mock/fixtures/images". Next.js can only serve `/public`
 * statically, and copying/duplicating the fixture images into `/public`
 * would create two copies of the same asset to keep in sync — so this
 * tiny Route Handler streams the real fixture files directly from their
 * one true location instead.
 *
 * This is throwaway mock-phase plumbing: Phase 6 uploads these same files
 * to Supabase Storage and `storage_path` starts resolving to a real bucket
 * URL, at which point this route handler is deleted, not touched by any
 * component (components resolve URLs via `mediaUrl()` in
 * `lib/media.ts`, never this path directly).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  // Prevent path traversal outside the fixtures/images directory.
  const safeSegments = segments.filter((s) => s !== ".." && s !== ".");
  const imagesRoot = path.join(process.cwd(), "lib", "mock", "fixtures", "images");
  const filePath = path.join(imagesRoot, ...safeSegments);

  if (!filePath.startsWith(imagesRoot)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType =
      ext === ".svg"
        ? "image/svg+xml"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
              ? "image/webp"
              : "application/octet-stream";

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
