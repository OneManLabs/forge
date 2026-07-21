"use client";

import { useEffect, useState } from "react";
import { buildHandoffBundle, buildPromptMd, downloadBlob, type HandoffBundle } from "@/lib/bundle";
import type { ProjectState } from "@/lib/types";

interface HandoffModalProps {
  open: boolean;
  onClose: () => void;
  project: ProjectState;
}

export function HandoffModal({ open, onClose, project }: HandoffModalProps) {
  const [phase, setPhase] = useState<"bundling" | "ready" | "error">("bundling");
  const [bundle, setBundle] = useState<HandoffBundle | null>(null);
  const [tab, setTab] = useState<"prompt" | "files" | "readme">("prompt");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("bundling");
    setBundle(null);
    setCopied(false);
    setError(null);
    setTab("prompt");
    let cancelled = false;
    buildHandoffBundle(project)
      .then((b) => {
        if (cancelled) return;
        setBundle(b);
        setPhase("ready");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Bundle failed");
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, project]);

  if (!open) return null;

  const copy = () => {
    if (!bundle) return;
    navigator.clipboard?.writeText(bundle.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    if (bundle) downloadBlob(bundle.zipBlob, bundle.filename);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fade-in 180ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 720,
          maxWidth: "94vw",
          maxHeight: "90vh",
          background: "var(--bg-raised)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px oklch(0 0 0 / 0.4)",
          animation: "slide-up 220ms cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 2,
              }}
            >
              Handoff
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-display)",
              }}
            >
              Send to Claude Code
            </div>
          </div>
          <button className="btn icon ghost" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--bg-sunken)",
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontSize: 12,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: `1.5px solid ${phase === "ready" ? "var(--accent)" : "var(--line)"}`,
              background: phase === "ready" ? "var(--accent)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "var(--accent-ink)",
              flexShrink: 0,
            }}
          >
            {phase === "ready" ? "✓" : phase === "error" ? "!" : (
              <span
                className="pulse-dot"
                style={{ width: 6, height: 6, borderRadius: 50, background: "var(--accent)" }}
              />
            )}
          </div>
          <span style={{ color: "var(--ink-muted)" }}>
            {phase === "bundling" && "Generating CORE.html, design-tokens.css, components.json, PROMPT.md…"}
            {phase === "ready" && bundle && (
              <>
                <strong style={{ color: "var(--ink)" }}>Bundle ready.</strong>{" "}
                {bundle.files.length} files · {(bundle.zipBlob.size / 1024).toFixed(1)} KB ZIP
              </>
            )}
            {phase === "error" && (
              <span style={{ color: "oklch(0.7 0.18 30)" }}>Failed: {error}</span>
            )}
          </span>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid var(--line-soft)", padding: "0 20px" }}>
          {(
            [
              { k: "prompt", label: "Prompt" },
              { k: "files", label: "Bundle" },
              { k: "readme", label: "PROMPT.md" },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                appearance: "none",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "12px 0",
                marginRight: 24,
                color: tab === t.k ? "var(--ink)" : "var(--ink-faint)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                borderBottom: `2px solid ${tab === t.k ? "var(--accent)" : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 280 }}>
          {tab === "prompt" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--ink-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  Step 1 — host the bundle
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.55 }}>
                  Download the ZIP, then publish the unzipped folder somewhere
                  Claude Code can fetch:{" "}
                  <strong style={{ color: "var(--ink)" }}>Vercel</strong>,{" "}
                  <strong style={{ color: "var(--ink)" }}>Cloudflare Pages</strong>,{" "}
                  GitHub raw, or a Gist all work.
                </div>
              </div>
              <div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--ink-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Step 2 — paste this prompt into Claude Code
                  <span style={{ flex: 1 }} />
                  <button
                    onClick={copy}
                    disabled={!bundle}
                    className={`btn sm ${copied ? "" : "primary"}`}
                    style={{ height: 22 }}
                    aria-label="Copy prompt to clipboard"
                  >
                    {copied ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
                <div
                  style={{
                    background: "var(--bg-sunken)",
                    border: `1px solid ${copied ? "var(--accent-line)" : "var(--line)"}`,
                    borderRadius: 8,
                    padding: 16,
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    transition: "border-color 160ms",
                  }}
                >
                  {bundle?.prompt ?? "Generating…"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    marginTop: 8,
                    fontStyle: "italic",
                    lineHeight: 1.5,
                  }}
                >
                  Replace the example URL with your actual hosted URL before sending.
                  The rest of the prompt stays as-is — Claude Code reads CORE.html and
                  PROMPT.md to understand the design.
                </div>
              </div>
            </div>
          )}
          {tab === "files" && bundle && (
            <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              <div
                style={{
                  padding: "8px 14px",
                  background: "var(--bg-sunken)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                {bundle.filename.replace(/\.zip$/, "")}/
              </div>
              {bundle.files.map((f, i) => (
                <div
                  key={f.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderBottom: i < bundle.files.length - 1 ? "1px solid var(--line-soft)" : "none",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      padding: "2px 5px",
                      background: "var(--bg-sunken)",
                      borderRadius: 3,
                      color: "var(--ink-muted)",
                      minWidth: 32,
                      textAlign: "center",
                    }}
                  >
                    {f.type}
                  </span>
                  <span style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12 }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          )}
          {tab === "readme" && (
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--ink)",
                whiteSpace: "pre-wrap",
              }}
            >
              {buildPromptMd(project)}
            </pre>
          )}
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--line-soft)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-sunken)",
            gap: 8,
          }}
        >
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            {bundle ? `● ${bundle.filename}` : "○ preparing…"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn sm" onClick={onClose}>
              Close
            </button>
            <button className="btn sm" onClick={copy} disabled={!bundle}>
              {copied ? "✓ Copied" : "Copy prompt"}
            </button>
            <button className="btn sm primary" onClick={download} disabled={!bundle}>
              Download ZIP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
