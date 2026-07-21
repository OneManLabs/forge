"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseCss, parseForgeProject, parseTailwindConfig } from "@/lib/brandKit";
import type { BrandKit } from "@/lib/types";

const CATEGORY_ORDER: VarCategory[] = ["color", "font", "radius", "spacing", "other"];
const CATEGORY_LABELS: Record<VarCategory, string> = {
  color: "Colors",
  font: "Fonts",
  radius: "Radius",
  spacing: "Spacing",
  other: "Other",
};

function BrandKitPreview({
  vars,
  fonts,
}: {
  vars: Record<string, string>;
  fonts: string[];
}) {
  const grouped = useMemo(() => {
    const out: Record<VarCategory, Array<[string, string]>> = {
      color: [],
      font: [],
      radius: [],
      spacing: [],
      other: [],
    };
    for (const [k, v] of Object.entries(vars)) {
      out[categorizeVar(k, v)].push([k, v]);
    }
    return out;
  }, [vars]);
  const varCount = Object.keys(vars).length;
  return (
    <div
      style={{
        background: "var(--bg-sunken)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 10,
        }}
      >
        Preview — {varCount} var{varCount === 1 ? "" : "s"} · {fonts.length} font
        {fonts.length === 1 ? "" : "s"}
      </div>

      {/* Colors: large swatches in a grid */}
      {grouped.color.length > 0 && (
        <PreviewSection label="Colors" count={grouped.color.length}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: 8,
            }}
          >
            {grouped.color.slice(0, 18).map(([k, v]) => (
              <div
                key={k}
                title={`${k}: ${v}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 6,
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  background: "var(--bg-raised)",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: v,
                    border: "1px solid var(--line)",
                    flexShrink: 0,
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontFamily: "var(--font-mono)",
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {k.replace(/^--(kit-)?/, "")}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--ink-faint)",
                      fontFamily: "var(--font-mono)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {grouped.color.length > 18 && (
            <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
              + {grouped.color.length - 18} more colors
            </div>
          )}
        </PreviewSection>
      )}

      {/* Font stacks (from fonts array + typographic vars) */}
      {(fonts.length > 0 || grouped.font.length > 0) && (
        <PreviewSection
          label="Fonts"
          count={fonts.length + grouped.font.length}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-muted)",
            }}
          >
            {fonts.slice(0, 4).map((f, i) => (
              <span
                key={`f-${i}`}
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f}
              </span>
            ))}
            {grouped.font.slice(0, 4).map(([k, v]) => (
              <span
                key={k}
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {k}: {v}
              </span>
            ))}
          </div>
        </PreviewSection>
      )}

      {/* Radius, spacing, other — condensed chip rows */}
      {(["radius", "spacing", "other"] as const).map((cat) => {
        const entries = grouped[cat];
        if (entries.length === 0) return null;
        return (
          <PreviewSection key={cat} label={CATEGORY_LABELS[cat]} count={entries.length}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {entries.slice(0, 16).map(([k, v]) => (
                <span
                  key={k}
                  title={`${k}: ${v}`}
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    padding: "2px 6px",
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    background: "var(--bg-raised)",
                    color: "var(--ink-muted)",
                    maxWidth: 170,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {k.replace(/^--(kit-)?/, "")}: {v}
                </span>
              ))}
              {entries.length > 16 && (
                <span style={{ fontSize: 10, color: "var(--ink-faint)", alignSelf: "center" }}>
                  + {entries.length - 16}
                </span>
              )}
            </div>
          </PreviewSection>
        );
      })}
    </div>
  );
}

function PreviewSection({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 5,
        }}
      >
        {label} · {count}
      </div>
      {children}
    </div>
  );
}

type VarCategory = "color" | "font" | "radius" | "spacing" | "other";

function categorizeVar(name: string, value: string): VarCategory {
  const n = name.toLowerCase();
  const v = value.trim();
  if (/^#|^(rgb|rgba|hsl|hsla|oklch|oklab)\(/i.test(v)) return "color";
  if (/color|palette|accent|brand|fg|bg|ink|surface/i.test(n)) return "color";
  if (/font|family|typeface/i.test(n)) return "font";
  if (/radius|rounded/i.test(n)) return "radius";
  if (/space|spacing|gap|padding|margin|size/i.test(n)) return "spacing";
  return "other";
}

interface BrandKitModalProps {
  open: boolean;
  current: BrandKit | null;
  onClose: () => void;
  onApply: (kit: BrandKit) => void;
  onClear: () => void;
}

type SourceKind = "css" | "tailwind" | "forge";

export function BrandKitModal({ open, current, onClose, onApply, onClear }: BrandKitModalProps) {
  const [name, setName] = useState("");
  const [source, setSource] = useState<SourceKind>("css");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(current?.name ?? "");
    setSource((current?.source as SourceKind) ?? "css");
    setRaw("");
    setError(null);
  }, [open, current]);

  const parsed = useMemo(() => {
    if (!raw.trim()) return null;
    try {
      if (source === "css") return parseCss(raw);
      if (source === "tailwind") return parseTailwindConfig(raw);
      if (source === "forge") {
        const r = parseForgeProject(raw);
        return { vars: r.vars, fonts: r.fonts, inferredName: r.name };
      }
    } catch {
      return null;
    }
    return null;
  }, [raw, source]);

  if (!open) return null;

  const onFilePicked = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      setRaw(text);
      // Infer source from extension if the user hasn't explicitly set it.
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "css") setSource("css");
      else if (ext === "js" || ext === "ts" || ext === "mjs" || ext === "cjs") setSource("tailwind");
      else if (ext === "json" || ext === "forge") setSource("forge");
      if (!name) setName(file.name.replace(/\.[^.]+$/, "").slice(0, 60));
    } catch {
      setError("Couldn't read that file.");
    }
  };

  const apply = () => {
    if (!parsed || (Object.keys(parsed.vars).length === 0 && parsed.fonts.length === 0)) {
      setError(
        "Nothing to import — the file didn't contain recognizable CSS variables, font stacks, or Tailwind theme entries.",
      );
      return;
    }
    const inferred = (parsed as { inferredName?: string }).inferredName;
    const kit: BrandKit = {
      name: name.trim() || inferred || "Brand kit",
      source,
      vars: parsed.vars,
      fonts: parsed.fonts,
      importedAt: Date.now(),
    };
    onApply(kit);
    onClose();
  };

  const varCount = parsed ? Object.keys(parsed.vars).length : 0;
  const fontCount = parsed?.fonts.length ?? 0;

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
          width: 680,
          maxWidth: "94vw",
          maxHeight: "90vh",
          background: "var(--bg-raised)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px oklch(0 0 0 / 0.4)",
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
              Brand Kit
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-display)" }}>
              {current ? "Update brand kit" : "Import brand kit"}
            </div>
          </div>
          <button className="btn icon ghost" onClick={onClose} title="Close">×</button>
        </div>

        <div className="scroll" style={{ overflowY: "auto", padding: 20, minHeight: 280, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ fontSize: 12, color: "var(--ink-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
              Brand name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme brand"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  color: "var(--ink)",
                  fontSize: 13,
                  padding: "6px 10px",
                  outline: "none",
                }}
              />
            </label>

            <div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 6 }}>
                Source
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {(
                  [
                    { k: "css", label: "CSS vars", hint: ".css with :root {--foo: …}" },
                    { k: "tailwind", label: "Tailwind config", hint: "tailwind.config.js / .ts" },
                    { k: "forge", label: "Forge project", hint: ".forge JSON export" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.k}
                    onClick={() => setSource(opt.k)}
                    className={`btn sm ${source === opt.k ? "primary" : ""}`}
                    title={opt.hint}
                    style={{ flex: 1, justifyContent: "center" }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Content</div>
                <span style={{ flex: 1 }} />
                <button
                  className="btn sm ghost"
                  onClick={() => fileRef.current?.click()}
                  style={{ height: 22 }}
                >
                  ⬆ Upload file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".css,.js,.ts,.mjs,.cjs,.json,.forge"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFilePicked(f);
                    e.target.value = "";
                  }}
                  style={{ display: "none" }}
                />
              </div>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={
                  source === "css"
                    ? ":root {\n  --brand-primary: #6d28d9;\n  --brand-font-display: 'Geist', sans-serif;\n}"
                    : source === "tailwind"
                      ? "module.exports = {\n  theme: {\n    extend: {\n      colors: { primary: { 500: '#6d28d9' } },\n      fontFamily: { display: ['Geist', 'sans-serif'] }\n    }\n  }\n};"
                      : '{\n  "__forge": "project",\n  "project": { ... }\n}'
                }
                rows={10}
                spellCheck={false}
                style={{
                  width: "100%",
                  resize: "vertical",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  padding: 12,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  color: "var(--ink)",
                  marginTop: 6,
                  outline: "none",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "oklch(0.75 0.16 30)",
                  background: "oklch(0.2 0.05 30 / 0.2)",
                  border: "1px solid oklch(0.5 0.1 30 / 0.4)",
                  borderRadius: 6,
                  padding: "6px 10px",
                }}
              >
                {error}
              </div>
            )}

            {parsed && (varCount > 0 || fontCount > 0) && (
              <BrandKitPreview vars={parsed.vars} fonts={parsed.fonts} />
            )}
          </div>
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--line-soft)",
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "var(--bg-sunken)",
          }}
        >
          {current && (
            <button
              className="btn sm ghost"
              onClick={() => {
                onClear();
                onClose();
              }}
              style={{ color: "oklch(0.75 0.16 30)" }}
            >
              Remove current kit
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn sm" onClick={onClose}>Cancel</button>
          <button
            className="btn sm primary"
            onClick={apply}
            disabled={!parsed || (varCount === 0 && fontCount === 0)}
          >
            {current ? "Update brand kit" : "Apply brand kit"}
          </button>
        </div>
      </div>
    </div>
  );
}
