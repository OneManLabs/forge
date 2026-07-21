import type { FilePayload } from "./types";

/**
 * Regex-based scan that looks for the "mobile-first violations" banned
 * in the CODE_SYSTEM_PROMPT. It's a safety net for when the Code agent
 * slips — we flag it in the UI so the user knows a regen might be
 * needed before sharing the design.
 *
 * All patterns use a negative lookbehind `(?<![a-z0-9:-])` to ensure we
 * don't flag classes that DO have a breakpoint prefix (e.g. `md:grid-cols-3`
 * has `:` just before `grid-cols-3`, which is excluded by the lookbehind
 * and therefore NOT flagged).
 */

export type ResponsiveSeverity = "error" | "warning";

export interface ResponsiveViolation {
  path: string;
  line: number;
  column: number;
  rule: string;
  title: string;
  severity: ResponsiveSeverity;
  /** The offending line, trimmed. */
  snippet: string;
  /** Concrete fix suggestion shown to the user. */
  suggestion: string;
}

interface RuleDef {
  id: string;
  title: string;
  severity: ResponsiveSeverity;
  pattern: RegExp;
  /** Build the fix suggestion from the regex match. Return empty string to skip. */
  suggest: (match: RegExpExecArray, line: string) => string;
  /** Per-line guard that can suppress false positives (e.g. flex-col present). */
  skipIf?: (line: string) => boolean;
}

const RULES: RuleDef[] = [
  {
    id: "grid-cols-base",
    title: "Multi-column grid without responsive prefix",
    severity: "warning",
    pattern: /(?<![a-zA-Z0-9:-])(grid-cols-(?:[2-9]|1[0-2]))\b/g,
    suggest: (m) => `"${m[1]}" → "grid-cols-1 md:${m[1]}" (base should be 1 column on mobile)`,
  },
  {
    id: "text-huge-base",
    title: "Very large display type without scaling down",
    severity: "error",
    pattern: /(?<![a-zA-Z0-9:-])(text-(?:[7-9]xl))\b/g,
    suggest: (m) => `"${m[1]}" → "text-4xl md:text-6xl lg:${m[1]}" (overflows a 390px viewport)`,
  },
  {
    id: "fixed-width",
    title: "Fixed pixel width ≥ 400px",
    severity: "error",
    pattern: /(?<![a-zA-Z-])(w|max-w|min-w)-\[(\d{3,})(?:px)?\]/g,
    suggest: (m) => {
      const value = parseInt(m[2], 10);
      if (value < 400) return "";
      return `"${m[0]}" → "w-full max-w-[${m[2]}px] mx-auto" (fixed widths clip on mobile)`;
    },
  },
  {
    id: "big-padding-base",
    title: "Desktop-size padding without a smaller mobile base",
    severity: "warning",
    pattern: /(?<![a-zA-Z0-9:-])(p[xy]?-(?:1[6-9]|2[0-9]|3[0-2]))\b/g,
    suggest: (m) => `"${m[1]}" → "${m[1].replace(/-\d+$/, "-4")} md:${m[1]}" (start tighter on mobile)`,
  },
  {
    id: "flex-row-no-stack",
    title: "flex-row with no flex-col fallback",
    severity: "warning",
    pattern: /(?<![a-zA-Z0-9:-])flex-row\b/g,
    suggest: () => `Use "flex-col md:flex-row" so the row stacks on mobile`,
    // Skip when the same line already pairs flex-row with flex-col (the
    // fix is in place) or when it's a ghost/icon context we can ignore.
    skipIf: (line) => /flex-col\b/.test(line),
  },
  {
    id: "nav-no-hamburger",
    title: "Wide nav with no mobile collapse",
    severity: "warning",
    // Heuristic: a <nav ...> element whose root className uses flex-row
    // but doesn't have `md:flex` / `md:hidden` in the same className.
    pattern: /<nav[^>]*className="([^"]*flex-row[^"]*)"/g,
    suggest: () =>
      `Hide the horizontal nav on mobile ("hidden md:flex") and add a "md:hidden" hamburger button`,
    skipIf: (line) => /(md:flex|md:hidden|lg:flex|lg:hidden)/.test(line),
  },
  {
    id: "fixed-style-width",
    title: "Inline style with fixed pixel width",
    severity: "warning",
    pattern: /(?:width|minWidth|maxWidth):\s*['"]?(\d{3,})(?:px)?['"]?/g,
    suggest: (m) => {
      const value = parseInt(m[1], 10);
      if (value < 400) return "";
      return `Inline width of ${value}px — replace with "width: '100%'" + a responsive max-width class`;
    },
  },
];

export function scanFilesForResponsive(files: FilePayload[]): ResponsiveViolation[] {
  const out: ResponsiveViolation[] = [];
  for (const file of files) {
    if (file.language !== "jsx" && file.language !== "html") continue;
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const rule of RULES) {
        if (rule.skipIf && rule.skipIf(line)) continue;
        rule.pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = rule.pattern.exec(line)) !== null) {
          const suggestion = rule.suggest(m, line);
          if (!suggestion) continue; // rule opted out for this match
          out.push({
            path: file.path,
            line: i + 1,
            column: m.index + 1,
            rule: rule.id,
            title: rule.title,
            severity: rule.severity,
            snippet: line.trim().slice(0, 160),
            suggestion,
          });
        }
      }
    }
  }
  // Sort by severity first, then by path, then by line.
  out.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.line - b.line;
  });
  return out;
}

export function countBySeverity(
  violations: ResponsiveViolation[],
): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const v of violations) {
    if (v.severity === "error") errors++;
    else warnings++;
  }
  return { errors, warnings };
}
