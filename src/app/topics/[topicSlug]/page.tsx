import Link from "next/link";
import { notFound } from "next/navigation";
import { findTopicBySlug, taxonomy } from "@data/narrative/taxonomy";
import { getIndicatorsByAgencyCodes } from "@/lib/data/getIndicators";
import { rollupAccountability } from "@/lib/data/rollup";

export function generateStaticParams() {
  return taxonomy.map((topic) => ({ topicSlug: topic.slug }));
}

export default async function TopicPage({ params }: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await params;
  const topic = findTopicBySlug(topicSlug);
  if (!topic) notFound();

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/" className="underline">
          All topics
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl sm:text-4xl" style={{ color: "var(--accent-heading)" }}>
        {topic.title}
      </h1>

      <div className="mt-8 flex flex-col gap-4">
        {topic.agencies.map((agency) => {
          const indicators = getIndicatorsByAgencyCodes(agency.codes);
          const rollup = rollupAccountability(indicators);
          const live = indicators.length > 0;

          const card = (
            <div
              className="rounded-xl border-2 p-4"
              style={{ borderColor: "var(--border-hairline)", background: "var(--surface-1)", opacity: live ? 1 : 0.6 }}
            >
              <h2 className="font-medium" style={{ color: "var(--text-primary)" }}>
                {agency.name}
              </h2>
              {live ? (
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {rollup.missedTarget} of {rollup.total} critical indicators missing target
                  {rollup.worsening > 0 ? ` · ${rollup.worsening} trending worse` : ""}
                </p>
              ) : (
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  Coming soon
                </p>
              )}
            </div>
          );

          return live ? (
            <Link key={agency.slug} href={`/agencies/${agency.slug}`}>
              {card}
            </Link>
          ) : (
            <div key={agency.slug}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
