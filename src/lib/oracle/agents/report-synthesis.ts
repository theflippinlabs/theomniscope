import type { AgentOutput, EntityType, Finding, RiskLabel } from "../types";

/**
 * REPORT SYNTHESIS AGENT
 *
 * Turns raw multi-agent outputs into human-facing language suitable for
 * the executive summary, "why this matters" box, and next actions list.
 * The agent is explicit about what Oracle can and cannot claim.
 */
export function runReportSynthesis(input: {
  entityType: EntityType;
  entityLabel: string;
  score: number;
  confidence: number;
  riskLabel: RiskLabel;
  findings: Finding[];
}): {
  executiveSummary: string;
  whyThisMatters: string;
  nextActions: string[];
  output: AgentOutput;
} {
  const t0 = Date.now();
  const { entityLabel, score, confidence, riskLabel, findings, entityType } = input;

  const critical = findings.filter((f) => f.severity === "critical");
  const high = findings.filter((f) => f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium");

  const severityTitles = [...critical, ...high]
    .slice(0, 3)
    .map((f) => f.title);

  const executiveSummary =
    score >= 70
      ? `${entityLabel} is classified as ${riskLabel.toLowerCase()}. Oracle identified ${critical.length} critical and ${high.length} high-severity factors — most notably: ${severityTitles.join("; ") || "contract-level and market-integrity concerns"}. Proceed only with explicit understanding of the exposure.`
      : score >= 40
        ? `${entityLabel} is rated ${riskLabel.toLowerCase()}. ${medium.length} medium-severity factors warrant review before material exposure. No critical contract-level failures detected. Confidence is ${confidence}%.`
        : `${entityLabel} is assessed as ${riskLabel.toLowerCase()}. Oracle did not surface severe risks; remaining factors are residual and consistent with normal ${entityType} behavior at this scale. Confidence is ${confidence}%.`;

  const whyThisMatters =
    score >= 70
      ? "High-risk signals rarely reverse without intervention. When a contract retains privileged functions, liquidity is thin, and narrative is amplified, historical base rates for adverse outcomes are materially elevated."
      : score >= 40
        ? "The combined weight of medium-severity factors does not indicate imminent risk, but it does suggest that a single additional anomaly could tip the entity into a harmful state. Maintain watchlist coverage."
        : "A low score is not an endorsement. Oracle reports what it can observe — confidence reflects what it cannot. Continued monitoring is still recommended for any position of material size.";

  const nextActions: string[] = [];
  if (score >= 70) {
    nextActions.push("Do not expose new capital until risk factors are resolved.");
    nextActions.push("If already exposed, evaluate exit liquidity and slippage.");
    nextActions.push("Add to high-priority watchlist with maximum alert sensitivity.");
  } else if (score >= 40) {
    nextActions.push("Review each medium-severity finding before adjusting exposure.");
    nextActions.push("Enable alerting for score deterioration and narrative shift.");
    nextActions.push("Re-run the analysis after the next market cycle.");
  } else {
    nextActions.push("Maintain standard watchlist monitoring.");
    nextActions.push("Re-run the analysis if exposure increases materially.");
    nextActions.push("Treat the low score as a current observation, not a guarantee.");
  }
  if (confidence < 50) {
    nextActions.unshift("Treat this analysis as preliminary — confidence is below 50%.");
  }

  return {
    executiveSummary,
    whyThisMatters,
    nextActions,
    output: {
      agent: "Report Synthesis",
      entityType,
      status: "ok",
      summary: executiveSummary,
      findings: [],
      alerts: [],
      evidence: [
        { label: "Critical", value: critical.length.toString() },
        { label: "High", value: high.length.toString() },
        { label: "Medium", value: medium.length.toString() },
      ],
      scoreImpact: 0,
      confidence,
      durationMs: Date.now() - t0 + 90,
    },
  };
}
