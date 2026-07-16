import Link from "next/link";
import { IndicatorSparkline } from "@/components/charts/IndicatorSparkline";
import { TargetGapBadge } from "@/components/charts/TargetGapBadge";
import { TrendBadge } from "@/components/charts/TrendBadge";
import { isVolatile, latestPoint } from "@/lib/data/accountability";
import { getIndicatorNote } from "@/lib/data/getIndicators";
import { formatIndicatorValue } from "@/lib/format";
import type { Indicator } from "@/lib/data/types";

export function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const latest = latestPoint(indicator.series);
  const note = getIndicatorNote(indicator.id);
  const volatile = isVolatile(indicator.series);

  return (
    <Link
      href={`/indicators/${indicator.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border-2 p-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
      style={{ borderColor: "var(--border-hairline)", background: "var(--surface-1)" }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
          {indicator.name}
        </p>
        <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {formatIndicatorValue(latest?.value ?? null, indicator.measurementType)}
        </p>
        {note ? (
          <p className="mt-2 text-xs font-semibold" style={{ color: "var(--accent-heading)" }}>
            Researched note available
          </p>
        ) : volatile ? (
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            Large swings in this window — see chart
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <TargetGapBadge status={indicator.onTargetStatus} />
            <TrendBadge indicator={indicator} />
          </div>
        )}
      </div>
      <IndicatorSparkline indicator={indicator} />
    </Link>
  );
}
