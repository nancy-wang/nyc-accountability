"use client";

import { useState } from "react";
import Link from "next/link";
import { AgencyTrendBar } from "./AgencyTrendBar";
import type { TrendRollup } from "@/lib/data/rollup";
import type { OnTargetStatus } from "@/lib/data/types";

export interface TopIndicator {
  id: number;
  question: string;
  valueText: string;
  status: OnTargetStatus;
}

export interface AgencyCardFlipProps {
  agencyName: string;
  agencySlug: string;
  sealPath: string;
  indicatorCount: number;
  intro: string | null;
  trend: TrendRollup;
  topIndicators: TopIndicator[];
}

const STATUS_DOT: Record<OnTargetStatus, string> = {
  "on-target": "var(--status-good)",
  "missed-target": "var(--status-critical)",
  "no-target-set": "var(--baseline)",
  "no-data": "var(--baseline)",
};

/**
 * The site's first client component — everywhere else uses server
 * rendering or the native <details> element (see IndicatorCard). A card
 * flip needs real client-side state, so this is a deliberate, isolated
 * exception. All data is precomputed server-side by AgencyCard and passed
 * in as plain props; this component only owns presentation and the
 * flipped/unflipped toggle.
 */
export function AgencyCardFlip({ agencyName, agencySlug, sealPath, indicatorCount, intro, trend, topIndicators }: AgencyCardFlipProps) {
  const [flipped, setFlipped] = useState(false);

  const toggle = () => setFlipped((f) => !f);

  return (
    <div className="[perspective:1200px]">
      {/* A real <button> can't contain the back face's <a> link (interactive
          elements can't nest) — role="button" + manual key handling gets the
          same keyboard/AT behavior while keeping the nested link valid. */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.code === "Enter" || e.code === "Space" || e.code === "NumpadEnter") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-pressed={flipped}
        aria-label={`${agencyName} trading card. ${flipped ? "Showing tracked performance. Activate to show the front." : "Activate to see what this agency does and its tracked performance."}`}
        className="relative h-80 w-56 cursor-pointer text-left [transform-style:preserve-3d] transition-transform duration-500 motion-reduce:transition-none sm:h-96 sm:w-64"
        style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-4 p-4 [backface-visibility:hidden]"
          style={{ borderColor: "var(--brand-blue)", background: "var(--surface-1)" }}
        >
          <img src={sealPath} alt="" aria-hidden className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
          <h3 className="font-display text-center text-base leading-tight sm:text-lg" style={{ color: "var(--accent-heading)" }}>
            {agencyName}
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {indicatorCount} critical {indicatorCount === 1 ? "indicator" : "indicators"} tracked
          </p>
          <span className="mt-auto text-xs font-semibold" style={{ color: "var(--brand-red)" }}>
            Tap to flip ↻
          </span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col rounded-2xl border-4 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ borderColor: "var(--brand-blue)", background: "var(--surface-1)" }}
        >
          <h3 className="font-display text-sm leading-tight" style={{ color: "var(--accent-heading)" }}>
            {agencyName}
          </h3>
          <p className="mt-1.5 flex-1 overflow-y-auto text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
            {intro ?? "A summary of this agency's mission hasn't been researched yet."}
          </p>

          <AgencyTrendBar trend={trend} />

          {topIndicators.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              {topIndicators.map((indicator) => (
                <li key={indicator.id} className="flex items-center gap-1.5">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_DOT[indicator.status] }} />
                  <span className="truncate">
                    {indicator.question} <span style={{ color: "var(--text-muted)" }}>{indicator.valueText}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/agencies/${agencySlug}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 text-xs font-semibold underline"
            style={{ color: "var(--accent-heading)" }}
          >
            Open full page ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
