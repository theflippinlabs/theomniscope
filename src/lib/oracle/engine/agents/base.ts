/**
 * Agent base contract.
 *
 * Every Oracle agent is a class implementing `OracleAgent`. The base class
 * `BaseAgent` provides common scaffolding (id generation, timing, error
 * boundary, default metadata) so concrete agents can focus on logic.
 *
 * Agents are pure with respect to their inputs: given the same context,
 * they must produce the same output. They never speak HTTP directly —
 * all data flows in through providers on the context.
 */

import type {
  AgentMetadata,
  AgentOutput,
  AgentStatus,
  Confidence,
  EntityType,
  Evidence,
  Finding,
  InvestigationDepth,
  ResolvedEntity,
  ScoreImpact,
  Severity,
} from "../types";
import type { ProviderRegistry } from "../providers/types";

export interface AgentLogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface AgentContext {
  entity: ResolvedEntity;
  providers: ProviderRegistry;
  depth: InvestigationDepth;
  log: (entry: AgentLogEntry) => void;
}

export interface OracleAgent {
  readonly name: string;
  readonly version: string;
  appliesTo(entityType: EntityType): boolean;
  run(ctx: AgentContext): AgentOutput;
}

// ---------- BaseAgent ----------

let runIdCounter = 0;
function nextRunId(name: string): string {
  runIdCounter += 1;
  return `${name.replace(/\s+/g, "-").toLowerCase()}-${runIdCounter}`;
}

export abstract class BaseAgent implements OracleAgent {
  abstract readonly name: string;
  readonly version: string = "1.0.0";

  abstract appliesTo(entityType: EntityType): boolean;
  protected abstract execute(ctx: AgentContext, builder: AgentOutputBuilder): void;

  run(ctx: AgentContext): AgentOutput {
    const startedAt = Date.now();
    const builder = new AgentOutputBuilder(this.name, ctx.entity.type);
    try {
      this.execute(ctx, builder);
    } catch (err) {
      ctx.log({
        level: "error",
        message: `${this.name} failed`,
        data: { error: (err as Error).message },
      });
      builder.degrade(`Agent crashed: ${(err as Error).message}`);
    }
    const durationMs = Date.now() - startedAt;
    return builder.build({
      durationMs,
      version: this.version,
      runId: nextRunId(this.name),
    });
  }
}

// ---------- AgentOutputBuilder ----------

/**
 * A small fluent builder used by concrete agents to assemble an
 * AgentOutput in a structured way without rebuilding the same boilerplate.
 */
export class AgentOutputBuilder {
  private status: AgentStatus = "ok";
  private summary = "";
  private findings: Finding[] = [];
  private alerts: AgentOutput["alerts"] = [];
  private evidence: Evidence[] = [];
  private positive = 0;
  private negative = 0;
  private neutral = 0;
  private confidenceValue = 70;
  private confidenceReasons: string[] = [];
  private metadataExtras: Record<string, unknown> = {};

  constructor(
    private agentName: string,
    private entityType: EntityType,
  ) {}

  setSummary(s: string): this {
    this.summary = s;
    return this;
  }

  setStatus(s: AgentStatus): this {
    this.status = s;
    return this;
  }

  setMetadata(extras: Record<string, unknown>): this {
    this.metadataExtras = { ...this.metadataExtras, ...extras };
    return this;
  }

  addFinding(f: Omit<Finding, "id"> & { id?: string }): this {
    const id = f.id ?? `${this.agentName}-f-${this.findings.length + 1}`;
    this.findings.push({ ...f, id });
    return this;
  }

  addAlert(a: { title: string; level: Severity; reason: string; id?: string }): this {
    const id = a.id ?? `${this.agentName}-a-${this.alerts.length + 1}`;
    this.alerts.push({ id, ...a });
    return this;
  }

  addEvidence(e: Evidence): this {
    this.evidence.push(e);
    return this;
  }

  /** Add to positive (calming) impact. */
  addPositive(amount: number): this {
    this.positive = Math.min(100, this.positive + amount);
    return this;
  }

  /** Add to negative (risk) impact. */
  addNegative(amount: number): this {
    this.negative = Math.min(100, this.negative + amount);
    return this;
  }

  addNeutral(amount: number): this {
    this.neutral = Math.min(100, this.neutral + amount);
    return this;
  }

  setConfidence(value: number, reason?: string): this {
    this.confidenceValue = Math.max(0, Math.min(100, value));
    if (reason) this.confidenceReasons.push(reason);
    return this;
  }

  adjustConfidence(delta: number, reason?: string): this {
    this.confidenceValue = Math.max(
      0,
      Math.min(100, this.confidenceValue + delta),
    );
    if (reason) this.confidenceReasons.push(reason);
    return this;
  }

  /** Mark this output as degraded with a default fallback summary. */
  degrade(reason: string): this {
    this.status = "degraded";
    this.confidenceValue = Math.min(this.confidenceValue, 25);
    this.confidenceReasons.push(reason);
    if (!this.summary) this.summary = `Degraded: ${reason}`;
    return this;
  }

  build(metadata: { durationMs: number; version: string; runId: string }): AgentOutput {
    const scoreImpact: ScoreImpact = {
      positive: this.positive,
      negative: this.negative,
      neutral: this.neutral,
      weightedContribution: 0, // filled in by Risk Scoring agent
    };
    const confidence: Confidence = {
      value: this.confidenceValue,
      rationale:
        this.confidenceReasons.length > 0
          ? this.confidenceReasons.join("; ")
          : "Default agent confidence",
    };
    const fullMetadata: AgentMetadata = {
      ...this.metadataExtras,
      durationMs: metadata.durationMs,
      version: metadata.version,
      runId: metadata.runId,
    };
    return {
      agentName: this.agentName,
      entityType: this.entityType,
      status: this.status,
      summary: this.summary || `${this.agentName} completed`,
      findings: this.findings,
      alerts: this.alerts,
      evidence: this.evidence,
      scoreImpact,
      confidence,
      metadata: fullMetadata,
    };
  }
}
