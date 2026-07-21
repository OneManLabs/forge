"use client";

import { createPatch, diffLines } from "diff";
import { useMemo, useState } from "react";
import { highlightCss, highlightHtml, highlightJson, highlightMarkdown } from "@/lib/syntaxHighlight";
import type { DesignVersion, FilePayload } from "@/lib/types";

/** Pick the right highlighter for a file path. JSX/JS fall back to the
 *  HTML highlighter because the tag-attr tokenization reads decently on
 *  JSX, and we explicitly want "light coloring" not a full JS parser. */
function highlightLine(text: string, path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (text.trim() === "") return "&nbsp;";
  try {
    if (ext === "css") return highlightCss(text);
    if (ext === "json") return highlightJson(text);
    if (ext === "md" || ext === "markdown") return highlightMarkdown(text);
    return highlightHtml(text);
  } catch {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

interface DiffModalProps {
  open: boolean;
  onClose: () => void;
  versionA: DesignVersion | null; // "before" / older
  versionB: DesignVersion | null; // "after"  / newer (usually currentVersion)
}

interface FileDiffEntry {
  path: string;
  status: "added" | "removed" | "modified" | "unchanged";
  a: string | null;
  b: string | null;
}

function indexFiles(files: FilePayload[]): Map<string, FilePayload> {
  const m = new Map<string, FilePayload>();
  for (const f of files) m.set(f.path, f);
  return m;
}

function computeEntries(a: FilePayload[], b: FilePayload[]): FileDiffEntry[] {
  const ia = indexFiles(a);
  const ib = indexFiles(b);
  const paths = Array.from(new Set([...ia.keys(), ...ib.keys()])).sort();
  const out: FileDiffEntry[] = [];
  for (const path of paths) {
    const fa = ia.get(path) ?? null;
    const fb = ib.get(path) ?? null;
    let status: FileDiffEntry["status"] = "unchanged";
    if (fa && !fb) status = "removed";
    else if (!fa && fb) status = "added";
    else if (fa && fb && fa.content !== fb.content) status = "modified";
    else if (fa && fb && fa.content === fb.content) status = "unchanged";
    out.push({ path, status, a: fa?.content ?? null, b: fb?.content ?? null });
  }
  return out;
}

function countLines(s: string | null): number {
  return s ? s.split("\n").length : 0;
}

function statusBadge(status: FileDiffEntry["status"]) {
  const map: Record<FileDiffEntry["status"], { label: string; bg: string; fg: string }> = {
    added: { label: "+ added", bg: "oklch(0.28 0.12 145)", fg: "oklch(0.85 0.17 145)" },
    removed: { label: "− removed", bg: "oklch(0.28 0.12 25)", fg: "oklch(0.78 0.17 25)" },
    modified: { label: "~ modified", bg: "oklch(0.3 0.12 80)", fg: "oklch(0.88 0.16 80)" },
    unchanged: { label: "= unchanged", bg: "var(--bg-sunken)", fg: "var(--ink-faint)" },
  };
  const s = map[status];
  return (
    <span
      className="mono"
      style={{
        fontSize: 9,
        padding: "1px 6px",
        borderRadius: 3,
        background: s.bg,
        color: s.fg,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {s.label}
    </span>
  );
}

/* ============================================================
 * Unified + Split rendering
 * ============================================================ */

const ADD_BG = "oklch(0.26 0.12 145 / 0.35)";
const DEL_BG = "oklch(0.28 0.12 25 / 0.35)";
const EVEN_BG = "transparent";
const LINE_NUMBER_WIDTH = 42;

function UnifiedView({ a, b, path }: { a: string; b: string; path: string }) {
  const parts = useMemo(() => diffLines(a, b), [a, b]);
  let aLn = 1;
  let bLn = 1;
  const rows: Array<{
    kind: "add" | "del" | "same";
    aLine: number | null;
    bLine: number | null;
    text: string;
  }> = [];
  for (const part of parts) {
    const lines = part.value.split("\n");
    // Drop the trailing empty string left by the last newline.
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    for (const line of lines) {
      if (part.added) {
        rows.push({ kind: "add", aLine: null, bLine: bLn++, text: line });
      } else if (part.removed) {
        rows.push({ kind: "del", aLine: aLn++, bLine: null, text: line });
      } else {
        rows.push({ kind: "same", aLine: aLn++, bLine: bLn++, text: line });
      }
    }
  }
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        lineHeight: 1.55,
        overflow: "auto",
        background: "var(--bg-sunken)",
        maxHeight: "60vh",
      }}
    >
      {rows.map((r, i) => {
        const bg = r.kind === "add" ? ADD_BG : r.kind === "del" ? DEL_BG : EVEN_BG;
        const prefix = r.kind === "add" ? "+" : r.kind === "del" ? "−" : " ";
        const html = highlightLine(r.text, path);
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: `${LINE_NUMBER_WIDTH}px ${LINE_NUMBER_WIDTH}px 14px 1fr`,
              background: bg,
            }}
          >
            <span style={{ color: "var(--ink-faint)", padding: "0 6px", textAlign: "right" }}>
              {r.aLine ?? ""}
            </span>
            <span style={{ color: "var(--ink-faint)", padding: "0 6px", textAlign: "right" }}>
              {r.bLine ?? ""}
            </span>
            <span style={{ color: "var(--ink-faint)", textAlign: "center" }}>{prefix}</span>
            <span
              style={{ whiteSpace: "pre", color: "var(--ink)" }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        );
      })}
      {rows.length === 0 && (
        <div style={{ padding: 16, color: "var(--ink-faint)" }}>Files are identical.</div>
      )}
    </div>
  );
}

