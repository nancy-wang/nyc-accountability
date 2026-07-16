import { getSnapshotMeta } from "@/lib/data/getIndicators";

export function Footer() {
  const meta = getSnapshotMeta();
  const generated = new Date(meta.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <footer className="mt-16" style={{ background: "var(--brand-blue)", borderTop: "4px solid var(--brand-red)" }}>
      <div className="mx-auto max-w-5xl px-6 py-8 text-sm" style={{ color: "var(--brand-cream)" }}>
        <p>
          Data pulled from{" "}
          <a href="https://data.cityofnewyork.us" className="underline" style={{ color: "var(--brand-gold)" }} target="_blank" rel="noreferrer">
            NYC Open Data
          </a>{" "}
          and last refreshed {generated}. Not affiliated with the City of New York or any campaign. See the{" "}
          <a href="/methodology" className="underline" style={{ color: "var(--brand-gold)" }}>
            methodology
          </a>{" "}
          page for scope and definitions.
        </p>
      </div>
    </footer>
  );
}
