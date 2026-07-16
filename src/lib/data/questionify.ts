import type { Indicator } from "./types";

// Lowercases the first letter for mid-sentence use — unless the fragment
// opens with an acronym (2+ consecutive capitals, e.g. "HIV", "NYC") or what
// looks like a multi-word proper noun / program name (e.g. "Home Care",
// "Adult Protective Services"), signaled by its first two words both being
// capitalized, in which case leave it alone.
function lowerFirst(s: string): string {
  if (s.length === 0) return s;
  const words = s.split(" ");
  if (/^[A-Z]{2,}/.test(words[0])) return s;
  if (words.length >= 2 && /^[A-Z]/.test(words[0]) && /^[A-Z]/.test(words[1])) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function upperFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

// A handful of full phrases this dataset reuses across several indicators
// that read as jargon or, worse, as a different well-known acronym entirely
// ("DHS" nationally means Homeland Security; here it's the City's
// Department of Homeless Services) — swapped for plain language wherever
// they appear, rather than curating each indicator that happens to use them.
const JARGON_PHRASE_SUBSTITUTIONS: Array<[RegExp, string]> = [[/\bDHS shelter services system\b/gi, "city's shelter system"]];

function applyJargonSubstitutions(s: string): string {
  return JARGON_PHRASE_SUBSTITUTIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), s);
}

const SKIP_INITIAL_WORDS = new Set(["and", "of", "the", "for", "&", "in", "to", "a", "an"]);

/**
 * Strips a parenthetical acronym that just repeats the capitalized phrase
 * right before it — e.g. "Adult Protective Services (APS)" ->
 * "Adult Protective Services". This dataset spells out an agency/program
 * name once and then re-abbreviates it in parens; the abbreviation adds
 * nothing a reader doesn't already have, and left in only reads as jargon.
 * Matched by initials: walk backward through the preceding capitalized
 * words (skipping connectors like "and"/"of") until they spell the
 * acronym — if they don't (e.g. "(BIS)" with no matching expansion
 * nearby), the paren is left alone rather than guessed at.
 */
function stripRedundantAcronymParens(s: string): string {
  const out = s.replace(/\(([A-Z]{2,6})\)/g, (match, acronym: string, offset: number, full: string) => {
    const before = full.slice(0, offset);
    const words = before.trim().split(/\s+/);
    let initials = "";
    let i = words.length - 1;
    while (i >= 0 && initials.length < acronym.length) {
      const word = words[i].replace(/[^A-Za-z]/g, "");
      if (!word || SKIP_INITIAL_WORDS.has(word.toLowerCase())) {
        i -= 1;
        continue;
      }
      if (/^[A-Z]/.test(word)) {
        initials = word[0].toUpperCase() + initials;
        i -= 1;
      } else {
        break;
      }
    }
    return initials === acronym ? "" : match;
  });
  return out.replace(/\s{2,}/g, " ").trim();
}

// Only strip trailing parens that are pure unit/period annotations (e.g.
// "(%)", "(days)", "(CY)", "(minutes:seconds)", "(% of system)") — a
// parenthetical like "(tier 1 calls)" or "(Renewal)" is a meaningful
// qualifier, not a unit, and must survive so the question doesn't lose
// information.
const UNIT_PAREN =
  /^(?:%(?:\s+of\s+[\w\s]*)?|CY|FY\d*|preliminary|provisional|annual|total|\$|units?|linear\s+feet|metric\s+tons?|five[\s-]year\s+averages?|\$?000(?:,000)?(?:,000)?|days?|weeks?|months?|years?|hours?|minutes?|minutes?:seconds?|hours?:minutes?|business\s+days?|calendar\s+days?|(?:average\s+)?(?:monthly\s+)?(?:rate\s+)?per\s+[\d,]+[\w\s]*)$/i;

