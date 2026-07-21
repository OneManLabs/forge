import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clampedInterpolate } from "../helpers";

interface CursorProps {
  /** Cursor X position at each keyframe (pixels). */
  xs: number[];
  /** Cursor Y position at each keyframe (pixels). */
  ys: number[];
  /** Frame at which each keyframe is reached. */
  keyframes: number[];
  /** Frames at which the cursor should briefly scale down (click). */
  clicks?: number[];
}

/**
 * Animated cursor that tweens through a set of keyframes. Smooth cubic
 * easing between points; spring-based scale-down on click frames.
 */
export const Cursor: React.FC<CursorProps> = ({ xs, ys, keyframes, clicks = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const x = clampedInterpolate(frame, keyframes as [number, number], xs as [number, number]);
  const y = clampedInterpolate(frame, keyframes as [number, number], ys as [number, number]);

  // Cursor scale: baseline 1, dips to 0.82 on each click frame with a
  // bouncy spring and returns to 1. Accumulate the max dip across all
  // clicks so multiple clicks within a close window don't fight.
  let scale = 1;
  for (const clickFrame of clicks) {
    const delta = frame - clickFrame;
    if (delta >= 0 && delta < fps * 0.6) {
      const s = spring({
        frame: delta,
        fps,
        config: { damping: 8, stiffness: 220 },
      });
      // s rises from 0→1; we dip down then return, so blend 0.82 back to 1.
      scale = Math.min(scale, 0.82 + 0.18 * s);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: "0 0",
        pointerEvents: "none",
        zIndex: 100,
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28">
        <path
          d="M 4 2 L 22 12 L 13 14 L 10 24 Z"
          fill="#ffffff"
          stroke="#0b0d0f"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      {/* Click ripple */}
      {clicks.map((cf) => {
        const d = frame - cf;
        if (d < 0 || d > fps * 0.8) return null;
        const r = clampedInterpolate(d, [0, fps * 0.8], [4, 60]);
        const o = clampedInterpolate(d, [0, fps * 0.8], [0.5, 0]);
        return (
          <svg
            key={cf}
            width="160"
            height="160"
            viewBox="0 0 160 160"
            style={{
              position: "absolute",
              left: -80 + 10,
              top: -80 + 10,
              pointerEvents: "none",
            }}
          >
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="#c1ec3a"
              strokeWidth="2"
              opacity={o}
            />
          </svg>
        );
      })}
    </div>
  );
};
