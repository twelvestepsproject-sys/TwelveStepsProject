"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveGalleryAction } from "./actions";
import { Field, inputClass, textareaClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { mediaUrlFor } from "@/lib/media";
import type { Gallery, Media } from "@/lib/schemas";

interface FormState {
  title: string;
  slug: string;
  images_raw: string;
}

function toFormState(g?: Gallery | null): FormState {
  return {
    title: g?.title ?? "",
    slug: g?.slug ?? "",
    images_raw: (g?.images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => `${img.media_id} | ${img.alt_he}`)
      .join("\n"),
  };
}

export function GalleryForm({
  gallery,
  mediaOptions,
  canEdit,
}: {
  gallery?: Gallery | null;
  mediaOptions: Media[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(gallery));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const previewIds = state.images_raw
    .split("\n")
    .map((l) => l.split("|")[0]?.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const fd = new FormData();
    if (gallery?.id) fd.set("id", gallery.id);
    fd.set("title", state.title);
    fd.set("slug", state.slug);
    fd.set("images_raw", state.images_raw);
    startTransition(async () => {
      const result = await saveGalleryAction(fd);
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      if (!gallery?.id && result.data) {
        router.push(`/admin/galleries/${result.data.id}`);
        return;
      }
      setNotice("נשמר בהצלחה.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset disabled={!canEdit} className="flex flex-col gap-5">
        <Field label="כותרת" htmlFor="title" required>
          <input
            id="title"
            className={inputClass}
            value={state.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </Field>

        <Field label="כתובת URL (slug)" htmlFor="slug" hint="נוצר אוטומטית מהכותרת אם ריק.">
          <input id="slug" className={inputClass} value={state.slug} onChange={(e) => update("slug", e.target.value)} />
        </Field>

        <Field
          label="תמונות"
          htmlFor="images_raw"
          hint="שורה לכל תמונה, בפורמט: media_id | טקסט חלופי (alt). ספריית מדיה מלאה עם העלאה גררו-שחררו תיבנה בשלב הבא — כרגע יש לבחור מזהי מדיה קיימים (רשימה למטה)."
        >
          <textarea
            id="images_raw"
            className={`${textareaClass} min-h-32`}
            value={state.images_raw}
            onChange={(e) => update("images_raw", e.target.value)}
          />
        </Field>

        {previewIds.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {previewIds.map((id) => {
              const media = mediaOptions.find((m) => m.id === id);
              if (!media) {
                return (
                  <span key={id} className="rounded-md border border-error/30 bg-error/5 px-2 py-1 text-xs text-error">
                    מזהה לא נמצא: {id}
                  </span>
                );
              }
              return (
                <div key={id} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
                  <Image src={mediaUrlFor(media)} alt={media.alt_he} fill sizes="80px" className="object-cover" />
                </div>
              );
            })}
          </div>
        ) : null}

        <details className="rounded-md border border-border bg-surface-alt/40 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-ink">מזהי מדיה זמינים</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {mediaOptions.map((m) => (
              <li key={m.id} className="text-xs text-ink-muted">
                <code className="rounded bg-surface px-1">{m.id}</code> — {m.alt_he}
              </li>
            ))}
          </ul>
        </details>

        {error ? (
          <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {notice}
          </p>
        ) : null}

        <div className="flex gap-3">
          <PrimaryButton type="submit" disabled={isPending}>
            {isPending ? "שומר..." : "שמירה"}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => router.push("/admin/galleries")}>
            ביטול
          </SecondaryButton>
        </div>
      </fieldset>
    </form>
  );
}
