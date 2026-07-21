/**
 * Tiny token-aware highlighter for HTML, CSS, and JSON.
 * Returns an HTML string with <span class="hl-*"> wrappers — pair with the
 * .hl-* CSS classes in globals.css.
 *
 * Not a full tokenizer — covers the common cases enough to make code
 * readable. Falls back to plain-text escaping for anything weird.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlightHtml(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i);
      const close = end === -1 ? src.length : end + 3;
      out += `<span class="hl-comment">${escapeHtml(src.slice(i, close))}</span>`;
      i = close;
    } else if (src.startsWith("<!", i) || src.startsWith("<?", i)) {
      const end = src.indexOf(">", i);
      const close = end === -1 ? src.length : end + 1;
      out += `<span class="hl-comment">${escapeHtml(src.slice(i, close))}</span>`;
      i = close;
    } else if (src[i] === "<") {
      const end = src.indexOf(">", i);
      const close = end === -1 ? src.length : end + 1;
      const tag = src.slice(i, close);
      const m = tag.match(/^(<\/?)([a-zA-Z][\w-]*)([\s\S]*?)(\/?>)$/);
      if (m) {
        const [, openBracket, name, rawAttrs, tagEnd] = m;
        const attrsHl = rawAttrs.replace(
          /([\w:.-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/g,
          (_full, n: string, eq: string, v: string) =>
            `<span class="hl-attr">${escapeHtml(n)}</span>${escapeHtml(eq)}<span class="hl-str">${escapeHtml(v)}</span>`,
        );
        out += `<span class="hl-tag">${escapeHtml(openBracket)}${escapeHtml(name)}</span>${attrsHl}<span class="hl-tag">${escapeHtml(tagEnd)}</span>`;
      } else {
        out += escapeHtml(tag);
      }
      i = close;
    } else {
      const next = src.indexOf("<", i);
      const end = next === -1 ? src.length : next;
      out += escapeHtml(src.slice(i, end));
      i = end;
    }
  }
  return out;
}

export function highlightCss(src: string): string {
  // Comments first (replace, then escape the rest piecewise).
  const tokens: Array<{ kind: "comment" | "rest"; text: string }> = [];
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf("/*", i);
    if (start === -1) {
      tokens.push({ kind: "rest", text: src.slice(i) });
      break;
    }
    if (start > i) tokens.push({ kind: "rest", text: src.slice(i, start) });
    const end = src.indexOf("*/", start + 2);
    const close = end === -1 ? src.length : end + 2;
    tokens.push({ kind: "comment", text: src.slice(start, close) });
    i = close;
  }
  return tokens
    .map((t) => {
      if (t.kind === "comment") {
        return `<span class="hl-comment">${escapeHtml(t.text)}</span>`;
      }
      const escaped = escapeHtml(t.text);
      // Selectors (rough): lines ending with { wrap the part before { as hl-tag
      let out = escaped.replace(/(--[\w-]+)/g, '<span class="hl-attr">$1</span>');
      out = out.replace(/([a-zA-Z-]+)(\s*:\s*)/g, '<span class="hl-attr">$1</span>$2');
      out = out.replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="hl-str">$1</span>');
      out = out.replace(/\b(oklch|rgb|rgba|hsl|hsla|var|calc)\(/g, '<span class="hl-tag">$1</span>(');
      return out;
    })
    .join("");
}

export function highlightJson(src: string): string {
  const escaped = escapeHtml(src);
  return escaped
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="hl-attr">$1</span>$2')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, (_full, str: string) => `: <span class="hl-str">${str}</span>`)
    .replace(/\b(true|false|null)\b/g, '<span class="hl-tag">$1</span>')
    .replace(/(?<![a-zA-Z_])(-?\d+(?:\.\d+)?)/g, '<span class="hl-str">$1</span>');
}

export function highlightMarkdown(src: string): string {
  const escaped = escapeHtml(src);
  return escaped
    .replace(/^(#{1,6} .*)$/gm, '<span class="hl-tag">$1</span>')
    .replace(/(\*\*[^*]+\*\*|__[^_]+__)/g, '<span class="hl-attr">$1</span>')
    .replace(/`([^`]+)`/g, '<span class="hl-str">`$1`</span>');
}
