import type { TweakState } from "./types";

export const ACCENT_HEX: Record<TweakState["accent"], string> = {
  lime: "#c1ec3a",
  ember: "#ee6a3b",
  violet: "#9b6cf3",
  cyan: "#5fc6e6",
  paper: "#ece4cf",
};

export const ACCENT_INK_HEX: Record<TweakState["accent"], string> = {
  lime: "#1a2607",
  ember: "#fff1ea",
  violet: "#fff1ea",
  cyan: "#0e2a32",
  paper: "#1c1f25",
};

export const FONT_DISPLAY: Record<TweakState["font"], string> = {
  geometric: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  editorial: "'Fraunces', 'Times New Roman', serif",
  "mono-first": "'JetBrains Mono', ui-monospace, monospace",
  humanist: "'Instrument Serif', serif",
};

export const FONT_BODY: Record<TweakState["font"], string> = {
  geometric: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  editorial: "'Inter Tight', ui-sans-serif, system-ui, sans-serif",
  "mono-first": "'Inter Tight', ui-sans-serif, system-ui, sans-serif",
  humanist: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
};

export interface CanvasTokens {
  bg: string;
  bgRaised: string;
  bgSunken: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  line: string;
  accent: string;
  accentInk: string;
  fontDisplay: string;
  fontBody: string;
  radius: string;
  pad: string;
  fontScale: string;
  scheme: "dark" | "light";
}

export function tokensFromTweaks(t: TweakState, customAccentHex?: string | null): CanvasTokens {
  const dark = t.theme === "dark";
  const accent = customAccentHex && /^#?[0-9a-fA-F]{3,8}$|^oklch|^rgb|^hsl/.test(customAccentHex)
    ? customAccentHex.startsWith("#") || /^(oklch|rgb|hsl)/.test(customAccentHex)
      ? customAccentHex
      : `#${customAccentHex}`
    : ACCENT_HEX[t.accent];
  return {
    bg: dark ? "#15171a" : "#fafaf7",
    bgRaised: dark ? "#222428" : "#ffffff",
    bgSunken: dark ? "#0f1113" : "#efeee9",
    ink: dark ? "#f5f5f7" : "#1c1f25",
    inkMuted: dark ? "#a8acb1" : "#5a6068",
    inkFaint: dark ? "#73777d" : "#8a8f96",
    line: dark ? "#3a3e44" : "#e3e4e6",
    accent,
    accentInk: ACCENT_INK_HEX[t.accent],
    fontDisplay: FONT_DISPLAY[t.font],
    fontBody: FONT_BODY[t.font],
    radius: `${t.radius}px`,
    pad: `${t.cardPad}px`,
    fontScale: `${(t.fontScale / 100).toFixed(3)}`,
    scheme: dark ? "dark" : "light",
  };
}

/**
 * CSS injected into the iframe to drive live token updates without
 * regenerating. Generated designs reference these CSS variables
 * (see system prompt instructions).
 */
export function tokensToOverlayCss(t: TweakState, customAccentHex?: string | null, extraVars?: Record<string, string>): string {
  const tk = tokensFromTweaks(t, customAccentHex);
  const extras = extraVars
    ? Object.entries(extraVars)
        .map(([k, v]) => `  ${k.startsWith("--") ? k : `--${k}`}: ${v};`)
        .join("\n")
    : "";
  return `:root {
  --forge-bg: ${tk.bg};
  --forge-bg-raised: ${tk.bgRaised};
  --forge-bg-sunken: ${tk.bgSunken};
  --forge-ink: ${tk.ink};
  --forge-ink-muted: ${tk.inkMuted};
  --forge-ink-faint: ${tk.inkFaint};
  --forge-line: ${tk.line};
  --forge-accent: ${tk.accent};
  --forge-accent-ink: ${tk.accentInk};
  --forge-font-display: ${tk.fontDisplay};
  --forge-font-body: ${tk.fontBody};
  --forge-radius: ${tk.radius};
  --forge-pad: ${tk.pad};
${extras}
  color-scheme: ${tk.scheme};
}
html { font-size: calc(100% * ${tk.fontScale}); }
body { font-family: var(--forge-font-body); background: var(--forge-bg); color: var(--forge-ink); margin: 0; }`;
}

/** Plain key:value summary for the user message — small, deterministic, easy
 *  for Claude to consume verbatim.
 *
 *  IMPORTANT: does NOT include --forge-accent or --forge-accent-ink. Those
 *  colors should come from the design's own palette (emitted in <tweaks>),
 *  not from the user's studio-chrome accent. If we passed the studio accent
 *  here, every generation would inherit lime (or whatever the user's chrome
 *  is using) and the designs would all look the same. */
export function tokensSummary(t: TweakState): string {
  const tk = tokensFromTweaks(t);
  return [
    `# Theme (structural tokens only — PICK YOUR OWN accent colors per design)`,
    `forge-bg: ${tk.bg}`,
    `forge-bg-raised: ${tk.bgRaised}`,
    `forge-bg-sunken: ${tk.bgSunken}`,
    `forge-ink: ${tk.ink}`,
    `forge-ink-muted: ${tk.inkMuted}`,
    `forge-ink-faint: ${tk.inkFaint}`,
    `forge-line: ${tk.line}`,
    `# accent: intentionally omitted — invent a palette in <tweaks> that suits THIS design`,
    `forge-font-display: ${tk.fontDisplay}`,
    `forge-font-body: ${tk.fontBody}`,
    `forge-radius: ${tk.radius}`,
    `forge-pad: ${tk.pad}`,
    `forge-font-scale: ${tk.fontScale}`,
    `color-scheme: ${tk.scheme}`,
  ].join("\n");
}
