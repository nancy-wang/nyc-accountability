import { isVolatile } from "./accountability";
import type { Indicator } from "./types";

export interface AccountabilityRollup {
  total: number;
  missedTarget: number;
  onTarget: number;
  noTargetSet: number;
  worsening: number;
  improving: number;
}

export function rollupAccountability(indicators: Indicator[]): AccountabilityRollup {
  const rollup: AccountabilityRollup = { total: indicators.length, missedTarget: 0, onTarget: 0, noTargetSet: 0, worsening: 0, improving: 0 };
  for (const indicator of indicators) {
    if (indicator.onTargetStatus === "missed-target") rollup.missedTarget += 1;
    if (indicator.onTargetStatus === "on-target") rollup.onTarget += 1;
    if (indicator.onTargetStatus === "no-target-set" || indicator.onTargetStatus === "no-data") rollup.noTargetSet += 1;
    if (indicator.trend === "worsening") rollup.worsening += 1;
    if (indicator.trend === "improving") rollup.improving += 1;
  }
  return rollup;
}

export interface TrendRollup {
  total: number;
  improving: number;
  worsening: number;
  /** Flat, insufficient-data, or volatile — lumped together as "no clear trend" rather than split into a 4th bucket. */
  other: number;
}

/**
 * Same improving/worsening split as rollupAccountability, except volatile
 * indicators are excluded from both counts (into "other") rather than
 * counted at face value — a volatile series' mechanical trend field can say
 * "worsening" while the real story is a stable series bouncing in a band,
 * the same reason TrendBadge is suppressed for these elsewhere.
 */
export function trendRollup(indicators: Indicator[]): TrendRollup {
  let improving = 0;
  let worsening = 0;
  for (const indicator of indicators) {
    if (isVolatile(indicator.series)) continue;
    if (indicator.trend === "improving") improving += 1;
    else if (indicator.trend === "worsening") worsening += 1;
  }
  return { total: indicators.length, improving, worsening, other: indicators.length - improving - worsening };
}
