import Link from "next/link";
import { isVolatile, targetGapBadgeLabel } from "@/lib/data/accountability";
import { getIndicatorNote } from "@/lib/data/getIndicators";
import { rollupAccountability } from "@/lib/data/rollup";
import { toPlainLanguageQuestion } from "@/lib/data/questionify";
import type { Indicator } from "@/lib/data/types";

const MAX_LISTED = 3;

function lowerFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/** A linked question, plus whatever real context is available — the researched cause if one exists, else the raw target gap. Never invents a reason. */
function IndicatorMention({ indicator, showGap }: { indicator: Indicator; showGap?: boolean }) {
  const note = getIndicatorNote(indicator.id);
  const gap = showGap ? targetGapBadgeLabel(indicator) : null;
  const detail = note?.oneLiner || (gap ? lowerFirst(gap) : null);
  return (
    <>
      <Link href={`/indicators/${indicator.id}`} className="underline">
        {toPlainLanguageQuestion(indicator)}
      </Link>
      {detail && ` (${detail})`}
    </>
  );
}

function mentionList(indicators: Indicator[], showGap?: boolean) {
  const shown = indicators.slice(0, MAX_LISTED);
  const remainder = indicators.length - shown.length;
  return (
    <>
      {shown.map((indicator, i) => (
        <span key={indicator.id}>
          {i > 0 && (i === shown.length - 1 && remainder === 0 ? ", and " : ", ")}
          <IndicatorMention indicator={indicator} showGap={showGap} />
        </span>
      ))}
      {remainder > 0 && `, and ${remainder} more`}
    </>
  );
}

/**
 * A narrative built only from rollup counts, each indicator's own
 * precomputed status/trend, and — where one exists — its researched note
 * (same auditability rule as accountabilitySummary, just aggregated and
 * interpreted at the agency level). The "encouraging/mixed/concerning"
 * framing is a deterministic read of the improving-vs-worsening ratio, not
 * free-text judgment, so it stays defensible: change the ratio, the framing
 * changes with it.
 */
export function AgencySummary({ agencyName, indicators }: { agencyName: string; indicators: Indicator[] }) {
  const rollup = rollupAccountability(indicators);
  const missed = indicators.filter((i) => i.onTargetStatus === "missed-target");
  const targetable = rollup.total - rollup.noTargetSet;

  // A volatile indicator's mechanical trend field (Theil-Sen slope) can say
  // "worsening" even when the real story is a stable series bouncing in a
  // narrow band — the same reason TrendBadge is suppressed for these on the
  // indicator page. Excluded from the trend counts here for the same reason,
  // and called out separately instead of folded into "declining."
  const volatile = indicators.filter((i) => isVolatile(i.series));
  const improving = indicators.filter((i) => !isVolatile(i.series) && i.trend === "improving");
  const worsening = indicators.filter((i) => !isVolatile(i.series) && i.trend === "worsening");
  const trendTotal = improving.length + worsening.length;

  let targetParagraph: React.ReactNode;
  if (targetable === 0) {
    targetParagraph = `${agencyName} doesn't have a numeric target set by the City for any of its ${rollup.total} critical indicators, so its performance here can only be judged by which way each one is heading, not whether it's hitting a goal.`;
  } else {
    const ratio = rollup.onTarget / targetable;
    const framing =
      ratio === 1
        ? "hitting the City's own target on every indicator that has one"
        : ratio >= 0.66
          ? `hitting the City's own target on most of what it tracks — ${rollup.onTarget} of ${targetable} indicators with a numeric goal`
          : ratio <= 0.34
            ? `falling short of the City's own target on most of what it tracks — only ${rollup.onTarget} of ${targetable} indicators with a numeric goal are hitting it`
            : `on mixed footing against its own targets — ${rollup.onTarget} of ${targetable} indicators with a numeric goal are hitting it`;
    targetParagraph = (
      <>
        {agencyName} is {framing}.{" "}
        {missed.length > 0 && (
          <>
            {missed.length === 1 ? "Its miss is on " : `Its misses are on `}
            {mentionList(missed, true)}.{" "}
          </>
        )}
        {rollup.noTargetSet > 0 &&
          `The City hasn't set a numeric target for its other ${rollup.noTargetSet} tracked ${rollup.noTargetSet === 1 ? "indicator" : "indicators"}, so ${rollup.noTargetSet === 1 ? "it" : "those"} can only be judged by direction of travel.`}
      </>
    );
  }

  let trendParagraph: React.ReactNode;
  if (trendTotal === 0) {
    trendParagraph = "There isn't enough multi-year data yet to say whether the department's indicators are trending up or down.";
  } else {
    const improveRatio = improving.length / trendTotal;
    const meaning =
      improveRatio >= 0.66
        ? "an encouraging sign — the department's operations appear to be strengthening across most of what it measures"
        : improveRatio <= 0.34
          ? "a concerning sign — more of the department's tracked indicators are heading the wrong way than the right one"
          : "a mixed picture, with close to as many indicators moving the wrong way as the right one";
    trendParagraph = (
      <>
        Looking at multi-year trends, {improving.length} of {trendTotal} measured indicators have moved toward improvement versus {worsening.length}{" "}
        toward decline — {meaning}.{worsening.length > 0 && <> The ones heading the wrong way: {mentionList(worsening)}.</>}
        {volatile.length > 0 && (
          <>
            {" "}
            {volatile.length} {volatile.length === 1 ? "indicator swings" : "indicators swing"} too much year to year for a simple trend label — see
            each one's own chart for the full picture.
          </>
        )}
      </>
    );
  }

  return (
    <div className="mt-6 rounded-xl border-2 p-5" style={{ borderColor: "var(--border-hairline)", background: "var(--surface-1)" }}>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {targetParagraph}
      </p>
      <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {trendParagraph}
      </p>
    </div>
  );
}
