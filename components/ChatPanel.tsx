"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatSide, MessageProgress, PendingPin } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  pendingPin: PendingPin | null;
  onClearPin: () => void;
  /** Batched pins waiting to be sent as a single multi-edit turn. */
  pinBatch: PendingPin[];
  /** Stage the active pin into the batch with a per-pin comment. */
  onStashPin: (comment: string) => void;
  onRemoveFromBatch: (n: number) => void;
  onClearBatch: () => void;
  onSendBatch: () => void;
  layout: ChatSide;
  isStreaming: boolean;
  queuedCount: number;
  onStop: () => void;
  onClearQueue: () => void;
}

function formatBytes(n: number): string {
  if (n === 0) return "0";
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function ProgressLine({ progress }: { progress: MessageProgress }) {
  const phaseLabel: Record<MessageProgress["phase"], string> = {
    queued: "Queued",
    thinking: "Thinking",
    reply: "Writing reply",
    files: "Writing files",
    questions: "Drafting questions",
    edits: "Editing files",
    variations: "Sketching variations",
    designing: "Planning the design",
    coding: "Writing the code",
    done: "",
  };
  const label = phaseLabel[progress.phase];
  if (!label) return null;
  return (
    <div
      style={{
        marginTop: 8,
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        color: "var(--ink-faint)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span>{label}</span>
      {progress.replyBytes > 0 && <span>· reply {formatBytes(progress.replyBytes)}</span>}
      {progress.filesBytes > 0 && <span>· canvas {formatBytes(progress.filesBytes)}</span>}
    </div>
  );
}

function ThinkingBlock({ thinking, streaming }: { thinking: string; streaming: boolean }) {
  const [open, setOpen] = useState(streaming);
  const wasStreamingRef = useRef(streaming);
  // When streaming flips off for the first time, auto-collapse — but respect
  // any manual toggle the user has done in the meantime.
  useEffect(() => {
    if (wasStreamingRef.current && !streaming) {
      setOpen(false);
    }
    wasStreamingRef.current = streaming;
  }, [streaming]);

  return (
    <div
      style={{
        marginBottom: 8,
        background: "var(--bg-sunken)",
        border: "1px solid var(--line-soft)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          appearance: "none",
          border: "none",
          background: "transparent",
          color: "var(--ink-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          padding: "6px 10px",
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ opacity: 0.7 }}>{open ? "▾" : "▸"}</span>
        <span>💭 {streaming ? "Thinking…" : "Thoughts"}</span>
        {streaming && (
          <span
            className="pulse-dot"
            style={{ width: 5, height: 5, borderRadius: 50, background: "var(--accent)", marginLeft: 4 }}
          />
        )}
      </button>
      {open && (
        <div
          style={{
            padding: "0 10px 10px",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--ink-muted)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontStyle: "italic",
            maxHeight: 240,
            overflowY: "auto",
          }}
          className="scroll"
        >
          {thinking}
        </div>
      )}
    </div>
  );
}

function DesignPlanBlock({ plan, streaming }: { plan: string; streaming: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        marginBottom: 8,
        background: "var(--accent-soft)",
        border: "1px solid var(--accent-line)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          appearance: "none",
          border: "none",
          background: "transparent",
          color: "var(--accent)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          padding: "6px 10px",
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 600,
        }}
      >
        <span style={{ opacity: 0.7 }}>{open ? "▾" : "▸"}</span>
        <span>📋 Design plan</span>
        {streaming && (
          <span
            className="pulse-dot"
            style={{ width: 5, height: 5, borderRadius: 50, background: "var(--accent)", marginLeft: 4 }}
          />
        )}
      </button>
      {open && (
        <div
          style={{
            padding: "0 10px 10px",
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--ink)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "var(--font-body)",
            maxHeight: 320,
            overflowY: "auto",
          }}
          className="scroll"
        >
          {plan}
        </div>
      )}
    </div>
  );
}

