import { NextResponse } from "next/server";
import { db } from "@/lib/queries";
import { requireContentRole, AdminAuthError } from "@/lib/admin/role-check";

/**
 * Read-only JSON endpoint backing `<MediaPickerField>`'s search-as-you-type
 * grid. A plain Server Action isn't a great fit for "call on every
 * keystroke with debounce" (no natural cancellation, and every call would
 * be a fresh RSC action round-trip) — a small GET Route Handler is the
 * standard Next.js pattern for this kind of client-driven list fetch.
 * Role-checked the same as any other admin data access (§8).
 */
export async function GET(req: Request) {
  try {
    await requireContentRole();
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const perPage = Number(url.searchParams.get("perPage") ?? 60);
    const result = await db.listMedia({ q, perPage });
    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof AdminAuthError ? 403 : 500;
    return NextResponse.json({ items: [], total: 0 }, { status });
  }
}
