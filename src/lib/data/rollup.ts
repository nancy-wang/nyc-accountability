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
