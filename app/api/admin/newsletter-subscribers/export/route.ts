import { db } from "@/lib/queries";
import { requireContentRole, AdminAuthError } from "@/lib/admin/role-check";
import { toCsv, csvResponse } from "@/lib/admin/csv";

export async function GET() {
  try {
    await requireContentRole();
  } catch (err) {
    const status = err instanceof AdminAuthError ? 403 : 500;
    return new Response("Forbidden", { status });
  }

  const { items } = await db.listNewsletterSubscribersAdmin({ perPage: 10_000 });
  const csv = toCsv(
    ["אימייל", "סטטוס", "מקור", "תאריך הסכמה", "תאריך יצירה"],
    items.map((s) => [s.email, s.status, s.source ?? "", s.consent_at, s.created_at]),
  );
  return csvResponse(csv, "newsletter-subscribers.csv");
}
