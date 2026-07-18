"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStageAction, deleteStageAction, saveStepAction, deleteStepAction } from "./actions";
import { Field, inputClass, textareaClass, PrimaryButton, SecondaryButton, DangerButton } from "@/components/admin/fields";
import type { ProgramStage } from "@/lib/schemas";

export function StagesEditor({ stages, canEdit }: { stages: ProgramStage[]; canEdit: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {stages
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((stage) => (
          <StageCard key={stage.id} stage={stage} canEdit={canEdit} />
        ))}
      {canEdit ? <NewStageCard nextNumber={stages.length + 1} /> : null}
    </div>
  );
}

function StageCard({ stage, canEdit }: { stage: ProgramStage; canEdit: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingStage, setEditingStage] = useState(false);
  const [title, setTitle] = useState(stage.title);
  const [subtitle, setSubtitle] = useState(stage.subtitle ?? "");
  const [error, setError] = useState<string | null>(null);

  function saveStage() {
    const fd = new FormData();
    fd.set("id", stage.id);
    fd.set("stage_number", String(stage.stage_number));
    fd.set("title", title);
    fd.set("subtitle", subtitle);
    fd.set("sort_order", String(stage.sort_order));
    startTransition(async () => {
      const result = await saveStageAction(fd);
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      setEditingStage(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-ink-muted">שלב {stage.stage_number}</p>
          {editingStage ? (
            <div className="mt-2 flex flex-col gap-2">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
              <input
                className={inputClass}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="כותרת משנה (אופציונלי)"
              />
              {error ? <p className="text-xs text-error">{error}</p> : null}
              <div className="flex gap-2">
                <PrimaryButton type="button" disabled={isPending} onClick={saveStage}>
                  שמירה
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => setEditingStage(false)}>
                  ביטול
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-ink">{stage.title}</h2>
              {stage.subtitle ? <p className="text-sm text-ink-muted">{stage.subtitle}</p> : null}
            </>
          )}
        </div>
        {canEdit && !editingStage ? (
          <div className="flex shrink-0 gap-2">
            <SecondaryButton type="button" onClick={() => setEditingStage(true)}>
              עריכה
            </SecondaryButton>
            <DangerButton
              type="button"
              onClick={() => {
                if (!confirm("למחוק את השלב וכל צעדיו?")) return;
                startTransition(async () => {
                  await deleteStageAction(stage.id);
                  router.refresh();
                });
              }}
            >
              מחיקה
            </DangerButton>
          </div>
        ) : null}
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {stage.steps
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((step) => (
            <StepRow key={step.id} stageId={stage.id} step={step} canEdit={canEdit} />
          ))}
      </ol>

      {canEdit ? <NewStepRow stageId={stage.id} nextNumber={stage.steps.length + 1} /> : null}
    </div>
  );
}

function StepRow({
  stageId,
  step,
  canEdit,
}: {
  stageId: string;
  step: ProgramStage["steps"][number];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [body, setBody] = useState(step.body);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const fd = new FormData();
    fd.set("stage_id", stageId);
    fd.set("step_id", step.id);
    fd.set("step_number", String(step.step_number));
    fd.set("title", title);
    fd.set("body", body);
    fd.set("sort_order", String(step.sort_order));
    startTransition(async () => {
      const result = await saveStepAction(fd);
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <li className="rounded-md border border-border bg-surface-alt/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-ink-muted">צעד {step.step_number}</p>
          {editing ? (
            <div className="mt-1 flex flex-col gap-2">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea className={textareaClass} value={body} onChange={(e) => setBody(e.target.value)} />
              {error ? <p className="text-xs text-error">{error}</p> : null}
              <div className="flex gap-2">
                <PrimaryButton type="button" disabled={isPending} onClick={save}>
                  שמירה
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => setEditing(false)}>
                  ביטול
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <>
              <p className="font-semibold text-ink">{step.title}</p>
              <p className="text-sm text-ink-muted">{step.body}</p>
            </>
          )}
        </div>
        {canEdit && !editing ? (
          <div className="flex shrink-0 gap-2">
            <SecondaryButton type="button" onClick={() => setEditing(true)}>
              עריכה
            </SecondaryButton>
            <DangerButton
              type="button"
              onClick={() => {
                if (!confirm("למחוק את הצעד?")) return;
                startTransition(async () => {
                  await deleteStepAction(stageId, step.id);
                  router.refresh();
                });
              }}
            >
              מחיקה
            </DangerButton>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function NewStepRow({ stageId, nextNumber }: { stageId: string; nextNumber: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <SecondaryButton type="button" className="mt-3" onClick={() => setOpen(true)}>
        הוספת צעד
      </SecondaryButton>
    );
  }

  function save() {
    const fd = new FormData();
    fd.set("stage_id", stageId);
    fd.set("step_number", String(nextNumber));
    fd.set("title", title);
    fd.set("body", body);
    fd.set("sort_order", String(nextNumber));
    startTransition(async () => {
      const result = await saveStepAction(fd);
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      setOpen(false);
      setTitle("");
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 rounded-md border border-dashed border-border p-3">
      <Field label="כותרת הצעד" htmlFor={`new-step-title-${stageId}`}>
        <input
          id={`new-step-title-${stageId}`}
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="mt-2">
        <Field label="תיאור" htmlFor={`new-step-body-${stageId}`}>
          <textarea
            id={`new-step-body-${stageId}`}
            className={textareaClass}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
      </div>
      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <PrimaryButton type="button" disabled={isPending} onClick={save}>
          הוספה
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => setOpen(false)}>
          ביטול
        </SecondaryButton>
      </div>
    </div>
  );
}

function NewStageCard({ nextNumber }: { nextNumber: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <SecondaryButton type="button" onClick={() => setOpen(true)}>
        הוספת שלב
      </SecondaryButton>
    );
  }

  function save() {
    const fd = new FormData();
    fd.set("stage_number", String(nextNumber));
    fd.set("title", title);
    fd.set("subtitle", subtitle);
    fd.set("sort_order", String(nextNumber));
    startTransition(async () => {
      const result = await saveStageAction(fd);
      if (!result.ok) {
        setError(result.error ?? "שמירה נכשלה.");
        return;
      }
      setOpen(false);
      setTitle("");
      setSubtitle("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <Field label="כותרת השלב" htmlFor="new-stage-title">
        <input id="new-stage-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="mt-2">
        <Field label="כותרת משנה (אופציונלי)" htmlFor="new-stage-subtitle">
          <input
            id="new-stage-subtitle"
            className={inputClass}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </Field>
      </div>
      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <PrimaryButton type="button" disabled={isPending} onClick={save}>
          הוספה
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => setOpen(false)}>
          ביטול
        </SecondaryButton>
      </div>
    </div>
  );
}
