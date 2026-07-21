import { ensureLineBreaks } from "./formatFallback";
import type { FilePayload, ProjectState, TweakState, Workspace } from "./types";

/**
 * Storage layout:
 *   localStorage["forge-design:workspace"]  →  Workspace  (the source of truth now)
 *   localStorage["forge-design:project"]    →  legacy ProjectState (single-project)
 *
 * On load we prefer workspace; if absent, we migrate the legacy single
 * project into a new workspace whose projects[0] is that legacy data.
 */
const WORKSPACE_KEY = "forge-design:workspace";
const LEGACY_PROJECT_KEY = "forge-design:project";

export const DEFAULT_TWEAKS: TweakState = {
  theme: "dark",
  accent: "lime",
  font: "geometric",
  density: "comfy",
  chatSide: "left",
  viewport: "desktop",
  cardPad: 20,
  radius: 10,
  fontScale: 100,
  rightRail: "tweaks",
};

function newId(prefix = "p"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A blank project with a fresh id + timestamps. */
export function createEmptyProject(projectName = "Untitled project"): ProjectState {
  const now = Date.now();
  return {
    id: newId("p"),
    createdAt: now,
    updatedAt: now,
    projectName,
    messages: [],
    versions: [],
    currentVersionId: null,
    files: [],
    tweaks: DEFAULT_TWEAKS,
    designTweaks: null,
    designTweakValues: {},
    customAccentHex: null,
  };
}

/** Kept as a named export for backwards-compat with earlier imports. */
export const EMPTY_PROJECT: ProjectState = createEmptyProject();

/** Best-effort language inference from a file path's extension. */
export function inferLanguage(path: string): FilePayload["language"] {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".jsx") || lower.endsWith(".tsx")) return "jsx";
  if (lower.endsWith(".mjs") || lower.endsWith(".cjs") || lower.endsWith(".js") || lower.endsWith(".ts")) return "js";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "md";
  return "txt";
}

/**
 * Hydrate a project coming out of localStorage, applying every forward-
 * compat fix we've accumulated (legacy canvasHtml → files[], missing id,
 * missing timestamps, etc.).
 */
function hydrateProject(parsed: Partial<ProjectState> & Record<string, unknown>): ProjectState {
  const base = createEmptyProject(String(parsed.projectName ?? "Untitled project"));

  // Legacy pre-multi-file projects stored a single `canvasHtml` string.
  const legacyCanvas =
    typeof parsed.canvasHtml === "string" ? (parsed.canvasHtml as string) : null;
  let files: FilePayload[] = Array.isArray(parsed.files) ? (parsed.files as FilePayload[]) : [];
  if (files.length === 0 && legacyCanvas) {
    files = [{ path: "forge.html", content: legacyCanvas, language: "html" }];
  }
  files = files.map((f) => ({ ...f, content: ensureLineBreaks(f.content, f.language) }));

  const versions: ProjectState["versions"] = ((parsed.versions as unknown[]) ?? []).map(
    (v) => {
      const vAny = v as Record<string, unknown>;
      const legacyHtml = typeof vAny.html === "string" ? (vAny.html as string) : null;
      const vFiles = Array.isArray((v as { files?: unknown }).files)
        ? (v as unknown as { files: FilePayload[] }).files
        : legacyHtml
          ? [{ path: "forge.html", content: legacyHtml, language: "html" as const }]
          : [];
      return {
        ...(v as ProjectState["versions"][number]),
        files: vFiles.map((f) => ({ ...f, content: ensureLineBreaks(f.content, f.language) })),
      };
    },
  );

  return {
    ...base,
    id: typeof parsed.id === "string" && parsed.id ? (parsed.id as string) : base.id,
    createdAt:
      typeof parsed.createdAt === "number" ? (parsed.createdAt as number) : base.createdAt,
    updatedAt:
      typeof parsed.updatedAt === "number" ? (parsed.updatedAt as number) : base.updatedAt,
    projectName: String(parsed.projectName ?? "Untitled project"),
    messages: Array.isArray(parsed.messages)
      ? (parsed.messages as ProjectState["messages"])
      : [],
    versions,
    currentVersionId:
      typeof parsed.currentVersionId === "string"
        ? (parsed.currentVersionId as string)
        : null,
    files,
    tweaks: {
      ...DEFAULT_TWEAKS,
      ...((parsed.tweaks as Partial<TweakState>) ?? {}),
    },
    designTweaks: (parsed.designTweaks as ProjectState["designTweaks"]) ?? null,
    designTweakValues:
      (parsed.designTweakValues as ProjectState["designTweakValues"]) ?? {},
    customAccentHex:
      typeof parsed.customAccentHex === "string"
        ? (parsed.customAccentHex as string)
        : null,
    brandKit:
      parsed.brandKit && typeof parsed.brandKit === "object"
        ? (parsed.brandKit as ProjectState["brandKit"])
        : undefined,
  };
}

