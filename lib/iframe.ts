import type { FilePayload } from "./types";

/**
 * Turn the multi-file project tree into a single HTML string that an iframe
 * can render via `srcDoc`. We inline every referenced CSS / JS file and
 * every component HTML partial.
 *
 * The entry file is `forge.html`. Everything else is resolved by path.
 *
 * Rules:
 * - <link rel="stylesheet" href="PATH">  →  <style data-forge-inlined="PATH">…</style>
 * - <script src="PATH"></script>         →  <script data-forge-inlined="PATH">…</script>
 * - components/*.html (any path starting with "components/") → inlined
 *   before </body> as a hidden <div data-forge-component-file="PATH">…</div>,
 *   so the mount() script in app.js can cloneNode the <template data-component>
 *   blocks inside them exactly as if they'd been written inline.
 *
 * Any reference whose path isn't in the files map is left alone (browsers
 * will 404 it in the sandboxed iframe, which surfaces the problem visibly).
 */
export function assembleForPreview(files: FilePayload[]): string | null {
  if (!files || files.length === 0) return null;
  const byPath = new Map<string, FilePayload>();
  for (const f of files) byPath.set(normalizePath(f.path), f);

  const entry = byPath.get("forge.html") ?? files.find((f) => f.language === "html") ?? null;
  if (!entry) return null;

  let html = entry.content;

  html = html.replace(
    /<link\s+([^>]*?)rel\s*=\s*["']stylesheet["']([^>]*?)>/gi,
    (match, before: string, after: string) => {
      const hrefMatch = (before + after).match(/href\s*=\s*["']([^"']+)["']/i);
      if (!hrefMatch) return match;
      const href = normalizePath(hrefMatch[1]);
      const file = byPath.get(href);
      if (!file) return match;
      return `<style data-forge-inlined="${escapeAttr(href)}">\n${file.content}\n</style>`;
    },
  );

  html = html.replace(
    /<script([^>]*)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (match, before: string, src: string, after: string) => {
      const href = normalizePath(src);
      const file = byPath.get(href);
      const rest = (before + " " + after).replace(/\s+/g, " ").trim();
      // External URLs pass through untouched (react, tailwind, babel CDN).
      if (/^https?:\/\//i.test(src)) return match;
      if (file) {
        const restAttrs = rest.length > 0 ? " " + rest : "";
        return `<script${restAttrs} data-forge-inlined="${escapeAttr(href)}">\n${file.content}\n</script>`;
      }
      // Missing file — the Code agent referenced a component it never
      // actually emitted. Browsers would hit the dev server with a CORS
      // failure (srcDoc iframes have origin "null"), then App.jsx would
      // throw "X is not defined". Replace with a tiny stub that attaches
      // a visible placeholder to window so the rest of the page still
      // renders and the user sees exactly which component is missing.
      const compName = guessComponentName(href);
      if (!compName) {
        // Not a components/*.jsx path — drop the tag entirely so the
        // browser doesn't try to fetch a nonexistent URL.
        return `<!-- forge: dropped missing script ${escapeAttr(href)} -->`;
      }
      const stub = `
// forge: placeholder for missing file "${href}"
(function(){
  var Placeholder = function(){
    return React.createElement('div', {
      style: {
        padding: '12px 14px',
        margin: '6px 0',
        border: '1px dashed rgba(255, 120, 60, 0.6)',
        borderRadius: '6px',
        background: 'rgba(255, 120, 60, 0.08)',
        color: '#ff9a6c',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '11px',
        lineHeight: '1.4',
        letterSpacing: '0.02em'
      }
    }, 'Missing component: ${compName} (${href})');
  };
  Object.assign(window, { ${compName}: Placeholder });
})();
      `.trim();
      // Stub uses React.createElement (plain JS), so drop type="text/babel"
      // from the original attributes — Babel doesn't need to process it.
      const plainAttrs = rest.replace(/\btype\s*=\s*["']text\/babel["']/gi, "").trim();
      const prefix = plainAttrs.length > 0 ? " " + plainAttrs : "";
      return `<script${prefix} data-forge-placeholder="${escapeAttr(href)}">\n${stub}\n</script>`;
    },
  );

  // Append any components/*.html files that weren't explicitly referenced —
  // inject them as hidden containers before </body> so their <template>
  // blocks are reachable by the mount() script.
  const componentFiles = files.filter(
    (f) => f.language === "html" && f.path !== "forge.html" && f.path.startsWith("components/"),
  );
  if (componentFiles.length > 0) {
    const blob = componentFiles
      .map(
        (f) =>
          `<div data-forge-component-file="${escapeAttr(f.path)}" hidden>\n${f.content}\n</div>`,
      )
      .join("\n");
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${blob}\n</body>`);
    } else {
      html += "\n" + blob;
    }
  }

  return html;
}

function normalizePath(p: string): string {
  return p.replace(/^\.\//, "").replace(/^\//, "");
}

/** Turn `components/TickerBar.jsx` → `TickerBar`. Returns null for paths
 *  that don't look like a component file (e.g. `data.js`, `tokens.css`). */
function guessComponentName(href: string): string | null {
  const m = /components\/([A-Z][A-Za-z0-9_]*)\.(?:jsx|tsx|js)$/.exec(href);
  return m ? m[1] : null;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
