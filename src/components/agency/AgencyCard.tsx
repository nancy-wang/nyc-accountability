import type { AgencyRef } from "@data/narrative/taxonomy";
import { effectiveTrend, latestPoint } from "@/lib/data/accountability";
import { getAgencyNarrative, getAgencySeal, getIndicatorNote, getIndicatorsByAgencyCodes } from "@/lib/data/getIndicators";
import { stripTrailingUnitParens } from "@/lib/data/questionify";
import { trendRollup } from "@/lib/data/rollup";
import type { Indicator } from "@/lib/data/types";
import { formatCompactValue } from "@/lib/format";
import { splitIntoSentences } from "@/lib/text";
import { AgencyCardFlip, type TopIndicator } from "./AgencyCardFlip";

// Generous raw-material cap on sentences pulled from the intro before
// picking the 2 best bullets from them — most agency intros are 2 sentences
// (history, then current function/impact), but a few (e.g. NYPD) have a real
// third sentence with genuine scale numbers that would otherwise be cut off
// before pickSummaryBullets ever sees it.
const MAX_INTRO_SENTENCES = 6;
const GENERIC_SEAL_PATH = "/seals/_nyc-generic.svg";

/**
 * A raw indicator name is precise but MMR-verbose ("Combined average
 * response time to X (FDNY dispatch and travel time only)"); the card has
 * no ellipsis-truncation (nothing should ever read as cut off), so this
 * trims the generic statistical lead-in and any remaining parenthetical
 * qualifiers stripTrailingUnitParens intentionally leaves alone for the
 * full question (real footnote-level detail, but more than a small card
 * has room for) — keeps names close to one line without losing the subject.
 */
