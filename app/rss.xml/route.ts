import { db } from "@/lib/queries";

/**
 * `/rss.xml` (§4, §9) — RSS feed for the blog. Plain Route Handler (no RSS
 * library dependency — the feed shape is simple enough to hand-build, and
 * §2's fixed tech stack doesn't list one). Published-only posts only
 * (`db.listPosts()` already filters via the two independent status/date
 * checks per §5.5 rule 4 — no re-filtering here).
 *
 * XML-escaping: titles/excerpts are user/admin-authored Hebrew text, so
 * `&`, `<`, `>` are escaped before interpolation — this is the one new
 * route this pass that hand-builds XML instead of using a typed builder,
 * so it's the one place that needs an explicit escape helper.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function GET() {
  const base = siteUrl();
  const { items: posts } = await db.listPosts({ perPage: 50 });

  const items = posts
    .map((post) => {
      const link = `${base}/blog/${encodeURIComponent(post.slug)}`;
      const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : undefined;
      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <description>${escapeXml(post.excerpt)}</description>
  ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>מכללת אשד — בלוג</title>
  <link>${base}/blog</link>
  <description>מאמרים, כלים, ומחשבות מהעולם של מכללת אשד.</description>
  <language>he-IL</language>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
