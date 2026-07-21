"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CodeView, type CodeLang } from "./CodeView";
import { FileBrowser } from "./FileBrowser";
import { KnobsButton } from "./KnobsButton";
import { QuestionsPanel } from "./QuestionsPanel";
import { VariationsPanel } from "./VariationsPanel";
import { assembleForPreview } from "@/lib/iframe";
import {
  countBySeverity,
  scanFilesForResponsive,
  type ResponsiveViolation,
} from "@/lib/responsiveCheck";
import { tokensToOverlayCss } from "@/lib/tweakColors";
import type {
  BrandKit,
  DesignTweaksPayload,
  FilePayload,
  MessageProgress,
  QuestionsPayload,
  TextEdit,
  TweakState,
  VariationOption,
  VariationsPayload,
  Viewport,
} from "@/lib/types";

export interface CodeFile {
  name: string;
  language: CodeLang;
  source: string;
  /** True while the file is mid-stream from the model. */
  streaming?: boolean;
}

interface CanvasProps {
  projectFiles: FilePayload[];
  viewport: Viewport;
  commentMode: boolean;
  textEditMode: boolean;
  /** Bumped by Studio whenever the active pin is cleared or sent — the
   *  picker clears its sticky element highlight in response. */
  pinHighlightClearKey: number;
  /** After a successful pin or text edit, Studio sets this to the edited
   *  component — the iframe flashes it briefly once it's rebuilt with the
   *  new files. Null when nothing to flash. */
  flashHint: { name?: string; file?: string; key: number } | null;
  isStreaming: boolean;
  tweaks: TweakState;
  progress: MessageProgress | null;
  files: CodeFile[];
  pendingQuestions: QuestionsPayload | null;
  onAnswerQuestions: (formatted: string) => void;
  onSkipQuestions: () => void;
  pendingVariations: VariationsPayload | null;
  onPickVariation: (option: VariationOption) => void;
  onRequestMoreVariations: () => void;
  onExportVariation: (option: VariationOption) => void;
  onTweaksChange: (patch: Partial<TweakState>) => void;
  onSendToClaudeCode: () => void;
  onApplyTweaksToCanvas: () => void;
  onElementPick: (info: {
    tag: string;
    text: string;
    label: string;
    componentName?: string;
    componentFile?: string;
    rect: { x: number; y: number; w: number; h: number };
  }) => void;
  onTextEdit: (edit: TextEdit) => void;
  onPromptSubmit: (text: string) => void;
  designTweaks: DesignTweaksPayload | null;
  designTweakValues: Record<string, string | number | boolean>;
  onDesignTweakChange: (id: string, value: string | number | boolean) => void;
  customAccentHex: string | null;
  onPickAccent: (hex: string | null) => void;
  brandKit: BrandKit | null;
  onOpenBrandKit: () => void;
  onClearBrandKit: () => void;
}

