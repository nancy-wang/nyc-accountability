import Link from "next/link";
import { rollupAccountability } from "@/lib/data/rollup";
import { toPlainLanguageQuestion } from "@/lib/data/questionify";
import type { Indicator } from "@/lib/data/types";

const MAX_LISTED = 6;

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function linkedList(indicators: Indicator[]) {
  const shown = indicators.slice(0, MAX_LISTED);
  const remainder = indicators.length - shown.length;
  return (
    <>
      {shown.map((indicator, i) => (
        <span key={indicator.id}>
          {i > 0 && ", "}
          <Link href={`/indicators/${indicator.id}`} className="underline">
            {toPlainLanguageQuestion(indicator)}
          </Link>
        </span>
      ))}
      {remainder > 0 && ` and ${remainder} more`}
    </>
  );
}

/**
 * A deterministic, agency-wide narrative built only from rollup counts and
 * the indicators' own precomputed status/trend fields — same auditability
 * rule as accountabilitySummary() for a single indicator, just aggregated.
 * Never free-text generation, so every claim here traces back to real data.
 */
export function AgencySummary({ agencyName, indicators }: { agencyName: string; indicators: Indicator[] }) {
  const rollup = rollupAccountability(indicators);
  const missed = indicators.filter((i) => i.onTargetStatus === "missed-target");
  const flatOrInsufficient = rollup.total - rollup.worsening - rollup.improving;
  // Indicators with no numeric target can't be scored "on target," so they're
  // excluded from that ratio's denominator — counting them as failures would
  // misstate indicators the City simply hasn't set a target for as misses.
  const targetable = rollup.total - rollup.noTargetSet;

  const targetSentence =
    targetable === 0
      ? `None of ${agencyName}'s ${rollup.total} critical indicators have a numeric target set by the City, so on-target status can't be assessed for any of them.`
      : `${agencyName} is meeting its own target on ${rollup.onTarget} of ${targetable} critical indicators that have a numeric target set.`;

  const trendSentence = `Looking at multi-year trends, ${rollup.improving} ${pluralize(rollup.improving, "indicator has", "indicators have")} moved toward improvement, ${rollup.worsening} toward decline, and ${flatOrInsufficient} ${pluralize(flatOrInsufficient, "has", "have")} stayed flat or don't have enough data for a trend.`;

  return (
    <div className="mt-6 rounded-xl border-2 p-5" style={{ borderColor: "var(--border-hairline)", background: "var(--surface-1)" }}>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {targetSentence}
        {rollup.missedTarget > 0 && (
          <>
            {" "}
            It is missing target on {rollup.missedTarget}: {linkedList(missed)}.
          </>
        )}
        {targetable > 0 && rollup.noTargetSet > 0 && (
          <>
            {" "}
            {rollup.noTargetSet} more {pluralize(rollup.noTargetSet, "has", "have")} no numeric target set by the City.
          </>
        )}
      </p>
      <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {trendSentence}
      </p>
    </div>
  );
}
