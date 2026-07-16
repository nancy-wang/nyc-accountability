import { accountabilitySummary } from "@/lib/data/accountability";
import type { Indicator } from "@/lib/data/types";

export function AccountabilitySummary({ indicator }: { indicator: Indicator }) {
  return (
    <p className="text-base" style={{ color: "var(--text-primary)" }}>
      {accountabilitySummary(indicator)}
    </p>
  );
}
