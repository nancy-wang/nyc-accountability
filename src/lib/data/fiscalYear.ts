/** NYC's fiscal year runs July 1 - June 30; FY26 covers Jul 2025 - Jun 2026. */
export function currentFiscalYear(date = new Date()): number {
  const month = date.getMonth(); // 0-indexed; June = 5, July = 6
  const year = date.getFullYear();
  return month >= 6 ? year + 1 : year;
}