function cardIndicatorLabel(name: string): string {
  let out = stripTrailingUnitParens(name).replace(/^(?:Combined\s+)?(?:Average|Median)\s+/i, "");
  for (;;) {
    const next = out.replace(/\s*\([^()]*\)\s*$/, "").trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * What percent of its own numeric target the agency has hit for this
 * indicator — >=100% means it's met or exceeded the goal, regardless of
 * whether the direction is "higher is better" or "lower is better" (a
 * "Down" indicator's ratio is inverted: target/actual, not actual/target,
 * so the two directions stay comparable on the same 100%-is-goal scale).
 * Built only from the same latestValue/target basis onTargetStatus already
 * uses, so the two never disagree. Null when it can't be computed cleanly
 * (missing data, zero target) rather than showing a nonsense percentage.
 */
function percentOfGoal(indicator: Indicator): number | null {
  const latest = latestPoint(indicator.series);
  if (!latest || latest.value == null || latest.targetCurrentFY == null || latest.targetCurrentFY === 0) return null;
  const ratio = indicator.desiredDirection === "Up" ? latest.value / latest.targetCurrentFY : latest.targetCurrentFY / latest.value;
  return Number.isFinite(ratio) ? ratio * 100 : null;
}

/**
 * Every indicator with a real numeric target — the card back is a "percent
 * of goal" progress list, which doesn't mean anything for an indicator the
 * City hasn't set a target for, but shows the full targetable set (not a
 * top-N cut) so the card is a complete scorecard, not a curated highlight
 * reel. Currently-missed targets lead (most card-worthy), then a researched
 * note (a real story beats a bare stat), same "note-first" instinct as
 * AgencySummary's rankBullets.
 */
function pickTargetIndicators(indicators: Indicator[]): Indicator[] {
  const withTarget = indicators.filter(
    (indicator) => (indicator.onTargetStatus === "on-target" || indicator.onTargetStatus === "missed-target") && percentOfGoal(indicator) != null
  );
  const priority = (indicator: Indicator) => {
    if (indicator.onTargetStatus === "missed-target") return 0;
    if (getIndicatorNote(indicator.id)) return 1;
    return 2;
  };
  return [...withTarget].sort((a, b) => priority(a) - priority(b));
}

export interface GoalDriver {
  text: string;
  tone: "positive" | "challenge";
}

/**
 * Real, sourced explanations for what's driving the agency's performance.
 * Principles (in order of priority when trimming to what's actually usable):
 *
 * 1. Every driver names one specific indicator with a real, researched
 *    "why" — a bare on-target/improving status is not a driver on its own,
 *    so an indicator without a note is skipped entirely (never free-text
 *    generation, never a filler sentence).
 * 2. Concise phrase, not a sentence — no "is hitting its target:" or "is
 *    trending in the right direction:" glue, no trailing period. Just the
 *    indicator label directly followed by the note, e.g. "mediation case
 *    completion time decreasing since a COVID-era case backlog cleared in
 *    FY23" rather than "Mediation case completion time is hitting its
 *    target: decreasing since a COVID-era case backlog cleared in FY23."
 * 3. The note itself must give an actual REASON, not just restate the
 *    trend or its duration — "decreasing over four straight years" says
 *    what happened, not why; a real driver names the cause ("...since a
 *    new dispatch system cut response times"). This is enforced by what
 *    gets researched into indicator-notes, not by this function — a note
 *    that only restates duration/direction is a research gap to fix at
 *    the source, not something to reword here.
 * 4. Returns 0-2 entries depending on what's actually been researched for
 *    this agency — no filler when nothing real exists to say.
 *
 * Three tiers, tried in order:
 *
 * 1. On-target indicators with a usable (non-excluded) note — the clearest
 *    "hitting its target, here's why" story.
 * 2. No on-target story exists: any indicator whose trend is genuinely
 *    improving, with a usable note.
 * 3. Neither exists: rather than leaving the card silent, surface the
 *    researched reason behind a missed target or worsening trend — framed
 *    as context (a staffing shortage, a budget cut, a demand surge), not
 *    as blame. This tier deliberately ignores excludeFromKeyDrivers, since
 *    that flag only guards against a negative story being spun as a false
 *    positive in tiers 1-2; here it's shown honestly as a challenge.
 *    On-target indicators are skipped in this tier (an on-target metric
 *    isn't a "challenge" even if its trend is drifting), unless the note
 *    was explicitly excluded from the positive tiers despite being
 *    on-target (e.g. still inside its target but trending the wrong way
 *    for a documented reason).
 */
function agencyGoalDrivers(indicators: Indicator[]): GoalDriver[] {
  const usable = (i: Indicator) => {
    const note = getIndicatorNote(i.id);
    return note && !note.excludeFromKeyDrivers ? note : null;
  };

  const onTargetWithNotes = indicators.filter((i) => i.onTargetStatus === "on-target" && usable(i));
  if (onTargetWithNotes.length > 0) {
    return onTargetWithNotes.slice(0, 2).map((indicator) => {
      const note = usable(indicator)!;
      return { text: `${cardIndicatorLabel(indicator.name)} ${lowerFirstChar(note.oneLiner)}`, tone: "positive" as const };
    });
  }

  const improving = indicators.find((i) => effectiveTrend(i, getIndicatorNote(i.id)) === "improving" && usable(i));
  if (improving) {
    const note = usable(improving)!;
    return [{ text: `${cardIndicatorLabel(improving.name)} ${lowerFirstChar(note.oneLiner)}`, tone: "positive" as const }];
  }

  const challengeCandidates = indicators.filter((i) => {
    const note = getIndicatorNote(i.id);
    if (!note) return false;
    return i.onTargetStatus !== "on-target" || note.excludeFromKeyDrivers === true;
  });
  if (challengeCandidates.length > 0) {
    return challengeCandidates.slice(0, 2).map((indicator) => {
      const note = getIndicatorNote(indicator.id)!;
      return { text: `${cardIndicatorLabel(indicator.name)} ${lowerFirstChar(note.oneLiner)}`, tone: "challenge" as const };
    });
  }

  return [];
}

function lowerFirstChar(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Reformats one real sentence into short scannable phrases for the card's
 * Data Summary list — pure reformatting of existing sourced prose (dropping
 * a redundant subject, splitting at real clause boundaries), never adds a
 * new claim.
 *
 * - Strips a leading subject that just restates the agency already named in
 *   the card header — its full name or a known code/acronym ("The FDNY now
 *   responds to..." -> "Now responds to...", "The NYPD is responsible for
 *   X..." -> "Responsible for X...") — since repeating it in every bullet is
 *   what makes a bullet read as a sentence instead of a phrase. Falls back to
 *   stripping a bare pronoun subject ("It provides..." -> "Provides...")
 *   when the sentence doesn't lead with the agency's own name.
 * - Splits at em dashes and semicolons (always real clause boundaries), and
 *   at commas followed by a space — unless the sentence contains an
 *   Oxford-comma enumeration ("...public safety, law enforcement, ... and
 *   emergency response roles"), where splitting mid-list would produce
 *   meaningless fragments ("law enforcement" alone as its own bullet), so
 *   the whole list stays one phrase.
 * - Always splits on ", and <is/are/was/were/runs/now/...>" first, before
 *   the enumeration check above — that specific pattern is a second
 *   independent clause ("...across the five boroughs, and is one of the
 *   largest fire departments in the world"), not a list item, so it's safe
 *   to split even when the rest of the sentence looks like an enumeration.
 */
function toConcisePhrases(sentence: string, candidateSubjects: string[]): string[] {
  const trimmed = sentence.trim().replace(/\.$/, "");
  const clauseParts = trimmed.split(/,\s+and\s+(?=(?:is|are|was|were|now|runs?|operates?|serves?|provides?|oversees?|manages?|has)\b)/i);

  return clauseParts.flatMap((part) => toConcisePhraseFragments(part.trim(), candidateSubjects));
}

function toConcisePhraseFragments(trimmed: string, candidateSubjects: string[]): string[] {
  const stripLeadingSubject = (fragment: string): string => {
    for (const candidate of candidateSubjects) {
      if (!candidate) continue;
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `^(?:the\\s+)?(?:new york city\\s+)?${escaped}(?:\\s*\\([A-Z0-9&-]{2,8}\\))?\\s+(?:(?:now|currently)\\s+)?(?:(?:is|was|are|were)\\s+)?`,
        "i"
      );
      const stripped = fragment.replace(re, "");
      if (stripped !== fragment) return stripped.charAt(0).toUpperCase() + stripped.slice(1);
    }
    const pronounStripped = fragment.replace(/^(?:it|this agency|the agency)\s+(?:(?:now|currently)\s+)?(?:(?:is|was|are|were)\s+)?/i, "");
    return pronounStripped.charAt(0).toUpperCase() + pronounStripped.slice(1);
  };

  const hasEnumeration = /,\s+(?:and|or)\s+\S/i.test(trimmed);
  const dashAndSemicolonSplit = trimmed
    .split(/\s*[—;]\s*/)
    .map((f) => f.trim())
    .filter(Boolean);
  // Also splitting on plain commas (but never a comma immediately before a
  // bare year, like "March 30, 1865" — that's a date, not a clause
  // boundary) gives shorter phrases for a simple declarative sentence, but
  // for a sentence with several appositive/subordinate clauses chained
  // together it produces a run of disconnected fragments that lose their
  // shared subject (worse than the original sentence). Only used when it
  // doesn't blow past a small fragment count, and never when the commas are
  // doing enumeration duty ("...public safety, law enforcement, ... and
  // emergency response roles").
  const commaSplit = trimmed
    .split(/\s*[—;]\s*|,\s+(?!\d{4}\b)/)
    .map((f) => f.trim())
    .filter(Boolean);
  const rawFragments = !hasEnumeration && commaSplit.length <= 3 ? commaSplit : dashAndSemicolonSplit;

  return rawFragments.map(stripLeadingSubject);
}

// Signals a sentence is describing the agency's current, ongoing operation
// rather than just its founding/origin story — every researched intro on
// this site leads with a history sentence ("Established in 1845...",
// "Traces its origins to 1953..."), which reads as neither "what it does"
// nor "its impact", so those get deprioritized in favor of sentences that
// actually describe the present.
const CURRENT_SIGNAL_RE =
  /\b(now|today|currently|current|is responsible for|are responsible for|provides?|collects?|operates?|stewards?|responds?\s+to|serves?|oversees?|runs?|delivers?|maintains?|investigates?|enforces?|represents?|supervises?|administers?|regulates?|protects?|performs?|manages?|licenses?|inspects?|monitors?|coordinates?|clears?|patrols?|patrolling)\b/i;
const FUNCTION_RE =
  /\b(responsible for|provides?|oversees?|enforces?|serves?|manages?|administers?|regulates?|protects?|operates?|performs?|responds?\s+to|investigates?|supervises?|delivers?|inspects?|licenses?|maintains?|promotes?|coordinates?|monitors?|collects?|stewards?|clears?|patrols?|patrolling)\b/i;

/**
 * Picks exactly 2 concise Data Summary bullets from an agency's researched
 * intro: one on what the agency actually does, one on its scale/impact —
 * never more, so the card stays scannable instead of relisting every clause
 * of the source prose.
 *
 * 1. Prefers sentences with a present-tense operational signal over pure
 *    history ("Established in 1845..." on its own says nothing about
 *    function or impact); falls back to using every sentence only when none
 *    of them describe current operations (a handful of agencies' researched
 *    intros are entirely origin-story, in which case there's no "what it
 *    does" fact to pull yet).
 * 2. "What it does": the first fragment naming a concrete function
 *    (matches FUNCTION_RE), or just the first fragment if none do.
 * 3. "Impact": the first remaining fragment with a real number in it (scale
 *    reads better than a bare description); falls back to the next
 *    remaining fragment, or nothing if only one fragment exists at all.
 */
function pickSummaryBullets(sentences: string[], candidateSubjects: string[]): string[] {
  const currentSentences = sentences.filter((s) => CURRENT_SIGNAL_RE.test(s));
  const pool = currentSentences.length > 0 ? currentSentences : sentences;
  const fragments = pool.flatMap((s) => toConcisePhrases(s, candidateSubjects));
  if (fragments.length === 0) return [];
  if (fragments.length === 1) return fragments;

  const whatItDoes = fragments.find((f) => FUNCTION_RE.test(f)) ?? fragments[0];
  const impact = fragments.find((f) => f !== whatItDoes && /\d/.test(f)) ?? fragments.find((f) => f !== whatItDoes) ?? null;

  return impact ? [whatItDoes, impact] : [whatItDoes];
}

/** BEAT/MET/MISS tier for the scorecard table — a bare on-target/missed-target split loses the "comfortably exceeding" case a sports-card "BEAT" badge is meant to flag. */
function resultTier(percent: number): "beat" | "met" | "miss" {
  if (percent >= 110) return "beat";
  if (percent >= 100) return "met";
  return "miss";
}

/**
 * Fetches and shapes everything AgencyCardFlip needs, then hands off to it.
 * Kept as a plain server component (no "use client") specifically so the
 * filesystem-backed lookups here (notes, narrative, seal manifest) never
 * end up needing to run in the browser — see AgencyCardFlip's own comment.
 */
export function AgencyCard({
  agency,
  topicTitle,
  cardIndex,
  cardTotal,
}: {
  agency: AgencyRef;
  topicTitle: string;
  cardIndex: number;
  cardTotal: number;
}) {
  const indicators = getIndicatorsByAgencyCodes(agency.codes);
  if (indicators.length === 0) return null;

  const narrative = getAgencyNarrative(agency.slug);
  const seal = getAgencySeal(agency.slug);
  const trend = trendRollup(indicators);

  const topIndicators: TopIndicator[] = pickTargetIndicators(indicators).map((indicator) => {
    const latest = latestPoint(indicator.series)!;
    const percent = percentOfGoal(indicator)!;
    return {
      id: indicator.id,
      name: cardIndicatorLabel(indicator.name),
      status: indicator.onTargetStatus,
      percent,
      result: resultTier(percent),
      actualText: formatCompactValue(latest.value, indicator.measurementType, indicator.name),
      targetText: formatCompactValue(latest.targetCurrentFY, indicator.measurementType, indicator.name),
    };
  });

  const introSubjects = [agency.name, ...agency.codes];
  const pickedBullets = narrative?.cardHighlights
    ? [narrative.cardHighlights.function, narrative.cardHighlights.scale]
    : narrative?.intro
      ? pickSummaryBullets(splitIntoSentences(narrative.intro, MAX_INTRO_SENTENCES), introSubjects)
      : [];
  const introBullets = pickedBullets.length > 0 ? pickedBullets : ["A summary of this agency's mission hasn't been researched yet."];
  // The front card's tagline is always the agency's real-world reach/impact
  // (never its function) — pulled from the researched cardHighlights.scale
  // field directly rather than positionally off introBullets, so it can't
  // silently drift to a function-flavored bullet for an agency that falls
  // back to the algorithmic picker.
  const impactStat = narrative?.cardHighlights?.scale ?? introBullets[1] ?? introBullets[0] ?? "";

  const goalDrivers = agencyGoalDrivers(indicators);

  return (
    <AgencyCardFlip
      agencyName={agency.name}
      agencySlug={agency.slug}
      sealPath={seal?.sealPath ?? GENERIC_SEAL_PATH}
      topicTitle={topicTitle}
      introBullets={introBullets}
      impactStat={impactStat}
      goalDrivers={goalDrivers}
      trend={trend}
      topIndicators={topIndicators}
      indicatorCount={indicators.length}
      cardIndex={cardIndex}
      cardTotal={cardTotal}
    />
  );
}
