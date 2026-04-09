/**
 * Output normalization — intelligence expression polish.
 *
 * The final post-processing step of the Command Brain pipeline. Runs
 * after every agent, after risk scoring, and after synthesis. Produces
 * the decision-grade output the UI displays.
 *
 * Responsibilities:
 *  - Deduplicate and prioritize findings across all agents
 *  - Reduce and REWRITE alert titles for clarity
 *  - Strip hedging language from agent text fields
 *  - Produce a decisive executive summary with an explicit VERDICT
 *    (safe / caution / avoid / preliminary) so every analysis closes
 *    with a clear "what to do" instruction
 *  - Produce tier-aware recommendations that overwrite the synthesis
 *    agent's generic list
 *  - Produce a composed "why this matters" paragraph that aligns with
 *    the same tier
 *  - Guarantee identical logic across wallet / token / NFT
 *
 * This file does NOT modify any UI, component, page, or style. The
 * existing agent system, pipeline, and scoring logic are preserved
 * intact — normalization is additive post-processing that rewrites
 * text output fields in-place without touching the underlying agent
 * logic.
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

// ---------- decision tier ----------

/**
 * Internal decision classification. Not exposed on the Investigation
 * type — it is a computed property used to drive the executive
 * summary, the recommendation list, and the why-this-matters
 * narrative in lock-step.
 *
 *   safe         → no action required; clean baselines
 *   caution      → mixed or elevated signals; reduce exposure / monitor
 *   avoid        → high-risk profile; do not engage
 *   preliminary  → data coverage too limited for a confident verdict
 */
type DecisionTier = "safe" | "caution" | "avoid" | "preliminary";

function classifyDecision(
  riskLabel: RiskLabel | string,
  confidence: number,
): DecisionTier {
  if (confidence < 35 || riskLabel === "Under Review") return "preliminary";
  if (riskLabel === "High Risk") return "avoid";
  if (riskLabel === "Elevated Risk" || riskLabel === "Neutral") return "caution";
  return "safe";
}

// ---------- hedging rewrites ----------

/**
 * Conservative regex-based rewrites that strip hedging language from
 * free-form text (agent summaries, finding descriptions, breakdown
 * rationales). The replacements are grammatically safe — each rule
 * only matches a specific shape where the substitution reads
 * naturally.
 *
 * The goal is decision-grade tone, not literary prose: "appears
 * consistent" becomes "is consistent", "may be concentrated" becomes
 * "is concentrated", "worth attention" becomes "warranting scrutiny".
 */
const HEDGING_REWRITES: Array<[RegExp, string]> = [
  // "appears …"
  [/\bappears\s+to\s+be\s+/gi, "is "],
  [/\bappears\s+operationally\s+healthy/gi, "is operationally healthy"],
  [/\bappears\s+consistent/gi, "is consistent"],
  [/\bappears\s+healthy/gi, "is healthy"],
  [/\bappears\s+clean/gi, "is clean"],
  [/\bappears\s+stable/gi, "is stable"],
  [/\bappears\s+calm/gi, "is calm"],
  [/\bappears\s+normal/gi, "is normal"],

  // "looks …"
  [/\blooks\s+like\b/gi, "resembles"],
  [/\blooks\s+substantive/gi, "is substantive"],
  [/\blooks\s+consistent/gi, "is consistent"],
  [/\blooks\s+clean/gi, "is clean"],
  [/\blooks\s+healthy/gi, "is healthy"],
  [/\blooks\s+normal/gi, "is normal"],

  // "seems …"
  [/\bseems\s+to\s+be\s+/gi, "is "],
  [/\bseems\s+consistent/gi, "is consistent"],
  [/\bseems\s+healthy/gi, "is healthy"],
  [/\bseems\s+clean/gi, "is clean"],

  // Modal weakness
  [/\bmight\s+be\b/gi, "is likely"],
  [/\bcould\s+be\b/gi, "is likely"],
  [/\bmay\s+be\b/gi, "is"],
  [/\bpossibly\s+/gi, ""],
  [/\bperhaps\s+/gi, ""],

  // Weak or awkward phrases
  [/\bworth attention\b/gi, "warranting scrutiny"],
  [/\bworth watching\b/gi, "warranting monitoring"],
  [/\bhigh enough to suggest\b/gi, "sufficient to indicate"],
  [/\bnot inherently risky\b/gi, "no inherent risk"],
  [/\bis still recommended\b/gi, "remains required"],
  [/\btreat as unsafe\b/gi, "classify as unsafe"],
  [/\bresidual risk is normal\b/gi, "no material risks identified"],

  // Noise
  [/\s{2,}/g, " "],
];

