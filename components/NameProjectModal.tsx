"use client";

import { useEffect, useRef, useState } from "react";

interface NameProjectModalProps {
  open: boolean;
  defaultName: string;
  onCreate: (name: string) => void;
  onCancel: () => void;
}

export function NameProjectModal({
  open,
  defaultName,
  onCreate,
  onCancel,
}: NameProjectModalProps) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset + focus the input each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
    return () => clearTimeout(t);
  }, [open, defaultName]);

  // Esc closes with Cancel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fade-in 180ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-project-title"
        style={{
          width: 460,
          maxWidth: "92vw",
          background: "var(--bg-raised)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 60px oklch(0 0 0 / 0.45)",
          animation: "slide-up 220ms cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          style={{
            padding: "20px 24px 14px",
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 2,
            }}
          >
            New project
          </div>
          <div
            id="name-project-title"
            style={{
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.01em",
            }}
          >
            Name your project
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-muted)",
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            Pick something short you'll recognize later. You can rename any
            time from the project sidebar.
          </div>
        </div>
        <div style={{ padding: "18px 24px" }}>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="e.g. Studio marketing site"
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 14,
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              color: "var(--ink)",
              outline: "none",
              fontFamily: "var(--font-body)",
            }}
          />
          <div
            style={{
              fontSize: 10,
              color: "var(--ink-faint)",
              marginTop: 6,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            ↵ to create · esc to cancel
          </div>
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--line-soft)",
            background: "var(--bg-sunken)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button className="btn sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn sm primary"
            onClick={submit}
            disabled={!name.trim()}
          >
            Create project →
          </button>
        </div>
      </div>
    </div>
  );
}
