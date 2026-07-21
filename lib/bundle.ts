import JSZip from "jszip";
import { tokensFromTweaks } from "./tweakColors";
import type { FilePayload, ProjectState, TweakState, VariationOption } from "./types";

export function buildTokensCss(tweaks: TweakState): string {
  const tk = tokensFromTweaks(tweaks);
  return `/* Forge — exported design tokens */
:root {
  --forge-bg:        ${tk.bg};
  --forge-bg-raised: ${tk.bgRaised};
  --forge-bg-sunken: ${tk.bgSunken};
  --forge-ink:       ${tk.ink};
  --forge-ink-muted: ${tk.inkMuted};
  --forge-ink-faint: ${tk.inkFaint};
  --forge-line:      ${tk.line};
  --forge-accent:    ${tk.accent};
  --forge-accent-ink: ${tk.accentInk};

  --forge-radius:       ${tk.radius};
  --forge-pad:          ${tk.pad};
  --forge-font-scale:   ${tk.fontScale};

  --forge-font-display: ${tk.fontDisplay};
  --forge-font-body:    ${tk.fontBody};
  --forge-font-mono:    'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  color-scheme: ${tk.scheme};
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--forge-bg);
  color: var(--forge-ink);
  font-family: var(--forge-font-body);
  font-size: calc(14px * ${tk.fontScale});
  -webkit-font-smoothing: antialiased;
}
`;
}

