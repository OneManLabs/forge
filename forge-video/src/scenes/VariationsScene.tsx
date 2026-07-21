import { AbsoluteFill, Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ChatSidebar } from "../components/ChatSidebar";
import { ForgeShell } from "../components/ForgeShell";
import { VariationCard } from "../components/VariationCard";
import { COLORS } from "../constants";
import { clampedInterpolate } from "../helpers";

/**
 * 18s scene. Status banner reads "Generating 4 directions…" while four
 * variation cards spring in with ~3s stagger. Near the end, a soft
 * ken-burns zoom on card 2 hints at the one we'll pick. Banner flips to
 * "Variations ready" when all four have landed.
 */
export const VariationsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cross-fade with the previous scene. No outro — hard-cut into Pick.
  const opacity = clampedInterpolate(frame, [0, 15], [0, 1]);

  // Stagger each card's spring-in entry. Leave the first ~30 frames
  // for a "thinking" banner before variations start rendering.
  const entryFrames = [35, 60, 85, 110];

  // Ken-burns zoom on card 1 (index 0 = Gallery Noir) near the tail —
  // it's the one we'll pick, and the rest of the video uses that visual.
  const burnStart = 190;
  const burnAmount = clampedInterpolate(frame, [burnStart, burnStart + 25], [0, 1], Easing.inOut(Easing.cubic));
  const burnDecay = clampedInterpolate(frame, [burnStart + 25, 240], [1, 0], Easing.inOut(Easing.cubic));
  const burnIntensity = Math.min(burnAmount, burnDecay);
  const burnCardScale = 1 + burnIntensity * 0.06;
  const burnCardLift = burnIntensity * -14;

  // Banner phase: "Thinking" → "Writing 4 directions" → "Variations ready"
  const thinkDone = frame >= 30;
  const readyDone = frame >= 180;
  const bannerPhase: "think" | "writing" | "ready" = !thinkDone
    ? "think"
    : !readyDone
      ? "writing"
      : "ready";

  return (
    <AbsoluteFill style={{ opacity }}>
      <ForgeShell
        chat={<ChatSidebar phase="variations" />}
        canvas={
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <Banner phase={bannerPhase} />
            <div
              style={{
                flex: 1,
                padding: "32px 48px 48px",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 22,
                minHeight: 0,
              }}
            >
              {entryFrames.map((start, i) => {
                // Critically-damped spring so the cards settle cleanly
                // instead of wobbling in place. No CSS transition — it
                // was fighting the per-frame transforms and caused the
                // visible shake.
                const entry = spring({
                  frame: frame - start,
                  fps,
                  config: { damping: 22, stiffness: 110, mass: 1 },
                });
                const opacityC = clampedInterpolate(frame, [start, start + 30], [0, 1]);
                const riseY = (1 - entry) * 60;
                const s = 0.94 + entry * 0.06;
                const kenBurn =
                  i === 0 ? { transform: `translateY(${burnCardLift}px) scale(${burnCardScale})` } : {};
                return (
                  <div
                    key={i}
                    style={{
                      opacity: opacityC,
                      transform: `translateY(${riseY}px) scale(${s})`,
                    }}
                  >
                    <div style={kenBurn}>
                      <VariationCard index={i} highlight={i === 0 && burnIntensity > 0.2} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        }
      />
    </AbsoluteFill>
  );
};

function Banner({ phase }: { phase: "think" | "writing" | "ready" }) {
  const frame = useCurrentFrame();
  // Subtle pulse on the dot while generating.
  const dotScale = 1 + Math.sin(frame * 0.2) * 0.12;
  // Animated dots while thinking.
  const dots = ".".repeat(1 + Math.floor((frame / 8) % 3));
  const label =
    phase === "think"
      ? "Thinking"
      : phase === "writing"
        ? "Generating"
        : "Variations ready";
  const sub =
    phase === "think"
      ? `Parsing brief · considering tone${dots}`
      : phase === "writing"
        ? "Writing 4 directions for a silly but premium rock-store landing page…"
        : "Pick one and Forge will convert it into the full project.";
  return (
    <div
      style={{
        padding: "18px 48px",
        borderBottom: `1px solid ${COLORS.lineSoft}`,
        background: COLORS.bgRaised,
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: COLORS.accent,
          boxShadow: `0 0 10px ${COLORS.accent}`,
          transform: `scale(${dotScale})`,
        }}
      />
      <span style={{ fontSize: 13, letterSpacing: "0.06em", color: COLORS.accent, textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: COLORS.inkMuted, letterSpacing: "0.02em" }}>
        {sub}
      </span>
      <div style={{ flex: 1 }} />
    </div>
  );
}
