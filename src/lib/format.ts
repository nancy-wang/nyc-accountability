import { detectCountNoun } from "./data/questionify";
import type { MeasurementType } from "./data/types";

type TimeUnit = "clock-minutes-seconds" | "clock-hours-minutes" | "days" | "weeks" | "months" | "minutes" | "hours" | "unknown";

/**
 * The source dataset's "TimeSpan" measurement type covers several different
 * units (days, hours:minutes, minutes:seconds, bare minutes) with no
 * separate field to distinguish them — the indicator's own name is the only
 * signal. Compound "X:Y" units come first so they aren't matched as the
 * bare unit instead.
 */
function detectTimeUnit(indicatorName: string): TimeUnit {
  if (/minutes?\s*:\s*seconds?/i.test(indicatorName)) return "clock-minutes-seconds";
  if (/hours?\s*:\s*minutes?/i.test(indicatorName)) return "clock-hours-minutes";
  if (/\bdays?\b/i.test(indicatorName)) return "days";
  if (/\bweeks?\b/i.test(indicatorName)) return "weeks";
  if (/\bmonths?\b/i.test(indicatorName)) return "months";
  if (/\bminutes?\b/i.test(indicatorName)) return "minutes";
  if (/\bhours?\b/i.test(indicatorName)) return "hours";
  return "unknown";
}

