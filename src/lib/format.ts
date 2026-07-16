import type { MeasurementType } from "./data/types";

export function formatIndicatorValue(value: number | null, measurementType: MeasurementType): string {
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
      return formatMinutesSeconds(value);
    case "Number":
    default:
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  }
}

/** TimeSpan values in this dataset are stored as fractional minutes (e.g. 9.9 -> 9:54). */
function formatMinutesSeconds(value: number): string {
  const totalSeconds = Math.round(value * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatFiscalYear(fiscalYear: number): string {
  return `FY${String(fiscalYear).slice(-2)}`;
}