const PICKER_SCRIPT = `
<script>
(function(){
  var COMMENT_MODE = false;
  var TEXT_EDIT_MODE = false;
  var lastHover = null;
  var editingNode = null;
  var editingOriginal = '';

  function findComponentAncestor(el) {
    var node = el;
    var guard = 0;
    while (node && node.nodeType === 1 && guard++ < 200) {
      if (node.dataset && node.dataset.forgeComponent) {
        return {
          name: node.dataset.forgeComponent,
          file: node.dataset.forgeFile || '',
        };
      }
      // Walk up. If parentElement is null but we're inside a shadow root,
      // hop to the host. This is defensive — most Forge components don't
      // use shadow DOM, but third-party widgets sometimes do.
      var parent = node.parentElement;
      if (!parent) {
        var root = node.getRootNode && node.getRootNode();
        if (root && root.host) {
          node = root.host;
          continue;
        }
        break;
      }
      if (node === document.body) break;
      node = parent;
    }
    return null;
  }

  function snippet(s, n) {
    var t = (s || '').replace(/\\s+/g, ' ').trim();
    if (t.length > n) t = t.slice(0, n - 1) + '…';
    return t;
  }

  function setHover(el, on, color) {
    if (!el) return;
    if (on) {
      if (!('__forgeOldOutline' in el.dataset)) {
        el.dataset.__forgeOldOutline = el.style.outline;
        el.dataset.__forgeOldOffset  = el.style.outlineOffset;
      }
      el.style.outline = '2px dashed ' + (color || '#c1ec3a');
      el.style.outlineOffset = '2px';
      el.style.cursor = COMMENT_MODE ? 'crosshair' : 'text';
    } else {
      el.style.outline = el.dataset.__forgeOldOutline || '';
      el.style.outlineOffset = el.dataset.__forgeOldOffset || '';
      el.style.cursor = '';
    }
  }

  function isTextNodeContainer(el) {
    if (!el || !el.childNodes) return false;
    for (var i = 0; i < el.childNodes.length; i++) {
      var c = el.childNodes[i];
      if (c.nodeType === 3 && c.textContent && c.textContent.trim().length > 0) return true;
    }
    return false;
  }

  // Throttled hover-tooltip state: shown once per element until mouseout,
  // so scrubbing across the design doesn't thrash tooltips.
  var hoverTooltipTarget = null;

  document.addEventListener('mouseover', function(e){
    if (!COMMENT_MODE && !TEXT_EDIT_MODE) return;
    if (lastHover && lastHover !== e.target) setHover(lastHover, false);
    if (TEXT_EDIT_MODE && !isTextNodeContainer(e.target)) {
      lastHover = null;
      return;
    }
    lastHover = e.target;
    setHover(e.target, true, COMMENT_MODE ? '#c1ec3a' : '#7dd3fc');

    // Hover tooltip (comment mode only). Fully suppressed while a pin is
    // active — the sticky click-tooltip and pinned-element halo already
    // communicate the selection; a parallel hover tooltip would compete.
    if (COMMENT_MODE && !pinnedNode && e.target !== hoverTooltipTarget) {
      var comp = findComponentAncestor(e.target);
      if (comp) {
        hoverTooltipTarget = e.target;
        var r = e.target.getBoundingClientRect();
        showPinTooltip(comp, r, { transient: true });
      }
    }
  }, true);

  document.addEventListener('mouseout', function(e){
    if (!COMMENT_MODE && !TEXT_EDIT_MODE) return;
    setHover(e.target, false);
    if (lastHover === e.target) lastHover = null;
    // Clear hover tooltip when the pointer leaves the element we last
    // showed it for — but only if it's not the pinned element's sticky
    // tooltip (that one has its own lifecycle).
    if (hoverTooltipTarget === e.target) {
      hoverTooltipTarget = null;
      if (pinTooltipNode && pinTooltipNode.dataset && pinTooltipNode.dataset.transient === '1') {
        hidePinTooltip();
      }
    }
  }, true);

  document.addEventListener('click', function(e){
    if (!COMMENT_MODE && !TEXT_EDIT_MODE) return;
    if (editingNode) return;  // already editing — ignore
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    var r = el.getBoundingClientRect();
    var text = (el.innerText || '').trim().slice(0, 200);
    var tag = el.tagName.toLowerCase();
    var id = el.id ? '#' + el.id : '';
    var cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.')
      : '';
    var comp = findComponentAncestor(el);

    if (TEXT_EDIT_MODE && isTextNodeContainer(el)) {
      // Promote to editable. Capture original. Listen for blur.
      editingNode = el;
      editingOriginal = el.innerText;
      el.setAttribute('contenteditable', 'plaintext-only');
      el.style.outline = '2px solid #7dd3fc';
      el.style.outlineOffset = '2px';
      el.focus();
      // Select all so the user can just type to replace.
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      var finishEdit = function() {
        var newText = (editingNode.innerText || '').trim();
        var oldText = (editingOriginal || '').trim();
        editingNode.removeAttribute('contenteditable');
        editingNode.style.outline = '';
        editingNode.style.outlineOffset = '';
        if (newText && newText !== oldText) {
          parent.postMessage({
            __forge: 'text-edit',
            oldText: oldText,
            newText: newText,
            tag: tag,
            label: tag + id + cls,
            componentName: comp ? comp.name : null,
            componentFile: comp ? comp.file : null,
            rect: { x: r.left, y: r.top, w: r.width, h: r.height },
          }, '*');
        }
        editingNode = null;
        editingOriginal = '';
      };
      el.addEventListener('blur', finishEdit, { once: true });
      el.addEventListener('keydown', function(ke) {
        if (ke.key === 'Escape') {
          editingNode.innerText = editingOriginal;
          editingNode.blur();
        } else if (ke.key === 'Enter' && !ke.shiftKey) {
          ke.preventDefault();
          editingNode.blur();
        }
      });
      return;
    }

    if (COMMENT_MODE) {
      // Sticky highlight: the clicked element keeps a subtle ring until
      // the studio clears it (pin sent or cleared). Calibrated to read
      // on both light and dark designs without dominating.
      clearPinHighlight();
      pinnedNode = el;
      pinnedNode.dataset.__forgePinnedOldOutline = pinnedNode.style.outline;
      pinnedNode.dataset.__forgePinnedOldOffset = pinnedNode.style.outlineOffset;
      pinnedNode.dataset.__forgePinnedOldShadow = pinnedNode.style.boxShadow;
      pinnedNode.style.outline = '2px solid #a3e635';                     // lime-400
      pinnedNode.style.outlineOffset = '2px';
      pinnedNode.style.boxShadow = '0 0 0 4px rgba(190, 242, 100, 0.30)';  // lime-300 / 30%
      // Floating tooltip near the pin showing component + file. Auto-fades
      // after 1.6s so it doesn't linger on top of the design.
      showPinTooltip(comp, r);
      parent.postMessage({
        __forge: 'element-pick',
        tag: tag,
        text: snippet(text, 200),
        label: tag + id + cls,
        componentName: comp ? comp.name : null,
        componentFile: comp ? comp.file : null,
        rect: { x: r.left, y: r.top, w: r.width, h: r.height }
      }, '*');
      setHover(el, false);
      lastHover = null;
    }
  }, true);

  var pinnedNode = null;
  var pinTooltipNode = null;
  var pinTooltipTimer = null;

  function flashComponent(name, file) {
    // Find the first element that matches the component tagging. Prefer
    // name, fall back to file. If nothing matches, silently no-op — the
    // user just doesn't see the flash, not a bug worth surfacing.
    var el = null;
    if (name) {
      el = document.querySelector('[data-forge-component="' + cssEscape(name) + '"]');
    }
    if (!el && file) {
      el = document.querySelector('[data-forge-file="' + cssEscape(file) + '"]');
    }
    if (!el) return;
    // Save + apply a brief lime flash that decays over ~700ms.
    var oldOutline = el.style.outline;
    var oldOffset = el.style.outlineOffset;
    var oldShadow = el.style.boxShadow;
    var oldTransition = el.style.transition;
    el.style.transition = 'outline-color 700ms ease, box-shadow 700ms ease';
    el.style.outline = '2px solid rgba(190, 242, 100, 0.9)';   // lime-300, 90%
    el.style.outlineOffset = '2px';
    el.style.boxShadow = '0 0 0 8px rgba(190, 242, 100, 0.28)';
    requestAnimationFrame(function() {
      // Decay on next frame.
      el.style.outline = '2px solid rgba(190, 242, 100, 0)';
      el.style.boxShadow = '0 0 0 0 rgba(190, 242, 100, 0)';
    });
    setTimeout(function() {
      el.style.outline = oldOutline || '';
      el.style.outlineOffset = oldOffset || '';
      el.style.boxShadow = oldShadow || '';
      el.style.transition = oldTransition || '';
    }, 800);
  }

  function cssEscape(s) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
    // Tiny fallback: quote anything non-word by prefixing a backslash.
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function(c) { return '\\\\' + c; });
  }

  function clearPinHighlight() {
    if (pinnedNode) {
      pinnedNode.style.outline = pinnedNode.dataset.__forgePinnedOldOutline || '';
      pinnedNode.style.outlineOffset = pinnedNode.dataset.__forgePinnedOldOffset || '';
      pinnedNode.style.boxShadow = pinnedNode.dataset.__forgePinnedOldShadow || '';
      delete pinnedNode.dataset.__forgePinnedOldOutline;
      delete pinnedNode.dataset.__forgePinnedOldOffset;
      delete pinnedNode.dataset.__forgePinnedOldShadow;
      pinnedNode = null;
    }
    hidePinTooltip();
  }

  function hidePinTooltip() {
    if (pinTooltipTimer) { clearTimeout(pinTooltipTimer); pinTooltipTimer = null; }
    if (pinTooltipNode && pinTooltipNode.parentNode) {
      pinTooltipNode.parentNode.removeChild(pinTooltipNode);
    }
    pinTooltipNode = null;
  }

  function showPinTooltip(comp, rect, opts) {
    opts = opts || {};
    hidePinTooltip();
    var label = comp ? comp.name : null;
    var sub = comp ? comp.file : '';
    if (!label && !sub) return;
    var transient = !!opts.transient;
    var tip = document.createElement('div');
    tip.setAttribute('data-forge-tooltip', 'pin');
    tip.dataset.transient = transient ? '1' : '0';
    tip.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'pointer-events:none',
      // Softer: near-black with subtle lime accent, less saturation.
      'background:rgba(15,17,20,0.94)',
      'color:#edeef1',
      'padding:5px 9px',
      'border:1px solid rgba(190,242,100,0.32)',
      'border-radius:5px',
      'font:600 10.5px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      'letter-spacing:0.02em',
      'box-shadow:0 4px 14px rgba(0,0,0,0.35)',
      'opacity:0',
      'transform:translateY(-3px)',
      'transition:opacity 120ms ease, transform 120ms ease',
      'backdrop-filter:blur(4px)'
    ].join(';');
    var topLine = document.createElement('div');
    topLine.style.color = '#bef264';   // lime-300
    topLine.textContent = label || 'element';
    tip.appendChild(topLine);
    if (sub) {
      var subLine = document.createElement('div');
      subLine.style.cssText = 'opacity:0.6;font-weight:400;font-size:9.5px;margin-top:1px';
      subLine.textContent = sub;
      tip.appendChild(subLine);
    }
    document.body.appendChild(tip);
    var top = rect.top - 34;
    if (top < 8) top = rect.bottom + 8;
    var left = Math.max(8, Math.min(window.innerWidth - 220, rect.left));
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
    requestAnimationFrame(function() {
      tip.style.opacity = '1';
      tip.style.transform = 'translateY(0)';
    });
    pinTooltipNode = tip;
    // Sticky tooltips (click-created) auto-fade after 1.6s so they don't
    // linger on the design. Transient (hover) tooltips stay visible until
    // the next mouseout, which clears them explicitly.
    if (!transient) {
      pinTooltipTimer = setTimeout(function() {
        if (pinTooltipNode) {
          pinTooltipNode.style.opacity = '0';
          pinTooltipNode.style.transform = 'translateY(-3px)';
        }
        pinTooltipTimer = setTimeout(hidePinTooltip, 180);
      }, 1600);
    }
  }

  window.addEventListener('message', function(e){
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.__forge === 'set-comment-mode') {
      COMMENT_MODE = !!e.data.value;
      if (!COMMENT_MODE && lastHover) { setHover(lastHover, false); lastHover = null; }
    }
    if (e.data.__forge === 'set-text-edit-mode') {
      TEXT_EDIT_MODE = !!e.data.value;
      if (!TEXT_EDIT_MODE && lastHover) { setHover(lastHover, false); lastHover = null; }
      if (!TEXT_EDIT_MODE && editingNode) {
        editingNode.innerText = editingOriginal;
        editingNode.blur();
      }
    }
    if (e.data.__forge === 'clear-pin-highlight') {
      clearPinHighlight();
    }
    if (e.data.__forge === 'flash-component') {
      flashComponent(e.data.name || null, e.data.file || null);
    }
    if (e.data.__forge === 'set-tokens') {
      var s = document.getElementById('__forge_token_overrides');
      if (!s) {
        s = document.createElement('style');
        s.id = '__forge_token_overrides';
        document.head.appendChild(s);
      }
      s.textContent = e.data.css || '';
    }
  });
  parent.postMessage({ __forge: 'ready' }, '*');
})();
</script>
`.trim();

