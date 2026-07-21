import type { EditOp, EditsResult, FilePayload } from "./types";

/**
 * Apply a sequence of file-aware str_replace edits. Each op's `old` substring
 * must occur EXACTLY ONCE in its target file at the moment the op runs. Zero
 * matches → "not-found". Multiple → "ambiguous". Missing file → "no-such-file".
 * Later ops still run on the post-edit content, so partial failures don't
 * block the rest of the batch.
 *
 * If `op.path` is omitted, defaults to "forge.html".
 */
export function applyEdits(files: FilePayload[], ops: EditOp[]): EditsResult {
  const byPath = new Map<string, string>();
  for (const f of files) byPath.set(f.path, f.content);

  let applied = 0;
  let failed = 0;
  const failures: EditsResult["failures"] = [];

  for (const op of ops) {
    if (!op || typeof op !== "object") {
      failed++;
      continue;
    }
    const targetPath = op.path && op.path.trim().length > 0 ? op.path : "forge.html";
    const current = byPath.get(targetPath);
    if (current === undefined) {
      failed++;
      failures.push({
        op: op.op,
        path: targetPath,
        reason: "no-such-file",
        preview: "",
      });
      continue;
    }

    const old = "old" in op ? op.old : "";
    if (typeof old !== "string" || old.length === 0) {
      failed++;
      failures.push({ op: op.op, path: targetPath, reason: "not-found", preview: "" });
      continue;
    }

    const idx = current.indexOf(old);
    if (idx === -1) {
      failed++;
      failures.push({ op: op.op, path: targetPath, reason: "not-found", preview: previewOf(old) });
      continue;
    }
    const next = current.indexOf(old, idx + 1);
    if (next !== -1) {
      failed++;
      failures.push({ op: op.op, path: targetPath, reason: "ambiguous", preview: previewOf(old) });
      continue;
    }

    let updated: string;
    switch (op.op) {
      case "replace":
        updated = current.slice(0, idx) + (op.new ?? "") + current.slice(idx + old.length);
        break;
      case "delete":
        updated = current.slice(0, idx) + current.slice(idx + old.length);
        break;
      case "insert_before":
        updated = current.slice(0, idx) + (op.new ?? "") + current.slice(idx);
        break;
      case "insert_after":
        updated = current.slice(0, idx + old.length) + (op.new ?? "") + current.slice(idx + old.length);
        break;
      default:
        failed++;
        continue;
    }
    byPath.set(targetPath, updated);
    applied++;
  }

  const filesByPath: Record<string, string> = {};
  for (const [p, content] of byPath) filesByPath[p] = content;
  return { filesByPath, applied, failed, failures };
}

function previewOf(s: string): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > 80 ? flat.slice(0, 78) + "…" : flat;
}

export function parseEditOps(raw: unknown): EditOp[] {
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).edits)
      ? ((raw as Record<string, unknown>).edits as unknown[])
      : [];
  const ops: EditOp[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const op = String(r.op ?? "").toLowerCase();
    const oldStr = typeof r.old === "string" ? r.old : "";
    const newStr = typeof r.new === "string" ? r.new : "";
    const path = typeof r.path === "string" && r.path.trim().length > 0 ? r.path : undefined;
    switch (op) {
      case "replace":
        ops.push({ op: "replace", path, old: oldStr, new: newStr });
        break;
      case "delete":
      case "remove":
        ops.push({ op: "delete", path, old: oldStr });
        break;
      case "insert_before":
      case "before":
        ops.push({ op: "insert_before", path, old: oldStr, new: newStr });
        break;
      case "insert_after":
      case "after":
        ops.push({ op: "insert_after", path, old: oldStr, new: newStr });
        break;
    }
  }
  return ops;
}

/** Merge the result of applyEdits back into a FilePayload[] array. */
export function mergeEdits(files: FilePayload[], result: EditsResult): FilePayload[] {
  return files.map((f) =>
    result.filesByPath[f.path] !== undefined ? { ...f, content: result.filesByPath[f.path] } : f,
  );
}
