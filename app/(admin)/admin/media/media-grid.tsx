"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mediaUrl } from "@/lib/media";
import { isDocumentMime } from "@/components/admin/media-picker";
import { updateMediaAction, deleteMediaAction, getMediaUsageAction } from "./actions";
import { inputClass, textareaClass, PrimaryButton, SecondaryButton, DangerButton } from "@/components/admin/fields";
import type { Media } from "@/lib/schemas";
import type { MediaUsageRef } from "@/lib/admin/media-usage";

export function MediaGrid({ items, canEdit }: { items: Media[]; canEdit: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((m) => (
        <MediaCard key={m.id} media={m} canEdit={canEdit} />
      ))}
    </div>
  );
}

function MediaCard({ media, canEdit }: { media: Media; canEdit: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [altHe, setAltHe] = useState(media.alt_he);
  const [licenseNote, setLicenseNote] = useState(media.license_note ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<MediaUsageRef[] | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", media.id);
      fd.set("alt_he", altHe);
      fd.set("license_note", licenseNote);
      const result = await updateMediaAction(fd);
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  async function handleDeleteClick() {
    setError(null);
    const refs = await getMediaUsageAction(media.id);
    setUsage(refs);
    setConfirmingDelete(true);
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const result = await deleteMediaAction(media.id);
      if (!result.ok) {
        setError(result.error ?? "מחיקה נכשלה.");
        setConfirmingDelete(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-2">
      {isDocumentMime(media.mime_type) ? (
        // PDFs have no thumbnail; link straight to the file so an editor can
        // check they uploaded the right one.
        <a
          href={mediaUrl(media.storage_path)}
          target="_blank"
          rel="noreferrer"
          className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-md bg-surface-alt hover:bg-surface-alt/70"
        >
          <span className="text-3xl" aria-hidden="true">
            📄
          </span>
          <span className="text-xs text-ink-muted">PDF — לחצו לפתיחה</span>
        </a>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={mediaUrl(media.storage_path)}
          alt={media.alt_he}
          className="h-28 w-full rounded-md object-cover"
        />
      )}
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-ink" htmlFor={`alt-${media.id}`}>
            Alt (עברית)
          </label>
          <input
            id={`alt-${media.id}`}
            className={`${inputClass} text-xs`}
            value={altHe}
            onChange={(e) => setAltHe(e.target.value)}
          />
          <label className="text-xs font-semibold text-ink" htmlFor={`license-${media.id}`}>
            רישיון
          </label>
          <textarea
            id={`license-${media.id}`}
            className={`${textareaClass} min-h-10 text-xs`}
            value={licenseNote}
            onChange={(e) => setLicenseNote(e.target.value)}
          />
          {error ? (
            <p role="alert" className="text-xs text-error">
              {error}
            </p>
          ) : null}
          <div className="flex gap-1">
            <PrimaryButton type="button" onClick={handleSave} disabled={isPending} className="px-2 py-1 text-xs">
              שמירה
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 text-xs"
            >
              ביטול
            </SecondaryButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="line-clamp-2 text-xs text-ink" title={media.alt_he}>
            {media.alt_he}
          </p>
          <p className="text-[10px] text-ink-muted">
            {media.width}×{media.height} · {(media.size_bytes / 1024).toFixed(0)}KB
          </p>
          {canEdit ? (
            <div className="flex gap-1">
              <SecondaryButton
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 text-xs"
              >
                עריכה
              </SecondaryButton>
              <DangerButton type="button" onClick={handleDeleteClick} className="px-2 py-1 text-xs">
                מחיקה
              </DangerButton>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-error">
              {error}
            </p>
          ) : null}
        </div>
      )}

      {confirmingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmingDelete(false);
          }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-lg bg-surface p-5 shadow-xl">
            <h3 className="font-display text-lg font-bold text-ink">מחיקת תמונה</h3>
            {usage && usage.length > 0 ? (
              <>
                <p role="alert" className="mt-2 text-sm text-error">
                  התמונה בשימוש ב-{usage.length} מקומות ולא ניתן למחוק אותה כעת:
                </p>
                <ul className="mt-2 list-inside list-disc text-sm text-ink-muted">
                  {usage.map((u) => (
                    <li key={u.href}>{u.label}</li>
                  ))}
                </ul>
                <div className="mt-4">
                  <SecondaryButton type="button" onClick={() => setConfirmingDelete(false)}>
                    סגירה
                  </SecondaryButton>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-muted">
                  התמונה אינה בשימוש בשום מקום שנסרק. פעולה זו בלתי הפיכה.
                </p>
                <div className="mt-4 flex gap-2">
                  <DangerButton type="button" onClick={handleConfirmDelete} disabled={isPending}>
                    {isPending ? "מוחק..." : "מחיקה סופית"}
                  </DangerButton>
                  <SecondaryButton type="button" onClick={() => setConfirmingDelete(false)}>
                    ביטול
                  </SecondaryButton>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
