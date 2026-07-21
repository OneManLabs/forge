"use client";

import { useMemo, useState } from "react";
import type { QuestionGroup, QuestionsPayload } from "@/lib/types";

interface QuestionsPanelProps {
  payload: QuestionsPayload;
  onSubmit: (formattedAnswer: string) => void;
  onSkip: () => void;
  isStreaming: boolean;
}

interface AnswerState {
  selected: Set<string>;
  other: string;
  // For slider questions:
  slider?: number;
  sliderTouched?: boolean;
}

const SKIP_VALUE = "__skip__";
const DECIDE_VALUE = "__decide__";

function emptyAnswer(): AnswerState {
  return { selected: new Set(), other: "" };
}

function defaultSliderValue(g: QuestionGroup): number {
  if (typeof g.default === "number") return g.default;
  const min = typeof g.min === "number" ? g.min : 0;
  const max = typeof g.max === "number" ? g.max : 10;
  return Math.round((min + max) / 2);
}

function isAnswered(group: QuestionGroup, ans: AnswerState): boolean {
  if (group.kind === "slider") return Boolean(ans.sliderTouched);
  if (ans.selected.size > 0) return true;
  return ans.other.trim().length > 0;
}

function describeAnswer(group: QuestionGroup, ans: AnswerState): string {
  if (group.kind === "slider") {
    const v = ans.slider ?? defaultSliderValue(group);
    return String(v);
  }
  const parts: string[] = [];
  for (const v of ans.selected) {
    if (v === SKIP_VALUE) parts.push("(skipped)");
    else if (v === DECIDE_VALUE) parts.push("decide for me");
    else parts.push(v);
  }
  if (ans.other.trim()) parts.push(ans.other.trim());
  return parts.join(", ");
}

function PillButton({
  active,
  onClick,
  variant = "default",
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  variant?: "default" | "soft";
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 13,
        lineHeight: 1.3,
        fontFamily: "var(--font-body)",
        textAlign: "left",
        transition: "background 100ms ease, border-color 100ms ease",
        background: active
          ? "var(--accent)"
          : variant === "soft"
            ? "var(--bg-sunken)"
            : "var(--bg-raised)",
        color: active ? "var(--accent-ink)" : "var(--ink)",
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        fontWeight: active ? 600 : 400,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

function GroupCard({
  group,
  answer,
  onChange,
  disabled,
}: {
  group: QuestionGroup;
  answer: AnswerState;
  onChange: (next: AnswerState) => void;
  disabled: boolean;
}) {
  const isSlider = group.kind === "slider";

  const toggle = (value: string) => {
    const next = new Set(answer.selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      if (!group.multi) next.clear();
      next.add(value);
    }
    onChange({ ...answer, selected: next });
  };

  const pickDecide = () => {
    onChange({ ...answer, selected: new Set<string>([DECIDE_VALUE]), other: "" });
  };
  const pickSkip = () => {
    onChange({ ...answer, selected: new Set<string>([SKIP_VALUE]), other: "" });
  };

  return (
    <div style={{ padding: "20px 0", borderBottom: "1px solid var(--line-soft)" }}>
      <div style={{ marginBottom: 4, fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>
        {group.title}
        {group.multi && !isSlider && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              padding: "2px 6px",
              background: "var(--bg-sunken)",
              borderRadius: 4,
              color: "var(--ink-faint)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              verticalAlign: "middle",
            }}
          >
            multi
          </span>
        )}
      </div>
      {group.description && (
        <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 12 }}>{group.description}</div>
      )}

      {isSlider ? (
        <SliderRow group={group} answer={answer} onChange={onChange} disabled={disabled} />
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {group.options.map((opt) => (
              <PillButton
                key={opt}
                active={answer.selected.has(opt)}
                onClick={() => toggle(opt)}
                disabled={disabled || answer.selected.has(SKIP_VALUE)}
              >
                {opt}
              </PillButton>
            ))}
            <PillButton
              active={answer.selected.has(DECIDE_VALUE)}
              onClick={pickDecide}
              variant="soft"
              disabled={disabled}
            >
              ✦ Decide for me
            </PillButton>
            <PillButton
              active={answer.selected.has(SKIP_VALUE)}
              onClick={pickSkip}
              variant="soft"
              disabled={disabled}
            >
              Skip
            </PillButton>
          </div>
          <input
            value={answer.other}
            onChange={(e) => onChange({ ...answer, other: e.target.value })}
            placeholder="Other… (free text)"
            disabled={disabled}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              color: "var(--ink)",
              outline: "none",
              fontFamily: "var(--font-body)",
            }}
          />
        </>
      )}
    </div>
  );
}

