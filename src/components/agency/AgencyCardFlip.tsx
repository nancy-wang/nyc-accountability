"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { AgencyTrendBar } from "./AgencyTrendBar";
import type { TrendRollup } from "@/lib/data/rollup";
import type { OnTargetStatus, TrendDirection } from "@/lib/data/types";
import { formatFiscalYear } from "@/lib/format";

export interface TopIndicatorYear {
  fiscalYear: number;
  valueText: string;
  /** True when this year's figure is a full-year estimate extrapolated from partial-year data, not a final reported total. */
  isProjected: boolean;
}

export interface TopIndicator {
  id: number;
  name: string;
  status: OnTargetStatus;
  trend: TrendDirection;
  years: TopIndicatorYear[];
}

export interface AgencyCardFlipProps {
  agencyName: string;
  agencySlug: string;
  sealPath: string;
  topicTitle: string;
  introBullets: string[];
  /** Deterministic 1-2 sentence "what's going well" summary — see agencyStandoutSummary in AgencyCard. */
  standoutSummary: string;
  trend: TrendRollup;
  topIndicators: TopIndicator[];
}

const STATUS_DOT: Record<OnTargetStatus, string> = {
  "on-target": "var(--status-good)",
  "missed-target": "var(--status-critical)",
  "no-target-set": "var(--baseline)",
  "no-data": "var(--baseline)",
};

/** Green/red arrow flagging whether an indicator's own trend is a positive or negative change — distinct from STATUS_DOT, which flags target-hit status. */
const TREND_ARROW: Record<TrendDirection, { glyph: string; color: string } | null> = {
  improving: { glyph: "▲", color: "var(--status-good)" },
  worsening: { glyph: "▼", color: "var(--status-critical)" },
  flat: null,
  "insufficient-data": null,
};

/**
 * The site's first client component — everywhere else uses server
 * rendering or the native <details> element (see IndicatorCard). A card
 * flip needs real client-side state, so this is a deliberate, isolated
 * exception. All data is precomputed server-side by AgencyCard and passed
 * in as plain props; this component only owns presentation and the
 * flipped/unflipped toggle.
 */
const CARD_SHADOW = "0 14px 30px -8px rgba(30, 42, 120, 0.55), 0 4px 10px -4px rgba(30, 42, 120, 0.35)";
const CARD_SHADOW_HOVER = "0 20px 38px -8px rgba(30, 42, 120, 0.65), 0 6px 14px -4px rgba(30, 42, 120, 0.4)";

/** Diagonal-cut top-left/bottom-right corners — the shield silhouette of a vintage trading card frame, not a plain rounded rect. */
const CARD_CLIP = "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)";
const TITLE_SHADOW = "1px 1px 0 rgba(0,0,0,0.35)";

