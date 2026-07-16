import type { DesiredDirection, Indicator, IndicatorPoint, MeasurementType } from "../../src/lib/data/types";
import type { RawRow } from "./fetchIndicators";

function parseNum(v: string | undefined | null): number | null {
  if (v == null) return null;
  const trimmed = v.trim();
  if (trimmed === "" || trimmed.toUpperCase() === "NA") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function scale(value: number | null, factor: number): number | null {
  return value == null ? null : value * factor;
}

function normalizeMeasurementType(raw: string): MeasurementType {
  switch (raw) {
    case "Currency":
      return "Currency";
    case "Percentage":
      return "Percentage";
    case "TimeSpan":
      return "TimeSpan";
    default:
      return "Number";
  }
}

/**
 * Groups raw rows (which can be monthly, quarterly, or annual depending on the
 * indicator's own reporting frequency) into one point per fiscal year, using the
 * year-to-date figure from the most recently reported row in that year, falling
 * back to that row's period value. This mirrors how the PMMR itself presents a
 * single annual/YTD "Actual" per fiscal year rather than raw sub-year noise.
 */
export function groupIntoIndicators(rows: RawRow[]): Array<Omit<Indicator, "onTargetStatus" | "trend">> {
  const byId = new Map<string, RawRow[]>();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, []);
    byId.get(row.id)!.push(row);
  }

  const result: Array<Omit<Indicator, "onTargetStatus" | "trend">> = [];

  for (const [id, group] of byId) {
    const first = group[0];
    const factor = parseNum(first.multiplication_factor) ?? 1;

    const latestRowByFiscalYear = new Map<number, RawRow>();
    for (const row of group) {
      const fy = Number(row.fiscalyear);
      const existing = latestRowByFiscalYear.get(fy);
      if (!existing || row.valuedate > existing.valuedate) {
        latestRowByFiscalYear.set(fy, row);
      }
    }

    const series: IndicatorPoint[] = Array.from(latestRowByFiscalYear.entries())
      .map(([fiscalYear, row]) => {
        const raw = parseNum(row.acceptedvalueytd) ?? parseNum(row.acceptedvalue);
        // NYC's fiscal year ends in June; a representative row dated any
        // other month means that year's data collection isn't finished yet.
        const reportedMonth = row.valuedate.slice(5, 7);
        return {
          fiscalYear,
          valueDate: row.valuedate,
          value: scale(raw, factor),
          targetCurrentFY: scale(parseNum(row.targetmmr), factor),
          isPartialYear: reportedMonth !== "06",
        };
      })
      .sort((a, b) => a.fiscalYear - b.fiscalYear);

    result.push({
      id: Number(id),
      agencyCode: first.agency,
      agencyName: first.agency_name,
      service: first.service,
      goal: first.goal,
      name: first.indicator,
      description: first.description,
      source: first.source,
      desiredDirection: (first.desireddirection === "Down" ? "Down" : "Up") as DesiredDirection,
      measurementType: normalizeMeasurementType(first.measurement_type),
      frequency: first.frequency,
      series,
    });
  }

  return result;
}