/** Legacy single-project loader — kept for any consumer that still imports it. */
export function loadProject(): ProjectState {
  const ws = loadWorkspace();
  const current = ws.projects.find((p) => p.id === ws.currentProjectId) ?? ws.projects[0];
  return current ?? createEmptyProject();
}

/** Legacy single-project saver — forwards into the workspace as the active project. */
export function saveProject(project: ProjectState): void {
  const ws = loadWorkspace();
  const next = upsertProject(ws, project);
  saveWorkspace({ ...next, currentProjectId: project.id });
}

export function clearProject(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_PROJECT_KEY);
  localStorage.removeItem(WORKSPACE_KEY);
}

/* ============================================================
 * Workspace API
 * ============================================================ */

export function loadWorkspace(): Workspace {
  if (typeof window === "undefined") {
    return { projects: [], currentProjectId: null };
  }
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Workspace>;
      const projects = Array.isArray(parsed.projects)
        ? parsed.projects.map((p) => hydrateProject(p as unknown as Record<string, unknown>))
        : [];
      return {
        projects,
        currentProjectId:
          typeof parsed.currentProjectId === "string" && parsed.currentProjectId
            ? parsed.currentProjectId
            : (projects[0]?.id ?? null),
      };
    }
    // No workspace yet — migrate legacy single-project if present, else
    // return an empty workspace so the caller can create a first project.
    const legacyRaw = localStorage.getItem(LEGACY_PROJECT_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Record<string, unknown>;
      const migrated = hydrateProject(legacy);
      const ws: Workspace = {
        projects: [migrated],
        currentProjectId: migrated.id,
      };
      saveWorkspace(ws);
      // Keep legacy key around so we don't re-migrate if the user opens
      // an older build; it's harmless and tiny.
      return ws;
    }
    return { projects: [], currentProjectId: null };
  } catch {
    return { projects: [], currentProjectId: null };
  }
}

export function saveWorkspace(ws: Workspace): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized: Workspace = {
      ...ws,
      projects: ws.projects.map((p) => ({
        ...p,
        messages: p.messages.map((m) => ({ ...m, streaming: false })),
      })),
    };
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(sanitized));
  } catch {
    /* quota / disabled */
  }
}

/** Insert or replace a project, updating its timestamp, preserving order. */
export function upsertProject(ws: Workspace, project: ProjectState): Workspace {
  const stamped: ProjectState = { ...project, updatedAt: Date.now() };
  const idx = ws.projects.findIndex((p) => p.id === project.id);
  if (idx === -1) {
    return { ...ws, projects: [stamped, ...ws.projects] };
  }
  const next = ws.projects.slice();
  next[idx] = stamped;
  return { ...ws, projects: next };
}

export function removeProject(ws: Workspace, id: string): Workspace {
  const projects = ws.projects.filter((p) => p.id !== id);
  const currentProjectId =
    ws.currentProjectId === id ? (projects[0]?.id ?? null) : ws.currentProjectId;
  return { projects, currentProjectId };
}

export function duplicateProject(ws: Workspace, id: string): { ws: Workspace; newId: string } {
  const source = ws.projects.find((p) => p.id === id);
  if (!source) return { ws, newId: "" };
  const now = Date.now();
  const copy: ProjectState = {
    ...source,
    id: newId("p"),
    createdAt: now,
    updatedAt: now,
    projectName: `${source.projectName} (copy)`,
  };
  return {
    ws: { ...ws, projects: [copy, ...ws.projects] },
    newId: copy.id,
  };
}

/** Produce a .forge JSON string for sharing / export. */
export function exportProjectJson(project: ProjectState): string {
  return JSON.stringify({ __forge: "project", version: 1, project }, null, 2);
}

/** Inverse of exportProjectJson — returns null on malformed input. */
export function importProjectJson(json: string): ProjectState | null {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const payload =
      parsed.__forge === "project" && parsed.project ? (parsed.project as Record<string, unknown>) : parsed;
    const hydrated = hydrateProject(payload);
    // Generate a fresh id so importing twice doesn't collide with an
    // existing project of the same id.
    return { ...hydrated, id: newId("p"), createdAt: Date.now(), updatedAt: Date.now() };
  } catch {
    return null;
  }
}
