import { defaultCommandBrain } from "../oracle/engine/command-brain";
import type { AgentOutput as EngineAgentOutput } from "../oracle/engine/types";
import { engineOutputToResult } from "./engine-bridge";
import { mergeAgentOutputs } from "./normalize";
import type { AgentResult } from "./types";

/**
 * TokenAgent
 *
 * The token-facing agent in the simple facade. Internally runs the
 * engine's token pipeline (Token Risk + Pattern Detection + Social
 * Signal + Community Health) and merges into a single AgentResult.
 */
export class TokenAgent {
  readonly name = "TokenAgent";
  readonly version = "1.0.0";

  private static readonly RELEVANT = new Set([
    "Token Risk",
    "Pattern Detection",
    "Social Signal",
    "Community Health",
  ]);

  analyze(identifier: string): AgentResult {
    const inv = defaultCommandBrain.investigate({
      identifier,
      hint: "token",
    });
    const relevant: EngineAgentOutput[] = inv.agentOutputs.filter((o) =>
      TokenAgent.RELEVANT.has(o.agentName),
    );
    const results = relevant.map(engineOutputToResult);
    const merged = mergeAgentOutputs(results);
    if (!merged.summary) {
      merged.summary = inv.executiveSummary;
    }
    return merged;
  }
}

export const tokenAgent = new TokenAgent();
