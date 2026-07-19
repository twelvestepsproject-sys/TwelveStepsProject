import "server-only";

/**
 * lib/actions/rate-limit.ts — simple in-memory IP rate limiter for the
 * public form Server Actions (§11: "Honeypot + IP rate limit").
 *
 * KNOWN LIMITATION (flagged per task brief, do not silently hide this):
 * this is a `Map<string, number[]>` living in the Node process's memory.
 * It resets on every server restart/redeploy, and it is NOT shared across
 * instances — if this app is ever horizontally scaled to multiple Node
 * processes/containers/serverless instances, each instance gets its own
 * independent counter, so the effective limit becomes
 * "N submissions per IP per window, PER INSTANCE," not a true global limit.
 * That's acceptable for a single-server deployment (current target) but
 * would need a shared store (Redis, Upstash, Supabase table with a
 * timestamp column, etc.) before scaling out. Not over-engineered here on
 * purpose — flagging it instead.
 */

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

const requestLog = new Map<string, number[]>();

/**
 * Returns true if `key` (typically an IP address, optionally namespaced by
 * form name) is currently OVER the allowed rate and the request should be
 * rejected.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(key) ?? [];
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    // Still record the window we filtered down to, so memory doesn't grow
    // unbounded for a repeatedly-hammering IP.
    requestLog.set(key, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

/**
 * Best-effort extraction of the requesting IP from the headers Next.js's
 * Server Action context exposes. There is no direct "request.ip" available
 * to a Server Action (that's a Route Handler / middleware concept) — the
 * documented way to get a client IP here is reading the proxy headers off
 * `next/headers`'s `headers()`, same as Vercel's own edge network sets them.
 * Falls back to a constant so rate limiting still applies (grouped
 * together) rather than silently no-op'ing when no header is present, e.g.
 * in local dev without a proxy in front.
 */
export function extractIp(headerList: Headers): string {
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list; the first entry is the
    // original client.
    return forwardedFor.split(",")[0]!.trim();
  }
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
