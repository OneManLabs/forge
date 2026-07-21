"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type CodeFile } from "./Canvas";
import { ChatPanel } from "./ChatPanel";
import { HandoffModal } from "./HandoffModal";
import { TopBar } from "./TopBar";
import { BrandKitModal } from "./BrandKitModal";
import { DiffModal } from "./DiffModal";
import { NameProjectModal } from "./NameProjectModal";
import { ProjectSidebar } from "./ProjectSidebar";
import { buildTokensCss, buildVariationBundle, downloadBlob } from "@/lib/bundle";
import { applyEdits, mergeEdits, parseEditOps } from "@/lib/edits";
import { parseFilesBuffer } from "@/lib/filesParser";
import { parseQuestionsStream } from "@/lib/questionsParser";
import { redactBrands } from "@/lib/redactBrands";
import { ensureLineBreaks } from "@/lib/formatFallback";
import { inferLanguage } from "@/lib/storage";
import {
  createEmptyProject,
  EMPTY_PROJECT,
  exportProjectJson,
  importProjectJson,
  loadWorkspace,
  duplicateProject as duplicateProjectInWs,
  removeProject,
  saveWorkspace,
  upsertProject,
} from "@/lib/storage";
import type {
  BrandKit,
  ChatMessage,
  ChatRequestBody,
  DesignTweaksPayload,
  DesignVersion,
  FileLanguage,
  FilePayload,
  MessageProgress,
  PendingPin,
  ProjectState,
  TextEdit,
  TweakState,
  VariationOption,
  VariationsPayload,
  Workspace,
} from "@/lib/types";

function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultsFromControls(spec: DesignTweaksPayload): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const c of spec.controls) {
    out[c.id] = c.default;
  }
  return out;
}

function summarizeTurn(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 38 ? cleaned.slice(0, 36) + "…" : cleaned || "Iteration";
}

interface QueueItem {
  text: string;
  pin: PendingPin | null;
}

