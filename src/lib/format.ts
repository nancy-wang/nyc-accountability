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
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  }
}

function formatTimeSpan(value: number, unit: TimeUnit): string {
  switch (unit) {
    case "clock-minutes-seconds":
      return formatClockDigits(value, 59);
    case "clock-hours-minutes":
      return formatClockDigits(value, 59);
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

/**
 * NYC's MMR reports "X:YY" time values as a single decimal number where the
 * digits after the point ARE the sub-unit count directly (9.02 -> "9:02"),
 * not a true fraction of 60 (which 9.02 * 60 would wrongly read as ~9:01).
 * Verified against the printed PMMR ("9.02" in the source data corresponds
 * to the PDF's own printed "9:02").
 */
function formatClockDigits(value: number, maxSubUnit: number): string {
  const whole = Math.trunc(value);
  const fracDigits = Math.round(Math.abs(value - whole) * 100);
  const subUnit = Math.min(fracDigits, maxSubUnit);
  return `${whole}:${String(subUnit).padStart(2, "0")}`;
}

export function formatFiscalYear(fiscalYear: number): string {
  return `FY${String(fiscalYear).slice(-2)}`;
}
