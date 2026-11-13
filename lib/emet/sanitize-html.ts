/**
 * Cleans a migrated article body before it is rendered as HTML.
 *
 * The bodies come from twenty years of another site's WordPress, so they
 * are neither trusted nor tidy. Rendering them with `dangerouslySetInnerHTML`
 * is the right call — plain text would lose the paragraphs, headings and
 * blockquotes the articles are made of — but only behind this.
 *
 * Allowlist, not blocklist: anything not named here is unwrapped, keeping
 * its text. A blocklist only ever excludes the attacks someone thought of.
 *
 * This runs on the server at render time, and the database keeps the
 * original untouched, so nothing here is destructive — the raw body is
 * always recoverable and the admin edits the real thing.
 */

/** Tags worth keeping. Everything else is unwrapped, text intact. */
const ALLOWED_TAGS = new Set([
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "small",
  "ul", "ol", "li", "dl", "dt", "dd",
  "blockquote", "q", "cite",
  "a", "img", "figure", "figcaption",
  // The lectures are <video> with an external <source>. Without these two
  // the tags were unwrapped, leaving only the "your browser doesn't
  // support video" fallback the markup carries for old browsers — which
  // is what readers saw.
  "video", "source",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "span", "div", "section", "article",
  "pre", "code",
]);

/** Attributes worth keeping, per tag. Nothing else survives — which is
 *  what removes every `on*` handler and every `style` in one stroke. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel", "lang", "dir"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  // No `autoplay`: a lecture that starts talking on its own is hostile,
  // and browsers block it unmuted anyway. `controls` and `preload` are
  // added below when the body omits them, so a player is always usable
  // and never downloads a video nobody asked to watch.
  video: new Set(["src", "controls", "poster", "width", "height", "preload", "playsinline", "muted", "loop"]),
  source: new Set(["src", "type"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  td: new Set(["colspan", "rowspan"]),
  "*": new Set(["lang", "dir", "class"]),
};

/**
 * The only class names a body may carry.
 *
 * `class` is allowed, but not freely: an arbitrary class lets content
 * reach into the site's stylesheet and restyle anything it names, and a
 * body that sets `class="admin-bar"` or a utility class would move or
 * hide parts of the page around it. These are the names the editor uses
 * for chapter layout, each with styling defined in emet-prose.css, and
 * anything else is dropped with the rest.
 *
 * `style` stays unavailable. It is a layout decision made per post that
 * no stylesheet can later correct, and it does not survive a redesign.
 */
const ALLOWED_CLASSES = new Set([
  "lead-q",
  "part-cards",
  "part-card",
  "part-card-text",
]);

/** Keeps the allowed class names and drops the rest. Returns "" when
 *  nothing survives, so the attribute is omitted rather than left empty. */
function filterClasses(value: string): string {
  return value
    .split(/\s+/)
    .filter((c) => ALLOWED_CLASSES.has(c))
    .join(" ");
}

/** Tags whose content goes too, not just the tag. */
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|form|input|button|noscript|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const DROP_SELF_CLOSING = /<(script|style|iframe|object|embed|form|input|button|link|meta)\b[^>]*\/?>/gi;

/**
 * The only hosts an <iframe> may point at.
 *
 * An iframe runs another site's page inside this one, so the host is the
 * whole of the trust decision. These two serve a video player and nothing
 * else; youtube-nocookie.com is the same player without the tracking
 * cookies. Both are matched on the FULL host, never as a substring:
 * "youtube.com.evil.test" contains the string and is a different site.
 *
 * Path matters too. Only /embed/<id> is a player; youtube.com/<anything>
 * else is an ordinary page that has no business in a frame here.
 */
const IFRAME_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

/**
 * Returns a normalised https embed URL, or null if this is not one.
 *
 * Parsed with URL() rather than matched with a regex: a regex over a URL
 * has to get userinfo, ports, backslashes and encoded characters right,
 * and "https://www.youtube.com@evil.test/embed/x" reads as youtube to a
 * careless pattern while the browser goes to evil.test. The parser
 * already knows these rules.
 */
