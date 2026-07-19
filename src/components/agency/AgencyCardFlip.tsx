"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GoalDriver } from "./AgencyCard";
import type { TrendRollup } from "@/lib/data/rollup";
import type { OnTargetStatus } from "@/lib/data/types";

export interface TopIndicator {
  id: number;
  name: string;
  /** Always "on-target" or "missed-target" — only indicators with a numeric target are shown here. */
  status: OnTargetStatus;
  /** Percent of the City's own target hit — >=100 means met or exceeded, regardless of "higher/lower is better" direction. */
  percent: number;
  /** BEAT (comfortably over goal) / MET (right at it) / MISS — see resultTier in AgencyCard. */
  result: "beat" | "met" | "miss";
  actualText: string;
  targetText: string;
}

export interface AgencyCardFlipProps {
  agencyName: string;
  agencySlug: string;
  sealPath: string;
  topicTitle: string;
  introBullets: string[];
  /** The agency's real-world reach/impact stat, shown as the front card's tagline — always impact, never a function description. */
  impactStat: string;
  /** 0-2 real, sourced sentences on what's driving performance — see agencyGoalDrivers in AgencyCard. Each is tagged "positive" (why a target's being hit) or "challenge" (why it's being missed, framed as context — a resourcing gap, a demand surge — not blame). */
  goalDrivers: GoalDriver[];
  trend: TrendRollup;
  topIndicators: TopIndicator[];
  indicatorCount: number;
  /** This agency's 1-based position among all live (indicator-bearing) agencies, and the total count — for the back face's "N of Total" collector numbering. */
  cardIndex: number;
  cardTotal: number;
}

// Barlow Condensed is still used for back-face section labels, badges, and
// the CTA button — kept as its own constant even though both card faces now
// otherwise share the "Scorecard Slam Dunk" palette/font set below.
const FONT_BARLOW_CONDENSED = "var(--font-barlow-condensed), sans-serif";

// Exact palette from the "Scorecard Slam Dunk" back-face template — a
// separate sports-trading-card system, again kept literal (as oklch(), same
// as the template's own CSS) rather than substituted with site colors.
const BACK_COBALT = "oklch(0.42 0.19 264)";
const BACK_COBALT_DEEP = "oklch(0.32 0.17 265)";
const BACK_SAFFRON = "oklch(0.82 0.17 78)";
const BACK_EMBER = "oklch(0.68 0.19 42)";
const BACK_BRICK = "oklch(0.52 0.18 30)";
const BACK_CREAM = "oklch(0.96 0.03 85)";
const BACK_INK = "oklch(0.18 0.02 260)";
const BACK_COURT_GREEN = "oklch(0.55 0.13 155)";
const BACK_MUTED = "oklch(0.92 0.02 85)";
const BACK_MUTED_FG = "oklch(0.45 0.03 260)";
const FONT_BUNGEE = "var(--font-bungee), system-ui, sans-serif";
const FONT_JETBRAINS_MONO = "var(--font-jetbrains-mono), ui-monospace, monospace";

const RESULT_STYLES: Record<TopIndicator["result"], { background: string; color: string }> = {
  beat: { background: BACK_COURT_GREEN, color: BACK_CREAM },
  met: { background: BACK_COBALT, color: BACK_CREAM },
  miss: { background: BACK_BRICK, color: BACK_CREAM },
};

/** Small all-caps section tag matching the template's SectionLabel — an ink chip with saffron text. */
function BackSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block uppercase"
      style={{ fontFamily: FONT_BARLOW_CONDENSED, fontWeight: 700, fontSize: "0.55rem", letterSpacing: "0.1em", color: BACK_SAFFRON, background: BACK_INK, padding: "3px 7px" }}
    >
      {children}
    </span>
  );
}

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

