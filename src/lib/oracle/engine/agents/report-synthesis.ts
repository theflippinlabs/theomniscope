import type {
  AgentOutput,
  Conflict,
  EntityType,
  Finding,
  RiskLabel,
} from "../types";
import { BaseAgent, type AgentContext, type AgentOutputBuilder } from "./base";

/**
 * Report Synthesis Agent
 *
 * Final synthesis layer. Turns the merged findings, score, confidence,
 * and any conflicts into a human-facing executive summary, "why this
 * matters" paragraph, recommendations, and explicit limitations.
 */
export class ReportSynthesisAgent extends BaseAgent {
  readonly name = "Report Synthesis";
  readonly version = "1.1.0";

  appliesTo(_t: EntityType): boolean {
    return true;
  }

  protected execute(_ctx: AgentContext, b: AgentOutputBuilder): void {
    b.setSummary(
      "Report Synthesis is invoked by the orchestrator after scoring.",
    );
  }

  synthesize(input: {
    entity: { type: EntityType; label: string };
    score: number;
    confidence: number;
    riskLabel: RiskLabel;
    findings: Finding[];
    conflicts: Conflict[];
  }): {
    executiveSummary: string;
    whyThisMatters: string;
    recommendations: string[];
    limitations: string[];
    output: AgentOutput;
  } {
    const startedAt = Date.now();
    const { entity, score, confidence, riskLabel, findings, conflicts } = input;

    const critical = findings.filter((f) => f.severity === "critical");
    const high = findings.filter((f) => f.severity === "high");
    const medium = findings.filter((f) => f.severity === "medium");
    const headlines = [...critical, ...high].slice(0, 3).map((f) => f.title);

    const executiveSummary =
      score >= 70
        ? `${entity.label} is classified as ${riskLabel.toLowerCase()}. Oracle identified ${critical.length} critical and ${high.length} high-severity factors${headlines.length ? ` — most notably: ${headlines.join("; ")}` : ""}. Proceed only with explicit understanding of the exposure.`
        : score >= 40
          ? `${entity.label} is rated ${riskLabel.toLowerCase()}. ${medium.length} medium-severity factors warrant review before material exposure. No critical contract-level failures detected. Confidence is ${confidence}%.`
          : `${entity.label} is assessed as ${riskLabel.toLowerCase()}. Oracle did not surface severe risks; remaining factors are residual and consistent with normal ${entity.type} behavior at this scale. Confidence is ${confidence}%.`;

    const whyThisMatters =
      score >= 70
        ? "High-risk signals rarely reverse without intervention. When a contract retains privileged functions, liquidity is thin, and narrative is amplified, historical base rates for adverse outcomes are materially elevated."
        : score >= 40
          ? "The combined weight of medium-severity factors does not indicate imminent risk, but it does suggest that a single additional anomaly could tip the entity into a harmful state. Maintain watchlist coverage."
          : "A low score is not an endorsement. Oracle reports what it can observe — confidence reflects what it cannot. Continued monitoring is still recommended for any position of material size.";

    const recommendations: string[] = [];
    if (score >= 70) {
      recommendations.push(
        "Do not expose new capital until risk factors are resolved.",
      );
      recommendations.push(
        "If already exposed, evaluate exit liquidity and slippage.",
      );
      recommendations.push(
        "Add to high-priority watchlist with maximum alert sensitivity.",
      );
    } else if (score >= 40) {
      recommendations.push(
        "Review each medium-severity finding before adjusting exposure.",
      );
      recommendations.push(
        "Enable alerting for score deterioration and narrative shift.",
      );
      recommendations.push(
        "Re-run the analysis after the next market cycle.",
      );
    } else {
      recommendations.push("Maintain standard watchlist monitoring.");
      recommendations.push(
        "Re-run the analysis if exposure increases materially.",
      );
      recommendations.push(
        "Treat the low score as a current observation, not a guarantee.",
      );
    }
    if (confidence < 50) {
      recommendations.unshift(
        "Treat this analysis as preliminary — confidence is below 50%.",
      );
    }

    const limitations: string[] = [
      "Oracle does not read intent — only observable on-chain and social signal.",
      "A low score is not an endorsement; it reflects what Oracle can currently see.",
      "Future market or project outcomes are not predicted.",
    ];
    if (conflicts.length > 0) {
      limitations.push(
        `${conflicts.length} agent conflict(s) reduced certainty in this analysis.`,
      );
    }

    const output: AgentOutput = {
      agentName: this.name,
      entityType: entity.type,
      status: "ok",
      summary: executiveSummary,
      findings: [],
      alerts: [],
      evidence: [
        {
          type: "metric",
          label: "Critical findings",
          value: critical.length,
          source: "computed",
          confidence: 100,
        },
        {
          type: "metric",
          label: "High findings",
          value: high.length,
          source: "computed",
          confidence: 100,
        },
        {
          type: "metric",
          label: "Medium findings",
          value: medium.length,
          source: "computed",
          confidence: 100,
        },
      ],
      scoreImpact: {
        positive: 0,
        negative: 0,
        neutral: 0,
        weightedContribution: 0,
      },
      confidence: { value: confidence, rationale: "Inherited from Risk Scoring" },
      metadata: {
        durationMs: Date.now() - startedAt + 60,
        version: this.version,
        runId: `report-synthesis-${Date.now()}`,
      },
    };

    return {
      executiveSummary,
      whyThisMatters,
      recommendations,
      limitations,
      output,
    };
  }
}
