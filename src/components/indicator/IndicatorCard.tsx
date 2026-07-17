import Link from "next/link";
import { IndicatorTrendChart } from "@/components/charts/IndicatorTrendChart";
import { IndicatorSparkline } from "@/components/charts/IndicatorSparkline";
import { TargetGapBadge } from "@/components/charts/TargetGapBadge";
import { isVolatile, latestPoint } from "@/lib/data/accountability";
import { getIndicatorNote, getServiceContext } from "@/lib/data/getIndicators";
import { formatIndicatorValue } from "@/lib/format";
import { toPlainLanguageQuestion } from "@/lib/data/questionify";
import type { Indicator } from "@/lib/data/types";
import { AccountabilitySummary } from "./AccountabilitySummary";
import { IndicatorResearchNote } from "./IndicatorResearchNote";
import { ServiceContextNote } from "./ServiceContextNote";
import { VolatileNotice } from "./VolatileNotice";

export function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const latest = latestPoint(indicator.series);
  const note = getIndicatorNote(indicator.id);
  const serviceContext = getServiceContext(indicator.agencyCode, indicator.service);
  const volatile = isVolatile(indicator.series);
  const question = toPlainLanguageQuestion(indicator);
  const valueText = formatIndicatorValue(latest?.value ?? null, indicator.measurementType, indicator.name);
  // No bare direction word ("increasing"/"decreasing") by default — the
  // chart right below already shows the trend. Only a researched note's
  // condensed insight earns a place here, since it explains *why*, which the
  // chart can't ("decreasing after a new system rollout's integration issues
  // were resolved").
  const oneLiner = note?.oneLiner ?? "";

  return (
    <details
      className="group rounded-xl border-2 p-4"
      style={{ borderColor: "var(--border-hairline)", background: "var(--surface-1)" }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
            {question}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            <span>
              {valueText}
              {oneLiner && <span style={{ color: "var(--text-muted)" }}> — {oneLiner}</span>}
            </span>
            <TargetGapBadge indicator={indicator} />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <IndicatorSparkline indicator={indicator} />
          <span
            aria-hidden
            className="text-sm transition-transform duration-150 group-open:rotate-180"
            style={{ color: "var(--text-muted)" }}
          >
            ▾
          </span>
        </div>
      </summary>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border-hairline)" }}>
        <IndicatorTrendChart indicator={indicator} />
        <div className="mt-4">{note ? <IndicatorResearchNote note={note} /> : volatile ? <VolatileNotice /> : <AccountabilitySummary indicator={indicator} />}</div>
        {serviceContext && <ServiceContextNote context={serviceContext} />}
        <Link href={`/indicators/${indicator.id}`} className="mt-3 inline-block text-sm underline" style={{ color: "var(--accent-heading)" }}>
          Open full page ↗
        </Link>
      </div>
    </details>
  );
}
