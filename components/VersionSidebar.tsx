"use client";

import { useState } from "react";
import type { DesignVersion } from "@/lib/types";

interface VersionSidebarProps {
  versions: DesignVersion[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDiff: (id: string) => void;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function VersionSidebar({ versions, currentId, onSelect, onDiff }: VersionSidebarProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyPrompt = async (e: React.MouseEvent, v: DesignVersion) => {
    e.stopPropagation();
    if (!v.userPrompt) return;
    try {
      await navigator.clipboard.writeText(v.userPrompt);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId((c) => (c === v.id ? null : c)), 1400);
    } catch {
      /* clipboard blocked — silently no-op */
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      <div
        style={{
          height: "var(--h-bar, 48px)",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>Versions</div>
        <span className="chip" style={{ marginLeft: "auto" }}>
          {versions.length}
        </span>
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {versions.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-faint)",
              padding: "16px 8px",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            No versions yet. Each chat turn that updates the canvas creates a new version.
          </div>
        )}
        {versions.map((v, i) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            style={{
              appearance: "none",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              padding: 10,
              marginBottom: 4,
              background: currentId === v.id ? "var(--accent-soft)" : "transparent",
              border: `1px solid ${currentId === v.id ? "var(--accent-line)" : "transparent"}`,
              borderRadius: 6,
              color: "var(--ink)",
              display: "flex",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 24,
                background: "var(--bg-sunken)",
                border: "1px solid var(--line-soft)",
                borderRadius: 3,
                flexShrink: 0,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", inset: 2, background: "var(--accent)", opacity: 0.6 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: currentId === v.id ? 600 : 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {v.label}
              </div>
              {v.summary && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-muted)",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontStyle: "italic",
                  }}
                  title={v.summary}
                >
                  {v.summary}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.04em" }}
                >
                  v{String(versions.length - i).padStart(2, "0")} · {relativeTime(v.createdAt)}
                </span>
                <span style={{ flex: 1 }} />
                {v.userPrompt && (
                  <button
                    className="btn sm ghost"
                    onClick={(e) => copyPrompt(e, v)}
                    title={
                      copiedId === v.id
                        ? "Copied!"
                        : "Copy the prompt that created this version"
                    }
                    style={{
                      fontSize: 10,
                      height: 18,
                      padding: "0 6px",
                      color: copiedId === v.id ? "var(--accent)" : "var(--ink-faint)",
                    }}
                  >
                    {copiedId === v.id ? "✓" : "📋"}
                  </button>
                )}
                <button
                  className="btn sm ghost"
                  disabled={v.id === currentId}
                  title={
                    v.id === currentId
                      ? "This IS the current version"
                      : "Diff against the current version"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (v.id === currentId) return;
                    onDiff(v.id);
                  }}
                  style={{
                    fontSize: 10,
                    height: 18,
                    padding: "0 6px",
                    opacity: v.id === currentId ? 0.4 : 0.75,
                    cursor: v.id === currentId ? "not-allowed" : "pointer",
                  }}
                >
                  Diff
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
