import { db } from "@/lib/queries";
import { getDevSession } from "@/lib/admin/dev-session";
import { AdminErrorState } from "@/components/admin/states";
import { UsersScreen } from "./users-screen";

/**
 * §8 Users (admin only): "invite, set role, deactivate." Page-level guard
 * here is defense in depth (nav-config.ts already hides this link from
 * non-admins, and every mutating Server Action re-checks via
 * requireAdminRole) — a non-admin who navigates here directly by URL still
 * sees a friendly Hebrew refusal rather than the screen.
 */
export default async function UsersPage() {
  const session = await getDevSession();
  if (session?.role !== "admin") {
    return <AdminErrorState message="עמוד זה זמין למנהל/ת מערכת בלבד." />;
  }

  const { items } = await db.listUsersAdmin({ perPage: 200 });
  return <UsersScreen users={items} canEdit />;
}