export function AgencyCardFlip({
  agencyName,
  agencySlug,
  sealPath,
  topicTitle,
  introBullets,
  standoutSummary,
  trend,
  topIndicators,
}: AgencyCardFlipProps) {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);

  const toggle = () => setFlipped((f) => !f);
  const shadow = hovered ? CARD_SHADOW_HOVER : CARD_SHADOW;

  const years = Array.from(new Set(topIndicators.flatMap((indicator) => indicator.years.map((y) => y.fiscalYear)))).sort((a, b) => a - b);

  return (
    <div className="[perspective:1200px]" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
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
        className="relative h-[36rem] w-96 cursor-pointer text-left [transform-style:preserve-3d] transition-transform duration-500 motion-reduce:transition-none sm:h-[38rem] sm:w-[30rem]"
        style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden border-4 transition-shadow duration-300 [backface-visibility:hidden]"
          style={{ borderColor: "var(--brand-blue)", background: "var(--brand-cream)", boxShadow: shadow, clipPath: CARD_CLIP }}
        >
          <div className="relative flex items-center justify-center px-6 py-2.5" style={{ background: "var(--brand-blue)" }}>
            <span
              aria-hidden
              className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-6 rounded-full border-2 px-1.5 py-0.5 text-[8px] font-bold tracking-wide"
              style={{ borderColor: "var(--brand-blue)", background: "var(--brand-gold)", color: "var(--brand-blue)" }}
            >
              NYC
            </span>
            <h3
              className="font-display text-center text-base leading-tight sm:text-lg"
              style={{ color: "var(--brand-gold)", textShadow: TITLE_SHADOW }}
            >
              {agencyName}
            </h3>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
            <img src={sealPath} alt="" aria-hidden className="h-40 w-40 object-contain sm:h-52 sm:w-52" />
          </div>

          <div className="flex flex-col items-center gap-0.5 px-4 py-2.5" style={{ background: "var(--brand-red)" }}>
            <span
              className="max-w-full truncate text-center text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--brand-cream)" }}
              title={topicTitle}
            >
              {topicTitle}
            </span>
            <span className="text-[11px] font-bold" style={{ color: "var(--brand-cream)" }}>
              Tap to flip ↻
            </span>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden border-4 transition-shadow duration-300 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ borderColor: "var(--brand-blue)", background: "var(--brand-cream)", boxShadow: shadow, clipPath: CARD_CLIP }}
        >
          <div className="flex items-center justify-center px-6 py-2" style={{ background: "var(--brand-blue)" }}>
            <h3 className="font-display text-center text-sm leading-tight" style={{ color: "var(--brand-gold)", textShadow: TITLE_SHADOW }}>
              {agencyName}
            </h3>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto p-3">
            <ul className="space-y-1 text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
              {introBullets.map((bullet, i) => (
                <li key={i} className="flex gap-1.5">
                  <span aria-hidden style={{ color: "var(--brand-red)" }}>
                    ▪
                  </span>
                  <span className="line-clamp-3">{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="mt-2">
              <AgencyTrendBar trend={trend} />
            </div>

            {topIndicators.length > 0 && years.length > 0 && (
              <div className="mt-3">
                <div
                  className="grid items-start gap-x-1.5 gap-y-2 text-xs leading-snug"
                  style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${years.length}, minmax(2.1rem, auto))` }}
                >
                  <span />
                  {years.map((fy) => (
                    <span key={fy} className="pt-0.5 text-right font-semibold" style={{ color: "var(--text-muted)" }}>
                      {formatFiscalYear(fy)}
                    </span>
                  ))}
                  {topIndicators.map((indicator) => {
                    const valueByYear = new Map(indicator.years.map((y) => [y.fiscalYear, y]));
                    const arrow = TREND_ARROW[indicator.trend];
                    return (
                      <Fragment key={indicator.id}>
                        <span className="flex min-w-0 items-start gap-1">
                          <span aria-hidden className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_DOT[indicator.status] }} />
                          <span className="line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                            {indicator.name}
                          </span>
                          {arrow && (
                            <span aria-hidden className="shrink-0 text-[9px]" style={{ color: arrow.color }} title={indicator.trend}>
                              {arrow.glyph}
                            </span>
                          )}
                        </span>
                        {years.map((fy) => {
                          const year = valueByYear.get(fy);
                          return (
                            <span key={fy} className="pt-0.5 text-right tabular-nums" style={{ color: "var(--text-primary)" }}>
                              {year ? `${year.valueText}${year.isProjected ? "*" : ""}` : "—"}
                            </span>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </div>
                {topIndicators.some((indicator) => indicator.years.some((y) => y.isProjected)) && (
                  <p className="mt-1 text-right text-[9px]" style={{ color: "var(--text-muted)" }}>
                    *projected from partial-year data
                  </p>
                )}
              </div>
            )}

            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                What's going well
              </p>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--text-secondary)" }}>
                {standoutSummary}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center px-4 py-2" style={{ background: "var(--brand-red)" }}>
            <Link
              href={`/agencies/${agencySlug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] font-bold underline"
              style={{ color: "var(--brand-cream)" }}
            >
              Open full page ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
