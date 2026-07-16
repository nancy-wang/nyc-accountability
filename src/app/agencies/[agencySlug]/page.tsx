import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findAgencyBySlug, taxonomy } from "@data/narrative/taxonomy";
import { IndicatorCard } from "@/components/indicator/IndicatorCard";
import { getIndicatorsByAgencyCodes } from "@/lib/data/getIndicators";
import { rollupAccountability, sortWorstFirst } from "@/lib/data/rollup";

interface AgencyNarrative {
  intro: string;
  noteworthyChanges: string[];
  sourceUrl?: string;
}

function getNarrative(slug: string): AgencyNarrative | null {
  const filePath = path.join(process.cwd(), "data", "narrative", "agencies", `${slug}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8")) as AgencyNarrative;
}

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

  const sorted = sortWorstFirst(indicators);
  const rollup = rollupAccountability(indicators);
  const narrative = getNarrative(agency.slug);

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

      {narrative && (
        <p className="mt-4 max-w-2xl text-base" style={{ color: "var(--text-secondary)" }}>
          {narrative.intro}
        </p>
      )}

      <p className="mt-4 text-sm font-medium" style={{ color: "var(--status-critical)" }}>
        {rollup.missedTarget} of {rollup.total} critical indicators are currently missing their target.
      </p>

      <h2 className="mt-8 text-lg font-medium" style={{ color: "var(--text-primary)" }}>
        Critical indicators
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        Sorted worst status first.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {sorted.map((indicator) => (
          <IndicatorCard key={indicator.id} indicator={indicator} />
        ))}
      </div>

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
