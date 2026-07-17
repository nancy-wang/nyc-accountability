import type { TrendRollup } from "@/lib/data/rollup";

/**
 * A proportional bar of how an agency's critical indicators are trending —
 * improving, worsening, or neither (flat, insufficient data, or too
 * volatile for a trend label) — instead of a text one-liner. A single
 * "X of Y missing target, Z trending worse" sentence can't honestly
 * represent a mixed picture across a dozen-plus indicators without either
 * going abstract or cherry-picking one to stand in for the rest; a
 * proportional bar shows the real mix at a glance and scales to any agency
 * size without picking a "winner."
 *
 * Takes the already-computed rollup rather than raw indicators, so this
 * component has no filesystem dependency (trendRollup() reads researched
 * notes from disk) and stays safe to render from a client component tree —
 * see AgencyCardFlip, which needs that.
 */
/** `compact` shrinks the bar/text for tight spaces (the trading card) without affecting the default size used on topic pages. */
export function AgencyTrendBar({ trend, compact = false }: { trend: TrendRollup; compact?: boolean }) {
  const { total, improving, worsening, other } = trend;
  if (total === 0) return null;

  const pct = (n: number) => (n / total) * 100;

  return (
    <div className={`mt-2 flex items-center ${compact ? "gap-1.5" : "gap-2.5"}`}>
      <div className={`flex flex-1 overflow-hidden rounded-full ${compact ? "h-1.5" : "h-2.5"}`} style={{ background: "var(--gridline)" }}>
        {improving > 0 && <div style={{ width: `${pct(improving)}%`, background: "var(--trend-improving)" }} />}
        {worsening > 0 && <div style={{ width: `${pct(worsening)}%`, background: "var(--trend-worsening)" }} />}
        {other > 0 && <div style={{ width: `${pct(other)}%`, background: "var(--trend-other)" }} />}
      </div>
      <span className={`shrink-0 ${compact ? "text-[9px]" : "text-xs"}`} style={{ color: "var(--text-secondary)" }}>
        {improving} improving, {worsening} worse
      </span>
    </div>
  );
}
