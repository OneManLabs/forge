import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ChatSidebar } from "../components/ChatSidebar";
import { Cursor } from "../components/Cursor";
import { ForgeShell } from "../components/ForgeShell";
import { KnobsPopup } from "../components/KnobsPopup";
import { RockStackPage } from "../components/RockStackPage";
import { COLORS } from "../constants";
import { clampedInterpolate } from "../helpers";

/**
 * TweaksScene — knobs as a popover.
 *
 * Layout: 240px rail + 340px chat + 1340px canvas (no right rail).
 * Floating ⚙ button at the bottom-right of the canvas; clicking opens
 * the Knobs popover above it with palette swatches + 4 design sliders.
 *
 * This cut only demonstrates the PALETTE — the sliders are visible in
 * the popover (so the user sees every available knob) but the cursor
 * only interacts with the color swatches: gold → cyan → ember → gold.
 * Keeps the scene punchy and avoids the fiddly slider-drag choreography.
 *
 * Timeline (~9s / 270 frames):
 *   0-25   scene fade-in
 *   25-55  cursor glides to ⚙ button (bottom-right)
 *   55     click — popover springs open
 *   75-95  cursor moves to swatch 2 (cyan)
 *   100    click cyan
 *   125-145 cursor moves to swatch 3 (ember)
 *   150    click ember
 *   175-200 cursor moves back to swatch 1 (gold)
 *   210    click gold — back to default
 *   220-270 hold + fade out
 */
export const TweaksScene: React.FC = () => {
  const frame = useCurrentFrame();

  const intro = clampedInterpolate(frame, [0, 25], [0, 1]);
  const outro = clampedInterpolate(frame, [240, 270], [1, 0]);
  const opacity = Math.min(intro, outro);

  /* --- LIVE KNOB VALUES --- */

  // Swatch cycle. Only once the popover is open. Click frames at
  // 100 / 170 / 230 — the cursor holds on each swatch past its click.
  const accent =
    frame < 100
      ? COLORS.rockAccent
      : frame < 170
        ? COLORS.cyan
        : frame < 230
          ? COLORS.ember
          : COLORS.rockAccent;
  const activeSwatchIdx =
    frame < 100 ? 0 : frame < 170 ? 1 : frame < 230 ? 2 : 0;

  // Sliders stay at their defaults — visible but unmodified in this cut.
  const cardPadding = 28;
  const typeScale = 1.0;
  const shadowIntensity = 0.55;
  const grainIntensity = 0.4;

  /* --- CURSOR PATH (swatches only, no slider drags) ---
   * Cursor HOLDS on each swatch for ~20 frames after its click so the
   * user actually sees the page recolor before the cursor slides off
   * to the next swatch. Without that hold, the cursor was already
   * leaving when the color flipped and the change felt delayed. */
  // ⚙ button center: (1868, 1028). Cursor tip offset (+4, +2) → (1864, 1026).
  // Popover content x=1572..1880. Swatch centers (28 wide + 8 gap):
  //   swatch 1 (gold):  cx=1586
  //   swatch 2 (cyan):  cx=1622
  //   swatch 3 (ember): cx=1658
  // Swatch row center y ≈ 808.
  const cursorKeyframes = [
    0,   // off-screen top right
    40,  // arrive at ⚙ button
    90,  // arrive on swatch 2 (cyan) ~10 frames before click
    125, // still on swatch 2 after the cyan flip
    160, // arrive on swatch 3 (ember) ~10 frames before click
    195, // still on swatch 3 after the ember flip
    220, // arrive on swatch 1 (gold) ~10 frames before click
    250, // still on swatch 1 after the gold flip
    270, // drift off to the right
  ];
  const cursorXs = [
    1800,
    1864, // ⚙
    1618, // swatch 2
    1618, // hold on swatch 2
    1654, // swatch 3
    1654, // hold on swatch 3
    1582, // swatch 1
    1582, // hold on swatch 1
    1760,
  ];
  const cursorYs = [
    200,
    1026, // ⚙
    806,  // swatch 2
    806,
    806,  // swatch 3
    806,
    806,  // swatch 1
    806,
    806,
  ];
  const clickFrames = [55, 100, 170, 230];

  const popoverOpenFrame = 55;

  return (
    <AbsoluteFill style={{ opacity }}>
      <ForgeShell
        chat={<ChatSidebar phase="tweaks" />}
        canvas={
          <div style={{ position: "absolute", inset: 0 }}>
            <RockStackPage
              accent={accent}
              cardPadding={cardPadding}
              typeScale={typeScale}
              shadowIntensity={shadowIntensity}
              grainIntensity={grainIntensity}
            />
            <KnobsPopup
              openFrame={popoverOpenFrame}
              activeSwatchIdx={activeSwatchIdx}
              cardPadding={cardPadding}
              typeScale={typeScale}
              shadowIntensity={shadowIntensity}
              grainIntensity={grainIntensity}
            />
          </div>
        }
      />

      <Cursor xs={cursorXs} ys={cursorYs} keyframes={cursorKeyframes} clicks={clickFrames} />
    </AbsoluteFill>
  );
};
