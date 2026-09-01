"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePodcastEpisodeAction } from "./actions";
import { useAutosave } from "@/components/admin/use-autosave";
import { AutosaveStatus } from "@/components/admin/autosave-status";
import { Field, inputClass, textareaClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { PlaceholderBadge } from "@/components/admin/badges";
import type { PodcastEpisode } from "@/lib/schemas";

interface FormState {
  title: string;
  description: string;
  spotify_url: string;
  video_url: string;
  published_at: string;
  duration_minutes: string;
}

function toFormState(ep?: PodcastEpisode | null): FormState {
  return {
    title: ep?.title ?? "",
    description: ep?.description ?? "",
    spotify_url: ep?.spotify_url ?? "",
    video_url: ep?.video_url ?? "",
    published_at: ep?.published_at ? ep.published_at.slice(0, 10) : "",
    duration_minutes: ep?.duration ? String(Math.round(ep.duration / 60)) : "",
  };
}

function toFormData(state: FormState, id?: string): FormData {
  const fd = new FormData();
  if (id) fd.set("id", id);
  fd.set("title", state.title);
  fd.set("description", state.description);
  fd.set("spotify_url", state.spotify_url);
  fd.set("video_url", state.video_url);
  fd.set("published_at", state.published_at);
  fd.set("duration_minutes", state.duration_minutes);
  return fd;
}

export function PodcastForm({ episode, canEdit }: { episode?: PodcastEpisode | null; canEdit: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(episode));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { isDirty, isSaving, lastSavedAt, error: autosaveError, markSaved } = useAutosave(
    state,
    async (data) => {
      if (!canEdit || !episode?.id) return;
      const result = await savePodcastEpisodeAction(toFormData(data, episode.id));
      if (!result.ok) throw new Error(result.error);
    },
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await savePodcastEpisodeAction(toFormData(state, episode?.id));
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      markSaved();
      if (!episode?.id && result.data) {
        router.push(`/admin/podcast/${result.data.id}`);
        return;
      }
      setNotice("נשמר בהצלחה.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <AutosaveStatus isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} error={autosaveError} />
        {episode?.is_placeholder ? <PlaceholderBadge /> : null}
      </div>

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

        <Field label="תיאור (אופציונלי)" htmlFor="description">
          <textarea
            id="description"
            className={textareaClass}
            value={state.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>

        <Field
          label="קישור ל-Spotify (אופציונלי)"
          htmlFor="spotify_url"
          hint="אפשר להשאיר ריק ולהעלות סרטון יוטיוב במקום."
        >
          <input
            id="spotify_url"
            className={inputClass}
            value={state.spotify_url}
            onChange={(e) => update("spotify_url", e.target.value)}
          />
        </Field>

        <Field
          label="סרטון יוטיוב (אופציונלי)"
          htmlFor="video_url"
          hint="אם ימולא, הסרטון יוצג מוטמע בדף. הדביקו כתובת רגילה של יוטיוב."
        >
          <input
            id="video_url"
            className={inputClass}
            placeholder="https://www.youtube.com/watch?v=..."
            value={state.video_url}
            onChange={(e) => update("video_url", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="תאריך פרסום" htmlFor="published_at">
            <input
              id="published_at"
              type="date"
              className={inputClass}
              value={state.published_at}
              onChange={(e) => update("published_at", e.target.value)}
            />
          </Field>
          <Field label="משך (דקות)" htmlFor="duration_minutes">
            <input
              id="duration_minutes"
              type="number"
              min={0}
              className={inputClass}
              value={state.duration_minutes}
              onChange={(e) => update("duration_minutes", e.target.value)}
            />
          </Field>
        </div>

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
          <SecondaryButton type="button" onClick={() => router.push("/admin/podcast")}>
            ביטול
          </SecondaryButton>
        </div>
      </fieldset>
    </form>
  );
}
