/**
 * Output normalization layer — intelligence expression polish.
 *
 * The final post-processing step of the Command Brain pipeline. Runs
 * after every agent, after risk scoring, and after synthesis. Produces
 * the sharp, direct, trustworthy output the UI displays.
 *
 * Responsibilities:
 *  - Deduplicate and prioritize findings across all agents
 *  - Reduce and REWRITE alert titles for clarity
 *  - Produce a sharp, natural 1–2 sentence executive summary with
 *    the top 2–3 drivers inlined as prose
 *  - Produce a crisp "why this matters" paragraph that names the
 *    dominant contributor and narrates conflicts cleanly
 *  - Guarantee identical structure across wallet / token / NFT so the
 *    UI never sees entity-type phrasing drift
 *
 * This file does NOT modify any UI, component, page, or style. It only
 * transforms the data the UI already reads via the legacy adapter.
 * The existing agent system, pipeline, and scoring logic are preserved
 * intact — normalization is additive post-processing only.
 */

import type {
  Alert,
  AlertSummary,
  Conflict,
  EntityType,
  Finding,
  Investigation,
  RiskLabel,
  ScoreBreakdownEntry,
  Severity,
} from "./types";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------- title cleanup ----------

/**
 * Strip filler words and bracketed metadata from a finding/alert
 * title so it reads naturally when composed into a sentence.
 *
 * Examples:
 *   "High sell tax (25%)"        → "high sell tax"
 *   "Honeypot pattern detected"  → "honeypot pattern"
 *   "Possible wash-trade signature" → "wash-trade signature"
 *   "Mixer-linked funding detected" → "mixer-linked funding"
 */
function cleanTitle(title: string): string {
  let t = title.trim();
  // Strip trailing parenthetical info
  t = t.replace(/\s*\([^)]*\)\s*$/g, "");
  // Strip common trailing filler verbs
  t = t.replace(
    /\s+(detected|observed|triggered|identified|flagged)\s*$/i,
    "",
  );
  // Strip hedging prefixes
  t = t.replace(/^(possible|potential|suspected)\s+/i, "");
  return t.trim();
}

// ---------- driver extraction ----------

/**
 * Extract 2–3 clean driver phrases from the top findings.
 *
 * Only critical / high-severity findings are eligible as drivers —
 * anything medium or below is considered too weak to headline an
 * executive summary. Falls back to the top weighted agent when no
 * severe findings exist so the summary always has *something* to say.
 */
function extractDrivers(
  topFindings: Finding[],
  scoreBreakdown: ScoreBreakdownEntry[],
  max = 3,
): string[] {
  const severe = topFindings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  );
  if (severe.length > 0) {
    const seen = new Set<string>();
    const drivers: string[] = [];
    for (const f of severe) {
      const phrase = cleanTitle(f.title).toLowerCase();
      if (!phrase || seen.has(phrase)) continue;
      seen.add(phrase);
      drivers.push(phrase);
      if (drivers.length >= max) break;
    }
    return drivers;
  }
  const top = scoreBreakdown[0];
  if (top && top.rawScore > 15) {
    return [top.agent.toLowerCase()];
  }
  return [];
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Map an entity type to the natural noun used in summaries. The noun
 * is identical across every analysis of the same type so the UI never
 * sees phrasing drift between wallet / token / NFT outputs.
 */
function entityNoun(type: EntityType | string): string {
  switch (type) {
    case "wallet":
      return "wallet";
    case "token":
      return "token";
    case "nft_collection":
      return "collection";
    case "mixed":
      return "target";
    default:
      return String(type);
  }
}

// ---------- alert rewriting ----------

/**
 * Small replacement table that rewrites clunky agent-generated alert
 * titles into clean, professional ones. The rewrites are deliberately
 * conservative — anything not in the table passes through cleanTitle
 * and keeps its original wording.
 */
const ALERT_TITLE_REWRITES: Array<[RegExp, string]> = [
  [/wash[- ]trade heuristic triggered/i, "Wash-trade pattern"],
  [/wash[- ]trade heuristic/i, "Wash-trade pattern"],
  [/honeypot indicators/i, "Honeypot contract"],
  [/mixer[- ]origin funds/i, "Mixer-origin funds"],
  [/narrative silence/i, "Communication decline"],
  [/community anomaly/i, "Community activity anomaly"],
];