export function stripTrailingUnitParens(s: string): string {
  let out = stripRedundantAcronymParens(applyJargonSubstitutions(s.trim()));

  // A unit-only paren can sit *before* a trailing dash-category breakdown
  // ("Average time to approve X (days) — New") rather than at the string's
  // true end — set the breakdown aside, strip the paren as usual, then
  // reattach it, so "(days)" doesn't survive into the question just because
  // something followed it.
  let suffix = "";
  const beforeDash = out.match(/^(.*\))\s*([—-]\s*.+)$/);
  if (beforeDash) {
    out = beforeDash[1].trim();
    suffix = " " + beforeDash[2].trim();
  }

  for (;;) {
    const m = out.match(/^(.*)\s*\(([^()]*)\)\s*$/);
    if (!m || !UNIT_PAREN.test(m[2].trim())) break;
    out = m[1].trim();
  }
  // "Total" as a trailing em/en-dash breakdown ("X — Total") is redundant
  // once phrased as a question; category breakdowns like "— Male" or
  // "— Renewal" are meaningful and stay.
  out = out.replace(/\s*[—-]\s*Total\s*$/i, "").trim();
  return (out + suffix).trim();
}

// Any of these appearing inside a fragment means it's already a clause
// (has its own verb/preposition structure), not a bare category label —
// appending "cases" to something like "units abated for lead" would be
// nonsense, so this guards the bare-noun fallback below.
const STRUCTURAL_WORD = /\b(?:for|to|by|with|from|of|in|on|at)\b/i;

// A generic past-participle detector (any 3+ letter word ending in "ed")
// rather than a fixed verb list — "Trees planted" needs the same rearrange
// as "Records digitized" even though "planted" is a verb we didn't think to
// list. Doesn't correctly guess passive-voice grammar for the rare
// intransitive case ("statute of limitations expired" -> "were expired" is
// slightly off), but that's a smaller problem than the alternative of a
// list that's permanently one word behind whatever this dataset needs.
const PAST_PARTICIPLE = /^(.+?)\s+(\w{3,}ed)$/i;

// Nouns ending in these suffixes ("enrollment," "circulation," "attendance")
// are usually uncountable — "how many enrollment cases are there" is as
// broken as the ungrammatical bare noun it's meant to fix, so these get
// "how much," not "how many."
const MASS_NOUN_SUFFIX = /(?:tion|sion|ment|ance|ence)$/i;

// Nouns this dataset uses often enough to recognize directly, so "How many
// X complaints are there?"-style phrasing and the value's own unit word
// ("142 complaints") stay in sync — both read off the same detector.
const EXPLICIT_COUNT_NOUN =
  /\b(cases?|applications?|requests?|complaints?|inspections?|projects?|incidents?|claims?|reports?|events?|students?|units?|visits?|calls?|hearings?|referrals?|violations?|summonses?|permits?|licenses?|placements?|allegations?|investigations?|families?|children|persons?|clients?)\b/i;

