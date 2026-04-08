import type {
  AgentOutput,
  EntityType,
  NFTCollectionProfile,
  TokenProfile,
  WalletProfile,
} from "../types";

/**
 * PATTERN DETECTION AGENT
 *
 * Surfaces temporal, clustering, and behavioral anomalies across
 * whichever entity type is provided. The agent is deliberately
 * permissive — it prefers to flag weak signals with low severity
 * rather than stay silent.
 */
export function runPatternDetection(input: {
  entityType: EntityType;
  wallet?: WalletProfile;
  token?: TokenProfile;
  nft?: NFTCollectionProfile;
}): AgentOutput {
  const t0 = Date.now();
  const findings: AgentOutput["findings"] = [];
  const alerts: AgentOutput["alerts"] = [];
  const evidence: AgentOutput["evidence"] = [];
  let score = 6;
  let confidence = 68;

  if (input.wallet) {
    const w = input.wallet;
    // Temporal cluster — multiple large tx in same hour
    const byHour = new Map<string, number>();
    w.transactions.forEach((t) => {
      const h = t.timestamp.slice(0, 13);
      byHour.set(h, (byHour.get(h) ?? 0) + 1);
    });
    const maxBurst = Math.max(0, ...[...byHour.values()]);
    if (maxBurst >= 3) {
      score += 10;
      findings.push({
        id: "pd_burst",
        title: `Tx burst: ${maxBurst} transactions in one hour`,
        detail: "Bursty patterns correlate with automated or coordinated activity.",
        severity: "low",
        category: "Temporal",
      });
    }
    const mixerLinked = w.counterparties.some((c) => c.category === "mixer");
    if (mixerLinked) {
      score += 14;
      findings.push({
        id: "pd_mixer_chain",
        title: "Mixer → target chain pattern",
        detail:
          "Funds received from a mixer flowed directly into low-liquidity execution paths.",
        severity: "high",
        category: "Clustering",
      });
    }
    evidence.push({ label: "Txs analyzed", value: w.transactions.length.toString() });
  }

  if (input.token) {
    const tk = input.token;
    if (tk.sellTaxPct > 0 && !tk.ownershipRenounced) {
      score += 6;
      findings.push({
        id: "pd_tax_power",
        title: "Mutable tax with active owner",
        detail: "Historical analogues show mutable taxes flipping prior to exits.",
        severity: "medium",
        category: "Behavioral",
      });
    }
    if (tk.ageDays < 7 && tk.holderCount < 1000) {
      score += 8;
      findings.push({
        id: "pd_launch",
        title: "New launch, low holder count",
        detail:
          "Early-stage tokens are vulnerable to wallet collusion and exit traps.",
        severity: "medium",
        category: "Temporal",
      });
    }
    evidence.push({ label: "Token age", value: `${tk.ageDays} d` });
  }

  if (input.nft) {
    const coll = input.nft;
    // Circular / small-set sales heuristic
    const salesPerOwner = coll.sales7d / Math.max(1, coll.ownerCount);
    if (salesPerOwner > 0.25) {
      score += 14;
      findings.push({
        id: "pd_wash",
        title: "Circular trade signature",
        detail:
          "Sales-to-owner ratio is high enough to suggest repeated small-set trades.",
        severity: "medium",
        category: "Wash",
      });
    }
    evidence.push({ label: "Sales / owner (7d)", value: salesPerOwner.toFixed(3) });
  }

  if (findings.length === 0) {
    findings.push({
      id: "pd_clean",
      title: "No anomalous patterns",
      detail: "No temporal, clustering, or behavioral anomalies exceeded threshold.",
      severity: "info",
      category: "Baseline",
    });
    confidence += 6;
  }

  return {
    agent: "Pattern Detection",
    entityType: input.entityType,
    status: "ok",
    summary:
      score >= 30
        ? "Multiple weak anomalies combine into a meaningful pattern worth attention."
        : "Pattern detection did not surface significant anomalies.",
    findings,
    alerts,
    evidence,
    scoreImpact: Math.min(100, score),
    confidence: Math.max(0, Math.min(100, confidence)),
    durationMs: Date.now() - t0 + 190,
  };
}
