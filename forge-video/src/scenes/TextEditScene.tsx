import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ChatSidebar } from "../components/ChatSidebar";
import { Cursor } from "../components/Cursor";
import { ForgeShell } from "../components/ForgeShell";
import { KnobsPopup } from "../components/KnobsPopup";
import { RockStackPage } from "../components/RockStackPage";
import { COLORS } from "../constants";
import { clampedInterpolate } from "../helpers";

/**
 * 6s scene — Inline Text Edit demo.
 *
 * Timeline:
 *   0-20   "✎ Text" toggle lights up, "Click any text…" toast (cyan).
 *   20-55  Cursor glides to the CTA "CLAIM YOUR STONE".
 *   55     Click — CTA gets a dashed cyan outline + its contents become editable.
 *   55-145 Old text morphs into new: "The Loyal Desk Buddy" types in.
 *   145    Enter commits — outline drops, small cyan success chip pops.
 *   145-180 Applied toast fades, CTA has a brief lime flash.
 */
export const TextEditScene: React.FC = () => {
  const frame = useCurrentFrame();

  const intro = clampedInterpolate(frame, [0, 20], [0, 1]);
  const outro = clampedInterpolate(frame, [160, 180], [1, 0]);
  const opacity = Math.min(intro, outro);

  // CTA is centered horizontally in the canvas (580..1920) → screen
  // x ≈ 1250. Vertically, after the RockStackPage layout was tightened
  // for the narrower chat+canvas space, the hero collapsed upward —
  // hero-top 128 + label 29 + h1 (3 × 92 × 0.98 = 270) + rule-margins
  // 36+1+20 = 57 → CTA top at canvas y 484 → screen y ≈ 550 for
  // CTA center. Cursor SVG tip at (+4, +2) → translate (1246, 548).
  const ctaX = 1250;
  const ctaY = 550;

  const cursorKeyframes = [0, 45, 80, 155];
  const cursorXs = [1800, ctaX - 4, ctaX - 4, ctaX - 4];
  const cursorYs = [300, ctaY - 2, ctaY - 2, ctaY - 2];
  const clickFrames = [55];

  // Phases:
  //   < 55  : idle — old text, no outline
  //   55-70 : click → old text shown with cyan SELECTION highlight
  //           (mimics clicking inside a word and selecting it)
  //   70-140: typing → new text types in character-by-character,
  //           replacing the selected old text
  //   140-148: held — new text settled
  //   >= 148: committed — outline drops, success toast fires
  const oldText = "Claim your stone";
  const newText = "The Loyal Desk Buddy";
  const selectionStart = 55;
  const typeStart = 70;
  const typeEnd = 140;
  const commitFrame = 148;
  const typedProgress = clampedInterpolate(frame, [typeStart, typeEnd], [0, 1]);
  const displayedLabel =
    frame < selectionStart
      ? oldText
      : frame < typeStart
        ? oldText                               // still visible, but selected
        : newText.slice(0, Math.floor(typedProgress * newText.length));
  const ctaSelected = frame >= selectionStart && frame < typeStart;
  const editing = frame >= selectionStart && frame < commitFrame;

  // Toast copy.
  const modeToastOpacity = clampedInterpolate(
    frame,
    [20, 35, 55, 65],
    [0, 1, 1, 0],
  );
  const appliedToastOpacity = clampedInterpolate(
    frame,
    [148, 160, 175, 180],
    [0, 1, 1, 0],
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <ForgeShell
        textActive
        chat={<ChatSidebar phase="text-edit" />}
        canvas={
          <div style={{ position: "absolute", inset: 0 }}>
            <RockStackPage
              ctaLabel={displayedLabel || " "}
              ctaEditing={editing}
              ctaSelected={ctaSelected}
              priceGlowCardIndex={1}
              priceGlowIntensity={1}
            />
            {/* Persistent ⚙ button, not opened in this scene */}
            <KnobsPopup
              openFrame={99999}
              activeSwatchIdx={0}
              cardPadding={28}
              typeScale={1}
              shadowIntensity={0.55}
              grainIntensity={0.4}
            />

            {/* Mode toast (cyan) — "Click any text to edit…" */}
            <div
              style={{
                position: "absolute",
                top: 24,
                left: "50%",
                transform: "translateX(-50%)",
                opacity: modeToastOpacity,
                padding: "8px 18px",
                borderRadius: 999,
                background: COLORS.bgRaised,
                border: `1px solid oklch(0.7 0.18 230 / 0.5)`,
                color: COLORS.ink,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                pointerEvents: "none",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "oklch(0.75 0.18 230)",
                  boxShadow: "0 0 10px oklch(0.75 0.18 230)",
                }}
              />
              Click any text to edit it · enter to commit · esc to cancel
            </div>

            {/* "Text edit applied" toast */}
            <div
              style={{
                position: "absolute",
                top: 78,
                left: "50%",
                transform: "translateX(-50%)",
                opacity: appliedToastOpacity,
                padding: "8px 16px",
                borderRadius: 999,
                background: COLORS.bgRaised,
                border: `1px solid rgba(193, 236, 58, 0.55)`,
                color: COLORS.ink,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex",
                alignItems: "center",
                gap: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: COLORS.accent,
                  boxShadow: `0 0 10px ${COLORS.accent}`,
                }}
              />
              Text edit applied to Hero.jsx
              <span
                style={{
                  padding: "1px 8px",
                  marginLeft: 4,
                  fontSize: 10,
                  borderRadius: 999,
                  background: COLORS.accent,
                  color: COLORS.accentInk,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                UNDO
              </span>
            </div>

          </div>
        }
      />

      <Cursor xs={cursorXs} ys={cursorYs} keyframes={cursorKeyframes} clicks={clickFrames} />
    </AbsoluteFill>
  );
};
