/**
 * Guaranteed line-break formatter for Claude output that arrives as a wall
 * of text (no \n escapes in JSON strings).
 *
 * This is intentionally defensive: if the tokenizer pass doesn't produce
 * enough newlines, we fall back to an aggressive "newline after every `>`"
 * pass that WILL produce multi-line output, guaranteed.
 */

import type { FileLanguage } from "./types";

export function ensureLineBreaks(content: string, language: FileLanguage): string {
  if (content.length < 200) return content;
  const realNewlines = (content.match(/\n/g) || []).length;
  // Well-formatted code has roughly 1 newline per 80–120 chars. If the
  // source already has a reasonable density, leave it alone.
  const minimumExpected = Math.floor(content.length / 120);
  if (realNewlines >= minimumExpected && realNewlines >= 10) return content;

  switch (language) {
    case "html":
    case "jsx":
      return formatHtml(content);
    case "css":
      return formatCss(content);
    case "js":
    case "json":
      return formatJs(content);
    default:
      return content;
  }
}

const BLOCK_OPEN = /^<[a-zA-Z]/;
const BLOCK_CLOSE = /^<\//;
const SELF_CLOSE = /\/\s*>$/;

// Tags that shouldn't bump indentation (inline phrasing content).
const INLINE_TAGS = new Set([
  "a", "span", "em", "strong", "b", "i", "u", "small", "sub", "sup",
  "code", "kbd", "var", "samp", "br", "hr", "img", "input", "meta", "link",
]);

function formatHtml(src: string): string {
  // Step 1: ensure there's at least one newline between adjacent tags.
  let out = src.replace(/>(\s*)</g, ">\n<");

  // Step 2: if the result is still basically one line, force a newline after
  // EVERY `>`. This will over-break but we clean up next.
  if (out.split("\n").length < 10 && src.length > 400) {
    out = out.replace(/>/g, ">\n");
  }

  // Step 3: Split into non-empty lines and indent based on tag open/close.
  const rawLines = out.split("\n");
  const indented: string[] = [];
  let depth = 0;
  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;

    const startsWithClose = BLOCK_CLOSE.test(line);
    if (startsWithClose) depth = Math.max(0, depth - 1);
    indented.push("  ".repeat(depth) + line);
    // Decide whether this line opens a new block that should bump indent.
    if (BLOCK_OPEN.test(line) && !startsWithClose && !SELF_CLOSE.test(line)) {
      // Extract tag name and skip inline tags + tags that close on the same line.
      const nameMatch = line.match(/^<\s*([a-zA-Z][\w-]*)/);
      const name = nameMatch ? nameMatch[1].toLowerCase() : "";
      const closesOnSameLine = new RegExp(`</\\s*${name}\\s*>\\s*$`).test(line);
      if (!closesOnSameLine && !INLINE_TAGS.has(name)) depth++;
    }
  }
  return indented.join("\n") + "\n";
}

function formatCss(src: string): string {
  let out = src;
  out = out.replace(/\s*\{\s*/g, " {\n  ");
  out = out.replace(/\s*\}\s*/g, "\n}\n\n");
  out = out.replace(/;\s*/g, ";\n  ");
  out = out.replace(/\n\s*\n}/g, "\n}");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim() + "\n";
}

function formatJs(src: string): string {
  let out = src;
  // Only touch when it's clearly one-line. Avoid breaking strings with
  // embedded braces/semicolons by only operating when real newlines are rare.
  if (out.split("\n").length >= 5) return out;
  out = out.replace(/\{(?!\s*[\n"'])/g, "{\n  ");
  out = out.replace(/\}(?!\s*[\n,;)\]])/g, "\n}\n");
  out = out.replace(/;(?!\s*[\n}"'])/g, ";\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim() + "\n";
}

export function ensureLineBreaksBulk<T extends { content: string; language: FileLanguage }>(
  files: T[],
): T[] {
  return files.map((f) => ({ ...f, content: ensureLineBreaks(f.content, f.language) }));
}
