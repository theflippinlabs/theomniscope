/**
 * Adapter — engine `Investigation` → legacy `IntelligenceReport`.
 *
 * The internal engine produces a richer Investigation type than the
 * existing UI consumes. This adapter is the single boundary between the
 * two: the engine knows nothing about the UI shape, and the UI keeps
 * its existing imports while the engine evolves underneath.
 */

import type {
  AgentName as LegacyAgentName,
  AgentOutput as LegacyAgentOutput,
  Alert as LegacyAlert,
  Evidence as LegacyEvidence,
  Finding as LegacyFinding,
  IntelligenceReport,
  ScoreBreakdown as LegacyScoreBreakdown,
  Severity as LegacySeverity,
} from "../types";
import type {
  AgentOutput as EngineAgentOutput,
  Investigation,
  Severity as EngineSeverity,
} from "./types";

const LEGAL_AGENT_NAMES: LegacyAgentName[] = [
  "Command Brain",
  "On-Chain Analyst",
  "Token Risk",
  "NFT Sentinel",
  "Social Signal",
  "Community Health",
  "Pattern Detection",
  "Risk Scoring",
  "Report Synthesis",
];

function legacyAgentName(name: string): LegacyAgentName {
  return (LEGAL_AGENT_NAMES.includes(name as LegacyAgentName)
    ? name
    : "Command Brain") as LegacyAgentName;
}

function legacySeverity(s: EngineSeverity): LegacySeverity {
  return s;
}

function adaptFinding(f: EngineAgentOutput["findings"][number]): LegacyFinding {
  return {
    id: f.id,
    title: f.title,
    detail: f.description,
    severity: legacySeverity(f.severity),
    category: f.category,
  };
}

function adaptAlert(a: EngineAgentOutput["alerts"][number]): LegacyAlert {
  return {
    id: a.id,
    title: a.title,
    description: a.reason,
    severity: legacySeverity(a.level),
    triggeredAt: new Date().toISOString(),
  };
}

function adaptEvidence(e: EngineAgentOutput["evidence"][number]): LegacyEvidence {
  return {
    label: e.label,
    value: String(e.value),
    source: e.source,
  };
}

function adaptAgentOutput(o: EngineAgentOutput): LegacyAgentOutput {
  return {
    agent: legacyAgentName(o.agentName),
    entityType: o.entityType === "nft_collection" ? "nft" : (o.entityType as never),
    status: o.status === "error" ? "degraded" : o.status,
    summary: o.summary,
    findings: o.findings.map(adaptFinding),
    alerts: o.alerts.map(adaptAlert),
    evidence: o.evidence.map(adaptEvidence),
    scoreImpact: o.scoreImpact.weightedContribution || o.scoreImpact.negative,
    confidence: o.confidence.value,
    durationMs: o.metadata.durationMs,
  };
}

export function investigationToReport(inv: Investigation): IntelligenceReport {
  const breakdown: LegacyScoreBreakdown[] = inv.scoreBreakdown.map((b) => ({
    label: b.agent,
    weight: b.weight,
    value: Math.round(b.rawScore),
    rationale: b.rationale,
  }));

  const findings = inv.topFindings.map(adaptFinding);
  const alerts = inv.agentOutputs
    .flatMap((o) => o.alerts)
    .map(adaptAlert);

  return {
    id: inv.id,
    entity: {
      type: inv.entityType === "nft_collection" ? "nft" : (inv.entityType as never),
      identifier: inv.entity.identifier,
      label: inv.entity.label,
      chain: inv.entity.chain,
    },
    generatedAt: inv.completedAt,
    riskScore: inv.overallRiskScore,
    confidence: inv.overallConfidence.value,
    riskLabel: inv.riskLabel,
    trendDirection: inv.trendDirection,
    executiveSummary: inv.executiveSummary,
    whyThisMatters: inv.whyThisMatters,
    findings,
    alerts,
    breakdown,
    agentOutputs: inv.agentOutputs.map(adaptAgentOutput),
    conflicts: inv.conflicts.map((c) => `${c.description} ${c.resolution}`),
    nextActions: inv.recommendations,
  };
}
