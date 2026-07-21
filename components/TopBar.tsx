"use client";

import { VersionsButton } from "./VersionsButton";
import type { DesignVersion, Viewport } from "@/lib/types";

interface TopBarProps {
  projectName: string;
  onProjectNameChange: (s: string) => void;
  commentMode: boolean;
  onToggleComment: () => void;
  textEditMode: boolean;
  onToggleTextEdit: () => void;
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  onExport: () => void;
  onNewProject: () => void;
  saving: boolean;
  versions: DesignVersion[];
  currentVersionId: string | null;
  onSelectVersion: (id: string) => void;
  onDiffVersion: (id: string) => void;
}

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        width: 24,
        height: 24,
        background: "var(--accent)",
        transform: "rotate(45deg)",
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          transform: "rotate(-45deg)",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--accent-ink)",
        }}
      >
        F
      </span>
    </div>
    <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" }}>
      Forge
    </span>
    <span className="chip" style={{ fontSize: 9 }}>
      v0.2
    </span>
  </div>
);

export function TopBar({
  projectName,
  onProjectNameChange,
  commentMode,
  onToggleComment,
  textEditMode,
  onToggleTextEdit,
  viewport,
  onViewport,
  onExport,
  onNewProject,
  saving,
  versions,
  currentVersionId,
  onSelectVersion,
  onDiffVersion,
}: TopBarProps) {
  return (
    <div
      style={{
        height: "var(--h-bar, 48px)",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        background: "var(--bg)",
        flexShrink: 0,
        gap: 16,
      }}
    >
      <Logo />
      <div style={{ width: 1, height: 20, background: "var(--line)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          project /
        </span>
        <input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ink)",
            fontSize: 13,
            fontWeight: 500,
            padding: "4px 6px",
            borderRadius: 4,
            outline: "none",
            minWidth: 80,
          }}
          onFocus={(e) => (e.currentTarget.style.background = "var(--bg-sunken)")}
          onBlur={(e) => (e.currentTarget.style.background = "transparent")}
        />
      </div>

      <div
        style={{
          display: "flex",
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: 2,
        }}
      >
        {(
          [
            { k: "desktop", label: "▭", title: "Desktop" },
            { k: "tablet", label: "□", title: "Tablet" },
            { k: "mobile", label: "▯", title: "Mobile" },
          ] as Array<{ k: Viewport; label: string; title: string }>
        ).map((v) => (
          <button
            key={v.k}
            title={v.title}
            onClick={() => onViewport(v.k)}
            style={{
              appearance: "none",
              border: "none",
              cursor: "pointer",
              width: 30,
              height: 24,
              fontSize: 12,
              background: viewport === v.k ? "var(--bg-panel)" : "transparent",
              color: viewport === v.k ? "var(--ink)" : "var(--ink-faint)",
              borderRadius: 4,
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: "var(--line)" }} />

      <button
        className={`btn sm ${commentMode ? "primary" : ""}`}
        onClick={onToggleComment}
        title="Comment mode (⌘/) — click any element in the preview to attach a comment"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <span style={{ fontSize: 12 }}>◉</span>
        <span>Comment</span>
        <span
          className="kbd"
          aria-hidden
          style={{
            fontSize: 9,
            lineHeight: 1,
            padding: "2px 5px",
            borderWidth: 1,
            borderStyle: "solid",
            minWidth: 22,
            textAlign: "center",
            opacity: commentMode ? 0.9 : 0.65,
            borderColor: commentMode
              ? "color-mix(in oklch, var(--accent-ink) 30%, transparent)"
              : "var(--line)",
          }}
        >
          ⌘/
        </span>
      </button>
      <button
        className={`btn sm ${textEditMode ? "primary" : ""}`}
        onClick={onToggleTextEdit}
        title="Text edit mode (⌘⇧E) — click any text in the preview to edit it inline"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <span style={{ fontSize: 12 }}>✎</span>
        <span>Text</span>
        <span
          className="kbd"
          aria-hidden
          style={{
            fontSize: 9,
            lineHeight: 1,
            padding: "2px 5px",
            borderWidth: 1,
            borderStyle: "solid",
            minWidth: 30,
            textAlign: "center",
            opacity: textEditMode ? 0.9 : 0.65,
            borderColor: textEditMode
              ? "color-mix(in oklch, var(--accent-ink) 30%, transparent)"
              : "var(--line)",
          }}
        >
          ⌘⇧E
        </span>
      </button>

      <VersionsButton
        versions={versions}
        currentId={currentVersionId}
        onSelect={onSelectVersion}
        onDiff={onDiffVersion}
      />
      <button className="btn sm ghost" onClick={onNewProject}>
        ＋ New
      </button>
      <button className="btn sm primary" onClick={onExport}>
        Send →
      </button>
    </div>
  );
}