function SliderRow({
  group,
  answer,
  onChange,
  disabled,
}: {
  group: QuestionGroup;
  answer: AnswerState;
  onChange: (next: AnswerState) => void;
  disabled: boolean;
}) {
  const min = typeof group.min === "number" ? group.min : 0;
  const max = typeof group.max === "number" ? group.max : 10;
  const step = typeof group.step === "number" && group.step > 0 ? group.step : 1;
  const value = answer.slider ?? defaultSliderValue(group);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          minWidth: 16,
          textAlign: "right",
        }}
      >
        {min}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange({
            ...answer,
            slider: parseFloat(e.target.value),
            sliderTouched: true,
          })
        }
        style={{ flex: 1, accentColor: "var(--accent)" }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          minWidth: 22,
          textAlign: "right",
        }}
      >
        {max}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 600,
          color: answer.sliderTouched ? "var(--accent)" : "var(--ink)",
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function QuestionsPanel({ payload, onSubmit, onSkip, isStreaming }: QuestionsPanelProps) {
  const groups = useMemo(
    () =>
      payload.groups.map((g, i) => ({
        ...g,
        id: g.id || `q-${i}`,
      })),
    [payload],
  );

  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {};
    for (const g of groups) init[g.id] = emptyAnswer();
    return init;
  });

  const answeredCount = groups.filter((g) => isAnswered(g, answers[g.id] ?? emptyAnswer())).length;
  const allDecide = groups.every((g) => {
    const a = answers[g.id];
    return a && a.selected.has(DECIDE_VALUE);
  });

  const submit = (mode: "answers" | "decide-for-me") => {
    if (mode === "decide-for-me" || allDecide) {
      onSubmit("Decide for me — go ahead with your best judgement on everything.");
      return;
    }
    const lines: string[] = [];
    for (const g of groups) {
      const a = answers[g.id] ?? emptyAnswer();
      if (!isAnswered(g, a)) continue;
      const description = describeAnswer(g, a);
      lines.push(`${g.title}: ${description}`);
    }
    if (lines.length === 0) {
      onSubmit("Decide for me — go ahead.");
      return;
    }
    onSubmit(lines.join("\n"));
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--bg-raised)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 10px 40px oklch(0 0 0 / 0.18)",
        margin: "0 auto",
        width: "100%",
        maxWidth: 760,
      }}
    >
      <div
        style={{
          padding: "20px 28px 14px",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            Forge needs context
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            {payload.title || "A few quick questions"}
          </div>
          {payload.subtitle && (
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5 }}>
              {payload.subtitle}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
          {answeredCount}/{groups.length} answered
        </div>
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: "auto", padding: "0 28px" }}>
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            answer={answers[g.id] ?? emptyAnswer()}
            onChange={(next) => setAnswers((prev) => ({ ...prev, [g.id]: next }))}
            disabled={isStreaming}
          />
        ))}
        {isStreaming && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 18px",
              margin: "10px 0 18px",
              background: "var(--bg-sunken)",
              border: "1px dashed var(--line)",
              borderRadius: 10,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--ink-muted)",
            }}
            role="status"
            aria-live="polite"
          >
            <span
              className="pulse-dot"
              style={{
                width: 6,
                height: 6,
                borderRadius: 50,
                background: "var(--accent)",
                flexShrink: 0,
              }}
            />
            <span>Writing more questions…</span>
            <span style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>
              feel free to start answering — Submit unlocks when done
            </span>
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
      <div
        style={{
          padding: "14px 24px",
          borderTop: "1px solid var(--line-soft)",
          background: "var(--bg-sunken)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <button className="btn sm ghost" onClick={onSkip} disabled={isStreaming}>
          ← Back to chat
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn sm" onClick={() => submit("decide-for-me")} disabled={isStreaming}>
            Decide for me on everything
          </button>
          <button
            className="btn sm primary"
            onClick={() => submit("answers")}
            disabled={isStreaming || (answeredCount === 0 && !allDecide)}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
