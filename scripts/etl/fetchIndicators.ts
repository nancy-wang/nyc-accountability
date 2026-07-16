import { currentFiscalYear } from "../../src/lib/data/fiscalYear";
import { fetchAllRows, type SocrataResult } from "./socrataClient";

export interface RawRow {
  agency: string;
  agency_name: string;
  id: string;
  parentid: string;
  service: string;
  goal: string;
  indicator: string;
  retired: string;
  source: string;
  description: string;
  desireddirection: string;
  frequency: string;
  critical: string;
  measurement_type: string;
  fiscalyear: string;
  valuedate: string;
  acceptedvalue?: string;
  acceptedvalueytd?: string;
  targetmmr?: string;
  multiplication_factor?: string;
}

export interface FetchOptions {
  /** Restrict to one agency code (e.g. "NYPD") for local iteration without refetching everything. */
  agency?: string;
  /**
   * How many fully-completed prior fiscal years of history to pull, on top of the
   * current (often mostly-empty, just-started) fiscal year. Counting the current
   * year as one of the N would under-deliver right after a new fiscal year
   * starts (e.g. 4 real years instead of 5 in early July) — so this is prior
   * years only, and the current year is always included as a bonus on top.
   */
  yearsOfHistory?: number;
}

export async function fetchCriticalIndicatorRows(opts: FetchOptions = {}): Promise<SocrataResult<RawRow>> {
  const yearsOfHistory = opts.yearsOfHistory ?? 5;
  const minFiscalYear = currentFiscalYear() - yearsOfHistory;

  const whereClauses = [`critical='Yes'`, `retired='No'`, `id=parentid`, `fiscalyear >= '${minFiscalYear}'`];
  if (opts.agency) {
    whereClauses.push(`agency='${opts.agency}'`);
  }

  return fetchAllRows<RawRow>({
    where: whereClauses.join(" AND "),
    order: "id,valuedate",
  });
}
