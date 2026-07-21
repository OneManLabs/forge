import { INSPIRATION_CATALOG } from "./inspirations";

/**
 * Hide brand names from the model's thinking / reply text.
 *
 * The server injects `<design_inspirations>` blocks containing real
 * DESIGN.md references (Stripe, Linear, Notion, etc.) to give the agent
 * flavor. The system prompt tells the agent not to name-drop them, but
 * adaptive-thinking streams sometimes leak the references in the
 * reasoning — which confuses users ("why does it think I mentioned
 * Stripe?").
 *
 * This redactor is the safety net. Every catalog brand name gets
 * replaced with a neutral placeholder UNLESS the user themselves
 * mentioned it in their prompt (in which case it's legitimate and we
 * leave it alone).
 */

const REDACTION = "a reference";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build the brand deny-list for a given user prompt. Returns names in
 * descending length order so multi-word brands match before shorter
 * ones that would be substrings.
 */
function buildDenyList(userPrompt: string | null | undefined): string[] {
  const text = (userPrompt ?? "").toLowerCase();
  const deny: string[] = [];
  for (const entry of INSPIRATION_CATALOG) {
    const lower = entry.name.toLowerCase();
    // If the user mentioned the brand themselves, it's legitimate — keep.
    if (text.includes(lower)) continue;
    // Also skip very-short names (2 chars or less) — too risky to redact
    // without false positives (e.g. a brand literally named "X").
    if (entry.name.length <= 2) continue;
    deny.push(entry.name);
  }
  deny.sort((a, b) => b.length - a.length);
  return deny;
}

/**
 * Redact hidden-reference brand names from the given text. Case-
 * insensitive match with word boundaries; preserves possessive 's.
 */
export function redactBrands(text: string, userPrompt: string | null | undefined): string {
  if (!text) return text;
  const deny = buildDenyList(userPrompt);
  if (deny.length === 0) return text;
  let out = text;
  for (const name of deny) {
    const re = new RegExp(`\\b${escapeRegex(name)}(?:['’]s)?\\b`, "gi");
    out = out.replace(re, REDACTION);
  }
  return out;
}
