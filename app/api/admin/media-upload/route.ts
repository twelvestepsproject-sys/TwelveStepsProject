import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/queries";
import { requireContentRole, AdminAuthError } from "@/lib/admin/role-check";
import { toFriendlyMessage } from "@/lib/admin/friendly-error";
import { sanitizeSvg } from "@/lib/admin/sanitize-svg";

/**
 * Media Library upload (§8: "drag-drop upload... mandatory Hebrew alt
 * text, license note field"). This is a MOCK-phase upload path per §5.5 —
 * there is no real Storage yet, so "upload" here writes the file straight
 * into `lib/mock/fixtures/images/` (the same directory the read-side
 * `/api/mock-media/[...path]` route streams from) and creates a real
 * `media` row via `db.saveMedia()`, rather than faking it with a
 * client-only blob URL that disappears on reload. Phase 6 replaces this
 * route with a real Supabase Storage upload; the `Media` row shape and
 * `mediaUrl()` resolution are already what Phase 6 needs, so nothing else
 * changes.
 *
 * SVG uploads are sanitized per §3.5 (strip <script>, event handlers,
 * external refs) before being written to disk — the only place in the app
 * that actually needs to run this at request time, since the DiceBear
 * avatar fixtures were sanitized once, by hand, before being committed.
 */
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — generous for a mock upload path
const ALLOWED_MIME = new Set(["image/svg+xml", "image/png", "image/jpeg", "image/webp"]);

function extFor(mime: string): string {
  switch (mime) {
    case "image/svg+xml":
      return "svg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
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
        { ok: false, error: "סוג קובץ לא נתמך. יש להעלות SVG, PNG, JPG או WebP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "הקובץ גדול מדי (מקסימום 8MB)." }, { status: 400 });
    }
    if (!width || !height) {
      return NextResponse.json(
        { ok: false, error: "לא ניתן היה לקרוא את מידות התמונה. נסו קובץ אחר." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = extFor(file.type);
    const base = safeBaseName(file.name);
    const fileName = `${base}-${Date.now().toString(36)}.${ext}`;

    const imagesRoot = path.join(process.cwd(), "lib", "mock", "fixtures", "images");
    const filePath = path.join(imagesRoot, fileName);
    if (!filePath.startsWith(imagesRoot)) {
      return NextResponse.json({ ok: false, error: "שם קובץ לא תקין." }, { status: 400 });
    }

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

    await fs.mkdir(imagesRoot, { recursive: true });
    await fs.writeFile(filePath, bytesToWrite);

    const media = await db.saveMedia({
      storage_path: `images/${fileName}`,
      alt_he: altHe,
      width,
      height,
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
