import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminLoadingRows } from "@/components/admin/states";
import { SecondaryButton } from "@/components/admin/fields";
import { LeadsTable, MessagesTable, SubscribersTable } from "./leads-table";

/**
 * §8: "Leads / Messages / Subscribers — table, filters, detail drawer,
 * notes, status, CSV export."
 *
 * STRUCTURE DECISION (documented per task brief): these are 3 related but
 * distinctly-shaped entities (leads have status+notes+UTM, contact messages
 * have a message body and no status, subscribers have only status). Rather
 * than 3 separate nav items (nav-config.ts has exactly ONE deferred entry,
 * "לידים והודעות", for all three — §8 also lists them as one bullet) or
 * cramming all three into one unified table (their columns don't overlap
 * enough to share headers meaningfully), this is ONE route (`/admin/leads`)
 * with a `?tab=` query-param tab switcher — consistent with how
 * `ListToolbar` already drives `q`/`status` through the URL elsewhere in
 * this codebase, and keeps each tab's table/filter/CSV export independent
 * without three near-duplicate routes.
 */

type Tab = "leads" | "messages" | "subscribers";

const TABS: { id: Tab; label: string }[] = [
  { id: "leads", label: "לידים" },
  { id: "messages", label: "הודעות פנייה" },
  { id: "subscribers", label: "נרשמים לניוזלטר" },
];

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "חדש" },
  { value: "contacted", label: "נוצר קשר" },
  { value: "converted", label: "נרשם/ה" },
  { value: "archived", label: "בארכיון" },
];

const SUBSCRIBER_STATUS_OPTIONS = [
  { value: "subscribed", label: "פעיל/ה" },
  { value: "unsubscribed", label: "בוטל" },
];

export default async function LeadsMessagesSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; status?: string }>;
}) {
  const { tab: tabParam, q, status } = await searchParams;
  const tab: Tab = tabParam === "messages" || tabParam === "subscribers" ? tabParam : "leads";
  const session = await getDevSession();
  const canEdit = session?.role === "admin" || session?.role === "editor";

  const exportHref =
    tab === "leads"
      ? "/api/admin/leads/export"
      : tab === "messages"
        ? "/api/admin/contact-messages/export"
        : "/api/admin/newsletter-subscribers/export";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">לידים והודעות</h1>
        <a href={exportHref}>
          <SecondaryButton type="button">ייצוא ל-CSV</SecondaryButton>
        </a>
      </div>

      <div role="tablist" aria-label="בחירת תצוגה" className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/leads?tab=${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <ListToolbar statusOptions={tab === "leads" ? LEAD_STATUS_OPTIONS : tab === "subscribers" ? SUBSCRIBER_STATUS_OPTIONS : undefined} />

      <p className="text-xs text-ink-muted">
        מידע אישי (שם, אימייל, טלפון) — לשימוש פנימי בלבד, אין לשתף מחוץ למערכת הניהול.
      </p>

      <Suspense fallback={<AdminLoadingRows />}>
        <TabContent tab={tab} q={q} status={status} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}

async function TabContent({
  tab,
  q,
  status,
  canEdit,
}: {
  tab: Tab;
  q?: string;
  status?: string;
  canEdit: boolean;
}) {
  if (tab === "messages") {
    const result = await db.listContactMessagesAdmin({ q, perPage: 200 });
    return <MessagesTable messages={result.items} />;
  }
  if (tab === "subscribers") {
    const result = await db.listNewsletterSubscribersAdmin({ q, status, perPage: 200 });
    return <SubscribersTable subscribers={result.items} canEdit={canEdit} />;
  }
  const result = await db.listLeadsAdmin({ q, status, perPage: 200 });

  // Marketing consent lives in newsletter_subscribers, not on the lead —
  // that list is what an unsubscribe link and any mailing tool read, so a
  // flag on the lead would be the wrong source of truth. Resolved here as
  // one query and matched by email, rather than a lookup per row.
  //
  // It answers "may we email this person", not "did they tick the box on
  // this particular form": someone who subscribed separately from the
  // footer counts too, which is the useful reading.
  const subs = await db.listNewsletterSubscribersAdmin({ status: "subscribed", perPage: 1000 });
  const subscribedEmails = new Set(
    subs.items.map((s) => s.email.trim().toLowerCase()),
  );

  return <LeadsTable leads={result.items} subscribedEmails={subscribedEmails} canEdit={canEdit} />;
}
