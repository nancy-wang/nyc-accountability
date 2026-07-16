import type { Indicator } from "@/lib/data/types";

const WIDTH = 96;
const HEIGHT = 32;
const PAD = 4;

const STATUS_COLOR: Record<Indicator["onTargetStatus"], string> = {
  "missed-target": "var(--status-critical)",
  "on-target": "var(--status-good)",
  "no-target-set": "var(--series-1)",
  "no-data": "var(--status-neutral)",
};

export function IndicatorSparkline({ indicator }: { indicator: Indicator }) {
  const points = indicator.series.filter((p) => p.value != null);
  if (points.length < 2) return null;

  const values = points.map((p) => p.value!);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const xFor = (i: number) => PAD + (i / (points.length - 1)) * (WIDTH - 2 * PAD);
  const yFor = (v: number) => PAD + (HEIGHT - 2 * PAD) - ((v - min) / range) * (HEIGHT - 2 * PAD);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.value!)}`).join(" ");
  const last = points.length - 1;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="presentation" aria-hidden>
      <path d={path} fill="none" stroke="var(--text-muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xFor(last)} cy={yFor(points[last].value!)} r={3} fill={STATUS_COLOR[indicator.onTargetStatus]} />
    </svg>
  );
}
