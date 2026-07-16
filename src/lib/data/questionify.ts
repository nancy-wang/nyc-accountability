import type { Indicator } from "./types";

// Lowercases the first letter for mid-sentence use — unless the fragment
// opens with what looks like a multi-word proper noun / program name (e.g.
// "Home Care", "Adult Protective Services"), signaled by its first two
// words both being capitalized, in which case leave it alone.
function lowerFirst(s: string): string {
  if (s.length === 0) return s;
  const words = s.split(" ");
  if (words.length >= 2 && /^[A-Z]/.test(words[0]) && /^[A-Z]/.test(words[1])) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function upperFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

// Only strip trailing parens that are pure unit/period annotations (e.g.
// "(%)", "(days)", "(CY)", "(minutes:seconds)", "(% of system)") — a
// parenthetical like "(tier 1 calls)" or "(Renewal)" is a meaningful
// qualifier, not a unit, and must survive so the question doesn't lose
// information.
const UNIT_PAREN =
  /^(?:%(?:\s+of\s+[\w\s]*)?|CY|FY\d*|preliminary|\$?000(?:,000)?(?:,000)?|days?|weeks?|months?|years?|hours?|minutes?|minutes?:seconds?|hours?:minutes?|business\s+days?|calendar\s+days?|per\s+[\d,]+[\w\s]*)$/i;

function stripTrailingUnitParens(s: string): string {
  let out = s.trim();
  for (;;) {
    const m = out.match(/^(.*)\s*\(([^()]*)\)\s*$/);
    if (!m || !UNIT_PAREN.test(m[2].trim())) break;
    out = m[1].trim();
  }
  // "Total" as a trailing em/en-dash breakdown ("X — Total") is redundant
  // once phrased as a question; category breakdowns like "— Male" or
  // "— Renewal" are meaningful and stay.
  out = out.replace(/\s*[—-]\s*Total\s*$/i, "").trim();
  return out;
}

/**
 * Turns an indicator's MMR-style label (often dense bureaucratic phrasing,
 * e.g. "Average time to complete an investigation (days)") into a plain
 * question a general reader can parse at a glance. Rule-based and
 * deterministic rather than generated per-indicator, so it works for all
 * 609 indicators without hand-authoring — some edge cases read a little
 * stiff, but every one is a real, auditable transformation of the source
 * label, not a fabricated rephrasing.
 */
export function toPlainLanguageQuestion(indicator: Indicator): string {
  const core = stripTrailingUnitParens(indicator.name);

  let m = core.match(/response time (?:to|for)\s+(.+)/i);
  if (m) return `How long does it take to respond to ${lowerFirst(m[1])}?`;

  m = core.match(/turnaround time (?:to|for)\s+(.+)/i);
  if (m) return `How long does it take to complete ${lowerFirst(m[1])}?`;

  m = core.match(/(?:average|median)\s+(?:calendar\s+)?days?\s+(?:to|for)\s+(.+)/i);
  if (m) return `How many days does it take to ${lowerFirst(m[1])}?`;

  m = core.match(/(?:average|median)\s+time\s+(?:to|for)\s+(.+)/i);
  if (m) return `How long does it take to ${lowerFirst(m[1])}?`;

  m = core.match(/(?:average|median)\s+days?\s+between\s+(.+)/i);
  if (m) return `On average, how many days pass between ${lowerFirst(m[1])}?`;

  m = core.match(/(?:average|median)\s+days?\s+after\s+(.+)/i);
  if (m) return `On average, how many days does it take after ${lowerFirst(m[1])}?`;

  // "X rate" already means a percentage — "What percent of X rate?" would
  // double up, so just ask what the rate is instead.
  if (/\brate$/i.test(core) && (indicator.measurementType === "Percentage" || /\(%\)\s*$/.test(indicator.name))) {
    return `What is the ${lowerFirst(core)}?`;
  }

  if (indicator.measurementType === "Percentage" || /\(%\)\s*$/.test(indicator.name)) {
    return `What percent of ${lowerFirst(core)}?`;
  }

  m = core.match(/^(?:average|median)\s+(.+)/i);
  if (m) return `On average, what is the ${lowerFirst(m[1])}?`;

  m = core.match(/^total\s+(.+)/i);
  if (m) return `What is the total ${lowerFirst(m[1])}?`;

  // "Records digitized" / "Decisions issued" / "Stop work orders rescinded"
  // — a noun phrase ending in a past-participle reads better rearranged.
  m = core.match(/^(.+?)\s+(issued|completed|digitized|designated|closed|resolved|installed|conducted|constructed|abated|removed|received|reported|dismissed|rescinded|rendered)$/i);
  if (m) return `How many ${lowerFirst(m[1])} were ${m[2].toLowerCase()}?`;

  if (indicator.measurementType === "TimeSpan") {
    return `How long is the ${lowerFirst(core)}?`;
  }

  if (indicator.measurementType === "Currency") {
    return `How much is the ${lowerFirst(core)}?`;
  }

  return upperFirst(`How many ${lowerFirst(core)} are there?`);
}
