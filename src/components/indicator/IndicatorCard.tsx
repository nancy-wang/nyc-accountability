import Link from "next/link";
import { IndicatorTrendChart } from "@/components/charts/IndicatorTrendChart";
import { IndicatorSparkline } from "@/components/charts/IndicatorSparkline";
import { isVolatile, latestPoint, targetGapPhrase, trendOneLiner } from "@/lib/data/accountability";
import { getIndicatorNote } from "@/lib/data/getIndicators";
import { formatIndicatorValue } from "@/lib/format";
import { toPlainLanguageQuestion } from "@/lib/data/questionify";
import type { Indicator } from "@/lib/data/types";
import { AccountabilitySummary } from "./AccountabilitySummary";
import { IndicatorResearchNote } from "./IndicatorResearchNote";
import { VolatileNotice } from "./VolatileNotice";

export function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const latest = latestPoint(indicator.series);
  const note = getIndicatorNote(indicator.id);
  const volatile = isVolatile(indicator.series);
  const question = toPlainLanguageQuestion(indicator);
  const valueText = formatIndicatorValue(latest?.value ?? null, indicator.measurementType, indicator.name);
  // A researched note's condensed insight takes priority over the bare
  // direction word — "overall decreasing, but increase due to broadened
  // definition" says something a plain "decreasing" can't.
  const trendText = note?.oneLiner || trendOneLiner(indicator);
  // The chart no longer shades a "missing target" zone — this is where that
  // context lives instead, e.g. "10 min above the 15 min target."
  const targetGap = targetGapPhrase(indicator);
  const oneLiner = [trendText, targetGap].filter(Boolean).join(", ");

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
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            {valueText}
            {oneLiner && <span style={{ color: "var(--text-muted)" }}> — {oneLiner}</span>}
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
        <Link href={`/indicators/${indicator.id}`} className="mt-3 inline-block text-sm underline" style={{ color: "var(--accent-heading)" }}>
          Open full page ↗
        </Link>
      </div>
    </details>
  );
}
