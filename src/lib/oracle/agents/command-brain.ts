import { NFT_FIXTURES, TOKEN_FIXTURES, WALLET_FIXTURES } from "../mock-data";
import { labelFromScore, trendFromDelta } from "../scoring";
import type {
  EntityType,
  IntelligenceReport,
  NFTCollectionProfile,
  TokenProfile,
  WalletProfile,
} from "../types";
import { runCommunityHealth } from "./community-health";
import { runNftSentinel } from "./nft-sentinel";
import { runOnChainAnalyst } from "./onchain-analyst";
import { runPatternDetection } from "./pattern-detection";
import { runReportSynthesis } from "./report-synthesis";
import { runRiskScoring } from "./risk-scoring";
import { runSocialSignal } from "./social-signal";
import { runTokenRisk } from "./token-risk";

/**
 * COMMAND BRAIN
 *
 * Central orchestrator for the Oracle Sentinel multi-agent system.
 * Responsibilities:
 *  - detect entity type
 *  - dispatch specialized agents in the right order
 *  - merge outputs into a unified IntelligenceReport
 *  - resolve contradictions
 *  - delegate final scoring and synthesis
 *  - log the investigation trail
 */
export interface AnalysisInput {
  entityType: EntityType;
  wallet?: WalletProfile;
  token?: TokenProfile;
  nft?: NFTCollectionProfile;
  identifier: string;
  label: string;
}

export function detectEntityType(input: string): {
  type: EntityType;
  wallet?: WalletProfile;
  token?: TokenProfile;
  nft?: NFTCollectionProfile;
  identifier: string;
  label: string;
} {
  const trimmed = input.trim().toLowerCase();

  const wallet = WALLET_FIXTURES.find(
    (w) => w.address.toLowerCase() === trimmed || (w.label ?? "").toLowerCase() === trimmed,
  );
  if (wallet)
    return {
      type: "wallet",
      wallet,
      identifier: wallet.address,
      label: wallet.label ?? wallet.address,
    };

  const token = TOKEN_FIXTURES.find(
    (t) =>
      t.address.toLowerCase() === trimmed ||
      t.symbol.toLowerCase() === trimmed ||
      t.name.toLowerCase() === trimmed,
  );
  if (token)
    return {
      type: "token",
      token,
      identifier: token.address,
      label: `${token.name} (${token.symbol})`,
    };

  const nft = NFT_FIXTURES.find(
    (n) =>
      n.contract.toLowerCase() === trimmed ||
      n.slug.toLowerCase() === trimmed ||
      n.name.toLowerCase() === trimmed,
  );
  if (nft)
    return { type: "nft", nft, identifier: nft.contract, label: nft.name };

  // Default: treat as wallet if it looks like an address
  if (/^0x[0-9a-f]{40}$/.test(trimmed)) {
    return {
      type: "wallet",
      wallet: WALLET_FIXTURES[0],
      identifier: trimmed,
      label: `Unknown wallet ${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`,
    };
  }

  return {
    type: "token",
    token: TOKEN_FIXTURES[0],
    identifier: TOKEN_FIXTURES[0].address,
    label: `${TOKEN_FIXTURES[0].name} (${TOKEN_FIXTURES[0].symbol})`,
  };
}

export function runAnalysis(input: AnalysisInput): IntelligenceReport {
  const agentOutputs: IntelligenceReport["agentOutputs"] = [];

  // --- dispatch ---
  if (input.entityType === "wallet" && input.wallet) {
    agentOutputs.push(runOnChainAnalyst(input.wallet));
    agentOutputs.push(
      runPatternDetection({ entityType: "wallet", wallet: input.wallet }),
    );
    agentOutputs.push(runSocialSignal(input.identifier, input.label, "wallet"));
    agentOutputs.push(runCommunityHealth(input.identifier, input.label, "wallet"));
  } else if (input.entityType === "token" && input.token) {
    agentOutputs.push(runTokenRisk(input.token));
    agentOutputs.push(
      runPatternDetection({ entityType: "token", token: input.token }),
    );
    agentOutputs.push(runSocialSignal(input.identifier, input.label, "token"));
    agentOutputs.push(runCommunityHealth(input.identifier, input.label, "token"));
  } else if (input.entityType === "nft" && input.nft) {
    agentOutputs.push(runNftSentinel(input.nft));
    agentOutputs.push(runPatternDetection({ entityType: "nft", nft: input.nft }));
    agentOutputs.push(runSocialSignal(input.identifier, input.label, "nft"));
    agentOutputs.push(runCommunityHealth(input.identifier, input.label, "nft"));
  }

  // --- conflict resolution ---
  const conflicts: string[] = [];
  const social = agentOutputs.find((o) => o.agent === "Social Signal");
  const pattern = agentOutputs.find((o) => o.agent === "Pattern Detection");
  if (social && pattern) {
    if (social.scoreImpact < 15 && pattern.scoreImpact > 30) {
      conflicts.push(
        "Social Signal reports a healthy narrative while Pattern Detection flags behavioral anomalies. Pattern evidence outweighs narrative when the two disagree.",
      );
    }
    if (social.scoreImpact > 30 && pattern.scoreImpact < 15) {
      conflicts.push(
        "Social Signal flags amplification, but no on-chain anomalies were detected. Treat the social flag as a watch signal, not a confirmed risk.",
      );
    }
  }

  // --- scoring ---
  const scoring = runRiskScoring(input.entityType, agentOutputs);
  agentOutputs.push(scoring.output);

  // --- merge findings/alerts ---
  const findings = agentOutputs.flatMap((o) => o.findings);
  const alerts = agentOutputs.flatMap((o) => o.alerts);

  // --- synthesis ---
  const riskLabel = labelFromScore(scoring.score, scoring.confidence);
  const synthesis = runReportSynthesis({
    entityType: input.entityType,
    entityLabel: input.label,
    score: scoring.score,
    confidence: scoring.confidence,
    riskLabel,
    findings,
  });
  agentOutputs.push(synthesis.output);

  const trendDelta = (scoring.score - 40) / 10;

  return {
    id: `ir_${Date.now()}`,
    entity: {
      type: input.entityType,
      identifier: input.identifier,
      label: input.label,
      chain:
        input.wallet?.chain ?? input.token?.chain ?? input.nft?.chain ?? "Ethereum",
    },
    generatedAt: new Date().toISOString(),
    riskScore: scoring.score,
    confidence: scoring.confidence,
    riskLabel,
    trendDirection: trendFromDelta(trendDelta),
    executiveSummary: synthesis.executiveSummary,
    whyThisMatters: synthesis.whyThisMatters,
    findings,
    alerts,
    breakdown: scoring.breakdown,
    agentOutputs,
    conflicts,
    nextActions: synthesis.nextActions,
  };
}

/**
 * Convenience: analyze by identifier directly.
 */
export function analyzeByIdentifier(identifier: string): IntelligenceReport {
  const detected = detectEntityType(identifier);
  return runAnalysis({
    entityType: detected.type,
    wallet: detected.wallet,
    token: detected.token,
    nft: detected.nft,
    identifier: detected.identifier,
    label: detected.label,
  });
}