function injectPickerIntoHtml(html: string): string {
  if (!html) return html;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${PICKER_SCRIPT}\n</body>`);
  }
  return `${html}\n${PICKER_SCRIPT}`;
}

const VIEWPORT_DIMS: Record<Viewport, { w: number | string; h: number | string; maxW: number | string }> = {
  desktop: { w: "100%", h: "100%", maxW: "100%" },
  tablet: { w: 768, h: 1024, maxW: 768 },
  mobile: { w: 390, h: 780, maxW: 390 },
};

function EmptyState({
  isStreaming,
  onPromptSubmit,
}: {
  isStreaming: boolean;
  onPromptSubmit: (text: string) => void;
}) {
  const presets = [
    "SaaS dashboard with KPI cards and a revenue chart",
    "Landing page for an indie SaaS — hero + 3 features + pricing CTA",
    "Mobile habit tracker with streak and 3 daily goals",
    "Pricing page, three tiers, dark mode",
  ];
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        position: "relative",
      }}
    >
      <BackgroundGrid />
      <div style={{ textAlign: "center", maxWidth: 520, position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: 56,
            height: 56,
            background: "var(--accent)",
            transform: "rotate(45deg)",
            margin: "0 auto 28px",
            borderRadius: 6,
          }}
        >
          <div
            style={{
              transform: "rotate(-45deg)",
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 26,
              color: "var(--accent-ink)",
            }}
          >
            F
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 12,
          }}
        >
          New project
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 600,
            margin: "0 0 12px",
            letterSpacing: "-0.03em",
            fontFamily: "var(--font-display)",
          }}
        >
          What are we forging today?
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 32, lineHeight: 1.5 }}>
          Describe a UI in the chat panel — Forge will generate a real,
          self-contained HTML mockup right here, then iterate with you.
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {presets.map((t) => (
            <button
              key={t}
              className="btn sm"
              onClick={() => onPromptSubmit(t)}
              disabled={isStreaming}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BackgroundGrid() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklch, var(--ink) 10%, transparent) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        opacity: 0.4,
        pointerEvents: "none",
      }}
    />
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function StreamingBanner({
  progress,
  activeFile,
}: {
  progress: MessageProgress;
  activeFile: string | null;
}) {
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
    done: "Done",
  };
  const elapsed = progress.startedAt ? Math.max(0, Date.now() - progress.startedAt) : 0;
  // When a file is mid-stream, its name is the most useful status — replace
  // the generic phase label with "Writing <path>" so the user can see
  // exactly which file Claude is on.
  const showFile = activeFile && (progress.phase === "files" || progress.phase === "edits" || progress.phase === "coding");
  return (
    <div
      style={{
        height: 34,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 16px",
        background: "var(--accent-soft)",
        borderBottom: "1px solid var(--accent-line)",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        color: "var(--ink)",
      }}
      role="status"
    >
      <span
        className="pulse-dot"
        style={{ width: 8, height: 8, borderRadius: 50, background: "var(--accent)", flexShrink: 0 }}
      />
      {showFile ? (
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>
            Writing
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
            title={activeFile!}
          >
            {activeFile}
          </span>
        </span>
      ) : (
        <>
          <span style={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11, color: "var(--accent)" }}>
            {phaseLabel[progress.phase]}
          </span>
          <span style={{ flex: 1, color: "var(--ink-muted)", fontSize: 11 }}>
            {progress.replyBytes > 0 && <>reply {progress.replyBytes >= 1024 ? `${(progress.replyBytes / 1024).toFixed(1)}KB` : `${progress.replyBytes}B`}</>}
            {progress.replyBytes > 0 && progress.filesBytes > 0 && " · "}
            {progress.filesBytes > 0 && <>files {progress.filesBytes >= 1024 ? `${(progress.filesBytes / 1024).toFixed(1)}KB` : `${progress.filesBytes}B`}</>}
          </span>
        </>
      )}
      {elapsed > 0 && (
        <span style={{ color: "var(--ink-faint)", fontSize: 10, flexShrink: 0 }}>
          {(elapsed / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

function GenerationOverlay({
  progress,
  activeFile,
}: {
  progress: MessageProgress;
  activeFile: string | null;
}) {
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
    done: "Done",
  };
  const elapsed = progress.startedAt ? Math.max(0, Date.now() - progress.startedAt) : 0;
  const showFile = activeFile && (progress.phase === "files" || progress.phase === "edits" || progress.phase === "coding");
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        padding: "10px 16px",
        background: "var(--bg-raised)",
        border: "1px solid var(--accent-line)",
        borderRadius: 12,
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        display: "flex",
        gap: 14,
        alignItems: "center",
        boxShadow: "0 8px 24px oklch(0 0 0 / 0.3)",
        minWidth: 320,
        maxWidth: 520,
      }}
    >
      <span
        className="pulse-dot"
        style={{ width: 8, height: 8, borderRadius: 50, background: "var(--accent)", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {showFile ? (
          <>
            <div style={{ fontSize: 10, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Writing
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink)",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={activeFile!}
            >
              {activeFile}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {phaseLabel[progress.phase]}
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2, letterSpacing: "0.04em" }}>
              {progress.replyBytes > 0 && <>reply {formatBytes(progress.replyBytes)}</>}
              {progress.replyBytes > 0 && progress.filesBytes > 0 && " · "}
              {progress.filesBytes > 0 && <>canvas {formatBytes(progress.filesBytes)}</>}
              {progress.replyBytes === 0 && progress.filesBytes === 0 && <>connecting…</>}
              {elapsed > 0 && <> · {(elapsed / 1000).toFixed(1)}s</>}
            </div>
          </>
        )}
      </div>
      {showFile && elapsed > 0 && (
        <span style={{ fontSize: 10, color: "var(--ink-faint)", flexShrink: 0 }}>
          {(elapsed / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

function ViewTabs({
  activeView,
  onChange,
  files,
  hasCanvas,
  onRefreshPreview,
  responsiveIssues,
  responsivePanelOpen,
  onToggleResponsivePanel,
}: {
  activeView: "preview" | "files";
  onChange: (v: "preview" | "files") => void;
  files: CodeFile[];
  hasCanvas: boolean;
  onRefreshPreview: () => void;
  responsiveIssues: { errors: number; warnings: number };
  responsivePanelOpen: boolean;
  onToggleResponsivePanel: () => void;
}) {
  const anyStreaming = files.some((f) => f.streaming);
  const tabs: Array<{ key: "preview" | "files"; label: string; count?: number; streaming?: boolean }> = [
    { key: "preview", label: "◉ Preview" },
    { key: "files", label: "🗂 Files", count: files.length, streaming: anyStreaming },
  ];
  return (
    <div
      style={{
        height: 40,
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        background: "var(--bg-sunken)",
        borderBottom: "1px solid var(--line)",
        padding: "0 8px",
        gap: 2,
      }}
    >
      {tabs.map((t) => {
        const active = activeView === t.key;
        const disabled = !hasCanvas && t.key === "files";
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            disabled={disabled}
            style={{
              appearance: "none",
              border: "none",
              background: active ? "var(--bg-panel)" : "transparent",
              borderTop: active ? "2px solid var(--accent)" : "2px solid transparent",
              borderBottom: active ? "1px solid var(--bg-panel)" : "1px solid transparent",
              marginBottom: -1,
              cursor: disabled ? "not-allowed" : "pointer",
              padding: "0 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: active ? "var(--ink)" : "var(--ink-faint)",
              letterSpacing: "0.04em",
              opacity: disabled ? 0.45 : 1,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            title={disabled ? "Generate a design first" : undefined}
          >
            {t.streaming && (
              <span
                className="pulse-dot"
                style={{ width: 6, height: 6, borderRadius: 50, background: "var(--accent)" }}
              />
            )}
            <span>{t.label}</span>
            {typeof t.count === "number" && t.count > 0 && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  padding: "1px 6px",
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  borderRadius: 3,
                  color: "var(--ink-muted)",
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      {(responsiveIssues.errors > 0 || responsiveIssues.warnings > 0) && (
        <button
          onClick={onToggleResponsivePanel}
          aria-expanded={responsivePanelOpen}
          aria-label={`${responsiveIssues.errors + responsiveIssues.warnings} responsive issues detected`}
          title="Responsive issues detected — click to review"
          style={{
            appearance: "none",
            border: "1px solid",
            borderColor:
              responsiveIssues.errors > 0
                ? "oklch(0.55 0.18 30 / 0.7)"
                : "oklch(0.55 0.14 70 / 0.7)",
            background:
              responsiveIssues.errors > 0
                ? "oklch(0.35 0.12 30 / 0.2)"
                : "oklch(0.35 0.1 70 / 0.18)",
            color:
              responsiveIssues.errors > 0
                ? "oklch(0.78 0.17 30)"
                : "oklch(0.82 0.14 70)",
            cursor: "pointer",
            padding: "0 10px",
            height: 22,
            borderRadius: 4,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "center",
            letterSpacing: "0.02em",
            marginRight: 4,
          }}
        >
          <span style={{ fontSize: 12, lineHeight: 1 }}>⚠</span>
          <span>
            {responsiveIssues.errors + responsiveIssues.warnings} responsive
            {responsiveIssues.errors + responsiveIssues.warnings === 1 ? " issue" : " issues"}
          </span>
        </button>
      )}
      <button
        onClick={onRefreshPreview}
        disabled={!hasCanvas || activeView !== "preview"}
        title="Refresh preview (reloads the iframe and re-runs all scripts)"
        aria-label="Refresh preview"
        style={{
          appearance: "none",
          border: "none",
          background: "transparent",
          cursor: !hasCanvas || activeView !== "preview" ? "not-allowed" : "pointer",
          padding: "0 12px",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--ink-faint)",
          opacity: !hasCanvas || activeView !== "preview" ? 0.35 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          alignSelf: "center",
          height: 26,
          borderRadius: 4,
          transition: "background 120ms, color 120ms",
        }}
        onMouseEnter={(e) => {
          if (!hasCanvas || activeView !== "preview") return;
          e.currentTarget.style.background = "var(--bg-raised)";
          e.currentTarget.style.color = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--ink-faint)";
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>↻</span>
        <span style={{ letterSpacing: "0.04em" }}>Refresh</span>
      </button>
    </div>
  );
}

function ResponsiveIssuesDrawer({
  violations,
  onClose,
  onJumpToFile,
}: {
  violations: ResponsiveViolation[];
  onClose: () => void;
  onJumpToFile: (path: string) => void;
}) {
  // Group by file for easier scanning.
  const byFile = new Map<string, ResponsiveViolation[]>();
  for (const v of violations) {
    const list = byFile.get(v.path) ?? [];
    list.push(v);
    byFile.set(v.path, list);
  }
  return (
    <div
      style={{
        flexShrink: 0,
        background: "var(--bg-sunken)",
        borderBottom: "1px solid var(--line)",
        maxHeight: 260,
        overflow: "auto",
      }}
      role="region"
      aria-label="Responsive issues"
    >
      <div
        style={{
          padding: "10px 16px 8px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--line-soft)",
          position: "sticky",
          top: 0,
          background: "var(--bg-sunken)",
          zIndex: 2,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Responsive sanity check
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
          {violations.length} issue{violations.length === 1 ? "" : "s"} · patterns that are likely to break at mobile/tablet widths
        </span>
        <span style={{ flex: 1 }} />
        <button
          className="btn sm ghost"
          onClick={onClose}
          title="Close"
          aria-label="Close responsive issues panel"
          style={{ padding: "0 6px", height: 22, fontSize: 13 }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: "8px 12px 12px" }}>
        {Array.from(byFile.entries()).map(([path, list]) => (
          <div key={path} style={{ marginBottom: 10 }}>
            <button
              onClick={() => onJumpToFile(path)}
              title="Open this file in the Files tab"
              style={{
                appearance: "none",
                background: "transparent",
                border: "none",
                padding: "4px 2px",
                color: "var(--ink)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {path}{" "}
              <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>
                · {list.length} issue{list.length === 1 ? "" : "s"}
              </span>
            </button>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: "2px 0 0 10px",
                borderLeft: "1px solid var(--line-soft)",
              }}
            >
              {list.map((v, i) => (
                <li
                  key={`${v.rule}-${v.line}-${v.column}-${i}`}
                  style={{
                    padding: "4px 0 4px 10px",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "2px 8px",
                    alignItems: "start",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background:
                        v.severity === "error"
                          ? "oklch(0.3 0.12 30 / 0.45)"
                          : "oklch(0.32 0.12 80 / 0.4)",
                      color:
                        v.severity === "error"
                          ? "oklch(0.82 0.17 30)"
                          : "oklch(0.88 0.15 80)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                      alignSelf: "center",
                    }}
                  >
                    {v.severity}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink)",
                        lineHeight: 1.35,
                      }}
                    >
                      {v.title}
                      <span
                        style={{
                          color: "var(--ink-faint)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          marginLeft: 6,
                        }}
                      >
                        L{v.line}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-muted)",
                        marginTop: 2,
                      }}
                    >
                      {v.suggestion}
                    </div>
                    <code
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        color: "var(--ink-faint)",
                        background: "var(--bg)",
                        padding: "3px 6px",
                        borderRadius: 3,
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        border: "1px solid var(--line-soft)",
                      }}
                      title={v.snippet}
                    >
                      {v.snippet}
                    </code>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Canvas({
  projectFiles,
  viewport,
  commentMode,
  textEditMode,
  pinHighlightClearKey,
  flashHint,
  isStreaming,
  tweaks,
  progress,
  files,
  pendingQuestions,
  onAnswerQuestions,
  onSkipQuestions,
  pendingVariations,
  onPickVariation,
  onRequestMoreVariations,
  onExportVariation,
  onTweaksChange,
  onSendToClaudeCode,
  onApplyTweaksToCanvas,
  onElementPick,
  onTextEdit,
  onPromptSubmit,
  designTweaks,
  designTweakValues,
  onDesignTweakChange,
  customAccentHex,
  onPickAccent,
  brandKit,
  onOpenBrandKit,
  onClearBrandKit,
}: CanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const [activeView, setActiveView] = useState<"preview" | "files">("preview");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  // Bumping this key remounts the iframe, re-executing every <script> in the
  // assembled document. Useful after live CSS-var overrides get into a weird
  // state, or when Babel/React throws during transpile and only a clean boot
  // recovers. Bumped by the Refresh button in the tab bar.
  const [refreshKey, setRefreshKey] = useState(0);
  const [responsivePanelOpen, setResponsivePanelOpen] = useState(false);

  // Scan the real project files (not the transient draft) for the banned
  // patterns flagged in the CODE_SYSTEM_PROMPT. Runs whenever files change —
  // essentially free because it's a linear regex pass over JSX/HTML text.
  const responsiveViolations = useMemo<ResponsiveViolation[]>(
    () => scanFilesForResponsive(projectFiles),
    [projectFiles],
  );
  const responsiveIssues = useMemo(
    () => countBySeverity(responsiveViolations),
    [responsiveViolations],
  );
  const refreshPreview = () => {
    readyRef.current = false;
    setRefreshKey((k) => k + 1);
  };

  // Fire the clear-pin-highlight message into the iframe whenever pinClearKey
  // changes (Studio bumps it when the user clears or sends the active pin).
  // Implemented with a ref + effect so we don't re-render the iframe.
  const postClearPinHighlight = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !readyRef.current) return;
    iframe.contentWindow.postMessage({ __forge: "clear-pin-highlight" }, "*");
  };

  // Flash queue: after an edit lands, the iframe typically rebuilds (new
  // srcDoc), which means the ready handshake runs again. If Studio sets
  // flashHint BEFORE the new iframe is ready, we stash it and flush on
  // the next ready. If the iframe is already ready, we post immediately.
  const pendingFlashRef = useRef<{ name?: string; file?: string } | null>(null);
  const postFlash = (target: { name?: string; file?: string }) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { __forge: "flash-component", name: target.name, file: target.file },
      "*",
    );
  };

  const hasProject = projectFiles.length > 0;

  // Auto-switch to Files view whenever ANY file is streaming — the user
  // should see files land, not a stale Preview. (They can click back to
  // Preview anytime.)
  // The last streaming file is the one Claude is most likely mid-way through
  // (earlier ones finish first). Surface its name in the streaming banner.
  const streamingFiles = files.filter((f) => f.streaming);
  const liveFileKey = streamingFiles[0]?.name;
  const activeFileName = streamingFiles.at(-1)?.name ?? null;
  const autoSwitchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!liveFileKey) {
      autoSwitchedRef.current = null;
      return;
    }
    if (autoSwitchedRef.current === liveFileKey) return;
    if (activeView === "preview") {
      setActiveView("files");
      setSelectedFileName(liveFileKey);
      autoSwitchedRef.current = liveFileKey;
    }
  }, [liveFileKey, activeView]);

  // Auto-select the first file (usually forge.html) when switching into Files
  // mode with nothing selected yet.
  useEffect(() => {
    if (activeView !== "files") return;
    if (selectedFileName && files.some((f) => f.name === selectedFileName)) return;
    const defaultPick =
      files.find((f) => f.name === "forge.html") ??
      files.find((f) => f.language === "html") ??
      files[0] ??
      null;
    setSelectedFileName(defaultPick ? defaultPick.name : null);
  }, [activeView, files, selectedFileName]);

  // If the current file goes away (new project), clear selection.
  useEffect(() => {
    if (!files.length && activeView === "files") setActiveView("preview");
  }, [files.length, activeView]);

  const srcDoc = useMemo(() => {
    const assembled = assembleForPreview(projectFiles);
    return assembled ? injectPickerIntoHtml(assembled) : null;
  }, [projectFiles]);

  const activeFile =
    activeView === "files" && selectedFileName
      ? files.find((f) => f.name === selectedFileName) ?? null
      : null;

  const hasCanvas = Boolean(srcDoc) || files.length > 0;

  // Compute the extra CSS-variable overrides driven by the per-design
  // controls (only "css"-applying ones with a cssVariable hint).
  const extraVars = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const c of designTweaks?.controls ?? []) {
      if (c.applies === "regen") continue;
      if (!c.cssVariable) continue;
      const v = designTweakValues[c.id] ?? c.default;
      if (v === undefined || v === null) continue;
      out[c.cssVariable] = String(v);
    }
    return out;
  }, [designTweaks, designTweakValues]);

  // Listen for picker messages
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      const d = e.data as Record<string, unknown>;
      if (d.__forge === "ready") {
        readyRef.current = true;
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            { __forge: "set-comment-mode", value: commentMode },
            "*",
          );
          iframe.contentWindow.postMessage(
            { __forge: "set-text-edit-mode", value: textEditMode },
            "*",
          );
          iframe.contentWindow.postMessage(
            { __forge: "set-tokens", css: tokensToOverlayCss(tweaks, customAccentHex, extraVars) },
            "*",
          );
          // Flush any queued flash now that the iframe is live. We delay one
          // frame so the React/Babel tree has actually mounted before we
          // try to locate the data-forge-component element.
          if (pendingFlashRef.current) {
            const queued = pendingFlashRef.current;
            pendingFlashRef.current = null;
            requestAnimationFrame(() => postFlash(queued));
          }
        }
        return;
      }
      if (d.__forge === "element-pick") {
        const componentName =
          typeof d.componentName === "string" && d.componentName ? d.componentName : undefined;
        const componentFile =
          typeof d.componentFile === "string" && d.componentFile ? d.componentFile : undefined;
        onElementPick({
          tag: String(d.tag ?? ""),
          text: String(d.text ?? ""),
          label: String(d.label ?? ""),
          componentName,
          componentFile,
          rect: d.rect as { x: number; y: number; w: number; h: number },
        });
      }
      if (d.__forge === "text-edit") {
        onTextEdit({
          oldText: String(d.oldText ?? ""),
          newText: String(d.newText ?? ""),
          tag: String(d.tag ?? ""),
          label: String(d.label ?? ""),
          componentName:
            typeof d.componentName === "string" && d.componentName ? d.componentName : undefined,
          componentFile:
            typeof d.componentFile === "string" && d.componentFile ? d.componentFile : undefined,
        });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [commentMode, textEditMode, tweaks, customAccentHex, extraVars, onElementPick, onTextEdit]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !readyRef.current) return;
    iframe.contentWindow.postMessage(
      { __forge: "set-comment-mode", value: commentMode },
      "*",
    );
  }, [commentMode]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !readyRef.current) return;
    iframe.contentWindow.postMessage(
      { __forge: "set-text-edit-mode", value: textEditMode },
      "*",
    );
  }, [textEditMode]);

  useEffect(() => {
    if (pinHighlightClearKey === 0) return; // Initial mount, nothing to clear.
    postClearPinHighlight();
    // postClearPinHighlight is captured via closure; safe to omit deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinHighlightClearKey]);

  useEffect(() => {
    if (!flashHint) return;
    if (readyRef.current) {
      postFlash({ name: flashHint.name, file: flashHint.file });
    } else {
      // Iframe is mid-rebuild (edit just landed and srcDoc just changed).
      // Queue the flash for the next ready handshake.
      pendingFlashRef.current = { name: flashHint.name, file: flashHint.file };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashHint?.key]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !readyRef.current) return;
    iframe.contentWindow.postMessage(
      { __forge: "set-tokens", css: tokensToOverlayCss(tweaks, customAccentHex, extraVars) },
      "*",
    );
  }, [tweaks, customAccentHex, extraVars]);

  useEffect(() => {
    readyRef.current = false;
  }, [srcDoc]);

  const dims = VIEWPORT_DIMS[viewport];
  const showFiles = activeView === "files";
  const showQuestions = pendingQuestions !== null;
  const showVariations = pendingVariations !== null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        background: "var(--canvas-bg)",
      }}
    >
      <ViewTabs
        activeView={activeView}
        onChange={setActiveView}
        files={files}
        hasCanvas={hasCanvas}
        onRefreshPreview={refreshPreview}
        responsiveIssues={responsiveIssues}
        responsivePanelOpen={responsivePanelOpen}
        onToggleResponsivePanel={() => setResponsivePanelOpen((o) => !o)}
      />

      {responsivePanelOpen && responsiveViolations.length > 0 && (
        <ResponsiveIssuesDrawer
          violations={responsiveViolations}
          onClose={() => setResponsivePanelOpen(false)}
          onJumpToFile={(path) => {
            setActiveView("files");
            setSelectedFileName(path);
          }}
        />
      )}

      {isStreaming && progress && <StreamingBanner progress={progress} activeFile={activeFileName} />}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: showFiles ? 0 : 24,
          position: "relative",
          display: "flex",
          alignItems: showFiles
            ? "stretch"
            : showQuestions
              ? "stretch"
              : !srcDoc
                ? "stretch"
                : viewport === "desktop"
                  ? "stretch"
                  : "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {showQuestions && pendingQuestions && (
          <>
            <BackgroundGrid />
            <div style={{ position: "relative", zIndex: 1, display: "flex", flex: 1, minHeight: 0, justifyContent: "center", padding: 24 }}>
              <QuestionsPanel
                payload={pendingQuestions}
                onSubmit={onAnswerQuestions}
                onSkip={onSkipQuestions}
                isStreaming={isStreaming}
              />
            </div>
          </>
        )}

        {!showQuestions && showVariations && pendingVariations && (
          <div style={{ position: "relative", zIndex: 1, display: "flex", flex: 1, minHeight: 0, width: "100%", padding: 24 }}>
            <VariationsPanel
              payload={pendingVariations}
              onPick={onPickVariation}
              onRequestMore={onRequestMoreVariations}
              onExport={onExportVariation}
            />
          </div>
        )}

        {!showQuestions && !showVariations && showFiles && (
          <div style={{ display: "flex", flex: 1, minHeight: 0, width: "100%" }}>
            <div
              style={{
                width: 360,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid var(--line)",
                background: "var(--bg)",
                minHeight: 0,
              }}
            >
              <FileBrowser
                files={files}
                selectedName={selectedFileName}
                onSelect={setSelectedFileName}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", padding: 16 }}>
              {activeFile ? (
                <CodeView
                  filename={activeFile.name}
                  language={activeFile.language}
                  source={activeFile.source}
                  streaming={activeFile.streaming}
                />
              ) : (
                <div style={{ margin: "auto", color: "var(--ink-faint)", fontSize: 13 }}>
                  Select a file to view its source.
                </div>
              )}
            </div>
          </div>
        )}

        {!showQuestions && !showVariations && !showFiles && !srcDoc && (
          <>
            <EmptyState isStreaming={isStreaming} onPromptSubmit={onPromptSubmit} />
            {isStreaming && progress && <GenerationOverlay progress={progress} activeFile={activeFileName} />}
          </>
        )}

        {!showQuestions && !showVariations && !showFiles && srcDoc && (
          <>
            <BackgroundGrid />
            <div
              style={{
                width: dims.w,
                maxWidth: dims.maxW,
                height: dims.h === "100%" ? "100%" : dims.h,
                maxHeight: "100%",
                background: "#fff",
                borderRadius: viewport === "desktop" ? 8 : 24,
                border: "1px solid var(--line)",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 10px 40px oklch(0 0 0 / 0.15)",
                transition: "all 260ms cubic-bezier(.2,.8,.2,1)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {viewport === "desktop" && (
                <div
                  style={{
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 10px",
                    borderBottom: "1px solid var(--line-soft)",
                    background: "var(--bg-sunken)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    {["oklch(0.7 0.18 30)", "oklch(0.85 0.15 80)", "oklch(0.8 0.15 140)"].map((c) => (
                      <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                    ))}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      color: "var(--ink-faint)",
                    }}
                  >
                    localhost:3000
                  </div>
                  <div style={{ width: 50 }} />
                </div>
              )}
              <iframe
                key={`preview-${refreshKey}`}
                ref={iframeRef}
                srcDoc={srcDoc}
                title="Forge canvas"
                sandbox="allow-scripts allow-forms"
                style={{ width: "100%", flex: 1, border: "none", background: "#fff" }}
              />
            </div>
            {(commentMode || textEditMode) && (
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 50,
                  padding: "6px 12px",
                  background: "var(--bg-raised)",
                  border: `1px solid ${textEditMode ? "oklch(0.7 0.18 230)" : "var(--accent-line)"}`,
                  borderRadius: 999,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  boxShadow: "0 4px 16px oklch(0 0 0 / 0.2)",
                }}
              >
                <span
                  className="pulse-dot"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 50,
                    background: textEditMode ? "oklch(0.75 0.18 230)" : "var(--accent)",
                  }}
                />
                {textEditMode
                  ? <>Click any text to edit it · <span className="kbd">enter</span> to commit · <span className="kbd">esc</span> to cancel</>
                  : <>Click any element to comment · <span className="kbd">esc</span> to exit</>}
              </div>
            )}
            {isStreaming && progress && <GenerationOverlay progress={progress} activeFile={activeFileName} />}
          </>
        )}

        <KnobsButton
          state={tweaks}
          setState={onTweaksChange}
          onSendToClaudeCode={onSendToClaudeCode}
          onApplyToCanvas={onApplyTweaksToCanvas}
          hasCanvas={hasCanvas}
          designTweaks={designTweaks}
          designTweakValues={designTweakValues}
          onDesignTweakChange={onDesignTweakChange}
          customAccentHex={customAccentHex}
          onPickAccent={onPickAccent}
          brandKit={brandKit}
          onOpenBrandKit={onOpenBrandKit}
          onClearBrandKit={onClearBrandKit}
        />
        {brandKit && (
          <button
            onClick={onOpenBrandKit}
            title={`Brand Kit active · Source: ${brandKit.source} · ${Object.keys(brandKit.vars).length} vars · ${brandKit.fonts.length} font${brandKit.fonts.length === 1 ? "" : "s"} · click to edit`}
            aria-label={`Brand kit ${brandKit.name} — click to edit`}
            style={{
              position: "absolute",
              top: 52,
              right: 16,
              zIndex: 40,
              appearance: "none",
              cursor: "pointer",
              padding: "4px 10px 4px 8px",
              background: "var(--bg-raised)",
              border: "1px solid var(--accent-line)",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--ink)",
              boxShadow: "0 4px 14px oklch(0 0 0 / 0.25)",
              letterSpacing: "0.04em",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 50,
                background: "var(--accent)",
                boxShadow: "0 0 6px var(--accent)",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Brand
            </span>
            <span
              style={{
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "var(--ink)",
              }}
            >
              {brandKit.name}
            </span>
            <span
              style={{
                color: "var(--ink-faint)",
                fontSize: 9,
                padding: "0 5px",
                borderLeft: "1px solid var(--line)",
                marginLeft: 2,
              }}
            >
              {brandKit.source}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
