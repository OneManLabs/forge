import React from "react";
import { COLORS, PRODUCT_NAMES } from "../constants";

interface RockStackPageProps {
  /** Active accent color (Knobs panel cycles through a few in TweaksScene). */
  accent?: string;
  /** Base card padding in px. */
  cardPadding?: number;
  /** Override for the primary CTA label (TweaksScene does an inline edit). */
  ctaLabel?: string;
  /** Scale factor when used as a variation thumbnail. */
  compact?: boolean;
  /** Multiplier on display type size (0.85-1.25). */
  typeScale?: number;
  /** 0..1 multiplier on specimen-card inset shadow depth. */
  shadowIntensity?: number;
  /** 0..1 multiplier on grain overlay opacity. */
  grainIntensity?: number;
  /** When true, render the CTA with a cyan "editing" outline. */
  ctaEditing?: boolean;
  /** When true, render the CTA's old label with a cyan "selected" highlight. */
  ctaSelected?: boolean;
  /** Extra scale + lime glow on a specific product (comment target). */
  flashCardIndex?: number;
  flashOpacity?: number;
  /** Per-card price glow override — the visible effect of the comment edit. */
  priceGlowCardIndex?: number;
  /** 0..1 intensity of the price glow (animates in after a comment lands). */
  priceGlowIntensity?: number;
}

/**
 * Full-bleed landing page that matches the Gallery Noir variation's
 * composition at page-scale. Centered editorial — not marketing-site
 * left-aligned — with the same italic serif hero, a thin gold rule,
 * a minimal mono CTA, and museum-specimen product cards below. This
 * is the page the user "picks" when they click card 1; the rest of
 * the video (Tweaks + FinalReveal) should feel like a direct blow-up
 * of that variation.
 */
export const RockStackPage: React.FC<RockStackPageProps> = ({
  accent = COLORS.rockAccent,
  cardPadding = 28,
  ctaLabel = "Claim your stone",
  compact,
  typeScale = 1,
  shadowIntensity = 0.55,
  grainIntensity = 0.6,
  ctaEditing = false,
  ctaSelected = false,
  flashCardIndex,
  flashOpacity = 0,
  priceGlowCardIndex,
  priceGlowIntensity = 0,
}) => {
  const ink = "#ede7d7";
  const inkMuted = "#8e8879";
  const line = "rgba(237, 231, 215, 0.08)";
  const lineStrong = "rgba(237, 231, 215, 0.18)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COLORS.rockBg,
        color: ink,
        fontFamily: "'Fraunces', 'Times New Roman', serif",
        overflow: "hidden",
      }}
    >
      {/* Grain overlay — tiny CSS dots */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
          pointerEvents: "none",
          mixBlendMode: "overlay",
          opacity: grainIntensity,
        }}
      />
      {/* Warm centered vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 42%, ${accent}14, transparent 55%)`,
          pointerEvents: "none",
        }}
      />

      {/* Centered nav */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: compact ? "18px 32px" : "32px 64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${line}`,
          fontFamily: "'JetBrains Mono', monospace",
          color: inkMuted,
          fontSize: compact ? 10 : 12,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: ink, fontWeight: 600, flex: 1 }}>◇ ROCKSTACK</span>
        <div style={{ display: "flex", gap: compact ? 22 : 40, alignItems: "center" }}>
          <span>Collection</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>Provenance</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>Concierge</span>
        </div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <span style={{ color: accent }}>Vault</span>
        </div>
      </div>

      {/* Centered hero */}
      <div
        style={{
          position: "absolute",
          top: compact ? 82 : 128,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: compact ? "0 24px" : "0 64px",
        }}
      >
        <div
          style={{
            fontSize: compact ? 9 : 11,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
            color: accent,
            marginBottom: compact ? 12 : 18,
          }}
        >
          Artisanal stones · Est. 2026
        </div>
        <h1
          style={{
            fontSize: (compact ? 50 : 92) * typeScale,
            lineHeight: 0.98,
            margin: 0,
            letterSpacing: "-0.035em",
            fontWeight: 400,
            fontStyle: "italic",
            color: ink,
          }}
        >
          A stone for
          <br />
          <span style={{ fontStyle: "normal", fontWeight: 300 }}>every quiet</span>
          <br />
          <span style={{ color: accent, fontStyle: "italic" }}>desk.</span>
        </h1>

        {/* Thin gold rule — the visual gesture from the variation */}
        <div
          style={{
            width: compact ? 80 : 160,
            height: 1,
            background: accent,
            opacity: 0.85,
            marginTop: compact ? 24 : 36,
            marginBottom: compact ? 16 : 20,
          }}
        />

        {/* CTA — minimal mono link, not a button. In text-edit mode the
            link wears a cyan dashed outline to signal "this is editable".
            ctaSelected additionally paints the label with a cyan
            "selection" background (like the real browser selection
            highlight when you click inside text). */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: compact ? 10 : 14,
            color: accent,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: compact ? 6 : 12,
            padding: ctaEditing ? "6px 14px" : "0 0 4px 0",
            borderBottom: ctaEditing ? "none" : `1px solid ${accent}`,
            outline: ctaEditing ? `2px dashed #7dd3fc` : "none",
            outlineOffset: ctaEditing ? 6 : 0,
            background: ctaSelected
              ? "rgba(125, 211, 252, 0.35)"
              : ctaEditing
                ? "rgba(125, 211, 252, 0.06)"
                : "transparent",
          }}
        >
          {ctaLabel}
          <span>→</span>
        </div>

        {!compact && (
          <div
            style={{
              marginTop: 14,
              fontSize: 10,
              color: inkMuted,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Free velvet pouch · Handwritten note · Lifetime calm
          </div>
        )}
      </div>

      {/* "The Collection" label — sits just above the specimen row */}
      {!compact && (
        <div
          style={{
            position: "absolute",
            bottom: 352,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 10,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
            color: inkMuted,
          }}
        >
          — The Collection —
        </div>
      )}

      {/* Museum-specimen product row */}
      <div
        style={{
          position: "absolute",
          bottom: compact ? 30 : 70,
          left: compact ? 32 : 120,
          right: compact ? 32 : 120,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: compact ? 10 : 40,
        }}
      >
        {PRODUCT_NAMES.map((name, i) => (
          <SpecimenCard
            key={name}
            name={name}
            price={["$240", "$180", "$120", "$320"][i]}
            tier={["I", "II", "I", "III"][i]}
            location={["Desk", "Nightstand", "Pocket", "Signature"][i]}
            accent={accent}
            line={lineStrong}
            ink={ink}
            inkMuted={inkMuted}
            padding={cardPadding}
            compact={!!compact}
            shadowIntensity={shadowIntensity}
            flashOpacity={flashCardIndex === i ? flashOpacity : 0}
            priceGlow={priceGlowCardIndex === i ? priceGlowIntensity : 0}
          />
        ))}
      </div>
    </div>
  );
};

