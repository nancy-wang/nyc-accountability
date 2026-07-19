import Link from "next/link";
import { effectiveTrend, latestPoint, targetGapBadgeLabel } from "@/lib/data/accountability";
import { getIndicatorNote } from "@/lib/data/getIndicators";
import { toPlainLanguageQuestion } from "@/lib/data/questionify";
import type { AgencyNarrative, Indicator } from "@/lib/data/types";
import { formatIndicatorValue } from "@/lib/format";
import { splitIntoSentences } from "@/lib/text";

const MAX_BULLETS = 3;

function lowerFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Sorts every indicator into "working" or "getting worse," or leaves it out
 * of both when neither applies. Target status wins over trend when both are
 * known — an indicator currently missing its target is the headline concern
 * even if its multi-year trend happens to be improving, and vice versa.
 * Falls back to effectiveTrend() otherwise, which uses a researched note's
 * resolved direction for a volatile indicator when one exists (see
 * effectiveTrend) rather than a mechanical trend field that isn't a
 * trustworthy "better" or "worse" signal on its own for a series that's
 * really just bouncing in a band.
 */
function classify(indicators: Indicator[]): { working: Indicator[]; worsening: Indicator[] } {
  const working: Indicator[] = [];
  const worsening: Indicator[] = [];
  for (const indicator of indicators) {
    if (indicator.onTargetStatus === "missed-target") {
      worsening.push(indicator);
    } else if (indicator.onTargetStatus === "on-target") {
      working.push(indicator);
    } else {
      const trend = effectiveTrend(indicator, getIndicatorNote(indicator.id));
      if (trend === "improving") working.push(indicator);
      else if (trend === "worsening") worsening.push(indicator);
    }
  }
  return { working, worsening };
}

/**
 * "Top" = has a researched note first (a real, cited explanation is more
 * worth a reader's limited attention than a bare stat), then the dataset's
 * own order within each group — a stable sort, so it doesn't reshuffle
 * ties on every render.
 */
function rankBullets(indicators: Indicator[]): Indicator[] {
  return [...indicators].sort((a, b) => Number(getIndicatorNote(a.id) == null) - Number(getIndicatorNote(b.id) == null));
}

function Bullet({ indicator }: { indicator: Indicator }) {
  const note = getIndicatorNote(indicator.id);
  const gap = targetGapBadgeLabel(indicator);
  const detail = note?.oneLiner || (gap ? lowerFirst(gap) : null);
  const latest = latestPoint(indicator.series);
  const valueText = formatIndicatorValue(latest?.value ?? null, indicator.measurementType, indicator.name);

  return (
    <li>
      <Link href={`/indicators/${indicator.id}`} className="underline">
        {toPlainLanguageQuestion(indicator)}
      </Link>
      {": "}
      {valueText}
      {detail && <span style={{ color: "var(--text-muted)" }}> — {detail}</span>}
    </li>
  );
}

function Section({ title, indicators, emptyText }: { title: string; indicators: Indicator[]; emptyText: string }) {
  const shown = indicators.slice(0, MAX_BULLETS);
  const remainder = indicators.length - shown.length;

  return (
    <div>
      <h3 className="font-label text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      {indicators.length === 0 ? (
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          {emptyText}
        </p>
      ) : (
        <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {shown.map((indicator) => (
            <Bullet key={indicator.id} indicator={indicator} />
          ))}
          {remainder > 0 && <li style={{ color: "var(--text-muted)" }}>and {remainder} more below</li>}
        </ul>
      )}
    </div>
  );
}

const MAX_DESCRIPTION_SENTENCES = 2;

/**
 * A real, sourced 1-2 sentence description of the agency itself — what it
 * does and why the work matters — rather than a mechanical target/trend
 * scorecard sentence built from status codes. Falls back to an honest
 * placeholder for the agencies that haven't been researched yet instead of
 * fabricating one.
 */
function agencyDescription(narrative: AgencyNarrative | null): string {
  return narrative?.intro
    ? splitIntoSentences(narrative.intro, MAX_DESCRIPTION_SENTENCES).join(" ")
    : "A summary of this agency's mission hasn't been researched yet.";
}

/**
 * Leads with what the agency is and why it matters, then splits the
 * indicators actually driving its record into two scannable lists — built
 * only from each indicator's own precomputed status/trend and, where one
 * exists, its researched note, same underlying auditable data as before.
 */
export function AgencySummary({ indicators, narrative }: { indicators: Indicator[]; narrative: AgencyNarrative | null }) {
  const { working, worsening } = classify(indicators);
  const rankedWorking = rankBullets(working);
  const rankedWorsening = rankBullets(worsening);

  return (
    <div className="mt-6 rounded-xl border-2 p-5" style={{ borderColor: "var(--border-hairline)", background: "var(--surface-1)" }}>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {agencyDescription(narrative)}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Section title="What's working" indicators={rankedWorking} emptyText="Nothing stands out as a clear win right now." />
        <Section title="What's getting worse" indicators={rankedWorsening} emptyText="Nothing stands out as a clear problem right now." />
      </div>
    </div>
  );
}