/**
 * Re-capitalize the first letter of every sentence. Used after a
 * rewrite may have left lowercase tokens at sentence boundaries (e.g.
 * "detected. classify as unsafe" → "detected. Classify as unsafe").
 */
function fixSentenceCase(text: string): string {
  return text.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_m, p1, p2) => p1 + p2.toUpperCase(),
  );
}

/**
 * Strip hedging from free-form text. Null-safe. Returns the original
 * string unchanged if no rule matches.
 */
export function rewriteHedgingText(text: string): string {
  if (!text || typeof text !== "string") return text;
  let out = text;
  for (const [pattern, replacement] of HEDGING_REWRITES) {
    out = out.replace(pattern, replacement);
  }
  out = fixSentenceCase(out);
  return out.trim();
}

// ---------- title cleanup ----------

/**
 * Strip filler words and bracketed metadata from a finding/alert
 * title so it reads naturally when composed into a sentence.
 */
function cleanTitle(title: string): string {
  let t = title.trim();
  t = t.replace(/\s*\([^)]*\)\s*$/g, "");
  t = t.replace(
    /\s+(detected|observed|triggered|identified|flagged)\s*$/i,
    "",
  );
  t = t.replace(/^(possible|potential|suspected)\s+/i, "");
  return t.trim();
}

// ---------- driver extraction ----------

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
 * Per-noun clean-state templates. Used when no severe findings exist
 * and confidence is healthy. The phrasing is deliberately institutional
 * and decisive — "no risk signals detected" rather than "shows normal
 * behavior".
 */
/**
 * Per-noun clean baselines. Merged into a single sentence via em-dash
 * so the final summary — including the verdict directive — stays at
 * 2 sentences max for institutional readability.
 */
const CLEAN_BASELINE: Record<string, string> = {
  wallet:
    "No risk signals detected on this wallet — behavior aligns with institutional baselines.",
  token:
    "No risk signals detected on this token — contract and market state align with clean baselines.",
  collection:
    "No risk signals detected on this collection — ownership and market state align with healthy baselines.",
  target:
    "No risk signals detected on this target — profile aligns with expected baselines.",
};

/**
 * Terminal directive phrases. Each is the analyst's closing sentence
 * — short, clear, actionable.
 */
const VERDICT_DIRECTIVE: Record<DecisionTier, string> = {
  safe: "No action required.",
  caution: "Caution advised.",
  avoid: "Avoid exposure.",
  preliminary: "Verdict pending broader data; cautious hold advised.",
};

