import { defaultCommandBrain } from "../oracle/engine/command-brain";
import type { AgentOutput as EngineAgentOutput } from "../oracle/engine/types";
import { engineOutputToResult } from "./engine-bridge";
import { mergeAgentOutputs } from "./normalize";
import type { AgentResult } from "./types";

/**
 * NFTAgent
 *
 * The NFT-facing agent in the simple facade. Internally runs the
 * engine's NFT pipeline (NFT Sentinel + Pattern Detection + Social
 * Signal + Community Health) and merges into a single AgentResult.
 */
export class NFTAgent {
  readonly name = "NFTAgent";
  readonly version = "1.0.0";

  private static readonly RELEVANT = new Set([
    "NFT Sentinel",
    "Pattern Detection",
    "Social Signal",
    "Community Health",
  ]);

  analyze(identifier: string): AgentResult {
    const inv = defaultCommandBrain.investigate({
      identifier,
      hint: "nft_collection",
    });
    const relevant: EngineAgentOutput[] = inv.agentOutputs.filter((o) =>
      NFTAgent.RELEVANT.has(o.agentName),
    );
    const results = relevant.map(engineOutputToResult);
    const merged = mergeAgentOutputs(results);
    if (!merged.summary) {
      merged.summary = inv.executiveSummary;
    }
    return merged;
  }
}

export const nftAgent = new NFTAgent();
