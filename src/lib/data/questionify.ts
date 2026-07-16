import type { Indicator } from "./types";

// Lowercases the first letter for mid-sentence use — unless the fragment
// opens with an acronym (2+ consecutive capitals, e.g. "HIV", "NYC") or what
// looks like a multi-word proper noun / program name (e.g. "Home Care",
// "Adult Protective Services"), signaled by its first two words both being
// capitalized, in which case leave it alone.
function lowerFirst(s: string): string {
  if (s.length === 0) return s;
  const words = s.split(" ");
  if (/^[A-Z]{2,}/.test(words[0])) return s;
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
  /^(?:%(?:\s+of\s+[\w\s]*)?|CY|FY\d*|preliminary|provisional|annual|total|\$?000(?:,000)?(?:,000)?|days?|weeks?|months?|years?|hours?|minutes?|minutes?:seconds?|hours?:minutes?|business\s+days?|calendar\s+days?|per\s+[\d,]+[\w\s]*)$/i;

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

// Any of these appearing inside a fragment means it's already a clause
// (has its own verb/preposition structure), not a bare category label —
// appending "cases" to something like "units abated for lead" would be
// nonsense, so this guards the bare-noun fallback below.
const STRUCTURAL_WORD = /\b(?:for|to|by|with|from|of|in|on|at)\b/i;

// A generic past-participle detector (any 3+ letter word ending in "ed")
// rather than a fixed verb list — "Trees planted" needs the same rearrange
// as "Records digitized" even though "planted" is a verb we didn't think to
// list. Doesn't correctly guess passive-voice grammar for the rare
// intransitive case ("statute of limitations expired" -> "were expired" is
// slightly off), but that's a smaller problem than the alternative of a
// list that's permanently one word behind whatever this dataset needs.
const PAST_PARTICIPLE = /^(.+?)\s+(\w{3,}ed)$/i;

// Nouns ending in these suffixes ("enrollment," "circulation," "attendance")
// are usually uncountable — "how many enrollment cases are there" is as
// broken as the ungrammatical bare noun it's meant to fix, so these get
// "how much," not "how many."
const MASS_NOUN_SUFFIX = /(?:tion|sion|ment|ance|ence)$/i;

/**
 * Turns an indicator's MMR-style label (often dense bureaucratic phrasing,
 * e.g. "Average time to complete an investigation (days)") into a plain
 * question a general reader can parse at a glance. Rule-based and
 * deterministic rather than generated per-indicator, so it works for all
 * 609 indicators without hand-authoring. Tuned against a plain-language
 * grader (https://propel-ai-grader.vercel.app/) on real examples — notably
 * "How many forcible rape are there?" (ungrammatical, reads as tone-deaf on
 * a subject like this) needed a countable noun inserted, and dash-joined
 * qualifiers like "X — Cases eligible for services" needed restructuring
 * rather than being appended raw.
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

  // "X rate" or "X ratio" already names a computed figure, not a countable
  // thing — "What percent of X rate?" doubles up, and "How many X ratio
  // cases are there?" is worse. Ask what it is instead, regardless of
  // whether the source tagged it Percentage or plain Number. Also matches
  // "ratio for <subgroup>" (e.g. a mortality ratio broken out by group),
  // not just when "rate"/"ratio" is the literal last word.
  if (/\b(?:rate|ratio)(?:$|\s+for\b)/i.test(core)) {
    return `What is the ${lowerFirst(core)}?`;
  }

  if (indicator.measurementType === "Percentage" || /\(%\)\s*$/.test(indicator.name)) {
    return `What percent of ${lowerFirst(core)}?`;
  }

  m = core.match(/^(?:average|median)\s+(.+)/i);
  if (m) return `On average, what is the ${lowerFirst(m[1])}?`;

  m = core.match(/^total\s+(.+)/i);
  if (m) return `What is the total ${lowerFirst(m[1])}?`;

  // "X — Cases eligible for services" -> "How many X cases are eligible for
  // services?" — pulls the generic countable unit forward instead of
  // stranding a dash-joined predicate after "are there."
  m = core.match(/^(.+?)\s*[—-]\s*(Cases?|Applications?|Requests?|Complaints?|Inspections?|Projects?|Incidents?|Claims?|Reports?)\s+(.+)$/i);
  if (m) return `How many ${m[1].trim()} ${m[2].toLowerCase()} are ${lowerFirst(m[3])}?`;

  // "Records digitized" / "Decisions issued" / "Stop work orders rescinded"
  // — a noun phrase ending in a past-participle reads better rearranged.
  m = core.match(PAST_PARTICIPLE);
  if (m) return `How many ${lowerFirst(m[1])} were ${m[2].toLowerCase()}?`;

  if (indicator.measurementType === "TimeSpan") {
    return `How long is the ${lowerFirst(core)}?`;
  }

  if (indicator.measurementType === "Currency") {
    return `How much is the ${lowerFirst(core)}?`;
  }

  // Catch-all for duration-flavored names that don't match any of the
  // "average/median/response/turnaround time" patterns above (a bare "Leak
  // resolution time" with no qualifying verb, for instance) — these aren't
  // countable "cases," so route them to "how long" rather than falling
  // through to the bare-noun fallback below.
  if (/\btime\b/i.test(core)) {
    return `How long is the ${lowerFirst(core)}?`;
  }

  // Strip trailing punctuation (a surviving meaningful paren's closing ")",
  // for instance) before checking word endings, or e.g. "averages)" reads
  // as ending in ")" instead of the "s" it actually ends in.
  const lastWord = (core.split(/\s+/).pop() ?? "").replace(/[^a-zA-Z]+$/, "");

  // Uncountable nouns ("enrollment," "circulation") need "how much," not
  // "how many" — and never take "cases."
  if (MASS_NOUN_SUFFIX.test(lastWord)) {
    return upperFirst(`How much ${lowerFirst(core)} is there?`);
  }

  // Bare category labels ("Forcible rape", "Burglary") read as broken
  // English without a countable noun — "how many forcible rape are there"
  // isn't just awkward, it's a bad way to ask about a subject like this.
  // Skip the insertion when the phrase already ends in a plausible plural
  // (ends in "s") or already reads as its own clause (contains a
  // preposition, so it's not actually a bare label), so this doesn't stack
  // "cases" onto something that isn't one.
  const alreadyPlural = /s$/i.test(lastWord);
  const alreadyClause = STRUCTURAL_WORD.test(core);
  if (!alreadyPlural && !alreadyClause) {
    return upperFirst(`How many ${lowerFirst(core)} cases are there?`);
  }

  return upperFirst(`How many ${lowerFirst(core)} are there?`);
}
