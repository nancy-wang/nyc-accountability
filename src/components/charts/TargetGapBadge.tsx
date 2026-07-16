import { targetGapBadgeLabel } from "@/lib/data/accountability";
import type { Indicator } from "@/lib/data/types";

/**
 * States only whether the indicator is currently hitting its own target, and
 * by how much — not a trend claim, so (unlike TrendBadge) this shows for
 * volatile indicators too. Renders nothing when there's no numeric target or
 * no recent data to compare.
 */
export function TargetGapBadge({ indicator }: { indicator: Indicator }) {
  const label = targetGapBadgeLabel(indicator);
  if (!label) return null;

  const beating = indicator.onTargetStatus === "on-target";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold"
      style={{ borderColor: "var(--accent-heading)", color: "var(--text-primary)" }}
    >
      <span aria-hidden style={{ color: beating ? "var(--status-good)" : "var(--status-critical)", fontSize: "0.7em" }}>
        {beating ? "●" : "▲"}
      </span>
      {label}
    </span>
  );
}
