import Link from "next/link";
import { notFound } from "next/navigation";
import { findAgencyBySlug, taxonomy } from "@data/narrative/taxonomy";
import { AccountabilitySummary } from "@/components/indicator/AccountabilitySummary";
import { IndicatorResearchNote } from "@/components/indicator/IndicatorResearchNote";
import { ServiceContextNote } from "@/components/indicator/ServiceContextNote";
import { SourceCitation } from "@/components/indicator/SourceCitation";
import { VolatileNotice } from "@/components/indicator/VolatileNotice";
import { IndicatorTrendChart } from "@/components/charts/IndicatorTrendChart";
import { TargetGapBadge } from "@/components/charts/TargetGapBadge";
import { TrendBadge } from "@/components/charts/TrendBadge";
import { isVolatile } from "@/lib/data/accountability";
import { getAllIndicators, getIndicatorById, getIndicatorNote, getServiceContext } from "@/lib/data/getIndicators";

export function generateStaticParams() {
  return getAllIndicators().map((indicator) => ({ indicatorId: String(indicator.id) }));
}

function findAgencyRefByCode(code: string) {
  for (const topic of taxonomy) {
    const agency = topic.agencies.find((a) => a.codes.includes(code));
    if (agency) return { topic, agency };
  }
  return undefined;
}

export default async function IndicatorPage({ params }: { params: Promise<{ indicatorId: string }> }) {
  const { indicatorId } = await params;
  const id = Number(indicatorId);
  const indicator = Number.isFinite(id) ? getIndicatorById(id) : undefined;
  if (!indicator) notFound();

  const agencyRef = findAgencyRefByCode(indicator.agencyCode);
  const note = getIndicatorNote(indicator.id);
  const serviceContext = getServiceContext(indicator.agencyCode, indicator.service);
  const volatile = isVolatile(indicator.series);

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/" className="underline">
          All topics
        </Link>
        {agencyRef && (
          <>
            {" "}
            /{" "}
            <Link href={`/topics/${agencyRef.topic.slug}`} className="underline">
              {agencyRef.topic.title}
            </Link>{" "}
            /{" "}
            <Link href={`/agencies/${agencyRef.agency.slug}`} className="underline">
              {agencyRef.agency.name}
            </Link>
          </>
        )}
      </p>

      <h1 className="font-display mt-2 text-2xl sm:text-3xl" style={{ color: "var(--accent-heading)" }}>
        {indicator.name}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {indicator.service} — {indicator.goal}
      </p>

      {note && (
        <div className="mt-4">
          <IndicatorResearchNote note={note} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <TargetGapBadge indicator={indicator} />
        {!note && !volatile && <TrendBadge indicator={indicator} />}
      </div>

      <div className="mt-6 rounded-xl border-2 p-5" style={{ borderColor: "var(--border-hairline)", background: "var(--surface-1)" }}>
        <IndicatorTrendChart indicator={indicator} />
      </div>

      {!note && <div className="mt-6">{volatile ? <VolatileNotice /> : <AccountabilitySummary indicator={indicator} />}</div>}

      {serviceContext && <ServiceContextNote context={serviceContext} />}

      <div className="mt-8">
        <SourceCitation indicator={indicator} />
      </div>
    </div>
  );
}
