import Link from "next/link";
import { taxonomy } from "@data/narrative/taxonomy";
import { getIndicatorsByAgencyCodes } from "@/lib/data/getIndicators";

const SWATCHES = [
  { bg: "var(--brand-red)", heading: "var(--brand-cream)", body: "rgba(253, 246, 233, 0.85)" },
  { bg: "var(--brand-gold)", heading: "var(--brand-blue)", body: "rgba(30, 42, 120, 0.75)" },
  { bg: "var(--brand-blue)", heading: "var(--brand-gold)", body: "rgba(253, 246, 233, 0.8)" },
] as const;

export default function HomePage() {
  return (
    <div>
      <section className="mb-12 max-w-2xl">
        <h1 className="font-display text-4xl leading-none sm:text-5xl" style={{ color: "var(--accent-heading)" }}>
          Is New York City
          <br />
          hitting its own targets?
        </h1>
        <p className="mt-4 text-base" style={{ color: "var(--text-secondary)" }}>
          The City sets performance targets for itself twice a year in the Mayor&apos;s Management Report. This
          site tracks whether its own agencies are meeting them, sourced directly from{" "}
          <a href="https://data.cityofnewyork.us" className="underline" style={{ color: "var(--accent-heading)" }} target="_blank" rel="noreferrer">
            NYC Open Data
          </a>
          .
        </p>
        <Link href="/agency-cards" className="mt-4 inline-block text-sm font-semibold underline" style={{ color: "var(--accent-heading)" }}>
          Meet the agencies as trading cards ↗
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {taxonomy.map((topic, i) => {
          const codes = topic.agencies.flatMap((a) => a.codes);
          const indicators = getIndicatorsByAgencyCodes(codes);
          const live = indicators.length > 0;
          const swatch = SWATCHES[i % SWATCHES.length];

          const card = (
            <div
              className="h-full rounded-2xl border-4 p-5 transition-transform hover:-translate-y-0.5"
              style={{
                borderColor: "var(--brand-blue)",
                background: swatch.bg,
                opacity: live ? 1 : 0.55,
              }}
            >
              <h2 className="font-display text-xl leading-tight" style={{ color: swatch.heading }}>
                {topic.title}
              </h2>
              {!live && (
                <p className="mt-2 text-sm font-medium" style={{ color: swatch.body }}>
                  Coming soon
                </p>
              )}
            </div>
          );

          return live ? (
            <Link key={topic.slug} href={`/topics/${topic.slug}`}>
              {card}
            </Link>
          ) : (
            <div key={topic.slug}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