// Names the automatic heuristics below can't confidently parse (bare crime
// category labels, "X enrollment"/"X membership" mass nouns, rate-flavored
// names that happen to contain a plural word, etc.) — reviewed by hand
// rather than guessed, keyed on the exact indicator name from the source
// dataset. Deliberately excludes rate/ratio/index-style indicators (tons per
// truck-shift, hospitalization rates, attendance, circulation) where no
// single countable noun fits the value, so those still render as a bare
// number rather than a misleading unit.
const CURATED_COUNT_NOUNS: Record<string, string> = {
  // Bare crime-category names already read as "cases" in the question text
  // (see the bare-category fallback below) — same judgment call for the value.
  "Major felony crime": "cases",
  "Murder and non-negligent manslaughter": "cases",
  "Forcible rape": "cases",
  Robbery: "cases",
  "Felonious assault": "cases",
  Burglary: "cases",
  "Grand larceny": "cases",
  "Grand larceny auto": "cases",
  "School safety — Major felony crime": "cases",
  "Major felonies reported on NYC Parks properties — Crimes against property": "cases",
  "Cash Assistance — Caseload (point in time) (000)": "cases",

  // Enrollment/membership figures are people, not an abstract mass noun.
  "Medicaid — Enrollees administered by HRA (000)": "people enrolled",
  "Average center-based child care voucher enrollment": "people enrolled",
  "Average family child care voucher enrollment": "people enrolled",
  "Average informal child care voucher enrollment": "people enrolled",
  "MetroPlus membership": "people enrolled",
  "NYC Care enrollment": "people enrolled",
  "Fair Fares NYC — Total enrollment": "people enrolled",

  "Escapes from secure detention": "escapes",
  "Deaths from unintentional drug overdose (CY) (provisional)": "deaths",
  "Admissions to detention": "admissions",
  "Non-natural deaths of individuals in custody": "deaths",

  "Tons of refuse disposed (000)": "tons",
  "Street trees pruned — Block program": "trees",
  "Single adults entering the DHS shelter services system": "adults",
  "Unsheltered individuals who are estimated to be living on the streets, in parks, under highways, on subways and in the public transportation stations in New York City (HOPE) * (CY)":
    "individuals",
  "Average number of single adults in shelters per day": "adults",
  "Average daily population in detention (total)": "people",
  "Participants in COMPASS NYC programs —School year": "participants",
  "Participants in Summer Youth Employment Program": "participants",
  "Average lunches served daily": "lunches",
  "Average breakfasts served daily": "breakfasts",
  "Lots cleaned citywide": "lots",
  "Financial awards to businesses (facilitated or disbursed)": "awards",
  "Businesses receiving financial awards (facilitated or disbursed)": "businesses",
  "M/WBEs awarded City contracts after receiving procurement and capacity building assistance": "businesses",
  "NYC.gov unique visitors (average monthly) (000)": "visitors",
  "Subscribers to Notify NYC, CorpNet, Advance Warning System, and Community Preparedness Newsletter": "subscribers",
  "Pavement safety markings installed (000,000 linear feet)": "linear feet",
  "DCP initiated planning information and policy analysis initiatives presented to the public": "initiatives",
  "NYC adults who bike regularly (CY)": "adults",
  "Average number of individuals in shelter per day": "individuals",
  "Owners approved for the Medallion Relief Program": "owners",
  "NYC Ferry - Total ridership": "riders",
  "Unique emergency housing maintenance problems requiring HPD response": "problems",
  "Homes projected through land use actions reviewed by the City Planning Commission": "homes",

  // Siblings of the shelter-census entries above — same reasoning, just
  // missed in the first pass. The blanket "per" exclusion below (added for
  // rate-denominator names like "incidents (rate per 1,000 ADP)") would
  // otherwise catch these too: "per day" here is a census cadence, not a
  // rate denominator — the value itself is still a headcount.
  "Average number of families with children in shelters per day": "families",
  "Average number of adult families in shelters per day": "families",
  "Average number of individuals in adult families in shelters per day": "individuals",
  "Average number of individuals in families with children in shelters per day": "individuals",

  // Same false-positive shape, different cause: "per" here is part of the
  // embedded unit "micrograms per deciliter" (the clinical threshold being
  // counted against), not a rate denominator for the indicator's own value
  // — which is still a plain count of children.
  "Childhood blood lead levels – number of children younger than age 6 with blood lead levels of 5 micrograms per deciliter or greater (CY) (preliminary)": "children",
  "Childhood blood lead levels – number of children younger than age 18 with blood lead levels of 5 micrograms per deciliter or greater (CY) (preliminary)": "children",
};

