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
  "*": new Set(["lang", "dir"]),
};

/** Tags whose content goes too, not just the tag. */
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|form|input|button|noscript|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const DROP_SELF_CLOSING = /<(script|style|iframe|object|embed|form|input|button|link|meta)\b[^>]*\/?>/gi;

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
    }

    return `<${name}${kept.length ? " " + kept.join(" ") : ""}>`;
  });

  // 4. Collapse the empty paragraphs the removals leave behind.
  html = html.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "");
  html = html.replace(/(\s*<br\s*\/?>\s*){3,}/gi, "<br><br>");

  return html.trim();
}
