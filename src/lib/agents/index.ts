/**
 * Public surface for the simple agent facade.
 *
 * Importers should pull from this index. The deeper `src/lib/oracle/engine`
 * module remains the source of truth for the intelligence pipeline —
 * this layer is a stable, narrow facade on top of it.
 *
 * Example:
 *
 *   import { analyze, normalizeFindings, calculateRiskScore } from "@/lib/agents";
 *   const result = analyze({ identifier: "MoonPaw Inu" });
 *   console.log(result.riskScore, result.findings.length);
 */

export * from "./types";
export * from "./scoring";
export * from "./normalize";

export { WalletAgent, walletAgent } from "./wallet-agent";
export { TokenAgent, tokenAgent } from "./token-agent";
export { NFTAgent, nftAgent } from "./nft-agent";

export {
  CommandBrain,
  commandBrain,
  analyze,
  type AnalyzeInput,
} from "./command-brain";

export {
  engineOutputToResult,
  collapseScoreImpact,
} from "./engine-bridge";
