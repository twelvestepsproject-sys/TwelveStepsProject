"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, textareaClass, PrimaryButton } from "@/components/admin/fields";

/**
 * Standalone drag-drop upload area at the top of `/admin/media` (§8:
 * "drag-drop upload... mandatory Hebrew alt text, license note field").
 * Shares the same upload Route Handler as `<MediaPickerField>`'s upload
 * tab (`app/api/admin/media-upload/route.ts`) but is its own component
 * since this screen's upload UX (drag target, always visible, refreshes
 * the grid below on success) is a different shape than the picker's
 * modal-embedded upload tab.
 */
export function UploadCard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [altHe, setAltHe] = useState("");
  const [licenseNote, setLicenseNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function readImageDimensions(f: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      if (f.type === "image/svg+xml") {
        resolve({ width: 512, height: 512 });
        return;
      }
      const url = URL.createObjectURL(f);
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

  async function handleUpload() {
    setError(null);
    setNote(null);
    if (!file) {
      setError("יש לבחור או לגרור קובץ.");
      return;
    }
    if (!altHe.trim()) {
      setError("טקסט חלופי (alt) בעברית הוא שדה חובה.");
      return;
    }
    setIsUploading(true);
    try {
      const dims = await readImageDimensions(file);
      const fd = new FormData();
      fd.set("file", file);
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
      setFile(null);
      setAltHe("");
      setLicenseNote("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("העלאה נכשלה. נסו שוב.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) setFile(dropped);
      }}
      className={`flex flex-col gap-3 rounded-lg border-2 border-dashed p-4 transition-colors ${
        isDragOver ? "border-primary bg-primary/5" : "border-border bg-surface-alt/40"
      }`}
    >
      <p className="text-sm font-semibold text-ink">העלאת תמונה חדשה</p>
      <p className="text-xs text-ink-muted">גררו קובץ לכאן, או בחרו קובץ ידנית. SVG, PNG, JPG, WebP.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/svg+xml,image/png,image/jpeg,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-ink"
      />
      {file ? <p className="text-xs text-ink-muted">נבחר: {file.name}</p> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="upload-alt" className="text-xs font-semibold text-ink">
            טקסט חלופי (alt) בעברית *
          </label>
          <input
            id="upload-alt"
            className={inputClass}
            value={altHe}
            onChange={(e) => setAltHe(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="upload-license" className="text-xs font-semibold text-ink">
            הערת רישיון (אופציונלי)
          </label>
          <textarea
            id="upload-license"
            className={`${textareaClass} min-h-10`}
            value={licenseNote}
            onChange={(e) => setLicenseNote(e.target.value)}
          />
        </div>
      </div>
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
      <div>
        <PrimaryButton type="button" onClick={handleUpload} disabled={isUploading}>
          {isUploading ? "מעלה..." : "העלאה"}
        </PrimaryButton>
      </div>
    </div>
  );
}
