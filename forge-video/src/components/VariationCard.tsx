import React from "react";
import { COLORS, PRODUCT_NAMES, VARIATIONS } from "../constants";

interface VariationCardProps {
  index: number; // 0-3
  highlight?: boolean;
}

/**
 * A premium-dark variation preview card. The outer shell (header,
 * summary, footer) is consistent across all four; only the inner
 * mini-preview changes — each index has its own layout, typography,
 * and composition, not just a recolor.
 */
export const VariationCard: React.FC<VariationCardProps> = ({ index, highlight }) => {
  const v = VARIATIONS[index];
  return (
    <div
      style={{
        background: COLORS.bgRaised,
        border: `1px solid ${highlight ? "rgba(193, 236, 58, 0.55)" : COLORS.line}`,
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: highlight
          ? "0 0 0 4px rgba(193, 236, 58, 0.12), 0 20px 60px rgba(0,0,0,0.55)"
          : "0 10px 36px rgba(0,0,0,0.4)",
        transition: "box-shadow 0.2s ease",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: `1px solid ${COLORS.lineSoft}`,
        }}
      >
        <span
          style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 3,
            border: `1px solid ${COLORS.line}`,
            fontFamily: "'JetBrains Mono', monospace",
            color: COLORS.inkMuted,
            letterSpacing: "0.08em",
          }}
        >
          0{index + 1} / 04
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{v.name}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: COLORS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>
          ⤢
        </span>
      </div>
      <div
        style={{
          padding: "10px 16px",
          fontSize: 12,
          color: COLORS.inkMuted,
          background: COLORS.bgSunken,
          borderBottom: `1px solid ${COLORS.lineSoft}`,
          lineHeight: 1.4,
        }}
      >
        {v.summary}
      </div>
      <div
        style={{
          flex: 1,
          position: "relative",
          background: v.palette.bg,
          overflow: "hidden",
          minHeight: 320,
        }}
      >
        {index === 0 && <GalleryNoirPreview palette={v.palette} />}
        {index === 1 && <WarmBazaarPreview palette={v.palette} />}
        {index === 2 && <ColdStoragePreview palette={v.palette} />}
        {index === 3 && <BrutalistQuarryPreview palette={v.palette} />}
      </div>
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${COLORS.lineSoft}`,
          background: COLORS.bgSunken,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <div
          style={{
            padding: "4px 10px",
            border: `1px solid ${COLORS.line}`,
            borderRadius: 4,
            fontSize: 11,
            color: COLORS.inkMuted,
          }}
        >
          ⬇ Export
        </div>
        <div
          style={{
            padding: "4px 12px",
            background: COLORS.accent,
            color: COLORS.accentInk,
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Pick this →
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * Variation 0 — GALLERY NOIR
 * Museum-dark, editorial, centered everything, italic serif,
 * a single thin gold rule, whisper-quiet spacing.
 * ============================================================ */
function GalleryNoirPreview({ palette }: { palette: { bg: string; ink: string; accent: string } }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "22px 18px",
        color: palette.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        background: palette.bg,
      }}
    >
      <div
        style={{
          fontSize: 7,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          fontFamily: "'JetBrains Mono', monospace",
          color: palette.accent,
          marginBottom: 14,
        }}
      >
        ◇ ROCKSTACK · EST. 2026
      </div>
      <div
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: 30,
          lineHeight: 1.0,
          letterSpacing: "-0.03em",
          fontStyle: "italic",
          fontWeight: 400,
          marginBottom: 14,
        }}
      >
        A stone for
        <br />
        <span style={{ fontStyle: "normal", fontWeight: 300 }}>every quiet</span>
        <br />
        <span style={{ color: palette.accent, fontStyle: "italic" }}>desk.</span>
      </div>
      <div
        style={{
          width: "34%",
          height: 1,
          background: palette.accent,
          opacity: 0.7,
          marginBottom: 18,
        }}
      />
      <div style={{ display: "flex", gap: 18, marginTop: "auto", marginBottom: 4 }}>
        {PRODUCT_NAMES.slice(0, 2).map((name, i) => (
          <div key={name} style={{ textAlign: "center", width: 74 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                margin: "0 auto 6px",
                background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.24), rgba(0,0,0,0.55) 75%)`,
                boxShadow: "inset 0 0 14px rgba(0,0,0,0.5)",
              }}
            />
            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 9, lineHeight: 1.15 }}>
              {name}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: palette.accent,
                marginTop: 2,
                letterSpacing: "0.08em",
              }}
            >
              {["$240", "$180"][i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * Variation 1 — WARM BAZAAR
 * Asymmetric, terracotta palette, left-aligned columns. A boutique
 * catalog — hero on the left, 3 products with tabular prices on the right.
 * ============================================================ */
function WarmBazaarPreview({ palette }: { palette: { bg: string; ink: string; accent: string } }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "20px 22px",
        color: palette.ink,
        background: palette.bg,
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: 16,
        alignItems: "stretch",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 7,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
            color: palette.accent,
            marginBottom: 10,
          }}
        >
          ROCKSTACK · #02
        </div>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 26,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            fontWeight: 400,
          }}
        >
          Hand-sourced
          <br />
          stones from
          <br />
          <span style={{ color: palette.accent, fontStyle: "italic" }}>the riverbed.</span>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontSize: 8,
            color: palette.ink,
            opacity: 0.6,
            fontFamily: "'Fraunces', serif",
            fontStyle: "italic",
            lineHeight: 1.35,
          }}
        >
          A modest stone for the modest desk. Free velvet pouch.
        </div>
        <div
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignSelf: "flex-start",
            padding: "5px 10px",
            background: palette.accent,
            color: palette.bg,
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "'Inter', sans-serif",
            borderRadius: 2,
          }}
        >
          Browse Collection →
        </div>
      </div>
      <div
        style={{
          borderLeft: `1px solid ${palette.accent}33`,
          paddingLeft: 14,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {PRODUCT_NAMES.slice(0, 4).map((name, i) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: i < 3 ? `1px dashed ${palette.ink}18` : "none",
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: `radial-gradient(circle at 38% 32%, rgba(255,255,255,0.22), rgba(0,0,0,0.45) 80%)`,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontSize: 9,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: palette.accent,
                letterSpacing: "0.04em",
              }}
            >
              {["$240", "$180", "$120", "$320"][i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * Variation 2 — COLD STORAGE
 * Mono-first, grayscale + cyan readout, spec-sheet aesthetic.
 * No hero image — just data rows.
 * ============================================================ */
function ColdStoragePreview({ palette }: { palette: { bg: string; ink: string; accent: string } }) {
  const specs = [
    { k: "SPECIMEN", v: "MK-0421", hl: false },
    { k: "WEIGHT", v: "420g", hl: false },
    { k: "DENSITY", v: "2.68 g/cm³", hl: false },
    { k: "TEMP", v: "4.2°C", hl: true },
    { k: "ORIGIN", v: "RIVER BED 07", hl: false },
    { k: "CALM", v: "LIFETIME", hl: true },
  ];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "18px 18px",
        color: palette.ink,
        background: palette.bg,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div
        style={{
          fontSize: 7,
          letterSpacing: "0.3em",
          color: palette.accent,
          marginBottom: 4,
        }}
      >
        $ ROCKSTACK / COLD STORAGE
      </div>
      <div
        style={{
          fontSize: 16,
          letterSpacing: "-0.01em",
          marginBottom: 2,
          fontWeight: 500,
        }}
      >
        SPECIMEN REPORT
      </div>
      <div
        style={{
          fontSize: 8,
          color: palette.ink,
          opacity: 0.55,
          marginBottom: 12,
        }}
      >
        _last_calibrated: 2026-04-21T09:32Z
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
        {specs.map((s) => (
          <div
            key={s.k}
            style={{
              display: "grid",
              gridTemplateColumns: "64px 1fr",
              gap: 6,
              fontSize: 9,
              padding: "3px 6px",
              background: s.hl ? `${palette.accent}10` : "transparent",
              borderLeft: s.hl ? `2px solid ${palette.accent}` : `2px solid transparent`,
            }}
          >
            <span style={{ opacity: 0.5 }}>{s.k}</span>
            <span
              style={{
                color: s.hl ? palette.accent : palette.ink,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.v}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: "auto",
          padding: "6px 10px",
          border: `1px solid ${palette.accent}66`,
          fontSize: 8,
          color: palette.accent,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          letterSpacing: "0.12em",
        }}
      >
        ▶ RUN DIAGNOSTIC
      </div>
    </div>
  );
}

/* ============================================================
 * Variation 3 — BRUTALIST QUARRY
 * Concrete cream, all-caps, oversized numerals. The CTA yells.
 * Stacked product list with heavy type.
 * ============================================================ */
function BrutalistQuarryPreview({ palette }: { palette: { bg: string; ink: string; accent: string } }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "16px 18px",
        color: palette.ink,
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 7,
          letterSpacing: "0.3em",
          fontFamily: "'JetBrains Mono', monospace",
          color: palette.ink,
          opacity: 0.5,
          marginBottom: 4,
        }}
      >
        ROCKSTACK — HEAVY GOODS
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 0.88,
          letterSpacing: "-0.03em",
          textTransform: "uppercase",
          fontStretch: "condensed",
        }}
      >
        BUY
        <br />
        <span style={{ color: palette.accent }}>STONES.</span>
      </div>
      <div
        style={{
          fontSize: 8,
          color: palette.ink,
          opacity: 0.55,
          marginTop: 6,
          marginBottom: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        No ceremony. No pretense. One stone, then another.
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderTop: `2px solid ${palette.ink}`,
        }}
      >
        {PRODUCT_NAMES.slice(0, 3).map((name, i) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "baseline",
              padding: "5px 0",
              borderBottom: `1px solid ${palette.ink}30`,
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                width: 18,
                color: palette.accent,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              0{i + 1}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: palette.accent,
                letterSpacing: "-0.02em",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {["$240", "$180", "$120"][i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