function projectSlug(project: ProjectState): string {
  return (
    project.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function buildPromptMd(project: ProjectState): string {
  const slug = projectSlug(project);
  const recentTurns = project.messages
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m, i) => `${i + 1}. ${m.text.replace(/\s+/g, " ").slice(0, 320)}`)
    .join("\n");
  const componentList = project.files
    .filter((f) => f.path.startsWith("components/"))
    .map((f) => `- ${f.path}`)
    .join("\n");
  return `# Design Handoff — ${project.projectName}

## Paste this into Claude Code

> **Replace the URL** in the snippet below with the real public URL of
> this folder once hosted. The example shown is illustrative only.

\`\`\`
Fetch this design file, read its readme, and implement the relevant aspects of the design.
https://forge-handoff-${slug}.vercel.app?open_file=CORE.html
Implement: CORE.html
\`\`\`

Quick deploy options:

- **Vercel** — \`vercel deploy\` from this folder, then paste the preview URL.
- **Cloudflare Pages** — \`npx wrangler pages deploy .\` (or drag-and-drop
  the folder in the Pages dashboard).
- **GitHub raw / Gist** — push the folder to a repo, then use
  \`https://raw.githubusercontent.com/<you>/<repo>/main/CORE.html\`.

Once Claude Code fetches the URL it reads this README, follows the spec
below, and starts implementing.

---

**Stack:** Next.js 15 (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui

> **Implementing agent:** read this entire file before touching code. The
> goal is a faithful production implementation of the prototype in
> \`CORE.html\`, not a creative reinterpretation.

## Stack expectation

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS, with the design tokens in
  \`design-tokens.css\` mirrored into your \`tailwind.config.ts\` (or
  imported as CSS vars in \`globals.css\`).
- **Components:** shadcn/ui as a base. Override variants to match the
  prototype's look — do NOT ship default shadcn styling.
- **Routing:** if the prototype is multi-page (check App.jsx for state-
  based routing), translate each page to a Next.js route.
- **Data:** the prototype's \`data.js\` is sample data. Extract its shapes
  into TypeScript types under \`lib/types.ts\` (or similar) and wire them to
  the actual data source for production.

## CORE.html is the visual source of truth

The shipping product must be visually indistinguishable from the prototype
at the three core viewports (390 / 768 / 1280). Match every aspect below
pixel-perfect — drift on any one of them shows up immediately as "this
doesn't look like what I designed."

### Layout (must match exactly)

- Container max-widths and side gutters at every viewport.
- Grid columns + gaps. Asymmetric offsets and overlaps.
- Vertical rhythm: section padding (top/bottom), gap between sections,
  baseline grid for type.
- Hero treatment: full-bleed vs. boxed, type-led vs. image-led.
- Nav: collapse/hamburger behavior at the breakpoint where it switches.

### Spacing (must match exactly)

- Padding, margin, gap — every value comes from a CSS variable in
  \`design-tokens.css\`. Don't substitute "close enough" Tailwind defaults.
- Density: card density, list density, form-row density. The prototype is
  authored at one density; preserve it.

### Color (must match exactly — do not interpret)

- Every color literal in your output MUST reference a \`--forge-*\` or
  \`--design-*\` token from \`design-tokens.css\`. Mirror them into your
  Tailwind config (\`extend.colors\`) or directly as CSS vars in
  \`globals.css\`.
- DO NOT reach for Tailwind's built-in palette (slate-500, indigo-400,
  etc.). Those bypass the token layer and break the design's "wired to
  one source of truth" property.
- Hover / focus / active / disabled states all use token variants — never
  ad-hoc opacities or unrelated palette picks.

### Typography (must match exactly)

- Font families: use the named fonts from \`design-tokens.css\`
  (\`--forge-font-display\`, \`--forge-font-body\`). Load them via
  \`next/font\` or \`@font-face\` so SSR doesn't FOUC.
- Weights, sizes, tracking, leading: every type style in the prototype
  has specific values. Mirror them into your type scale.

### Interactions (every clickable thing has all four states)

**Match hover, focus, and active states exactly as shown in the preview** — if the prototype's button darkens by ~6% on hover, yours darkens by ~6%, not "whatever feels natural." These small-state behaviors are the difference between "looks like the design" and "feels like the design."

- **Hover** — visible affordance on every interactive element.
- **Focus** — \`:focus-visible\` ring using \`--forge-accent\`. Required for keyboard a11y.
- **Active / pressed** — slight scale or color shift on click.
- **Disabled** — reduced opacity AND \`pointer-events: none\` AND
  \`aria-disabled\`.
- Modals: focus trap on open, focus restore on close, Esc closes, click-
  outside closes.
- Forms: inline validation errors, submit → loading → success/error states.
- Animation timings as authored in the prototype — don't speed up or
  slow down "for taste."

### Responsive

- Authored mobile-first; \`md:\` and \`lg:\` overrides for tablet/desktop.
- 390 / 768 / 1280 are the three required QA points. Verify each one
  visually before shipping.

## Priority order when something doesn't translate cleanly

1. **Visual fidelity** at the three core viewports.
2. **Accessibility** (ARIA, focus rings, keyboard nav, contrast).
3. **Production polish** (loading / empty / error / success states for every
   data-driven component, even ones the prototype only shows in happy path).
4. **Performance** (image optimization, code-splitting per route).
5. **Code style** (your team's conventions).

If visual fidelity conflicts with accessibility, accessibility wins —
but try to fix BOTH (re-derive the visual to be accessible, don't just
strip the styling).

## Component map

The prototype already breaks the design into components. Carry the same
boundaries into your codebase:

${componentList || "- (no components/*.jsx files in this export)"}

The component metadata is in \`components.json\` — names, source paths,
and which other components each one references.

## What the user asked for

Recent prompts that shaped this design:

${recentTurns || "_(no user prompts captured)_"}

## Design state at export

- Theme: ${project.tweaks.theme}
- Density: ${project.tweaks.density}
- Viewport tested at: ${project.tweaks.viewport}

## Implementation rules

- **Never hardcode colors / radii / fonts** outside of your tokens layer.
  The prototype's \`tokens.css\` is the contract — every value lives in a
  CSS variable, every component references via \`var(--...)\`.
- **Mobile-first.** Author all base classes for mobile, layer \`md:\` and
  \`lg:\` overrides for tablet/desktop.
- **Full accessibility.** ARIA labels on icon-only controls; visible
  \`:focus-visible\` rings using the accent token; semantic HTML; keyboard-
  reachable everything; modals trap focus + restore on close.
- **Loading / empty / error / success states** for every data-driven
  component. The prototype mocks happy paths — you build the rest.
- **Don't ship the prototype HTML verbatim.** It's instructional, not the
  shipping artifact. Re-author each page as proper React components in
  your file structure.

## Where to start

1. Open \`CORE.html\` in a browser to see what you're building.
2. Read \`design-tokens.css\` and mirror the variables into your tokens layer.
3. Walk \`components/*.jsx\` to understand the component graph.
4. Stub out the routes / pages, then fill in components in dependency
   order (leaves first, App last).
`;
}