export function Studio() {
  // Workspace-backed state. `project` is derived from workspace +
  // currentProjectId, and setProject is a convenience wrapper that
  // upserts into the workspace.
  const [workspace, setWorkspace] = useState<Workspace>({
    projects: [],
    currentProjectId: null,
  });
  const [hydrated, setHydrated] = useState(false);
  const [projectSidebarCollapsed, setProjectSidebarCollapsedRaw] = useState(false);
  // Persist the sidebar collapsed state across reloads — tiny UI pref,
  // lives in its own localStorage key so it doesn't bloat the workspace.
  const setProjectSidebarCollapsed = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setProjectSidebarCollapsedRaw((prev) => {
        const next = typeof value === "function" ? (value as (p: boolean) => boolean)(prev) : value;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("forge-design:ui:sidebar", next ? "1" : "0");
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    },
    [],
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("forge-design:ui:sidebar");
      if (stored === "1") setProjectSidebarCollapsedRaw(true);
    } catch {
      /* ignore */
    }
  }, []);
  const [brandKitModalOpen, setBrandKitModalOpen] = useState(false);
  const [diffAgainstId, setDiffAgainstId] = useState<string | null>(null);
  const project: ProjectState =
    workspace.projects.find((p) => p.id === workspace.currentProjectId) ?? EMPTY_PROJECT;
  const setProject = useCallback(
    (updater: ProjectState | ((prev: ProjectState) => ProjectState)) => {
      setWorkspace((ws) => {
        const current =
          ws.projects.find((p) => p.id === ws.currentProjectId) ?? EMPTY_PROJECT;
        const next =
          typeof updater === "function"
            ? (updater as (p: ProjectState) => ProjectState)(current)
            : updater;
        // Guarantee the project carries a stable id even if we passed in a
        // brand-new project object.
        const withId: ProjectState = next.id ? next : { ...next, id: current.id };
        return {
          ...ws,
          currentProjectId: withId.id,
          projects: upsertProject(ws, withId).projects,
        };
      });
    },
    [],
  );
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  /** Pins the user is staging — each gets its own comment, all sent as a batch. */
  const [pinBatch, setPinBatch] = useState<PendingPin[]>([]);
  const [commentMode, setCommentMode] = useState(false);
  const [textEditMode, setTextEditMode] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<QueueItem[]>([]);
  const [streamingProgress, setStreamingProgress] = useState<MessageProgress | null>(null);
  const [draftFiles, setDraftFiles] = useState<FilePayload[] | null>(null);
  /** Bumped to tell Canvas to clear its sticky pin highlight in the iframe. */
  const [pinHighlightClearKey, setPinHighlightClearKey] = useState(0);
  /** Bumped after a successful pin/text edit — Canvas picks it up and
   *  briefly flashes the edited component in the iframe so the user
   *  sees exactly what just changed. */
  const [flashHint, setFlashHint] = useState<{ name?: string; file?: string; key: number } | null>(null);
  const triggerFlash = useCallback((name?: string, file?: string) => {
    if (!name && !file) return;
    setFlashHint({ name, file, key: Date.now() + Math.random() });
  }, []);
  /** Transient toast shown above the canvas. */
  interface ToastShape {
    kind: "info" | "success";
    text: string;
    action?: { label: string; onClick: () => void };
  }
  const [toast, setToast] = useState<ToastShape | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback(
    (
      input: string | ToastShape,
      kind: "info" | "success" = "info",
      ms = 2400,
    ) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      const next: ToastShape =
        typeof input === "string" ? { kind, text: input } : input;
      setToast(next);
      toastTimeoutRef.current = setTimeout(() => setToast(null), ms);
    },
    [],
  );
  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);
  }, []);
  const clearPinHighlight = useCallback(() => {
    setPinHighlightClearKey((k) => k + 1);
  }, []);
  const abortRef = useRef<AbortController | null>(null);
  const pinCounterRef = useRef(0);
  const streamingRef = useRef(false);
  const drainBusyRef = useRef(false);
  // Always-fresh snapshot of project state. setState updaters can be queued
  // and run later; reading project from the closure goes stale during rapid
  // sends. Use the ref to assemble outbound payloads.
  const projectRef = useRef<ProjectState>(EMPTY_PROJECT);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Hydrate the workspace on mount. If storage is empty, seed with a
  // fresh empty project so the UI has something to render immediately.
  useEffect(() => {
    const loaded = loadWorkspace();
    if (loaded.projects.length === 0) {
      const seed = createEmptyProject();
      setWorkspace({ projects: [seed], currentProjectId: seed.id });
    } else {
      setWorkspace(loaded);
    }
    setHydrated(true);
  }, []);

  // Persist the workspace (debounced). Saving the whole workspace on
  // every keystroke is overkill — 200ms is a sweet spot.
  useEffect(() => {
    if (!hydrated) return;
    setSaving(true);
    const t = setTimeout(() => {
      saveWorkspace(workspace);
      setSaving(false);
    }, 200);
    return () => clearTimeout(t);
  }, [workspace, hydrated]);

  const setTweaks = useCallback((patch: Partial<TweakState>) => {
    setProject((p) => ({ ...p, tweaks: { ...p.tweaks, ...patch } }));
  }, [setProject]);

  /* Workspace-level project actions. */
  const selectProject = useCallback((id: string) => {
    setWorkspace((ws) => ({ ...ws, currentProjectId: id }));
  }, []);

  // Project naming modal state. New-project button opens the modal with
  // a suggested default; the project is only actually created when the
  // user submits a name. Cancel = no project created.
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameModalDefault, setNameModalDefault] = useState("Untitled project");

  /** Compute the next unused "Untitled project N" name across the workspace. */
  const nextUntitledName = useCallback((projects: ProjectState[]): string => {
    const used = new Set<number>();
    for (const p of projects) {
      const m = /^Untitled project(?:\s+(\d+))?$/i.exec(p.projectName.trim());
      if (m) used.add(m[1] ? parseInt(m[1], 10) : 1);
    }
    let n = 1;
    while (used.has(n)) n++;
    return n === 1 ? "Untitled project" : `Untitled project ${n}`;
  }, []);

  /** Open the name-project modal with a suggested default name. */
  const newProject = useCallback(() => {
    setNameModalDefault(nextUntitledName(workspace.projects));
    setNameModalOpen(true);
  }, [workspace.projects, nextUntitledName]);

  /** Actually create the project once the user has supplied a name. */
  const createProjectWithName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const seed = createEmptyProject(trimmed);
    setWorkspace((ws) => ({
      projects: [seed, ...ws.projects],
      currentProjectId: seed.id,
    }));
    setNameModalOpen(false);
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setWorkspace((ws) => ({
      ...ws,
      projects: ws.projects.map((p) =>
        p.id === id ? { ...p, projectName: name, updatedAt: Date.now() } : p,
      ),
    }));
  }, []);

  const duplicateProjectHandler = useCallback((id: string) => {
    setWorkspace((ws) => {
      const { ws: next, newId } = duplicateProjectInWs(ws, id);
      return newId ? { ...next, currentProjectId: newId } : next;
    });
  }, []);

  const deleteProjectHandler = useCallback((id: string) => {
    setWorkspace((ws) => {
      if (ws.projects.length <= 1) {
        // Don't let the user delete the last project — wipe + start fresh.
        const seed = createEmptyProject();
        return { projects: [seed], currentProjectId: seed.id };
      }
      if (!confirm("Delete this project? This can't be undone.")) return ws;
      return removeProject(ws, id);
    });
  }, []);

  const exportProject = useCallback(
    (id: string) => {
      const target = workspace.projects.find((p) => p.id === id);
      if (!target) return;
      const blob = new Blob([exportProjectJson(target)], { type: "application/json" });
      const slug =
        target.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
        "project";
      downloadBlob(blob, `${slug}.forge`);
    },
    [workspace.projects],
  );

  const importProject = useCallback((json: string) => {
    const p = importProjectJson(json);
    if (!p) return;
    setWorkspace((ws) => ({
      projects: [p, ...ws.projects],
      currentProjectId: p.id,
    }));
  }, []);

  const applyBrandKit = useCallback(
    (kit: BrandKit) => {
      setProject((p) => ({ ...p, brandKit: kit }));
    },
    [setProject],
  );

  const clearBrandKit = useCallback(() => {
    setProject((p) => {
      const next = { ...p };
      delete next.brandKit;
      return next;
    });
  }, [setProject]);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setProject((p) => ({
      ...p,
      messages: p.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  // Keyboard shortcuts:
  //   Esc       — clear comment/text-edit modes, clear pin, close modal
  //   ⌘/        — toggle comment mode
  //   ⌘⇧E       — toggle text-edit mode
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCommentMode(false);
        setTextEditMode(false);
        setPendingPin(null);
        clearPinHighlight();
        setHandoffOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setCommentMode((m) => {
          if (!m) setTextEditMode(false);
          return !m;
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        setTextEditMode((m) => {
          if (!m) setCommentMode(false);
          return !m;
        });
      }
      // ⌘⇧D — open the diff modal against the most recent version
      // PRECEDING the current one. If there's only one version (or none),
      // do nothing.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "d" || e.key === "D")) {
        const proj = projectRef.current;
        const versions = proj.versions;
        if (versions.length < 2) return;
        const currentIdx = versions.findIndex((v) => v.id === proj.currentVersionId);
        // versions[0] is the newest. The "previous" is whatever sits one
        // slot below the current entry (or [1] if current is at top).
        const targetIdx = currentIdx >= 0 ? currentIdx + 1 : 1;
        const target = versions[targetIdx];
        if (!target) return;
        e.preventDefault();
        setDiffAgainstId(target.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleElementPick = useCallback(
    (info: {
      tag: string;
      text: string;
      label: string;
      componentName?: string;
      componentFile?: string;
      rect: { x: number; y: number; w: number; h: number };
    }) => {
      pinCounterRef.current += 1;
      setPendingPin({
        n: pinCounterRef.current,
        label: info.label || info.tag,
        tag: info.tag,
        text: info.text,
        componentName: info.componentName,
        componentFile: info.componentFile,
      });
      setCommentMode(false);
    },
    [],
  );

  const fireRequest = useCallback(
    async (text: string, attached: PendingPin | null, batch: PendingPin[] = []) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: uid("u"),
        role: "user",
        text: trimmed,
        attachedPin: attached || (batch.length > 0 ? batch[0] : undefined),
      };
      const assistantId = uid("a");
      const startedAt = Date.now();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        streaming: true,
        progress: { phase: "thinking", replyBytes: 0, filesBytes: 0, startedAt },
      };

      const snapshot = projectRef.current;
      const messagesAtSend = [...snapshot.messages, userMsg, assistantMsg];
      const filesAtSend = snapshot.files;
      const tweaksAtSend = snapshot.tweaks;

      setProject((p) => ({ ...p, messages: [...p.messages, userMsg, assistantMsg] }));

      setIsStreaming(true);
      streamingRef.current = true;
      setStreamingProgress({ phase: "thinking", replyBytes: 0, filesBytes: 0, startedAt });

      const abort = new AbortController();
      abortRef.current = abort;

      const payload: ChatRequestBody = {
        messages: messagesAtSend
          .filter((m) => m.role === "user" || m.role === "assistant")
          .filter((m) => !(m.id === assistantId))
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content:
              m.role === "user" && m.attachedPin
                ? `${m.text}\n\n[user clicked element: <${m.attachedPin.tag}> "${m.attachedPin.text.slice(0, 80)}"]`
                : m.text,
          })),
        tweaks: tweaksAtSend,
        pendingPin: attached,
        pendingPins: batch.length > 0 ? batch : attached ? [attached] : undefined,
        currentFiles: filesAtSend,
        brandKit: snapshot.brandKit,
      };

      const progressRef: MessageProgress = {
        phase: "thinking",
        replyBytes: 0,
        filesBytes: 0,
        startedAt,
      };

      const updateProgress = (patch: Partial<MessageProgress>) => {
        Object.assign(progressRef, patch);
        const snapshot: MessageProgress = { ...progressRef };
        setStreamingProgress(snapshot);
        updateMessage(assistantId, { progress: snapshot });
      };

      let replyText = "";
      let filesText = "";
      let thinkingText = "";
      let questionsText = "";
      let editsText = "";
      let tweaksText = "";
      let variationsText = "";
      let designPlanText = "";
      let todosText = "";
      let filesReceivedAny = false;
      let questionsReceivedAny = false;
      let editsReceivedAny = false;
      let tweaksReceivedAny = false;
      let variationsReceivedAny = false;
      let designPlanReceivedAny = false;
      let todosReceivedAny = false;
      let errorText: string | null = null;
      const writingFilesSeen = new Set<string>();
      const writingFilesOrdered: string[] = [];
      const allowedLangs: FileLanguage[] = ["html", "css", "js", "jsx", "json", "md", "txt"];
      // Walk the <files> buffer with a JSON state machine on every delta:
      // 1) update writingFiles (list of paths for the plan indicator)
      // 2) commit each completed file object to draftFiles so the tree + iframe
      //    preview light up live as Claude types them.
      const scanForNewPaths = (buffer: string) => {
        const result = parseFilesBuffer(buffer);
        let changed = false;
        for (const p of result.completedPaths) {
          if (!writingFilesSeen.has(p)) {
            writingFilesSeen.add(p);
            writingFilesOrdered.push(p);
            changed = true;
          }
        }
        if (result.inProgressPath && !writingFilesSeen.has(result.inProgressPath)) {
          writingFilesSeen.add(result.inProgressPath);
          writingFilesOrdered.push(result.inProgressPath);
          changed = true;
        }
        if (changed) {
          updateMessage(assistantId, { writingFiles: [...writingFilesOrdered] });
        }

        // Live draft: merge streamed files onto the tree we started with.
        // On add-only turns (go-deep) the stream contains NEW component
        // files but NOT forge.html — merging with filesAtSend keeps the
        // entry file around so the iframe preview keeps rendering and the
        // tree keeps showing existing files throughout the stream.
        if (result.files.length > 0) {
          const byPath = new Map<string, FilePayload>();
          for (const f of filesAtSend) byPath.set(f.path, f);
          for (const pf of result.files) {
            const declared = pf.language ? pf.language.toLowerCase() : "";
            const language = (allowedLangs.includes(declared as FileLanguage)
              ? (declared as FileLanguage)
              : inferLanguage(pf.path)) as FileLanguage;
            const content = ensureLineBreaks(pf.content, language);
            byPath.set(pf.path, { path: pf.path, content, language });
          }
          setDraftFiles([...byPath.values()]);
        }
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          let msg = `Request failed (${res.status})`;
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            /* ignore */
          }
          updateMessage(assistantId, {
            text: msg,
            streaming: false,
            error: true,
            progress: { ...progressRef, phase: "done" },
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        const flushFrame = (frame: string) => {
          const dataLines = frame
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trimStart())
            .join("\n");
          if (!dataLines) return;
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(dataLines) as Record<string, unknown>;
          } catch {
            return;
          }
          if (parsed.type === "thinking") {
            const delta = String(parsed.delta ?? "");
            thinkingText += delta;
            // Redact hidden-reference brand names before storing. The
            // server injects inspirations the user never asked for;
            // surfacing those names in thinking confuses users. The
            // redactor leaves brand names THE USER mentioned alone.
            updateMessage(assistantId, {
              thinking: redactBrands(thinkingText, trimmed),
            });
            updateProgress({ phase: "thinking" });
          } else if (parsed.type === "reply") {
            const delta = String(parsed.delta ?? "");
            replyText += delta;
            updateMessage(assistantId, { text: redactBrands(replyText, trimmed) });
            updateProgress({
              phase: "reply",
              replyBytes: replyText.length,
            });
          } else if (parsed.type === "files") {
            const delta = String(parsed.delta ?? "");
            filesText += delta;
            filesReceivedAny = true;
            scanForNewPaths(filesText);
            updateProgress({
              phase: "files",
              filesBytes: filesText.length,
            });
          } else if (parsed.type === "questions") {
            const delta = String(parsed.delta ?? "");
            questionsText += delta;
            questionsReceivedAny = true;
            updateProgress({ phase: "questions" });
            // Live-stream groups into the panel as they complete. The parser
            // walks the partial JSON with a depth-aware state machine and
            // returns every group whose closing } has arrived — so the
            // panel fills in one question at a time instead of appearing
            // wholesale at the end.
            const streamed = parseQuestionsStream(questionsText, `q-${assistantId}`);
            if (streamed.groups.length > 0) {
              updateMessage(assistantId, {
                questions: {
                  title: streamed.title,
                  subtitle: streamed.subtitle,
                  groups: streamed.groups,
                },
              });
            }
          } else if (parsed.type === "edits") {
            const delta = String(parsed.delta ?? "");
            editsText += delta;
            editsReceivedAny = true;
            scanForNewPaths(editsText);
            updateProgress({ phase: "edits" });
          } else if (parsed.type === "tweaks") {
            const delta = String(parsed.delta ?? "");
            tweaksText += delta;
            tweaksReceivedAny = true;
          } else if (parsed.type === "variations") {
            const delta = String(parsed.delta ?? "");
            variationsText += delta;
            variationsReceivedAny = true;
            updateProgress({ phase: "variations" });
          } else if (parsed.type === "design_plan") {
            const delta = String(parsed.delta ?? "");
            designPlanText += delta;
            designPlanReceivedAny = true;
            updateMessage(assistantId, {
              designPlan: redactBrands(designPlanText, trimmed),
            });
          } else if (parsed.type === "todos") {
            const delta = String(parsed.delta ?? "");
            todosText += delta;
            todosReceivedAny = true;
            // Try to parse partial JSON array to surface todos as they're
            // written. Fall back silently until the array is well-formed.
            try {
              const partial = todosText.trim();
              // Complete array: just parse.
              if (partial.endsWith("]")) {
                const arr = JSON.parse(partial) as unknown[];
                const todos = arr
                  .filter((t): t is string => typeof t === "string")
                  .map((t) => t.trim())
                  .filter(Boolean);
                if (todos.length > 0) {
                  updateMessage(assistantId, { todos });
                }
              } else {
                // In-progress: extract every complete quoted string in the
                // buffer so the list shows up as it's typed.
                const re = /"((?:[^"\\]|\\.)*)"/g;
                const todos: string[] = [];
                let m: RegExpExecArray | null;
                while ((m = re.exec(partial)) !== null) {
                  todos.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
                }
                if (todos.length > 0) {
                  updateMessage(assistantId, { todos });
                }
              }
            } catch {
              /* ignore partial parses */
            }
          } else if (parsed.type === "phase") {
            const p = String(parsed.phase ?? "");
            if (p === "designing" || p === "coding") {
              updateProgress({ phase: p as "designing" | "coding" });
            }
          } else if (parsed.type === "inspirations") {
            const items = Array.isArray(parsed.items) ? parsed.items : [];
            const normalized = items
              .map((it: unknown) => {
                if (!it || typeof it !== "object") return null;
                const r = it as Record<string, unknown>;
                return {
                  slug: String(r.slug ?? ""),
                  name: String(r.name ?? ""),
                  category: String(r.category ?? ""),
                  summary: String(r.summary ?? ""),
                  reason: String(r.reason ?? ""),
                };
              })
              .filter((x): x is NonNullable<typeof x> => Boolean(x && x.slug));
            if (normalized.length > 0) {
              updateMessage(assistantId, { inspirations: normalized });
            }
          } else if (parsed.type === "turn-classified") {
            // Just informational for now; future UI could show "Skipping
            // design — going straight to edit" type hints.
          } else if (parsed.type === "error") {
            errorText = String(parsed.message ?? "Stream error");
          } else if (parsed.type === "done") {
            updateProgress({ phase: "done" });
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = sseBuffer.indexOf("\n\n")) >= 0) {
            const frame = sseBuffer.slice(0, idx);
            sseBuffer = sseBuffer.slice(idx + 2);
            flushFrame(frame);
          }
        }
        if (sseBuffer.trim()) flushFrame(sseBuffer);

        if (errorText) {
          updateMessage(assistantId, {
            text: replyText || `Forge encountered an error: ${errorText}`,
            streaming: false,
            error: true,
            progress: { ...progressRef, phase: "done" },
          });
        } else {
          let parsedQuestions: import("@/lib/types").QuestionsPayload | undefined;
          if (questionsReceivedAny && questionsText.trim().length > 0) {
            try {
              const raw = JSON.parse(questionsText.trim());
              const rawGroups: unknown[] = Array.isArray(raw)
                ? raw
                : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).groups)
                  ? ((raw as Record<string, unknown>).groups as unknown[])
                  : [];
              const title =
                !Array.isArray(raw) && raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).title === "string"
                  ? String((raw as Record<string, unknown>).title)
                  : undefined;
              const subtitle =
                !Array.isArray(raw) && raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).subtitle === "string"
                  ? String((raw as Record<string, unknown>).subtitle)
                  : undefined;
              const groups = rawGroups
                .filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === "object" && typeof (g as Record<string, unknown>).title === "string")
                .map((g, i) => {
                  const kind: import("@/lib/types").QuestionKind =
                    g.kind === "slider" ? "slider" : "pills";
                  return {
                    id: `q-${assistantId}-${i}`,
                    title: String(g.title),
                    description: typeof g.description === "string" ? g.description : undefined,
                    kind,
                    multi: Boolean(g.multi),
                    options: Array.isArray(g.options) ? g.options.map((o: unknown) => String(o)) : [],
                    min: typeof g.min === "number" ? g.min : undefined,
                    max: typeof g.max === "number" ? g.max : undefined,
                    step: typeof g.step === "number" ? g.step : undefined,
                    default: typeof g.default === "number" ? g.default : undefined,
                    leftLabel: typeof g.leftLabel === "string" ? g.leftLabel : undefined,
                    rightLabel: typeof g.rightLabel === "string" ? g.rightLabel : undefined,
                  };
                });
              if (groups.length > 0) {
                parsedQuestions = { title, subtitle, groups };
              }
            } catch {
              // Malformed JSON — ignore, ship just the reply.
            }
          }

          // Parse <variations> if present. New schema: each option ships a
          // complete multi-file project (files: FilePayload[]). Legacy
          // persisted messages may have `html` instead — wrap it as a
          // single-file project so old state still renders.
          const legacyAllowedLangs: FileLanguage[] = ["html", "css", "js", "jsx", "json", "md", "txt"];
          let parsedVariations: VariationsPayload | undefined;
          if (variationsReceivedAny && variationsText.trim().length > 0) {
            try {
              const raw = JSON.parse(variationsText.trim()) as Record<string, unknown>;
              const opts = Array.isArray(raw.options) ? raw.options : Array.isArray(raw) ? raw : [];
              const options: VariationOption[] = (opts as unknown[])
                .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object")
                .map((o, i) => {
                  const id = String(o.id ?? `var-${assistantId}-${i}`);
                  const name = String(o.name ?? `Direction ${i + 1}`);
                  const summary = typeof o.summary === "string" ? o.summary : undefined;
                  let files: FilePayload[] = [];
                  if (Array.isArray(o.files)) {
                    files = (o.files as unknown[])
                      .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === "object")
                      .map((f) => {
                        const path = typeof f.path === "string" ? f.path.trim() : "";
                        const content = typeof f.content === "string" ? f.content : "";
                        const declared = typeof f.language === "string" ? f.language.toLowerCase() : "";
                        const language = (legacyAllowedLangs.includes(declared as FileLanguage)
                          ? (declared as FileLanguage)
                          : inferLanguage(path)) as FileLanguage;
                        return { path, content: ensureLineBreaks(content, language), language };
                      })
                      .filter((f) => f.path && f.content);
                  } else if (typeof o.html === "string" && o.html.trim().length > 0) {
                    // Legacy single-file variation — wrap it.
                    files = [
                      {
                        path: "forge.html",
                        language: "html",
                        content: ensureLineBreaks(o.html.trim(), "html"),
                      },
                    ];
                  }
                  return { id, name, summary, files };
                })
                .filter((o) => o.files.length > 0);
              if (options.length > 0) {
                parsedVariations = {
                  intro: typeof raw.intro === "string" ? raw.intro : undefined,
                  options,
                };
              }
            } catch {
              // Malformed — ignore.
            }
          }

          // Parse the per-design <tweaks> block (palette + dynamic controls).
          let parsedDesignTweaks: DesignTweaksPayload | undefined;
          if (tweaksReceivedAny && tweaksText.trim().length > 0) {
            try {
              const raw = JSON.parse(tweaksText.trim()) as Record<string, unknown>;
              const palette = Array.isArray(raw.palette)
                ? raw.palette
                    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
                    .map((p) => ({
                      name: String(p.name ?? p.label ?? "Color"),
                      value: String(p.value ?? p.hex ?? p.color ?? ""),
                    }))
                    .filter((p) => p.value.length > 0)
                : [];
              const controls = Array.isArray(raw.controls)
                ? raw.controls
                    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
                    .map((c, i) => {
                      const kind = String(c.kind ?? "select");
                      const safeKind: "select" | "toggle" | "slider" =
                        kind === "toggle" || kind === "slider" ? kind : "select";
                      return {
                        id: String(c.id ?? `tw-${i}`),
                        label: String(c.label ?? c.id ?? `Control ${i + 1}`),
                        description: typeof c.description === "string" ? c.description : undefined,
                        kind: safeKind,
                        applies: (c.applies === "regen" ? "regen" : "css") as "css" | "regen",
                        cssVariable: typeof c.cssVariable === "string" ? c.cssVariable : undefined,
                        options: Array.isArray(c.options)
                          ? (c.options as unknown[])
                              .map((o) => {
                                if (typeof o === "string") return { label: o, value: o };
                                if (o && typeof o === "object") {
                                  const r = o as Record<string, unknown>;
                                  return { label: String(r.label ?? r.value ?? ""), value: String(r.value ?? r.label ?? "") };
                                }
                                return null;
                              })
                              .filter((x): x is { label: string; value: string } => Boolean(x && x.value))
                          : undefined,
                        min: typeof c.min === "number" ? c.min : undefined,
                        max: typeof c.max === "number" ? c.max : undefined,
                        step: typeof c.step === "number" ? c.step : undefined,
                        unit: typeof c.unit === "string" ? c.unit : undefined,
                        default:
                          typeof c.default === "string" ||
                          typeof c.default === "number" ||
                          typeof c.default === "boolean"
                            ? c.default
                            : "",
                      };
                    })
                : [];
              if (palette.length > 0 || controls.length > 0) {
                parsedDesignTweaks = { palette, controls };
              }
            } catch {
              // Malformed tweaks — ignore.
            }
          }

          // Parse the multi-file <files> JSON from the Code agent — resilient
          // per-object parser so one bad entry doesn't drop the whole batch.
          let parsedFiles: FilePayload[] | undefined;
          let filesParseErrors: Array<{ fragment: string; error: string }> = [];
          if (filesReceivedAny && filesText.trim().length > 0) {
            const result = parseFilesBuffer(filesText.trim());
            filesParseErrors = result.errors;
            const allowed: FileLanguage[] = ["html", "css", "js", "jsx", "json", "md", "txt"];
            const out: FilePayload[] = [];
            for (const pf of result.files) {
              const declared = pf.language ? pf.language.toLowerCase() : "";
              const language = (allowed.includes(declared as FileLanguage)
                ? (declared as FileLanguage)
                : inferLanguage(pf.path)) as FileLanguage;
              // Always run the formatter — if Claude skipped \n escapes, this
              // rescues the file from being one long line.
              const content = ensureLineBreaks(pf.content, language);
              out.push({ path: pf.path, content, language });
            }
            if (out.length > 0) parsedFiles = out;
          }

          // Apply file-aware str_replace edits.
          let editsSummary: { applied: number; failed: number } | undefined;
          let editedFiles: FilePayload[] | null = null;
          if (editsReceivedAny && editsText.trim().length > 0) {
            try {
              const ops = parseEditOps(JSON.parse(editsText.trim()));
              if (ops.length > 0 && filesAtSend.length > 0) {
                const result = applyEdits(filesAtSend, ops);
                editsSummary = { applied: result.applied, failed: result.failed };
                if (result.applied > 0) editedFiles = mergeEdits(filesAtSend, result);
              }
            } catch {
              // Malformed edits JSON — skip silently, the reply still ships.
            }
          }

          let summaryFallback = "(empty response)";
          let isError = false;
          if (parsedVariations) {
            summaryFallback = `${parsedVariations.options.length} directions — pick one to go deep.`;
          } else if (editedFiles) {
            summaryFallback = `Applied ${editsSummary!.applied} edit${editsSummary!.applied === 1 ? "" : "s"}.`;
          } else if (parsedFiles) {
            const suffix = filesParseErrors.length > 0 ? ` · ${filesParseErrors.length} failed to parse` : "";
            summaryFallback = `Shipped ${parsedFiles.length} file${parsedFiles.length === 1 ? "" : "s"}.${suffix}`;
          } else if (filesReceivedAny && filesText.trim().length > 0) {
            // Files block arrived but nothing usable parsed out of it.
            summaryFallback = `Couldn't parse any files from the response${filesParseErrors.length > 0 ? ` (${filesParseErrors.length} malformed)` : ""}. Try again or ask me to regenerate.`;
            isError = true;
          } else if (parsedQuestions) {
            summaryFallback = "Quick questions before I start —";
          }

          // Final parse of todos (in case we only saw partial earlier).
          let finalTodos: string[] | undefined;
          if (todosReceivedAny && todosText.trim().length > 0) {
            try {
              const arr = JSON.parse(todosText.trim()) as unknown[];
              const todos = arr
                .filter((t): t is string => typeof t === "string")
                .map((t) => t.trim())
                .filter(Boolean);
              if (todos.length > 0) finalTodos = todos;
            } catch {
              /* ignore — keep whatever incremental parse produced */
            }
          }

          updateMessage(assistantId, {
            text: replyText ? redactBrands(replyText, trimmed) : summaryFallback,
            streaming: false,
            error: isError,
            progress: { ...progressRef, phase: "done" },
            ...(parsedQuestions ? { questions: parsedQuestions } : {}),
            ...(editsSummary ? { editsSummary } : {}),
            ...(parsedDesignTweaks ? { designTweaks: parsedDesignTweaks } : {}),
            ...(parsedVariations ? { variations: parsedVariations } : {}),
            ...(designPlanReceivedAny && designPlanText.trim()
              ? { designPlan: redactBrands(designPlanText.trim(), trimmed) }
              : {}),
            ...(finalTodos ? { todos: finalTodos } : {}),
            ...(writingFilesOrdered.length > 0
              ? { writingFiles: [...writingFilesOrdered] }
              : {}),
          });

          // Decide how to fold edits + new files into the project tree.
          //
          // Three modes:
          //   regen   — Claude emitted forge.html (or there was no project):
          //             replace the tree with parsedFiles (± edits on top).
          //   add-only — Claude emitted new files WITHOUT forge.html: merge
          //             onto the existing tree (editedFiles ?? filesAtSend).
          //   edits-only — no parsedFiles: just use editedFiles.
          //
          // The add-only path is how variation-go-deep works — new pages and
          // components land without rewriting the picked variation's files.
          const baseTree = editedFiles ?? filesAtSend;
          let finalFiles: FilePayload[] | null = null;
          let mode: "regen" | "add-only" | "edits-only" | null = null;
          if (parsedFiles) {
            const isRegen =
              parsedFiles.some((f) => f.path === "forge.html") || baseTree.length === 0;
            if (isRegen) {
              finalFiles = parsedFiles;
              mode = "regen";
            } else {
              const byPath = new Map<string, FilePayload>();
              for (const f of baseTree) byPath.set(f.path, f);
              for (const f of parsedFiles) byPath.set(f.path, f);
              finalFiles = [...byPath.values()];
              mode = "add-only";
            }
          } else if (editedFiles) {
            finalFiles = editedFiles;
            mode = "edits-only";
          }
          if (finalFiles) {
            const isTextEditPin =
              attached?.label?.startsWith("text · ") ||
              batch.some((p) => p.label?.startsWith("text · "));
            const isPinned = Boolean(attached) || batch.length > 0;
            const promptSummary = summarizeTurn(trimmed);
            // Build a richer label + a one-line summary for the sidebar.
            // Label names WHAT happened (Pin · Card / Text · / +3 files / Edit).
            // Summary echoes the user's intent so a list of versions reads
            // like "Pin · PricingCard · make this denser" instead of just
            // "Pin · PricingCard".
            let versionLabel: string;
            let versionSummary: string | undefined;
            if (isTextEditPin) {
              const target = attached?.componentName ?? batch[0]?.componentName;
              versionLabel = target ? `Text · ${target}` : "Text edit";
              // The synthesized message text starts with "Inline text edit ..."
              // — strip the prefix for the summary.
              versionSummary = promptSummary.replace(/^Inline text edit[^:]*:?\s*/i, "");
            } else if (isPinned && (mode === "edits-only" || mode === "add-only")) {
              if (batch.length > 1) {
                versionLabel = `Pins (${batch.length})`;
                versionSummary = batch
                  .map((p) => `${p.componentName ?? p.tag}: ${p.comment ?? ""}`)
                  .join(" · ");
              } else {
                const target = attached?.componentName ?? attached?.tag ?? "element";
                const comment = attached?.comment ?? promptSummary;
                versionLabel = `Pin · ${target}`;
                versionSummary = comment;
              }
            } else if (mode === "add-only") {
              versionLabel = `+${parsedFiles!.length} file${parsedFiles!.length === 1 ? "" : "s"}`;
              versionSummary = promptSummary;
            } else if (mode === "edits-only") {
              versionLabel = "Edit";
              versionSummary = promptSummary;
            } else {
              versionLabel = filesAtSend.length === 0 ? "First design" : "Regen";
              versionSummary = promptSummary;
            }
            const version: DesignVersion = {
              id: uid("v"),
              label: versionLabel,
              summary: versionSummary,
              userPrompt: trimmed,
              createdAt: Date.now(),
              files: finalFiles,
              tokens: tweaksAtSend,
            };
            setProject((p) => ({
              ...p,
              files: finalFiles,
              versions: [version, ...p.versions].slice(0, 50),
              currentVersionId: version.id,
              // Fresh regen → reset design tweak values + accent. On
              // add-only / edits-only turns we keep the picked variation's
              // tweaks intact — the palette isn't changing.
              ...(parsedDesignTweaks && mode === "regen"
                ? {
                    designTweaks: parsedDesignTweaks,
                    designTweakValues: defaultsFromControls(parsedDesignTweaks),
                    customAccentHex: parsedDesignTweaks.palette[0]?.value ?? null,
                  }
                : {}),
            }));
          } else if (parsedDesignTweaks) {
            // Tweaks emitted without files (rare) — still update the spec.
            setProject((p) => ({
              ...p,
              designTweaks: parsedDesignTweaks!,
              designTweakValues: defaultsFromControls(parsedDesignTweaks!),
            }));
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          updateMessage(assistantId, {
            text: replyText.length > 0 ? replyText + "\n\n(stopped)" : "(stopped)",
            streaming: false,
            progress: { ...progressRef, phase: "done" },
          });
        } else {
          updateMessage(assistantId, {
            text: err instanceof Error ? err.message : "Network error",
            streaming: false,
            error: true,
            progress: { ...progressRef, phase: "done" },
          });
        }
      } finally {
        setIsStreaming(false);
        streamingRef.current = false;
        setStreamingProgress(null);
        setDraftFiles(null);
        abortRef.current = null;
      }
    },
    [updateMessage],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const attached = pendingPin;
      setPendingPin(null);
      if (attached) clearPinHighlight();
      if (streamingRef.current) {
        setPendingQueue((q) => [...q, { text: trimmed, pin: attached }]);
        return;
      }
      // Fire and flash the pinned component on success.
      void (async () => {
        const prevVersionId = projectRef.current.currentVersionId;
        try {
          await fireRequest(trimmed, attached);
        } catch {
          return;
        }
        const landed =
          attached &&
          projectRef.current.currentVersionId &&
          projectRef.current.currentVersionId !== prevVersionId;
        if (landed) triggerFlash(attached!.componentName, attached!.componentFile);
      })();
    },
    [pendingPin, fireRequest, clearPinHighlight, triggerFlash],
  );

  /** Stash the active pin into the batch (each gets its own comment). */
  const stashPin = useCallback(
    (comment: string) => {
      if (!pendingPin) return;
      const trimmed = comment.trim();
      if (!trimmed) return;
      setPinBatch((b) => [...b, { ...pendingPin, comment: trimmed }]);
      setPendingPin(null);
      clearPinHighlight();
    },
    [pendingPin, clearPinHighlight],
  );

  const removeFromBatch = useCallback((n: number) => {
    setPinBatch((b) => b.filter((p) => p.n !== n));
  }, []);

  const clearBatch = useCallback(() => setPinBatch([]), []);

  /** Send the entire batch as one structured edit turn. */
  const sendBatch = useCallback(() => {
    if (pinBatch.length === 0) return;
    const lines = pinBatch.map((p, i) => {
      const where = p.componentFile
        ? ` in ${p.componentFile}${p.componentName ? ` (<${p.componentName}>)` : ""}`
        : p.componentName
          ? ` in <${p.componentName}>`
          : "";
      const target = p.text ? ` matching "${p.text.slice(0, 60)}"` : "";
      return `${i + 1}. ${p.comment}\n   → element <${p.tag}>${target}${where}`;
    });
    const messageText =
      pinBatch.length === 1
        ? pinBatch[0].comment ?? "Edit this element."
        : `Apply the following ${pinBatch.length} pinned edits as a single batch (one <edits> response, one op per pin):\n\n${lines.join("\n")}`;
    const batch = [...pinBatch];
    setPinBatch([]);
    if (streamingRef.current) {
      setPendingQueue((q) => [...q, { text: messageText, pin: batch[0] }]);
      return;
    }
    void (async () => {
      const prevVersionId = projectRef.current.currentVersionId;
      try {
        await fireRequest(messageText, null, batch);
      } catch {
        return;
      }
      const landed =
        projectRef.current.currentVersionId &&
        projectRef.current.currentVersionId !== prevVersionId;
      if (!landed) return;
      // Flash the first pin's component — representative for the batch.
      // (We could loop and flash each but it'd get visually noisy.)
      const first = batch[0];
      triggerFlash(first?.componentName, first?.componentFile);
    })();
  }, [pinBatch, fireRequest, triggerFlash]);

  /** Inline text edit — fire as a code-only turn with a precise prompt. */
  const handleTextEdit = useCallback(
    async (edit: TextEdit) => {
      if (!edit.oldText || !edit.newText || edit.oldText === edit.newText) return;
      const where = edit.componentFile
        ? ` in ${edit.componentFile}${edit.componentName ? ` (<${edit.componentName}>)` : ""}`
        : edit.componentName
          ? ` in <${edit.componentName}>`
          : "";
      const fileLabel =
        edit.componentFile?.split("/").pop() ??
        (edit.componentName ? `${edit.componentName}.jsx` : "current file");
      showToast(
        `Text updated → applying edit to ${fileLabel}…`,
        "info",
        3600,
      );
      const messageText = `Inline text edit${where}:\n\nReplace this text:\n${edit.oldText}\n\nWith:\n${edit.newText}\n\nUse a single <edits> str_replace op on the file above. The "old" string MUST be the exact JSX text literal verbatim (including any surrounding whitespace inside the JSX expression). Do not modify wrapping markup or adjacent props.`;
      // Synthesize a pin so the server's classifyTurn routes this to code-only.
      pinCounterRef.current += 1;
      const syntheticPin: PendingPin = {
        n: pinCounterRef.current,
        label: `text · ${edit.oldText.slice(0, 30)}`,
        tag: edit.tag,
        text: edit.oldText,
        componentName: edit.componentName,
        componentFile: edit.componentFile,
        comment: messageText,
      };
      if (streamingRef.current) {
        setPendingQueue((q) => [...q, { text: messageText, pin: syntheticPin }]);
        return;
      }
      // --- Flash + Undo timing, for future maintainers ---
      // 1. Capture `prevVersionId` BEFORE the stream starts. This is the
      //    snapshot we revert to if the user clicks Undo.
      // 2. We await `fireRequest`; after it resolves, the stream has
      //    finished AND the final commit logic has pushed a new version
      //    onto project.versions (or not, if the turn failed / aborted).
      // 3. Only if a NEW version landed do we show the Undo toast and
      //    fire the component flash — both of those have the same
      //    "something actually changed" precondition.
      // 4. The flash is handed to Canvas via `flashHint`. Canvas watches
      //    for the iframe's next "ready" signal (the iframe rebuilds on
      //    every srcDoc change, so there's a short moment where it isn't
      //    ready) and queues the flash until then. That's what makes the
      //    lime flash reliably land on the edited component even though
      //    the iframe just reloaded.
      const prevVersionId = projectRef.current.currentVersionId;
      let fireSucceeded = true;
      try {
        await fireRequest(messageText, syntheticPin);
      } catch {
        fireSucceeded = false;
      }
      const newVersionId = projectRef.current.currentVersionId;
      const landed = fireSucceeded && prevVersionId && newVersionId && newVersionId !== prevVersionId;
      if (landed) {
        triggerFlash(edit.componentName, edit.componentFile);
        showToast(
          {
            kind: "success",
            text: `Text edit applied to ${fileLabel}.`,
            action: {
              label: "Undo",
              // Inline restore so we don't depend on the later-defined
              // handleSelectVersion (would create a temporal-dead-zone
              // reference at render time).
              onClick: () => {
                const target = projectRef.current.versions.find(
                  (v) => v.id === prevVersionId,
                );
                if (!target) return;
                setProject((p) => ({
                  ...p,
                  files: target.files,
                  currentVersionId: target.id,
                  tweaks: { ...p.tweaks, ...target.tokens },
                }));
              },
            },
          },
          "success",
          6000,
        );
      }
    },
    [fireRequest, showToast, triggerFlash],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Drain queued messages once the current generation finishes.
  useEffect(() => {
    if (isStreaming) return;
    if (pendingQueue.length === 0) return;
    if (drainBusyRef.current) return;
    drainBusyRef.current = true;
    const [next, ...rest] = pendingQueue;
    setPendingQueue(rest);
    void fireRequest(next.text, next.pin);
    // Release the latch on next tick so the streaming-state update has a
    // chance to flip streamingRef before the next drain.
    queueMicrotask(() => {
      drainBusyRef.current = false;
    });
  }, [isStreaming, pendingQueue, fireRequest]);

  const clearQueue = useCallback(() => setPendingQueue([]), []);

  const handleDesignTweakChange = useCallback(
    (id: string, value: string | number | boolean) => {
      const control = projectRef.current.designTweaks?.controls.find((c) => c.id === id);
      setProject((p) => ({
        ...p,
        designTweakValues: { ...p.designTweakValues, [id]: value },
      }));
      // Regen-type controls trigger a Claude turn; css-type are applied by
      // the iframe overlay automatically.
      if (control?.applies === "regen") {
        sendMessage(`Apply design tweak: ${control.label} = ${value}`);
      }
    },
    [sendMessage],
  );

  const handlePickAccent = useCallback((hex: string | null) => {
    setProject((p) => ({ ...p, customAccentHex: hex }));
  }, []);

  const applyTweaksToCanvas = useCallback(() => {
    if (project.files.length === 0) {
      sendMessage("Generate a starter design that uses the current tokens.");
      return;
    }
    sendMessage(
      "Apply the latest design tokens (theme, accent, font, density, padding, radius) to the current project. Keep the layout and content the same — just refresh the styling to match.",
    );
  }, [project.files.length, sendMessage]);

  const handleNewProject = useCallback(() => {
    // Multi-project model: "New" adds a fresh project to the workspace
    // and switches to it. The current project is preserved in the
    // sidebar — the user can return to it anytime.
    if (abortRef.current) abortRef.current.abort();
    newProject();
    setPendingPin(null);
    setCommentMode(false);
    setHandoffOpen(false);
  }, [newProject]);

  const handleSelectVersion = useCallback(
    (id: string) => {
      const v = project.versions.find((x) => x.id === id);
      if (!v) return;
      setProject((p) => ({
        ...p,
        files: v.files,
        currentVersionId: v.id,
        tweaks: { ...p.tweaks, ...v.tokens },
      }));
    },
    [project.versions],
  );

  // Forge chrome stays on a fixed visual identity regardless of tweaks —
  // tweaks only flow into the canvas (live overlay + Claude's design state).
  const rootClass = "theme-dark accent-lime font-geometric density-comfy";

  const rootStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--bg)",
    color: "var(--ink)",
    overflow: "hidden",
  };

  const chatSide = project.tweaks.chatSide;

  // Only the design-output files belong in the canvas tabs. The handoff
  // bundle still ships PROMPT.md + components.json + README — those live in
  // the Send-to-Claude-Code modal, not here.
  // The most recent assistant message with unanswered <questions>. Drives the
  // questions overlay on the canvas.
  // Live-stream: surface the questions panel as soon as the FIRST group
  // lands (even while the Design agent is still emitting the rest). The
  // QuestionsPanel knows to disable Submit while isStreaming is true.
  const pendingQuestionMessage = useMemo(() => {
    for (let i = project.messages.length - 1; i >= 0; i--) {
      const m = project.messages[i];
      if (m.role !== "assistant") continue;
      if (m.questions && m.questions.groups.length > 0 && !m.questionsAnswered) return m;
      // If a more recent assistant message exists without questions, the user
      // has moved on — don't surface older ones.
      if (m.questions === undefined && m.text) break;
    }
    return null;
  }, [project.messages]);

  const submitQuestionAnswers = useCallback(
    (formatted: string) => {
      if (pendingQuestionMessage) {
        updateMessage(pendingQuestionMessage.id, { questionsAnswered: true });
      }
      sendMessage(formatted);
    },
    [pendingQuestionMessage, sendMessage, updateMessage],
  );

  const skipPendingQuestions = useCallback(() => {
    if (pendingQuestionMessage) {
      updateMessage(pendingQuestionMessage.id, { questionsAnswered: true });
    }
  }, [pendingQuestionMessage, updateMessage]);

  // The most recent assistant message with unresolved <variations>.
  const pendingVariationsMessage = useMemo(() => {
    for (let i = project.messages.length - 1; i >= 0; i--) {
      const m = project.messages[i];
      if (m.role !== "assistant") continue;
      if (m.variations && !m.variationsResolved && !m.streaming) return m;
      if (m.variations === undefined && m.role === "assistant" && m.text) break;
    }
    return null;
  }, [project.messages]);

  const pickVariation = useCallback(
    (option: VariationOption) => {
      if (!pendingVariationsMessage) return;
      // The picked variation's files become the working tree verbatim —
      // same architecture as the final project. Going deep is pure addition
      // from here, so visual drift is structurally impossible.
      const pickedFiles: FilePayload[] = option.files;
      const now = Date.now();
      const pickedVersion: DesignVersion = {
        id: uid("v"),
        label: `Pick · ${option.name}`,
        summary: option.summary ?? "Picked direction from variations round.",
        userPrompt: `[picked variation: ${option.name}] ${option.summary ?? ""}`.trim(),
        createdAt: now,
        files: pickedFiles,
        tokens: projectRef.current.tweaks,
      };

      // Save the NON-picked variations as versions too, so the user can
      // backtrack and start from one of them later. Slightly older
      // timestamps keep them below the pick in the Versions list.
      const unpicked = (pendingVariationsMessage.variations?.options ?? []).filter(
        (v) => v.id !== option.id,
      );
      const unpickedVersions: DesignVersion[] = unpicked.map((v, i) => ({
        id: uid("v"),
        label: `Variation · ${v.name}`,
        summary: v.summary ?? "Unpicked variation — restorable.",
        userPrompt: `[variation snapshot: ${v.name}] ${v.summary ?? ""}`.trim(),
        createdAt: now - (i + 1),
        files: v.files,
        tokens: projectRef.current.tweaks,
      }));

      // Compose the full next state and commit it BOTH to React state and
      // projectRef synchronously. sendMessage below runs synchronously,
      // fireRequest reads projectRef.current before any await — if we only
      // called setProject, the ref would still be stale (its useEffect
      // hasn't committed), filesAtSend would be [], and the server's
      // go-deep path would see an empty <current_files> → the picked
      // variation's forge.html would vanish in the downstream merge.
      const current = projectRef.current;
      const nextProject: ProjectState = {
        ...current,
        messages: current.messages.map((m) =>
          m.id === pendingVariationsMessage.id
            ? { ...m, variationsResolved: true, pickedVariationId: option.id }
            : m,
        ),
        files: pickedFiles,
        versions: [pickedVersion, ...unpickedVersions, ...current.versions].slice(0, 50),
        currentVersionId: pickedVersion.id,
      };
      setProject(nextProject);
      projectRef.current = nextProject;

      // Detect sketch vs legacy multi-file variation. Sketches are single-
      // file HTML docs (no Babel scripts) — they go through the server's
      // Convert & Lock path which skips the Design agent entirely.
      // Multi-file variations (from older projects) take the add-only
      // go-deep path.
      const isSketch =
        pickedFiles.length === 1 &&
        pickedFiles[0].path === "forge.html" &&
        !/type\s*=\s*["']text\/babel["']/i.test(pickedFiles[0].content);

      if (isSketch) {
        // Convert & Lock — the server's classifyTurn sees "I picked" +
        // single HTML sketch and routes to the dedicated translation pass.
        // Message phrasing here primarily hints the classifier + gives the
        // Code agent a reminder of the rules; the hard enforcement lives
        // in the server-side CONVERT_AND_LOCK_MANDATE block.
        sendMessage(
          `I picked "${option.name}". Convert and lock this sketch into the proper multi-file structure — tokens.css, data.js, components/*.jsx — and preserve the sketch's visual exactly (every color, font, radius, spacing value, shadow, and layout decision). Do not redesign or "improve" anything. The sketch IS the final visual; just organize it properly.`,
        );
      } else {
        // Legacy multi-file variation (pre-sketch architecture). The
        // files are already a proper tree; a go-deep turn expands scope
        // via add-only edits.
        sendMessage(
          `I picked "${option.name}" from the variations. Now go deep and expand it into the full product per the scope I answered earlier.

The picked variation's files (forge.html + tokens.css + data.js + components/*.jsx) are already the working tree — don't rewrite them. ADD:

- New page components (components/<Name>Page.jsx) for every page in my Scope answer that the variation doesn't already have.
- Any new shared components the new pages need (Modal, Table, Accordion, etc.) as their own .jsx files.
- Wire each new page into App.jsx via <edits> — add a route and a NavBar link.
- Use the palette and fonts from tokens.css as-is. Do not add new hex values, do not change existing ones.

If my Scope answer was "Just the first screen", the variation already IS the first screen — confirm it's complete and ship any small polish via <edits>.`,
        );
      }
    },
    [pendingVariationsMessage, sendMessage],
  );

  const requestMoreVariations = useCallback(() => {
    if (!pendingVariationsMessage) return;
    updateMessage(pendingVariationsMessage.id, { variationsResolved: true });
    sendMessage("None of these feel right. Show me 3 different directions — pick a fresh layout DNA, type system, and color treatment for each.");
  }, [pendingVariationsMessage, sendMessage, updateMessage]);

  const exportVariation = useCallback(
    async (option: VariationOption) => {
      if (!pendingVariationsMessage) return;
      // The user message immediately preceding the variations assistant
      // message is the prompt that produced this round (the original ask,
      // or the formatted answers to the first-turn questions).
      const msgs = projectRef.current.messages;
      const idx = msgs.findIndex((m) => m.id === pendingVariationsMessage.id);
      let userPrompt = "";
      for (let i = idx - 1; i >= 0; i--) {
        if (msgs[i].role === "user") {
          userPrompt = msgs[i].text;
          break;
        }
      }
      const { zipBlob, filename } = await buildVariationBundle(option, {
        userPrompt,
        projectName: projectRef.current.projectName,
      });
      downloadBlob(zipBlob, filename);
    },
    [pendingVariationsMessage],
  );

  const codeFiles = useMemo<CodeFile[]>(() => {
    const live = draftFiles ?? project.files;
    if (live.length === 0) return [];
    const langMap: Record<FileLanguage, CodeFile["language"]> = {
      html: "html",
      css: "css",
      js: "js",
      jsx: "jsx",
      json: "json",
      md: "md",
      txt: "md",
    };
    const files: CodeFile[] = live.map((f) => ({
      name: f.path,
      language: langMap[f.language] ?? "html",
      source: f.content,
      streaming: draftFiles !== null,
    }));
    // Append the computed design tokens CSS as an extra tab.
    files.push({
      name: "design-tokens.css",
      language: "css",
      source: buildTokensCss(project.tweaks),
    });
    return files;
  }, [project.files, project.tweaks, draftFiles]);

  const chatPanel = (
    <div
      style={{
        width: chatSide === "bottom" ? "100%" : 340,
        height: chatSide === "bottom" ? 280 : "100%",
        flexShrink: 0,
      }}
    >
      <ChatPanel
        messages={project.messages}
        onSend={sendMessage}
        pendingPin={pendingPin}
        onClearPin={() => {
          setPendingPin(null);
          clearPinHighlight();
        }}
        pinBatch={pinBatch}
        onStashPin={stashPin}
        onRemoveFromBatch={removeFromBatch}
        onClearBatch={clearBatch}
        onSendBatch={sendBatch}
        layout={chatSide}
        isStreaming={isStreaming}
        queuedCount={pendingQueue.length}
        onStop={stopGeneration}
        onClearQueue={clearQueue}
      />
    </div>
  );

  const canvasArea = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        position: "relative",
      }}
    >
      <Canvas
        projectFiles={draftFiles ?? project.files}
        viewport={project.tweaks.viewport}
        commentMode={commentMode}
        textEditMode={textEditMode}
        pinHighlightClearKey={pinHighlightClearKey}
        flashHint={flashHint}
        isStreaming={isStreaming}
        tweaks={project.tweaks}
        progress={streamingProgress}
        files={codeFiles}
        pendingQuestions={pendingQuestionMessage?.questions ?? null}
        onAnswerQuestions={submitQuestionAnswers}
        onSkipQuestions={skipPendingQuestions}
        pendingVariations={pendingVariationsMessage?.variations ?? null}
        onPickVariation={pickVariation}
        onRequestMoreVariations={requestMoreVariations}
        onExportVariation={exportVariation}
        onTweaksChange={setTweaks}
        onSendToClaudeCode={() => setHandoffOpen(true)}
        onApplyTweaksToCanvas={applyTweaksToCanvas}
        onElementPick={handleElementPick}
        onTextEdit={handleTextEdit}
        onPromptSubmit={sendMessage}
        designTweaks={project.designTweaks}
        designTweakValues={project.designTweakValues}
        onDesignTweakChange={handleDesignTweakChange}
        customAccentHex={project.customAccentHex}
        onPickAccent={handlePickAccent}
        brandKit={project.brandKit ?? null}
        onOpenBrandKit={() => setBrandKitModalOpen(true)}
        onClearBrandKit={clearBrandKit}
      />
    </div>
  );


  return (
    <div className={rootClass} style={{ ...rootStyle, position: "relative" }}>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            padding: "8px 12px 8px 14px",
            background: "var(--bg-raised)",
            border: `1px solid ${toast.kind === "success" ? "var(--accent-line)" : "oklch(0.65 0.18 230 / 0.5)"}`,
            borderRadius: 999,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 8px 24px oklch(0 0 0 / 0.3)",
            animation: "fade-in 160ms ease",
          }}
        >
          <span
            className="pulse-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: 50,
              background: toast.kind === "success" ? "var(--accent)" : "oklch(0.75 0.18 230)",
              flexShrink: 0,
            }}
          />
          <span>{toast.text}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                dismissToast();
              }}
              style={{
                appearance: "none",
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                cursor: "pointer",
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
      <TopBar
        projectName={project.projectName}
        onProjectNameChange={(v) => setProject((p) => ({ ...p, projectName: v }))}
        commentMode={commentMode}
        onToggleComment={() => {
          setCommentMode((m) => !m);
          setTextEditMode(false);
        }}
        textEditMode={textEditMode}
        onToggleTextEdit={() => {
          setTextEditMode((m) => !m);
          setCommentMode(false);
        }}
        viewport={project.tweaks.viewport}
        onViewport={(v) => setTweaks({ viewport: v })}
        onExport={() => setHandoffOpen(true)}
        onNewProject={handleNewProject}
        saving={saving}
        versions={project.versions}
        currentVersionId={project.currentVersionId}
        onSelectVersion={handleSelectVersion}
        onDiffVersion={(id) => setDiffAgainstId(id)}
      />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <ProjectSidebar
          projects={workspace.projects}
          currentProjectId={workspace.currentProjectId}
          collapsed={projectSidebarCollapsed}
          onToggleCollapsed={() => setProjectSidebarCollapsed((c) => !c)}
          onSelect={selectProject}
          onNew={newProject}
          onRename={renameProject}
          onDuplicate={duplicateProjectHandler}
          onDelete={deleteProjectHandler}
          onExport={exportProject}
          onImport={importProject}
        />
        <div
          key={`project-${workspace.currentProjectId ?? "none"}`}
          style={{
            flex: 1,
            display: "flex",
            minHeight: 0,
            animation: "fade-in 160ms ease",
          }}
        >
          {chatSide === "bottom" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ flex: 1, display: "flex", minHeight: 0 }}>{canvasArea}</div>
              {chatPanel}
            </div>
          ) : chatSide === "left" ? (
            <>
              {chatPanel}
              {canvasArea}
            </>
          ) : (
            <>
              {canvasArea}
              {chatPanel}
            </>
          )}
        </div>
      </div>
      <HandoffModal open={handoffOpen} onClose={() => setHandoffOpen(false)} project={project} />
      <NameProjectModal
        open={nameModalOpen}
        defaultName={nameModalDefault}
        onCreate={createProjectWithName}
        onCancel={() => setNameModalOpen(false)}
      />
      <BrandKitModal
        open={brandKitModalOpen}
        current={project.brandKit ?? null}
        onClose={() => setBrandKitModalOpen(false)}
        onApply={applyBrandKit}
        onClear={clearBrandKit}
      />
      <DiffModal
        open={diffAgainstId !== null}
        onClose={() => setDiffAgainstId(null)}
        versionA={
          diffAgainstId
            ? (project.versions.find((v) => v.id === diffAgainstId) ?? null)
            : null
        }
        versionB={
          project.currentVersionId
            ? (project.versions.find((v) => v.id === project.currentVersionId) ?? null)
            : null
        }
      />
    </div>
  );
}
