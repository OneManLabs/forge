"use client";

import type {
  BrandKit,
  DesignTweakControl,
  DesignTweaksPayload,
  TweakState,
} from "@/lib/types";

interface TweaksPanelProps {
  /** Kept for the tokensToOverlayCss pipeline — not rendered as controls
   *  anymore. Studio chrome (viewport, chat side, theme) lives in the TopBar. */
  state: TweakState;
  setState: (patch: Partial<TweakState>) => void;
  onSendToClaudeCode: () => void;
  onApplyToCanvas: () => void;
  hasCanvas: boolean;
  designTweaks: DesignTweaksPayload | null;
  designTweakValues: Record<string, string | number | boolean>;
  onDesignTweakChange: (id: string, value: string | number | boolean) => void;
  customAccentHex: string | null;
  onPickAccent: (hex: string | null) => void;
  brandKit: BrandKit | null;
  onOpenBrandKit: () => void;
  onClearBrandKit: () => void;
}

const Section = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line-soft)" }}>
    <div
      className="mono"
      style={{
        fontSize: 10,
        color: "var(--ink-faint)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: hint ? 4 : 10,
      }}
    >
      {label}
    </div>
    {hint && (
      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 10, lineHeight: 1.4 }}>
        {hint}
      </div>
    )}
    {children}
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 8,
    }}
  >
    <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{label}</span>
    <div style={{ display: "flex", gap: 4 }}>{children}</div>
  </div>
);

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--bg-sunken)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: 2,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            appearance: "none",
            border: "none",
            cursor: "pointer",
            padding: "3px 10px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            background: value === opt.value ? "var(--bg-panel)" : "transparent",
            color: value === opt.value ? "var(--ink)" : "var(--ink-faint)",
            borderRadius: 4,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Swatch({
  value,
  active,
  onClick,
  label,
}: {
  value: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        cursor: "pointer",
        border: active ? `2px solid var(--ink)` : "1px solid var(--line)",
        background: value,
        padding: 0,
        boxShadow: active ? "0 0 0 2px var(--bg)" : "none",
      }}
    />
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  unit = "",
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
  unit?: string;
}) {
  // Format: show 2 decimals for fractional values, otherwise int.
  const display =
    Number.isInteger(value) || (step ?? 1) >= 1
      ? String(Math.round(value))
      : value.toFixed(2);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: 140 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "var(--accent)" }}
      />
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--ink-muted)",
          minWidth: 40,
          textAlign: "right",
        }}
      >
        {display}
        {unit}
      </span>
    </div>
  );
}

function DesignControlRow({
  control,
  value,
  onChange,
}: {
  control: DesignTweakControl;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  const regen = control.applies === "regen";
  const badge = regen ? (
    <span
      className="mono"
      style={{
        fontSize: 9,
        padding: "1px 5px",
        marginLeft: 6,
        border: "1px solid var(--line)",
        borderRadius: 3,
        color: "var(--ink-faint)",
        letterSpacing: "0.06em",
      }}
      title="Changing this fires a regeneration turn"
    >
      REGEN
    </span>
  ) : null;

  const labelEl = (
    <span style={{ fontSize: 12, color: "var(--ink-muted)", display: "inline-flex", alignItems: "center" }}>
      {control.label}
      {badge}
    </span>
  );

  const rowWrap = (child: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 8,
      }}
    >
      {labelEl}
      <div style={{ display: "flex", gap: 4 }}>{child}</div>
    </div>
  );

  if (control.kind === "select" && control.options) {
    const current = String(value ?? control.default ?? "");
    return rowWrap(
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          color: "var(--ink)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          padding: "4px 8px",
          borderRadius: 4,
          maxWidth: 160,
        }}
      >
        {control.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>,
    );
  }
  if (control.kind === "toggle") {
    const current = Boolean(value ?? control.default ?? false);
    return rowWrap(
      <Toggle<"on" | "off">
        options={[
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ]}
        value={current ? "on" : "off"}
        onChange={(v) => onChange(v === "on")}
      />,
    );
  }
  if (control.kind === "slider") {
    const current = Number(value ?? control.default ?? 0);
    const min = typeof control.min === "number" ? control.min : 0;
    const max = typeof control.max === "number" ? control.max : 100;
    return rowWrap(
      <Slider
        value={current}
        min={min}
        max={max}
        step={control.step}
        onChange={onChange}
        unit={control.unit ?? ""}
      />,
    );
  }
  return null;
}