// A small cluster of DOC/DOP indicators whose names combine two things the
// rules above can't clean up on their own: "ADP" (Average Daily Population,
// the rate's denominator — meaningful for the methodology page, but not
// something a reader needs spelled out in the question) and DOC's own
// repetitive "individuals in custody-on-individuals in custody" phrasing
// (the department's preferred people-first term for what used to be called
// "inmate-on-inmate," but tripled up in one sentence it reads as broken).
// Hand-written rather than pattern-matched — reviewed once, keyed on the
// exact source name so a rename falls back to the generic rules instead of
// silently going stale.
const CURATED_QUESTIONS: Record<string, string> = {
  "Youth-on-youth assaults and altercations with injury rate in detention (per 100 total ADP)":
    "How often do youth-on-youth assaults with injury happen in detention?",
  "Youth-on-staff assaults and altercations with injury rate in detention (per 100 total ADP)":
    "How often do youth-on-staff assaults with injury happen in detention?",
  "Weapon recovery rate in detention (average per 100 total ADP)": "How often are weapons recovered in detention?",
  "Illegal substance/prescription or OTC medication recovery rate in detention (average per 100 total ADP)":
    "How often are illegal drugs or medication recovered in detention?",
  "Abscond rate in non-secure detention (average per 100 total ADP in non-secure)":
    "How often do youth abscond from non-secure detention?",
  "Violent individuals in custody-on-individuals in custody incidents (monthly rate per 1,000 ADP)":
    "How often do violent incidents happen between people in custody?",
  "Serious injury to individuals in custody as a result of violent individuals in custody-on-individuals in custody incidents (monthly rate per 1,000 ADP)":
    "How often do violent incidents between people in custody result in serious injury?",
  "Assault on staff by individual in custody (monthly rate per 1,000 ADP)": "How often are staff assaulted by someone in custody?",
  "Serious injury to staff as a result of assault on staff by individual in custody (monthly rate per 1,000 ADP)":
    "How often do assaults on staff by someone in custody result in serious injury?",
  "Department use of force incidents with serious injury (rate per 1,000 ADP)":
    "How often do use-of-force incidents result in serious injury?",
  "Child abuse and/or neglect reports for youth in detention that are substantiated, rate (average per 100 total ADP)":
    "How often are child abuse or neglect reports involving youth in detention substantiated?",

  // DOB tracks the same review-time metrics through two systems: "BIS," its
  // older filing system (elsewhere on this site already described in plain
  // language as DOB's "legacy system"), and "DOB NOW," its newer one. Both
  // are meaningless initialisms to a reader with no reason to know DOB's
  // internal system names, but keeping *which* system is what distinguishes
  // otherwise-identical-sounding indicator pairs, so it stays as a named,
  // explained system rather than being dropped entirely.
  "Average days to complete first plan review – Major Renovations (Alteration I) – Initial applications (BIS)":
    "How many days does it take to complete the first plan review for major renovation (Alteration I) initial applications, filed through DOB's legacy system?",
  "Resubmission plan reviews completed – All applications (BIS)": "How many resubmission plan reviews are completed through DOB's legacy system?",
  "Resubmission plan reviews completed – All applications (DOB NOW)": "How many resubmission plan reviews are completed through DOB NOW?",
  "Average days to complete first plan review – New Buildings – All applications (DOB NOW)":
    "How many days does it take to complete the first plan review for new building applications through DOB NOW?",
  "Average days to complete first plan review – Major Renovations (Alteration CO) – All applications (DOB NOW)":
    "How many days does it take to complete the first plan review for major renovation (Alteration CO) applications through DOB NOW?",
  "Average days to complete first plan review – Minor Renovations (Alteration) – All applications (DOB NOW)":
    "How many days does it take to complete the first plan review for minor renovation applications through DOB NOW?",

  // "HOPE" is NYC's annual point-in-time street-homelessness survey — an
  // unexplained acronym otherwise, on top of one of the longest raw names
  // in the dataset.
  "Unsheltered individuals who are estimated to be living on the streets, in parks, under highways, on subways and in the public transportation stations in New York City (HOPE) * (CY)":
    "How many people are estimated to be living unsheltered, according to the annual HOPE count?",

  "HIV/AIDS Services Administration (HASA) — Individuals receiving services":
    "How many individuals are receiving services from the HIV/AIDS Services Administration?",

  // CEQR/EAS/EIS are City Planning review-process jargon: an EAS is the
  // basic environmental review most zoning actions get; an EIS is the more
  // extensive one required when a project's impact could be significant.
  "Zoning actions with CEQR (EAS) that entered public review within 15 months (%)":
    "What percent of zoning actions needing a basic environmental review entered public review within 15 months?",
  "Zoning actions with CEQR (EIS) that entered public review within 22 months (%)":
    "What percent of zoning actions needing a full environmental impact review entered public review within 22 months?",

  "Average incident resolution time by SLA level (hours) — Critical": "On average, how many hours does it take to resolve a critical-priority IT incident?",

  "Remains identified following the September 11, 2001 attacks (cumulative)":
    "How many sets of remains from the September 11, 2001 attacks have been identified?",

  "English Language Learners testing out of English Language Learner status who did so within 3 years (%)":
    "What percent of English Language Learners exit that status within 3 years?",

  "Public service requests received — Total (Forestry)": "How many public service requests does the Forestry division receive?",

  // "Entering the city's shelter system" (post-substitution) has no
  // structural word the bare-category fallback recognizes as its own
  // clause, so it was inserting an awkward "cases" — "How many single
  // adults entering the city's shelter system cases are there?"
  "Single adults entering the DHS shelter services system": "How many single adults enter the city's shelter system?",
  "Adult families entering the DHS shelter services system": "How many adult families enter the city's shelter system?",
  "Families with children entering the DHS shelter services system": "How many families with children enter the city's shelter system?",

  // "Attendance ... are there" is broken English regardless of jargon — a
  // mass noun ("attendance") needs "how much," not "how many," and the
  // trailing "(pool season)" qualifier defeated the rule that would
  // normally catch that.
  "Attendance at outdoor Olympic and intermediate pools (pool season)":
    "How many people attend outdoor Olympic and intermediate pools during pool season?",

  "Average wait time (tier 1 calls) (minutes:seconds)": "On average, how long is the wait for tier 1 calls?",

  // M/WBE = minority- and women-owned business enterprise, City procurement
  // shorthand with no expansion anywhere in these names.
  "M/WBE award rate (Local Law 1) (%)": "What percent of contracts are awarded to minority- and women-owned businesses?",
  "Completed affordable housing projects that met or exceeded their M/WBE Build Up goal (%)":
    "What percent of completed affordable housing projects met or exceeded their goal for hiring minority- and women-owned businesses?",

  // NYCIDA (NYC Industrial Development Agency) is a distinct entity from
  // EDC, the agency whose page these indicators live on — unlike "NYCEDC"
  // elsewhere in this dataset, it isn't the page's own name, so a reader has
  // no context to infer what it is.
  "Projected three-year job growth associated with closed NYCIDA projects":
    "How much three-year job growth is projected from completed NYC Industrial Development Agency projects?",
  "Projected net City tax revenues generated in connection with closed NYCIDA contracts ($000,000)":
    "How much net City tax revenue is projected from completed NYC Industrial Development Agency contracts?",

  // OCME as a bare acronym works as an adjective ("an OCME facility") but
  // reads badly as a sentence's own subject ("How many fatalities handled
  // by OCME...") — spelled out where it's the subject, left as-is (already
  // says "Medical Examiner" in full) where it's just a modifier.
  "Median time from OCME receipt of decedents' remains to \"Ready to Release\" status (hours:minutes)":
    "On average, how long does it take the Medical Examiner's Office to release a decedent's remains after receiving them?",
  "Fatalities handled by OCME following a mass fatality event": "How many fatalities has the Medical Examiner's Office handled following a mass fatality event?",

  "Services OTI provides": "How many services does the Office of Technology and Innovation provide?",
  "Major incidents that directly impact services that OTI provides":
    "How many major incidents directly impact the services the Office of Technology and Innovation provides?",

  // A trailing paren that isn't a clean UNIT_PAREN match (a compound unit
  // like "000,000 linear feet," or a second paren stacked after the first)
  // survives to the end of the string, which defeats the past-participle
  // and mass-noun rules that only look at the string's literal last word —
  // both fell through to "X cases are there," awkwardly tacking "cases"
  // onto a parenthetical instead of the actual noun.
  "Pavement safety markings installed (000,000 linear feet)": "How many pavement safety markings have been installed?",
  "NYC.gov unique visitors (average monthly) (000)": "On average, how many unique visitors does NYC.gov get per month?",
};

