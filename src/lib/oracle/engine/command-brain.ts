import {
  SCORING_AGENT,
  SPECIALIZED_AGENTS,
  SYNTHESIS_AGENT,
  type AgentContext,
  type OracleAgent,
} from "./agents";
import { detectConflicts, totalConfidencePenalty } from "./conflicts";
import { InvestigationLogger } from "./investigations/logger";
import { normalizeInvestigation } from "./normalize";
import {
  buildMockProviderRegistry,
  type ProviderRegistry,
} from "./providers";
import { labelFromScore, trendFromScore } from "./scoring";
import { SEVERITY_ORDER } from "./types";
import type {
  AgentOutput,
  AlertSummary,
  AnalysisRequest,
  EntityType,
  Investigation,
  ResolvedEntity,
} from "./types";

/**
 * Command Brain
 *
 * The central orchestrator. Responsibilities:
 *
 *  1. Receive a user request.
 *  2. Validate and resolve the target entity through providers.
 *  3. Classify the entity type.
 *  4. Select the agents that apply.
 *  5. Run agents (in priority order).
 *  6. Normalize and merge their outputs.
 *  7. Detect agent conflicts and apply confidence penalties.
 *  8. Hand off to the Risk Scoring agent for weighted aggregation.
 *  9. Hand off to the Report Synthesis agent for executive language.
 * 10. Log the investigation trail and return a single Investigation object.
 *
 * The orchestrator is fully synchronous so the engine can run inside
 * React render paths, at module load, and inside tests without async
 * plumbing. Real APIs should be wrapped in pre-warmed providers.
 */
export interface CommandBrainOptions {
  providers?: ProviderRegistry;
  /**
   * Optional pre-built logger. If omitted, the orchestrator creates
   * a fresh logger per investigation.
   */
  logger?: InvestigationLogger;
}

export class CommandBrain {
  private providers: ProviderRegistry;

  constructor(opts: CommandBrainOptions = {}) {
    this.providers = opts.providers ?? buildMockProviderRegistry();
  }

  /**
   * Swap the provider registry on this brain. Used by the HTTP
   * provider install helper to replace the default mock registry
   * with a hybrid registry (HTTP cache + mock fallback) without
   * touching any agent, scoring, or pipeline logic.
   */
  setProviders(providers: ProviderRegistry): void {
    this.providers = providers;
  }

  /**
   * Read-only accessor for the current provider registry. Useful
   * for tests that want to inspect the active registry without
   * touching its internals.
   */
  getProviders(): ProviderRegistry {
    return this.providers;
  }

  /**
   * Resolve an identifier into a fully populated entity. Tries the
   * provider registry in priority order based on the optional hint.
   */
  resolveEntity(req: AnalysisRequest): ResolvedEntity {
    const id = req.identifier.trim();

    const tryWallet = () => this.providers.wallet.resolve(id);
    const tryToken = () => this.providers.token.resolve(id);
    const tryNft = () => this.providers.nft.resolve(id);

    // Honor explicit hint first
    if (req.hint === "wallet") {
      const w = tryWallet();
      if (w)
        return {
          type: "wallet",
          identifier: w.address,
          label: w.label ?? w.address,
          chain: w.chain,
          wallet: w,
        };
    }
    if (req.hint === "token") {
      const t = tryToken();
      if (t)
        return {
          type: "token",
          identifier: t.address,
          label: `${t.name} (${t.symbol})`,
          chain: t.chain,
          token: t,
        };
    }
    if (req.hint === "nft_collection") {
      const c = tryNft();
      if (c)
        return {
          type: "nft_collection",
          identifier: c.contract,
          label: c.name,
          chain: c.chain,
          nft: c,
        };
    }

    // Fallback: try each provider in order
    const w = tryWallet();
    if (w)
      return {
        type: "wallet",
        identifier: w.address,
        label: w.label ?? w.address,
        chain: w.chain,
        wallet: w,
      };
    const t = tryToken();
    if (t)
      return {
        type: "token",
        identifier: t.address,
        label: `${t.name} (${t.symbol})`,
        chain: t.chain,
        token: t,
      };
    const c = tryNft();
    if (c)
      return {
        type: "nft_collection",
        identifier: c.contract,
        label: c.name,
        chain: c.chain,
        nft: c,
      };

    // Last resort: a 0x-shaped address falls back to the first wallet fixture
    if (/^0x[0-9a-fA-F]{40}$/.test(id)) {
      const fallback = this.providers.wallet.resolve(
        this.providers.wallet.resolve("Whale 042")?.address ?? id,
      );
      if (fallback) {
        return {
          type: "wallet",
          identifier: id,
          label: `Unknown wallet ${id.slice(0, 6)}…${id.slice(-4)}`,
          chain: fallback.chain,
          wallet: fallback,
        };
      }
    }

    // Absolute fallback — return a degraded entity. This will produce a
    // partial Investigation rather than throwing.
    return {
      type: "wallet",
      identifier: id,
      label: id || "unknown",
    };
  }

