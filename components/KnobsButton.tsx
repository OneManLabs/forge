"use client";

import { useEffect, useRef, useState } from "react";
import { TweaksPanel } from "./TweaksPanel";
import type { BrandKit, DesignTweaksPayload, TweakState } from "@/lib/types";

interface KnobsButtonProps {
  state: TweakState;
  setState: (patch: Partial<TweakState>) => void;
  onSendToClaudeCode: () => void;
  onApplyToCanvas: () => void;
  hasCanvas: boolean;
  designTweaks: DesignTweaksPayload | null;
  designTweakValues: Record<string, string | number | boolean>;
  onDesignTweakChange: (id: string, value: string | number | boolean) => void;
  customAccentHex: string | null;
  onPickAccent: (hex: string | null) => void;
  brandKit: BrandKit | null;
  onOpenBrandKit: () => void;
  onClearBrandKit: () => void;
}

export function KnobsButton(props: KnobsButtonProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (buttonRef.current?.contains(e.target as Node)) return;
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

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        title="Knobs — open the Tweaks panel"
        aria-label="Knobs"
        aria-expanded={open}
        style={{
          position: "absolute",
          bottom: 18,
          right: 18,
          zIndex: 70,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: open ? "var(--accent)" : "var(--bg-raised)",
          color: open ? "var(--accent-ink)" : "var(--ink)",
          border: `1px solid ${open ? "var(--accent)" : "var(--line)"}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          boxShadow: open
            ? "0 6px 20px oklch(0 0 0 / 0.32)"
            : "0 4px 14px oklch(0 0 0 / 0.22)",
          transition: "background 120ms ease, transform 120ms ease",
          transform: open ? "scale(1.04)" : "scale(1)",
        }}
      >
        {/* Three-dial knobs glyph */}
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <line x1="3" y1="3" x2="3" y2="13" />
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="13" y1="3" x2="13" y2="13" />
            <circle cx="3" cy="6" r="1.6" fill="currentColor" />
            <circle cx="8" cy="10" r="1.6" fill="currentColor" />
            <circle cx="13" cy="5" r="1.6" fill="currentColor" />
          </g>
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Tweaks"
          style={{
            position: "absolute",
            bottom: 76,
            right: 18,
            zIndex: 70,
            width: 320,
            maxHeight: "min(560px, calc(100% - 110px))",
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 16px 40px oklch(0 0 0 / 0.4)",
            animation: "slide-up 180ms cubic-bezier(.2,.8,.2,1)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TweaksPanel {...props} />
        </div>
      )}
    </>
  );
}
