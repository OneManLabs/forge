import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";
import { clampedInterpolate, seededRandom } from "../helpers";

/**
 * Opening 3 seconds. Dark background with a radial lime glow and a
 * single "Forge" wordmark that fades in with a lime underline sweep,
 * then fades out into PromptScene.
 */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  // Wordmark fades/rises in.
  const wordOpacity = clampedInterpolate(frame, [0, 24], [0, 1]);
  const wordY = clampedInterpolate(frame, [0, 24], [14, 0], Easing.out(Easing.cubic));

  // Underline sweeps L→R under the wordmark.
  const ulProgress = clampedInterpolate(frame, [14, 50], [0, 1]);

  // Scene fade-out tail so the cut to PromptScene is buttery.
  const sceneOut = clampedInterpolate(frame, [70, 90], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 55%, rgba(193, 236, 58, 0.12), ${COLORS.bg} 55%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        opacity: sceneOut,
      }}
    >
      <Particles />

      <div style={{ position: "relative" }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 128,
            fontWeight: 600,
            letterSpacing: "-0.035em",
            color: COLORS.ink,
            opacity: wordOpacity,
            transform: `translateY(${wordY}px)`,
          }}
        >
          Forge
        </h1>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -14,
            height: 3,
            background: COLORS.accent,
            boxShadow: "0 0 18px rgba(193, 236, 58, 0.7)",
            transform: `scaleX(${ulProgress})`,
            transformOrigin: "left",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

function Particles() {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 30 });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {particles.map((_, i) => {
        const x = seededRandom(i * 3.13) * 100;
        const baseY = seededRandom(i * 7.7) * 100;
        const driftY = Math.sin((frame + i * 11) * 0.01) * 20;
        const size = 1 + seededRandom(i * 5.1) * 2;
        const opacity = 0.15 + seededRandom(i * 9.3) * 0.25;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${baseY}%`,
              left: `${x}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 4 === 0 ? COLORS.accent : "#ffffff",
              opacity,
              transform: `translateY(${driftY}px)`,
              boxShadow: i % 4 === 0 ? `0 0 8px ${COLORS.accent}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