/**
 * Best-effort guess at the countable noun a plain-number value is measured
 * in (e.g. "cases" for "623 cases"), from the indicator's own name — there's
 * no separate unit field in the source data. Deliberately conservative:
 * returns null rather than guessing when nothing in the name clearly names
 * the thing being counted, so ambiguous indicators get flagged for a human
 * to decide rather than silently mislabeled.
 */
export function detectCountNoun(indicatorName: string): string | null {
  if (indicatorName in CURATED_COUNT_NOUNS) return CURATED_COUNT_NOUNS[indicatorName];

  // A "per X" indicator's value is a rate, not a raw count — even when the
  // name itself contains a plural noun like "incidents" (e.g. "incidents
  // (monthly rate per 1,000 ADP)"). Appending that noun would misrepresent
  // "94.9" as a literal count of 94.9 incidents rather than a per-population
  // rate, so these fall through to a bare number instead.
  if (/\bper\b/i.test(indicatorName)) return null;

  const core = stripTrailingUnitParens(indicatorName);

  const explicit = core.match(EXPLICIT_COUNT_NOUN);
  if (explicit) return explicit[1].toLowerCase();

  // "Trees planted" / "Records digitized" — the countable noun is the
  // subject before the participle, not the participle itself.
  const participle = core.match(PAST_PARTICIPLE);
  if (participle) {
    const subjectLastWord = (participle[1].split(/\s+/).pop() ?? "").replace(/[^a-zA-Z]+$/, "");
    if (/s$/i.test(subjectLastWord) && !MASS_NOUN_SUFFIX.test(subjectLastWord) && subjectLastWord.length > 2) {
      return subjectLastWord.toLowerCase();
    }
  }

  const lastWord = (core.split(/\s+/).pop() ?? "").replace(/[^a-zA-Z]+$/, "");
  if (MASS_NOUN_SUFFIX.test(lastWord)) return null;
  if (/s$/i.test(lastWord) && lastWord.length > 2) return lastWord.toLowerCase();

  return null;
}

