import { interpolate, Easing } from "remotion";

/**
 * Interpolate with `extrapolateRight: "clamp"` by default — so animations
 * don't overshoot their end state. Saves typing on every single call.
 */
export function clampedInterpolate(
  frame: number,
  input: readonly number[],
  output: readonly number[],
  easing = Easing.out(Easing.cubic),
) {
  return interpolate(frame, [...input], [...output], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/** Normalize a frame from [start, end] into [0, 1]. */
export function progress(frame: number, start: number, end: number): number {
  return clampedInterpolate(frame, [start, end], [0, 1]);
}

/** Sine-wave breathing from 0..1..0 over the given frame window. */
export function breathe(frame: number, start: number, end: number): number {
  const t = progress(frame, start, end);
  return Math.sin(t * Math.PI);
}

/** Deterministic jitter. Seed-based so it looks the same every render. */
export function seededRandom(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
