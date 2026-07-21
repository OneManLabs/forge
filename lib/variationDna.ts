/**
 * Extract the visual DNA (palette + type stacks) from a picked variation's
 * HTML sketch. The goal: hand the Design + Code agents a HARD LIST of colors
 * and fonts to use so they can't accidentally reinvent the palette when
 * going deep.
 *
 * This is intentionally conservative — we extract what's literally in the
 * string. A missed color is fine (the sketch often has more colors than
 * matter). An invented color would be a regression.
 */

export interface VariationDna {
  /** Deduped color literals, sorted by frequency (most-prominent first). */
  colors: string[];
  /** Distinct font-family values seen in <style> or Tailwind arbitrary classes. */
  fonts: string[];
  /** True when the sketch has at least one accent color (not pure black/white/gray). */
  hasAccent: boolean;
  /** Border-radius values seen (most-prominent first). Includes px, rem, %. */
  radii: string[];
  /** Repeated padding/margin/gap values seen (most-prominent first). */
  spacing: string[];
  /** Box-shadow declarations seen. */
  shadows: string[];
}

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC_COLOR_RE = /(?:oklch|oklab|rgba?|hsla?)\s*\([^)]+\)/gi;
const CSS_FONT_FAMILY_RE = /font-family\s*:\s*([^;}\n]+)/gi;
const TW_FONT_FAMILY_RE = /font-\[family-name:([^\]]+)\]/g;

// border-radius: 12px | 0.5rem | 50% | 8px 8px 0 0
const CSS_RADIUS_RE = /border-radius\s*:\s*([^;}\n]+)/gi;
// rounded-[12px] / rounded-[0.5rem]
const TW_RADIUS_RE = /rounded-\[([^\]]+)\]/g;

// padding / padding-* / margin / margin-* / gap / row-gap / column-gap
const CSS_SPACING_RE = /(?:padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)?\s*:\s*([^;}\n]+)/gi;
// Tailwind arbitrary value spacing: p-[24px], px-[24px], py-[16px], m-[...], gap-[...]
const TW_SPACING_RE = /(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-\[([^\]]+)\]/g;

// box-shadow: 0 4px 20px rgba(0,0,0,0.1), ...
const CSS_SHADOW_RE = /box-shadow\s*:\s*([^;}\n]+)/gi;
// shadow-[0_4px_20px_rgba(...)]  — Tailwind arbitrary shadow
const TW_SHADOW_RE = /shadow-\[([^\]]+)\]/g;

