import { useCurrentFrame } from "remotion";
import { clampedInterpolate, seededRandom } from "../helpers";

interface TypingTextProps {
  text: string;
  /** Frame at which the first character appears. */
  startFrame: number;
  /** Total frames over which the full text types out. */
  durationFrames: number;
  /** Whether to show a blinking caret at the tail. */
  caret?: boolean;
  style?: React.CSSProperties;
}

/**
 * Character-by-character typing effect that looks "natural" — frame-based
 * (so it's deterministic per render) with a tiny amount of seeded jitter
 * so it doesn't feel metronomic. Renders a soft-blinking caret at the
 * current position if `caret` is true.
 */
export const TypingText: React.FC<TypingTextProps> = ({
  text,
  startFrame,
  durationFrames,
  caret = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const progress = clampedInterpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
  );

  // Map progress → char count with a bit of jitter per character so the
  // typing rhythm feels human (short pauses on spaces, etc.).
  const charCount = Math.floor(progress * text.length);
  // Slight wobble: add +/- 1 char based on a seeded sine, but clamp.
  const jitter = 0;
  const shown = Math.max(0, Math.min(text.length, charCount + jitter));
  const visible = text.slice(0, shown);

  // Caret blink ~2hz when idle (post-typing), solid while typing.
  const typing = progress > 0 && progress < 1;
  const caretOpacity = typing
    ? 1
    : Math.sin((frame - (startFrame + durationFrames)) * 0.35) > 0
      ? 1
      : 0;

  return (
    <span style={style}>
      {visible}
      {caret && progress > 0 && (
        <span
          style={{
            display: "inline-block",
            width: "0.5em",
            marginLeft: 1,
            color: "currentColor",
            opacity: caretOpacity,
          }}
        >
          ▊
        </span>
      )}
    </span>
  );
};

// Exported just so future scenes can reuse it.
export function seededJitter(i: number, amp: number): number {
  return (seededRandom(i) * 2 - 1) * amp;
}
