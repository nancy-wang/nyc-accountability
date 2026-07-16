import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { latestPoint, onTargetStatus, trendDirection } from "../../src/lib/data/accountability";
import type { Indicator, SnapshotMeta } from "../../src/lib/data/types";
import { fetchCriticalIndicatorRows } from "./fetchIndicators";
import { groupIntoIndicators } from "./transform";

const OUT_DIR = path.join(process.cwd(), "data", "snapshot");

function parseAgencyFlag(): string | undefined {
  const flag = process.argv.find((arg) => arg.startsWith("--agency="));
  return flag ? flag.split("=")[1] : undefined;
}

async function main() {
  const agency = parseAgencyFlag();
  console.log(`Fetching critical, non-retired, citywide indicators${agency ? ` for agency=${agency}` : " (all agencies)"}...`);

  const { rows, lastModified } = await fetchCriticalIndicatorRows({ agency });
  console.log(`Fetched ${rows.length} raw rows from Socrata.`);

  const grouped = groupIntoIndicators(rows);
  const indicators: Indicator[] = grouped.map((indicator) => {
    const latest = latestPoint(indicator.series);
    return {
      ...indicator,
      onTargetStatus: onTargetStatus(latest?.value ?? null, latest?.targetCurrentFY ?? null, indicator.desiredDirection),
      trend: trendDirection(indicator.series, indicator.desiredDirection),
    };
  });

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "indicators.json"), JSON.stringify(indicators, null, 2));

  const meta: SnapshotMeta = {
    generatedAt: new Date().toISOString(),
    socrataLastModified: lastModified,
    indicatorCount: indicators.length,
  };
  await writeFile(path.join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2));

  console.log(`Wrote ${indicators.length} indicators to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
