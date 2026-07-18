/**
 * §3.5: "SVGs sanitized on upload (strip <script>, onload, external refs —
 * an unsanitized SVG upload is an XSS vector)." This is the first real
 * runtime SVG upload path in the app (the DiceBear avatar fixtures were
 * sanitized by hand, once, offline, before being committed — see
 * docs/licenses.md) — the Media Library's upload route is what actually
 * needs this to run on every request now.
 *
 * Deliberately dependency-free regex/string sanitization rather than
 * pulling in a DOM/XML parser: this runs in a Node Server Action/Route
 * Handler (no DOMParser available without `jsdom`, an unjustified new
 * dependency for this one narrow task). The rules are conservative and
 * allow-list-flavored: strip anything that can execute script or reach an
 * external host, keep everything else (paths, shapes, gradients, etc.)
 * intact so legitimate design SVGs still render.
 */
export interface SvgSanitizeResult {
  html: string;
  removedScript: boolean;
  removedEventHandlers: boolean;
  removedExternalRefs: boolean;
}

export function sanitizeSvg(raw: string): SvgSanitizeResult {
  let svg = raw;
  let removedScript = false;
  let removedEventHandlers = false;
  let removedExternalRefs = false;

  // 1. Strip <script>...</script> blocks entirely.
  const scriptRe = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
  if (scriptRe.test(svg)) {
    removedScript = true;
    svg = svg.replace(scriptRe, "");
  }
  // Self-closing/empty <script/> too.
  const scriptSelfClose = /<script\b[^>]*\/>/gi;
  if (scriptSelfClose.test(svg)) {
    removedScript = true;
    svg = svg.replace(scriptSelfClose, "");
  }

  // 2. Strip on*="..." / on*='...' event handler attributes (onload,
  // onclick, onerror, onmouseover, ...).
  const eventAttrRe = /\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
  if (eventAttrRe.test(svg)) {
    removedEventHandlers = true;
    svg = svg.replace(eventAttrRe, "");
  }

  // 3. Strip <foreignObject> (can embed arbitrary HTML/script) entirely.
  svg = svg.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, () => {
    removedScript = true;
    return "";
  });

  // 4. Strip external references: href/xlink:href pointing at http(s)/data
  // URLs that aren't a local fragment (#...), plus any <image> tag pulling
  // a remote bitmap. Keep in-document fragment refs (e.g. gradient/clip-path
  // "#id") since those are the normal, safe use of href inside an SVG.
  svg = svg.replace(
    /\s(?:xlink:href|href)\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi,
    (match, val: string) => {
      const inner = val.slice(1, -1);
      if (/^(https?:)?\/\//i.test(inner) || /^data:(?!image\/(png|jpe?g|gif|webp);base64,)/i.test(inner)) {
        removedExternalRefs = true;
        return "";
      }
      return match;
    },
  );

  // 5. Strip any remaining <style> blocks that contain `url(` pointing
  // off-document (CSS-based exfiltration/tracking vector).
  svg = svg.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (full, body: string) => {
    if (/url\(\s*['"]?(https?:)?\/\//i.test(body)) {
      removedExternalRefs = true;
      return "";
    }
    return full;
  });

  return { html: svg, removedScript, removedEventHandlers, removedExternalRefs };
}
