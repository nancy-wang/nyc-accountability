import type { AgencyRef } from "@data/narrative/taxonomy";
import { effectiveTrend, latestPoint } from "@/lib/data/accountability";
import { getAgencyNarrative, getAgencySeal, getIndicatorNote, getIndicatorsByAgencyCodes } from "@/lib/data/getIndicators";
import { stripTrailingUnitParens } from "@/lib/data/questionify";
import { rollupAccountability, trendRollup } from "@/lib/data/rollup";
import type { Indicator } from "@/lib/data/types";
import { formatCompactValue, formatIndicatorValue } from "@/lib/format";
import { splitIntoSentences } from "@/lib/text";
import { AgencyCardFlip, type TopIndicator } from "./AgencyCardFlip";

const MAX_TOP_INDICATORS = 3;
const YEARS_SHOWN = 5;
const MAX_INTRO_BULLETS = 2;
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
 * A currently-missed target is the most card-worthy fact about an
 * indicator; a researched note is the next most interesting (there's a
 * real story to point to); on-target beats an indicator with neither.
 * Same "note-first" instinct as AgencySummary's rankBullets, adapted to a
 * single flat list since the card doesn't have room for separate
 * working/worsening sections.
 */
function pickTopIndicators(indicators: Indicator[]): Indicator[] {
  const priority = (indicator: Indicator) => {
    if (indicator.onTargetStatus === "missed-target") return 0;
    if (getIndicatorNote(indicator.id)) return 1;
    if (indicator.onTargetStatus === "on-target") return 2;
    return 3;
  };
  return [...indicators].sort((a, b) => priority(a) - priority(b)).slice(0, MAX_TOP_INDICATORS);
}

/** An indicator worth bragging about: currently on-target, or trending the right way per the same judgment call used elsewhere (see effectiveTrend). */
function pickBestWorkingIndicator(indicators: Indicator[]): Indicator | null {
  const working = indicators.filter((indicator) => {
    if (indicator.onTargetStatus === "on-target") return true;
    if (indicator.onTargetStatus === "missed-target") return false;
    return effectiveTrend(indicator, getIndicatorNote(indicator.id)) === "improving";
  });
  if (working.length === 0) return null;
  // Note-first, stable — a real, cited explanation beats a bare stat.
  return [...working].sort((a, b) => Number(getIndicatorNote(a.id) == null) - Number(getIndicatorNote(b.id) == null))[0];
}

/**
 * A deterministic 1-2 sentence "what's going well" for the card, built only
 * from precomputed status/trend fields and a researched note's oneLiner
 * where one exists — never free-text generation, same auditability rule as
 * accountabilitySummary(). Falls back to an honest "nothing stands out" line
 * rather than manufacturing a positive when the data doesn't support one.
 */
function agencyStandoutSummary(indicators: Indicator[]): string {
  const rollup = rollupAccountability(indicators);
  const targetable = rollup.total - rollup.noTargetSet;

  const targetClause =
    targetable > 0 && rollup.onTarget > 0 ? `Hits the City's own target on ${rollup.onTarget} of ${targetable} indicators with a numeric goal.` : null;

  const best = pickBestWorkingIndicator(indicators);
  const bestClause = (() => {
    if (!best) return null;
    const latest = latestPoint(best.series);
    const valueText = formatIndicatorValue(latest?.value ?? null, best.measurementType, best.name);
    const note = getIndicatorNote(best.id);
    return note?.oneLiner
      ? `${cardIndicatorLabel(best.name)} is a bright spot: ${lowerFirstChar(note.oneLiner)}.`
      : `${cardIndicatorLabel(best.name)} is trending well, now at ${valueText}.`;
  })();

  const clauses = [targetClause, bestClause].filter((c): c is string => c != null);
  return clauses.length > 0 ? clauses.join(" ") : "Nothing stands out as a clear win right now — see the full page for the complete picture.";
}

function lowerFirstChar(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Fetches and shapes everything AgencyCardFlip needs, then hands off to it.
 * Kept as a plain server component (no "use client") specifically so the
 * filesystem-backed lookups here (notes, narrative, seal manifest) never
 * end up needing to run in the browser — see AgencyCardFlip's own comment.
 */
export function AgencyCard({ agency, topicTitle }: { agency: AgencyRef; topicTitle: string }) {
  const indicators = getIndicatorsByAgencyCodes(agency.codes);
  if (indicators.length === 0) return null;

  const narrative = getAgencyNarrative(agency.slug);
  const seal = getAgencySeal(agency.slug);
  const trend = trendRollup(indicators);

  const topIndicators: TopIndicator[] = pickTopIndicators(indicators).map((indicator) => {
    const note = getIndicatorNote(indicator.id);
    const years = [...indicator.series]
      .sort((a, b) => a.fiscalYear - b.fiscalYear)
      .slice(-YEARS_SHOWN)
      .map((point) => {
        const isProjected = point.isPartialYear && point.projectedValue != null;
        const value = isProjected ? point.projectedValue : point.value;
        return {
          fiscalYear: point.fiscalYear,
          valueText: formatCompactValue(value, indicator.measurementType, indicator.name),
          isProjected,
        };
      });

    return {
      id: indicator.id,
      name: cardIndicatorLabel(indicator.name),
      status: indicator.onTargetStatus,
      trend: effectiveTrend(indicator, note),
      years,
    };
  });

  const introBullets = narrative?.intro
    ? splitIntoSentences(narrative.intro, MAX_INTRO_BULLETS)
    : ["A summary of this agency's mission hasn't been researched yet."];

  const standoutSummary = agencyStandoutSummary(indicators);

  return (
    <AgencyCardFlip
      agencyName={agency.name}
      agencySlug={agency.slug}
      sealPath={seal?.sealPath ?? GENERIC_SEAL_PATH}
      topicTitle={topicTitle}
      introBullets={introBullets}
      standoutSummary={standoutSummary}
      trend={trend}
      topIndicators={topIndicators}
    />
  );
}
