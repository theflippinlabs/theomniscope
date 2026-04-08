/**
 * Oracle Sentinel — engine public surface.
 *
 * Importers (UI, tests, future API integrations) should pull from this
 * module rather than reaching into individual files.
 */

export * from "./types";
export * from "./scoring";
export * from "./conflicts";
export {
  prioritizeFindings,
  reduceAlertNoise,
  alertSummaryFrom,
  buildExecutiveSummary,
  buildWhyThisMatters,
  normalizeInvestigation,
} from "./normalize";
export {
  CommandBrain,
  defaultCommandBrain,
  investigate,
  detectEntityType,
  type CommandBrainOptions,
} from "./command-brain";
export {
  buildMockProviderRegistry,
  mockWalletProvider,
  mockTokenProvider,
  mockNftProvider,
  mockSocialProvider,
  mockCommunityProvider,
} from "./providers/mock";
export type {
  ProviderRegistry,
  WalletDataProvider,
  TokenDataProvider,
  NFTDataProvider,
  SocialDataProvider,
  CommunityDataProvider,
  SocialSnapshot,
  CommunitySnapshot,
} from "./providers/types";
export {
  BaseAgent,
  AgentOutputBuilder,
  type OracleAgent,
  type AgentContext,
  type AgentLogEntry,
  SPECIALIZED_AGENTS,
  SCORING_AGENT,
  SYNTHESIS_AGENT,
  OnChainAnalystAgent,
  TokenRiskAgent,
  NFTSentinelAgent,
  SocialSignalAgent,
  CommunityHealthAgent,
  PatternDetectionAgent,
  RiskScoringAgent,
  ReportSynthesisAgent,
} from "./agents";
export { InvestigationLogger } from "./investigations/logger";
