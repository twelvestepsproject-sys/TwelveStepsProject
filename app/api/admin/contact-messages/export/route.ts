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

  const { items } = await db.listContactMessagesAdmin({ perPage: 10_000 });
  const csv = toCsv(
    ["שם", "אימייל", "טלפון", "הודעה", "עמוד מקור", "תאריך יצירה"],
    items.map((c) => [c.name, c.email, c.phone ?? "", c.message, c.source_page ?? "", c.created_at]),
  );
  return csvResponse(csv, "contact-messages.csv");
}
