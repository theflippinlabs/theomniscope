import { defaultCommandBrain } from "../oracle/engine/command-brain";
import type { AgentOutput as EngineAgentOutput } from "../oracle/engine/types";
import { engineOutputToResult } from "./engine-bridge";
import { mergeAgentOutputs } from "./normalize";
import type { AgentResult } from "./types";

/**
 * WalletAgent
 *
 * The wallet-facing agent in the simple facade. Internally it runs the
 * engine's specialized wallet pipeline (On-Chain Analyst + Pattern
 * Detection + Social Signal + Community Health) and merges their
 * structured outputs into a single AgentResult.
 *
 * Consumers see one agent; the intelligence is a merged view of the
 * full engine pipeline, not a reimplementation.
 */
export class WalletAgent {
  readonly name = "WalletAgent";
  readonly version = "1.0.0";

  private static readonly RELEVANT = new Set([
    "On-Chain Analyst",
    "Pattern Detection",
    "Social Signal",
    "Community Health",
  ]);

  analyze(identifier: string): AgentResult {
    const inv = defaultCommandBrain.investigate({
      identifier,
      hint: "wallet",
    });
    const relevant: EngineAgentOutput[] = inv.agentOutputs.filter((o) =>
      WalletAgent.RELEVANT.has(o.agentName),
    );
    const results = relevant.map(engineOutputToResult);
    const merged = mergeAgentOutputs(results);
    if (!merged.summary) {
      merged.summary = inv.executiveSummary;
    }
    return merged;
  }
}

export const walletAgent = new WalletAgent();
