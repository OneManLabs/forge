import type { BrandKit, ProjectState } from "./types";

/**
 * Parsers that turn common "source of truth" design-token files into a
 * Forge BrandKit (CSS vars + font stacks). Everything is best-effort and
 * regex-based — we don't run the user's code.
 */

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isLikelyColor(v: string): boolean {
  const s = v.trim();
  if (HEX_RE.test(s)) return true;
  if (/^(rgb|rgba|hsl|hsla|oklch|oklab|color)\s*\(/i.test(s)) return true;
  return false;
}

function isLikelyFont(v: string): boolean {
  const s = v.trim();
  // A font-family value almost always contains at least one quoted name
  // or a recognizable generic keyword.
  if (/[a-z][a-z-]+,\s*(serif|sans-serif|mono|monospace|cursive|system-ui)/i.test(s)) return true;
  if (/["'][^"']+["']/.test(s) && s.length < 240) return true;
  return false;
}

/**
 * CSS parser — scans any ":root { ... }" or top-level custom property
 * declarations and pulls them out as --name: value pairs. Font-family
 * rules are collected separately (the values, not the selectors).
 */
export function parseCss(source: string): { vars: Record<string, string>; fonts: string[] } {
  const vars: Record<string, string> = {};
  const fonts = new Set<string>();

  // Custom properties: --name: value;   (anywhere in the file)
  const varRe = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+?)\s*;/g;
  for (const m of source.matchAll(varRe)) {
    const name = m[1];
    const value = m[2].trim();
    if (!value || value.startsWith("var(")) continue;
    vars[name] = value;
    // If the value LOOKS like a font stack, record it too — the user
    // may have declared tokens like `--font-display: "Geist", ...`.
    if (isLikelyFont(value)) fonts.add(value);
  }

  // Plain `font-family: ...` declarations anywhere.
  const ffRe = /font-family\s*:\s*([^;}\n]+)/gi;
  for (const m of source.matchAll(ffRe)) {
    const value = m[1].trim().replace(/^["']|["']$/g, "");
    if (!value || value.startsWith("var(")) continue;
    if (isLikelyFont(value) || value.includes(",")) fonts.add(value);
  }

  return { vars, fonts: [...fonts].slice(0, 12) };
}

/**
 * Tailwind config parser — we don't run JS, so we regex the theme object
 * for the pieces we actually use: colors, fontFamily, borderRadius,
 * spacing. Every extracted color/radius/spacing becomes a --kit-* CSS
 * variable. Font stacks go to the fonts array.
 *
 * Handles both `theme: { extend: { colors: {...} } }` and the shorter
 * `theme: { colors: {...} }` form. Nested color objects (e.g.
 * `primary: { 500: "#abc" }`) are flattened to `--kit-color-primary-500`.
 */
export function parseTailwindConfig(source: string): {
  vars: Record<string, string>;
  fonts: string[];
} {
  const vars: Record<string, string> = {};
  const fonts = new Set<string>();

  const slice = (key: string): string | null => {
    // Find the KEY: { ... } block and return its inner body. Balance braces.
    const start = source.search(new RegExp(`\\b${key}\\s*:\\s*\\{`));
    if (start < 0) return null;
    const openIdx = source.indexOf("{", start);
    if (openIdx < 0) return null;
    let depth = 0;
    for (let i = openIdx; i < source.length; i++) {
      const c = source[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return source.slice(openIdx + 1, i);
      }
    }
    return null;
  };

  const flattenColors = (body: string, prefix: string) => {
    // Walk key: value pairs in this block. Values can be strings or
    // nested objects (shade maps).
    const re = /(["']?[a-zA-Z0-9_-]+["']?)\s*:\s*("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\{)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      const rawKey = m[1].replace(/^["']|["']$/g, "");
      const rest = m[2];
      if (rest === "{") {
        const nestStart = body.indexOf("{", m.index);
        let depth = 0;
        let end = -1;
        for (let i = nestStart; i < body.length; i++) {
          if (body[i] === "{") depth++;
          else if (body[i] === "}") {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }
        if (end > 0) {
          flattenColors(body.slice(nestStart + 1, end), `${prefix}-${rawKey}`);
          re.lastIndex = end + 1;
        }
      } else {
        const value = rest.slice(1, -1);
        if (isLikelyColor(value)) {
          vars[`${prefix}-${rawKey}`.toLowerCase()] = value;
        }
      }
    }
  };

  // Colors — check both extend.colors and top-level colors.
  const colorsExtend = slice("extend")?.match(/colors\s*:\s*\{/) ? slice("extend") : null;
  if (colorsExtend) {
    // Narrow to the colors block inside extend.
    const subBody = slice("colors");
    if (subBody) flattenColors(subBody, "--kit-color");
  }
  const directColors = slice("colors");
  if (directColors) flattenColors(directColors, "--kit-color");

  // Font families.
  const fontBody = slice("fontFamily") ?? slice("fonts");
  if (fontBody) {
    // Each key: ['Inter', 'sans-serif'] or a string.
    const re = /([a-zA-Z0-9_-]+)\s*:\s*(\[[^\]]+\]|"[^"]+"|'[^']+')/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(fontBody))) {
      const rawValue = m[2];
      const items = rawValue.startsWith("[")
        ? rawValue
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean)
        : [rawValue.slice(1, -1)];
      const stack = items.join(", ");
      if (stack) fonts.add(stack);
    }
  }

  // Radius.
  const radiusBody = slice("borderRadius");
  if (radiusBody) {
    const re = /([a-zA-Z0-9_-]+)\s*:\s*(["'])([^"']+)\2/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(radiusBody))) {
      vars[`--kit-radius-${m[1].toLowerCase()}`] = m[3];
    }
  }

  // Spacing.
  const spacingBody = slice("spacing");
  if (spacingBody) {
    const re = /([a-zA-Z0-9_.-]+)\s*:\s*(["'])([^"']+)\2/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(spacingBody))) {
      const key = m[1].replace(/\./g, "_");
      vars[`--kit-space-${key.toLowerCase()}`] = m[3];
    }
  }

  return { vars, fonts: [...fonts].slice(0, 12) };
}

/**
 * Forge project (.forge JSON) parser — pulls the brand kit out of a
 * previously-exported project if one exists, OR derives a kit from the
 * project's tokens.css contents.
 */
export function parseForgeProject(source: string): {
  vars: Record<string, string>;
  fonts: string[];
  name?: string;
} {
  try {
    const raw = JSON.parse(source) as Record<string, unknown>;
    const project =
      raw.__forge === "project" && raw.project
        ? (raw.project as Partial<ProjectState>)
        : (raw as Partial<ProjectState>);
    if (project.brandKit) {
      const bk = project.brandKit as BrandKit;
      return { vars: bk.vars, fonts: bk.fonts, name: bk.name };
    }
    // No explicit brandKit — try to derive from the tokens.css file if any.
    const tokens = (project.files ?? []).find((f) => f.path === "tokens.css");
    if (tokens) {
      const { vars, fonts } = parseCss(tokens.content);
      return { vars, fonts, name: project.projectName };
    }
    return { vars: {}, fonts: [] };
  } catch {
    return { vars: {}, fonts: [] };
  }
}

/** Turn the brand kit into a :root block injectable into tokens.css. */
export function brandKitToCss(kit: BrandKit): string {
  const lines = [`/* Brand Kit — ${kit.name} (imported from ${kit.source}) */`, ":root {"];
  for (const [k, v] of Object.entries(kit.vars)) {
    lines.push(`  ${k}: ${v};`);
  }
  lines.push("}");
  return lines.join("\n");
}

/**
 * Format the brand kit as a `<brand_kit_locked_tokens>` context block for
 * the Design + Code agents. Same shape as <locked_visual_dna> — a hard
 * list of tokens the model must use rather than invent.
 */
export function formatBrandKitBlock(kit: BrandKit): string {
  const varLines = Object.entries(kit.vars)
    .slice(0, 60) // keep context size sane
    .map(([k, v]) => `  ${k}: ${v};`);
  const fontLines = kit.fonts.slice(0, 6).map((f) => `  - ${f}`);
  const lines: string[] = [];
  lines.push("<brand_kit_locked_tokens>");
  lines.push(
    `The user has imported a brand kit — "${kit.name}" (source: ${kit.source}). The palette and type stacks below are the brand's design system. Treat them as a HARD constraint, same as <locked_visual_dna> on variation-go-deep turns.`,
  );
  lines.push("");
  if (varLines.length > 0) {
    lines.push("Brand tokens (CSS custom properties — use verbatim values):");
    lines.push(...varLines);
    lines.push("");
  }
  if (fontLines.length > 0) {
    lines.push("Brand type stacks:");
    lines.push(...fontLines);
    lines.push("");
  }
  lines.push("HARD RULES — this is the user's real brand. Treat it as sacred:");
  lines.push(
    "1. tokens.css :root MUST include EVERY variable from the brand-tokens list above, VERBATIM — same name, same value. Copy them in at the top of :root before any Forge-specific tokens. You may ADD new tokens alongside them; you may NOT rename, re-value, or omit brand tokens.",
  );
  lines.push(
    "2. NEVER INVENT NEW COLORS. Every color referenced anywhere in the generated code (tokens.css, components, inline styles, SVGs) must resolve through one of the brand variables — either the raw brand token (e.g. var(--kit-color-primary-500)) or a Forge alias that points at a brand token.",
  );
  lines.push(
    "3. --forge-accent / --forge-bg / --forge-ink / --forge-line etc. MUST alias brand colors: e.g. `--forge-accent: var(--kit-color-primary-500);` `--forge-bg: var(--kit-color-neutral-50);`. Pick sensible pairings based on the brand's semantic naming. Do NOT assign hex values directly to --forge-* in a brand-kit project.",
  );
  lines.push(
    "4. font-family MUST come from the brand type stacks. Alias via --forge-font-display / --forge-font-body to the brand font variable (or the raw stack if the brand didn't give you a variable).",
  );
  lines.push(
    "5. Your <tweaks> palette block MUST list the brand's top 4-6 colors (in order of prominence) — the Knobs panel's swatch row should read as the brand's palette.",
  );
  lines.push(
    "6. If the user's design intent conflicts with a brand token (e.g. they asked for a 'neon pink' design but the brand is blue-and-beige), STAY LOYAL TO THE BRAND. The user will tell you if they want to abandon the brand kit.",
  );
  lines.push("</brand_kit_locked_tokens>");
  return lines.join("\n");
}
