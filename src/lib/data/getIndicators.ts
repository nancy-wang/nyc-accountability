import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Indicator, IndicatorResearchNote, SnapshotMeta } from "./types";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshot");
const INDICATOR_NOTES_DIR = path.join(process.cwd(), "data", "narrative", "indicator-notes");

let cachedIndicators: Indicator[] | null = null;
let cachedMeta: SnapshotMeta | null = null;

function readJson<T>(filename: string): T {
  const filePath = path.join(SNAPSHOT_DIR, filename);
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    throw new Error(
      `Could not read ${filePath}. Run "npm run etl" (or "npm run etl:nypd" for faster local iteration) to generate the data snapshot before building or running the app.`
    );
  }
}

export function getAllIndicators(): Indicator[] {
  if (!cachedIndicators) {
    cachedIndicators = readJson<Indicator[]>("indicators.json");
  }
  return cachedIndicators;
}

export function getSnapshotMeta(): SnapshotMeta {
  if (!cachedMeta) {
    cachedMeta = readJson<SnapshotMeta>("meta.json");
  }
  return cachedMeta;
}

export function getIndicatorsByAgencyCodes(codes: string[]): Indicator[] {
  const set = new Set(codes);
  return getAllIndicators().filter((indicator) => set.has(indicator.agencyCode));
}

export function getIndicatorById(id: number): Indicator | undefined {
  return getAllIndicators().find((indicator) => indicator.id === id);
}

/**
 * Hand-researched context for a specific indicator's chart, e.g. explaining a
 * spike or dip with a real, cited cause. Optional per-indicator — most
 * indicators fall back to the deterministic status/trend badges since this
 * requires genuine research, not something safe to auto-generate.
 */
export function getIndicatorNote(id: number): IndicatorResearchNote | null {
  const filePath = path.join(INDICATOR_NOTES_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8")) as IndicatorResearchNote;
}
