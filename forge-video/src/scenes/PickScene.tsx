import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ChatSidebar } from "../components/ChatSidebar";
import { Cursor } from "../components/Cursor";
import { ForgeShell } from "../components/ForgeShell";
import { VariationCard } from "../components/VariationCard";
import { COLORS } from "../constants";
import { clampedInterpolate } from "../helpers";

/**
 * 8s scene. Cursor moves to card 2's "Pick this →" button, click
 * ripple fires, the three unpicked cards fade + slide away while the
 * picked card scales up to fill the canvas. "Converting to full
 * project…" overlay with a progress bar scrubbing across.
 */
export const PickScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Hard-cut from VariationsScene (no intro fade). Fade out into Tweaks.
  const opacity = clampedInterpolate(frame, [210, 240], [1, 0]);

  // Cursor path. Measured from actual render: cards are ~653px tall
  // (grid rows don't stretch to fill the flex container without
  // grid-template-rows, so card heights come from content). Card footer
  // center screen-y ≈ 768. Card 1 spans screen x=628..922; the
  // right-aligned "Pick this →" button (footer pad 16, ~90px wide)
  // centers at x≈860. Cursor SVG tip is at (+4, +2) from its translate,
  // so target translate = (856, 766).
  const cursorXs = [1700, 856, 856];
  const cursorYs = [180, 571, 571];
  const cursorKeyframes = [0, 50, 120];
  const clickFrames = [60];

  // Picked card (index 0 = Gallery Noir) scale-up animation post-click.
  const growStart = 70;
  const grow = clampedInterpolate(frame, [growStart, growStart + 80], [0, 1]);

  // Overlay (converting banner + progress) appears after click.
  const overlayOpacity = clampedInterpolate(frame, [70, 100], [0, 1]);
  const progressWidth = clampedInterpolate(frame, [100, 220], [0, 100]);

  return (
    <AbsoluteFill style={{ opacity }}>
      <ForgeShell
        chat={<ChatSidebar phase="pick" />}
        canvas={
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                padding: "18px 48px",
                borderBottom: `1px solid ${COLORS.lineSoft}`,
                background: COLORS.bgRaised,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: overlayOpacity > 0.5 ? COLORS.accent : COLORS.inkMuted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {overlayOpacity > 0.5 ? "● Converting & locking" : "◉ Variations ready — pick one to convert"}
            </div>
            <div
              style={{
                flex: 1,
                padding: "32px 48px 48px",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 22,
                minHeight: 0,
                position: "relative",
              }}
            >
              {[0, 1, 2, 3].map((i) => {
                const isPicked = i === 0;
                // Unpicked cards fade + slide away after the click.
                const fadeOthers = clampedInterpolate(frame, [75, 140], [1, 0]);
                // Everything to the right of the picked card slides right;
                // nothing slides left on index 0 since it's the leftmost.
                const slideOthers = clampedInterpolate(frame, [75, 140], [0, 120]);
                const othersStyle = isPicked
                  ? {}
                  : {
                      opacity: fadeOthers,
                      transform: `translateX(${slideOthers}px)`,
                    };
                // Picked card scales up + centers + goes full width over time.
                const pickedScale = 1 + grow * 0.08;
                const pickedOpacity = 1; // stays visible through grow
                const pickedZ = isPicked ? 5 : 1;
                return (
                  <div
                    key={i}
                    style={{
                      zIndex: pickedZ,
                      position: "relative",
                      ...othersStyle,
                      transform: isPicked
                        ? `scale(${pickedScale})`
                        : othersStyle.transform,
                      opacity: isPicked ? pickedOpacity : othersStyle.opacity,
                    }}
                  >
                    <VariationCard index={i} highlight={isPicked} />
                  </div>
                );
              })}
            </div>
            <ConvertingBar width={progressWidth} opacity={overlayOpacity} />
          </div>
        }
      />

      <Cursor xs={cursorXs} ys={cursorYs} keyframes={cursorKeyframes} clicks={clickFrames} />
    </AbsoluteFill>
  );
};

function ConvertingBar({ width, opacity }: { width: number; opacity: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 56,
        left: "50%",
        transform: "translateX(-50%)",
        width: 640,
        padding: "14px 20px",
        background: COLORS.bgRaised,
        border: `1px solid rgba(193, 236, 58, 0.35)`,
        borderRadius: 12,
        opacity,
        boxShadow: "0 18px 56px rgba(0,0,0,0.55)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: COLORS.accent,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: COLORS.accent,
            boxShadow: `0 0 10px ${COLORS.accent}`,
          }}
        />
        Converting sketch → multi-file React project
      </div>
      <div
        style={{
          width: "100%",
          height: 4,
          background: COLORS.bgSunken,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: COLORS.accent,
            boxShadow: `0 0 12px ${COLORS.accent}`,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: COLORS.inkFaint,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        Extracting palette · Splitting components · Writing tokens.css
      </div>
    </div>
  );
}
