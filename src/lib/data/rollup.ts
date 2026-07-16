import type { Indicator } from "./types";

export interface AccountabilityRollup {
  total: number;
  missedTarget: number;
  onTarget: number;
  noTargetSet: number;
  worsening: number;
}

export function rollupAccountability(indicators: Indicator[]): AccountabilityRollup {
  const rollup: AccountabilityRollup = { total: indicators.length, missedTarget: 0, onTarget: 0, noTargetSet: 0, worsening: 0 };
  for (const indicator of indicators) {
    if (indicator.onTargetStatus === "missed-target") rollup.missedTarget += 1;
    if (indicator.onTargetStatus === "on-target") rollup.onTarget += 1;
    if (indicator.onTargetStatus === "no-target-set" || indicator.onTargetStatus === "no-data") rollup.noTargetSet += 1;
    if (indicator.trend === "worsening") rollup.worsening += 1;
  }
  return rollup;
}

/** Worst-status-first ordering for the accountability framing: misses and worsening trends surface before successes. */
export function sortWorstFirst(indicators: Indicator[]): Indicator[] {
  const statusRank: Record<Indicator["onTargetStatus"], number> = {
    "missed-target": 0,
    "no-target-set": 1,
    "no-data": 1,
    "on-target": 2,
  };
  const trendRank: Record<Indicator["trend"], number> = {
    worsening: 0,
    flat: 1,
    "insufficient-data": 1,
    improving: 2,
  };
  return [...indicators].sort((a, b) => {
    const statusDiff = statusRank[a.onTargetStatus] - statusRank[b.onTargetStatus];
    if (statusDiff !== 0) return statusDiff;
    return trendRank[a.trend] - trendRank[b.trend];
  });
}
