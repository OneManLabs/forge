import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, PROMPT_TEXT } from "../constants";
import { clampedInterpolate } from "../helpers";

export type ChatPhase =
  | "variations"   // agent is mid-stream, "Writing variations"
  | "pick"         // agent just finished variations, user picked one
  | "tweaks"       // post-convert, idle
  | "comment"      // user is composing a pinned comment
  | "text-edit";   // user is inline-editing text on the canvas

interface ChatSidebarProps {
  phase: ChatPhase;
  /** Optional pin context for comment phase. */
  pin?: {
    number: number;
    component: string;        // "SpecimenCard"
    file: string;             // "components/SpecimenCard.jsx"
    snippet: string;          // inner text snippet
    /** Typed portion of the comment so far. */
    comment: string;
    /** Whether the "typing" caret should flash on the textarea. */
    typing?: boolean;
  };
  /** Animation: slide the pin chip in over this many frames starting at sceneFrame. */
  pinEntryStart?: number;
  pinEntryDuration?: number;
  /** Optional "applied" success chip at the top of the scroll area. */
  successBubble?: string;
  /** Progress hint shown in the phase badge. */
  progressText?: string;
}

/**
 * The left ~340px chat sidebar that sits between the project rail and
 * the canvas. Renders conversation history + a contextual input area
 * depending on the current video phase.
 */
export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  phase,
  pin,
  pinEntryStart = 0,
  pinEntryDuration = 30,
  successBubble,
  progressText,
}) => {
  const frame = useCurrentFrame();
  const pinEntry = clampedInterpolate(
    frame,
    [pinEntryStart, pinEntryStart + pinEntryDuration],
    [0, 1],
  );

  const turnCount = phase === "variations" ? 1 : phase === "pick" ? 1 : 2;
  const isGenerating =
    phase === "variations" || phase === "pick" || phase === "comment" || phase === "text-edit";

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: COLORS.bg,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${COLORS.lineSoft}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 3,
            border: `1px solid ${isGenerating ? "rgba(193, 236, 58, 0.5)" : COLORS.line}`,
            color: isGenerating ? COLORS.accent : COLORS.inkMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isGenerating ? COLORS.accent : COLORS.inkFaint,
              boxShadow: isGenerating ? `0 0 8px ${COLORS.accent}` : undefined,
            }}
          />
          {isGenerating ? "Generating" : "Live"}
        </span>
        <span
          style={{
            fontSize: 10,
            color: COLORS.inkFaint,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {turnCount} turn{turnCount === 1 ? "" : "s"}
        </span>
      </div>

      {/* Scroll area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "14px 14px 6px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 0,
        }}
      >
        {/* User bubble — the original RockStack prompt (truncated). */}
        <UserBubble text={PROMPT_TEXT} />

        {/* Assistant reply — progress-dependent content. */}
        {phase === "variations" && (
          <AssistantProgressBubble label="Writing 4 directions" progressText={progressText ?? "Designing"} />
        )}
        {phase === "pick" && (
          <AssistantBubble>
            <div style={{ fontSize: 13, color: COLORS.ink, fontWeight: 500, marginBottom: 6 }}>
              Here are 4 directions.
            </div>
            <div style={{ fontSize: 12, color: COLORS.inkMuted, lineHeight: 1.45 }}>
              Gallery Noir leans museum-dark with a single gold thread; the others
              push the tone harder. Pick one and I'll convert it into the
              full project.
            </div>
          </AssistantBubble>
        )}
        {(phase === "tweaks" || phase === "comment" || phase === "text-edit") && (
          <AssistantBubble>
            <div style={{ fontSize: 13, color: COLORS.ink, fontWeight: 500, marginBottom: 6 }}>
              Locked in Gallery Noir.
            </div>
            <div style={{ fontSize: 12, color: COLORS.inkMuted, lineHeight: 1.45 }}>
              Converted to 6 files: CORE.html · tokens.css · data.js ·
              components/App.jsx · Hero.jsx · SpecimenCard.jsx.
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                color: COLORS.inkFaint,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ↻ Palette · type · radius · spacing · shadow all live-editable.
            </div>
          </AssistantBubble>
        )}

        {/* Success bubble — overlaid on-screen briefly after comment/text edits. */}
        {successBubble && <SuccessBubble text={successBubble} />}
      </div>

      {/* Input area — context-switches between plain composer and pinned comment */}
      <div
        style={{
          padding: 12,
          borderTop: `1px solid ${COLORS.lineSoft}`,
          flexShrink: 0,
        }}
      >
        {pin && (
          <PinComposer
            pin={pin}
            entryProgress={pinEntry}
          />
        )}
        <PlainComposer placeholder={getPlaceholder(phase)} disabled={Boolean(pin)} />
      </div>
    </div>
  );
};

