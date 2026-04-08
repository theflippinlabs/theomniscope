import type { AgentOutput, NFTCollectionProfile } from "../types";

/**
 * NFT SENTINEL AGENT
 *
 * Reviews a collection's sales activity, holder distribution, liquidity,
 * and wash-trading heuristics. Produces a collection-level outlook.
 */
export function runNftSentinel(coll: NFTCollectionProfile): AgentOutput {
  const t0 = Date.now();
  const findings: AgentOutput["findings"] = [];
  const alerts: AgentOutput["alerts"] = [];
  const evidence: AgentOutput["evidence"] = [];
  let score = 12;
  let confidence = 78;

  const ownerRatio = coll.ownerCount / Math.max(1, coll.totalSupply);
  if (ownerRatio < 0.25) {
    score += 16;
    findings.push({
      id: "nft_owner",
      title: `Low distribution (${Math.round(ownerRatio * 100)}%)`,
      detail:
        "Unique owners relative to supply is low. Accumulation may be concentrated in few hands.",
      severity: "medium",
      category: "Distribution",
    });
  } else {
    findings.push({
      id: "nft_owner_ok",
      title: `Healthy distribution (${Math.round(ownerRatio * 100)}%)`,
      detail: `${coll.ownerCount.toLocaleString()} unique owners for a supply of ${coll.totalSupply.toLocaleString()}.`,
      severity: "info",
      category: "Distribution",
    });
  }

  const big = coll.holderDistribution.find((h) => h.label.includes("21+"));
  if (big && big.pct >= 15) {
    score += 14;
    findings.push({
      id: "nft_whales",
      title: `${big.pct}% of holders hold 21+ NFTs`,
      detail: "Whale concentration increases floor fragility under exits.",
      severity: "medium",
      category: "Concentration",
    });
  }

  // Liquidity / floor signal
  if (coll.listedPct > 18) {
    score += 10;
    findings.push({
      id: "nft_listed",
      title: `High listing ratio (${coll.listedPct}%)`,
      detail: "Elevated listing supply signals weakening demand or exit pressure.",
      severity: "medium",
      category: "Market",
    });
  } else if (coll.listedPct < 2) {
    findings.push({
      id: "nft_listed_ok",
      title: `Low listing ratio (${coll.listedPct}%)`,
      detail: "Limited sell pressure in the current market.",
      severity: "info",
      category: "Market",
    });
  }

  // Wash-trade heuristic: sales unusually high vs active owners
  const salesPerOwner = coll.sales7d / Math.max(1, coll.ownerCount);
  if (salesPerOwner > 0.25) {
    score += 18;
    findings.push({
      id: "nft_wash",
      title: "Possible wash-trade signature",
      detail:
        "Sales volume is disproportionately high relative to owner count. Inspect circular trade patterns.",
      severity: "high",
      category: "Market integrity",
    });
    alerts.push({
      id: "al_wash",
      title: "Wash-trade heuristic triggered",
      description: "Oracle flagged a disproportionate sales-to-owner ratio for review.",
      severity: "medium",
      triggeredAt: new Date().toISOString(),
    });
  }

  // Floor trend
  const firstFloor = coll.salesSeries[0]?.floorEth ?? 0;
  const lastFloor = coll.salesSeries[coll.salesSeries.length - 1]?.floorEth ?? 0;
  const floorDelta = lastFloor - firstFloor;
  if (floorDelta < -0.03) {
    score += 8;
    findings.push({
      id: "nft_floor_down",
      title: "Floor drawdown",
      detail: `Floor moved from ${firstFloor.toFixed(3)} to ${lastFloor.toFixed(3)} ETH over the series.`,
      severity: "low",
      category: "Market",
    });
  } else if (floorDelta > 0.03) {
    findings.push({
      id: "nft_floor_up",
      title: "Floor strengthening",
      detail: `Floor improved from ${firstFloor.toFixed(3)} to ${lastFloor.toFixed(3)} ETH over the series.`,
      severity: "info",
      category: "Market",
    });
  }

  if (!coll.verified) {
    score += 6;
    confidence -= 6;
    findings.push({
      id: "nft_verify",
      title: "Unverified collection",
      detail: "Collection not verified by a major marketplace. Increased spoofing risk.",
      severity: "low",
      category: "Provenance",
    });
  }

  evidence.push(
    { label: "Total supply", value: coll.totalSupply.toLocaleString() },
    { label: "Unique owners", value: coll.ownerCount.toLocaleString() },
    { label: "Floor", value: `${coll.floorEth.toFixed(3)} ETH` },
    { label: "7d volume", value: `${coll.volume7dEth.toFixed(1)} ETH` },
    { label: "Listed", value: `${coll.listedPct.toFixed(1)}%` },
  );

  return {
    agent: "NFT Sentinel",
    entityType: "nft",
    status: "ok",
    summary:
      score >= 55
        ? "Collection shows concentration and market-integrity concerns."
        : "Collection appears operationally healthy with distributed ownership.",
    findings,
    alerts,
    evidence,
    scoreImpact: Math.min(100, score),
    confidence: Math.max(0, Math.min(100, confidence)),
    durationMs: Date.now() - t0 + 210,
  };
}
