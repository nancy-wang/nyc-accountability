import Link from "next/link";
import { taxonomy } from "@data/narrative/taxonomy";
import { AgencyCard } from "@/components/agency/AgencyCard";

export default function AgencyCardsPage() {
  return (
    <div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        <Link href="/" className="underline">
          All topics
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl sm:text-4xl" style={{ color: "var(--accent-heading)" }}>
        Meet the Agencies
      </h1>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
        Every NYC agency tracked on this site, as a trading card — flip one to see what it does and how its tracked
        indicators are trending. For the full accountability detail behind any agency, open its full page.
      </p>

      {taxonomy.map((topic) => (
        <section key={topic.slug} className="mt-10">
          <h2 className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
            {topic.title}
          </h2>
          <div className="mt-4 flex flex-wrap gap-5">
            {topic.agencies.map((agency) => (
              <AgencyCard key={agency.slug} agency={agency} topicTitle={topic.title} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