function TodosBlock({
  todos,
  writingFiles,
  streaming,
  progressPhase,
}: {
  todos: string[];
  writingFiles: string[];
  streaming: boolean;
  progressPhase: MessageProgress["phase"] | null;
}) {
  // Naive per-todo status: everything before the current activity = done,
  // the "active" todo = in-progress, everything after = pending. We use the
  // progress phase as the activity signal:
  //   designing → todo #0 in progress
  //   coding / files → first N-1 done, last one in progress
  //   done → everything done
  let activeIdx = 0;
  if (progressPhase === "designing") activeIdx = 0;
  else if (progressPhase === "coding" || progressPhase === "files" || progressPhase === "edits")
    activeIdx = Math.min(todos.length - 1, Math.max(1, writingFiles.length > 0 ? todos.length - 1 : 1));
  else if (progressPhase === "done") activeIdx = todos.length;

  return (
    <div
      style={{
        marginBottom: 8,
        background: "var(--bg-sunken)",
        border: "1px solid var(--line-soft)",
        borderRadius: 6,
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-faint)",
          marginBottom: 6,
        }}
      >
        Plan
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {todos.map((t, i) => {
          const state = i < activeIdx ? "done" : i === activeIdx && streaming ? "active" : "pending";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: 12,
                lineHeight: 1.4,
                color: state === "done" ? "var(--ink-muted)" : "var(--ink)",
                textDecoration: state === "done" ? "line-through" : "none",
              }}
            >
              <span
                style={{
                  width: 14,
                  flexShrink: 0,
                  color:
                    state === "done"
                      ? "var(--accent)"
                      : state === "active"
                        ? "var(--accent)"
                        : "var(--ink-faint)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                {state === "done" ? "✓" : state === "active" ? "◐" : "○"}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>{t}</span>
            </div>
          );
        })}
      </div>

      {writingFiles.length > 0 && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid var(--line-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {writingFiles.map((path, i) => {
            const isActive = streaming && i === writingFiles.length - 1;
            return (
              <div
                key={path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: isActive ? "var(--accent)" : "var(--ink-muted)",
                }}
              >
                {isActive ? (
                  <span
                    className="pulse-dot"
                    style={{ width: 6, height: 6, borderRadius: 50, background: "var(--accent)" }}
                  />
                ) : (
                  <span style={{ color: "var(--accent)", width: 6, textAlign: "center" }}>✓</span>
                )}
                <span>{isActive ? "Writing" : "Wrote"}</span>
                <span style={{ color: "var(--ink)" }}>{path}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  if (m.role === "system") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "20px 0 14px",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
        <span>{m.text}</span>
        <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
      </div>
    );
  }

  if (m.role === "user") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 14,
          animation: "slide-up 200ms ease",
        }}
      >
        <div
          style={{
            maxWidth: "85%",
            padding: "10px 14px",
            background: "var(--accent-soft)",
            border: "1px solid var(--accent-line)",
            borderRadius: "12px 12px 4px 12px",
            fontSize: 13,
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
          {m.attachedPin && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--ink-muted)",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 50, background: "var(--accent)" }} />
              pin #{m.attachedPin.n} · {m.attachedPin.label}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14, animation: "slide-up 200ms ease" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
          fontSize: 11,
          color: "var(--ink-faint)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            background: "var(--ink)",
            transform: "rotate(45deg)",
            display: "inline-block",
          }}
        />
        Forge
        {m.streaming && (
          <span style={{ marginLeft: 6, display: "inline-flex", gap: 3 }}>
            <span className="pulse-dot" style={{ width: 4, height: 4, borderRadius: 50, background: "var(--accent)" }} />
            <span
              className="pulse-dot"
              style={{ width: 4, height: 4, borderRadius: 50, background: "var(--accent)", animationDelay: "0.15s" }}
            />
            <span
              className="pulse-dot"
              style={{ width: 4, height: 4, borderRadius: 50, background: "var(--accent)", animationDelay: "0.3s" }}
            />
          </span>
        )}
      </div>
      {m.thinking && <ThinkingBlock thinking={m.thinking} streaming={Boolean(m.streaming)} />}
      {(m.todos && m.todos.length > 0) || (m.writingFiles && m.writingFiles.length > 0) ? (
        <TodosBlock
          todos={m.todos ?? []}
          writingFiles={m.writingFiles ?? []}
          streaming={Boolean(m.streaming)}
          progressPhase={m.progress?.phase ?? null}
        />
      ) : null}
      {m.designPlan && <DesignPlanBlock plan={m.designPlan} streaming={Boolean(m.streaming)} />}
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: m.error ? "oklch(0.7 0.18 30)" : "var(--ink)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {m.text || (m.streaming ? "" : "(no reply)")}
        {m.streaming && (
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 12,
              background: "var(--accent)",
              marginLeft: 2,
              verticalAlign: "middle",
              animation: "blink-caret 1s step-end infinite",
            }}
          />
        )}
      </div>
      {m.streaming && m.progress && <ProgressLine progress={m.progress} />}
      {!m.streaming && m.editsSummary && (m.editsSummary.applied > 0 || m.editsSummary.failed > 0) && (
        <div
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 8px",
            background: m.editsSummary.failed === 0 ? "var(--accent-soft)" : "var(--bg-sunken)",
            border: `1px solid ${m.editsSummary.failed === 0 ? "var(--accent-line)" : "var(--line)"}`,
            borderRadius: 4,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: m.editsSummary.failed === 0 ? "var(--accent)" : "var(--ink-muted)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span>{m.editsSummary.failed === 0 ? "✓" : "⚠"}</span>
          {m.editsSummary.applied} edit{m.editsSummary.applied === 1 ? "" : "s"} applied
          {m.editsSummary.failed > 0 && ` · ${m.editsSummary.failed} skipped`}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({
  messages,
  onSend,
  pendingPin,
  onClearPin,
  pinBatch,
  onStashPin,
  onRemoveFromBatch,
  onClearBatch,
  onSendBatch,
  layout,
  isStreaming,
  queuedCount,
  onStop,
  onClearQueue,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [pinComment, setPinComment] = useState("");

  // Whenever a new pin is staged, focus is implicit on the comment box.
  useEffect(() => {
    if (pendingPin) setPinComment("");
  }, [pendingPin?.n]);

  const stashCurrent = () => {
    const c = pinComment.trim();
    if (!c) return;
    onStashPin(c);
    setPinComment("");
  };

  const sendOnlyThisPin = () => {
    const c = pinComment.trim();
    if (!c) return;
    onSend(c);
    setPinComment("");
  };
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  };

  const isBottom = layout === "bottom";
  const placeholder = pendingPin
    ? `Tell Forge what to do with this element…`
    : messages.length === 0
      ? `Describe a design — e.g. "a dark-mode SaaS dashboard with KPI cards"`
      : isStreaming
        ? `Send another — it'll queue and fire when Forge finishes…`
        : `Describe a change or new screen…`;
  const turnCount = messages.filter((m) => m.role !== "system").length;
  const sendLabel = isStreaming ? "Queue ↵" : "Forge ↵";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg)",
        borderRight: layout === "left" ? "1px solid var(--line)" : "none",
        borderLeft: layout === "right" ? "1px solid var(--line)" : "none",
        borderTop: isBottom ? "1px solid var(--line)" : "none",
      }}
    >
      <div
        style={{
          height: "var(--h-bar, 48px)",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, minWidth: 0 }}>
          <span className="chip">
            <span className="dot pulse-dot" style={{ background: isStreaming ? "var(--accent)" : "var(--ink-faint)" }} />
            {isStreaming ? "Generating" : "Live"}
          </span>
          <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {turnCount} turn{turnCount === 1 ? "" : "s"}
          </span>
          {queuedCount > 0 && (
            <span
              className="chip"
              title="Messages queued — they'll fire when current generation ends"
              style={{ borderColor: "var(--accent-line)", color: "var(--accent)" }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 50, background: "var(--accent)" }} />
              +{queuedCount} queued
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {isStreaming && (
            <button className="btn sm ghost" onClick={onStop} title="Stop the current generation">
              ◼ Stop
            </button>
          )}
          {queuedCount > 0 && (
            <button className="btn sm ghost" onClick={onClearQueue} title="Clear the queue">
              Clear queue
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
        {messages.length === 0 && (
          <div style={{ color: "var(--ink-faint)", fontSize: 12, textAlign: "center", padding: "20px 8px", lineHeight: 1.5 }}>
            Type a prompt below to generate your first design.
            <br />
            Try: <em>“A pricing page for an indie SaaS, three tiers, dark mode.”</em>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid var(--line-soft)", flexShrink: 0 }}>
        {pinBatch.length > 0 && (
          <div
            style={{
              marginBottom: 8,
              padding: 8,
              background: "var(--bg-raised)",
              border: "1px solid var(--accent-line)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                {pinBatch.length} pin{pinBatch.length === 1 ? "" : "s"} batched
              </span>
              <div style={{ flex: 1 }} />
              <button className="btn sm ghost" onClick={onClearBatch} style={{ height: 22 }}>
                Clear
              </button>
              <button className="btn sm primary" onClick={onSendBatch} style={{ height: 22 }}>
                Send batch ({pinBatch.length}) →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {pinBatch.map((p) => (
                <div
                  key={p.n}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    fontSize: 11,
                    color: "var(--ink-muted)",
                    fontFamily: "var(--font-mono)",
                    paddingTop: 2,
                  }}
                >
                  <span style={{ color: "var(--accent)", flexShrink: 0, fontWeight: 600 }}>#{p.n}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 6,
                        overflow: "hidden",
                      }}
                      title={p.componentFile ?? p.label}
                    >
                      <span style={{ color: "var(--ink)", fontWeight: 600, flexShrink: 0 }}>
                        {p.componentName ?? `<${p.tag}>`}
                      </span>
                      {p.componentFile && (
                        <span
                          style={{
                            color: "var(--ink-faint)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: 10,
                          }}
                        >
                          {p.componentFile}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 12,
                        color: "var(--ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: 1,
                      }}
                      title={p.comment}
                    >
                      {p.comment}
                    </div>
                  </div>
                  <button
                    className="btn sm ghost"
                    onClick={() => onRemoveFromBatch(p.n)}
                    style={{ padding: "0 4px", height: 18, fontSize: 11, alignSelf: "flex-start" }}
                    title="Remove this pin"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {pendingPin && (
          <div
            style={{
              marginBottom: 8,
              padding: 8,
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-line)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
            >
              <span style={{ color: "var(--accent)" }}>◉</span>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--ink)",
                  }}
                  title={`${pendingPin.componentFile ?? ""} ${pendingPin.label}`}
                >
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    Pin #{pendingPin.n}
                  </span>
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {pendingPin.componentName
                      ? pendingPin.componentName
                      : `<${pendingPin.tag}>`}
                  </span>
                  {pendingPin.componentFile && (
                    <span style={{ color: "var(--ink-faint)" }}>
                      · {pendingPin.componentFile}
                    </span>
                  )}
                </div>
                {pendingPin.text && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ink-muted)",
                      fontFamily: "var(--font-body)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={pendingPin.text}
                  >
                    “{pendingPin.text.length > 70 ? pendingPin.text.slice(0, 70) + "…" : pendingPin.text}”
                  </div>
                )}
              </div>
              <button
                className="btn sm ghost"
                onClick={onClearPin}
                style={{ padding: "0 4px", height: 20 }}
                title="Clear pin"
              >
                ×
              </button>
            </div>
            <textarea
              value={pinComment}
              onChange={(e) => setPinComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (e.shiftKey) stashCurrent();
                  else sendOnlyThisPin();
                }
              }}
              placeholder='What should change here? e.g. "make this denser", "use the warm accent", "add an icon"'
              rows={2}
              style={{
                width: "100%",
                resize: "none",
                outline: "none",
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                lineHeight: 1.4,
                padding: "6px 8px",
              }}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button
                className="btn sm ghost"
                onClick={stashCurrent}
                disabled={!pinComment.trim()}
                title="Add to batch (⌘⇧↵)"
                style={{ height: 24 }}
              >
                + Add to batch
              </button>
              <button
                className="btn sm primary"
                onClick={sendOnlyThisPin}
                disabled={!pinComment.trim()}
                title="Send only this pin (⌘↵)"
                style={{ height: 24 }}
              >
                Send pin →
              </button>
            </div>
          </div>
        )}
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: 10,
            background: "var(--bg-raised)",
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            rows={isBottom ? 1 : 3}
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              color: "var(--ink)",
              font: "inherit",
              fontSize: 13,
              resize: "none",
              outline: "none",
              lineHeight: 1.5,
              minHeight: isBottom ? 24 : 56,
              fontFamily: "var(--font-body)",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <div style={{ fontSize: 10, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
              {isStreaming ? "queues until Forge finishes" : "⌘↵ to send"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="kbd">⌘</span>
              <span className="kbd">↵</span>
              <button
                className="btn sm primary"
                onClick={send}
                disabled={!draft.trim()}
                title={isStreaming ? "Queue this message — fires when current generation ends" : "Send"}
              >
                {sendLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
