import { Composition } from "remotion";
import { FPS, TOTAL_FRAMES, VIDEO_HEIGHT, VIDEO_WIDTH } from "./constants";
import { Video } from "./Video";

/**
 * Remotion compositions registered for the CLI / Studio. One 1080p
 * composition — render 4K via `--scale=2` on the CLI instead of
 * registering a separate giant composition (saves bundle time).
 */
export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ForgeVideo"
        component={Video}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};
