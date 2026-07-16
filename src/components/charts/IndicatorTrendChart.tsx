import { chartUnitLabel, formatChartValue, formatFiscalYear, formatIndicatorValue } from "@/lib/format";
import type { Indicator } from "@/lib/data/types";

const WIDTH = 640;
const HEIGHT = 320;
const PAD_TOP = 36;
const PAD_BOTTOM = 40;
const LABEL_FONT_SIZE = 13;

/** Rough glyph-width estimate (no DOM measurement available server-side) — generous enough to avoid clipping without wasting space. */
function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62;
}

const STATUS_COLOR: Record<Indicator["onTargetStatus"], string> = {
  "missed-target": "var(--status-critical)",
  "on-target": "var(--status-good)",
  "no-target-set": "var(--series-1)",
  "no-data": "var(--status-neutral)",
};

/** Rounds a numeric range to "nice" step sizes (1/2/5 × 10^n) so axis ticks read as clean numbers instead of padded decimals. */
function niceTicks(min: number, max: number, targetCount = 4): number[] {
  if (min === max) return [min - 1, min, min + 1];

  const range = max - min;
  const roughStep = range / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;

  let step: number;
  if (residual > 5) step = 10 * magnitude;
  else if (residual > 2) step = 5 * magnitude;
  else if (residual > 1) step = 2 * magnitude;
  else step = magnitude;

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

export function IndicatorTrendChart({ indicator }: { indicator: Indicator }) {
  const points = indicator.series;
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const targets = points.map((p) => p.targetCurrentFY).filter((v): v is number => v != null);
  const allValues = [...values, ...targets];

  if (values.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        No data available for this indicator in the last 5 fiscal years.
      </div>
    );
  }

  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const ticks = niceTicks(dataMin, dataMax, 3);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];

  // Padding is sized to the actual labels being rendered rather than a fixed
  // constant — values on this site range from "0.9" to "1,576,043", and a
  // padding wide enough for one clips the other. Left padding fits the
  // widest y-axis tick label plus half the first point's own value label
  // (also centered there); right padding fits half the last point's value
  // label (center-anchored on the point, so half its width extends past it).
  const labelWidth = (v: number | null) => (v == null ? 0 : estimateTextWidth(formatChartValue(v, indicator.measurementType, indicator.name), LABEL_FONT_SIZE));
  const widestTickWidth = Math.max(0, ...ticks.map((t) => labelWidth(t)));
  const firstLabelHalfWidth = labelWidth(points[0]?.value ?? null) / 2;
  const lastLabelHalfWidth = labelWidth(points[points.length - 1]?.value ?? null) / 2;

  const PAD_LEFT = Math.max(48, widestTickWidth + 20, firstLabelHalfWidth + 6);
  const PAD_RIGHT = Math.max(24, lastLabelHalfWidth + 6);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotBottom = PAD_TOP + plotHeight;

  const xFor = (i: number) => PAD_LEFT + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const yFor = (v: number) => PAD_TOP + plotHeight - ((v - yMin) / (yMax - yMin)) * plotHeight;

  const valuePath = points
    .map((p, i) => (p.value == null ? null : `${i === 0 || points[i - 1]?.value == null ? "M" : "L"} ${xFor(i)} ${yFor(p.value)}`))
    .filter(Boolean)
    .join(" ");

  const targetPoints = points
    .map((p, i) => (p.targetCurrentFY == null ? null : { i, x: xFor(i), y: yFor(p.targetCurrentFY) }))
    .filter((p): p is { i: number; x: number; y: number } => p != null);
  const hasTarget = targetPoints.length > 0;
  const targetPath = targetPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const latestIndex = [...points].map((p, i) => ({ p, i })).reverse().find(({ p }) => p.value != null)?.i;
  const directionLabel = indicator.desiredDirection === "Up" ? "Higher values are better" : "Lower values are better";
  const directionIcon = indicator.desiredDirection === "Up" ? "▲" : "▼";
  const unit = chartUnitLabel(indicator.measurementType, indicator.name);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
        <span aria-hidden style={{ color: "var(--series-1)" }}>
          {directionIcon}
        </span>
        {directionLabel}
        {unit && (
          <span className="font-normal" style={{ color: "var(--text-muted)" }}>
            &nbsp;· in {unit}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Trend chart for ${indicator.name}`} className="w-full">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yFor(tick)} y2={yFor(tick)} stroke="var(--gridline)" strokeWidth={1} />
            <text x={PAD_LEFT - 10} y={yFor(tick)} textAnchor="end" dominantBaseline="middle" fontSize={13} fill="var(--text-secondary)">
              {formatChartValue(tick, indicator.measurementType, indicator.name)}
            </text>
          </g>
        ))}

        <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={plotBottom} y2={plotBottom} stroke="var(--baseline)" strokeWidth={1} />

        {points.map((p, i) => (
          <text key={p.fiscalYear} x={xFor(i)} y={HEIGHT - 14} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--text-secondary)">
            {formatFiscalYear(p.fiscalYear)}
            {p.isPartialYear ? "*" : ""}
          </text>
        ))}

        {hasTarget && <path d={targetPath} fill="none" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 4" />}

        <path d={valuePath} fill="none" stroke="var(--series-1)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => {
          if (p.value == null) return null;
          const isLatest = i === latestIndex;
          const y = yFor(p.value);
          // Flip the label below the point when it's too close to the chart's
          // top edge to fit a label above it without clipping.
          const labelBelow = y < PAD_TOP + 18;
          return (
            <g key={p.fiscalYear}>
              <circle
                cx={xFor(i)}
                cy={y}
                r={isLatest ? 6 : 4}
                fill={isLatest ? STATUS_COLOR[indicator.onTargetStatus] : "var(--series-1)"}
                stroke="var(--surface-1)"
                strokeWidth={2}
              />
              <text
                x={xFor(i)}
                y={labelBelow ? y + 20 : y - 12}
                textAnchor="middle"
                fontSize={13}
                fontWeight={isLatest ? 700 : 500}
                fill={isLatest ? "var(--text-primary)" : "var(--text-secondary)"}
              >
                {formatChartValue(p.value, indicator.measurementType, indicator.name)}
              </text>
            </g>
          );
        })}
      </svg>

      {points.some((p) => p.isPartialYear) && (
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          * Year to date — this fiscal year isn&apos;t complete, so it&apos;s not compared against prior years in the target/trend status above.
        </p>
      )}

      {/* A single series (no target) needs no legend — the chart's own heading already says what's plotted. */}
      {hasTarget && (
        <div className="mt-1 flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden style={{ display: "inline-block", width: 12, height: 2, background: "var(--series-1)" }} />
            Actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden style={{ display: "inline-block", width: 12, height: 0, borderTop: "2px dashed var(--text-muted)" }} />
            Target
          </span>
        </div>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium" style={{ color: "var(--accent-heading)" }}>
          View as table
        </summary>
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-hairline)" }}>
              <th className="py-1.5 pr-4 font-medium" style={{ color: "var(--text-secondary)" }}>
                Fiscal year
              </th>
              <th className="py-1.5 pr-4 font-medium" style={{ color: "var(--text-secondary)" }}>
                Actual
              </th>
              {hasTarget && (
                <th className="py-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
                  Target
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.fiscalYear} style={{ borderBottom: "1px solid var(--border-hairline)" }}>
                <td className="py-1.5 pr-4" style={{ color: "var(--text-primary)" }}>
                  {formatFiscalYear(p.fiscalYear)}
                  {p.isPartialYear ? " (YTD)" : ""}
                </td>
                <td className="py-1.5 pr-4" style={{ color: "var(--text-primary)" }}>
                  {formatIndicatorValue(p.value, indicator.measurementType, indicator.name)}
                </td>
                {hasTarget && (
                  <td className="py-1.5" style={{ color: "var(--text-primary)" }}>
                    {formatIndicatorValue(p.targetCurrentFY, indicator.measurementType, indicator.name)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