function youtubeEmbedUrl(raw: string): string | null {
  let u: URL;
  try {
    // A protocol-relative //host/path has no scheme for the parser, and
    // the bodies carry http:// from the WordPress era; both become https.
    u = new URL(raw.trim().replace(/^\/\//, "https://"));
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  // A username or password before the host is only ever an attempt to
  // make the host look like something it is not.
  if (u.username || u.password) return null;
  if (!IFRAME_HOSTS.has(u.hostname.toLowerCase())) return null;
  if (!/^\/embed\/[A-Za-z0-9_-]+$/.test(u.pathname)) return null;

  // Rebuilt rather than passed through, so only the parts named here
  // survive. The query is dropped: it carries player options nobody set
  // deliberately in this content, and an unexpected one is not worth
  // carrying.
  u.protocol = "https:";
  u.search = "";
  u.hash = "";
  return u.toString();
}

/** A URL is safe if it cannot execute. `javascript:` and `data:` are the
 *  two that can, and both have been smuggled past naive checks with
 *  whitespace and entities, so they are stripped before testing. */
function safeUrl(value: string): string | null {
  const bare = value.replace(/[\u0000- ]/g, "").replace(/&#?\w+;/g, "").toLowerCase();
  if (bare.startsWith("javascript:") || bare.startsWith("data:") || bare.startsWith("vbscript:")) {
    return null;
  }
  return value;
}

export function sanitizeArticleHtml(input: string): string {
  if (!input) return "";

  let html = input;

  // 0. Lift out the YouTube players before anything else runs.
  //
  // Step 1 deletes every <iframe> with its content, and the tag walk in
  // step 3 would unwrap any that survived, so a player cannot be kept by
  // allowing the tag: the markup is gone before the walk sees it. It is
  // replaced by a placeholder here and written back at the end, which
  // leaves the drop rules below exactly as strict as they were.
  //
  // This is what made the source-55 video vanish in the migration: the
  // body still holds its <iframe>, and the reader saw nothing.
  //
  // The placeholder uses characters that cannot appear in HTML text —
  // the body is escaped by the time it reaches a reader — and anything
  // in the source that resembles one is removed first, so content cannot
  // forge a slot and have an arbitrary iframe written into it.
  const players: string[] = [];
  html = html.replace(/\u0000EMET_YT_\d+\u0000/g, "");
  html = html.replace(/<iframe\b[^>]*>(?:[\s\S]*?<\/iframe\s*>)?/gi, (tag) => {
    const src = /\ssrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(tag);
    const url = src ? youtubeEmbedUrl(src[2] ?? src[3] ?? src[4] ?? "") : null;
    if (!url) return ""; // not a player: dropped exactly as before
    const slot = `\u0000EMET_YT_${players.length}\u0000`;
    players.push(url);
    return slot;
  });

  // 1. Remove the tags that carry executable or layout-breaking content.
  html = html.replace(DROP_WITH_CONTENT, "");
  html = html.replace(DROP_SELF_CLOSING, "");
  // Comments can hide conditional markup; they render as nothing anyway.
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // 2. Joomla-era artifacts. These predate the site's move to WordPress:
  //    {mosimage} marked where an image went, and the images themselves
  //    were referenced by bare filename with no path, so neither resolves
  //    to anything today. They are removed from the reading view because
  //    they are noise on the page — the database keeps the body as
  //    imported, and the import report counts every one for review, so
  //    nothing is lost by hiding them here.
  html = html.replace(/\{mosimage[^}]*\}/gi, "");

  // 3. Walk every remaining tag and strip what is not allowed.
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return ""; // unwrap: text survives, tag does not
    if (match.startsWith("</")) return `</${name}>`;

    const allowed = ALLOWED_ATTRS[name] ?? new Set<string>();
    const global = ALLOWED_ATTRS["*"];
    const kept: string[] = [];

    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(rawAttrs)) !== null) {
      const attr = m[1].toLowerCase();
      if (!allowed.has(attr) && !global.has(attr)) continue;

      let value = m[3] ?? m[4] ?? m[5] ?? "";
      if (attr === "href" || attr === "src") {
        const safe = safeUrl(value);
        if (safe === null) continue;
        value = safe;
      }
      if (attr === "class") {
        value = filterClasses(value);
        // Every name was dropped, so there is no attribute left to write.
        if (value === "") continue;
      }
      kept.push(`${attr}="${value.replace(/"/g, "&quot;")}"`);
    }

    // External links open in a new tab and must not leak the referrer or
    // hand the opener window to the destination.
    //
    // The source already sets rel="noopener" on many of its outbound
    // links, so "add rel only when absent" left those without
    // noreferrer — half the protection, and invisible unless you read the
    // rendered tag. Merge instead: whatever the body declares is kept and
    // both tokens are guaranteed.
    if (name === "a") {
      const href = kept.find((a) => a.startsWith('href="'));
      if (href && /^href="https?:\/\//i.test(href)) {
        const i = kept.findIndex((a) => a.startsWith('rel="'));
        const existing = i >= 0 ? /rel="([^"]*)"/.exec(kept[i])?.[1] ?? "" : "";
        const tokens = new Set(existing.split(/\s+/).filter(Boolean));
        tokens.add("noreferrer");
        tokens.add("noopener");
        const merged = `rel="${[...tokens].join(" ")}"`;
        if (i >= 0) kept[i] = merged;
        else kept.push(merged);
      }
    }
    // Images below the fold by definition — the body starts after the
    // chapter header — so none of them should block first paint.
    if (name === "img" && !kept.some((a) => a.startsWith('loading='))) {
      kept.push('loading="lazy"');
    }
    // A <video> with no controls cannot be played at all once autoplay is
    // stripped, and metadata-only preload keeps a page with several
    // lectures from pulling them all on load.
    if (name === "video") {
      if (!kept.some((a) => a.startsWith("controls"))) kept.push("controls");
      if (!kept.some((a) => a.startsWith("preload="))) kept.push('preload="metadata"');

      // The bodies carry width="353" height="235" from a 2012 layout and
      // a poster like "files/1_4(1).jpg" — a relative path that resolves
      // against the current page and 404s, which is why the player opened
      // on a blank frame. Dropping all three lets the stylesheet size the
      // player to the column instead of pinning it to 353px.
      for (let i = kept.length - 1; i >= 0; i--) {
        const attr = kept[i];
        if (attr.startsWith('width="') || attr.startsWith('height="')) kept.splice(i, 1);
        else if (attr.startsWith('poster="') && !/poster="(https?:|\/)/.test(attr)) {
          kept.splice(i, 1);
        }
      }
    }

    return `<${name}${kept.length ? " " + kept.join(" ") : ""}>`;
  });

  // 4. Collapse the empty paragraphs the removals leave behind.
  html = html.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "");
  html = html.replace(/(\s*<br\s*\/?>\s*){3,}/gi, "<br><br>");

  // 5. Write the players back.
  //
  // The URL came from youtubeEmbedUrl(), which rebuilt it from a parsed
  // host and an /embed/<id> path, so it holds no quote to break out of
  // the attribute. The wrapper carries the 16:9 ratio, since the bodies
  // specify a 2012 pixel size that does not fit a modern column.
  //
  // sandbox is deliberately omitted: it would block the player's own
  // scripts and leave a dead frame. The host allowlist is what makes the
  // frame safe, not an attribute.
  html = html.replace(/\u0000EMET_YT_(\d+)\u0000/g, (_m, i: string) => {
    const url = players[Number(i)];
    if (!url) return "";
    return (
      `<div class="emet-embed">` +
      `<iframe src="${url}" title="YouTube video player" loading="lazy" ` +
      `referrerpolicy="strict-origin-when-cross-origin" ` +
      `allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
      `allowfullscreen></iframe>` +
      `</div>`
    );
  });

  return html.trim();
}
