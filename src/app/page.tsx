import { taxonomy } from "@data/narrative/taxonomy";
import { AgencyCard } from "@/components/agency/AgencyCard";
import { getIndicatorsByAgencyCodes } from "@/lib/data/getIndicators";

export default function HomePage() {
  const liveSlugs = taxonomy
    .flatMap((topic) => topic.agencies)
    .filter((agency) => getIndicatorsByAgencyCodes(agency.codes).length > 0)
    .map((agency) => agency.slug);
  const cardTotal = liveSlugs.length;

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl" style={{ color: "var(--accent-heading)" }}>
        Meet the Agencies
      </h1>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Every NYC agency tracked on this site, as a trading card — flip one to see what it does and how its tracked
        indicators are trending. For the full accountability detail behind any agency, open its full page.
      </p>

      {taxonomy.map((topic) => (
        <section key={topic.slug} className="mt-10">
          <h2 className="font-label text-lg font-medium" style={{ color: "var(--text-primary)" }}>
            {topic.title}
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {topic.agencies.map((agency) => (
              <AgencyCard
                key={agency.slug}
                agency={agency}
                topicTitle={topic.title}
                cardIndex={liveSlugs.indexOf(agency.slug) + 1}
                cardTotal={cardTotal}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
