/**
 * Timing + visual constants for the Forge Design demo video.
 * Every scene reads its frame offsets from here so the storyboard
 * is easy to re-time in one place.
 */

export const FPS = 30;

// Scene durations in frames (all at FPS above).
export const DURATIONS = {
  intro: 90,        // 0-3s
  prompt: 240,      // 3-11s   (8s)
  variations: 240,  // 11-19s  (8s)
  pick: 240,        // 38-46s  (8s)
  tweaks: 270,      // 46-55s  (9s) — palette cycle only; sliders visible but static
  comment: 240,     // 61-69s  (8s)  — pin + comment demo
  textEdit: 180,    // 67-73s  (6s)  — inline text edit demo
  reveal: 210,      // 73-80s  (7s)
};

export const TOTAL_FRAMES =
  DURATIONS.intro +
  DURATIONS.prompt +
  DURATIONS.variations +
  DURATIONS.pick +
  DURATIONS.tweaks +
  DURATIONS.comment +
  DURATIONS.textEdit +
  DURATIONS.reveal;

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

// Dark Forge palette used across the chrome + intro/outro.
export const COLORS = {
  bg: "#0b0d0f",
  bgRaised: "#141619",
  bgSunken: "#08090b",
  ink: "#f5f5f7",
  inkMuted: "#a8acb1",
  inkFaint: "#64686e",
  line: "#242629",
  lineSoft: "#1b1d20",
  accent: "#c1ec3a",         // Forge lime
  accentInk: "#1a2607",
  accentSoft: "rgba(193, 236, 58, 0.12)",
  cyan: "#5fc6e6",
  gold: "#f0c368",
  ember: "#ee6a3b",
  rockBg: "#0a0b0d",
  rockPaper: "#e8e4d9",
  rockInk: "#1a1816",
  rockAccent: "#c9a96a",     // luxury gold for RockStack
};

export const PROMPT_TEXT =
  "Create a silly but premium landing page for RockStack, a startup that sells artisanal rocks. Make it look luxury but completely absurd.";

// The four ridiculous product names shown in variations + the final page.
export const PRODUCT_NAMES = [
  "Executive Paperweight",
  "Meditation Stone",
  "Heritage Pebble",
  "Artisan Keystone",
];

// Variation card metadata — each one gets a slightly different palette
// treatment so the 4-up grid reads as "different takes on the same brief."
export const VARIATIONS = [
  {
    name: "Gallery Noir",
    summary: "Museum-dark, hand-tossed serif, a single gold thread",
    palette: { bg: "#0e0f12", ink: "#edece6", accent: "#c9a96a" },
  },
  {
    name: "Warm Bazaar",
    summary: "Clay, terracotta, stacked serifs — a boutique on a side street",
    palette: { bg: "#1a1410", ink: "#f5ede1", accent: "#d47149" },
  },
  {
    name: "Cold Storage",
    summary: "Grayscale, mono-first, a single blue temperature read",
    palette: { bg: "#101216", ink: "#f0f2f5", accent: "#5fc6e6" },
  },
  {
    name: "Brutalist Quarry",
    summary: "Concrete cream, oversized numerals, the CTA yells",
    palette: { bg: "#1c1b18", ink: "#efe9dc", accent: "#f0c368" },
  },
];
