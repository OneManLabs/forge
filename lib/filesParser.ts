/**
 * Resilient parser for the <files> JSON Claude emits.
 *
 * Why not just JSON.parse the whole thing: Claude sometimes emits a bad
 * escape, an unescaped quote in code content, or truncates mid-object.
 * A whole-blob JSON.parse throws and we lose every file in the batch.
 *
 * Instead: walk the buffer with a tiny JSON state machine, extract each
 * complete file object as a substring (treating string content opaquely,
 * respecting backslash escapes), and JSON.parse each one INDEPENDENTLY.
 * One bad file gets skipped; the rest land.
 *
 * Also returns the currently-in-progress file (the one whose closing `}`
 * hasn't arrived yet) so the UI can show "Writing X" truthfully.
 */

export interface ParsedFileRaw {
  path: string;
  content: string;
  language?: string;
}

export interface FilesParseResult {
  /** Files that fully parsed. */
  files: ParsedFileRaw[];
  /** Paths of complete objects seen, in the order they appeared. */
  completedPaths: string[];
  /** Path of the file currently being written (no closing `}` yet), or null. */
  inProgressPath: string | null;
  /** Objects that failed to parse (text + error). */
  errors: Array<{ fragment: string; error: string }>;
}

export function parseFilesBuffer(buffer: string): FilesParseResult {
  const completedObjects: string[] = [];
  let depth = 0;            // 0 = outside, 1 = inside array, 2 = inside file object
  let inString = false;
  let escape = false;
  let objStart = -1;

  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (c === "[" && depth === 0) {
      depth = 1;
    } else if (c === "]" && depth === 1) {
      depth = 0;
    } else if (c === "{" && depth === 1) {
      depth = 2;
      objStart = i;
    } else if (c === "}" && depth === 2) {
      depth = 1;
      if (objStart >= 0) {
        completedObjects.push(buffer.slice(objStart, i + 1));
        objStart = -1;
      }
    }
    // Nested objects inside file entries don't occur in our schema — path /
    // language / content are all primitives — so we don't need to handle
    // depth > 2.
  }

  // The tail (if any) is an incomplete object. Pull the path out of it so
  // we can show "Writing X" while Claude is still writing that file.
  let inProgressPath: string | null = null;
  if (depth === 2 && objStart >= 0) {
    const tail = buffer.slice(objStart);
    const m = tail.match(/"path"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m) inProgressPath = unescapeJsonString(m[1]);
  }

  const files: ParsedFileRaw[] = [];
  const completedPaths: string[] = [];
  const errors: Array<{ fragment: string; error: string }> = [];
  for (const obj of completedObjects) {
    try {
      const parsed = JSON.parse(obj) as Record<string, unknown>;
      const path = typeof parsed.path === "string" ? parsed.path.trim() : "";
      const content = typeof parsed.content === "string" ? parsed.content : "";
      const language = typeof parsed.language === "string" ? parsed.language : undefined;
      if (!path) continue;
      completedPaths.push(path);
      if (content) files.push({ path, content, language });
    } catch (e) {
      // Try a repair pass on common Claude mistakes before giving up:
      const repaired = tryRepair(obj);
      if (repaired) {
        try {
          const parsed = JSON.parse(repaired) as Record<string, unknown>;
          const path = typeof parsed.path === "string" ? parsed.path.trim() : "";
          const content = typeof parsed.content === "string" ? parsed.content : "";
          const language = typeof parsed.language === "string" ? parsed.language : undefined;
          if (path) {
            completedPaths.push(path);
            if (content) files.push({ path, content, language });
            continue;
          }
        } catch {
          /* fall through to error */
        }
      }
      errors.push({ fragment: obj.slice(0, 120), error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { files, completedPaths, inProgressPath, errors };
}

/**
 * Best-effort repair for common malformed JSON coming out of Claude.
 * Currently handles:
 *  - lone carriage returns / newlines inside strings that weren't escaped
 *    (JSON forbids raw control chars in string literals)
 */
function tryRepair(obj: string): string | null {
  // Escape any raw newline / CR / tab characters inside strings. A full JSON
  // fixer is hard; this handles the biggest class of failures (content
  // values with literal line-breaks).
  let out = "";
  let inString = false;
  let escape = false;
  let changed = false;
  for (let i = 0; i < obj.length; i++) {
    const c = obj[i];
    if (escape) {
      out += c;
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      out += c;
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      out += c;
      continue;
    }
    if (inString) {
      if (c === "\n") {
        out += "\\n";
        changed = true;
      } else if (c === "\r") {
        out += "\\r";
        changed = true;
      } else if (c === "\t") {
        out += "\\t";
        changed = true;
      } else {
        out += c;
      }
      continue;
    }
    out += c;
  }
  return changed ? out : null;
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}
