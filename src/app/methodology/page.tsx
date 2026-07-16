import { getSnapshotMeta } from "@/lib/data/getIndicators";

export default function MethodologyPage() {
  const meta = getSnapshotMeta();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl sm:text-4xl" style={{ color: "var(--accent-heading)" }}>
        Methodology
      </h1>

      <Section title="Source of record">
        <p>
          Every number on this site comes from NYC Open Data&apos;s{" "}
          <a
            href="https://data.cityofnewyork.us/City-Government/Mayor-s-Management-Report-Agency-Performance-Indic/rbed-zzin"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Mayor&apos;s Management Report — Agency Performance Indicators
          </a>{" "}
          dataset, not the printed Mayor&apos;s Management Report PDF. That PDF is used only as a secondary source
          for agency descriptions and definitional text that don&apos;t exist in the open dataset — never for the
          numbers themselves.
        </p>
      </Section>

      <Section title="Scope">
        <p>
          This site covers indicators the City itself flags as{" "}
          <strong style={{ color: "var(--text-primary)" }}>critical</strong> and that are not{" "}
          <strong style={{ color: "var(--text-primary)" }}>retired</strong>, restricted to citywide totals (the
          dataset&apos;s <code>id = parentid</code> rows — geographic breakdowns by community district, precinct,
          or school district are excluded). As of the last data refresh, that scope is {meta.indicatorCount}{" "}
          indicators.
        </p>
      </Section>

      <Section title="Time range">
        <p>Each indicator shows one value per fiscal year for roughly the last 5 fiscal years, including the current, partial year.</p>
        <p className="mt-2">
          Where an indicator is reported more often than annually, the value shown for a fiscal year is the
          year-to-date figure from the most recently reported period in that year — the same figure the Mayor&apos;s
          Management Report itself presents as the year&apos;s &quot;Actual,&quot; not a raw monthly snapshot.
        </p>
      </Section>

      <Section title="How &quot;on target&quot; is determined">
        <p>
          An indicator is <strong style={{ color: "var(--text-primary)" }}>on target</strong> if its latest value
          meets the City&apos;s own numeric target in the direction the City itself defines as desirable (for a
          &quot;lower is better&quot; indicator, on target means at or below the target; for &quot;higher is
          better,&quot; at or above).
        </p>
        <p className="mt-2">
          Many indicators — including most of NYPD&apos;s — don&apos;t have a numeric target in this dataset at all;
          the City tracks a direction (e.g., &quot;reduce crime&quot;) without committing to a specific number.
          Those are labeled <strong style={{ color: "var(--text-primary)" }}>no numeric target set</strong>, which
          is a real status, not a data gap.
        </p>
      </Section>

      <Section title="How trend is determined">
        <p>
          Trend is fit across every fiscal year available in an indicator&apos;s lookback window using the median
          of all pairwise year-to-year slopes (a Theil&ndash;Sen estimator), not a simple least-squares line and not
          just the latest year compared to the one before it. This is deliberately resistant to a single unusual
          year dominating the label — a one-year spike or dip in an otherwise flat or declining series won&apos;t
          flip the trend on its own. The direction is judged relative to the City&apos;s own stated desired
          direction, so &quot;improving&quot; always means &quot;getting better,&quot; never just &quot;the
          number went up.&quot;
        </p>
      </Section>

      <Section title="What's excluded">
        <ul className="list-disc pl-5">
          <li>Non-critical and retired indicators (roughly 1,000+ additional indicators in the full dataset).</li>
          <li>Geographic drill-down — community district, precinct, and school district breakdowns.</li>
          <li>
            The Mayor&apos;s Management Report&apos;s &quot;equity indicator&quot; flag — it isn&apos;t present in
            this open dataset, so this site makes no equity-specific claims.
          </li>
          <li>Historical data older than roughly 5 fiscal years.</li>
        </ul>
      </Section>

      <Section title="Refresh cadence">
        <p>NYC Open Data updates this dataset roughly monthly. This site&apos;s data was last generated on {new Date(meta.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      <div className="mt-2 text-base" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
    </section>
  );
}