function SplitView({ a, b, path }: { a: string; b: string; path: string }) {
  const parts = useMemo(() => diffLines(a, b), [a, b]);
  let aLn = 1;
  let bLn = 1;
  type Cell = { num: number | null; text: string; kind: "add" | "del" | "same" | "empty" };
  const rows: Array<{ left: Cell; right: Cell }> = [];
  for (const part of parts) {
    const lines = part.value.split("\n");
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    if (part.added) {
      for (const line of lines) {
        rows.push({
          left: { num: null, text: "", kind: "empty" },
          right: { num: bLn++, text: line, kind: "add" },
        });
      }
    } else if (part.removed) {
      for (const line of lines) {
        rows.push({
          left: { num: aLn++, text: line, kind: "del" },
          right: { num: null, text: "", kind: "empty" },
        });
      }
    } else {
      for (const line of lines) {
        rows.push({
          left: { num: aLn++, text: line, kind: "same" },
          right: { num: bLn++, text: line, kind: "same" },
        });
      }
    }
  }
  const renderCell = (c: Cell) => {
    const bg =
      c.kind === "add" ? ADD_BG : c.kind === "del" ? DEL_BG : "transparent";
    const html = c.kind === "empty" ? "&nbsp;" : highlightLine(c.text, path);
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${LINE_NUMBER_WIDTH}px 1fr`,
          background: bg,
          minHeight: 18,
        }}
      >
        <span style={{ color: "var(--ink-faint)", padding: "0 6px", textAlign: "right" }}>
          {c.num ?? ""}
        </span>
        <span
          style={{ whiteSpace: "pre", color: "var(--ink)", padding: "0 6px" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        lineHeight: 1.55,
        overflow: "auto",
        background: "var(--bg-sunken)",
        maxHeight: "60vh",
      }}
    >
      <div style={{ borderRight: "1px solid var(--line-soft)" }}>
        {rows.map((r, i) => (
          <div key={i}>{renderCell(r.left)}</div>
        ))}
      </div>
      <div>
        {rows.map((r, i) => (
          <div key={i}>{renderCell(r.right)}</div>
        ))}
      </div>
      {rows.length === 0 && (
        <div style={{ padding: 16, color: "var(--ink-faint)", gridColumn: "1 / -1" }}>
          Files are identical.
        </div>
      )}
    </div>
  );
}

export function DiffModal({ open, onClose, versionA, versionB }: DiffModalProps) {
  const [view, setView] = useState<"unified" | "split">("unified");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const copyDiffForFile = async (entry: FileDiffEntry) => {
    const aText = entry.a ?? "";
    const bText = entry.b ?? "";
    const patch = createPatch(entry.path, aText, bText, "before", "after", { context: 3 });
    try {
      await navigator.clipboard.writeText(patch);
      setCopiedPath(entry.path);
      setTimeout(() => setCopiedPath((c) => (c === entry.path ? null : c)), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  const entries = useMemo(() => {
    if (!versionA || !versionB) return [];
    return computeEntries(versionA.files, versionB.files);
  }, [versionA, versionB]);

  const filtered = showUnchanged ? entries : entries.filter((e) => e.status !== "unchanged");
  const changedCount = entries.filter((e) => e.status !== "unchanged").length;

  if (!open || !versionA || !versionB) return null;

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fade-in 180ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 980,
          maxWidth: "96vw",
          maxHeight: "92vh",
          background: "var(--bg-raised)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px oklch(0 0 0 / 0.4)",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Comparing
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--font-display)",
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 280,
                }}
                title={versionA.label}
              >
                {versionA.label}
              </span>
              <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>→</span>
              <span
                style={{
                  color: "var(--accent)",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 240,
                }}
                title={versionB.label}
              >
                Current
              </span>
              <span
                style={{
                  color: "var(--ink-faint)",
                  fontWeight: 400,
                  marginLeft: "auto",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {changedCount} file{changedCount === 1 ? "" : "s"} changed
              </span>
            </div>
          </div>
          <div
            role="group"
            aria-label="Diff view mode"
            style={{
              display: "flex",
              gap: 2,
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {(
              [
                { v: "unified" as const, label: "▤ Unified" },
                { v: "split" as const, label: "▥ Split" },
              ]
            ).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setView(opt.v)}
                className={`btn sm ${view === opt.v ? "primary" : "ghost"}`}
                style={{
                  height: 24,
                  padding: "0 10px",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                }}
                aria-pressed={view === opt.v}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--ink-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
            />
            unchanged
          </label>
          <button className="btn icon ghost" onClick={onClose} title="Close">×</button>
        </div>

        <div className="scroll" style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: 14 }}>
          {filtered.length === 0 && (
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-faint)",
                padding: "40px 8px",
                textAlign: "center",
              }}
            >
              No file differences between these versions.
            </div>
          )}
          {filtered.map((entry) => {
            const isOpen = expanded.has(entry.path) || entry.status !== "unchanged";
            const aText = entry.a ?? "";
            const bText = entry.b ?? "";
            return (
              <div
                key={entry.path}
                style={{
                  marginBottom: 10,
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "var(--bg)",
                }}
              >
                <button
                  onClick={() => toggleExpanded(entry.path)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    appearance: "none",
                    border: "none",
                    background: "var(--bg-sunken)",
                    color: "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 10,
                      fontSize: 10,
                      transform: isOpen ? "rotate(90deg)" : "rotate(0)",
                      transition: "transform 140ms ease",
                      color: "var(--ink-faint)",
                    }}
                  >
                    ▶
                  </span>
                  {statusBadge(entry.status)}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {entry.path}
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: "var(--ink-faint)" }}
                  >
                    {countLines(aText)} → {countLines(bText)} lines
                  </span>
                  {entry.status !== "unchanged" && (
                    <button
                      className="btn sm ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        void copyDiffForFile(entry);
                      }}
                      title="Copy unified diff for this file to clipboard"
                      style={{
                        height: 20,
                        padding: "0 8px",
                        fontSize: 10,
                        color: copiedPath === entry.path ? "var(--accent)" : "var(--ink-faint)",
                      }}
                    >
                      {copiedPath === entry.path ? "✓ Copied" : "📋 Copy diff"}
                    </button>
                  )}
                </button>
                {isOpen && entry.status !== "unchanged" && (
                  <>
                    {view === "unified" ? (
                      <UnifiedView a={aText} b={bText} path={entry.path} />
                    ) : (
                      <SplitView a={aText} b={bText} path={entry.path} />
                    )}
                  </>
                )}
                {isOpen && entry.status === "unchanged" && (
                  <div
                    style={{
                      padding: 12,
                      fontSize: 11,
                      color: "var(--ink-faint)",
                      fontFamily: "var(--font-mono)",
                      background: "var(--bg-sunken)",
                    }}
                  >
                    ({countLines(aText)} lines, identical in both versions)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
