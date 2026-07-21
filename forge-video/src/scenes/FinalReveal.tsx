import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { RockStackPage } from "../components/RockStackPage";
import { COLORS } from "../constants";
import { clampedInterpolate, seededRandom } from "../helpers";

/**
 * 7s finale. Short cinematic hold on the finished RockStack page, then a
 * cross-fade into an outro that exactly mirrors the intro: dark bg,
 * "Forge" wordmark, lime underline sweep.
 */
export const FinalReveal: React.FC = () => {
  const frame = useCurrentFrame();

  // Ken-burns on the page (frames 0-110) then fade to the outro card.
  const panProgress = clampedInterpolate(frame, [0, 110], [0, 1], Easing.inOut(Easing.cubic));
  const scale = 1.08 - panProgress * 0.08;
  const translateX = -20 + panProgress * 10;
  const translateY = 6 - panProgress * 12;
  const pageOpacity = clampedInterpolate(frame, [110, 150], [1, 0]);

  // Outro card — matches the intro exactly. Starts fading in at 120.
  const outroStart = 120;
  const wordOpacity = clampedInterpolate(frame, [outroStart, outroStart + 24], [0, 1]);
  const wordY = clampedInterpolate(
    frame,
    [outroStart, outroStart + 24],
    [14, 0],
    Easing.out(Easing.cubic),
  );
  const ulProgress = clampedInterpolate(frame, [outroStart + 14, outroStart + 50], [0, 1]);

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          opacity: pageOpacity,
        }}
      >
        <RockStackPage
          ctaLabel="The Loyal Desk Buddy"
          accent={COLORS.rockAccent}
          cardPadding={28}
          priceGlowCardIndex={1}
          priceGlowIntensity={1}
        />
      </div>

      {/* Outro card — intro-matched */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 55%, rgba(193, 236, 58, 0.12), ${COLORS.bg} 55%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          opacity: wordOpacity,
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
