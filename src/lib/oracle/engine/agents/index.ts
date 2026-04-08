/**
 * Agent registry.
 *
 * Concrete agents are constructed once at module load. The Command Brain
 * picks from this list based on entity type and depth.
 */

import { CommunityHealthAgent } from "./community-health";
import { NFTSentinelAgent } from "./nft-sentinel";
import { OnChainAnalystAgent } from "./onchain-analyst";
import { PatternDetectionAgent } from "./pattern-detection";
import { ReportSynthesisAgent } from "./report-synthesis";
import { RiskScoringAgent } from "./risk-scoring";
import { SocialSignalAgent } from "./social-signal";
import { TokenRiskAgent } from "./token-risk";

export {
  CommunityHealthAgent,
  NFTSentinelAgent,
  OnChainAnalystAgent,
  PatternDetectionAgent,
  ReportSynthesisAgent,
  RiskScoringAgent,
  SocialSignalAgent,
  TokenRiskAgent,
};

export const onChainAnalyst = new OnChainAnalystAgent();
export const tokenRisk = new TokenRiskAgent();
export const nftSentinel = new NFTSentinelAgent();
export const socialSignal = new SocialSignalAgent();
export const communityHealth = new CommunityHealthAgent();
export const patternDetection = new PatternDetectionAgent();
export const riskScoring = new RiskScoringAgent();
export const reportSynthesis = new ReportSynthesisAgent();

export const SPECIALIZED_AGENTS = [
  onChainAnalyst,
  tokenRisk,
  nftSentinel,
  socialSignal,
  communityHealth,
  patternDetection,
] as const;

export const SCORING_AGENT = riskScoring;
export const SYNTHESIS_AGENT = reportSynthesis;

export { BaseAgent, AgentOutputBuilder } from "./base";
export type { OracleAgent, AgentContext, AgentLogEntry } from "./base";
