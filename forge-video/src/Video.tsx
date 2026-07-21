import { AbsoluteFill, Series } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { COLORS, DURATIONS } from "./constants";
import { CommentScene } from "./scenes/CommentScene";
import { FinalReveal } from "./scenes/FinalReveal";
import { Intro } from "./scenes/Intro";
import { PickScene } from "./scenes/PickScene";
import { PromptScene } from "./scenes/PromptScene";
import { TextEditScene } from "./scenes/TextEditScene";
import { TweaksScene } from "./scenes/TweaksScene";
import { VariationsScene } from "./scenes/VariationsScene";

// Preload every font we use. Remotion waits for these before rendering.
loadInter();
loadSpaceGrotesk();
loadJetBrains();
loadFraunces();

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Series>
        <Series.Sequence durationInFrames={DURATIONS.intro}>
          <Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DURATIONS.prompt}>
          <PromptScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DURATIONS.variations}>
          <VariationsScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DURATIONS.pick}>
          <PickScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DURATIONS.tweaks}>
          <TweaksScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DURATIONS.comment}>
          <CommentScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DURATIONS.textEdit}>
          <TextEditScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={DURATIONS.reveal}>
          <FinalReveal />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
