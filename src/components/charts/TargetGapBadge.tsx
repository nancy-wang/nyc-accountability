import type { OnTargetStatus } from "@/lib/data/types";

const STATUS_CONFIG: Record<OnTargetStatus, { label: string; color: string; icon: string }> = {
  "missed-target": { label: "Missing target", color: "var(--status-critical)", icon: "▲" },
  "on-target": { label: "On target", color: "var(--status-good)", icon: "●" },
  "no-target-set": { label: "No numeric target set", color: "var(--status-neutral)", icon: "–" },
  "no-data": { label: "No recent data", color: "var(--status-neutral)", icon: "–" },
};

export function TargetGapBadge({ status }: { status: OnTargetStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold"
      style={{ borderColor: "var(--accent-heading)", color: "var(--text-primary)" }}
    >
      <span aria-hidden style={{ color: config.color, fontSize: "0.7em" }}>
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}