export const HANDOFF_INSTRUCTIONS = `# Handoff Instructions

This bundle was generated by Forge Design — a self-hosted design studio
that turns prompts into multi-file React prototypes.

## What's in the box

- \`CORE.html\` — Self-contained interactive prototype. Open it in any
  modern browser. Loads React + ReactDOM + Babel-standalone + Tailwind
  via CDN — no build step.
- \`design-tokens.css\` — All design tokens (palette, type, spacing,
  radius) as CSS custom properties on \`:root\`. The single source of
  truth for the visual system.
- \`components/*.jsx\` — One file per component. Defined as JSX, attached
  to \`window\` so siblings can reference each other (no ES modules).
- \`data.js\` — Sample content the components render.
- \`components.json\` — Structured inventory of every component: name,
  source path, references to other components.
- \`assets/\` — Drop image / SVG assets here. The prototype refers to them
  by relative path (\`assets/logo.svg\`, etc.). Empty by default.
- \`PROMPT.md\` — Detailed implementation instructions for an AI agent or
  human implementer. Read this first.
- \`README.md\` — This file.

## How to use with Claude Code

1. Host this folder somewhere Claude Code can fetch (Vercel / Cloudflare
   Pages, GitHub raw URL, or a Gist).
2. In Claude Code, paste:

       Fetch this design file, read its readme, and implement the relevant aspects of the design.
       https://your-host.example.com?open_file=CORE.html
       Implement: CORE.html

3. Claude Code will pull the bundle, read \`PROMPT.md\`, and start
   implementing into your project.

## How to use locally

\`\`\`bash
npx serve .            # serve this folder
# then open http://localhost:3000/CORE.html
\`\`\`

Or just open \`CORE.html\` directly — most modern browsers will run it
without a server (the React + Babel CDN handles the rest).

## How to extend the prototype before handoff

- **Reskin:** edit \`design-tokens.css\` — every component will pick up
  the new palette / type / spacing.
- **Add a component:** drop a new file under \`components/\`, add a
  \`<script type="text/babel" src="components/Name.jsx">\` line in
  \`CORE.html\` BEFORE \`App.jsx\`, then reference it as a global inside App.
- **Add a page:** create a \`components/SomePage.jsx\`, add it to the
  route map inside \`App.jsx\`, add a NavBar link.
`;

interface ComponentInventoryEntry {
  name: string;
  path: string;
  /** Other window-attached components this one references in its body. */
  references: string[];
  /** Lines of source. */
  lines: number;
  /** Whether the file ends with `Object.assign(window, { Name })`. */
  exportsToWindow: boolean;
  /** data-forge-component values found on the root JSX element. */
  rootTags: string[];
}

