import React from "react";
import { COLORS } from "../constants";

interface ForgeShellProps {
  /** Content to render in the canvas pane. */
  canvas: React.ReactNode;
  /** Content to render in the left chat panel. */
  chat?: React.ReactNode;
  /** Optional right-side knobs panel overlay. */
  knobs?: React.ReactNode;
  /** Optional floating badge (e.g. "Brand Kit Active"). */
  badge?: React.ReactNode;
  /** Hide the left chat panel (used in full-bleed reveals). */
  chatHidden?: boolean;
  /** Light up the top-bar Comment button (comment mode active). */
  commentActive?: boolean;
  /** Light up the top-bar Text button (text-edit mode active). */
  textActive?: boolean;
}

/**
 * Mock of the Forge Design studio chrome for the video.
 * Renders: TopBar + collapsible left "Projects" rail + optional chat
 * panel + main canvas. Deliberately simplified — we don't need the real
 * studio, just a believable shell the cursor can move around inside.
 */
export const ForgeShell: React.FC<ForgeShellProps> = ({
  canvas,
  chat,
  knobs,
  badge,
  chatHidden,
  commentActive,
  textActive,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COLORS.bg,
        color: COLORS.ink,
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar commentActive={commentActive} textActive={textActive} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <ProjectRail />
        {chat && !chatHidden && <div style={{ width: 340, borderRight: `1px solid ${COLORS.lineSoft}` }}>{chat}</div>}
        <div style={{ flex: 1, position: "relative" }}>
          {canvas}
          {badge}
          {knobs && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 340,
                borderLeft: `1px solid ${COLORS.lineSoft}`,
                background: COLORS.bgRaised,
              }}
            >
              {knobs}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function TopBar({ commentActive, textActive }: { commentActive?: boolean; textActive?: boolean }) {
  return (
    <div
      style={{
        height: 52,
        borderBottom: `1px solid ${COLORS.lineSoft}`,
        background: COLORS.bgRaised,
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: "-0.01em", fontSize: 15 }}>
        RockStack · Forge
      </span>
      <div style={{ flex: 1 }} />
      <ModeButton label="◉ Comment" kbd="⌘/" active={!!commentActive} />
      <ModeButton label="✎ Text" kbd="⌘⇧E" active={!!textActive} />
      <div style={{ width: 1, height: 22, background: COLORS.lineSoft }} />
      <PrimaryButton>Send →</PrimaryButton>
    </div>
  );
}

function ModeButton({ label, kbd, active }: { label: string; kbd: string; active: boolean }) {
  return (
    <div
      style={{
        height: 28,
        padding: "0 10px",
        border: `1px solid ${active ? COLORS.accent : COLORS.line}`,
        borderRadius: 6,
        fontSize: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: active ? COLORS.accentInk : COLORS.inkMuted,
        background: active ? COLORS.accent : "transparent",
        fontWeight: active ? 600 : 400,
        boxShadow: active ? `0 0 16px rgba(193, 236, 58, 0.4)` : undefined,
      }}
    >
      {label}
      <span
        style={{
          fontSize: 9,
          padding: "2px 5px",
          border: `1px solid ${active ? "rgba(26, 38, 7, 0.35)" : COLORS.line}`,
          borderRadius: 3,
          color: active ? "rgba(26, 38, 7, 0.9)" : COLORS.inkFaint,
          fontFamily: "'JetBrains Mono', monospace",
          opacity: active ? 0.95 : 0.7,
        }}
      >
        {kbd}
      </span>
    </div>
  );
}

function ProjectRail() {
  return (
    <div
      style={{
        width: 240,
        borderRight: `1px solid ${COLORS.lineSoft}`,
        background: COLORS.bg,
        padding: 10,
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 11, color: COLORS.inkFaint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, padding: "0 6px" }}>
        Projects
      </div>
      {[
        { name: "RockStack", active: true, time: "just now" },
        { name: "Fintech dashboard", active: false, time: "2h ago" },
        { name: "Pricing explorer", active: false, time: "yesterday" },
      ].map((p) => (
        <div
          key={p.name}
          style={{
            display: "flex",
            gap: 10,
            padding: 8,
            marginBottom: 4,
            border: `1px solid ${p.active ? "rgba(193, 236, 58, 0.35)" : "transparent"}`,
            background: p.active ? "rgba(193, 236, 58, 0.08)" : "transparent",
            borderRadius: 6,
            alignItems: "center",
          }}
        >
          <div style={{ width: 44, height: 30, borderRadius: 4, background: COLORS.bgSunken, border: `1px solid ${COLORS.lineSoft}` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: p.active ? 600 : 500 }}>{p.name}</div>
            <div style={{ fontSize: 10, color: COLORS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>{p.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Diamond({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: COLORS.accent,
        transform: "rotate(45deg)",
        borderRadius: size * 0.2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 24px rgba(193, 236, 58, 0.35)",
      }}
    >
      <div
        style={{
          transform: "rotate(-45deg)",
          color: COLORS.accentInk,
          fontWeight: 800,
          fontSize: size * 0.6,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        F
      </div>
    </div>
  );
}

export function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: 28,
        padding: "0 14px",
        borderRadius: 6,
        background: COLORS.accent,
        color: COLORS.accentInk,
        fontSize: 12,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}
