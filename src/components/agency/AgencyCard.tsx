import type { AgencyRef } from "@data/narrative/taxonomy";
import { latestPoint } from "@/lib/data/accountability";
import { getAgencyNarrative, getAgencySeal, getIndicatorNote, getIndicatorsByAgencyCodes } from "@/lib/data/getIndicators";
import { toPlainLanguageQuestion } from "@/lib/data/questionify";
import { trendRollup } from "@/lib/data/rollup";
import type { Indicator } from "@/lib/data/types";
import { formatIndicatorValue } from "@/lib/format";
import { AgencyCardFlip, type TopIndicator } from "./AgencyCardFlip";

const MAX_TOP_INDICATORS = 4;
const GENERIC_SEAL_PATH = "/seals/_nyc-generic.svg";

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

/**
 * Fetches and shapes everything AgencyCardFlip needs, then hands off to it.
 * Kept as a plain server component (no "use client") specifically so the
 * filesystem-backed lookups here (notes, narrative, seal manifest) never
 * end up needing to run in the browser — see AgencyCardFlip's own comment.
 */
export function AgencyCard({ agency }: { agency: AgencyRef }) {
  const indicators = getIndicatorsByAgencyCodes(agency.codes);
  if (indicators.length === 0) return null;

  const narrative = getAgencyNarrative(agency.slug);
  const seal = getAgencySeal(agency.slug);
  const trend = trendRollup(indicators);

  const topIndicators: TopIndicator[] = pickTopIndicators(indicators).map((indicator) => {
    const latest = latestPoint(indicator.series);
    return {
      id: indicator.id,
      question: toPlainLanguageQuestion(indicator),
      valueText: formatIndicatorValue(latest?.value ?? null, indicator.measurementType, indicator.name),
      status: indicator.onTargetStatus,
    };
  });

  return (
    <AgencyCardFlip
      agencyName={agency.name}
      agencySlug={agency.slug}
      sealPath={seal?.sealPath ?? GENERIC_SEAL_PATH}
      indicatorCount={indicators.length}
      intro={narrative?.intro ?? null}
      trend={trend}
      topIndicators={topIndicators}
    />
  );
}