export function AgencyCardFlip({
  agencyName,
  agencySlug,
  sealPath,
  topicTitle,
  introBullets,
  impactStat,
  goalDrivers,
  trend,
  topIndicators,
  indicatorCount,
  cardIndex,
  cardTotal,
}: AgencyCardFlipProps) {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollBodyRef.current;
    if (!el) return;
    // Mouse-wheel scroll doesn't reliably route to a nested overflow-auto
    // element inside a CSS 3D (preserve-3d + rotateY) context — the
    // browser's native hit-testing sends the scroll to the page instead.
    // React's onWheel is attached as a passive listener, so preventDefault
    // there is silently ignored and the native page scroll fires anyway; a
    // real non-passive listener is required to actually stop it.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const toggle = () => setFlipped((f) => !f);
  const shadow = hovered ? CARD_SHADOW_HOVER : CARD_SHADOW;
  const netChange = trend.improving - trend.worsening;
  const netLabel = netChange > 0 ? `Net +${netChange}` : netChange < 0 ? `Net ${netChange}` : "Net even";

  return (
    <div
      style={{ perspective: 1200, WebkitPerspective: 1200 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
        className="relative h-[40rem] w-[19rem] cursor-pointer text-left transition-transform duration-500 motion-reduce:transition-none"
        style={{
          transform: flipped ? "rotateY(180deg)" : "none",
          WebkitTransform: flipped ? "rotateY(180deg)" : "none",
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
        }}
      >
        {/* Front — "Scorecard Slam Dunk" front-of-card template (matches the
            back face's palette/fonts, since both come from the same
            template repo). backfaceVisibility is set as an inline style
            with an explicit -webkit- fallback (not just the unprefixed
            Tailwind arbitrary class) because Safari/WebKit silently ignores
            unprefixed backface-visibility in nested 3D-transform contexts
            like this — without the prefix, the "hidden" face still paints,
            mirrored, directly on top of the visible one. pointerEvents is
            toggled off when flipped for a separate reason:
            backface-visibility only stops painting, not hit-testing, so a
            hidden face can still win elementFromPoint/wheel-target
            resolution over the visible one at the same screen position. */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden transition-shadow duration-300"
          style={{
            borderRadius: 22,
            border: `6px solid ${BACK_BRICK}`,
            background: BACK_COBALT,
            boxShadow: `0 0 0 4px ${BACK_BRICK}, ${shadow}`,
            pointerEvents: flipped ? "none" : "auto",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Top ribbon */}
          <div
            className="relative z-[2] flex shrink-0 items-center justify-between"
            style={{ borderBottom: `3px solid ${BACK_INK}`, background: BACK_BRICK, padding: "7px 12px" }}
          >
            <span className="uppercase" style={{ fontFamily: FONT_BUNGEE, fontSize: "0.46rem", letterSpacing: "0.12em", color: BACK_SAFFRON }}>
              NYC · FY26
            </span>
            <span
              className="uppercase"
              style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.4rem", letterSpacing: "0.14em", color: "rgba(250,246,236,0.85)" }}
            >
              Card {String(cardIndex).padStart(3, "0")}/{cardTotal}
            </span>
          </div>

          {/* Team strip */}
          <div
            className="relative z-[1] shrink-0 text-center"
            style={{ background: "color-mix(in oklch, " + BACK_COBALT_DEEP + " 70%, transparent)", padding: "5px 12px" }}
          >
            <p className="uppercase" style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.4rem", letterSpacing: "0.2em", color: BACK_SAFFRON }}>
              City of New York · Performance Scorecard
            </p>
          </div>

          {/* Corner badge — a purely decorative trading-card flourish (no data claim), matching the template's "ALL CITY" corner star */}
          <div
            aria-hidden
            className="absolute z-10 grid place-items-center rounded-full"
            style={{
              left: 12,
              top: 54,
              width: 46,
              height: 46,
              transform: "rotate(-12deg)",
              border: `3px solid ${BACK_INK}`,
              background: BACK_SAFFRON,
              color: BACK_INK,
              boxShadow: `2px 2px 0 ${BACK_INK}`,
            }}
          >
            <div className="text-center leading-none">
              <p style={{ fontFamily: FONT_BUNGEE, fontSize: "0.32rem", letterSpacing: "0.1em" }}>ALL</p>
              <p style={{ fontFamily: FONT_BUNGEE, fontSize: "0.38rem", letterSpacing: "0.1em" }}>CITY</p>
            </div>
          </div>

          {/* Seal well */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <div
              className="relative grid place-items-center rounded-full"
              style={{ width: 158, height: 158, border: `5px solid ${BACK_SAFFRON}`, background: BACK_CREAM, boxShadow: `0 8px 0 -2px ${BACK_BRICK}` }}
            >
              <img src={sealPath} alt="" aria-hidden className="h-28 w-28 object-contain p-1" />
            </div>
          </div>

          {/* Name plate */}
          <div
            className="relative z-[2] mx-4 shrink-0 rounded-md text-center"
            style={{
              transform: "rotate(-1.2deg)",
              border: `3px solid ${BACK_INK}`,
              background: BACK_CREAM,
              padding: "8px 10px",
              boxShadow: `4px 4px 0 ${BACK_BRICK}`,
            }}
          >
            <p className="uppercase" style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.38rem", letterSpacing: "0.16em", color: BACK_EMBER }}>
              City of New York
            </p>
            <p className="uppercase" style={{ fontFamily: FONT_BUNGEE, fontSize: "0.95rem", lineHeight: 1.1, color: BACK_COBALT }}>
              {agencyName}
            </p>
            {impactStat && (
              <p
                className="mt-1 uppercase"
                style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.36rem", letterSpacing: "0.06em", color: "rgba(24,20,20,0.7)" }}
              >
                {impactStat}
              </p>
            )}
          </div>

          {/* Footer band */}
          <div className="relative z-[2] mt-3 shrink-0 text-center" style={{ borderTop: `3px solid ${BACK_INK}`, background: BACK_SAFFRON, padding: "9px 12px" }}>
            <p className="uppercase" style={{ fontFamily: FONT_BUNGEE, fontSize: "0.42rem", lineHeight: 1.2, letterSpacing: "0.02em", color: BACK_INK }}>
              {topicTitle}
            </p>
          </div>
        </div>

        {/* Back — "Scorecard Slam Dunk" template */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden transition-shadow duration-300"
          style={{
            borderRadius: 18,
            border: `5px solid ${BACK_BRICK}`,
            background: BACK_CREAM,
            boxShadow: shadow,
            pointerEvents: flipped ? "auto" : "none",
            transform: "rotateY(180deg)",
            WebkitTransform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {/* Header */}
          <div className="shrink-0" style={{ background: BACK_COBALT, padding: "10px 12px 9px" }}>
            <div className="flex items-center gap-2.5">
              <div
                className="grid shrink-0 place-items-center rounded-full"
                style={{ width: 40, height: 40, border: `3px solid ${BACK_SAFFRON}`, background: BACK_CREAM }}
              >
                <img src={sealPath} alt="" aria-hidden className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="uppercase"
                  style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.42rem", letterSpacing: "0.16em", color: BACK_SAFFRON }}
                >
                  FY26 · Back of Card · #{String(cardIndex).padStart(3, "0")}
                </p>
                <h3 className="uppercase" style={{ fontFamily: FONT_BUNGEE, fontSize: "0.85rem", lineHeight: 1.15, color: BACK_SAFFRON }}>
                  {agencyName}
                </h3>
              </div>
              <div
                className="shrink-0 rotate-3 text-center"
                style={{ border: `2px solid ${BACK_SAFFRON}`, background: BACK_BRICK, padding: "3px 6px" }}
              >
                <p
                  className="uppercase"
                  style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.34rem", letterSpacing: "0.1em", color: "rgba(250,246,236,0.8)" }}
                >
                  Tracked
                </p>
                <p style={{ fontFamily: FONT_BUNGEE, fontSize: "0.7rem", lineHeight: 1, color: BACK_SAFFRON }}>{indicatorCount}</p>
              </div>
            </div>
            <div className="mt-2.5 pt-2" style={{ borderTop: `2px dashed rgba(250,246,236,0.5)` }}>
              <p
                className="text-center uppercase"
                style={{ fontFamily: FONT_BUNGEE, fontSize: "0.5rem", letterSpacing: "0.08em", color: BACK_CREAM, lineHeight: 1.3 }}
              >
                — Scorecard · {topicTitle} —
              </p>
            </div>
          </div>

          <div ref={scrollBodyRef} className="flex flex-1 flex-col overflow-y-auto overscroll-contain" style={{ padding: "10px 12px" }}>
            {/* Data summary */}
            <BackSectionLabel>Data Summary</BackSectionLabel>
            <ul className="mt-1.5 space-y-1" style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "10px", lineHeight: 1.4, color: BACK_INK }}>
              {introBullets.map((bullet, i) => (
                <li key={i} className="flex gap-1.5">
                  <span aria-hidden className="shrink-0" style={{ color: BACK_EMBER }}>
                    ▸
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {/* Indicator movement */}
            <div className="mt-2.5 rounded-md p-2.5" style={{ border: `2px solid ${BACK_INK}`, background: "rgba(29,55,197,0.95)" }}>
              <p style={{ fontFamily: FONT_BARLOW_CONDENSED, fontSize: "0.6rem", letterSpacing: "0.1em", color: BACK_SAFFRON }} className="uppercase">
                Indicator Movement
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded p-1.5" style={{ border: `2px solid ${BACK_COURT_GREEN}`, background: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: FONT_BUNGEE, fontSize: "1.1rem", lineHeight: 1, color: BACK_CREAM }}>{trend.improving}</p>
                  <p
                    className="mt-0.5 uppercase"
                    style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.36rem", letterSpacing: "0.06em", color: "rgba(250,246,236,0.8)" }}
                  >
                    Improving
                  </p>
                </div>
                <div className="rounded p-1.5" style={{ border: `2px solid ${BACK_SAFFRON}`, background: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: FONT_BUNGEE, fontSize: "1.1rem", lineHeight: 1, color: BACK_CREAM }}>{trend.other}</p>
                  <p
                    className="mt-0.5 uppercase"
                    style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.36rem", letterSpacing: "0.06em", color: "rgba(250,246,236,0.8)" }}
                  >
                    Stable
                  </p>
                </div>
                <div className="rounded p-1.5" style={{ border: `2px solid ${BACK_EMBER}`, background: "rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: FONT_BUNGEE, fontSize: "1.1rem", lineHeight: 1, color: BACK_CREAM }}>{trend.worsening}</p>
                  <p
                    className="mt-0.5 uppercase"
                    style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.36rem", letterSpacing: "0.06em", color: "rgba(250,246,236,0.8)" }}
                  >
                    Worsening
                  </p>
                </div>
              </div>
              <p className="mt-1.5" style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "9px", lineHeight: 1.4, color: "rgba(250,246,236,0.9)" }}>
                <span style={{ color: BACK_SAFFRON, fontWeight: 700 }}>{netLabel}</span> indicators moving in the right direction.
              </p>
            </div>

            {/* Percent of target */}
            <div className="mt-2.5 flex items-baseline justify-between">
              <BackSectionLabel>Target Scorecard</BackSectionLabel>
            </div>
            {topIndicators.length > 0 ? (
              <div className="mt-1.5 shrink-0 overflow-hidden rounded-md" style={{ border: `2px solid ${BACK_INK}` }}>
                {topIndicators.map((indicator, i) => (
                  <div
                    key={indicator.id}
                    className="flex items-start justify-between gap-2 px-2 py-1.5"
                    style={{ borderTop: i === 0 ? "none" : `1.5px solid ${BACK_INK}`, background: i % 2 ? BACK_MUTED : BACK_CREAM }}
                  >
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "9.5px", fontWeight: 600, lineHeight: 1.25, color: BACK_INK }}>
                        {indicator.name}
                      </p>
                      <p style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "8px", lineHeight: 1.3, color: BACK_MUTED_FG }}>
                        Goal {indicator.targetText} · Actual {indicator.actualText}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-sm px-1.5 py-1 text-center uppercase"
                      style={{
                        fontFamily: FONT_BARLOW_CONDENSED,
                        fontWeight: 700,
                        fontSize: "8.5px",
                        letterSpacing: "0.05em",
                        ...RESULT_STYLES[indicator.result],
                      }}
                    >
                      {indicator.result}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1.5" style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "10px", color: BACK_MUTED_FG }}>
                This agency&apos;s tracked indicators don&apos;t have a numeric City target.
              </p>
            )}

            {/* Key drivers — a "challenge" tier (missed target / worsening trend) gets a
                muted brick tint instead of the gold "good news" one, so a resourcing
                gap or demand surge never visually reads as a win. */}
            <div
              className="mt-2.5 rounded-md p-2.5"
              style={{
                background:
                  goalDrivers[0]?.tone === "challenge"
                    ? `color-mix(in oklch, ${BACK_BRICK} 16%, transparent)`
                    : "color-mix(in oklch, var(--brand-gold) 22%, transparent)",
              }}
            >
              <BackSectionLabel>{goalDrivers[0]?.tone === "challenge" ? "Key Challenges" : "Key Drivers"}</BackSectionLabel>
              {goalDrivers.length > 0 ? (
                <ul className="mt-1.5 space-y-1" style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "9.5px", lineHeight: 1.4, color: BACK_INK }}>
                  {goalDrivers.map((driver, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span aria-hidden className="shrink-0" style={{ color: driver.tone === "challenge" ? BACK_BRICK : BACK_INK }}>
                        ◆
                      </span>
                      <span>{driver.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5" style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "9.5px", lineHeight: 1.4, color: BACK_MUTED_FG }}>
                  No researched context yet on what&apos;s driving target performance for this agency.
                </p>
              )}
            </div>
          </div>

          {/* Footer caption */}
          <div className="shrink-0 text-center" style={{ background: BACK_COBALT, padding: "5px 12px" }}>
            <span
              className="uppercase"
              style={{ fontFamily: FONT_JETBRAINS_MONO, fontSize: "0.4rem", letterSpacing: "0.08em", color: BACK_SAFFRON }}
            >
              NYC · FY26 Series · {cardIndex} of {cardTotal}
            </span>
          </div>

          {/* Full-width CTA — the card's one exit to the real accountability
              detail, so it gets the palette's brightest, highest-contrast
              pairing and a full-width tap target rather than sharing a thin
              caption row. */}
          <Link
            href={`/agencies/${agencySlug}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 block text-center uppercase transition-colors duration-150 hover:brightness-95"
            style={{
              fontFamily: FONT_BARLOW_CONDENSED,
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.04em",
              background: BACK_SAFFRON,
              color: BACK_INK,
              padding: "10px 12px",
            }}
          >
            Open Full Report →
          </Link>
        </div>
      </div>
    </div>
  );
}
