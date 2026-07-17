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
  /**
   * True when this fiscal year's data doesn't yet run through June (the NYC
   * fiscal year's last month) — a year-to-date figure, not a final annual
   * total. Comparing a partial year's total directly against prior full
   * years understates it for any indicator that accumulates over the year,
   * so partial years are excluded from swing/trend math (but still shown,
   * labeled, on the chart).
   */
  isPartialYear: boolean;
  /**
   * A full-year estimate for a partial year, extrapolated from the
   * year-to-date figure — only set when the indicator is confirmed
   * cumulative (its YTD figure is a running sum of period values, not a
   * running average/rate) and only on the current partial year's point.
   * null everywhere else, including for indicators where cumulative-ness
   * couldn't be confirmed — no projection is shown rather than guessing.
   */
  projectedValue: number | null;
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
  /** A condensed (<15 word) version of summary's key finding, for the collapsed card view — e.g. "overall decreasing, but increase due to broadened definition." */
  oneLiner: string;
}

/**
 * Real, sourced civic/historical context for why an agency's *service* (its
 * functional area, e.g. "Regulate the trade waste industry in the City.")
 * exists — not why a specific number moved (see IndicatorResearchNote), but
 * why the underlying work matters at all. Keyed by (agencyCode, service)
 * rather than per-indicator, since indicators sharing a service usually
 * share the same origin story.
 */
export interface ServiceContext {
  agencyCode: string;
  service: string;
  /** One sentence, plain language, meant to be appended directly after a data bullet. */
  oneLiner: string;
  /** 2-4 sentences with fuller context, for use elsewhere (e.g. a future agency "about" section). */
  summary: string;
  sources: Array<{ label: string; url: string }>;
}

export interface AgencyNarrative {
  intro: string;
  noteworthyChanges: string[];
  sourceUrl?: string;
}

/** Real seal/logo art for an agency's trading card, keyed by agency slug. Falls back to the generic NYC seal when no distinct one could be found and verified. */
export interface AgencySeal {
  sealPath: string;
  isFallback: boolean;
  source: { label: string; url: string };
}
