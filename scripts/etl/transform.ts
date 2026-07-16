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

function byValueDate(a: RawRow, b: RawRow): number {
  return a.valuedate.localeCompare(b.valuedate);
}

/** NYC's fiscal year starts in July (calendar month 7); returns that month's 1-12 position within the fiscal year (Jul=1 ... Jun=12). */
function fiscalMonthIndex(calendarMonth: number): number {
  return ((calendarMonth - 7 + 12) % 12) + 1;
}

/**
 * Whether a fiscal year's "year-to-date" field is a running sum of each
 * period's value (true for most counts, e.g. crime totals) rather than a
 * running average/rate (true for most percentages, response times, and
 * "Average X" counts) — there's no field that states this directly, and
 * measurementType doesn't reliably predict it either (some "Number"-type
 * indicators are averages, e.g. "Average daily population in detention").
 *
 * Inferred empirically by checking which hypothesis the year's *final* YTD
 * figure actually matches: the sum of that year's period values, or their
 * average. An early version of this compared consecutive months exactly
 * (prevYtd + thisMonth === thisYtd), but real MMR data doesn't hold to that:
 * NYPD's own numbers get revised intra-year (e.g. late-reported incidents,
 * reclassifications), so a strict month-to-month check misfired even on an
 * obviously cumulative series like major felony crime. Comparing against the
 * whole year's totals is far more tolerant of that kind of revision noise
 * while still cleanly separating the two hypotheses, which in practice land
 * an order of magnitude apart. Requires both a clear winner (under 15% off)
 * and a clear loser — an indicator disrupted enough (e.g. Forcible rape's
 * FY25 legal redefinition, which broke the clean sum) correctly returns
 * null rather than a guessed answer.
 */
function classifyYearAggregation(rowsForYear: RawRow[]): "cumulative" | "average" | null {
  const sorted = [...rowsForYear].sort(byValueDate);
  if (sorted.length < 2) return null;

  const periodValues = sorted.map((r) => parseNum(r.acceptedvalue));
  const finalYtd = parseNum(sorted[sorted.length - 1].acceptedvalueytd);
  if (finalYtd == null || periodValues.some((v) => v == null)) return null;
  const values = periodValues as number[];

  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  const sumError = Math.abs(finalYtd - sum) / Math.max(Math.abs(sum), 1);
  const avgError = Math.abs(finalYtd - average) / Math.max(Math.abs(average), 1);

  const CLEAR_MATCH = 0.15;
  if (sumError < CLEAR_MATCH && sumError < avgError) return "cumulative";
  if (avgError < CLEAR_MATCH && avgError < sumError) return "average";
  return null;
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

    const rowsByFiscalYear = new Map<number, RawRow[]>();
    for (const row of group) {
      const fy = Number(row.fiscalyear);
      if (!rowsByFiscalYear.has(fy)) rowsByFiscalYear.set(fy, []);
      rowsByFiscalYear.get(fy)!.push(row);
    }
    const fiscalYears = Array.from(rowsByFiscalYear.keys()).sort((a, b) => a - b);

    // Cumulative-ness is a property of the indicator, not any one year, so
    // it's determined once from the most recent *complete* fiscal year with
    // enough rows to test, walking backward in case the latest complete year
    // happens to be too sparse (e.g. an indicator that switched reporting
    // frequency) to settle it.
    let isCumulative: boolean | null = null;
    for (let i = fiscalYears.length - 1; i >= 0; i -= 1) {
      const yearRows = rowsByFiscalYear.get(fiscalYears[i])!;
      const latestInYear = [...yearRows].sort(byValueDate).at(-1)!;
      if (latestInYear.valuedate.slice(5, 7) !== "06") continue; // not a complete year
      const verdict = classifyYearAggregation(yearRows);
      if (verdict != null) {
        isCumulative = verdict === "cumulative";
        break;
      }
    }

    const series: IndicatorPoint[] = fiscalYears
      .map((fiscalYear) => {
        const row = [...rowsByFiscalYear.get(fiscalYear)!].sort(byValueDate).at(-1)!;
        const raw = parseNum(row.acceptedvalueytd) ?? parseNum(row.acceptedvalue);
        // NYC's fiscal year ends in June; a representative row dated any
        // other month means that year's data collection isn't finished yet.
        const reportedMonth = row.valuedate.slice(5, 7);
        const isPartialYear = reportedMonth !== "06";

        let projectedValue: number | null = null;
        if (isPartialYear && isCumulative === true && raw != null) {
          const monthsElapsed = fiscalMonthIndex(Number(reportedMonth));
          // Rounded to a whole number — cumulative indicators are counts, and
          // the extrapolation math otherwise produces a spurious decimal that
          // reads as more precise than an estimate actually is.
          const scaled = scale(raw * (12 / monthsElapsed), factor);
          projectedValue = scaled == null ? null : Math.round(scaled);
        }

        return {
          fiscalYear,
          valueDate: row.valuedate,
          value: scale(raw, factor),
          targetCurrentFY: scale(parseNum(row.targetmmr), factor),
          isPartialYear,
          projectedValue,
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
