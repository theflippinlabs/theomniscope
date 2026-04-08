import { BaseAgent, type AgentContext, type AgentOutputBuilder } from "./base";
import type { EntityType } from "../types";

/**
 * NFT Sentinel Agent
 *
 * Reviews collection-level health: distribution, listing pressure, floor
 * trend, and wash-trade heuristics.
 */
export class NFTSentinelAgent extends BaseAgent {
  readonly name = "NFT Sentinel";
  readonly version = "1.1.0";

  appliesTo(t: EntityType): boolean {
    return t === "nft_collection" || t === "mixed";
  }

  protected execute(ctx: AgentContext, b: AgentOutputBuilder): void {
    const c = ctx.entity.nft;
    if (!c) {
      b.degrade("No NFT collection snapshot available");
      return;
    }

    const ownerRatio = c.ownerCount / Math.max(1, c.totalSupply);
    if (ownerRatio < 0.25) {
      b.addNegative(20).addFinding({
        title: `Low distribution (${Math.round(ownerRatio * 100)}%)`,
        description:
          "Unique owners relative to supply is low. Accumulation may be concentrated in few hands.",
        severity: "medium",
        category: "Distribution",
      });
    } else {
      b.addPositive(12).addFinding({
        title: `Healthy distribution (${Math.round(ownerRatio * 100)}%)`,
        description: `${c.ownerCount.toLocaleString()} unique owners for a supply of ${c.totalSupply.toLocaleString()}.`,
        severity: "info",
        category: "Distribution",
      });
    }

    const big = c.holderDistribution.find((h) => h.label.includes("21+"));
    if (big && big.pct >= 15) {
      b.addNegative(16).addFinding({
        title: `${big.pct}% of holders hold 21+ NFTs`,
        description: "Whale concentration increases floor fragility under exits.",
        severity: "medium",
        category: "Concentration",
      });
    }

    if (c.listedPct > 18) {
      b.addNegative(12).addFinding({
        title: `High listing ratio (${c.listedPct}%)`,
        description:
          "Elevated listing supply signals weakening demand or exit pressure.",
        severity: "medium",
        category: "Market",
      });
    } else if (c.listedPct < 2) {
      b.addPositive(8).addFinding({
        title: `Low listing ratio (${c.listedPct}%)`,
        description: "Limited sell pressure in the current market.",
        severity: "info",
        category: "Market",
      });
    }

    // Wash heuristic
    const salesPerOwner = c.sales7d / Math.max(1, c.ownerCount);
    if (salesPerOwner > 0.25) {
      b.addNegative(30)
        .addAlert({
          title: "Wash-trade heuristic triggered",
          level: "medium",
          reason:
            "Disproportionate sales-to-owner ratio for review.",
        })
        .addFinding({
          title: "Possible wash-trade signature",
          description:
            "Sales volume is disproportionately high relative to owner count.",
          severity: "high",
          category: "Market integrity",
        });
    }

    // Floor trend
    const firstFloor = c.salesSeries[0]?.floorEth ?? 0;
    const lastFloor = c.salesSeries[c.salesSeries.length - 1]?.floorEth ?? 0;
    const floorDelta = lastFloor - firstFloor;
    if (floorDelta < -0.03) {
      b.addNegative(10).addFinding({
        title: "Floor drawdown",
        description: `Floor moved from ${firstFloor.toFixed(3)} to ${lastFloor.toFixed(3)} ETH over the series.`,
        severity: "low",
        category: "Market",
      });
    } else if (floorDelta > 0.03) {
      b.addPositive(10).addFinding({
        title: "Floor strengthening",
        description: `Floor improved from ${firstFloor.toFixed(3)} to ${lastFloor.toFixed(3)} ETH over the series.`,
        severity: "info",
        category: "Market",
      });
    }

    if (!c.verified) {
      b.addNegative(12)
        .adjustConfidence(-6, "unverified collection")
        .addFinding({
          title: "Unverified collection",
          description:
            "Collection not verified by a major marketplace. Increased spoofing risk.",
          severity: "low",
          category: "Provenance",
        });
    } else {
      b.addPositive(6);
    }

    b.addEvidence({
      type: "metric",
      label: "Total supply",
      value: c.totalSupply,
      source: "mock:nft-fixture",
      confidence: 94,
    })
      .addEvidence({
        type: "metric",
        label: "Unique owners",
        value: c.ownerCount,
        source: "mock:nft-fixture",
        confidence: 92,
      })
      .addEvidence({
        type: "metric",
        label: "Floor",
        value: `${c.floorEth.toFixed(3)} ETH`,
        source: "mock:nft-fixture",
        confidence: 90,
      })
      .addEvidence({
        type: "metric",
        label: "7d volume",
        value: `${c.volume7dEth.toFixed(1)} ETH`,
        source: "mock:nft-fixture",
        confidence: 90,
      })
      .addEvidence({
        type: "ratio",
        label: "Sales / owner (7d)",
        value: salesPerOwner.toFixed(3),
        source: "computed",
        confidence: 80,
      });

    if (salesPerOwner > 0.25 || ownerRatio < 0.25) {
      b.setSummary(
        "Collection shows concentration and market-integrity concerns.",
      );
    } else {
      b.setSummary(
        "Collection appears operationally healthy with distributed ownership.",
      );
    }
  }
}