export function formatIndicatorValue(value: number | null, measurementType: MeasurementType, indicatorName = ""): string {
  if (value == null) return "Not available";

  switch (measurementType) {
    case "Currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: value >= 1000 ? 0 : 2,
      }).format(value);
    case "Percentage":
      return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}%`;
    case "TimeSpan":
      return formatTimeSpan(value, detectTimeUnit(indicatorName));
    case "Number":
    default:
      return formatNumber(value, indicatorName);
  }
}

/**
 * A plain "Number"-type value has no unit field at all — the two available
 * signals, in order, are: a duration word in the name (handled the same way
 * as TimeSpan, since a handful of these are day/hour counts mistyped as
 * Number in the source — see detectNumberTimeUnit), then a countable noun in
 * the name (e.g. "cases," "events"). If neither is confidently detected, the
 * value is shown bare rather than guessing at a unit.
 */
function formatNumber(value: number, indicatorName: string): string {
  const timeUnit = detectNumberTimeUnit(indicatorName);
  if (timeUnit !== "unknown") return formatTimeSpan(value, timeUnit);

  const noun = detectCountNoun(indicatorName);
  if (noun) {
    const singular = value === 1 && /s$/i.test(noun) ? noun.slice(0, -1) : noun;
    return `${formatPlainNumber(value)} ${singular}`;
  }

  return formatPlainNumber(value);
}

/**
 * Some indicators that are conceptually a day/week/month/hour count (e.g.
 * "Median days to close mediations") are tagged measurementType "Number"
 * rather than "TimeSpan" in the source, with no separate unit field — so the
 * indicator's own name is the only signal, same as for TimeSpan. But not
 * every Number-type name containing a time word is itself measured in that
 * unit: names like "Average number of adults in shelters per day" or
 * "...(12-month)" use the word as a measurement-frequency qualifier, not the
 * value's own unit — those are excluded so a census count doesn't get
 * mislabeled "1,204 days." Clock-digit encoding (9.02 -> "9 min 2 sec") is
 * also excluded here: that's a TimeSpan-specific dataset quirk, and a
 * Number-typed value is a true decimal, not digit-encoded.
 */
function detectNumberTimeUnit(indicatorName: string): TimeUnit {
  if (/\bper\b/i.test(indicatorName) || /\bnumber of\b/i.test(indicatorName) || /\benrollment\b/i.test(indicatorName)) {
    return "unknown";
  }
  const unit = detectTimeUnit(indicatorName);
  return unit === "clock-minutes-seconds" || unit === "clock-hours-minutes" ? "unknown" : unit;
}

function formatTimeSpan(value: number, unit: TimeUnit): string {
  switch (unit) {
    case "clock-minutes-seconds":
      return formatClockDigits(value, "min", "sec");
    case "clock-hours-minutes":
      return formatClockDigits(value, "hr", "min");
    case "days":
      return `${formatPlainNumber(value)} day${value === 1 ? "" : "s"}`;
    case "weeks":
      return `${formatPlainNumber(value)} week${value === 1 ? "" : "s"}`;
    case "months":
      return `${formatPlainNumber(value)} month${value === 1 ? "" : "s"}`;
    case "minutes":
      return `${formatPlainNumber(value)} min`;
    case "hours":
      return `${formatPlainNumber(value)} hr${value === 1 ? "" : "s"}`;
    case "unknown":
    default:
      return formatPlainNumber(value);
  }
}

function formatPlainNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

const TIME_UNIT_LABEL: Partial<Record<TimeUnit, string>> = {
  days: "days",
  weeks: "weeks",
  months: "months",
  minutes: "min",
  hours: "hr",
  "clock-minutes-seconds": "min:sec",
  "clock-hours-minutes": "hr:min",
};

/**
 * The unit a chart should state once (in its axis label / header), rather
 * than have every axis tick and point label repeat it — "35 days," "34
 * days," "31 days" five times over on one small chart is noise, not
 * clarity. Percentage/Currency are left out: their symbol is a single
 * character stated inline per value (68%, $50), which is standard chart
 * practice and not the clutter this exists to avoid.
 */
export function chartUnitLabel(measurementType: MeasurementType, indicatorName = ""): string | null {
  if (measurementType === "TimeSpan") return TIME_UNIT_LABEL[detectTimeUnit(indicatorName)] ?? null;
  if (measurementType === "Number") {
    const timeUnit = detectNumberTimeUnit(indicatorName);
    if (timeUnit !== "unknown") return TIME_UNIT_LABEL[timeUnit] ?? null;
    return detectCountNoun(indicatorName);
  }
  return null;
}

/**
 * Bare numeric value for chart ticks/point labels — the unit lives once in
 * the axis label (chartUnitLabel) instead. Clock-encoded TimeSpan values
 * still need decoding (9.02 isn't literally "9.02" of anything), just
 * rendered as compact "9:02" rather than the prose "9 min 2 sec" used
 * elsewhere, since the axis label already says "min:sec."
 */
export function formatChartValue(value: number | null, measurementType: MeasurementType, indicatorName = ""): string {
  if (value == null) return "N/A";

  if (measurementType === "TimeSpan" || measurementType === "Number") {
    const unit = measurementType === "TimeSpan" ? detectTimeUnit(indicatorName) : detectNumberTimeUnit(indicatorName);
    if (unit === "clock-minutes-seconds" || unit === "clock-hours-minutes") {
      const whole = Math.trunc(value);
      const sub = Math.min(Math.round(Math.abs(value - whole) * 100), 59);
      return `${whole}:${String(sub).padStart(2, "0")}`;
    }
    return formatPlainNumber(value);
  }

  return formatIndicatorValue(value, measurementType, indicatorName);
}

/**
 * NYC's MMR reports "X:YY" time values as a single decimal number where the
 * digits after the point ARE the sub-unit count directly (9.02 -> 9 min 2
 * sec), not a true fraction of 60 (which 9.02 * 60 would wrongly read as
 * ~9:01). Verified against the printed PMMR ("9.02" in the source data
 * corresponds to the PDF's own printed "9:02"). Spelled out with unit words
 * ("9 min 2 sec") rather than colon notation — clearer at a glance than a
 * bare "9:02," which reads ambiguously close to a clock time.
 */
function formatClockDigits(value: number, wholeUnit: string, subUnitLabel: string): string {
  const whole = Math.trunc(value);
  const fracDigits = Math.round(Math.abs(value - whole) * 100);
  const subUnit = Math.min(fracDigits, 59);
  if (subUnit === 0) return `${whole} ${wholeUnit}`;
  return `${whole} ${wholeUnit} ${subUnit} ${subUnitLabel}`;
}

/** Converts a clock-encoded value (9.02 -> 9 whole + 2 sub) to total sub-units (542), so arithmetic on it is correct. */
function clockValueToSubUnits(value: number): number {
  const whole = Math.trunc(value);
  const subUnit = Math.round(Math.abs(value - whole) * 100);
  return whole * 60 + Math.min(subUnit, 59);
}

/**
 * Formats |a - b| for display — e.g. a target gap. For clock-encoded
 * TimeSpan values (9.02 = "9 min 2 sec"), naive decimal subtraction is
 * wrong: 15.00 - 5.02 = 9.98 in decimal, but the real gap is 9 min 58 sec,
 * not "9 min 98 sec." Converts to total sub-units first so the subtraction
 * respects base-60 carrying, then reformats. Every other measurement type
 * is a true continuous decimal, so plain subtraction is correct there.
 */
export function formatValueDifference(a: number, b: number, measurementType: MeasurementType, indicatorName = ""): string {
  const unit = measurementType === "TimeSpan" ? detectTimeUnit(indicatorName) : null;
  if (unit === "clock-minutes-seconds" || unit === "clock-hours-minutes") {
    const totalSubUnits = Math.abs(clockValueToSubUnits(a) - clockValueToSubUnits(b));
    const whole = Math.floor(totalSubUnits / 60);
    const sub = totalSubUnits % 60;
    const [wholeUnit, subUnitLabel] = unit === "clock-minutes-seconds" ? ["min", "sec"] : ["hr", "min"];
    if (sub === 0) return `${whole} ${wholeUnit}`;
    if (whole === 0) return `${sub} ${subUnitLabel}`;
    return `${whole} ${wholeUnit} ${sub} ${subUnitLabel}`;
  }
  return formatIndicatorValue(Math.abs(a - b), measurementType, indicatorName);
}

export function formatFiscalYear(fiscalYear: number): string {
  return `FY${String(fiscalYear).slice(-2)}`;
}
