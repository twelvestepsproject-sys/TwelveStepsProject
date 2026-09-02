"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePostAction } from "./actions";
import { useAutosave } from "@/components/admin/use-autosave";
import { AutosaveStatus } from "@/components/admin/autosave-status";
import { Field, inputClass, textareaClass, PrimaryButton, SecondaryButton } from "@/components/admin/fields";
import { PlaceholderBadge } from "@/components/admin/badges";
import type { Category, Post } from "@/lib/schemas";

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cta_label: string;
  cta_url: string;
  category_id: string;
  published_at: string;
  reading_time: string;
  status: "draft" | "published";
}

function toFormState(p?: Post | null): FormState {
  return {
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    excerpt: p?.excerpt ?? "",
    body: p?.body ?? "",
    cta_label: p?.cta_label ?? "",
    cta_url: p?.cta_url ?? "",
    category_id: p?.category_id ?? "",
    published_at: p?.published_at ? p.published_at.slice(0, 16) : "",
    reading_time: String(p?.reading_time ?? 5),
    status: p?.status ?? "draft",
  };
}

function toFormData(state: FormState, id?: string): FormData {
  const fd = new FormData();
  if (id) fd.set("id", id);
  fd.set("title", state.title);
  fd.set("slug", state.slug);
  fd.set("excerpt", state.excerpt);
  fd.set("body", state.body);
  fd.set("cta_label", state.cta_label);
  fd.set("cta_url", state.cta_url);
  fd.set("category_id", state.category_id);
  fd.set("published_at", state.published_at);
  fd.set("reading_time", state.reading_time);
  fd.set("status", state.status);
  return fd;
}

export function PostForm({
  post,
  categories,
  canEdit,
}: {
  post?: Post | null;
  categories: Category[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toFormState(post));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { isDirty, isSaving, lastSavedAt, error: autosaveError, markSaved } = useAutosave(
    state,
    async (data) => {
      if (!canEdit || !post?.id) return;
      const result = await savePostAction(toFormData(data, post.id));
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
      const result = await savePostAction(toFormData(state, post?.id));
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      markSaved();
      if (!post?.id && result.data) {
        router.push(`/admin/posts/${result.data.id}`);
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
        {post?.is_placeholder ? <PlaceholderBadge /> : null}
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

        <Field
          label="כתובת URL (slug)"
          htmlFor="slug"
          hint="נוצר אוטומטית מהכותרת בעברית. ניתן לערוך; חייב להיות ייחודי."
        >
          <input
            id="slug"
            className={inputClass}
            value={state.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="ריק = נוצר אוטומטית מהכותרת"
          />
        </Field>

        <Field label="תקציר" htmlFor="excerpt" required>
          <textarea
            id="excerpt"
            className={textareaClass}
            value={state.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            required
          />
        </Field>

        <Field label="תוכן מלא" htmlFor="body" required>
          <textarea
            id="body"
            className={`${textareaClass} min-h-48`}
            value={state.body}
            onChange={(e) => update("body", e.target.value)}
            required
          />
        </Field>

        {/* Optional button under the article. Used for publishing a book's
            first chapter with a "buy the book" link — post bodies are plain
            text, so the link cannot live inside the content. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="קישור לכפתור (אופציונלי)"
            htmlFor="cta_url"
            hint="למשל קישור לרכישת הספר. אם יישאר ריק, לא יוצג כפתור."
          >
            <input
              id="cta_url"
              className={inputClass}
              placeholder="https://..."
              value={state.cta_url}
              onChange={(e) => update("cta_url", e.target.value)}
            />
          </Field>

          <Field
            label="טקסט הכפתור"
            htmlFor="cta_label"
            hint='ברירת מחדל: "לרכישת הספר"'
          >
            <input
              id="cta_label"
              className={inputClass}
              placeholder="לרכישת הספר"
              value={state.cta_label}
              onChange={(e) => update("cta_label", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="קטגוריה" htmlFor="category_id">
            <select
              id="category_id"
              className={inputClass}
              value={state.category_id}
              onChange={(e) => update("category_id", e.target.value)}
            >
              <option value="">ללא קטגוריה</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="זמן קריאה (דקות)" htmlFor="reading_time">
            <input
              id="reading_time"
              type="number"
              min={1}
              className={inputClass}
              value={state.reading_time}
              onChange={(e) => update("reading_time", e.target.value)}
            />
          </Field>
          <Field
            label="תאריך פרסום"
            htmlFor="published_at"
            hint="תאריך עתידי + סטטוס פורסם = לא יוצג עדיין בציבור."
          >
            <input
              id="published_at"
              type="datetime-local"
              className={inputClass}
              value={state.published_at}
              onChange={(e) => update("published_at", e.target.value)}
            />
          </Field>
          <Field label="סטטוס" htmlFor="status">
            <select
              id="status"
              className={inputClass}
              value={state.status}
              onChange={(e) => update("status", e.target.value as "draft" | "published")}
            >
              <option value="draft">טיוטה</option>
              <option value="published">פורסם</option>
            </select>
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
          <SecondaryButton type="button" onClick={() => router.push("/admin/posts")}>
            ביטול
          </SecondaryButton>
        </div>
      </fieldset>
    </form>
  );
}