  /**
   * Run a full investigation pipeline.
   */
  investigate(req: AnalysisRequest): Investigation {
    const startedAt = new Date().toISOString();
    const logger = new InvestigationLogger();
    logger.info("CommandBrain", "investigation received", { req });

    const entity = this.resolveEntity(req);
    logger.info("CommandBrain", "entity resolved", {
      type: entity.type,
      identifier: entity.identifier,
    });

    const depth = req.depth ?? "deep";

    // Select applicable specialized agents
    const selected: OracleAgent[] = SPECIALIZED_AGENTS.filter((a) =>
      a.appliesTo(entity.type),
    );
    logger.info("CommandBrain", "agents selected", {
      agents: selected.map((a) => a.name),
    });

    // Build the per-agent context
    const ctx: AgentContext = {
      entity,
      providers: this.providers,
      depth,
      log: (entry) =>
        logger.log("agent", entry.level, entry.message, entry.data),
    };

    // Execute agents
    const agentOutputs: AgentOutput[] = [];
    for (const agent of selected) {
      const out = agent.run(ctx);
      logger.info("CommandBrain", `${agent.name} completed`, {
        status: out.status,
        confidence: out.confidence.value,
        durationMs: out.metadata.durationMs,
      });
      agentOutputs.push(out);
    }

    // Conflict resolution
    const conflicts = detectConflicts(agentOutputs);
    if (conflicts.length > 0) {
      logger.warn("CommandBrain", `${conflicts.length} conflict(s) detected`);
    }
    const conflictPenalty = totalConfidencePenalty(conflicts);

    // Risk scoring
    const scoring = SCORING_AGENT.score(
      entity.type,
      agentOutputs,
      conflictPenalty,
    );
    agentOutputs.push(scoring.output);
    logger.info("CommandBrain", "risk scored", {
      score: scoring.score,
      confidence: scoring.confidence.value,
    });

    const riskLabel = labelFromScore(scoring.score, scoring.confidence.value);
    const trendDirection = trendFromScore(scoring.score);

    // Merge findings/alerts
    const findings = agentOutputs.flatMap((o) => o.findings);
    const alerts = agentOutputs.flatMap((o) => o.alerts);
    const topFindings = [...findings].sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    );
    const evidenceHighlights = agentOutputs
      .flatMap((o) => o.evidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    // Synthesis
    const synthesis = SYNTHESIS_AGENT.synthesize({
      entity: { type: entity.type, label: entity.label },
      score: scoring.score,
      confidence: scoring.confidence.value,
      riskLabel,
      findings,
      conflicts,
    });
    agentOutputs.push(synthesis.output);
    logger.info("CommandBrain", "synthesis complete");

    const alertSummary: AlertSummary = {
      critical: alerts.filter((a) => a.level === "critical").length,
      high: alerts.filter((a) => a.level === "high").length,
      medium: alerts.filter((a) => a.level === "medium").length,
      low: alerts.filter((a) => a.level === "low").length,
      info: alerts.filter((a) => a.level === "info").length,
    };

    const completedAt = new Date().toISOString();
    logger.info("CommandBrain", "investigation complete");

    const investigation: Investigation = {
      id: `inv_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`,
      entity,
      entityType: entity.type,
      startedAt,
      completedAt,
      depth,
      participatingAgents: agentOutputs.map((o) => o.agentName),
      overallRiskScore: scoring.score,
      overallConfidence: scoring.confidence,
      riskLabel,
      trendDirection,
      executiveSummary: synthesis.executiveSummary,
      whyThisMatters: synthesis.whyThisMatters,
      topFindings,
      alertSummary,
      evidenceHighlights,
      scoreBreakdown: scoring.breakdown,
      agentOutputs,
      recommendations: synthesis.recommendations,
      limitations: synthesis.limitations,
      conflicts,
      log: logger.flush(),
    };

    // Final normalization pass: dedupe/prioritize findings, produce a
    // crisp 1–2 line executive summary, and guarantee a consistent
    // shape across wallet / token / NFT. The agent system, pipeline,
    // and scoring logic above are unchanged — this is additive
    // post-processing only.
    return normalizeInvestigation(investigation);
  }
}

/**
 * Default singleton bound to mock providers, for instant module-load
 * usage from React components and demo data files.
 */
export const defaultCommandBrain = new CommandBrain();

export function investigate(req: AnalysisRequest): Investigation {
  return defaultCommandBrain.investigate(req);
}

/**
 * Lightweight detection helper for the analyzer dispatch route.
 */
export function detectEntityType(input: string): EntityType {
  const inv = defaultCommandBrain.resolveEntity({ identifier: input });
  return inv.type;
}
