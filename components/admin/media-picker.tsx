"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { inputClass, textareaClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import type { Media } from "@/lib/schemas";

/**
 * Shared media picker, used by every admin form that references a
 * `media_id` (trainings' cover, lecturers'/testimonials' photo, branding's
 * logo/favicon/OG image, and the Pages block editor's image fields) —
 * replacing the old raw-text-input-for-media-id pattern (task brief: "THIS
 * is the main thing you're fixing this pass").
 *
 * Not a `<dialog>`/portal-based modal library — this repo has no modal
 * primitive yet (states.tsx/fields.tsx are the only shared UI, and neither
 * includes one), so this renders a simple fixed-position overlay with its
 * own focus handling, matching the rest of the admin's "plain, no new UI
 * library" convention (see fields.tsx's own header comment).
 *
 * Usage: <MediaPickerField label="תמונת רקע" value={id} onChange={setId} />
 */

interface MediaListResponse {
  items: Media[];
  total: number;
}

async function fetchMedia(q: string): Promise<Media[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("perPage", "60");
  const res = await fetch(`/api/admin/media-list?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data: MediaListResponse = await res.json();
  return data.items;
}

/** Documents (PDF) carry no pixel dimensions — the server stores 1x1 and
 * every consumer branches on `mime_type` rather than trusting the numbers. */
export function isDocumentMime(mime: string): boolean {
  return mime === "application/pdf";
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (isDocumentMime(file.type)) {
      // Never decoded as an image; the server substitutes its own value.
      resolve({ width: 1, height: 1 });
      return;
    }
    if (file.type === "image/svg+xml") {
      // SVGs don't reliably report natural size via <img> without a
      // viewBox; fall back to a reasonable square default (still stored
      // correctly — width/height are cosmetic for vector art) rather than
      // blocking the upload.
      resolve({ width: 512, height: 512 });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("לא ניתן לקרוא את התמונה."));
    };
    img.src = url;
  });
}

/** Best-effort client-side resize (nice-to-have per task brief — downscales
 * anything wider than 2000px to cap upload size; skipped for SVG, which
 * has no raster dimensions to resize). Uses a <canvas>, no new dependency. */
async function maybeResize(file: File, maxDim = 2000): Promise<File> {
  // A PDF has no raster to downscale, and running it through <canvas>
  // would corrupt it.
  if (isDocumentMime(file.type)) return file;
  if (file.type === "image/svg+xml") return file;
  const dims = await readImageDimensions(file);
  if (Math.max(dims.width, dims.height) <= maxDim) return file;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name, { type: file.type }));
        },
        file.type,
        0.88,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

function UploadPanel({ onUploaded }: { onUploaded: (media: Media) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [altHe, setAltHe] = useState("");
  const [licenseNote, setLicenseNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function handleUpload() {
    setError(null);
    setNote(null);
    if (!file) {
      setError("יש לבחור קובץ.");
      return;
    }
    if (!altHe.trim()) {
      setError("טקסט חלופי (alt) בעברית הוא שדה חובה.");
      return;
    }
    setIsUploading(true);
    try {
      const resized = await maybeResize(file);
      const dims = await readImageDimensions(resized);
      const fd = new FormData();
      fd.set("file", resized);
      fd.set("alt_he", altHe.trim());
      fd.set("license_note", licenseNote.trim());
      fd.set("width", String(dims.width));
      fd.set("height", String(dims.height));

      const res = await fetch("/api/admin/media-upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "העלאה נכשלה.");
        return;
      }
      if (data.sanitizeNote) setNote(data.sanitizeNote);
      onUploaded(data.media as Media);
      setFile(null);
      setAltHe("");
      setLicenseNote("");
    } catch {
      setError("העלאה נכשלה. נסו שוב.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-surface-alt/40 p-4">
      <label htmlFor="media-picker-file" className="text-sm font-semibold text-ink">
        קובץ (PDF, SVG, PNG, JPG, WebP)
      </label>
      <input
        id="media-picker-file"
        type="file"
        accept="application/pdf,image/svg+xml,image/png,image/jpeg,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-ink"
      />
      <label htmlFor="media-picker-alt" className="text-sm font-semibold text-ink">
        {/* For a document this is the accessible link text, not alt text —
            labelled accordingly so an editor writes something sensible. */}
        {file && isDocumentMime(file.type) ? "שם הקובץ לתצוגה" : "טקסט חלופי (alt) בעברית"}{" "}
        <span className="text-error">*</span>
      </label>
      <input
        id="media-picker-alt"
        className={inputClass}
        value={altHe}
        onChange={(e) => setAltHe(e.target.value)}
        placeholder={
          file && isDocumentMime(file.type)
            ? "לדוגמה: סילבוס שנה א׳"
            : "תיאור קצר של התמונה, לנגישות ול-SEO"
        }
      />
      <label htmlFor="media-picker-license" className="text-sm font-semibold text-ink">
        הערת רישיון (אופציונלי)
      </label>
      <textarea
        id="media-picker-license"
        className={`${textareaClass} min-h-16`}
        value={licenseNote}
        onChange={(e) => setLicenseNote(e.target.value)}
        placeholder="למשל: Unsplash License — שם הצלם/ת"
      />
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
      {note ? (
        <p role="status" className="text-sm text-warning">
          {note}
        </p>
      ) : null}
      <PrimaryButton type="button" onClick={handleUpload} disabled={isUploading}>
        {isUploading ? "מעלה..." : "העלאה ובחירה"}
      </PrimaryButton>
    </div>
  );
}

function MediaPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (media: Media) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Media[]>([]);
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const dialogRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (query: string) => {
    setIsLoading(true);
    const results = await fetchMedia(query);
    setItems(results);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Runs on mount too (q starts as ""), so a separate mount-only effect
    // isn't needed — one effect covers both "load on open" and "reload as
    // the admin types," debounced.
    const id = setTimeout(() => void load(q), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="בחירת מדיה"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-lg bg-surface p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">בחירת תמונה</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full px-2 py-1 text-ink-muted hover:bg-surface-alt"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("library")}
            className={`px-3 py-2 text-sm font-semibold ${tab === "library" ? "border-b-2 border-primary text-ink" : "text-ink-muted"}`}
          >
            ספריית מדיה
          </button>
          <button
            type="button"
            onClick={() => setTab("upload")}
            className={`px-3 py-2 text-sm font-semibold ${tab === "upload" ? "border-b-2 border-primary text-ink" : "text-ink-muted"}`}
          >
            העלאת קובץ חדש
          </button>
        </div>

        {tab === "upload" ? (
          <UploadPanel
            onUploaded={(media) => {
              onSelect(media);
              onClose();
            }}
          />
        ) : (
          <>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חיפוש לפי alt או שם קובץ..."
              className={inputClass}
              aria-label="חיפוש מדיה"
            />
            <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
              {isLoading ? (
                <p className="col-span-full text-sm text-ink-muted">טוען...</p>
              ) : items.length === 0 ? (
                <p className="col-span-full text-sm text-ink-muted">לא נמצאו תוצאות.</p>
              ) : (
                items.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelect(m);
                      onClose();
                    }}
                    className="flex flex-col gap-1 rounded-md border border-border p-2 text-start hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {isDocumentMime(m.mime_type) ? (
                      // A PDF has no renderable thumbnail — an <img> here
                      // would show a broken-image icon.
                      <span
                        className="flex h-24 w-full items-center justify-center rounded-sm bg-surface-alt text-3xl"
                        aria-hidden="true"
                      >
                        📄
                      </span>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element -- admin picker thumbnail, mock-media route, next/image config not worth it for a fixed 96px admin thumbnail */
                      <img
                        src={mediaUrl(m.storage_path)}
                        alt={m.alt_he}
                        className="h-24 w-full rounded-sm object-cover"
                      />
                    )}
                    <span className="line-clamp-2 text-xs text-ink-muted">{m.alt_he}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function MediaPickerField({
  label,
  hint,
  value,
  media,
  onChange,
}: {
  label: string;
  hint?: string;
  /** Currently-selected media id, or null/empty for "none". */
  value: string | null;
  /** The resolved Media row for `value`, if already known (avoids a fetch
   * just to render the current thumbnail — pass it from the server
   * component that already loaded the record via `db.getMedia()`). */
  media?: Media | null;
  onChange: (mediaId: string | null, media: Media | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Media | null>(media ?? null);
  // Reset local selection when the caller passes a different `value`
  // (e.g. switching which record is being edited) without a
  // setState-in-effect: derive during render per React's documented
  // "adjusting state when a prop changes" pattern, tracking the last seen
  // `value` in a ref-free way via a plain render-time comparison.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setCurrent(media ?? null);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-3">
        {current && isDocumentMime(current.mime_type) ? (
          <span
            className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-surface-alt text-2xl"
            aria-hidden="true"
          >
            📄
          </span>
        ) : current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(current.storage_path)}
            alt={current.alt_he}
            className="h-16 w-16 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-border text-xs text-ink-muted">
            ללא
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => setOpen(true)}>
              {current ? "החלפה" : "בחירה / העלאה"}
            </SecondaryButton>
            {current ? (
              <SecondaryButton
                type="button"
                onClick={() => {
                  setCurrent(null);
                  onChange(null, null);
                }}
              >
                הסרה
              </SecondaryButton>
            ) : null}
          </div>
          {current ? <p className="text-xs text-ink-muted">{current.alt_he}</p> : null}
        </div>
      </div>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
      {open ? (
        <MediaPickerModal
          onSelect={(m) => {
            setCurrent(m);
            onChange(m.id, m);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
