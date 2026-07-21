"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadBlob } from "@/lib/bundle";
import { highlightCss, highlightHtml, highlightJson, highlightMarkdown } from "@/lib/syntaxHighlight";

export type CodeLang = "html" | "css" | "js" | "jsx" | "json" | "md";

interface CodeViewProps {
  filename: string;
  language: CodeLang;
  source: string;
  streaming?: boolean;
}

function lineCount(s: string): number {
  if (!s) return 0;
  return s.split("\n").length;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export function CodeView({ filename, language, source, streaming }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const followBottomRef = useRef(true);

  // Track whether the user is parked near the bottom — if so, auto-follow new
  // streamed content. If they scroll up to read, we stop following.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      followBottomRef.current = distanceFromBottom < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll to the bottom while the file is streaming.
  useEffect(() => {
    if (!streaming) return;
    const el = scrollerRef.current;
    if (!el || !followBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [source, streaming]);

  const highlighted = useMemo(() => {
    if (!source) return "";
    switch (language) {
      case "html":
      case "jsx":
        // JSX is JS with embedded HTML. The HTML highlighter does a
        // reasonable job on both tag markup and plain text (JS keywords
        // fall through as text, which is fine).
        return highlightHtml(source);
      case "css":
        return highlightCss(source);
      case "js":
      case "json":
        return highlightJson(source);
      case "md":
        return highlightMarkdown(source);
    }
  }, [source, language]);

  const lines = useMemo(() => {
    const count = lineCount(source);
    return Array.from({ length: count }, (_, i) => i + 1).join("\n");
  }, [source]);

  const copy = () => {
    navigator.clipboard?.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const download = () => {
    const mime =
      language === "html" ? "text/html"
      : language === "css" ? "text/css"
      : language === "json" ? "application/json"
      : "text/markdown";
    downloadBlob(new Blob([source], { type: `${mime};charset=utf-8` }), filename);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--bg-sunken)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 10px 40px oklch(0 0 0 / 0.15)",
      }}
    >
      <div
        style={{
          height: 36,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--line)",
          gap: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        }}
      >
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{filename}</span>
        <span style={{ color: "var(--ink-faint)", flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          {lineCount(source)} line{lineCount(source) === 1 ? "" : "s"} · {formatBytes(source.length)}
          {streaming && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "1px 6px",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                border: "1px solid var(--accent-line)",
                borderRadius: 4,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              <span
                className="pulse-dot"
                style={{ width: 5, height: 5, borderRadius: 50, background: "var(--accent)" }}
              />
              writing
            </span>
          )}
        </span>
        <button className="btn sm" onClick={copy} style={{ height: 22 }} disabled={streaming}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <button className="btn sm" onClick={download} style={{ height: 22 }} disabled={streaming}>
          ↓ Download
        </button>
      </div>
      <div
        ref={scrollerRef}
        className="scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          background: "var(--bg-sunken)",
        }}
      >
        <pre
          aria-hidden
          style={{
            margin: 0,
            padding: "14px 8px 14px 14px",
            color: "var(--ink-faint)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.55,
            textAlign: "right",
            userSelect: "none",
            borderRight: "1px solid var(--line-soft)",
            minWidth: 44,
          }}
        >
          {lines}
        </pre>
        <pre
          style={{
            margin: 0,
            padding: "14px 16px",
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.55,
            whiteSpace: "pre",
            flex: 1,
          }}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}
