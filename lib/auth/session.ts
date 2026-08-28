/**
 * Signed session cookie for self-hosted mode — the replacement for the
 * Supabase Auth JWT.
 *
 * Deliberately NOT importing "server-only": middleware.ts runs on the Edge
 * runtime and has to verify this cookie there. That constraint also rules
 * out node:crypto, so signing uses Web Crypto's HMAC-SHA256, which exists
 * in both runtimes.
 *
 * Format: <base64url(payload)>.<base64url(hmac)>
 *
 * The payload is readable by anyone holding the cookie — it carries no
 * secret, only the user id, and the signature is what makes it
 * unforgeable. Role is deliberately NOT stored: it is read from `profiles`
 * on each request (lib/admin/dev-session.ts), so revoking or demoting a
 * user takes effect immediately instead of waiting out their cookie.
 */
export const SESSION_COOKIE_NAME = "hnn_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  /** auth.users.id */
  sub: string;
  /** issued at, epoch seconds */
  iat: number;
  /** expires at, epoch seconds */
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Typed as Uint8Array<ArrayBuffer> rather than plain Uint8Array: Web
// Crypto's BufferSource excludes SharedArrayBuffer-backed views, which the
// default ArrayBufferLike parameter would allow.
function b64urlDecode(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    // Failing loudly beats signing with a guessable fallback: a weak secret
    // here means anyone can mint an admin session.
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return value;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { sub: userId, iat: now, exp: now + MAX_AGE_SECONDS };
  const encoded = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(encoded));
  return `${encoded}.${b64urlEncode(new Uint8Array(signature))}`;
}

/** Returns the payload only if the signature is valid AND unexpired. */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const dot = token.indexOf(".");
  if (dot === -1) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(),
      b64urlDecode(signature),
      new TextEncoder().encode(encoded),
    );
    if (!ok) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(encoded))) as SessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    // Malformed base64, malformed JSON, or a bad signature all mean the
    // same thing to the caller: no valid session.
    return null;
  }
}

/**
 * `secure` follows the site's actual protocol, not NODE_ENV.
 *
 * A secure cookie is only ever sent back over HTTPS. Keying that off
 * NODE_ENV=production broke every production deployment served over plain
 * HTTP — sign-in appeared to succeed, the browser then withheld the cookie,
 * and the next action bounced back to the login screen. That is exactly
 * what a server running on a bare IP before its domain exists looks like.
 *
 * NEXT_PUBLIC_SITE_URL is the site's own address, so it answers the real
 * question: will the browser be talking HTTPS? Once the domain and
 * certificate are in place the URL becomes https:// and the flag turns
 * itself on.
 */
function isHttpsSite(): boolean {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) return false;
  return url.trim().toLowerCase().startsWith("https://");
}

// A function, not a const: a module-level object would be evaluated during
// the build, freezing whatever NEXT_PUBLIC_SITE_URL the build container
// happened to have. Reading it per call means the running container's value
// decides, which is what matters — and it means adding a domain later takes
// effect on restart rather than needing a rebuild.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: isHttpsSite(),
  } as const;
}

export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
