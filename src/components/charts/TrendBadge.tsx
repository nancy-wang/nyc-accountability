import { trendSpanFiscalYears } from "@/lib/data/accountability";
import type { Indicator, TrendDirection } from "@/lib/data/types";

const TREND_COLOR: Record<TrendDirection, string> = {
  worsening: "var(--status-critical)",
  improving: "var(--status-good)",
  flat: "var(--status-neutral)",
  "insufficient-data": "var(--status-neutral)",
};

const TREND_ICON: Record<TrendDirection, string> = {
  worsening: "↓",
  improving: "↑",
  flat: "→",
  "insufficient-data": "–",
};

function trendLabel(trend: TrendDirection, spanYears: number): string {
  if (trend === "insufficient-data") return "Not enough data for a trend";
  const years = `${spanYears} year${spanYears === 1 ? "" : "s"}`;
  if (trend === "worsening") return `Worsening over ${years}`;
  if (trend === "improving") return `Improving over ${years}`;
  return `Flat over ${years}`;
}

export function TrendBadge({ indicator }: { indicator: Indicator }) {
  const spanYears = trendSpanFiscalYears(indicator.series);
  const label = trendLabel(indicator.trend, spanYears);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold"
      style={{ borderColor: "var(--accent-heading)", color: "var(--text-primary)" }}
    >
      <span aria-hidden style={{ color: TREND_COLOR[indicator.trend], fontSize: "0.8em" }}>
        {TREND_ICON[indicator.trend]}
      </span>
      {label}
    </span>
  );
}
