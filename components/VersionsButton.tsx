"use client";

import { useEffect, useRef, useState } from "react";
import { VersionSidebar } from "./VersionSidebar";
import type { DesignVersion } from "@/lib/types";

interface VersionsButtonProps {
  versions: DesignVersion[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDiff: (id: string) => void;
}

export function VersionsButton({ versions, currentId, onSelect, onDiff }: VersionsButtonProps) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        className={`btn sm ${open ? "primary" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Version history"
        aria-expanded={open}
      >
        ⏱ Versions
        {versions.length > 0 && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              padding: "1px 5px",
              background: open ? "var(--accent-ink)" : "var(--bg-sunken)",
              color: open ? "var(--accent)" : "var(--ink-muted)",
              borderRadius: 3,
              marginLeft: 2,
            }}
          >
            {versions.length}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Versions"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 80,
            width: 320,
            maxHeight: 480,
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 16px 40px oklch(0 0 0 / 0.4)",
            display: "flex",
            flexDirection: "column",
            animation: "slide-up 180ms cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <VersionSidebar
            versions={versions}
            currentId={currentId}
            onSelect={handleSelect}
            onDiff={(id) => {
              onDiff(id);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
