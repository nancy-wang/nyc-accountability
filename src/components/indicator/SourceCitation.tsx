import { formatFiscalYear } from "@/lib/format";
import type { Indicator } from "@/lib/data/types";

const DATASET_URL = "https://data.cityofnewyork.us/City-Government/Mayor-s-Management-Report-Agency-Performance-Indic/rbed-zzin";

export function SourceCitation({ indicator }: { indicator: Indicator }) {
  const years = indicator.series.map((p) => p.fiscalYear);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  return (
    <div className="border-t pt-4 text-sm" style={{ borderColor: "var(--border-hairline)", color: "var(--text-secondary)" }}>
      <p>
        <strong style={{ color: "var(--text-primary)" }}>Source:</strong> {indicator.source || "Mayor's Office of Operations"} — via{" "}
        <a href={DATASET_URL} className="underline" target="_blank" rel="noreferrer">
          NYC Open Data: Mayor&apos;s Management Report, Agency Performance Indicators
        </a>
      </p>
      <p className="mt-1">
        Coverage shown: {formatFiscalYear(minYear)}–{formatFiscalYear(maxYear)}, reported {indicator.frequency.toLowerCase()}.
      </p>
      <p className="mt-1">
        <strong style={{ color: "var(--text-primary)" }}>Definition:</strong> {indicator.description}
      </p>
    </div>
  );
}