export function TweaksPanel({
  onSendToClaudeCode,
  onApplyToCanvas,
  hasCanvas,
  designTweaks,
  designTweakValues,
  onDesignTweakChange,
  customAccentHex,
  onPickAccent,
  brandKit,
  onOpenBrandKit,
  onClearBrandKit,
}: TweaksPanelProps) {
  const palette = designTweaks?.palette ?? [];
  const designControls = designTweaks?.controls ?? [];
  const hasAnyKnobs = palette.length > 0 || designControls.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      <div
        style={{
          height: "var(--h-bar, 48px)",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.01em" }}>Knobs</div>
        <span className="chip">
          <span className="dot" />
          {hasAnyKnobs ? "Live" : "Waiting"}
        </span>
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: "auto" }}>
        {/* Empty state — no design yet, or a design that didn't emit <tweaks>. */}
        {!hasAnyKnobs && (
          <div style={{ padding: "28px 18px", textAlign: "center" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--bg-sunken)",
                border: "1px dashed var(--line)",
                margin: "0 auto 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-faint)",
                fontSize: 16,
              }}
            >
              ◐
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              No knobs yet
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.5 }}>
              Knobs are generated by the Code agent per design — padding, radius,
              type scale, shadow intensity, etc. Generate a design in the chat
              and the controls relevant to that design will appear here.
            </div>
          </div>
        )}

        {/* This design's palette — swatch row. Clicking a swatch picks it as
            the active accent (overrides via customAccentHex). */}
        {palette.length > 0 && (
          <Section
            label="Palette"
            hint="Click a swatch to set it as the active accent. Palette is defined by the design; brand-kit projects show brand colors."
          >
            <Row label="Accent">
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {palette.map((p) => (
                  <Swatch
                    key={`${p.name}-${p.value}`}
                    value={p.value}
                    label={p.name}
                    active={customAccentHex === p.value}
                    onClick={() => onPickAccent(p.value)}
                  />
                ))}
              </div>
            </Row>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                lineHeight: 1.4,
                fontFamily: "var(--font-mono)",
              }}
            >
              {palette.map((p) => p.name).join(" · ")}
            </div>
          </Section>
        )}

        {/* Dynamic controls from the Code agent's <tweaks> block. This is
            the whole point — each knob here is context-specific to the
            active design. */}
        {designControls.length > 0 && (
          <Section
            label="Design controls"
            hint="Dragging updates the canvas live. No regeneration unless a knob is marked REGEN."
          >
            {designControls.map((c) => (
              <DesignControlRow
                key={c.id}
                control={c}
                value={designTweakValues[c.id]}
                onChange={(v) => onDesignTweakChange(c.id, v)}
              />
            ))}
          </Section>
        )}

        {/* Apply & Regenerate — force a regen with the current knob values
            baked in. Useful after touching a REGEN knob, or to commit the
            live-overridden state into fresh source. */}
        <Section label="Apply">
          <button
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={onApplyToCanvas}
            disabled={!hasCanvas}
            title={
              hasCanvas
                ? "Regenerate the current design with the active knob values baked in"
                : "Generate a design first"
            }
          >
            ↻ Apply &amp; Regenerate
          </button>
        </Section>

        <Section label="Brand Kit">
          {brandKit ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  border: "1px solid var(--accent-line)",
                  background: "var(--accent-soft)",
                  borderRadius: 6,
                }}
              >
                <span
                  style={{ width: 6, height: 6, borderRadius: 50, background: "var(--accent)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {brandKit.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ink-faint)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {Object.keys(brandKit.vars).length} vars · {brandKit.fonts.length} font
                    {brandKit.fonts.length === 1 ? "" : "s"} · {brandKit.source}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn sm"
                  onClick={onOpenBrandKit}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Update
                </button>
                <button
                  className="btn sm ghost"
                  onClick={onClearBrandKit}
                  style={{ flex: 1, justifyContent: "center", color: "oklch(0.75 0.16 30)" }}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-muted)",
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                Import your brand's CSS vars, Tailwind config, or a prior
                .forge project and Forge will use those tokens as a hard
                constraint for every new design.
              </div>
              <button
                className="btn"
                onClick={onOpenBrandKit}
                style={{ width: "100%", justifyContent: "center" }}
              >
                ＋ Import Brand Kit
              </button>
            </>
          )}
        </Section>

        <div style={{ padding: 16 }}>
          <button
            className="btn primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={onSendToClaudeCode}
          >
            Send to Claude Code →
          </button>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              marginTop: 8,
              textAlign: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            Bundles CORE.html + tokens + prompt
          </div>
        </div>
      </div>
    </div>
  );
}
