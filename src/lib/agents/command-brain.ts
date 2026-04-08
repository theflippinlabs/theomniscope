import { defaultCommandBrain as engineBrain } from "../oracle/engine/command-brain";
import { NFTAgent, nftAgent } from "./nft-agent";
import {
  buildScoreBreakdown,
  calculateConfidence,
  calculateRiskScore,
} from "./scoring";
import { TokenAgent, tokenAgent } from "./token-agent";
import type {
  AgentResult,
  EntityType,
  PipelineResult,
  ResolvedEntity,
} from "./types";
import { WalletAgent, walletAgent } from "./wallet-agent";

/**
 * CommandBrain
 *
 * Orchestrator for the simple agent facade. Flow:
 *
 *   input →
 *   CommandBrain →
 *   (WalletAgent | TokenAgent | NFTAgent) →
 *   aggregation (calculateRiskScore + calculateConfidence + buildScoreBreakdown) →
 *   final PipelineResult
 *
 * CommandBrain does not duplicate intelligence — it delegates entity
 * resolution to the internal engine (so labels, addresses, and symbols
 * resolve identically to the rest of the product), picks the correct
 * facade agent, runs it, and builds a flat, UI-free final result.
 */
export interface AnalyzeInput {
  identifier: string;
  /**
   * Optional hint that bypasses auto-detection. Useful when the caller
   * already knows the entity type (e.g. a "Token" tab).
   */
  type?: EntityType;
}

/**
 * Default entity-type weights used when computing the single-agent
 * pipeline score. We run one facade agent per request, so its weight
 * is 1.0 — the breakdown is produced for transparency and for parity
 * with the engine's score breakdown shape.
 */
const DEFAULT_WEIGHT = 1.0;

export class CommandBrain {
  readonly name = "CommandBrain";
  readonly version = "1.0.0";

  private wallet: WalletAgent;
  private token: TokenAgent;
  private nft: NFTAgent;

  constructor(opts?: {
    wallet?: WalletAgent;
    token?: TokenAgent;
    nft?: NFTAgent;
  }) {
    this.wallet = opts?.wallet ?? walletAgent;
    this.token = opts?.token ?? tokenAgent;
    this.nft = opts?.nft ?? nftAgent;
  }

  /**
   * Resolve an identifier into a `ResolvedEntity`. Uses the internal
   * engine for resolution so labels / addresses / symbols work the
   * same way across the product.
   */
  resolve(input: AnalyzeInput): ResolvedEntity {
    const engineHint =
      input.type === "nft"
        ? "nft_collection"
        : input.type === "wallet"
          ? "wallet"
          : input.type === "token"
            ? "token"
            : undefined;
    const resolved = engineBrain.resolveEntity({
      identifier: input.identifier,
      hint: engineHint,
    });
    const type: EntityType =
      resolved.type === "nft_collection"
        ? "nft"
        : resolved.type === "mixed"
          ? "wallet"
          : (resolved.type as EntityType);
    return {
      type,
      identifier: resolved.identifier,
      label: resolved.label,
      chain: resolved.chain,
    };
  }

  /**
   * Run the pipeline end-to-end. Never throws — returns a valid
   * PipelineResult with sensible defaults even for unresolved inputs.
   */
  analyze(input: AnalyzeInput): PipelineResult {
    const entity = this.resolve(input);
    const agent = this.pickAgent(entity.type);
    const result = agent.analyze(input.identifier);

    const agentResults: Record<string, AgentResult> = {
      [agent.name]: result,
    };
    const weights = { [agent.name]: DEFAULT_WEIGHT };
    const breakdown = buildScoreBreakdown(agentResults, weights);

    const riskScore = calculateRiskScore(
      breakdown.map((b) => ({ weight: b.weight, value: b.raw })),
    );
    const confidenceScore = calculateConfidence([result.confidence], 1);

    return {
      entity,
      riskScore,
      confidenceScore,
      breakdown,
      findings: result.findings,
      alerts: result.alerts,
      agentResults,
      summary: result.summary,
    };
  }

  private pickAgent(type: EntityType): WalletAgent | TokenAgent | NFTAgent {
    switch (type) {
      case "wallet":
        return this.wallet;
      case "token":
        return this.token;
      case "nft":
        return this.nft;
    }
  }
}

/**
 * Default singleton, ready for use from any call site.
 */
export const commandBrain = new CommandBrain();

/**
 * Convenience function for the common "analyze one identifier" case.
 */
export function analyze(input: AnalyzeInput): PipelineResult {
  return commandBrain.analyze(input);
}
