import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ChatSidebar } from "../components/ChatSidebar";
import { Cursor } from "../components/Cursor";
import { ForgeShell } from "../components/ForgeShell";
import { KnobsPopup } from "../components/KnobsPopup";
import { RockStackPage } from "../components/RockStackPage";
import { COLORS } from "../constants";
import { clampedInterpolate } from "../helpers";

/**
 * Comment-mode demo (~8s / 240 frames).
 *
 * Full flow, matching the real Forge interaction:
 *   1. User clicks the ◉ Comment button in the top-right of the topbar.
 *   2. Button lights up, "Click any element to comment" toast appears.
 *   3. User clicks a product card in the preview.
 *   4. Sticky lime ring appears on the clicked card; pin chip slides
 *      into the chat sidebar.
 *   5. Cursor moves to the pin-composer textarea; comment types in.
 *   6. Cursor moves to "Send pin →"; click fires the edit.
 *   7. Target card's price pops dramatically — scales up, gains a
 *      thick lime halo, and brightens. Success bubble in chat.
 *
 * Timeline:
 *   0-20    scene fade in
 *   25-45   cursor → ◉ Comment button (top-right)
 *   50      click Comment → mode active + toast
 *   55-85   cursor → Midnight Meditation Stone card
 *   95      click card → lime ring, pin enters chat
 *   110-145 cursor → pin composer textarea
 *   150-200 comment types in
 *   205-215 cursor → Send pin →
 *   220     click Send → card flashes + price edit effect
 *   220-240 hold effect
 */
