/**
 * Legacy facade.
 *
 * The real internal multi-agent system lives under `src/lib/oracle/engine/`.
 * This file exists only as a thin shim so existing UI imports keep working
 * (`runAnalysis`, `analyzeByIdentifier`, `detectEntityType`). New code
 * should import directly from `@/lib/oracle/engine`.
 */

import { defaultCommandBrain } from "../engine/command-brain";
import { investigationToReport } from "../engine/adapter";
import type { EntityType, IntelligenceReport, NFTCollectionProfile, TokenProfile, WalletProfile } from "../types";

export interface AnalysisInput {
  entityType: EntityType;
  wallet?: WalletProfile;
  token?: TokenProfile;
  nft?: NFTCollectionProfile;
  identifier: string;
  label: string;
}

function legacyToEngineHint(t: EntityType): "wallet" | "token" | "nft_collection" | "mixed" {
  return t === "nft" ? "nft_collection" : t;
}

export function runAnalysis(input: AnalysisInput): IntelligenceReport {
  const inv = defaultCommandBrain.investigate({
    identifier: input.identifier,
    hint: legacyToEngineHint(input.entityType),
  });
  return investigationToReport(inv);
}

export function analyzeByIdentifier(identifier: string): IntelligenceReport {
  const inv = defaultCommandBrain.investigate({ identifier });
  return investigationToReport(inv);
}

/**
 * Legacy detection helper. Returns just the resolved type information so
 * call sites can route to the correct analyzer page.
 */
export function detectEntityType(input: string): {
  type: EntityType;
  wallet?: WalletProfile;
  token?: TokenProfile;
  nft?: NFTCollectionProfile;
  identifier: string;
  label: string;
} {
  const entity = defaultCommandBrain.resolveEntity({ identifier: input });
  const type: EntityType =
    entity.type === "nft_collection" ? "nft" : (entity.type as EntityType);
  return {
    type,
    wallet: entity.wallet,
    token: entity.token,
    nft: entity.nft,
    identifier: entity.identifier,
    label: entity.label,
  };
}