function getPlaceholder(phase: ChatPhase): string {
  switch (phase) {
    case "variations":
      return "Send another — it'll queue…";
    case "pick":
      return "Describe a change or new screen…";
    case "tweaks":
      return "Describe a change or new screen…";
    case "comment":
      return "Or type here — pin still applies";
    case "text-edit":
      return "Esc cancels · Enter commits the text edit";
  }
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ alignSelf: "flex-end", maxWidth: "88%" }}>
      <div
        style={{
          background: COLORS.bgRaised,
          border: `1px solid ${COLORS.line}`,
          padding: "10px 12px",
          borderRadius: 10,
          fontSize: 12.5,
          color: COLORS.ink,
          lineHeight: 1.45,
        }}
      >
        {text}
      </div>
      <div
        style={{
          fontSize: 9,
          color: COLORS.inkFaint,
          fontFamily: "'JetBrains Mono', monospace",
          textAlign: "right",
          marginTop: 4,
          letterSpacing: "0.06em",
        }}
      >
        you · just now
      </div>
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: "92%" }}>
      <div
        style={{
          padding: "10px 12px",
          border: `1px solid ${COLORS.lineSoft}`,
          borderRadius: 10,
          background: "rgba(193, 236, 58, 0.04)",
        }}
      >
        {children}
      </div>
      <div
        style={{
          fontSize: 9,
          color: COLORS.inkFaint,
          fontFamily: "'JetBrains Mono', monospace",
          marginTop: 4,
          letterSpacing: "0.06em",
        }}
      >
        Forge · just now
      </div>
    </div>
  );
}

function AssistantProgressBubble({ label, progressText }: { label: string; progressText: string }) {
  const frame = useCurrentFrame();
  const pulse = 0.6 + 0.4 * Math.abs(Math.sin(frame * 0.12));
  return (
    <div style={{ maxWidth: "92%" }}>
      <div
        style={{
          padding: "10px 12px",
          border: `1px solid ${COLORS.lineSoft}`,
          borderRadius: 10,
          background: "rgba(193, 236, 58, 0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: COLORS.accent,
            boxShadow: `0 0 10px ${COLORS.accent}`,
            opacity: pulse,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: COLORS.ink, fontWeight: 500 }}>{label}…</div>
          <div style={{ fontSize: 10, color: COLORS.inkFaint, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            {progressText}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        alignSelf: "center",
        padding: "6px 12px",
        background: "rgba(193, 236, 58, 0.15)",
        border: `1px solid rgba(193, 236, 58, 0.45)`,
        borderRadius: 999,
        fontSize: 11,
        color: COLORS.accent,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.04em",
      }}
    >
      ✓ {text}
    </div>
  );
}

function PinComposer({
  pin,
  entryProgress,
}: {
  pin: NonNullable<ChatSidebarProps["pin"]>;
  entryProgress: number;
}) {
  const frame = useCurrentFrame();
  const caretOn = pin.typing ? Math.sin(frame * 0.4) > -0.2 : false;
  return (
    <div
      style={{
        marginBottom: 8,
        padding: 10,
        background: "rgba(193, 236, 58, 0.08)",
        border: `1px solid rgba(193, 236, 58, 0.45)`,
        borderRadius: 10,
        opacity: entryProgress,
        transform: `translateY(${(1 - entryProgress) * 8}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: COLORS.accent, fontSize: 12 }}>◉</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.ink, display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: COLORS.accent }}>Pin #{pin.number}</span>
            <span>{pin.component}</span>
            <span style={{ color: COLORS.inkFaint, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
              · {pin.file}
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: COLORS.inkMuted,
              marginTop: 3,
              fontStyle: "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            “{pin.snippet}”
          </div>
        </div>
      </div>
      <div
        style={{
          background: COLORS.bg,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 6,
          padding: "6px 8px",
          minHeight: 52,
          fontSize: 12,
          color: COLORS.ink,
          lineHeight: 1.4,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {pin.comment}
        {pin.typing && (
          <span style={{ opacity: caretOn ? 1 : 0, color: COLORS.ink, marginLeft: 1 }}>▊</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
        <Btn ghost>+ Add to batch</Btn>
        <Btn primary active={pin.comment.length > 0}>
          Send pin →
        </Btn>
      </div>
    </div>
  );
}

function PlainComposer({ placeholder, disabled }: { placeholder: string; disabled: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${COLORS.line}`,
        borderRadius: 8,
        padding: 10,
        background: COLORS.bgRaised,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: COLORS.inkFaint,
          minHeight: 32,
          lineHeight: 1.4,
        }}
      >
        {placeholder}
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
        <span style={{ fontSize: 9, color: COLORS.inkFaint, fontFamily: "'JetBrains Mono', monospace" }}>
          ⌘↵ to send
        </span>
        <div style={{ flex: 1 }} />
        <Btn primary={!disabled} disabled={disabled}>
          Forge ↵
        </Btn>
      </div>
    </div>
  );
}

function Btn({
  children,
  primary,
  ghost,
  active,
  disabled,
}: {
  children: React.ReactNode;
  primary?: boolean;
  ghost?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  const bg = primary ? COLORS.accent : "transparent";
  const color = primary ? COLORS.accentInk : ghost ? COLORS.inkMuted : COLORS.ink;
  return (
    <span
      style={{
        fontSize: 11,
        padding: "4px 10px",
        borderRadius: 5,
        border: primary ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
        background: bg,
        color,
        fontWeight: primary ? 600 : 500,
        letterSpacing: "0.02em",
        opacity: disabled ? 0.6 : active === false ? 0.7 : 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </span>
  );
}