export const CommentScene: React.FC = () => {
  const frame = useCurrentFrame();

  const intro = clampedInterpolate(frame, [0, 20], [0, 1]);
  const outro = clampedInterpolate(frame, [225, 240], [1, 0]);
  const opacity = Math.min(intro, outro);

  /* --- Mode toggle flips when the cursor clicks the Comment button --- */
  const commentClickFrame = 50;
  const commentModeActive = frame >= commentClickFrame;

  /* --- Cursor targets (screen coordinates) --- */
  // Comment button in topbar — computed from flex layout:
  //   right-padding 18 + Send (~72) + gap 12 + divider 1 + gap 12 +
  //   Text (~82) + gap 12 + Comment (~92)
  //   → Comment button center ≈ (1665, 26). Tip offset (+4, +2).
  const commentBtnX = 1665;
  const commentBtnY = 26;

  // Midnight Meditation Stone card (index 1) on the RockStackPage.
  // Canvas x=580..1920, page grid at left:120 right:120 in the 1340-wide
  // canvas → content 1100 wide, 4 cards × 245 with 40px gaps. Card 2
  // spans canvas x=405..650 → screen 985..1230, center x=1107. Card
  // center y ≈ 825 with the new tightened layout.
  const targetCardX = 1107;
  const targetCardY = 825;

  // Chat sidebar (x=240..580). Pin composer textarea ≈ (410, 896).
  const chatInputX = 410;
  const chatInputY = 896;

  // Send pin button ≈ (515, 942).
  const sendBtnX = 515;
  const sendBtnY = 942;

  // Cursor HOLDS on each target for ~20 frames after its click so the
  // response (comment mode light, sticky ring, pin-enter, price pop)
  // is fully visible before the cursor moves to the next target.
  const cursorKeyframes = [
    0,
    40,  // arrive on ◉ Comment button
    70,  // hold on Comment button (click at 50 → mode on + toast)
    85,  // arrive on card
    120, // hold on card (click at 95 → sticky ring + pin enters chat)
    145, // arrive on pin textarea
    200, // still on textarea while typing
    215, // arrive on Send
    235, // parked on Send after click (sees price pop)
  ];
  const cursorXs = [
    1800,
    commentBtnX - 4,
    commentBtnX - 4,
    targetCardX - 4,
    targetCardX - 4,
    chatInputX - 4,
    chatInputX - 4,
    sendBtnX - 4,
    sendBtnX - 4,
  ];
  const cursorYs = [
    200,
    commentBtnY - 2,
    commentBtnY - 2,
    targetCardY - 2,
    targetCardY - 2,
    chatInputY - 2,
    chatInputY - 2,
    sendBtnY - 2,
    sendBtnY - 2,
  ];
  // Clicks: Comment toggle, card pin, Send.
  const clickFrames = [50, 95, 220];

  /* --- Pin chip entry + comment typing --- */
  const pinEntryStart = 105;  // right after the card click
  const pinEntryDuration = 24;
  const commentFullText = "make this price glow WAY brighter please";
  const typeStart = 155;
  const typeEnd = 200;
  const typeProgress = clampedInterpolate(frame, [typeStart, typeEnd], [0, 1]);
  const typedComment = commentFullText.slice(0, Math.floor(typeProgress * commentFullText.length));

  /* --- Post-send visual effects --- */
  const sentFrame = 220;
  const flashOpacity = clampedInterpolate(
    frame,
    [sentFrame, sentFrame + 8, sentFrame + 30],
    [0, 1, 0.25],
  );
  // priceGlow ramps to 1 quickly and stays pinned — it's the "edit applied"
  // visual state that the rest of the video would inherit.
  const priceGlow = clampedInterpolate(
    frame,
    [sentFrame + 2, sentFrame + 14],
    [0, 1],
  );
  const showSuccess = frame >= sentFrame + 5;

  // Sticky lime ring on the clicked card — appears at the card click
  // and persists until the Send click.
  const stickyRing =
    frame >= 95 && frame < sentFrame
      ? clampedInterpolate(frame, [95, 105], [0, 1])
      : 0;

  // Comment-mode toast (top of canvas) — appears when Comment mode
  // activates and fades once the card is clicked.
  const toastOpacity = clampedInterpolate(
    frame,
    [commentClickFrame, commentClickFrame + 10, 95, 108],
    [0, 1, 1, 0],
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <ForgeShell
        commentActive={commentModeActive}
        chat={
          <ChatSidebar
            phase="comment"
            pin={
              frame >= pinEntryStart
                ? {
                    number: 1,
                    component: "SpecimenCard",
                    file: "components/SpecimenCard.jsx",
                    snippet: "Meditation Stone · $180",
                    comment: typedComment,
                    typing: frame >= typeStart && frame < typeEnd,
                  }
                : undefined
            }
            pinEntryStart={pinEntryStart}
            pinEntryDuration={pinEntryDuration}
            successBubble={showSuccess ? "Edit applied to SpecimenCard.jsx" : undefined}
          />
        }
        canvas={
          <div style={{ position: "absolute", inset: 0 }}>
            <RockStackPage
              flashCardIndex={1}
              flashOpacity={Math.max(flashOpacity, stickyRing * 0.6)}
              priceGlowCardIndex={1}
              priceGlowIntensity={priceGlow}
            />
            {/* Floating ⚙ button — decorative here, not clicked */}
            <KnobsPopup
              openFrame={99999}
              activeSwatchIdx={0}
              cardPadding={28}
              typeScale={1}
              shadowIntensity={0.55}
              grainIntensity={0.4}
            />
            {/* Comment-mode toast (only once Comment is active) */}
            <div
              style={{
                position: "absolute",
                top: 24,
                left: "50%",
                transform: "translateX(-50%)",
                opacity: toastOpacity,
                padding: "8px 18px",
                borderRadius: 999,
                background: COLORS.bgRaised,
                border: `1px solid rgba(193, 236, 58, 0.5)`,
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
                  background: COLORS.accent,
                  boxShadow: `0 0 10px ${COLORS.accent}`,
                }}
              />
              Click any element to comment · esc to exit
            </div>
          </div>
        }
      />

      <Cursor xs={cursorXs} ys={cursorYs} keyframes={cursorKeyframes} clicks={clickFrames} />
    </AbsoluteFill>
  );
};
