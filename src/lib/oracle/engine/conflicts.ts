import { netImpact } from "./scoring/aggregate";
import type { AgentOutput, Conflict } from "./types";

/**
 * Conflict detection and resolution.
 *
 * The Command Brain runs every detector in `CONFLICT_RULES` after agents
 * complete. Each detector inspects the AgentOutput collection and may
 * return a `Conflict` describing the disagreement, the resolution rule
 * applied, and a confidence penalty.
 *
 * The collected conflict penalty is fed back into `aggregateConfidence`,
 * so contradictions in the agent set degrade certainty without ever
 * silently overriding any single agent's view. Both sides of a conflict
 * are preserved verbatim in the final report.
 */

type ConflictDetector = (outputs: AgentOutput[]) => Conflict | null;

function find(outputs: AgentOutput[], name: string) {
  return outputs.find((o) => o.agentName === name);
}

const socialVsPattern: ConflictDetector = (outputs) => {
  const social = find(outputs, "Social Signal");
  const pattern = find(outputs, "Pattern Detection");
  if (!social || !pattern) return null;
  const socialNet = netImpact(social);
  const patternNet = netImpact(pattern);
  if (socialNet < 15 && patternNet > 30) {
    return {
      id: "conf_social_vs_pattern_low_high",
      agents: ["Social Signal", "Pattern Detection"],
      description:
        "Social Signal reports a healthy narrative while Pattern Detection flags behavioral anomalies.",
      resolution:
        "Pattern evidence outweighs narrative when the two disagree. Both views preserved.",
      confidencePenalty: 6,
    };
  }
  if (socialNet > 30 && patternNet < 15) {
    return {
      id: "conf_social_vs_pattern_high_low",
      agents: ["Social Signal", "Pattern Detection"],
      description:
        "Social Signal flags amplification, but no on-chain anomalies were detected.",
      resolution:
        "Treated as a watch signal, not a confirmed risk. Score not amplified.",
      confidencePenalty: 4,
    };
  }
  return null;
};

const tokenRiskVsCommunity: ConflictDetector = (outputs) => {
  const tr = find(outputs, "Token Risk");
  const ch = find(outputs, "Community Health");
  if (!tr || !ch) return null;
  const trNet = netImpact(tr);
  const chNet = netImpact(ch);
  if (trNet > 50 && chNet < 10 && ch.status === "ok") {
    return {
      id: "conf_token_vs_community",
      agents: ["Token Risk", "Community Health"],
      description:
        "Token Risk reports severe contract issues while Community Health appears stable.",
      resolution:
        "Contract-level signal takes precedence over community signal. Community confidence noted.",
      confidencePenalty: 3,
    };
  }
  return null;
};

const onChainVsSocial: ConflictDetector = (outputs) => {
  const oc = find(outputs, "On-Chain Analyst");
  const social = find(outputs, "Social Signal");
  if (!oc || !social) return null;
  const ocNet = netImpact(oc);
  const socialNet = netImpact(social);
  if (ocNet > 40 && socialNet < 10) {
    return {
      id: "conf_onchain_vs_social",
      agents: ["On-Chain Analyst", "Social Signal"],
      description:
        "On-chain behavior raises concerns while social channels remain calm.",
      resolution:
        "On-chain evidence is authoritative. Social calm is consistent with controlled narrative management.",
      confidencePenalty: 4,
    };
  }
  return null;
};

const CONFLICT_RULES: ConflictDetector[] = [
  socialVsPattern,
  tokenRiskVsCommunity,
  onChainVsSocial,
];

export function detectConflicts(outputs: AgentOutput[]): Conflict[] {
  const out: Conflict[] = [];
  for (const rule of CONFLICT_RULES) {
    const conflict = rule(outputs);
    if (conflict) out.push(conflict);
  }
  return out;
}

export function totalConfidencePenalty(conflicts: Conflict[]): number {
  return conflicts.reduce((a, c) => a + c.confidencePenalty, 0);
}
