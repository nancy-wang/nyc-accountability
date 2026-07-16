import { trendRollup } from "@/lib/data/rollup";
import type { Indicator } from "@/lib/data/types";

/**
 * A proportional bar of how an agency's critical indicators are trending —
 * improving, worsening, or neither (flat, insufficient data, or too
 * volatile for a trend label) — instead of a text one-liner. A single
 * "X of Y missing target, Z trending worse" sentence can't honestly
 * represent a mixed picture across a dozen-plus indicators without either
 * going abstract or cherry-picking one to stand in for the rest; a
 * proportional bar shows the real mix at a glance and scales to any agency
 * size without picking a "winner."
 */
export function AgencyTrendBar({ indicators }: { indicators: Indicator[] }) {
  const { total, improving, worsening, other } = trendRollup(indicators);
  if (total === 0) return null;

  const pct = (n: number) => (n / total) * 100;

  return (
    <div className="mt-2 flex items-center gap-2.5">
      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gridline)" }}>
        {improving > 0 && <div style={{ width: `${pct(improving)}%`, background: "var(--status-good)" }} />}
        {worsening > 0 && <div style={{ width: `${pct(worsening)}%`, background: "var(--status-critical)" }} />}
        {other > 0 && <div style={{ width: `${pct(other)}%`, background: "var(--baseline)" }} />}
      </div>
      <span className="shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>
        {improving} improving, {worsening} worse
      </span>
    </div>
  );
}
