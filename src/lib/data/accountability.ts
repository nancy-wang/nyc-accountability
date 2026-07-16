import { formatFiscalYear } from "../format";
import type { DesiredDirection, Indicator, IndicatorPoint, OnTargetStatus, TrendDirection } from "./types";

export function onTargetStatus(
  latestValue: number | null,
  target: number | null,
  direction: DesiredDirection
): OnTargetStatus {
  if (latestValue == null) return "no-data";
  if (target == null) return "no-target-set";
  return direction === "Up" ? (latestValue >= target ? "on-target" : "missed-target") : latestValue <= target ? "on-target" : "missed-target";
}

/**
 * Median of all pairwise slopes (Theil-Sen estimator) rather than ordinary
 * least-squares. OLS lets a single outlier year dominate the fitted slope —
 * e.g. one anomalous spike in an otherwise flat-to-declining series can flip
 * the whole trend label. Theil-Sen's breakdown point is much higher: an
 * outlier only pollutes the handful of pairwise slopes that include it, and
 * the median discounts them.
 */
function theilSenSlope(points: Array<{ x: number; y: number }>): number {
  const slopes: number[] = [];
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const dx = points[j].x - points[i].x;
      if (dx !== 0) slopes.push((points[j].y - points[i].y) / dx);
    }
  }
  if (slopes.length === 0) return 0;
  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  return slopes.length % 2 === 0 ? (slopes[mid - 1] + slopes[mid]) / 2 : slopes[mid];
}

/**
 * Fits a robust trend across every available fiscal year in the lookback
 * window (not just the latest year vs. the one before it), so a real
 * multi-year trajectory — not a single noisy year in either direction — is
 * what "improving"/"worsening" means now that charts show up to 5 years.
 */
export function trendDirection(series: IndicatorPoint[], direction: DesiredDirection): TrendDirection {
  const points = series.filter((p) => p.value != null).sort((a, b) => a.fiscalYear - b.fiscalYear);
  if (points.length < 2) return "insufficient-data";

  const slope = theilSenSlope(points.map((p) => ({ x: p.fiscalYear, y: p.value! })));
  if (slope === 0) return "flat";
  const improved = direction === "Up" ? slope > 0 : slope < 0;
  return improved ? "improving" : "worsening";
}

/** Fiscal-year span the trend was computed over, for labels like "worsening over 4 years." */
export function trendSpanFiscalYears(series: IndicatorPoint[]): number {
  const points = series.filter((p) => p.value != null).sort((a, b) => a.fiscalYear - b.fiscalYear);
  if (points.length < 2) return 0;
  return points[points.length - 1].fiscalYear - points[0].fiscalYear;
}

export function latestPoint(series: IndicatorPoint[]): IndicatorPoint | undefined {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i].value != null) return series[i];
  }
  return undefined;
}

/**
 * A deterministic sentence built only from the precomputed status/trend fields
 * (never free-text generation), so the accountability framing stays auditable —
 * every claim traces to onTargetStatus/trendDirection, which trace to the source data.
 */
export function accountabilitySummary(indicator: Indicator): string {
  const latest = latestPoint(indicator.series);
  const fy = latest ? formatFiscalYear(latest.fiscalYear) : null;
  const span = trendSpanFiscalYears(indicator.series);
  const years = `${span} year${span === 1 ? "" : "s"}`;

  const statusClause: Record<OnTargetStatus, string> = {
    "missed-target": fy ? `${fy} missed the City's own target for this indicator` : "This indicator is missing its target",
    "on-target": fy ? `${fy} met the City's own target for this indicator` : "This indicator is meeting its target",
    "no-target-set": "The City has not set a numeric target for this indicator",
    "no-data": "No recent data has been reported for this indicator",
  };

  // Conjunction flips between "and" (trend reinforces the status) and "though"
  // (trend cuts against it) so the sentence doesn't imply false reassurance or
  // false alarm — e.g. "missed target, though it has improved" reads very
  // differently from "missed target, and it is trending in the wrong direction."
  const trendPhrase: Record<TrendDirection, string> = {
    worsening: `it has trended in the wrong direction over the past ${years} of reported data`,
    improving: `it has trended toward improvement over the past ${years} of reported data`,
    flat: `it has stayed essentially flat over the past ${years} of reported data`,
    "insufficient-data": "",
  };
  const reinforces: Record<OnTargetStatus, Partial<Record<TrendDirection, boolean>>> = {
    "missed-target": { worsening: true, improving: false, flat: true },
    "on-target": { worsening: false, improving: true, flat: true },
    "no-target-set": { worsening: true, improving: true, flat: true },
    "no-data": { worsening: true, improving: true, flat: true },
  };

  const phrase = trendPhrase[indicator.trend];
  if (!phrase) return `${statusClause[indicator.onTargetStatus]}.`;

  const conjunction = reinforces[indicator.onTargetStatus][indicator.trend] ? "and" : "though";
  return `${statusClause[indicator.onTargetStatus]}, ${conjunction} ${phrase}.`;
}
