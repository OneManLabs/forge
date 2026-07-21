import type { QuestionGroup } from "./types";

/**
 * Incremental parser for the <questions> JSON the Design agent streams.
 * Unlike `JSON.parse` on the full blob, this walks the buffer with a
 * depth-aware state machine and extracts every COMPLETED group object
 * (`{ title, options, ... }`) as soon as its closing `}` arrives — so
 * the UI can render groups live instead of waiting for the whole
 * payload.
 *
 * String-aware (respects escape characters), and ignores `[`/`]` inside
 * group objects (options arrays live there).
 */

export interface StreamedQuestions {
  title?: string;
  subtitle?: string;
  groups: QuestionGroup[];
  /** True if the stream looks like it hasn't emitted the closing `}` of
   *  the wrapping object yet. The UI uses this to decide whether to
   *  show a "streaming more…" indicator. */
  incomplete: boolean;
}

export function parseQuestionsStream(buffer: string, idPrefix: string): StreamedQuestions {
  const result: StreamedQuestions = { groups: [], incomplete: true };
  if (!buffer.trim()) return result;

  // Title / subtitle live at the top level before `"groups"`. Regex off
  // the buffer up to the first `"groups"` occurrence so we don't grab a
  // group's own title by accident.
  const groupsKeyIdx = buffer.indexOf('"groups"');
  const preGroups = groupsKeyIdx >= 0 ? buffer.slice(0, groupsKeyIdx) : buffer;

  const titleRe = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  const subtitleRe = /"subtitle"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  const titleMatch = titleRe.exec(preGroups);
  if (titleMatch) result.title = unescapeJsonString(titleMatch[1]);
  const subMatch = subtitleRe.exec(preGroups);
  if (subMatch) result.subtitle = unescapeJsonString(subMatch[1]);

  // Walk the groups array for completed group objects.
  if (groupsKeyIdx >= 0) {
    const arrayStart = buffer.indexOf("[", groupsKeyIdx);
    if (arrayStart >= 0) {
      const completed = extractCompletedObjects(buffer, arrayStart);
      for (let i = 0; i < completed.length; i++) {
        const parsed = tryParseGroup(completed[i], `${idPrefix}-${i}`);
        if (parsed) result.groups.push(parsed);
      }
    }
  }

  // The wrapping object is "complete" only when the final `}` has
  // arrived. Easiest heuristic: the trimmed buffer ends with `}`.
  result.incomplete = !/}\s*$/.test(buffer.trim());

  return result;
}

function tryParseGroup(raw: string, id: string): QuestionGroup | null {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj.title !== "string") return null;
    const kind = obj.kind === "slider" ? "slider" : "pills";
    return {
      id,
      title: obj.title,
      description: typeof obj.description === "string" ? obj.description : undefined,
      kind,
      multi: Boolean(obj.multi),
      options: Array.isArray(obj.options) ? obj.options.map((o) => String(o)) : [],
      min: typeof obj.min === "number" ? obj.min : undefined,
      max: typeof obj.max === "number" ? obj.max : undefined,
      step: typeof obj.step === "number" ? obj.step : undefined,
      default: typeof obj.default === "number" ? obj.default : undefined,
      leftLabel: typeof obj.leftLabel === "string" ? obj.leftLabel : undefined,
      rightLabel: typeof obj.rightLabel === "string" ? obj.rightLabel : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Walks the buffer starting at the array `[` and returns every object
 * that has a fully-balanced `}` closer. Respects JSON strings + backslash
 * escapes; ignores `[` / `]` inside objects (they're options arrays).
 */
function extractCompletedObjects(buffer: string, start: number): string[] {
  const out: string[] = [];
  let depth = 0; // 0 = outside, 1 = inside array, 2 = inside group object
  let inString = false;
  let escape = false;
  let objStart = -1;

  for (let i = start; i < buffer.length; i++) {
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
      return out;
    } else if (c === "{" && depth === 1) {
      depth = 2;
      objStart = i;
    } else if (c === "}" && depth === 2) {
      depth = 1;
      if (objStart >= 0) {
        out.push(buffer.slice(objStart, i + 1));
        objStart = -1;
      }
    }
  }
  return out;
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}
