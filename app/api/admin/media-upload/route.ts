import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/queries";
import { requireContentRole, AdminAuthError } from "@/lib/admin/role-check";
import { toFriendlyMessage } from "@/lib/admin/friendly-error";
import { sanitizeSvg } from "@/lib/admin/sanitize-svg";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storageRoot } from "@/lib/storage/paths";

/**
 * Media Library upload (§8: "drag-drop upload... mandatory Hebrew alt
 * text, license note field").
 *
 * DATA_SOURCE=supabase: uploads to the public `media` Storage bucket via
 * the request-scoped, RLS-respecting client (supabase/migrations/
 * 00000000000013_storage.sql — editor+ write policy), never the
 * service-role client.
 *
 * DATA_SOURCE=postgres: writes into STORAGE_DIR (default ./storage/media)
 * under the same "uploads/<file>" prefix Supabase Storage used, so the
 * read side (lib/media.ts -> /api/media/[...path]) resolves migrated and
 * newly-uploaded files identically.
 *
 * DATA_SOURCE=mock: unchanged mock-phase path — writes the file straight
 * into `lib/mock/fixtures/images/` (the same directory the read-side
 * `/api/mock-media/[...path]` route streams from).
 *
 * Either way a real `media` row is created via `db.saveMedia()`.
 *
 * SVG uploads are sanitized per §3.5 (strip <script>, event handlers,
 * external refs) before being stored — the only place in the app
 * that actually needs to run this at request time, since the DiceBear
 * avatar fixtures were sanitized once, by hand, before being committed.
 */
export const runtime = "nodejs";

// PDFs are commonly larger than images (a syllabus with scans runs well
// past 8MB), so documents get their own, higher ceiling.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_DOC_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

/** Documents carry no pixel dimensions, which changes how they're
 * validated (no width/height required) and displayed (icon, not thumbnail). */
function isDocument(mime: string): boolean {
  return mime === "application/pdf";
}

function extFor(mime: string): string {
  switch (mime) {
    case "image/svg+xml":
      return "svg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "jpg";
  }
}

function safeBaseName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "");
  const cleaned = stem
    .normalize("NFKD")
    .replace(/[^\w\-א-ת]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return cleaned || "upload";
}

export async function POST(req: Request) {
  try {
    await requireContentRole();

    const formData = await req.formData();
    const file = formData.get("file");
    const altHe = String(formData.get("alt_he") ?? "").trim();
    const licenseNote = String(formData.get("license_note") ?? "").trim();
    const width = Number(formData.get("width") ?? 0);
    const height = Number(formData.get("height") ?? 0);

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "לא נבחר קובץ להעלאה." }, { status: 400 });
    }
    if (!altHe) {
      return NextResponse.json(
        { ok: false, error: "טקסט חלופי (alt) בעברית הוא שדה חובה." },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "סוג קובץ לא נתמך. יש להעלות PDF, SVG, PNG, JPG או WebP." },
        { status: 400 },
      );
    }

    const isDoc = isDocument(file.type);
    const maxBytes = isDoc ? MAX_DOC_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { ok: false, error: `הקובץ גדול מדי (מקסימום ${Math.round(maxBytes / 1024 / 1024)}MB).` },
        { status: 400 },
      );
    }

    // Documents have no pixel dimensions to read. `media.width`/`height`
    // are non-null positive integers in the schema (lib/schemas/common.ts),
    // so a document stores 1x1 as an explicit "not applicable" marker
    // rather than widening the column — every consumer that cares about
    // real dimensions checks `mime_type` first.
    if (!isDoc && (!width || !height)) {
      return NextResponse.json(
        { ok: false, error: "לא ניתן היה לקרוא את מידות התמונה. נסו קובץ אחר." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extFor(file.type);
    const base = safeBaseName(file.name);
    const fileName = `${base}-${Date.now().toString(36)}.${ext}`;

    let bytesToWrite: Buffer = buffer;
    let sanitizeNote: string | null = null;
    if (file.type === "image/svg+xml") {
      const text = buffer.toString("utf8");
      const result = sanitizeSvg(text);
      bytesToWrite = Buffer.from(result.html, "utf8");
      if (result.removedScript || result.removedEventHandlers || result.removedExternalRefs) {
        const removed = [
          result.removedScript && "script",
          result.removedEventHandlers && "מאזיני אירועים",
          result.removedExternalRefs && "הפניות חיצוניות",
        ]
          .filter(Boolean)
          .join(", ");
        sanitizeNote = `הקובץ נוקה מתוכן לא בטוח (${removed}) בעת ההעלאה.`;
      }
    }

    let storagePath: string;
    if (process.env.DATA_SOURCE === "postgres") {
      storagePath = `uploads/${fileName}`;
      const uploadsRoot = path.join(storageRoot(), "uploads");
      const filePath = path.join(uploadsRoot, fileName);
      // fileName is built from safeBaseName() + a timestamp, so it cannot
      // contain a separator — this asserts that rather than trusting it.
      if (!filePath.startsWith(uploadsRoot + path.sep)) {
        return NextResponse.json({ ok: false, error: "שם קובץ לא תקין." }, { status: 400 });
      }
      await fs.mkdir(uploadsRoot, { recursive: true });
      await fs.writeFile(filePath, bytesToWrite);
    } else if (process.env.DATA_SOURCE === "supabase") {
      storagePath = `uploads/${fileName}`;
      const supabase = await createSupabaseServerClient();
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(storagePath, bytesToWrite, { contentType: file.type, upsert: false });
      if (uploadError) {
        return NextResponse.json(
          { ok: false, error: "העלאת הקובץ לאחסון נכשלה. נסו שוב." },
          { status: 500 },
        );
      }
    } else {
      storagePath = `images/${fileName}`;
      const imagesRoot = path.join(process.cwd(), "lib", "mock", "fixtures", "images");
      const filePath = path.join(imagesRoot, fileName);
      if (!filePath.startsWith(imagesRoot)) {
        return NextResponse.json({ ok: false, error: "שם קובץ לא תקין." }, { status: 400 });
      }
      await fs.mkdir(imagesRoot, { recursive: true });
      await fs.writeFile(filePath, bytesToWrite);
    }

    const media = await db.saveMedia({
      storage_path: storagePath,
      alt_he: altHe,
      // 1x1 for documents — see the note above the dimension check.
      width: isDoc ? 1 : width,
      height: isDoc ? 1 : height,
      mime_type: file.type,
      size_bytes: bytesToWrite.byteLength,
      blurhash: null,
      license_note: licenseNote || null,
      uploaded_by: null,
    });

    return NextResponse.json({ ok: true, media, sanitizeNote });
  } catch (err) {
    const status = err instanceof AdminAuthError ? 403 : 500;
    return NextResponse.json({ ok: false, error: toFriendlyMessage(err) }, { status });
  }
}
