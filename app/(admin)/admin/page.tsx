import Link from "next/link";
import { db } from "@/lib/queries";

/**
 * §8 Dashboard: "recent leads, subscriber count, latest edits, quick
 * links." The Leads/Messages/Subscribers screen (/admin/leads) now exists
 * (see that route), so the stat cards below link there. "Latest edits" is
 * approximated from `updated_at` across a handful of content collections
 * (a real cross-entity activity feed would want a proper `audit_log`
 * reader, which is Phase 5+ scope).
 */

interface RecentEdit {
  label: string;
  title: string;
  href: string;
  updatedAt: string;
}

export default async function AdminDashboardPage() {
  const [
    trainingsAdmin,
    postsAdmin,
    lecturersAdmin,
    testimonialsAdmin,
    leadsAdmin,
    subscribersAdmin,
    placeholderCounts,
  ] = await Promise.all([
    db.listTrainingsAdmin({ perPage: 5 }),
    db.listPosts({ includeDrafts: true, perPage: 5 }),
    db.listLecturersAdmin({ perPage: 5 }),
    db.listTestimonialsAdmin({ perPage: 5 }),
    db.listLeadsAdmin({ perPage: 1 }),
    db.listNewsletterSubscribersAdmin({ perPage: 1 }),
    countPlaceholders(),
  ]);

  const recentEdits: RecentEdit[] = [
    ...trainingsAdmin.items.map((t) => ({
      label: "הכשרה",
      title: t.title,
      href: `/admin/trainings/${t.id}`,
      updatedAt: t.updated_at,
    })),
    ...postsAdmin.items.map((p) => ({
      label: "מאמר",
      title: p.title,
      href: `/admin/posts/${p.id}`,
      // PostSummary (§5 block 17 shape) has no `updated_at` field — the
      // closest available signal for "recently touched" is published_at.
      updatedAt: p.published_at ?? "",
    })),
    ...lecturersAdmin.items.map((l) => ({
      label: "מרצה",
      title: l.name,
      href: `/admin/lecturers/${l.id}`,
      updatedAt: l.updated_at,
    })),
    ...testimonialsAdmin.items.map((t) => ({
      label: "המלצה",
      title: t.author_name,
      href: `/admin/testimonials/${t.id}`,
      updatedAt: t.updated_at,
    })),
  ]
    .filter((e) => e.updatedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  const quickLinks = [
    { href: "/admin/trainings/new", label: "הכשרה חדשה" },
    { href: "/admin/posts/new", label: "מאמר חדש" },
    { href: "/admin/lecturers/new", label: "מרצה חדש/ה" },
    { href: "/admin/testimonials/new", label: "המלצה חדשה" },
    { href: "/admin/program-stages", label: "שלבי התוכנית" },
    { href: "/admin/galleries", label: "גלריות" },
    { href: "/admin/podcast/new", label: "פרק פודקאסט חדש" },
    { href: "/admin/schedule/new", label: "מועד חדש בלוח הזמנים" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">לוח בקרה</h1>
        <p className="mt-1 text-sm text-ink-muted">סקירה כללית של האתר.</p>
      </div>

      {placeholderCounts.total > 0 ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          התוכן באתר הוא תוכן דמה, יש להחליפו לפני עלייה לאוויר ({placeholderCounts.total} רשומות).
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/admin/leads">
          <StatCard label="לידים" value={leadsAdmin.total} />
        </Link>
        <Link href="/admin/leads?tab=subscribers">
          <StatCard label="נרשמים לניוזלטר" value={subscribersAdmin.total} />
        </Link>
        <StatCard label="הכשרות" value={trainingsAdmin.total} />
        <StatCard label="מאמרים" value={postsAdmin.total} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-bold text-ink">עריכות אחרונות</h2>
          {recentEdits.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">אין עריכות עדיין.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {recentEdits.map((edit) => (
                <li key={`${edit.label}-${edit.href}`}>
                  <Link
                    href={edit.href}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-alt"
                  >
                    <span className="text-ink">{edit.title}</span>
                    <span className="text-xs text-ink-muted">{edit.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-bold text-ink">קישורים מהירים</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md border border-border px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:bg-surface-alt"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary">
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}

async function countPlaceholders(): Promise<{ total: number }> {
  // PostSummary (returned by listPosts) has no is_placeholder field per its
  // §5 block-17 pick — posts are omitted from this count rather than
  // over-fetching a full Post list here; the per-record placeholder badge
  // still renders on the Posts admin screen itself either way.
  const [trainings, lecturers, testimonials] = await Promise.all([
    db.listTrainingsAdmin({ perPage: 200 }),
    db.listLecturersAdmin({ perPage: 200 }),
    db.listTestimonialsAdmin({ perPage: 200 }),
  ]);
  const total =
    trainings.items.filter((t) => t.is_placeholder).length +
    lecturers.items.filter((l) => l.is_placeholder).length +
    testimonials.items.filter((t) => t.is_placeholder).length;
  return { total };
}
