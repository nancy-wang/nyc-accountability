export type DesiredDirection = "Up" | "Down";
export type MeasurementType = "Number" | "Percentage" | "Currency" | "TimeSpan";
export type OnTargetStatus = "on-target" | "missed-target" | "no-target-set" | "no-data";
export type TrendDirection = "improving" | "worsening" | "flat" | "insufficient-data";

export interface IndicatorPoint {
  fiscalYear: number;
  /** ISO date string for the first of the reported month */
  valueDate: string;
  value: number | null;
  targetCurrentFY: number | null;
}

export interface Indicator {
  id: number;
  agencyCode: string;
  agencyName: string;
  service: string;
  goal: string;
  name: string;
  description: string;
  source: string;
  desiredDirection: DesiredDirection;
  measurementType: MeasurementType;
  frequency: string;
  series: IndicatorPoint[];
  onTargetStatus: OnTargetStatus;
  trend: TrendDirection;
}

export interface SnapshotMeta {
  generatedAt: string;
  socrataLastModified: string | null;
  indicatorCount: number;
}

export interface IndicatorResearchNote {
  summary: string;
  sources: Array<{ label: string; url: string }>;
  /** ISO date the research was done — this reflects known facts as of that date, not a live feed. */
  researchedOn: string;
}