/**
 * Turns an indicator's MMR-style label (often dense bureaucratic phrasing,
 * e.g. "Average time to complete an investigation (days)") into a plain
 * question a general reader can parse at a glance. Rule-based and
 * deterministic rather than generated per-indicator, so it works for all
 * 609 indicators without hand-authoring. Tuned against a plain-language
 * grader (https://propel-ai-grader.vercel.app/) on real examples — notably
 * "How many forcible rape are there?" (ungrammatical, reads as tone-deaf on
 * a subject like this) needed a countable noun inserted, and dash-joined
 * qualifiers like "X — Cases eligible for services" needed restructuring
 * rather than being appended raw.
 */
export function toPlainLanguageQuestion(indicator: Indicator): string {
  if (indicator.name in CURATED_QUESTIONS) return CURATED_QUESTIONS[indicator.name];

  const core = stripTrailingUnitParens(indicator.name);

  let m = core.match(/response time (?:to|for)\s+(.+)/i);
  if (m) return `How long does it take to respond to ${lowerFirst(m[1])}?`;

  m = core.match(/turnaround time (?:to|for)\s+(.+)/i);
  if (m) return `How long does it take to complete ${lowerFirst(m[1])}?`;

  m = core.match(/(?:average|median)\s+(?:calendar\s+)?days?\s+(?:to|for)\s+(.+)/i);
  if (m) return `How many days does it take to ${lowerFirst(m[1])}?`;

  m = core.match(/(?:average|median)\s+time\s+(?:to|for)\s+(.+)/i);
  if (m) return `How long does it take to ${lowerFirst(m[1])}?`;

  m = core.match(/(?:average|median)\s+days?\s+between\s+(.+)/i);
  if (m) return `On average, how many days pass between ${lowerFirst(m[1])}?`;

  m = core.match(/(?:average|median)\s+days?\s+after\s+(.+)/i);
  if (m) return `On average, how many days does it take after ${lowerFirst(m[1])}?`;

  // "X rate" or "X ratio" already names a computed figure, not a countable
  // thing — "What percent of X rate?" doubles up, and "How many X ratio
  // cases are there?" is worse. Ask what it is instead, regardless of
  // whether the source tagged it Percentage or plain Number. Also matches
  // "ratio for <subgroup>" (e.g. a mortality ratio broken out by group),
  // not just when "rate"/"ratio" is the literal last word.
  if (/\b(?:rate|ratio)(?:$|\s+for\b)/i.test(core)) {
    return `What is the ${lowerFirst(core)}?`;
  }

  if (indicator.measurementType === "Percentage" || /\(%\)\s*$/.test(indicator.name)) {
    return `What percent of ${lowerFirst(core)}?`;
  }

  m = core.match(/^(?:average|median)\s+(.+)/i);
  if (m) return `On average, what is the ${lowerFirst(m[1])}?`;

  m = core.match(/^total\s+(.+)/i);
  if (m) return `What is the total ${lowerFirst(m[1])}?`;

  // "X — Cases eligible for services" -> "How many X cases are eligible for
  // services?" — pulls the generic countable unit forward instead of
  // stranding a dash-joined predicate after "are there."
  m = core.match(/^(.+?)\s*[—-]\s*(Cases?|Applications?|Requests?|Complaints?|Inspections?|Projects?|Incidents?|Claims?|Reports?)\s+(.+)$/i);
  if (m) return `How many ${m[1].trim()} ${m[2].toLowerCase()} are ${lowerFirst(m[3])}?`;

  // "Records digitized" / "Decisions issued" / "Stop work orders rescinded"
  // — a noun phrase ending in a past-participle reads better rearranged.
  m = core.match(PAST_PARTICIPLE);
  if (m) return `How many ${lowerFirst(m[1])} were ${m[2].toLowerCase()}?`;

  if (indicator.measurementType === "TimeSpan") {
    return `How long is the ${lowerFirst(core)}?`;
  }

  if (indicator.measurementType === "Currency") {
    return `How much is the ${lowerFirst(core)}?`;
  }

  // Catch-all for duration-flavored names that don't match any of the
  // "average/median/response/turnaround time" patterns above (a bare "Leak
  // resolution time" with no qualifying verb, for instance) — these aren't
  // countable "cases," so route them to "how long" rather than falling
  // through to the bare-noun fallback below.
  if (/\btime\b/i.test(core)) {
    return `How long is the ${lowerFirst(core)}?`;
  }

  // Strip trailing punctuation (a surviving meaningful paren's closing ")",
  // for instance) before checking word endings, or e.g. "averages)" reads
  // as ending in ")" instead of the "s" it actually ends in.
  const lastWord = (core.split(/\s+/).pop() ?? "").replace(/[^a-zA-Z]+$/, "");

  // Uncountable nouns ("enrollment," "circulation") need "how much," not
  // "how many" — and never take "cases."
  if (MASS_NOUN_SUFFIX.test(lastWord)) {
    return upperFirst(`How much ${lowerFirst(core)} is there?`);
  }

  // Bare category labels ("Forcible rape", "Burglary") read as broken
  // English without a countable noun — "how many forcible rape are there"
  // isn't just awkward, it's a bad way to ask about a subject like this.
  // Skip the insertion when the phrase already ends in a plausible plural
  // (ends in "s") or already reads as its own clause (contains a
  // preposition, so it's not actually a bare label), so this doesn't stack
  // "cases" onto something that isn't one.
  const alreadyPlural = /s$/i.test(lastWord);
  const alreadyClause = STRUCTURAL_WORD.test(core);
  if (!alreadyPlural && !alreadyClause) {
    return upperFirst(`How many ${lowerFirst(core)} cases are there?`);
  }

  return upperFirst(`How many ${lowerFirst(core)} are there?`);
}