/**
 * Decision-grade executive summary.
 *
 * Every output closes with an explicit verdict directive tied to the
 * decision tier (safe / caution / avoid / preliminary). 1–3 short
 * sentences, no hedging, no numeric clutter, consistent structure
 * across wallet / token / NFT.
 *
 * Examples:
 *   "High-risk profile on this token: active mint authority, high
 *    sell tax, and thin liquidity. Avoid exposure."
 *   "Elevated risk detected on this wallet: mixer-linked funding and
 *    mixer → target chain pattern. Caution advised — reduce exposure
 *    or delay new allocations."
 *   "Mixed signals on this collection: wash-trade signature. Caution
 *    advised — maintain active monitoring."
 *   "No risk signals detected on this wallet. Behavior aligns with
 *    institutional baselines. No action required."
 *   "Preliminary assessment of this token — limited coverage around
 *    thin liquidity. Verdict pending broader data; cautious hold
 *    advised."
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
  const tier = classifyDecision(riskLabel, confidence);

  // --- preliminary ---------------------------------------------------
  if (tier === "preliminary") {
    return driverPhrase
      ? `Preliminary assessment of this ${noun} — limited coverage around ${driverPhrase}. ${VERDICT_DIRECTIVE.preliminary}`
      : `Preliminary assessment of this ${noun}. Data coverage is limited. ${VERDICT_DIRECTIVE.preliminary}`;
  }

  // --- avoid (High Risk) --------------------------------------------
  if (tier === "avoid") {
    const verdict = driverPhrase
      ? `High-risk profile on this ${noun}: ${driverPhrase}. ${VERDICT_DIRECTIVE.avoid}`
      : `High-risk profile on this ${noun}. Multiple adverse signals present. ${VERDICT_DIRECTIVE.avoid}`;
    return confidence < 50
      ? `${verdict} Confidence is limited but the direction is clear.`
      : verdict;
  }

  // --- caution (Elevated Risk / Neutral) ----------------------------
  if (tier === "caution") {
    const isElevated = riskLabel === "Elevated Risk";
    const head = isElevated
      ? (driverPhrase
          ? `Elevated risk detected on this ${noun}: ${driverPhrase}.`
          : `Elevated risk detected on this ${noun}.`)
      : (driverPhrase
          ? `Mixed signals on this ${noun}: ${driverPhrase}.`
          : `Mixed signals on this ${noun} with no dominant driver.`);
    const action = isElevated
      ? "reduce exposure or delay new allocations"
      : "maintain active monitoring";
    // Inline "Caution advised" as a verdict clause (no period) so the
    // em-dash action reads as one continuous directive.
    const verdict = `${head} Caution advised — ${action}.`;
    return confidence < 50
      ? `${verdict} Verdict is directional; confidence is limited.`
      : verdict;
  }

  // --- safe (Promising) ---------------------------------------------
  if (confidence < 50) {
    // Provisional clean: the data says "clean" but coverage is thin.
    // We stay directional but name the caveat explicitly.
    return `Provisional clean signal on this ${noun} — data coverage limited. Monitor for confirmation before increasing exposure.`;
  }
  return `${CLEAN_BASELINE[noun] ?? CLEAN_BASELINE.target} ${VERDICT_DIRECTIVE.safe}`;
}

// ---------- tier-aware recommendations ----------

/**
 * Build the analyst's recommendation list tied to the decision tier.
 * The list overwrites the synthesis agent's generic recommendations
 * during `normalizeInvestigation`, so every analysis ships a
 * consistent, tier-appropriate action plan.
 */
export function buildRecommendations(input: {
  tier: DecisionTier;
  riskLabel: RiskLabel | string;
  confidence: number;
  topFindings: Finding[];
}): string[] {
  const { tier, riskLabel, confidence, topFindings } = input;
  const criticalCount = topFindings.filter(
    (f) => f.severity === "critical",
  ).length;

  const base: string[] = (() => {
    switch (tier) {
      case "avoid":
        return [
          "Do not allocate new capital against this profile.",
          "If already exposed, prioritize exit liquidity and treat slippage as the secondary concern.",
          "Add to high-sensitivity watchlist with maximum alert thresholds.",
        ];
      case "caution":
        return riskLabel === "Elevated Risk"
          ? [
              "Treat any existing exposure as conditional. Reduce if risk factors persist through the next cycle.",
              "Hold off on new allocations until the identified signals resolve.",
              "Enable alerts on score deterioration and narrative shift.",
            ]
          : [
              "Monitor the identified signals for confirmation before adjusting exposure.",
              "Delay material allocation decisions until the mixed signals resolve.",
              "Enable alerts on concentration and market integrity changes.",
            ];
      case "safe":
        return [
          "No action required at the current profile.",
          "Maintain standard watchlist monitoring.",
          "Re-run the analysis if exposure size increases materially.",
        ];
      case "preliminary":
      default:
        return [
          "Hold off on any action until broader data confirms the profile.",
          "Re-run the analysis once additional coverage is available.",
          "Treat the current verdict as tentative pending confirmation.",
        ];
    }
  })();

  // Append tier-crossing caveats.
  if (confidence < 50 && tier !== "preliminary") {
    base.push(
      "Verdict is directional but confidence is limited; re-run when broader coverage arrives.",
    );
  }
  if (criticalCount > 0 && tier !== "safe") {
    base.unshift(
      `${criticalCount} critical finding${criticalCount === 1 ? "" : "s"} require immediate attention before any action.`,
    );
  }
  return base;
}

/**
 * Tier-aware context paragraph. The first sentence is a fixed
 * analyst statement tied to the decision tier; everything after is
 * supporting context (dominant contributor, critical count,
 * confidence warning, conflict note).
 */
