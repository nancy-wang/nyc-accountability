import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Indicator, IndicatorResearchNote, ServiceContext, SnapshotMeta } from "./types";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshot");
const INDICATOR_NOTES_DIR = path.join(process.cwd(), "data", "narrative", "indicator-notes");
const SERVICE_CONTEXT_DIR = path.join(process.cwd(), "data", "narrative", "service-context");

let cachedIndicators: Indicator[] | null = null;
let cachedMeta: SnapshotMeta | null = null;
let cachedServiceContext: Map<string, ServiceContext> | null = null;

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

function serviceContextKey(agencyCode: string, service: string): string {
  return `${agencyCode}::${service}`;
}

function loadServiceContext(): Map<string, ServiceContext> {
  const map = new Map<string, ServiceContext>();
  if (!existsSync(SERVICE_CONTEXT_DIR)) return map;
  for (const filename of readdirSync(SERVICE_CONTEXT_DIR)) {
    if (!filename.endsWith(".json")) continue;
    const context = JSON.parse(readFileSync(path.join(SERVICE_CONTEXT_DIR, filename), "utf-8")) as ServiceContext;
    map.set(serviceContextKey(context.agencyCode, context.service), context);
  }
  return map;
}

/**
 * Hand-researched context for why an agency's service exists at all (see
 * ServiceContext) — keyed by (agencyCode, service) rather than a filename
 * id, since the id assigned when this was researched isn't meaningful at
 * lookup time. All files are read once and cached, same pattern as
 * getAllIndicators().
 */
export function getServiceContext(agencyCode: string, service: string): ServiceContext | null {
  if (!cachedServiceContext) {
    cachedServiceContext = loadServiceContext();
  }
  return cachedServiceContext.get(serviceContextKey(agencyCode, service)) ?? null;
}
