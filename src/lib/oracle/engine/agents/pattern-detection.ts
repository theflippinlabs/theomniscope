import { BaseAgent, type AgentContext, type AgentOutputBuilder } from "./base";
import type { EntityType } from "../types";

/**
 * Pattern Detection Agent
 *
 * Surfaces temporal, clustering, and behavioral anomalies regardless of
 * the entity type. Operates on whatever resolved data is present in the
 * context — wallet, token, or NFT.
 */
export class PatternDetectionAgent extends BaseAgent {
  readonly name = "Pattern Detection";
  readonly version = "1.1.0";

  appliesTo(_t: EntityType): boolean {
    return true;
  }

  protected execute(ctx: AgentContext, b: AgentOutputBuilder): void {
    const e = ctx.entity;
    let surfaced = 0;
    b.setConfidence(68, "default pattern-detection coverage");

    if (e.wallet) {
      const w = e.wallet;
      // Burst pattern
      const byHour = new Map<string, number>();
      w.transactions.forEach((t) => {
        const h = t.timestamp.slice(0, 13);
        byHour.set(h, (byHour.get(h) ?? 0) + 1);
      });
      const maxBurst = Math.max(0, ...[...byHour.values()]);
      if (maxBurst >= 3) {
        b.addNegative(12).addFinding({
          title: `Tx burst: ${maxBurst} transactions in one hour`,
          description:
            "Bursty patterns correlate with automated or coordinated activity.",
          severity: "low",
          category: "Temporal",
        });
        surfaced++;
      }

      const mixerLinked = w.counterparties.some((c) => c.category === "mixer");
      if (mixerLinked) {
        b.addNegative(20).addFinding({
          title: "Mixer → target chain pattern",
          description:
            "Funds received from a mixer flowed directly into low-liquidity execution paths.",
          severity: "high",
          category: "Clustering",
        });
        surfaced++;
      }

      b.addEvidence({
        type: "metric",
        label: "Txs analyzed",
        value: w.transactions.length,
        source: "computed",
        confidence: 90,
      });
    }

    if (e.token) {
      const t = e.token;
      if (t.sellTaxPct > 0 && !t.ownershipRenounced) {
        b.addNegative(8).addFinding({
          title: "Mutable tax with active owner",
          description:
            "Historical analogues show mutable taxes flipping prior to exits.",
          severity: "medium",
          category: "Behavioral",
        });
        surfaced++;
      }
      if (t.ageDays < 7 && t.holderCount < 1000) {
        b.addNegative(10).addFinding({
          title: "New launch, low holder count",
          description:
            "Early-stage tokens are vulnerable to wallet collusion and exit traps.",
          severity: "medium",
          category: "Temporal",
        });
        surfaced++;
      }
      b.addEvidence({
        type: "metric",
        label: "Token age",
        value: `${t.ageDays} d`,
        source: "computed",
        confidence: 92,
      });
    }

    if (e.nft) {
      const c = e.nft;
      const salesPerOwner = c.sales7d / Math.max(1, c.ownerCount);
      if (salesPerOwner > 0.25) {
        b.addNegative(18).addFinding({
          title: "Circular trade signature",
          description:
            "Sales-to-owner ratio is high enough to suggest repeated small-set trades.",
          severity: "medium",
          category: "Wash",
        });
        surfaced++;
      }
      b.addEvidence({
        type: "ratio",
        label: "Sales / owner (7d)",
        value: salesPerOwner.toFixed(3),
        source: "computed",
        confidence: 80,
      });
    }

    if (surfaced === 0) {
      b.addPositive(10)
        .addFinding({
          title: "No anomalous patterns",
          description:
            "No temporal, clustering, or behavioral anomalies exceeded threshold.",
          severity: "info",
          category: "Baseline",
        })
        .adjustConfidence(+6, "no-anomaly baseline");
    }

    b.setSummary(
      surfaced >= 2
        ? "Multiple weak anomalies combine into a meaningful pattern worth attention."
        : surfaced === 1
          ? "One pattern signal surfaced. Monitor for confirmation."
          : "Pattern detection did not surface significant anomalies.",
    );
  }
}
