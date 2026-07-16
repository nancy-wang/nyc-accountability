import Link from "next/link";
import { effectiveTrend, isVolatile, latestPoint, targetGapBadgeLabel } from "@/lib/data/accountability";
import { getIndicatorNote } from "@/lib/data/getIndicators";
import { rollupAccountability, trendRollup } from "@/lib/data/rollup";
import { toPlainLanguageQuestion } from "@/lib/data/questionify";
import type { Indicator } from "@/lib/data/types";
import { formatIndicatorValue } from "@/lib/format";

const MAX_BULLETS = 6;

function lowerFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Sorts every indicator into "working" or "getting worse," or leaves it out
 * of both when neither applies. Target status wins over trend when both are
 * known — an indicator currently missing its target is the headline concern
 * even if its multi-year trend happens to be improving, and vice versa.
 * Falls back to effectiveTrend() otherwise, which uses a researched note's
 * resolved direction for a volatile indicator when one exists (see
 * effectiveTrend) rather than a mechanical trend field that isn't a
 * trustworthy "better" or "worse" signal on its own for a series that's
 * really just bouncing in a band.
 */
function classify(indicators: Indicator[]): { working: Indicator[]; worsening: Indicator[] } {
  const working: Indicator[] = [];
  const worsening: Indicator[] = [];
  for (const indicator of indicators) {
    if (indicator.onTargetStatus === "missed-target") {
      worsening.push(indicator);
    } else if (indicator.onTargetStatus === "on-target") {
      working.push(indicator);
    } else {
      const trend = effectiveTrend(indicator, getIndicatorNote(indicator.id));
      if (trend === "improving") working.push(indicator);
      else if (trend === "worsening") worsening.push(indicator);
    }
  }
  return { working, worsening };
}

function Bullet({ indicator }: { indicator: Indicator }) {
  const note = getIndicatorNote(indicator.id);
  const gap = targetGapBadgeLabel(indicator);
  const detail = note?.oneLiner || (gap ? lowerFirst(gap) : null);
  const latest = latestPoint(indicator.series);
  const valueText = formatIndicatorValue(latest?.value ?? null, indicator.measurementType, indicator.name);

  return (
    <li>
      <Link href={`/indicators/${indicator.id}`} className="underline">
        {toPlainLanguageQuestion(indicator)}
      </Link>
      {": "}
      {valueText}
      {detail && <span style={{ color: "var(--text-muted)" }}> — {detail}</span>}
    </li>
  );
}

function Section({ title, indicators, emptyText }: { title: string; indicators: Indicator[]; emptyText: string }) {
  const shown = indicators.slice(0, MAX_BULLETS);
  const remainder = indicators.length - shown.length;

  return (
    <div>
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      {indicators.length === 0 ? (
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          {emptyText}
        </p>
      ) : (
        <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {shown.map((indicator) => (
            <Bullet key={indicator.id} indicator={indicator} />
          ))}
          {remainder > 0 && <li style={{ color: "var(--text-muted)" }}>and {remainder} more below</li>}
        </ul>
      )}
    </div>
  );
}

/**
 * A narrative built only from rollup counts, each indicator's own
 * precomputed status/trend, and — where one exists — its researched note.
 * Leads with a short scorecard sentence, then splits the specific
 * indicators driving that scorecard into two scannable lists, rather than
 * one dense paragraph — same underlying, auditable data, easier to read.
 */
export function AgencySummary({ agencyName, indicators }: { agencyName: string; indicators: Indicator[] }) {
  const rollup = rollupAccountability(indicators);
  const targetable = rollup.total - rollup.noTargetSet;

  // Only counts volatile indicators a researched note *hasn't* resolved a
  // direction for — one that has is no longer "too much to call a trend,"
  // it's already been called, and shows up in improvingCount/worseningCount
  // instead.
  const volatileCount = indicators.filter((i) => isVolatile(i.series) && effectiveTrend(i, getIndicatorNote(i.id)) === "insufficient-data").length;
  const { improving: improvingCount, worsening: worseningCount } = trendRollup(indicators);
  const trendTotal = improvingCount + worseningCount;

  const targetClause =
    targetable === 0
      ? `${agencyName} doesn't have a numeric target set by the City for any of its ${rollup.total} critical indicators`
      : rollup.onTarget === targetable
        ? `${agencyName} is hitting the City's own target on all ${targetable} indicators that have one`
        : rollup.onTarget / targetable <= 0.34
          ? `${agencyName} is falling short of the City's own target on most of what it tracks (${rollup.onTarget} of ${targetable})`
          : `${agencyName} is hitting the City's own target on ${rollup.onTarget} of ${targetable} indicators with a numeric goal`;

  const trendClause =
    trendTotal === 0
      ? "there isn't enough multi-year data yet to say whether it's trending up or down"
      : improvingCount / trendTotal >= 0.66
        ? "its overall trajectory is encouraging, with most measured indicators trending toward improvement"
        : improvingCount / trendTotal <= 0.34
          ? "its overall trajectory is concerning, with more indicators heading the wrong way than the right one"
          : "its overall trajectory is mixed, with close to as many indicators improving as declining";

  const { working, worsening } = classify(indicators);

  return (
    <div className="mt-6 rounded-xl border-2 p-5" style={{ borderColor: "var(--border-hairline)", background: "var(--surface-1)" }}>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {targetClause}, and {trendClause}
        {volatileCount > 0 &&
          ` (${volatileCount} ${volatileCount === 1 ? "indicator swings" : "indicators swing"} too much year to year for a simple trend label)`}
        .
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Section title="What's working" indicators={working} emptyText="Nothing stands out as a clear win right now." />
        <Section title="What's getting worse" indicators={worsening} emptyText="Nothing stands out as a clear problem right now." />
      </div>
    </div>
  );
}
