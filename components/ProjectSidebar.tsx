"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { assembleForPreview } from "@/lib/iframe";
import type { ProjectState } from "@/lib/types";

/**
 * IntersectionObserver hook that returns true once the watched element
 * has entered the viewport (or a scroll container's viewport). We use it
 * to lazy-render iframe thumbnails so 50 projects don't boot 50 iframes.
 */
function useOnScreen<T extends HTMLElement>(ref: React.RefObject<T | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin: "120px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, visible]);
  return visible;
}

interface ProjectSidebarProps {
  projects: ProjectState[];
  currentProjectId: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onImport: (json: string) => void;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/**
 * A tiny pointer-events-none iframe rendering the project's current files
 * at a scaled-down size. Heavy in aggregate — used sparingly (only visible
 * rows), and keyed by project id so React doesn't rebuild on unrelated
 * re-renders.
 */
function Thumbnail({ project, active }: { project: ProjectState; active: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  // Always render the iframe for the active project (avoids flicker when
  // clicking between projects fast). Otherwise lazy-boot via IO.
  const onScreen = useOnScreen(boxRef);
  const shouldRender = active || onScreen;
  const srcDoc = useMemo(
    () => (shouldRender ? assembleForPreview(project.files) ?? "" : ""),
    [project.files, shouldRender],
  );

  const baseStyle: React.CSSProperties = {
    width: 64,
    height: 44,
    borderRadius: 4,
    overflow: "hidden",
    background: srcDoc ? "#fff" : "var(--bg-sunken)",
    border: "1px solid var(--line-soft)",
    flexShrink: 0,
    position: "relative",
  };

  if (!srcDoc) {
    // Placeholder — empty project OR below-the-fold project that hasn't
    // scrolled into view yet. Either way, cheap to render.
    return (
      <div ref={boxRef} style={baseStyle}>
        <div
          style={{
            position: "absolute",
            inset: 6,
            borderRadius: 2,
            background:
              "repeating-linear-gradient(45deg, var(--line-soft), var(--line-soft) 2px, transparent 2px, transparent 5px)",
            opacity: 0.35,
          }}
        />
      </div>
    );
  }

  return (
    <div ref={boxRef} style={baseStyle}>
      <iframe
        srcDoc={srcDoc}
        title={`${project.projectName} preview`}
        sandbox="allow-scripts"
        loading="lazy"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1280,
          height: 880,
          border: "none",
          transform: "scale(0.05)",
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function Row({
  project,
  active,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
}: {
  project: ProjectState;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(project.projectName);
  const [menuOpen, setMenuOpen] = useState(false);

  const commitRename = () => {
    setEditing(false);
    const next = nameDraft.trim();
    if (next && next !== project.projectName) onRename(next);
    else setNameDraft(project.projectName);
  };

  return (
    <div
      onClick={() => {
        if (editing || menuOpen) return;
        onSelect();
      }}
      style={{
        display: "flex",
        gap: 10,
        padding: 8,
        borderRadius: 6,
        cursor: editing ? "text" : "pointer",
        background: active ? "var(--accent-soft)" : "transparent",
        border: `1px solid ${active ? "var(--accent-line)" : "transparent"}`,
        alignItems: "center",
        position: "relative",
      }}
    >
      <Thumbnail project={project} active={active} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setNameDraft(project.projectName);
                setEditing(false);
              }
            }}
            style={{
              width: "100%",
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              borderRadius: 4,
              color: "var(--ink)",
              fontSize: 13,
              padding: "3px 6px",
              outline: "none",
            }}
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            style={{
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--ink)",
            }}
            title={project.projectName}
          >
            {project.projectName}
          </div>
        )}
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            marginTop: 2,
            letterSpacing: "0.04em",
          }}
        >
          {project.versions.length} v · {relativeTime(project.updatedAt)}
        </div>
      </div>
      <button
        className="btn sm ghost"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((m) => !m);
        }}
        aria-label="Project actions"
        style={{ padding: "0 6px", height: 22, fontSize: 13 }}
      >
        ⋯
      </button>
      {menuOpen && (
        <>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 100 }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 34,
              right: 4,
              zIndex: 101,
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              boxShadow: "0 8px 24px oklch(0 0 0 / 0.35)",
              minWidth: 150,
              overflow: "hidden",
            }}
          >
            {(
              [
                { label: "Rename", onClick: () => setEditing(true), danger: false },
                { label: "Duplicate", onClick: onDuplicate, danger: false },
                { label: "Export .forge", onClick: onExport, danger: false },
                { label: "Delete", onClick: onDelete, danger: true },
              ] as Array<{ label: string; onClick: () => void; danger: boolean }>
            ).map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMenuOpen(false);
                  item.onClick();
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 12,
                  appearance: "none",
                  border: "none",
                  background: "transparent",
                  color: item.danger ? "oklch(0.72 0.16 30)" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ProjectSidebar(props: ProjectSidebarProps) {
  const {
    projects,
    currentProjectId,
    collapsed,
    onToggleCollapsed,
    onSelect,
    onNew,
    onRename,
    onDuplicate,
    onDelete,
    onExport,
    onImport,
  } = props;
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (collapsed) {
    return (
      <div
        style={{
          width: 40,
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          background: "var(--bg-sunken)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 10,
          gap: 6,
        }}
      >
        <button
          className="btn sm ghost"
          onClick={onToggleCollapsed}
          title="Expand projects"
          style={{ padding: "0 6px", height: 26 }}
        >
          ▶
        </button>
        <button
          className="btn sm ghost"
          onClick={onNew}
          title="New project"
          style={{ padding: "0 6px", height: 26 }}
        >
          ＋
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid var(--line)",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          height: "var(--h-bar, 48px)",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          padding: "0 10px 0 14px",
          flexShrink: 0,
          gap: 6,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>Projects</div>
        <span
          className="chip"
          style={{ fontSize: 10, height: 18, padding: "0 6px" }}
        >
          {projects.length}
        </span>
        <span style={{ flex: 1 }} />
        <button
          className="btn sm ghost"
          onClick={onToggleCollapsed}
          title="Collapse"
          style={{ padding: "0 6px", height: 22 }}
        >
          ◀
        </button>
      </div>

      <div style={{ padding: 10, borderBottom: "1px solid var(--line-soft)", display: "flex", gap: 6 }}>
        <button
          className="btn sm primary"
          onClick={onNew}
          style={{ flex: 1, justifyContent: "center" }}
        >
          ＋ New
        </button>
        <button
          className="btn sm ghost"
          onClick={() => fileRef.current?.click()}
          title="Import a .forge project JSON"
          style={{ padding: "0 10px" }}
        >
          ⬆
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".forge,.json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const text = await f.text();
              onImport(text);
            } catch {
              /* ignore */
            }
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {projects.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-faint)",
              padding: "16px 8px",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            No projects yet. Click <strong>＋ New</strong> to start one.
          </div>
        )}
        {projects.map((p) => (
          <Row
            key={p.id}
            project={p}
            active={p.id === currentProjectId}
            onSelect={() => onSelect(p.id)}
            onRename={(name) => onRename(p.id, name)}
            onDuplicate={() => onDuplicate(p.id)}
            onDelete={() => onDelete(p.id)}
            onExport={() => onExport(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
