export type Theme = "dark" | "light";
export type Accent = "lime" | "ember" | "violet" | "cyan" | "paper";
export type FontPairing = "geometric" | "editorial" | "mono-first" | "humanist";
export type Density = "comfy" | "compact";
export type ChatSide = "left" | "right" | "bottom";
export type Viewport = "desktop" | "tablet" | "mobile";
export type RightRail = "tweaks" | "versions";

export interface TweakState {
  theme: Theme;
  accent: Accent;
  font: FontPairing;
  density: Density;
  chatSide: ChatSide;
  viewport: Viewport;
  cardPad: number;
  radius: number;
  fontScale: number;
  rightRail: RightRail;
}

export interface PendingPin {
  n: number;
  label: string;
  tag: string;
  text: string;
  /** Component name resolved from the nearest data-forge-component ancestor. */
  componentName?: string;
  /** Source file the component lives in (e.g. components/Hero.jsx). */
  componentFile?: string;
  /** User comment attached to this pin (set when batched, blank for single). */
  comment?: string;
}

export interface TextEdit {
  oldText: string;
  newText: string;
  tag: string;
  label: string;
  componentName?: string;
  componentFile?: string;
}

export interface MessageProgress {
  phase:
    | "queued"
    | "thinking"
    | "reply"
    | "files"
    | "questions"
    | "edits"
    | "variations"
    | "designing"
    | "coding"
    | "done";
  replyBytes: number;
  filesBytes: number;
  startedAt?: number;
}

export type EditOp =
  | { op: "replace"; path?: string; old: string; new: string }
  | { op: "insert_before"; path?: string; old: string; new: string }
  | { op: "insert_after"; path?: string; old: string; new: string }
  | { op: "delete"; path?: string; old: string };

export interface EditsResult {
  /** Updated files keyed by path. */
  filesByPath: Record<string, string>;
  applied: number;
  failed: number;
  failures: Array<{ op: EditOp["op"]; path: string; reason: "not-found" | "ambiguous" | "no-such-file"; preview: string }>;
}

export type FileLanguage = "html" | "css" | "js" | "jsx" | "json" | "md" | "txt";

export interface FilePayload {
  path: string;
  content: string;
  language: FileLanguage;
}

export interface FilesPayload {
  files: FilePayload[];
}

export type QuestionKind = "pills" | "slider";

export interface QuestionGroup {
  id: string;
  title: string;
  description?: string;
  kind?: QuestionKind;
  // Pills:
  multi?: boolean;
  options: string[];
  // Slider:
  min?: number;
  max?: number;
  step?: number;
  default?: number;
  leftLabel?: string;
  rightLabel?: string;
}

export interface QuestionsPayload {
  title?: string;
  subtitle?: string;
  groups: QuestionGroup[];
}

export interface PaletteEntry {
  name: string;
  /** CSS color value — hex, oklch, rgb, anything valid. */
  value: string;
}

export type DesignTweakKind = "select" | "toggle" | "slider";

export interface DesignTweakControl {
  id: string;
  label: string;
  description?: string;
  kind: DesignTweakKind;
  /** "css" → live CSS-var update via the iframe overlay. "regen" → fire a chat message asking Claude to apply. */
  applies?: "css" | "regen";
  cssVariable?: string;

  // select
  options?: Array<{ label: string; value: string }>;
  // slider
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // common
  default: string | number | boolean;
}

export interface DesignTweaksPayload {
  /** 3–6 color tokens that define the design's palette. The first is the
   *  design's headline accent and is what the knobs use as the active accent. */
  palette: PaletteEntry[];
  /** 0–6 design-specific controls — knobs render these dynamically. */
  controls: DesignTweakControl[];
}

export interface VariationOption {
  id: string;
  name: string;
  summary?: string;
  /**
   * A complete single-page multi-file project. The picked option's files
   * become the working tree verbatim — going deep is pure addition (new
   * pages + components) never a regen, so the visual DNA can't drift.
   */
  files: FilePayload[];
}

export interface VariationsPayload {
  intro?: string;
  options: VariationOption[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  thinking?: string;
  streaming?: boolean;
  attachedPin?: PendingPin;
  error?: boolean;
  progress?: MessageProgress;
  questions?: QuestionsPayload;
  questionsAnswered?: boolean;
  editsSummary?: { applied: number; failed: number };
  designTweaks?: DesignTweaksPayload;
  variations?: VariationsPayload;
  variationsResolved?: boolean;
  pickedVariationId?: string;
  /** Markdown text of the Design agent's plan (visible as a collapsible block in chat). */
  designPlan?: string;
  /** Inspirations the server pulled for this turn's Design agent. */
  inspirations?: Array<{
    slug: string;
    name: string;
    category: string;
    summary: string;
    reason: string;
  }>;
  /** Numbered checklist the Design agent committed to at the start of the turn. */
  todos?: string[];
  /** Ordered list of files the Code agent has begun writing, as detected by
   *  streaming-JSON path scans. */
  writingFiles?: string[];
}

export interface DesignVersion {
  id: string;
  label: string;
  /** One-line summary shown under the label in the version sidebar.
   *  Usually the user's prompt or pin comment, truncated. */
  summary?: string;
  /** Full text of the user prompt (or composed pin/text-edit message)
   *  that produced this version. Surfaced as a "Copy prompt" action in
   *  the Versions sidebar so users can re-use the exact ask. */
  userPrompt?: string;
  createdAt: number;
  /** Multi-file snapshot. Pre-multi-file projects stored a single `html`
   *  string; the migration in storage.ts converts those to a one-element
   *  files array. */
  files: FilePayload[];
  tokens: TweakState;
}

export interface BrandKit {
  /** User-visible name ("Acme brand", "Claude brand kit", etc.) */
  name: string;
  /** Where the tokens came from so we can show provenance. */
  source: "css" | "tailwind" | "forge" | "manual";
  /** Extracted CSS custom properties, including leading "--". */
  vars: Record<string, string>;
  /** Distinct font-family stacks seen in the source. */
  fonts: string[];
  /** ISO timestamp for display purposes. */
  importedAt: number;
}

export interface ProjectState {
  /** Stable unique id for the workspace. Migration sets this on legacy projects. */
  id: string;
  /** When the project was first created. */
  createdAt: number;
  /** Last time anything in the project changed. */
  updatedAt: number;
  projectName: string;
  messages: ChatMessage[];
  versions: DesignVersion[];
  currentVersionId: string | null;
  /** Multi-file working tree. Always contains forge.html as the entry; may
   *  also contain styles.css, data.js, app.js, components/*.html, etc. */
  files: FilePayload[];
  tweaks: TweakState;
  designTweaks: DesignTweaksPayload | null;
  designTweakValues: Record<string, string | number | boolean>;
  customAccentHex: string | null;
  /** Optional imported brand kit that locks palette + fonts for this project. */
  brandKit?: BrandKit;
}

export interface Workspace {
  /** All projects, newest-updated first. */
  projects: ProjectState[];
  /** Which project is currently active in the Studio. */
  currentProjectId: string | null;
}

export interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tweaks: TweakState;
  /** Single pin (legacy single-comment flow). */
  pendingPin?: PendingPin | null;
  /** Batch of pins, each with its own comment, for one structured edit turn. */
  pendingPins?: PendingPin[];
  /** Snapshot of the current multi-file working tree for the agents. */
  currentFiles?: FilePayload[];
  /** Active brand kit — tokens become a hard constraint for both agents. */
  brandKit?: BrandKit;
}