function SpecimenCard({
  name,
  price,
  tier,
  location,
  accent,
  line,
  ink,
  inkMuted,
  padding,
  compact,
  shadowIntensity,
  flashOpacity,
  priceGlow,
}: {
  name: string;
  price: string;
  tier: string;
  location: string;
  accent: string;
  line: string;
  ink: string;
  inkMuted: string;
  padding: number;
  compact: boolean;
  shadowIntensity: number;
  flashOpacity: number;
  priceGlow: number;
}) {
  const shadowBlur = 50 * shadowIntensity + 10;
  const shadowAlpha = 0.35 + 0.5 * shadowIntensity;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: compact ? padding * 0.35 : padding,
        borderTop: `1px solid ${line}`,
        gap: compact ? 6 : 14,
        position: "relative",
        // Comment-mode flash — green ring around the whole card that fades.
        boxShadow:
          flashOpacity > 0
            ? `0 0 0 2px rgba(193, 236, 58, ${flashOpacity * 0.9}), 0 0 ${
                40 * flashOpacity
              }px rgba(193, 236, 58, ${flashOpacity * 0.5})`
            : undefined,
        transition: "box-shadow 0.3s ease",
      }}
    >
      {/* Circular stone silhouette — the museum-specimen look */}
      <div
        style={{
          width: compact ? 54 : 116,
          height: compact ? 54 : 116,
          borderRadius: "50%",
          background: `radial-gradient(circle at 42% 36%, rgba(255,255,255,0.26), ${accent}10 42%, rgba(0,0,0,0.55) 80%)`,
          boxShadow: `inset 0 0 ${shadowBlur}px rgba(0,0,0,${shadowAlpha})`,
        }}
      />
      <div
        style={{
          fontSize: compact ? 7 : 10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: inkMuted,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        Tier {tier} · {location}
      </div>
      <div
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: compact ? 12 : 18,
          color: ink,
          lineHeight: 1.15,
          fontStyle: "italic",
          fontWeight: 400,
          maxWidth: compact ? "100%" : 200,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: (compact ? 11 : 15) * (1 + priceGlow * 0.18),
          color: accent,
          letterSpacing: "0.12em",
          marginTop: compact ? 2 : 6,
          fontWeight: priceGlow > 0.3 ? 700 : 400,
          textShadow:
            priceGlow > 0
              ? `0 0 ${8 * priceGlow}px ${accent}, 0 0 ${20 * priceGlow}px ${accent}, 0 0 ${36 * priceGlow}px ${accent}`
              : "none",
          transition:
            "font-size 0.4s ease, font-weight 0.3s ease, text-shadow 0.4s ease",
        }}
      >
        {price}
      </div>
    </div>
  );
}
