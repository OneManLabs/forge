import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { clampedInterpolate } from "../helpers";

interface KnobsPopupProps {
  /** Frame at which the popover opens (cursor click). Frames earlier than this render the button only. */
  openFrame: number;
  /** Optional: frame at which the popover begins closing. */
  closeFrame?: number;
  /** Which swatch is currently active (0-4). */
  activeSwatchIdx: number;
  /** Live knob values. */
  cardPadding: number;
  typeScale: number;
  shadowIntensity: number;
  grainIntensity: number;
}

/**
 * Floating ⚙ Knobs button + spring-in popover. Matches the real Forge
 * pattern: the button lives at the bottom-right corner of the canvas
 * at all times; clicking pops a compact control panel above it.
 *
 * Caller is responsible for updating `cardPadding`/`typeScale`/etc.
 * based on the current frame — this component just renders them.
 */
export const KnobsPopup: React.FC<KnobsPopupProps> = ({
  openFrame,
  closeFrame,
  activeSwatchIdx,
  cardPadding,
  typeScale,
  shadowIntensity,
  grainIntensity,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Button pulse on click.
  const sinceOpen = frame - openFrame;
  const buttonClickScale =
    sinceOpen >= 0 && sinceOpen < 20
      ? 1 - 0.1 * Math.sin((sinceOpen / 20) * Math.PI)
      : 1;

  // Popover spring-in after the click frame.
  const openSpring = spring({
    frame: Math.max(0, frame - openFrame),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.9 },
  });
  const closeProgress = closeFrame
    ? clampedInterpolate(frame, [closeFrame, closeFrame + 15], [0, 1])
    : 0;
  const openVisibility = Math.max(0, openSpring - closeProgress);

  const popoverOpen = frame >= openFrame - 1 && openVisibility > 0.02;

  return (
    <>
      {/* Floating ⚙ button — always visible */}
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: COLORS.bgRaised,
          border: `1px solid ${COLORS.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          transform: `scale(${buttonClickScale})`,
          zIndex: 40,
        }}
      >
        {/* Slider-glyph icon */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <line x1="4" y1="7" x2="20" y2="7" stroke={COLORS.ink} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="7" r="2.5" fill={COLORS.bgRaised} stroke={COLORS.accent} strokeWidth="1.5" />
          <line x1="4" y1="17" x2="20" y2="17" stroke={COLORS.ink} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="15" cy="17" r="2.5" fill={COLORS.bgRaised} stroke={COLORS.accent} strokeWidth="1.5" />
        </svg>
      </div>

      {/* Popover */}
      {popoverOpen && (
        <Popover
          visibility={openVisibility}
          activeSwatchIdx={activeSwatchIdx}
          cardPadding={cardPadding}
          typeScale={typeScale}
          shadowIntensity={shadowIntensity}
          grainIntensity={grainIntensity}
        />
      )}
    </>
  );
};

function Popover({
  visibility,
  activeSwatchIdx,
  cardPadding,
  typeScale,
  shadowIntensity,
  grainIntensity,
}: {
  visibility: number;
  activeSwatchIdx: number;
  cardPadding: number;
  typeScale: number;
  shadowIntensity: number;
  grainIntensity: number;
}) {
  const swatches = [COLORS.rockAccent, COLORS.cyan, COLORS.ember, "#b4a4e8", "#8bc48d"];
  const translateY = (1 - visibility) * 8;

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        bottom: 92, // above the button
        width: 340,
        background: COLORS.bgRaised,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 12,
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        opacity: visibility,
        transform: `translateY(${translateY}px) scale(${0.96 + 0.04 * visibility})`,
        transformOrigin: "bottom right",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${COLORS.lineSoft}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Knobs
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: COLORS.accent,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          ● Live
        </span>
      </div>

      {/* Palette */}
      <Section label="Palette">
        <div style={{ display: "flex", gap: 8 }}>
          {swatches.map((c, i) => (
            <div
              key={c}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: c,
                border:
                  i === activeSwatchIdx
                    ? `2px solid ${COLORS.ink}`
                    : `1px solid ${COLORS.line}`,
                boxShadow: i === activeSwatchIdx ? `0 0 0 2px ${COLORS.bgRaised}` : undefined,
              }}
            />
          ))}
        </div>
      </Section>

      {/* Design controls */}
      <Section label="Design controls">
        <ControlRow label="Card padding" valueText={`${cardPadding}px`}>
          <Slider progress={clampedInterpolate(cardPadding, [8, 40], [0, 1])} />
        </ControlRow>
        <ControlRow label="Type scale" valueText={`${typeScale.toFixed(2)}x`}>
          <Slider progress={clampedInterpolate(typeScale, [0.85, 1.25], [0, 1])} />
        </ControlRow>
        <ControlRow label="Shadow intensity" valueText={shadowIntensity.toFixed(2)}>
          <Slider progress={shadowIntensity} />
        </ControlRow>
        <ControlRow label="Grain intensity" valueText={grainIntensity.toFixed(2)}>
          <Slider progress={grainIntensity} />
        </ControlRow>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.lineSoft}` }}>
      <div
        style={{
          fontSize: 10,
          color: COLORS.inkFaint,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 10,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ControlRow({
  label,
  valueText,
  children,
}: {
  label: string;
  valueText: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
        fontSize: 12,
      }}
    >
      <span style={{ color: COLORS.inkMuted, flex: 1 }}>{label}</span>
      <div style={{ width: 130 }}>{children}</div>
      <span
        style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          color: COLORS.inkMuted,
          minWidth: 46,
          textAlign: "right",
        }}
      >
        {valueText}
      </span>
    </div>
  );
}

function Slider({ progress }: { progress: number }) {
  return (
    <div style={{ position: "relative", height: 18 }}>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 0,
          right: 0,
          height: 2,
          background: COLORS.bgSunken,
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 0,
          width: `${progress * 100}%`,
          height: 2,
          background: COLORS.accent,
          borderRadius: 1,
          boxShadow: `0 0 6px ${COLORS.accent}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 3,
          left: `calc(${progress * 100}% - 6px)`,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: COLORS.ink,
          border: `2px solid ${COLORS.accent}`,
        }}
      />
    </div>
  );
}
