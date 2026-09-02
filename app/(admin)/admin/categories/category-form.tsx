"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCategoryAction } from "./actions";
import { Field, inputClass, textareaClass, PrimaryButton } from "@/components/admin/fields";
import type { Category } from "@/lib/schemas";

/**
 * Two fields, so no autosave: the whole form fits on one screen and a single
 * explicit save is clearer than a draft that saves itself.
 *
 * The slug is not editable. It is generated from the name on create and
 * frozen afterwards, because it is the public /blog/category/<slug> URL —
 * renaming a category should not silently break a link someone shared.
 */
export function CategoryForm({
  category,
  canEdit,
}: {
  category?: Category | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const fd = new FormData();
      if (category?.id) fd.set("id", category.id);
      fd.set("name", name);
      fd.set("description", description);

      const result = await saveCategoryAction(fd);
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      if (!category?.id) {
        router.push("/admin/categories");
        return;
      }
      setNotice("נשמר בהצלחה.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <fieldset disabled={!canEdit} className="flex flex-col gap-5">
        <Field label="שם הקטגוריה" htmlFor="name" required>
          <input
            id="name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field
          label="תיאור (אופציונלי)"
          htmlFor="description"
          hint="מוצג בראש עמוד הקטגוריה."
        >
          <textarea
            id="description"
            className={textareaClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        {category ? (
          <Field label="כתובת העמוד" htmlFor="slug" hint="נקבעת אוטומטית ואינה ניתנת לשינוי.">
            <input id="slug" className={`${inputClass} bg-surface-alt`} value={`/blog/category/${category.slug}`} readOnly />
          </Field>
        ) : null}

        {canEdit ? (
          <div className="flex items-center gap-3">
            <PrimaryButton type="submit" disabled={isPending}>
              {isPending ? "שומר…" : "שמירה"}
            </PrimaryButton>
            {notice ? <span className="text-sm text-ink-muted">{notice}</span> : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}
