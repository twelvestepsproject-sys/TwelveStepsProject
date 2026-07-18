"use client";

import { useState } from "react";
import { DetailDrawer, type DrawerContent } from "./detail-drawer";
import { AdminEmptyState } from "@/components/admin/states";
import type { Lead, ContactMessage, NewsletterSubscriber } from "@/lib/schemas";

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL");
}

/**
 * Client wrapper owning the "which row is open in the detail drawer" state
 * (§8: "detail drawer"). Data itself is fetched server-side and passed in
 * as props — this component never calls `db` directly, only renders what
 * it's given and opens the drawer on row click.
 */
export function LeadsTable({ leads, canEdit }: { leads: Lead[]; canEdit: boolean }) {
  const [open, setOpen] = useState<DrawerContent | null>(null);

  if (leads.length === 0) {
    return <AdminEmptyState message="אין לידים תואמים." />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-start">
              <th className="px-3 py-2 text-start font-semibold text-ink">שם</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">אימייל</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">טלפון</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">סטטוס</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">נוצר בתאריך</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt/60"
                onClick={() => setOpen({ kind: "lead", row: lead })}
              >
                <td className="px-3 py-2 font-semibold text-ink">
                  {lead.first_name} {lead.last_name}
                </td>
                <td className="px-3 py-2 text-ink-muted">{lead.email}</td>
                <td className="px-3 py-2 text-ink-muted">{lead.phone}</td>
                <td className="px-3 py-2 text-ink-muted">{LEAD_STATUS_LABELS[lead.status] ?? lead.status}</td>
                <td className="px-3 py-2 text-ink-muted">{fmtDate(lead.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? <DetailDrawer content={open} canEdit={canEdit} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

export function MessagesTable({ messages }: { messages: ContactMessage[] }) {
  const [open, setOpen] = useState<DrawerContent | null>(null);

  if (messages.length === 0) {
    return <AdminEmptyState message="אין הודעות פנייה תואמות." />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-start">
              <th className="px-3 py-2 text-start font-semibold text-ink">שם</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">אימייל</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">תקציר הודעה</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">נוצר בתאריך</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr
                key={message.id}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt/60"
                onClick={() => setOpen({ kind: "message", row: message })}
              >
                <td className="px-3 py-2 font-semibold text-ink">{message.name}</td>
                <td className="px-3 py-2 text-ink-muted">{message.email}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {message.message.length > 60 ? `${message.message.slice(0, 60)}…` : message.message}
                </td>
                <td className="px-3 py-2 text-ink-muted">{fmtDate(message.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? <DetailDrawer content={open} canEdit={false} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

export function SubscribersTable({
  subscribers,
  canEdit,
}: {
  subscribers: NewsletterSubscriber[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState<DrawerContent | null>(null);

  if (subscribers.length === 0) {
    return <AdminEmptyState message="אין נרשמים תואמים." />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-start">
              <th className="px-3 py-2 text-start font-semibold text-ink">אימייל</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">מקור</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">סטטוס</th>
              <th className="px-3 py-2 text-start font-semibold text-ink">נוצר בתאריך</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((subscriber) => (
              <tr
                key={subscriber.id}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-alt/60"
                onClick={() => setOpen({ kind: "subscriber", row: subscriber })}
              >
                <td className="px-3 py-2 font-semibold text-ink">{subscriber.email}</td>
                <td className="px-3 py-2 text-ink-muted">{subscriber.source ?? "—"}</td>
                <td className="px-3 py-2 text-ink-muted">
                  {SUBSCRIBER_STATUS_LABELS[subscriber.status] ?? subscriber.status}
                </td>
                <td className="px-3 py-2 text-ink-muted">{fmtDate(subscriber.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? <DetailDrawer content={open} canEdit={canEdit} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
