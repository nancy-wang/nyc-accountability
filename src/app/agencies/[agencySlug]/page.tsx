import Link from "next/link";
import { notFound } from "next/navigation";
import { findAgencyBySlug, taxonomy } from "@data/narrative/taxonomy";
import { AgencySummary } from "@/components/agency/AgencySummary";
import { IndicatorCard } from "@/components/indicator/IndicatorCard";
import { getAgencyNarrative, getIndicatorsByAgencyCodes } from "@/lib/data/getIndicators";

export function generateStaticParams() {
  return taxonomy.flatMap((topic) => topic.agencies.map((agency) => ({ agencySlug: agency.slug })));
}

export default async function AgencyPage({ params }: { params: Promise<{ agencySlug: string }> }) {
  const { agencySlug } = await params;
  const found = findAgencyBySlug(agencySlug);
  if (!found) notFound();
  const { topic, agency } = found;

  const indicators = getIndicatorsByAgencyCodes(agency.codes);
  if (indicators.length === 0) notFound();

  const narrative = getAgencyNarrative(agency.slug);

  const withTarget = indicators.filter((i) => i.onTargetStatus === "on-target" || i.onTargetStatus === "missed-target");
  const withoutTarget = indicators.filter((i) => i.onTargetStatus === "no-target-set" || i.onTargetStatus === "no-data");

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/" className="underline">
          All topics
        </Link>{" "}
        /{" "}
        <Link href={`/topics/${topic.slug}`} className="underline">
          {topic.title}
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl sm:text-4xl" style={{ color: "var(--accent-heading)" }}>
        {agency.name}
      </h1>

      <AgencySummary indicators={indicators} narrative={narrative} />

      <h2 className="mt-8 text-lg font-medium" style={{ color: "var(--text-primary)" }}>
        Critical indicators
      </h2>

      {withTarget.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            With a numeric target
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {withTarget.map((indicator) => (
              <IndicatorCard key={indicator.id} indicator={indicator} />
            ))}
          </div>
        </>
      )}

      {withoutTarget.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Without a numeric target
          </h3>
          <div className="mt-3 flex flex-col gap-3">
            {withoutTarget.map((indicator) => (
              <IndicatorCard key={indicator.id} indicator={indicator} />
            ))}
          </div>
        </>
      )}

      {narrative && narrative.noteworthyChanges.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
            Noteworthy changes to this data
          </h2>
          <ul className="mt-3 list-disc pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
            {narrative.noteworthyChanges.map((change) => (
              <li key={change} className="mt-2">
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
