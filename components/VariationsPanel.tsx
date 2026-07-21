"use client";

import { useMemo, useState } from "react";
import { assembleForPreview } from "@/lib/iframe";
import type { VariationOption, VariationsPayload } from "@/lib/types";

interface VariationsPanelProps {
  payload: VariationsPayload;
  onPick: (option: VariationOption) => void;
  onRequestMore: () => void;
  onExport: (option: VariationOption) => void;
}

function VariationCard({
  option,
  index,
  total,
  active,
  onPreview,
  onPick,
  onExport,
}: {
  option: VariationOption;
  index: number;
  total: number;
  active: boolean;
  onPreview: () => void;
  onPick: () => void;
  onExport: () => void;
}) {
  const srcDoc = useMemo(() => assembleForPreview(option.files) ?? "", [option.files]);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-raised)",
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: active ? "0 0 0 2px var(--accent-soft)" : "0 4px 14px oklch(0 0 0 / 0.18)",
        transition: "border-color 120ms, box-shadow 120ms",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              padding: "2px 6px",
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              borderRadius: 4,
              color: "var(--ink-muted)",
              letterSpacing: "0.06em",
            }}
          >
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={option.name}
          >
            {option.name}
          </span>
        </div>
        <button className="btn sm" onClick={onPreview} title="Preview at full size">
          ⤢
        </button>
      </div>

      {option.summary && (
        <div
          style={{
            padding: "8px 14px",
            fontSize: 12,
            color: "var(--ink-muted)",
            background: "var(--bg-sunken)",
            borderBottom: "1px solid var(--line-soft)",
            lineHeight: 1.4,
          }}
        >
          {option.summary}
        </div>
      )}

      <div
        style={{
          position: "relative",
          background: "#fff",
          height: 280,
          overflow: "hidden",
        }}
      >
        <iframe
          srcDoc={srcDoc}
          title={option.name}
          sandbox="allow-scripts"
          style={{
            position: "absolute",
            inset: 0,
            width: 1280,
            height: 800,
            border: "none",
            transform: "scale(0.34)",
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          padding: 12,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "flex-end",
          background: "var(--bg-sunken)",
        }}
      >
        <button
          className="btn sm"
          onClick={onExport}
          title="Download this variation as a standalone zip"
        >
          ⬇ Export
        </button>
        <button className="btn sm primary" onClick={onPick}>
          Pick this →
        </button>
      </div>
    </div>
  );
}

function FullPreview({ option, onClose }: { option: VariationOption; onClose: () => void }) {
  const srcDoc = useMemo(() => assembleForPreview(option.files) ?? "", [option.files]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.7)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1280px, 92vw)",
          height: "min(820px, 90vh)",
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px oklch(0 0 0 / 0.5)",
        }}
      >
        <div
          style={{
            height: 38,
            background: "var(--bg-panel)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{option.name}</div>
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={onClose}>
            Close
          </button>
        </div>
        <iframe
          srcDoc={srcDoc}
          title={option.name}
          sandbox="allow-scripts allow-forms"
          style={{ flex: 1, border: "none", background: "#fff" }}
        />
      </div>
    </div>
  );
}

export function VariationsPanel({ payload, onPick, onRequestMore, onExport }: VariationsPanelProps) {
  const [previewing, setPreviewing] = useState<VariationOption | null>(null);
  const cols = payload.options.length <= 2 ? 2 : payload.options.length === 3 ? 3 : 2;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: "0 8px",
      }}
    >
      <div style={{ padding: "16px 12px 14px" }}>
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
          {payload.options.length} variation{payload.options.length === 1 ? "" : "s"} — pick one to go deep on
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          {payload.intro || "Which direction should I commit to?"}
        </div>
      </div>

      <div
        className="scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0 12px 16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: 14,
          }}
        >
          {payload.options.map((opt, i) => (
            <VariationCard
              key={opt.id}
              option={opt}
              index={i}
              total={payload.options.length}
              active={previewing?.id === opt.id}
              onPreview={() => setPreviewing(opt)}
              onPick={() => onPick(opt)}
              onExport={() => onExport(opt)}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <button className="btn sm" onClick={onRequestMore} title="Ask Claude for more options">
            ↻ Show me different ones
          </button>
        </div>
      </div>

      {previewing && <FullPreview option={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
