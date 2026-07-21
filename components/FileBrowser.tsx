"use client";

import { useEffect, useMemo, useState } from "react";
import type { CodeFile } from "./Canvas";

interface FileBrowserProps {
  files: CodeFile[];
  selectedName: string | null;
  onSelect: (name: string) => void;
}

type Group = {
  key: string;
  label: string;
  /** Files directly in this group (no folder nesting). */
  files: CodeFile[];
  /** Optional sub-folders — only the components/ group uses this. */
  folder?: { name: string; files: CodeFile[] };
};

function languageLabel(language: CodeFile["language"], path: string): string {
  if (path.startsWith("components/")) return "Component";
  switch (language) {
    case "html":
      return "HTML page";
    case "css":
      return "Stylesheet";
    case "js":
      return "Script";
    case "jsx":
      return "Component";
    case "json":
      return "Data";
    case "md":
      return "Document";
  }
}

function groupFiles(files: CodeFile[]): Group[] {
  const components = files.filter((f) => f.name.startsWith("components/"));
  const otherFiles = files.filter((f) => !f.name.startsWith("components/"));

  const pages = otherFiles.filter((f) => f.language === "html");
  const stylesheets = otherFiles.filter((f) => f.language === "css");
  const scripts = otherFiles.filter(
    (f) => f.language === "js" || f.language === "jsx" || f.language === "json",
  );
  const docs = otherFiles.filter((f) => f.language === "md");

  const out: Group[] = [];
  if (components.length > 0) {
    out.push({
      key: "folders",
      label: "Folders",
      files: [],
      folder: { name: "components", files: components },
    });
  }
  if (pages.length > 0) out.push({ key: "pages", label: "Pages", files: pages });
  if (stylesheets.length > 0) out.push({ key: "stylesheets", label: "Stylesheets", files: stylesheets });
  if (scripts.length > 0) out.push({ key: "scripts", label: "Scripts", files: scripts });
  if (docs.length > 0) out.push({ key: "docs", label: "Documents", files: docs });
  return out;
}

function baseName(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}

function FileIcon({ language }: { language: CodeFile["language"] }) {
  // Small paper-like file glyph; language tints the corner fold.
  const tint: Record<CodeFile["language"], string> = {
    html: "oklch(0.85 0.06 240)",
    css: "oklch(0.86 0.07 220)",
    js: "oklch(0.9 0.12 95)",
    jsx: "oklch(0.86 0.07 240)",
    json: "oklch(0.88 0.09 85)",
    md: "oklch(0.9 0.02 260)",
  };
  return (
    <svg width="28" height="34" viewBox="0 0 28 34" style={{ flexShrink: 0 }} aria-hidden>
      <path
        d="M4 2 H18 L24 8 V30 Q24 32 22 32 H4 Q2 32 2 30 V4 Q2 2 4 2 Z"
        fill={tint[language] ?? "#e3e7ee"}
        stroke="var(--line)"
        strokeWidth="0.8"
      />
      <path d="M18 2 V8 H24" fill="none" stroke="var(--line)" strokeWidth="0.8" />
    </svg>
  );
}

function FileRow({
  file,
  selected,
  onSelect,
  indent = 0,
}: {
  file: CodeFile;
  selected: boolean;
  onSelect: (name: string) => void;
  indent?: number;
}) {
  return (
    <button
      onClick={() => onSelect(file.name)}
      style={{
        width: "100%",
        appearance: "none",
        border: "none",
        background: selected ? "var(--accent)" : "transparent",
        color: selected ? "var(--accent-ink)" : "var(--ink)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: `10px 16px 10px ${16 + indent}px`,
        cursor: "pointer",
        textAlign: "left",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <FileIcon language={file.language} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: selected ? "var(--accent-ink)" : "var(--ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {baseName(file.name)}
        </div>
        <div
          style={{
            fontSize: 12,
            color: selected ? "color-mix(in oklch, var(--accent-ink) 72%, transparent)" : "var(--ink-faint)",
            marginTop: 2,
          }}
        >
          {languageLabel(file.language, file.name)}
        </div>
      </div>
      {file.streaming && (
        <span
          className="pulse-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: 50,
            background: selected ? "var(--accent-ink)" : "var(--accent)",
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "12px 16px 6px",
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--ink-faint)",
        background: "var(--bg-sunken)",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      {label}
    </div>
  );
}

function FolderHeader({
  name,
  count,
  expanded,
  onToggle,
  streaming,
}: {
  name: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  streaming: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={expanded}
      style={{
        width: "100%",
        appearance: "none",
        border: "none",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid var(--line-soft)",
        cursor: "pointer",
        textAlign: "left",
        color: "var(--ink)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 10,
          textAlign: "center",
          fontSize: 10,
          color: "var(--ink-faint)",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 140ms ease",
          flexShrink: 0,
        }}
      >
        ▶
      </span>
      <svg width="28" height="22" viewBox="0 0 28 22" aria-hidden style={{ flexShrink: 0 }}>
        <path d="M2 4 Q2 2 4 2 H10 L12 4 H24 Q26 4 26 6 V18 Q26 20 24 20 H4 Q2 20 2 18 Z" fill="var(--bg-raised)" stroke="var(--line)" strokeWidth="0.8" />
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Folder</div>
      </div>
      {streaming && (
        <span
          className="pulse-dot"
          style={{ width: 6, height: 6, borderRadius: 50, background: "var(--accent)", flexShrink: 0 }}
        />
      )}
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
        {count}
      </div>
    </button>
  );
}

export function FileBrowser({ files, selectedName, onSelect }: FileBrowserProps) {
  const groups = useMemo(() => groupFiles(files), [files]);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // Auto-expand (i.e. remove from collapsed set) any folder whose content is
  // currently streaming or contains the selected file — the user clearly
  // wants to see it, even if they'd manually collapsed it earlier.
  useEffect(() => {
    setCollapsedFolders((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set(prev);
      for (const g of groups) {
        if (!g.folder) continue;
        const hasStreaming = g.folder.files.some((f) => f.streaming);
        const hasSelected = selectedName && g.folder.files.some((f) => f.name === selectedName);
        if ((hasStreaming || hasSelected) && next.has(g.folder.name)) {
          next.delete(g.folder.name);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [groups, selectedName]);

  const toggleFolder = (name: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (files.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-faint)",
          fontSize: 13,
        }}
      >
        No files yet — generate a design first.
      </div>
    );
  }

  return (
    <div
      className="scroll"
      style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--bg)",
        minHeight: 0,
      }}
    >
      {groups.map((g) => (
        <div key={g.key}>
          <SectionHeader label={g.label} />
          {g.folder && (
            <>
              <FolderHeader
                name={g.folder.name}
                count={g.folder.files.length}
                expanded={!collapsedFolders.has(g.folder.name)}
                onToggle={() => toggleFolder(g.folder!.name)}
                streaming={g.folder.files.some((f) => f.streaming)}
              />
              {!collapsedFolders.has(g.folder.name) &&
                g.folder.files.map((f) => (
                  <FileRow
                    key={f.name}
                    file={f}
                    selected={selectedName === f.name}
                    onSelect={onSelect}
                    indent={28}
                  />
                ))}
            </>
          )}
          {g.files.map((f) => (
            <FileRow
              key={f.name}
              file={f}
              selected={selectedName === f.name}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
