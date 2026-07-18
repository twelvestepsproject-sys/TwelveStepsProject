import { db } from "@/lib/queries";
import { requireContentRole, AdminAuthError } from "@/lib/admin/role-check";
import { toCsv, csvResponse } from "@/lib/admin/csv";

/**
 * §8 "CSV export" for leads. Gated the same way as every mutating Server
 * Action (requireContentRole — leads are editor+admin per nav-config's
 * pre-set minRole), even though this is a read/export rather than a
 * mutation: leads are real (fictional but PII-shaped) personal data, so
 * this must not be reachable by an unauthenticated request just because
 * it's a Route Handler instead of a Server Action.
 */
export async function GET() {
  try {
    await requireContentRole();
  } catch (err) {
    const status = err instanceof AdminAuthError ? 403 : 500;
    return new Response("Forbidden", { status });
  }

  const { items } = await db.listLeadsAdmin({ perPage: 10_000 });
  const csv = toCsv(
    ["שם פרטי", "שם משפחה", "אימייל", "טלפון", "עמוד מקור", "סטטוס", "הערות", "תאריך יצירה"],
    items.map((l) => [
      l.first_name,
      l.last_name,
      l.email,
      l.phone,
      l.source_page ?? "",
      l.status,
      l.notes ?? "",
      l.created_at,
    ]),
  );
  return csvResponse(csv, "leads.csv");
}