function extractComponents(files: FilePayload[]): ComponentInventoryEntry[] {
  const out: ComponentInventoryEntry[] = [];
  // Build a global set of all window-exported names across the project so
  // we can detect cross-references inside each file.
  const allNames = new Set<string>();
  for (const f of files) {
    if (!f.path.endsWith(".jsx")) continue;
    for (const m of f.content.matchAll(/Object\.assign\s*\(\s*window\s*,\s*\{\s*([A-Z][A-Za-z0-9_]*)/g)) {
      allNames.add(m[1]);
    }
  }
  for (const f of files) {
    if (!f.path.endsWith(".jsx")) continue;
    const exportMatches = [...f.content.matchAll(/Object\.assign\s*\(\s*window\s*,\s*\{\s*([A-Z][A-Za-z0-9_]*)/g)];
    const names = exportMatches.map((m) => m[1]);
    if (names.length === 0) {
      // Unnamed component file — fall back to inferring a name from the path.
      const base = f.path.split("/").pop() ?? "Component";
      names.push(base.replace(/\.jsx$/, ""));
    }
    const referenced = new Set<string>();
    for (const candidate of allNames) {
      if (names.includes(candidate)) continue;
      const re = new RegExp(`<${candidate}\\b`, "g");
      if (re.test(f.content)) referenced.add(candidate);
    }
    const rootTags = Array.from(
      new Set(
        [...f.content.matchAll(/data-forge-component\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]),
      ),
    );
    for (const name of names) {
      out.push({
        name,
        path: f.path,
        references: [...referenced].sort(),
        lines: f.content.split("\n").length,
        exportsToWindow: exportMatches.length > 0,
        rootTags,
      });
    }
  }
  // Sort: App / Pages first, then alphabetical components.
  out.sort((a, b) => {
    const aRank = a.name === "App" ? 0 : a.name.endsWith("Page") ? 1 : 2;
    const bRank = b.name === "App" ? 0 : b.name.endsWith("Page") ? 1 : 2;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export function buildComponentsJson(project: ProjectState): string {
  const inventory = extractComponents(project.files);
  const payload = {
    project: project.projectName,
    generated: new Date().toISOString(),
    entry: "CORE.html",
    files: project.files.map((f) => ({
      path: f.path,
      language: f.language,
      bytes: f.content.length,
      lines: f.content.split("\n").length,
    })),
    components: inventory,
  };
  return JSON.stringify(payload, null, 2);
}

function fallbackFiles(project: ProjectState): FilePayload[] {
  return [
    {
      path: "forge.html",
      language: "html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${project.projectName} — Empty design</title>
  <link rel="stylesheet" href="design-tokens.css">
</head>
<body>
  <main style="padding: 64px; text-align: center;">
    <h1>${project.projectName}</h1>
    <p>The studio was empty when this bundle was generated. Run another
       chat turn in Forge to populate it.</p>
  </main>
</body>
</html>
`,
    },
  ];
}

export interface HandoffBundle {
  zipBlob: Blob;
  filename: string;
  files: Array<{ name: string; size: number; type: string }>;
  prompt: string;
}

/**
 * Translate the working tree's path scheme to the handoff scheme:
 *   forge.html        → CORE.html
 *   <link href="tokens.css">          stays — both files exist
 *   <script src="forge.html">         (n/a)
 * Internally the project uses forge.html as the entry; the handoff renames
 * it to CORE.html so the bundle matches Claude Design's convention. We
 * also rewrite any in-content "forge.html" string references so README /
 * inline doc strings stay consistent.
 */
function bundlePathFor(workingPath: string): string {
  if (workingPath === "forge.html") return "CORE.html";
  return workingPath;
}

function rewriteContentForBundle(content: string, language: string): string {
  // Only rewrite obvious doc-string references, not actual code identifiers.
  // The entry path itself doesn't appear inside any of the project files
  // by default — but if a comment in JSX says "see forge.html", swap it.
  if (language === "html" || language === "md" || language === "txt") {
    return content.replace(/\bforge\.html\b/g, "CORE.html");
  }
  return content;
}

export async function buildHandoffBundle(project: ProjectState): Promise<HandoffBundle> {
  const slug = project.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const folder = `forge-${slug}-${stamp}`;

  const tokensCss = buildTokensCss(project.tweaks);
  const projectFiles = project.files.length > 0 ? project.files : fallbackFiles(project);
  const promptMd = buildPromptMd(project);
  const componentsJson = buildComponentsJson(project);

  const zip = new JSZip();
  const root = zip.folder(folder)!;

  // Write every real project file at its actual path, with forge.html
  // renamed to CORE.html.
  for (const f of projectFiles) {
    root.file(bundlePathFor(f.path), rewriteContentForBundle(f.content, f.language));
  }

  // Empty assets/ folder so the recipient has an obvious place to drop
  // images / SVGs / fonts.
  const assets = root.folder("assets");
  if (assets) {
    assets.file(
      ".gitkeep",
      "# Drop image / SVG / font assets here.\n# Reference them from JSX as <img src=\"assets/your-file.png\" /> etc.\n",
    );
  }

  // Companion artifacts for the handoff.
  root.file("design-tokens.css", tokensCss);
  root.file("components.json", componentsJson);
  root.file("PROMPT.md", promptMd);
  root.file("README.md", HANDOFF_INSTRUCTIONS);

  const zipBlob = await zip.generateAsync({ type: "blob" });

  const manifest: HandoffBundle["files"] = projectFiles.map((f) => ({
    name: bundlePathFor(f.path),
    size: f.content.length,
    type: f.language,
  }));
  manifest.push({ name: "assets/", size: 0, type: "folder" });
  manifest.push({ name: "design-tokens.css", size: tokensCss.length, type: "css" });
  manifest.push({ name: "components.json", size: componentsJson.length, type: "json" });
  manifest.push({ name: "PROMPT.md", size: promptMd.length, type: "md" });
  manifest.push({ name: "README.md", size: HANDOFF_INSTRUCTIONS.length, type: "md" });

  const prompt = `Fetch this design file, read its readme, and implement the relevant aspects of the design.
https://forge-handoff-${slug}.vercel.app?open_file=CORE.html
Implement: CORE.html`;

  return { zipBlob, filename: `${folder}.zip`, files: manifest, prompt };
}

/**
 * Export a single variation (one of the 2-4 directions the Design agent
 * emitted) as a zip: all its files + a README that echoes the prompt that
 * triggered these variations so the recipient knows what was asked for.
 */
export interface VariationBundleContext {
  /** The user message that produced these variations (prompt + question answers). */
  userPrompt: string;
  /** Optional project name for the zip filename and README header. */
  projectName?: string;
}

function buildVariationReadme(
  variation: VariationOption,
  ctx: VariationBundleContext,
): string {
  const projectName = ctx.projectName?.trim() || "Untitled project";
  const fileList = variation.files.map((f) => `- \`${f.path}\` (${f.language})`).join("\n");
  const prompt = ctx.userPrompt.trim() || "(no prompt captured)";
  return `# ${variation.name}

${variation.summary ?? ""}

_Variation exported from Forge Design — ${new Date().toISOString().slice(0, 10)}_

---

## What the user asked for

Project: **${projectName}**

\`\`\`
${prompt}
\`\`\`

This variation was one of several directions the Design agent proposed
in response to that request. The user chose to export it rather than
committing to it — so treat it as a standalone starting point, not a
finished product.

## Files in this bundle

${fileList}

## How to run it

This bundle is a client-side React + Tailwind mockup (no build step).
Open \`forge.html\` directly in a browser, or serve the folder with any
static file server:

    npx serve .
    # or
    python3 -m http.server

## Architecture

- \`forge.html\` — entry. Loads React, ReactDOM, Babel, Tailwind, \`tokens.css\`,
  and each component \`.jsx\` file via \`<script type="text/babel" src="...">\`.
- \`tokens.css\` — all design tokens (palette, type, spacing, radius) defined
  as CSS custom properties on \`:root\`. Edit here to reskin.
- \`data.js\` — \`const DATA = { ... }\` with sample content the page renders.
- \`components/App.jsx\` — root component that composes everything else.
- \`components/*.jsx\` — one file per component. Each attaches itself to
  \`window\` so sibling files can reference it without ES modules.

## Next steps

- To extend: add new \`components/<Name>.jsx\` files and import them in
  \`forge.html\` (\`<script type="text/babel" src="components/Name.jsx">\`)
  before \`App.jsx\`, then reference them as globals inside App.
- To reskin: edit \`tokens.css\`. Every color referenced by components
  points at a \`--forge-*\` or \`--design-*\` CSS variable, so changing
  values there cascades everywhere.
- To hand this to an implementer: this README + the files in this zip are
  self-contained. No Forge account needed to understand or edit the code.
`;
}

export interface VariationBundleResult {
  zipBlob: Blob;
  filename: string;
}

export async function buildVariationBundle(
  variation: VariationOption,
  ctx: VariationBundleContext,
): Promise<VariationBundleResult> {
  const variationSlug =
    variation.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
    "variation";
  const projectSlug =
    (ctx.projectName ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "forge";
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const folder = `${projectSlug}-${variationSlug}-${stamp}`;

  const readme = buildVariationReadme(variation, ctx);

  const zip = new JSZip();
  const root = zip.folder(folder)!;
  for (const f of variation.files) {
    root.file(f.path, f.content);
  }
  root.file("README.md", readme);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  return { zipBlob, filename: `${folder}.zip` };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