function rewriteAlertTitle(title: string): string {
  for (const [pattern, replacement] of ALERT_TITLE_REWRITES) {
    if (pattern.test(title)) return replacement;
  }
  return capitalize(cleanTitle(title));
}

/**
 * Rewrite alerts for clarity. Only titles are normalized — reasons
 * are produced by the agents with specific context and are left
 * intact. Internal per-agent outputs are also untouched; this function
 * produces a new list for display at the adapter boundary.
 *
 * Null-safe: null / undefined / title-less entries are dropped.
 */
export function rewriteAlerts(alerts: Alert[]): Alert[] {
  const out: Alert[] = [];
  for (const a of alerts) {
    if (!a || !a.title) continue;
    out.push({ ...a, title: rewriteAlertTitle(a.title) });
  }
  return out;
}

// ---------- findings ----------

export function prioritizeFindings(
  findings: Finding[],
  max = 12,
): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of findings) {
    if (!f || !f.title) continue;
    // Dedup key uses the cleaned title so "Possible wash-trade signature"
    // and "wash-trade signature" collapse to the same entry.
    const key = normalizeKey(cleanTitle(f.title));
    const existing = seen.get(key);
    if (
      !existing ||
      SEVERITY_RANK[f.severity] > SEVERITY_RANK[existing.severity]
    ) {
      seen.set(key, f);
    }
  }
  const sorted = [...seen.values()].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  return sorted.slice(0, max);
}

// ---------- alerts ----------

/**
 * Reduce alert noise at the display boundary.
 *
 *   1. Rewrite titles for clarity (rewriteAlerts)
 *   2. Drop info / low level alerts (they belong in findings)
 *   3. Deduplicate by normalized title
 *   4. Sort most-severe-first
 *   5. Cap at `max`
 *
 * Internal per-agent outputs keep their unfiltered view for debugging.
 */
export function reduceAlertNoise(alerts: Alert[], max = 6): Alert[] {
  const rewritten = rewriteAlerts(alerts);
  const seen = new Map<string, Alert>();
  for (const a of rewritten) {
    if (!a || !a.title) continue;
    if (a.level === "info" || a.level === "low") continue;
    const key = normalizeKey(a.title);
    const existing = seen.get(key);
    if (!existing || SEVERITY_RANK[a.level] > SEVERITY_RANK[existing.level]) {
      seen.set(key, a);
    }
  }
  const sorted = [...seen.values()].sort(
    (a, b) => SEVERITY_RANK[b.level] - SEVERITY_RANK[a.level],
  );
  return sorted.slice(0, max);
}

/** Compute an AlertSummary from an alert list. */
export function alertSummaryFrom(alerts: Alert[]): AlertSummary {
  return {
    critical: alerts.filter((a) => a.level === "critical").length,
    high: alerts.filter((a) => a.level === "high").length,
    medium: alerts.filter((a) => a.level === "medium").length,
    low: alerts.filter((a) => a.level === "low").length,
    info: alerts.filter((a) => a.level === "info").length,
  };
}

// ---------- summaries ----------

/**
 * Sharp, natural-language executive summary.
 *
 * 1–2 sentences, direct, no numeric clutter (score & confidence are
 * rendered separately by the UI). The format adapts by risk band but
 * is otherwise IDENTICAL across wallet / token / NFT so there is no
 * phrasing drift between entity types.
 *
 * Examples:
 *   "High-risk token due to active mint authority, thin liquidity, and
 *    wash-trade pattern. Treat with caution."
 *   "Wallet shows normal behavior with no critical risk signals detected."
 *   "Elevated-risk wallet — mixer-linked funding. Monitor before adjusting
 *    exposure."
 *   "Collection shows mixed signals — wash-trade signature. Watch for
 *    changes."
 *   "Preliminary assessment of this token. Data coverage is limited;
 *    re-run before acting."
 */