function isNeutralish(color: string): boolean {
  const c = color.trim().toLowerCase();
  // Pure white / black / common greys.
  if (/^#(?:fff|ffffff|000|000000)$/.test(c)) return true;
  // Hex grays where R=G=B within 8/255.
  const m = /^#([0-9a-f]{6})$/.exec(c);
  if (m) {
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    if (Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && Math.abs(r - b) < 8) return true;
  }
  return false;
}

export function extractDna(html: string): VariationDna {
  const colorCounts = new Map<string, number>();

  const push = (raw: string) => {
    const norm = raw.trim().toLowerCase();
    // Expand 3-char hex to 6-char so frequency counts don't double-count.
    const expanded =
      /^#[0-9a-f]{3}$/.test(norm)
        ? "#" + norm.slice(1).split("").map((x) => x + x).join("")
        : norm;
    colorCounts.set(expanded, (colorCounts.get(expanded) ?? 0) + 1);
  };

  for (const m of html.matchAll(HEX_RE)) push(m[0]);
  for (const m of html.matchAll(FUNC_COLOR_RE)) push(m[0]);

  const fonts = new Set<string>();
  for (const m of html.matchAll(CSS_FONT_FAMILY_RE)) {
    const val = m[1].replace(/["']/g, "").trim();
    if (val && !val.startsWith("var(")) fonts.add(val);
  }
  for (const m of html.matchAll(TW_FONT_FAMILY_RE)) {
    const val = m[1].replace(/_/g, " ").trim();
    if (val && !val.startsWith("var(")) fonts.add(val);
  }

  const colors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)
    .slice(0, 12);

  const hasAccent = colors.some((c) => !isNeutralish(c));

  // --- Radii ---
  const radiiCounts = new Map<string, number>();
  for (const m of html.matchAll(CSS_RADIUS_RE)) pushFreq(radiiCounts, m[1]);
  for (const m of html.matchAll(TW_RADIUS_RE)) pushFreq(radiiCounts, m[1]);
  const radii = [...radiiCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v)
    .slice(0, 6);

  // --- Spacing ---
  // Pull padding/margin/gap values + tailwind arbitrary p-[24px] etc. We
  // keep ALL distinct values even if rare — the spacing system needs them.
  const spacingCounts = new Map<string, number>();
  for (const m of html.matchAll(CSS_SPACING_RE)) {
    // Split multi-value shorthand (e.g. "24px 48px") into distinct values.
    for (const part of splitValue(m[1])) pushFreq(spacingCounts, part);
  }
  for (const m of html.matchAll(TW_SPACING_RE)) pushFreq(spacingCounts, m[1]);
  const spacing = [...spacingCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v)
    .filter((v) => /^[0-9.]+(px|rem|em|%)?$/i.test(v) || /^var\(/.test(v))
    .slice(0, 10);

  // --- Shadows ---
  const shadowSet = new Set<string>();
  for (const m of html.matchAll(CSS_SHADOW_RE)) {
    const v = m[1].trim();
    if (v && v !== "none") shadowSet.add(v);
  }
  for (const m of html.matchAll(TW_SHADOW_RE)) {
    const v = m[1].trim().replace(/_/g, " ");
    if (v) shadowSet.add(v);
  }
  const shadows = [...shadowSet].slice(0, 4);

  return {
    colors,
    fonts: [...fonts].slice(0, 6),
    hasAccent,
    radii,
    spacing,
    shadows,
  };
}

function pushFreq(map: Map<string, number>, rawValue: string): void {
  const v = rawValue.trim().toLowerCase();
  if (!v) return;
  map.set(v, (map.get(v) ?? 0) + 1);
}

function splitValue(raw: string): string[] {
  // "24px 48px" → ["24px", "48px"]. Strip !important / comments.
  return raw
    .replace(/\/\*.*?\*\//g, "")
    .replace(/!important/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Build the hard-constraint block that goes into BOTH the Design and Code
 * agent user messages on a variation-go-deep turn.
 */
export function formatDnaBlock(dna: VariationDna): string {
  if (
    dna.colors.length === 0 &&
    dna.fonts.length === 0 &&
    dna.radii.length === 0 &&
    dna.spacing.length === 0 &&
    dna.shadows.length === 0
  ) {
    return "";
  }

  const lines: string[] = [];
  lines.push("<locked_visual_dna>");
  lines.push(
    "Tokens extracted programmatically from the picked sketch's HTML. These are the visual truth for this project — not suggestions. The studio parsed them off literal values in the sketch; your tokens.css :root MUST mirror them.",
  );
  lines.push("");

  if (dna.colors.length > 0) {
    lines.push("Palette (order of prominence in the sketch):");
    for (const c of dna.colors) lines.push(`  - ${c}`);
    lines.push("");
  }

  if (dna.fonts.length > 0) {
    lines.push("Type stacks used in the sketch:");
    for (const f of dna.fonts) lines.push(`  - ${f}`);
    lines.push("");
  }

  if (dna.radii.length > 0) {
    lines.push("Border-radius values found in the sketch:");
    for (const r of dna.radii) lines.push(`  - ${r}`);
    lines.push("");
  }

  if (dna.spacing.length > 0) {
    lines.push("Spacing values found in the sketch (padding / margin / gap):");
    for (const s of dna.spacing) lines.push(`  - ${s}`);
    lines.push("");
  }

  if (dna.shadows.length > 0) {
    lines.push("Shadows found in the sketch:");
    for (const s of dna.shadows) lines.push(`  - ${s}`);
    lines.push("");
  }

  lines.push("HARD RULES — no exceptions:");
  lines.push("1. Every color literal in tokens.css :root MUST be one of the hex/rgb/oklch values listed above. Do not invent replacements, do not hue-shift, do not 'improve.'");
  if (dna.hasAccent) {
    lines.push("2. --forge-accent MUST be the most prominent NON-NEUTRAL color from the sketch (the first listed color that isn't pure black/white/gray).");
  }
  lines.push("3. Every font-family in tokens.css and every Tailwind font-[family-name:...] class MUST match one of the type stacks above.");
  if (dna.radii.length > 0) {
    lines.push("4. --forge-radius and any additional radius vars in tokens.css MUST come from the extracted border-radius list above. No inventing new radii.");
  }
  if (dna.spacing.length > 0) {
    lines.push("5. The spacing scale in tokens.css (--card-padding, --section-spacing, --stack-gap, etc.) MUST use values from the extracted spacing list. If the sketch uses 24px and 48px for padding, your token values are 24px and 48px.");
  }
  if (dna.shadows.length > 0) {
    lines.push("6. Any --shadow-* var you declare MUST be one of the extracted shadow strings, verbatim.");
  }
  lines.push("7. The <tweaks> palette block you emit MUST list the sketch's colors in the same order of prominence. Names are yours to choose; values are locked.");
  lines.push("8. If you need a secondary token the sketch didn't explicitly have (e.g. --design-chart-warn), you may add it — but its VALUE must come from the extracted lists above. New values are forbidden.");
  lines.push("");
  lines.push("The user picked this sketch because of how it LOOKED. Your job is to preserve the look, not improve it.");
  lines.push("</locked_visual_dna>");
  return lines.join("\n");
}