const TIER_CONTEXT: Record<DecisionTier, string> = {
  avoid:
    "Severe signals of this magnitude rarely reverse without intervention. Base rates for adverse outcomes are materially elevated under this profile.",
  caution:
    "Observed factors do not establish imminent failure on their own, but the path to escalation is short. Active monitoring is the conservative stance.",
  safe:
    "A clean profile is an observation, not a guarantee. Continued monitoring remains required for positions of material size.",
  preliminary:
    "Data coverage is limited; the current verdict is tentative and should be refreshed once broader observation becomes available.",
};

/**
 * Composed "why this matters" paragraph — aligned with the same
 * decision tier as the executive summary, so the two sections never
 * contradict each other. Names the dominant contributor, the
 * critical-finding count, and any conflicts, then closes with a
 * confidence note when relevant.
 */
export function buildWhyThisMatters(input: {
  score: number;
  confidence: number;
  conflicts: Conflict[];
  topFindings: Finding[];
  scoreBreakdown?: ScoreBreakdownEntry[];
  riskLabel?: RiskLabel | string;
}): string {
  const { confidence, conflicts, topFindings, scoreBreakdown, riskLabel } =
    input;
  const tier = classifyDecision(riskLabel ?? "Neutral", confidence);
  const base = TIER_CONTEXT[tier];

  const extras: string[] = [];

  if (scoreBreakdown && scoreBreakdown.length > 0) {
    const top = scoreBreakdown[0];
    if (top.rawScore > 10 && top.weighted > 4) {
      extras.push(
        `${top.agent} drives the profile, contributing ${Math.round(top.weighted)} weighted points.`,
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

  if (confidence < 50 && tier !== "preliminary") {
    extras.push(
      "Confidence is below 50%; this assessment is tentative until broader coverage arrives.",
    );
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
 * In addition to prioritizing findings and rewriting the executive
 * summary, this step:
 *   - Strips hedging from every agent-produced text field
 *   - Produces a tier-aware executive summary with an explicit verdict
 *   - Produces a tier-aware "why this matters" paragraph
 *   - Overwrites the synthesis agent's generic recommendations with
 *     tier-appropriate actions so the decision layer is consistent
 *     end-to-end
 *
 * Agent business logic is untouched — only the emitted strings are
 * polished.
 */
export function normalizeInvestigation(inv: Investigation): Investigation {
  // 1. Prioritize findings and strip hedging from their descriptions
  const rawTopFindings = prioritizeFindings(inv.topFindings);
  const topFindings: Finding[] = rawTopFindings.map((f) => ({
    ...f,
    description: rewriteHedgingText(f.description),
  }));

  // 2. Rewrite agent summaries and per-agent finding descriptions
  const agentOutputs = inv.agentOutputs.map((o) => ({
    ...o,
    summary: rewriteHedgingText(o.summary),
    findings: o.findings.map((f) => ({
      ...f,
      description: rewriteHedgingText(f.description),
    })),
  }));

  // 3. Rewrite breakdown rationales (shown in the Why This Score panel)
  const scoreBreakdown = inv.scoreBreakdown.map((b) => ({
    ...b,
    rationale: rewriteHedgingText(b.rationale),
  }));

  // 4. Produce a decision-grade executive summary and whyThisMatters
  const executiveSummary = buildExecutiveSummary({
    entityLabel: inv.entity.label,
    entityType: inv.entityType,
    score: inv.overallRiskScore,
    confidence: inv.overallConfidence.value,
    riskLabel: inv.riskLabel,
    topFindings,
    scoreBreakdown,
  });

  const whyThisMatters = buildWhyThisMatters({
    score: inv.overallRiskScore,
    confidence: inv.overallConfidence.value,
    conflicts: inv.conflicts,
    topFindings,
    scoreBreakdown,
    riskLabel: inv.riskLabel,
  });

  // 5. Overwrite the synthesis agent's generic recommendations with a
  //    tier-aware, analyst-grade action list so the decision layer is
  //    consistent end-to-end.
  const tier = classifyDecision(inv.riskLabel, inv.overallConfidence.value);
  const recommendations = buildRecommendations({
    tier,
    riskLabel: inv.riskLabel,
    confidence: inv.overallConfidence.value,
    topFindings,
  });

  return {
    ...inv,
    topFindings,
    agentOutputs,
    scoreBreakdown,
    executiveSummary,
    whyThisMatters,
    recommendations,
  };
}