export function buildExecutiveSummary(input: {
  entityLabel: string;
  entityType: EntityType | string;
  score: number;
  confidence: number;
  riskLabel: RiskLabel | string;
  topFindings: Finding[];
  scoreBreakdown: ScoreBreakdownEntry[];
}): string {
  const { confidence, entityType, topFindings, scoreBreakdown, riskLabel } =
    input;
  const noun = entityNoun(entityType);
  const drivers = extractDrivers(topFindings, scoreBreakdown, 3);
  const driverPhrase = joinNatural(drivers);

  // Low confidence overrides regardless of score. Prevents the UI from
  // showing a scary verdict when Oracle doesn't have enough data.
  if (confidence < 35 || riskLabel === "Under Review") {
    return driverPhrase
      ? `Preliminary assessment of this ${noun} — limited data around ${driverPhrase}. Re-run with more coverage before acting.`
      : `Preliminary assessment of this ${noun}. Data coverage is limited; re-run before acting.`;
  }

  if (riskLabel === "High Risk") {
    return driverPhrase
      ? `High-risk ${noun} due to ${driverPhrase}. Treat with caution.`
      : `High-risk ${noun}: multiple adverse signals present. Treat with caution.`;
  }

  if (riskLabel === "Elevated Risk") {
    return driverPhrase
      ? `Elevated-risk ${noun} — ${driverPhrase}. Monitor before adjusting exposure.`
      : `Elevated-risk ${noun}. Review recent activity before adjusting exposure.`;
  }

  if (riskLabel === "Neutral") {
    return driverPhrase
      ? `${capitalize(noun)} shows mixed signals — ${driverPhrase}. Watch for changes.`
      : `${capitalize(noun)} shows mixed signals with no dominant driver. Watch for changes.`;
  }

  // Promising (or any unexpected label)
  return `${capitalize(noun)} shows normal behavior with no critical risk signals detected.`;
}

/**
 * "Why this matters" paragraph — a crisp 2–4 sentence context note
 * that explains the score trajectory, identifies the dominant
 * contributor, narrates any conflicts, and flags low confidence.
 * Conflicts are described in narrative form, never as raw objects.
 */
export function buildWhyThisMatters(input: {
  score: number;
  confidence: number;
  conflicts: Conflict[];
  topFindings: Finding[];
  scoreBreakdown?: ScoreBreakdownEntry[];
}): string {
  const { score, confidence, conflicts, topFindings, scoreBreakdown } = input;

  const base =
    score >= 70
      ? "Severe signals rarely reverse without intervention. Historical base rates for adverse outcomes are materially elevated when multiple high-severity findings align."
      : score >= 40
        ? "Medium-severity factors alone do not indicate imminent risk, but a single additional anomaly could tip this entity into a harmful state."
        : "A low score is an observation, not an endorsement. Continued monitoring is still recommended for any position of material size.";

  const extras: string[] = [];

  // Dominant contributor — only surface if it carries real weight
  if (scoreBreakdown && scoreBreakdown.length > 0) {
    const top = scoreBreakdown[0];
    if (top.rawScore > 10 && top.weighted > 4) {
      extras.push(
        `${top.agent} is the dominant contributor, carrying ${Math.round(top.weighted)} weighted points.`,
      );
    }
  }

  const criticalCount = topFindings.filter(
    (f) => f.severity === "critical",
  ).length;
  if (criticalCount > 0) {
    extras.push(
      `${criticalCount} critical finding${criticalCount === 1 ? "" : "s"} require immediate attention.`,
    );
  }

  if (confidence < 50) {
    extras.push("Confidence is below 50%; treat findings as preliminary.");
  }

  if (conflicts.length > 0) {
    extras.push(
      `${conflicts.length} agent disagreement${conflicts.length === 1 ? "" : "s"} noted; both views preserved in the per-agent trail.`,
    );
  }

  return extras.length > 0 ? `${base} ${extras.join(" ")}` : base;
}

// ---------- Investigation-level normalization ----------

/**
 * Normalize an Investigation — the pipeline's final polish step.
 *
 * Returns a new Investigation object. Agent outputs are left untouched
 * so the per-agent Agent Activity panel in the UI continues to render
 * the raw reasoning trail exactly as each agent produced it.
 */
export function normalizeInvestigation(inv: Investigation): Investigation {
  const topFindings = prioritizeFindings(inv.topFindings);

  const executiveSummary = buildExecutiveSummary({
    entityLabel: inv.entity.label,
    entityType: inv.entityType,
    score: inv.overallRiskScore,
    confidence: inv.overallConfidence.value,
    riskLabel: inv.riskLabel,
    topFindings,
    scoreBreakdown: inv.scoreBreakdown,
  });

  const whyThisMatters = buildWhyThisMatters({
    score: inv.overallRiskScore,
    confidence: inv.overallConfidence.value,
    conflicts: inv.conflicts,
    topFindings,
    scoreBreakdown: inv.scoreBreakdown,
  });

  return {
    ...inv,
    topFindings,
    executiveSummary,
    whyThisMatters,
  };
}
