import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cursor } from "../components/Cursor";
import { ForgeShell, PrimaryButton } from "../components/ForgeShell";
import { TypingText } from "../components/TypingText";
import { COLORS, PROMPT_TEXT } from "../constants";
import { clampedInterpolate } from "../helpers";

/**
 * 12-second scene: Forge Design UI appears, the cursor glides to the
 * chat input, the RockStack prompt types in one character at a time,
 * the cursor moves to Forge's primary button and clicks.
 */
export const PromptScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade whole scene in at the cut from Intro.
  const intro = clampedInterpolate(frame, [0, 15], [0, 1]);
  const outro = clampedInterpolate(frame, [225, 240], [1, 0]);
  const opacity = Math.min(intro, outro);

  // Cursor keyframes. Coordinates are in the 1920x1080 canvas.
  //   0       → off-screen
  //   0→30    → slides to the chat input
  //   30→180  → parked in input while text types
  //   180→200 → slides DOWN to the Forge ↵ button under the textbox
  //             (button center ≈ (502, 1048), tip offset (+4,+2))
  //   210     → click
  const cursorXs = [1200, 500, 500, 498, 498];
  const cursorYs = [1200, 960, 960, 1046, 1046];
  const cursorKeyframes = [0, 30, 180, 200, 225];
  const clickFrames = [210];

  return (
    <AbsoluteFill style={{ opacity }}>
      <ForgeShell
        chat={<ChatPanel typingStart={35} typingDuration={140} />}
        canvas={<EmptyCanvas />}
      />

      <Cursor
        xs={cursorXs}
        ys={cursorYs}
        keyframes={cursorKeyframes}
        clicks={clickFrames}
      />
    </AbsoluteFill>
  );
};

function ChatPanel({ typingStart, typingDuration }: { typingStart: number; typingDuration: number }) {
  const frame = useCurrentFrame();
  const buttonPulse = clampedInterpolate(frame, [205, 215, 230], [1, 0.96, 1]);
  const buttonGlow = clampedInterpolate(frame, [205, 230], [0, 1]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: COLORS.bg }}>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${COLORS.lineSoft}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 3,
            border: `1px solid ${COLORS.line}`,
            color: COLORS.inkMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ● Live · 0 turns
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ padding: 14 }}>
        <div
          style={{
            border: `1px solid ${COLORS.line}`,
            borderRadius: 10,
            padding: 14,
            background: COLORS.bgRaised,
            minHeight: 120,
            fontSize: 16,
            lineHeight: 1.45,
            color: COLORS.ink,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <TypingText
            text={PROMPT_TEXT}
            startFrame={typingStart}
            durationFrames={typingDuration}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: 10, color: COLORS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>
            ⌘↵ to send
          </span>
          <div
            style={{
              transform: `scale(${buttonPulse})`,
              boxShadow: `0 0 ${buttonGlow * 28}px rgba(193, 236, 58, ${buttonGlow * 0.7})`,
              borderRadius: 6,
            }}
          >
            <PrimaryButton>Forge ↵</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyCanvas() {
  const frame = useCurrentFrame();
  const diamondOpacity = clampedInterpolate(frame, [0, 30], [0, 1]);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        color: COLORS.inkFaint,
        opacity: diamondOpacity,
        background:
          "radial-gradient(circle at 50% 50%, rgba(193, 236, 58, 0.04), transparent 60%)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 6,
          background: COLORS.accent,
          transform: "rotate(45deg)",
          opacity: 0.7,
          marginBottom: 20,
        }}
      />
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, letterSpacing: "-0.01em" }}>
        Describe a UI to begin.
      </div>
    </div>
  );
}
