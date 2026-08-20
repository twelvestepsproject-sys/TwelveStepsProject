"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLeadAction, updateSubscriberStatusAction } from "./actions";
import { PrimaryButton, SecondaryButton, textareaClass, inputClass } from "@/components/admin/fields";
import type { Lead, ContactMessage, NewsletterSubscriber } from "@/lib/schemas";

/**
 * §8 "detail drawer" — click a row to see full detail without navigating
 * away. One shared drawer component handles all three entity kinds (their
 * shapes differ enough that a single generic table cell layout wouldn't
 * read well, but the drawer chrome/behavior is identical) rather than three
 * near-duplicate components.
 */

type DrawerContent =
  | { kind: "lead"; row: Lead }
  | { kind: "message"; row: ContactMessage }
  | { kind: "subscriber"; row: NewsletterSubscriber };

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "חדש",
  contacted: "נוצר קשר",
  converted: "נרשם/ה",
  archived: "בארכיון",
};

const SUBSCRIBER_STATUS_LABELS: Record<string, string> = {
  subscribed: "פעיל/ה",
  unsubscribed: "בוטל",
};

export function DetailDrawer({ content, canEdit, onClose }: { content: DrawerContent; canEdit: boolean; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="סגירה"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-s border-border bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">
            {content.kind === "lead" ? "פרטי ליד" : content.kind === "message" ? "פרטי הודעה" : "פרטי נרשם/ת"}
          </h2>
          <SecondaryButton type="button" onClick={onClose} className="px-3 py-1.5">
            סגירה
          </SecondaryButton>
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

        {content.kind === "lead" ? (
          <LeadDetail
            lead={content.row}
            canEdit={canEdit}
            isPending={isPending}
            onSave={(input) =>
              startTransition(async () => {
                setError(null);
                setNotice(null);
                const result = await updateLeadAction(content.row.id, input);
                if (!result.ok) {
                  setError(result.error ?? "השמירה נכשלה.");
                  return;
                }
                setNotice("נשמר בהצלחה.");
                router.refresh();
              })
            }
          />
        ) : null}

        {content.kind === "message" ? <MessageDetail message={content.row} /> : null}

        {content.kind === "subscriber" ? (
          <SubscriberDetail
            subscriber={content.row}
            canEdit={canEdit}
            isPending={isPending}
            onSave={(status) =>
              startTransition(async () => {
                setError(null);
                setNotice(null);
                const result = await updateSubscriberStatusAction(content.row.id, status);
                if (!result.ok) {
                  setError(result.error ?? "השמירה נכשלה.");
                  return;
                }
                setNotice("נשמר בהצלחה.");
                router.refresh();
              })
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-ink-muted">{label}</span>
      <span className="text-sm text-ink">{value || "—"}</span>
    </div>
  );
}

function LeadDetail({
  lead,
  canEdit,
  isPending,
  onSave,
}: {
  lead: Lead;
  canEdit: boolean;
  isPending: boolean;
  onSave: (input: { status?: string; notes?: string | null }) => void;
}) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");

  return (
    <div className="flex flex-col gap-4">
      <DetailRow label="שם מלא" value={`${lead.first_name} ${lead.last_name}`} />
      <DetailRow label="אימייל" value={lead.email} />
      <DetailRow label="טלפון" value={lead.phone} />
      <DetailRow label="מסלול מבוקש" value={lead.interest ?? "—"} />
      <DetailRow label="עמוד מקור" value={lead.source_page ?? ""} />
      <DetailRow label="תאריך הסכמה" value={new Date(lead.consent_at).toLocaleString("he-IL")} />
      <DetailRow label="נוצר בתאריך" value={new Date(lead.created_at).toLocaleString("he-IL")} />

      {lead.utm ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-ink-muted">נתוני UTM</span>
          <div className="rounded-md bg-surface-alt p-2 text-xs text-ink-muted">
            {Object.entries(lead.utm).map(([key, value]) => (
              <div key={key}>
                {key}: {value || "—"}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <label htmlFor="lead-status" className="flex flex-col gap-1 text-sm text-ink">
        <span className="font-semibold">סטטוס</span>
        <select
          id="lead-status"
          className={inputClass}
          value={status}
          disabled={!canEdit}
          onChange={(e) => setStatus(e.target.value as Lead["status"])}
        >
          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="lead-notes" className="flex flex-col gap-1 text-sm text-ink">
        <span className="font-semibold">הערות</span>
        <textarea
          id="lead-notes"
          className={textareaClass}
          value={notes}
          disabled={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {canEdit ? (
        <PrimaryButton
          type="button"
          disabled={isPending}
          onClick={() => onSave({ status, notes: notes || null })}
        >
          {isPending ? "שומר..." : "שמירה"}
        </PrimaryButton>
      ) : (
        <p className="text-xs text-ink-muted">צפייה בלבד — אין הרשאה לערוך.</p>
      )}
    </div>
  );
}

function MessageDetail({ message }: { message: ContactMessage }) {
  return (
    <div className="flex flex-col gap-4">
      <DetailRow label="שם" value={message.name} />
      <DetailRow label="אימייל" value={message.email} />
      <DetailRow label="טלפון" value={message.phone ?? ""} />
      <DetailRow label="עמוד מקור" value={message.source_page ?? ""} />
      <DetailRow label="נוצר בתאריך" value={new Date(message.created_at).toLocaleString("he-IL")} />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-ink-muted">תוכן ההודעה</span>
        <p className="whitespace-pre-wrap rounded-md bg-surface-alt p-3 text-sm text-ink">{message.message}</p>
      </div>
      <p className="text-xs text-ink-muted">
        אין שדה סטטוס/הערות להודעות פנייה בסכימה הנוכחית — צפייה בלבד.
      </p>
    </div>
  );
}

function SubscriberDetail({
  subscriber,
  canEdit,
  isPending,
  onSave,
}: {
  subscriber: NewsletterSubscriber;
  canEdit: boolean;
  isPending: boolean;
  onSave: (status: string) => void;
}) {
  const [status, setStatus] = useState(subscriber.status);

  return (
    <div className="flex flex-col gap-4">
      <DetailRow label="אימייל" value={subscriber.email} />
      <DetailRow label="מקור" value={subscriber.source ?? ""} />
      <DetailRow label="תאריך הסכמה" value={new Date(subscriber.consent_at).toLocaleString("he-IL")} />
      <DetailRow label="נוצר בתאריך" value={new Date(subscriber.created_at).toLocaleString("he-IL")} />

      <label htmlFor="subscriber-status" className="flex flex-col gap-1 text-sm text-ink">
        <span className="font-semibold">סטטוס</span>
        <select
          id="subscriber-status"
          className={inputClass}
          value={status}
          disabled={!canEdit}
          onChange={(e) => setStatus(e.target.value as NewsletterSubscriber["status"])}
        >
          {Object.entries(SUBSCRIBER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {canEdit ? (
        <PrimaryButton type="button" disabled={isPending} onClick={() => onSave(status)}>
          {isPending ? "שומר..." : "שמירה"}
        </PrimaryButton>
      ) : (
        <p className="text-xs text-ink-muted">צפייה בלבד — אין הרשאה לערוך.</p>
      )}
    </div>
  );
}

export type { DrawerContent };
